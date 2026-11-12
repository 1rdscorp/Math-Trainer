import { R, q, terms, linear, num, txt, round, sqrtTex, checkEqual } from '../../lib/index.js';
import { M, Surd, surd, SPECIAL, toRad, toDeg, norm360, quadrant, sinDeg, cosDeg, piTex, radTex, apart, dec } from './_shared.js';

const QUAD = ['', 'I', 'II', 'III', 'IV'];
const cosR = (d) => Math.cos(toRad(d));
const sinR = (d) => Math.sin(toRad(d));
// A complex number with exact (Surd) parts as LaTeX: "-2\sqrt{3} + 2i", "3i", "-4".
function cx(re, im) {
  const part = (v) => (v.r === 1 && v.d === 1 ? (v.n === 1 ? 'i' : `${v.n}i`) : v.r === 1 ? `${v.tex()}i` : R`${v.tex()}\,i`);
  if (im.isZero()) return re.tex();
  if (re.isZero()) return `${im.value < 0 ? '-' : ''}${part(im.abs())}`;
  return `${re.tex()} ${im.value < 0 ? '-' : '+'} ${part(im.abs())}`;
}
const pt = (x, y) => R`\(\left(${x},\ ${y}\right)\)`;
// The exact point at distance r (a Surd) and angle d degrees.
const polarXY = (r, d) => [r.mul(cosDeg(d)), r.mul(sinDeg(d))];
// A modulus that keeps x and y free of nested radicals: k√2 on the diagonals, 2k at 30°/60°, k on the axes.
const niceR = (rng, d) => (d % 90 === 0 ? surd(rng.int(2, 6)) : d % 45 === 0 ? surd(rng.int(1, 5), 1, 2) : surd(2 * rng.int(1, 4)));
const cis = (rTex, angleTex) => R`${rTex === '1' ? '' : rTex}\left(\cos ${angleTex} + i\sin ${angleTex}\right)`;
const cpow = ([a, b], n) => { let [x, y] = [1, 0]; for (let i = 0; i < n; i++) [x, y] = [x * a - y * b, x * b + y * a]; return [x, y]; };
const near = (p, w, tol = 1e-6) => Math.hypot(p[0] - w[0], p[1] - w[1]) < tol * Math.max(1, Math.hypot(w[0], w[1]));

// ───────────── Easy ─────────────

function easyPolarToRect(rng) {
  const d = rng.pick(SPECIAL.filter((a) => a > 0));
  const r = rng.int(2, 10);
  const [x, y] = polarXY(surd(r), d);
  const qd = quadrant(d);
  return q({
    prompt: R`Convert the polar point \(\left(${r},\ ${radTex(d)}\right)\) to rectangular coordinates.`,
    correct: pt(x.tex(), y.tex()),
    wrong: [
      !x.eq(y) ? { value: pt(y.tex(), x.tex()), why: R`\(x = r\cos\theta\) and \(y = r\sin\theta\). These are the other way round.` } : null,
      qd ? { value: pt(x.neg().tex(), y.tex()), why: R`\(${radTex(d)}\) is in Quadrant ${QUAD[qd]}, where \(x\) is ${x.value > 0 ? 'positive' : 'negative'}.` } : null,
      qd ? { value: pt(x.tex(), y.neg().tex()), why: R`\(${radTex(d)}\) is in Quadrant ${QUAD[qd]}, where \(y\) is ${y.value > 0 ? 'positive' : 'negative'}.` } : null,
      { value: pt(cosDeg(d).tex(), sinDeg(d).tex()), why: R`That is the point on the unit circle. Multiply both coordinates by \(r = ${r}\).` },
      pt(x.neg().tex(), y.neg().tex()),
      pt(String(r), '0'),
    ],
    solution: [
      R`\(x = r\cos\theta = ${r}\cos ${radTex(d)} = ${r} \cdot ${cosDeg(d).value < 0 ? `\\left(${cosDeg(d).tex()}\\right)` : cosDeg(d).tex()} = ${x.tex()}\).`,
      R`\(y = r\sin\theta = ${r}\sin ${radTex(d)} = ${r} \cdot ${sinDeg(d).value < 0 ? `\\left(${sinDeg(d).tex()}\\right)` : sinDeg(d).tex()} = ${y.tex()}\).`,
      R`The point is \(\left(${x.tex()},\ ${y.tex()}\right)\).`,
    ],
    rule: 1,
    skill: 'polar to rectangular',
    check: () => checkEqual(x.value, r * cosR(d)) === true && checkEqual(y.value, r * sinR(d)),
  });
}

function easyModulus(rng) {
  const [a, b] = rng.bool(0.4) ? rng.pick([[3, 4], [4, 3], [5, 12], [12, 5], [6, 8], [8, 6], [8, 15]]).map((v) => v * rng.sign()) : [rng.nonzero(-9, 9), rng.nonzero(-9, 9)];
  const n = a * a + b * b;
  const z = terms([[a, ''], [b, 'i']]);
  return q({
    prompt: R`Find the modulus \(|z|\) of \(z = ${z}\).`,
    correct: M(sqrtTex(n)),
    wrong: [
      { value: M(String(n)), why: R`That is \(|z|^{2}\). Take the square root.` },
      { value: M(String(Math.abs(a) + Math.abs(b))), why: 'The modulus is the straight-line distance from the origin, found with the Pythagorean theorem, not the sum of the two parts.' },
      Math.abs(a) !== Math.abs(b) ? { value: M(sqrtTex(Math.abs(a * a - b * b))), why: R`Use \(a^{2} + b^{2}\). The \(i\) is not squared: \(b\) is an ordinary length.` } : null,
      M(sqrtTex(n + 1)),
      M(String(Math.max(Math.abs(a), Math.abs(b)))),
    ],
    solution: [
      R`In the complex plane \(z = ${z}\) is the point \((${a}, ${b})\). Its modulus is its distance from the origin.`,
      R`\(|z| = \sqrt{a^{2} + b^{2}} = \sqrt{(${a})^{2} + (${b})^{2}} = \sqrt{${n}}${sqrtTex(n) === R`\sqrt{${n}}` ? '' : ` = ${sqrtTex(n)}`}\).`,
    ],
    rule: 4,
    skill: 'modulus',
    check: () => checkEqual(Math.hypot(a, b) ** 2, n),
  });
}

function easyPlotPoint(rng) {
  const letters = ['A', 'B', 'C', 'D'];
  const complex = rng.bool();
  let spots;
  let prompt;
  let steps;
  let lim;
  let circle = [];
  if (complex) {
    const a = rng.nonzero(-5, 5);
    const b = rng.intExcept(-5, 5, [0, a, -a]);
    spots = [[a, b, null], [b, a, 'The real part is the horizontal coordinate and the imaginary part is the vertical one.'], [a, -b, R`That point is the conjugate, \(${terms([[a, ''], [-b, 'i']])}\).`], [-a, -b, R`That point is \(${terms([[-a, ''], [-b, 'i']])}\), the opposite of \(z\).`]];
    prompt = R`Which point represents the complex number \(${terms([[a, ''], [b, 'i']])}\) in the complex plane?`;
    steps = [R`The complex number \(a + bi\) is plotted at the point \((a, b)\): real part across, imaginary part up.`, R`\(${terms([[a, ''], [b, 'i']])}\) is at \((${a}, ${b})\).`];
    lim = 6;
  } else {
    const d = rng.pick(SPECIAL.filter((t) => t % 90 !== 0));
    const r = rng.int(2, 4);
    const at = (t) => [r * cosR(t), r * sinR(t)];
    spots = [[...at(d), null], [...at(-d), R`That point is at the angle \(-${radTex(d)}\): measured clockwise instead of counterclockwise.`], [...at(d + 180), R`That is the point \(\left(-${r},\ ${radTex(d)}\right)\), on the opposite side of the pole.`], [...at(180 - d), R`Measure the angle counterclockwise from the positive \(x\)-axis (the polar axis).`]];
    prompt = R`Which point has polar coordinates \(\left(${r},\ ${radTex(d)}\right)\)? The dashed circle has radius ${r}.`;
    steps = [R`Turn counterclockwise from the positive \(x\)-axis through \(${radTex(d)}\), which points into Quadrant ${QUAD[quadrant(d)]}.`, R`Move ${r} units from the pole in that direction.`];
    lim = 5;
    circle = [{ x: (t) => r * Math.cos(t), y: (t) => r * Math.sin(t), t: [0, 2 * Math.PI], dashed: true, color: 'c' }];
  }
  const order = rng.shuffle([0, 1, 2, 3]);
  const name = (i) => letters[order.indexOf(i)];
  const points = order.map((i, k) => ({ x: spots[i][0], y: spots[i][1], label: letters[k] }));
  return q({
    prompt,
    visual: {
      type: 'plot',
      x: [-lim, lim],
      y: [-lim, lim],
      square: true,
      param: circle,
      points,
      axisLabels: complex ? ['Re', 'Im'] : ['x', 'y'],
      alt: `${complex ? 'The complex plane' : 'A coordinate plane with a dashed circle centred at the origin'} with four labelled points: ${points.map((p) => `${p.label} at (${txt(round(p.x, 1))}, ${txt(round(p.y, 1))})`).join(', ')}.`,
    },
    correct: `Point ${name(0)}`,
    wrong: [1, 2, 3].map((i) => ({ value: `Point ${name(i)}`, why: spots[i][2] })),
    solution: [...steps, `That is point ${name(0)}.`],
    rule: complex ? 4 : 0,
    skill: complex ? 'the complex plane' : 'plotting polar points',
    check: () => (new Set(spots.map(([x, y]) => `${round(x, 3)},${round(y, 3)}`)).size === 4 ? true : 'two of the plotted points coincide'),
  });
}

// ───────────── Medium ─────────────

function mediumRectToPolar(rng) {
  const d = rng.pick(SPECIAL.filter((a) => a > 90 || (a > 0 && rng.bool(0.3))));
  const r = niceR(rng, d);
  const [x, y] = polarXY(r, d);
  const form = (rr, dd) => pt(rr.tex(), radTex(dd));
  const principal = round(toDeg(Math.atan(y.value / x.value)), 6);
  return q({
    prompt: R`Convert the point \(\left(${x.tex()},\ ${y.tex()}\right)\) to polar coordinates \((r, \theta)\) with \(r > 0\) and \(0 \le \theta < 2\pi\).`,
    correct: form(r, d),
    wrong: [
      d % 90 !== 0 && norm360(principal) !== d ? { value: form(r, norm360(principal)), why: R`\(\tan^{-1}\frac{y}{x}\) only gives angles in Quadrants I and IV. This point is in Quadrant ${QUAD[quadrant(d)]}, so adjust the angle.` } : { value: form(r, norm360(d + 180)), why: 'That direction points to the opposite side of the origin.' },
      { value: form(r.mul(r), d), why: R`\(r^{2} = x^{2} + y^{2} = ${r.mul(r).tex()}\). Take the square root to get \(r\).` },
      form(r, norm360(360 - d)),
      form(r, norm360(180 - d)),
      form(r, norm360(d + 90)),
    ],
    solution: [
      R`\(r = \sqrt{x^{2} + y^{2}} = \sqrt{${x.sq().tex()} + ${y.sq().tex()}} = ${r.tex()}\).`,
      d % 90 === 0 ? R`The point lies on an axis, so read the angle directly: \(\theta = ${radTex(d)}\).` : R`\(\tan\theta = \dfrac{y}{x} = ${y.div(x).tex()}\), so the reference angle is \(${radTex(Math.min(d % 180, 180 - (d % 180)))}\). The point is in Quadrant ${QUAD[quadrant(d)]}, so \(\theta = ${radTex(d)}\).`,
      R`Polar coordinates: \(\left(${r.tex()},\ ${radTex(d)}\right)\).`,
    ],
    rule: 1,
    skill: 'rectangular to polar',
    check: () => checkEqual(r.value * cosR(d), x.value) === true && checkEqual(r.value * sinR(d), y.value),
  });
}

function mediumEquivalentPolar(rng) {
  const d = rng.pick(SPECIAL.filter((a) => a % 180 !== 0));
  const r = rng.int(1, 6);
  const here = [r * cosR(d), r * sinR(d)];
  const opt = (rr, dd, why) => ({ text: pt(String(rr), piTex(dd, 180)), xy: [rr * cosR(dd), rr * sinR(dd)], why });
  const good = rng.pick([opt(-r, norm360(d + 180)), opt(r, d - 360), opt(r, d + 360), opt(-r, d - 180)]);
  const bad = [
    opt(-r, d, R`A negative \(r\) means "face the direction \(\theta\), then walk backwards". That lands on the opposite side of the pole.`),
    opt(r, norm360(d + 180), R`Adding \(\pi\) to the angle turns to face the opposite direction. To return to the same point, \(r\) must change sign as well.`),
    opt(r, -d, R`\(-\theta\) is measured clockwise, which gives the mirror image in the polar axis.`),
    opt(-r, -d),
    opt(-r, d + 360),
  ].filter((o) => !near(o.xy, here));
  return q({
    prompt: R`Which of these is another pair of polar coordinates for the point \(\left(${r},\ ${radTex(d)}\right)\)?`,
    correct: good.text,
    wrong: bad.map((o) => (o.why ? { value: o.text, why: o.why } : o.text)),
    solution: [
      R`A point keeps its position if a full turn is added to the angle: \((r, \theta) = (r, \theta \pm 2\pi)\).`,
      R`It also keeps its position if \(r\) changes sign and the angle changes by \(\pi\): \((r, \theta) = (-r, \theta \pm \pi)\).`,
      `Of the choices, only ${good.text} follows one of these patterns.`,
    ],
    rule: 0,
    skill: 'multiple representations',
    check: () => (near(good.xy, here) && bad.every((o) => !near(o.xy, here)) ? true : 'a choice names the wrong point'),
  });
}

function mediumMultiplyPolar(rng) {
  const divide = rng.bool(0.45);
  const r2 = rng.int(2, 5);
  const r1 = divide ? r2 * rng.int(2, 5) : rng.int(2, 6);
  const t1 = rng.int(4, 34) * 10;
  const t2 = rng.intExcept(2, 17, [t1 / 10]) * 10;
  const form = (r, t) => R`\(${cis(String(r), `${t}^{\\circ}`)}\)`;
  const [rAns, tAns] = divide ? [r1 / r2, norm360(t1 - t2)] : [r1 * r2, norm360(t1 + t2)];
  const z = (r, t) => [r * cosR(t), r * sinR(t)];
  const [z1, z2] = [z(r1, t1), z(r2, t2)];
  const actual = divide ? [(z1[0] * z2[0] + z1[1] * z2[1]) / (r2 * r2), (z1[1] * z2[0] - z1[0] * z2[1]) / (r2 * r2)] : [z1[0] * z2[0] - z1[1] * z2[1], z1[0] * z2[1] + z1[1] * z2[0]];
  return q({
    prompt: R`Let \(z_{1} = ${cis(String(r1), `${t1}^{\\circ}`)}\) and \(z_{2} = ${cis(String(r2), `${t2}^{\\circ}`)}\). Find \(${divide ? R`\dfrac{z_{1}}{z_{2}}` : 'z_{1}z_{2}'}\) in polar form with \(0^{\circ} \le \theta < 360^{\circ}\).`,
    correct: form(rAns, tAns),
    wrong: [
      { value: form(divide ? r1 - r2 : r1 + r2, tAns), why: divide ? 'Divide the moduli. Only the arguments are subtracted.' : 'Multiply the moduli. Only the arguments are added.' },
      { value: form(rAns, divide ? norm360(t1 + t2) : norm360(t1 - t2)), why: divide ? 'When dividing, subtract the arguments.' : 'When multiplying, add the arguments.' },
      form(divide ? r1 * r2 : r1 + r2 + 1, divide ? norm360(t1 - t2) : norm360(t1 * 2)),
      form(rAns, norm360(tAns + 180)),
      form(rAns + 1, tAns),
    ],
    solution: [
      divide ? R`To divide in polar form, divide the moduli and subtract the arguments.` : R`To multiply in polar form, multiply the moduli and add the arguments.`,
      divide ? R`Modulus: \(${r1} \div ${r2} = ${rAns}\). Argument: \(${t1}^{\circ} - ${t2}^{\circ} = ${t1 - t2}^{\circ}\)${t1 - t2 < 0 ? R`, which is coterminal with \(${tAns}^{\circ}\)` : ''}.` : R`Modulus: \(${r1} \cdot ${r2} = ${rAns}\). Argument: \(${t1}^{\circ} + ${t2}^{\circ} = ${t1 + t2}^{\circ}\)${t1 + t2 >= 360 ? R`, which is coterminal with \(${tAns}^{\circ}\)` : ''}.`,
      R`Result: \(${cis(String(rAns), `${tAns}^{\\circ}`)}\).`,
    ],
    rule: 5,
    skill: 'multiplying and dividing in polar form',
    check: () => (near(z(rAns, tAns), actual) ? true : 'polar result does not match rectangular arithmetic'),
  });
}

function mediumRadar(rng) {
  const d = rng.pick([30, 60, 120, 150, 210, 240, 300, 330]);
  const r = rng.pick([10, 20, 30, 40, 60, 80]);
  const [x, y] = polarXY(surd(r), d);
  const northSouth = rng.bool();
  const v = northSouth ? y : x;
  const other = northSouth ? x : y;
  const dir = northSouth ? (y.value > 0 ? 'north' : 'south') : x.value > 0 ? 'east' : 'west';
  const what = rng.pick(['A ship', 'A storm cell', 'A fishing boat', 'An aircraft']);
  const km = (s) => R`\(${s.abs().tex()}\) km`;
  return q({
    prompt: R`${what} appears on a radar screen at polar coordinates \(\left(${r},\ ${d}^{\circ}\right)\): ${r} km from the station, at an angle of \(${d}^{\circ}\) measured counterclockwise from due east. How far ${dir} of the station is it?`,
    correct: km(v),
    wrong: [
      { value: km(other), why: northSouth ? R`North–south is the \(y\)-coordinate, \(r\sin\theta\). That is the east–west distance.` : R`East–west is the \(x\)-coordinate, \(r\cos\theta\). That is the north–south distance.` },
      { value: km(surd(r)), why: `${r} km is the straight-line distance from the station, not the distance ${dir}.` },
      km(v.mul(2).div(3)),
      km(surd(r, 1, 3)),
      km(surd(r, 4)),
    ],
    solution: [
      R`Put the station at the origin with east along the positive \(x\)-axis. The position is \(\left(r\cos\theta,\ r\sin\theta\right)\).`,
      northSouth ? R`\(y = ${r}\sin ${d}^{\circ} = ${y.tex()}\).` : R`\(x = ${r}\cos ${d}^{\circ} = ${x.tex()}\).`,
      R`${v.value < 0 ? `The negative sign means ${dir}. ` : ''}It is \(${v.abs().tex()}\) km (about ${txt(Math.abs(v.value), { places: 1 })} km) ${dir} of the station.`,
    ],
    rule: 1,
    skill: 'polar coordinates in context',
    check: () => checkEqual(v.value, northSouth ? r * sinR(d) : r * cosR(d)),
  });
}

// ───────────── Hard ─────────────

function hardPolarForm(rng) {
  const d = rng.pick(SPECIAL.filter((a) => a > 90 || (a > 0 && rng.bool(0.3))));
  const r = niceR(rng, d);
  const [x, y] = polarXY(r, d);
  const form = (rr, dd) => R`\(${cis(rr.tex(), radTex(dd))}\)`;
  const principal = d % 90 === 0 ? d : norm360(round(toDeg(Math.atan(y.value / x.value)), 6));
  return q({
    prompt: R`Write \(z = ${cx(x, y)}\) in polar form \(r(\cos\theta + i\sin\theta)\) with \(0 \le \theta < 2\pi\).`,
    correct: form(r, d),
    wrong: [
      principal !== d ? { value: form(r, principal), why: R`\(z\) is the point \(\left(${x.tex()},\ ${y.tex()}\right)\), in Quadrant ${QUAD[quadrant(d)]}. The argument must point into that quadrant.` } : { value: form(r, norm360(d + 180)), why: 'That argument points to the opposite side of the origin.' },
      { value: form(r.mul(r), d), why: R`The modulus is \(\sqrt{a^{2} + b^{2}}\). That value is \(a^{2} + b^{2}\).` },
      form(r, norm360(360 - d)),
      form(r, norm360(180 - d)),
      form(r, norm360(d + 90)),
    ],
    solution: [
      R`Modulus: \(r = \sqrt{${x.sq().tex()} + ${y.sq().tex()}} = ${r.tex()}\).`,
      d % 90 === 0 ? R`The point \(\left(${x.tex()},\ ${y.tex()}\right)\) lies on an axis, so the argument is \(\theta = ${radTex(d)}\).` : R`Argument: \(\tan\theta = ${y.div(x).tex()}\) with the point in Quadrant ${QUAD[quadrant(d)]}, so \(\theta = ${radTex(d)}\).`,
      R`\(z = ${cis(r.tex(), radTex(d))}\).`,
    ],
    rule: 4,
    skill: 'polar form of a complex number',
    check: () => checkEqual(r.value * cosR(d), x.value) === true && checkEqual(r.value * sinR(d), y.value),
  });
}

const sq = (v, c) => (c === 0 ? `${v}^{2}` : `(${linear(1, -c, v)})^{2}`);

function hardEquationToRect(rng) {
  const kind = rng.pick(['cos', 'sin', 'both', 'sec', 'csc']);
  const a = rng.nonzero(-5, 5);
  const b = rng.intExcept(-5, 5, [0, a, -a]);
  const circle = (h, k, rr) => ({ text: R`\(${sq('x', h)} + ${sq('y', k)} = ${rr}\)`, test: (x, y) => (x - h) ** 2 + (y - k) ** 2 - rr });
  const lineEq = (v, c) => ({ text: R`\(${v} = ${c}\)`, test: (x, y) => (v === 'x' ? x : y) - c });
  let polar;
  let rOf;
  let right;
  let wrong;
  let steps;
  if (kind === 'cos' || kind === 'sin') {
    const isCos = kind === 'cos';
    polar = R`r = ${terms([[2 * a, isCos ? R`\cos\theta` : R`\sin\theta`]])}`;
    rOf = (t) => 2 * a * (isCos ? Math.cos(t) : Math.sin(t));
    right = isCos ? circle(a, 0, a * a) : circle(0, a, a * a);
    wrong = [
      [isCos ? circle(0, a, a * a) : circle(a, 0, a * a), R`\(r\cos\theta\) is \(x\) and \(r\sin\theta\) is \(y\). Check which one appears after multiplying by \(r\).`],
      [isCos ? circle(2 * a, 0, 4 * a * a) : circle(0, 2 * a, 4 * a * a), R`Completing the square halves the coefficient: \(${isCos ? 'x' : 'y'}^{2} ${a > 0 ? '-' : '+'} ${Math.abs(2 * a)}${isCos ? 'x' : 'y'}\) becomes \(${sq(isCos ? 'x' : 'y', a)} - ${a * a}\).`],
      [circle(0, 0, 4 * a * a), R`That is the circle \(r = ${Math.abs(2 * a)}\), centred at the pole. This curve passes through the pole.`],
      [isCos ? circle(-a, 0, a * a) : circle(0, -a, a * a), null],
    ];
    steps = [
      R`Multiply both sides by \(r\): \(r^{2} = ${terms([[2 * a, isCos ? R`r\cos\theta` : R`r\sin\theta`]])}\).`,
      R`Substitute \(r^{2} = x^{2} + y^{2}\) and \(${isCos ? R`r\cos\theta = x` : R`r\sin\theta = y`}\): \(x^{2} + y^{2} = ${terms([[2 * a, isCos ? 'x' : 'y']])}\).`,
      R`Move the term across and complete the square: ${right.text}, a circle of radius \(${Math.abs(a)}\) through the origin.`,
    ];
  } else if (kind === 'both') {
    polar = R`r = ${terms([[2 * a, R`\cos\theta`], [2 * b, R`\sin\theta`]])}`;
    rOf = (t) => 2 * a * Math.cos(t) + 2 * b * Math.sin(t);
    right = circle(a, b, a * a + b * b);
    wrong = [
      [circle(b, a, a * a + b * b), R`\(r\cos\theta\) is \(x\) and \(r\sin\theta\) is \(y\), so the \(\cos\theta\) coefficient belongs with \(x\).`],
      [circle(2 * a, 2 * b, 4 * (a * a + b * b)), 'Completing the square halves each coefficient to find the centre.'],
      [circle(-a, -b, a * a + b * b), R`\(x^{2} ${a > 0 ? '-' : '+'} ${Math.abs(2 * a)}x\) completes to \(${sq('x', a)}\). Check the signs.`],
      [circle(a, b, a * a - b * b > 0 ? a * a - b * b : (a + b) ** 2), null],
    ];
    steps = [
      R`Multiply both sides by \(r\): \(r^{2} = ${terms([[2 * a, R`r\cos\theta`], [2 * b, R`r\sin\theta`]])}\).`,
      R`Substitute: \(x^{2} + y^{2} = ${terms([[2 * a, 'x'], [2 * b, 'y']])}\).`,
      R`Complete the square in \(x\) and in \(y\): ${right.text}.`,
    ];
  } else {
    const isSec = kind === 'sec';
    polar = R`r = ${terms([[a, isSec ? R`\sec\theta` : R`\csc\theta`]])}`;
    rOf = (t) => a / (isSec ? Math.cos(t) : Math.sin(t));
    right = lineEq(isSec ? 'x' : 'y', a);
    wrong = [
      [lineEq(isSec ? 'y' : 'x', a), isSec ? R`\(\sec\theta = \dfrac{1}{\cos\theta}\), so the equation says \(r\cos\theta = ${a}\), and \(r\cos\theta\) is \(x\).` : R`\(\csc\theta = \dfrac{1}{\sin\theta}\), so the equation says \(r\sin\theta = ${a}\), and \(r\sin\theta\) is \(y\).`],
      [circle(0, 0, a * a), R`\(x^{2} + y^{2} = ${a * a}\) is the circle \(r = ${Math.abs(a)}\). Here \(r\) changes with \(\theta\).`],
      [isSec ? circle(a, 0, a * a) : circle(0, a, a * a), R`That circle comes from \(r = ${terms([[2 * a, isSec ? R`\cos\theta` : R`\sin\theta`]])}\), not from the reciprocal function.`],
      [lineEq(isSec ? 'x' : 'y', -a), null],
    ];
    steps = [
      isSec ? R`\(\sec\theta = \dfrac{1}{\cos\theta}\), so \(r = \dfrac{${a}}{\cos\theta}\).` : R`\(\csc\theta = \dfrac{1}{\sin\theta}\), so \(r = \dfrac{${a}}{\sin\theta}\).`,
      isSec ? R`Multiply both sides by \(\cos\theta\): \(r\cos\theta = ${a}\).` : R`Multiply both sides by \(\sin\theta\): \(r\sin\theta = ${a}\).`,
      R`Since \(${isSec ? R`r\cos\theta = x` : R`r\sin\theta = y`}\), the graph is the ${isSec ? 'vertical' : 'horizontal'} line ${right.text}.`,
    ];
  }
  const samples = [0.4, 1.1, 2.0, 2.9, 4.1].map((t) => [rOf(t) * Math.cos(t), rOf(t) * Math.sin(t)]);
  const on = (o) => samples.every(([x, y]) => Math.abs(o.test(x, y)) < 1e-9);
  return q({
    prompt: R`Convert the polar equation \(${polar}\) to rectangular form.`,
    correct: right.text,
    wrong: wrong.map(([o, why]) => (why ? { value: o.text, why } : o.text)),
    solution: steps,
    rule: 2,
    skill: 'polar equations to rectangular',
    check: () => (on(right) && wrong.every(([o]) => !on(o)) ? true : 'points of the polar curve do not single out the answer'),
  });
}

// Polar curves for the graph-recognition question: [LaTeX, r(θ), longest reach, description for alt text].
const TH = R`\theta`;
const rose = (a, n, fn) => ({ tex: R`r = ${a}${fn === 'cos' ? R`\cos` : R`\sin`} ${n}${TH}`, r: (t) => a * (fn === 'cos' ? Math.cos(n * t) : Math.sin(n * t)), reach: a, kind: 'rose', a, n, fn });
const limacon = (a, b, fn, s) => ({ tex: R`r = ${a} ${s > 0 ? '+' : '-'} ${b === 1 ? '' : b}${fn === 'cos' ? R`\cos` : R`\sin`}${TH}`, r: (t) => a + s * b * (fn === 'cos' ? Math.cos(t) : Math.sin(t)), reach: a + b, kind: 'limacon', a, b, fn, s });
const throughPole = (a, fn) => ({ tex: R`r = ${a === 1 ? '' : a === -1 ? '-' : a}${fn === 'cos' ? R`\cos` : R`\sin`}${TH}`, r: (t) => a * (fn === 'cos' ? Math.cos(t) : Math.sin(t)), reach: Math.abs(a), kind: 'circle', a, fn });
const trace = (c) => Array.from({ length: 360 }, (_, i) => { const t = (i * Math.PI) / 180; return [c.r(t) * Math.cos(t), c.r(t) * Math.sin(t)]; });
function sameCurve(c1, c2) {
  const [p1, p2] = [trace(c1), trace(c2)];
  const within = (ps, qs) => ps.every((p) => qs.some((w) => Math.hypot(p[0] - w[0], p[1] - w[1]) < 0.12));
  return within(p1, p2) && within(p2, p1);
}

function hardIdentifyGraph(rng) {
  const family = rng.pick(['rose', 'rose', 'limacon', 'limacon', 'circle']);
  const flip = (fn) => (fn === 'cos' ? 'sin' : 'cos');
  let c;
  let options;
  let steps;
  let alt;
  if (family === 'rose') {
    c = rose(rng.int(2, 4), rng.int(2, 5), rng.pick(['cos', 'sin']));
    const petals = c.n % 2 ? c.n : 2 * c.n;
    options = [
      [rose(c.a, c.n, flip(c.fn)), c.fn === 'cos' ? R`\(\cos\) gives \(r = ${c.a}\) at \(\theta = 0\), so a petal lies along the positive \(x\)-axis, as in this graph. With \(\sin\), \(r = 0\) there.` : R`\(\sin\) gives \(r = 0\) at \(\theta = 0\), so no petal lies along the positive \(x\)-axis, as in this graph. With \(\cos\), a petal would.`],
      [rose(c.a, c.n % 2 ? c.n + 1 : 2 * c.n, c.fn), R`Count the petals: \(r = a\cos n\theta\) or \(a\sin n\theta\) has \(n\) petals when \(n\) is odd and \(2n\) petals when \(n\) is even.`],
      [rose(c.a + 1, c.n, c.fn), R`The petals reach out as far as the largest value of \(r\), which is the number in front.`],
      [rose(c.a, c.n % 2 ? c.n + 2 : c.n + 1, c.fn), null],
    ];
    steps = [R`The graph is a rose with ${petals} petals, each reaching ${c.a} units from the pole.`, c.n % 2 ? R`An odd number of petals equals \(n\): \(n = ${c.n}\).` : R`An even number of petals equals \(2n\): \(n = ${c.n}\).`, c.fn === 'cos' ? R`A petal lies along the positive \(x\)-axis (at \(\theta = 0\), \(r = ${c.a}\)), so the equation uses cosine.` : R`No petal lies along the positive \(x\)-axis (at \(\theta = 0\), \(r = 0\)), so the equation uses sine.`];
    alt = `Polar graph of a rose curve with ${petals} petals, each reaching ${c.a} units from the origin. ${c.fn === 'cos' ? 'One petal is centred on the positive x-axis.' : 'No petal is centred on the positive x-axis; the curve passes through the origin in that direction.'}`;
  } else if (family === 'limacon') {
    const [a, b] = rng.pick([[1, 2], [2, 3], [2, 2], [3, 3], [3, 2], [4, 2], [3, 1]]);
    c = limacon(a, b, rng.pick(['cos', 'sin']), rng.sign());
    const shape = a < b ? 'an inner loop' : a === b ? 'a cusp at the pole (a cardioid)' : 'no loop and no cusp';
    const side = c.fn === 'cos' ? (c.s > 0 ? 'right' : 'left') : c.s > 0 ? 'top' : 'bottom';
    options = [
      [limacon(a, b, flip(c.fn), c.s), R`With \(\cos\theta\) the curve is symmetric about the \(x\)-axis; with \(\sin\theta\) it is symmetric about the \(y\)-axis.`],
      [limacon(a, b, c.fn, -c.s), R`The curve reaches furthest (\(r = ${a + b}\)) where the trig term is at its largest. Here that is at the ${side}.`],
      [a === b ? limacon(a + 1, b, c.fn, c.s) : limacon(b, a, c.fn, c.s), R`A limaçon \(r = a \pm b\cos\theta\) or \(r = a \pm b\sin\theta\) has an inner loop when \(a < b\), a cusp (cardioid) when \(a = b\), and neither when \(a > b\).`],
      [a === b ? limacon(a, b + 1, c.fn, c.s) : limacon(Math.max(a, b), Math.max(a, b), c.fn, c.s), null],
    ];
    steps = [R`The curve is a limaçon with ${shape}, so in \(r = a \pm b\,${c.fn === 'cos' ? R`\cos` : R`\sin`}\theta\), ${a < b ? R`\(a < b\)` : a === b ? R`\(a = b\)` : R`\(a > b\)`}.`, `It is symmetric about the ${c.fn === 'cos' ? 'x' : 'y'}-axis, so the equation uses ${c.fn === 'cos' ? 'cosine' : 'sine'}.`, R`It reaches furthest, \(${a + b}\) units, at the ${side}, so the sign is ${c.s > 0 ? 'plus' : 'minus'}. The furthest reach is \(a + b = ${a + b}\)${a === b ? '' : a < b ? R`, and the inner loop reaches \(b - a = ${b - a}\) from the pole` : R`, and the nearest point, on the opposite side, is \(a - b = ${a - b}\) from the pole`}.`];
    alt = `Polar graph of a limaçon with ${shape}. It is symmetric about the ${c.fn === 'cos' ? 'x' : 'y'}-axis and reaches furthest from the origin, ${a + b} units, at the ${side}.${a === b ? '' : a < b ? ` Its inner loop reaches ${b - a} unit${b - a === 1 ? '' : 's'} from the origin, on the same side.` : ` On the opposite side it is ${a - b} unit${a - b === 1 ? '' : 's'} from the origin.`}`;
  } else {
    c = throughPole(rng.pick([2, 4, 6, -2, -4, -6]), rng.pick(['cos', 'sin']));
    const where = c.fn === 'cos' ? (c.a > 0 ? 'to the right of' : 'to the left of') : c.a > 0 ? 'above' : 'below';
    options = [
      [throughPole(c.a, flip(c.fn)), R`\(r = a\cos\theta\) is a circle centred on the \(x\)-axis; \(r = a\sin\theta\) is centred on the \(y\)-axis.`],
      [throughPole(-c.a, c.fn), `This circle lies ${where} the pole, which fixes the sign of the coefficient.`],
      [{ tex: `r = ${Math.abs(c.a)}`, r: () => Math.abs(c.a), reach: Math.abs(c.a) }, R`\(r = ${Math.abs(c.a)}\) is a circle centred at the pole. This circle passes through the pole.`],
      [throughPole(c.a / 2, c.fn), null],
    ];
    steps = [`The graph is a circle that passes through the pole, with diameter ${Math.abs(c.a)}.`, R`Its centre is on the ${c.fn === 'cos' ? 'x' : 'y'}-axis, so the equation is \(r = a${c.fn === 'cos' ? R`\cos` : R`\sin`}\theta\) with \(|a|\) equal to the diameter.`, `The circle lies ${where} the pole, so the coefficient is ${c.a > 0 ? 'positive' : 'negative'}.`];
    alt = `Polar graph of a circle of diameter ${Math.abs(c.a)} that passes through the origin. Its centre is on the ${c.fn === 'cos' ? 'x' : 'y'}-axis, ${where} the origin.`;
  }
  const lim = c.reach + 1;
  return q({
    prompt: 'Which polar equation has this graph?',
    visual: { type: 'plot', x: [-lim, lim], y: [-lim, lim], square: true, step: [1, 1], param: [{ x: (t) => c.r(t) * Math.cos(t), y: (t) => c.r(t) * Math.sin(t), t: [0, 2 * Math.PI] }], alt },
    key: `polar-graph-${c.tex}`,
    correct: M(c.tex),
    wrong: options.map(([o, why]) => (why ? { value: M(o.tex), why } : M(o.tex))),
    solution: [...steps, `So ${M(c.tex)}.`],
    rule: 3,
    skill: 'recognising polar graphs',
    check: () => (options.every(([o]) => !sameCurve(o, c)) ? true : 'a wrong choice traces the same curve'),
  });
}

const BASES = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => ({ re: surd(a), im: surd(b), r: surd(1, 1, 2), d: norm360(toDeg(Math.atan2(b, a))) }))
  .concat([30, 60, 120, 150, 210, 240, 300, 330].map((d) => ({ re: surd(2).mul(cosDeg(d)), im: surd(2).mul(sinDeg(d)), r: surd(2), d })));

function hardDeMoivre(rng) {
  const z = rng.pick(BASES);
  const n = rng.int(3, 8);
  const R0 = z.r.r === 2 ? (n % 2 ? surd(2 ** ((n - 1) / 2), 1, 2) : surd(2 ** (n / 2))) : surd(2 ** n);
  const D = norm360(n * z.d);
  const [x, y] = polarXY(R0, D);
  const alt = (rr, dd) => M(cx(...polarXY(rr, dd)));
  return q({
    prompt: R`Use De Moivre's theorem to write \(\left(${cx(z.re, z.im)}\right)^{${n}}\) in the form \(a + bi\).`,
    correct: M(cx(x, y)),
    wrong: [
      { value: alt(z.r, D), why: R`Raise the modulus to the power too: \(r^{${n}} = ${R0.tex()}\).` },
      { value: alt(R0, z.d), why: R`Multiply the argument by \(${n}\) as well: \(${n} \cdot ${radTex(z.d)}\).` },
      alt(R0, norm360(-D)),
      alt(R0, norm360(D + 180)),
      alt(R0, norm360(D + 90)),
    ],
    solution: [
      R`Polar form: the modulus is \(${z.r.tex()}\) and the argument is \(${radTex(z.d)}\), so \(z = ${cis(z.r.tex(), radTex(z.d))}\).`,
      R`De Moivre: \(z^{${n}} = r^{${n}}\left(\cos ${n}\theta + i\sin ${n}\theta\right)\), with \(r^{${n}} = ${R0.tex()}\) and \(${n}\theta = ${piTex(n * z.d, 180)}\)${n * z.d >= 360 ? R`, coterminal with \(${radTex(D)}\)` : ''}.`,
      R`\(z^{${n}} = ${cis(R0.tex(), radTex(D))} = ${cx(x, y)}\).`,
    ],
    rule: 6,
    skill: "De Moivre's theorem",
    check: () => (near([x.value, y.value], cpow([z.re.value, z.im.value], n)) ? true : 'power does not match repeated multiplication'),
  });
}

// ───────────── Challenge ─────────────

// [n, target as LaTeX, target as [re, im], modulus of each root, argument of the target in degrees]
const ROOT_TARGETS = [
  [3, '8', [8, 0], surd(2), 0], [3, '-8', [-8, 0], surd(2), 180], [3, '8i', [0, 8], surd(2), 90], [3, '-8i', [0, -8], surd(2), 270],
  [3, '27', [27, 0], surd(3), 0], [3, '-27', [-27, 0], surd(3), 180], [3, '27i', [0, 27], surd(3), 90], [3, '-27i', [0, -27], surd(3), 270],
  [3, '-1', [-1, 0], surd(1), 180], [3, 'i', [0, 1], surd(1), 90], [3, '-64', [-64, 0], surd(4), 180], [3, '64i', [0, 64], surd(4), 90],
  [4, '-4', [-4, 0], surd(1, 1, 2), 180], [4, '-64', [-64, 0], surd(2, 1, 2), 180], [4, '-16', [-16, 0], surd(2), 180], [4, '16', [16, 0], surd(2), 0], [4, '-1', [-1, 0], surd(1), 180],
  [2, '2i', [0, 2], surd(1, 1, 2), 90], [2, '-2i', [0, -2], surd(1, 1, 2), 270], [2, '8i', [0, 8], surd(2, 1, 2), 90], [2, '-8i', [0, -8], surd(2, 1, 2), 270], [2, '18i', [0, 18], surd(3, 1, 2), 90], [2, 'i', [0, 1], surd(1), 90],
  [6, '-64', [-64, 0], surd(2), 180], [6, '64', [64, 0], surd(2), 0], [6, '-1', [-1, 0], surd(1), 180],
];
const NTH = { 2: 'square', 3: 'cube', 4: 'fourth', 6: 'sixth' };

function challengeRoots(rng) {
  const [n, wTex, w, rho, arg] = rng.pick(ROOT_TARGETS);
  const rootAngles = Array.from({ length: n }, (_, k) => (arg + 360 * k) / n);
  const phi = rng.pick(rootAngles.filter((a) => a % 90 !== 0).length ? rootAngles.filter((a) => a % 90 !== 0) : rootAngles);
  const num2 = (rr, dd) => polarXY(rr, norm360(dd));
  const isRoot = ([x, y]) => near(cpow([x.value, y.value], n), w);
  const bigR = surd(Math.round(Math.hypot(...w)));
  const special = (dd) => norm360(dd) % 30 === 0 || norm360(dd) % 45 === 0;
  const candidates = [
    [rho, arg, R`Its argument is the argument of \(${wTex}\) itself. For a root, divide the argument by \(${n}\).`],
    [bigR, phi, R`The modulus of a root is the ${NTH[n]} root of \(|${wTex}| = ${bigR.tex()}\), which is \(${rho.tex()}\).`],
    [rho, -phi, R`Raise it to the power \(${n}\) to test it: the result is not \(${wTex}\).`],
    ...[90, 45, 30, 180, 60, 135, 150, 270, 225, 210].map((delta) => [rho, phi + delta, null]),
  ].filter(([, dd]) => special(dd)).map(([rr, dd, why]) => [num2(rr, dd), why]).filter(([zz]) => !isRoot(zz));
  const right = num2(rho, phi);
  return q({
    prompt: R`Which of these is a ${NTH[n]} root of \(${wTex}\)?`,
    correct: M(cx(...right)),
    wrong: candidates.map(([zz, why]) => (why ? { value: M(cx(...zz)), why } : M(cx(...zz)))),
    solution: [
      R`Polar form: \(${wTex} = ${cis(bigR.tex(), radTex(arg))}\).`,
      R`The ${n} ${NTH[n]} roots have modulus \(${rho.tex()}\) (the ${NTH[n]} root of \(${bigR.tex()}\)) and arguments \(\dfrac{${radTex(arg) === '0' ? '' : `${radTex(arg)} + `}2\pi k}{${n}}\) for \(k = ${n <= 4 ? Array.from({ length: n }, (_, k) => k).join(', ') : R`0, 1, \dots, ${n - 1}`}\): \(${rootAngles.map((a) => radTex(a)).join(R`,\ `)}\).`,
      R`In rectangular form the roots are \(${rootAngles.map((a) => cx(...num2(rho, a))).join(R`,\ \ `)}\).`,
      R`Of the choices, only \(${cx(...right)}\) is on that list.`,
    ],
    rule: 6,
    skill: 'roots of complex numbers',
    check: () => (isRoot(right) && candidates.every(([zz]) => !isRoot(zz)) && rootAngles.every((a) => isRoot(num2(rho, a))) ? true : 'root test failed'),
  });
}

function challengeRadarDistance(rng) {
  const r1 = rng.int(2, 9) * 10;
  const r2 = rng.intExcept(2, 9, [r1 / 10]) * 10;
  const t1 = rng.int(1, 15) * 10;
  const gap = rng.intExcept(4, 16, [9, 18]) * 10;
  const t2 = t1 + gap;
  const [p1, p2] = [[r1 * cosR(t1), r1 * sinR(t1)], [r2 * cosR(t2), r2 * sinR(t2)]];
  const dist = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
  const ans = round(dist, 1);
  const things = rng.pick(['aircraft', 'ships', 'weather balloons']);
  return q({
    prompt: R`Two ${things} appear on a radar screen at polar coordinates \(\left(${r1},\ ${t1}^{\circ}\right)\) and \(\left(${r2},\ ${t2}^{\circ}\right)\), with distances in kilometres. How far apart are they, to the nearest tenth of a kilometre?`,
    correct: ans,
    fmt: dec(1, 'km'),
    wrong: apart(ans, [
      { value: Math.abs(r1 - r2), why: 'That compares only their distances from the station. They are also in different directions.' },
      { value: Math.hypot(r1, r2), why: R`\(\sqrt{r_{1}^{2} + r_{2}^{2}}\) works only when the two directions are \(90^{\circ}\) apart. Here they are \(${gap}^{\circ}\) apart.` },
      { value: Math.sqrt(r1 * r1 + r2 * r2 + 2 * r1 * r2 * cosR(gap)), why: R`The Law of Cosines subtracts the term \(2r_{1}r_{2}\cos(\theta_{2} - \theta_{1})\).` },
      r1 + r2,
      (r1 + r2) / 2,
    ], { places: 1, positive: true }),
    solution: [
      R`Convert to rectangular coordinates: \(\left(${r1}\cos ${t1}^{\circ},\ ${r1}\sin ${t1}^{\circ}\right) \approx (${num(p1[0], { places: 2 })},\ ${num(p1[1], { places: 2 })})\) and \(\left(${r2}\cos ${t2}^{\circ},\ ${r2}\sin ${t2}^{\circ}\right) \approx (${num(p2[0], { places: 2 })},\ ${num(p2[1], { places: 2 })})\).`,
      R`Distance formula: \(\sqrt{(${num(p1[0] - p2[0], { places: 2 })})^{2} + (${num(p1[1] - p2[1], { places: 2 })})^{2}} \approx ${num(ans, { fixed: 1 })}\) km.`,
      R`Shortcut: the station and the two ${things} form a triangle with sides ${r1} and ${r2} and included angle \(${gap}^{\circ}\), so the Law of Cosines gives the same answer.`,
    ],
    rule: 1,
    skill: 'polar coordinates in context',
    // Independent check: the Law of Cosines in the triangle formed with the station.
    check: () => checkEqual(dist, Math.sqrt(r1 * r1 + r2 * r2 - 2 * r1 * r2 * cosR(gap)), 1e-9),
  });
}

function challengeRectToPolarEquation(rng) {
  const kind = rng.pick(['circleX', 'circleY', 'lineX', 'lineY', 'hyperbola']);
  const a = rng.int(1, 6) * rng.sign();
  const k = rng.int(1, 8);
  const opt = (tex, r, why) => ({ text: M(tex), r, why });
  let rect;
  let test;
  let options;
  let steps;
  const [C, S] = [R`\cos\theta`, R`\sin\theta`];
  if (kind === 'circleX' || kind === 'circleY') {
    const isX = kind === 'circleX';
    const [mine, other] = isX ? [C, S] : [S, C];
    const f = isX ? Math.cos : Math.sin;
    const g = isX ? Math.sin : Math.cos;
    rect = R`x^{2} + y^{2} = ${terms([[2 * a, isX ? 'x' : 'y']])}`;
    test = (x, y) => x * x + y * y - 2 * a * (isX ? x : y);
    options = [
      opt(`r = ${terms([[2 * a, mine]])}`, (t) => 2 * a * f(t)),
      opt(`r = ${terms([[2 * a, other]])}`, (t) => 2 * a * g(t), R`\(x = r\cos\theta\) and \(y = r\sin\theta\). Check which one is in the equation.`),
      opt(`r^{2} = ${terms([[2 * a, mine]])}`, (t) => Math.sqrt(Math.abs(2 * a * f(t))), R`After substituting, the equation is \(r^{2} = ${terms([[2 * a, isX ? R`r\cos\theta` : R`r\sin\theta`]])}\). Divide both sides by \(r\).`),
      opt(`r = ${Math.abs(2 * a)}`, () => Math.abs(2 * a), R`That is a circle centred at the pole. This circle passes through the origin.`),
      opt(`r = ${terms([[a, mine]])}`, (t) => a * f(t)),
    ];
    steps = [R`Substitute \(x^{2} + y^{2} = r^{2}\) and \(${isX ? R`x = r\cos\theta` : R`y = r\sin\theta`}\): \(r^{2} = ${terms([[2 * a, isX ? R`r\cos\theta` : R`r\sin\theta`]])}\).`, R`Divide both sides by \(r\) (the pole \(r = 0\) is still on the curve): \(r = ${terms([[2 * a, mine]])}\).`];
  } else if (kind === 'lineX' || kind === 'lineY') {
    const isX = kind === 'lineX';
    const f = isX ? Math.cos : Math.sin;
    const g = isX ? Math.sin : Math.cos;
    const [recip, wrongRecip, plain] = isX ? [R`\sec\theta`, R`\csc\theta`, C] : [R`\csc\theta`, R`\sec\theta`, S];
    rect = `${isX ? 'x' : 'y'} = ${a}`;
    test = (x, y) => (isX ? x : y) - a;
    options = [
      opt(`r = ${terms([[a, recip]])}`, (t) => a / f(t)),
      opt(`r = ${terms([[a, plain]])}`, (t) => a * f(t), R`From \(r${plain} = ${a}\), divide by \(${plain}\): \(r = \dfrac{${a}}{${plain}}\), which is \(${terms([[a, recip]])}\).`),
      opt(`r = ${terms([[a, wrongRecip]])}`, (t) => a / g(t), R`\(${isX ? 'x' : 'y'} = r${plain}\), so the reciprocal needed is \(${recip}\).`),
      opt(`r = ${Math.abs(a)}`, () => Math.abs(a), R`\(r = ${Math.abs(a)}\) is a circle. A straight line needs \(r\) to change with \(\theta\).`),
      opt(`r = ${terms([[-a, recip]])}`, (t) => -a / f(t)),
    ];
    steps = [R`Substitute \(${isX ? R`x = r\cos\theta` : R`y = r\sin\theta`}\): \(r${plain} = ${a}\).`, R`Divide by \(${plain}\): \(r = \dfrac{${a}}{${plain}} = ${terms([[a, recip]])}\).`];
  } else {
    rect = `xy = ${k}`;
    test = (x, y) => x * y - k;
    const pos = (v) => (v > 0 ? Math.sqrt(v) : NaN);
    options = [
      opt(R`r^{2} = \dfrac{${2 * k}}{\sin 2\theta}`, (t) => pos((2 * k) / Math.sin(2 * t))),
      opt(R`r^{2} = \dfrac{${k}}{\sin 2\theta}`, (t) => pos(k / Math.sin(2 * t)), R`\(\sin\theta\cos\theta = \frac{1}{2}\sin 2\theta\), so dividing by it doubles the numerator.`),
      opt(R`r = \dfrac{${2 * k}}{\sin 2\theta}`, (t) => (2 * k) / Math.sin(2 * t), R`\(xy = (r\cos\theta)(r\sin\theta) = r^{2}\sin\theta\cos\theta\): the product contains \(r^{2}\).`),
      opt(R`r^{2} = ${2 * k}\sin 2\theta`, (t) => pos(2 * k * Math.sin(2 * t)), R`Solve \(r^{2}\sin\theta\cos\theta = ${k}\) for \(r^{2}\) by dividing, not multiplying.`),
      opt(R`r^{2} = \dfrac{${2 * k}}{\cos 2\theta}`, (t) => pos((2 * k) / Math.cos(2 * t))),
    ];
    steps = [R`Substitute \(x = r\cos\theta\) and \(y = r\sin\theta\): \(r^{2}\sin\theta\cos\theta = ${k}\).`, R`Use \(\sin\theta\cos\theta = \frac{1}{2}\sin 2\theta\): \(\frac{1}{2}r^{2}\sin 2\theta = ${k}\).`, R`Solve for \(r^{2}\): \(r^{2} = \dfrac{${2 * k}}{\sin 2\theta}\).`];
  }
  const on = (o) => [0.35, 0.6, 1.0, 1.25].every((t) => { const r = o.r(t); return Math.abs(test(r * Math.cos(t), r * Math.sin(t))) < 1e-9; });
  const [right, ...wrong] = options;
  return q({
    prompt: R`Convert the rectangular equation \(${rect}\) to polar form.`,
    correct: right.text,
    wrong: wrong.map((o) => (o.why ? { value: o.text, why: o.why } : o.text)),
    solution: steps,
    rule: 2,
    skill: 'rectangular equations to polar',
    check: () => (on(right) && wrong.every((o) => !on(o)) ? true : 'points of the polar curves do not single out the answer'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'polar-complex',
  title: 'Polar Coordinates & Complex Numbers',
  summary: 'Convert between polar and rectangular form, recognise polar graphs, and use polar form to multiply, power and root complex numbers.',
  standards: ['AP Precalculus 3.13', 'AP Precalculus 3.14', 'AP Precalculus 3.15', 'CCSS N-CN.B.4', 'CCSS N-CN.B.5'],

  explain: {
    intro: R`Rectangular coordinates locate a point by going across and up. Polar coordinates locate it by a distance \(r\) from the origin (the pole) and an angle \(\theta\) from the positive \(x\)-axis (the polar axis). The same idea applied to complex numbers gives polar form, in which multiplying, raising to powers and taking roots become simple operations on a modulus and an angle. Angles are in radians unless a degree sign is shown.`,
    rules: [
      {
        title: 'Polar coordinates and their many names',
        text: R`\((r, \theta)\) means: turn counterclockwise through \(\theta\) from the polar axis, then move \(r\) units (backwards if \(r\) is negative). Every point has many names: \((r, \theta) = (r, \theta + 2\pi k) = (-r, \theta + \pi)\).`,
        example: R`\(\left(3, \frac{\pi}{4}\right)\), \(\left(3, \frac{9\pi}{4}\right)\) and \(\left(-3, \frac{5\pi}{4}\right)\) are the same point.`,
      },
      {
        title: 'Converting points',
        text: R`Polar to rectangular: \(x = r\cos\theta\), \(y = r\sin\theta\). Rectangular to polar: \(r = \sqrt{x^{2} + y^{2}}\) and \(\tan\theta = \dfrac{y}{x}\), choosing \(\theta\) in the quadrant where the point lies.`,
        example: R`\(\left(4, \frac{2\pi}{3}\right)\) is \(\left(-2, 2\sqrt{3}\right)\). The point \((-3, 3)\) has \(r = 3\sqrt{2}\) and \(\theta = \frac{3\pi}{4}\).`,
      },
      {
        title: 'Converting equations',
        text: R`Replace \(r^{2}\) with \(x^{2} + y^{2}\), \(r\cos\theta\) with \(x\) and \(r\sin\theta\) with \(y\) (or the reverse). Multiplying a polar equation by \(r\) often creates those combinations.`,
        example: R`\(r = 6\sin\theta\) becomes \(r^{2} = 6r\sin\theta\), so \(x^{2} + y^{2} = 6y\), which is \(x^{2} + (y - 3)^{2} = 9\).`,
      },
      {
        title: 'Recognising polar graphs',
        text: R`\(r = a\) is a circle centred at the pole. \(r = a\cos\theta\) and \(r = a\sin\theta\) are circles of diameter \(|a|\) through the pole, centred on the \(x\)-axis and \(y\)-axis. \(r = a\cos n\theta\) and \(r = a\sin n\theta\) are roses with \(n\) petals if \(n\) is odd and \(2n\) petals if \(n\) is even. \(r = a \pm b\cos\theta\) and \(r = a \pm b\sin\theta\) are limaçons: an inner loop if \(a < b\), a cardioid if \(a = b\), no loop if \(a > b\).`,
        example: R`\(r = 3\cos 2\theta\) is a rose with 4 petals of length 3. \(r = 2 + 2\cos\theta\) is a cardioid.`,
      },
      {
        title: 'The complex plane, modulus, argument and polar form',
        text: R`The complex number \(z = a + bi\) is the point \((a, b)\). Its modulus is \(|z| = \sqrt{a^{2} + b^{2}}\), its distance from the origin, and its argument \(\theta\) is its angle from the positive real axis. Then \(z = r(\cos\theta + i\sin\theta)\).`,
        example: R`\(z = -1 + \sqrt{3}\,i\) has \(|z| = 2\) and \(\theta = \frac{2\pi}{3}\): \(z = 2\left(\cos\frac{2\pi}{3} + i\sin\frac{2\pi}{3}\right)\).`,
      },
      {
        title: 'Multiplying and dividing in polar form',
        text: R`To multiply, multiply the moduli and add the arguments. To divide, divide the moduli and subtract the arguments.`,
        example: R`\(3(\cos 40^{\circ} + i\sin 40^{\circ}) \cdot 2(\cos 70^{\circ} + i\sin 70^{\circ}) = 6(\cos 110^{\circ} + i\sin 110^{\circ})\).`,
      },
      {
        title: "De Moivre's theorem and roots",
        text: R`\(\big[r(\cos\theta + i\sin\theta)\big]^{n} = r^{n}(\cos n\theta + i\sin n\theta)\). Every non-zero complex number has exactly \(n\) different \(n\)th roots: each has modulus \(\sqrt[n]{r}\), and their arguments are \(\dfrac{\theta + 2\pi k}{n}\) for \(k = 0, 1, \dots, n - 1\). They are equally spaced around a circle.`,
        example: R`\((1 + i)^{8} = \left(\sqrt{2}\right)^{8}\left(\cos 2\pi + i\sin 2\pi\right) = 16\). The cube roots of \(8i\) are \(\sqrt{3} + i\), \(-\sqrt{3} + i\) and \(-2i\).`,
      },
    ],
    vocab: [
      { term: 'pole and polar axis', def: 'The origin, and the ray from it along the positive x-axis, from which polar angles are measured.' },
      { term: 'modulus', def: R`The distance \(|z| = \sqrt{a^{2} + b^{2}}\) of the complex number \(a + bi\) from the origin.` },
      { term: 'argument', def: 'The angle from the positive real axis to the line joining the origin to a complex number.' },
      { term: 'rose, limaçon, cardioid', def: R`Families of polar curves: petals from \(r = a\cos n\theta\); a loop, dimple or heart shape from \(r = a \pm b\cos\theta\); the heart shape (cardioid) when \(a = b\).` },
    ],
    mistakes: [
      R`Taking \(\theta = \tan^{-1}\frac{y}{x}\) without checking the quadrant. The calculator angle may point to the opposite side of the origin.`,
      R`Multiplying the arguments when multiplying complex numbers. Moduli multiply; arguments add.`,
      R`Counting petals: \(r = a\cos 2\theta\) has 4 petals, not 2, because an even \(n\) gives \(2n\) petals.`,
      R`Giving only one root. A complex number has \(n\) different \(n\)th roots.`,
    ],
    visual: {
      type: 'plot',
      x: [-0.6, 4.2],
      y: [-0.6, 3.6],
      square: true,
      segments: [{ from: [0, 0], to: [3, 2.4], label: 'r' }, { from: [3, 2.4], to: [3, 0], dashed: true, color: 'c', label: 'y = r sin θ' }, { from: [0, -0.25], to: [3, -0.25], dashed: true, color: 'c', label: 'x = r cos θ' }],
      points: [{ x: 3, y: 2.4, label: '(r, θ)' }],
      alt: 'A point in the first quadrant joined to the origin by a segment of length r that makes an angle θ with the positive x-axis. Dashed segments show its horizontal distance x = r cos θ and its vertical distance y = r sin θ.',
    },
  },

  examples: [
    {
      title: 'Converting points both ways',
      problem: R`Convert \(\left(4, \frac{2\pi}{3}\right)\) to rectangular coordinates, and convert \((-3, 3)\) to polar coordinates.`,
      steps: [
        R`\(x = 4\cos\frac{2\pi}{3} = 4\left(-\frac{1}{2}\right) = -2\) and \(y = 4\sin\frac{2\pi}{3} = 4 \cdot \frac{\sqrt{3}}{2} = 2\sqrt{3}\). The point is \(\left(-2, 2\sqrt{3}\right)\).`,
        R`For \((-3, 3)\): \(r = \sqrt{9 + 9} = 3\sqrt{2}\).`,
        R`\(\tan\theta = \frac{3}{-3} = -1\), with the point in Quadrant II, so \(\theta = \frac{3\pi}{4}\) (not \(-\frac{\pi}{4}\)).`,
      ],
      answer: R`\(\left(-2, 2\sqrt{3}\right)\) and \(\left(3\sqrt{2}, \frac{3\pi}{4}\right)\)`,
    },
    {
      title: 'A polar equation in rectangular form',
      problem: R`Convert \(r = 6\sin\theta\) to rectangular form and describe the graph.`,
      steps: [
        R`Multiply both sides by \(r\): \(r^{2} = 6r\sin\theta\).`,
        R`Substitute \(r^{2} = x^{2} + y^{2}\) and \(r\sin\theta = y\): \(x^{2} + y^{2} = 6y\).`,
        R`Complete the square: \(x^{2} + (y - 3)^{2} = 9\). It is a circle with centre \((0, 3)\) and radius 3, passing through the pole.`,
      ],
      answer: R`\(x^{2} + (y - 3)^{2} = 9\)`,
      visual: {
        type: 'plot',
        x: [-5, 5],
        y: [-2, 8],
        square: true,
        param: [{ x: (t) => 6 * Math.sin(t) * Math.cos(t), y: (t) => 6 * Math.sin(t) * Math.sin(t), t: [0, Math.PI] }],
        points: [{ x: 0, y: 3, label: 'centre (0, 3)' }],
        alt: 'Graph of r = 6 sin θ: a circle of radius 3 centred at (0, 3). It passes through the origin and reaches up to (0, 6).',
      },
    },
    {
      title: "Polar form and De Moivre's theorem",
      problem: R`Write \(z = -1 + \sqrt{3}\,i\) in polar form and find \(z^{6}\).`,
      steps: [
        R`Modulus: \(|z| = \sqrt{1 + 3} = 2\).`,
        R`\(z\) is the point \(\left(-1, \sqrt{3}\right)\) in Quadrant II with \(\tan\theta = -\sqrt{3}\), so \(\theta = \frac{2\pi}{3}\): \(z = 2\left(\cos\frac{2\pi}{3} + i\sin\frac{2\pi}{3}\right)\).`,
        R`De Moivre: \(z^{6} = 2^{6}\left(\cos 4\pi + i\sin 4\pi\right) = 64\), because \(\cos 4\pi = 1\) and \(\sin 4\pi = 0\).`,
      ],
      answer: R`\(z = 2\left(\cos\frac{2\pi}{3} + i\sin\frac{2\pi}{3}\right)\) and \(z^{6} = 64\)`,
    },
    {
      title: 'Word problem: a position on radar',
      word: true,
      problem: R`A ship appears on a radar screen at polar coordinates \((10, 150^{\circ})\): 10 km from the station at \(150^{\circ}\) counterclockwise from due east. How far west and how far north of the station is it?`,
      steps: [
        R`Put the station at the origin, with east along the positive \(x\)-axis: the ship is at \(\left(10\cos 150^{\circ},\ 10\sin 150^{\circ}\right)\).`,
        R`\(x = 10\left(-\frac{\sqrt{3}}{2}\right) = -5\sqrt{3} \approx -8.7\). The negative sign means west.`,
        R`\(y = 10 \cdot \frac{1}{2} = 5\), which is north.`,
      ],
      answer: R`\(5\sqrt{3} \approx 8.7\) km west and 5 km north`,
    },
  ],

  models: [
    {
      id: 'complex-power',
      title: "Powers of a complex number (De Moivre's theorem)",
      intro: 'Choose z = a + bi and a power n. The model finds the modulus and argument, applies De Moivre, and checks the result by multiplying out.',
      inputs: [
        { name: 'a', label: 'Real part a', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'b', label: 'Imaginary part b', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'n', label: 'Power n', type: 'int', min: 2, max: 8, value: 8 },
      ],
      compute({ a, b, n }) {
        if (a === 0 && b === 0) return { error: 'Zero has no direction, so it has no polar form. Choose a number other than 0.' };
        const m2 = a * a + b * b;
        const theta = norm360(toDeg(Math.atan2(b, a)));
        const [re, im] = cpow([a, b], n);
        const z = terms([[a, ''], [b, 'i']]);
        const exactAngle = Number.isInteger(round(theta, 6));
        const lim = Math.max(Math.abs(a), Math.abs(b)) + 1;
        return {
          problem: R`Find \(\left(${z}\right)^{${n}}\).`,
          steps: [
            R`Modulus: \(r = \sqrt{(${a})^{2} + (${b})^{2}} = ${sqrtTex(m2)}\).`,
            R`Argument: the point \((${a}, ${b})\) is ${a === 0 || b === 0 ? 'on an axis' : `in Quadrant ${QUAD[quadrant(Math.round(theta * 1000) / 1000)]}`}, so \(\theta ${exactAngle ? '=' : R`\approx`} ${num(theta, { places: 1 })}^{\circ}\).`,
            R`De Moivre: the modulus becomes \(r^{${n}} = ${sqrtTex(m2).includes('sqrt') ? R`\left(${sqrtTex(m2)}\right)` : sqrtTex(m2)}^{${n}} = ${n % 2 ? sqrtTex(m2, m2 ** ((n - 1) / 2)) : num(m2 ** (n / 2))}\) and the argument becomes \(${n} \cdot ${num(theta, { places: 1 })}^{\circ} ${exactAngle ? '=' : R`\approx`} ${num(n * theta, { places: 1 })}^{\circ}\).`,
            R`Back in rectangular form: \(r^{${n}}\cos ${num(n * theta, { places: 1 })}^{\circ} ${exactAngle ? '=' : R`\approx`} ${num(re)}\) and \(r^{${n}}\sin ${num(n * theta, { places: 1 })}^{\circ} ${exactAngle ? '=' : R`\approx`} ${num(im)}\).`,
            R`Check by multiplying out \(${n}\) factors of \(${z}\) directly: the result is exactly \(${terms([[re, ''], [im, 'i']])}\). ✓`,
          ],
          answer: R`\(\left(${z}\right)^{${n}} = ${terms([[re, ''], [im, 'i']])}\)`,
          visual: {
            type: 'plot',
            x: [-lim, lim],
            y: [-lim, lim],
            square: true,
            segments: [{ from: [0, 0], to: [a, b], label: `r = ${Number.isInteger(Math.sqrt(m2)) ? Math.sqrt(m2) : `√${m2}`}` }],
            points: [{ x: a, y: b, label: 'z' }],
            axisLabels: ['Re', 'Im'],
            alt: `The complex plane with z plotted at (${a}, ${b}) and a segment from the origin to z showing its modulus. Its argument is about ${txt(theta, { places: 1 })} degrees.`,
          },
        };
      },
    },
    {
      id: 'radar-distance',
      title: 'Word problem: two positions on radar',
      word: true,
      intro: 'Two objects are located by distance and angle from a radar station (angles counterclockwise from east). Convert to rectangular coordinates to find how far apart they are.',
      inputs: [
        { name: 'r1', label: 'First distance (km)', type: 'int', min: 1, max: 100, value: 40 },
        { name: 't1', label: 'First angle (degrees)', type: 'int', min: 0, max: 359, value: 30 },
        { name: 'r2', label: 'Second distance (km)', type: 'int', min: 1, max: 100, value: 60 },
        { name: 't2', label: 'Second angle (degrees)', type: 'int', min: 0, max: 359, value: 150 },
      ],
      compute({ r1, t1, r2, t2 }) {
        const [p1, p2] = [[r1 * cosR(t1), r1 * sinR(t1)], [r2 * cosR(t2), r2 * sinR(t2)]];
        const dist = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
        const lim = Math.max(r1, r2) * 1.15;
        const c2 = (v) => num(v, { places: 2 });
        return {
          problem: R`Two aircraft are at polar positions \(\left(${r1},\ ${t1}^{\circ}\right)\) and \(\left(${r2},\ ${t2}^{\circ}\right)\) on a radar screen, with distances in kilometres. How far apart are they?`,
          steps: [
            R`First aircraft: \(x = ${r1}\cos ${t1}^{\circ} \approx ${c2(p1[0])}\), \(y = ${r1}\sin ${t1}^{\circ} \approx ${c2(p1[1])}\).`,
            R`Second aircraft: \(x = ${r2}\cos ${t2}^{\circ} \approx ${c2(p2[0])}\), \(y = ${r2}\sin ${t2}^{\circ} \approx ${c2(p2[1])}\).`,
            R`Differences: \(\Delta x \approx ${c2(p2[0] - p1[0])}\) and \(\Delta y \approx ${c2(p2[1] - p1[1])}\).`,
            R`Distance: \(\sqrt{(\Delta x)^{2} + (\Delta y)^{2}} \approx ${num(dist, { places: 1 })}\) km.`,
          ],
          answer: `About ${txt(dist, { places: 1 })} km apart`,
          visual: {
            type: 'plot',
            x: [-lim, lim],
            y: [-lim, lim],
            square: true,
            segments: [{ from: [0, 0], to: p1, label: `${r1}` }, { from: [0, 0], to: p2, label: `${r2}` }, { from: p1, to: p2, dashed: true, color: 'c' }],
            points: [{ x: p1[0], y: p1[1], label: 'first' }, { x: p2[0], y: p2[1], label: 'second', color: 'b' }],
            alt: `The radar station at the origin with the first aircraft at about (${txt(p1[0], { places: 1 })}, ${txt(p1[1], { places: 1 })}) and the second at about (${txt(p2[0], { places: 1 })}, ${txt(p2[1], { places: 1 })}). A dashed segment between them has length about ${txt(dist, { places: 1 })} km.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyPolarToRect, easyModulus, easyPlotPoint],
    medium: [mediumRectToPolar, mediumEquivalentPolar, mediumMultiplyPolar, mediumRadar],
    hard: [hardPolarForm, hardEquationToRect, hardIdentifyGraph, hardDeMoivre],
    challenge: [challengeRoots, challengeRadarDistance, challengeRectToPolarEquation],
  },
};
