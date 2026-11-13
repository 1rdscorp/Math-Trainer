import { R, q, frac, terms, linear, poly, vec, num, paren, rootsTex, polyEval, polyDeriv, numDeriv, integrate, checkEqual, checkIntegral, close } from '../../lib/index.js';
import { M, K, N, exactChoices, fterms } from './_shared.js';

const PI = Math.PI;
const piK = (c) => K([[c, '\\pi']]);
// a(1 + cos θ) without a needless bracket when a = 1.
const card = (a, inner) => (a === 1 ? inner : `${a}(${inner})`);
// Graph of polar curves r = r(θ), drawn through x = r·cos θ, y = r·sin θ.
function polarPlot(curves, extent, alt) {
  return {
    type: 'plot',
    x: [-extent, extent],
    y: [-extent, extent],
    square: true,
    param: curves.map((c) => ({ x: (t) => c.r(t) * Math.cos(t), y: (t) => c.r(t) * Math.sin(t), t: c.t ?? [0, 2 * PI], color: c.color })),
    alt,
  };
}

// ───────────── Easy ─────────────

function easyParamSlope(rng) {
  let xs;
  let ys;
  let t0;
  do {
    xs = [rng.int(1, 3), rng.int(-4, 4), 0]; // x = p·t² + q·t
    ys = rng.bool() ? [rng.int(1, 2), 0, rng.int(-5, 5), 0] : [rng.int(1, 3), rng.int(-5, 5), 0]; // y = r·t³ + s·t  or  r·t² + s·t
    t0 = rng.int(-2, 3);
  } while (polyEval(polyDeriv(xs), t0) === 0 || polyEval(polyDeriv(ys), t0) === 0);
  const dx = polyEval(polyDeriv(xs), t0);
  const dy = polyEval(polyDeriv(ys), t0);
  const slope = frac(dy, dx);
  const x0 = polyEval(xs, t0);
  return q({
    prompt: R`A curve is given by \(x = ${poly(xs, 't')}\), \(y = ${poly(ys, 't')}\). Find \(\dfrac{dy}{dx}\) at \(t = ${t0}\).`,
    correct: slope,
    wrong: [
      { value: frac(dx, dy), why: R`\(\dfrac{dy}{dx} = \dfrac{dy/dt}{dx/dt}\): the derivative of \(y\) goes on top.` },
      { value: dy, why: R`That is \(\dfrac{dy}{dt}\). Divide it by \(\dfrac{dx}{dt} = ${dx}\).` },
      x0 !== 0 ? { value: frac(polyEval(ys, t0), x0), why: R`That is \(\frac{y}{x}\) at the point. The slope of the curve uses the derivatives.` } : null,
      slope.neg(),
      dy * dx,
    ],
    solution: [
      R`\(\dfrac{dx}{dt} = ${poly(polyDeriv(xs), 't')}\) and \(\dfrac{dy}{dt} = ${poly(polyDeriv(ys), 't')}\).`,
      R`At \(t = ${t0}\): \(\dfrac{dx}{dt} = ${dx}\) and \(\dfrac{dy}{dt} = ${dy}\).`,
      R`\(\dfrac{dy}{dx} = \dfrac{dy/dt}{dx/dt} = ${slope.tex()}\).`,
    ],
    rule: 0,
    skill: 'slope of a parametric curve',
    check: () => checkEqual(numDeriv((t) => polyEval(ys, t), t0) / numDeriv((t) => polyEval(xs, t), t0), slope.value, 1e-5, 'dy/dx'),
  });
}

function easyVelocityVector(rng) {
  const a = rng.int(1, 4);
  const b = rng.int(-5, 5);
  const c = rng.int(1, 3);
  const d = rng.nonzero(-6, 6);
  const t0 = rng.int(1, 3);
  const askVel = rng.bool(0.6);
  const pos = vec(a * t0 * t0 + b, c * t0 ** 3 + d * t0);
  const vel = vec(2 * a * t0, 3 * c * t0 * t0 + d);
  const acc = vec(2 * a, 6 * c * t0);
  const rTex = vec(poly([a, 0, b], 't'), poly([c, 0, d, 0], 't'));
  const vTex = vec(terms([[2 * a, 't']]), poly([3 * c, 0, d], 't'));
  return q({
    prompt: R`A particle moves in the plane with position \(\vec{r}(t) = ${rTex}\). Find its ${askVel ? 'velocity' : 'acceleration'} vector at \(t = ${t0}\).`,
    correct: M(askVel ? vel : acc),
    wrong: askVel
      ? [
          { value: M(pos), why: R`That is the position \(\vec{r}(${t0})\). Velocity is the derivative of position.` },
          { value: M(acc), why: R`That is the acceleration, the second derivative. Velocity is the first derivative.` },
          M(vec(2 * a * t0, 3 * c * t0 * t0)),
          M(vec(3 * c * t0 * t0 + d, 2 * a * t0)),
          // Fallbacks that can never equal the velocity (a, c and t0 are nonzero), so three wrong choices always exist.
          M(vec(a * t0, 3 * c * t0 * t0 + d)),
          M(vec(a * t0, c * t0 * t0 + d)),
          M(vec(2 * a * t0, c * t0 * t0 + d)),
        ]
      : [
          { value: M(vel), why: R`That is the velocity, the first derivative. Acceleration is the derivative of velocity.` },
          { value: M(pos), why: R`That is the position \(\vec{r}(${t0})\). Differentiate twice for acceleration.` },
          M(vec(2 * a * t0, 6 * c * t0)),
          M(vec(2 * a, 6 * c)),
          M(vec(a, 6 * c * t0)),
          M(vec(2 * a, 3 * c * t0)),
          M(vec(6 * c * t0, 2 * a)),
        ],
    solution: askVel
      ? [R`Differentiate each component: \(\vec{v}(t) = \vec{r}\,'(t) = ${vTex}\).`, R`At \(t = ${t0}\): \(\vec{v}(${t0}) = ${vel}\).`]
      : [R`Differentiate each component: \(\vec{v}(t) = ${vTex}\).`, R`Differentiate again: \(\vec{a}(t) = \vec{v}\,'(t) = ${vec(String(2 * a), terms([[6 * c, 't']]))}\).`, R`At \(t = ${t0}\): \(\vec{a}(${t0}) = ${acc}\).`],
    rule: 3,
    skill: 'velocity and acceleration vectors',
    check: () => {
      const x = (t) => a * t * t + b;
      const y = (t) => c * t ** 3 + d * t;
      return close(numDeriv(x, t0), 2 * a * t0, 1e-5) && close(numDeriv(y, t0), 3 * c * t0 * t0 + d, 1e-5) && close(numDeriv((t) => 3 * c * t * t + d, t0), 6 * c * t0, 1e-5) ? true : 'derivative mismatch';
    },
  });
}

function easyPolarAreaSetup(rng) {
  const a = rng.int(2, 7);
  const cs = rng.pick([
    { r: `${a}\\sin\\theta`, lo: '0', hi: R`\pi`, what: 'the circle' },
    { r: `${a}(1 + \\cos\\theta)`, lo: '0', hi: R`2\pi`, what: 'the cardioid' },
    { r: `${a}\\theta`, lo: '0', hi: R`\pi`, what: 'the spiral arc' },
    { r: `${a}\\sin 2\\theta`, lo: '0', hi: R`\pi/2`, what: 'one petal of the rose' },
    { r: `${a}\\cos\\theta`, lo: R`-\pi/2`, hi: R`\pi/2`, what: 'the circle' },
  ]);
  const I = (lead, body) => M(R`\displaystyle${lead}\int_{${cs.lo}}^{${cs.hi}} ${body}\,d\theta`);
  const sq = R`\left(${cs.r}\right)^{2}`;
  return q({
    prompt: R`Which integral gives the area enclosed by ${cs.what} \(r = ${cs.r}\) for \(${cs.lo} \le \theta \le ${cs.hi}\)?`,
    correct: I(R`\frac{1}{2}`, sq),
    wrong: [
      { value: I('', sq), why: R`A thin polar slice is a sector with area \(\frac{1}{2}r^{2}\,d\theta\). The \(\frac{1}{2}\) is missing.` },
      { value: I(R`\frac{1}{2}`, cs.r), why: R`The area of a sector depends on \(r^{2}\), not on \(r\).` },
      { value: I('', cs.r), why: R`That treats \(r\) like a height above an axis. Polar area adds up sectors: \(\frac{1}{2}r^{2}\,d\theta\).` },
    ],
    solution: [
      R`Cut the region into thin sectors with angle \(d\theta\) and radius \(r\). A sector has area \(\frac{1}{2}r^{2}\,d\theta\).`,
      R`Add them up over the given angles: \(A = \displaystyle\frac{1}{2}\int_{${cs.lo}}^{${cs.hi}} ${sq}\,d\theta\).`,
    ],
    rule: 5,
    skill: 'area in polar coordinates',
  });
}

// ───────────── Medium ─────────────

function mediumTangentLine(rng) {
  const t0 = rng.pick([1, -1, 2]);
  const qc = t0 === 2 ? rng.pick([-8, -4, 0, 4]) : rng.pick([-7, -5, -1, 1, 3, 5]); // never −3: that would make the tangent horizontal
  const p = rng.int(-4, 4);
  const x0 = t0 * t0 + p;
  const y0 = t0 ** 3 + qc * t0;
  const dx = 2 * t0;
  const dy = 3 * t0 * t0 + qc;
  const m = dy / dx;
  const c = y0 - m * x0;
  const line = (mm, cc) => M(`y = ${linear(mm, cc)}`);
  return q({
    prompt: R`Find the equation of the tangent line to the curve \(x = ${poly([1, 0, p], 't')}\), \(y = ${poly([1, 0, qc, 0], 't')}\) at the point where \(t = ${t0}\).`,
    correct: line(m, c),
    wrong: [
      dy !== m ? { value: line(dy, y0 - dy * x0), why: R`\(${dy}\) is \(\dfrac{dy}{dt}\). The slope is \(\dfrac{dy/dt}{dx/dt} = \dfrac{${dy}}{${dx}}\).` } : null,
      x0 !== 0 ? { value: line(m, y0), why: R`\(${y0}\) is the \(y\)-coordinate of the point, not the \(y\)-intercept. Use \(y - ${paren(y0)} = ${m}(x - ${paren(x0)})\).` } : null,
      { value: line(m, y0 - m * t0), why: R`Use the point \((x, y) = (${x0}, ${y0})\) on the curve, not \(t = ${t0}\), in the point-slope form.` },
      line(-m, y0 + m * x0),
      line(m + 1, y0 - (m + 1) * x0),
      line(m, c + 2),
    ],
    solution: [
      R`Point: at \(t = ${t0}\), \(x = ${x0}\) and \(y = ${y0}\).`,
      R`Slope: \(\dfrac{dx}{dt} = 2t = ${dx}\) and \(\dfrac{dy}{dt} = ${poly([3, 0, qc], 't')} = ${dy}\), so \(\dfrac{dy}{dx} = \dfrac{${dy}}{${dx}} = ${m}\).`,
      R`Point-slope form: \(y - ${paren(y0)} = ${m}(x - ${paren(x0)})\), which simplifies to \(y = ${linear(m, c)}\).`,
    ],
    rule: 0,
    skill: 'tangent line to a parametric curve',
    check: () => (close(numDeriv((t) => t ** 3 + qc * t, t0) / numDeriv((t) => t * t + p, t0), m, 1e-5) && Math.abs(m * x0 + c - y0) < 1e-9 ? true : 'line is not tangent at the point'),
  });
}

function mediumWordSpeed(rng) {
  const [a0, b0, h0] = rng.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [6, 8, 10]]);
  const k = rng.int(1, 3);
  const [a, b, h] = [a0 * k, b0 * k, h0 * k];
  const T = rng.int(2, 6);
  const vTex = vec(terms([[a, 't']]), terms([[b, 't']]));
  const askSpeed = rng.bool();
  const speed = h * T;
  const dist = frac(h * T * T, 2);
  return q({
    prompt: askSpeed
      ? R`A drone flies so that its velocity at time \(t\) seconds is \(\vec{v}(t) = ${vTex}\) meters per second. What is its speed at \(t = ${T}\)?`
      : R`A drone flies so that its velocity at time \(t\) seconds is \(\vec{v}(t) = ${vTex}\) meters per second. How far does it travel from \(t = 0\) to \(t = ${T}\)?`,
    correct: askSpeed ? speed : dist,
    unit: askSpeed ? 'm/s' : 'm',
    wrong: askSpeed
      ? [
          { value: (a + b) * T, why: R`Speed is the length of the velocity vector, \(\sqrt{(${a * T})^{2} + (${b * T})^{2}}\), not the sum of its components.` },
          { value: h, why: R`Substitute \(t = ${T}\): the components are \(${a * T}\) and \(${b * T}\).` },
          a * T,
          h * T * T,
        ]
      : [
          { value: h * T * T, why: R`The speed changes with time, so integrate it. Multiplying the final speed by the time overestimates.` },
          { value: speed, why: R`That is the speed at \(t = ${T}\), in meters per second. Distance is the integral of speed.` },
          frac((a + b) * T * T, 2),
          dist.mul(2).add(h),
        ],
    solution: askSpeed
      ? [R`Speed is the magnitude of velocity: \(|\vec{v}(t)| = \sqrt{(${a}t)^{2} + (${b}t)^{2}} = ${h}t\) for \(t \ge 0\).`, R`At \(t = ${T}\): \(${h}\cdot ${T} = ${speed}\) m/s.`]
      : [
          R`Speed is the magnitude of velocity: \(|\vec{v}(t)| = \sqrt{(${a}t)^{2} + (${b}t)^{2}} = ${h}t\) for \(t \ge 0\).`,
          R`Distance travelled \(= \displaystyle\int_{0}^{${T}} |\vec{v}(t)|\,dt = \int_{0}^{${T}} ${h}t\,dt = \Big[${frac(h, 2).tex()}t^{2}\Big]_{0}^{${T}}\).`,
          R`Distance \(= ${dist.tex()}\) m.`,
        ],
    rule: 3,
    skill: 'speed and distance travelled',
    check: () => (askSpeed ? checkEqual(Math.hypot(a * T, b * T), speed, 1e-9, 'speed') : checkIntegral((t) => Math.hypot(a * t, b * t), 0, T, dist.value)),
  });
}

function mediumPolarArea(rng) {
  const a = rng.int(1, 6);
  const A2 = a * a;
  const A = a === 1 ? '' : String(a);
  const half = frac(A2, 2).tex();
  const forms = [
    { r: `${A}\\sin\\theta`, sq: R`\sin^{2}\theta`, rJs: (t) => a * Math.sin(t), lo: 0, hi: PI, lim: ['0', R`\pi`], coef: frac(A2, 4), ext: a * 1.15, name: `the circle r = ${a} sin θ`, what: R`the circle \(r = ${A}\sin\theta\)`, mid: R`\sin^{2}\theta = \dfrac{1 - \cos 2\theta}{2}`, val: R`\dfrac{\pi}{2}`, plotT: [0, PI] },
    { r: card(a, '1 + \\cos\\theta'), sq: R`(1 + \cos\theta)^{2}`, rJs: (t) => a * (1 + Math.cos(t)), lo: 0, hi: 2 * PI, lim: ['0', R`2\pi`], coef: frac(3 * A2, 2), ext: a * 2.3, name: `the cardioid r = ${a}(1 + cos θ)`, what: R`the cardioid \(r = ${card(a, '1 + \\cos\\theta')}\)`, mid: R`(1 + \cos\theta)^{2} = 1 + 2\cos\theta + \dfrac{1 + \cos 2\theta}{2}`, val: R`3\pi`, special: { c: frac(A2, 1), why: R`\((1 + \cos\theta)^{2}\) also contains \(\cos^{2}\theta\), which adds \(\pi\) over a full turn.` } },
    { r: `${A}\\sin 2\\theta`, sq: R`\sin^{2}2\theta`, rJs: (t) => a * Math.sin(2 * t), lo: 0, hi: PI / 2, lim: ['0', R`\pi/2`], coef: frac(A2, 8), ext: a * 1.15, name: `the four-petal rose r = ${a} sin 2θ`, what: R`one petal of the rose \(r = ${A}\sin 2\theta\) (\(0 \le \theta \le \frac{\pi}{2}\))`, mid: R`\sin^{2}2\theta = \dfrac{1 - \cos 4\theta}{2}`, val: R`\dfrac{\pi}{4}`, special: { c: frac(A2, 2), why: 'That is the area of all four petals. The question asks for one.' } },
    { r: `${A}\\sin 3\\theta`, sq: R`\sin^{2}3\theta`, rJs: (t) => a * Math.sin(3 * t), lo: 0, hi: PI / 3, lim: ['0', R`\pi/3`], coef: frac(A2, 12), ext: a * 1.15, name: `the three-petal rose r = ${a} sin 3θ`, what: R`one petal of the rose \(r = ${A}\sin 3\theta\) (\(0 \le \theta \le \frac{\pi}{3}\))`, mid: R`\sin^{2}3\theta = \dfrac{1 - \cos 6\theta}{2}`, val: R`\dfrac{\pi}{6}`, plotT: [0, PI], special: { c: frac(A2, 4), why: 'That is the area of all three petals. The question asks for one.' } },
    { r: `${A}\\theta`, sq: R`\theta^{2}`, rJs: (t) => a * t, lo: 0, hi: PI, lim: ['0', R`\pi`], coef: frac(A2, 6), cube: true, ext: a * 3.4, name: `the spiral r = ${a}θ from θ = 0 to π`, what: R`the spiral \(r = ${A}\theta\) for \(0 \le \theta \le \pi\) and the \(x\)-axis`, mid: R`\displaystyle\int \theta^{2}\,d\theta = \dfrac{\theta^{3}}{3}`, val: R`\dfrac{\pi^{3}}{3}`, plotT: [0, PI] },
  ];
  const f = rng.pick(forms);
  const make = (c) => K([[c, f.cube ? '\\pi^{3}' : '\\pi']]);
  const right = make(f.coef);
  return q({
    prompt: R`Find the area of the region enclosed by ${f.what}.`,
    visual: polarPlot([{ r: f.rJs, t: f.plotT }], f.ext, `Polar graph of ${f.name}.`),
    ...exactChoices(right, [
      { k: make(f.coef.mul(2)), why: R`The area of a thin polar sector is \(\frac{1}{2}r^{2}\,d\theta\). The \(\frac{1}{2}\) is missing.` },
      f.special ? { k: make(f.special.c), why: f.special.why } : f.cube ? { k: K([[frac(A2, 4), '\\pi^{2}']]), why: R`Square \(r\) before integrating: the integrand is \(\frac{1}{2}r^{2}\), not \(\frac{1}{2}r\).` } : null,
      make(f.coef.div(2)),
      make(f.coef.mul(4)),
      make(f.coef.mul(3)),
    ]),
    solution: [
      R`Polar area: \(A = \displaystyle\frac{1}{2}\int_{${f.lim[0]}}^{${f.lim[1]}} r^{2}\,d\theta = ${half}\int_{${f.lim[0]}}^{${f.lim[1]}} ${f.sq}\,d\theta\).`,
      R`Use \(${f.mid}\): \(\displaystyle\int_{${f.lim[0]}}^{${f.lim[1]}} ${f.sq}\,d\theta = ${f.val}\).`,
      R`\(A = ${half}\cdot ${f.val} = ${right.tex}\).`,
    ],
    rule: 5,
    skill: 'area in polar coordinates',
    check: () => checkIntegral((t) => 0.5 * f.rJs(t) ** 2, f.lo, f.hi, right.value),
  });
}

// ───────────── Hard ─────────────

function hardSecondDerivative(rng) {
  const SECOND = R`\(\dfrac{d^{2}y}{dx^{2}}\) is not \(\dfrac{d^{2}y/dt^{2}}{d^{2}x/dt^{2}}\). Differentiate \(\dfrac{dy}{dx}\) with respect to \(t\), then divide by \(\dfrac{dx}{dt}\).`;
  if (rng.bool()) {
    const t0 = rng.pick([1, -1, 2, -2]);
    const qc = rng.nonzero(-6, 6);
    const p = rng.int(-4, 4);
    const value = frac(3 * t0 * t0 - qc, 4 * t0 ** 3);
    const first = frac(3 * t0 * t0 + qc, 2 * t0);
    const mid = frac(3, 2).sub(frac(qc, 2 * t0 * t0));
    const hq = frac(Math.abs(qc), 2);
    const over = (pw) => R`\dfrac{${hq.n}}{${hq.d === 1 ? '' : hq.d}${pw}}`;
    return q({
      prompt: R`For the curve \(x = ${poly([1, 0, p], 't')}\), \(y = ${poly([1, 0, qc, 0], 't')}\), find \(\dfrac{d^{2}y}{dx^{2}}\) at \(t = ${t0}\).`,
      correct: value,
      wrong: [
        { value: 3 * t0, why: SECOND },
        { value: mid, why: R`That is \(\dfrac{d}{dt}\left[\dfrac{dy}{dx}\right]\). It still has to be divided by \(\dfrac{dx}{dt} = ${2 * t0}\).` },
        { value: first, why: R`That is the first derivative \(\dfrac{dy}{dx}\).` },
        value.neg(),
        value.mul(2),
      ],
      solution: [
        R`First derivative: \(\dfrac{dy}{dx} = \dfrac{${poly([3, 0, qc], 't')}}{2t} = \dfrac{3}{2}t ${qc > 0 ? '+' : '-'} ${over('t')}\).`,
        R`Differentiate with respect to \(t\): \(\dfrac{d}{dt}\left[\dfrac{dy}{dx}\right] = \dfrac{3}{2} ${qc > 0 ? '-' : '+'} ${over('t^{2}')}\), which is \(${mid.tex()}\) at \(t = ${t0}\).`,
        R`Divide by \(\dfrac{dx}{dt} = 2t = ${2 * t0}\): \(\dfrac{d^{2}y}{dx^{2}} = ${value.tex()}\).`,
      ],
      rule: 1,
      skill: 'second derivative of a parametric curve',
      check: () => checkEqual(numDeriv((t) => (3 * t * t + qc) / (2 * t), t0) / (2 * t0), value.value, 1e-5, 'second derivative'),
    });
  }
  const a = rng.pick([2, 3, -2, 4]);
  const b = rng.int(-4, 4);
  const c = rng.int(1, 3);
  const d = rng.int(-4, 4);
  const t0 = rng.int(-2, 3);
  const top = 6 * c * t0 + 2 * d;
  const value = frac(top, a * a);
  const first = frac(3 * c * t0 * t0 + 2 * d * t0, a);
  return q({
    prompt: R`For the curve \(x = ${linear(a, b, 't')}\), \(y = ${poly([c, d, 0, 0], 't')}\), find \(\dfrac{d^{2}y}{dx^{2}}\) at \(t = ${t0}\).`,
    correct: value,
    wrong: [
      { value: top, why: R`That is \(\dfrac{d^{2}y}{dt^{2}}\). To change to derivatives in \(x\), divide by \(\dfrac{dx}{dt} = ${a}\) twice.` },
      { value: frac(top, a), why: R`That is \(\dfrac{d}{dt}\left[\dfrac{dy}{dx}\right]\). It still has to be divided by \(\dfrac{dx}{dt} = ${a}\).` },
      { value: first, why: R`That is the first derivative \(\dfrac{dy}{dx}\).` },
      value.neg(),
      value.add(1),
    ],
    solution: [
      R`First derivative: \(\dfrac{dy}{dx} = \dfrac{dy/dt}{dx/dt} = \dfrac{${poly([3 * c, 2 * d, 0], 't')}}{${a}}\).`,
      R`Differentiate with respect to \(t\): \(\dfrac{d}{dt}\left[\dfrac{dy}{dx}\right] = \dfrac{${linear(6 * c, 2 * d, 't')}}{${a}}\).`,
      R`Divide by \(\dfrac{dx}{dt} = ${a}\): \(\dfrac{d^{2}y}{dx^{2}} = \dfrac{${linear(6 * c, 2 * d, 't')}}{${a * a}}\), which is \(${value.tex()}\) at \(t = ${t0}\).`,
    ],
    rule: 1,
    skill: 'second derivative of a parametric curve',
    check: () => checkEqual(numDeriv((t) => (3 * c * t * t + 2 * d * t) / a, t0) / a, value.value, 1e-5, 'second derivative'),
  });
}

function hardParamArcLength(rng) {
  const c = rng.int(1, 4);
  const C = c === 1 ? '' : String(c);
  const fam = rng.pick(['semicubic', 'spiral', 'square', 'cycloid']);
  let it;
  if (fam === 'semicubic') {
    const big = rng.bool();
    it = {
      curve: R`x = ${3 * c}t^{2},\; y = ${2 * c}t^{3}`, lo: 0, hi: big ? Math.sqrt(3) : 1, hiTex: big ? R`\sqrt{3}` : '1',
      speed: (t) => Math.hypot(6 * c * t, 6 * c * t * t),
      right: big ? N(14 * c) : K([[4 * c, '\\sqrt{2}'], [-2 * c, '']]),
      wrongs: [
        { k: big ? N(16 * c) : K([[4 * c, '\\sqrt{2}']]), why: R`At \(t = 0\) the antiderivative \(${2 * c}(1 + t^{2})^{3/2}\) equals \(${2 * c}\), not 0.` },
        { k: big ? K([[9 * c, ''], [6 * c, '\\sqrt{3}']]) : N(5 * c), why: R`\(\sqrt{a^{2} + b^{2}}\) is not \(a + b\). Factor instead: \(\sqrt{${36 * c * c}t^{2}(1 + t^{2})} = ${6 * c}t\sqrt{1 + t^{2}}\).` },
        { k: big ? K([[3 * c, '\\sqrt{21}']]) : K([[c, '\\sqrt{13}']]), why: 'That is the straight-line distance between the endpoints. The curve is longer.' },
        big ? N(7 * c) : K([[2 * c, '\\sqrt{2}'], [-c, '']]),
        big ? N(28 * c) : K([[8 * c, '\\sqrt{2}'], [-4 * c, '']]),
      ],
      steps: [
        R`\(\dfrac{dx}{dt} = ${6 * c}t\) and \(\dfrac{dy}{dt} = ${6 * c}t^{2}\), so the speed is \(\sqrt{${36 * c * c}t^{2} + ${36 * c * c}t^{4}} = ${6 * c}t\sqrt{1 + t^{2}}\) for \(t \ge 0\).`,
        R`\(L = \displaystyle\int_{0}^{${big ? R`\sqrt{3}` : '1'}} ${6 * c}t\sqrt{1 + t^{2}}\,dt = \Big[${2 * c}(1 + t^{2})^{3/2}\Big]_{0}^{${big ? R`\sqrt{3}` : '1'}}\) (substitute \(u = 1 + t^{2}\)).`,
      ],
    };
  } else if (fam === 'spiral') {
    const T = rng.int(1, 3);
    const eT = T === 1 ? 'e' : `e^{${T}}`;
    it = {
      curve: R`x = ${C}e^{t}\cos t,\; y = ${C}e^{t}\sin t`, lo: 0, hi: T, hiTex: String(T),
      speed: (t) => c * Math.SQRT2 * Math.exp(t),
      right: K([[c, `\\sqrt{2}${eT}`], [-c, '\\sqrt{2}']]),
      wrongs: [
        { k: K([[c, eT], [-c, '']]), why: R`\(\left(\dfrac{dx}{dt}\right)^{2} + \left(\dfrac{dy}{dt}\right)^{2} = ${2 * c * c}e^{2t}\): the cross terms cancel, and the squares add up to a factor 2.` },
        { k: K([[c, `\\sqrt{2}${eT}`]]), why: R`Subtract the value at \(t = 0\), which is \(${C}\sqrt{2}\).` },
        K([[2 * c, eT], [-2 * c, '']]),
        K([[c, `\\sqrt{2}${eT}`], [c, '\\sqrt{2}']]),
      ],
      steps: [
        R`\(\dfrac{dx}{dt} = ${C}e^{t}(\cos t - \sin t)\) and \(\dfrac{dy}{dt} = ${C}e^{t}(\sin t + \cos t)\).`,
        R`Squaring and adding, the cross terms cancel: the speed is \(\sqrt{${2 * c * c}e^{2t}} = ${C}\sqrt{2}\,e^{t}\). So \(L = \displaystyle\int_{0}^{${T}} ${C}\sqrt{2}\,e^{t}\,dt\).`,
      ],
    };
  } else if (fam === 'square') {
    const T = rng.int(1, 4);
    const value = frac(c * (T ** 3 + 3 * T), 3);
    it = {
      curve: R`x = ${fterms([[frac(c, 3), 't^{3}']])} - ${C}t,\; y = ${C}t^{2}`, lo: 0, hi: T, hiTex: String(T),
      speed: (t) => c * (t * t + 1),
      right: N(value),
      wrongs: [
        { k: N(frac(c * Math.abs(T ** 3 - 3 * T), 3)), why: R`\((t^{2} - 1)^{2} + (2t)^{2} = t^{4} + 2t^{2} + 1 = (t^{2} + 1)^{2}\): the middle term changes sign.` },
        { k: N(c * T * T), why: R`That is only the change in \(y\). Arc length combines both \(\dfrac{dx}{dt}\) and \(\dfrac{dy}{dt}\).` },
        N(value.add(c)),
        N(value.mul(2)),
        N(frac(c * T ** 3, 3)),
      ],
      steps: [
        R`\(\dfrac{dx}{dt} = ${card(c, 't^{2} - 1')}\) and \(\dfrac{dy}{dt} = ${2 * c}t\).`,
        R`\((t^{2} - 1)^{2} + (2t)^{2} = (t^{2} + 1)^{2}\), so the speed is \(${card(c, 't^{2} + 1')}\) and \(L = \displaystyle\int_{0}^{${T}} ${C}(t^{2} + 1)\,dt\).`,
      ],
    };
  } else {
    it = {
      curve: R`x = ${card(c, 't - \\sin t')},\; y = ${card(c, '1 - \\cos t')}`, lo: 0, hi: 2 * PI, hiTex: R`2\pi`,
      speed: (t) => 2 * c * Math.abs(Math.sin(t / 2)),
      right: N(8 * c),
      wrongs: [
        { k: piK(2 * c), why: 'That is the distance along the ground under one arch. The arch itself is longer.' },
        { k: N(4 * c), why: R`\(\displaystyle\int_{0}^{2\pi} ${2 * c}\sin\frac{t}{2}\,dt = \Big[-${4 * c}\cos\frac{t}{2}\Big]_{0}^{2\pi} = ${4 * c} + ${4 * c}\).` },
        piK(4 * c),
        N(2 * c),
        N(16 * c),
      ],
      steps: [
        R`\(\dfrac{dx}{dt} = ${card(c, '1 - \\cos t')}\) and \(\dfrac{dy}{dt} = ${C}\sin t\), so \(\left(\dfrac{dx}{dt}\right)^{2} + \left(\dfrac{dy}{dt}\right)^{2} = ${c * c === 1 ? '' : c * c}(2 - 2\cos t) = ${4 * c * c}\sin^{2}\dfrac{t}{2}\).`,
        R`The speed is \(${2 * c}\sin\dfrac{t}{2}\) for \(0 \le t \le 2\pi\), so \(L = \displaystyle\int_{0}^{2\pi} ${2 * c}\sin\frac{t}{2}\,dt = \Big[-${4 * c}\cos\frac{t}{2}\Big]_{0}^{2\pi}\).`,
      ],
    };
  }
  return q({
    prompt: R`Find the length of the curve \(${it.curve}\) for \(0 \le t \le ${it.hiTex}\).`,
    ...exactChoices(it.right, it.wrongs),
    solution: [R`Arc length: \(L = \displaystyle\int_{a}^{b} \sqrt{\left(\frac{dx}{dt}\right)^{2} + \left(\frac{dy}{dt}\right)^{2}}\,dt\).`, ...it.steps, R`\(L = ${it.right.tex}\).`],
    rule: 2,
    skill: 'parametric arc length',
    check: () => checkIntegral(it.speed, it.lo, it.hi, it.right.value, 1e-4),
  });
}

function hardPolarSlope(rng) {
  const a = rng.int(1, 6);
  const b = rng.intExcept(1, 6, [a]);
  const fam = rng.pick(['cos', 'sin0', 'sinPi']);
  const set = {
    cos: { r: terms([[a, ''], [b, '\\cos\\theta']]), rJs: (t) => a + b * Math.cos(t), th: PI / 2, thTex: R`\dfrac{\pi}{2}`, rv: a, dr: -b, dxv: -a, dyv: -b, slope: frac(b, a), drTex: terms([[-b, '\\sin\\theta']]) },
    sin0: { r: terms([[a, ''], [b, '\\sin\\theta']]), rJs: (t) => a + b * Math.sin(t), th: 0, thTex: '0', rv: a, dr: b, dxv: b, dyv: a, slope: frac(a, b), drTex: terms([[b, '\\cos\\theta']]) },
    sinPi: { r: terms([[a, ''], [b, '\\sin\\theta']]), rJs: (t) => a + b * Math.sin(t), th: PI, thTex: R`\pi`, rv: a, dr: -b, dxv: b, dyv: -a, slope: frac(-a, b), drTex: terms([[b, '\\cos\\theta']]) },
  }[fam];
  return q({
    prompt: R`Find the slope \(\dfrac{dy}{dx}\) of the tangent line to the polar curve \(r = ${set.r}\) at \(\theta = ${set.thTex}\).`,
    correct: set.slope,
    wrong: [
      { value: set.dr, why: R`That is \(\dfrac{dr}{d\theta}\), which is not the slope of the curve. Use \(x = r\cos\theta\), \(y = r\sin\theta\) and \(\dfrac{dy}{dx} = \dfrac{dy/d\theta}{dx/d\theta}\).` },
      { value: set.slope.inv(), why: R`\(\dfrac{dy}{dx} = \dfrac{dy/d\theta}{dx/d\theta}\): the derivative of \(y\) goes on top.` },
      set.slope.neg(),
      set.slope.inv().neg(),
      frac(set.dr, set.rv),
    ],
    solution: [
      R`Write \(x = r\cos\theta\) and \(y = r\sin\theta\). By the product rule, \(\dfrac{dx}{d\theta} = \dfrac{dr}{d\theta}\cos\theta - r\sin\theta\) and \(\dfrac{dy}{d\theta} = \dfrac{dr}{d\theta}\sin\theta + r\cos\theta\).`,
      R`Here \(\dfrac{dr}{d\theta} = ${set.drTex}\). At \(\theta = ${set.thTex}\): \(r = ${set.rv}\) and \(\dfrac{dr}{d\theta} = ${set.dr}\).`,
      R`So \(\dfrac{dx}{d\theta} = ${set.dxv}\) and \(\dfrac{dy}{d\theta} = ${set.dyv}\), which gives \(\dfrac{dy}{dx} = ${set.slope.tex()}\).`,
    ],
    rule: 4,
    skill: 'slope of a polar curve',
    check: () => checkEqual(numDeriv((t) => set.rJs(t) * Math.sin(t), set.th) / numDeriv((t) => set.rJs(t) * Math.cos(t), set.th), set.slope.value, 1e-5, 'slope'),
  });
}

// ───────────── Challenge ─────────────

function challengePolarBetween(rng) {
  const a = rng.int(1, 4);
  const A2 = a * a;
  const A = a === 1 ? '' : String(a);
  const fam = rng.pick(['circleCardioid', 'cardioidCircle', 'circleMinus']);
  const set = {
    circleCardioid: {
      text: R`inside the circle \(r = ${3 * a}\sin\theta\) and outside the cardioid \(r = ${card(a, '1 + \\sin\\theta')}\)`,
      outer: (t) => 3 * a * Math.sin(t), inner: (t) => a * (1 + Math.sin(t)), lo: PI / 6, hi: (5 * PI) / 6,
      right: piK(A2),
      wrongs: [
        { k: piK(2 * A2), why: R`The area of a polar sector is \(\frac{1}{2}r^{2}\,d\theta\). Keep the \(\frac{1}{2}\).` },
        { k: piK(frac(5 * A2, 4)), why: R`Integrate only between the intersection angles \(\frac{\pi}{6}\) and \(\frac{5\pi}{6}\), and subtract the cardioid's \(r^{2}\) there.` },
        piK(frac(A2, 2)),
        piK(frac(3 * A2, 4)),
        K([[A2, '\\pi'], [A2, '\\sqrt{3}']]),
      ],
      steps: [
        R`Intersections: \(${3 * a}\sin\theta = ${card(a, '1 + \\sin\\theta')}\) gives \(\sin\theta = \frac{1}{2}\), so \(\theta = \frac{\pi}{6}\) and \(\frac{5\pi}{6}\).`,
        R`\(A = \displaystyle\frac{1}{2}\int_{\pi/6}^{5\pi/6} \left[${9 * A2}\sin^{2}\theta - ${A2 === 1 ? '' : A2}(1 + \sin\theta)^{2}\right]d\theta = ${frac(A2, 2).tex()}\int_{\pi/6}^{5\pi/6} \left(3 - 4\cos 2\theta - 2\sin\theta\right)d\theta\).`,
        R`\(\Big[3\theta - 2\sin 2\theta + 2\cos\theta\Big]_{\pi/6}^{5\pi/6} = 2\pi\), which is then multiplied by \(${frac(A2, 2).tex()}\).`,
      ],
      ext: 3.2 * a, alt: `A circle of diameter ${3 * a} sitting on the origin, and a cardioid r = ${a}(1 + sin θ). The region inside the circle but outside the cardioid is a crescent at the top.`,
    },
    cardioidCircle: {
      text: R`inside the cardioid \(r = ${card(a, '1 + \\cos\\theta')}\) and outside the circle \(r = ${a}\)`,
      outer: (t) => a * (1 + Math.cos(t)), inner: () => a, lo: -PI / 2, hi: PI / 2,
      right: K([[2 * A2, ''], [frac(A2, 4), '\\pi']]),
      wrongs: [
        { k: K([[4 * A2, ''], [frac(A2, 2), '\\pi']]), why: R`The area of a polar sector is \(\frac{1}{2}r^{2}\,d\theta\). Keep the \(\frac{1}{2}\).` },
        { k: piK(frac(A2, 2)), why: R`That subtracts the whole circle from the whole cardioid. Only the part between \(\theta = -\frac{\pi}{2}\) and \(\frac{\pi}{2}\), where the cardioid is outside the circle, counts.` },
        K([[2 * A2, ''], [frac(-A2, 4), '\\pi']]),
        K([[2 * A2, '']]),
        K([[A2, ''], [frac(A2, 4), '\\pi']]),
      ],
      steps: [
        R`Intersections: \(${card(a, '1 + \\cos\\theta')} = ${a}\) gives \(\cos\theta = 0\), so \(\theta = \pm\frac{\pi}{2}\). The cardioid is outside the circle for \(-\frac{\pi}{2} < \theta < \frac{\pi}{2}\).`,
        R`\(A = \displaystyle\frac{1}{2}\int_{-\pi/2}^{\pi/2} ${A2 === 1 ? '' : A2}\left[(1 + \cos\theta)^{2} - 1\right]d\theta = ${frac(A2, 2).tex()}\int_{-\pi/2}^{\pi/2} \left(2\cos\theta + \cos^{2}\theta\right)d\theta\).`,
        R`\(\displaystyle\int_{-\pi/2}^{\pi/2} 2\cos\theta\,d\theta = 4\) and \(\displaystyle\int_{-\pi/2}^{\pi/2} \cos^{2}\theta\,d\theta = \frac{\pi}{2}\), so the bracket integrates to \(4 + \dfrac{\pi}{2}\).`,
      ],
      ext: 2.3 * a, alt: `A cardioid r = ${a}(1 + cos θ) pointing right and a circle of radius ${a} centred at the origin. The region inside the cardioid but outside the circle is a crescent on the right.`,
    },
    circleMinus: {
      text: R`inside the circle \(r = ${a}\) and outside the cardioid \(r = ${card(a, '1 - \\cos\\theta')}\)`,
      outer: () => a, inner: (t) => a * (1 - Math.cos(t)), lo: -PI / 2, hi: PI / 2,
      right: K([[2 * A2, ''], [frac(-A2, 4), '\\pi']]),
      wrongs: [
        { k: K([[4 * A2, ''], [frac(-A2, 2), '\\pi']]), why: R`The area of a polar sector is \(\frac{1}{2}r^{2}\,d\theta\). Keep the \(\frac{1}{2}\).` },
        { k: K([[2 * A2, ''], [frac(A2, 4), '\\pi']]), why: R`Outer minus inner: \(1 - (1 - \cos\theta)^{2} = 2\cos\theta - \cos^{2}\theta\), with a minus sign on \(\cos^{2}\theta\).` },
        K([[2 * A2, '']]),
        piK(frac(A2, 2)),
        K([[A2, ''], [frac(-A2, 4), '\\pi']]),
      ],
      steps: [
        R`Intersections: \(${card(a, '1 - \\cos\\theta')} = ${a}\) gives \(\cos\theta = 0\), so \(\theta = \pm\frac{\pi}{2}\). The circle is outside the cardioid for \(-\frac{\pi}{2} < \theta < \frac{\pi}{2}\).`,
        R`\(A = \displaystyle\frac{1}{2}\int_{-\pi/2}^{\pi/2} ${A2 === 1 ? '' : A2}\left[1 - (1 - \cos\theta)^{2}\right]d\theta = ${frac(A2, 2).tex()}\int_{-\pi/2}^{\pi/2} \left(2\cos\theta - \cos^{2}\theta\right)d\theta\).`,
        R`\(\displaystyle\int_{-\pi/2}^{\pi/2} 2\cos\theta\,d\theta = 4\) and \(\displaystyle\int_{-\pi/2}^{\pi/2} \cos^{2}\theta\,d\theta = \frac{\pi}{2}\), so the bracket integrates to \(4 - \dfrac{\pi}{2}\).`,
      ],
      ext: 2.3 * a, alt: `A circle of radius ${a} centred at the origin and a cardioid r = ${a}(1 − cos θ) pointing left. The region inside the circle but outside the cardioid lies on the right.`,
    },
  }[fam];
  return q({
    prompt: R`Find the area of the region that lies ${set.text}.`,
    visual: polarPlot([{ r: set.outer }, { r: set.inner, color: 'b' }], set.ext, set.alt),
    ...exactChoices(set.right, set.wrongs),
    solution: [R`Area between polar curves: \(A = \displaystyle\frac{1}{2}\int_{\alpha}^{\beta} \left(r_{\text{outer}}^{2} - r_{\text{inner}}^{2}\right)d\theta\), between the angles where the curves meet.`, ...set.steps, R`\(A = ${set.right.tex}\).`],
    rule: 5,
    skill: 'area between polar curves',
    check: () => checkIntegral((t) => 0.5 * (set.outer(t) ** 2 - set.inner(t) ** 2), set.lo, set.hi, set.right.value),
  });
}

function challengeTangents(rng) {
  const c = rng.int(1, 4);
  const a = 2 * rng.intExcept(-3, 3, [c, -c]);
  const horizontal = rng.bool();
  const xTex = poly([1, a, 0], 't');
  const yTex = poly([1, 0, -3 * c * c, 0], 't');
  const tv = -a / 2;
  const T = (vals) => M(rootsTex(vals, 't'));
  return q({
    prompt: R`For which values of \(t\) does the curve \(x = ${xTex}\), \(y = ${yTex}\) have a ${horizontal ? 'horizontal' : 'vertical'} tangent line?`,
    correct: horizontal ? T([-c, c]) : T([tv]),
    wrong: horizontal
      ? [
          { value: T([tv]), why: R`At \(t = ${tv}\), \(\dfrac{dx}{dt} = 0\): that gives a vertical tangent. A horizontal tangent needs \(\dfrac{dy}{dt} = 0\).` },
          { value: T([c]), why: R`\(t^{2} = ${c * c}\) has two solutions, \(t = ${c}\) and \(t = ${-c}\).` },
          T([0]),
          T([-3 * c, 3 * c]),
          T([-c * c, c * c]),
        ]
      : [
          { value: T([-c, c]), why: R`At those values \(\dfrac{dy}{dt} = 0\): that gives horizontal tangents. A vertical tangent needs \(\dfrac{dx}{dt} = 0\).` },
          { value: T([-tv === tv ? 1 : -tv]), why: R`Solve \(${linear(2, a, 't')} = 0\) carefully: \(t = ${tv}\).` },
          T([-a === tv ? a + 1 : -a]),
          T([tv - 1, tv + 1]),
          T([2 * tv === tv ? 2 : 2 * tv]),
        ],
    solution: [
      R`\(\dfrac{dx}{dt} = ${linear(2, a, 't')}\) and \(\dfrac{dy}{dt} = 3t^{2} - ${3 * c * c}\).`,
      horizontal
        ? R`A horizontal tangent needs \(\dfrac{dy}{dt} = 0\) with \(\dfrac{dx}{dt} \ne 0\). \(3t^{2} - ${3 * c * c} = 0\) gives \(t = \pm ${c}\).`
        : R`A vertical tangent needs \(\dfrac{dx}{dt} = 0\) with \(\dfrac{dy}{dt} \ne 0\). \(${linear(2, a, 't')} = 0\) gives \(t = ${tv}\).`,
      horizontal
        ? R`Check: at \(t = ${c}\), \(\dfrac{dx}{dt} = ${2 * c + a}\); at \(t = ${-c}\), \(\dfrac{dx}{dt} = ${-2 * c + a}\). Neither is 0, so both give horizontal tangents.`
        : R`Check: at \(t = ${tv}\), \(\dfrac{dy}{dt} = ${3 * tv * tv - 3 * c * c}\), which is not 0. So the tangent there is vertical.`,
    ],
    rule: 0,
    skill: 'horizontal and vertical tangents',
    check: () => {
      const dx = (t) => 2 * t + a;
      const dy = (t) => 3 * t * t - 3 * c * c;
      return horizontal ? (dy(c) === 0 && dy(-c) === 0 && dx(c) !== 0 && dx(-c) !== 0 ? true : 'not horizontal tangents') : dx(tv) === 0 && dy(tv) !== 0 ? true : 'not a vertical tangent';
    },
  });
}

function challengeWordPosition(rng) {
  const p = 2 * rng.nonzero(-3, 3);
  const qv = 6 * rng.int(1, 3);
  const u1 = rng.int(-5, 5);
  const u2 = rng.int(-5, 5);
  const x0 = rng.int(-6, 6);
  const y0 = rng.int(-6, 6);
  const T = rng.int(1, 3);
  const vx = u1 + p * T;
  const vy = u2 + (qv * T * T) / 2;
  const rx = x0 + u1 * T + (p * T * T) / 2;
  const ry = y0 + u2 * T + (qv * T ** 3) / 6;
  const right = vec(rx, ry);
  return q({
    prompt: R`A small robot moves on a flat floor (distances in meters, time in seconds). Its acceleration is \(\vec{a}(t) = ${vec(String(p), terms([[qv, 't']]))}\). At \(t = 0\) its velocity is \(${vec(u1, u2)}\) and its position is \(${vec(x0, y0)}\). Where is the robot at \(t = ${T}\)?`,
    correct: M(right),
    wrong: [
      { value: M(vec(vx, vy)), why: R`That is the velocity at \(t = ${T}\). Integrate once more to get the position.` },
      { value: M(vec(x0 + (p * T * T) / 2, y0 + (qv * T ** 3) / 6)), why: R`The starting velocity \(${vec(u1, u2)}\) is the constant of integration for \(\vec{v}(t)\). It adds \(${vec(u1 * T, u2 * T)}\) to the position.` },
      { value: M(vec(rx - x0, ry - y0)), why: R`That is the displacement. Add the starting position \(${vec(x0, y0)}\).` },
      M(vec(x0 + u1 * T + p * T * T, y0 + u2 * T + (qv * T ** 3) / 2)),
      { value: M(vec(x0 + u1 * T, y0 + u2 * T)), why: R`That keeps the starting velocity for the whole trip. The acceleration changes the velocity, so integrate \(\vec{a}(t)\) first.` },
      // Never equal to the answer or to the two choices above (p, qv and T are nonzero), so three wrong choices always exist.
      M(vec(rx, y0 + u2 * T + (qv * T ** 3) / 3)),
      M(vec(ry, rx)),
    ],
    solution: [
      R`Integrate the acceleration and use \(\vec{v}(0) = ${vec(u1, u2)}\): \(\vec{v}(t) = ${vec(linear(p, u1, 't'), poly([qv / 2, 0, u2], 't'))}\).`,
      R`Integrate the velocity and use \(\vec{r}(0) = ${vec(x0, y0)}\): \(\vec{r}(t) = ${vec(poly([p / 2, u1, x0], 't'), poly([qv / 6, 0, u2, y0], 't'))}\).`,
      R`At \(t = ${T}\): \(\vec{r}(${T}) = ${right}\).`,
    ],
    rule: 3,
    skill: 'position from velocity and acceleration',
    check: () => (close(x0 + integrate((t) => u1 + p * t, 0, T), rx, 1e-6) && close(y0 + integrate((t) => u2 + (qv * t * t) / 2, 0, T), ry, 1e-6) && close(numDeriv((t) => u2 + (qv * t * t) / 2, T), qv * T, 1e-5) ? true : 'position does not match the integrals'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'parametric-polar',
  title: 'Parametric, Vector & Polar Calculus',
  summary: 'Find slopes, tangent lines, arc length, speed and area for curves given parametrically or in polar form.',
  standards: ['AP Calculus 9.1', 'AP Calculus 9.2', 'AP Calculus 9.3', 'AP Calculus 9.4', 'AP Calculus 9.5', 'AP Calculus 9.6', 'AP Calculus 9.7', 'AP Calculus 9.8', 'AP Calculus 9.9'],

  explain: {
    intro: R`Many curves are not graphs of \(y = f(x)\). A parametric curve gives \(x\) and \(y\) separately as functions of a third variable \(t\), often time; a vector-valued function packages them as \(\vec{r}(t) = \langle x(t), y(t)\rangle\); a polar curve gives the distance \(r\) from the origin for each direction \(\theta\). The tools of calculus carry over, as long as every derivative is taken with respect to the right variable.`,
    rules: [
      {
        title: 'Slope of a parametric curve',
        text: R`\(\dfrac{dy}{dx} = \dfrac{dy/dt}{dx/dt}\), wherever \(\dfrac{dx}{dt} \ne 0\). The tangent is horizontal where \(\dfrac{dy}{dt} = 0\) (and \(\dfrac{dx}{dt} \ne 0\)), and vertical where \(\dfrac{dx}{dt} = 0\) (and \(\dfrac{dy}{dt} \ne 0\)). For a tangent line, find the point \((x(t_{0}), y(t_{0}))\) and the slope at \(t_{0}\).`,
        example: R`\(x = t^{2}\), \(y = t^{3} - 3t\): \(\dfrac{dy}{dx} = \dfrac{3t^{2} - 3}{2t}\), which is \(\dfrac{9}{4}\) at \(t = 2\).`,
      },
      {
        title: 'Second derivative of a parametric curve',
        text: R`\(\dfrac{d^{2}y}{dx^{2}} = \dfrac{\dfrac{d}{dt}\left[\dfrac{dy}{dx}\right]}{\dfrac{dx}{dt}}\). Differentiate the slope with respect to \(t\), then divide by \(\dfrac{dx}{dt}\) once more. It is not the ratio of the two second derivatives.`,
        example: R`For \(x = t^{2}\), \(y = t^{3}\): \(\dfrac{dy}{dx} = \dfrac{3t}{2}\), so \(\dfrac{d^{2}y}{dx^{2}} = \dfrac{3/2}{2t} = \dfrac{3}{4t}\).`,
      },
      {
        title: 'Parametric arc length',
        text: R`The length of the curve for \(a \le t \le b\) is \(L = \displaystyle\int_{a}^{b} \sqrt{\left(\frac{dx}{dt}\right)^{2} + \left(\frac{dy}{dt}\right)^{2}}\,dt\).`,
        example: R`\(x = 3t\), \(y = 4t\), \(0 \le t \le 2\): \(L = \displaystyle\int_{0}^{2} 5\,dt = 10\).`,
      },
      {
        title: 'Motion in the plane: vector-valued functions',
        text: R`If \(\vec{r}(t) = \langle x(t), y(t)\rangle\) is position, then velocity is \(\vec{v}(t) = \langle x'(t), y'(t)\rangle\) and acceleration is \(\vec{a}(t) = \langle x''(t), y''(t)\rangle\). Speed is the length of the velocity vector, \(|\vec{v}| = \sqrt{x'(t)^{2} + y'(t)^{2}}\), and distance travelled is the integral of speed. Going backward, integrate each component and use the initial values.`,
        example: R`\(\vec{r}(t) = \langle t^{2}, 3t\rangle\): \(\vec{v}(t) = \langle 2t, 3\rangle\), and the speed at \(t = 2\) is \(\sqrt{16 + 9} = 5\).`,
      },
      {
        title: 'Slope of a polar curve',
        text: R`A polar curve \(r = f(\theta)\) is the parametric curve \(x = r\cos\theta\), \(y = r\sin\theta\) with parameter \(\theta\). So \(\dfrac{dy}{dx} = \dfrac{dy/d\theta}{dx/d\theta} = \dfrac{\frac{dr}{d\theta}\sin\theta + r\cos\theta}{\frac{dr}{d\theta}\cos\theta - r\sin\theta}\).`,
        example: R`\(r = 1 + \cos\theta\) at \(\theta = \frac{\pi}{2}\): \(r = 1\), \(\frac{dr}{d\theta} = -1\), so \(\dfrac{dy}{dx} = \dfrac{-1 + 0}{0 - 1} = 1\).`,
      },
      {
        title: 'Area in polar coordinates',
        text: R`A thin slice of a polar region is a sector of area \(\frac{1}{2}r^{2}\,d\theta\), so \(A = \displaystyle\frac{1}{2}\int_{\alpha}^{\beta} r^{2}\,d\theta\). Between two curves, \(A = \displaystyle\frac{1}{2}\int_{\alpha}^{\beta} \left(r_{\text{outer}}^{2} - r_{\text{inner}}^{2}\right)d\theta\), with limits at the angles where the curves meet.`,
        example: R`The circle \(r = 2\sin\theta\), \(0 \le \theta \le \pi\): \(A = \displaystyle\frac{1}{2}\int_{0}^{\pi} 4\sin^{2}\theta\,d\theta = \pi\).`,
      },
    ],
    vocab: [
      { term: 'parameter', def: R`The independent variable (often \(t\) or \(\theta\)) that both \(x\) and \(y\) depend on.` },
      { term: 'vector-valued function', def: R`A function whose outputs are vectors, such as a position \(\vec{r}(t) = \langle x(t), y(t)\rangle\).` },
      { term: 'speed', def: 'The magnitude (length) of the velocity vector. It is never negative.' },
      { term: 'polar coordinates', def: R`A point is located by its distance \(r\) from the origin and its angle \(\theta\) from the positive \(x\)-axis: \(x = r\cos\theta\), \(y = r\sin\theta\).` },
    ],
    mistakes: [
      R`Turning the slope upside down: \(\dfrac{dy}{dx}\) has \(\dfrac{dy}{dt}\) on top.`,
      R`Computing \(\dfrac{d^{2}y}{dx^{2}}\) as \(\dfrac{y''(t)}{x''(t)}\).`,
      R`Using \(\dfrac{dr}{d\theta}\) as the slope of a polar curve.`,
      R`Forgetting the \(\frac{1}{2}\) or the square in the polar area formula, or adding the velocity components to get the speed.`,
    ],
    visual: polarPlot([{ r: (t) => 1 + Math.cos(t) }], 2.4, 'The cardioid r = 1 + cos θ: a heart-shaped curve with its point at the origin, reaching out to x = 2 on the right.'),
  },

  examples: [
    {
      title: 'Tangent line and concavity of a parametric curve',
      problem: R`For \(x = t^{2}\), \(y = t^{3} - 3t\), find the tangent line at \(t = 2\) and the value of \(\dfrac{d^{2}y}{dx^{2}}\) there.`,
      steps: [
        R`Point: \(x = 4\), \(y = 8 - 6 = 2\).`,
        R`Slope: \(\dfrac{dy}{dx} = \dfrac{3t^{2} - 3}{2t} = \dfrac{9}{4}\) at \(t = 2\). Tangent line: \(y - 2 = \dfrac{9}{4}(x - 4)\).`,
        R`Write \(\dfrac{dy}{dx} = \dfrac{3}{2}t - \dfrac{3}{2t}\). Its \(t\)-derivative is \(\dfrac{3}{2} + \dfrac{3}{2t^{2}} = \dfrac{15}{8}\) at \(t = 2\).`,
        R`Divide by \(\dfrac{dx}{dt} = 4\): \(\dfrac{d^{2}y}{dx^{2}} = \dfrac{15}{32}\). The curve is concave up there.`,
      ],
      answer: R`Tangent line \(y = \frac{9}{4}x - 7\); \(\dfrac{d^{2}y}{dx^{2}} = \dfrac{15}{32}\)`,
    },
    {
      title: 'Arc length of a parametric curve',
      problem: R`Find the length of \(x = 3t^{2}\), \(y = 2t^{3}\) for \(0 \le t \le 1\).`,
      steps: [
        R`\(\dfrac{dx}{dt} = 6t\) and \(\dfrac{dy}{dt} = 6t^{2}\), so the speed is \(\sqrt{36t^{2} + 36t^{4}} = 6t\sqrt{1 + t^{2}}\).`,
        R`\(L = \displaystyle\int_{0}^{1} 6t\sqrt{1 + t^{2}}\,dt\). Substitute \(u = 1 + t^{2}\): an antiderivative is \(2(1 + t^{2})^{3/2}\).`,
        R`\(L = 2\cdot 2^{3/2} - 2 = 4\sqrt{2} - 2\).`,
      ],
      answer: R`\(4\sqrt{2} - 2 \approx 3.66\)`,
    },
    {
      title: 'Word problem: a robot on a factory floor',
      word: true,
      problem: R`A robot starts at the point \((1, 2)\) (in meters) and moves with velocity \(\vec{v}(t) = \langle 6t, 8t\rangle\) meters per second. Find its speed at \(t = 2\), its position at \(t = 2\), and the distance it has travelled by then.`,
      steps: [
        R`Speed: \(|\vec{v}(t)| = \sqrt{(6t)^{2} + (8t)^{2}} = 10t\). At \(t = 2\) the speed is 20 m/s.`,
        R`Position: integrate each component and add the starting point. \(\vec{r}(t) = \langle 1 + 3t^{2},\; 2 + 4t^{2}\rangle\), so \(\vec{r}(2) = \langle 13, 18\rangle\).`,
        R`Distance: \(\displaystyle\int_{0}^{2} 10t\,dt = 20\) m.`,
      ],
      answer: 'Speed 20 m/s; position (13, 18); distance travelled 20 m',
      visual: {
        type: 'plot',
        x: [0, 15],
        y: [0, 20],
        param: [{ x: (t) => 1 + 3 * t * t, y: (t) => 2 + 4 * t * t, t: [0, 2] }],
        points: [{ x: 1, y: 2, label: 't = 0' }, { x: 13, y: 18, label: 't = 2' }],
        alt: 'The path of the robot: a straight segment from (1, 2) at t = 0 to (13, 18) at t = 2.',
      },
    },
    {
      title: 'Area inside a polar curve',
      problem: R`Find the area enclosed by the cardioid \(r = 1 + \cos\theta\).`,
      steps: [
        R`The curve is traced once for \(0 \le \theta \le 2\pi\). \(A = \displaystyle\frac{1}{2}\int_{0}^{2\pi} (1 + \cos\theta)^{2}\,d\theta\).`,
        R`Expand: \((1 + \cos\theta)^{2} = 1 + 2\cos\theta + \cos^{2}\theta\), and \(\cos^{2}\theta = \dfrac{1 + \cos 2\theta}{2}\).`,
        R`Over a full turn the three terms integrate to \(2\pi\), \(0\) and \(\pi\). So \(A = \dfrac{1}{2}(3\pi)\).`,
      ],
      answer: R`\(\dfrac{3\pi}{2}\)`,
    },
  ],

  models: [
    {
      id: 'parametric-tangent',
      title: 'Tangent line to a parametric curve',
      intro: 'The curve is x = t² + a·t, y = t³ + b·t. Choose a, b and the parameter value t.',
      inputs: [
        { name: 'a', label: 'a', type: 'int', min: -4, max: 4, value: 0 },
        { name: 'b', label: 'b', type: 'int', min: -6, max: 6, value: -3 },
        { name: 't', label: 't', type: 'int', min: -3, max: 3, value: 2 },
      ],
      compute({ a, b, t }) {
        const X = (s) => s * s + a * s;
        const Y = (s) => s ** 3 + b * s;
        const x0 = X(t);
        const y0 = Y(t);
        const dx = 2 * t + a;
        const dy = 3 * t * t + b;
        const problem = R`Find the tangent line to \(x = ${poly([1, a, 0], 't')}\), \(y = ${poly([1, 0, b, 0], 't')}\) at \(t = ${t}\).`;
        if (dx === 0 && dy === 0) return { error: 'Both dx/dt and dy/dt are 0 at this value of t, so the slope cannot be found this way. Choose a different t.' };
        const pts = [];
        for (let i = 0; i <= 40; i++) pts.push([X(t - 2 + i / 10), Y(t - 2 + i / 10)]);
        const xr = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
        const yr = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
        const px = 0.1 * (xr[1] - xr[0] || 1);
        const py = 0.1 * (yr[1] - yr[0] || 1);
        const len = 0.35 * Math.max(xr[1] - xr[0], 1);
        const steps = [
          R`Point: \(x = ${x0}\), \(y = ${y0}\).`,
          R`\(\dfrac{dx}{dt} = ${linear(2, a, 't')} = ${dx}\) and \(\dfrac{dy}{dt} = ${poly([3, 0, b], 't')} = ${dy}\) at \(t = ${t}\).`,
        ];
        let answer;
        let seg;
        if (dx === 0) {
          steps.push(R`\(\dfrac{dx}{dt} = 0\) while \(\dfrac{dy}{dt} \ne 0\), so the tangent line is vertical.`);
          answer = R`The vertical line \(x = ${x0}\)`;
          seg = { from: [x0, y0 - 0.3 * (yr[1] - yr[0] || 2)], to: [x0, y0 + 0.3 * (yr[1] - yr[0] || 2)] };
        } else {
          const m = frac(dy, dx);
          const c = frac(y0).sub(m.mul(x0));
          steps.push(R`Slope: \(\dfrac{dy}{dx} = \dfrac{dy/dt}{dx/dt} = ${m.tex()}\)${dy === 0 ? ', so the tangent line is horizontal' : ''}.`);
          steps.push(R`Point-slope form: \(y - ${paren(y0)} = ${m.tex()}(x - ${paren(x0)})\).`);
          answer = R`\(y = ${terms([[m, 'x'], [c, '']])}\)`;
          const dxs = len / Math.sqrt(1 + m.value ** 2);
          seg = { from: [x0 - dxs, y0 - m.value * dxs], to: [x0 + dxs, y0 + m.value * dxs] };
        }
        return {
          problem,
          steps,
          answer,
          visual: {
            type: 'plot',
            x: [xr[0] - px, xr[1] + px],
            y: [yr[0] - py, yr[1] + py],
            param: [{ x: X, y: Y, t: [t - 2, t + 2] }],
            segments: [{ ...seg, dashed: true }],
            points: [{ x: x0, y: y0, label: `t = ${t}` }],
            alt: `The parametric curve near t = ${t}, with the point (${x0}, ${y0}) marked and its tangent line drawn as a dashed segment.`,
          },
        };
      },
    },
    {
      id: 'kicked-ball',
      title: 'Word problem: the flight of a kicked ball',
      word: true,
      intro: 'A ball is kicked from the ground. Choose the launch speed, the launch angle and a time, and read off the position, velocity and speed.',
      inputs: [
        { name: 'v0', label: 'Launch speed (m/s)', type: 'int', min: 5, max: 40, value: 20 },
        { name: 'deg', label: 'Launch angle (degrees)', type: 'int', min: 10, max: 80, value: 40 },
        { name: 't', label: 'Time (s)', type: 'number', min: 0, max: 8, step: 0.1, value: 1 },
      ],
      compute({ v0, deg, t }) {
        const al = (deg * PI) / 180;
        const ux = v0 * Math.cos(al);
        const uy = v0 * Math.sin(al);
        const land = uy / 4.9;
        if (t > land) return { error: `The ball lands after about ${num(land, { places: 2 })} seconds. Choose an earlier time.` };
        const p2 = { places: 2 };
        const X = (s) => ux * s;
        const Y = (s) => uy * s - 4.9 * s * s;
        const vy = uy - 9.8 * t;
        const speed = Math.hypot(ux, vy);
        const range = ux * land;
        const top = (uy * uy) / 19.6;
        return {
          problem: R`A ball is kicked from the ground at ${v0} m/s, at ${deg}° above the horizontal. Ignoring air resistance, where is it after ${num(t)} ${t === 1 ? 'second' : 'seconds'}, and how fast is it moving?`,
          steps: [
            R`The starting velocity has components \(${v0}\cos ${deg}^{\circ} \approx ${num(ux, p2)}\) and \(${v0}\sin ${deg}^{\circ} \approx ${num(uy, p2)}\) m/s. Gravity changes only the vertical part.`,
            R`Position: \(\vec{r}(t) = \langle ${num(ux, p2)}t,\; ${num(uy, p2)}t - 4.9t^{2}\rangle\). At \(t = ${num(t)}\): \(\langle ${num(X(t), p2)},\; ${num(Y(t), p2)}\rangle\) meters.`,
            R`Velocity: \(\vec{v}(t) = \vec{r}\,'(t) = \langle ${num(ux, p2)},\; ${num(uy, p2)} - 9.8t\rangle\). At \(t = ${num(t)}\): \(\langle ${num(ux, p2)},\; ${num(vy, p2)}\rangle\) m/s.`,
            R`Speed: \(|\vec{v}| = \sqrt{${num(ux, p2)}^{2} + ${paren(Math.round(vy * 100) / 100)}^{2}} \approx ${num(speed, p2)}\) m/s. The ball is ${Math.abs(vy) < 0.005 ? 'at its highest point' : vy > 0 ? 'still rising' : 'coming down'}.`,
          ],
          answer: R`About \(${num(X(t), { places: 1 })}\) m along the ground and \(${num(Y(t), { places: 1 })}\) m up, moving at about \(${num(speed, { places: 1 })}\) m/s`,
          visual: {
            type: 'plot',
            x: [0, range * 1.08],
            y: [0, Math.max(top * 1.25, 1)],
            param: [{ x: X, y: Y, t: [0, land] }],
            points: [{ x: X(t), y: Y(t), label: `t = ${num(t)}` }],
            axisLabels: ['x (m)', 'y (m)'],
            alt: `The path of the ball: an arch from the origin that reaches about ${num(top, { places: 1 })} meters high and lands about ${num(range, { places: 1 })} meters away. The ball's position at t = ${num(t)} seconds is marked.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyParamSlope, easyVelocityVector, easyPolarAreaSetup],
    medium: [mediumTangentLine, mediumWordSpeed, mediumPolarArea],
    hard: [hardSecondDerivative, hardParamArcLength, hardPolarSlope],
    challenge: [challengePolarBetween, challengeTangents, challengeWordPosition],
  },
};
