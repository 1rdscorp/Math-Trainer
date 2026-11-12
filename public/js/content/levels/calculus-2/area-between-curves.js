import { R, q, frac, terms, linear, poly, num, paren, polyEval, checkIntegral, checkEqual, integrate } from '../../lib/index.js';
import { M, K, N, exactChoices } from './_shared.js';

// A plot of the region between two curves on [a, b].
function regionPlot(top, bottom, a, b, { pad = 0.6, alt }) {
  const ys = [];
  for (let i = 0; i <= 40; i++) {
    const x = a - pad + ((b - a + 2 * pad) * i) / 40;
    ys.push(top(x), bottom(x));
  }
  const lo = Math.min(0, ...ys);
  const hi = Math.max(0, ...ys);
  const m = 0.08 * (hi - lo || 1);
  return { type: 'plot', x: [a - pad, b + pad], y: [lo - m, hi + m], fns: [{ f: top }, { f: bottom, color: 'b' }], shade: [{ f: top, g: bottom, from: a, to: b }], alt };
}

// ───────────── Easy ─────────────

function easyAverageValue(rng) {
  if (rng.bool()) {
    const c = rng.int(1, 6);
    const b = rng.pick([3, 6, 9]);
    const avg = (c * b * b) / 3;
    return q({
      prompt: R`Find the average value of \(f(x) = ${terms([[c, 'x^{2}']])}\) on the interval \([0, ${b}]\).`,
      correct: avg,
      wrong: [
        { value: (c * b ** 3) / 3, why: R`That is \(\int_{0}^{${b}} f(x)\,dx\). Divide by the length of the interval, \(${b}\).` },
        { value: (c * b * b) / 2, why: R`That averages the two endpoint values. The average value uses the integral: \(\frac{1}{b - a}\int_{a}^{b} f(x)\,dx\).` },
        c * b * b,
        (c * b * b) / 9,
      ],
      solution: [
        R`Average value \(= \dfrac{1}{b - a}\displaystyle\int_{a}^{b} f(x)\,dx = \dfrac{1}{${b}}\int_{0}^{${b}} ${terms([[c, 'x^{2}']])}\,dx\).`,
        R`\(\displaystyle\int_{0}^{${b}} ${terms([[c, 'x^{2}']])}\,dx = \Big[${terms([[frac(c, 3), 'x^{3}']])}\Big]_{0}^{${b}} = ${(c * b ** 3) / 3}\).`,
        R`Divide by \(${b}\): the average value is \(${avg}\).`,
      ],
      rule: 0,
      skill: 'average value',
      check: () => checkEqual(integrate((x) => c * x * x, 0, b) / b, avg, 1e-6, 'average'),
    });
  }
  const m = rng.nonzero(-5, 5);
  const k = rng.int(-6, 9);
  const a = rng.int(0, 4);
  const b = a + 2 * rng.int(1, 3);
  const mid = (a + b) / 2;
  const avg = m * mid + k;
  const F = (x) => (m * x * x) / 2 + k * x;
  return q({
    prompt: R`Find the average value of \(f(x) = ${linear(m, k)}\) on the interval \([${a}, ${b}]\).`,
    correct: avg,
    wrong: [
      { value: F(b) - F(a), why: R`That is \(\int_{${a}}^{${b}} f(x)\,dx\). Divide by the length of the interval, \(${b - a}\).` },
      { value: m * b + k, why: R`That is \(f(${b})\), the value at one end. The average value uses the whole interval.` },
      m * (b - a) + k,
      avg + m,
    ],
    solution: [
      R`Average value \(= \dfrac{1}{${b} - ${a}}\displaystyle\int_{${a}}^{${b}} (${linear(m, k)})\,dx\).`,
      R`\(\displaystyle\int_{${a}}^{${b}} (${linear(m, k)})\,dx = \Big[${terms([[frac(m, 2), 'x^{2}'], [k, 'x']])}\Big]_{${a}}^{${b}} = ${F(b) - F(a)}\).`,
      R`Divide by \(${b - a}\): the average value is \(${avg}\). (For a line this equals the value at the midpoint \(x = ${mid}\).)`,
    ],
    rule: 0,
    skill: 'average value',
    check: () => checkEqual(integrate((x) => m * x + k, a, b) / (b - a), avg, 1e-6, 'average'),
  });
}

function easySetUpArea(rng) {
  const k = rng.int(2, 6);
  const fam = rng.pick([
    () => {
      const a = rng.pick([-1, 0]);
      const b = rng.pick([1, 2]);
      return { top: `x^{2} + ${k}`, bottom: 'x', a, b, tJs: (x) => x * x + k, bJs: (x) => x, names: [`y = x² + ${k}`, 'y = x'] };
    },
    () => {
      const b = rng.int(1, 2);
      return { top: 'e^{x}', bottom: '-x', a: 0, b, tJs: Math.exp, bJs: (x) => -x, names: ['y = eˣ', 'y = −x'] };
    },
    () => {
      const c = rng.int(1, 2);
      return { top: String(k + 3), bottom: 'x^{2}', a: -c, b: c, tJs: () => k + 3, bJs: (x) => x * x, names: [`y = ${k + 3}`, 'y = x²'] };
    },
  ])();
  const { top, bottom, a, b } = fam;
  const wrapB = bottom.startsWith('-') ? `(${bottom})` : bottom;
  const I = (body) => M(R`\displaystyle\int_{${a}}^{${b}} \left[${body}\right]dx`);
  return q({
    prompt: R`The graph shows \(y = ${top}\) and \(y = ${bottom}\). Which integral gives the area of the shaded region between them from \(x = ${a}\) to \(x = ${b}\)?`,
    visual: regionPlot(fam.tJs, fam.bJs, a, b, { alt: `Graphs of ${fam.names[0]} (upper curve) and ${fam.names[1]} (lower curve). The region between them from x = ${a} to x = ${b} is shaded.` }),
    correct: I(`${top} - ${wrapB}`),
    wrong: [
      { value: I(`${bottom.startsWith('-') ? `(${bottom})` : bottom} - ${top.includes(' ') ? `(${top})` : top}`), why: 'Subtract the lower curve from the upper curve. This order gives the negative of the area.' },
      { value: I(`${top} + ${wrapB}`), why: 'The height of a thin vertical strip is a difference: top minus bottom.' },
      { value: I(top), why: 'That is the area between the upper curve and the x-axis. Subtract the part below the lower curve.' },
    ],
    solution: [
      R`Slice the region into thin vertical strips. Each strip has height (top curve) − (bottom curve) and width \(dx\).`,
      R`Here the top curve is \(y = ${top}\) and the bottom curve is \(y = ${bottom}\) on the whole interval.`,
      R`Area \(= \displaystyle\int_{${a}}^{${b}} \left[${top} - ${wrapB}\right]dx\).`,
    ],
    rule: 3,
    skill: 'setting up an area integral',
    check: () => (integrate((x) => fam.tJs(x) - fam.bJs(x), a, b) > 0 && [0, 0.25, 0.5, 0.75, 1].every((t) => fam.tJs(a + t * (b - a)) > fam.bJs(a + t * (b - a))) ? true : 'top curve is not above bottom curve'),
  });
}

function easyWordAccumulation(rng) {
  const a = rng.int(2, 12);
  const b = 2 * rng.int(1, 4);
  const V0 = rng.int(2, 12) * 10;
  const T = rng.int(2, 6);
  const added = a * T + (b * T * T) / 2;
  const total = V0 + added;
  return q({
    prompt: R`A tank holds ${V0} liters of water at time \(t = 0\). Water flows in at a rate of \(r(t) = ${linear(b, a, 't')}\) liters per minute. How much water is in the tank after ${T} minutes?`,
    correct: total,
    unit: 'liters',
    wrong: [
      { value: added, why: R`That is the amount that flowed in. Add the ${V0} liters that were already there.` },
      { value: V0 + (a + b * T) * T, why: R`The rate changes with time, so integrate it. Multiplying the final rate by the time overestimates.` },
      { value: V0 + a + b * T, why: R`That adds the rate at \(t = ${T}\) to the starting amount. A rate must be integrated over time to give an amount.` },
      V0 + a * T,
    ],
    solution: [
      R`Amount at time \(T\) = starting amount + \(\displaystyle\int_{0}^{T} r(t)\,dt\).`,
      R`\(\displaystyle\int_{0}^{${T}} (${linear(b, a, 't')})\,dt = \Big[${terms([[b / 2, 't^{2}'], [a, 't']])}\Big]_{0}^{${T}} = ${added}\) liters flow in.`,
      R`Total: \(${V0} + ${added} = ${total}\) liters.`,
    ],
    rule: 2,
    skill: 'accumulation from a rate',
    check: () => checkIntegral((t) => b * t + a, 0, T, total - V0),
  });
}

// ───────────── Medium ─────────────

function mediumAreaLineParabola(rng) {
  const r1 = rng.int(-3, 1);
  const r2 = r1 + rng.int(1, 4);
  const m = r1 + r2;
  const c = -r1 * r2;
  const w = r2 - r1;
  const area = frac(w ** 3, 6);
  const line = linear(m, c);
  const diff = terms([[m, 'x'], [c, ''], [-1, 'x^{2}']]);
  const F = (x) => (m * x * x) / 2 + c * x - x ** 3 / 3;
  return q({
    prompt: R`Find the area of the region enclosed by \(y = x^{2}\) and \(y = ${line}\).`,
    visual: regionPlot((x) => m * x + c, (x) => x * x, r1, r2, { alt: `The parabola y = x² and the line y = ${m}x + ${c}. They cross at x = ${r1} and x = ${r2}, and the region between them is shaded. The line is on top.` }),
    correct: area,
    wrong: [
      { value: area.neg(), why: 'Subtract the lower curve (the parabola) from the upper curve (the line). An area is never negative.' },
      { value: frac(3 * m * (r2 * r2 - r1 * r1) + 6 * c * w, 6), why: 'That is the area under the line only. Subtract the area under the parabola.' },
      frac(w ** 3, 3),
      frac(w ** 2, 6),
      frac(w ** 3, 2),
    ],
    solution: [
      R`Find where the curves meet: \(x^{2} = ${line}\) gives \(${poly([1, -m, -c])} = 0\), so \(x = ${r1}\) or \(x = ${r2}\).`,
      R`Between them the line is on top, so area \(= \displaystyle\int_{${r1}}^{${r2}} \left(${diff}\right)dx\).`,
      R`An antiderivative is \(${terms([[frac(m, 2), 'x^{2}'], [c, 'x'], [frac(-1, 3), 'x^{3}']])}\). Evaluating from \(${r1}\) to \(${r2}\) gives \(${area.tex()}\).`,
    ],
    rule: 3,
    skill: 'area between two curves',
    check: () => checkEqual(F(r2) - F(r1), area.value, 1e-9, 'area') === true && checkIntegral((x) => m * x + c - x * x, r1, r2, area.value),
  });
}

function mediumDistance(rng) {
  const a = 2 * rng.int(1, 4);
  const r = rng.int(1, 4);
  const T = r + rng.int(1, 4);
  const back = (a * r * r) / 2;
  const fwd = (a * (T - r) ** 2) / 2;
  const askDistance = rng.bool();
  const v = linear(a, -a * r, 't');
  const disp = fwd - back;
  const dist = fwd + back;
  return q({
    prompt: R`A particle moves along a line with velocity \(v(t) = ${v}\) meters per second for \(0 \le t \le ${T}\). Find ${askDistance ? 'the total distance it travels' : 'its displacement (net change in position)'}.`,
    correct: askDistance ? dist : disp,
    unit: 'm',
    wrong: askDistance
      ? [
          { value: disp, why: R`That is the displacement. The particle moves backward until \(t = ${r}\), and distance counts that part as positive.` },
          { value: fwd, why: R`That is only the forward part after \(t = ${r}\). Add the distance covered while moving backward.` },
          { value: back, why: R`That is only the backward part before \(t = ${r}\).` },
          dist + a,
        ]
      : [
          { value: dist, why: 'That is the total distance. Displacement lets the backward motion cancel part of the forward motion.' },
          { value: -disp === disp ? disp + a : -disp, why: 'Check the signs: the backward part is negative and the forward part is positive.' },
          fwd,
          -back,
        ],
    solution: [
      R`\(v(t) = 0\) at \(t = ${r}\). The velocity is negative before that and positive after.`,
      R`\(\displaystyle\int_{0}^{${r}} v(t)\,dt = ${-back}\) and \(\displaystyle\int_{${r}}^{${T}} v(t)\,dt = ${fwd}\).`,
      askDistance ? R`Total distance \(= \displaystyle\int_{0}^{${T}} |v(t)|\,dt = ${back} + ${fwd} = ${dist}\) m.` : R`Displacement \(= \displaystyle\int_{0}^{${T}} v(t)\,dt = ${-back} + ${fwd} = ${disp}\) m.`,
    ],
    rule: 1,
    skill: 'displacement and distance',
    check: () => checkIntegral(askDistance ? (t) => Math.abs(a * (t - r)) : (t) => a * (t - r), 0, T, askDistance ? dist : disp, 1e-4),
  });
}

function mediumWordAverage(rng) {
  const c = rng.int(10, 20);
  const a = rng.int(2, 6);
  const h = rng.pick([6, 12]);
  const b = h === 6 ? rng.pick([0.5, 1]) : 0.25;
  // T(t) = c + a·t − b·t²,  average over [0, h] = c + a·h/2 − b·h²/3
  const avg = c + (a * h) / 2 - (b * h * h) / 3;
  const T = terms([[c, ''], [a, 't'], [-b, 't^{2}']]);
  const integral = c * h + (a * h * h) / 2 - (b * h ** 3) / 3;
  return q({
    prompt: R`The temperature in a greenhouse \(t\) hours after sunrise is \(T(t) = ${T}\) degrees Celsius. What is the average temperature over the first ${h} hours?`,
    correct: avg,
    unit: '°C',
    wrong: [
      { value: integral, why: R`That is \(\int_{0}^{${h}} T(t)\,dt\). Divide by the length of the interval, ${h} hours.` },
      { value: (c + (c + a * h - b * h * h)) / 2, why: 'That averages only the first and last temperatures. The average value uses the integral over the whole interval.' },
      c + a * h - b * h * h,
      avg + a,
      avg - 2,
    ],
    solution: [
      R`Average value \(= \dfrac{1}{${h} - 0}\displaystyle\int_{0}^{${h}} \left(${T}\right)dt\).`,
      R`\(\displaystyle\int_{0}^{${h}} \left(${T}\right)dt = \Big[${terms([[c, 't'], [frac(a, 2), 't^{2}'], [frac(Math.round(-b * 12), 36), 't^{3}']])}\Big]_{0}^{${h}} = ${num(integral)}\).`,
      R`Divide by \(${h}\): the average temperature is \(${num(avg)}\) °C.`,
    ],
    rule: 0,
    skill: 'average value',
    check: () => checkEqual(integrate((t) => c + a * t - b * t * t, 0, h) / h, avg, 1e-6, 'average'),
  });
}

// ───────────── Hard ─────────────

function hardAreaInY(rng) {
  const k = rng.int(1, 3);
  const a = rng.int(0, k * (k + 1));
  const b = k * (k + 1) - a;
  // left curve x = y² − a, right curve x = y + b; they meet at y = −k and y = k + 1
  const y1 = -k;
  const y2 = k + 1;
  const w = y2 - y1;
  const area = frac(w ** 3, 6);
  const left = terms([[1, 'y^{2}'], [-a, '']]);
  const right = terms([[1, 'y'], [b, '']]);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const y = y1 + (w * i) / 24;
    pts.push([y * y - a, y]);
  }
  return q({
    prompt: R`Find the area of the region enclosed by \(x = ${left}\) and \(x = ${right}\).`,
    visual: {
      type: 'plot',
      x: [-a - 1.5, y2 + b + 1.5],
      y: [y1 - 1, y2 + 1],
      param: [{ x: (t) => t * t - a, y: (t) => t, t: [y1 - 1, y2 + 1] }, { x: (t) => t + b, y: (t) => t, t: [y1 - 1, y2 + 1], color: 'b' }],
      polygons: [{ points: pts }],
      alt: `A parabola opening to the right, x = y² − ${a}, and the line x = y + ${b}. They meet at y = ${y1} and y = ${y2}. The region between them is shaded: the line is on the right, the parabola on the left.`,
    },
    correct: area,
    wrong: [
      { value: area.neg(), why: 'Integrate (right curve) − (left curve). The line is to the right of the parabola here.' },
      { value: frac(w ** 3, 3), why: R`\(\displaystyle\int (y - y_1)(y_2 - y)\,dy\) over \([y_1, y_2]\) equals \(\frac{(y_2 - y_1)^{3}}{6}\). Check the arithmetic when you evaluate the antiderivative.` },
      frac(w ** 2, 2),
      frac(w ** 3, 2),
      frac(w ** 3 + 6, 6),
    ],
    solution: [
      R`Both curves give \(x\) in terms of \(y\), so slice horizontally and integrate in \(y\).`,
      R`Intersections: \(${left} = ${right}\) gives \(${poly([1, -1, -(a + b)], 'y')} = 0\), so \(y = ${y1}\) or \(y = ${y2}\).`,
      R`Area \(= \displaystyle\int_{${y1}}^{${y2}} \left[(${right}) - (${left})\right]dy = \int_{${y1}}^{${y2}} \left(${terms([[-1, 'y^{2}'], [1, 'y'], [a + b, '']])}\right)dy = ${area.tex()}\).`,
    ],
    rule: 4,
    skill: 'integrating with respect to y',
    check: () => checkIntegral((y) => y + b - (y * y - a), y1, y2, area.value),
  });
}

function hardCrossing(rng) {
  const a = rng.int(1, 3);
  const c = rng.int(1, 3);
  const A2 = a * a;
  const cubic = terms([[c, 'x^{3}']]);
  const line = terms([[c * A2, 'x']]);
  const whole = rng.bool(0.4);
  const b = a + rng.int(1, 2);
  const [lo, hi] = whole ? [-a, a] : [0, b];
  const first = frac(c * a ** 4, 4); // area of one piece between 0 and a
  const second = frac(c * b ** 4, 4).sub(frac(c * A2 * b * b, 2)).add(first); // area between a and b
  const area = whole ? first.mul(2) : first.add(second);
  const net = whole ? frac(0) : second.sub(first);
  return q({
    prompt: R`Find the total area between \(y = ${cubic}\) and \(y = ${line}\) from \(x = ${lo}\) to \(x = ${hi}\).`,
    visual: regionPlot((x) => c * x ** 3, (x) => c * A2 * x, lo, hi, { pad: 0.3, alt: `The cubic y = ${c}x³ and the line y = ${c * A2}x between x = ${lo} and x = ${hi}. The curves cross at x = ${whole ? `${-a}, 0 and ${a}` : `0 and ${a}`}, so the shaded region has parts where each curve is on top.` }),
    correct: area,
    wrong: [
      { value: net.abs(), why: 'The curves cross inside the interval, so a single integral lets the pieces cancel. Split at the crossing points and add the areas.' },
      { value: first, why: R`That is only one piece. Add the area of ${whole ? 'the other piece' : R`the piece from \(x = ${a}\) to \(x = ${b}\)`}.` },
      area.mul(2),
      area.add(frac(c, 2)),
      area.add(c),
    ],
    solution: [
      R`The curves meet where \(${cubic} = ${line}\): \(${c === 1 ? '' : c}x(x^{2} - ${A2}) = 0\), so \(x = 0\) or \(x = \pm ${a}\).`,
      whole
        ? R`On \([${-a}, 0]\) the cubic is on top; on \([0, ${a}]\) the line is on top. By symmetry the two pieces are equal: \(\displaystyle\int_{0}^{${a}} (${line} - ${cubic})\,dx = ${first.tex()}\).`
        : R`On \([0, ${a}]\) the line is on top: \(\displaystyle\int_{0}^{${a}} (${line} - ${cubic})\,dx = ${first.tex()}\). On \([${a}, ${b}]\) the cubic is on top: \(\displaystyle\int_{${a}}^{${b}} (${cubic} - ${line})\,dx = ${second.tex()}\).`,
      R`Add the pieces: total area \(= ${area.tex()}\).`,
    ],
    rule: 5,
    skill: 'curves that cross',
    check: () => checkIntegral((x) => Math.abs(c * x ** 3 - c * A2 * x), lo, hi, area.value, 1e-4),
  });
}

function hardWordDistance(rng) {
  const [r, s] = rng.pick([[1, 3], [1, 5], [1, 7], [2, 4], [2, 6], [2, 8], [3, 5], [3, 7], [4, 6], [4, 8], [5, 7], [6, 8]]);
  const scale = rng.int(1, 3);
  // v(t) = 3k(t − r)(t − s), with antiderivative P(t) = k(t³ − (3/2)(r + s)t² + 3rs·t)
  const coefs = [3 * scale, -3 * scale * (r + s), 3 * scale * r * s];
  const P = (t) => scale * (t ** 3 - 1.5 * (r + s) * t * t + 3 * r * s * t);
  const fwd = P(r);
  const back = P(r) - P(s);
  const dist = fwd + back;
  const disp = P(s);
  return q({
    prompt: R`A robot moves along a straight track with velocity \(v(t) = ${poly(coefs, 't')}\) meters per minute for \(0 \le t \le ${s}\). What total distance does it travel?`,
    correct: dist,
    unit: 'm',
    wrong: [
      { value: disp, why: R`That is the displacement \(\int_{0}^{${s}} v(t)\,dt\). The robot moves backward for \(${r} < t < ${s}\), and that part must be counted as positive.` },
      { value: fwd, why: R`That is only the forward part, up to \(t = ${r}\). Add the distance covered while moving backward.` },
      back,
      dist + 3 * scale,
      Math.abs(disp) + 2 * back,
    ],
    solution: [
      R`Factor: \(v(t) = ${3 * scale}(t - ${r})(t - ${s})\). The velocity is positive for \(0 \le t < ${r}\) and negative for \(${r} < t < ${s}\).`,
      R`An antiderivative is \(${poly([scale, frac(-3 * scale * (r + s), 2), 3 * scale * r * s, 0], 't')}\). Forward: \(\displaystyle\int_{0}^{${r}} v\,dt = ${num(fwd)}\). Backward: \(\displaystyle\int_{${r}}^{${s}} v\,dt = ${num(-back)}\).`,
      R`Total distance \(= \displaystyle\int_{0}^{${s}} |v(t)|\,dt = ${num(fwd)} + ${num(back)} = ${num(dist)}\) m.`,
    ],
    rule: 1,
    skill: 'displacement and distance',
    check: () => checkIntegral((t) => Math.abs(polyEval(coefs, t)), 0, s, dist, 1e-4),
  });
}

// ───────────── Challenge ─────────────

function challengeFindSlope(rng) {
  const k = rng.int(2, 9);
  const area = frac(k ** 3, 6);
  return q({
    prompt: R`The region enclosed by \(y = x^{2}\) and the line \(y = kx\) (with \(k > 0\)) has area \(${area.tex()}\). Find \(k\).`,
    correct: k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [
      { value: k + 1, why: R`The enclosed area is \(\frac{k^{3}}{6}\). Check: \(\frac{${(k + 1) ** 3}}{6}\) is too large.` },
      { value: k - 1, why: R`The enclosed area is \(\frac{k^{3}}{6}\). Check: \(\frac{${(k - 1) ** 3}}{6}\) is too small.` },
      2 * k,
      k + 2,
    ],
    solution: [
      R`The curves meet where \(x^{2} = kx\): at \(x = 0\) and \(x = k\). The line is on top between them.`,
      R`Area \(= \displaystyle\int_{0}^{k} (kx - x^{2})\,dx = \frac{k^{3}}{2} - \frac{k^{3}}{3} = \frac{k^{3}}{6}\).`,
      R`Set \(\dfrac{k^{3}}{6} = ${area.tex()}\): \(k^{3} = ${k ** 3}\), so \(k = ${k}\).`,
    ],
    rule: 3,
    skill: 'working backwards',
    check: () => checkIntegral((x) => k * x - x * x, 0, k, area.value),
  });
}

function challengeMeanValue(rng) {
  const m = rng.int(1, 5);
  if (rng.bool()) {
    const k = rng.int(0, 9);
    const b = 3 * m;
    const f = terms([[1, 'x^{2}'], [k, '']]);
    const right = K([[m, '\\sqrt{3}']]);
    return q({
      prompt: R`Let \(f(x) = ${f}\) on \([0, ${b}]\). At which \(c\) in the interval does \(f(c)\) equal the average value of \(f\)?`,
      ...exactChoices(right, [
        { k: N(frac(b, 2)), why: 'The midpoint works for a linear function. This function is curved, so compute the average value and solve.' },
        { k: N(3 * m * m + k), why: R`That is the average value itself. The question asks for the \(x\)-value \(c\) where \(f(c)\) equals it.` },
        K([[m, '\\sqrt{2}']]),
        N(m),
        K([[frac(m, 2), '\\sqrt{3}']]),
      ], (tex) => R`\(c = ${tex}\)`),
      solution: [
        R`Average value \(= \dfrac{1}{${b}}\displaystyle\int_{0}^{${b}} \left(${f}\right)dx = \dfrac{${b ** 3 / 3 + k * b}}{${b}} = ${3 * m * m + k}\).`,
        R`Solve \(f(c) = ${3 * m * m + k}\): \(c^{2} = ${3 * m * m}\).`,
        R`In the interval, \(c = ${right.tex}\).`,
      ],
      rule: 0,
      skill: 'mean value theorem for integrals',
      check: () => checkEqual(right.value ** 2 + k, integrate((x) => x * x + k, 0, b) / b, 1e-6, 'f(c)'),
    });
  }
  const a = rng.int(1, 6);
  const b = 9 * m;
  const f = terms([[a, '\\sqrt{x}']]);
  return q({
    prompt: R`Let \(f(x) = ${f}\) on \([0, ${b}]\). At which \(c\) in the interval does \(f(c)\) equal the average value of \(f\)?`,
    correct: 4 * m,
    fmt: (v) => R`\(c = ${num(v)}\)`,
    wrong: [
      { value: frac(b, 2), why: 'The midpoint works for a linear function. This function is curved, so compute the average value and solve.' },
      { value: b, why: R`\(f(${b})\) is the largest value on the interval, so it cannot be the average.` },
      2 * m,
      6 * m,
    ],
    solution: [
      R`\(\displaystyle\int_{0}^{${b}} ${f}\,dx = \Big[${terms([[frac(2 * a, 3), 'x^{3/2}']])}\Big]_{0}^{${b}} = ${terms([[frac(2 * a, 3), `\\cdot ${b}\\sqrt{${b}}`]])}\). Dividing by \(${b}\), the average value is \(${terms([[frac(2 * a, 3), `\\sqrt{${b}}`]])}\).`,
      R`Solve \(${terms([[a, '\\sqrt{c}']])} = ${terms([[frac(2 * a, 3), `\\sqrt{${b}}`]])}\): \(\sqrt{c} = \frac{2}{3}\sqrt{${b}}\).`,
      R`Square both sides: \(c = \frac{4}{9}\cdot ${b} = ${4 * m}\).`,
    ],
    rule: 0,
    skill: 'mean value theorem for integrals',
    check: () => checkEqual(a * Math.sqrt(4 * m), integrate((x) => a * Math.sqrt(x), 0, b, 20000) / b, 1e-4, 'f(c)'),
  });
}

function challengeWordTank(rng) {
  const qOut = rng.int(1, 4);
  const r = rng.int(2, 6);
  const p = qOut * r;
  const V0 = rng.int(1, 9) * 10;
  let T = r + rng.int(2, 4);
  while (V0 + p * T - (qOut * T * T) / 2 < 5) T -= 1; // the tank must not run dry
  if (T <= r) T = r + 1;
  const max = V0 + (p * r) / 2;
  const end = V0 + p * T - (qOut * T * T) / 2;
  return q({
    prompt: R`A tank holds ${V0} liters at \(t = 0\). Water is pumped in at a constant ${p} liters per minute, and it drains out at a rate of \(${terms([[qOut, 't']])}\) liters per minute, for \(0 \le t \le ${T}\). What is the greatest amount of water in the tank during this time?`,
    correct: max,
    unit: 'liters',
    wrong: [
      { value: end, why: R`That is the amount at \(t = ${T}\). After \(t = ${r}\) the tank loses water faster than it gains, so the maximum came earlier.` },
      { value: V0 + p * r, why: 'That ignores the water draining out. Integrate the net rate: rate in minus rate out.' },
      { value: (p * r) / 2, why: R`That is the net gain up to \(t = ${r}\). Add the ${V0} liters the tank started with.` },
      V0 + p * T,
      max + p,
    ],
    solution: [
      R`Net rate \(= ${terms([[p, ''], [-qOut, 't']])}\) liters per minute. It is positive until \(t = ${r}\) and negative afterwards, so the amount is greatest at \(t = ${r}\).`,
      R`Net gain: \(\displaystyle\int_{0}^{${r}} (${terms([[p, ''], [-qOut, 't']])})\,dt = ${p * r} - ${(qOut * r * r) / 2} = ${(p * r) / 2}\) liters.`,
      R`Greatest amount: \(${V0} + ${(p * r) / 2} = ${max}\) liters.`,
    ],
    rule: 2,
    skill: 'accumulation from a rate',
    check: () => {
      let best = -1;
      for (let i = 0; i <= 400; i++) best = Math.max(best, V0 + integrate((t) => p - qOut * t, 0, (T * i) / 400, 200));
      return checkEqual(best, max, 1e-3, 'maximum amount');
    },
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'area-between-curves',
  title: 'Average Value & Area Between Curves',
  summary: 'Use definite integrals for average value, distance travelled, accumulated change and the area between curves.',
  standards: ['AP Calculus 8.1', 'AP Calculus 8.2', 'AP Calculus 8.3', 'AP Calculus 8.4', 'AP Calculus 8.5', 'AP Calculus 8.6'],

  explain: {
    intro: R`A definite integral adds up infinitely many thin pieces. The same idea gives the average height of a graph, the distance a particle travels, the amount that accumulates from a rate, and the area trapped between two curves. In each case, decide what one thin piece is, then integrate.`,
    rules: [
      {
        title: 'Average value of a function',
        text: R`The average value of \(f\) on \([a, b]\) is \(f_{\text{avg}} = \dfrac{1}{b - a}\displaystyle\int_{a}^{b} f(x)\,dx\): the integral divided by the length of the interval. It is the height of the rectangle with the same area.`,
        example: R`On \([0, 3]\), \(f(x) = x^{2}\) has average value \(\dfrac{1}{3}\displaystyle\int_{0}^{3} x^{2}\,dx = \dfrac{9}{3} = 3\).`,
      },
      {
        title: 'Displacement and total distance',
        text: R`For velocity \(v(t)\): displacement \(= \displaystyle\int_{a}^{b} v(t)\,dt\) (backward motion cancels forward motion), and total distance \(= \displaystyle\int_{a}^{b} |v(t)|\,dt\). To integrate \(|v|\), split the interval where \(v\) changes sign.`,
        example: R`If \(v(t) = 2t - 4\) on \([0, 5]\): displacement \(= 5\), but distance \(= 4 + 9 = 13\).`,
      },
      {
        title: 'Accumulation from a rate',
        text: R`The integral of a rate of change is the net change: \(\displaystyle\int_{a}^{b} r(t)\,dt = Q(b) - Q(a)\). So the amount at time \(b\) is the starting amount plus the integral of the rate.`,
        example: R`A tank starts with 50 L and fills at \(r(t) = 6t\) L/min. After 3 minutes it holds \(50 + \displaystyle\int_{0}^{3} 6t\,dt = 77\) L.`,
      },
      {
        title: 'Area between curves: top minus bottom',
        text: R`If \(f(x) \ge g(x)\) on \([a, b]\), the area between them is \(\displaystyle\int_{a}^{b} \big[f(x) - g(x)\big]\,dx\). When the region is enclosed by the curves, the limits are the \(x\)-values where the curves intersect: solve \(f(x) = g(x)\).`,
        example: R`\(y = x\) and \(y = x^{2}\) meet at \(x = 0\) and \(x = 1\). Area \(= \displaystyle\int_{0}^{1} (x - x^{2})\,dx = \frac{1}{6}\).`,
      },
      {
        title: 'Integrating in y: right minus left',
        text: R`When the curves are given as \(x = \) (function of \(y\)), slice horizontally: area \(= \displaystyle\int_{c}^{d} \big[x_{\text{right}}(y) - x_{\text{left}}(y)\big]\,dy\), with \(y\)-values as limits.`,
        example: R`\(x = y^{2}\) and \(x = y + 2\) meet at \(y = -1\) and \(y = 2\). Area \(= \displaystyle\int_{-1}^{2} (y + 2 - y^{2})\,dy = \frac{9}{2}\).`,
      },
      {
        title: 'Curves that cross',
        text: R`If the curves cross inside the interval, the top and bottom swap. Split the integral at each crossing point and add the positive pieces: area \(= \displaystyle\int_{a}^{b} |f(x) - g(x)|\,dx\).`,
        example: R`Between \(y = x^{3}\) and \(y = x\) on \([-1, 1]\): \(\displaystyle\int_{-1}^{0} (x^{3} - x)\,dx + \int_{0}^{1} (x - x^{3})\,dx = \frac{1}{4} + \frac{1}{4} = \frac{1}{2}\).`,
      },
    ],
    vocab: [
      { term: 'average value', def: R`\(\frac{1}{b - a}\int_{a}^{b} f(x)\,dx\): the constant height that would give the same integral over \([a, b]\).` },
      { term: 'displacement', def: 'The net change in position: final position minus starting position. It can be negative.' },
      { term: 'total distance', def: 'The length of the path actually travelled. It is never negative.' },
      { term: 'net change', def: 'The integral of a rate of change over an interval.' },
    ],
    mistakes: [
      R`Forgetting to divide by \(b - a\) in the average value.`,
      R`Reporting displacement when total distance is asked for. Distance needs \(|v(t)|\).`,
      R`Subtracting in the wrong order. Area is (top − bottom) or (right − left), so the integrand is never negative.`,
      R`Integrating straight across a crossing point, which lets two regions cancel.`,
    ],
    visual: {
      type: 'plot',
      x: [-0.5, 1.6],
      y: [-0.2, 1.6],
      fns: [{ f: (x) => x, label: 'y = x', labelAt: 1.35 }, { f: (x) => x * x, color: 'b', label: 'y = x²', labelAt: 1.15 }],
      shade: [{ f: (x) => x, g: (x) => x * x, from: 0, to: 1 }],
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      alt: 'The line y = x and the parabola y = x squared cross at (0, 0) and (1, 1). The region between them is shaded. The line is on top, so the area is the integral of x minus x squared from 0 to 1, which is one sixth.',
    },
  },

  examples: [
    {
      title: 'Area enclosed by a line and a parabola',
      problem: R`Find the area of the region enclosed by \(y = x^{2}\) and \(y = x + 2\).`,
      steps: [
        R`Intersections: \(x^{2} = x + 2\) gives \(x^{2} - x - 2 = 0\), so \(x = -1\) or \(x = 2\).`,
        R`Test a point between them: at \(x = 0\) the line gives 2 and the parabola gives 0, so the line is on top.`,
        R`Area \(= \displaystyle\int_{-1}^{2} (x + 2 - x^{2})\,dx = \Big[\tfrac{1}{2}x^{2} + 2x - \tfrac{1}{3}x^{3}\Big]_{-1}^{2} = \tfrac{10}{3} - \left(-\tfrac{7}{6}\right)\).`,
      ],
      answer: R`\(\frac{9}{2}\) square units`,
      visual: regionPlot((x) => x + 2, (x) => x * x, -1, 2, { alt: 'The parabola y = x squared and the line y = x + 2 cross at x = −1 and x = 2. The region between them is shaded, with the line on top.' }),
    },
    {
      title: 'Integrating with respect to y',
      problem: R`Find the area of the region enclosed by \(x = y^{2}\) and \(x = y + 2\).`,
      steps: [
        R`Both curves give \(x\) in terms of \(y\), so use horizontal slices. Intersections: \(y^{2} = y + 2\) gives \(y = -1\) or \(y = 2\).`,
        R`For \(-1 < y < 2\) the line \(x = y + 2\) is to the right of the parabola.`,
        R`Area \(= \displaystyle\int_{-1}^{2} (y + 2 - y^{2})\,dy = \tfrac{9}{2}\). (Integrating in \(x\) would need two separate integrals.)`,
      ],
      answer: R`\(\frac{9}{2}\) square units`,
    },
    {
      title: 'Average value',
      problem: R`Find the average value of \(f(x) = \sin x\) on \([0, \pi]\).`,
      steps: [
        R`Average value \(= \dfrac{1}{\pi - 0}\displaystyle\int_{0}^{\pi} \sin x\,dx\).`,
        R`\(\displaystyle\int_{0}^{\pi} \sin x\,dx = \Big[-\cos x\Big]_{0}^{\pi} = 1 + 1 = 2\).`,
      ],
      answer: R`\(\dfrac{2}{\pi} \approx 0.64\)`,
    },
    {
      title: 'Word problem: distance and displacement',
      word: true,
      problem: R`A delivery robot moves along a hallway with velocity \(v(t) = t^{2} - 4t + 3\) meters per minute for \(0 \le t \le 3\). Find its displacement and the total distance it travels.`,
      steps: [
        R`Factor: \(v(t) = (t - 1)(t - 3)\). The robot moves forward for \(0 \le t < 1\) and backward for \(1 < t < 3\).`,
        R`An antiderivative is \(\tfrac{1}{3}t^{3} - 2t^{2} + 3t\). Forward: \(\displaystyle\int_{0}^{1} v\,dt = \tfrac{4}{3}\). Backward: \(\displaystyle\int_{1}^{3} v\,dt = -\tfrac{4}{3}\).`,
        R`Displacement \(= \tfrac{4}{3} - \tfrac{4}{3} = 0\): the robot ends where it started. Distance \(= \tfrac{4}{3} + \tfrac{4}{3}\).`,
      ],
      answer: R`Displacement 0 m; total distance \(\frac{8}{3} \approx 2.67\) m`,
      visual: {
        type: 'plot',
        x: [0, 3.4],
        y: [-1.4, 3.3],
        fns: [{ f: (t) => t * t - 4 * t + 3 }],
        shade: [{ f: (t) => t * t - 4 * t + 3, from: 0, to: 1 }, { f: (t) => t * t - 4 * t + 3, from: 1, to: 3, color: 'b' }],
        axisLabels: ['t (min)', 'v (m/min)'],
        alt: 'Graph of the velocity t squared minus 4t plus 3. It is positive from t = 0 to t = 1 and negative from t = 1 to t = 3. The area above the axis and the area below the axis are both four thirds.',
      },
    },
  ],

  models: [
    {
      id: 'line-and-parabola',
      title: 'Area between y = x² and a line',
      intro: 'Choose the slope and the intercept of the line y = mx + c. See where it crosses the parabola and the area it cuts off.',
      inputs: [
        { name: 'm', label: 'Slope m', type: 'int', min: -4, max: 4, value: 1 },
        { name: 'c', label: 'Intercept c', type: 'int', min: -3, max: 8, value: 2 },
      ],
      compute({ m, c }) {
        const disc = m * m + 4 * c;
        if (disc <= 0) return { error: disc === 0 ? 'This line only touches the parabola at one point, so no region is enclosed. Raise the intercept c.' : 'This line does not meet the parabola, so no region is enclosed. Raise the intercept c.' };
        const root = Math.sqrt(disc);
        const x1 = (m - root) / 2;
        const x2 = (m + root) / 2;
        const area = disc ** 1.5 / 6;
        const exact = Number.isInteger(root);
        const p2 = { places: 3 };
        const line = linear(m, c);
        return {
          problem: R`Find the area enclosed by \(y = x^{2}\) and \(y = ${line}\).`,
          steps: [
            R`Intersections: \(x^{2} = ${line}\), so \(${poly([1, -m, -c])} = 0\). The quadratic formula gives \(x = \dfrac{${m} \pm \sqrt{${disc}}}{2}\): \(x_{1} ${exact ? '=' : '\\approx'} ${num(x1, p2)}\) and \(x_{2} ${exact ? '=' : '\\approx'} ${num(x2, p2)}\).`,
            R`Between the intersections the line is above the parabola, so the height of a thin strip is \(${line.includes(' ') ? `(${line})` : line} - x^{2}\).`,
            R`Area \(= \displaystyle\int_{${num(x1, p2)}}^{${num(x2, p2)}} \left(${terms([[m, 'x'], [c, ''], [-1, 'x^{2}']])}\right)dx = \Big[${terms([[frac(m, 2), 'x^{2}'], [c, 'x'], [frac(-1, 3), 'x^{3}']])}\Big]_{${num(x1, p2)}}^{${num(x2, p2)}}\).`,
            R`Evaluating gives \(${exact ? frac(root ** 3, 6).tex() : num(area, p2)}\). (For any line and \(y = x^{2}\), the area is \(\frac{(x_{2} - x_{1})^{3}}{6}\).)`,
          ],
          answer: exact ? R`\(${frac(root ** 3, 6).tex()}\) square units${Number.isInteger(root ** 3 / 6) ? '' : R` (about \(${num(area, { places: 2 })}\))`}` : R`About \(${num(area, { places: 2 })}\) square units`,
          visual: regionPlot((x) => m * x + c, (x) => x * x, x1, x2, { pad: 0.8, alt: `The parabola y = x² and the line y = ${m}x + ${c}. They cross near x = ${num(x1, { places: 2 })} and x = ${num(x2, { places: 2 })}, and the region between them is shaded. Its area is about ${num(area, { places: 2 })}.` }),
        };
      },
    },
    {
      id: 'braking-cart',
      title: 'Word problem: distance versus displacement',
      word: true,
      intro: 'A cart rolls up a ramp, slows down, and rolls back. Change the starting speed, the deceleration and the time.',
      inputs: [
        { name: 'v0', label: 'Starting velocity (m/s)', type: 'int', min: 1, max: 20, value: 6 },
        { name: 'a', label: 'Deceleration (m/s²)', type: 'int', min: 1, max: 10, value: 2 },
        { name: 'T', label: 'Time T (s)', type: 'int', min: 1, max: 20, value: 5 },
      ],
      compute({ v0, a, T }) {
        const v = (t) => v0 - a * t;
        const stop = v0 / a;
        const disp = v0 * T - (a * T * T) / 2;
        const up = T <= stop ? disp : (v0 * v0) / (2 * a);
        const down = T <= stop ? 0 : (a * (T - stop) ** 2) / 2;
        const p2 = { places: 2 };
        const vTex = terms([[v0, ''], [-a, 't']]);
        const steps = [
          R`Displacement \(= \displaystyle\int_{0}^{${T}} (${vTex})\,dt = \Big[${terms([[v0, 't'], [frac(-a, 2), 't^{2}']])}\Big]_{0}^{${T}} = ${num(disp, p2)}\) m.`,
          R`The velocity is 0 when \(${vTex} = 0\), at \(t = ${num(stop, p2)}\) s.`,
        ];
        if (T <= stop) steps.push(R`That is not before \(t = ${T}\), so the cart never turns around in this time. Distance and displacement are equal.`);
        else {
          steps.push(R`Up the ramp (\(0 \le t \le ${num(stop, p2)}\)): \(${num(up, p2)}\) m. Back down (\(${num(stop, p2)} \le t \le ${T}\)): \(\displaystyle\int v\,dt = ${num(-down, p2)}\) m.`);
          steps.push(R`Total distance \(= \displaystyle\int_{0}^{${T}} |v(t)|\,dt = ${num(up, p2)} + ${num(down, p2)} = ${num(up + down, p2)}\) m.`);
        }
        return {
          problem: R`A cart rolls up a ramp with velocity \(v(t) = ${vTex}\) meters per second. Find its displacement and the total distance it travels in the first ${T} seconds.`,
          steps,
          answer: R`Displacement \(${num(disp, p2)}\) m; total distance \(${num(up + down, p2)}\) m`,
          visual: {
            type: 'plot',
            x: [0, T * 1.1],
            y: [Math.min(-1, v(T) * 1.15), v0 * 1.15],
            fns: [{ f: v }],
            shade: T <= stop ? [{ f: v, from: 0, to: T }] : [{ f: v, from: 0, to: stop }, { f: v, from: stop, to: T, color: 'b' }],
            axisLabels: ['t (s)', 'v (m/s)'],
            alt: `Graph of the velocity, a line falling from ${v0} m/s. ${T <= stop ? 'It stays at or above 0 for the whole time, so all the shaded area counts as forward motion.' : `It crosses 0 at t = ${num(stop, p2)} s. The area above the axis is the distance up the ramp and the area below the axis is the distance back down.`}`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyAverageValue, easySetUpArea, easyWordAccumulation],
    medium: [mediumAreaLineParabola, mediumDistance, mediumWordAverage],
    hard: [hardAreaInY, hardCrossing, hardWordDistance],
    challenge: [challengeFindSlope, challengeMeanValue, challengeWordTank],
  },
};
