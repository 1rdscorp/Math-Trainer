import { R, q, frac, Frac, num, round, terms, power, integrate, integrate2, checkEqual } from '../../lib/index.js';
import { M, mpTex, mpEval, mpClean, piTex, rad, primitive, fp, fpSub, fpScale, fpMul, fpPow, exactDouble } from './_shared.js';

/** ∫_{a}^{b} ∫_{c}^{d} body d(inner) d(outer) as LaTeX; the outer limits come first. */
const iint = (a, b, c, d, body, inner = 'dy', outer = 'dx') => `\\displaystyle\\int_{${a}}^{${b}}\\int_{${c}}^{${d}} ${body}\\,${inner}\\,${outer}`;
/** LaTeX for a one-variable polynomial with Frac coefficients (lowest power first). */
const fpTex = (arr, x = 'x') => terms(arr.map((c, i) => [c, power(x, i)]).reverse());
/** The inner integral ∫_{lo}^{hi} p(x, y) dy as a polynomial in x. */
function innerPoly(p, lo, hi) {
  let out = fp(0);
  for (const [c, i = 0, j = 0] of p) {
    const part = fpMul(fpScale(fpSub(fpPow(hi, j + 1), fpPow(lo, j + 1)), Frac.from(c).div(j + 1)), [...new Array(i).fill(frac(0)), frac(1)]);
    out = Array.from({ length: Math.max(out.length, part.length) }, (_, k) => (out[k] ?? frac(0)).add(part[k] ?? frac(0)));
  }
  return out;
}
const fpVal = (arr, x) => arr.reduce((s, c, i) => s + c.value * x ** i, 0);
/** Midpoint sum of f over the part of a box where `inside` holds: a slow but independent check for curved regions. */
function regionSum(f, inside, x0, x1, y0, y1, n = 700) {
  const [hx, hy] = [(x1 - x0) / n, (y1 - y0) / n];
  let s = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const [x, y] = [x0 + (i + 0.5) * hx, y0 + (j + 0.5) * hy];
    if (inside(x, y)) s += f(x, y);
  }
  return s * hx * hy;
}
/** Picture of the polar region r1 ≤ r ≤ r2, t1 ≤ θ ≤ t2 (degrees). */
function sectorPicture(r1, r2, t1, t2, alt) {
  const arc = (r, back) => Array.from({ length: 49 }, (_, i) => rad(t1 + ((t2 - t1) * (back ? 48 - i : i)) / 48)).map((t) => [r * Math.cos(t), r * Math.sin(t)]);
  const points = [...arc(r2, false), ...(r1 > 0 ? arc(r1, true) : t2 - t1 < 360 ? [[0, 0]] : [])];
  return { type: 'plot', x: [-r2 - 0.5, r2 + 0.5], y: [-r2 - 0.5, r2 + 0.5], square: true, polygons: [{ points, color: 'a' }], alt };
}

// ───────────── Easy ─────────────

function easyRectMonomial(rng) {
  const [m, n] = rng.pick([[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 0], [0, 2], [2, 2], [3, 1], [1, 3]]);
  const a = rng.int(1, 9) * rng.pick([1, 1, 1, -1]);
  const [p, s] = [rng.int(1, 3), rng.int(1, 3)];
  const f = [[a, m, n]];
  const ans = frac(a * p ** (m + 1) * s ** (n + 1), (m + 1) * (n + 1));
  const inner = frac(a * s ** (n + 1), n + 1);
  return q({
    prompt: R`Evaluate \(${iint(0, p, 0, s, mpTex(f))}\).`,
    correct: ans,
    wrong: [
      { value: a * p ** (m + 1) * s ** (n + 1), why: R`Each integration divides by the new exponent: \(\int x^{k}\,dx = \dfrac{x^{k+1}}{k+1}\).` },
      { value: a * p ** m * s ** n * p * s, why: R`That multiplies the value of the function at one corner by the area. The function changes across the rectangle, so integrate.` },
      frac(a * p ** (m + 1) * s ** (n + 1), m + 1),
      frac(a * p ** (m + 1) * s ** (n + 1), n + 1),
      ans.neg(),
    ],
    solution: [
      R`Inner integral, with \(x\) held constant: \(\displaystyle\int_{0}^{${s}} ${mpTex(f)}\,dy = ${terms([[inner, power('x', m)]])}\).`,
      R`Outer integral: \(\displaystyle\int_{0}^{${p}} ${terms([[inner, power('x', m)]])}\,dx = ${ans.tex()}\).`,
    ],
    rule: 0,
    skill: 'iterated integrals',
    check: () => checkEqual(ans.value, integrate2((x, y) => mpEval(f, x, y), 0, p, 0, s, 60), 1e-6, 'double integral'),
  });
}

function easyInner(rng) {
  const [m, n] = [rng.int(1, 3), rng.int(1, 3)];
  const b = rng.int(1, 3);
  const c = (n + 1) * rng.int(1, 4);
  const k = (c * b ** (n + 1)) / (n + 1);
  const f = [[c, m, n]];
  return q({
    prompt: R`Evaluate the inner integral \(\displaystyle\int_{0}^{${b}} ${mpTex(f)}\,dy\). (Your answer will still contain \(x\).)`,
    correct: M(terms([[k, power('x', m)]])),
    wrong: [
      { value: M(terms([[frac(c * b ** (m + 1), m + 1), power('y', n)]])), why: R`The \(dy\) says to integrate with respect to \(y\), treating \(x\) as a constant.` },
      { value: M(terms([[frac(c, n + 1), power('x', m) + power('y', n + 1)]])), why: R`After finding the antiderivative, substitute the limits \(y = ${b}\) and \(y = 0\).` },
      { value: M(terms([[c * b ** n, power('x', m)]])), why: R`That substitutes \(y = ${b}\) without integrating first.` },
      M(terms([[c * b ** (n + 1), power('x', m)]])),
      M(terms([[k, power('x', m + 1)]])),
    ],
    solution: [
      R`Treat \(x\) as a constant: an antiderivative in \(y\) is \(${terms([[frac(c, n + 1), power('x', m) + power('y', n + 1)]])}\).`,
      R`Evaluate from \(y = 0\) to \(y = ${b}\): \(${terms([[frac(c, n + 1), power('x', m)]])} \cdot ${b ** (n + 1)} - 0 = ${terms([[k, power('x', m)]])}\).`,
    ],
    rule: 0,
    skill: 'iterated integrals',
    check: () => checkEqual(k * 0.7 ** m, integrate((y) => c * 0.7 ** m * y ** n, 0, b, 200), 1e-6, 'inner integral'),
  });
}

function easyPolarSetup(rng) {
  const a = rng.int(1, 6);
  const b = a + rng.int(1, 4);
  const pi = '\\pi';
  const half = '\\frac{\\pi}{2}';
  const regions = [
    { text: R`the disk \(x^{2} + y^{2} \le ${a * a}\)`, r: [0, a], t: [0, `2${pi}`], deg: [0, 360], badT: [0, pi] },
    { text: R`the half-disk \(x^{2} + y^{2} \le ${a * a}\), \(y \ge 0\)`, r: [0, a], t: [0, pi], deg: [0, 180], badT: [0, `2${pi}`] },
    { text: R`the half-disk \(x^{2} + y^{2} \le ${a * a}\), \(x \ge 0\)`, r: [0, a], t: [`-${half}`, half], deg: [-90, 90], badT: [0, pi] },
    { text: R`the quarter-disk \(x^{2} + y^{2} \le ${a * a}\), \(x \ge 0\), \(y \ge 0\)`, r: [0, a], t: [0, half], deg: [0, 90], badT: [0, pi] },
    { text: R`the ring \(${a * a} \le x^{2} + y^{2} \le ${b * b}\)`, r: [a, b], t: [0, `2${pi}`], deg: [0, 360], badT: [0, pi] },
    { text: R`the half-ring \(${a * a} \le x^{2} + y^{2} \le ${b * b}\), \(y \ge 0\)`, r: [a, b], t: [0, pi], deg: [0, 180], badT: [0, `2${pi}`] },
  ];
  const g = rng.pick(regions);
  const body = 'f(r\\cos\\theta, r\\sin\\theta)';
  const set = (t, r, extra) => M(iint(t[0], t[1], r[0], r[1], `${body}${extra}`, 'dr', 'd\\theta'));
  const outer = g.r[1];
  return q({
    prompt: R`Which integral in polar coordinates equals \(\displaystyle\iint_{D} f(x, y)\,dA\), where \(D\) is ${g.text}?`,
    visual: sectorPicture(g.r[0], g.r[1], g.deg[0], g.deg[1], `The region D: the part of the plane with r between ${g.r[0]} and ${g.r[1]} and θ between ${g.deg[0]} and ${g.deg[1]} degrees.`),
    correct: set(g.t, g.r, '\\,r'),
    wrong: [
      { value: set(g.t, g.r, ''), why: R`In polar coordinates \(dA = r\,dr\,d\theta\). The extra factor \(r\) is needed.` },
      { value: set(g.badT, g.r, '\\,r'), why: R`Check the range of \(\theta\): it must sweep exactly the part of the plane that \(D\) covers.` },
      { value: set(g.t, g.r[0] === 0 ? [0, outer * outer] : [0, outer], '\\,r'), why: g.r[0] === 0 ? R`\(x^{2} + y^{2} = ${outer * outer}\) means \(r = ${outer}\), not \(r = ${outer * outer}\).` : R`The ring starts at its inner radius, \(r = ${g.r[0]}\), not at the origin.` },
      set(g.t, g.r, '\\,r^{2}'),
    ],
    solution: [
      R`In polar coordinates \(x = r\cos\theta\), \(y = r\sin\theta\) and \(dA = r\,dr\,d\theta\).`,
      R`For this region \(r\) runs from \(${g.r[0]}\) to \(${g.r[1]}\) and \(\theta\) from \(${g.t[0]}\) to \(${g.t[1]}\).`,
      R`\(${iint(g.t[0], g.t[1], g.r[0], g.r[1], `${body}\\,r`, 'dr', 'd\\theta')}\).`,
    ],
    rule: 4,
    skill: 'setting up polar integrals',
    check: () => {
      // area of the described region: polar set-up with the factor r against a direct count in rectangular coordinates
      const polar = ((g.deg[1] - g.deg[0]) * Math.PI) / 180 * ((g.r[1] ** 2 - g.r[0] ** 2) / 2);
      const inside = (x, y) => {
        const r2 = x * x + y * y;
        const t = (Math.atan2(y, x) * 180) / Math.PI;
        return r2 <= g.r[1] ** 2 && r2 >= g.r[0] ** 2 && (g.deg[1] - g.deg[0] === 360 || (t >= g.deg[0] && t <= g.deg[1]));
      };
      return checkEqual(polar, regionSum(() => 1, inside, -outer, outer, -outer, outer, 400), 1e-2, 'area of the region');
    },
  });
}

// ───────────── Medium ─────────────

function mediumRectSum(rng) {
  const f = mpClean(rng.pick([[[1, 0], [0, 1]], [[2, 1], [0, 0]], [[1, 1], [0, 2]], [[2, 0], [0, 1]], [[1, 2], [1, 0]], [[1, 1], [0, 0]]]).map(([i, j]) => [rng.nonzero(-6, 6), i, j]));
  const [x0, y0] = [rng.int(-1, 1), rng.int(-1, 1)];
  const [x1, y1] = [x0 + rng.int(1, 3), y0 + rng.int(1, 3)];
  const ans = exactDouble(f, x0, x1, fp(y0), fp(y1));
  const inner = innerPoly(f, fp(y0), fp(y1));
  const fromZero = exactDouble(f, 0, x1, fp(0), fp(y1));
  return q({
    prompt: R`Evaluate \(\displaystyle\iint_{R} \left(${mpTex(f)}\right) dA\), where \(R = [${x0}, ${x1}] \times [${y0}, ${y1}]\).`,
    correct: ans,
    wrong: [
      fromZero.eq(ans) ? null : { value: fromZero, why: R`The rectangle starts at \(x = ${x0}\) and \(y = ${y0}\). Subtract the value of each antiderivative at its lower limit.` },
      { value: ans.neg(), why: 'Subtract in the order upper limit minus lower limit.' },
      frac(Math.round(mpEval(f, x1, y1) * (x1 - x0) * (y1 - y0))),
      ans.add(x1 - x0),
      ans.mul(2),
    ],
    solution: [
      R`Write it as an iterated integral: \(${iint(x0, x1, y0, y1, `\\left(${mpTex(f)}\\right)`)}\).`,
      R`Inner integral (with \(x\) constant): \(${fpTex(inner)}\).`,
      R`Outer integral: \(\displaystyle\int_{${x0}}^{${x1}} \left(${fpTex(inner)}\right) dx = ${ans.tex()}\).`,
    ],
    rule: 0,
    skill: 'integrals over rectangles',
    check: () => checkEqual(ans.value, integrate2((x, y) => mpEval(f, x, y), x0, x1, y0, y1, 60), 1e-6, 'double integral'),
  });
}

function mediumTypeI(rng) {
  const [i, j] = rng.pick([[0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [0, 2], [2, 1]]);
  const c = rng.int(1, 6) * rng.pick([1, 2]);
  const f = [[c, i, j]];
  const a = rng.int(1, 3);
  const k = rng.int(1, 3);
  const region = rng.pick([
    { a, lo: fp(0), hi: fp(0, k), loTex: '0', hiTex: terms([[k, 'x']]), flat: fp(k * a), noLo: null },
    { a: 1, lo: fp(0, 0, 1), hi: fp(0, 1), loTex: 'x^{2}', hiTex: 'x', flat: fp(1), noLo: fp(0) },
    { a, lo: fp(0, 1), hi: fp(a), loTex: 'x', hiTex: String(a), flat: null, noLo: fp(0) },
  ]);
  const ans = exactDouble(f, 0, region.a, region.lo, region.hi);
  const inner = innerPoly(f, region.lo, region.hi);
  const flat = region.flat ? exactDouble(f, 0, region.a, region.lo.length > 1 ? fp(0) : region.lo, region.flat) : null;
  const noLo = region.noLo ? exactDouble(f, 0, region.a, region.noLo, region.hi) : null;
  return q({
    prompt: R`Evaluate \(${iint(0, region.a, region.loTex, region.hiTex, mpTex(f))}\).`,
    correct: ans,
    wrong: [
      flat && !flat.eq(ans) ? { value: flat, why: R`The inner limit depends on \(x\). Substitute \(y = ${region.hiTex}\), which leaves a function of \(x\) to integrate, not a number.` } : null,
      noLo && !noLo.eq(ans) ? { value: noLo, why: R`Subtract the value at the lower limit \(y = ${region.loTex}\) as well.` } : null,
      ans.neg(),
      ans.mul(2),
      ans.div(2),
      ans.add(1),
    ],
    solution: [
      R`Inner integral, with \(x\) constant: \(\displaystyle\int_{${region.loTex}}^{${region.hiTex}} ${mpTex(f)}\,dy = ${fpTex(inner)}\).`,
      R`Outer integral: \(\displaystyle\int_{0}^{${region.a}} \left(${fpTex(inner)}\right) dx = ${ans.tex()}\).`,
    ],
    rule: 1,
    skill: 'integrals over general regions',
    check: () => checkEqual(ans.value, integrate2((x, y) => mpEval(f, x, y), 0, region.a, (x) => fpVal(region.lo, x), (x) => fpVal(region.hi, x), 100), 1e-6, 'double integral'),
  });
}

function mediumAverage(rng) {
  const [L, W] = [2 * rng.int(1, 5), 2 * rng.int(1, 5)];
  const c = 5 * rng.int(2, 8);
  const [a, b] = [rng.int(1, 4), rng.int(1, 4)];
  const linear = rng.bool();
  const T = linear ? (x, y) => a * x + b * y + c : (x, y) => a * x * y + c;
  const tex = linear ? terms([[a, 'x'], [b, 'y'], [c, '']]) : terms([[a, 'xy'], [c, '']]);
  const total = linear ? (a * L * L * W) / 2 + (b * L * W * W) / 2 + c * L * W : (a * L * L * W * W) / 4 + c * L * W;
  const ans = total / (L * W);
  return q({
    prompt: R`The temperature at the point \((x, y)\) of a rectangular plate, \(0 \le x \le ${L}\), \(0 \le y \le ${W}\) (in cm), is \(T(x, y) = ${tex}\) °C. Find the average temperature of the plate.`,
    correct: ans,
    unit: '°C',
    wrong: [
      { value: total, why: R`That is \(\iint T\,dA\). Divide by the area of the plate, \(${L * W}\) cm².` },
      { value: T(L, W), why: 'That is the temperature at one corner, the hottest point. The average is lower.' },
      (T(L, W) + T(0, 0)) / 2 === ans ? null : (T(L, W) + T(0, 0)) / 2,
      c,
      ans + a,
      ans - b,
    ],
    solution: [
      R`Average value \(= \dfrac{1}{\text{area}}\displaystyle\iint_{R} T\,dA\), and the area is \(${L} \cdot ${W} = ${L * W}\).`,
      R`\(${iint(0, L, 0, W, `\\left(${tex}\\right)`)} = ${num(total)}\).`,
      R`Average \(= \dfrac{${num(total)}}{${L * W}} = ${num(ans)}\) °C.`,
    ],
    rule: 3,
    skill: 'average value',
    check: () => checkEqual(ans, integrate2(T, 0, L, 0, W, 60) / (L * W), 1e-6, 'average'),
  });
}

// ───────────── Hard ─────────────

// Each family: the given integral, the reversed one, wrong reversals, the region two ways, and a picture.
function reversals(a, k) {
  const f = 'f(x, y)';
  const sq = a * a;
  const pic = (lo, hi, to, alt) => ({ type: 'plot', x: [-0.5, to + 0.5], y: [-0.5, Math.max(hi(to), hi(0), lo(to)) + 0.5], shade: [{ f: hi, g: lo, from: 0, to }], fns: [{ f: hi, domain: [0, to] }, { f: lo, domain: [0, to], color: 'b' }], alt });
  return [
    { given: iint(0, a, 'x', a, f), right: iint(0, a, 0, 'y', f, 'dx', 'dy'), wrong: [[iint('x', a, 0, a, f, 'dx', 'dy'), 'The outer limits must be constants. Sketch the region and describe it again.'], [iint(0, a, 'y', a, f, 'dx', 'dy'), R`For a fixed \(y\), the region runs from the \(y\)-axis (\(x = 0\)) across to the line \(x = y\).`], [iint(0, a, 0, a, f, 'dx', 'dy')], [iint(0, 'y', 0, a, f, 'dx', 'dy')]], A: (x, y) => x >= 0 && x <= a && y >= x && y <= a, B: (x, y) => y >= 0 && y <= a && x >= 0 && x <= y, box: a, pic: pic((x) => x, () => a, a, `The triangle between the line y = x and the horizontal line y = ${a}, for x from 0 to ${a}.`), say: R`The region is the triangle above the line \(y = x\) and below \(y = ${a}\). For a fixed \(y\) between \(0\) and \(${a}\), \(x\) runs from \(0\) to \(y\).` },
    { given: iint(0, a, 0, 'x', f), right: iint(0, a, 'y', a, f, 'dx', 'dy'), wrong: [[iint(0, 'x', 0, a, f, 'dx', 'dy'), 'The outer limits must be constants. Sketch the region and describe it again.'], [iint(0, a, 0, 'y', f, 'dx', 'dy'), R`For a fixed \(y\), the region runs from the line \(x = y\) across to \(x = ${a}\).`], [iint(0, a, 0, a, f, 'dx', 'dy')], [iint('y', a, 0, a, f, 'dx', 'dy')]], A: (x, y) => x >= 0 && x <= a && y >= 0 && y <= x, B: (x, y) => y >= 0 && y <= a && x >= y && x <= a, box: a, pic: pic(() => 0, (x) => x, a, `The triangle between the x-axis and the line y = x, for x from 0 to ${a}.`), say: R`The region is the triangle below the line \(y = x\) and above the \(x\)-axis. For a fixed \(y\) between \(0\) and \(${a}\), \(x\) runs from \(y\) to \(${a}\).` },
    { given: iint(0, a, 'x^{2}', sq, f), right: iint(0, sq, 0, '\\sqrt{y}', f, 'dx', 'dy'), wrong: [[iint(0, sq, '\\sqrt{y}', a, f, 'dx', 'dy'), R`For a fixed \(y\), the region runs from the \(y\)-axis across to the parabola, where \(x = \sqrt{y}\).`], [iint(0, a, 0, '\\sqrt{y}', f, 'dx', 'dy'), R`\(y\) runs from \(0\) up to \(${sq}\), the height of the parabola at \(x = ${a}\).`], [iint(0, sq, 0, 'y^{2}', f, 'dx', 'dy')], [iint('x^{2}', sq, 0, a, f, 'dx', 'dy')]], A: (x, y) => x >= 0 && x <= a && y >= x * x && y <= sq, B: (x, y) => y >= 0 && y <= sq && x >= 0 && x <= Math.sqrt(y), box: Math.max(a, sq), pic: pic((x) => x * x, () => sq, a, `The region between the parabola y = x² and the horizontal line y = ${sq}, for x from 0 to ${a}.`), say: R`The region lies above the parabola \(y = x^{2}\) and below \(y = ${sq}\). Solving \(y = x^{2}\) for \(x\) gives \(x = \sqrt{y}\), so for a fixed \(y\), \(x\) runs from \(0\) to \(\sqrt{y}\).` },
    { given: iint(0, a, 0, terms([[k, 'x']]), f), right: iint(0, k * a, `\\frac{y}{${k}}`, a, f, 'dx', 'dy'), wrong: [[iint(0, k * a, 0, `\\frac{y}{${k}}`, f, 'dx', 'dy'), R`For a fixed \(y\), the region runs from the line (where \(x = \frac{y}{${k}}\)) across to \(x = ${a}\).`], [iint(0, a, `\\frac{y}{${k}}`, a, f, 'dx', 'dy'), R`\(y\) runs from \(0\) up to \(${k * a}\), the height of the line at \(x = ${a}\).`], [iint(0, k * a, terms([[k, 'y']]), a, f, 'dx', 'dy')], [iint(0, terms([[k, 'x']]), 0, a, f, 'dx', 'dy')]], A: (x, y) => x >= 0 && x <= a && y >= 0 && y <= k * x, B: (x, y) => y >= 0 && y <= k * a && x >= y / k && x <= a, box: k * a, pic: pic(() => 0, (x) => k * x, a, `The triangle between the x-axis and the line y = ${k}x, for x from 0 to ${a}.`), say: R`The region is the triangle under the line \(y = ${terms([[k, 'x']])}\). Solving for \(x\) gives \(x = \frac{y}{${k}}\), so for a fixed \(y\) between \(0\) and \(${k * a}\), \(x\) runs from \(\frac{y}{${k}}\) to \(${a}\).` },
    { given: iint(0, a, 0, 'x^{2}', f), right: iint(0, sq, '\\sqrt{y}', a, f, 'dx', 'dy'), wrong: [[iint(0, sq, 0, '\\sqrt{y}', f, 'dx', 'dy'), R`For a fixed \(y\), the region runs from the parabola (\(x = \sqrt{y}\)) across to \(x = ${a}\).`], [iint(0, a, '\\sqrt{y}', a, f, 'dx', 'dy'), R`\(y\) runs from \(0\) up to \(${sq}\), the height of the parabola at \(x = ${a}\).`], [iint(0, sq, 'y^{2}', a, f, 'dx', 'dy')], [iint(0, 'x^{2}', 0, a, f, 'dx', 'dy')]], A: (x, y) => x >= 0 && x <= a && y >= 0 && y <= x * x, B: (x, y) => y >= 0 && y <= sq && x >= Math.sqrt(y) && x <= a, box: Math.max(a, sq), pic: pic(() => 0, (x) => x * x, a, `The region between the x-axis and the parabola y = x², for x from 0 to ${a}.`), say: R`The region lies under the parabola \(y = x^{2}\). Solving for \(x\) gives \(x = \sqrt{y}\), so for a fixed \(y\) between \(0\) and \(${sq}\), \(x\) runs from \(\sqrt{y}\) to \(${a}\).` },
  ];
}

function hardReverseSetup(rng) {
  const [a, k] = [rng.int(1, 4), rng.int(2, 4)];
  const g = rng.pick(reversals(a, k));
  return q({
    prompt: R`Reverse the order of integration: \(${g.given}\) equals which integral?`,
    visual: g.pic,
    correct: M(g.right),
    wrong: g.wrong.map(([tex, why]) => (why ? { value: M(tex), why } : M(tex))),
    solution: ['Sketch the region described by the limits, then describe the same region with horizontal strips.', g.say, R`\(${g.right}\).`],
    rule: 2,
    skill: 'reversing the order',
    check: () => {
      for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
        const [x, y] = [((g.box + 1) * (i + 0.37)) / 40 - 0.5, ((g.box + 1) * (j + 0.61)) / 40 - 0.5];
        if (g.A(x, y) !== g.B(x, y)) return `the two descriptions disagree at (${x}, ${y})`;
      }
      return true;
    },
  });
}

function hardVolume(rng) {
  const kind = rng.int(0, 2);
  if (kind === 0) {
    const [a, b, c] = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)];
    const [pa, pb, pc, pd] = primitive([b * c, a * c, a * b, a * b * c]);
    const ans = frac(a * b * c, 6);
    return q({
      prompt: R`Find the volume of the solid in the first octant bounded by the coordinate planes and the plane \(${terms([[pa, 'x'], [pb, 'y'], [pc, 'z']])} = ${pd}\).`,
      correct: ans,
      wrong: [
        { value: frac(a * b * c, 2), why: R`That is the area of the triangular base times the full height. The top of the solid slopes down, so integrate the height over the base.` },
        { value: frac(a * b * c, 3), why: R`Integrate the height \(z\) over the whole triangle in the \(xy\)-plane, with the inner limit depending on \(x\).` },
        a * b * c,
        frac(a * b * c, 4),
        frac(a * b, 2),
      ],
      solution: [
        R`The plane meets the axes at \(x = ${a}\), \(y = ${b}\) and \(z = ${c}\). Solve for the height: \(z = ${terms([[c, ''], [frac(-c, a), 'x'], [frac(-c, b), 'y']])}\).`,
        R`The base is the triangle \(0 \le x \le ${a}\), \(0 \le y \le ${terms([[b, ''], [frac(-b, a), 'x']])}\).`,
        R`\(V = ${iint(0, a, 0, terms([[b, ''], [frac(-b, a), 'x']]), `\\left(${terms([[c, ''], [frac(-c, a), 'x'], [frac(-c, b), 'y']])}\\right)`)} = ${ans.tex()}\) (one sixth of \(${a} \cdot ${b} \cdot ${c}\)).`,
      ],
      rule: 3,
      skill: 'volume',
      check: () => checkEqual(ans.value, integrate2((x, y) => c * (1 - x / a - y / b), 0, a, 0, (x) => b * (1 - x / a), 100), 1e-6, 'volume'),
    });
  }
  if (kind === 1) {
    const [p, s] = [rng.int(1, 4), rng.int(1, 4)];
    const ans = frac(p ** 3 * s + p * s ** 3, 3);
    return q({
      prompt: R`Find the volume of the solid that lies under the paraboloid \(z = x^{2} + y^{2}\) and above the rectangle \(0 \le x \le ${p}\), \(0 \le y \le ${s}\) in the \(xy\)-plane.`,
      correct: ans,
      wrong: [
        { value: (p * p + s * s) * p * s, why: 'That is the greatest height times the area of the base. The height varies, so integrate it.' },
        { value: frac(p ** 3 + s ** 3, 3), why: R`Each term keeps the other variable's length as a factor: \(\int_{0}^{${s}} x^{2}\,dy = ${terms([[s, 'x^{2}']])}\).` },
        frac(p ** 3 * s + p * s ** 3, 2),
        frac(p ** 3 * s + p * s ** 3, 6),
        frac(p * p * s * s, 4),
      ],
      solution: [
        R`\(V = ${iint(0, p, 0, s, '\\left(x^{2} + y^{2}\\right)')}\).`,
        R`Inner integral: \(${terms([[s, 'x^{2}'], [frac(s ** 3, 3), '']])}\).`,
        R`Outer integral: \(\dfrac{${s} \cdot ${p ** 3}}{3} + \dfrac{${s ** 3} \cdot ${p}}{3} = ${ans.tex()}\).`,
      ],
      rule: 3,
      skill: 'volume',
      check: () => checkEqual(ans.value, integrate2((x, y) => x * x + y * y, 0, p, 0, s, 60), 1e-6, 'volume'),
    });
  }
  const [L, W] = [2 * rng.int(2, 5), 2 * rng.int(2, 4)];
  const h = rng.int(5, 8);
  const [sNum, tNum] = [rng.int(1, 2), rng.int(0, 2)]; // the roof drops sNum/10 per meter in x and tNum/10 per meter in y
  const roof = (x, y) => round(h - (sNum * x) / 10 - (tNum * y) / 10, 4);
  const ans = round(L * W * roof(L / 2, W / 2), 4);
  return q({
    prompt: R`A shed stands on the rectangular floor \(0 \le x \le ${L}\), \(0 \le y \le ${W}\) (in meters). Its sloping roof is at height \(z = ${terms([[h, ''], [-sNum / 10, 'x'], [-tNum / 10, 'y']])}\) meters above the point \((x, y)\). Find the volume of the shed.`,
    correct: ans,
    unit: 'm³',
    wrong: [
      { value: L * W * h, why: 'That uses the greatest height everywhere. The roof slopes down, so integrate the height over the floor.' },
      { value: L * W * roof(L, W), why: 'That uses the lowest height everywhere. Integrate the height over the floor.' },
      roof(L / 2, W / 2),
      round(ans + L, 4),
      round(ans / 2, 4),
    ],
    solution: [
      R`Volume is the double integral of the height over the floor: \(V = ${iint(0, L, 0, W, `\\left(${terms([[h, ''], [-sNum / 10, 'x'], [-tNum / 10, 'y']])}\\right)`)}\).`,
      R`Inner integral: \(${terms([[h * W - (tNum * W * W) / 20, ''], [(-sNum * W) / 10, 'x']])}\).`,
      R`Outer integral: \(V = ${num(ans)}\) m³. (For a flat sloping roof this is the floor area, \(${L * W}\), times the height above the center, \(${num(roof(L / 2, W / 2))}\).)`,
    ],
    rule: 3,
    skill: 'volume',
    check: () => checkEqual(ans, integrate2(roof, 0, L, 0, W, 40), 1e-6, 'volume'),
  });
}

function hardPolar(rng) {
  const a = rng.int(1, 4);
  const b = a + rng.int(1, 3);
  const shape = rng.pick([
    { text: R`the disk \(x^{2} + y^{2} \le ${a * a}\)`, r: [0, a], deg: [0, 360], t: ['0', '2\\pi'] },
    { text: R`the half-disk \(x^{2} + y^{2} \le ${a * a}\), \(y \ge 0\)`, r: [0, a], deg: [0, 180], t: ['0', '\\pi'] },
    { text: R`the quarter-disk \(x^{2} + y^{2} \le ${a * a}\), \(x \ge 0\), \(y \ge 0\)`, r: [0, a], deg: [0, 90], t: ['0', '\\frac{\\pi}{2}'] },
    { text: R`the ring \(${a * a} \le x^{2} + y^{2} \le ${b * b}\)`, r: [a, b], deg: [0, 360], t: ['0', '2\\pi'] },
  ]);
  const [r1, r2] = shape.r;
  const span = frac(shape.deg[1] - shape.deg[0], 180); // angle swept, as a multiple of π
  const withY = shape.deg[1] <= 180 && shape.deg[1] - shape.deg[0] < 360 && rng.bool(0.35);
  const n = rng.pick([0, 1, 2]); // integrand rⁿ: 1, √(x²+y²) or x²+y²
  const fTex = withY ? 'y' : ['1', '\\sqrt{x^{2} + y^{2}}', 'x^{2} + y^{2}'][n];
  const rPow = (e) => frac(r2 ** e - r1 ** e, e);
  // ∫ sin θ dθ over [0, π] is 2 and over [0, π/2] is 1
  const ans = withY ? rPow(3).mul(shape.deg[1] === 180 ? 2 : 1) : null;
  const coef = withY ? null : span.mul(rPow(n + 2));
  const show = (c) => (withY ? M(c.tex()) : M(piTex(c)));
  const right = withY ? ans : coef;
  const noR = withY ? rPow(2).mul(shape.deg[1] === 180 ? 2 : 1) : span.mul(rPow(n + 1));
  const f = withY ? (x, y) => y : (x, y) => (x * x + y * y) ** (n / 2);
  const polarBody = withY ? 'r\\sin\\theta \\cdot r' : `${['', 'r \\cdot ', 'r^{2} \\cdot '][n]}r`;
  return q({
    prompt: R`Use polar coordinates to evaluate \(\displaystyle\iint_{D} ${fTex === '1' ? '' : withY || n === 1 ? fTex : `\\left(${fTex}\\right)`}\,dA\), where \(D\) is ${shape.text}.`,
    visual: sectorPicture(r1, r2, shape.deg[0], shape.deg[1], `The region D: r between ${r1} and ${r2}, θ between ${shape.deg[0]} and ${shape.deg[1]} degrees.`),
    correct: show(right),
    wrong: [
      { value: show(noR), why: R`\(dA = r\,dr\,d\theta\). Without the extra \(r\) the integral is too small or too large.` },
      shape.deg[1] - shape.deg[0] === 360 ? show(right.mul(2)) : { value: show(right.mul(2)), why: R`Check the limits for \(\theta\): they must cover exactly the region \(D\).` },
      show(right.div(2)),
      show(right.mul(3)),
      withY ? M(piTex(right)) : M(coef.tex()),
    ],
    solution: [
      withY ? R`In polar coordinates \(y = r\sin\theta\) and \(dA = r\,dr\,d\theta\).` : R`In polar coordinates \(x^{2} + y^{2} = r^{2}\) and \(dA = r\,dr\,d\theta\).`,
      R`\(${iint(shape.t[0], shape.t[1], r1, r2, polarBody, 'dr', 'd\\theta')}\).`,
      withY
        ? R`\(\displaystyle\int_{${r1}}^{${r2}} r^{2}\,dr = ${rPow(3).tex()}\) and \(\displaystyle\int_{${shape.t[0]}}^{${shape.t[1]}} \sin\theta\,d\theta = ${shape.deg[1] === 180 ? 2 : 1}\), so the integral is \(${ans.tex()}\).`
        : R`\(\displaystyle\int_{${r1}}^{${r2}} ${power('r', n + 1)}\,dr = ${rPow(n + 2).tex()}\), and the angle sweeps through \(${piTex(span)}\), so the integral is \(${piTex(coef)}\).`,
    ],
    rule: 4,
    skill: 'polar double integrals',
    check: () => {
      const inside = (x, y) => {
        const rr = x * x + y * y;
        const t = (Math.atan2(y, x) * 180) / Math.PI;
        return rr <= r2 * r2 && rr >= r1 * r1 && (shape.deg[1] === 360 || (t >= shape.deg[0] && t <= shape.deg[1]));
      };
      return checkEqual(withY ? ans.value : coef.value * Math.PI, regionSum(f, inside, -r2, r2, -r2, r2), 6e-3, 'integral over the region');
    },
  });
}

// ───────────── Challenge ─────────────

function challengeReverseEvaluate(rng) {
  const a = rng.int(1, 3);
  const c = rng.int(2, 6);
  const b = Math.min(a, 2); // keeps e^{b³} to a reasonable size
  const ee = (p) => (p === 1 ? 'e' : `e^{${p}}`);
  const k = rng.pick([
    { given: iint(0, a, 'x', a, 'e^{y^{2}}'), f: (x, y) => Math.exp(y * y), lo: (x) => x, hi: () => a, to: a, right: `\\frac{${ee(a * a)} - 1}{2}`, val: (Math.exp(a * a) - 1) / 2, wrong: [[`${ee(a * a)} - 1`, R`\(\int ye^{y^{2}}\,dy = \frac{1}{2}e^{y^{2}}\). Keep the \(\frac{1}{2}\).`], [`\\frac{${ee(a * a)}}{2}`, R`Evaluate at both limits: at \(y = 0\), \(\frac{1}{2}e^{0} = \frac{1}{2}\).`], [`\\frac{${ee(a * a)} + 1}{2}`], [`${2 * a}(${ee(a * a)} - 1)`]], steps: [R`\(e^{y^{2}}\) has no elementary antiderivative in \(y\), so reverse the order. The region is \(0 \le x \le y \le ${a}\).`, R`\(${iint(0, a, 0, 'y', 'e^{y^{2}}', 'dx', 'dy')} = \displaystyle\int_{0}^{${a}} ye^{y^{2}}\,dy\).`, R`\(= \left[\tfrac{1}{2}e^{y^{2}}\right]_{0}^{${a}} = \dfrac{${ee(a * a)} - 1}{2}\).`] },
    { given: iint(0, a, 'x', a, '\\sin(y^{2})'), f: (x, y) => Math.sin(y * y), lo: (x) => x, hi: () => a, to: a, right: `\\frac{1 - \\cos ${a * a}}{2}`, val: (1 - Math.cos(a * a)) / 2, wrong: [[`\\frac{\\cos ${a * a} - 1}{2}`, R`\(\int y\sin(y^{2})\,dy = -\frac{1}{2}\cos(y^{2})\). Watch the sign when you evaluate.`], [`1 - \\cos ${a * a}`, R`The substitution \(u = y^{2}\) brings a factor \(\frac{1}{2}\).`], [`\\frac{1 - \\sin ${a * a}}{2}`], [`\\frac{\\sin ${a * a}}{2}`]], steps: [R`\(\sin(y^{2})\) has no elementary antiderivative in \(y\), so reverse the order. The region is \(0 \le x \le y \le ${a}\).`, R`\(${iint(0, a, 0, 'y', '\\sin(y^{2})', 'dx', 'dy')} = \displaystyle\int_{0}^{${a}} y\sin(y^{2})\,dy\).`, R`\(= \left[-\tfrac{1}{2}\cos(y^{2})\right]_{0}^{${a}} = \dfrac{1 - \cos ${a * a}}{2}\).`] },
    { given: iint(0, b * b, '\\sqrt{x}', b, 'e^{y^{3}}'), f: (x, y) => Math.exp(y ** 3), lo: (x) => Math.sqrt(x), hi: () => b, to: b * b, right: `\\frac{${ee(b ** 3)} - 1}{3}`, val: (Math.exp(b ** 3) - 1) / 3, wrong: [[`${ee(b ** 3)} - 1`, R`\(\int y^{2}e^{y^{3}}\,dy = \frac{1}{3}e^{y^{3}}\). Keep the \(\frac{1}{3}\).`], [`\\frac{${ee(b ** 3)}}{3}`, R`Evaluate at both limits: at \(y = 0\), \(\frac{1}{3}e^{0} = \frac{1}{3}\).`], [`\\frac{${ee(b ** 3)} - 1}{2}`], [`\\frac{${ee(b ** 3)} + 1}{3}`]], steps: [R`Reverse the order. The region is \(0 \le y \le ${b}\), \(0 \le x \le y^{2}\) (since \(y \ge \sqrt{x}\) means \(x \le y^{2}\)).`, R`\(${iint(0, b, 0, 'y^{2}', 'e^{y^{3}}', 'dx', 'dy')} = \displaystyle\int_{0}^{${b}} y^{2}e^{y^{3}}\,dy\).`, R`\(= \left[\tfrac{1}{3}e^{y^{3}}\right]_{0}^{${b}} = \dfrac{${ee(b ** 3)} - 1}{3}\).`] },
    { given: iint(0, a, 'x', a, `\\dfrac{${2 * c}}{1 + y^{2}}`), f: (x, y) => (2 * c) / (1 + y * y), lo: (x) => x, hi: () => a, to: a, right: `${c}\\ln ${1 + a * a}`, val: c * Math.log(1 + a * a), wrong: [[`${2 * c}\\ln ${1 + a * a}`, R`\(\int \dfrac{y}{1 + y^{2}}\,dy = \frac{1}{2}\ln(1 + y^{2})\). Keep the \(\frac{1}{2}\).`], [`${c}\\ln ${a * a}`, R`The antiderivative is \(\ln(1 + y^{2})\): at \(y = ${a}\) it is \(\ln ${1 + a * a}\).`], [`${2 * c}\\arctan ${a}`, R`That integrates \(\dfrac{1}{1 + y^{2}}\) alone. After reversing the order there is an extra factor \(y\).`], [`\\frac{${c}}{${1 + a * a}}`]], steps: [R`Reverse the order. The region is \(0 \le x \le y \le ${a}\).`, R`\(${iint(0, a, 0, 'y', `\\dfrac{${2 * c}}{1 + y^{2}}`, 'dx', 'dy')} = \displaystyle\int_{0}^{${a}} \dfrac{${2 * c}y}{1 + y^{2}}\,dy\).`, R`\(= \left[${c}\ln(1 + y^{2})\right]_{0}^{${a}} = ${c}\ln ${1 + a * a}\).`] },
  ]);
  return q({
    prompt: R`Evaluate \(${k.given}\) by first reversing the order of integration.`,
    correct: M(k.right),
    wrong: k.wrong.map(([tex, why]) => (why ? { value: M(tex), why } : M(tex))),
    solution: k.steps,
    rule: 2,
    skill: 'reversing the order',
    check: () => checkEqual(k.val, integrate2(k.f, 0, k.to, k.lo, k.hi, 400), 2e-4, 'iterated integral in the original order'),
  });
}

function challengePolarConvert(rng) {
  const a = rng.int(1, 6);
  const root = `\\sqrt{${a * a} - x^{2}}`;
  const k = rng.pick([
    { given: iint(-a, a, 0, root, '\\left(x^{2} + y^{2}\\right)'), f: (x, y) => x * x + y * y, x0: -a, lo: () => 0, coef: frac(a ** 4, 4), polar: iint(0, '\\pi', 0, a, 'r^{2} \\cdot r', 'dr', 'd\\theta'), region: R`the upper half of the disk of radius \(${a}\)`, noR: frac(a ** 3, 3), twice: true, sweep: frac(1) },
    { given: iint(0, a, 0, root, '\\sqrt{x^{2} + y^{2}}'), f: (x, y) => Math.sqrt(x * x + y * y), x0: 0, lo: () => 0, coef: frac(a ** 3, 6), polar: iint(0, '\\frac{\\pi}{2}', 0, a, 'r \\cdot r', 'dr', 'd\\theta'), region: R`the quarter of the disk of radius \(${a}\) in the first quadrant`, noR: frac(a * a, 4), twice: true, sweep: frac(1, 2) },
    { given: iint(-a, a, `-${root}`, root, '\\left(x^{2} + y^{2}\\right)'), f: (x, y) => x * x + y * y, x0: -a, lo: (x) => -Math.sqrt(a * a - x * x), coef: frac(a ** 4, 2), polar: iint(0, '2\\pi', 0, a, 'r^{2} \\cdot r', 'dr', 'd\\theta'), region: R`the whole disk of radius \(${a}\)`, noR: frac(2 * a ** 3, 3), twice: false, sweep: frac(2) },
    { given: iint(0, a, 0, root, '\\left(x^{2} + y^{2}\\right)'), f: (x, y) => x * x + y * y, x0: 0, lo: () => 0, coef: frac(a ** 4, 8), polar: iint(0, '\\frac{\\pi}{2}', 0, a, 'r^{2} \\cdot r', 'dr', 'd\\theta'), region: R`the quarter of the disk of radius \(${a}\) in the first quadrant`, noR: frac(a ** 3, 6), twice: true, sweep: frac(1, 2) },
  ]);
  return q({
    prompt: R`Evaluate \(${k.given}\) by changing to polar coordinates.`,
    correct: M(piTex(k.coef)),
    wrong: [
      { value: M(piTex(k.noR)), why: R`\(dA = r\,dr\,d\theta\): the integrand must be multiplied by an extra \(r\).` },
      { value: M(piTex(k.twice ? k.coef.mul(2) : k.coef.div(2))), why: R`The limits describe ${k.region}. Choose the range of \(\theta\) to match.` },
      M(piTex(k.coef.mul(4))),
      M(k.coef.tex()),
      M(piTex(k.coef.div(k.twice ? 2 : 4))),
    ],
    solution: [
      R`The limits describe ${k.region}: \(y\) goes up to the circle \(x^{2} + y^{2} = ${a * a}\).`,
      R`In polar coordinates the integral is \(${k.polar}\).`,
      R`The \(r\)-integral is \(${k.coef.div(k.sweep).tex()}\) and the angle sweeps through \(${piTex(k.sweep)}\), so the value is \(${piTex(k.coef)}\).`,
    ],
    rule: 4,
    skill: 'polar double integrals',
    check: () => checkEqual(k.coef.value * Math.PI, integrate2(k.f, k.x0, a, k.lo, (x) => Math.sqrt(Math.max(0, a * a - x * x)), 600), 2e-3, 'iterated integral in rectangular coordinates'),
  });
}

function challengeParaboloidCap(rng) {
  const a = rng.int(1, 4);
  const Rr = rng.int(1, 5);
  const top = a * Rr * Rr;
  const below = rng.bool();
  const ans = frac(a * Rr ** 4, 2);
  const surf = terms([[a, 'x^{2}'], [a, 'y^{2}']]);
  return q({
    prompt: below
      ? R`Find the volume of the solid bounded below by the paraboloid \(z = ${surf}\) and above by the plane \(z = ${top}\).`
      : R`Find the volume of the solid bounded above by the paraboloid \(z = ${terms([[top, ''], [-a, 'x^{2}'], [-a, 'y^{2}']])}\) and below by the \(xy\)-plane.`,
    correct: M(piTex(ans)),
    wrong: [
      { value: M(piTex(frac(a * Rr ** 4))), why: R`That is the volume of the whole cylinder of radius \(${Rr}\) and height \(${top}\). The solid fills only part of it: integrate the height between the two surfaces.` },
      { value: M(piTex(frac(4 * a * Rr ** 3, 3))), why: R`\(dA = r\,dr\,d\theta\): include the extra factor \(r\).` },
      M(piTex(frac(a * Rr ** 4, 4))),
      M(piTex(frac(a * Rr ** 4, 3))),
      M(ans.tex()),
    ],
    solution: [
      R`The surfaces meet where \(${terms([[a, 'r^{2}']])} = ${top}\) (${below ? 'paraboloid meets plane' : R`paraboloid meets \(z = 0\)`}), that is on the circle \(r = ${Rr}\). The solid stands on the disk \(r \le ${Rr}\).`,
      R`Height of the solid above the point \((r, \theta)\): \(${terms([[top, ''], [-a, 'r^{2}']])}\).`,
      R`\(V = ${iint(0, '2\\pi', 0, Rr, `\\left(${terms([[top, ''], [-a, 'r^{2}']])}\\right) r`, 'dr', 'd\\theta')} = 2\pi\left[${terms([[frac(top, 2), 'r^{2}'], [frac(-a, 4), 'r^{4}']])}\right]_{0}^{${Rr}} = ${piTex(ans)}\).`,
    ],
    rule: 4,
    skill: 'volume in polar coordinates',
    check: () => checkEqual(ans.value * Math.PI, regionSum((x, y) => top - a * (x * x + y * y), (x, y) => x * x + y * y <= Rr * Rr, -Rr, Rr, -Rr, Rr), 6e-3, 'volume'),
  });
}

export default {
  id: 'double-integrals',
  title: 'Double Integrals',
  summary: 'Evaluate double integrals over rectangles and other regions, reverse the order, and use polar coordinates for volumes and averages.',
  standards: ['OpenStax Calculus Vol. 3 §5.1', 'OpenStax Calculus Vol. 3 §5.2', 'OpenStax Calculus Vol. 3 §5.3'],

  explain: {
    intro: R`A single integral adds up the values of a function along an interval. A double integral \(\iint_{D} f(x, y)\,dA\) adds up the values of \(f\) over a region \(D\) of the plane. When \(f \ge 0\) it is the volume under the surface \(z = f(x, y)\). It is computed as an **iterated integral**: integrate with respect to one variable while the other is held constant, then integrate the result.`,
    rules: [
      { title: 'Rectangles and Fubini\'s theorem', text: R`Over the rectangle \(R = [a, b] \times [c, d]\), \(\displaystyle\iint_{R} f\,dA = \int_{a}^{b}\int_{c}^{d} f(x, y)\,dy\,dx = \int_{c}^{d}\int_{a}^{b} f(x, y)\,dx\,dy\). Work from the inside out. For a continuous function the order does not matter.`, example: R`\(\displaystyle\int_{0}^{2}\int_{1}^{3} 6xy^{2}\,dy\,dx = \int_{0}^{2} 52x\,dx = 104\).` },
      { title: 'General regions', text: R`If \(D\) is described by \(a \le x \le b\), \(g_{1}(x) \le y \le g_{2}(x)\) (type I), then \(\displaystyle\iint_{D} f\,dA = \int_{a}^{b}\int_{g_{1}(x)}^{g_{2}(x)} f\,dy\,dx\). If it is described by \(c \le y \le d\), \(h_{1}(y) \le x \le h_{2}(y)\) (type II), integrate with respect to \(x\) first. The outer limits are always constants; the inner limits may depend on the outer variable.`, example: R`Between \(y = x^{2}\) and \(y = x\): \(\displaystyle\int_{0}^{1}\int_{x^{2}}^{x} xy\,dy\,dx = \int_{0}^{1} \frac{x^{3} - x^{5}}{2}\,dx = \frac{1}{24}\).` },
      { title: 'Reversing the order of integration', text: R`To change \(dy\,dx\) into \(dx\,dy\), sketch the region that the limits describe and then describe it the other way. Reversing can turn an impossible integral into an easy one.`, example: R`\(\displaystyle\int_{0}^{1}\int_{x}^{1} e^{y^{2}}\,dy\,dx = \int_{0}^{1}\int_{0}^{y} e^{y^{2}}\,dx\,dy = \int_{0}^{1} ye^{y^{2}}\,dy = \frac{e - 1}{2}\).` },
      { title: 'Area, volume and average value', text: R`The area of \(D\) is \(\iint_{D} 1\,dA\). The volume between \(z = f(x, y) \ge 0\) and the region \(D\) is \(\iint_{D} f\,dA\). The average value of \(f\) on \(D\) is \(\dfrac{1}{\text{area of } D}\displaystyle\iint_{D} f\,dA\).`, example: R`On \([0, 2] \times [0, 2]\), the average value of \(f = xy\) is \(\frac{1}{4}\displaystyle\int_{0}^{2}\int_{0}^{2} xy\,dy\,dx = \frac{4}{4} = 1\).` },
      { title: 'Polar coordinates', text: R`For regions bounded by circles, substitute \(x = r\cos\theta\), \(y = r\sin\theta\), \(x^{2} + y^{2} = r^{2}\) and \(dA = r\,dr\,d\theta\). The extra factor \(r\) is there because a small polar piece is wider the farther it is from the origin.`, example: R`Over the disk of radius 2: \(\displaystyle\iint (x^{2} + y^{2})\,dA = \int_{0}^{2\pi}\int_{0}^{2} r^{2} \cdot r\,dr\,d\theta = 2\pi \cdot 4 = 8\pi\).` },
    ],
    vocab: [
      { term: 'iterated integral', def: 'An integral evaluated one variable at a time, from the inside out.' },
      { term: 'type I region', def: R`A region between two curves \(y = g_{1}(x)\) and \(y = g_{2}(x)\) for \(a \le x \le b\): use vertical strips, \(dy\,dx\).` },
      { term: 'type II region', def: R`A region between two curves \(x = h_{1}(y)\) and \(x = h_{2}(y)\) for \(c \le y \le d\): use horizontal strips, \(dx\,dy\).` },
      { term: 'average value', def: 'The integral of a function over a region divided by the area of the region.' },
    ],
    mistakes: [
      'Putting a variable in the outer limits. The final answer must be a number, so the outer limits are constants.',
      'Reversing the order by just swapping the two integral signs. The limits must be rebuilt from a sketch of the region.',
      R`Forgetting the factor \(r\) in \(dA = r\,dr\,d\theta\).`,
      R`Treating the other variable as 0 instead of as a constant during the inner integration: \(\int_{0}^{2} x\,dy = 2x\), not 0.`,
    ],
    visual: {
      type: 'plot',
      x: [-0.2, 1.3],
      y: [-0.2, 1.3],
      square: true,
      shade: [{ f: (x) => x, g: (x) => x * x, from: 0, to: 1 }],
      fns: [{ f: (x) => x, label: 'y = x', labelAt: 0.3 }, { f: (x) => x * x, color: 'b', label: 'y = x²', labelAt: 1.05 }],
      segments: [{ from: [0.6, 0.36], to: [0.6, 0.6], color: 'd', label: 'strip' }],
      alt: 'The region between the parabola y = x² and the line y = x, for x from 0 to 1, shaded. A vertical strip at x = 0.6 runs from the parabola up to the line: for each x, y goes from x² to x.',
    },
  },

  examples: [
    {
      title: 'An iterated integral over a rectangle',
      problem: R`Evaluate \(\displaystyle\iint_{R} 6xy^{2}\,dA\), where \(R = [0, 2] \times [1, 3]\).`,
      steps: [
        R`Write it as \(\displaystyle\int_{0}^{2}\int_{1}^{3} 6xy^{2}\,dy\,dx\).`,
        R`Inner integral, with \(x\) constant: \(\left[2xy^{3}\right]_{y=1}^{y=3} = 54x - 2x = 52x\).`,
        R`Outer integral: \(\displaystyle\int_{0}^{2} 52x\,dx = \left[26x^{2}\right]_{0}^{2} = 104\).`,
      ],
      answer: R`\(104\)`,
    },
    {
      title: 'A region between two curves',
      problem: R`Evaluate \(\displaystyle\iint_{D} xy\,dA\), where \(D\) is the region between \(y = x^{2}\) and \(y = x\).`,
      steps: [
        R`The curves cross at \(x = 0\) and \(x = 1\), and the line is above the parabola in between. So \(0 \le x \le 1\), \(x^{2} \le y \le x\).`,
        R`Inner integral: \(\displaystyle\int_{x^{2}}^{x} xy\,dy = \left[\tfrac{1}{2}xy^{2}\right]_{y=x^{2}}^{y=x} = \tfrac{1}{2}\left(x^{3} - x^{5}\right)\).`,
        R`Outer integral: \(\displaystyle\int_{0}^{1} \tfrac{1}{2}\left(x^{3} - x^{5}\right) dx = \tfrac{1}{2}\left(\tfrac{1}{4} - \tfrac{1}{6}\right)\).`,
      ],
      answer: R`\(\dfrac{1}{24}\)`,
    },
    {
      title: 'Reversing the order',
      problem: R`Evaluate \(\displaystyle\int_{0}^{1}\int_{x}^{1} e^{y^{2}}\,dy\,dx\).`,
      steps: [
        R`\(e^{y^{2}}\) cannot be integrated with respect to \(y\) in elementary terms, so change the order.`,
        R`The limits describe the triangle \(0 \le x \le 1\), \(x \le y \le 1\). With horizontal strips: \(0 \le y \le 1\), \(0 \le x \le y\).`,
        R`\(\displaystyle\int_{0}^{1}\int_{0}^{y} e^{y^{2}}\,dx\,dy = \int_{0}^{1} ye^{y^{2}}\,dy = \left[\tfrac{1}{2}e^{y^{2}}\right]_{0}^{1}\).`,
      ],
      answer: R`\(\dfrac{e - 1}{2}\)`,
    },
    {
      title: 'Word problem: a pile of gravel',
      word: true,
      problem: R`A pile of gravel covers the disk \(x^{2} + y^{2} \le 9\) (in meters), and its height above the point \((x, y)\) is \(h = 9 - x^{2} - y^{2}\) meters. How much gravel is in the pile?`,
      steps: [
        'The volume is the height added up over the base, and the base is a disk, so use polar coordinates.',
        R`\(h = 9 - r^{2}\) and \(dA = r\,dr\,d\theta\): \(V = \displaystyle\int_{0}^{2\pi}\int_{0}^{3} (9 - r^{2})\,r\,dr\,d\theta\).`,
        R`Inner integral: \(\left[\tfrac{9}{2}r^{2} - \tfrac{1}{4}r^{4}\right]_{0}^{3} = \tfrac{81}{2} - \tfrac{81}{4} = \tfrac{81}{4}\).`,
        R`Outer integral: \(2\pi \cdot \tfrac{81}{4} = \tfrac{81\pi}{2}\).`,
      ],
      answer: R`\(\dfrac{81\pi}{2} \approx 127\) m³ of gravel`,
    },
  ],

  models: [
    {
      id: 'triangle-region',
      title: 'A double integral over a triangle',
      intro: 'Integrate c·xᵐ·yⁿ over the region under the line y = k·x, for x from 0 to a.',
      inputs: [
        { name: 'c', label: 'Coefficient c', type: 'int', min: 1, max: 9, value: 6 },
        { name: 'm', label: 'Power of x (m)', type: 'int', min: 0, max: 3, value: 1 },
        { name: 'n', label: 'Power of y (n)', type: 'int', min: 0, max: 3, value: 1 },
        { name: 'k', label: 'Slope k of the line y = k·x', type: 'int', min: 1, max: 4, value: 2 },
        { name: 'a', label: 'Right-hand end a', type: 'int', min: 1, max: 4, value: 1 },
      ],
      compute({ c, m, n, k, a }) {
        const f = [[c, m, n]];
        const inner = innerPoly(f, fp(0), fp(0, k));
        const ans = exactDouble(f, 0, a, fp(0), fp(0, k));
        const line = terms([[k, 'x']]);
        return {
          problem: R`Evaluate \(${iint(0, a, 0, line, mpTex(f))}\).`,
          steps: [
            R`The region: for each \(x\) between \(0\) and \(${a}\), \(y\) runs from \(0\) up to the line \(y = ${line}\) (the vertical strip in the picture).`,
            R`Inner integral, with \(x\) constant: \(\displaystyle\int_{0}^{${line}} ${mpTex(f)}\,dy = \left[${terms([[frac(c, n + 1), power('x', m) + power('y', n + 1)]])}\right]_{y=0}^{y=${line}} = ${fpTex(inner)}\).`,
            R`Outer integral: \(\displaystyle\int_{0}^{${a}} ${fpTex(inner)}\,dx = \left[${terms([[frac(c * k ** (n + 1), (n + 1) * (m + n + 2)), power('x', m + n + 2)]])}\right]_{0}^{${a}} = ${ans.tex()}\).`,
          ],
          answer: R`\(${ans.tex()}\)${ans.isInt() ? '' : R` \(\approx ${num(ans.value, { places: 3 })}\)`}`,
          visual: {
            type: 'plot',
            x: [-0.3, a + 0.5],
            y: [-0.3, k * a + 0.5],
            polygons: [{ points: [[0, 0], [a, 0], [a, k * a]], color: 'a' }],
            fns: [{ f: (x) => k * x, domain: [0, a], label: `y = ${k === 1 ? '' : k}x` }],
            segments: [{ from: [0.6 * a, 0], to: [0.6 * a, 0.6 * a * k], color: 'd', label: 'strip' }],
            alt: `The triangle with corners (0, 0), (${a}, 0) and (${a}, ${k * a}), under the line y = ${k}x. A vertical strip shows y running from 0 up to the line.`,
          },
        };
      },
    },
    {
      id: 'pool',
      title: 'Word problem: water in a swimming pool',
      word: true,
      intro: 'The pool is a rectangle seen from above. Its depth changes steadily from the shallow end to the deep end.',
      inputs: [
        { name: 'L', label: 'Length (m)', type: 'int', min: 5, max: 50, value: 25 },
        { name: 'W', label: 'Width (m)', type: 'int', min: 2, max: 25, value: 10 },
        { name: 'd0', label: 'Depth at the shallow end (m)', type: 'number', min: 0.5, max: 3, step: 0.1, value: 1 },
        { name: 'd1', label: 'Depth at the deep end (m)', type: 'number', min: 1, max: 5, step: 0.1, value: 3 },
      ],
      compute({ L, W, d0, d1 }) {
        const slope = (d1 - d0) / L;
        const depth = (x) => d0 + slope * x;
        const V = (L * W * (d0 + d1)) / 2;
        const f = (v, places = 2) => num(v, { places });
        const dTex = terms([[Number(f(d0)), ''], [Number(f(slope, 4)), 'x']]);
        return {
          problem: R`A pool is ${L} m long and ${W} m wide. Its depth increases steadily from ${f(d0)} m at one end to ${f(d1)} m at the other. How much water does it hold, and what is its average depth?`,
          steps: [
            R`Put \(x\) along the length and \(y\) across the width. The depth at \((x, y)\) is \(d(x, y) = ${dTex}\) m (it does not depend on \(y\)).`,
            R`Volume \(= \displaystyle\iint_{R} d\,dA = ${iint(0, L, 0, W, `\\left(${dTex}\\right)`)}\).`,
            R`Inner integral: the depth does not change across the width, so it is multiplied by \(${W}\). Outer integral: \(${W}\displaystyle\int_{0}^{${L}} \left(${dTex}\right) dx = ${f(V)}\) m³.`,
            R`Average depth \(= \dfrac{\text{volume}}{\text{area}} = \dfrac{${f(V)}}{${L * W}} = ${f((d0 + d1) / 2)}\) m, halfway between the two ends because the depth changes at a steady rate.`,
          ],
          answer: R`\(${f(V)}\) m³ of water; average depth \(${f((d0 + d1) / 2)}\) m`,
          visual: {
            type: 'plot',
            x: [0, L],
            y: [-Math.max(d0, d1) - 0.5, 0.5],
            shade: [{ f: () => 0, g: (x) => -depth(x), from: 0, to: L }],
            fns: [{ f: (x) => -depth(x), color: 'b' }],
            axisLabels: ['x (m)', 'depth (m)'],
            alt: `Side view of the pool: the water surface is level, and the bottom slopes from ${f(d0)} meters deep at x = 0 to ${f(d1)} meters deep at x = ${L}.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyRectMonomial, easyInner, easyPolarSetup],
    medium: [mediumRectSum, mediumTypeI, mediumAverage],
    hard: [hardReverseSetup, hardVolume, hardPolar],
    challenge: [challengeReverseEvaluate, challengePolarConvert, challengeParaboloidCap],
  },
};
