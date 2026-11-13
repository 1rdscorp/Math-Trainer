import { R, q, frac, num, txt, paren, signed, product, terms, linear, poly, polyEval, factor, point, vec, sqrtTex, isSquare, round, gcd, person, checkEqual, checkAll } from '../../lib/index.js';
import { M, toRad, toDeg, degTex, cosDeg, sinDeg, refAngle, quadrant, norm360, dec, apart } from './_shared.js';

const U = R`\mathbf{u}`;
const V = R`\mathbf{v}`;
// Pythagorean triples [leg, leg, hypotenuse].
const TRIPLES = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15], [7, 24, 25], [12, 16, 20], [20, 21, 29]];
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
// A coefficient written in front of a bracket, with 1 and −1 hidden: cf(-1) → "-".
const cf = (a) => (a === 1 ? '' : a === -1 ? '-' : num(a));
// A constant added at the end of an expression: tail(3) → " + 3", tail(-3) → " - 3", tail(0) → "".
const tail = (k) => (k === 0 ? '' : ` ${signed(k)}`);
// √n with its simplified form when that is different: rootSteps(18) → "\sqrt{18} = 3\sqrt{2}".
const rootSteps = (n) => (sqrtTex(n) === R`\sqrt{${n}}` ? R`\sqrt{${n}}` : R`\sqrt{${n}} = ${sqrtTex(n)}`);
// A point as plain text, for labels and alt text in pictures.
const ptText = (x, y) => `(${txt(x)}, ${txt(y)})`;
// The angle with reference angle `ref` (degrees) that lies in quadrant `quad`.
const inQuadrant = (ref, quad) => [ref, 180 - ref, 180 + ref, 360 - ref][quad - 1];
// Where the components put a vector, as a phrase: SIGNS[quadrant].
const SIGNS = ['', 'both components are positive', R`the \(x\)-component is negative and the \(y\)-component is positive`, 'both components are negative', R`the \(x\)-component is positive and the \(y\)-component is negative`];

// ───────────── Easy ─────────────

function easyComponentForm(rng) {
  const a = rng.nonzero(-7, 7);
  const b = rng.nonzero(-7, 7);
  const y1 = rng.int(-5, 5);
  const x1 = y1 === 0 ? rng.nonzero(-5, 5) : rng.int(-5, 5);
  const [x2, y2] = [x1 + a, y1 + b];
  return q({
    prompt: R`Write the vector from \(P${point(x1, y1)}\) to \(Q${point(x2, y2)}\) in component form.`,
    visual: {
      type: 'plot',
      x: [Math.min(x1, x2, 0) - 1, Math.max(x1, x2, 0) + 1],
      y: [Math.min(y1, y2, 0) - 1, Math.max(y1, y2, 0) + 1],
      step: [1, 1],
      segments: [{ from: [x1, y1], to: [x2, y2], arrow: true, color: 'a' }],
      points: [{ x: x1, y: y1, label: 'P' }, { x: x2, y: y2, label: 'Q', color: 'b' }],
      alt: `An arrow drawn on a coordinate grid from the point P${ptText(x1, y1)} to the point Q${ptText(x2, y2)}.`,
    },
    correct: M(vec(a, b)),
    wrong: [
      { value: M(vec(-a, -b)), why: R`That is the vector from \(Q\) to \(P\). Subtract the initial point from the terminal point: \(Q - P\).` },
      { value: M(vec(x1 + x2, y1 + y2)), why: R`The components are the changes in \(x\) and in \(y\), so subtract the coordinates instead of adding them.` },
      { value: M(vec(a, -b)), why: 'Subtract in the same order for both coordinates: terminal minus initial.' },
      M(vec(-a, b)),
    ],
    solution: [
      R`Subtract the initial point \(P\) from the terminal point \(Q\): \(\langle x_{2} - x_{1},\ y_{2} - y_{1} \rangle\).`,
      R`\(\langle ${x2} - ${paren(x1)},\ ${y2} - ${paren(y1)} \rangle = ${vec(a, b)}\).`,
    ],
    rule: 0,
    skill: 'component form',
    check: () => (x1 + a === x2 && y1 + b === y2 ? true : 'P plus the vector does not land on Q'),
  });
}

function easyMagnitude(rng) {
  if (rng.bool(0.4)) {
    const [p, s, c] = rng.pick(TRIPLES);
    const [a, b] = rng.bool() ? [p * rng.sign(), s * rng.sign()] : [s * rng.sign(), p * rng.sign()];
    const scaled = (k) => M(vec(frac(a, k), frac(b, k)));
    return q({
      prompt: R`Find the unit vector in the direction of \(${V} = ${vec(a, b)}\).`,
      correct: scaled(c),
      wrong: [
        { value: scaled(Math.abs(a) + Math.abs(b)), why: R`Divide by the magnitude \(\sqrt{${a * a} + ${b * b}} = ${c}\), not by the sum of the components.` },
        { value: scaled(c * c), why: R`Divide by the magnitude \(${c}\), not by its square.` },
        { value: M(vec(Math.sign(a), Math.sign(b))), why: R`That vector has length \(\sqrt{2}\), and it does not point the same way as \(${V}\).` },
        scaled(-c),
      ],
      solution: [
        R`Magnitude: \(|${V}| = \sqrt{${paren(a)}^{2} + ${paren(b)}^{2}} = \sqrt{${a * a + b * b}} = ${c}\).`,
        R`Divide each component by \(${c}\): \(\dfrac{${V}}{|${V}|} = ${vec(frac(a, c), frac(b, c))}\).`,
      ],
      rule: 1,
      skill: 'unit vectors',
      check: () => checkAll(checkEqual(Math.hypot(a / c, b / c), 1), checkEqual((a * a + b * b) / c, c)),
    });
  }
  let [a, b] = [rng.sign() * rng.int(2, 9), rng.nonzero(-9, 9)];
  if (rng.bool()) {
    const [p, s] = rng.pick(TRIPLES);
    [a, b] = rng.bool() ? [p * rng.sign(), s * rng.sign()] : [s * rng.sign(), p * rng.sign()];
  }
  const n = a * a + b * b;
  return q({
    prompt: R`Find the magnitude of \(${V} = ${vec(a, b)}\).${isSquare(n) ? '' : ' Give the exact value.'}`,
    correct: M(sqrtTex(n)),
    wrong: [
      { value: M(num(Math.abs(a) + Math.abs(b))), why: R`The magnitude is the length of the arrow: the hypotenuse of a right triangle with legs \(${Math.abs(a)}\) and \(${Math.abs(b)}\). Use \(\sqrt{a^{2} + b^{2}}\).` },
      { value: M(num(n)), why: R`\(${n}\) is \(|${V}|^{2}\). Take the square root.` },
      a * a === b * b ? null : { value: M(sqrtTex(Math.abs(a * a - b * b))), why: a < 0 || b < 0 ? 'The squares of the components are added. A negative component still has a positive square.' : 'The squares of the components are added, not subtracted.' },
      M(sqrtTex(Math.abs(a) + Math.abs(b))),
      M(sqrtTex(2 * n)),
    ],
    solution: [
      R`\(|${V}| = \sqrt{${paren(a)}^{2} + ${paren(b)}^{2}} = \sqrt{${a * a} + ${b * b}} = \sqrt{${n}}\).`,
      isSquare(n) ? R`\(\sqrt{${n}} = ${sqrtTex(n)}\), so \(|${V}| = ${sqrtTex(n)}\).` : sqrtTex(n) === R`\sqrt{${n}}` ? R`\(${n}\) has no square factor, so \(|${V}| = \sqrt{${n}}\).` : R`Simplify: \(\sqrt{${n}} = ${sqrtTex(n)}\).`,
    ],
    rule: 1,
    skill: 'magnitude',
    check: () => checkEqual(n, Math.hypot(a, b) ** 2),
  });
}

function easyCombine(rng) {
  const [a, b, c, d] = [rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6), rng.nonzero(-6, 6)];
  const p = rng.pick([1, 1, 2, 3]);
  const s = rng.pick([1, -1, -1, 2, -2]);
  const m = Math.abs(s);
  const op = s > 0 ? '+' : '-';
  const [rx, ry] = [p * a + s * c, p * b + s * d];
  const scaledParts = [p === 1 ? null : R`\(${p}${U} = ${vec(p * a, p * b)}\)`, m === 1 ? null : R`\(${m}${V} = ${vec(m * c, m * d)}\)`].filter(Boolean);
  return q({
    prompt: R`Let \(${U} = ${vec(a, b)}\) and \(${V} = ${vec(c, d)}\). Find \(${terms([[p, U], [s, V]])}\).`,
    correct: M(vec(rx, ry)),
    wrong: [
      { value: M(vec(p * a - s * c, p * b - s * d)), why: s > 0 ? R`That subtracts \(${V}\). The expression adds it.` : R`That adds \(${V}\). The expression subtracts it.` },
      { value: M(vec(rx, p * b - s * d)), why: `${s > 0 ? 'Add' : 'Subtract'} both pairs of components in the same way.` },
      p === 1 ? null : { value: M(vec(rx, b + s * d)), why: R`A scalar multiplies every component: \(${p}${U} = ${vec(p * a, p * b)}\).` },
      M(vec(p * a - s * c, ry)),
    ],
    solution: [
      ...(scaledParts.length ? [`Multiply by the scalars first: ${scaledParts.join(' and ')}.`] : []),
      R`${s > 0 ? 'Add' : 'Subtract'} matching components: \(\langle ${p * a} ${op} ${paren(m * c)},\ ${p * b} ${op} ${paren(m * d)} \rangle = ${vec(rx, ry)}\).`,
    ],
    rule: 2,
    skill: 'vector arithmetic',
  });
}

function easyParamPoint(rng) {
  const a = rng.nonzero(-4, 4);
  const b = rng.int(-6, 6);
  const e = rng.pick([1, 1, -1, 2]);
  const d = rng.int(-6, 6);
  const k = rng.nonzero(-4, 4);
  const X = (t) => a * t + b;
  const Y = (t) => e * t * t + d;
  const pt = (x, y) => M(point(x, y));
  return q({
    prompt: R`A curve has parametric equations \(x = ${linear(a, b, 't')}\), \(y = ${poly([e, 0, d], 't')}\). Which point of the curve corresponds to \(t = ${k}\)?`,
    correct: pt(X(k), Y(k)),
    wrong: [
      { value: pt(Y(k), X(k)), why: R`The first equation gives \(x\) and the second gives \(y\). These coordinates are in the wrong order.` },
      e > 0 && k > 0 ? null : { value: pt(X(k), -e * k * k + d), why: R`Square first, then apply the sign: \(${cf(e)}(${k})^{2} = ${e * k * k}\).` },
      { value: pt(X(k), 2 * e * k + d), why: R`\(t^{2}\) means \(t \cdot t\), not \(2t\).` },
      pt(X(-k), Y(-k)),
      pt(X(k + 1), Y(k + 1)),
      pt(X(k - 1), Y(k - 1)),
    ],
    solution: [
      R`Substitute \(t = ${k}\) into both equations.`,
      R`\(x = ${a === 1 ? paren(k) : `${cf(a)}(${k})`}${tail(b)} = ${X(k)}\).`,
      R`\(y = ${e === 1 ? paren(k) : `${cf(e)}(${k})`}^{2}${tail(d)} = ${Y(k)}\).`,
      R`The point is \(${point(X(k), Y(k))}\).`,
    ],
    rule: 4,
    skill: 'points on a parametric curve',
    check: () => checkAll(checkEqual(polyEval([a, b], k), X(k)), checkEqual(polyEval([e, 0, d], k), Y(k))),
  });
}

// ───────────── Medium ─────────────

function mediumDirection(rng) {
  const th = rng.pick([30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330]);
  const r = rng.pick([2, 4, 6, 8, 10, 12]);
  const [cx, sy] = [cosDeg(th).mul(r), sinDeg(th).mul(r)];
  const quad = quadrant(th);
  const ref = refAngle(th);
  const check = () => checkAll(checkEqual(Math.hypot(cx.value, sy.value), r), checkEqual(norm360(toDeg(Math.atan2(sy.value, cx.value))), th));
  if (rng.bool()) {
    const v = (x, y) => M(vec(x.tex(), y.tex()));
    return q({
      prompt: R`A vector \(${V}\) has magnitude \(${r}\) and direction angle \(${degTex(th)}\). Write \(${V}\) in component form, using exact values.`,
      correct: v(cx, sy),
      wrong: [
        { value: v(sy, cx), why: R`The \(x\)-component is \(|${V}|\cos\theta\) and the \(y\)-component is \(|${V}|\sin\theta\). Here they are the other way round.` },
        { value: v(cx.abs(), sy.abs()), why: R`An angle of \(${degTex(th)}\) points into quadrant ${ROMAN[quad]}, where ${SIGNS[quad]}.` },
        v(cx.neg(), sy),
        v(cx, sy.neg()),
        v(cx.neg(), sy.neg()),
      ],
      solution: [
        R`Use \(${V} = \langle |${V}|\cos\theta,\ |${V}|\sin\theta \rangle\), with \(\cos ${degTex(th)} = ${cosDeg(th).tex()}\) and \(\sin ${degTex(th)} = ${sinDeg(th).tex()}\).`,
        R`\(${V} = \left\langle ${r}\left(${cosDeg(th).tex()}\right),\ ${r}\left(${sinDeg(th).tex()}\right) \right\rangle = ${vec(cx.tex(), sy.tex())}\).`,
      ],
      rule: 1,
      skill: 'components from magnitude and angle',
      check,
    });
  }
  const tan = sy.div(cx);
  const how = [R`\theta = ${degTex(ref)}`, R`\theta = 180^{\circ} - ${degTex(ref)} = ${degTex(th)}`, R`\theta = 180^{\circ} + ${degTex(ref)} = ${degTex(th)}`, R`\theta = 360^{\circ} - ${degTex(ref)} = ${degTex(th)}`][quad - 1];
  return q({
    prompt: R`Find the direction angle \(\theta\) of \(${V} = ${vec(cx.tex(), sy.tex())}\), where \(0^{\circ} \le \theta < 360^{\circ}\).`,
    correct: th,
    fmt: (deg) => M(degTex(deg)),
    wrong: [
      { value: norm360(th + 180), why: R`That angle has the same tangent, but it points the opposite way. Here ${SIGNS[quad]}, so the vector is in quadrant ${ROMAN[quad]}.` },
      quad === 1 ? null : { value: ref, why: R`That is the reference angle. Because ${SIGNS[quad]}, the vector is in quadrant ${ROMAN[quad]}.` },
      ref === 45 ? null : { value: inQuadrant(90 - ref, quad), why: R`\(\tan\theta = \dfrac{y}{x}\), not \(\dfrac{x}{y}\).` },
      180 - ref,
      360 - ref,
      180 + ref,
      ref,
    ],
    solution: [
      R`\(\tan\theta = \dfrac{y}{x} = ${tan.tex()}\). Since \(\tan ${degTex(ref)} = ${tan.abs().tex()}\), the reference angle is \(${degTex(ref)}\).`,
      R`Because ${SIGNS[quad]}, the vector points into quadrant ${ROMAN[quad]}.`,
      R`So \(${how}\).`,
    ],
    rule: 1,
    skill: 'direction angle',
    check,
  });
}

function mediumDotProduct(rng) {
  const [a, b, c, d] = [rng.nonzero(-8, 8), rng.nonzero(-8, 8), rng.nonzero(-8, 8), rng.nonzero(-8, 8)];
  if (rng.bool(0.55)) {
    const ans = a * c + b * d;
    return q({
      prompt: R`Find the dot product \(${U} \cdot ${V}\) for \(${U} = ${vec(a, b)}\) and \(${V} = ${vec(c, d)}\).`,
      correct: ans,
      wrong: [
        { value: a * d + b * c, why: 'Multiply matching components: first with first, second with second.' },
        { value: a * c - b * d, why: 'The two products are added. Check the sign of each product too.' },
        { value: a + c + b + d, why: 'Multiply the matching components first, then add the two products.' },
        (a + b) * (c + d),
        -ans,
      ],
      solution: [
        R`Multiply matching components and add: \(${U} \cdot ${V} = ${product(a, c)} + ${product(b, d)}\).`,
        R`\(${a * c} + ${paren(b * d)} = ${ans}\).${ans === 0 ? ' A dot product of 0 means the vectors are perpendicular.' : ''}`,
      ],
      rule: 3,
      skill: 'dot product',
      check: () => checkEqual(Math.hypot(a, b) * Math.hypot(c, d) * Math.cos(Math.atan2(d, c) - Math.atan2(b, a)), ans, 1e-9),
    });
  }
  const k = frac(-a * c, d);
  return q({
    prompt: R`For which value of \(k\) are \(${U} = ${vec(a, 'k')}\) and \(${V} = ${vec(c, d)}\) perpendicular?`,
    correct: k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [
      { value: frac(a * c, d), why: R`The dot product \(${terms([[a * c, ''], [d, 'k']])}\) must equal 0. Watch the sign when the \(${a * c}\) moves to the other side.` },
      { value: frac(a * d, c), why: R`That value makes \(${U}\) parallel to \(${V}\). Perpendicular vectors have a dot product of 0.` },
      frac(-a * d, c),
      frac(-d, a * c),
    ],
    solution: [
      R`Perpendicular vectors have a dot product of 0: \(${product(a, c)} + ${product('k', d)} = 0\).`,
      R`That is \(${terms([[a * c, ''], [d, 'k']])} = 0\), so \(${terms([[d, 'k']])} = ${-a * c}\)${Math.abs(d) === 1 && d > 0 ? '' : R` and \(k = ${k.tex()}\)`}.`,
    ],
    rule: 3,
    skill: 'perpendicular vectors',
    check: () => checkEqual(a * c + k.value * d, 0),
  });
}

function mediumEliminate(rng) {
  const verify = (xt, yt, right, wrongs) => () => {
    const pts = [-2, -1, 0, 1, 3].map((t) => [xt(t), yt(t)]);
    const on = (o) => pts.every(([x, y]) => Math.abs(o.f(x) - y) < 1e-9);
    return on(right) && wrongs.every((w) => !on(w)) ? true : 'the parametric equations do not single out the answer';
  };
  if (rng.bool()) {
    const a = rng.pick([1, 1, -1, 2, -2, 3]);
    const m = rng.nonzero(-4, 4);
    const b = rng.nonzero(-6, 6);
    const d = rng.int(-6, 6);
    const line = (s, k) => ({ text: R`\(y = ${linear(s, k)}\)`, f: (x) => s * x + k });
    const right = line(m, d - m * b);
    const wrongs = [line(m, d), line(m, d + m * b), a === 1 ? null : line(a * m, d - a * m * b), line(-m, d - m * b)].filter(Boolean);
    const tTex = a === 1 ? linear(1, -b) : a === -1 ? linear(-1, b) : R`${a < 0 ? '-' : ''}\dfrac{${linear(1, -b)}}{${Math.abs(a)}}`;
    return q({
      prompt: R`Eliminate the parameter to write \(y\) as a function of \(x\): \(\;x = ${linear(a, b, 't')},\quad y = ${linear(a * m, d, 't')}\).`,
      correct: right.text,
      wrong: [
        { value: wrongs[0].text, why: R`Solving \(x = ${linear(a, b, 't')}\) for \(t\) gives \(t = ${tTex}\). The constant has to be undone as well.` },
        { value: wrongs[1].text, why: R`\(t = ${tTex}\): the constant changes sign when it moves to the other side.` },
        ...wrongs.slice(2).map((w) => w.text),
      ],
      solution: [
        R`Solve \(x = ${linear(a, b, 't')}\) for \(t\): \(t = ${tTex}\).`,
        R`Substitute into \(y = ${linear(a * m, d, 't')}\): \(y = ${cf(a * m)}\left(${tTex}\right)${tail(d)}${a === 1 ? '' : ` = ${cf(m)}(${linear(1, -b)})${tail(d)}`}\).`,
        R`Simplify: \(y = ${linear(m, d - m * b)}\).`,
      ],
      rule: 5,
      skill: 'eliminating the parameter',
      check: verify((t) => a * t + b, (t) => a * m * t + d, right, wrongs),
    });
  }
  const h = rng.nonzero(-6, 6);
  const k = rng.int(-6, 6);
  const e = rng.pick([1, 1, -1]);
  const par = (sg, hh, kk) => ({ text: R`\(y = ${sg < 0 ? '-' : ''}${factor(hh)}^{2}${tail(kk)}\)`, f: (x) => sg * (x - hh) ** 2 + kk });
  const right = par(e, h, k);
  const split = { text: R`\(y = ${poly([e, 0, k - e * h * h])}\)`, f: (x) => e * x * x + k - e * h * h };
  const wrongs = [par(e, -h, k), split, k === 0 ? null : par(e, h, -k), par(-e, h, k)].filter(Boolean);
  return q({
    prompt: R`Eliminate the parameter to write \(y\) as a function of \(x\): \(\;x = ${linear(1, h, 't')},\quad y = ${poly([e, 0, k], 't')}\).`,
    correct: right.text,
    wrong: [
      { value: wrongs[0].text, why: R`From \(x = ${linear(1, h, 't')}\), \(t = ${linear(1, -h)}\). Replace \(t\) by exactly that expression.` },
      { value: wrongs[1].text, why: R`\((${linear(1, -h)})^{2}\) is not \(x^{2} - ${h * h}\). Keep the square as it is, or expand it in full.` },
      ...wrongs.slice(2).map((w) => w.text),
    ],
    solution: [
      R`Solve \(x = ${linear(1, h, 't')}\) for \(t\): \(t = ${linear(1, -h)}\).`,
      R`Substitute into \(y = ${poly([e, 0, k], 't')}\): \(y = ${e < 0 ? '-' : ''}${factor(h)}^{2}${tail(k)}\).`,
      R`The path is a parabola with vertex \(${point(h, k)}\).`,
    ],
    rule: 5,
    skill: 'eliminating the parameter',
    check: verify((t) => t + h, (t) => e * t * t + k, right, wrongs),
  });
}

function mediumConstantVelocity(rng) {
  const s = rng.pick([
    { who: 'ferry', len: 'kilometres', per: 'kilometres per hour', unit: 'hour' },
    { who: 'ship', len: 'kilometres', per: 'kilometres per hour', unit: 'hour' },
    { who: 'drone', len: 'metres', per: 'metres per second', unit: 'second' },
    { who: 'robot', len: 'metres', per: 'metres per second', unit: 'second' },
  ]);
  const [a, b] = [rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
  const y0 = rng.int(-8, 8);
  const x0 = y0 === 0 ? rng.nonzero(-8, 8) : rng.int(-8, 8);
  const setup = R`A ${s.who} moves across a map marked in ${s.len} with constant velocity \(${vec(a, b)}\) ${s.per}. At \(t = 0\) it is at \(${point(x0, y0)}\).`;
  if (rng.bool(0.6)) {
    const T = rng.int(2, 6);
    const at = (t) => [x0 + a * t, y0 + b * t];
    const pt = ([x, y]) => M(point(x, y));
    return q({
      prompt: R`${setup} Where is it ${T} ${s.unit}s later?`,
      correct: pt(at(T)),
      wrong: [
        { value: pt([a * T, b * T]), why: R`\(${vec(a * T, b * T)}\) is the displacement during those ${T} ${s.unit}s. Add it to the starting position.` },
        { value: pt(at(1)), why: `That is the position after 1 ${s.unit}. The velocity acts for ${T} ${s.unit}s.` },
        { value: pt([x0 * T + a, y0 * T + b]), why: 'The time multiplies the velocity. The starting position is added once.' },
        pt(at(-T)),
        pt(at(T + 1)),
      ],
      solution: [
        R`Position = starting position + time × velocity: \(${vec(x0, y0)} + ${T}${vec(a, b)}\).`,
        R`\(x = ${x0} + ${T}(${a}) = ${x0 + a * T}\) and \(y = ${y0} + ${T}(${b}) = ${y0 + b * T}\).`,
        R`The ${s.who} is at \(${point(...at(T))}\).`,
      ],
      rule: 6,
      skill: 'motion along a line',
      check: () => {
        let pos = [x0, y0];
        for (let i = 0; i < T; i++) pos = [pos[0] + a, pos[1] + b];
        return pos[0] === at(T)[0] && pos[1] === at(T)[1] ? true : 'stepping forward one time unit at a time gives a different point';
      },
    });
  }
  const eq = (xc, xt, yc, yt) => ({ text: R`\(x = ${terms([[xc, ''], [xt, 't']])},\ y = ${terms([[yc, ''], [yt, 't']])}\)`, f: (t) => [xc + xt * t, yc + yt * t] });
  const right = eq(x0, a, y0, b);
  const wrongs = [eq(a, x0, b, y0), eq(x0, b, y0, a), eq(0, a, 0, b), eq(x0, -a, y0, -b), eq(0, x0 + a, 0, y0 + b)];
  const fits = (o) => o.f(0)[0] === x0 && o.f(0)[1] === y0 && o.f(1)[0] - x0 === a && o.f(1)[1] - y0 === b;
  return q({
    prompt: R`${setup} Which parametric equations give its position after \(t\) ${s.unit}s?`,
    correct: right.text,
    wrong: [
      { value: wrongs[0].text, why: R`The starting coordinates are the constants, and the velocity components multiply \(t\).` },
      { value: wrongs[1].text, why: R`The first component of the velocity, \(${a}\), is the rate at which \(x\) changes.` },
      { value: wrongs[2].text, why: R`That path starts at the origin. This one starts at \(${point(x0, y0)}\).` },
      ...wrongs.slice(3).map((w) => w.text),
    ],
    solution: [
      R`Each coordinate starts at its value when \(t = 0\) and then changes at a constant rate, the matching component of the velocity.`,
      R`\(x\) starts at \(${x0}\) and changes by \(${a}\) each ${s.unit}: \(x = ${terms([[x0, ''], [a, 't']])}\).`,
      R`\(y\) starts at \(${y0}\) and changes by \(${b}\) each ${s.unit}: \(y = ${terms([[y0, ''], [b, 't']])}\).`,
    ],
    rule: 6,
    skill: 'motion along a line',
    check: () => (fits(right) && wrongs.every((w) => w.text === right.text || !fits(w)) ? true : 'the equations do not match the start and the velocity'),
  });
}

// ───────────── Hard ─────────────

function hardAngleBetween(rng) {
  const [a, b, c, d] = [rng.nonzero(-9, 9), rng.nonzero(-9, 9), rng.nonzero(-9, 9), rng.nonzero(-9, 9)];
  const dotv = a * c + b * d;
  const [n1, n2] = [a * a + b * b, c * c + d * d];
  const cos = dotv / Math.sqrt(n1 * n2);
  const exact = toDeg(Math.acos(cos));
  const part = exact - Math.floor(exact);
  // Skip parallel and perpendicular pairs, and angles that sit close to a rounding boundary.
  if (a * d - b * c === 0 || dotv === 0 || (part > 0.35 && part < 0.65)) return hardAngleBetween(rng);
  const ans = Math.round(exact);
  return q({
    prompt: R`Find the angle between \(${U} = ${vec(a, b)}\) and \(${V} = ${vec(c, d)}\). Round to the nearest degree.`,
    correct: ans,
    fmt: (deg) => M(degTex(deg)),
    wrong: apart(ans, [
      { value: 180 - exact, why: R`The dot product is \(${dotv}\), which is ${dotv < 0 ? 'negative, so the angle is obtuse' : 'positive, so the angle is acute'}. Check the signs of the products.` },
      exact < 90 ? { value: 90 - exact, why: R`\(\cos\theta = \dfrac{${U} \cdot ${V}}{|${U}||${V}|}\), so use the inverse cosine, not the inverse sine.` } : null,
      { value: toDeg(Math.acos(dotv / (n1 * n2))), why: R`Divide by the magnitudes \(${sqrtTex(n1)}\) and \(${sqrtTex(n2)}\), not by their squares \(${n1}\) and \(${n2}\).` },
      exact / 2,
    ], { places: 0, positive: true }),
    solution: [
      R`Dot product: \(${U} \cdot ${V} = ${product(a, c)} + ${product(b, d)} = ${dotv}\).`,
      R`Magnitudes: \(|${U}| = ${rootSteps(n1)}\) and \(|${V}| = ${rootSteps(n2)}\).`,
      R`\(\cos\theta = \dfrac{${U} \cdot ${V}}{|${U}||${V}|} = ${dotv < 0 ? '-' : ''}\dfrac{${Math.abs(dotv)}}{${sqrtTex(n1)} \cdot ${sqrtTex(n2)}} \approx ${num(cos, { places: 4 })}\).`,
      R`\(\theta = \cos^{-1}(${num(cos, { places: 4 })}) \approx ${degTex(ans)}\).`,
    ],
    rule: 3,
    skill: 'angle between vectors',
    check: () => {
      let diff = Math.abs(toDeg(Math.atan2(b, a) - Math.atan2(d, c)));
      if (diff > 180) diff = 360 - diff;
      return Math.abs(diff - ans) <= 0.5 ? true : `direction angles differ by ${diff} degrees`;
    },
  });
}

function hardResultant(rng) {
  if (rng.bool(0.55)) {
    const p = 10 * rng.int(2, 9);
    const s = 10 * rng.intExcept(2, 9, [p / 10]);
    const al = rng.pick([30, 45, 60, 120, 135, 150]);
    const [x2, y2] = [s * Math.cos(toRad(al)), s * Math.sin(toRad(al))];
    const exact = Math.hypot(p + x2, y2);
    const part = exact * 10 - Math.floor(exact * 10);
    if (part > 0.35 && part < 0.65) return hardResultant(rng);
    const ans = round(exact, 1);
    const sc = rng.pick([
      { text: `Two tugboats pull a barge with forces of ${p} kN and ${s} kN. The angle between the two tow lines is ${al}°.`, unit: 'kN', word: 'kilonewton' },
      { text: `Two ropes are tied to a crate. One is pulled with a force of ${p} N and the other with a force of ${s} N. The angle between the ropes is ${al}°.`, unit: 'N', word: 'newton' },
      { text: `Two cables pull on a ring with forces of ${p} N and ${s} N. The angle between the cables is ${al}°.`, unit: 'N', word: 'newton' },
    ]);
    const n2 = (v) => num(v, { places: 2 });
    return q({
      prompt: `${sc.text} Find the magnitude of the resultant force. Round to the nearest tenth of a ${sc.word}.`,
      correct: ans,
      fmt: dec(1, sc.unit),
      wrong: apart(ans, [
        { value: Math.sqrt(p * p + s * s - 2 * p * s * Math.cos(toRad(al))), why: R`In the tip-to-tail triangle, the angle opposite the resultant is \(180^{\circ} - ${degTex(al)} = ${degTex(180 - al)}\), not \(${degTex(al)}\).` },
        { value: p + s, why: 'Magnitudes add only when the forces act in the same direction. Add the forces as vectors.' },
        { value: Math.hypot(p, s), why: R`\(\sqrt{${p}^{2} + ${s}^{2}}\) is the resultant only when the forces are perpendicular.` },
        Math.abs(p - s),
      ], { places: 1, positive: true }),
      solution: [
        R`Put the ${p} ${sc.unit} force along the positive \(x\)-axis: \(\mathbf{F}_{1} = ${vec(p, 0)}\).`,
        R`The other force makes an angle of \(${degTex(al)}\) with it: \(\mathbf{F}_{2} = \langle ${s}\cos ${degTex(al)},\ ${s}\sin ${degTex(al)} \rangle \approx ${vec(n2(x2), n2(y2))}\).`,
        R`Add the components: \(\mathbf{F}_{1} + \mathbf{F}_{2} \approx ${vec(n2(p + x2), n2(y2))}\).`,
        R`Magnitude: \(\sqrt{${paren(p + x2, { places: 2 })}^{2} + ${n2(y2)}^{2}} \approx ${num(ans, { fixed: 1 })}\) ${sc.unit}.`,
      ],
      rule: 2,
      skill: 'resultant force',
      check: () => (Math.abs(Math.sqrt(p * p + s * s - 2 * p * s * Math.cos(toRad(180 - al))) - ans) <= 0.05 + 1e-9 ? true : 'the law of cosines gives a different magnitude'),
    });
  }
  const craft = rng.pick([
    { name: 'A plane', medium: 'the air', push: 'wind', unit: 'km/h', sets: [[70, 240, 250], [90, 400, 410], [100, 240, 260], [150, 360, 390], [140, 480, 500]] },
    { name: 'A ferry', medium: 'the water', push: 'current', unit: 'km/h', sets: [[6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [10, 24, 26], [7, 24, 25]] },
    { name: 'A drone', medium: 'the air', push: 'wind', unit: 'm/s', sets: [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15]] },
  ]);
  const [w, v0, c] = rng.pick(craft.sets);
  const hd = rng.pick(['north', 'south']);
  const pd = rng.pick(['east', 'west']);
  const th = round(toDeg(Math.atan(w / v0)), 1);
  const opt = (speed, ang) => R`\(${speed}\) ${craft.unit}, \(${num(ang, { fixed: 1 })}^{\circ}\) ${pd} of ${hd}`;
  return q({
    prompt: `${craft.name} heads due ${hd} at ${v0} ${craft.unit} relative to ${craft.medium}. A ${craft.push} carries it due ${pd} at ${w} ${craft.unit}. Find its speed and its direction of travel over the ground. Round the angle to the nearest tenth of a degree.`,
    correct: opt(c, th),
    wrong: [
      { value: opt(c, 90 - th), why: R`Measured from due ${hd}, the angle has the ${craft.push} speed opposite it: \(\tan\theta = \dfrac{${w}}{${v0}}\).` },
      { value: opt(v0 + w, th), why: 'The two velocities are perpendicular, so the speeds combine by the Pythagorean theorem, not by adding.' },
      opt(v0 + w, 90 - th),
    ],
    solution: [
      `The velocity over the ground is the vector sum of ${v0} ${craft.unit} due ${hd} and ${w} ${craft.unit} due ${pd}. These are perpendicular.`,
      R`Speed: \(\sqrt{${v0}^{2} + ${w}^{2}} = \sqrt{${num(v0 * v0 + w * w)}} = ${c}\) ${craft.unit}.`,
      R`Direction: the angle away from due ${hd} satisfies \(\tan\theta = \dfrac{${w}}{${v0}}\), so \(\theta = \tan^{-1}\!\left(\dfrac{${w}}{${v0}}\right) \approx ${num(th, { fixed: 1 })}^{\circ}\) ${pd} of ${hd}.`,
    ],
    rule: 2,
    skill: 'resultant velocity',
    check: () => (Math.abs(c * Math.cos(toRad(th)) - v0) < 0.002 * c && Math.abs(c * Math.sin(toRad(th)) - w) < 0.002 * c ? true : 'speed and direction do not rebuild the two velocities'),
  });
}

function hardCircleMotion(rng) {
  const r = rng.int(2, 6);
  const h = rng.nonzero(-5, 5);
  const k = rng.int(-5, 5);
  const [sx, sy] = [rng.sign(), rng.sign()];
  const cosOnX = rng.bool();
  const [fx, fy] = cosOnX ? [R`\cos t`, R`\sin t`] : [R`\sin t`, R`\cos t`];
  const xTex = terms([[h, ''], [sx * r, fx]]);
  const yTex = terms([[k, ''], [sy * r, fy]]);
  const pos = (t) => (cosOnX ? [h + sx * r * Math.cos(t), k + sy * r * Math.sin(t)] : [h + sx * r * Math.sin(t), k + sy * r * Math.cos(t)]);
  if (rng.bool()) {
    const start = cosOnX ? [h + sx * r, k] : [h, k + sy * r];
    const quarter = cosOnX ? [h, k + sy * r] : [h + sx * r, k];
    const ccw = cosOnX ? sx * sy > 0 : sx * sy < 0;
    const opt = (p, dir) => R`Starts at \(${point(...p)}\) and moves ${dir ? 'counterclockwise' : 'clockwise'}`;
    const place = ([x, y]) => (x > h ? 'rightmost' : x < h ? 'leftmost' : y > k ? 'highest' : 'lowest');
    return q({
      prompt: R`A particle moves along the circle \(x = ${xTex}\), \(y = ${yTex}\) for \(0 \le t \le 2\pi\). Where does it start, and which way does it go round?`,
      correct: opt(start, ccw),
      wrong: [
        { value: opt(start, !ccw), why: R`Find a second point. At \(t = \frac{\pi}{2}\) the particle is at \(${point(...quarter)}\), the ${place(quarter)} point of the circle.` },
        { value: opt(quarter, ccw), why: R`At \(t = 0\), \(\cos t = 1\) and \(\sin t = 0\), so the particle starts at \(${point(...start)}\).` },
        opt(quarter, !ccw),
      ],
      solution: [
        R`At \(t = 0\): \(\cos 0 = 1\) and \(\sin 0 = 0\), so the particle starts at \(${point(...start)}\), the ${place(start)} point of the circle with centre \(${point(h, k)}\).`,
        R`At \(t = \frac{\pi}{2}\): \(\cos\frac{\pi}{2} = 0\) and \(\sin\frac{\pi}{2} = 1\), so it has reached \(${point(...quarter)}\), the ${place(quarter)} point.`,
        `A quarter turn from the ${place(start)} point to the ${place(quarter)} point is ${ccw ? 'counterclockwise' : 'clockwise'} motion.`,
      ],
      rule: 4,
      skill: 'direction of motion',
      check: () => {
        const [p0, p1] = [pos(0), pos(0.1)];
        const turn = (p0[0] - h) * (p1[1] - k) - (p0[1] - k) * (p1[0] - h);
        return checkAll(checkEqual(p0[0], start[0]), checkEqual(p0[1], start[1]), turn > 0 === ccw ? true : 'the direction of motion is wrong');
      },
    });
  }
  const circ = (hh, kk, rhs, sign = 1) => ({ text: R`\(${factor(hh)}^{2} ${sign > 0 ? '+' : '-'} ${factor(kk, 'y')}^{2} = ${rhs}\)`, F: (x, y) => (x - hh) ** 2 + sign * (y - kk) ** 2 - rhs });
  const right = circ(h, k, r * r);
  const wrongs = [circ(-h, -k, r * r), circ(h, k, r), h === k ? null : circ(k, h, r * r), circ(h, k, r * r, -1)].filter(Boolean);
  const samples = [0.3, 1.1, 2.5, 4].map(pos);
  return q({
    prompt: R`Eliminate the parameter. Which equation in \(x\) and \(y\) describes the path \(x = ${xTex}\), \(y = ${yTex}\), \(0 \le t \le 2\pi\)?`,
    correct: right.text,
    wrong: [
      { value: wrongs[0].text, why: R`Isolating the trig term gives \(${linear(1, -h)} = ${terms([[sx * r, fx]])}\), so the centre is \(${point(h, k)}\).` },
      { value: wrongs[1].text, why: R`The right-hand side is the radius squared: \(${r}^{2} = ${r * r}\).` },
      ...wrongs.slice(2).map((w) => w.text),
    ],
    solution: [
      R`Isolate the trig terms: \(${linear(1, -h)} = ${terms([[sx * r, fx]])}\) and \(${linear(1, -k, 'y')} = ${terms([[sy * r, fy]])}\).`,
      R`Square both equations and add them: \(${factor(h)}^{2} + ${factor(k, 'y')}^{2} = ${r * r}${cosOnX ? R`\cos^{2} t` : R`\sin^{2} t`} + ${r * r}${cosOnX ? R`\sin^{2} t` : R`\cos^{2} t`}\).`,
      R`Because \(\cos^{2} t + \sin^{2} t = 1\), the path is \(${factor(h)}^{2} + ${factor(k, 'y')}^{2} = ${r * r}\): the circle with centre \(${point(h, k)}\) and radius \(${r}\).`,
    ],
    rule: 5,
    skill: 'eliminating the parameter',
    check: () => (samples.every(([x, y]) => Math.abs(right.F(x, y)) < 1e-9) && wrongs.every((w) => samples.some(([x, y]) => Math.abs(w.F(x, y)) > 1e-6)) ? true : 'points of the path do not single out the equation'),
  });
}

function hardProjectile(rng) {
  // Height y = −16(t − T)(t + s): the ball lands at t = T; s = 0 means it starts on the ground.
  const T = rng.pick([1.5, 2, 2.5, 3, 3.5, 4]);
  const s = rng.pick([0, 0, 0.5, 1]);
  const vx = rng.pick([20, 24, 30, 36, 40, 50, 60]);
  const vy = 16 * (T - s);
  const h0 = 16 * T * s;
  const y = (t) => h0 + vy * t - 16 * t * t;
  const top = (T - s) / 2;
  const name = person(rng);
  const yTex = terms([[h0, ''], [vy, 't'], [-16, 't^{2}']]);
  const setup = R`${name} ${h0 ? 'throws a ball from a balcony' : 'kicks a ball off the ground'}. After \(t\) seconds the ball is at \(x = ${vx}t\), \(y = ${yTex}\), where \(x\) is the horizontal distance from ${name} and \(y\) is the height above the ground, both in feet.`;
  const landing = [
    R`The ball lands when \(y = 0\): \(${yTex} = 0\).`,
    R`Divide by \(-16\): \(${poly([1, -(T - s), -T * s], 't')} = 0\), which factors as \(${s === 0 ? `t(t - ${num(T)})` : `(t - ${num(T)})(t + ${num(s)})`} = 0\).`,
    s === 0 ? R`\(t = 0\) is the launch, so the ball lands at \(t = ${num(T)}\) seconds.` : R`\(t = ${num(-s)}\) is before the launch, so the ball lands at \(t = ${num(T)}\) seconds.`,
  ];
  const kind = rng.pick(['time', 'range', 'height']);
  if (kind === 'time') {
    return q({
      prompt: `${setup} For how long is the ball in the air?`,
      correct: T,
      fmt: (v) => R`\(${num(v)}\) ${v === 1 ? 'second' : 'seconds'}`,
      wrong: [
        { value: top, why: R`That is when the ball is at its highest point. It lands when \(y = 0\).` },
        s === 0 ? null : { value: T - s, why: R`That solves \(${vy}t - 16t^{2} = 0\), which leaves out the starting height of ${h0} feet.` },
        2 * T,
        T + 1,
      ],
      solution: landing,
      rule: 6,
      skill: 'projectile motion',
      check: () => checkAll(checkEqual(y(T), 0), y(T / 2) > 0 ? true : 'the ball is not in the air before that time'),
    });
  }
  if (kind === 'range') {
    return q({
      prompt: `${setup} How far from ${name}, measured along the ground, does the ball land?`,
      correct: vx * T,
      unit: 'feet',
      wrong: [
        { value: vx * top, why: 'That is the horizontal distance when the ball is at its highest point, not when it lands.' },
        s === 0 ? null : { value: vx * (T - s), why: R`That uses the time from \(${vy}t - 16t^{2} = 0\), which leaves out the starting height of ${h0} feet.` },
        { value: y(top), why: R`That is the greatest height. The question asks for \(x\) at the moment the ball lands.` },
        vx * (T + 1),
        vx * 2 * T,
      ],
      solution: [...landing, R`Horizontal distance: \(x = ${vx}(${num(T)}) = ${num(vx * T)}\) feet.`],
      rule: 6,
      skill: 'projectile motion',
      check: () => checkAll(checkEqual(y(T), 0), checkEqual(y(vx * T / vx), 0)),
    });
  }
  return q({
    prompt: `${setup} What is the greatest height the ball reaches?`,
    correct: y(top),
    unit: 'feet',
    wrong: [
      { value: h0 + vy * top, why: R`The term \(-16t^{2}\) must be included: gravity pulls the ball back down.` },
      s === 0 ? null : { value: y(T / 2), why: R`The highest point is at the vertex, \(t = ${num(top)}\), which is not halfway through the flight when the ball starts above the ground.` },
      s === 0 ? null : { value: y(top) - h0, why: `That is the rise above the starting point. Add the starting height of ${h0} feet.` },
      { value: h0 + vy * top - 16 * top, why: R`In the last term, \(t\) is squared: \(16(${num(top)})^{2} = ${num(16 * top * top)}\).` },
      vy,
      2 * y(top),
    ],
    solution: [
      R`The height \(y = ${yTex}\) is a quadratic in \(t\) that opens downward, so its greatest value is at the vertex: \(t = -\dfrac{b}{2a} = \dfrac{${vy}}{32} = ${num(top)}\) seconds.`,
      R`\(y = ${h0 ? `${h0} + ` : ''}${vy}(${num(top)}) - 16(${num(top)})^{2} = ${h0 ? `${h0} + ` : ''}${num(vy * top)} - ${num(16 * top * top)} = ${num(y(top))}\) feet.`,
    ],
    rule: 6,
    skill: 'projectile motion',
    check: () => checkEqual(Math.max(...Array.from({ length: 4001 }, (_, i) => y((T * i) / 4000))), y(top), 1e-5),
  });
}

// ───────────── Challenge ─────────────

function challengeEquilibrium(rng) {
  const [p, s, c] = rng.pick(TRIPLES.filter((t) => t[0] !== 20));
  const k = rng.pick([1, 2, 5, 10]);
  const [a, b] = rng.bool() ? [p * k, s * k] : [s * k, p * k];
  const [sx, sy] = [rng.sign(), rng.sign()];
  const [fx, fy] = [-sx * a, -sy * b]; // the balancing force
  const quad = fx > 0 ? (fy > 0 ? 1 : 4) : fy > 0 ? 2 : 3;
  const refExact = toDeg(Math.atan(b / a));
  const [ref, th] = [round(refExact, 1), round(inQuadrant(refExact, quad), 1)];
  const opt = (mag, ang) => R`\(${mag}\) N at \(${num(ang, { fixed: 1 })}^{\circ}\)`;
  const how = [R`\theta \approx ${num(ref, { fixed: 1 })}^{\circ}`, R`\theta \approx 180^{\circ} - ${num(ref, { fixed: 1 })}^{\circ} = ${num(th, { fixed: 1 })}^{\circ}`, R`\theta \approx 180^{\circ} + ${num(ref, { fixed: 1 })}^{\circ} = ${num(th, { fixed: 1 })}^{\circ}`, R`\theta \approx 360^{\circ} - ${num(ref, { fixed: 1 })}^{\circ} = ${num(th, { fixed: 1 })}^{\circ}`][quad - 1];
  return q({
    prompt: `A force of ${a} N acting due ${sx > 0 ? 'east' : 'west'} and a force of ${b} N acting due ${sy > 0 ? 'north' : 'south'} pull on a ring. A third force holds the ring in equilibrium. Find the magnitude of the third force and its direction angle, measured counterclockwise from due east and rounded to the nearest tenth of a degree.`,
    correct: opt(c * k, th),
    wrong: [
      { value: opt(c * k, round(norm360(inQuadrant(refExact, quad) + 180), 1)), why: 'That is the resultant of the two given forces. The balancing force points the opposite way.' },
      { value: opt(c * k, round(inQuadrant(90 - refExact, quad), 1)), why: R`The reference angle satisfies \(\tan\theta = \dfrac{${b}}{${a}}\): the north–south component over the east–west component.` },
      { value: opt(a + b, th), why: R`The two given forces are perpendicular, so their resultant has magnitude \(\sqrt{${a}^{2} + ${b}^{2}}\), not \(${a} + ${b}\).` },
      opt(a + b, round(norm360(inQuadrant(refExact, quad) + 180), 1)),
    ],
    solution: [
      R`Take east as the positive \(x\)-direction and north as the positive \(y\)-direction. The given forces are \(${vec(sx * a, 0)}\) and \(${vec(0, sy * b)}\), so their resultant is \(${vec(sx * a, sy * b)}\).`,
      R`In equilibrium the three forces add to the zero vector, so the third force is the opposite of that resultant: \(${vec(fx, fy)}\).`,
      R`Magnitude: \(\sqrt{${a}^{2} + ${b}^{2}} = ${c * k}\) N.`,
      R`Direction: the reference angle is \(\tan^{-1}\!\left(\dfrac{${b}}{${a}}\right) \approx ${num(ref, { fixed: 1 })}^{\circ}\), and \(${vec(fx, fy)}\) points into quadrant ${ROMAN[quad]}, so \(${how}\).`,
    ],
    rule: 2,
    skill: 'forces in equilibrium',
    check: () => (Math.abs(sx * a + c * k * Math.cos(toRad(th))) < 0.002 * c * k && Math.abs(sy * b + c * k * Math.sin(toRad(th))) < 0.002 * c * k ? true : 'the three forces do not add to zero'),
  });
}

function challengeRiverCrossing(rng) {
  // Speeds in tenths of a metre per second: [current, speed straight across, speed through the water].
  const sc = rng.pick([
    { craft: 'swimmer', verb: 'swims', v: [6, 8, 10] }, { craft: 'swimmer', verb: 'swims', v: [5, 12, 13] },
    { craft: 'kayaker', verb: 'paddles', v: [15, 20, 25] }, { craft: 'kayaker', verb: 'paddles', v: [12, 16, 20] },
    { craft: 'rower', verb: 'rows', v: [10, 24, 26] }, { craft: 'ferry', verb: 'travels', v: [25, 60, 65] },
    { craft: 'ferry', verb: 'travels', v: [30, 40, 50] }, { craft: 'ferry', verb: 'travels', v: [14, 48, 50] },
    { craft: 'motorboat', verb: 'travels', v: [20, 48, 52] }, { craft: 'motorboat', verb: 'travels', v: [40, 75, 85] }, { craft: 'motorboat', verb: 'travels', v: [35, 120, 125] },
  ]);
  const [cur, across, speed] = sc.v.map((v) => v / 10);
  const flow = rng.pick(['east', 'west']);
  const up = flow === 'east' ? 'west' : 'east';
  const setup = `A river flows due ${flow} at ${cur} m/s. A ${sc.craft} who ${sc.verb} at ${speed} m/s in still water has to go straight across the river, due north, to a point directly opposite.`.replace('ferry who', 'ferry that').replace('motorboat who', 'motorboat that');
  const shared = [
    `The velocity over the ground is the velocity through the water plus the current. For the sum to point due north, the heading must be partly ${up}, so that the ${up}ward part of the velocity through the water cancels the current.`,
    R`The velocities form a right triangle: the hypotenuse is \(${speed}\) (speed through the water), one leg is \(${cur}\) (cancelling the current), and the other leg is the speed straight across, \(\sqrt{${speed}^{2} - ${cur}^{2}} = ${across}\) m/s.`,
  ];
  if (rng.bool(0.6)) {
    const T = rng.pick([50, 100, 150, 200, 250, 300]);
    const W = (sc.v[1] * T) / 10;
    return q({
      prompt: `${setup} The river is ${W} m wide. How long does the crossing take? Round to the nearest second.`,
      correct: T,
      unit: 'seconds',
      wrong: apart(T, [
        { value: W / speed, why: `That uses the full ${speed} m/s. Part of that speed is spent cancelling the current, so less of it carries the ${sc.craft} across.` },
        { value: W / Math.hypot(speed, cur), why: `Adding the two velocities at right angles describes pointing straight across and drifting downstream. Here the ${sc.craft} must not drift.` },
        { value: W / (speed - cur), why: 'The speeds are not subtracted directly. The velocities form a right triangle with the speed through the water as hypotenuse.' },
        W / cur,
      ], { places: 0, positive: true }),
      solution: [...shared, R`Time \(= ${W} \div ${across} = ${T}\) seconds.`],
      rule: 2,
      skill: 'resultant velocity',
      check: () => checkAll(checkEqual(Math.hypot(cur, across), speed), checkEqual(across * T, W)),
    });
  }
  const exact = toDeg(Math.asin(cur / speed));
  const ans = round(exact, 1);
  return q({
    prompt: `${setup} At what angle ${up} of due north must the ${sc.craft} point? Round to the nearest tenth of a degree.`,
    correct: ans,
    fmt: (v) => M(degTex(v, { fixed: 1 })),
    wrong: apart(ans, [
      { value: toDeg(Math.atan(cur / speed)), why: R`The \(${speed}\) m/s is the hypotenuse of the velocity triangle, so use the sine: \(\sin\theta = \dfrac{${cur}}{${speed}}\).` },
      { value: 90 - exact, why: 'That is the angle between the heading and the river bank. The question asks for the angle away from due north.' },
      exact / 2,
      2 * exact,
    ], { places: 1, positive: true }),
    solution: [...shared, R`The angle \(\theta\) between the heading and due north has the current's leg opposite it: \(\sin\theta = \dfrac{${cur}}{${speed}}\), so \(\theta = \sin^{-1}(${num(cur / speed, { places: 4 })}) \approx ${num(ans, { fixed: 1 })}^{\circ}\) ${up} of north.`],
    rule: 1,
    skill: 'resultant velocity',
    check: () => (Math.abs(speed * Math.sin(toRad(ans)) - cur) < 0.002 * speed && Math.abs(speed * Math.cos(toRad(ans)) - across) < 0.002 * speed ? true : 'that heading does not cancel the current'),
  });
}

function challengeCollision(rng) {
  const speeds = [-4, -3, -2, -1, 1, 2, 3, 4];
  const [a1, a2] = rng.sample(speeds, 2);
  const [b1, b2] = rng.sample(speeds, 2);
  if (a1 * b2 - a2 * b1 === 0) return challengeCollision(rng);
  const P = [rng.int(-9, 9), rng.int(-9, 9)];
  const collide = rng.bool(0.45);
  const tA = rng.int(1, 5);
  const tB = collide ? tA : rng.intExcept(1, 6, [tA]);
  const A0 = [P[0] - a1 * tA, P[1] - b1 * tA];
  const B0 = [P[0] - a2 * tB, P[1] - b2 * tB];
  const A = (t) => [A0[0] + a1 * t, A0[1] + b1 * t];
  const B = (t) => [B0[0] + a2 * t, B0[1] + b2 * t];
  const xEq = (s0, vx, t = 't') => terms([[s0[0], ''], [vx, t]]);
  const yEq = (s0, vy, t = 't') => terms([[s0[1], ''], [vy, t]]);
  const yes = (pt, t) => R`Yes: both are at \(${point(...pt)}\) when \(t = ${t}\)`;
  const no = (pt, t1, t2) => R`No: the paths cross at \(${point(...pt)}\), but A is there at \(t = ${t1}\) and B at \(t = ${t2}\)`;
  const parallel = { value: 'No: the paths are parallel, so they never meet', why: R`The direction vectors \(${vec(a1, b1)}\) and \(${vec(a2, b2)}\) are not multiples of each other, so the paths do cross.` };
  const tx = frac(B0[0] - A0[0], a1 - a2); // the only time at which the x-coordinates agree
  // Eliminating s from  a1·t − a2·s = dx  and  b1·t − b2·s = dy  (A at time t, B at time s).
  const [dx, dy] = [B0[0] - A0[0], B0[1] - A0[1]];
  const g = gcd(a2, b2);
  const [m1, m2] = [Math.abs(b2) / g, Math.abs(a2) / g];
  const sg = Math.sign(a2) * Math.sign(b2);
  const scale = [m1 === 1 ? null : R`the first equation by \(${m1}\)`, m2 === 1 ? null : R`the second by \(${m2}\)`].filter(Boolean);
  const eliminate = `${scale.length ? `Multiply ${scale.join(' and ')}, then ${sg > 0 ? 'subtract' : 'add'} them` : `${sg > 0 ? 'Subtract' : 'Add'} the equations`}`;
  const [yA, yB] = [tx.mul(b1).add(A0[1]), tx.mul(b2).add(B0[1])];
  const prompt = R`Two drones fly at constant velocities. At time \(t \ge 0\) seconds, drone A is at \(x = ${xEq(A0, a1)},\ y = ${yEq(A0, b1)}\) and drone B is at \(x = ${xEq(B0, a2)},\ y = ${yEq(B0, b2)}\), with distances in metres. Do the drones collide?`;
  const check = () => {
    const meet = A(tA)[0] === P[0] && A(tA)[1] === P[1] && B(tB)[0] === P[0] && B(tB)[1] === P[1];
    const hit = tx.value >= 0 && yA.eq(yB);
    const solved = (a1 * m1 - sg * b1 * m2) * tA === m1 * dx - sg * m2 * dy && -a2 * m1 + sg * b2 * m2 === 0;
    return meet && solved && hit === collide ? true : 'the stated outcome does not match the motion';
  };
  if (collide) {
    return q({
      prompt,
      correct: yes(P, tA),
      wrong: [
        { value: no(P, tA, tA + 1), why: R`Substitute \(t = ${tA}\) into B's equations: B is at \(${point(...P)}\) at that time as well.` },
        parallel,
        yes(A(tA + 1), tA + 1),
      ],
      solution: [
        R`A collision means the same point at the same time, so use one \(t\) for both drones. Set the \(x\)-coordinates equal: \(${xEq(A0, a1)} = ${xEq(B0, a2)}\), which gives \(t = ${tA}\).`,
        R`Check the \(y\)-coordinates at \(t = ${tA}\): A has \(y = ${P[1]}\) and B has \(y = ${P[1]}\). They agree.`,
        R`Both drones are at \(${point(...P)}\) when \(t = ${tA}\), so they collide.`,
      ],
      rule: 6,
      skill: 'paths and collisions',
      check,
    });
  }
  return q({
    prompt,
    correct: no(P, tA, tB),
    wrong: [
      tx.isInt() && tx.value >= 0 ? { value: yes(A(tx.value), tx.value), why: R`At \(t = ${tx.tex()}\) the \(x\)-coordinates agree, but the \(y\)-coordinates are \(${yA.tex()}\) and \(${yB.tex()}\). A collision needs both to agree at the same time.` } : null,
      { value: yes(P, tA), why: R`At \(t = ${tA}\) drone B is at \(${point(...B(tA))}\), not at \(${point(...P)}\).` },
      parallel,
      yes(P, tB),
    ],
    solution: [
      R`A collision needs the same point at the same time. Setting the \(x\)-coordinates equal, \(${xEq(A0, a1)} = ${xEq(B0, a2)}\), gives \(t = ${tx.tex()}\)${tx.value < 0 ? R`, which is not in \(t \ge 0\)` : R`, but then the \(y\)-coordinates are \(${yA.tex()}\) and \(${yB.tex()}\)`}. So there is no collision.`,
      R`To see whether the paths cross, let A be there at time \(t\) and B at time \(s\): \(${xEq(A0, a1)} = ${xEq(B0, a2, 's')}\) and \(${yEq(A0, b1)} = ${yEq(B0, b2, 's')}\).`,
      R`Rearranged, these are \(${terms([[a1, 't'], [-a2, 's']])} = ${dx}\) and \(${terms([[b1, 't'], [-b2, 's']])} = ${dy}\). ${eliminate} to eliminate \(s\): \(${terms([[a1 * m1 - sg * b1 * m2, 't']])} = ${m1 * dx - sg * m2 * dy}\), so \(t = ${tA}\). Substituting back gives \(s = ${tB}\). Both give the point \(${point(...P)}\).`,
      R`The paths cross at \(${point(...P)}\), but A is there at \(t = ${tA}\) and B at \(t = ${tB}\): no collision.`,
    ],
    rule: 6,
    skill: 'paths and collisions',
    check,
  });
}

export default {
  id: 'vectors-parametric',
  title: 'Vectors & Parametric Equations',
  summary: 'Work with vectors in component form, find resultants and angles, and describe motion with parametric equations.',
  standards: ['AP Precalculus 4.1', 'AP Precalculus 4.2', 'AP Precalculus 4.3', 'AP Precalculus 4.8', 'AP Precalculus 4.9', 'CCSS N-VM.A.1', 'CCSS N-VM.A.3', 'CCSS N-VM.B.4', 'CCSS N-VM.B.5'],

  explain: {
    intro: R`A vector is a quantity with a size and a direction: a displacement, a velocity, a force. Writing it in components, \(\langle a, b \rangle\), turns the geometry of arrows into arithmetic. Parametric equations use the same idea for motion: they give \(x\) and \(y\) separately as functions of a third variable \(t\) (usually time), so a path comes with a direction and a timetable.`,
    rules: [
      {
        title: 'Component form',
        text: R`The vector from an initial point \(P(x_{1}, y_{1})\) to a terminal point \(Q(x_{2}, y_{2})\) is \(\langle x_{2} - x_{1},\ y_{2} - y_{1} \rangle\): terminal minus initial. Arrows with the same components are the same vector, wherever they are drawn.`,
        example: R`From \(P(1, 5)\) to \(Q(4, 3)\): \(\langle 4 - 1,\ 3 - 5 \rangle = \langle 3, -2 \rangle\).`,
      },
      {
        title: 'Magnitude, direction and unit vectors',
        text: R`The magnitude of \(\mathbf{v} = \langle a, b \rangle\) is \(|\mathbf{v}| = \sqrt{a^{2} + b^{2}}\). Its direction angle \(\theta\) is measured counterclockwise from the positive \(x\)-axis: \(\tan\theta = \dfrac{b}{a}\), with \(\theta\) placed in the quadrant the signs of \(a\) and \(b\) point to. Going the other way, \(\mathbf{v} = \langle |\mathbf{v}|\cos\theta,\ |\mathbf{v}|\sin\theta \rangle\). Dividing a vector by its magnitude gives the unit vector (length 1) in the same direction.`,
        example: R`\(\mathbf{v} = \langle -3, 4 \rangle\) has \(|\mathbf{v}| = 5\) and unit vector \(\left\langle -\frac{3}{5}, \frac{4}{5} \right\rangle\). A vector of magnitude \(6\) at \(150^{\circ}\) is \(\langle 6\cos 150^{\circ},\ 6\sin 150^{\circ} \rangle = \langle -3\sqrt{3}, 3 \rangle\).`,
      },
      {
        title: 'Adding, subtracting and scaling',
        text: R`Work one component at a time: \(\langle a, b \rangle + \langle c, d \rangle = \langle a + c,\ b + d \rangle\) and \(k\langle a, b \rangle = \langle ka, kb \rangle\). In a picture, place the arrows tip to tail; the sum, called the resultant, runs from the first tail to the last tip. Forces or velocities that act together combine by vector addition, so their magnitudes do not simply add.`,
        example: R`\(2\langle 1, -3 \rangle - \langle 4, 2 \rangle = \langle 2 - 4,\ -6 - 2 \rangle = \langle -2, -8 \rangle\).`,
      },
      {
        title: 'Dot product and the angle between vectors',
        text: R`The dot product \(\mathbf{u} \cdot \mathbf{v} = u_{1}v_{1} + u_{2}v_{2}\) is a number. It also equals \(|\mathbf{u}||\mathbf{v}|\cos\theta\), where \(\theta\) is the angle between the vectors, so \(\cos\theta = \dfrac{\mathbf{u} \cdot \mathbf{v}}{|\mathbf{u}||\mathbf{v}|}\). Two non-zero vectors are perpendicular exactly when their dot product is 0.`,
        example: R`\(\langle 2, 3 \rangle \cdot \langle 6, -4 \rangle = 12 - 12 = 0\), so these vectors are perpendicular.`,
      },
      {
        title: 'Parametric equations and direction of motion',
        text: R`Equations \(x = f(t)\), \(y = g(t)\) give one point for each value of the parameter \(t\). Make a table of \(t\), \(x\) and \(y\), plot the points, and mark the direction in which \(t\) increases. The same path can be traced in either direction and at different speeds.`,
        example: R`For \(x = 2t\), \(y = t^{2} - 1\): \(t = -1, 0, 1, 2\) give the points \((-2, 0)\), \((0, -1)\), \((2, 0)\), \((4, 3)\), traced from left to right.`,
      },
      {
        title: 'Eliminating the parameter',
        text: R`To find the path as an equation in \(x\) and \(y\), solve one equation for \(t\) and substitute into the other. When the equations contain \(\cos t\) and \(\sin t\), isolate them and use \(\cos^{2} t + \sin^{2} t = 1\). The result shows the shape of the path but no longer says where the object is at each time.`,
        example: R`\(x = t + 1\), \(y = t^{2}\): \(t = x - 1\), so \(y = (x - 1)^{2}\). \(x = 3\cos t\), \(y = 3\sin t\): \(x^{2} + y^{2} = 9\).`,
      },
      {
        title: 'Lines and projectiles',
        text: R`An object that starts at \((x_{0}, y_{0})\) and moves with constant velocity \(\langle a, b \rangle\) is at \(x = x_{0} + at\), \(y = y_{0} + bt\): a line with slope \(\dfrac{b}{a}\). A projectile launched from height \(h\) with speed \(v_{0}\) at angle \(\theta\) above the horizontal follows \(x = (v_{0}\cos\theta)t\), \(y = h + (v_{0}\sin\theta)t - \frac{1}{2}gt^{2}\), where \(\frac{1}{2}g\) is \(4.9\) in metres or \(16\) in feet. It lands when \(y = 0\).`,
        example: R`From \((1, 2)\) with velocity \(\langle 3, -1 \rangle\): \(x = 1 + 3t\), \(y = 2 - t\). For \(y = 48t - 16t^{2}\), the ball lands when \(16t(3 - t) = 0\), at \(t = 3\).`,
      },
    ],
    vocab: [
      { term: 'vector', def: 'A quantity with both magnitude (size) and direction, drawn as an arrow.' },
      { term: 'component form', def: R`A vector written as \(\langle a, b \rangle\): its horizontal change \(a\) and its vertical change \(b\).` },
      { term: 'direction angle', def: R`The angle from the positive \(x\)-axis counterclockwise to the vector, from \(0^{\circ}\) up to \(360^{\circ}\).` },
      { term: 'unit vector', def: 'A vector of length 1.' },
      { term: 'resultant', def: 'The sum of two or more vectors: the single vector that has the same effect as all of them together.' },
      { term: 'dot product', def: R`The number \(u_{1}v_{1} + u_{2}v_{2}\) formed from two vectors.` },
      { term: 'parameter', def: R`The extra variable, usually \(t\), on which both \(x\) and \(y\) depend.` },
    ],
    mistakes: [
      R`Subtracting the wrong way round. The vector from \(P\) to \(Q\) is \(Q - P\).`,
      R`Reading \(\tan^{-1}\left(\frac{b}{a}\right)\) straight off a calculator as the direction angle. The calculator answers between \(-90^{\circ}\) and \(90^{\circ}\); when \(a < 0\) the vector points the opposite way, so add \(180^{\circ}\).`,
      R`Adding magnitudes to get the magnitude of a sum. \(|\mathbf{u} + \mathbf{v}| = |\mathbf{u}| + |\mathbf{v}|\) only when the vectors point the same way.`,
      'Calling two moving objects a collision because their paths cross. They collide only if they reach the crossing point at the same time.',
    ],
    visual: {
      type: 'plot',
      x: [-1, 7],
      y: [-1, 6],
      step: [1, 1],
      segments: [
        { from: [0, 0], to: [4, 1], arrow: true, label: 'u = ⟨4, 1⟩', color: 'a' },
        { from: [4, 1], to: [5, 4], arrow: true, label: 'v = ⟨1, 3⟩', color: 'b' },
        { from: [0, 0], to: [5, 4], arrow: true, label: 'u + v = ⟨5, 4⟩', color: 'c' },
      ],
      alt: 'Vector u = ⟨4, 1⟩ drawn from the origin to (4, 1), vector v = ⟨1, 3⟩ drawn from the tip of u to (5, 4), and the resultant u + v = ⟨5, 4⟩ drawn from the origin to (5, 4), closing the triangle.',
    },
  },

  examples: [
    {
      title: 'Component form, magnitude and direction',
      problem: R`Find the component form, the magnitude and the direction angle of the vector from \(P(2, -1)\) to \(Q(-1, 2)\).`,
      steps: [
        R`Component form: terminal minus initial, \(\langle -1 - 2,\ 2 - (-1) \rangle = \langle -3, 3 \rangle\).`,
        R`Magnitude: \(\sqrt{(-3)^{2} + 3^{2}} = \sqrt{18} = 3\sqrt{2}\).`,
        R`Direction: \(\tan\theta = \dfrac{3}{-3} = -1\), so the reference angle is \(45^{\circ}\). The \(x\)-component is negative and the \(y\)-component is positive, so the vector points into quadrant II: \(\theta = 180^{\circ} - 45^{\circ} = 135^{\circ}\).`,
      ],
      answer: R`\(\langle -3, 3 \rangle\), with magnitude \(3\sqrt{2}\) and direction angle \(135^{\circ}\)`,
      visual: {
        type: 'plot',
        x: [-4, 3],
        y: [-2, 4],
        step: [1, 1],
        segments: [{ from: [2, -1], to: [-1, 2], arrow: true, color: 'a' }, { from: [0, 0], to: [-3, 3], arrow: true, color: 'b', label: '⟨−3, 3⟩' }],
        points: [{ x: 2, y: -1, label: 'P' }, { x: -1, y: 2, label: 'Q' }],
        alt: 'An arrow from P(2, −1) to Q(−1, 2), and an equal arrow from the origin to (−3, 3). Both go 3 units left and 3 units up, so they are the same vector, pointing up and to the left at 135° from the positive x-axis.',
      },
    },
    {
      title: 'The angle between two vectors',
      problem: R`Find the angle between \(\mathbf{u} = \langle 3, 4 \rangle\) and \(\mathbf{v} = \langle 5, -12 \rangle\), to the nearest tenth of a degree.`,
      steps: [
        R`Dot product: \(\mathbf{u} \cdot \mathbf{v} = (3)(5) + (4)(-12) = 15 - 48 = -33\).`,
        R`Magnitudes: \(|\mathbf{u}| = \sqrt{9 + 16} = 5\) and \(|\mathbf{v}| = \sqrt{25 + 144} = 13\).`,
        R`\(\cos\theta = -\dfrac{33}{5 \cdot 13} = -\dfrac{33}{65}\). The negative sign says the angle is obtuse.`,
        R`\(\theta = \cos^{-1}\left(-\dfrac{33}{65}\right) \approx 120.5^{\circ}\).`,
      ],
      answer: R`About \(120.5^{\circ}\)`,
    },
    {
      title: 'Word problem: a plane in a crosswind',
      word: true,
      problem: 'A plane heads due north at 240 km/h relative to the air. A wind blows it due east at 70 km/h. Find the speed and direction of the plane over the ground.',
      steps: [
        R`Two velocities act on the plane at once, so its velocity over the ground is their vector sum. With east as \(x\) and north as \(y\): \(\langle 0, 240 \rangle + \langle 70, 0 \rangle = \langle 70, 240 \rangle\).`,
        R`Speed: \(\sqrt{70^{2} + 240^{2}} = \sqrt{62{,}500} = 250\) km/h. The speeds 240 and 70 do not simply add, because the velocities are perpendicular.`,
        R`Direction: the angle away from due north has the 70 opposite it and the 240 next to it, so \(\tan\theta = \dfrac{70}{240}\) and \(\theta \approx 16.3^{\circ}\).`,
      ],
      answer: 'About 250 km/h, in a direction 16.3° east of due north.',
      visual: {
        type: 'plot',
        x: [-110, 180],
        y: [-20, 270],
        square: true,
        step: [50, 50],
        segments: [
          { from: [0, 0], to: [0, 240], arrow: true, label: 'heading 240', color: 'a' },
          { from: [0, 240], to: [70, 240], arrow: true, label: 'wind 70', color: 'b' },
          { from: [0, 0], to: [70, 240], arrow: true, label: 'ground 250', color: 'c' },
        ],
        alt: 'A velocity triangle. An arrow of length 240 points north from the origin, an arrow of length 70 points east from its tip, and the resultant arrow of length 250 runs from the origin to the point (70, 240), leaning slightly east of north.',
      },
    },
    {
      title: 'Eliminating the parameter',
      problem: R`A point moves along \(x = t - 2\), \(y = t^{2} + 1\) for \(-2 \le t \le 2\). Find an equation for the path in \(x\) and \(y\), and describe the motion.`,
      steps: [
        R`Table: \(t = -2, -1, 0, 1, 2\) give \((-4, 5)\), \((-3, 2)\), \((-2, 1)\), \((-1, 2)\), \((0, 5)\).`,
        R`Solve \(x = t - 2\) for \(t\): \(t = x + 2\).`,
        R`Substitute into \(y = t^{2} + 1\): \(y = (x + 2)^{2} + 1\), a parabola with vertex \((-2, 1)\).`,
        R`As \(t\) increases, \(x = t - 2\) increases, so the point moves from left to right: from \((-4, 5)\) down to the vertex and up to \((0, 5)\). Only the part with \(-4 \le x \le 0\) is traced.`,
      ],
      answer: R`\(y = (x + 2)^{2} + 1\) for \(-4 \le x \le 0\), traced from left to right`,
      visual: {
        type: 'plot',
        x: [-6, 2],
        y: [-1, 7],
        step: [1, 1],
        param: [{ x: (t) => t - 2, y: (t) => t * t + 1, t: [-2, 2] }],
        segments: [{ from: [-1.3, 1.49], to: [-0.9, 2.21], arrow: true, color: 'a' }],
        points: [{ x: -4, y: 5, label: 't = −2' }, { x: -2, y: 1, label: 't = 0' }, { x: 0, y: 5, label: 't = 2' }],
        alt: 'The arc of the parabola y = (x + 2)² + 1 from (−4, 5), where t = −2, down to the vertex (−2, 1), where t = 0, and up to (0, 5), where t = 2. An arrowhead on the curve shows motion from left to right.',
      },
    },
    {
      title: 'Word problem: a kicked ball',
      word: true,
      problem: R`A ball is kicked from the ground at 20 m/s, at an angle of \(30^{\circ}\) above the horizontal. How long is it in the air, and how far away does it land? Use \(\frac{1}{2}g = 4.9\).`,
      steps: [
        R`Split the launch velocity into components: \(v_{x} = 20\cos 30^{\circ} \approx 17.32\) m/s and \(v_{y} = 20\sin 30^{\circ} = 10\) m/s.`,
        R`Parametric equations: \(x = 17.32t\), \(y = 10t - 4.9t^{2}\).`,
        R`The ball lands when \(y = 0\): \(t(10 - 4.9t) = 0\), so \(t = \dfrac{10}{4.9} \approx 2.04\) seconds (\(t = 0\) is the kick).`,
        R`Horizontal distance: \(x = 17.32 \times 2.04 \approx 35.3\) m.`,
      ],
      answer: 'About 2.04 seconds in the air, landing about 35.3 m away.',
    },
  ],

  models: [
    {
      id: 'two-vectors',
      title: 'Resultant, dot product and angle',
      intro: 'Type the components of two vectors. The picture places them tip to tail to show the resultant.',
      inputs: [
        { name: 'a', label: 'u: horizontal component', type: 'int', min: -10, max: 10, value: 4 },
        { name: 'b', label: 'u: vertical component', type: 'int', min: -10, max: 10, value: 1 },
        { name: 'c', label: 'v: horizontal component', type: 'int', min: -10, max: 10, value: -1 },
        { name: 'd', label: 'v: vertical component', type: 'int', min: -10, max: 10, value: 3 },
      ],
      compute({ a, b, c, d }) {
        const [rx, ry] = [a + c, b + d];
        const n = rx * rx + ry * ry;
        const [n1, n2] = [a * a + b * b, c * c + d * d];
        const dotv = a * c + b * d;
        const d1 = (v) => num(v, { fixed: 1 });
        const steps = [R`Add matching components: \(${U} + ${V} = \langle ${a} + ${paren(c)},\ ${b} + ${paren(d)} \rangle = ${vec(rx, ry)}\).`];
        const parts = [R`\(${U} + ${V} = ${vec(rx, ry)}\)`];
        if (n === 0) {
          steps.push('The resultant is the zero vector, which has length 0 and no direction.');
        } else {
          const th = norm360(toDeg(Math.atan2(ry, rx)));
          const quad = rx > 0 ? (ry > 0 ? 1 : 4) : ry > 0 ? 2 : 3;
          steps.push(R`Magnitude of the resultant: \(\sqrt{${paren(rx)}^{2} + ${paren(ry)}^{2}} = \sqrt{${n}}${sqrtTex(n) === R`\sqrt{${n}}` ? '' : ` = ${sqrtTex(n)}`}${isSquare(n) ? '' : R` \approx ${num(Math.sqrt(n), { places: 2 })}`}\).`);
          steps.push(rx === 0 || ry === 0
            ? R`Direction: the resultant lies along an axis, pointing ${rx > 0 ? 'right' : rx < 0 ? 'left' : ry > 0 ? 'up' : 'down'}, so \(\theta = ${degTex(th)}\).`
            : R`Direction: the reference angle is \(\tan^{-1}\!\left(\dfrac{${Math.abs(ry)}}{${Math.abs(rx)}}\right) \approx ${d1(toDeg(Math.atan(Math.abs(ry / rx))))}^{\circ}\). Because ${SIGNS[quad]}, the resultant points into quadrant ${ROMAN[quad]}, so \(\theta \approx ${d1(th)}^{\circ}\).`);
          parts.push(R`magnitude \(${isSquare(n) ? sqrtTex(n) : R`\sqrt{${n}} \approx ${num(Math.sqrt(n), { places: 2 })}`}\), direction angle \(${rx === 0 || ry === 0 ? degTex(th) : R`\approx ${d1(th)}^{\circ}`}\)`);
        }
        steps.push(R`Dot product: \(${U} \cdot ${V} = ${product(a, c)} + ${product(b, d)} = ${dotv}\).`);
        if (n1 === 0 || n2 === 0) {
          steps.push('One of the vectors is the zero vector, so there is no angle between them.');
        } else if (dotv === 0) {
          steps.push(R`The dot product is 0, so the vectors are perpendicular: the angle between them is \(90^{\circ}\).`);
          parts.push('the vectors are perpendicular');
        } else if (a * d - b * c === 0) {
          steps.push(R`\(${V}\) is a ${dotv > 0 ? 'positive' : 'negative'} multiple of \(${U}\), so the vectors point ${dotv > 0 ? R`the same way: the angle between them is \(0^{\circ}\)` : R`in opposite directions: the angle between them is \(180^{\circ}\)`}.`);
          parts.push(dotv > 0 ? 'the vectors point the same way' : 'the vectors point in opposite directions');
        } else {
          const ang = toDeg(Math.acos(Math.max(-1, Math.min(1, dotv / Math.sqrt(n1 * n2)))));
          steps.push(R`Angle between them: \(\cos\theta = ${dotv < 0 ? '-' : ''}\dfrac{${Math.abs(dotv)}}{${sqrtTex(n1)} \cdot ${sqrtTex(n2)}} \approx ${num(dotv / Math.sqrt(n1 * n2), { places: 4 })}\), so \(\theta \approx ${d1(ang)}^{\circ}\).`);
          parts.push(R`the angle between \(${U}\) and \(${V}\) is about \(${d1(ang)}^{\circ}\)`);
        }
        const xs = [0, a, rx];
        const ys = [0, b, ry];
        const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 4) + 3;
        const mid = (list) => (Math.max(...list) + Math.min(...list)) / 2;
        return {
          problem: R`For \(${U} = ${vec(a, b)}\) and \(${V} = ${vec(c, d)}\), find the resultant \(${U} + ${V}\), its magnitude and direction, and the angle between \(${U}\) and \(${V}\).`,
          steps,
          answer: `${parts.join('; ')}.`,
          visual: {
            type: 'plot',
            x: [mid(xs) - span / 2, mid(xs) + span / 2],
            y: [mid(ys) - span / 2, mid(ys) + span / 2],
            square: true,
            segments: [
              { from: [0, 0], to: [a, b], arrow: true, label: 'u', color: 'a' },
              { from: [a, b], to: [rx, ry], arrow: true, label: 'v', color: 'b' },
              { from: [0, 0], to: [rx, ry], arrow: true, label: 'u + v', color: 'c' },
            ],
            alt: `Vector u = ⟨${txt(a)}, ${txt(b)}⟩ drawn from the origin, vector v = ⟨${txt(c)}, ${txt(d)}⟩ drawn from the tip of u, and the resultant u + v = ⟨${txt(rx)}, ${txt(ry)}⟩ drawn from the origin to the tip of v.`,
          },
        };
      },
    },
    {
      id: 'projectile',
      title: 'Word problem: projectile motion',
      word: true,
      intro: 'Choose the launch speed, the launch angle and the starting height. Gravity pulls downward at 9.8 m/s², which puts the term −4.9t² in the height.',
      inputs: [
        { name: 'speed', label: 'Launch speed (m/s)', type: 'int', min: 5, max: 40, value: 20 },
        { name: 'angle', label: 'Launch angle (degrees)', type: 'int', min: 10, max: 80, value: 35 },
        { name: 'height', label: 'Starting height (m)', type: 'number', min: 0, max: 20, step: 0.5, value: 1.5 },
      ],
      compute({ speed, angle, height }) {
        const vx = speed * Math.cos(toRad(angle));
        const vy = speed * Math.sin(toRad(angle));
        const T = (vy + Math.sqrt(vy * vy + 19.6 * height)) / 9.8;
        const range = vx * T;
        const tTop = vy / 9.8;
        const top = height + (vy * vy) / 19.6;
        const n2 = (v) => num(v, { fixed: 2 });
        const n1 = (v) => num(v, { fixed: 1 });
        return {
          problem: `A ball is launched ${height > 0 ? `from a height of ${txt(height)} m` : 'from ground level'} at ${speed} m/s, at an angle of ${angle}° above the horizontal. How long is it in the air, how far away does it land, and how high does it go?`,
          steps: [
            R`Split the launch velocity into components: \(v_{x} = ${speed}\cos ${degTex(angle)} \approx ${n2(vx)}\) m/s and \(v_{y} = ${speed}\sin ${degTex(angle)} \approx ${n2(vy)}\) m/s.`,
            R`Parametric equations, with \(t\) in seconds: \(x = ${n2(vx)}t\), \(y = ${height > 0 ? `${num(height)} + ` : ''}${n2(vy)}t - 4.9t^{2}\).`,
            height > 0
              ? R`The ball lands when \(y = 0\). The quadratic formula gives the positive solution \(t = \dfrac{${n2(vy)} + \sqrt{${n2(vy)}^{2} + 4(4.9)(${num(height)})}}{9.8} \approx ${n2(T)}\) seconds.`
              : R`The ball lands when \(y = 0\): \(t(${n2(vy)} - 4.9t) = 0\), so \(t = \dfrac{${n2(vy)}}{4.9} \approx ${n2(T)}\) seconds.`,
            R`Horizontal distance: \(x \approx ${n2(vx)} \times ${n2(T)} \approx ${n1(range)}\) m.`,
            R`Greatest height: the vertex of the height function is at \(t = \dfrac{${n2(vy)}}{9.8} \approx ${n2(tTop)}\) s, where \(y \approx ${n1(top)}\) m.`,
          ],
          answer: `In the air for about ${txt(T, { fixed: 2 })} seconds; lands about ${txt(range, { fixed: 1 })} m away; greatest height about ${txt(top, { fixed: 1 })} m.`,
          visual: {
            type: 'plot',
            x: [0, range * 1.12],
            y: [0, top * 1.3],
            param: [{ x: (t) => vx * t, y: (t) => height + vy * t - 4.9 * t * t, t: [0, T] }],
            points: [{ x: vx * tTop, y: top, label: `highest: ${txt(top, { fixed: 1 })} m` }, { x: range, y: 0, label: `lands: ${txt(range, { fixed: 1 })} m`, color: 'b' }],
            axisLabels: ['x (m)', 'y (m)'],
            alt: `The path of the ball: an arc that starts ${height > 0 ? `at a height of ${txt(height)} m` : 'on the ground'}, rises to about ${txt(top, { fixed: 1 })} m after about ${txt(tTop, { fixed: 2 })} seconds, and comes down to the ground about ${txt(range, { fixed: 1 })} m away.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyComponentForm, easyMagnitude, easyCombine, easyParamPoint],
    medium: [mediumDirection, mediumDotProduct, mediumEliminate, mediumConstantVelocity],
    hard: [hardAngleBetween, hardResultant, hardCircleMotion, hardProjectile],
    challenge: [challengeEquilibrium, challengeRiverCrossing, challengeCollision],
  },
};
