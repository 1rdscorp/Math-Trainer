import { R, q, frac, fracTex, num, txt, plural, signed, terms, factor, point, sqrtTex, simplifySqrt, round, checkEqual } from '../../lib/index.js';
import { M, dec, apart } from './_shared.js';

// (x − h)² as LaTeX: sq(3) → "(x - 3)^{2}", sq(-1, 'y') → "(y + 1)^{2}", sq(0) → "x^{2}".
const sq = (h, v = 'x') => `${factor(h, v)}^{2}`;
// A coefficient written in front of a bracket or a letter, with 1 and −1 hidden.
const cf = (a) => (a === 1 ? '' : a === -1 ? '-' : num(a));
// Standard forms. A is the number under the x-term and B the number under the y-term.
const circleEq = (h, k, r2) => `${sq(h)} + ${sq(k, 'y')} = ${r2}`;
const under = (top, den) => (den === 1 ? top : R`\dfrac{${top}}{${den}}`);
const ellipseEq = (h, k, A, B) => `${under(sq(h), A)} + ${under(sq(k, 'y'), B)} = 1`;
const hyperEq = (h, k, A, B, vertical) => (vertical ? `${under(sq(k, 'y'), B)} - ${under(sq(h), A)} = 1` : `${under(sq(h), A)} - ${under(sq(k, 'y'), B)} = 1`);
// Slopes ±rise/run of a hyperbola's asymptotes, with the reduced fraction when it is different: "\pm\frac{8}{6} = \pm\frac{4}{3}".
const slopes = (rise, run) => R`\pm${fracTex(rise, run)}${frac(rise, run).tex() === fracTex(rise, run) ? '' : R` = \pm${frac(rise, run).tex()}`}`;
// A hyperbola from its semi-axes: a along the axis it opens on, b across it.
const hyp = (h, k, a, b, vertical) => hyperEq(h, k, vertical ? b * b : a * a, vertical ? a * a : b * b, vertical);
// (x − h)² = c(y − k) when vertical (opens up or down), (y − k)² = c(x − h) otherwise.
const bracket = (c, k, v) => (c === 1 ? terms([[1, v], [-k, '']]) : `${cf(c)}${factor(k, v)}`);
const parabolaEq = (h, k, c, vertical) => (vertical ? `${sq(h)} = ${bracket(c, k, 'y')}` : `${sq(k, 'y')} = ${bracket(c, h, 'x')}`);

// Points on each curve, for testing answers against the definitions.
const dist = (p, s) => Math.hypot(p[0] - s[0], p[1] - s[1]);
const onEllipse = (h, k, ax, ay) => [0.3, 1.1, 2, 2.9, 4.2, 5.5].map((t) => [h + ax * Math.cos(t), k + ay * Math.sin(t)]);
const onHyperbola = (h, k, a, b, vertical) => [-1.2, -0.4, 0.5, 1.3].flatMap((t) => [1, -1].map((s) => (vertical ? [h + b * Math.sinh(t), k + s * a * Math.cosh(t)] : [h + s * a * Math.cosh(t), k + b * Math.sinh(t)])));
const onParabola = (h, k, c, vertical) => [-3, -1, 0.5, 2, 4].map((t) => (vertical ? [h + t, k + (t * t) / c] : [h + (t * t) / c, k + t]));
const pairTex = ([p1, p2]) => R`\(${point(...p1)}\) and \(${point(...p2)}\)`;
// Two points d units either side of (h, k), along the x-direction or the y-direction.
const eitherSide = (h, k, d, alongX) => (alongX ? [[h - d, k], [h + d, k]] : [[h, k - d], [h, k + d]]);
// The same with d = coef·√rad left as a radical, as LaTeX.
const rootPair = (h, k, n, alongX) => {
  const { coef, rad } = simplifySqrt(n);
  const root = R`\sqrt{${rad}}`;
  const pt = (s) => (alongX ? `(${terms([[h, ''], [s * coef, root]])}, ${k})` : `(${h}, ${terms([[k, ''], [s * coef, root]])})`);
  return R`\(${pt(-1)}\) and \(${pt(1)}\)`;
};

const KINDS = ['Circle', 'Ellipse', 'Parabola', 'Hyperbola'];
const NEEDS = {
  Circle: 'A circle needs both squared terms, added, with equal coefficients.',
  Ellipse: 'An ellipse needs both squared terms, added, with different coefficients.',
  Parabola: 'A parabola has only one squared variable.',
  Hyperbola: 'A hyperbola needs both squared terms, with opposite signs.',
};
const article = (kind) => (kind === 'Ellipse' ? 'an ellipse' : `a ${kind.toLowerCase()}`);
// [a, b, c] with c² = a² − b² (ellipses) and with c² = a² + b² (hyperbolas).
const ELLIPSES = [[5, 4, 3], [5, 3, 4], [10, 8, 6], [10, 6, 8], [13, 12, 5], [13, 5, 12], [17, 15, 8], [17, 8, 15]];
const HYPERBOLAS = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17]];

// ───────────── Easy ─────────────

function easyCircle(rng) {
  const h = rng.nonzero(-6, 6);
  const k = rng.int(-6, 6);
  const r = rng.int(2, 9);
  const check = () => (onEllipse(h, k, r, r).every(([x, y]) => Math.abs((x - h) ** 2 + (y - k) ** 2 - r * r) < 1e-9) ? true : 'points r units from the centre do not satisfy the equation');
  if (rng.bool()) {
    const opt = (x, y, rad) => R`Centre \(${point(x, y)}\), radius \(${rad}\)`;
    return q({
      prompt: R`Find the centre and the radius of the circle \(${circleEq(h, k, r * r)}\).`,
      correct: opt(h, k, r),
      wrong: [
        { value: opt(-h, -k, r), why: R`\(${sq(h)}\) is zero when \(x = ${h}\), so the centre has \(x = ${h}\). The signs inside the brackets are the opposite of the coordinates.` },
        { value: opt(h, k, r * r), why: R`The right-hand side is \(r^{2}\). The radius is \(\sqrt{${r * r}} = ${r}\).` },
        opt(-h, -k, r * r),
        opt(k, h, r),
      ],
      solution: [R`Compare with \((x - h)^{2} + (y - k)^{2} = r^{2}\), which has centre \((h, k)\) and radius \(r\).`, R`Here \(h = ${h}\), \(k = ${k}\) and \(r^{2} = ${r * r}\), so \(r = ${r}\).`, `${opt(h, k, r)}.`],
      rule: 0,
      skill: 'circles',
      check,
    });
  }
  return q({
    prompt: R`Write the equation of the circle with centre \(${point(h, k)}\) and radius \(${r}\).`,
    correct: M(circleEq(h, k, r * r)),
    wrong: [
      { value: M(circleEq(-h, -k, r * r)), why: R`The centre \((h, k)\) appears as \((x - h)\) and \((y - k)\), with the coordinates subtracted.` },
      { value: M(circleEq(h, k, r)), why: R`The right-hand side is the radius squared: \(${r}^{2} = ${r * r}\).` },
      r === 2 ? null : { value: M(circleEq(h, k, 2 * r)), why: R`\(r^{2}\) means \(${r} \times ${r}\), not \(2 \times ${r}\).` },
      M(circleEq(-h, -k, r)),
    ],
    solution: [R`Use \((x - h)^{2} + (y - k)^{2} = r^{2}\) with \(h = ${h}\), \(k = ${k}\) and \(r = ${r}\).`, R`\(${circleEq(h, k, r * r)}\).`],
    rule: 0,
    skill: 'circles',
    check,
  });
}

function easyIdentifyStandard(rng) {
  const kind = rng.pick(KINDS);
  const [h, k] = [rng.int(-5, 5), rng.int(-5, 5)];
  const [A, B] = rng.sample([4, 9, 16, 25, 36, 49], 2);
  const c = rng.pick([4, 8, 12, 16, 20]) * rng.sign();
  const vertical = rng.bool();
  const tex = { Circle: circleEq(h, k, A), Ellipse: ellipseEq(h, k, A, B), Hyperbola: hyperEq(h, k, A, B, vertical), Parabola: parabolaEq(h, k, c, vertical) }[kind];
  const reason = {
    Circle: R`Both squared terms are present, they are added, and they have the same coefficient.`,
    Ellipse: R`Both squared terms are present and they are added, but they are divided by different numbers (\(${A}\) and \(${B}\)).`,
    Hyperbola: R`Both squared terms are present, and one is subtracted from the other.`,
    Parabola: R`Only \(${vertical ? 'x' : 'y'}\) is squared.`,
  }[kind];
  return q({
    prompt: R`Which conic section is the graph of \(${tex}\)?`,
    correct: kind,
    wrong: KINDS.filter((name) => name !== kind).map((name) => ({ value: name, why: NEEDS[name] })),
    solution: ['Look at the squared terms.', reason, `The graph is ${article(kind)}.`],
    rule: 4,
    skill: 'identifying a conic',
  });
}

function easyParabolaOpens(rng) {
  const vertical = rng.bool();
  const c = rng.pick([2, 4, 6, 8, 10, 12]) * rng.sign();
  const h = rng.nonzero(-6, 6);
  const k = rng.int(-6, 6);
  const [along, across] = vertical ? [['upward', 'downward'], ['to the right', 'to the left']] : [['to the right', 'to the left'], ['upward', 'downward']];
  const dir = along[c > 0 ? 0 : 1];
  const opt = (x, y, d) => R`Vertex \(${point(x, y)}\), opens ${d}`;
  const v = vertical ? 'x' : 'y';
  const w = vertical ? 'y' : 'x';
  return q({
    prompt: R`Find the vertex of the parabola \(${parabolaEq(h, k, c, vertical)}\) and the direction in which it opens.`,
    correct: opt(h, k, dir),
    wrong: [
      { value: opt(-h, -k, dir), why: R`The vertex is where both sides are zero: \(x = ${h}\) and \(y = ${k}\). The signs inside the brackets are the opposite of the coordinates.` },
      { value: opt(h, k, along[c > 0 ? 1 : 0]), why: R`The left-hand side is a square, so it is never negative. With the multiplier \(${c}\), that forces \(${w} ${c > 0 ? R`\ge` : R`\le`} ${vertical ? k : h}\).` },
      { value: opt(h, k, across[c > 0 ? 0 : 1]), why: R`\(${v}\) is the squared variable, so the parabola opens ${vertical ? 'up or down' : 'to the right or to the left'}.` },
      opt(h, k, across[c > 0 ? 1 : 0]),
    ],
    solution: [
      R`The vertex is where both sides are zero: \(x = ${h}\) and \(y = ${k}\), so the vertex is \(${point(h, k)}\).`,
      R`\(${v}\) is the squared variable, so the axis of the parabola is ${vertical ? 'vertical' : 'horizontal'}.`,
      R`The left-hand side is never negative and the multiplier \(${c}\) is ${c > 0 ? 'positive' : 'negative'}, so \(${w} ${c > 0 ? R`\ge` : R`\le`} ${vertical ? k : h}\): the parabola opens ${dir}.`,
    ],
    rule: 1,
    skill: 'parabola: vertex and direction',
    check: () => {
      const moved = onParabola(h, k, c, vertical).map(([x, y]) => (vertical ? y - k : x - h));
      return moved.every((d) => Math.sign(d) === Math.sign(c)) ? true : 'points of the curve lie on the other side of the vertex';
    },
  });
}

function easyEllipseAxes(rng) {
  const [ax, ay] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10], 2);
  const alongX = ax > ay;
  const [major, minor] = alongX ? [ax, ay] : [ay, ax];
  const tex = ellipseEq(0, 0, ax * ax, ay * ay);
  const v = alongX ? 'x' : 'y';
  // The point of the curve farthest from the centre, found by sampling.
  const far = Array.from({ length: 720 }, (_, i) => [ax * Math.cos(i / 114.6), ay * Math.sin(i / 114.6)]).reduce((best, p) => (Math.hypot(...p) > Math.hypot(...best) ? p : best));
  const check = () => (Math.abs(Math.hypot(...far) - major) < 1e-3 && Math.abs(far[alongX ? 1 : 0]) < 0.1 ? true : 'the farthest point of the curve is somewhere else');
  if (rng.bool()) {
    return q({
      prompt: R`How long is the major axis of the ellipse \(${tex}\)?`,
      correct: 2 * major,
      wrong: [
        { value: major, why: 'That is the distance from the centre to a vertex. The whole major axis is twice as long.' },
        { value: 2 * minor, why: 'That is the length of the minor axis. The major axis goes with the larger denominator.' },
        { value: major * major, why: R`\(${major * major}\) is \(a^{2}\). Take the square root to get \(a = ${major}\), then double it.` },
        2 * major * major,
        minor,
      ],
      solution: [R`The larger denominator is \(${major * major}\), so \(a^{2} = ${major * major}\) and \(a = ${major}\).`, R`The major axis runs from one vertex to the other, a distance of \(2a = ${2 * major}\).`],
      rule: 2,
      skill: 'ellipse: axes and vertices',
      check,
    });
  }
  const pair = (d, onX) => (onX ? R`\((\pm ${d}, 0)\)` : R`\((0, \pm ${d})\)`);
  return q({
    prompt: R`What are the vertices (the ends of the major axis) of the ellipse \(${tex}\)?`,
    correct: pair(major, alongX),
    wrong: [
      { value: pair(major, !alongX), why: R`The larger denominator is under \(${v}^{2}\), so the major axis lies along the \(${v}\)-axis.` },
      { value: pair(minor, !alongX), why: 'Those are the co-vertices, the ends of the minor axis.' },
      { value: pair(major * major, alongX), why: R`\(${major * major}\) is \(a^{2}\). The vertices are \(a = ${major}\) units from the centre.` },
      pair(minor, alongX),
    ],
    solution: [
      R`The larger denominator, \(${major * major}\), is under \(${v}^{2}\), so the major axis lies along the \(${v}\)-axis and \(a = \sqrt{${major * major}} = ${major}\).`,
      R`The centre is the origin, so the vertices are ${pair(major, alongX)}.`,
    ],
    rule: 2,
    skill: 'ellipse: axes and vertices',
    check,
  });
}

// ───────────── Medium ─────────────

function mediumEllipseFoci(rng) {
  const [a, b, c] = rng.pick(ELLIPSES);
  const alongX = rng.bool();
  const [h, k] = [rng.int(-5, 5), rng.int(-5, 5)];
  const tex = alongX ? ellipseEq(h, k, a * a, b * b) : ellipseEq(h, k, b * b, a * a);
  const v = alongX ? 'x' : 'y';
  const foci = eitherSide(h, k, c, alongX);
  const pts = alongX ? onEllipse(h, k, a, b) : onEllipse(h, k, b, a);
  // Definition of an ellipse: the distances to the two foci add up to 2a.
  const check = () => (pts.every((p) => Math.abs(dist(p, foci[0]) + dist(p, foci[1]) - 2 * a) < 1e-9) ? true : 'the distances to the two foci do not add up to 2a');
  const setUp = [
    R`The larger denominator, \(${a * a}\), is under the \(${v}\)-term, so \(a^{2} = ${a * a}\), \(b^{2} = ${b * b}\) and the major axis is ${alongX ? 'horizontal' : 'vertical'}.`,
    R`\(c^{2} = a^{2} - b^{2} = ${a * a} - ${b * b} = ${c * c}\), so \(c = ${c}\).`,
  ];
  if (rng.bool(0.6)) {
    return q({
      prompt: R`Find the foci of the ellipse \(${tex}\).`,
      correct: pairTex(foci),
      wrong: [
        { value: pairTex(eitherSide(h, k, c, !alongX)), why: R`The foci lie on the major axis. The larger denominator is under the \(${v}\)-term, so the major axis is ${alongX ? 'horizontal' : 'vertical'}.` },
        { value: rootPair(h, k, a * a + b * b, alongX), why: R`For an ellipse \(c^{2} = a^{2} - b^{2}\). Adding the squares is the rule for a hyperbola.` },
        { value: pairTex(eitherSide(h, k, a, alongX)), why: R`Those are the vertices. The foci are \(c\) units from the centre, where \(c^{2} = a^{2} - b^{2} = ${c * c}\).` },
        pairTex(eitherSide(h, k, b, alongX)),
      ],
      solution: [R`The centre is \(${point(h, k)}\).`, ...setUp, R`The foci are \(${c}\) units from the centre along the major axis: ${pairTex(foci)}.`],
      rule: 2,
      skill: 'ellipse: foci',
      check,
    });
  }
  return q({
    prompt: R`Find the eccentricity of the ellipse \(${tex}\).`,
    correct: frac(c, a),
    fmt: (e) => R`\(e = ${num(e)}\)`,
    wrong: [
      { value: frac(b, a), why: R`Eccentricity is \(\dfrac{c}{a}\), where \(c^{2} = a^{2} - b^{2}\). This is \(\dfrac{b}{a}\).` },
      { value: frac(a, c), why: R`The eccentricity of an ellipse is between 0 and 1: divide \(c\) by \(a\), not \(a\) by \(c\).` },
      { value: frac(c * c, a * a), why: R`Use \(c\) and \(a\) themselves, not their squares.` },
      frac(c, b),
    ],
    solution: [...setUp, R`Eccentricity: \(e = \dfrac{c}{a} = ${fracTex(c, a)}${frac(c, a).tex() === fracTex(c, a) ? '' : ` = ${frac(c, a).tex()}`}\).`],
    rule: 2,
    skill: 'ellipse: eccentricity',
    check,
  });
}

function mediumHyperbola(rng) {
  const [a, b, c] = rng.pick(HYPERBOLAS);
  const vertical = rng.bool();
  // Half-widths of the central box: sx across, sy up and down.
  const [sx, sy] = vertical ? [b, a] : [a, b];
  if (rng.bool()) {
    const slope = frac(sy, sx);
    const lines = (m) => R`\(y = \pm ${m.isInt() ? cf(m.n) : m.tex()}x\)`;
    const far = vertical ? [b * Math.sinh(12), a * Math.cosh(12)] : [a * Math.cosh(12), b * Math.sinh(12)];
    return q({
      prompt: R`Find the asymptotes of the hyperbola \(${hyp(0, 0, a, b, vertical)}\).`,
      correct: lines(slope),
      wrong: [
        { value: lines(slope.inv()), why: R`The asymptotes pass through the corners \((\pm ${sx}, \pm ${sy})\) of the central box, so the slopes are rise over run: \(\pm${fracTex(sy, sx)}\).` },
        { value: lines(slope.mul(slope)), why: R`Use the square roots of the denominators, \(${sx}\) and \(${sy}\), not the denominators themselves.` },
        lines(slope.inv().mul(slope.inv())),
        lines(frac(c, sx)),
      ],
      solution: [
        R`The number under \(x^{2}\) is \(${sx * sx}\) and the number under \(y^{2}\) is \(${sy * sy}\), so the central box reaches \(${sx}\) units left and right of the centre and \(${sy}\) units up and down.`,
        R`The asymptotes pass through the centre \((0, 0)\) and the corners \((\pm ${sx}, \pm ${sy})\) of that box, so their slopes are \(${slopes(sy, sx)}\).`,
        `Asymptotes: ${lines(slope)}.`,
      ],
      rule: 3,
      skill: 'hyperbola: asymptotes',
      check: () => checkEqual(far[1] / far[0], slope.value, 1e-6),
    });
  }
  const [h, k] = [rng.int(-5, 5), rng.int(-5, 5)];
  const foci = eitherSide(h, k, c, !vertical);
  return q({
    prompt: R`Find the foci of the hyperbola \(${hyp(h, k, a, b, vertical)}\).`,
    correct: pairTex(foci),
    wrong: [
      { value: rootPair(h, k, Math.abs(a * a - b * b), !vertical), why: R`For a hyperbola \(c^{2} = a^{2} + b^{2}\). Subtracting the squares is the rule for an ellipse.` },
      { value: pairTex(eitherSide(h, k, c, vertical)), why: R`The foci lie on the axis through the vertices. The \(${vertical ? 'y' : 'x'}\)-term is the positive one, so that axis is ${vertical ? 'vertical' : 'horizontal'}.` },
      { value: pairTex(eitherSide(h, k, a, !vertical)), why: R`Those are the vertices. The foci are \(c\) units from the centre, where \(c^{2} = a^{2} + b^{2} = ${c * c}\).` },
      pairTex(eitherSide(h, k, b, !vertical)),
    ],
    solution: [
      R`The centre is \(${point(h, k)}\). The \(${vertical ? 'y' : 'x'}\)-term is positive, so the hyperbola opens ${vertical ? 'up and down' : 'left and right'}, with \(a^{2} = ${a * a}\) and \(b^{2} = ${b * b}\).`,
      R`\(c^{2} = a^{2} + b^{2} = ${a * a} + ${b * b} = ${c * c}\), so \(c = ${c}\).`,
      R`The foci are \(${c}\) units from the centre along the ${vertical ? 'vertical' : 'horizontal'} axis: ${pairTex(foci)}.`,
    ],
    rule: 3,
    skill: 'hyperbola: foci',
    // Definition of a hyperbola: the distances to the two foci differ by 2a.
    check: () => (onHyperbola(h, k, a, b, vertical).every((p) => Math.abs(Math.abs(dist(p, foci[0]) - dist(p, foci[1])) - 2 * a) < 1e-9) ? true : 'the distances to the two foci do not differ by 2a'),
  });
}

function mediumParabolaFocus(rng) {
  const p = rng.nonzero(-5, 5);
  const vertical = rng.bool();
  const [h, k] = [rng.int(-5, 5), rng.int(-5, 5)];
  const tex = parabolaEq(h, k, 4 * p, vertical);
  const focusAt = (d) => (vertical ? [h, k + d] : [h + d, k]);
  const lineAt = (d, vert = vertical) => (vert ? R`\(y = ${k + d}\)` : R`\(x = ${h + d}\)`);
  const dirWord = vertical ? (p > 0 ? 'upward' : 'downward') : p > 0 ? 'to the right' : 'to the left';
  const setUp = [
    R`The vertex is \(${point(h, k)}\), and \(${vertical ? 'x' : 'y'}\) is the squared variable, so the axis is ${vertical ? 'vertical' : 'horizontal'}.`,
    R`Compare the multiplier with \(4p\): \(4p = ${4 * p}\), so \(p = ${p}\). The parabola opens ${dirWord}.`,
  ];
  // Definition of a parabola: each point is as far from the focus as from the directrix.
  const check = () => (onParabola(h, k, 4 * p, vertical).every(([x, y]) => Math.abs(dist([x, y], focusAt(p)) - Math.abs(vertical ? y - (k - p) : x - (h - p))) < 1e-9) ? true : 'points of the curve are not equally far from the focus and the directrix');
  if (rng.bool()) {
    const pt = (xy) => M(point(...xy));
    return q({
      prompt: R`Find the focus of the parabola \(${tex}\).`,
      correct: pt(focusAt(p)),
      wrong: [
        { value: pt(focusAt(4 * p)), why: R`The multiplier is \(4p\), not \(p\): \(4p = ${4 * p}\) gives \(p = ${p}\).` },
        { value: pt(focusAt(-p)), why: `The focus is inside the curve. This parabola opens ${dirWord}, so the focus is on that side of the vertex.` },
        { value: pt(vertical ? [h + p, k] : [h, k + p]), why: R`The focus lies on the axis of the parabola, which is ${vertical ? 'vertical' : 'horizontal'} here.` },
        pt(focusAt(-4 * p)),
      ],
      solution: [...setUp, R`The focus is \(|p| = ${Math.abs(p)}\) units from the vertex, on the side the parabola opens towards: \(${point(...focusAt(p))}\).`],
      rule: 1,
      skill: 'parabola: focus and directrix',
      check,
    });
  }
  return q({
    prompt: R`Find the directrix of the parabola \(${tex}\).`,
    correct: lineAt(-p),
    wrong: [
      { value: lineAt(p), why: 'That line passes through the focus. The directrix is on the opposite side of the vertex, the same distance away.' },
      { value: lineAt(-4 * p), why: R`The multiplier is \(4p\), not \(p\): \(4p = ${4 * p}\) gives \(p = ${p}\).` },
      { value: lineAt(-p, !vertical), why: `The directrix is perpendicular to the axis of the parabola, so here it is a ${vertical ? 'horizontal' : 'vertical'} line.` },
      lineAt(4 * p),
    ],
    solution: [...setUp, R`The directrix is \(|p| = ${Math.abs(p)}\) units from the vertex on the side away from the focus: ${lineAt(-p)}.`],
    rule: 1,
    skill: 'parabola: focus and directrix',
    check,
  });
}

function mediumIdentifyGeneral(rng) {
  const kind = rng.pick(KINDS);
  const [h, k] = [rng.int(-4, 4), rng.int(-4, 4)];
  const [p, s] = rng.sample([1, 2, 3, 4, 5], 2);
  const [A, C] = [p * p, s * s];
  let co; // [A, C, D, E, F] in Ax² + Cy² + Dx + Ey + F = 0
  let pts;
  let reason;
  if (kind === 'Circle') {
    const m = rng.pick([1, 1, 2, 3]);
    const r = rng.int(2, 6);
    co = [m, m, -2 * m * h, -2 * m * k, m * (h * h + k * k - r * r)];
    pts = onEllipse(h, k, r, r);
    reason = R`The coefficients of \(x^{2}\) and \(y^{2}\) are equal (both \(${m}\)), so the graph is a circle.`;
  } else if (kind === 'Ellipse') {
    co = [A, C, -2 * A * h, -2 * C * k, A * h * h + C * k * k - A * C];
    pts = onEllipse(h, k, s, p);
    reason = R`The coefficients of \(x^{2}\) and \(y^{2}\) are \(${A}\) and \(${C}\): different, but with the same sign. The graph is an ellipse.`;
  } else if (kind === 'Hyperbola') {
    const sg = rng.sign();
    co = [A, -C, -2 * A * h, 2 * C * k, A * h * h - C * k * k - sg * A * C];
    pts = sg > 0 ? onHyperbola(h, k, s, p, false) : onHyperbola(h, k, p, s, true);
    if (rng.bool()) co = co.map((v) => -v);
    reason = R`The coefficients of \(x^{2}\) and \(y^{2}\) are \(${co[0]}\) and \(${co[1]}\), which have opposite signs. The graph is a hyperbola.`;
  } else {
    const c = 2 * rng.nonzero(-4, 4);
    const vertical = rng.bool();
    co = vertical ? [1, 0, -2 * h, -c, h * h + c * k] : [0, 1, -c, -2 * k, k * k + c * h];
    pts = onParabola(h, k, c, vertical);
    reason = R`Only \(${vertical ? 'x' : 'y'}\) is squared, so the graph is a parabola.`;
  }
  const [a2, c2, d1, e1, f0] = co;
  return q({
    prompt: R`Which conic section is the graph of \(${terms([[a2, 'x^{2}'], [c2, 'y^{2}'], [d1, 'x'], [e1, 'y'], [f0, '']])} = 0\)?`,
    correct: kind,
    wrong: KINDS.filter((name) => name !== kind).map((name) => ({ value: name, why: NEEDS[name] })),
    solution: [R`There is no \(xy\) term, so compare the coefficients of \(x^{2}\) and \(y^{2}\).`, reason],
    rule: 4,
    skill: 'identifying a conic',
    check: () => (pts.every(([x, y]) => Math.abs(a2 * x * x + c2 * y * y + d1 * x + e1 * y + f0) < 1e-6) ? true : `points of the ${kind.toLowerCase()} do not satisfy the equation`),
  });
}

// ───────────── Hard ─────────────

function hardCompleteSquare(rng) {
  const h = rng.nonzero(-5, 5);
  const k = rng.nonzero(-5, 5);
  if (rng.bool(0.45)) {
    const r = rng.int(2, 9);
    const [D, E, F] = [-2 * h, -2 * k, h * h + k * k - r * r];
    const opt = (x, y, rad) => R`Centre \(${point(x, y)}\), radius \(${rad}\)`;
    const rootF = Math.sqrt(-F);
    return q({
      prompt: R`Find the centre and the radius of the circle \(${terms([[1, 'x^{2}'], [1, 'y^{2}'], [D, 'x'], [E, 'y'], [F, '']])} = 0\).`,
      correct: opt(h, k, r),
      wrong: [
        { value: opt(-h, -k, r), why: R`\(x^{2} ${signed(D)}x\) completes to \(${sq(h)}\), which is zero when \(x = ${h}\). The centre is \(${point(h, k)}\).` },
        Number.isInteger(rootF) && rootF !== r && rootF > 0 ? { value: opt(h, k, rootF), why: R`The numbers added to complete the squares, \(${h * h}\) and \(${k * k}\), must be added to the right-hand side as well.` } : null,
        { value: opt(2 * h, 2 * k, r), why: R`To complete the square, halve the coefficients of \(x\) and \(y\).` },
        { value: opt(h, k, r * r), why: R`After completing the squares the right-hand side is \(r^{2} = ${r * r}\). Take the square root.` },
        opt(-h, -k, r * r),
      ],
      solution: [
        R`Group the \(x\)-terms and the \(y\)-terms and move the constant: \((x^{2} ${signed(D)}x) + (y^{2} ${signed(E)}y) = ${-F}\).`,
        R`Complete each square. Half of \(${D}\) is \(${-h}\) and half of \(${E}\) is \(${-k}\), so add \(${h * h}\) and \(${k * k}\) to both sides: \(${sq(h)} + ${sq(k, 'y')} = ${-F} + ${h * h} + ${k * k} = ${r * r}\).`,
        R`Compare with \((x - h)^{2} + (y - k)^{2} = r^{2}\): centre \(${point(h, k)}\), radius \(\sqrt{${r * r}} = ${r}\).`,
      ],
      rule: 5,
      skill: 'completing the square',
      check: () => (onEllipse(h, k, r, r).every(([x, y]) => Math.abs(x * x + y * y + D * x + E * y + F) < 1e-9) ? true : 'points of that circle do not satisfy the equation'),
    });
  }
  const [p, s] = rng.sample([2, 3, 4], 2);
  const [A, C] = [p * p, s * s];
  const kind = rng.pick(['ellipse', 'ellipse', 'hyperX', 'hyperY']);
  // A(x − h)² ± C(y − k)² = ±AC. Dividing by AC puts C under the x-term and A under the y-term.
  const sy = kind === 'ellipse' ? 1 : -1;
  const sr = kind === 'hyperY' ? -1 : 1;
  const [D, E, F] = [-2 * A * h, -2 * sy * C * k, A * h * h + sy * C * k * k - sr * A * C];
  const form = (hh, kk, under1, under2, type) => {
    const tex = type === 'ellipse' ? ellipseEq(hh, kk, under1, under2) : hyperEq(hh, kk, under1, under2, type === 'hyperY');
    const f = (x, y) => (type === 'ellipse' ? (x - hh) ** 2 / under1 + (y - kk) ** 2 / under2 : (type === 'hyperY' ? -1 : 1) * ((x - hh) ** 2 / under1 - (y - kk) ** 2 / under2)) - 1;
    return { text: M(tex), f };
  };
  const right = form(h, k, C, A, kind);
  const wrongs = [form(-h, -k, C, A, kind), form(h, k, A, C, kind), form(h, k, C, A, kind === 'ellipse' ? 'hyperX' : 'ellipse'), form(-h, -k, A, C, kind)];
  const pts = kind === 'ellipse' ? onEllipse(h, k, s, p) : kind === 'hyperX' ? onHyperbola(h, k, s, p, false) : onHyperbola(h, k, p, s, true);
  const general = (x, y) => A * x * x + sy * C * y * y + D * x + E * y + F;
  return q({
    prompt: R`Write \(${terms([[A, 'x^{2}'], [sy * C, 'y^{2}'], [D, 'x'], [E, 'y'], [F, '']])} = 0\) in standard form by completing the square.`,
    correct: right.text,
    wrong: [
      { value: wrongs[0].text, why: R`\(x^{2} ${signed(-2 * h)}x\) completes to \(${sq(h)}\), and \(y^{2} ${signed(-2 * k)}y\) completes to \(${sq(k, 'y')}\).` },
      { value: wrongs[1].text, why: R`Dividing \(${cf(A)}${sq(h)}\) by \(${A * C}\) leaves \(${C}\) under the \(x\)-term, not \(${A}\).` },
      { value: wrongs[2].text, why: R`The sign between the two squared terms stays as it is in the original equation.` },
      wrongs[3].text,
    ],
    solution: [
      R`Group the terms, move the constant and factor out the coefficients of the squares: \(${cf(A)}(x^{2} ${signed(-2 * h)}x) ${sy > 0 ? '+' : '-'} ${cf(C)}(y^{2} ${signed(-2 * k)}y) = ${-F}\).`,
      R`Complete the squares inside the brackets with \(${h * h}\) and \(${k * k}\). Because of the factors outside, that adds \(${A * h * h}\) and ${sy > 0 ? 'adds' : 'subtracts'} \(${C * k * k}\) on the left, so do the same on the right: \(${cf(A)}${sq(h)} ${sy > 0 ? '+' : '-'} ${cf(C)}${sq(k, 'y')} = ${-F} + ${A * h * h} ${sy > 0 ? '+' : '-'} ${C * k * k} = ${sr * A * C}\).`,
      R`Divide both sides by \(${sr * A * C}\): ${right.text}.`,
    ],
    rule: 5,
    skill: 'completing the square',
    check: () => {
      const on = (o) => pts.every(([x, y]) => Math.abs(o.f(x, y)) < 1e-9);
      return pts.every(([x, y]) => Math.abs(general(x, y)) < 1e-6) && on(right) && wrongs.every((w) => !on(w)) ? true : 'the standard form does not describe the same curve';
    },
  });
}

function hardFromFeatures(rng) {
  const [h, k] = [rng.int(-4, 4), rng.int(-4, 4)];
  const alongX = rng.bool();
  const kind = rng.pick(['ellipse', 'hyperbola', 'parabola']);
  if (kind === 'parabola') {
    const p = rng.nonzero(-4, 4);
    const focus = alongX ? [h + p, k] : [h, k + p];
    const directrix = alongX ? R`x = ${h - p}` : R`y = ${k - p}`;
    const eq = (hh, kk, c, vert = !alongX) => M(parabolaEq(hh, kk, c, vert));
    return q({
      prompt: R`Write the equation of the parabola with focus \(${point(...focus)}\) and directrix \(${directrix}\).`,
      correct: eq(h, k, 4 * p),
      wrong: [
        { value: eq(focus[0], focus[1], 4 * p), why: R`The vertex is halfway between the focus and the directrix, at \(${point(h, k)}\). The focus is not the vertex.` },
        { value: eq(h, k, p), why: R`The multiplier is \(4p\), and here \(p = ${p}\).` },
        { value: eq(h, k, -4 * p), why: `The parabola opens away from the directrix, towards the focus.` },
        eq(h, k, 4 * p, alongX),
      ],
      solution: [
        R`The directrix is ${alongX ? 'vertical' : 'horizontal'}, so the parabola opens ${alongX ? 'sideways' : 'up or down'} and \(${alongX ? 'y' : 'x'}\) is the squared variable.`,
        R`The vertex is halfway between the focus and the directrix: \(${point(h, k)}\).`,
        R`\(p\) is the directed distance from the vertex to the focus: \(p = ${p}\), so \(4p = ${4 * p}\).`,
        R`Equation: \(${parabolaEq(h, k, 4 * p, !alongX)}\).`,
      ],
      rule: 6,
      skill: 'equation of a conic',
      check: () => (onParabola(h, k, 4 * p, !alongX).every(([x, y]) => Math.abs(dist([x, y], focus) - Math.abs(alongX ? x - (h - p) : y - (k - p))) < 1e-9) ? true : 'points of the curve are not equally far from the focus and the directrix'),
    });
  }
  if (kind === 'ellipse') {
    const [a, b, c] = rng.pick(ELLIPSES.slice(0, 6));
    const [vertices, foci] = [eitherSide(h, k, a, alongX), eitherSide(h, k, c, alongX)];
    const eq = (hh, kk, major2, minor2, onX = alongX) => M(onX ? ellipseEq(hh, kk, major2, minor2) : ellipseEq(hh, kk, minor2, major2));
    const pts = alongX ? onEllipse(h, k, a, b) : onEllipse(h, k, b, a);
    return q({
      prompt: R`Write the equation of the ellipse with vertices ${pairTex(vertices)} and foci ${pairTex(foci)}.`,
      correct: eq(h, k, a * a, b * b),
      wrong: [
        { value: eq(h, k, a * a, c * c), why: R`\(c = ${c}\) is the distance from the centre to a focus. The other denominator is \(b^{2} = a^{2} - c^{2} = ${b * b}\).` },
        { value: eq(h, k, a * a, b * b, !alongX), why: R`The vertices lie on a ${alongX ? 'horizontal' : 'vertical'} line, so \(a^{2}\) goes under the \(${alongX ? 'x' : 'y'}\)-term.` },
        { value: eq(h, k, a * a, a * a + c * c), why: R`For an ellipse \(b^{2} = a^{2} - c^{2}\), not \(a^{2} + c^{2}\).` },
        h === 0 && k === 0 ? null : eq(-h, -k, a * a, b * b),
      ],
      solution: [
        R`The centre is the midpoint of the vertices: \(${point(h, k)}\). The vertices lie on a ${alongX ? 'horizontal' : 'vertical'} line, so the major axis is ${alongX ? 'horizontal' : 'vertical'}.`,
        R`\(a\) is the distance from the centre to a vertex and \(c\) the distance to a focus: \(a = ${a}\), \(c = ${c}\).`,
        R`\(b^{2} = a^{2} - c^{2} = ${a * a} - ${c * c} = ${b * b}\).`,
        R`Equation: \(${alongX ? ellipseEq(h, k, a * a, b * b) : ellipseEq(h, k, b * b, a * a)}\).`,
      ],
      rule: 6,
      skill: 'equation of a conic',
      check: () => (pts.every((p) => Math.abs(dist(p, foci[0]) + dist(p, foci[1]) - 2 * a) < 1e-9) ? true : 'the distances to the two foci do not add up to 2a'),
    });
  }
  const [a, b, c] = rng.pick(HYPERBOLAS.slice(0, 6));
  const [vertices, foci] = [eitherSide(h, k, a, alongX), eitherSide(h, k, c, alongX)];
  const eq = (hh, kk, a2, b2, vert = !alongX) => M(hyperEq(hh, kk, vert ? b2 : a2, vert ? a2 : b2, vert));
  return q({
    prompt: R`Write the equation of the hyperbola with vertices ${pairTex(vertices)} and foci ${pairTex(foci)}.`,
    correct: eq(h, k, a * a, b * b),
    wrong: [
      { value: eq(h, k, a * a, c * c), why: R`\(c = ${c}\) is the distance from the centre to a focus. The other denominator is \(b^{2} = c^{2} - a^{2} = ${b * b}\).` },
      { value: eq(h, k, a * a, b * b, alongX), why: R`The vertices lie on a ${alongX ? 'horizontal' : 'vertical'} line, so the \(${alongX ? 'x' : 'y'}\)-term is the positive one.` },
      { value: M(alongX ? ellipseEq(h, k, a * a, b * b) : ellipseEq(h, k, b * b, a * a)), why: 'A hyperbola has a minus sign between the two squared terms. With a plus sign the curve is an ellipse.' },
      eq(h, k, b * b, a * a),
    ],
    solution: [
      R`The centre is the midpoint of the vertices: \(${point(h, k)}\). The vertices lie on a ${alongX ? 'horizontal' : 'vertical'} line, so the \(${alongX ? 'x' : 'y'}\)-term is positive.`,
      R`\(a\) is the distance from the centre to a vertex and \(c\) the distance to a focus: \(a = ${a}\), \(c = ${c}\).`,
      R`\(b^{2} = c^{2} - a^{2} = ${c * c} - ${a * a} = ${b * b}\).`,
      R`Equation: \(${hyp(h, k, a, b, !alongX)}\).`,
    ],
    rule: 6,
    skill: 'equation of a conic',
    check: () => (onHyperbola(h, k, a, b, !alongX).every((p) => Math.abs(Math.abs(dist(p, foci[0]) - dist(p, foci[1])) - 2 * a) < 1e-9) ? true : 'the distances to the two foci do not differ by 2a'),
  });
}

function hardApplication(rng) {
  if (rng.bool()) {
    // A dish of width w and depth d has its focus p = (w/2)²/(4d) from the vertex.
    const [p, d, w] = rng.pick([[45, 20, 120], [9, 4, 24], [25, 4, 40], [16, 9, 48], [25, 9, 60], [25, 16, 80], [18, 8, 48], [50, 8, 80], [12, 3, 24], [27, 3, 36], [20, 5, 40], [45, 5, 60], [36, 4, 48], [36, 9, 72], [49, 4, 56], [32, 8, 64]]);
    const half = w / 2;
    const thing = rng.pick(['satellite dish', 'solar cooker', 'radio telescope dish', 'searchlight reflector']);
    return q({
      prompt: `The cross-section of a ${thing} is a parabola. It is ${w} cm wide at the rim and ${d} cm deep. How far from the vertex (the deepest point) is the focus?`,
      correct: p,
      unit: 'cm',
      wrong: [
        { value: (half * half) / d, why: R`In \(x^{2} = 4py\) the \(4\) belongs with \(p\): \(${half * half} = 4p(${d})\).` },
        { value: (w * w) / (4 * d), why: R`Measure \(x\) from the axis of the parabola. The rim is ${half} cm from the axis, half of the full width.` },
        { value: d, why: 'That is the depth. The distance to the focus comes from the equation of the parabola.' },
        half,
        2 * p,
      ],
      solution: [
        R`Put the vertex at the origin with the parabola opening upward. Its equation is \(x^{2} = 4py\), and the focus is \(p\) units above the vertex.`,
        R`The rim is \(${half}\) cm from the axis and \(${d}\) cm above the vertex, so \((${half}, ${d})\) is on the parabola: \(${half}^{2} = 4p(${d})\).`,
        R`\(p = \dfrac{${num(half * half)}}{${4 * d}} = ${p}\). The focus is ${p} cm from the vertex.`,
      ],
      rule: 1,
      skill: 'conics in context',
      // The rim point must be as far from the focus (0, p) as from the directrix y = −p.
      check: () => checkEqual(dist([half, d], [0, p]), d + p),
    });
  }
  const [a, b, c] = rng.pick([[5, 4, 3], [5, 3, 4], [10, 8, 6], [10, 6, 8], [13, 12, 5], [13, 5, 12], [17, 15, 8], [25, 24, 7], [25, 20, 15], [15, 12, 9], [20, 16, 12], [26, 24, 10]]);
  const place = rng.pick(['The floor of a whispering gallery', 'The floor of a concert hall', 'An ornamental pond', 'A flower bed in a park']);
  return q({
    prompt: `${place} is an ellipse ${2 * a} m long and ${2 * b} m wide. Two markers are placed at the foci. How far apart are the markers?`,
    correct: 2 * c,
    unit: 'm',
    wrong: [
      { value: c, why: R`That is the distance from the centre to one focus. The two foci are \(2c\) apart.` },
      { value: 2 * (a - b), why: R`\(c^{2} = a^{2} - b^{2}\), which is not the same as \((a - b)^{2}\).` },
      2 * b,
      a + b,
      2 * a - c,
    ],
    solution: [
      R`The semi-axes are half the length and half the width: \(a = ${a}\) and \(b = ${b}\).`,
      R`\(c^{2} = a^{2} - b^{2} = ${a * a} - ${b * b} = ${c * c}\), so each focus is \(c = ${c}\) m from the centre.`,
      R`The foci are on opposite sides of the centre, so they are \(2c = ${2 * c}\) m apart.`,
    ],
    rule: 2,
    skill: 'conics in context',
    // The end of the minor axis is a point of the ellipse: its distances to the foci must add up to 2a.
    check: () => checkEqual(2 * dist([0, b], [c, 0]), 2 * a),
  });
}

// ───────────── Challenge ─────────────

function challengeMissingConstant(rng) {
  const h = rng.nonzero(-6, 6);
  const k = rng.nonzero(-6, 6);
  const r = rng.int(2, 9);
  const [D, E] = [-2 * h, -2 * k];
  const ans = h * h + k * k - r * r;
  return q({
    prompt: R`The circle \(x^{2} + y^{2} ${signed(D)}x ${signed(E)}y + c = 0\) has radius \(${r}\). Find the value of \(c\).`,
    correct: ans,
    fmt: (v) => R`\(c = ${num(v)}\)`,
    wrong: [
      { value: -r * r, why: R`Completing the squares adds \(${h * h}\) and \(${k * k}\) to the right-hand side, so \(r^{2} = ${h * h} + ${k * k} - c\).` },
      { value: r * r - h * h - k * k, why: R`\(r^{2} = ${h * h + k * k} - c\), so \(c = ${h * h + k * k} - r^{2}\). Check the sign.` },
      { value: h * h + k * k - r, why: R`The right-hand side of the standard form is \(r^{2} = ${r * r}\), not \(r\).` },
      4 * h * h + 4 * k * k - r * r,
      h * h + k * k + r * r,
    ],
    solution: [
      R`Complete the squares: \((x^{2} ${signed(D)}x + ${h * h}) + (y^{2} ${signed(E)}y + ${k * k}) = ${h * h} + ${k * k} - c\), that is \(${sq(h)} + ${sq(k, 'y')} = ${h * h + k * k} - c\).`,
      R`The right-hand side is \(r^{2}\), and the radius is \(${r}\): \(${h * h + k * k} - c = ${r * r}\).`,
      R`So \(c = ${h * h + k * k} - ${r * r} = ${ans}\).`,
    ],
    rule: 5,
    skill: 'completing the square',
    check: () => (onEllipse(h, k, r, r).every(([x, y]) => Math.abs(x * x + y * y + D * x + E * y + ans) < 1e-9) ? true : 'points r units from the centre do not satisfy the equation'),
  });
}

function challengeArch(rng) {
  // Half-width a and a distance d from the centre with √(a² − d²) = m a whole number.
  const [d, m, a] = rng.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [9, 12, 15], [12, 9, 15], [8, 15, 17], [12, 16, 20], [16, 12, 20], [7, 24, 25], [15, 20, 25]]);
  const j = rng.pick([0.4, 0.5, 0.6, 0.8, 1]);
  const H = round(a * j, 1);
  const ans = round(m * j, 1);
  const what = rng.pick(a <= 13 ? ['The opening of a road tunnel', 'The opening of a railway tunnel', 'The arch under a bridge'] : ['The arch under a bridge', 'The front of an aircraft hangar']);
  return q({
    prompt: `${what} is the top half of an ellipse. It is ${2 * a} m wide at its base and ${txt(H)} m high at the centre. How high is it ${d} m to the side of the centre line? Give your answer to the nearest tenth of a metre.`,
    correct: ans,
    fmt: dec(1, 'm'),
    wrong: apart(ans, [
      { value: H * (1 - d / a), why: 'That treats the arch as two straight lines. The arch is curved, so use the equation of the ellipse.' },
      { value: H * (1 - (d * d) / (a * a)), why: R`That would be the height of a parabolic arch of the same size. The ellipse gives \(\dfrac{y^{2}}{${num(round(H * H, 2))}} = 1 - \dfrac{x^{2}}{${a * a}}\), so a square root is needed.` },
      { value: (H * d) / a, why: R`Substitute \(x = ${d}\) into the equation and solve for \(y\). This uses \(\dfrac{x}{a}\) where \(\sqrt{1 - \dfrac{x^{2}}{a^{2}}}\) is needed.` },
      H - d / 2,
    ], { places: 1, positive: true }),
    solution: [
      R`Put the origin at the middle of the base. The semi-axes are \(${a}\) (half the width) and \(${txt(H)}\) (the height), so the arch is the top half of \(\dfrac{x^{2}}{${a * a}} + \dfrac{y^{2}}{${num(round(H * H, 2))}} = 1\).`,
      R`Substitute \(x = ${d}\): \(\dfrac{y^{2}}{${num(round(H * H, 2))}} = 1 - \dfrac{${d * d}}{${a * a}} = \dfrac{${m * m}}{${a * a}}\).`,
      R`Take the positive square root: \(y = ${txt(H)} \cdot \dfrac{${m}}{${a}} = ${num(ans, { fixed: 1 })}\) m.`,
    ],
    rule: 2,
    skill: 'conics in context',
    check: () => checkEqual((d * d) / (a * a) + (ans * ans) / (H * H), 1, 1e-9),
  });
}

function challengeFromGraph(rng) {
  const [h, k] = [rng.int(-3, 3), rng.int(-3, 3)];
  const [sx, sy] = rng.sample([2, 3, 4, 5, 6], 2);
  const ellipse = rng.bool();
  const vertical = rng.bool();
  const lab = (x, y) => `(${txt(x)}, ${txt(y)})`;
  const form = (hh, kk, A, B, type) => {
    const tex = type === 'ellipse' ? ellipseEq(hh, kk, A, B) : hyperEq(hh, kk, A, B, type === 'hyperY');
    const f = (x, y) => (type === 'ellipse' ? (x - hh) ** 2 / A + (y - kk) ** 2 / B : (type === 'hyperY' ? -1 : 1) * ((x - hh) ** 2 / A - (y - kk) ** 2 / B)) - 1;
    return { text: M(tex), f };
  };
  const type = ellipse ? 'ellipse' : vertical ? 'hyperY' : 'hyperX';
  const right = form(h, k, sx * sx, sy * sy, type);
  const wrongs = [form(h, k, sx, sy, type), form(h, k, sy * sy, sx * sx, type), h === 0 && k === 0 ? null : form(-h, -k, sx * sx, sy * sy, type), form(h, k, sx * sx, sy * sy, ellipse ? 'hyperX' : type === 'hyperX' ? 'hyperY' : 'hyperX'), form(h, k, 4 * sx * sx, 4 * sy * sy, type)].filter(Boolean);
  const w = (ellipse ? Math.max(sx, sy) : 2 * Math.max(sx, sy)) + 3;
  const base = { type: 'plot', x: [h - w, h + w], y: [k - w, k + w], square: true };
  const pts = ellipse ? onEllipse(h, k, sx, sy) : onHyperbola(h, k, vertical ? sy : sx, vertical ? sx : sy, vertical);
  let visual;
  let reading;
  if (ellipse) {
    visual = {
      ...base,
      param: [{ x: (t) => h + sx * Math.cos(t), y: (t) => k + sy * Math.sin(t), t: [0, 2 * Math.PI] }],
      points: [{ x: h, y: k, label: lab(h, k), color: 'b' }, { x: h + sx, y: k, label: lab(h + sx, k) }, { x: h, y: k + sy, label: lab(h, k + sy) }],
      alt: `An ellipse with centre ${lab(h, k)}. Its rightmost point is ${lab(h + sx, k)} and its highest point is ${lab(h, k + sy)}.`,
    };
    reading = [
      R`The centre is \(${point(h, k)}\). The rightmost point is \(${sx}\) units from the centre, so the number under the \(x\)-term is \(${sx}^{2} = ${sx * sx}\).`,
      R`The highest point is \(${sy}\) units from the centre, so the number under the \(y\)-term is \(${sy}^{2} = ${sy * sy}\).`,
    ];
  } else {
    const vertex = vertical ? [h, k + sy] : [h + sx, k];
    const branch = (s) => (vertical ? { x: (t) => h + sx * Math.sinh(t), y: (t) => k + s * sy * Math.cosh(t), t: [-2.2, 2.2] } : { x: (t) => h + s * sx * Math.cosh(t), y: (t) => k + sy * Math.sinh(t), t: [-2.2, 2.2] });
    const box = [[h - sx, k - sy], [h + sx, k - sy], [h + sx, k + sy], [h - sx, k + sy]];
    visual = {
      ...base,
      param: [branch(1), { ...branch(-1), color: 'a' }],
      fns: [1, -1].map((s) => ({ f: (x) => k + (s * sy * (x - h)) / sx, dashed: true, color: 'c' })),
      segments: box.map((p, i) => ({ from: p, to: box[(i + 1) % 4], dashed: true, color: 'd' })),
      points: [{ x: h, y: k, label: lab(h, k), color: 'b' }, { x: vertex[0], y: vertex[1], label: lab(...vertex) }, { x: h + sx, y: k + sy, label: lab(h + sx, k + sy), color: 'd' }],
      alt: `A hyperbola with centre ${lab(h, k)} that opens ${vertical ? 'up and down' : 'left and right'}. One vertex is ${lab(...vertex)}. Dashed asymptotes pass through the centre and through the corner ${lab(h + sx, k + sy)} of a dashed central box.`,
    };
    reading = [
      R`The centre is \(${point(h, k)}\), and the curve opens ${vertical ? 'up and down, so the \\(y\\)-term is the positive one' : 'left and right, so the \\(x\\)-term is the positive one'}.`,
      R`The corner \(${point(h + sx, k + sy)}\) of the central box is \(${sx}\) units across and \(${sy}\) units up from the centre, so the number under the \(x\)-term is \(${sx}^{2} = ${sx * sx}\) and the number under the \(y\)-term is \(${sy}^{2} = ${sy * sy}\).`,
    ];
  }
  return q({
    prompt: 'Which equation has this graph?',
    visual,
    key: `conic-graph-${type}-${h}-${k}-${sx}-${sy}`,
    correct: right.text,
    wrong: [
      { value: wrongs[0].text, why: R`The denominators are the squares of the distances from the centre: \(${sx}^{2} = ${sx * sx}\) and \(${sy}^{2} = ${sy * sy}\).` },
      { value: wrongs[1].text, why: R`The distance measured in the \(x\)-direction, \(${sx}\), gives the number under the \(x\)-term.` },
      ...wrongs.slice(2).map((o) => o.text),
    ],
    solution: [...reading, `So ${right.text}.`],
    rule: 6,
    skill: 'equation of a conic',
    check: () => {
      const on = (o) => pts.every(([x, y]) => Math.abs(o.f(x, y)) < 1e-9);
      return on(right) && wrongs.every((o) => !on(o)) ? true : 'the equation does not single out the curve that is drawn';
    },
  });
}

export default {
  id: 'conic-sections',
  title: 'Conic Sections',
  summary: 'Read the features of circles, parabolas, ellipses and hyperbolas from their equations, and write equations from features.',
  standards: ['CCSS G-GPE.A.1', 'CCSS G-GPE.A.2', 'CCSS G-GPE.A.3', 'AP Precalculus 4.6'],

  explain: {
    intro: R`Circles, parabolas, ellipses and hyperbolas are the curves made by slicing a cone with a plane, and each one is also the set of points that satisfy a distance rule. In standard form the equation shows the features directly: the centre or vertex comes from the brackets, and the lengths come from the denominators. An equation that is not in standard form can be put there by completing the square.`,
    rules: [
      {
        title: 'Circle',
        text: R`A circle is the set of points at distance \(r\) from a centre \((h, k)\). Its equation is \((x - h)^{2} + (y - k)^{2} = r^{2}\). The coordinates of the centre are subtracted inside the brackets, and the right-hand side is the radius squared.`,
        example: R`\((x - 3)^{2} + (y + 2)^{2} = 25\) has centre \((3, -2)\) and radius \(5\).`,
      },
      {
        title: 'Parabola',
        text: R`A parabola is the set of points equally far from a point (the focus) and a line (the directrix). With vertex \((h, k)\): \((x - h)^{2} = 4p(y - k)\) opens up if \(p > 0\) and down if \(p < 0\), with focus \((h, k + p)\) and directrix \(y = k - p\). \((y - k)^{2} = 4p(x - h)\) opens right if \(p > 0\) and left if \(p < 0\), with focus \((h + p, k)\) and directrix \(x = h - p\).`,
        example: R`\((x - 2)^{2} = 8(y - 3)\): vertex \((2, 3)\), \(4p = 8\) so \(p = 2\), opens up, focus \((2, 5)\), directrix \(y = 1\).`,
      },
      {
        title: 'Ellipse',
        text: R`An ellipse is the set of points whose distances to two foci add up to a constant, \(2a\). In \(\dfrac{(x - h)^{2}}{\square} + \dfrac{(y - k)^{2}}{\square} = 1\) the larger denominator is \(a^{2}\) and the smaller is \(b^{2}\). The major axis lies in the direction of the term that has \(a^{2}\) under it. From the centre \((h, k)\), the vertices are \(a\) units away along the major axis, the co-vertices are \(b\) units away along the minor axis, and the foci are \(c\) units away along the major axis, where \(c^{2} = a^{2} - b^{2}\). The eccentricity is \(e = \dfrac{c}{a}\), a number between 0 and 1.`,
        example: R`\(\dfrac{(x - 1)^{2}}{25} + \dfrac{(y + 2)^{2}}{9} = 1\): centre \((1, -2)\), \(a = 5\) (horizontal), \(b = 3\), \(c = 4\). Vertices \((-4, -2)\) and \((6, -2)\), foci \((-3, -2)\) and \((5, -2)\), \(e = \frac{4}{5}\).`,
      },
      {
        title: 'Hyperbola',
        text: R`A hyperbola is the set of points whose distances to two foci differ by a constant, \(2a\). In standard form one squared term is subtracted from the other, and the positive term tells which way the curve opens: \(\dfrac{(x - h)^{2}}{a^{2}} - \dfrac{(y - k)^{2}}{b^{2}} = 1\) opens left and right, \(\dfrac{(y - k)^{2}}{a^{2}} - \dfrac{(x - h)^{2}}{b^{2}} = 1\) opens up and down. The vertices are \(a\) units from the centre and the foci \(c\) units, where \(c^{2} = a^{2} + b^{2}\). The asymptotes pass through the centre with slopes \(\pm\) (square root of the number under the \(y\)-term) over (square root of the number under the \(x\)-term).`,
        example: R`\(\dfrac{y^{2}}{9} - \dfrac{x^{2}}{16} = 1\) opens up and down: vertices \((0, \pm 3)\), \(c = 5\), foci \((0, \pm 5)\), asymptotes \(y = \pm\frac{3}{4}x\).`,
      },
      {
        title: 'Identifying a conic from its equation',
        text: R`In \(Ax^{2} + Cy^{2} + Dx + Ey + F = 0\) (no \(xy\) term), look at the squared terms. Only one squared variable: a parabola. Equal coefficients \(A = C\): a circle. Different coefficients with the same sign: an ellipse. Coefficients with opposite signs: a hyperbola. (For special values of \(F\) the graph can shrink to a point, a pair of lines or nothing at all.)`,
        example: R`\(4x^{2} + 9y^{2} - 16x + 18y - 11 = 0\) is an ellipse; \(4x^{2} - 9y^{2} - 16x - 18y - 29 = 0\) is a hyperbola.`,
      },
      {
        title: 'Completing the square',
        text: R`To reach standard form, group the \(x\)-terms and the \(y\)-terms, move the constant to the right, and factor out the coefficient of each square. Inside each bracket add the square of half the coefficient of the linear term. Whatever that adds on the left (remember the factor outside the bracket) must be added on the right as well. Then divide so that the right-hand side is 1.`,
        example: R`\(4x^{2} + 9y^{2} - 16x + 18y - 11 = 0\) becomes \(4(x - 2)^{2} + 9(y + 1)^{2} = 11 + 16 + 9 = 36\), so \(\dfrac{(x - 2)^{2}}{9} + \dfrac{(y + 1)^{2}}{4} = 1\).`,
      },
      {
        title: 'Writing an equation from features',
        text: R`Find the centre first (the midpoint of the vertices or of the foci), then the distances \(a\) and \(c\) from the centre to a vertex and to a focus. For an ellipse \(b^{2} = a^{2} - c^{2}\); for a hyperbola \(b^{2} = c^{2} - a^{2}\). The line through the vertices tells which term gets \(a^{2}\). For a parabola the vertex is halfway between the focus and the directrix, and \(p\) is the directed distance from the vertex to the focus.`,
        example: R`Focus \((2, 5)\), directrix \(y = 1\): vertex \((2, 3)\), \(p = 2\), equation \((x - 2)^{2} = 8(y - 3)\).`,
      },
    ],
    vocab: [
      { term: 'focus (plural foci)', def: 'A fixed point used to define a conic. A parabola has one focus; an ellipse and a hyperbola have two.' },
      { term: 'directrix', def: 'The fixed line used, with the focus, to define a parabola.' },
      { term: 'vertex', def: 'A point where a conic meets its axis of symmetry: the turning point of a parabola, the ends of the major axis of an ellipse, the closest points of the two branches of a hyperbola.' },
      { term: 'major and minor axis', def: R`The longest and shortest diameters of an ellipse, of lengths \(2a\) and \(2b\).` },
      { term: 'co-vertices', def: 'The ends of the minor axis of an ellipse.' },
      { term: 'eccentricity', def: R`The ratio \(e = \dfrac{c}{a}\). For an ellipse it is between 0 (a circle) and 1 (very flat).` },
      { term: 'asymptotes', def: 'The two lines through the centre of a hyperbola that its branches approach.' },
    ],
    mistakes: [
      R`Reading the centre with the wrong signs. \((x + 2)^{2}\) means \(h = -2\).`,
      R`Using the denominators as lengths. The denominators are \(a^{2}\) and \(b^{2}\); the lengths are their square roots.`,
      R`Mixing up the two rules for \(c\). Ellipse: \(c^{2} = a^{2} - b^{2}\). Hyperbola: \(c^{2} = a^{2} + b^{2}\).`,
      R`Reading \(p\) straight off a parabola. The multiplier is \(4p\), so divide it by 4.`,
      'Completing the square inside a bracket and forgetting the factor outside it when adjusting the other side.',
    ],
    visual: {
      type: 'plot',
      x: [-7, 7],
      y: [-7, 7],
      square: true,
      step: [1, 1],
      param: [{ x: (t) => 5 * Math.cos(t), y: (t) => 3 * Math.sin(t), t: [0, 2 * Math.PI] }],
      segments: [{ from: [-4, 0], to: [3, 2.4], color: 'b' }, { from: [4, 0], to: [3, 2.4], color: 'c' }],
      points: [{ x: -4, y: 0, label: 'focus (−4, 0)', color: 'b' }, { x: 4, y: 0, label: 'focus (4, 0)', color: 'c' }, { x: 3, y: 2.4, label: 'P' }, { x: 5, y: 0, label: 'vertex (5, 0)', color: 'd' }, { x: 0, y: 3, label: 'co-vertex (0, 3)', color: 'd' }],
      alt: 'The ellipse x²/25 + y²/9 = 1, with vertex (5, 0), co-vertex (0, 3) and foci (−4, 0) and (4, 0). A point P = (3, 2.4) on the ellipse is joined to both foci: the two segments have lengths 7.4 and 2.6, which add up to 10, the length of the major axis.',
    },
  },

  examples: [
    {
      title: 'The features of an ellipse',
      problem: R`Find the centre, vertices, co-vertices, foci and eccentricity of \(\dfrac{(x - 1)^{2}}{25} + \dfrac{(y + 2)^{2}}{9} = 1\).`,
      steps: [
        R`Centre: \((1, -2)\).`,
        R`The larger denominator, 25, is under the \(x\)-term, so the major axis is horizontal with \(a = 5\), and \(b = 3\).`,
        R`Vertices: 5 units left and right of the centre, \((-4, -2)\) and \((6, -2)\). Co-vertices: 3 units below and above, \((1, -5)\) and \((1, 1)\).`,
        R`\(c^{2} = a^{2} - b^{2} = 25 - 9 = 16\), so \(c = 4\). Foci: \((-3, -2)\) and \((5, -2)\). Eccentricity: \(e = \dfrac{c}{a} = \dfrac{4}{5}\).`,
      ],
      answer: R`Centre \((1, -2)\); vertices \((-4, -2)\), \((6, -2)\); co-vertices \((1, -5)\), \((1, 1)\); foci \((-3, -2)\), \((5, -2)\); \(e = \frac{4}{5}\)`,
      visual: {
        type: 'plot',
        x: [-6, 8],
        y: [-9, 5],
        square: true,
        step: [1, 1],
        param: [{ x: (t) => 1 + 5 * Math.cos(t), y: (t) => -2 + 3 * Math.sin(t), t: [0, 2 * Math.PI] }],
        points: [{ x: 1, y: -2, label: 'centre', color: 'd' }, { x: -4, y: -2, label: '(−4, −2)' }, { x: 6, y: -2, label: '(6, −2)' }, { x: -3, y: -2, label: 'focus', color: 'b' }, { x: 5, y: -2, label: 'focus', color: 'b' }, { x: 1, y: 1, label: '(1, 1)', color: 'c' }, { x: 1, y: -5, label: '(1, −5)', color: 'c' }],
        alt: 'An ellipse centred at (1, −2), 10 units wide and 6 units tall. Its vertices are (−4, −2) and (6, −2), its co-vertices are (1, 1) and (1, −5), and its foci are at (−3, −2) and (5, −2) on the major axis.',
      },
    },
    {
      title: 'The features of a hyperbola',
      problem: R`Find the vertices, foci and asymptotes of \(\dfrac{y^{2}}{9} - \dfrac{x^{2}}{16} = 1\).`,
      steps: [
        R`The \(y\)-term is positive, so the hyperbola opens up and down. \(a^{2} = 9\) and \(b^{2} = 16\), so \(a = 3\) and \(b = 4\). The centre is the origin.`,
        R`Vertices: 3 units above and below the centre, \((0, 3)\) and \((0, -3)\).`,
        R`\(c^{2} = a^{2} + b^{2} = 25\), so \(c = 5\). Foci: \((0, 5)\) and \((0, -5)\).`,
        R`The central box reaches 4 units left and right and 3 units up and down, so the asymptotes have slopes \(\pm\dfrac{3}{4}\): \(y = \pm\dfrac{3}{4}x\).`,
      ],
      answer: R`Vertices \((0, \pm 3)\); foci \((0, \pm 5)\); asymptotes \(y = \pm\frac{3}{4}x\)`,
      visual: {
        type: 'plot',
        x: [-10, 10],
        y: [-10, 10],
        square: true,
        param: [{ x: (t) => 4 * Math.sinh(t), y: (t) => 3 * Math.cosh(t), t: [-2, 2] }, { x: (t) => 4 * Math.sinh(t), y: (t) => -3 * Math.cosh(t), t: [-2, 2], color: 'a' }],
        fns: [{ f: (x) => 0.75 * x, dashed: true, color: 'c' }, { f: (x) => -0.75 * x, dashed: true, color: 'c' }],
        points: [{ x: 0, y: 3, label: '(0, 3)' }, { x: 0, y: -3, label: '(0, −3)' }, { x: 0, y: 5, label: 'focus', color: 'b' }, { x: 0, y: -5, label: 'focus', color: 'b' }],
        alt: 'A hyperbola with two branches, one opening upward from the vertex (0, 3) and one opening downward from the vertex (0, −3). The foci are at (0, 5) and (0, −5). Two dashed asymptotes with slopes ¾ and −¾ cross at the origin, and the branches approach them.',
      },
    },
    {
      title: 'Completing the square',
      problem: R`Identify the conic \(4x^{2} + 9y^{2} - 16x + 18y - 11 = 0\) and write it in standard form.`,
      steps: [
        R`The coefficients of \(x^{2}\) and \(y^{2}\) are 4 and 9: different, with the same sign. The graph is an ellipse.`,
        R`Group, move the constant and factor: \(4(x^{2} - 4x) + 9(y^{2} + 2y) = 11\).`,
        R`Complete the squares with \(4\) and \(1\). The factors outside make that \(4 \cdot 4 = 16\) and \(9 \cdot 1 = 9\) on the left, so add the same on the right: \(4(x - 2)^{2} + 9(y + 1)^{2} = 11 + 16 + 9 = 36\).`,
        R`Divide by 36: \(\dfrac{(x - 2)^{2}}{9} + \dfrac{(y + 1)^{2}}{4} = 1\).`,
      ],
      answer: R`An ellipse: \(\dfrac{(x - 2)^{2}}{9} + \dfrac{(y + 1)^{2}}{4} = 1\), with centre \((2, -1)\), \(a = 3\) and \(b = 2\)`,
    },
    {
      title: 'A parabola from its focus and directrix',
      problem: R`Write the equation of the parabola with focus \((2, 5)\) and directrix \(y = 1\).`,
      steps: [
        R`The directrix is horizontal, so the parabola opens up or down and \(x\) is the squared variable.`,
        R`The vertex is halfway between the focus and the directrix: \((2, 3)\).`,
        R`The focus is 2 units above the vertex, so \(p = 2\) and \(4p = 8\).`,
        R`Equation: \((x - 2)^{2} = 8(y - 3)\). Check with the point \((6, 5)\): it is 4 units from the focus and 4 units from the directrix, and \((6 - 2)^{2} = 16 = 8(5 - 3)\).`,
      ],
      answer: R`\((x - 2)^{2} = 8(y - 3)\)`,
    },
    {
      title: 'Word problem: a satellite dish',
      word: true,
      problem: 'The cross-section of a satellite dish is a parabola. The dish is 120 cm wide at the rim and 20 cm deep. The receiver has to sit at the focus. How far from the bottom of the dish should it be?',
      steps: [
        R`Signals arriving parallel to the axis of a parabola all reflect through its focus, which is why the receiver goes there. Put the vertex at the origin with the dish opening upward: \(x^{2} = 4py\).`,
        R`The rim is 60 cm from the axis and 20 cm above the vertex, so the point \((60, 20)\) is on the parabola: \(60^{2} = 4p(20)\).`,
        R`\(3600 = 80p\), so \(p = 45\).`,
      ],
      answer: 'The receiver should be 45 cm above the bottom of the dish, on its axis.',
    },
  ],

  models: [
    {
      id: 'ellipse-hyperbola',
      title: 'Features of an ellipse or a hyperbola',
      intro: 'Choose the curve, its centre, and how far it reaches from the centre in the x-direction and in the y-direction (the square roots of the two denominators).',
      inputs: [
        { name: 'kind', label: 'Curve', type: 'select', value: 'ellipse', options: [{ value: 'ellipse', label: 'ellipse' }, { value: 'hyperX', label: 'hyperbola opening left and right' }, { value: 'hyperY', label: 'hyperbola opening up and down' }] },
        { name: 'h', label: 'Centre: x-coordinate', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'k', label: 'Centre: y-coordinate', type: 'int', min: -5, max: 5, value: -2 },
        { name: 'sx', label: 'Reach in the x-direction', type: 'int', min: 1, max: 8, value: 5 },
        { name: 'sy', label: 'Reach in the y-direction', type: 'int', min: 1, max: 8, value: 3 },
      ],
      compute({ kind, h, k, sx, sy }) {
        const w = (kind === 'ellipse' ? Math.max(sx, sy) : 2.2 * Math.max(sx, sy)) + 2;
        const base = { type: 'plot', x: [h - w, h + w], y: [k - w, k + w], square: true };
        const lab = (x, y) => `(${txt(x, { places: 2 })}, ${txt(y, { places: 2 })})`;
        if (kind === 'ellipse') {
          if (sx === sy) {
            return {
              problem: R`Describe the graph of \(${ellipseEq(h, k, sx * sx, sy * sy)}\).`,
              steps: [R`The two squared terms are divided by the same number, \(${sx * sx}\), so the equation is the same as \(${circleEq(h, k, sx * sx)}\).`, R`That is a circle with centre \(${point(h, k)}\) and radius \(${sx}\). A circle is an ellipse whose two foci coincide at the centre, so its eccentricity is 0.`],
              answer: R`A circle with centre \(${point(h, k)}\) and radius \(${sx}\).`,
              visual: { ...base, param: [{ x: (t) => h + sx * Math.cos(t), y: (t) => k + sx * Math.sin(t), t: [0, 2 * Math.PI] }], points: [{ x: h, y: k, label: 'centre', color: 'b' }], alt: `A circle with centre ${lab(h, k)} and radius ${sx}.` },
            };
          }
          const alongX = sx > sy;
          const [a, b] = alongX ? [sx, sy] : [sy, sx];
          const c2 = a * a - b * b;
          const c = Math.sqrt(c2);
          const [vertices, coVertices, foci] = [eitherSide(h, k, a, alongX), eitherSide(h, k, b, !alongX), eitherSide(h, k, c, alongX)];
          return {
            problem: R`Find the features of the ellipse \(${ellipseEq(h, k, sx * sx, sy * sy)}\).`,
            steps: [
              R`Centre: \(${point(h, k)}\). The larger denominator, \(${a * a}\), is under the \(${alongX ? 'x' : 'y'}\)-term, so the major axis is ${alongX ? 'horizontal' : 'vertical'}, with \(a = ${a}\) and \(b = ${b}\).`,
              R`Vertices, ${plural(a, 'unit')} from the centre along the major axis: ${pairTex(vertices)}. Co-vertices, ${plural(b, 'unit')} from the centre along the minor axis: ${pairTex(coVertices)}.`,
              R`\(c^{2} = a^{2} - b^{2} = ${a * a} - ${b * b} = ${c2}\), so \(c = ${sqrtTex(c2)}${Number.isInteger(c) ? '' : R` \approx ${num(c, { places: 2 })}`}\).`,
              R`Foci, \(c\) units from the centre along the major axis: ${Number.isInteger(c) ? pairTex(foci) : rootPair(h, k, c2, alongX)}. Eccentricity: \(e = \dfrac{c}{a} ${Number.isInteger(c) ? `= ${frac(c, a).tex()}` : R`\approx ${num(c / a, { places: 2 })}`}\).`,
            ],
            answer: R`Centre \(${point(h, k)}\); vertices ${pairTex(vertices)}; foci ${Number.isInteger(c) ? pairTex(foci) : rootPair(h, k, c2, alongX)}; eccentricity ${Number.isInteger(c) ? R`\(${frac(c, a).tex()}\)` : R`about \(${num(c / a, { places: 2 })}\)`}.`,
            visual: {
              ...base,
              param: [{ x: (t) => h + sx * Math.cos(t), y: (t) => k + sy * Math.sin(t), t: [0, 2 * Math.PI] }],
              points: [...vertices.map(([x, y]) => ({ x, y, label: lab(x, y) })), ...foci.map(([x, y]) => ({ x, y, label: 'focus', color: 'b' })), { x: h, y: k, color: 'd' }],
              alt: `An ellipse with centre ${lab(h, k)}, vertices ${lab(...vertices[0])} and ${lab(...vertices[1])}, and foci ${lab(...foci[0])} and ${lab(...foci[1])} on the major axis.`,
            },
          };
        }
        const vertical = kind === 'hyperY';
        const [a, b] = vertical ? [sy, sx] : [sx, sy];
        const c2 = a * a + b * b;
        const c = Math.sqrt(c2);
        const [vertices, foci] = [eitherSide(h, k, a, !vertical), eitherSide(h, k, c, !vertical)];
        const slope = frac(sy, sx);
        const slopeTex = slope.isInt() ? cf(slope.n) : slope.tex();
        const asym = R`${terms([[1, 'y'], [-k, '']])} = \pm ${slopeTex}${h === 0 ? 'x' : `(${terms([[1, 'x'], [-h, '']])})`}`;
        const branch = (s) => (vertical ? { x: (t) => h + sx * Math.sinh(t), y: (t) => k + s * sy * Math.cosh(t), t: [-2.4, 2.4] } : { x: (t) => h + s * sx * Math.cosh(t), y: (t) => k + sy * Math.sinh(t), t: [-2.4, 2.4] });
        return {
          problem: R`Find the features of the hyperbola \(${hyperEq(h, k, sx * sx, sy * sy, vertical)}\).`,
          steps: [
            R`Centre: \(${point(h, k)}\). The \(${vertical ? 'y' : 'x'}\)-term is positive, so the curve opens ${vertical ? 'up and down' : 'left and right'}, with \(a = ${a}\) and \(b = ${b}\).`,
            R`Vertices, ${plural(a, 'unit')} from the centre: ${pairTex(vertices)}.`,
            R`\(c^{2} = a^{2} + b^{2} = ${a * a} + ${b * b} = ${c2}\), so \(c = ${sqrtTex(c2)}${Number.isInteger(c) ? '' : R` \approx ${num(c, { places: 2 })}`}\). Foci: ${Number.isInteger(c) ? pairTex(foci) : rootPair(h, k, c2, !vertical)}.`,
            R`The central box reaches ${plural(sx, 'unit')} left and right of the centre and ${plural(sy, 'unit')} up and down, so the asymptotes have slopes \(${slopes(sy, sx)}\): \(${asym}\).`,
          ],
          answer: R`Centre \(${point(h, k)}\); vertices ${pairTex(vertices)}; foci ${Number.isInteger(c) ? pairTex(foci) : rootPair(h, k, c2, !vertical)}; asymptotes \(${asym}\).`,
          visual: {
            ...base,
            param: [branch(1), { ...branch(-1), color: 'a' }],
            fns: [1, -1].map((s) => ({ f: (x) => k + (s * sy * (x - h)) / sx, dashed: true, color: 'c' })),
            points: [...vertices.map(([x, y]) => ({ x, y, label: lab(x, y) })), ...foci.map(([x, y]) => ({ x, y, label: 'focus', color: 'b' }))],
            alt: `A hyperbola with centre ${lab(h, k)} that opens ${vertical ? 'up and down' : 'left and right'}, with vertices ${lab(...vertices[0])} and ${lab(...vertices[1])}, foci ${lab(...foci[0])} and ${lab(...foci[1])}, and two dashed asymptotes through the centre.`,
          },
        };
      },
    },
    {
      id: 'circle-general',
      title: 'Completing the square for a circle',
      intro: 'Type the coefficients D, E and F in x² + y² + Dx + Ey + F = 0.',
      inputs: [
        { name: 'D', label: 'D (coefficient of x)', type: 'int', min: -12, max: 12, value: -6 },
        { name: 'E', label: 'E (coefficient of y)', type: 'int', min: -12, max: 12, value: 4 },
        { name: 'F', label: 'F (constant)', type: 'int', min: -60, max: 60, value: -12 },
      ],
      compute({ D, E, F }) {
        const n = D * D + E * E - 4 * F; // r² = n/4
        if (n <= 0) return { error: `Completing the squares gives a right-hand side of ${txt(n / 4)}, which is not positive, so no circle satisfies the equation. Make F smaller.` };
        const [h, k, r2] = [frac(-D, 2), frac(-E, 2), frac(n, 4)];
        const { coef, rad } = simplifySqrt(n);
        const rTex = rad === 1 ? frac(coef, 2).tex() : coef % 2 === 0 ? `${cf(coef / 2)}\\sqrt{${rad}}` : R`\dfrac{${cf(coef)}\sqrt{${rad}}}{2}`;
        const r = Math.sqrt(n) / 2;
        const w = Math.max(Math.abs(h.value), Math.abs(k.value)) + r + 1.5;
        const group = (v, coef) => (coef === 0 ? `${v}^{2}` : `(${terms([[1, `${v}^{2}`], [coef, v]])})`);
        const adds = [D, E].filter((coef) => coef !== 0).map((coef) => frac(coef * coef, 4));
        const rootTex = R`\sqrt{${r2.tex()}}`;
        const radius = `${rTex === rootTex ? rootTex : `${rootTex} = ${rTex}`}${rad === 1 ? '' : R` \approx ${num(r, { places: 2 })}`}`;
        return {
          problem: R`Find the centre and the radius of \(${terms([[1, 'x^{2}'], [1, 'y^{2}'], [D, 'x'], [E, 'y'], [F, '']])} = 0\).`,
          steps: [
            R`Group the \(x\)-terms and the \(y\)-terms and move the constant: \(${group('x', D)} + ${group('y', E)} = ${-F}\).`,
            ...(adds.length
              ? [
                R`To complete ${adds.length === 2 ? 'each square' : 'the square'}, add the square of half the coefficient of the linear term to both sides: \(${adds.map((v) => v.tex()).join(R`\) and \(`)}\).`,
                R`\(${sq(h)} + ${sq(k, 'y')} = ${-F}${adds.map((v) => ` + ${v.tex()}`).join('')} = ${r2.tex()}\).`,
              ]
              : ['There are no linear terms, so the equation is already in standard form.']),
            R`Compare with \((x - h)^{2} + (y - k)^{2} = r^{2}\): the centre is \(\left(${h.tex()}, ${k.tex()}\right)\) and the radius is \(${radius}\).`,
          ],
          answer: R`Centre \(\left(${h.tex()}, ${k.tex()}\right)\), radius \(${rTex}\)`,
          visual: {
            type: 'plot',
            x: [-w, w],
            y: [-w, w],
            square: true,
            param: [{ x: (t) => h.value + r * Math.cos(t), y: (t) => k.value + r * Math.sin(t), t: [0, 2 * Math.PI] }],
            points: [{ x: h.value, y: k.value, label: `centre (${h.text()}, ${k.text()})`, color: 'b' }],
            alt: `A circle with centre (${h.text()}, ${k.text()}) and radius ${txt(r, { places: 2 })}.`,
          },
        };
      },
    },
    {
      id: 'dish',
      title: 'Word problem: the focus of a parabolic dish',
      word: true,
      intro: 'A dish with a parabolic cross-section sends every incoming ray to its focus. Choose how wide and how deep the dish is.',
      inputs: [
        { name: 'width', label: 'Width at the rim (cm)', type: 'int', min: 20, max: 400, value: 120 },
        { name: 'depth', label: 'Depth (cm)', type: 'int', min: 2, max: 150, value: 20 },
      ],
      compute({ width, depth }) {
        const half = width / 2;
        const p = (half * half) / (4 * depth);
        const places = p < 10 ? 2 : 1;
        const top = Math.max(depth, p) * 1.25;
        return {
          problem: `The cross-section of a dish is a parabola. The dish is ${width} cm wide at the rim and ${depth} cm deep. How far from the vertex is the focus?`,
          steps: [
            R`Put the vertex at the origin with the dish opening upward. Its equation is \(x^{2} = 4py\), and the focus is at \((0, p)\).`,
            R`The rim is \(${num(half)}\) cm from the axis and \(${depth}\) cm above the vertex, so \((${num(half)}, ${depth})\) is on the parabola: \(${num(half)}^{2} = 4p(${depth})\).`,
            R`\(p = \dfrac{${num(half * half)}}{${4 * depth}} ${Number.isInteger(p) ? '=' : R`\approx`} ${num(p, { places })}\).`,
            p > depth ? `The focus is above the rim, outside the bowl of the dish, because the dish is shallow.` : `The focus is ${p === depth ? 'level with the rim' : 'inside the bowl of the dish, below the rim'}.`,
          ],
          answer: `The focus is ${Number.isInteger(p) ? '' : 'about '}${txt(p, { places })} cm from the vertex, on the axis of the dish.`,
          visual: {
            type: 'plot',
            x: [-half * 1.25, half * 1.25],
            y: [-top * 0.12, top],
            fns: [{ f: (x) => (x * x) / (4 * p), domain: [-half, half] }],
            points: [{ x: 0, y: p, label: `focus (0, ${txt(p, { places })})`, color: 'b' }, { x: half, y: depth, label: `rim (${txt(half)}, ${depth})` }, { x: -half, y: depth }],
            axisLabels: ['x (cm)', 'y (cm)'],
            alt: `The parabolic cross-section of the dish, from the rim point (${txt(-half)}, ${depth}) down to the vertex at the origin and up to the rim point (${txt(half)}, ${depth}). The focus is marked on the axis, ${txt(p, { places })} cm above the vertex.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyCircle, easyIdentifyStandard, easyParabolaOpens, easyEllipseAxes],
    medium: [mediumEllipseFoci, mediumHyperbola, mediumParabolaFocus, mediumIdentifyGeneral],
    hard: [hardCompleteSquare, hardFromFeatures, hardApplication],
    challenge: [challengeMissingConstant, challengeArch, challengeFromGraph],
  },
};
