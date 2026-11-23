import { R, q, frac, terms, power, num, range, close, integrate2 } from '../../lib/index.js';
import { K, exactChoices, fterms } from './_shared.js';

const PI = Math.PI;

// ───────────── units, choices and slice sums ─────────────

const UNITS = {
  metric: { len: 'm', rg: 9800, work: 'J', force: 'N', per: 'N/m', note: R`Use \(\rho g = 9800\) N/m³ for water (\(\rho = 1000\) kg/m³, \(g = 9.8\) m/s²).` },
  us: { len: 'ft', rg: 62.4, work: 'ft·lb', force: 'lb', per: 'lb/ft', note: R`Use \(\rho g = 62.4\) lb/ft³ for water (the weight of one cubic foot).` },
};
const pickUnits = (rng) => UNITS[rng.pick(['metric', 'us'])];

/** c·ρg (or c·πρg) as an exact constant whose value uses the weight density of the chosen units. */
const RG = (u, pi = false) => (pi ? { t: '\\pi\\rho g', v: PI * u.rg } : { t: '\\rho g', v: u.rg });
const rgK = (c, u, pi = false) => K([[c, RG(u, pi)]]);
const unitWrap = (unit) => (tex) => R`\(${tex}\) ${unit}`;
const about = (v) => num(Math.round(v), { commas: true });

/** Midpoint Riemann sum: the slice-by-slice total, built straight from the physical set-up. */
function midSum(f, a, b, n = 4000) {
  const h = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * h);
  return s * h;
}
const agree = (got, want, tol = 1e-6) => (close(got, want, tol) ? true : `slice sum ${got} but answer ${want}`);

/** True when the fraction is a decimal with at most `places` places. */
const terminates = (f, places) => (f.n * 10 ** places) % f.d === 0;

const pt = (x, y) => R`\(\left(${num(x)}, ${num(y)}\right)\)`;

/** Point choices (x̄, ȳ): wrong points equal to the right one or to an earlier one are dropped. */
function pointChoices(right, wrongs) {
  const v = (z) => (typeof z === 'number' ? z : z.value);
  const seen = [right.p];
  const wrong = [];
  for (const w of wrongs) {
    if (!w) continue;
    if (seen.some((s) => Math.abs(v(s[0]) - v(w.p[0])) < 1e-9 && Math.abs(v(s[1]) - v(w.p[1])) < 1e-9)) continue;
    seen.push(w.p);
    wrong.push(w.why ? { value: pt(...w.p), why: w.why } : pt(...w.p));
  }
  return { correct: pt(...right.p), wrong };
}

// ───────────── pictures ─────────────

/**
 * Cross-section of a tank (box, upright cylinder or vertex-down cone) with the water, one horizontal
 * slice and the distance that slice is lifted. `half` is the half-width (radius) at the top.
 */
function tankPic({ shape, half, H, d, s = 0, u, widthLabel, alt }) {
  const top = H + s;
  const wAt = (y) => (shape === 'cone' ? (half * y) / H : half);
  const y0 = d * 0.45;
  const water = shape === 'cone' ? [[0, 0], [wAt(d), d], [-wAt(d), d]] : [[-half, 0], [half, 0], [half, d], [-half, d]];
  const walls = shape === 'cone' ? [[[-half, H], [0, 0]], [[0, 0], [half, H]]] : [[[-half, H], [-half, 0]], [[-half, 0], [half, 0]], [[half, 0], [half, H]]];
  const segs = walls.map(([from, to]) => ({ from, to, color: 'd' }));
  segs.push({ from: [half, H], to: [-half, H], dashed: true, color: 'd', label: widthLabel });
  segs.push({ from: [half * 1.3, 0], to: [half * 1.3, H], dashed: true, color: 'c', label: `${H} ${u.len}` });
  if (d < H) segs.push({ from: [-half * 1.3, d], to: [-half * 1.3, 0], dashed: true, color: 'c', label: `water ${d} ${u.len}` });
  if (s > 0) segs.push({ from: [0, H], to: [0, top], color: 'd', label: `spout ${s} ${u.len}` });
  segs.push({ from: [-wAt(y0), y0], to: [wAt(y0), y0], color: 'b', label: 'slice at height y' });
  segs.push({ from: [wAt(y0) * 0.5, y0], to: [wAt(y0) * 0.5, top], arrow: true, dashed: true, color: 'b', label: `lift ${top} − y` });
  const span = Math.max(top, 2 * half);
  return {
    type: 'plot',
    x: [-half * 1.3 - 0.35 * span, half * 1.3 + 0.35 * span],
    y: [-0.08 * span, top + 0.22 * span],
    grid: false,
    axes: false,
    square: true,
    polygons: [{ points: water, color: 'a' }],
    segments: segs,
    alt,
  };
}

/** A vertical plate under water: the surface is y = 0 and depth is measured downward. */
function platePic({ shape, a, h, d, u, alt }) {
  let points;
  let wAt;
  if (shape === 'rect') {
    points = [[-a / 2, -d], [a / 2, -d], [a / 2, -d - h], [-a / 2, -d - h]];
    wAt = () => a;
  } else if (shape === 'triDown') {
    points = [[-a / 2, -d], [a / 2, -d], [0, -d - h]];
    wAt = (y) => (a * (d + h - y)) / h;
  } else if (shape === 'triUp') {
    points = [[0, -d], [a / 2, -d - h], [-a / 2, -d - h]];
    wAt = (y) => (a * (y - d)) / h;
  } else {
    // semicircle of radius h; 'semiDown' has its diameter on top, 'semiUp' has its diameter at the bottom
    const r = h;
    const D = shape === 'semiDown' ? d : d + r;
    const sg = shape === 'semiDown' ? -1 : 1;
    points = range(0, 48).map((i) => [r * Math.cos((PI * i) / 48), -D + sg * r * Math.sin((PI * i) / 48)]);
    wAt = (y) => 2 * Math.sqrt(Math.max(0, r * r - (y - D) ** 2));
  }
  const ys = points.map((p) => p[1]);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const xs = points.map((p) => p[0]);
  const xr = Math.max(...xs);
  const depthMid = -hi + 0.6 * (hi - lo); // a strip 60 % of the way down the plate
  const yMid = -depthMid;
  const wm = wAt(depthMid);
  const span = Math.max(-lo, 2 * xr);
  const segs = [{ from: [-wm / 2, yMid], to: [wm / 2, yMid], color: 'b', label: 'strip at depth y' }];
  if (shape === 'rect' || shape === 'triDown') segs.push({ from: [a / 2, -d], to: [-a / 2, -d], color: 'd', label: `${a} ${u.len}` });
  if (shape === 'triUp') segs.push({ from: [-a / 2, -d - h], to: [a / 2, -d - h], color: 'd', label: `${a} ${u.len}` });
  if (shape.startsWith('semi')) segs.push({ from: [0, shape === 'semiDown' ? -d : -d - h], to: [h, shape === 'semiDown' ? -d : -d - h], color: 'd', label: `r = ${h} ${u.len}` });
  else segs.push({ from: [xr + 0.12 * span, lo], to: [xr + 0.12 * span, hi], dashed: true, color: 'c', label: `${h} ${u.len}` });
  if (d > 0) segs.push({ from: [-xr - 0.25 * span * 0.5, 0], to: [-xr - 0.25 * span * 0.5, hi], dashed: true, color: 'c', label: `${d} ${u.len}` });
  return {
    type: 'plot',
    x: [-xr - 0.45 * span, xr + 0.45 * span],
    y: [lo - 0.12 * span, 0.15 * span],
    grid: false,
    axes: false,
    square: true,
    hlines: [{ y: 0, color: 'a', dashed: false }],
    polygons: [{ points, color: 'c' }],
    segments: segs,
    alt,
  };
}

function regionPlot(top, bottom, a, b, { alt, hline, vline }) {
  const ys = [hline ?? 0];
  for (let i = 0; i <= 40; i++) {
    const x = a + ((b - a) * i) / 40;
    ys.push(top(x), bottom(x));
  }
  const lo = Math.min(0, ...ys);
  const hi = Math.max(0, ...ys);
  const m = 0.12 * (hi - lo || 1);
  const xs = [a, b, vline ?? a];
  const pad = 0.15 * (Math.max(...xs) - Math.min(...xs) || 1);
  return {
    type: 'plot',
    x: [Math.min(...xs) - pad, Math.max(...xs) + pad],
    y: [lo - m, hi + m],
    fns: [{ f: top, domain: [a, b] }, { f: bottom, color: 'b', domain: [a, b] }],
    shade: [{ f: top, g: bottom, from: a, to: b }],
    hlines: hline != null ? [{ y: hline }] : undefined,
    vlines: vline != null ? [{ x: vline }] : undefined,
    alt,
  };
}

// ───────────── shared set-ups ─────────────

/** Pumping water out of a tank: exact coefficient of ρg (with π for round tanks) and the slice area. */
function pumpSetup(shape, w, H, d, s) {
  const lift = H + s;
  if (shape === 'cone') {
    const c = frac(w * w, H * H).mul(frac(lift * d ** 3, 3).sub(frac(d ** 4, 4)));
    return { c, pi: true, area: (y) => PI * ((w * y) / H) ** 2, lift };
  }
  const base = w * w;
  const c = frac(base * (2 * d * lift - d * d), 2);
  return { c, pi: shape === 'cyl', area: () => (shape === 'cyl' ? PI : 1) * base, lift };
}

/** A centroid problem: region between top and bottom on [0, b] with exact area, moments and centroid. */
function centroidRegion(rng) {
  const fam = rng.pick(['pow', 'pow', 'root', 'between']);
  if (fam === 'pow') {
    const n = rng.int(1, 3);
    const k = rng.int(1, 3);
    const b = rng.int(1, n === 3 ? 2 : 3);
    const A = frac(k * b ** (n + 1), n + 1);
    const My = frac(k * b ** (n + 2), n + 2);
    const Mx = frac(k * k * b ** (2 * n + 1), 2 * (2 * n + 1));
    const f = terms([[k, power('x', n)]]);
    return {
      b, A, My, Mx, top: (x) => k * x ** n, bottom: () => 0,
      desc: R`the region under \(y = ${f}\) from \(x = 0\) to \(x = ${b}\)`,
      altDesc: `the region under y = ${k === 1 ? '' : k}x${n === 1 ? '' : n === 2 ? '²' : '³'} from x = 0 to x = ${b}`,
      Atex: R`\displaystyle\int_{0}^{${b}} ${f}\,dx`, Mytex: R`\displaystyle\int_{0}^{${b}} x\cdot ${f}\,dx`, Mxtex: R`\displaystyle\int_{0}^{${b}} \tfrac{1}{2}\left(${f}\right)^{2}dx`,
    };
  }
  if (fam === 'root') {
    const j = rng.int(1, 3);
    const k = rng.int(1, 3);
    const b = j * j;
    const f = terms([[k, '\\sqrt{x}']]);
    return {
      b, A: frac(2 * k * j ** 3, 3), My: frac(2 * k * j ** 5, 5), Mx: frac(k * k * j ** 4, 4), top: (x) => k * Math.sqrt(x), bottom: () => 0,
      desc: R`the region under \(y = ${f}\) from \(x = 0\) to \(x = ${b}\)`,
      altDesc: `the region under y = ${k === 1 ? '' : k}√x from x = 0 to x = ${b}`,
      Atex: R`\displaystyle\int_{0}^{${b}} ${f}\,dx`, Mytex: R`\displaystyle\int_{0}^{${b}} x\cdot ${f}\,dx`, Mxtex: R`\displaystyle\int_{0}^{${b}} \tfrac{1}{2}\left(${f}\right)^{2}dx`,
    };
  }
  const a = rng.int(1, 4);
  const line = terms([[a, 'x']]);
  return {
    b: a, A: frac(a ** 3, 6), My: frac(a ** 4, 12), Mx: frac(a ** 5, 15), top: (x) => a * x, bottom: (x) => x * x,
    desc: R`the region enclosed by \(y = ${line}\) and \(y = x^{2}\)`,
    altDesc: `the region between the line y = ${a === 1 ? '' : a}x (above) and the parabola y = x² (below), which meet at x = 0 and x = ${a}`,
    Atex: R`\displaystyle\int_{0}^{${a}} \left(${line} - x^{2}\right)dx`, Mytex: R`\displaystyle\int_{0}^{${a}} x\left(${line} - x^{2}\right)dx`, Mxtex: R`\displaystyle\int_{0}^{${a}} \tfrac{1}{2}\left(${terms([[a * a, 'x^{2}'], [-1, 'x^{4}']])}\right)dx`,
  };
}

/** Centroid of a region by a 2-D numerical integral (independent of the moment formulas). */
function numericCentroid(reg) {
  const A = integrate2(() => 1, 0, reg.b, reg.bottom, reg.top, 400);
  return [integrate2((x) => x, 0, reg.b, reg.bottom, reg.top, 400) / A, integrate2((x, y) => y, 0, reg.b, reg.bottom, reg.top, 400) / A, A];
}

// ───────────── Easy ─────────────

function easyVariableForce(rng) {
  const n = rng.int(1, 3);
  const a = rng.int(1, 6);
  const p = rng.bool(0.6) ? 0 : rng.int(1, 2);
  const b = p + rng.int(1, 3);
  const F = (x) => a * x ** n;
  const W = frac(a * (b ** (n + 1) - p ** (n + 1)), n + 1);
  const Ftex = terms([[a, power('x', n)]]);
  return q({
    prompt: R`A force of \(F(x) = ${Ftex}\) newtons pushes an object along the \(x\)-axis (\(x\) in metres). How much work does the force do as the object moves from \(x = ${p}\) to \(x = ${b}\)?`,
    correct: W,
    unit: 'J',
    wrong: [
      { value: F(b) * (b - p), why: R`Force × distance works only for a constant force. This force changes with \(x\), so add up \(F(x)\,dx\) over the path: \(W = \int F(x)\,dx\).` },
      { value: frac(a * (b ** (n + 1) - p ** (n + 1)), n), why: R`An antiderivative of \(${power('x', n)}\) is \(\frac{${power('x', n + 1)}}{${n + 1}}\).` },
      F(b) - F(p),
      W.mul(2),
    ],
    solution: [
      R`Work by a variable force: \(W = \displaystyle\int_{${p}}^{${b}} F(x)\,dx = \int_{${p}}^{${b}} ${Ftex}\,dx\).`,
      R`\(W = \Big[${terms([[frac(a, n + 1), power('x', n + 1)]])}\Big]_{${p}}^{${b}} = ${W.tex()}\).`,
      R`So \(W = ${W.tex()}\) J (newton-metres).`,
    ],
    rule: 0,
    skill: 'work by a variable force',
    check: () => agree(midSum(F, p, b), W.value),
  });
}

function easySpring(rng) {
  let P;
  let s;
  let u;
  let v;
  let W;
  for (let t = 0; t < 80; t++) {
    P = rng.pick([10, 12, 15, 16, 20, 24, 25, 30, 40, 50, 60, 80]);
    s = rng.pick([2, 4, 5, 8, 10, 20, 25]);
    u = rng.bool(0.5) ? 0 : rng.int(1, 10);
    v = u + rng.int(2, 20);
    W = frac(P * (v * v - u * u), 200 * s);
    if (terminates(W, 3)) break;
  }
  if (!terminates(W, 3)) [P, s, u, v, W] = [20, 10, 0, 15, frac(9, 4)];
  const k = frac(100 * P, s);
  const sq = frac(P * (v - u) ** 2, 200 * s);
  const from = u === 0 ? 'its natural length' : `${u} cm beyond its natural length`;
  return q({
    prompt: R`A force of ${P} N holds a spring stretched ${s} cm beyond its natural length. How much work is done stretching the spring from ${from} to ${v} cm beyond its natural length?`,
    correct: W.value,
    unit: 'J',
    wrong: [
      { value: W.value * 100, why: 'Change centimetres to metres before using Hooke’s law. With x in centimetres the work comes out in newton-centimetres, 100 times too big.' },
      { value: W.value * 2, why: R`\(\int kx\,dx = \frac{1}{2}kx^{2}\). The factor \(\frac{1}{2}\) is missing.` },
      u > 0 && terminates(sq, 4) ? { value: sq.value, why: R`Square each endpoint separately: \(\frac{1}{2}k(x_{2}^{2} - x_{1}^{2})\), not \(\frac{1}{2}k(x_{2} - x_{1})^{2}\).` } : null,
      { value: (P * v) / s, why: 'That is the force needed at the end of the stretch, in newtons. Work is the integral of the force.' },
    ],
    solution: [
      R`Hooke’s law: \(F = kx\), with \(x\) in metres from the natural length. \(${P} = k(${num(s / 100)})\), so \(k = ${num(k)}\) N/m.`,
      R`\(W = \displaystyle\int_{${num(u / 100)}}^{${num(v / 100)}} ${num(k)}x\,dx = ${num(k.div(2))}${u === 0 ? `(${num(v / 100)})^{2}` : `\\left((${num(v / 100)})^{2} - (${num(u / 100)})^{2}\\right)`}\).`,
      R`\(W = ${num(W.value)}\) J.`,
    ],
    rule: 1,
    skill: 'springs',
    check: () => agree(midSum((x) => (P / (s / 100)) * x, u / 100, v / 100), W.value),
  });
}

function easyMasses(rng) {
  if (rng.bool(0.55)) {
    const xs = rng.sample(range(-6, 8), 3).sort((p, r) => p - r);
    const ms = xs.map(() => rng.int(1, 9));
    const m = ms[0] + ms[1] + ms[2];
    const M0 = ms.reduce((t, mi, i) => t + mi * xs[i], 0);
    const xbar = frac(M0, m);
    const list = xs.map((x, i) => R`${ms[i]} kg at \(x = ${x}\)`).join(', ');
    return q({
      prompt: R`Point masses lie on a thin rod along the \(x\)-axis: ${list} (positions in metres). Find the center of mass \(\bar{x}\).`,
      correct: xbar,
      fmt: (z) => R`\(\bar{x} = ${num(z)}\) m`,
      wrong: [
        { value: frac(xs[0] + xs[1] + xs[2], 3), why: 'That is the plain average of the positions. Heavier masses pull the balance point toward them, so weight each position by its mass.' },
        { value: M0, why: R`That is the moment \(M_{0} = \sum m_{i}x_{i}\). Divide it by the total mass, ${m} kg.` },
        frac(M0, 3),
        xbar.add(1),
      ],
      solution: [
        R`Moment about the origin: \(M_{0} = \sum m_{i}x_{i} = ${xs.map((x, i) => `${ms[i]}(${x})`).join(' + ')} = ${M0}\).`,
        R`Total mass: \(m = ${ms.join(' + ')} = ${m}\).`,
        R`\(\bar{x} = \dfrac{M_{0}}{m} = ${xbar.tex()}\) m.`,
      ],
      rule: 5,
      skill: 'center of mass of point masses',
      visual: { type: 'numberLine', min: -7, max: 9, step: 1, points: xs.map((x, i) => ({ value: x, label: `${ms[i]} kg` })), alt: `A number line from −7 to 9 with ${xs.map((x, i) => `${ms[i]} kg at ${x}`).join(', ')}.` },
      check: () => (Math.abs(ms.reduce((t, mi, i) => t + mi * (xs[i] - xbar.value), 0)) < 1e-9 ? true : 'the masses do not balance at x̄'),
    });
  }
  let pts;
  let ms;
  do {
    pts = rng.sample(range(0, 47), 3).map((i) => [(i % 8) - 2, Math.floor(i / 8) - 1]);
    ms = pts.map(() => rng.int(1, 6));
  } while ((pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) === (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1]) || ms[0] === ms[1] && ms[1] === ms[2]);
  const m = ms[0] + ms[1] + ms[2];
  const My = ms.reduce((t, mi, i) => t + mi * pts[i][0], 0);
  const Mx = ms.reduce((t, mi, i) => t + mi * pts[i][1], 0);
  const xbar = frac(My, m);
  const ybar = frac(Mx, m);
  const list = pts.map((p, i) => R`${ms[i]} kg at \((${p[0]}, ${p[1]})\)`).join(', ');
  return q({
    prompt: R`Find the center of mass \((\bar{x}, \bar{y})\) of the point masses ${list}.`,
    ...pointChoices({ p: [xbar, ybar] }, [
      { p: [ybar, xbar], why: R`\(M_{x} = \sum m_{i}y_{i}\) is the moment about the \(x\)-axis, and it gives \(\bar{y}\), not \(\bar{x}\): \(\bar{x} = \frac{M_{y}}{m}\), \(\bar{y} = \frac{M_{x}}{m}\).` },
      { p: [frac(pts[0][0] + pts[1][0] + pts[2][0], 3), frac(pts[0][1] + pts[1][1] + pts[2][1], 3)], why: 'That is the plain average of the points. Weight each coordinate by its mass.' },
      { p: [frac(My, 3), frac(Mx, 3)] },
      { p: [My, Mx] },
      { p: [xbar.add(1), ybar] },
    ]),
    solution: [
      R`Total mass \(m = ${m}\). Moments: \(M_{y} = \sum m_{i}x_{i} = ${My}\) and \(M_{x} = \sum m_{i}y_{i} = ${Mx}\).`,
      R`\(\bar{x} = \dfrac{M_{y}}{m} = ${xbar.tex()}\), \(\bar{y} = \dfrac{M_{x}}{m} = ${ybar.tex()}\).`,
    ],
    rule: 5,
    skill: 'center of mass of point masses',
    visual: { type: 'plot', x: [-3, 6], y: [-2, 5], square: true, points: pts.map((p, i) => ({ x: p[0], y: p[1], label: `${ms[i]} kg` })), alt: `Point masses: ${pts.map((p, i) => `${ms[i]} kg at (${p[0]}, ${p[1]})`).join(', ')}.` },
    check: () => {
      const bx = ms.reduce((t, mi, i) => t + mi * (pts[i][0] - xbar.value), 0);
      const by = ms.reduce((t, mi, i) => t + mi * (pts[i][1] - ybar.value), 0);
      return Math.abs(bx) < 1e-9 && Math.abs(by) < 1e-9 ? true : 'the masses do not balance at the center of mass';
    },
  });
}

// ───────────── Medium ─────────────

function mediumCable(rng) {
  const u = pickUnits(rng);
  const metric = u === UNITS.metric;
  const L = rng.pick([10, 12, 15, 20, 24, 30, 40, 50]);
  const w = rng.int(2, 8);
  const kind = rng.pick(['all', 'part', 'load']);
  const h = kind === 'part' ? rng.int(Math.ceil(L / 5), L - 2) : L;
  const P = kind === 'load' ? rng.pick(metric ? [20, 50, 80, 100, 150, 200] : [10, 25, 40, 50, 100]) : 0;
  const obj = metric ? 'cable' : 'chain';
  const W = (w * h * (2 * L - h)) / 2 + P * L;
  const setting = metric ? 'a winch on the roof of a building' : 'a winch at the top of a tower';
  const ask = { all: R`How much work is done winding the whole ${obj} up to the top?`, part: R`How much work is done winding up the top ${h} ${u.len} of the ${obj}?`, load: R`A ${P} ${u.force} load hangs from the bottom of the ${obj}. How much work is done lifting the load to the top by winding up the ${obj}?` }[kind];
  const wrongs = {
    all: [{ value: w * L * L, why: R`A piece \(y\) ${u.len} below the top is lifted only \(y\) ${u.len}, not the full ${L} ${u.len}. That is where the \(\frac{1}{2}\) comes from.` }, { value: w * L, why: R`That is the weight of the ${obj}. Work adds up weight × distance lifted, piece by piece.` }, (w * L * L) / 4],
    part: [{ value: (w * h * h) / 2, why: R`The ${L - h} ${u.len} below also rises ${h} ${u.len}. Add \(${w}\cdot ${L - h}\cdot ${h}\).` }, { value: w * L * h, why: R`Pieces inside the top ${h} ${u.len} rise less than ${h} ${u.len}: a piece at depth \(y\) rises only \(y\).` }, { value: (w * L * L) / 2, why: `That winds up the whole ${obj}.` }],
    load: [{ value: (w * L * L) / 2, why: R`The load must be lifted too: add \(${P}\cdot ${L}\).` }, { value: w * L * L + P * L, why: R`A piece of ${obj} \(y\) ${u.len} below the top rises only \(y\). Its part of the work is \(\int_{0}^{${L}} ${w}y\,dy = \frac{1}{2}\cdot ${w}\cdot ${L}^{2}\).` }, { value: (w * L * L) / 2 + (P * L) / 2, why: `The load rises the whole ${L} ${u.len}.` }],
  }[kind];
  const steps = kind === 'part'
    ? [R`Measure \(y\) down from the top. A piece of length \(dy\) at depth \(y \le ${h}\) weighs \(${w}\,dy\) ${u.force} and rises \(y\). The other ${L - h} ${u.len} each rise ${h} ${u.len}.`, R`\(W = \displaystyle\int_{0}^{${h}} ${w}y\,dy + ${w}\cdot ${L - h}\cdot ${h} = ${num((w * h * h) / 2)} + ${num(w * (L - h) * h)}\).`]
    : [R`Measure \(y\) down from the top. A piece of length \(dy\) at depth \(y\) weighs \(${w}\,dy\) ${u.force} and is lifted \(y\) ${u.len}.`, R`${obj === 'cable' ? 'Cable' : 'Chain'}: \(\displaystyle\int_{0}^{${L}} ${w}y\,dy = ${num((w * L * L) / 2)}\).${kind === 'load' ? R` Load: \(${P}\cdot ${L} = ${P * L}\).` : ''}`];
  return q({
    prompt: R`A ${obj} ${L} ${u.len} long, weighing ${w} ${u.per}, hangs straight down from ${setting}. ${ask}`,
    correct: W,
    unit: u.work,
    wrong: wrongs,
    solution: [...steps, R`\(W = ${num(W)}\) ${u.work}.`],
    rule: 2,
    skill: 'lifting a cable',
    check: () => agree(midSum((y) => w * Math.min(y, h), 0, L, L * 200) + P * L, W),
  });
}

function mediumPumpFull(rng) {
  const u = pickUnits(rng);
  const shape = rng.pick(['box', 'cyl']);
  const s = rng.pick([0, 0, 1, 2]);
  const w = shape === 'box' ? rng.int(2, 6) : rng.int(1, 4);
  const H = rng.int(2, 6);
  const { c, pi, area, lift } = pumpSetup(shape, w, H, H, s);
  const right = rgK(c, u, pi);
  const base = w * w;
  const exit = s ? R`through a spout ${s} ${u.len} above the top of the tank` : 'over the top of the tank';
  const tank = shape === 'box' ? R`shaped like a box with a square base ${w} ${u.len} by ${w} ${u.len} and a depth of ${H} ${u.len}` : R`shaped like an upright cylinder with radius ${w} ${u.len} and height ${H} ${u.len}`;
  const sliceA = shape === 'box' ? `${base}` : R`\pi(${w})^{2}`;
  return q({
    prompt: R`A tank ${tank} is full of water. Find the work needed to pump all of the water out ${exit}. ${u.note} Give the answer in terms of \(\rho g\).`,
    visual: tankPic({ shape, half: shape === 'box' ? w / 2 : w, H, d: H, s, u, widthLabel: shape === 'box' ? `${w} ${u.len}` : `diameter ${2 * w} ${u.len}`, alt: `Cross-section of the ${shape === 'box' ? 'box' : 'cylindrical'} tank: ${shape === 'box' ? `${w} ${u.len} wide` : `radius ${w} ${u.len}`}, ${H} ${u.len} tall, full of water${s ? `, with a spout ${s} ${u.len} above the top` : ''}. A horizontal slice at height y is lifted ${lift} − y.` }),
    ...exactChoices(
      right,
      [
        { k: rgK(base * H * lift, u, pi), why: R`Only the bottom layer is lifted the full ${lift} ${u.len}. A layer at height \(y\) is lifted \(${lift} - y\).` },
        s ? { k: rgK(frac(base * H * H, 2), u, pi), why: R`Every layer also has to climb the spout, so the lift is \(${lift} - y\), not \(${H} - y\).` } : { k: rgK(base * H, u, pi), why: R`\(${sliceA}\,dy\) is the volume of one slice. The lift \(${H} - y\) changes from slice to slice, so it has to be integrated.` },
        s ? { k: rgK(frac(base * lift * lift, 2), u, pi), why: R`The water fills the tank from \(y = 0\) to \(y = ${H}\), so integrate over that interval, not up to the spout.` } : null,
        shape === 'cyl' && w !== 2 ? { k: rgK(c.mul(2).div(w), u, true), why: R`A slice is a disc of area \(\pi r^{2}\), not a circle of length \(2\pi r\).` } : null,
        shape === 'cyl' ? { k: rgK(c, u, false), why: R`The slice is a disc with area \(\pi(${w})^{2}\); the \(\pi\) is missing.` } : null,
        { k: K([[c, '']]), why: R`That is \(\int(\text{volume of slice})(\text{lift})\). Each slice’s weight is \(\rho g\) times its volume, so multiply by \(\rho g\).` },
        rgK(c.mul(2), u, pi),
        rgK(c.div(2), u, pi),
      ],
      unitWrap(u.work),
    ),
    solution: [
      R`Measure \(y\) up from the bottom. A slice at height \(y\) has volume \(${sliceA}\,dy\), weight \(\rho g\cdot ${sliceA}\,dy\), and is lifted \(${lift} - y\).`,
      R`\(W = \displaystyle\int_{0}^{${H}} \rho g\cdot ${sliceA}\,(${lift} - y)\,dy = \rho g\cdot ${sliceA}\Big[${lift}y - \tfrac{1}{2}y^{2}\Big]_{0}^{${H}}\).`,
      R`\(W = ${right.tex}\) ${u.work}, about \(${about(right.value)}\) ${u.work}.`,
    ],
    rule: 3,
    skill: 'pumping liquid',
    check: () => agree(midSum((y) => u.rg * area(y) * (lift - y), 0, H), right.value),
  });
}

function mediumPlate(rng) {
  const u = pickUnits(rng);
  const shape = rng.pick(['rect', 'triDown', 'triUp']);
  const a = rng.int(1, 6);
  const h = shape === 'rect' ? rng.int(1, 4) : rng.pick([3, 6]);
  const d = rng.int(0, 3);
  const A = shape === 'rect' ? frac(a * h) : frac(a * h, 2);
  const wAt = { rect: () => a, triDown: (y) => (a * (d + h - y)) / h, triUp: (y) => (a * (y - d)) / h }[shape];
  const cbar = { rect: frac(2 * d + h, 2), triDown: frac(3 * d + h, 3), triUp: frac(3 * d + 2 * h, 3) }[shape];
  const right = rgK(A.mul(cbar), u);
  const lu = u.len;
  const at = d === 0 ? 'at the surface' : `${d} ${lu} below the surface`;
  const desc = {
    rect: R`a rectangle ${a} ${lu} wide and ${h} ${lu} tall, with its top edge ${at}`,
    triDown: R`a triangle with a horizontal top edge ${a} ${lu} long, ${at}, and its third vertex ${h} ${lu} below that edge`,
    triUp: R`a triangle with its top vertex ${at} and a horizontal base ${a} ${lu} long, ${h} ${lu} below the vertex`,
  }[shape];
  const co = frac(a, h).eq(1) ? '' : frac(a, h).tex();
  const width = { rect: `${a}`, triDown: R`${co}(${d + h} - y)`, triUp: d === 0 ? R`${co}y` : R`${co}(y - ${d})` }[shape];
  const widthNote = { rect: R`The width is \(${a}\) at every depth.`, triDown: R`By similar triangles the width at depth \(y\) is \(${width}\): ${a} at the top edge, 0 at the vertex.`, triUp: R`By similar triangles the width at depth \(y\) is \(${width}\): 0 at the vertex, ${a} at the base.` }[shape];
  return q({
    prompt: R`A flat plate hangs vertically in water. It is ${desc}. Find the hydrostatic force on one side of the plate. ${u.note} Give the answer in terms of \(\rho g\).`,
    visual: platePic({ shape, a, h, d, u, alt: `The water surface is a horizontal line. Below it is ${shape === 'rect' ? `a rectangular plate ${a} ${lu} wide and ${h} ${lu} tall` : shape === 'triDown' ? `a triangular plate with a ${a} ${lu} top edge and its vertex ${h} ${lu} lower` : `a triangular plate with its vertex at the top and a ${a} ${lu} base ${h} ${lu} lower`}; the top of the plate is ${d === 0 ? 'at the surface' : `${d} ${lu} below the surface`}. A horizontal strip at depth y is drawn.` }),
    ...exactChoices(
      right,
      [
        { k: rgK(A.mul(d + h), u), why: R`Pressure \(\rho g\cdot\text{depth}\) grows with depth, so it cannot all be taken at the bottom edge. Add \(\rho g\cdot y\cdot\text{width}\,dy\) over the strips.` },
        d > 0 ? { k: rgK(A.mul(d), u), why: 'The pressure at the top edge is the smallest pressure on the plate. Integrate depth × width over the strips.' } : null,
        shape !== 'rect' ? { k: rgK(A.mul(frac(2 * d + h, 2)), u), why: R`That uses the depth halfway down. A triangle’s area is not centred halfway down: the width changes with depth, so integrate \(y\cdot\text{width}\).` } : { k: rgK(frac(a * (d + h) ** 2, 2), u), why: R`The plate starts at depth ${d}, so integrate from \(y = ${d}\), not from 0.` },
        shape === 'triDown' ? { k: rgK(A.mul(frac(3 * d + 2 * h, 3)), u), why: 'Here the wide edge is at the top, so the width shrinks as the depth grows.' } : null,
        shape === 'triUp' ? { k: rgK(A.mul(frac(3 * d + h, 3)), u), why: 'Here the vertex is at the top, so the width grows with depth.' } : null,
        { k: rgK(frac((d + h) ** 2 - d * d, 2), u), why: R`The force on a strip is pressure × area, and its area is width × \(dy\). The width is missing.` },
        rgK(A.mul(cbar).mul(2), u),
        rgK(A.mul(cbar).div(2), u),
        rgK(A.mul(cbar).mul(3), u),
      ],
      unitWrap(u.force),
    ),
    solution: [
      R`Measure depth \(y\) down from the surface. A strip at depth \(y\) feels pressure \(\rho g y\) and has area \(\text{width}\cdot dy\). ${widthNote}`,
      R`\(F = \displaystyle\int_{${d}}^{${d + h}} \rho g\,y\cdot ${width}\,dy\).`,
      R`\(F = ${right.tex}\) ${u.force}, about \(${about(right.value)}\) ${u.force}.`,
    ],
    rule: 4,
    skill: 'hydrostatic force',
    check: () => agree(midSum((y) => u.rg * y * wAt(y), d, d + h), right.value),
  });
}

// ───────────── Hard ─────────────

function hardPumpPartial(rng) {
  const u = pickUnits(rng);
  const cone = rng.bool(0.7);
  const shape = cone ? 'cone' : 'cyl';
  const R0 = cone ? rng.pick([1, 2, 3, 4, 6]) : rng.int(1, 4);
  const H = rng.pick([3, 4, 5, 6, 8, 9, 10, 12]);
  const d = cone ? rng.pick([H, H, Math.ceil(H / 2), H - 1]) : rng.int(1, H - 1);
  const s = rng.pick([0, 1, 2]);
  const { c, area, lift } = pumpSetup(shape, R0, H, d, s);
  const right = rgK(c, u, true);
  const lu = u.len;
  const exit = s ? R`through a spout ${s} ${lu} above the top of the tank` : 'over the top of the tank';
  const fill = d === H ? 'is full of water' : R`holds water to a depth of ${d} ${lu}`;
  const tank = cone ? R`an inverted circular cone (vertex at the bottom) with radius ${R0} ${lu} at the top and height ${H} ${lu}` : R`an upright cylinder with radius ${R0} ${lu} and height ${H} ${lu}`;
  const rad = cone ? (R0 === H ? 'y' : `${frac(R0, H).tex()}y`) : `${R0}`;
  const ratio2 = frac(R0 * R0, H * H);
  const wrongs = cone
    ? [
        { k: rgK(frac(R0 * R0 * (2 * d * lift - d * d), 2), u, true), why: R`That treats the tank as a cylinder of radius ${R0}. In a cone the radius of a slice at height \(y\) is \(${rad}\).` },
        { k: rgK(ratio2.mul(frac(d ** 4, 4)), u, true), why: R`\(y\) is the height of the slice, not the distance it travels. It is lifted \(${lift} - y\).` },
        R0 !== H ? { k: rgK(frac(R0, H).mul(frac(lift * d * d, 2).sub(frac(d ** 3, 3))), u, true), why: R`A slice is a disc of area \(\pi r^{2}\). Square the radius \(${rad}\).` } : null,
        s ? { k: rgK(ratio2.mul(frac(H * d ** 3, 3).sub(frac(d ** 4, 4))), u, true), why: R`The water also climbs the ${s} ${lu} spout, so the lift is \(${lift} - y\).` } : null,
        rgK(c.mul(2), u, true),
        rgK(c.mul(3), u, true),
      ]
    : [
        { k: rgK(R0 * R0 * d * lift, u, true), why: R`Only the bottom layer is lifted the full ${lift} ${lu}. A layer at height \(y\) is lifted \(${lift} - y\).` },
        { k: rgK(frac(R0 * R0 * d * d, 2), u, true), why: R`The water goes to the ${s ? 'spout' : 'top of the tank'}, not to the water surface. A layer at height \(y\) is lifted \(${lift} - y\).` },
        { k: rgK(frac(R0 * R0 * (2 * H * lift - H * H), 2), u, true), why: R`The tank is only filled to ${d} ${lu}, so integrate from 0 to ${d}.` },
        s ? { k: rgK(frac(R0 * R0 * (2 * d * H - d * d), 2), u, true), why: R`The water also climbs the ${s} ${lu} spout, so the lift is \(${lift} - y\).` } : null,
        rgK(c.mul(2), u, true),
      ];
  const integrand = cone ? R`\pi\left(${rad}\right)^{2}(${lift} - y)` : R`\pi(${R0})^{2}(${lift} - y)`;
  return q({
    prompt: R`A tank shaped like ${tank} ${fill}. Find the work needed to pump the water out ${exit}. ${u.note} Give the answer in terms of \(\rho g\).`,
    visual: tankPic({ shape, half: R0, H, d, s, u, widthLabel: `radius ${R0} ${lu}`, alt: `Cross-section of the ${cone ? 'cone, vertex down' : 'cylinder'}: radius ${R0} ${lu}${cone ? ' at the top' : ''}, height ${H} ${lu}, water ${d} ${lu} deep${s ? `, spout ${s} ${lu} above the top` : ''}. A slice at height y is lifted ${lift} − y.` }),
    ...exactChoices(right, wrongs, unitWrap(u.work)),
    solution: [
      R`Measure \(y\) up from the bottom. ${cone ? R`By similar triangles a slice at height \(y\) is a disc of radius \(${rad}\).` : R`Each slice is a disc of radius ${R0}.`} It is lifted \(${lift} - y\).`,
      R`\(W = \displaystyle\int_{0}^{${d}} \rho g\,${integrand}\,dy\)${cone ? R` \(= ${fterms([[ratio2, '\\pi\\rho g']])}\displaystyle\int_{0}^{${d}} \left(${lift}y^{2} - y^{3}\right)dy\)` : ''}.`,
      R`\(W = ${right.tex}\) ${u.work}, about \(${about(right.value)}\) ${u.work}.`,
    ],
    rule: 3,
    skill: 'pumping liquid',
    check: () => agree(midSum((y) => u.rg * area(y) * (lift - y), 0, d), right.value),
  });
}

function hardLeakyBucket(rng) {
  const u = pickUnits(rng);
  const metric = u === UNITS.metric;
  const H = rng.pick([10, 12, 15, 20, 24, 30]);
  const B = metric ? rng.int(5, 20) : rng.int(2, 6);
  const W0 = rng.pick(metric ? [50, 60, 80, 100, 120] : [20, 24, 30, 40]);
  const W1 = rng.pick(metric ? [0, 10, 20, 30, 40] : [0, 4, 6, 10]);
  const r = rng.pick([0, 0.5, 1, 2]);
  const bucketW = H * (B + (W0 + W1) / 2);
  const ropeW = (r * H * H) / 2;
  const W = bucketW + ropeW;
  const fu = u.force;
  const arrive = W1 === 0 ? 'just as it reaches the top the last of the water runs out' : `it reaches the top with ${W1} ${fu} of water left`;
  const rope = r === 0 ? 'The weight of the rope can be ignored.' : `The rope weighs ${num(r)} ${u.per}.`;
  return q({
    prompt: R`A bucket weighing ${B} ${fu} holds ${W0} ${fu} of water. It is pulled up at a constant speed from the bottom of a well ${H} ${u.len} deep. Water leaks out at a constant rate, and ${arrive}. ${rope} How much work is done?`,
    correct: W,
    unit: u.work,
    wrong: [
      { value: H * (B + W0) + ropeW, why: 'That lifts all of the water the whole way. The water leaks steadily, so the load gets lighter as the bucket rises.' },
      r > 0 ? { value: bucketW, why: R`The rope is lifted too. A piece of rope \(y\) below the top rises \(y\), which adds \(\int_{0}^{${H}} ${terms([[r, 'y']])}\,dy = ${num(ropeW)}\).` } : { value: H * (B + W1), why: 'The bucket starts out heavier. Its weight goes down steadily from the bottom to the top.' },
      r > 0 ? { value: bucketW + 2 * ropeW, why: R`The rope’s part is \(\int_{0}^{${H}} ${terms([[r, 'y']])}\,dy = ${num(ropeW)}\), with a factor \(\frac{1}{2}\) from integrating \(y\).` } : null,
      H * (B + W1) + ropeW,
      H * (W0 + W1) / 2 + ropeW,
    ],
    solution: [
      R`When the bucket is \(y\) ${u.len} above the bottom, the water left is \(${terms([[W0, ''], [frac(W1 - W0, H), 'y']])}\), so bucket plus water weigh \(${terms([[B + W0, ''], [frac(W1 - W0, H), 'y']])}\).`,
      R`Bucket and water: \(\displaystyle\int_{0}^{${H}} \left(${terms([[B + W0, ''], [frac(W1 - W0, H), 'y']])}\right)dy = ${num(bucketW)}\).`,
      r > 0 ? R`Rope: a piece \(y\) below the top rises \(y\): \(\displaystyle\int_{0}^{${H}} ${terms([[r, 'y']])}\,dy = ${num(ropeW)}\).` : 'The rope adds nothing.',
      R`\(W = ${num(W)}\) ${u.work}.`,
    ],
    rule: 2,
    skill: 'leaking bucket',
    check: () => agree(midSum((y) => B + W0 - ((W0 - W1) * y) / H, 0, H) + midSum((z) => r * z, 0, H), W),
  });
}

function hardCentroid(rng) {
  const reg = centroidRegion(rng);
  const xbar = reg.My.div(reg.A);
  const ybar = reg.Mx.div(reg.A);
  return q({
    prompt: R`Find the centroid \((\bar{x}, \bar{y})\) of ${reg.desc}.`,
    visual: regionPlot(reg.top, reg.bottom, 0, reg.b, { alt: `${reg.altDesc[0].toUpperCase()}${reg.altDesc.slice(1)}, shaded.` }),
    ...pointChoices({ p: [xbar, ybar] }, [
      { p: [xbar, ybar.mul(2)], why: R`\(\bar{y} = \frac{1}{A}\int \frac{1}{2}\left(f^{2} - g^{2}\right)dx\). The \(\frac{1}{2}\) is missing: a strip’s own center is halfway up.` },
      { p: [ybar, xbar], why: R`The moment \(\int x(f - g)\,dx\) gives \(\bar{x}\), and \(\int \frac{1}{2}(f^{2} - g^{2})\,dx\) gives \(\bar{y}\).` },
      { p: [reg.My, reg.Mx], why: R`Those are the moments \(M_{y}\) and \(M_{x}\). Divide each by the area \(A = ${reg.A.tex()}\).` },
      { p: [frac(reg.b, 2), ybar] },
      { p: [xbar, frac(Math.round(reg.top(reg.b)), 2)] },
    ]),
    solution: [
      R`Area: \(A = ${reg.Atex} = ${reg.A.tex()}\).`,
      R`\(M_{y} = ${reg.Mytex} = ${reg.My.tex()}\), so \(\bar{x} = \dfrac{M_{y}}{A} = ${xbar.tex()}\).`,
      R`\(M_{x} = ${reg.Mxtex} = ${reg.Mx.tex()}\), so \(\bar{y} = \dfrac{M_{x}}{A} = ${ybar.tex()}\).`,
      R`The centroid is \(\left(${xbar.tex()}, ${ybar.tex()}\right)\).`,
    ],
    rule: 5,
    skill: 'centroid of a region',
    check: () => {
      const [nx, ny, nA] = numericCentroid(reg);
      return close(nx, xbar.value, 1e-4) && close(ny, ybar.value, 1e-4) && close(nA, reg.A.value, 1e-4) ? true : `numeric centroid (${nx}, ${ny}), area ${nA}`;
    },
  });
}

// ───────────── Challenge ─────────────

function challengePappus(rng) {
  const reg = centroidRegion(rng);
  const xbar = reg.My.div(reg.A);
  const ybar = reg.Mx.div(reg.A);
  const c = rng.int(1, 3);
  const axis = rng.pick(['left', 'right', 'below']);
  const x0 = axis === 'left' ? -c : reg.b + c;
  const dist = axis === 'left' ? xbar.add(c) : axis === 'right' ? frac(reg.b + c).sub(xbar) : ybar.add(c);
  const piK = (f) => K([[f, '\\pi']]);
  const right = piK(dist.mul(reg.A).mul(2));
  const line = axis === 'below' ? R`y = ${-c}` : R`x = ${x0}`;
  const nearest = axis === 'below' ? ybar : xbar;
  const other = axis === 'below' ? xbar.add(c) : ybar.add(c);
  return q({
    prompt: R`Use the theorem of Pappus to find the volume of the solid formed when ${reg.desc} is revolved about the line \(${line}\).`,
    visual: regionPlot(reg.top, reg.bottom, 0, reg.b, { hline: axis === 'below' ? -c : undefined, vline: axis === 'below' ? undefined : x0, alt: `${reg.altDesc[0].toUpperCase()}${reg.altDesc.slice(1)}, shaded, with the axis of rotation ${axis === 'below' ? `y = ${-c}` : `x = ${x0}`} drawn as a dashed line.` }),
    ...exactChoices(right, [
      { k: piK(nearest.mul(reg.A).mul(2)), why: R`The centroid travels around the line \(${line}\), so its path radius is its distance to that line, not to the ${axis === 'below' ? 'x' : 'y'}-axis.` },
      { k: piK(dist.mul(reg.A)), why: R`The centroid travels a circle of circumference \(2\pi d\), not \(\pi d\).` },
      { k: piK(other.mul(reg.A).mul(2)), why: R`For a ${axis === 'below' ? 'horizontal' : 'vertical'} axis the distance is ${axis === 'below' ? 'vertical, so use ȳ' : 'horizontal, so use x̄'}.` },
      { k: piK(frac(c).mul(reg.A).mul(2)), why: R`\(d\) is the distance from the centroid to the axis, not from the axis to the ${axis === 'below' ? 'x' : 'y'}-axis${axis === 'right' ? ' or the edge of the region' : ''}.` },
      { k: piK(dist.mul(2)), why: 'Pappus multiplies the distance the centroid travels by the area of the region. The area is missing.' },
      piK(dist.mul(dist).mul(reg.A)),
      piK(dist.mul(reg.A).mul(4)),
    ]),
    solution: [
      R`Area \(A = ${reg.A.tex()}\). Centroid: \(\bar{x} = ${xbar.tex()}\), \(\bar{y} = ${ybar.tex()}\).`,
      R`Distance from the centroid to the axis \(${line}\): \(d = ${dist.tex()}\).`,
      R`Pappus: \(V = 2\pi d A = 2\pi\cdot ${dist.tex()}\cdot ${reg.A.tex()} = ${right.tex}\).`,
    ],
    rule: 5,
    skill: 'theorem of Pappus',
    check: () => {
      const v = axis === 'below'
        ? midSum((x) => PI * ((reg.top(x) + c) ** 2 - (reg.bottom(x) + c) ** 2), 0, reg.b, 20000)
        : midSum((x) => 2 * PI * Math.abs(x - x0) * (reg.top(x) - reg.bottom(x)), 0, reg.b, 20000);
      return agree(v, right.value, 1e-5);
    },
  });
}

function challengeWindow(rng) {
  const u = pickUnits(rng);
  const down = rng.bool();
  const r = rng.int(1, 4);
  const d = rng.int(0, 5);
  const D = down ? d : d + r; // depth of the diameter
  const sg = down ? 1 : -1; // + for the curved edge below the diameter
  const right = K([[frac(D * r * r, 2), RG(u, true)], [frac(sg * 2 * r ** 3, 3), RG(u)]]);
  const lu = u.len;
  const at = d === 0 ? 'at the surface' : `${d} ${lu} below the surface`;
  const what = down
    ? R`a semicircular viewing window of radius ${r} ${lu} in the vertical wall of an aquarium. Its straight edge (the diameter) is horizontal and on top, ${at}, and the curved edge is below it`
    : R`a semicircular gate of radius ${r} ${lu} in a vertical dam wall. Its straight edge (the diameter) is horizontal at the bottom, and the top of the arch is ${at}`;
  const dep = D === 0 ? 't' : `${D} ${down ? '+' : '-'} t`;
  const half = () => K([[frac(D * r * r, 4), RG(u, true)], [frac(sg * r ** 3, 3), RG(u)]]);
  return q({
    prompt: R`Find the force of the water on ${what}. ${u.note} Give the answer in terms of \(\rho g\).`,
    visual: platePic({ shape: down ? 'semiDown' : 'semiUp', a: 2 * r, h: r, d, u, alt: `The water surface is a horizontal line. A half-disc of radius ${r} ${lu} sits below it with its diameter ${down ? 'on top' : 'at the bottom'}; the top of the shape is ${d === 0 ? 'at the surface' : `${d} ${lu} below the surface`}. A horizontal strip at depth y is drawn.` }),
    ...exactChoices(
      right,
      [
        D > 0 ? { k: K([[frac(D * r * r, 2), RG(u, true)]]), why: R`That uses the depth of the diameter for the whole plate. Part of the plate is ${down ? 'deeper' : 'shallower'} than the diameter, so integrate depth × width.` } : null,
        { k: K([[frac((2 * D + sg * r) * r * r, 4), RG(u, true)]]), why: R`That uses the depth halfway across the half-disc. Its area is not centred there; integrate \((\text{depth})\cdot 2\sqrt{${r * r} - t^{2}}\).` },
        D > 0 ? { k: K([[frac(D * r * r, 2), RG(u, true)], [frac(-sg * 2 * r ** 3, 3), RG(u)]]), why: R`The curved part is ${down ? 'below' : 'above'} the diameter, so its depth is \(${dep}\), where \(t\) is the distance from the diameter.` } : null,
        down ? { k: K([[frac((D + r) * r * r, 2), RG(u, true)]]), why: R`That uses the deepest point, ${D + r} ${lu} down, for the whole window. Shallower strips feel less pressure.` } : null,
        { k: half(), why: R`A strip at distance \(t\) from the diameter spans the whole chord, \(2\sqrt{${r * r} - t^{2}}\), not half of it.` },
      ],
      unitWrap(u.force),
    ),
    solution: [
      R`Let \(t\) be the distance from the diameter (\(0 \le t \le ${r}\)). The strip there has width \(2\sqrt{${r * r} - t^{2}}\) and depth \(${dep}\).`,
      R`\(F = \rho g\displaystyle\int_{0}^{${r}} ${D === 0 ? 't' : `(${dep})`}\,2\sqrt{${r * r} - t^{2}}\,dt\).`,
      R`\(\displaystyle\int_{0}^{${r}} 2\sqrt{${r * r} - t^{2}}\,dt = ${fterms([[frac(r * r, 2), '\\pi']])}\) (the area of the half-disc) and \(\displaystyle\int_{0}^{${r}} 2t\sqrt{${r * r} - t^{2}}\,dt = ${frac(2 * r ** 3, 3).tex()}\).`,
      R`\(F = ${right.tex}\) ${u.force}, about \(${about(right.value)}\) ${u.force}.`,
    ],
    rule: 4,
    skill: 'hydrostatic force',
    check: () => agree(midSum((y) => u.rg * y * 2 * Math.sqrt(Math.max(0, r * r - (y - D) ** 2)), down ? D : D - r, down ? D + r : D, 40000), right.value, 1e-5),
  });
}

function challengeSpringBack(rng) {
  const L0 = rng.pick([10, 15, 20, 25, 30]);
  const W1 = frac(rng.pick([2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30]), 10);
  if (rng.bool(0.6)) {
    let a;
    let b;
    let W2;
    for (let t = 0; t < 60; t++) {
      a = rng.pick([2, 4, 5, 10]);
      b = a + rng.int(1, 15);
      W2 = W1.mul(frac(b * b - a * a, a * a));
      if (terminates(W2, 3)) break;
    }
    if (!terminates(W2, 3)) [a, b, W2] = [10, 20, W1.mul(3)];
    return q({
      prompt: R`It takes ${num(W1.value)} J of work to stretch a spring from its natural length of ${L0} cm to a length of ${L0 + a} cm. How much work is needed to stretch it from ${L0 + a} cm to ${L0 + b} cm?`,
      correct: W2.value,
      unit: 'J',
      wrong: [
        { value: W1.mul(frac(b - a, a)).value, why: R`Work on a spring grows with the square of the stretch: \(W = \frac{1}{2}kx^{2}\), not in proportion to \(x\).` },
        { value: W1.mul(frac(b * b, a * a)).value, why: `That is the work from the natural length to ${L0 + b} cm. Subtract the ${num(W1.value)} J already done.` },
        { value: W1.mul(frac((b - a) ** 2, a * a)).value, why: R`Stretches are measured from the natural length: from ${a} cm to ${b} cm, so the work is \(\frac{1}{2}k(x_{2}^{2} - x_{1}^{2})\).` },
        W1.mul(frac(b, a)).value,
      ],
      solution: [
        R`Measure stretch from the natural length: from 0 to \(${num(a / 100)}\) m costs ${num(W1.value)} J, so \(\frac{1}{2}k(${num(a / 100)})^{2} = ${num(W1.value)}\) and \(k = ${num(W1.mul(20000).div(a * a))}\) N/m.`,
        R`From \(${num(a / 100)}\) m to \(${num(b / 100)}\) m: \(W = \frac{1}{2}k\left((${num(b / 100)})^{2} - (${num(a / 100)})^{2}\right)\).`,
        R`\(W = ${num(W2.value)}\) J. (Check: it is \(\frac{${b}^{2} - ${a}^{2}}{${a}^{2}}\) times the first ${num(W1.value)} J.)`,
      ],
      rule: 1,
      skill: 'springs',
      check: () => {
        const k = W1.value / midSum((x) => x, 0, a / 100);
        return agree(midSum((x) => k * x, a / 100, b / 100), W2.value);
      },
    });
  }
  let a;
  let P;
  let x;
  for (let t = 0; t < 80; t++) {
    a = rng.pick([2, 4, 5, 8, 10]);
    P = rng.pick([5, 6, 8, 10, 12, 15, 20, 24, 25, 30, 40]);
    x = frac(P * a * a, 200).div(W1); // centimetres
    if (terminates(x, 2) && x.value <= 60 && x.value >= 0.5) break;
  }
  if (!(terminates(x, 2) && x.value <= 60 && x.value >= 0.5)) [a, P, x] = [10, 20, frac(10).div(W1).mul(1)];
  if (!terminates(x, 2)) return challengeSpringBack(rng);
  const k = W1.mul(20000).div(a * a);
  return q({
    prompt: R`It takes ${num(W1.value)} J of work to stretch a spring from its natural length of ${L0} cm to a length of ${L0 + a} cm. How far beyond its natural length will a force of ${P} N hold the spring?`,
    correct: x.value,
    unit: 'cm',
    wrong: [
      { value: x.value * 2, why: R`The work is \(\frac{1}{2}kx^{2}\), so \(k = \frac{2W}{x^{2}}\). The 2 is missing.` },
      { value: x.value / 2, why: R`\(W = \frac{1}{2}kx^{2}\) gives \(k = \frac{2W}{x^{2}}\), not \(\frac{4W}{x^{2}}\).` },
      { value: x.value * 100, why: 'Change centimetres to metres before finding k in N/m.' },
      x.value + a,
    ],
    solution: [
      R`\(\frac{1}{2}k(${num(a / 100)})^{2} = ${num(W1.value)}\), so \(k = \dfrac{2(${num(W1.value)})}{(${num(a / 100)})^{2}} = ${num(k)}\) N/m.`,
      R`Hooke’s law: \(${P} = ${num(k)}x\), so \(x = ${num(x.value / 100)}\) m.`,
      R`That is ${num(x.value)} cm beyond the natural length (a length of ${num(L0 + x.value)} cm).`,
    ],
    rule: 1,
    skill: 'springs',
    check: () => {
      const kk = W1.value / midSum((z) => z, 0, a / 100);
      return agree(kk * (x.value / 100), P);
    },
  });
}

// ───────────── Topic ─────────────

function tankModel({ shape, w, H, d, s, units }) {
  const u = UNITS[units];
  const lu = u.len;
  if (d > H) return { error: 'The water cannot be deeper than the tank. Make the depth at most the height.' };
  const { c, pi, lift } = pumpSetup(shape, w, H, d, s);
  const right = rgK(c, u, pi);
  const slice = { box: `${w * w}`, cyl: R`\pi(${w})^{2}`, cone: R`\pi\left(${w === H ? '' : frac(w, H).tex()}y\right)^{2}` }[shape];
  const name = { box: `a box with a ${w} ${lu} by ${w} ${lu} base and height ${H} ${lu}`, cyl: `an upright cylinder of radius ${w} ${lu} and height ${H} ${lu}`, cone: `an inverted cone of top radius ${w} ${lu} and height ${H} ${lu}` }[shape];
  return {
    problem: R`A tank shaped like ${name} holds water ${d} ${lu} deep. How much work does it take to pump all of it ${s ? `through a spout ${s} ${lu} above the top` : 'over the top'}?`,
    steps: [
      R`Measure \(y\) up from the bottom. A slice at height \(y\) has volume \(${slice}\,dy\)${shape === 'cone' ? R` (by similar triangles its radius is \(${w === H ? '' : frac(w, H).tex()}y\))` : ''} and is lifted \(${lift} - y\).`,
      R`\(W = \displaystyle\int_{0}^{${d}} \rho g\,${slice}\,(${lift} - y)\,dy = ${right.tex}\).`,
      R`${u.note} So \(W \approx ${about(right.value)}\) ${u.work}.`,
    ],
    answer: R`\(${right.tex} \approx ${about(right.value)}\) ${u.work}`,
    visual: tankPic({ shape, half: shape === 'box' ? w / 2 : w, H, d, s, u, widthLabel: shape === 'box' ? `${w} ${lu}` : `radius ${w} ${lu}`, alt: `Cross-section of the tank: ${name}, water ${d} ${lu} deep${s ? `, spout ${s} ${lu} above the top` : ''}. A slice at height y is lifted ${lift} − y.` }),
  };
}

function plateModel({ shape, a, h, d, units }) {
  const u = UNITS[units];
  const lu = u.len;
  let right;
  let steps;
  if (shape === 'semi') {
    const r = a / 2;
    if (!Number.isInteger(r)) return { error: 'For the half-disc, choose an even width so the radius is a whole number.' };
    right = K([[frac(d * r * r, 2), RG(u, true)], [frac(2 * r ** 3, 3), RG(u)]]);
    steps = [
      R`The half-disc has radius ${r}, diameter on top at depth ${d}. At distance \(t\) below the diameter the strip has width \(2\sqrt{${r * r} - t^{2}}\) and depth \(${d} + t\). (The height input is not used.)`,
      R`\(F = \rho g\displaystyle\int_{0}^{${r}} (${d} + t)\,2\sqrt{${r * r} - t^{2}}\,dt = ${right.tex}\).`,
    ];
  } else {
    const A = shape === 'rect' ? frac(a * h) : frac(a * h, 2);
    const cbar = { rect: frac(2 * d + h, 2), triDown: frac(3 * d + h, 3) }[shape];
    right = rgK(A.mul(cbar), u);
    const width = shape === 'rect' ? `${a}` : R`\frac{${a}}{${h}}(${d + h} - y)`;
    steps = [
      R`Measure depth \(y\) down from the surface. The strip at depth \(y\) has width \(${width}\) and feels pressure \(\rho g y\).`,
      R`\(F = \displaystyle\int_{${d}}^{${d + h}} \rho g\,y\cdot ${width}\,dy = ${right.tex}\).`,
    ];
  }
  steps.push(R`${u.note} So \(F \approx ${about(right.value)}\) ${u.force}.`);
  const pic = shape === 'semi' ? { shape: 'semiDown', a, h: a / 2 } : { shape, a, h };
  return {
    steps,
    answer: R`\(${right.tex} \approx ${about(right.value)}\) ${u.force}`,
    visual: platePic({ ...pic, d, u, alt: `A vertical ${shape === 'rect' ? 'rectangle' : shape === 'semi' ? 'half-disc' : 'triangle, vertex down,'} ${a} ${lu} wide with its top ${d} ${lu} below the water surface.` }),
  };
}

export default {
  id: 'physical-applications',
  title: 'Work, Fluid Force & Centers of Mass',
  summary: 'Set up and evaluate integrals for work, pumping, hydrostatic force, moments and centroids by slicing the physical object.',
  standards: ['Calculus II: work', 'Calculus II: hydrostatic force', 'Calculus II: moments and centers of mass'],

  explain: {
    intro: R`Many physical totals are “amount per piece × size of piece”, added up. When the amount changes from piece to piece, cut the object into thin slices, write the contribution of one slice, and integrate. Work is force × distance, fluid force is pressure × area, and a moment is mass × distance.`,
    rules: [
      {
        title: 'Work by a variable force',
        text: R`If a force \(F(x)\) acts along a line from \(x = a\) to \(x = b\), the work is \(W = \displaystyle\int_{a}^{b} F(x)\,dx\). Newtons × metres give joules (J); pounds × feet give foot-pounds.`,
        example: R`\(F(x) = 3x^{2}\) N from \(x = 0\) to \(x = 2\) m: \(W = \displaystyle\int_{0}^{2} 3x^{2}\,dx = 8\) J.`,
      },
      {
        title: 'Springs (Hooke’s law)',
        text: R`A spring stretched \(x\) beyond its natural length pulls back with \(F = kx\). Find \(k\) from one measurement (with \(x\) in metres), then \(W = \displaystyle\int_{x_1}^{x_2} kx\,dx = \tfrac{1}{2}k\left(x_{2}^{2} - x_{1}^{2}\right)\).`,
        example: R`40 N holds a spring 0.1 m past natural length, so \(k = 400\) N/m. From 0.1 m to 0.25 m: \(W = 200(0.0625 - 0.01) = 10.5\) J.`,
      },
      {
        title: 'Lifting cables, chains and leaking buckets',
        text: R`Slice the cable into pieces \(dy\). A piece at depth \(y\) weighs (weight per length)\(\cdot dy\) and is lifted \(y\). For a bucket whose load changes as it rises, integrate its weight at height \(y\) over the height.`,
        example: R`A 20 m cable of 3 N/m wound up: \(W = \displaystyle\int_{0}^{20} 3y\,dy = 600\) J.`,
      },
      {
        title: 'Pumping liquid out of a tank',
        text: R`Slice the liquid horizontally. A slice at height \(y\) has volume \(A(y)\,dy\), weight \(\rho g A(y)\,dy\), and is lifted to the outlet: \(W = \displaystyle\int \rho g\,A(y)\,(\text{lift})\,dy\). Water: \(\rho g = 9800\) N/m³ or \(62.4\) lb/ft³.`,
        example: R`Full cylinder, radius 2 m, height 5 m, pumped to 1 m above the top: \(W = \displaystyle\int_{0}^{5} \rho g\,4\pi(6 - y)\,dy = 70\pi\rho g\) J.`,
      },
      {
        title: 'Hydrostatic force on a vertical plate',
        text: R`Pressure at depth \(y\) is \(\rho g y\), the same in every direction. A horizontal strip at depth \(y\) of width \(w(y)\) feels force \(\rho g\,y\,w(y)\,dy\), so \(F = \displaystyle\int \rho g\,y\,w(y)\,dy\).`,
        example: R`A triangle with a 4 m top edge at the surface and its vertex 3 m down: \(w(y) = \frac{4}{3}(3 - y)\), \(F = \rho g\displaystyle\int_{0}^{3} y\cdot\frac{4}{3}(3 - y)\,dy = 6\rho g\) N.`,
      },
      {
        title: 'Moments, centers of mass and centroids',
        text: R`Point masses: \(\bar{x} = \frac{\sum m_{i}x_{i}}{\sum m_{i}}\). The centroid of the region between \(y = f(x)\) above and \(y = g(x)\) below on \([a, b]\), with area \(A\): \(\bar{x} = \frac{1}{A}\displaystyle\int_{a}^{b} x(f - g)\,dx\), \(\bar{y} = \frac{1}{A}\displaystyle\int_{a}^{b} \tfrac{1}{2}\left(f^{2} - g^{2}\right)dx\). Pappus: revolving the region about a line it does not cross gives \(V = 2\pi d A\), where \(d\) is the distance from the centroid to the line.`,
        example: R`Between \(y = x\) and \(y = x^{2}\): \(A = \frac{1}{6}\), \((\bar{x}, \bar{y}) = \left(\frac{1}{2}, \frac{2}{5}\right)\). About the \(x\)-axis, \(V = 2\pi\cdot\frac{2}{5}\cdot\frac{1}{6} = \frac{2\pi}{15}\), the same as by washers.`,
      },
    ],
    vocab: [
      { term: 'work', def: 'Force times the distance moved in the direction of the force; for a changing force, an integral.' },
      { term: 'weight density', def: R`Weight per unit volume, \(\rho g\): 9800 N/m³ or 62.4 lb/ft³ for water.` },
      { term: 'hydrostatic pressure', def: R`The pressure \(\rho g\cdot\text{depth}\) of a fluid at rest.` },
      { term: 'moment', def: R`Mass × signed distance from an axis or point. \(M_{y} = \sum m x\) is the moment about the \(y\)-axis.` },
      { term: 'centroid', def: 'The center of mass of a flat region of uniform density: its balance point.' },
    ],
    mistakes: [
      'Using force × distance when the force changes. Integrate instead.',
      'Leaving centimetres in Hooke’s law when the answer should be in joules.',
      'Measuring the lift from the bottom of the tank instead of from the slice to the outlet, or forgetting the spout.',
      'Using one depth for a whole plate. Pressure grows with depth, so each strip needs its own depth.',
      R`Mixing up the moments: \(M_{y}\) (built from \(x\)) gives \(\bar{x}\), and \(M_{x}\) (built from \(y\)) gives \(\bar{y}\).`,
    ],
    visual: tankPic({ shape: 'cyl', half: 2, H: 5, d: 5, s: 1, u: UNITS.metric, widthLabel: 'radius 2 m', alt: 'Cross-section of a cylindrical tank of radius 2 m and height 5 m, full of water, with a spout 1 m above the top. A horizontal slice at height y is lifted 6 − y to the spout.' }),
  },

  examples: [
    {
      title: 'Word problem: stretching a spring',
      word: true,
      problem: 'A force of 40 N holds a spring stretched 10 cm beyond its natural length. How much work does it take to stretch it from 10 cm to 25 cm beyond its natural length?',
      steps: [
        R`Hooke’s law with \(x\) in metres: \(40 = k(0.1)\), so \(k = 400\) N/m.`,
        R`\(W = \displaystyle\int_{0.1}^{0.25} 400x\,dx = 200\left(0.25^{2} - 0.1^{2}\right) = 200(0.0525)\).`,
      ],
      answer: R`\(10.5\) J`,
    },
    {
      title: 'Word problem: pumping out a cylinder',
      word: true,
      problem: R`An upright cylindrical tank of radius 2 m and height 5 m is full of water. Find the work needed to pump the water out through a spout 1 m above the top. Use \(\rho g = 9800\) N/m³.`,
      steps: [
        R`Measure \(y\) up from the bottom. The slice at height \(y\) is a disc of volume \(\pi(2)^{2}\,dy = 4\pi\,dy\) and weight \(4\pi\rho g\,dy\).`,
        R`It is lifted from height \(y\) to the spout at 6 m: a distance of \(6 - y\).`,
        R`\(W = \displaystyle\int_{0}^{5} 4\pi\rho g(6 - y)\,dy = 4\pi\rho g\Big[6y - \tfrac{1}{2}y^{2}\Big]_{0}^{5} = 4\pi\rho g(17.5) = 70\pi\rho g\).`,
      ],
      answer: R`\(70\pi\rho g \approx 2{,}155{,}133\) J, about 2.16 MJ`,
      visual: tankPic({ shape: 'cyl', half: 2, H: 5, d: 5, s: 1, u: UNITS.metric, widthLabel: 'radius 2 m', alt: 'Cross-section of the cylinder: radius 2 m, height 5 m, full, spout 1 m above the top. A slice at height y is lifted 6 − y.' }),
    },
    {
      title: 'Force on a triangular plate',
      problem: R`A vertical triangular plate has a horizontal top edge 4 m long at the water surface and its vertex 3 m below. Find the force of the water on one side.`,
      steps: [
        R`At depth \(y\) the width shrinks in proportion from 4 to 0: \(w(y) = \frac{4}{3}(3 - y)\).`,
        R`\(F = \rho g\displaystyle\int_{0}^{3} y\cdot\frac{4}{3}(3 - y)\,dy = \frac{4}{3}\rho g\Big[\tfrac{3}{2}y^{2} - \tfrac{1}{3}y^{3}\Big]_{0}^{3} = \frac{4}{3}\rho g\cdot\frac{9}{2}\).`,
      ],
      answer: R`\(6\rho g = 58{,}800\) N`,
      visual: platePic({ shape: 'triDown', a: 4, h: 3, d: 0, u: UNITS.metric, alt: 'A triangular plate with its 4 m top edge on the water surface and its vertex 3 m below. A horizontal strip at depth y is drawn.' }),
    },
    {
      title: 'Centroid, checked with Pappus',
      problem: R`Find the centroid of the region between \(y = x\) and \(y = x^{2}\), then use it to find the volume when the region is revolved about the \(x\)-axis.`,
      steps: [
        R`\(A = \displaystyle\int_{0}^{1} (x - x^{2})\,dx = \frac{1}{6}\).`,
        R`\(\bar{x} = 6\displaystyle\int_{0}^{1} x(x - x^{2})\,dx = 6\cdot\frac{1}{12} = \frac{1}{2}\); \(\bar{y} = 6\displaystyle\int_{0}^{1} \tfrac{1}{2}(x^{2} - x^{4})\,dx = 6\cdot\frac{1}{15} = \frac{2}{5}\).`,
        R`Pappus: \(V = 2\pi\bar{y}A = 2\pi\cdot\frac{2}{5}\cdot\frac{1}{6} = \frac{2\pi}{15}\), the same as the washer integral \(\pi\displaystyle\int_{0}^{1} (x^{2} - x^{4})\,dx\).`,
      ],
      answer: R`\(\left(\frac{1}{2}, \frac{2}{5}\right)\); \(V = \frac{2\pi}{15}\)`,
      visual: regionPlot((x) => x, (x) => x * x, 0, 1, { alt: 'The region between the line y = x (above) and the parabola y = x² (below) from x = 0 to x = 1, shaded.' }),
    },
  ],

  models: [
    {
      id: 'pump-a-tank',
      title: 'Word problem: pump out a tank',
      word: true,
      intro: 'Choose the tank, its size, the depth of the water and the height of the spout. Each slice is lifted from its own height to the outlet.',
      inputs: [
        { name: 'shape', label: 'Tank', type: 'select', value: 'cyl', options: [{ value: 'box', label: 'box with a square base' }, { value: 'cyl', label: 'upright cylinder' }, { value: 'cone', label: 'cone, vertex down' }] },
        { name: 'w', label: 'Base side (box) or top radius', type: 'int', min: 1, max: 10, value: 2 },
        { name: 'H', label: 'Height of the tank', type: 'int', min: 1, max: 20, value: 5 },
        { name: 'd', label: 'Depth of the water', type: 'int', min: 1, max: 20, value: 5 },
        { name: 's', label: 'Spout above the top', type: 'int', min: 0, max: 5, value: 1 },
        { name: 'units', label: 'Units', type: 'select', value: 'metric', options: [{ value: 'metric', label: 'metres, joules' }, { value: 'us', label: 'feet, foot-pounds' }] },
      ],
      compute: tankModel,
    },
    {
      id: 'plate-force',
      title: 'Force on a submerged plate',
      intro: 'Choose a plate, its size and how deep its top sits. Each horizontal strip feels pressure ρg·depth.',
      inputs: [
        { name: 'shape', label: 'Plate', type: 'select', value: 'triDown', options: [{ value: 'rect', label: 'rectangle' }, { value: 'triDown', label: 'triangle, vertex down' }, { value: 'semi', label: 'half-disc, diameter on top' }] },
        { name: 'a', label: 'Width of the top edge', type: 'int', min: 1, max: 12, value: 4 },
        { name: 'h', label: 'Height (rectangle, triangle)', type: 'int', min: 1, max: 10, value: 3 },
        { name: 'd', label: 'Depth of the top edge', type: 'int', min: 0, max: 10, value: 0 },
        { name: 'units', label: 'Units', type: 'select', value: 'metric', options: [{ value: 'metric', label: 'metres, newtons' }, { value: 'us', label: 'feet, pounds' }] },
      ],
      compute: plateModel,
    },
  ],

  quiz: {
    easy: [easyVariableForce, easySpring, easyMasses],
    medium: [mediumCable, mediumPumpFull, mediumPlate],
    hard: [hardPumpPartial, hardLeakyBucket, hardCentroid],
    challenge: [challengePappus, challengeWindow, challengeSpringBack],
  },
};
