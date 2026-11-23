import { R, q, frac, Frac, num, terms, person, checkEqual } from '../../lib/index.js';
import { M, mpTex, mpEval, mpClean, piTex, rad, rootOver, primitive, fp, exactDouble, squareWindow } from './_shared.js';

// ───────────── Helpers ─────────────

/** ∫_{a}^{b} ∫_{c}^{d} body d(inner) d(outer) as LaTeX; the outer limits come first. */
const iint = (a, b, c, d, body, inner = 'dy', outer = 'dx') => `\\displaystyle\\int_{${a}}^{${b}}\\int_{${c}}^{${d}} ${body}\\,${inner}\\,${outer}`;
const asFn = (v) => (typeof v === 'function' ? v : () => v);
const root = (v) => Math.sqrt(Math.max(0, v));
const PI = Math.PI;
// Checks are pure, so a numeric result is worked out once per set of numbers.
const memo = new Map();
const cached = (key, fn) => (memo.has(key) ? memo.get(key) : memo.set(key, fn()).get(key));

/** Midpoint sum of f over a ≤ x ≤ b, lo(x) ≤ y ≤ hi(x), on an n × n grid of strips: no antiderivative involved. */
function mid2(f, a, b, lo, hi, n = 300) {
  const [L, H] = [asFn(lo), asFn(hi)];
  const hx = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const x = a + (i + 0.5) * hx;
    const [y0, y1] = [L(x), H(x)];
    const hy = (y1 - y0) / n;
    let t = 0;
    for (let j = 0; j < n; j++) t += f(x, y0 + (j + 0.5) * hy);
    s += t * hy;
  }
  return s * hx;
}
/** Midpoint sum of f(x, y, z) with z between zlo(x, y) and zhi(x, y) over the region of mid2. */
function mid3(f, a, b, ylo, yhi, zlo, zhi, n = 60) {
  const [ZL, ZH] = [zlo, zhi].map((v) => (typeof v === 'function' ? v : () => v));
  return mid2((x, y) => {
    const [z0, z1] = [ZL(x, y), ZH(x, y)];
    const h = (z1 - z0) / n;
    let t = 0;
    for (let k = 0; k < n; k++) t += f(x, y, z0 + (k + 0.5) * h);
    return t * h;
  }, a, b, ylo, yhi, n);
}
/** Midpoint sum (in x and y, not polar) over r1 ≤ r ≤ r2 for part 'full', 'upper' (y ≥ 0), 'right' (x ≥ 0) or 'quarter'. */
function polarMid(f, r1, r2, part, n = 400) {
  const lo = (x) => root(r1 * r1 - x * x);
  const hi = (x) => root(r2 * r2 - x * x);
  if (part === 'quarter') return mid2(f, 0, r2, lo, hi, n);
  if (part === 'right') return mid2((u, w) => f(w, u), -r2, r2, lo, hi, n);
  const up = mid2(f, -r2, r2, lo, hi, n);
  return part === 'upper' ? up : up + mid2((x, y) => f(x, -y), -r2, r2, lo, hi, n);
}
const PARTS = {
  full: { deg: [0, 360], span: frac(2), t: ['0', '2\\pi'], cond: '' },
  upper: { deg: [0, 180], span: frac(1), t: ['0', '\\pi'], cond: ', y \\ge 0' },
  right: { deg: [-90, 90], span: frac(1), t: ['-\\frac{\\pi}{2}', '\\frac{\\pi}{2}'], cond: ', x \\ge 0' },
  quarter: { deg: [0, 90], span: frac(1, 2), t: ['0', '\\frac{\\pi}{2}'], cond: ', x \\ge 0, y \\ge 0' },
};
const polarName = (r1, part) => (r1 ? { full: 'ring', upper: 'half-ring', right: 'half-ring', quarter: 'quarter-ring' } : { full: 'disk', upper: 'half-disk', right: 'half-disk', quarter: 'quarter-disk' })[part];
const polarSet = (r1, r2, part) => `${r1 ? `${r1 * r1} \\le ` : ''}x^{2} + y^{2} \\le ${r2 * r2}${PARTS[part].cond}`;

/** Boundary points of the polar region r1 ≤ r ≤ r2, d0 ≤ θ ≤ d1 (degrees). */
function sectorPts(r1, r2, d0, d1) {
  const arc = (r, back) => Array.from({ length: 49 }, (_, i) => rad(d0 + ((d1 - d0) * (back ? 48 - i : i)) / 48)).map((t) => [r * Math.cos(t), r * Math.sin(t)]);
  return [...arc(r2, false), ...(r1 > 0 ? arc(r1, true) : d1 - d0 < 360 ? [[0, 0]] : [])];
}
/** A region picture; `com` marks the center of mass. */
function regionPic(pts, alt, com, extra = {}) {
  return {
    type: 'plot', ...squareWindow(pts, 0.6), polygons: [{ points: pts, color: 'a' }],
    points: com ? [{ x: com[0], y: com[1], label: 'center of mass', color: 'b' }] : [], alt, ...extra,
  };
}
/** LaTeX for c (a Frac), cπ or c/π. */
function kTex([c, type]) {
  if (type === 'pi') return piTex(c);
  if (type === 'inv') return `\\frac{${c.n}}{${c.d === 1 ? '' : c.d}\\pi}`;
  return c.tex();
}
const kVal = ([c, type]) => c.value * (type === 'pi' ? PI : type === 'inv' ? 1 / PI : 1);
/** k·√(fr) for a positive Frac fr, simplified. */
const sqrtFrac = (fr) => rootOver(1, fr.n * fr.d, fr.d);
/** Polynomial times x (v = 0) or y (v = 1). */
const mulV = (p, v, by = 1) => p.map(([c, i = 0, j = 0]) => (v === 0 ? [c, i + by, j] : [c, i, j + by]));
const wrapP = (p) => (p.length > 1 ? `\\left(${mpTex(p)}\\right)` : mpTex(p));
/** "kg" with the constant k in front: 1 is left out. */
const coefTex = (k, p) => (p.length === 1 && p[0][1] === 0 && p[0][2] === 0 ? k.mul(p[0][0]).tex() : k.eq(1) ? mpTex(p) : `${k.tex()}${wrapP(p)}`);
const G = [[[1, 1, 1]], [[1, 1, 0], [1, 0, 1]], [[1, 2, 1]], [[1, 2, 0], [1, 0, 2]], [[1, 0, 0], [1, 1, 1]], [[1, 1, 0], [2, 0, 1]]];
const bar = (v) => `\\bar{${v}}`;
/** Rich text to plain text for alt sentences. */
const plain = (t) => t.replace(/\\\(|\\\)/g, '').replace(/\\le/g, '≤').replace(/\\ge/g, '≥').replace(/\^\{2\}/g, '²').replace(/-(\d)/g, '−$1');

// ───────────── Easy ─────────────

function easyMassRect(rng) {
  const [m, n] = rng.pick([[1, 1], [2, 0], [0, 2], [2, 1], [1, 2], [2, 2]]);
  const [k, c] = [rng.int(1, 6), rng.int(0, 5)];
  const [p, s] = [rng.int(1, 4), rng.int(1, 4)];
  const rho = c ? [[k, m, n], [c, 0, 0]] : [[k, m, n]];
  const top = frac(k * p ** (m + 1) * s ** (n + 1), (m + 1) * (n + 1));
  const mass = top.add(c * p * s);
  const centre = frac(k * p ** (m + 1) * s ** (n + 1), 2 ** (m + n)).add(c * p * s);
  return q({
    prompt: R`A thin plate occupies the rectangle \(0 \le x \le ${p}\), \(0 \le y \le ${s}\) (in cm). Its density is \(\rho(x, y) = ${mpTex(rho)}\) g/cm². Find the mass of the plate.`,
    correct: mass,
    unit: 'g',
    wrong: [
      { value: frac(k * p ** (m + 1) * s ** (n + 1)).add(c * p * s), why: R`Each integration divides by the new exponent: \(\int x^{k}\,dx = \dfrac{x^{k+1}}{k+1}\).` },
      { value: frac(mpEval(rho, p, s) * p * s), why: 'That is the density at the far corner times the area. The density changes across the plate, so integrate it.' },
      centre.eq(mass) ? null : { value: centre, why: 'That is the density at the center times the area. It gives the mass only when the density changes linearly; here it does not, so integrate.' },
      c ? top : null,
      mass.mul(2),
    ],
    solution: [
      R`Mass is density added up over the plate: \(m = ${iint(0, p, 0, s, wrapP(rho))}\).`,
      R`Inner integral, with \(x\) held constant: \(${m ? terms([[frac(k * s ** (n + 1), n + 1), m === 1 ? 'x' : `x^{${m}}`], [c * s, '']]) : frac(k * s ** (n + 1), n + 1).add(c * s).tex()}\).`,
      R`Outer integral from \(0\) to \(${p}\): \(m = ${mass.tex()}\) g.`,
    ],
    rule: 0,
    skill: 'mass of a lamina',
    check: () => checkEqual(mass.value, mid2((x, y) => mpEval(rho, x, y), 0, p, 0, s, 200), 1e-4, 'mass by a midpoint sum'),
  });
}

function symRegions(a, b) {
  const sq = (x) => root(a * a - x * x);
  const neg = (x) => -sq(x);
  return [
    { text: R`the rectangle \(-${a} \le x \le ${a}\), \(0 \le y \le ${b}\)`, sx: true, sy: false, X: a, Y: b, pts: [[-a, 0], [a, 0], [a, b], [-a, b]], piece: [-a, a, 0, b] },
    { text: R`the triangle with vertices \((-${a}, 0)\), \((${a}, 0)\) and \((0, ${b})\)`, sx: true, sy: false, X: a, Y: b, pts: [[-a, 0], [a, 0], [0, b]], piece: [-a, a, 0, (x) => b * (1 - Math.abs(x) / a)] },
    { text: R`the half-disk \(x^{2} + y^{2} \le ${a * a}\), \(y \ge 0\)`, sx: true, sy: false, X: a, Y: a, pts: sectorPts(0, a, 0, 180), piece: [-a, a, 0, sq] },
    { text: R`the half-disk \(x^{2} + y^{2} \le ${a * a}\), \(x \ge 0\)`, sx: false, sy: true, X: a, Y: a, pts: sectorPts(0, a, -90, 90), piece: [0, a, neg, sq] },
    { text: R`the rectangle \(0 \le x \le ${b}\), \(-${a} \le y \le ${a}\)`, sx: false, sy: true, X: b, Y: a, pts: [[0, -a], [b, -a], [b, a], [0, a]], piece: [0, b, -a, a] },
    { text: R`the triangle with vertices \((0, -${a})\), \((0, ${a})\) and \((${b}, 0)\)`, sx: false, sy: true, X: b, Y: a, pts: [[0, -a], [b, 0], [0, a]], piece: [0, b, (x) => -a * (1 - x / b), (x) => a * (1 - x / b)] },
    { text: R`the disk \(x^{2} + y^{2} \le ${a * a}\)`, sx: true, sy: true, X: a, Y: a, pts: sectorPts(0, a, 0, 360), piece: [-a, a, neg, sq] },
    { text: R`the rectangle \(-${a} \le x \le ${a}\), \(-${b} \le y \le ${b}\)`, sx: true, sy: true, X: a, Y: b, pts: [[-a, -b], [a, -b], [a, b], [-a, b]], piece: [-a, a, -b, b] },
    { text: R`the triangle with vertices \((0, 0)\), \((${a}, 0)\) and \((0, ${b})\)`, sx: false, sy: false, X: a, Y: b, pts: [[0, 0], [a, 0], [0, b]], piece: [0, a, 0, (x) => b * (1 - x / a)] },
    { text: R`the quarter-disk \(x^{2} + y^{2} \le ${a * a}\), \(x \ge 0\), \(y \ge 0\)`, sx: false, sy: false, X: a, Y: a, pts: sectorPts(0, a, 0, 90), piece: [0, a, 0, sq] },
  ];
}

function easySymmetry(rng) {
  const [a, b] = [rng.int(1, 5), rng.int(1, 5)];
  const g = rng.pick(symRegions(a, b));
  const [k, e] = [rng.int(1, 4), rng.int(1, 4)];
  const d = rng.pick([
    { tex: `${k === 1 ? '' : k}(x^{2} + y^{2})`, f: (x, y) => k * (x * x + y * y), ex: true, ey: true },
    { tex: terms([[k, 'y'], [k * g.Y + e, '']]), f: (x, y) => k * y + k * g.Y + e, ex: true, ey: false },
    { tex: terms([[k, 'x'], [k * g.X + e, '']]), f: (x, y) => k * x + k * g.X + e, ex: false, ey: true },
    { tex: terms([[k, 'y^{2}'], [e, '']]), f: (x, y) => k * y * y + e, ex: true, ey: true },
    { tex: terms([[k, 'x^{2}'], [e, '']]), f: (x, y) => k * x * x + e, ex: true, ey: true },
    { tex: terms([[k, '\\sqrt{x^{2} + y^{2}}']]), f: (x, y) => k * Math.hypot(x, y), ex: true, ey: true },
  ]);
  const fx = g.sx && d.ex;
  const fy = g.sy && d.ey;
  const say = [R`\(${bar('x')} = 0\), but \(${bar('y')}\) needs an integral`, R`\(${bar('y')} = 0\), but \(${bar('x')}\) needs an integral`, R`\(${bar('x')} = 0\) and \(${bar('y')} = 0\)`, R`Neither \(${bar('x')}\) nor \(${bar('y')}\) is 0`];
  const claims = [[true, false], [false, true], [true, true], [false, false]];
  const right = claims.findIndex(([cx, cy]) => cx === fx && cy === fy);
  const why = (v, s, ev, truth, claim) => {
    if (claim === truth) return null;
    const other = v === 'x' ? 'y' : 'x';
    if (truth) return R`The region and the density are both unchanged when \(${v}\) is replaced by \(-${v}\), so the moment \(\iint ${v}\rho\,dA\) cancels to 0 and \(${bar(v)} = 0\).`;
    if (!s) return R`All of the region has \(${v} \ge 0\), so \(${bar(v)} > 0\).`;
    return R`The region is symmetric about the \(${other}\)-axis, but the density \(${d.tex}\) is larger where \(${v} > 0\) than at the mirror points, so it pulls \(${bar(v)}\) off 0.`;
  };
  const note = (i) => why('x', g.sx, d.ex, fx, claims[i][0]) ?? why('y', g.sy, d.ey, fy, claims[i][1]);
  return q({
    prompt: R`A thin plate occupies ${g.text} and has density \(\rho(x, y) = ${d.tex}\). Without integrating, what can you say about its center of mass \((${bar('x')}, ${bar('y')})\)?`,
    visual: regionPic(g.pts, `The plate: ${plain(g.text)}.`),
    correct: say[right],
    wrong: [0, 1, 2, 3].filter((i) => i !== right).map((i) => ({ value: say[i], why: note(i) })),
    solution: [
      g.sx ? R`The region is symmetric about the \(y\)-axis${d.ex ? R`, and the density does not change when \(x\) becomes \(-x\). So \(M_{y} = \iint x\rho\,dA = 0\) and \(${bar('x')} = 0\).` : R`, but the density changes when \(x\) becomes \(-x\), so \(${bar('x')} \ne 0\).`}` : R`The region is not symmetric about the \(y\)-axis; all of it has \(x \ge 0\), so \(${bar('x')} > 0\).`,
      g.sy ? R`The region is symmetric about the \(x\)-axis${d.ey ? R`, and the density does not change when \(y\) becomes \(-y\). So \(M_{x} = \iint y\rho\,dA = 0\) and \(${bar('y')} = 0\).` : R`, but the density changes when \(y\) becomes \(-y\), so \(${bar('y')} \ne 0\).`}` : R`The region is not symmetric about the \(x\)-axis; all of it has \(y \ge 0\), so \(${bar('y')} > 0\).`,
      R`Conclusion: ${say[right]}.`,
    ],
    rule: 1,
    skill: 'symmetry',
    check: () => {
      const [x0, x1, lo, hi] = g.piece;
      const m = mid2(d.f, x0, x1, lo, hi, 160);
      const xb = mid2((x, y) => x * d.f(x, y), x0, x1, lo, hi, 160) / m;
      const yb = mid2((x, y) => y * d.f(x, y), x0, x1, lo, hi, 160) / m;
      const zero = (v) => Math.abs(v) < 1e-9 * (a + b);
      return zero(xb) === fx && zero(yb) === fy && (fx || Math.abs(xb) > 1e-3) && (fy || Math.abs(yb) > 1e-3) ? true : `numeric center (${xb}, ${yb}) does not match the statement`;
    },
  });
}

function easyJointK(rng) {
  const g = rng.pick(G);
  const tri = rng.bool(0.4);
  const [p, s] = tri ? [rng.int(1, 3), 0] : [rng.int(1, 3), rng.int(1, 3)];
  const hi = tri ? fp(0, 1) : fp(s);
  const I = exactDouble(g, 0, p, fp(0), hi);
  const k = frac(1).div(I);
  const area = tri ? frac(p * p, 2) : frac(p * s);
  const Isq = exactDouble(g, 0, p, fp(0), fp(p));
  const where = tri ? R`\(0 \le y \le x \le ${p}\)` : R`\(0 \le x \le ${p}\), \(0 \le y \le ${s}\)`;
  return q({
    prompt: R`For which constant \(k\) is \(f(x, y) = k${wrapP(g)}\) for ${where} (and \(f = 0\) elsewhere) a joint probability density function?`,
    visual: regionPic(tri ? [[0, 0], [p, 0], [p, p]] : [[0, 0], [p, 0], [p, s], [0, s]], tri ? `The triangle where f is not zero: below the line y = x, above the x-axis, for x from 0 to ${p}.` : `The rectangle where f is not zero: x from 0 to ${p}, y from 0 to ${s}.`),
    correct: k,
    wrong: [
      { value: I, why: R`That is \(\iint ${mpTex(g)}\,dA\). The condition is \(k \cdot ${I.tex()} = 1\), so \(k\) is its reciprocal.` },
      { value: frac(1).div(area), why: R`That would make a uniform density (constant on the region). Here \(f\) is \(k${wrapP(g)}\), so integrate that.` },
      tri ? { value: frac(1).div(Isq), why: R`\(f\) is 0 outside the triangle, so integrate only over \(0 \le y \le x\).` } : null,
      k.mul(2),
      k.div(2),
    ],
    solution: [
      R`\(f \ge 0\) on the region, so the only condition is \(\iint f\,dA = 1\).`,
      R`\(${tri ? iint(0, p, 0, 'x', mpTex(g)) : iint(0, p, 0, s, wrapP(g))} = ${I.tex()}\).`,
      R`\(k \cdot ${I.tex()} = 1\), so \(k = ${k.tex()}\).`,
    ],
    rule: 4,
    skill: 'normalizing a joint density',
    check: () => checkEqual(1, k.value * mid2((x, y) => mpEval(g, x, y), 0, p, 0, tri ? (x) => x : s, 200), 1e-4, 'total probability'),
  });
}

// ───────────── Medium ─────────────

function mediumCenterLamina(rng) {
  const [a, b] = [rng.int(1, 4), rng.int(1, 4)];
  const shapes = [
    { text: R`the triangle with vertices \((0, 0)\), \((${a}, 0)\) and \((0, ${b})\)`, hi: fp(b, frac(-b, a)), hiF: (x) => b - (b * x) / a, hiTex: terms([[b, ''], [frac(-b, a), 'x']]), cen: [frac(a, 3), frac(b, 3)], pts: [[0, 0], [a, 0], [0, b]] },
    { text: R`the triangle with vertices \((0, 0)\), \((${a}, 0)\) and \((${a}, ${b})\)`, hi: fp(0, frac(b, a)), hiF: (x) => (b * x) / a, hiTex: terms([[frac(b, a), 'x']]), cen: [frac(2 * a, 3), frac(b, 3)], pts: [[0, 0], [a, 0], [a, b]] },
    { text: R`the rectangle \(0 \le x \le ${a}\), \(0 \le y \le ${b}\)`, hi: fp(b), hiF: () => b, hiTex: String(b), cen: [frac(a, 2), frac(b, 2)], pts: [[0, 0], [a, 0], [a, b], [0, b]] },
  ];
  const sh = rng.pick(shapes);
  const k = rng.int(1, 5);
  const rho = rng.pick([[[k, 1, 0]], [[k, 0, 1]], [[k, 1, 0], [k, 0, 1]], [[k, 1, 1]], [[k, 2, 0]]]);
  const v = rng.int(0, 1);
  const [V, mom, axis] = v === 0 ? ['x', 'M_{y}', 'y'] : ['y', 'M_{x}', 'x'];
  const m = exactDouble(rho, 0, a, fp(0), sh.hi);
  const Mv = exactDouble(mulV(rho, v), 0, a, fp(0), sh.hi);
  const Mo = exactDouble(mulV(rho, 1 - v), 0, a, fp(0), sh.hi);
  const ans = Mv.div(m);
  const f = (x, y) => mpEval(rho, x, y);
  return q({
    prompt: R`A thin plate occupies ${sh.text} (in cm) and has density \(\rho(x, y) = ${mpTex(rho)}\) g/cm². Find \(${bar(V)}\), the \(${V}\)-coordinate of its center of mass.`,
    visual: regionPic(sh.pts, `The plate: ${sh.text.includes('rectangle') ? `the rectangle with corners (0, 0) and (${a}, ${b})` : `a triangle with vertices ${sh.pts.map((t) => `(${t[0]}, ${t[1]})`).join(', ')}`}.`),
    correct: ans,
    unit: 'cm',
    wrong: [
      { value: sh.cen[v], why: R`That is the centroid, the balance point for a constant density. The density \(${mpTex(rho)}\) moves the balance point toward the heavier part.` },
      { value: Mo.div(m), why: R`\(${bar(V)} = \dfrac{${mom}}{m}\), where \(${mom} = \iint ${V}\rho\,dA\) is the moment about the \(${axis}\)-axis. That used the other moment.` },
      { value: Mv, why: R`That is the moment \(${mom}\). Divide it by the mass.` },
      ans.mul(2),
    ],
    solution: [
      R`Mass: \(m = ${iint(0, a, 0, sh.hiTex, wrapP(rho))} = ${m.tex()}\).`,
      R`Moment about the \(${axis}\)-axis: \(${mom} = ${iint(0, a, 0, sh.hiTex, `${V}\\cdot ${wrapP(rho)}`)} = ${Mv.tex()}\).`,
      R`\(${bar(V)} = \dfrac{${mom}}{m} = \dfrac{${Mv.tex()}}{${m.tex()}} = ${ans.tex()}\) cm.`,
    ],
    rule: 1,
    skill: 'center of mass of a lamina',
    check: () => checkEqual(ans.value, mid2((x, y) => (v === 0 ? x : y) * f(x, y), 0, a, 0, sh.hiF, 250) / mid2(f, 0, a, 0, sh.hiF, 250), 1e-4, 'center of mass by midpoint sums'),
  });
}

function mediumPolarCharge(rng) {
  const part = rng.pick(['full', 'upper', 'quarter', 'right']);
  const r1 = rng.bool(0.4) ? rng.int(1, 2) : 0;
  const r2 = r1 + rng.int(1, 3);
  const n = rng.pick(r1 ? [-1, 1, 2] : [1, 2]);
  const k = rng.int(1, 6);
  const kk = k === 1 ? '' : k;
  const sTex = { 1: `${kk}\\sqrt{x^{2} + y^{2}}`, 2: `${kk}(x^{2} + y^{2})`, '-1': `\\dfrac{${k}}{\\sqrt{x^{2} + y^{2}}}` }[n];
  const body = { 1: `${kk}r \\cdot r`, 2: `${kk}r^{2} \\cdot r`, '-1': `\\frac{${k}}{r} \\cdot r` }[n];
  const P = PARTS[part];
  const rInt = (e) => frac(r2 ** e - r1 ** e, e);
  const Q = P.span.mul(rInt(n + 2)).mul(k);
  const show = (c) => `${M(piTex(c))} nC`;
  const f = (x, y) => k * Math.hypot(x, y) ** n;
  const noR = n > 0 ? P.span.mul(rInt(n + 1)).mul(k) : null;
  return q({
    prompt: R`A thin insulating plate is the ${polarName(r1, part)} \(${polarSet(r1, r2, part)}\) (in cm). It carries a surface charge density \(\sigma(x, y) = ${sTex}\) nC/cm². Find the total charge on the plate.`,
    visual: regionPic(sectorPts(r1, r2, ...P.deg), `The plate: r from ${r1} to ${r2} cm, θ from ${P.deg[0]} to ${P.deg[1]} degrees.`),
    correct: show(Q),
    wrong: [
      noR && !noR.eq(Q) ? { value: show(noR), why: R`\(dA = r\,dr\,d\theta\): the charge density must be multiplied by an extra \(r\).` } : null,
      part === 'full' ? show(Q.mul(2)) : { value: show(Q.mul(2)), why: R`Check the \(\theta\) limits: they must sweep only the ${polarName(r1, part)}, from \(${P.t[0]}\) to \(${P.t[1]}\).` },
      { value: `${M(Q.tex())} nC`, why: R`The \(\theta\)-integral contributes a factor \(${piTex(P.span)}\), not \(${P.span.tex()}\).` },
      show(Q.div(2)),
      show(Q.mul(3)),
    ],
    solution: [
      R`Charge is charge density added up over the plate: \(Q = \iint_{D} \sigma\,dA\). The plate is bounded by circles, so use polar coordinates with \(dA = r\,dr\,d\theta\).`,
      R`\(Q = ${iint(P.t[0], P.t[1], r1, r2, body, 'dr', 'd\\theta')}\).`,
      R`The \(r\)-integral is \(${rInt(n + 2).mul(k).tex()}\) and the angle sweeps \(${piTex(P.span)}\), so \(Q = ${piTex(Q)} \approx ${num(Q.value * PI, { places: 1 })}\) nC.`,
    ],
    rule: 0,
    skill: 'charge in polar coordinates',
    check: () => checkEqual(Q.value * PI, cached(`pc${part}${r1}${r2}${n}${k}`, () => polarMid(f, r1, r2, part)), 3e-3, 'charge by a midpoint sum'),
  });
}

function mediumProbRect(rng) {
  const g = rng.pick(G);
  const [p, s] = [rng.int(2, 3), rng.int(2, 3)];
  let xi;
  let yi;
  do {
    const u = rng.int(1, p - 1);
    const v = rng.int(1, s - 1);
    xi = rng.pick([[0, u], [u, p], [0, p]]);
    yi = rng.pick([[0, v], [v, s], [0, s]]);
  } while (xi[1] - xi[0] === p && yi[1] - yi[0] === s);
  const I = exactDouble(g, 0, p, fp(0), fp(s));
  const k = frac(1).div(I);
  const sub = exactDouble(g, xi[0], xi[1], fp(yi[0]), fp(yi[1]));
  const ans = sub.mul(k);
  const px = exactDouble(g, xi[0], xi[1], fp(0), fp(s)).mul(k);
  const py = exactDouble(g, 0, p, fp(yi[0]), fp(yi[1])).mul(k);
  const ev = (V, [lo, hi], full) => (hi - lo === full ? null : lo === 0 ? `${V} \\le ${hi}` : `${V} \\ge ${lo}`);
  const evs = [ev('X', xi, p), ev('Y', yi, s)].filter(Boolean);
  return q({
    prompt: R`The random point \((X, Y)\) has joint density \(f(x, y) = ${coefTex(k, g)}\) for \(0 \le x \le ${p}\), \(0 \le y \le ${s}\) (and 0 elsewhere). Find \(P(${evs.join(',\\; ')})\).`,
    visual: regionPic([[0, 0], [p, 0], [p, s], [0, s]], `The rectangle where f is not zero, x from 0 to ${p} and y from 0 to ${s}. The event is the part with x from ${xi[0]} to ${xi[1]} and y from ${yi[0]} to ${yi[1]}, shaded orange.`, null, { polygons: [{ points: [[0, 0], [p, 0], [p, s], [0, s]], color: 'a' }, { points: [[xi[0], yi[0]], [xi[1], yi[0]], [xi[1], yi[1]], [xi[0], yi[1]]], color: 'b' }] }),
    correct: ans,
    wrong: [
      { value: frac((xi[1] - xi[0]) * (yi[1] - yi[0]), p * s), why: 'That is the fraction of the area, which is right only for a uniform density. Integrate f over the event.' },
      k.eq(1) ? null : { value: sub, why: R`Include the constant \(${k.tex()}\) from the density.` },
      { value: frac(1).sub(ans), why: 'That is the probability of the complement.' },
      { value: px.mul(py), why: R`Multiplying \(P(X \ldots)\) by \(P(Y \ldots)\) assumes \(X\) and \(Y\) are independent. This density does not split into a function of \(x\) times a function of \(y\), so integrate over the rectangle.` },
      ans.div(2),
    ],
    solution: [
      R`The event is the rectangle \(${xi[0]} \le x \le ${xi[1]}\), \(${yi[0]} \le y \le ${yi[1]}\); integrate \(f\) over it.`,
      R`\(${iint(xi[0], xi[1], yi[0], yi[1], coefTex(k, g))} = ${k.eq(1) ? '' : `${k.tex()} \\cdot `}${sub.tex()}\).`,
      R`So the probability is \(${ans.tex()}\).`,
    ],
    rule: 4,
    skill: 'probability over a rectangle',
    check: () => checkEqual(ans.value, k.value * mid2((x, y) => mpEval(g, x, y), xi[0], xi[1], yi[0], yi[1], 200), 1e-4, 'probability by a midpoint sum'),
  });
}

const MEANS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
const ex = (fr) => (fr.eq(1) ? 'e^{-1}' : `e^{-${fr.tex()}}`);

function mediumExpRace(rng) {
  const name = person(rng);
  const [m1, m2] = rng.sample(MEANS, 2);
  const [what1, what2, short] = rng.pick([['a text message from a friend', 'the bus', 'the text'], ['the first customer', 'the first phone call', 'the customer'], ['a reply to an email', 'a delivery', 'the reply'], ['the kettle to boil', 'a call back', 'the kettle']]);
  const race = rng.bool(0.55);
  const setup = R`${name} is waiting for ${what1} and for ${what2}. The waiting times \(X\) and \(Y\) (in minutes) are independent and exponential, with means ${m1} and ${m2} minutes, so their joint density is \(f(x, y) = \frac{1}{${m1 * m2}}e^{-x/${m1} - y/${m2}}\) for \(x, y \ge 0\).`;
  const f = (x, y) => Math.exp(-x / m1 - y / m2) / (m1 * m2);
  if (race) {
    const ans = frac(m2, m1 + m2);
    return q({
      prompt: R`${setup} Find \(P(X < Y)\), the probability that the wait for ${short} ends first.`,
      visual: { type: 'plot', x: [0, 10], y: [0, 10], square: true, axisLabels: ['x', 'y'], shade: [{ f: () => 10, g: (x) => x, from: 0, to: 10 }], fns: [{ f: (x) => x, label: 'y = x', labelAt: 7 }], alt: 'The first quadrant with the region above the line y = x shaded: the event X < Y.' },
      correct: ans,
      wrong: [
        { value: frac(m1, m1 + m2), why: R`That is \(P(Y < X)\). The wait with the shorter mean, ${Math.min(m1, m2)} minutes, is the one more likely to end first.` },
        { value: frac(1, 2), why: 'The two waits have different means, so they are not equally likely to end first.' },
        m1 < m2 ? frac(m1, m2) : frac(m2, m1),
        frac(m1 * m2, (m1 + m2) ** 2),
      ],
      solution: [
        R`The event is the region \(0 \le x < y\): \(P = \displaystyle\int_{0}^{\infty}\int_{x}^{\infty} f(x, y)\,dy\,dx\).`,
        R`Inner integral: \(\displaystyle\int_{x}^{\infty} \tfrac{1}{${m2}}e^{-y/${m2}}\,dy = e^{-x/${m2}}\), leaving \(\displaystyle\int_{0}^{\infty} \tfrac{1}{${m1}}e^{-x/${m1}}e^{-x/${m2}}\,dx\).`,
        R`\(= \dfrac{1/${m1}}{1/${m1} + 1/${m2}} = \dfrac{${m2}}{${m1} + ${m2}} = ${ans.tex()}\).`,
      ],
      rule: 5,
      skill: 'independent exponential waiting times',
      check: () => checkEqual(ans.value, cached(`race${m1},${m2}`, () => mid2(f, 0, (40 * m1 * m2) / (m1 + m2), (x) => x, (x) => x + 40 * m2, 600)), 1e-3, 'P(X < Y) by a midpoint sum'),
    });
  }
  const t = rng.pick([5, 10, 15, 20, 30]);
  const [e1, e2] = [frac(t, m1), frac(t, m2)];
  const both = `\\left(1 - ${ex(e1)}\\right)\\left(1 - ${ex(e2)}\\right)`;
  return q({
    prompt: R`${setup} Find the probability that both waits are over within ${t} minutes, \(P(X \le ${t},\; Y \le ${t})\).`,
    correct: M(both),
    wrong: [
      { value: M(`1 - ${ex(e1.add(e2))}`), why: R`That is \(1 - P(X > ${t}, Y > ${t})\), the probability that at least one wait is over.` },
      { value: M(`\\left(1 - ${ex(e1)}\\right)${ex(e2)}`), why: R`That is the probability that only the first wait is over: \(P(X \le ${t}, Y > ${t})\).` },
      M(ex(e1.add(e2))),
      M(`${ex(e1)}\\left(1 - ${ex(e2)}\\right)`),
    ],
    solution: [
      R`The event is the square \(0 \le x \le ${t}\), \(0 \le y \le ${t}\), and the density is a product, so the double integral splits.`,
      R`\(\displaystyle\int_{0}^{${t}}\tfrac{1}{${m1}}e^{-x/${m1}}\,dx = 1 - ${ex(e1)}\) and \(\displaystyle\int_{0}^{${t}}\tfrac{1}{${m2}}e^{-y/${m2}}\,dy = 1 - ${ex(e2)}\).`,
      R`\(P = ${both} \approx ${num((1 - Math.exp(-e1.value)) * (1 - Math.exp(-e2.value)), { places: 3 })}\).`,
    ],
    rule: 5,
    skill: 'independent exponential waiting times',
    check: () => checkEqual((1 - Math.exp(-e1.value)) * (1 - Math.exp(-e2.value)), cached(`both${m1},${m2},${t}`, () => mid2(f, 0, t, 0, t, 500)), 2e-4, 'probability by a midpoint sum'),
  });
}

// ───────────── Hard ─────────────

function hardInertia(rng) {
  if (rng.bool(0.5)) {
    const [p, s, k] = [rng.int(1, 4), rng.int(1, 4), rng.int(1, 5)];
    const rho = rng.pick([[[k, 0, 0]], [[k, 1, 0]], [[k, 0, 1]], [[k, 1, 0], [k, 0, 1]]]);
    const w = rng.int(0, 2); // 0: Ix, 1: Iy, 2: I0
    const E = (poly) => exactDouble(poly, 0, p, fp(0), fp(s));
    const [Ix, Iy] = [E(mulV(rho, 1, 2)), E(mulV(rho, 0, 2))];
    const I = [Ix, Iy, Ix.add(Iy)][w];
    const [lab, body] = [['I_{x}', 'I_{y}', 'I_{0}'][w], ['y^{2}', 'x^{2}', '(x^{2} + y^{2})'][w]];
    const integrand = wrapP(mpClean([mulV(rho, 1, 2), mulV(rho, 0, 2), [...mulV(rho, 1, 2), ...mulV(rho, 0, 2)]][w]));
    const first = w === 0 ? E(mulV(rho, 1)) : w === 1 ? E(mulV(rho, 0)) : null;
    return q({
      prompt: R`A thin plate occupies the rectangle \(0 \le x \le ${p}\), \(0 \le y \le ${s}\) and has density \(\rho(x, y) = ${mpTex(rho)}\). Find its moment of inertia ${['about the \\(x\\)-axis, \\(I_{x}\\)', 'about the \\(y\\)-axis, \\(I_{y}\\)', 'about the origin, \\(I_{0}\\)'][w]}.`,
      correct: I,
      wrong: [
        w < 2 ? { value: [Iy, Ix][w], why: R`The distance from a point to the \(${w === 0 ? 'x' : 'y'}\)-axis is \(|${w === 0 ? 'y' : 'x'}|\), so \(${lab} = \iint ${w === 0 ? 'y' : 'x'}^{2}\rho\,dA\).` } : { value: Ix, why: R`\(I_{0} = I_{x} + I_{y}\): include both \(x^{2}\) and \(y^{2}\).` },
        first ? { value: first, why: 'A moment of inertia uses the square of the distance to the axis, not the distance itself.' } : Iy,
        { value: E(rho), why: 'That is the mass. Weight each piece by the square of its distance to the axis.' },
        I.mul(2),
      ],
      solution: [
        R`\(${lab} = \iint_{R} ${body}\rho\,dA = ${iint(0, p, 0, s, integrand)}\).`,
        w < 2 ? R`Expand and integrate term by term: \(${lab} = ${I.tex()}\).` : R`\(I_{x} = ${Ix.tex()}\) and \(I_{y} = ${Iy.tex()}\).`,
        R`So \(${lab} = ${I.tex()}\).`,
      ],
      rule: 2,
      skill: 'moments of inertia',
      check: () => checkEqual(I.value, mid2((x, y) => [y * y, x * x, x * x + y * y][w] * mpEval(rho, x, y), 0, p, 0, s, 200), 1e-4, 'moment of inertia by a midpoint sum'),
    });
  }
  const r1 = rng.bool(0.35) ? rng.int(1, 2) : 0;
  const r2 = r1 + rng.int(1, 3);
  const [k, n] = [rng.int(1, 5), rng.int(0, 1)];
  const rI = (e) => frac(r2 ** e - r1 ** e, e);
  const I0 = rI(4 + n).mul(2 * k);
  const axis = rng.bool();
  const I = axis ? I0.div(2) : I0;
  const lab = axis ? 'I_{x}' : 'I_{0}';
  const sh = (c) => M(piTex(c));
  const dens = n ? `${k === 1 ? '' : k}\\sqrt{x^{2} + y^{2}}` : String(k);
  return q({
    prompt: R`A thin plate is the ${polarName(r1, 'full')} \(${polarSet(r1, r2, 'full')}\) with density \(\rho = ${dens}\). Find its moment of inertia ${axis ? R`about the \(x\)-axis, \(I_{x}\)` : R`about the origin, \(I_{0}\)`}.`,
    visual: regionPic(sectorPts(r1, r2, 0, 360), `The plate: a ${polarName(r1, 'full')} centered at the origin with r from ${r1} to ${r2}.`),
    correct: sh(I),
    wrong: [
      axis ? { value: sh(I0), why: R`That is \(I_{0}\). By symmetry \(I_{x} = I_{y}\), and \(I_{x} + I_{y} = I_{0}\), so \(I_{x}\) is half of it.` } : { value: sh(I0.div(2)), why: R`That is \(I_{x}\). The distance to the origin is \(r\), so \(I_{0} = \iint r^{2}\rho\,dA\).` },
      { value: sh(rI(3 + n).mul(2 * k).div(axis ? 2 : 1)), why: R`\(dA = r\,dr\,d\theta\): include the extra factor \(r\).` },
      { value: sh(rI(2 + n).mul(2 * k)), why: 'That is the mass. Weight each piece by the square of its distance to the axis.' },
      sh(I.mul(2)),
      sh(I.mul(4)),
    ],
    solution: [
      R`About the origin the distance is \(r\): \(I_{0} = ${iint(0, '2\\pi', r1, r2, `r^{2} \\cdot ${n ? `${k === 1 ? '' : k}r` : k} \\cdot r`, 'dr', 'd\\theta')} = ${piTex(I0)}\).`,
      axis ? R`The plate and density are symmetric under swapping \(x\) and \(y\), so \(I_{x} = I_{y}\); since \(I_{x} + I_{y} = I_{0}\), \(I_{x} = \tfrac{1}{2}I_{0} = ${piTex(I)}\).` : R`So \(I_{0} = ${piTex(I)}\).`,
    ],
    rule: 2,
    skill: 'moments of inertia',
    check: () => checkEqual(I.value * PI, cached(`in${r1}${r2}${k}${n}${axis}`, () => polarMid((x, y) => (axis ? y * y : x * x + y * y) * k * Math.hypot(x, y) ** n, r1, r2, 'full')), 3e-3, 'moment of inertia by a midpoint sum'),
  });
}

function hardCenterPolar(rng) {
  const a = rng.int(1, 6);
  const b = a + rng.int(1, 3);
  const k = rng.int(2, 5);
  const A = (c, type, why) => ({ value: M(kTex([c.mul(a), type])), why, v: kVal([c.mul(a), type]) });
  const whyTheta = R`The \(\theta\)-integrals do not cancel: they are different in the moment and in the mass.`;
  const cs = [
    { part: 'upper', r1: 0, d: 'constant', f: () => 1, v: 'y', ans: [frac(4, 3), 'inv'], wrong: [A(frac(2), 'inv', 'That is the center of mass of a thin semicircular wire. A plate has more of its mass near its flat edge.'), A(frac(1, 2), 'rat', 'Halfway up is too high: the plate is wider near its flat edge.'), A(frac(1), 'inv', R`\(dA = r\,dr\,d\theta\) in both integrals.`), A(frac(4, 3), 'rat')], steps: [R`\(${bar('x')} = 0\) by symmetry. The density is constant, so it cancels: \(${bar('y')} = \frac{1}{A}\iint y\,dA\) with \(A = \tfrac{1}{2}\pi(${a})^{2}\).`, R`\(\iint y\,dA = ${iint(0, '\\pi', 0, a, 'r\\sin\\theta \\cdot r', 'dr', 'd\\theta')} = 2 \cdot \tfrac{${a ** 3}}{3}\).`] },
    { part: 'upper', r1: 0, d: `${k}\\sqrt{x^{2} + y^{2}}`, f: (x, y) => k * Math.hypot(x, y), v: 'y', ans: [frac(3, 2), 'inv'], wrong: [A(frac(4, 3), 'inv', 'That is the answer for constant density. This density grows with r, which moves mass away from the origin.'), A(frac(3, 4), 'rat', whyTheta), A(frac(2), 'inv'), A(frac(1, 2), 'rat')], steps: [R`\(${bar('x')} = 0\) by symmetry. In polar coordinates \(\rho = ${k}r\): \(m = ${iint(0, '\\pi', 0, a, `${k}r \\cdot r`, 'dr', 'd\\theta')} = ${piTex(frac(k * a ** 3, 3))}\).`, R`\(M_{x} = ${iint(0, '\\pi', 0, a, `r\\sin\\theta \\cdot ${k}r \\cdot r`, 'dr', 'd\\theta')} = ${frac(k * a ** 4, 2).tex()}\).`] },
    { part: 'upper', r1: 0, d: `${k}y`, f: (x, y) => k * y, v: 'y', ans: [frac(3, 16), 'pi'], wrong: [A(frac(4, 3), 'inv', 'That is the answer for constant density. This density is larger higher up, which pulls the center of mass up.'), A(frac(3, 4), 'rat', whyTheta), A(frac(1, 2), 'rat'), A(frac(2, 3), 'rat')], steps: [R`\(${bar('x')} = 0\) by symmetry. \(m = ${iint(0, '\\pi', 0, a, `${k}r\\sin\\theta \\cdot r`, 'dr', 'd\\theta')} = ${frac(2 * k * a ** 3, 3).tex()}\).`, R`\(M_{x} = ${iint(0, '\\pi', 0, a, `${k}r^{2}\\sin^{2}\\theta \\cdot r`, 'dr', 'd\\theta')} = \tfrac{\pi}{2} \cdot \tfrac{${k * a ** 4}}{4} = ${piTex(frac(k * a ** 4, 8))}\).`] },
    { part: 'quarter', r1: 0, d: 'constant', f: () => 1, v: 'x', ans: [frac(4, 3), 'inv'], wrong: [A(frac(1, 2), 'rat', 'The plate is wider near the axes than near the arc, so the balance point is nearer the origin than halfway.'), A(frac(2), 'inv', 'That is the center of mass of a thin quarter-circle wire, not of the plate.'), A(frac(1, 3), 'rat', R`\(\frac{1}{3}\) of the way along is the centroid of a triangle, not of a quarter-disk.`), A(frac(4, 3), 'rat')], steps: [R`The density is constant, so \(${bar('x')} = \frac{1}{A}\iint x\,dA\) with \(A = \tfrac{1}{4}\pi(${a})^{2}\). (By symmetry about \(y = x\), \(${bar('y')} = ${bar('x')}\).)`, R`\(\iint x\,dA = ${iint(0, '\\frac{\\pi}{2}', 0, a, 'r\\cos\\theta \\cdot r', 'dr', 'd\\theta')} = 1 \cdot \tfrac{${a ** 3}}{3}\).`] },
    { part: 'quarter', r1: 0, d: `${k}xy`, f: (x, y) => k * x * y, v: 'x', ans: [frac(8, 15), 'rat'], wrong: [A(frac(4, 3), 'inv', 'That is the answer for constant density. This density is largest far from the axes.'), A(frac(4, 5), 'rat', whyTheta), A(frac(1, 2), 'rat'), A(frac(2, 3), 'rat')], steps: [R`\(m = ${iint(0, '\\frac{\\pi}{2}', 0, a, `${k}r^{2}\\cos\\theta\\sin\\theta \\cdot r`, 'dr', 'd\\theta')} = ${k} \cdot \tfrac{1}{2} \cdot \tfrac{${a ** 4}}{4} = ${frac(k * a ** 4, 8).tex()}\).`, R`\(M_{y} = ${iint(0, '\\frac{\\pi}{2}', 0, a, `${k}r^{3}\\cos^{2}\\theta\\sin\\theta \\cdot r`, 'dr', 'd\\theta')} = ${k} \cdot \tfrac{1}{3} \cdot \tfrac{${a ** 5}}{5} = ${frac(k * a ** 5, 15).tex()}\).`] },
  ];
  const ring = { part: 'upper', r1: a, d: 'constant', f: () => 1, v: 'y', ans: [frac(4 * (b ** 3 - a ** 3), 3 * (b * b - a * a)), 'inv'] };
  ring.wrong = [
    { value: M(kTex([frac(4 * (b - a), 3), 'inv'])), why: 'Centers of mass do not subtract. Subtract the moments and the areas, then divide.' },
    { value: M(frac(a + b, 2).tex()), why: 'That is the middle of the ring’s width along a radius. The center of mass is an average height, which is lower.' },
    { value: M(kTex([frac(a + b), 'inv'])), why: 'That treats the ring as a thin wire at the middle radius.' },
    { value: M(kTex([frac(4 * b, 3), 'inv'])), why: 'That is the half-disk with no hole.' },
  ];
  ring.steps = [R`\(${bar('x')} = 0\) by symmetry, and the constant density cancels: \(${bar('y')} = \frac{1}{A}\iint y\,dA\) with \(A = \tfrac{1}{2}\pi(${b * b} - ${a * a}) = ${piTex(frac(b * b - a * a, 2))}\).`, R`\(\iint y\,dA = ${iint(0, '\\pi', a, b, 'r\\sin\\theta \\cdot r', 'dr', 'd\\theta')} = 2 \cdot \tfrac{${b ** 3} - ${a ** 3}}{3} = ${frac(2 * (b ** 3 - a ** 3), 3).tex()}\).`];
  const c = rng.bool(0.2) ? ring : rng.pick(cs);
  const ans = c === ring ? c.ans : [c.ans[0].mul(a), c.ans[1]];
  const P = PARTS[c.part];
  return q({
    prompt: R`A thin plate is the ${polarName(c.r1, c.part)} \(${polarSet(c.r1, c === ring ? b : a, c.part)}\) with ${c.d === 'constant' ? 'constant density' : R`density \(\rho(x, y) = ${c.d}\)`}. Find \(${bar(c.v)}\).`,
    visual: regionPic(sectorPts(c.r1, c === ring ? b : a, ...P.deg), `The plate: r from ${c.r1} to ${c === ring ? b : a}, θ from ${P.deg[0]} to ${P.deg[1]} degrees.`),
    correct: M(kTex(ans)),
    wrong: c.wrong.map((w) => (w.why ? { value: w.value, why: w.why } : w.value)),
    solution: [...c.steps, R`\(${bar(c.v)} = ${kTex(ans)} \approx ${num(kVal(ans), { places: 3 })}\).`],
    rule: 1,
    skill: 'center of mass in polar coordinates',
    check: () => {
      const r2 = c === ring ? b : a;
      const [mo, m] = cached(`cp${cs.indexOf(c)}${a}${b}${k}`, () => [polarMid((x, y) => (c.v === 'x' ? x : y) * c.f(x, y), c.r1, r2, c.part), polarMid(c.f, c.r1, r2, c.part)]);
      return checkEqual(kVal(ans), mo / m, 2e-3, 'center of mass by midpoint sums');
    },
  });
}

function hardSolidInertia(rng) {
  const d = rng.pick([2, 3, 7, 8, 9]);
  const [a, h] = [rng.int(1, 5), rng.int(1, 10)];
  const b = a + rng.int(1, 3);
  const disk = (r) => [-r, r, (x) => -root(r * r - x * x), (x) => root(r * r - x * x)];
  const r2 = (x, y) => d * (x * x + y * y);
  const S = rng.pick([
    { what: R`a solid cylindrical roller of radius ${a} cm and height ${h} cm`, I: frac(d * a ** 4 * h, 2), wr: [[frac(d * a * a * h), 'That is the mass. Weight each piece by the square of its distance to the axis.'], [frac(d * a ** 4 * h), R`\(ma^{2}\) would be right only if all the mass were at the rim, as in a thin hoop.`], [frac(2 * d * a ** 3 * h, 3), R`Use the square of the distance to the axis, \(r^{2}\), not \(r\).`]], set: R`In cylindrical coordinates: \(I_{z} = \displaystyle\int_{0}^{2\pi}\int_{0}^{${a}}\int_{0}^{${h}} r^{2} \cdot ${d} \cdot r\,dz\,dr\,d\theta = 2\pi \cdot ${d} \cdot ${h} \cdot \tfrac{${a ** 4}}{4}`, num: () => mid3(r2, ...disk(a), 0, h) },
    { what: R`a solid ball of radius ${a} cm, spun about a diameter`, I: frac(8 * d * a ** 5, 15), wr: [[frac(4 * d * a ** 3, 3), 'That is the mass. Weight each piece by the square of its distance to the axis.'], [frac(4 * d * a ** 5, 5), R`That uses \(\rho^{2}\), the distance to the center. The distance to the \(z\)-axis is \(\sqrt{x^{2} + y^{2}} = \rho\sin\phi\).`], [frac(2 * d * a ** 5, 3), R`\(\tfrac{1}{2}ma^{2}\) is the formula for a cylinder, not a ball.`], [frac(8 * d * a ** 5, 9)]], set: R`In spherical coordinates the distance to the \(z\)-axis is \(\rho\sin\phi\): \(I_{z} = \displaystyle\int_{0}^{2\pi}\int_{0}^{\pi}\int_{0}^{${a}} ${d}\rho^{2}\sin^{2}\phi \cdot \rho^{2}\sin\phi\,d\rho\,d\phi\,d\theta = 2\pi \cdot \tfrac{4}{3} \cdot \tfrac{${d * a ** 5}}{5}`, num: () => mid3(r2, ...disk(a), (x, y) => -root(a * a - x * x - y * y), (x, y) => root(a * a - x * x - y * y)) },
    { what: R`a solid cone (a spinning top) with base radius ${a} cm and height ${h} cm, spun about its axis`, I: frac(d * a ** 4 * h, 10), wr: [[frac(d * a * a * h, 3), 'That is the mass. Weight each piece by the square of its distance to the axis.'], [frac(d * a ** 4 * h, 6), R`\(\tfrac{1}{2}ma^{2}\) is the formula for a cylinder. A cone has most of its mass near the axis, away from the wide base.`], [frac(d * a ** 4 * h, 3)]], set: R`Put the vertex at the origin, so the cone is \(${terms([[frac(h, a), 'r']])} \le z \le ${h}\). In cylindrical coordinates: \(I_{z} = \displaystyle\int_{0}^{2\pi}\int_{0}^{${a}}\int_{${terms([[frac(h, a), 'r']])}}^{${h}} ${d}r^{2} \cdot r\,dz\,dr\,d\theta = 2\pi \cdot ${d} \cdot ${h} \cdot \left(\tfrac{${a ** 4}}{4} - \tfrac{${a ** 4}}{5}\right)`, num: () => mid3(r2, ...disk(a), (x, y) => (h * Math.hypot(x, y)) / a, h) },
    { what: R`a thick pipe section of inner radius ${a} cm, outer radius ${b} cm and length ${h} cm, spun about its axis`, I: frac(d * h * (b ** 4 - a ** 4), 2), wr: [[frac(d * h * (b * b - a * a)), 'That is the mass. Weight each piece by the square of its distance to the axis.'], [frac(d * h * b ** 4, 2), 'That is a solid cylinder of radius ' + b + ' cm. Leave out the hole.'], [frac(d * h * (b * b - a * a) ** 2, 2), R`For a thick tube \(I_{z} = \tfrac{1}{2}m(a^{2} + b^{2})\), with a plus sign.`]], set: R`In cylindrical coordinates: \(I_{z} = \displaystyle\int_{0}^{2\pi}\int_{${a}}^{${b}}\int_{0}^{${h}} ${d}r^{2} \cdot r\,dz\,dr\,d\theta = 2\pi \cdot ${d} \cdot ${h} \cdot \tfrac{${b ** 4} - ${a ** 4}}{4}`, num: () => mid3(r2, ...disk(b), 0, h) - mid3(r2, ...disk(a), 0, h) },
  ]);
  const show = (c) => `${M(piTex(c))} g·cm²`;
  return q({
    prompt: R`Find the moment of inertia \(I_{z} = \iiint (x^{2} + y^{2})\,\delta\,dV\) of ${S.what}. The material has constant density \(\delta = ${d}\) g/cm³; take the axis of spin as the \(z\)-axis.`,
    correct: show(S.I),
    wrong: [...S.wr.map(([c, why]) => (why ? { value: show(c), why } : show(c))), show(S.I.mul(2)), show(S.I.div(2))],
    solution: [R`The distance from a point to the \(z\)-axis is \(r = \sqrt{x^{2} + y^{2}}\), so the integrand is \(r^{2}\delta\).`, R`${S.set} = ${piTex(S.I)}\).`, R`\(I_{z} = ${piTex(S.I)} \approx ${num(S.I.value * PI, { places: 0, commas: true })}\) g·cm².`],
    rule: 3,
    skill: 'moment of inertia of a solid',
    check: () => checkEqual(S.I.value * PI, cached(`si${S.what}${d}`, S.num), 5e-3, 'moment of inertia by a 3-D midpoint sum'),
  });
}

function hardExpectation(rng) {
  const L = rng.int(1, 3);
  const g = rng.pick([[[1, 0, 0]], [[1, 1, 0]], [[1, 0, 1]], [[1, 1, 1]], [[1, 1, 0], [1, 0, 1]], [[1, 2, 0]]]);
  const reg = rng.pick([
    { text: R`\(0 \le y \le x \le ${L}\)`, lo: fp(0), hi: fp(0, 1), loF: () => 0, hiF: (x) => x, loT: '0', hiT: 'x', pts: [[0, 0], [L, 0], [L, L]] },
    { text: R`\(0 \le x \le y \le ${L}\)`, lo: fp(0, 1), hi: fp(L), loF: (x) => x, hiF: () => L, loT: 'x', hiT: String(L), pts: [[0, 0], [L, L], [0, L]] },
    { text: R`\(x \ge 0\), \(y \ge 0\), \(x + y \le ${L}\)`, lo: fp(0), hi: fp(L, -1), loF: () => 0, hiF: (x) => L - x, loT: '0', hiT: terms([[L, ''], [-1, 'x']]), pts: [[0, 0], [L, 0], [0, L]] },
  ]);
  const v = rng.int(0, 1);
  const V = 'XY'[v];
  const I = exactDouble(g, 0, L, reg.lo, reg.hi);
  const k = frac(1).div(I);
  const Mv = exactDouble(mulV(g, v), 0, L, reg.lo, reg.hi);
  const E = Mv.mul(k);
  const Eo = exactDouble(mulV(g, 1 - v), 0, L, reg.lo, reg.hi).mul(k);
  const Es = exactDouble(mulV(g, v), 0, L, fp(0), fp(L)).div(exactDouble(g, 0, L, fp(0), fp(L)));
  const lower = V.toLowerCase();
  return q({
    prompt: R`The random point \((X, Y)\) has joint density \(f(x, y) = ${coefTex(k, g)}\) on the triangle ${reg.text} (and 0 elsewhere). Find \(E[${V}]\).`,
    visual: regionPic(reg.pts, `The triangle where f is not zero, with vertices ${reg.pts.map((t) => `(${t[0]}, ${t[1]})`).join(', ')}.`),
    correct: E,
    wrong: [
      { value: Es, why: 'That integrates over the whole square. The density is 0 outside the triangle, so integrate only over the triangle.' },
      { value: Eo, why: R`That is \(E[${'YX'[v]}]\). For \(E[${V}]\) multiply the density by \(${lower}\).` },
      { value: frac(L, 2), why: R`That is the middle of the range of \(${V}\). The density is not spread evenly, so integrate \(${lower}f\).` },
      k.eq(1) ? null : { value: Mv, why: R`Keep the constant \(${k.tex()}\) from the density.` },
      E.mul(2),
    ],
    solution: [
      R`\(E[${V}] = \iint ${lower}\,f(x, y)\,dA\) over the triangle, where \(f\) is not zero.`,
      R`\(E[${V}] = ${iint(0, L, reg.loT, reg.hiT, `${lower} \\cdot ${coefTex(k, g)}`)}\).`,
      R`The integral of \(${wrapP(mulV(g, v))}\) is \(${Mv.tex()}\), so \(E[${V}] = ${k.eq(1) ? '' : `${k.tex()} \\cdot `}${Mv.tex()} = ${E.tex()}\).`,
    ],
    rule: 5,
    skill: 'expected values',
    check: () => {
      const fx = (x, y) => k.value * mpEval(g, x, y);
      const tot = mid2(fx, 0, L, reg.loF, reg.hiF, 250);
      if (Math.abs(tot - 1) > 1e-4) return `density integrates to ${tot}`;
      return checkEqual(E.value, mid2((x, y) => (v ? y : x) * fx(x, y), 0, L, reg.loF, reg.hiF, 250), 1e-4, 'E by a midpoint sum');
    },
  });
}

// ───────────── Challenge ─────────────

function challengeProbTriangle(rng) {
  if (rng.bool(0.35)) {
    const name = person(rng);
    const mu = rng.pick([2, 3, 4, 5, 6, 8, 10]);
    const n = rng.int(1, 4);
    const t = n * mu;
    const e = (j) => `e^{-${j}}`;
    return q({
      prompt: R`${name} has two jobs to do, one after the other. The times \(X\) and \(Y\) they take (in minutes) are independent and exponential, each with mean ${mu} minutes. Find the probability that both are done within ${t} minutes, \(P(X + Y \le ${t})\).`,
      visual: { type: 'plot', x: [0, t * 1.15], y: [0, t * 1.15], square: true, axisLabels: ['x', 'y'], shade: [{ f: (x) => t - x, from: 0, to: t }], fns: [{ f: (x) => t - x, domain: [0, t], label: `x + y = ${t}` }], alt: `The triangle x ≥ 0, y ≥ 0, x + y ≤ ${t} shaded in the first quadrant.` },
      correct: M(`1 - ${n + 1}${e(n)}`),
      wrong: [
        { value: M(`\\left(1 - ${e(n)}\\right)^{2}`), why: R`That is \(P(X \le ${t}, Y \le ${t})\), a square. The event \(X + Y \le ${t}\) is the triangle under the line \(x + y = ${t}\).` },
        { value: M(`1 - ${e(n)}`), why: R`That is the probability that one job alone takes at most ${t} minutes.` },
        { value: M(`1 - ${e(2 * n)}`), why: 'That is the probability that at least one of the two jobs, done side by side, would finish in time.' },
        M(`1 - ${n === 1 ? '' : n}${e(n)}`),
      ],
      solution: [
        R`Joint density: \(f(x, y) = \frac{1}{${mu * mu}}e^{-(x + y)/${mu}}\) for \(x, y \ge 0\). The event is the triangle under \(x + y = ${t}\).`,
        R`Inner integral: \(\displaystyle\int_{0}^{${t} - x} \tfrac{1}{${mu}}e^{-y/${mu}}\,dy = 1 - e^{-(${t} - x)/${mu}}\), so \(P = \displaystyle\int_{0}^{${t}} \tfrac{1}{${mu}}\left(e^{-x/${mu}} - ${e(n)}\right) dx\).`,
        R`\(= \left(1 - ${e(n)}\right) - ${n === 1 ? '' : n}${e(n)} = 1 - ${n + 1}${e(n)} \approx ${num(1 - (n + 1) * Math.exp(-n), { places: 3 })}\).`,
      ],
      rule: 5,
      skill: 'probability over a triangle',
      check: () => checkEqual(1 - (n + 1) * Math.exp(-n), mid2((x, y) => Math.exp(-(x + y) / mu) / (mu * mu), 0, t, 0, (x) => t - x, 300), 1e-4, 'probability by a midpoint sum'),
    });
  }
  const g = rng.pick(G);
  const I = exactDouble(g, 0, 1, fp(0), fp(1));
  const k = frac(1).div(I);
  const kind = rng.pick(['half', 'one', 'threehalf', 'less']);
  const c = { half: frac(1, 2), one: frac(1), threehalf: frac(3, 2), less: null }[kind];
  let P;
  let area;
  let steps;
  const gk = coefTex(k, g);
  if (kind === 'less') {
    P = exactDouble(g, 0, 1, fp(0), fp(0, 1)).mul(k);
    area = frac(1, 2);
    steps = [R`The event \(Y < X\) is the triangle below the line \(y = x\) in the unit square.`, R`\(P = ${iint(0, 1, 0, 'x', gk)} = ${P.tex()}\).`];
  } else if (c.value <= 1) {
    P = exactDouble(g, 0, c, fp(0), fp(c, -1)).mul(k);
    area = c.mul(c).div(2);
    steps = [R`The event is the triangle \(x \ge 0\), \(y \ge 0\), \(x + y \le ${c.tex()}\), which lies inside the square.`, R`\(P = ${iint(0, c.tex(), 0, terms([[c, ''], [-1, 'x']]), gk)} = ${P.tex()}\).`];
  } else {
    const corner = exactDouble(g, c.sub(1), 1, fp(c, -1), fp(1)).mul(k);
    P = frac(1).sub(corner);
    area = frac(1).sub(frac(1, 8));
    steps = [R`The line \(x + y = \tfrac{3}{2}\) cuts off the corner triangle near \((1, 1)\); it is easier to find that and subtract from 1.`, R`\(P(X + Y > \tfrac{3}{2}) = ${iint('\\frac{1}{2}', 1, terms([[c, ''], [-1, 'x']]), 1, gk)} = ${corner.tex()}\).`, R`\(P(X + Y \le \tfrac{3}{2}) = 1 - ${corner.tex()} = ${P.tex()}\).`];
  }
  const ev = kind === 'less' ? 'Y < X' : `X + Y \\le ${c.tex()}`;
  const sqP = c && c.value <= 1 ? exactDouble(g, 0, c, fp(0), fp(c)).mul(k) : null;
  const line = kind === 'less' ? (x) => x : (x) => c.value - x;
  return q({
    prompt: R`The random point \((X, Y)\) has joint density \(f(x, y) = ${gk}\) on the unit square \(0 \le x \le 1\), \(0 \le y \le 1\) (and 0 elsewhere). Find \(P(${ev})\).`,
    visual: { type: 'plot', x: [-0.2, 1.4], y: [-0.2, 1.4], square: true, polygons: [{ points: [[0, 0], [1, 0], [1, 1], [0, 1]], color: 'a' }], shade: [{ f: (x) => Math.min(1, Math.max(0, line(x))), from: 0, to: 1, color: 'b' }], fns: [{ f: line, label: kind === 'less' ? 'y = x' : `x + y = ${c.tex().replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2')}` }], alt: `The unit square, with the part where ${kind === 'less' ? 'y < x (below the line y = x)' : `x + y ≤ ${c.value} (below the line x + y = ${c.value})`} shaded orange.` },
    correct: P,
    wrong: [
      { value: area, why: 'That is the area of the event, which equals the probability only for a uniform density.' },
      { value: frac(1).sub(P), why: 'That is the probability of the complement.' },
      sqP ? { value: sqP, why: R`That integrates over the square \(0 \le x, y \le ${c.tex()}\). The event is the triangle under the line.` } : null,
      k.eq(1) ? null : { value: P.div(k), why: R`Keep the constant \(${k.tex()}\) from the density.` },
      P.div(2),
    ],
    solution: kind === 'threehalf' ? steps : [...steps, R`So \(P(${ev}) = ${P.tex()}\).`],
    rule: 4,
    skill: 'probability over a triangle',
    check: () => {
      const f = (x, y) => k.value * mpEval(g, x, y);
      const got = kind === 'less' ? mid2(f, 0, 1, 0, (x) => x) : c.value <= 1 ? mid2(f, 0, c.value, 0, (x) => c.value - x) : 1 - mid2(f, 0.5, 1, (x) => 1.5 - x, 1);
      return checkEqual(P.value, got, 1e-4, 'probability by a midpoint sum');
    },
  });
}

function challengeGyration(rng) {
  const [p, s] = [rng.int(1, 6), rng.int(1, 6)];
  const a = rng.int(1, 6);
  const b = a + rng.int(1, 3);
  const cases = [
    { text: R`the rectangle \(0 \le x \le ${p}\), \(0 \le y \le ${s}\) with constant density`, ax: 'x', R2: frac(s * s, 3), other: frac(p * p, 3), cen: frac(s, 2), num: () => [mid2((x, y) => y * y, 0, p, 0, s, 100), p * s] },
    { text: R`the rectangle \(0 \le x \le ${p}\), \(0 \le y \le ${s}\) with density \(\rho = x\)`, ax: 'y', R2: frac(p * p, 2), other: frac(s * s, 3), cen: frac(2 * p, 3), num: () => [mid2((x, y) => x ** 3, 0, p, 0, s, 100), mid2((x) => x, 0, p, 0, s, 100)] },
    { text: R`the triangle with vertices \((0, 0)\), \((${p}, 0)\) and \((0, ${s})\) with constant density`, ax: 'x', R2: frac(s * s, 6), other: frac(p * p, 6), cen: frac(s, 3), num: () => [mid2((x, y) => y * y, 0, p, 0, (x) => s - (s * x) / p, 200), (p * s) / 2] },
    { text: R`the disk \(x^{2} + y^{2} \le ${a * a}\) with constant density`, ax: rng.pick(['x', '0']), R2: null, num: null },
    { text: R`the disk \(x^{2} + y^{2} \le ${a * a}\) with density \(\rho = \sqrt{x^{2} + y^{2}}\)`, ax: rng.pick(['x', '0']), R2: null, num: null, n: 1 },
    { text: R`the ring \(${a * a} \le x^{2} + y^{2} \le ${b * b}\) with constant density`, ax: rng.pick(['x', '0']), R2: null, num: null, ring: true },
  ];
  const c = rng.pick(cases);
  if (!c.R2) {
    const [r1, n] = [c.ring ? a : 0, c.n ?? 0];
    const r2 = c.ring ? b : a;
    const I0 = frac(r2 ** (4 + n) - r1 ** (4 + n), 4 + n);
    const m = frac(r2 ** (2 + n) - r1 ** (2 + n), 2 + n);
    const full = I0.div(m);
    c.R2 = c.ax === 'x' ? full.div(2) : full;
    c.other = c.ax === 'x' ? full : full.div(2);
    c.whyOther = c.ax === 'x' ? R`That uses \(I_{0}\). About a diameter, \(I_{x} = \tfrac{1}{2}I_{0}\) by symmetry.` : R`That uses \(I_{x}\). About the origin the distance is \(r\), so use \(I_{0}\).`;
    c.num = () => [polarMid((x, y) => (c.ax === 'x' ? y * y : x * x + y * y) * Math.hypot(x, y) ** n, r1, r2, 'full', 300), polarMid((x, y) => Math.hypot(x, y) ** n, r1, r2, 'full', 300)];
  }
  const axisText = { x: R`the \(x\)-axis`, y: R`the \(y\)-axis`, 0: 'the origin' }[c.ax];
  const Iname = c.ax === '0' ? 'I_{0}' : `I_{${c.ax}}`;
  const ans = sqrtFrac(c.R2);
  const val = Math.sqrt(c.R2.value);
  const cand = [
    [M(sqrtFrac(c.other)), c.whyOther ?? R`That is the radius of gyration about the other axis. About ${axisText}, use \(${Iname}\).`, Math.sqrt(c.other.value)],
    [M(c.R2.tex()), R`That is \(${Iname}/m\). The radius of gyration is its square root.`, c.R2.value],
    c.cen ? [M(c.cen.tex()), R`That is the distance from the center of mass to the axis. The radius of gyration is \(\sqrt{${Iname}/m}\), which is larger.`, c.cen.value] : null,
    [M(sqrtFrac(c.R2.mul(2))), null, Math.sqrt(2 * c.R2.value)],
    [M(sqrtFrac(c.R2.div(2))), null, Math.sqrt(c.R2.value / 2)],
    [M(sqrtFrac(c.R2.mul(3))), null, Math.sqrt(3 * c.R2.value)],
    [M(sqrtFrac(c.R2.mul(4))), null, Math.sqrt(4 * c.R2.value)],
  ].filter((w, i, all) => w && Math.abs(w[2] - val) > 1e-9 && !all.slice(0, i).some((u) => u && Math.abs(u[2] - w[2]) < 1e-9));
  return q({
    prompt: R`Find the radius of gyration about ${axisText} of the thin plate occupying ${c.text}.`,
    correct: M(ans),
    wrong: cand.map(([value, why]) => (why ? { value, why } : value)),
    solution: [
      R`The radius of gyration is \(R = \sqrt{${Iname}/m}\): the distance at which all the mass would give the same moment of inertia.`,
      R`Here \(\dfrac{${Iname}}{m} = ${c.R2.tex()}\) (any constant in the density cancels).`,
      R`\(R = \sqrt{${c.R2.tex()}}${ans === `\\sqrt{${c.R2.tex()}}` ? '' : ` = ${ans}`}${Number.isInteger(val) ? '' : ` \\approx ${num(val, { places: 3 })}`}\).`,
    ],
    rule: 2,
    skill: 'radius of gyration',
    check: () => {
      const [I, m] = cached(`gy${c.text}${c.ax}`, c.num);
      return checkEqual(val, Math.sqrt(I / m), 2e-3, 'radius of gyration by midpoint sums');
    },
  });
}

function challengeSolidCenter(rng) {
  const a = rng.int(1, 8);
  const k = rng.int(2, 5);
  const hemi = (f) => mid3(f, -a, a, (x) => -root(a * a - x * x), (x) => root(a * a - x * x), 0, (x, y) => root(a * a - x * x - y * y));
  const sph = (body, top) => `\\displaystyle\\int_{0}^{2\\pi}\\int_{0}^{\\pi/2}\\int_{0}^{${top}} ${body}\\,d\\rho\\,d\\phi\\,d\\theta`;
  const kind = rng.int(0, 4);
  let S;
  if (kind <= 1) {
    const n = kind + 1;
    const ans = n === 1 ? frac(2 * a, 5) : frac(5 * a, 12);
    const rr = n === 1 ? '\\rho' : '\\rho^{2}';
    S = {
      prompt: R`A solid hemisphere \(x^{2} + y^{2} + z^{2} \le ${a * a}\), \(z \ge 0\) has density \(\delta = ${k}${n === 1 ? '\\sqrt{x^{2} + y^{2} + z^{2}}' : '(x^{2} + y^{2} + z^{2})'}\), which grows with distance from the center. Find \(${bar('z')}\).`,
      ans,
      wrong: [[frac(3 * a, 8), R`That is \(${bar('z')}\) for constant density. Here the density grows outward, which moves the center of mass up slightly.`], [frac(a, 2), 'Halfway up would suit a cylinder. A hemisphere has more of its volume near its base.'], [n === 1 ? frac(5 * a, 12) : frac(2 * a, 5)], [frac(8 * a, 15)]],
      steps: [
        R`By symmetry \(${bar('x')} = ${bar('y')} = 0\). In spherical coordinates \(\delta = ${k}${rr}\) and \(z = \rho\cos\phi\).`,
        R`\(m = ${k}${sph(`${rr} \\cdot \\rho^{2}\\sin\\phi`, a)} = ${k} \cdot 2\pi \cdot 1 \cdot \tfrac{${a ** (n + 3)}}{${n + 3}}\).`,
        R`\(M_{xy} = ${k}${sph(`\\rho\\cos\\phi \\cdot ${rr} \\cdot \\rho^{2}\\sin\\phi`, a)} = ${k} \cdot 2\pi \cdot \tfrac{1}{2} \cdot \tfrac{${a ** (n + 4)}}{${n + 4}}\).`,
      ],
      num: () => [hemi((x, y, z) => z * Math.hypot(x, y, z) ** n), hemi((x, y, z) => Math.hypot(x, y, z) ** n)],
    };
  } else if (kind === 2) {
    const [m, r] = [rng.int(1, 3), rng.int(1, 4)];
    const h = m * r;
    const [rT, aT, cT] = m === 1 ? ['z', '\\pi z^{2}', `${k}\\pi`] : [`z/${m}`, `\\frac{\\pi z^{2}}{${m * m}}`, `\\frac{${k}\\pi}{${m * m}}`];
    S = {
      prompt: R`A solid cone \(${terms([[m, '\\sqrt{x^{2} + y^{2}}']])} \le z \le ${h}\) (vertex at the origin, axis up) has density \(\delta = ${k}z\). Find \(${bar('z')}\).`,
      ans: frac(4 * h, 5),
      wrong: [[frac(3 * h, 4), 'That is the answer for constant density. Here the density also grows with height, which pulls the center of mass higher.'], [frac(2 * h, 3), R`\(\frac{2}{3}\) of the height is right for a cylinder with density \(kz\). The cone also widens upward.`], [frac(h, 2)], [frac(3 * h, 5)]],
      steps: [
        R`By symmetry \(${bar('x')} = ${bar('y')} = 0\). Slice horizontally: at height \(z\) the cross-section is a disk of radius \(${rT}\) and area \(${aT}\).`,
        R`\(m = \displaystyle\int_{0}^{${h}} ${k}z \cdot ${aT}\,dz = ${cT} \cdot \frac{${h}^{4}}{4}\) and \(M_{xy} = \displaystyle\int_{0}^{${h}} z \cdot ${k}z \cdot ${aT}\,dz = ${cT} \cdot \frac{${h}^{5}}{5}\).`,
      ],
      num: () => [mid3((x, y, z) => k * z * z, -r, r, (x) => -root(r * r - x * x), (x) => root(r * r - x * x), (x, y) => m * Math.hypot(x, y), h), mid3((x, y, z) => k * z, -r, r, (x) => -root(r * r - x * x), (x) => root(r * r - x * x), (x, y) => m * Math.hypot(x, y), h)],
    };
  } else if (kind === 3) {
    const h = rng.int(2, 10);
    S = {
      prompt: R`A solid cylinder \(x^{2} + y^{2} \le ${a * a}\), \(0 \le z \le ${h}\) has density \(\delta = ${k}(x^{2} + y^{2})\), so it is densest at its curved surface. Find \(${bar('z')}\).`,
      ans: frac(h, 2),
      wrong: [[frac(2 * h, 3), R`That would need a density that grows with \(z\). This density depends only on the distance from the axis.`], [frac(3 * h, 4), R`The density is the same at every height, so each horizontal slice has the same mass.`], [frac(h, 3)], [frac(a, 2)]],
      steps: [
        R`The density depends only on \(r\), not on \(z\), so every horizontal slice of thickness \(dz\) has the same mass.`,
        R`So the solid is symmetric about the plane \(z = ${frac(h, 2).tex()}\) in both shape and density: \(M_{xy} = ${bar('z')}\,m\) with \(${bar('z')}\) at the middle. (In cylindrical coordinates the \(r\)- and \(\theta\)-integrals cancel, leaving \(\int_{0}^{${h}} z\,dz \big/ \int_{0}^{${h}} dz\).)`,
      ],
      num: () => [mid3((x, y, z) => z * k * (x * x + y * y), -a, a, (x) => -root(a * a - x * x), (x) => root(a * a - x * x), 0, h), mid3((x, y) => k * (x * x + y * y), -a, a, (x) => -root(a * a - x * x), (x) => root(a * a - x * x), 0, h)],
    };
  } else {
    const [A, B, C] = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)];
    const [pa, pb, pc, pd] = primitive([B * C, A * C, A * B, A * B * C]);
    const v = rng.int(0, 2);
    const L = [A, B, C][v];
    const V = 'xyz'[v];
    S = {
      prompt: R`A solid of constant density is the tetrahedron in the first octant under the plane \(${terms([[pa, 'x'], [pb, 'y'], [pc, 'z']])} = ${pd}\). Find \(${bar(V)}\).`,
      ans: frac(L, 4),
      wrong: [[frac(L, 3), R`\(\frac{1}{3}\) is the centroid fraction for a triangle. A tetrahedron is narrower toward its tip, so it is \(\frac{1}{4}\).`], [frac(L, 2), 'Halfway is right only for a solid with the same cross-section all the way.'], [frac(3 * L, 4), 'That is measured from the tip. Most of the volume is near the base, at the origin end.'], [frac(L, 6)]],
      steps: [
        R`The plane meets the axes at \(x = ${A}\), \(y = ${B}\), \(z = ${C}\); the volume is \(V = \tfrac{1}{6} \cdot ${A} \cdot ${B} \cdot ${C} = ${frac(A * B * C, 6).tex()}\).`,
        R`Slice perpendicular to the \(${V}\)-axis: at \(${V} = t\) the slice is a triangle with area \(\tfrac{${A * B * C}}{2 \cdot ${L}}\left(1 - \tfrac{t}{${L}}\right)^{2}\). Then \(\iiint ${V}\,dV = \displaystyle\int_{0}^{${L}} t \cdot \tfrac{${A * B * C}}{${2 * L}}\left(1 - \tfrac{t}{${L}}\right)^{2} dt = ${frac(A * B * C * L, 24).tex()}\).`,
      ],
      num: () => [mid3((x, y, z) => [x, y, z][v], 0, A, 0, (x) => B * (1 - x / A), 0, (x, y) => Math.max(0, C * (1 - x / A - y / B))), mid3(() => 1, 0, A, 0, (x) => B * (1 - x / A), 0, (x, y) => Math.max(0, C * (1 - x / A - y / B)))],
      V,
    };
  }
  return q({
    prompt: S.prompt,
    correct: S.ans,
    wrong: S.wrong.map(([value, why]) => (why ? { value, why } : value)),
    solution: [...S.steps, R`Divide the moment by the mass: \(${bar(S.V ?? 'z')} = ${S.ans.tex()}\).`],
    rule: 3,
    skill: 'center of mass of a solid',
    check: () => {
      const [mo, m] = cached(`sc${kind}${S.prompt}`, S.num);
      return checkEqual(S.ans.value, mo / m, 4e-3, 'center of mass by 3-D midpoint sums');
    },
  });
}

// ───────────── Models ─────────────

function plateModel({ p, s, c0, cx, cy }) {
  const corners = [[0, 0], [p, 0], [0, s], [p, s]].map(([x, y]) => [x, y, c0 + cx * x + cy * y]);
  const low = corners.find((t) => t[2] < 0);
  if (low) return { error: `The density would be ${low[2]} at the corner (${low[0]}, ${low[1]}). A density cannot be negative: raise the constant term or change a coefficient.` };
  if (corners.every((t) => t[2] === 0)) return { error: 'The density is 0 everywhere, so the plate has no mass. Give it a positive constant term.' };
  const rho = terms([[cx, 'x'], [cy, 'y'], [c0, '']]);
  const m = frac(2 * c0 * p * s + cx * p * p * s + cy * p * s * s, 2);
  const My = frac(6 * c0 * p * p * s + 4 * cx * p ** 3 * s + 3 * cy * p * p * s * s, 12);
  const Mx = frac(6 * c0 * p * s * s + 3 * cx * p * p * s * s + 4 * cy * p * s ** 3, 12);
  const [xb, yb] = [My.div(m), Mx.div(m)];
  const d3 = (f) => num(f.value, { places: 3 });
  const approx = (f) => (f.isInt() ? '' : ` \\approx ${d3(f)}`);
  return {
    problem: R`A thin plate occupies \(0 \le x \le ${p}\), \(0 \le y \le ${s}\) and has density \(\rho(x, y) = ${rho}\). Find its mass and its center of mass.`,
    steps: [
      R`Mass: \(m = ${iint(0, p, 0, s, `\\left(${rho}\\right)`)} = ${m.tex()}\).`,
      R`Moment about the \(y\)-axis: \(M_{y} = \iint x\rho\,dA = ${My.tex()}\). Moment about the \(x\)-axis: \(M_{x} = \iint y\rho\,dA = ${Mx.tex()}\).`,
      R`\(${bar('x')} = \dfrac{M_{y}}{m} = ${xb.tex()}${approx(xb)}\) and \(${bar('y')} = \dfrac{M_{x}}{m} = ${yb.tex()}${approx(yb)}\).`,
      cx === 0 && cy === 0 ? R`The density is constant, so the center of mass is the centroid \((${frac(p, 2).tex()}, ${frac(s, 2).tex()})\).` : R`Compare the centroid \((${frac(p, 2).tex()}, ${frac(s, 2).tex()})\): the center of mass moves toward the denser side.`,
    ],
    answer: R`\(m = ${m.tex()}\); center of mass \(\left(${xb.tex()}, ${yb.tex()}\right) \approx (${d3(xb)}, ${d3(yb)})\)`,
    visual: {
      type: 'plot', ...squareWindow([[0, 0], [p, s]], 0.6), polygons: [{ points: [[0, 0], [p, 0], [p, s], [0, s]], color: 'a' }],
      points: [{ x: xb.value, y: yb.value, label: 'center of mass', color: 'b' }, { x: p / 2, y: s / 2, open: true, label: 'centroid', color: 'd' }],
      alt: `The rectangle from (0, 0) to (${p}, ${s}). The center of mass is marked at about (${d3(xb)}, ${d3(yb)}) and the centroid, as an open dot, at (${p / 2}, ${s / 2}).`,
    },
  };
}

function waitModel({ m1, m2, t }) {
  const race = frac(m2, m1 + m2);
  const [q1, q2] = [1 - Math.exp(-t / m1), 1 - Math.exp(-t / m2)];
  const d3 = (v) => num(v, { places: 3 });
  return {
    problem: R`A café has two baristas. The times \(X\) and \(Y\) (in minutes) until each finishes an order are independent and exponential, with means ${m1} and ${m2} minutes. What is the chance that the first barista finishes first, and that both finish within ${t} minutes?`,
    steps: [
      R`Joint density: \(f(x, y) = \frac{1}{${m1}}e^{-x/${m1}} \cdot \frac{1}{${m2}}e^{-y/${m2}}\) for \(x, y \ge 0\). It is the product of the two densities because the times are independent.`,
      R`\(P(X < Y) = \displaystyle\int_{0}^{\infty}\int_{x}^{\infty} f\,dy\,dx = \int_{0}^{\infty} \tfrac{1}{${m1}}e^{-x/${m1}}e^{-x/${m2}}\,dx = \frac{${m2}}{${m1} + ${m2}} = ${race.tex()} \approx ${d3(race.value)}\).`,
      R`\(P(X \le ${t}, Y \le ${t})\) is the integral over the square \([0, ${t}] \times [0, ${t}]\). It splits into \(\left(1 - e^{-${t}/${m1}}\right)\left(1 - e^{-${t}/${m2}}\right) = ${d3(q1)} \cdot ${d3(q2)} \approx ${d3(q1 * q2)}\).`,
    ],
    answer: R`\(P(X < Y) \approx ${d3(race.value)}\); \(P(\text{both within } ${t}) \approx ${d3(q1 * q2)}\)`,
    visual: {
      type: 'plot', x: [0, 1.3 * t], y: [0, 1.3 * t], square: true, axisLabels: ['x', 'y'],
      polygons: [{ points: [[0, 0], [t, 0], [t, t], [0, t]], color: 'a' }], fns: [{ f: (x) => x, dashed: true, color: 'b', label: 'y = x' }],
      alt: `The first quadrant. The square from 0 to ${t} on both axes is shaded: the event that both finish within ${t} minutes. The dashed line y = x separates X < Y (above it) from Y < X (below it).`,
    },
  };
}

const HALF = { type: 'plot', x: [-3.6, 3.6], y: [-0.6, 3.6], square: true, polygons: [{ points: sectorPts(0, 3, 0, 180), color: 'a' }], points: [{ x: 0, y: 4 / PI, label: 'center of mass (0, 4/π)', color: 'b' }], alt: 'The half-disk of radius 3 above the x-axis. Its center of mass, for constant density, is on the y-axis at height 4/π ≈ 1.27, below the halfway height 1.5 because the plate is wider near its flat edge.' };

export default {
  id: 'multiple-integral-applications',
  title: 'Mass, Moments & Probability with Multiple Integrals',
  summary: 'Use double and triple integrals for mass, charge, centers of mass and moments of inertia, and for probabilities from joint densities.',
  standards: ['Calculus III: applications of double integrals', 'Calculus III: applications of triple integrals'],

  explain: {
    intro: R`A double integral adds up a quantity spread over a region. With a density \(\rho(x, y)\) it gives a mass; with a charge density it gives a charge; weighted by \(x\), \(y\) or a squared distance it gives moments, which locate the balance point and measure resistance to turning. The same integral with a joint probability density gives a probability. Triple integrals do the same for solids.`,
    rules: [
      { title: 'Mass and charge', text: R`A thin plate (lamina) on the region \(D\) with density \(\rho(x, y)\) has mass \(m = \iint_{D} \rho\,dA\). A surface charge density \(\sigma(x, y)\) gives the total charge \(Q = \iint_{D} \sigma\,dA\) in the same way. Use polar coordinates for disks, rings and sectors.`, example: R`On \([0, 2] \times [0, 1]\) with \(\rho = xy + 1\): \(m = \displaystyle\int_{0}^{2}\int_{0}^{1} (xy + 1)\,dy\,dx = 1 + 2 = 3\).` },
      { title: 'Moments and center of mass', text: R`The moments are \(M_{x} = \iint_{D} y\rho\,dA\) (about the \(x\)-axis) and \(M_{y} = \iint_{D} x\rho\,dA\) (about the \(y\)-axis). The center of mass is \((${bar('x')}, ${bar('y')}) = \left(\dfrac{M_{y}}{m}, \dfrac{M_{x}}{m}\right)\). If the region and the density are both unchanged by \(x \to -x\), then \(${bar('x')} = 0\) with no integration; likewise for \(y\). With constant density the center of mass is the centroid.`, example: R`A half-disk \(x^{2} + y^{2} \le a^{2}\), \(y \ge 0\), of constant density: \(${bar('x')} = 0\) by symmetry and \(${bar('y')} = \dfrac{4a}{3\pi}\).` },
      { title: 'Moments of inertia and radius of gyration', text: R`\(I_{x} = \iint_{D} y^{2}\rho\,dA\), \(I_{y} = \iint_{D} x^{2}\rho\,dA\) and \(I_{0} = \iint_{D} (x^{2} + y^{2})\rho\,dA = I_{x} + I_{y}\): each piece is weighted by the square of its distance to the axis. The radius of gyration about an axis is \(R = \sqrt{I/m}\), the distance at which all the mass would give the same \(I\).`, example: R`A uniform disk of radius \(a\): \(I_{0} = \tfrac{1}{2}ma^{2}\), so \(R_{0} = \dfrac{a}{\sqrt{2}}\); by symmetry \(I_{x} = \tfrac{1}{2}I_{0}\).` },
      { title: 'Solids', text: R`A solid \(E\) with density \(\delta\) has mass \(m = \iiint_{E} \delta\,dV\), moments \(M_{yz} = \iiint x\delta\,dV\), \(M_{xz} = \iiint y\delta\,dV\), \(M_{xy} = \iiint z\delta\,dV\), center of mass \(\left(\frac{M_{yz}}{m}, \frac{M_{xz}}{m}, \frac{M_{xy}}{m}\right)\), and moment of inertia about the \(z\)-axis \(I_{z} = \iiint (x^{2} + y^{2})\delta\,dV\). Use cylindrical coordinates (\(x^{2} + y^{2} = r^{2}\)) for solids round an axis and spherical ones for balls.`, example: R`A uniform solid cylinder of radius \(a\) and height \(h\): \(I_{z} = \displaystyle\int_{0}^{2\pi}\int_{0}^{a}\int_{0}^{h} r^{2}\delta\,r\,dz\,dr\,d\theta = \tfrac{1}{2}\pi\delta a^{4}h = \tfrac{1}{2}ma^{2}\).` },
      { title: 'Joint probability densities', text: R`A function \(f(x, y)\) is a joint density if \(f \ge 0\) and \(\iint_{\mathbb{R}^{2}} f\,dA = 1\); this condition fixes any constant \(k\). Then \(P\big((X, Y) \in D\big) = \iint_{D} f\,dA\): sketch the event (a rectangle, or a triangle such as \(x + y \le 1\)) and integrate over the part where \(f \ne 0\).`, example: R`\(f = x + y\) on the unit square is a density. \(P(X + Y \le 1) = \displaystyle\int_{0}^{1}\int_{0}^{1 - x} (x + y)\,dy\,dx = \tfrac{1}{3}\).` },
      { title: 'Expected values and independence', text: R`\(E[X] = \iint x f\,dA\) and \(E[Y] = \iint y f\,dA\). If \(X\) and \(Y\) are independent, \(f(x, y) = f_{X}(x)f_{Y}(y)\). For exponential waiting times with means \(\mu_{1}\), \(\mu_{2}\): \(f = \frac{1}{\mu_{1}\mu_{2}}e^{-x/\mu_{1} - y/\mu_{2}}\) for \(x, y \ge 0\), and \(P(X < Y) = \dfrac{\mu_{2}}{\mu_{1} + \mu_{2}}\).`, example: R`Means 4 and 6 minutes: \(P(X < Y) = \frac{6}{10} = \frac{3}{5}\).` },
    ],
    vocab: [
      { term: 'lamina', def: 'A thin flat plate, modeled as a region of the plane with a density in mass per unit area.' },
      { term: 'moment', def: R`A first moment such as \(M_{y} = \iint x\rho\,dA\): mass weighted by signed distance from an axis. Dividing by the mass gives a coordinate of the center of mass.` },
      { term: 'moment of inertia', def: 'A second moment: mass weighted by the square of the distance to an axis. It measures how hard the object is to spin about that axis.' },
      { term: 'radius of gyration', def: R`\(\sqrt{I/m}\): the distance from the axis at which a point of the same mass would have the same moment of inertia.` },
      { term: 'joint density', def: R`A function \(f(x, y) \ge 0\) with total integral 1, whose integral over a region is the probability that \((X, Y)\) lands there.` },
    ],
    mistakes: [
      R`Pairing the moments with the wrong coordinate: \(${bar('x')}\) uses \(M_{y} = \iint x\rho\,dA\), the moment about the \(y\)-axis.`,
      'Using the centroid when the density is not constant. The density pulls the balance point toward the heavier part.',
      R`Forgetting the factor \(r\) in \(dA = r\,dr\,d\theta\), or \(\rho^{2}\sin\phi\) in \(dV\).`,
      R`Using the distance to the origin, \(\rho\), in \(I_{z}\). The distance to the \(z\)-axis is \(\sqrt{x^{2} + y^{2}}\).`,
      'Integrating a joint density over a whole square when it is 0 outside a triangle, or treating a probability as an area when the density is not uniform.',
    ],
    visual: HALF,
  },

  examples: [
    {
      title: 'Center of mass of a triangular plate',
      problem: R`A plate occupies the triangle with vertices \((0, 0)\), \((2, 0)\), \((0, 2)\) and has density \(\rho = x\). Find its center of mass.`,
      steps: [
        R`The triangle is \(0 \le x \le 2\), \(0 \le y \le 2 - x\). Mass: \(m = \displaystyle\int_{0}^{2}\int_{0}^{2 - x} x\,dy\,dx = \int_{0}^{2} (2x - x^{2})\,dx = \tfrac{4}{3}\).`,
        R`\(M_{y} = \displaystyle\int_{0}^{2}\int_{0}^{2 - x} x^{2}\,dy\,dx = \int_{0}^{2} (2x^{2} - x^{3})\,dx = \tfrac{16}{3} - 4 = \tfrac{4}{3}\), so \(${bar('x')} = 1\).`,
        R`\(M_{x} = \displaystyle\int_{0}^{2}\int_{0}^{2 - x} xy\,dy\,dx = \int_{0}^{2} \tfrac{1}{2}x(2 - x)^{2}\,dx = \tfrac{2}{3}\), so \(${bar('y')} = \tfrac{2/3}{4/3} = \tfrac{1}{2}\).`,
        R`Compare the centroid \(\left(\tfrac{2}{3}, \tfrac{2}{3}\right)\): the density \(x\) pulls the balance point to the right.`,
      ],
      answer: R`\(\left(1, \tfrac{1}{2}\right)\)`,
      visual: { type: 'plot', x: [-0.4, 2.5], y: [-0.4, 2.5], square: true, polygons: [{ points: [[0, 0], [2, 0], [0, 2]], color: 'a' }], points: [{ x: 1, y: 0.5, label: 'center of mass', color: 'b' }, { x: 2 / 3, y: 2 / 3, open: true, label: 'centroid', color: 'd' }], alt: 'The triangle with vertices (0, 0), (2, 0) and (0, 2). The center of mass (1, 1/2) is marked, to the right of and below the centroid (2/3, 2/3), shown as an open dot.' },
    },
    {
      title: 'Symmetry and polar coordinates: a half-disk',
      problem: R`Find the center of mass of the half-disk \(x^{2} + y^{2} \le 9\), \(y \ge 0\), with constant density.`,
      steps: [
        R`The region is symmetric about the \(y\)-axis and the density is constant, so \(${bar('x')} = 0\). The constant density cancels: \(${bar('y')} = \frac{1}{A}\iint y\,dA\) with \(A = \tfrac{9\pi}{2}\).`,
        R`\(\displaystyle\iint y\,dA = \int_{0}^{\pi}\int_{0}^{3} r\sin\theta \cdot r\,dr\,d\theta = \left[-\cos\theta\right]_{0}^{\pi} \cdot \tfrac{27}{3} = 18\).`,
        R`\(${bar('y')} = \dfrac{18}{9\pi/2} = \dfrac{4}{\pi} \approx 1.27\), which is \(\dfrac{4a}{3\pi}\) with \(a = 3\).`,
      ],
      answer: R`\(\left(0, \dfrac{4}{\pi}\right)\)`,
      visual: HALF,
    },
    {
      title: 'Word problem: a steel flywheel',
      word: true,
      problem: R`A flywheel is a solid steel disk of radius 10 cm and thickness 4 cm, with density \(\delta = 8\) g/cm³. Find its moment of inertia about its axle and its radius of gyration.`,
      steps: [
        R`Put the axle on the \(z\)-axis. The distance to the axle is \(r\), so in cylindrical coordinates \(I_{z} = \displaystyle\int_{0}^{2\pi}\int_{0}^{10}\int_{0}^{4} r^{2} \cdot 8 \cdot r\,dz\,dr\,d\theta\).`,
        R`\(= 2\pi \cdot 8 \cdot 4 \cdot \tfrac{10^{4}}{4} = 160\,000\pi \approx 502\,655\) g·cm².`,
        R`Mass: \(m = 8 \cdot \pi(10)^{2} \cdot 4 = 3200\pi\) g. Radius of gyration: \(R = \sqrt{I_{z}/m} = \sqrt{50} = 5\sqrt{2} \approx 7.07\) cm.`,
      ],
      answer: R`\(I_{z} = 160\,000\pi \approx 5.03 \times 10^{5}\) g·cm²; \(R = 5\sqrt{2} \approx 7.07\) cm`,
    },
    {
      title: 'Word problem: which light bulb fails first?',
      word: true,
      problem: R`The lifetimes \(X\) and \(Y\) (in years) of two bulbs are independent and exponential, with means 4 and 6 years. Check that the joint density integrates to 1, then find \(P(X < Y)\) and \(E[X]\).`,
      steps: [
        R`\(f(x, y) = \frac{1}{24}e^{-x/4 - y/6}\) for \(x, y \ge 0\). \(\displaystyle\int_{0}^{\infty}\int_{0}^{\infty} f\,dy\,dx = \int_{0}^{\infty} \tfrac{1}{4}e^{-x/4}\,dx \cdot \int_{0}^{\infty} \tfrac{1}{6}e^{-y/6}\,dy = 1 \cdot 1\).`,
        R`The event \(X < Y\) is the region above the line \(y = x\): \(\displaystyle\int_{0}^{\infty}\int_{x}^{\infty} f\,dy\,dx = \int_{0}^{\infty} \tfrac{1}{4}e^{-x/4}e^{-x/6}\,dx = \frac{1/4}{5/12} = \frac{3}{5}\).`,
        R`\(E[X] = \displaystyle\iint x f\,dA = \int_{0}^{\infty} \tfrac{x}{4}e^{-x/4}\,dx \cdot 1 = 4\) years, the mean, as it should be.`,
      ],
      answer: R`\(P(X < Y) = \tfrac{3}{5}\); \(E[X] = 4\) years`,
      visual: { type: 'plot', x: [0, 10], y: [0, 10], square: true, axisLabels: ['x', 'y'], shade: [{ f: () => 10, g: (x) => x, from: 0, to: 10 }], fns: [{ f: (x) => x, label: 'y = x', labelAt: 7 }], alt: 'The first quadrant with the region above the line y = x shaded: the event X < Y.' },
    },
  ],

  models: [
    {
      id: 'plate-center',
      title: 'Mass and center of mass of a plate',
      intro: 'A rectangular plate whose density changes linearly: ρ = (x-coefficient)·x + (y-coefficient)·y + constant.',
      inputs: [
        { name: 'p', label: 'Width p (x from 0 to p)', type: 'int', min: 1, max: 8, value: 4 },
        { name: 's', label: 'Height s (y from 0 to s)', type: 'int', min: 1, max: 8, value: 2 },
        { name: 'c0', label: 'Constant term', type: 'int', min: 0, max: 20, value: 1 },
        { name: 'cx', label: 'Coefficient of x', type: 'int', min: -5, max: 5, value: 2 },
        { name: 'cy', label: 'Coefficient of y', type: 'int', min: -5, max: 5, value: 0 },
      ],
      compute: plateModel,
    },
    {
      id: 'two-waits',
      title: 'Word problem: two independent waiting times',
      word: true,
      intro: 'Two baristas work independently; each one’s time is exponential with its own mean.',
      inputs: [
        { name: 'm1', label: 'Mean time of the first barista (min)', type: 'int', min: 1, max: 60, value: 4 },
        { name: 'm2', label: 'Mean time of the second barista (min)', type: 'int', min: 1, max: 60, value: 6 },
        { name: 't', label: 'Time limit t (min)', type: 'int', min: 1, max: 120, value: 5 },
      ],
      compute: waitModel,
    },
  ],

  quiz: {
    easy: [easyMassRect, easySymmetry, easyJointK],
    medium: [mediumCenterLamina, mediumPolarCharge, mediumProbRect, mediumExpRace],
    hard: [hardInertia, hardCenterPolar, hardSolidInertia, hardExpectation],
    challenge: [challengeProbTriangle, challengeGyration, challengeSolidCenter],
  },
};
