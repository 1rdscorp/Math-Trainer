import { R, q, frac, num, txt, terms, term, linear, point, sqrtTex, person, checkEqual, checkAll } from '../../lib/index.js';
import { M } from './_shared.js';

// ───────────── Helpers ─────────────

// A second-degree curve Ax² + Bxy + Cy² + Dx + Ey = G, kept as its coefficients.
const curve = (A, B, C, D, E, G) => ({ A, B, C, D, E, G });
const F = (c, x, y) => c.A * x * x + c.B * x * y + c.C * y * y + c.D * x + c.E * y;
const on = (c, x, y) => Math.abs(F(c, x, y) - c.G) < 1e-9;
const curveTex = (c) => `${terms([[c.A, 'x^{2}'], [c.B, 'xy'], [c.C, 'y^{2}'], [c.D, 'x'], [c.E, 'y']])} = ${c.G}`;
// The left side with numbers substituted: "(2)^{2} + (2)(1) + (1)^{2}".
const subTex = (c, x, y) => terms([[c.A, `(${num(x)})^{2}`], [c.B, `(${num(x)})(${num(y)})`], [c.C, `(${num(y)})^{2}`], [c.D, `(${num(x)})`], [c.E, `(${num(y)})`]]);
const pt = (x, y) => M(point(x, y));
const ptText = (x, y) => `(${txt(x)}, ${txt(y)})`;
const yOr = (ys) => (ys.length === 1 ? R`only \(y = ${num(ys[0])}\)` : R`\(y = ${num(ys[0])}\) or \(y = ${num(ys[1])}\)`);
const sameSet = (a, b) => a.length === b.length && a.every((v) => b.some((w) => Math.abs(v - w) < 1e-9));
// "x = h + a cos t" with tidy signs; fn is the LaTeX of the trig part.
const coordTex = (v, c, a, fn) => `${v} = ${terms([[c, ''], [a, fn]])}`;
const pairTex = (xs, ys) => R`\(${xs},\ ${ys}\)`;
// Signed number of turns the point (x(t), y(t)) makes round (h, k), measured by adding small angle steps.
const turns = (X, Y, h, k, a, b, t0, t1) => {
  let total = 0;
  let prev = Math.atan2((Y(t0) - k) / b, (X(t0) - h) / a);
  for (let i = 1; i <= 4000; i++) {
    const t = t0 + ((t1 - t0) * i) / 4000;
    const ang = Math.atan2((Y(t) - k) / b, (X(t) - h) / a);
    let d = ang - prev;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    total += d;
    prev = ang;
  }
  return total / (2 * Math.PI);
};
// The ellipse x² + Bxy + Cy² = G as a parametric curve (for drawing): x = X cos t, y = (−BX cos t + √(4C − B²)·X sin t)/(2C).
const tiltedParam = (B, C, G) => {
  const X = Math.sqrt((4 * C * G) / (4 * C - B * B));
  const s = Math.sqrt(4 * C - B * B);
  return { X, x: (t) => X * Math.cos(t), y: (t) => (-B * X * Math.cos(t) + s * X * Math.sin(t)) / (2 * C) };
};

// ───────────── Easy ─────────────

function easyOnCurve(rng) {
  const kind = rng.pick(['tilted', 'tilted', 'ellipse', 'hyperbola', 'shifted']);
  const x0 = rng.nonzero(-4, 4);
  const y0 = rng.nonzero(-4, 4);
  const c0 = {
    tilted: () => { const B = rng.pick([1, -1, 2, -2, 3, -3]); return curve(1, B, Math.abs(B) === 2 ? 2 : rng.pick([1, 2]), 0, 0, 0); },
    ellipse: () => curve(rng.int(1, 4), 0, rng.int(1, 4), 0, 0, 0),
    hyperbola: () => curve(rng.pick([1, 2, -1]), 0, rng.pick([-1, -2, -3, 1]), 0, 0, 0),
    shifted: () => curve(1, 0, 1, rng.nonzero(-6, 6), rng.nonzero(-6, 6), 0),
  }[kind]();
  const c = { ...c0, G: F(c0, x0, y0) };
  if (c.G === 0) return easyOnCurve(rng);
  const cands = [[y0, x0], [-x0, y0], [x0, -y0], [-x0, -y0], [x0 + 1, y0], [x0, y0 - 1], [y0, -x0], [-y0, x0]];
  const wrongs = cands.filter(([x, y], i) => !on(c, x, y) && cands.findIndex(([u, v]) => u === x && v === y) === i && !(x === x0 && y === y0));
  if (wrongs.length < 3) return easyOnCurve(rng);
  const [w0] = wrongs;
  return q({
    prompt: R`Which point lies on the curve \(${curveTex(c)}\)?`,
    correct: pt(x0, y0),
    wrong: [
      { value: pt(...w0), why: R`Substituting gives \(${subTex(c, ...w0)} = ${F(c, ...w0)}\), not \(${c.G}\).` },
      ...wrongs.slice(1).map((w) => pt(...w)),
    ],
    solution: [
      R`A point is on the curve when its coordinates make the equation true. Substitute each point.`,
      R`\(${point(x0, y0)}\): \(${subTex(c, x0, y0)} = ${c.G}\). ✓`,
      R`For example \(${point(...w0)}\) gives \(${F(c, ...w0)} \ne ${c.G}\), so it is not on the curve. The answer is \(${point(x0, y0)}\).`,
    ],
    rule: 0,
    skill: 'points on an implicit curve',
    check: () => (on(c, x0, y0) && wrongs.every(([x, y]) => !on(c, x, y)) ? true : 'substitution does not single out the answer'),
  });
}

function easySegment(rng) {
  const P = [rng.int(-6, 6), rng.int(-6, 6)];
  const Q = [rng.int(-6, 6), rng.int(-6, 6)];
  if (P[0] === Q[0] || P[1] === Q[1]) return easySegment(rng);
  const D = [Q[0] - P[0], Q[1] - P[1]];
  if (rng.bool()) {
    const par = (s, d) => pairTex(coordTex('x', s[0], d[0], 't'), coordTex('y', s[1], d[1], 't'));
    const cands = [
      [P, Q, null],
      [P, Q.map((v) => v), R`At \(t = 1\) this gives \(${point(P[0] + Q[0], P[1] + Q[1])}\), not \(${point(...Q)}\). Multiply \(t\) by the change \(Q - P\).`],
      [Q, P.map((v, i) => v - Q[i]), R`This starts at \(${point(...Q)}\) when \(t = 0\): it runs from \(Q\) to \(P\).`],
      [Q, D, R`At \(t = 0\) this is at \(${point(...Q)}\); the start must be \(${point(...P)}\).`],
      [D, P, null],
    ];
    const ends = ([s, d]) => [s[0], s[1], s[0] + d[0], s[1] + d[1]];
    const right = ends([P, D]);
    const texs = cands.map(([s, d], i) => (i === 0 ? par(P, D) : par(s, d)));
    const wrong = cands.slice(1).map((cd, i) => ({ cd, tex: texs[i + 1] })).filter(({ cd }) => ends(cd).join() !== right.join());
    return q({
      prompt: R`Which parametric equations trace the line segment from \(P${point(...P)}\) to \(Q${point(...Q)}\) as \(t\) goes from 0 to 1?`,
      correct: texs[0],
      wrong: wrong.map(({ cd, tex }) => (cd[2] ? { value: tex, why: cd[2] } : tex)),
      solution: [
        R`Start at \(P\) and add \(t\) times the change from \(P\) to \(Q\): \(Q - P = \langle ${D[0]}, ${D[1]} \rangle\).`,
        R`So \(x = x_{1} + t(x_{2} - x_{1})\) and \(y = y_{1} + t(y_{2} - y_{1})\) become ${texs[0]}.`,
        R`Check: \(t = 0\) gives \(${point(...P)}\) and \(t = 1\) gives \(${point(...Q)}\).`,
      ],
      rule: 3,
      skill: 'parametrizing a segment',
      check: () => checkAll(checkEqual(right[2], Q[0]), checkEqual(right[3], Q[1]), wrong.length >= 3 ? true : 'too few wrong choices'),
    });
  }
  const f = rng.pick([frac(1, 2), frac(1, 4), frac(3, 4), frac(1, 3), frac(2, 3)]);
  const m = f.d;
  const P2 = [rng.int(-6, 6), rng.int(-6, 6)];
  const D2 = [rng.nonzero(-3, 3) * m, rng.nonzero(-3, 3) * m];
  const Q2 = [P2[0] + D2[0], P2[1] + D2[1]];
  const at = (g) => [P2[0] + g * D2[0], P2[1] + g * D2[1]];
  const ans = at(f.value);
  return q({
    prompt: R`A point moves along the segment \(x = ${linear(D2[0], P2[0], 't')},\ y = ${linear(D2[1], P2[1], 't')}\), \(0 \le t \le 1\), from \(${point(...P2)}\) to \(${point(...Q2)}\). Where is it when \(t = ${f.tex()}\)?`,
    correct: pt(...ans),
    wrong: [
      { value: pt(...at(1 - f.value)), why: R`That is \(${f.tex()}\) of the way back from the end. Substitute \(t = ${f.tex()}\) into both equations.` },
      { value: pt(f.value * Q2[0], f.value * Q2[1]), why: R`Start from \(${point(...P2)}\), then add \(${f.tex()}\) of the change \(\langle ${D2[0]}, ${D2[1]} \rangle\).` },
      f.value === 0.5 ? pt(...at(0.25)) : pt(...at(0.5)),
      pt(ans[1], ans[0]),
      pt(...at(f.value / 2)),
      pt(...Q2),
    ],
    solution: [
      R`Substitute \(t = ${f.tex()}\): \(x = ${P2[0]} + ${f.tex()}(${D2[0]}) = ${ans[0]}\).`,
      R`\(y = ${P2[1]} + ${f.tex()}(${D2[1]}) = ${ans[1]}\).`,
      R`The point is \(${point(...ans)}\), \(${f.tex()}\) of the way from the start to the end.`,
    ],
    rule: 3,
    skill: 'parametrizing a segment',
    check: () => checkAll(checkEqual(ans[0], (1 - f.value) * P2[0] + f.value * Q2[0]), checkEqual(ans[1], (1 - f.value) * P2[1] + f.value * Q2[1])),
  });
}

function easyReadGraph(rng) {
  const a = rng.pick([1, 2, -1, -2]);
  const b = a > 0 ? rng.int(-6, -2) : rng.int(2, 6);
  const c = rng.pick([1, -1]);
  const mid = rng.int(1, 3);
  const d = c > 0 ? rng.int(-6, -2) : rng.int(2, 6);
  const X = (t) => a * t + b;
  const Y = (t) => c * (t - mid) ** 2 + d;
  const ts = [0, 1, 2, 3, 4];
  const ys = ts.map(Y);
  const visual = {
    type: 'plot',
    x: [Math.min(X(0), X(4)) - 2, Math.max(X(0), X(4)) + 2],
    y: [Math.min(...ys) - 2, Math.max(...ys) + 2],
    square: true,
    param: [{ x: X, y: Y, t: [0, 4] }],
    points: ts.map((t) => ({ x: X(t), y: Y(t), label: `t = ${t}` })),
    segments: [{ from: [X(3.6), Y(3.6)], to: [X(4), Y(4)], arrow: true, color: 'a' }],
    alt: `A parametric curve traced from t = 0 to t = 4, with an arrow at the end showing the direction of motion. Marked points: ${ts.map((t) => `t = ${t} at ${ptText(X(t), Y(t))}`).join('; ')}.`,
  };
  if (rng.bool()) {
    const k = rng.int(1, 4);
    return q({
      prompt: R`The graph shows a parametric curve, with the points for \(t = 0, 1, 2, 3, 4\) marked. Where is the moving point when \(t = ${k}\)?`,
      visual,
      correct: pt(X(k), Y(k)),
      wrong: [
        { value: pt(Y(k), X(k)), why: 'The first coordinate is the horizontal position x, read from the horizontal axis.' },
        { value: pt(X(k - 1), Y(k - 1)), why: R`That is the point marked \(t = ${k - 1}\).` },
        k < 4 ? pt(X(k + 1), Y(k + 1)) : pt(X(0), Y(0)),
        pt(k, Y(k)),
        pt(X(k), -Y(k)),
        pt(-X(k), Y(k)),
      ],
      solution: [R`Find the point labelled \(t = ${k}\) and read its coordinates from the grid.`, R`It is at \(${point(X(k), Y(k))}\).`],
      rule: 3,
      skill: 'reading a parametric graph',
      check: () => {
        const p = visual.points.find((o) => o.label === `t = ${k}`);
        return checkAll(checkEqual(p.x, a * k + b), checkEqual(p.y, c * (k - mid) ** 2 + d));
      },
    });
  }
  const k = rng.int(0, 4);
  return q({
    prompt: R`The graph shows a parametric curve, with the points for \(t = 0, 1, 2, 3, 4\) marked. At what value of \(t\) is the moving point at \(${point(X(k), Y(k))}\)?`,
    visual,
    correct: k,
    fmt: (v) => R`\(t = ${v}\)`,
    wrong: [
      { value: X(k), why: R`\(${X(k)}\) is the \(x\)-coordinate of the point. The parameter value is the label next to it.` },
      ...ts.filter((t) => t !== k && t !== X(k)),
    ],
    solution: [R`Find the point \(${point(X(k), Y(k))}\) on the grid.`, R`Its label is \(t = ${k}\).`],
    rule: 3,
    skill: 'reading a parametric graph',
    check: () => (visual.points.filter((o) => o.x === X(k) && o.y === Y(k)).map((o) => o.label).join() === `t = ${k}` ? true : 'the point is not labelled with that t'),
  });
}

// ───────────── Medium ─────────────

function mediumSolveForY(rng) {
  const A = rng.pick([1, 1, 2, -1]);
  const B = rng.pick([1, -1, 2, -2, 0]);
  const D = rng.int(-4, 4);
  const x0 = rng.nonzero(-3, 3);
  const y1 = rng.int(-5, 5);
  const y2 = rng.bool(0.2) ? y1 : rng.intExcept(-5, 5, [y1]);
  const E = -(y1 + y2) - B * x0;
  if (Math.abs(E) > 9) return mediumSolveForY(rng);
  const c = curve(A, B, 1, D, E, 0);
  c.G = A * x0 * x0 + D * x0 - y1 * y2;
  const ys = y1 === y2 ? [y1] : [y1, y2].sort((u, v) => u - v);
  const lin = B * x0 + E;
  const cst = A * x0 * x0 + D * x0 - c.G;
  const cands = [ys.map((v) => -v), [ys[0]], ys.length === 2 ? [ys[1]] : [ys[0], -ys[0]], [ys[0] + 1, ys[ys.length - 1] + 1], ys.length === 2 ? [ys[0], -ys[1]] : [ys[0] + 2], [ys[0] - 1, ys[ys.length - 1] - 1], [ys[0] - 2, ys[ys.length - 1] + 2], [-ys[0]]];
  const wrongs = cands.filter((s) => !sameSet(s, ys) && !s.every((v) => on(c, x0, v)));
  const two = ys.length === 2;
  return q({
    prompt: R`For the curve \(${curveTex(c)}\), find every \(y\)-value that goes with \(x = ${x0}\).`,
    correct: yOr(ys),
    wrong: wrongs.map((s, i) => (i === 0 ? { value: yOr(s), why: R`Factor carefully: \(${terms([[1, 'y^{2}'], [lin, 'y'], [cst, '']])} = 0\). The signs of the roots are opposite to the signs in the factors.` } : two && s.length === 1 ? { value: yOr(s), why: 'A quadratic in y can have two solutions. Here both work, so the vertical line meets the curve twice.' } : yOr(s))),
    solution: [
      R`Substitute \(x = ${x0}\): \(${terms([[A, `(${x0})^{2}`], [B, `(${x0})y`], [1, 'y^{2}'], [D, `(${x0})`], [E, 'y']])} = ${c.G}\).`,
      R`Collect terms on one side: \(${terms([[1, 'y^{2}'], [lin, 'y'], [cst, '']])} = 0\), a quadratic in \(y\).`,
      two ? R`Factor: \((${linear(1, -ys[0], 'y')})(${linear(1, -ys[1], 'y')}) = 0\), so \(y = ${ys[0]}\) or \(y = ${ys[1]}\).` : R`Factor: \((${linear(1, -ys[0], 'y')})^{2} = 0\), so \(y = ${ys[0]}\) is the only solution.`,
      two ? R`One \(x\) gives two points, \(${point(x0, ys[0])}\) and \(${point(x0, ys[1])}\), so this curve is not the graph of a function of \(x\).` : R`The vertical line \(x = ${x0}\) touches the curve at just one point, \(${point(x0, ys[0])}\).`,
    ],
    rule: 1,
    skill: 'solving for y',
    check: () => {
      const disc = lin * lin - 4 * cst;
      return checkAll(ys.every((v) => on(c, x0, v)) ? true : 'a y-value is not on the curve', (disc > 0 ? 2 : disc === 0 ? 1 : 0) === ys.length ? true : 'wrong number of y-values', wrongs.length >= 3 ? true : 'too few wrong choices');
    },
  });
}

function mediumAxisCrossings(rng) {
  const r1 = rng.int(-6, 6);
  const r2 = rng.intExcept(-6, 6, [r1]);
  const xAxis = rng.bool();
  const B = rng.int(-3, 3);
  const C2 = rng.pick([1, 2, 3, -1, -2]);
  const E2 = rng.int(-5, 5);
  // The squared term of the axis being crossed has coefficient 1, so its intercepts are r1 and r2.
  const c = xAxis ? curve(1, B, C2, -(r1 + r2), E2, -r1 * r2) : curve(C2, B, 1, E2, -(r1 + r2), -r1 * r2);
  const P = (r) => (xAxis ? [r, 0] : [0, r]);
  const Qp = (r) => (xAxis ? [0, r] : [r, 0]);
  const set = (pts) => pts.map((p) => pt(...p)).join(' and ');
  const rs = [r1, r2].sort((u, v) => u - v);
  const right = rs.map(P);
  const cands = [
    [rs.map(Qp), R`Points on the ${xAxis ? 'x' : 'y'}-axis have ${xAxis ? 'y' : 'x'}-coordinate 0.`],
    [rs.map((r) => P(-r)), R`Solving \((${linear(1, -rs[0], xAxis ? 'x' : 'y')})(${linear(1, -rs[1], xAxis ? 'x' : 'y')}) = 0\) gives \(${rs[0]}\) and \(${rs[1]}\); the signs flip from the factors.`],
    [[P(rs[0])], null],
    [[P(rs[1])], null],
    [rs.map((r) => P(r + 1)), null],
    [rs.map((r) => P(r - 2)), null],
    [[P(-rs[0])], null],
    [[Qp(rs[1])], null],
  ];
  const wrongs = cands.filter(([pts]) => !pts.every((p) => on(c, ...p)) && set(pts) !== set(right));
  const v = xAxis ? 'x' : 'y';
  const lin = -(r1 + r2);
  return q({
    prompt: R`Where does the curve \(${curveTex(c)}\) cross the ${v}-axis?`,
    correct: set(right),
    wrong: wrongs.map(([pts, why]) => (why ? { value: set(pts), why } : set(pts))),
    solution: [
      R`On the ${v}-axis, \(${xAxis ? 'y' : 'x'} = 0\). Every term with \(${xAxis ? 'y' : 'x'}\) drops out: \(${terms([[1, `${v}^{2}`], [lin, v]])} = ${c.G}\).`,
      R`Rearrange and factor: \(${terms([[1, `${v}^{2}`], [lin, v], [-c.G, '']])} = (${linear(1, -rs[0], v)})(${linear(1, -rs[1], v)}) = 0\), so \(${v} = ${rs[0]}\) or \(${v} = ${rs[1]}\).`,
      R`The curve crosses the ${v}-axis at ${set(right)}.`,
    ],
    rule: 2,
    skill: 'intercepts of an implicit curve',
    check: () => checkAll(right.every((p) => on(c, ...p)) ? true : 'an intercept is not on the curve', wrongs.length >= 3 ? true : 'too few wrong choices'),
  });
}

function mediumEllipseParam(rng) {
  const [a, b] = rng.sample([2, 3, 4, 5, 6], 2);
  const h = rng.int(-4, 4);
  const k = rng.int(-4, 4);
  const sq = (c, v) => (c === 0 ? `${v}^{2}` : `(${linear(1, -c, v)})^{2}`);
  const ell = (hh, kk, A, Bb, sign = '+') => ({ tex: R`\(\dfrac{${sq(hh, 'x')}}{${A}} ${sign} \dfrac{${sq(kk, 'y')}}{${Bb}} = 1\)`, f: (x, y) => (x - hh) ** 2 / A + (sign === '+' ? 1 : -1) * ((y - kk) ** 2 / Bb) - 1 });
  const samples = [0.4, 1.3, 2.2, 3.5, 5].map((t) => [h + a * Math.cos(t), k + b * Math.sin(t)]);
  const fits = (o) => samples.every(([x, y]) => Math.abs(o.f(x, y)) < 1e-9);
  if (rng.bool()) {
    const right = ell(h, k, a * a, b * b);
    const wrongs = [
      [ell(h, k, a, b), R`The cosine and sine terms are divided by \(${a}\) and \(${b}\) before squaring, so the denominators are \(${a * a}\) and \(${b * b}\).`],
      [ell(h, k, b * b, a * a), R`\(x\) goes with \(${a}\cos t\), so the number under the \(x\)-term is \(${a}^{2}\).`],
      [ell(-h, -k, a * a, b * b), null],
      [ell(h, k, a * a, b * b, '-'), null],
    ].filter(([o]) => !fits(o) && o.tex !== right.tex);
    return q({
      prompt: R`Eliminate the parameter: \(x = ${terms([[h, ''], [a, R`\cos t`]])},\ y = ${terms([[k, ''], [b, R`\sin t`]])}\).`,
      correct: right.tex,
      wrong: wrongs.map(([o, why]) => (why ? { value: o.tex, why } : o.tex)),
      solution: [
        R`Isolate the trig parts: \(\cos t = \dfrac{${linear(1, -h)}}{${a}}\) and \(\sin t = \dfrac{${linear(1, -k, 'y')}}{${b}}\).`,
        R`Use \(\cos^{2} t + \sin^{2} t = 1\): \(\left(\dfrac{${linear(1, -h)}}{${a}}\right)^{2} + \left(\dfrac{${linear(1, -k, 'y')}}{${b}}\right)^{2} = 1\).`,
        R`So the path is the ellipse ${right.tex}, centre \(${point(h, k)}\).`,
      ],
      rule: 5,
      skill: 'eliminating the parameter',
      check: () => (fits(right) && wrongs.length >= 3 ? true : 'the sampled points do not single out the equation'),
    });
  }
  const opt = (sx, sa, sb, swap = false, sgn = 1) => ({
    tex: pairTex(coordTex('x', sx[0], swap ? sb : sa, R`\cos t`), coordTex('y', sx[1], (swap ? sa : sb) * sgn, R`\sin t`)),
    X: (t) => sx[0] + (swap ? sb : sa) * Math.cos(t),
    Y: (t) => sx[1] + (swap ? sa : sb) * sgn * Math.sin(t),
  });
  const right = opt([h, k], a, b);
  const target = ell(h, k, a * a, b * b);
  const cands = [
    [opt([h, k], a, b, false, -1), R`At \(t = \frac{\pi}{2}\) this is at \(${point(h, k - b)}\), below the centre: it goes clockwise.`],
    [opt([h, k], a, b, true), R`The number with \(\cos t\) is the horizontal semi-axis, \(\sqrt{${a * a}} = ${a}\).`],
    [opt([h, k], a * a, b * b), R`Use the semi-axes \(${a}\) and \(${b}\), the square roots of the denominators.`],
    [opt([-h, -k], a, b), null],
  ];
  const ok = (o) => [0.3, 1.7, 4].every((t) => Math.abs(target.f(o.X(t), o.Y(t))) < 1e-9) && Math.abs(o.X(0) - (h + a)) < 1e-9 && turns(o.X, o.Y, h, k, a, b, 0, 2 * Math.PI) > 0.99;
  const wrongs = cands.filter(([o]) => o.tex !== right.tex && !ok(o));
  return q({
    prompt: R`Which parametrization traces the ellipse ${target.tex} once counterclockwise for \(0 \le t \le 2\pi\), starting at \(${point(h + a, k)}\)?`,
    correct: right.tex,
    wrong: wrongs.map(([o, why]) => (why ? { value: o.tex, why } : o.tex)),
    solution: [
      R`The centre is \(${point(h, k)}\); the semi-axes are \(\sqrt{${a * a}} = ${a}\) across and \(\sqrt{${b * b}} = ${b}\) up and down.`,
      R`\(x = h + a\cos t,\ y = k + b\sin t\) starts at \(t = 0\) at \((h + a, k) = ${point(h + a, k)}\) and reaches the top point \(${point(h, k + b)}\) at \(t = \frac{\pi}{2}\): counterclockwise.`,
      R`So ${right.tex}.`,
    ],
    rule: 4,
    skill: 'parametrizing an ellipse',
    check: () => (ok(right) && wrongs.length >= 3 ? true : 'the parametrization check failed'),
  });
}

// ───────────── Hard ─────────────

function hardTraceCount(rng) {
  const [w, T] = rng.pick([[1, 2], [2, 2], [3, 2], [1, 1], [2, 1], [frac(1, 2), 2], [1, 4], [frac(1, 2), 4], [2, 4]]);
  const wv = typeof w === 'number' ? w : w.value;
  const n = (wv * T) / 2;
  if (n > 3) return hardTraceCount(rng);
  const [a, b] = rng.sample([2, 3, 4, 5], 2);
  const h = rng.int(-3, 3);
  const k = rng.int(-3, 3);
  const swap = rng.bool(0.4);
  const s = rng.sign();
  const arg = wv === 1 ? 't' : typeof w === 'number' ? `${w}t` : R`\frac{t}{2}`;
  const X = (t) => h + a * (swap ? Math.sin(wv * t) : Math.cos(wv * t));
  const Y = (t) => k + s * b * (swap ? Math.cos(wv * t) : Math.sin(wv * t));
  const ccw = swap ? s < 0 : s > 0;
  const WORD = { 0.5: 'Halfway around', 1: 'Once around', 2: 'Twice around', 3: 'Three times around' };
  const say = (m, dir) => `${WORD[m]}, ${dir ? 'counterclockwise' : 'clockwise'}`;
  const Ttex = T === 1 ? R`\pi` : `${T}\\pi`;
  const other = n === 1 ? 2 : 1;
  const third = n === 0.5 ? 2 : 0.5;
  const ab = [h + a * (swap ? 0 : 1), k + s * b * (swap ? 1 : 0)];
  const after = [h + a * (swap ? 1 : 0), k + s * b * (swap ? 0 : 1)];
  return q({
    prompt: R`How does \(x = ${terms([[h, ''], [a, swap ? R`\sin ${arg}` : R`\cos ${arg}`]])},\ y = ${terms([[k, ''], [s * b, swap ? R`\cos ${arg}` : R`\sin ${arg}`]])}\) trace its ellipse for \(0 \le t \le ${Ttex}\)?`,
    correct: say(n, ccw),
    wrong: [
      { value: say(n, !ccw), why: R`Follow the point: it starts at \(${point(...ab)}\) and a quarter-turn later is at \(${point(...after)}\).` },
      { value: say(other, ccw), why: R`The angle is \(${arg}\), which runs from 0 to \(${num(wv * T)}\pi\) as \(t\) runs from 0 to \(${Ttex}\). Each \(2\pi\) of angle is one trip around.` },
      say(third, !ccw),
      say(other, !ccw),
      say(third, ccw),
    ],
    solution: [
      R`As \(t\) goes from 0 to \(${Ttex}\), the angle \(${arg}\) goes from 0 to \(${num(wv * T)}\pi\), which is ${n === 0.5 ? 'half of one' : n === 1 ? 'one' : n} full turn${n > 1 ? 's' : ''} of \(2\pi\).`,
      R`At angle 0 the point is \(${point(...ab)}\); a quarter-turn later it is at \(${point(...after)}\). Seen from the centre \(${point(h, k)}\), that is ${ccw ? 'counterclockwise' : 'clockwise'}.`,
      `So the ellipse is traced ${say(n, ccw).toLowerCase()}.`,
    ],
    rule: 4,
    skill: 'tracing direction and count',
    check: () => checkEqual(turns(X, Y, h, k, a, b, 0, T * Math.PI), ccw ? n : -n, 1e-6),
  });
}

function hardEliminate(rng) {
  const kind = rng.pick(['hyperbola', 'ray', 'segment']);
  if (kind === 'hyperbola') {
    const [a, b] = rng.sample([2, 3, 4, 5], 2);
    const h = rng.int(-4, 4);
    const k = rng.int(-4, 4);
    const sq = (c, v) => (c === 0 ? `${v}^{2}` : `(${linear(1, -c, v)})^{2}`);
    const eq = (hh, kk, A, Bb, xFirst = true, sign = '-') => ({
      tex: xFirst ? R`\(\dfrac{${sq(hh, 'x')}}{${A}} ${sign} \dfrac{${sq(kk, 'y')}}{${Bb}} = 1\)` : R`\(\dfrac{${sq(kk, 'y')}}{${Bb}} - \dfrac{${sq(hh, 'x')}}{${A}} = 1\)`,
      f: (x, y) => (xFirst ? (x - hh) ** 2 / A + (sign === '-' ? -1 : 1) * ((y - kk) ** 2 / Bb) : (y - kk) ** 2 / Bb - (x - hh) ** 2 / A) - 1,
    });
    const right = eq(h, k, a * a, b * b);
    const samples = [-1.2, -0.5, 0.4, 1.1, 2.3, 3.6, 4.1].map((t) => [h + a / Math.cos(t), k + b * Math.tan(t)]);
    const fits = (o) => samples.every(([x, y]) => Math.abs(o.f(x, y)) < 1e-7);
    const wrongs = [
      [eq(h, k, a * a, b * b, true, '+'), R`Secant and tangent are linked by \(\sec^{2} t - \tan^{2} t = 1\), with a minus sign.`],
      [eq(h, k, a * a, b * b, false), R`\(\sec^{2} t\) comes from \(x\), so the \(x\)-term is the positive one.`],
      [eq(h, k, a, b), R`Square the whole of \(\dfrac{${linear(1, -h)}}{${a}}\): the denominator becomes \(${a * a}\).`],
      [eq(-h, -k, a * a, b * b), null],
    ].filter(([o]) => o.tex !== right.tex && !fits(o));
    return q({
      prompt: R`Eliminate the parameter: \(x = ${terms([[h, ''], [a, R`\sec t`]])},\ y = ${terms([[k, ''], [b, R`\tan t`]])}\).`,
      correct: right.tex,
      wrong: wrongs.map(([o, why]) => (why ? { value: o.tex, why } : o.tex)),
      solution: [
        R`Isolate: \(\sec t = \dfrac{${linear(1, -h)}}{${a}}\) and \(\tan t = \dfrac{${linear(1, -k, 'y')}}{${b}}\).`,
        R`Use the identity \(\sec^{2} t - \tan^{2} t = 1\) (divide \(\sin^{2} t + \cos^{2} t = 1\) by \(\cos^{2} t\)).`,
        R`The path is the hyperbola ${right.tex}.`,
      ],
      rule: 5,
      skill: 'eliminating the parameter',
      check: () => (fits(right) && wrongs.length >= 3 ? true : 'the sampled points do not single out the equation'),
    });
  }
  const m = rng.nonzero(-4, 4);
  const c = rng.int(-6, 6);
  const line = linear(m, c);
  if (kind === 'ray') {
    const opts = [
      [R`\(y = ${line}\) for \(x \ge 0\)`],
      [R`\(y = ${line}\) for all real \(x\)`, R`\(x = t^{2}\) is never negative, so only the part of the line with \(x \ge 0\) is traced.`],
      [R`\(y = ${line}\) for \(x \le 0\)`, R`\(t^{2} \ge 0\), so \(x \ge 0\).`],
      [R`\(y = ${terms([[m, 'x^{2}'], [c, '']])}\) for \(x \ge 0\)`, R`\(t^{2}\) is exactly \(x\), so substitute \(x\), not \(x^{2}\).`],
      [R`\(y = ${terms([[m, R`\sqrt{x}`], [c, '']])}\) for \(x \ge 0\)`, null],
    ];
    const xs = [-2, -0.5, 0, 1, 3].map((t) => t * t);
    return q({
      prompt: R`Eliminate the parameter and describe the path: \(x = t^{2},\ y = ${terms([[m, 't^{2}'], [c, '']])}\), for all real \(t\).`,
      correct: opts[0][0],
      wrong: opts.slice(1).map(([v, why]) => (why ? { value: v, why } : v)),
      solution: [
        R`The equation for \(y\) contains \(t^{2}\), which is \(x\). Substitute: \(y = ${line}\).`,
        R`But \(x = t^{2} \ge 0\) for every \(t\), and every \(x \ge 0\) is reached. So the path is only the part of the line with \(x \ge 0\): a ray starting at \(${point(0, c)}\).`,
      ],
      rule: 5,
      skill: 'restrictions after eliminating',
      check: () => {
        const pts = [-2, -0.5, 0, 1, 3].map((t) => [t * t, m * t * t + c]);
        return checkAll(
          pts.every(([x, y]) => x >= 0 && Math.abs(y - (m * x + c)) < 1e-12) ? true : 'a point is off the ray',
          pts.some(([x]) => x === 0) ? true : 'the end of the ray is not reached',
          pts.some(([x, y]) => Math.abs(y - (m * x * x + c)) > 1e-9) && pts.some(([x, y]) => Math.abs(y - (m * Math.sqrt(x) + c)) > 1e-9) ? true : 'a wrong form fits',
        );
      },
    });
  }
  const opts = [
    [R`\(y = ${line}\) for \(-1 \le x \le 1\)`],
    [R`\(y = ${line}\) for all real \(x\)`, R`\(x = \sin t\) stays between \(-1\) and \(1\), so only a segment of the line is traced.`],
    [R`\(y = ${line}\) for \(0 \le x \le 1\)`, R`\(\sin t\) takes negative values too, down to \(-1\).`],
    [R`\(x^{2} + y^{2} = ${1 + m * m}\)`, R`This is not a circle: \(y\) depends on \(\sin t\) only, so \(\cos^{2} t + \sin^{2} t = 1\) does not apply.`],
    [R`\(y = ${line}\) for \(x \ge 0\)`, null],
  ];
  const ts = [0, 0.7, 1.6, 3, 4.5, 5.9];
  const xs = ts.map(Math.sin);
  return q({
    prompt: R`Eliminate the parameter and describe the path: \(x = \sin t,\ y = ${terms([[c, ''], [m, R`\sin t`]])}\), for \(0 \le t \le 2\pi\).`,
    correct: opts[0][0],
    wrong: opts.slice(1).map(([v, why]) => (why ? { value: v, why } : v)),
    solution: [
      R`Replace \(\sin t\) by \(x\): \(y = ${line}\).`,
      R`As \(t\) runs from 0 to \(2\pi\), \(x = \sin t\) takes every value from \(-1\) to \(1\) and no others. So the path is the segment of the line from \(${point(-1, c - m)}\) to \(${point(1, c + m)}\), traced back and forth.`,
    ],
    rule: 5,
    skill: 'restrictions after eliminating',
    check: () => {
      const pts = ts.map((t) => [Math.sin(t), c + m * Math.sin(t)]);
      return checkAll(
        pts.every(([x, y]) => x >= -1 && x <= 1 && Math.abs(y - (m * x + c)) < 1e-12) ? true : 'a point is off the segment',
        xs.some((x) => x < 0) && xs.some((x) => x > 0) ? true : 'x does not take both signs',
        pts.some(([x, y]) => Math.abs(x * x + y * y - (1 + m * m)) > 1e-6) ? true : 'the circle fits',
      );
    },
  });
}

function hardParamWord(rng) {
  const name = person(rng);
  const T = rng.pick([4, 5, 6, 8, 10]);
  const u = rng.nonzero(-3, 3);
  const v = rng.nonzero(-3, 3);
  const A = [rng.int(-10, 10), rng.int(-10, 10)];
  const Bp = [A[0] + T * u, A[1] + T * v];
  const what = rng.pick(['robot vacuum', 'drone', 'remote-control boat']);
  const visual = {
    type: 'plot',
    x: [Math.min(A[0], Bp[0]) - 3, Math.max(A[0], Bp[0]) + 3],
    y: [Math.min(A[1], Bp[1]) - 3, Math.max(A[1], Bp[1]) + 3],
    square: true,
    segments: [{ from: A, to: Bp, arrow: true }],
    points: [{ x: A[0], y: A[1], label: `start ${ptText(...A)}` }, { x: Bp[0], y: Bp[1], label: `end ${ptText(...Bp)}`, color: 'b' }],
    alt: `A straight path drawn as an arrow from the start ${ptText(...A)} to the end ${ptText(...Bp)}.`,
  };
  const intro = `${name}'s ${what} moves in a straight line at constant speed from ${ptText(...A)} to ${ptText(...Bp)} (in metres), taking ${T} seconds.`;
  if (rng.bool()) {
    const s = rng.int(1, T - 1);
    const ans = [A[0] + s * u, A[1] + s * v];
    return q({
      prompt: `${intro} Where is it ${s} ${s === 1 ? 'second' : 'seconds'} after it starts?`,
      visual,
      correct: pt(...ans),
      wrong: [
        { value: pt(A[0] + s * T * u, A[1] + s * T * v), why: R`With \(t\) in seconds the parameter runs from 0 to ${T}, so use \(\dfrac{t}{${T}}\) of the change, or the velocity \(\langle ${u}, ${v} \rangle\) per second.` },
        { value: pt(Bp[0] - s * u, Bp[1] - s * v), why: R`That is ${s} seconds before the end. The motion starts at \(${point(...A)}\).` },
        { value: pt(s * u, s * v), why: R`Add the starting position \(${point(...A)}\) to the displacement \(\langle ${s * u}, ${s * v} \rangle\).` },
        pt((A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2),
        pt(A[0] + (s + 1) * u, A[1] + (s + 1) * v),
        pt(A[0] + s * v, A[1] + s * u),
      ],
      solution: [
        R`The change in position over the trip is \(\langle ${T * u}, ${T * v} \rangle\), so each second it moves \(\langle ${u}, ${v} \rangle\).`,
        R`Position: \(x = ${linear(u, A[0], 't')},\ y = ${linear(v, A[1], 't')}\) for \(0 \le t \le ${T}\).`,
        R`At \(t = ${s}\): \(\left(${A[0]} + ${u < 0 ? `(${u})` : u}(${s}),\ ${A[1]} + ${v < 0 ? `(${v})` : v}(${s})\right) = ${point(...ans)}\).`,
      ],
      rule: 3,
      skill: 'motion along a segment',
      check: () => {
        const cross = (ans[0] - A[0]) * (Bp[1] - A[1]) - (ans[1] - A[1]) * (Bp[0] - A[0]);
        return checkAll(checkEqual(cross, 0), checkEqual(Math.hypot(ans[0] - A[0], ans[1] - A[1]), (s / T) * Math.hypot(Bp[0] - A[0], Bp[1] - A[1])));
      },
    });
  }
  const s = rng.int(1, T - 1);
  const cx = A[0] + s * u;
  const ans = s;
  return q({
    prompt: `${intro} After how many seconds does it cross the line \\(x = ${cx}\\)?`,
    visual,
    correct: ans,
    unit: 'seconds',
    wrong: [
      { value: frac(cx - A[0], T * u), why: R`That is the fraction of the trip. Multiply by the ${T} seconds the trip takes.` },
      { value: frac(cx, u), why: R`Solve \(${linear(u, A[0], 't')} = ${cx}\); the starting \(x\)-value must be subtracted first.` },
      T - s,
    ],
    solution: [
      R`Each second it moves \(\dfrac{${T * u}}{${T}} = ${u}\) m in \(x\), so \(x = ${linear(u, A[0], 't')}\).`,
      R`Solve \(${linear(u, A[0], 't')} = ${cx}\): \(${term(u, 't')} = ${cx - A[0]}\), so \(t = ${s}\).`,
    ],
    rule: 3,
    skill: 'motion along a segment',
    check: () => checkEqual(((cx - A[0]) / (Bp[0] - A[0])) * T, ans),
  });
}

// ───────────── Challenge ─────────────

const TILTED = [[1, 1, 3, 2], [-1, 1, 3, 2], [2, 2, 2, 2], [-2, 2, 2, 2], [3, 3, 1, 2], [-3, 3, 1, 2], [2, 4, 3, 2], [-2, 4, 3, 2]]; // [B, C, G per m², X per m]

function challengeXRange(rng) {
  const [B, C, g, xm] = rng.pick(TILTED);
  const m = rng.int(1, 3);
  const G = g * m * m;
  const Xb = xm * m;
  const c = curve(1, B, C, 0, 0, G);
  const disc = (x) => B * B * x * x - 4 * C * (x * x - G);
  const yTop = frac(-B * Xb, 2 * C);
  if (rng.bool()) {
    const ans = R`\(${-Xb} \le x \le ${Xb}\)`;
    return q({
      prompt: R`For which \(x\)-values does the curve \(${curveTex(c)}\) have a point?`,
      correct: ans,
      wrong: [
        { value: R`\(${'-' + sqrtTex(G)} \le x \le ${sqrtTex(G)}\)`, why: R`\(x = \pm${sqrtTex(G)}\) is where the curve meets the \(x\)-axis, but the tilted curve reaches further out. Use the discriminant of the quadratic in \(y\).` },
        { value: 'All real numbers', why: R`For large \(x\) the quadratic in \(y\) has a negative discriminant, so there is no point.` },
        R`\(x \le ${-Xb}\) or \(x \ge ${Xb}\)`,
        R`\(${-Xb / 2} \le x \le ${Xb / 2}\)`,
      ],
      solution: [
        R`For a fixed \(x\) the equation is a quadratic in \(y\): \(${terms([[C, 'y^{2}'], [B, 'xy']])} + (x^{2} - ${G}) = 0\).`,
        R`It has a real solution when the discriminant is not negative: \((${term(B, 'x')})^{2} - 4(${C})(x^{2} - ${G}) = ${4 * C * G} - ${4 * C - B * B}x^{2} \ge 0\).`,
        R`So \(x^{2} \le ${Xb * Xb}\), that is \(${-Xb} \le x \le ${Xb}\). For any other \(x\) the vertical line misses the curve.`,
      ],
      rule: 1,
      skill: 'x-values with no point',
      check: () => checkAll(disc(Xb) === 0 ? true : 'boundary discriminant not 0', disc(Xb + 0.01) < 0 && disc(0) > 0 ? true : 'discriminant signs wrong', G !== Xb * Xb ? true : 'axis crossing equals the boundary'),
    });
  }
  const rightPt = pt(Xb, yTop);
  const wrongs = [
    [[Math.sqrt(G), 0], R`\(\left(${sqrtTex(G)}, 0\right)\) is on the curve, but points with larger \(x\) exist. The rightmost point is where the discriminant is 0.`, R`\(\left(${sqrtTex(G)}, 0\right)\)`],
    [[Xb, -yTop.value], R`At \(x = ${Xb}\) the only \(y\) is \(${terms([[frac(-B, 2 * C), 'x']])}\); check the sign.`, pt(Xb, yTop.neg())],
    [[Xb, 0], null, pt(Xb, 0)],
    [[Xb / 2, yTop.value / 2], null, pt(frac(Xb, 2), yTop.div(frac(2)))],
  ].filter(([p]) => !(on(c, ...p) && p[0] >= Xb - 1e-9) && !(p[0] === Xb && p[1] === yTop.value));
  return q({
    prompt: R`The curve \(${curveTex(c)}\) is a tilted ellipse. Which point of it is farthest to the right?`,
    correct: rightPt,
    wrong: wrongs.map(([, why, tex]) => (why ? { value: tex, why } : tex)),
    solution: [
      R`For fixed \(x\) the equation is a quadratic in \(y\) with discriminant \(${4 * C * G} - ${4 * C - B * B}x^{2}\). Points exist only where it is not negative: \(x^{2} \le ${Xb * Xb}\).`,
      R`The largest such \(x\) is \(${Xb}\), where the discriminant is 0 and there is one \(y\): \(y = -\dfrac{${B < 0 ? `(${B})` : B} \cdot ${Xb}}{2 \cdot ${C}} = ${yTop.tex()}\).`,
      R`The rightmost point is \(${point(Xb, yTop)}\). Check: \(${subTex(c, Xb, yTop.value)} = ${G}\). ✓`,
    ],
    rule: 1,
    skill: 'x-values with no point',
    check: () => checkAll(on(c, Xb, yTop.value) ? true : 'answer not on the curve', disc(Xb) === 0 && disc(Xb + 0.01) < 0 ? true : 'not the rightmost point', wrongs.length >= 3 ? true : 'too few wrong choices'),
  });
}

function challengeBuildEllipse(rng) {
  const [a, b] = rng.bool(0.4) ? [rng.int(2, 5), 0] : rng.sample([2, 3, 4, 5], 2);
  const bb = b || a;
  const h = rng.int(-4, 4);
  const k = rng.int(-4, 4);
  const PLACES = ['rightmost', 'highest', 'leftmost', 'lowest'];
  // All eight parametrizations x = h ± a·(cos or sin), y = k ± b·(sin or cos).
  const all = [];
  for (const swap of [false, true]) for (const sx of [1, -1]) for (const sy of [1, -1]) {
    const X = (t) => h + sx * a * (swap ? Math.sin(t) : Math.cos(t));
    const Y = (t) => k + sy * bb * (swap ? Math.cos(t) : Math.sin(t));
    const x0 = X(0);
    const y0 = Y(0);
    const place = x0 > h + 1e-9 ? 0 : y0 > k + 1e-9 ? 1 : x0 < h - 1e-9 ? 2 : 3;
    const ccw = turns(X, Y, h, k, a, bb, 0, 2 * Math.PI) > 0;
    all.push({ X, Y, place, ccw, tex: pairTex(coordTex('x', h, sx * a, swap ? R`\sin t` : R`\cos t`), coordTex('y', k, sy * bb, swap ? R`\cos t` : R`\sin t`)) });
  }
  const want = rng.pick(all);
  const start = [[h + a, k], [h, k + bb], [h - a, k], [h, k - bb]][want.place];
  const others = rng.shuffle(all.filter((o) => o !== want));
  const ordered = [others.find((o) => o.place === want.place), others.find((o) => o.ccw === want.ccw && o.place !== want.place), ...others].filter((o, i, arr) => arr.indexOf(o) === i);
  const shape = b ? R`the ellipse \(\dfrac{${h === 0 ? 'x^{2}' : `(${linear(1, -h)})^{2}`}}{${a * a}} + \dfrac{${k === 0 ? 'y^{2}' : `(${linear(1, -k, 'y')})^{2}`}}{${bb * bb}} = 1\)` : R`the circle with centre \(${point(h, k)}\) and radius \(${a}\)`;
  return q({
    prompt: R`Which parametrization traces ${shape} once ${want.ccw ? 'counterclockwise' : 'clockwise'} for \(0 \le t \le 2\pi\), starting at its ${PLACES[want.place]} point \(${point(...start)}\)?`,
    correct: want.tex,
    wrong: ordered.map((o, i) => (i === 0 ? { value: o.tex, why: R`This starts at the right point but goes ${o.ccw ? 'counterclockwise' : 'clockwise'}. Check where it is at \(t = \frac{\pi}{2}\).` } : i === 1 ? { value: o.tex, why: R`At \(t = 0\) this is at \(${point(o.X(0), o.Y(0))}\), its ${PLACES[o.place]} point.` } : o.tex)),
    solution: [
      R`At \(t = 0\), \(\cos t = 1\) and \(\sin t = 0\). To start at \(${point(...start)}\), the ${want.place % 2 === 0 ? 'cosine must go with x' : 'cosine must go with y'}, with the sign that moves ${PLACES[want.place] === 'rightmost' ? 'right' : PLACES[want.place] === 'leftmost' ? 'left' : PLACES[want.place] === 'highest' ? 'up' : 'down'} from the centre.`,
      R`At \(t = \frac{\pi}{2}\) the chosen equations give \(${point(want.X(Math.PI / 2), want.Y(Math.PI / 2))}\), a quarter-turn ${want.ccw ? 'counterclockwise' : 'clockwise'} from the start.`,
      R`So ${want.tex}.`,
    ],
    rule: 4,
    skill: 'parametrizing an ellipse',
    check: () => {
      const fitsCurve = (o) => [0.2, 1.4, 3.3].every((t) => Math.abs((o.X(t) - h) ** 2 / (a * a) + (o.Y(t) - k) ** 2 / (bb * bb) - 1) < 1e-9);
      const ok = (o) => Math.abs(o.X(0) - start[0]) < 1e-9 && Math.abs(o.Y(0) - start[1]) < 1e-9 && o.ccw === want.ccw;
      return all.every(fitsCurve) && all.filter(ok).length === 1 && ok(want) ? true : 'not exactly one parametrization fits';
    },
  });
}

const LATTICE = [[5, 3, 4], [5, 4, 3], [5, 5, 0], [5, 0, 5], [10, 6, 8], [10, 8, 6], [13, 5, 12], [13, 12, 5]];

function challengeFenceCrossing(rng) {
  const [r, ix, iy] = rng.pick(LATTICE);
  const I = [ix * rng.sign(), iy * rng.sign()];
  const d = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
  const lam = rng.int(1, 3);
  const mu = rng.int(1, 3);
  const P = [I[0] - lam * d[0], I[1] - lam * d[1]];
  const Q = [I[0] + mu * d[0], I[1] + mu * d[1]];
  const D = [Q[0] - P[0], Q[1] - P[1]];
  const n2 = (p) => p[0] * p[0] + p[1] * p[1];
  if (!(n2(P) < r * r && n2(Q) > r * r)) return challengeFenceCrossing(rng);
  const tStar = frac(lam, lam + mu);
  const t2 = frac(n2(P) - r * r, n2(D)).div(tStar);
  const at = (t) => [frac(P[0]).add(t.mul(frac(D[0]))), frac(P[1]).add(t.mul(frac(D[1])))];
  const other = at(t2);
  const mid = at(frac(1, 2));
  const name = person(rng);
  const onLine = (p) => (p[0] - P[0]) * D[1] - (p[1] - P[1]) * D[0] === 0;
  const swapOff = I[0] !== I[1] && !onLine([I[1], I[0]]);
  return q({
    prompt: R`A sprinkler at the origin reaches every point within ${r} m, so the edge of the wet area is the circle \(x^{2} + y^{2} = ${r * r}\). ${name}'s robot mower drives in a straight line along \(x = ${linear(D[0], P[0], 't')},\ y = ${linear(D[1], P[1], 't')}\) for \(0 \le t \le 1\), from \(${point(...P)}\) to \(${point(...Q)}\). At which point does it leave the wet area?`,
    correct: pt(...I),
    wrong: [
      { value: M(point(...other)), why: R`That point is on the circle too, but it comes from \(t = ${t2.tex()}\), outside \(0 \le t \le 1\): the mower is never there.` },
      swapOff ? { value: pt(I[1], I[0]), why: R`\(${point(I[1], I[0])}\) is on the circle but not on the mower's path.` } : null,
      M(point(...mid)),
      pt(-I[0], -I[1]),
      pt(...Q),
    ],
    solution: [
      R`Substitute the path into the circle: \((${linear(D[0], P[0], 't')})^{2} + (${linear(D[1], P[1], 't')})^{2} = ${r * r}\).`,
      R`Expand: \(${terms([[n2(D), 't^{2}'], [2 * (P[0] * D[0] + P[1] * D[1]), 't'], [n2(P) - r * r, '']])} = 0\), with roots \(t = ${tStar.tex()}\) and \(t = ${t2.tex()}\).`,
      R`Only \(t = ${tStar.tex()}\) lies in \(0 \le t \le 1\). There the mower is at \(${point(...I)}\). Check: \(${I[0] * I[0]} + ${I[1] * I[1]} = ${r * r}\). ✓`,
    ],
    rule: 3,
    skill: 'a path meeting a curve',
    check: () => {
      const pI = at(tStar);
      const quad = (t) => n2(D) * t * t + 2 * (P[0] * D[0] + P[1] * D[1]) * t + n2(P) - r * r;
      return checkAll(checkEqual(pI[0].value, I[0]), checkEqual(pI[1].value, I[1]), checkEqual(n2(I), r * r), checkEqual(quad(t2.value), 0), t2.value < 0 || t2.value > 1 ? true : 'second root inside the segment', checkEqual(other[0].value ** 2 + other[1].value ** 2, r * r));
    },
  });
}

// ───────────── Topic ─────────────

const EX1 = tiltedParam(1, 1, 7);

export default {
  id: 'implicit-parametric',
  title: 'Implicit Curves & Parametrizing',
  summary: 'Test points on implicit curves, solve them for y, and parametrize segments, circles and ellipses with the right start and direction.',
  standards: ['AP Precalculus 4.4', 'AP Precalculus 4.5', 'AP Precalculus 4.7'],

  explain: {
    intro: R`Many curves are not graphs of functions. A circle, an ellipse or the curve \(x^{2} + xy + y^{2} = 7\) is described implicitly: by an equation that its points satisfy. Another way to describe a curve is to give \(x\) and \(y\) separately as functions of a parameter \(t\); this also says where a moving point is at each moment and which way it goes.`,
    rules: [
      {
        title: 'Points on an implicit curve',
        text: R`An equation in \(x\) and \(y\) defines the curve of all points that make it true. To test a point, substitute both coordinates and see whether the two sides are equal.`,
        example: R`\((2, 1)\) is on \(x^{2} + xy + y^{2} = 7\) because \(4 + 2 + 1 = 7\). \((2, 2)\) is not: \(4 + 4 + 4 = 12\).`,
      },
      {
        title: 'Solving for y at a given x',
        text: R`Substitute the \(x\)-value and solve for \(y\). For a second-degree curve this is a quadratic in \(y\), with two, one or no real solutions (look at the discriminant). Two \(y\)-values for one \(x\) means the curve fails the vertical line test, so it is not the graph of a function of \(x\). The \(x\)-values with a negative discriminant have no point at all.`,
        example: R`At \(x = 1\): \(1 + y + y^{2} = 7\), so \(y^{2} + y - 6 = 0\) and \(y = 2\) or \(y = -3\). At \(x = 4\): \(y^{2} + 4y + 9 = 0\) has no real solution.`,
      },
      {
        title: 'Where a curve crosses the axes',
        text: R`On the \(x\)-axis \(y = 0\), so set \(y = 0\) and solve for \(x\). On the \(y\)-axis set \(x = 0\) and solve for \(y\). Every term containing the zero variable drops out.`,
        example: R`\(x^{2} + xy + y^{2} = 7\) crosses the \(x\)-axis where \(x^{2} = 7\): at \(\left(\pm\sqrt{7}, 0\right)\).`,
      },
      {
        title: 'Parametrizing a segment or a graph',
        text: R`The segment from \(P(x_{1}, y_{1})\) to \(Q(x_{2}, y_{2})\) is \(x = x_{1} + t(x_{2} - x_{1}),\ y = y_{1} + t(y_{2} - y_{1})\) for \(0 \le t \le 1\): start at \(P\) and add \(t\) times the change. At \(t = \frac{1}{2}\) it is at the midpoint. The graph of \(y = f(x)\) is \(x = t,\ y = f(t)\). On a parametric graph each point carries a value of \(t\); read its coordinates from the axes.`,
        example: R`From \((-2, 1)\) to \((4, 5)\): \(x = -2 + 6t,\ y = 1 + 4t\). At \(t = \frac{1}{2}\) the point is \((1, 3)\).`,
      },
      {
        title: 'Circles and ellipses',
        text: R`\(x = h + a\cos t,\ y = k + b\sin t\), \(0 \le t \le 2\pi\), traces the ellipse with centre \((h, k)\) and semi-axes \(a\) and \(b\) once counterclockwise, starting at \((h + a, k)\); with \(a = b\) it is a circle. Changing the sign of the sine term makes it go clockwise; swapping sine and cosine changes the starting point. With \(\cos 2t\) and \(\sin 2t\) the same interval goes round twice.`,
        example: R`\(x = 3\cos t,\ y = -3\sin t\) starts at \((3, 0)\) and at \(t = \frac{\pi}{2}\) is at \((0, -3)\): clockwise.`,
      },
      {
        title: 'Eliminating the parameter',
        text: R`Solve one equation for \(t\) (or for \(\cos t\), \(\sin t\), \(t^{2}\)) and substitute into the other. With sine and cosine use \(\cos^{2} t + \sin^{2} t = 1\); with secant and tangent use \(\sec^{2} t - \tan^{2} t = 1\). Then check which part of the curve is actually traced: \(x = t^{2}\) can never be negative.`,
        example: R`\(x = 1 + 3\cos t,\ y = -2 + 2\sin t\) gives \(\dfrac{(x - 1)^{2}}{9} + \dfrac{(y + 2)^{2}}{4} = 1\).`,
      },
    ],
    vocab: [
      { term: 'implicit equation', def: R`An equation in \(x\) and \(y\), such as \(x^{2} + y^{2} = 25\), that describes a curve without solving for \(y\).` },
      { term: 'parameter', def: R`The extra variable, often \(t\), in equations \(x = f(t),\ y = g(t)\). Each value of \(t\) gives one point.` },
      { term: 'parametrization', def: 'A pair of parametric equations, with an interval for t, that traces a given curve.' },
      { term: 'orientation', def: 'The direction in which a parametric curve is traced as t increases.' },
    ],
    mistakes: [
      R`Stopping at one \(y\)-value. A quadratic in \(y\) often has two, and both points are on the curve.`,
      R`Writing the segment as \(x = x_{1} + x_{2}t\). The parameter multiplies the change \(x_{2} - x_{1}\), not the end value.`,
      R`Assuming every parametrization of a circle starts at the right and goes counterclockwise. Check \(t = 0\) and \(t = \frac{\pi}{2}\).`,
      R`Forgetting the restriction after eliminating. \(x = t^{2},\ y = t^{2} + 1\) is only the ray \(y = x + 1,\ x \ge 0\).`,
    ],
    visual: {
      type: 'plot',
      x: [-4, 4],
      y: [-4, 4],
      square: true,
      param: [{ x: EX1.x, y: EX1.y, t: [0, 2 * Math.PI] }],
      vlines: [{ x: 1 }],
      points: [{ x: 1, y: 2, label: '(1, 2)' }, { x: 1, y: -3, label: '(1, −3)' }, { x: 2, y: 1, label: '(2, 1)', color: 'b' }],
      alt: 'The curve x² + xy + y² = 7, a tilted ellipse centred at the origin that reaches from about x = −3.06 to x = 3.06. The dashed vertical line x = 1 meets it at two points, (1, 2) and (1, −3), so the curve is not the graph of a function. The point (2, 1) is also on the curve.',
    },
  },

  examples: [
    {
      title: 'Testing points and solving for y',
      problem: R`Is \((2, 1)\) on \(x^{2} + xy + y^{2} = 7\)? Which points of the curve have \(x = 1\)?`,
      steps: [
        R`Substitute \((2, 1)\): \(2^{2} + 2 \cdot 1 + 1^{2} = 4 + 2 + 1 = 7\). Yes, it is on the curve.`,
        R`Substitute \(x = 1\): \(1 + y + y^{2} = 7\), so \(y^{2} + y - 6 = 0\).`,
        R`Factor: \((y + 3)(y - 2) = 0\), so \(y = -3\) or \(y = 2\).`,
        R`Two points, \((1, -3)\) and \((1, 2)\), share \(x = 1\), so \(y\) is not a function of \(x\) on this curve.`,
      ],
      answer: R`Yes; \((1, 2)\) and \((1, -3)\)`,
    },
    {
      title: 'Parametrizing a segment',
      problem: R`Parametrize the segment from \(P(-2, 1)\) to \(Q(4, 5)\) for \(0 \le t \le 1\), and find the point at \(t = \frac{1}{4}\).`,
      steps: [
        R`The change from \(P\) to \(Q\) is \(\langle 4 - (-2), 5 - 1 \rangle = \langle 6, 4 \rangle\).`,
        R`\(x = -2 + 6t,\ y = 1 + 4t\). Check: \(t = 0\) gives \((-2, 1)\), \(t = 1\) gives \((4, 5)\).`,
        R`At \(t = \frac{1}{4}\): \(x = -2 + \frac{6}{4} = -\frac{1}{2}\), \(y = 1 + 1 = 2\).`,
        R`To go from \(Q\) back to \(P\) instead, use \(x = 4 - 6t,\ y = 5 - 4t\).`,
      ],
      answer: R`\(x = -2 + 6t,\ y = 1 + 4t\); at \(t = \frac{1}{4}\) the point is \(\left(-\frac{1}{2}, 2\right)\).`,
      visual: {
        type: 'plot',
        x: [-4, 6],
        y: [-1, 7],
        square: true,
        segments: [{ from: [-2, 1], to: [4, 5], arrow: true }],
        points: [{ x: -2, y: 1, label: 'P, t = 0' }, { x: -0.5, y: 2, label: 't = ¼', color: 'b' }, { x: 4, y: 5, label: 'Q, t = 1' }],
        alt: 'An arrow from P(−2, 1) at t = 0 to Q(4, 5) at t = 1, with the point (−½, 2) at t = ¼ marked a quarter of the way along.',
      },
    },
    {
      title: 'An ellipse: start, direction and equation',
      problem: R`Describe the motion \(x = 1 + 3\cos t,\ y = -2 + 2\sin t\) for \(0 \le t \le 2\pi\), and eliminate the parameter.`,
      steps: [
        R`At \(t = 0\): \((1 + 3, -2 + 0) = (4, -2)\). At \(t = \frac{\pi}{2}\): \((1, 0)\). From the rightmost point to the top: counterclockwise.`,
        R`As \(t\) runs through \(2\pi\) the angle makes one full turn, so the ellipse is traced once. On \(0 \le t \le 4\pi\) it would go round twice.`,
        R`Isolate: \(\cos t = \frac{x - 1}{3}\), \(\sin t = \frac{y + 2}{2}\). Square and add: \(\dfrac{(x - 1)^{2}}{9} + \dfrac{(y + 2)^{2}}{4} = 1\).`,
      ],
      answer: R`Once counterclockwise from \((4, -2)\), along \(\dfrac{(x - 1)^{2}}{9} + \dfrac{(y + 2)^{2}}{4} = 1\)`,
      visual: {
        type: 'plot',
        x: [-3, 5],
        y: [-5, 1],
        square: true,
        param: [{ x: (t) => 1 + 3 * Math.cos(t), y: (t) => -2 + 2 * Math.sin(t), t: [0, 2 * Math.PI] }],
        segments: [{ from: [4, -2.6], to: [4, -1.4], arrow: true, color: 'a' }],
        points: [{ x: 4, y: -2, label: 'start (4, −2)' }, { x: 1, y: 0, label: 't = π/2: (1, 0)', color: 'b' }, { x: 1, y: -2, label: 'centre', color: 'c' }],
        alt: 'An ellipse with centre (1, −2), reaching 3 units left and right and 2 units up and down. The start (4, −2) at t = 0 is marked, with an upward arrow there; the point (1, 0) at t = π/2 is the top. The motion is counterclockwise.',
      },
    },
    {
      title: 'Word problem: a drone on a straight path',
      word: true,
      problem: 'A drone flies at constant speed in a straight line from (0, 2) to (12, 11), in kilometres, taking 3 hours. Where is it after 2 hours, and when does it pass x = 6?',
      steps: [
        R`The change over the trip is \(\langle 12, 9 \rangle\) in 3 hours, so each hour it moves \(\langle 4, 3 \rangle\): \(x = 4t,\ y = 2 + 3t\), \(0 \le t \le 3\).`,
        R`At \(t = 2\): \((8, 8)\).`,
        R`\(4t = 6\) gives \(t = 1.5\) hours. Then \(y = 2 + 4.5 = 6.5\).`,
      ],
      answer: R`At \((8, 8)\) after 2 hours; it passes \(x = 6\) after 1.5 hours, at \((6, 6.5)\).`,
    },
  ],

  models: [
    {
      id: 'vertical-line',
      title: 'Points of x² + bxy + y² = c above one x',
      intro: 'Choose the curve and an x-value. Substituting x leaves a quadratic in y; its discriminant says whether the vertical line meets the curve twice, once or not at all.',
      inputs: [
        { name: 'b', label: 'b (coefficient of xy)', type: 'number', min: -1.5, max: 1.5, step: 0.5, value: 1 },
        { name: 'c', label: 'c (right-hand side)', type: 'int', min: 1, max: 40, value: 7 },
        { name: 'x0', label: 'x-value', type: 'number', min: -8, max: 8, step: 0.5, value: 1 },
      ],
      compute({ b, c, x0 }) {
        const lin = b * x0;
        const cst = x0 * x0 - c;
        const disc = lin * lin - 4 * cst;
        const P = tiltedParam(b, 1, c);
        const r = (v) => Math.round(v * 1000) / 1000;
        const ys = disc > 1e-12 ? [(-lin - Math.sqrt(disc)) / 2, (-lin + Math.sqrt(disc)) / 2] : Math.abs(disc) <= 1e-12 ? [-lin / 2] : [];
        const W = Math.max(Math.ceil(P.X) + 2, Math.abs(x0) + 2);
        const curveT = b === 0 ? R`x^{2} + y^{2} = ${c}` : R`${terms([[1, 'x^{2}'], [b, 'xy'], [1, 'y^{2}']])} = ${c}`;
        return {
          problem: R`Find the points of \(${curveT}\) with \(x = ${num(x0)}\).`,
          steps: [
            R`Substitute \(x = ${num(x0)}\) and collect terms: \(${terms([[1, 'y^{2}'], [lin, 'y'], [cst, '']])} = 0\).`,
            R`Discriminant: \(${lin < 0 ? `(${num(lin)})` : num(lin)}^{2} - 4 \cdot ${cst < 0 ? `(${num(cst)})` : num(cst)} = ${num(r(disc))}\).`,
            ys.length === 2 ? R`Positive: two solutions, \(y \approx ${num(r(ys[0]))}\) and \(y \approx ${num(r(ys[1]))}\). The vertical line crosses the curve twice.` : ys.length === 1 ? R`Zero: one solution, \(y = ${num(r(ys[0]))}\). The vertical line just touches the curve.` : R`Negative: no real \(y\). There is no point of the curve with \(x = ${num(x0)}\).`,
            R`The curve has points only for \(|x| \le ${num(r(P.X))}\) (where the discriminant \(${num(4 * c)} - ${num(4 - b * b)}x^{2}\) is not negative).`,
          ],
          answer: ys.length ? ys.map((y) => R`\(\left(${num(x0)}, ${num(r(y))}\right)\)`).join(' and ') : 'No point of the curve has this x-value.',
          visual: {
            type: 'plot',
            x: [-W, W],
            y: [-W, W],
            square: true,
            param: [{ x: P.x, y: P.y, t: [0, 2 * Math.PI] }],
            vlines: [{ x: x0 }],
            points: ys.map((y) => ({ x: x0, y, label: `(${txt(x0)}, ${txt(r(y))})` })),
            alt: `The curve ${b === 0 ? 'x² + y²' : `x² ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : txt(Math.abs(b))}xy + y²`} = ${c}, a closed oval reaching from x = −${txt(r(P.X))} to x = ${txt(r(P.X))}, and the dashed vertical line x = ${txt(x0)}, which ${ys.length === 2 ? `meets it at (${txt(x0)}, ${txt(r(ys[0]))}) and (${txt(x0)}, ${txt(r(ys[1]))})` : ys.length === 1 ? `touches it at (${txt(x0)}, ${txt(r(ys[0]))})` : 'misses it'}.`,
          },
        };
      },
    },
    {
      id: 'straight-path',
      title: 'Word problem: where is it at time t?',
      word: true,
      intro: 'An object moves at constant speed in a straight line from a start point to an end point. Choose the points, the trip time and a moment.',
      inputs: [
        { name: 'x1', label: 'Start x (m)', type: 'int', min: -20, max: 20, value: -4 },
        { name: 'y1', label: 'Start y (m)', type: 'int', min: -20, max: 20, value: 2 },
        { name: 'x2', label: 'End x (m)', type: 'int', min: -20, max: 20, value: 8 },
        { name: 'y2', label: 'End y (m)', type: 'int', min: -20, max: 20, value: -6 },
        { name: 'T', label: 'Trip time (s)', type: 'int', min: 1, max: 60, value: 4 },
        { name: 's', label: 'Moment (s)', type: 'number', min: 0, max: 60, step: 0.5, value: 3 },
      ],
      compute({ x1, y1, x2, y2, T, s }) {
        if (x1 === x2 && y1 === y2) return { error: 'The start and end points are the same, so there is no path. Move one of them.' };
        if (s > T) return { error: `The trip takes only ${T} seconds. Choose a moment between 0 and ${T}.` };
        const dx = x2 - x1;
        const dy = y2 - y1;
        const f = s / T;
        const px = x1 + f * dx;
        const py = y1 + f * dy;
        const r = (v) => Math.round(v * 1000) / 1000;
        return {
          problem: `A robot rolls at constant speed in a straight line from (${txt(x1)}, ${txt(y1)}) to (${txt(x2)}, ${txt(y2)}), in metres, taking ${T} ${T === 1 ? 'second' : 'seconds'}. Where is it ${txt(s)} ${s === 1 ? 'second' : 'seconds'} after it starts?`,
          steps: [
            R`Change over the trip: \(\langle ${dx}, ${dy} \rangle\). As a segment with \(0 \le u \le 1\): \(x = ${linear(dx, x1, 'u')},\ y = ${linear(dy, y1, 'u')}\).`,
            R`At time \(t\) seconds, \(u = \dfrac{t}{${T}}\). At \(t = ${num(s)}\): \(u = ${num(r(f))}\).`,
            R`\(x = ${x1} + ${num(r(f))} \cdot ${dx < 0 ? `(${dx})` : dx} = ${num(r(px))}\) and \(y = ${y1} + ${num(r(f))} \cdot ${dy < 0 ? `(${dy})` : dy} = ${num(r(py))}\).`,
          ],
          answer: R`\(\left(${num(r(px))}, ${num(r(py))}\right)\)`,
          visual: {
            type: 'plot',
            x: [Math.min(x1, x2) - 3, Math.max(x1, x2) + 3],
            y: [Math.min(y1, y2) - 3, Math.max(y1, y2) + 3],
            square: true,
            segments: [{ from: [x1, y1], to: [x2, y2], arrow: true }],
            points: [{ x: x1, y: y1, label: 'start' }, { x: px, y: py, label: `t = ${txt(s)}`, color: 'b' }],
            alt: `An arrow from the start (${txt(x1)}, ${txt(y1)}) to the end (${txt(x2)}, ${txt(y2)}), with the robot's position (${txt(r(px))}, ${txt(r(py))}) at t = ${txt(s)} marked.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyOnCurve, easySegment, easyReadGraph],
    medium: [mediumSolveForY, mediumAxisCrossings, mediumEllipseParam],
    hard: [hardTraceCount, hardEliminate, hardParamWord],
    challenge: [challengeXRange, challengeBuildEllipse, challengeFenceCrossing],
  },
};
