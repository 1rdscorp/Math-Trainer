import { R, q, frac, Frac, num, txt, money, terms, linear, paren, point, person, rootsTex, round, checkEqual, checkAll } from '../../lib/index.js';
import { val, show, pointText } from './_shared.js';

// ───────────── Helpers ─────────────

// a|x - h| + k as LaTeX.
const absTex = (a, h, k) => terms([[a, `|${linear(1, -h)}|`], [k, '']]);
const absF = (a, h, k) => (x) => val(a) * Math.abs(x - h) + k;
const eqn = (tex) => R`\(y = ${tex}\)`;
const pt = (x, y) => R`\(${point(x, y)}\)`;
const LE = '\\le';
const GE = '\\ge';
// A piece of a piecewise-linear function: y = m x + b on an interval from lo to hi (either may be infinite).
const piece = (m, b, lo, hi, loIn, hiIn) => ({ m, b, lo, hi, loIn, hiIn, f: (x) => m * x + b });
const inPiece = (p, x) => (p.lo === -Infinity || (p.loIn ? x >= p.lo : x > p.lo)) && (p.hi === Infinity || (p.hiIn ? x <= p.hi : x < p.hi));
const condTex = (p, v = 'x') => {
  if (p.lo === -Infinity) return `${v} ${p.hiIn ? LE : '<'} ${num(p.hi)}`;
  if (p.hi === Infinity) return `${v} ${p.loIn ? GE : '>'} ${num(p.lo)}`;
  return `${num(p.lo)} ${p.loIn ? LE : '<'} ${v} ${p.hiIn ? LE : '<'} ${num(p.hi)}`;
};
/** \begin{cases} … \end{cases} from rows [expression, condition]. */
const cases = (rows) => `\\begin{cases} ${rows.map(([e, c]) => `${e} & \\text{if } ${c}`).join(' \\\\ ')} \\end{cases}`;
const piecesTex = (ps, v = 'x') => cases(ps.map((p) => [linear(p.m, p.b, v), condTex(p, v)]));
const evalPieces = (ps, x) => { const p = ps.find((pp) => inPiece(pp, x)); return p ? p.f(x) : NaN; };
// Plot data for pieces: one curve per piece, and a dot (open or closed) at every finite endpoint.
function piecePlot(ps, color = 'a') {
  const fns = ps.map((p) => ({ f: p.f, domain: [p.lo, p.hi], color }));
  const points = [];
  for (const p of ps) {
    if (p.lo !== -Infinity) points.push({ x: p.lo, y: p.f(p.lo), open: !p.loIn, color });
    if (p.hi !== Infinity) points.push({ x: p.hi, y: p.f(p.hi), open: !p.hiIn, color });
  }
  points.sort((u, v) => (u.open === v.open ? 0 : u.open ? -1 : 1)); // closed dots drawn last, on top
  return { fns, points };
}
const dotWord = (open) => (open ? 'an open circle' : 'a closed dot');
const units = (n) => `${Math.abs(n)} ${Math.abs(n) === 1 ? 'unit' : 'units'}`;

// ───────────── Easy ─────────────

function easyAbsEval(rng) {
  const a = rng.pick([1, 1, 2, 3, -1, -2]);
  const h = rng.nonzero(-6, 6);
  const k = rng.int(-9, 9);
  const x = rng.bool(0.7) ? h - rng.int(1, 6) : h + rng.int(1, 6); // usually left of the vertex, where the bars matter
  const f = absF(a, h, k);
  const inside = x - h;
  const fx = (t) => (k === 0 ? `f(x) = ${terms([[a, `|${linear(1, -h)}|`]])}` : `f(x) = ${absTex(a, h, k)}`);
  return q({
    prompt: R`If \(${fx()}\), what is \(f(${x})\)?`,
    correct: f(x),
    wrong: [
      inside < 0 ? { value: a * inside + k, why: R`\(|${inside}| = ${-inside}\): the absolute value of a number is never negative.` } : null,
      { value: a * Math.abs(x + h) + k, why: R`Substitute \(x = ${x}\) into \(${linear(1, -h)}\): \(${x} ${h > 0 ? '-' : '+'} ${Math.abs(h)} = ${inside}\).` },
      a * Math.abs(inside) - k,
    ],
    solution: [
      R`Substitute \(x = ${x}\): \(f(${x}) = ${terms([[a, `|${x} ${h > 0 ? '-' : '+'} ${Math.abs(h)}|`], [k, '']])}\).`,
      R`Inside the bars: \(${x} ${h > 0 ? '-' : '+'} ${Math.abs(h)} = ${inside}\), and \(|${inside}| = ${Math.abs(inside)}\).`,
      R`\(f(${x}) = ${terms([[a, a === 1 || a === -1 ? `${Math.abs(inside)}` : `(${Math.abs(inside)})`], [k, '']])}${a === 1 && k === 0 ? '' : ` = ${f(x)}`}\).`,
    ],
    rule: 0, skill: 'evaluating absolute value',
    check: () => checkEqual(x >= h ? a * (x - h) + k : a * (h - x) + k, f(x)),
  });
}

function easyVertex(rng) {
  const a = rng.pick([1, 1, -1, 2, -2, 3, frac(1, 2), frac(-1, 2)]);
  const h = rng.nonzero(-8, 8);
  const k = rng.intExcept(-8, 8, [0, h, -h]);
  const up = val(a) > 0;
  const f = absF(a, h, k);
  const askExt = rng.bool(0.4);
  const ext = up ? 'minimum' : 'maximum';
  const bracket = R`\(${linear(1, -h)}\) is zero when \(x = ${h}\)${h < 0 ? R`, because \(x + ${-h} = x - (${h})\)` : ''}.`;
  return q({
    prompt: askExt ? R`What is the ${ext} value of \(f(x) = ${absTex(a, h, k)}\)?` : R`What is the vertex of the graph of \(y = ${absTex(a, h, k)}\)?`,
    correct: askExt ? k : pt(h, k),
    wrong: askExt
      ? [{ value: h, why: R`\(${h}\) is the \(x\)-value where the ${ext} happens. The ${ext} value is the \(y\)-coordinate of the vertex.` }, { value: -k, why: R`The number added at the end, \(${k}\), is the height of the vertex.` }, -h]
      : [{ value: pt(-h, k), why: R`The vertex is where the inside of the bars is zero: ${bracket}` }, { value: pt(k, h), why: R`The number inside the bars goes with \(x\); the number added at the end is the \(y\)-coordinate.` }, pt(h, -k), pt(-h, -k)],
    solution: [
      R`Compare with \(y = a|x - h| + k\), whose vertex is \((h, k)\). ${bracket}`,
      R`The number added at the end is \(k = ${k}\), so the vertex is \(${point(h, k)}\).`,
      ...(askExt ? [R`\(a = ${num(a)}\) is ${up ? 'positive, so the V opens upward and the vertex is the lowest point' : 'negative, so the V opens downward and the vertex is the highest point'}. The ${ext} value is \(${k}\).`] : []),
    ],
    rule: 1, skill: 'vertex of an absolute value graph',
    check: () => checkAll(checkEqual(f(h), k), checkEqual(f(h - 1.5), f(h + 1.5)), (f(h + 1) > k) === up || 'opens the wrong way'),
  });
}

function easyPiecewiseEval(rng) {
  const c = rng.int(-3, 4);
  const leftIn = rng.bool();
  const [m1, m2] = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
  const [b1, b2] = [rng.int(-6, 6), rng.int(-6, 6)];
  const ps = [piece(m1, b1, -Infinity, c, false, leftIn), piece(m2, b2, c, Infinity, !leftIn, false)];
  const where = rng.pick(['left', 'right', 'edge']);
  const x = where === 'edge' ? c : where === 'left' ? c - rng.int(1, 5) : c + rng.int(1, 5);
  const use = inPiece(ps[0], x) ? 0 : 1;
  if (ps[0].f(x) === ps[1].f(x) || (m1 === m2 && b1 === b2)) return easyPiecewiseEval(rng);
  const [p, other] = [ps[use], ps[1 - use]];
  const right = p.f(x);
  const sub = (pp) => terms([[pp.m, `(${x})`], [pp.b, '']]);
  return q({
    prompt: R`Find \(f(${x})\) for the function \[f(x) = ${piecesTex(ps)}\]`,
    correct: right,
    wrong: [
      { value: other.f(x), why: x === c ? R`At \(x = ${c}\) exactly, the condition \(${condTex(p)}\) is true, so use the ${use ? 'second' : 'first'} piece. The \(${condTex(other)}\) piece leaves \(${c}\) out.` : R`\(${x}\) satisfies \(${condTex(p)}\), so use the piece \(${linear(p.m, p.b)}\).` },
      p.m * -x + p.b,
      right + 1,
      right - 1,
    ],
    solution: [
      R`Find the piece whose condition \(x = ${x}\) satisfies: ${x === c ? R`\(${x}\) is exactly the boundary, and \(${condTex(p).replace('x', num(x))}\) is true` : R`\(${condTex(p).replace('x', num(x))}\) is true`}.`,
      R`Use that piece: \(f(${x}) = ${sub(p)} = ${right}\).`,
    ],
    rule: 2, skill: 'evaluating piecewise functions',
    check: () => {
      const firstApplies = leftIn ? x <= c : x < c;
      return checkEqual((firstApplies ? m1 * x + b1 : m2 * x + b2), right);
    },
  });
}

function easyParking(rng) {
  const rate = rng.pick([2, 3, 4, 5, 6]);
  const hours = rng.int(0, 5);
  const mins = rng.bool(0.2) && hours > 0 ? 0 : rng.pick([5, 10, 15, 20, 30, 40, 45, 50]);
  const total = 60 * hours + mins;
  const started = Math.ceil(total / 60);
  const right = rate * started;
  const stay = [hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : '', mins ? `${mins} minutes` : ''].filter(Boolean).join(' and ');
  const name = person(rng);
  return q({
    prompt: `A car park charges ${money(rate)} for each hour or part of an hour. ${name} parks for ${stay}. How much does ${name} pay?`,
    correct: right,
    fmt: (v) => money(v),
    wrong: [
      mins ? { value: rate * hours, why: 'A part of an hour is charged as a whole hour, so round the time up, not down.' } : { value: rate * (hours + 1), why: `Exactly ${hours} hours is ${hours} whole hours; a new hour has not started yet.` },
      mins ? { value: round((rate * total) / 60, 2), why: 'The charge does not grow minute by minute. It jumps by a whole hour’s fee as each new hour starts.' } : null,
      rate * (started + 1),
      rate * (started + 2),
    ],
    solution: [
      `The fee is a step function of time: it stays the same within an hour and jumps when a new hour starts.`,
      !mins ? `${stay} is exactly ${hours} whole ${hours === 1 ? 'hour' : 'hours'}, so ${hours} ${hours === 1 ? 'hour is' : 'hours are'} charged.` : hours ? `${stay} is more than ${hours} ${hours === 1 ? 'hour' : 'hours'}, so ${started} ${started === 1 ? 'hour has' : 'hours have'} been started.` : `${stay} is part of the first hour, which is charged in full.`,
      R`Cost: \(${started} \times ${rate} = ${right}\), so ${name} pays ${money(right)}.`,
    ],
    rule: 4, skill: 'step functions',
    check: () => { let n = 0; for (let t = 0; t < total; t += 60) n++; return checkEqual(rate * n, right); },
  });
}

// ───────────── Medium ─────────────

function mediumAbsGraph(rng) {
  const a = frac(...rng.pick([[1, 1], [-1, 1], [2, 1], [-2, 1], [1, 2], [-1, 2], [3, 1]]));
  const up = a.value > 0;
  const h = rng.nonzero(-4, 4);
  const k = rng.intExcept(up ? -6 : 0, up ? 0 : 6, [h]);
  let dx = (a.d === 2 ? 2 : Math.abs(a.value) === 1 ? rng.int(1, 3) : 1) * rng.sign();
  if (Math.abs(h + dx) > 7) dx = -dx;
  const [x1, y1] = [h + dx, k + a.value * Math.abs(dx)];
  const f = absF(a, h, k);
  const vf = (aa, hh, kk) => eqn(absTex(aa, hh, kk));
  const one = up ? 1 : -1;
  return q({
    prompt: 'Which equation matches the graph?',
    visual: {
      type: 'plot', x: [-8, 8], y: [-8, 8], step: [1, 1], square: true, fns: [{ f }], points: [{ x: h, y: k }, { x: x1, y: y1, color: 'b' }],
      alt: `Graph of a V shape that opens ${up ? 'upward' : 'downward'} with its vertex at ${pointText(h, k)}. Another marked point on the graph is ${pointText(x1, y1)}.`,
    },
    correct: vf(a, h, k),
    wrong: [
      { value: vf(a, -h, k), why: R`The vertex is at \(x = ${h}\), which makes \(${linear(1, -h)}\) zero. So the bars hold \(${linear(1, -h)}\).` },
      { value: vf(a.value !== one ? one : 2 * one, h, k), why: R`From the vertex, moving ${units(dx)} sideways changes \(y\) by \(${y1 - k}\), so the arms have slope \(\pm ${a.abs().tex()}\) and \(a = ${a.tex()}\).` },
      vf(a.neg(), h, k),
      vf(a, h, -k),
    ],
    solution: [
      R`The vertex is \(${point(h, k)}\), so the equation is \(y = a|${linear(1, -h)}|${k === 0 ? '' : ` ${k < 0 ? '-' : '+'} ${Math.abs(k)}`}\).`,
      R`Use the other point \(${point(x1, y1)}\): it is ${units(dx)} from the vertex sideways and ${units(y1 - k)} ${y1 > k ? 'up' : 'down'}, so \(a = \dfrac{${y1 - k}}{${Math.abs(dx)}} = ${a.tex()}\).`,
      R`The equation is \(y = ${absTex(a, h, k)}\).`,
    ],
    rule: 1, skill: 'equation from a graph',
    check: () => checkAll(checkEqual(f(h), k), checkEqual(f(x1), y1), checkEqual(f(h - 2), f(h + 2))),
  });
}

// Two pieces with a jump at x = c; integer points to read.
function jumpPieces(rng) {
  const c = rng.int(-2, 2);
  const leftIn = rng.bool();
  const m1 = rng.pick([-2, -1, 1, 2, 0]);
  const m2 = rng.pick([-2, -1, 1, 2, 0]);
  const L = rng.int(-4, 5);
  const Rv = rng.intExcept(-4, 5, [L]);
  const ps = [piece(m1, L - m1 * c, -Infinity, c, false, leftIn), piece(m2, Rv - m2 * c, c, Infinity, !leftIn, false)];
  const ok = [-3, 3].every((d) => Math.abs(ps[d < 0 ? 0 : 1].f(c + d)) <= 7);
  return ok ? { c, leftIn, ps, L, Rv } : jumpPieces(rng);
}
const jumpAlt = ({ c, leftIn, ps, L, Rv }) => {
  const [xa, xb] = [c - 2, c + 2];
  return `Graph of a function in two pieces. For x left of ${show(c)} it is a straight line through ${pointText(xa, ps[0].f(xa))} ending at ${dotWord(!leftIn)} at ${pointText(c, L)}. To the right it is a straight line starting at ${dotWord(leftIn)} at ${pointText(c, Rv)} and passing through ${pointText(xb, ps[1].f(xb))}.`;
};
const jumpVisual = (J) => ({ type: 'plot', x: [-6, 6], y: [-8, 8], step: [1, 1], ...piecePlot(J.ps), alt: jumpAlt(J) });

function mediumPiecewiseGraph(rng) {
  const J = jumpPieces(rng);
  const { c, leftIn, ps, L, Rv } = J;
  const atEdge = rng.bool(0.6);
  const x = atEdge ? c : rng.pick([c - 2, c + 2]);
  const right = evalPieces(ps, x);
  const [shut, hole] = leftIn ? [L, Rv] : [Rv, L];
  return q({
    prompt: R`The graph shows a function \(f\). What is \(f(${x})\)?`,
    visual: jumpVisual(J),
    correct: right,
    wrong: atEdge
      ? [{ value: hole, why: R`An open circle means that point is not on the graph. At \(x = ${c}\) the closed dot, at height \(${shut}\), gives the value.` }, { value: (L + Rv) / 2, why: 'The function takes one of the two heights at the jump, the one with the closed dot.' }, -right, right + 1]
      : [{ value: x < c ? Rv : L, why: R`Read the graph above \(x = ${x}\). The height at the jump belongs only to \(x = ${c}\).` }, -right, right + 1, right - 1],
    solution: atEdge
      ? [
          R`At \(x = ${c}\) there are two circles: an open one at height \(${hole}\) and a closed one at height \(${shut}\).`,
          R`An open circle is left out of the graph; a closed dot is included. So \(f(${c}) = ${shut}\).`,
        ]
      : [R`Go to \(x = ${x}\) on the ${x < c ? 'left' : 'right'} piece and read the height: the point \(${point(x, right)}\) is on the graph.`, R`So \(f(${x}) = ${right}\).`],
    rule: 3, skill: 'open and closed endpoints',
    check: () => checkEqual(right, x === c ? (leftIn ? ps[0].f(c) : ps[1].f(c)) : x < c ? ps[0].f(x) : ps[1].f(x)),
  });
}

function mediumRange(rng) {
  if (rng.bool(0.45)) {
    const a = rng.pick([1, 2, 3, -1, -2, frac(1, 2), frac(-3, 2)]);
    const h = rng.nonzero(-6, 6);
    const k = rng.intExcept(-9, 9, [h, -h]);
    const up = val(a) > 0;
    const f = absF(a, h, k);
    const ry = (op, v) => R`\(y ${op} ${v}\)`;
    return q({
      prompt: R`What is the range of \(y = ${absTex(a, h, k)}\)?`,
      correct: ry(up ? GE : LE, k),
      wrong: [
        { value: ry(up ? LE : GE, k), why: R`\(a = ${num(a)}\) is ${up ? 'positive, so the V opens upward and every \\(y\\)-value is at or above the vertex' : 'negative, so the V opens downward and every \\(y\\)-value is at or below the vertex'}.` },
        { value: ry(up ? GE : LE, h), why: R`\(${h}\) is the \(x\)-coordinate of the vertex. The range is about \(y\)-values, so use the height of the vertex, \(${k}\).` },
        { value: R`all real numbers`, why: R`The graph never goes ${up ? 'below' : 'above'} its vertex, so some \(y\)-values are never reached.` },
        ry(up ? '>' : '<', k),
      ],
      solution: [
        R`The vertex is \(${point(h, k)}\), and \(a = ${num(a)}\) is ${up ? 'positive, so the V opens upward' : 'negative, so the V opens downward'}.`,
        R`The vertex is the ${up ? 'lowest' : 'highest'} point and it is on the graph, so the range is \(y ${up ? GE : LE} ${k}\).`,
      ],
      rule: 1, skill: 'domain and range',
      check: () => { for (let x = h - 10; x <= h + 10; x += 0.25) if (up ? f(x) < k - 1e-9 : f(x) > k + 1e-9) return 'a y-value outside the range'; return checkEqual(f(h), k); },
    });
  }
  const m = rng.nonzero(-3, 3);
  const b = rng.int(-5, 5);
  const lo = rng.int(-4, 2);
  const hi = lo + rng.int(2, 5);
  const p = piece(m, b, lo, hi, true, false);
  const [yLo, yHi] = [p.f(lo), p.f(hi)];
  const iv = (u, uIn, v, vIn, s = 'y') => R`\(${u} ${uIn ? LE : '<'} ${s} ${vIn ? LE : '<'} ${v}\)`;
  const right = m > 0 ? iv(yLo, true, yHi, false) : iv(yHi, false, yLo, true);
  return q({
    prompt: R`One piece of a piecewise function is \(f(x) = ${linear(m, b)}\) for \(${condTex(p)}\). What is the range of this piece?`,
    correct: right,
    wrong: [
      { value: m > 0 ? iv(yLo, false, yHi, true) : iv(yHi, true, yLo, false), why: R`\(x = ${lo}\) is included, so \(y = ${yLo}\) is reached; \(x = ${hi}\) is left out, so \(y = ${yHi}\) is not.` },
      { value: iv(lo, true, hi, false), why: R`That is the domain of the piece, the \(x\)-values. The range is the \(y\)-values: substitute the endpoints.` },
      { value: m > 0 ? iv(yLo, true, yHi, true) : iv(yHi, true, yLo, true), why: R`The condition \(x < ${hi}\) leaves out \(x = ${hi}\), so \(y = ${yHi}\) is not reached: that end gets an open circle.` },
      m < 0 ? iv(yLo, true, yHi, false) : null,
      m > 0 ? iv(yLo, false, yHi, false) : iv(yHi, false, yLo, false),
    ],
    solution: [
      R`Substitute the endpoints: \(f(${lo}) = ${yLo}\) (included, closed dot) and \(f(${hi}) = ${yHi}\) (left out, open circle).`,
      R`The piece is a straight line, so it takes every \(y\)-value between these, ${m > 0 ? 'rising' : 'falling'} from \(${yLo}\) toward \(${yHi}\).`,
      R`Range: ${right}.`,
    ],
    rule: 3, skill: 'domain and range',
    check: () => {
      const ys = []; for (let x = lo; x < hi; x += 0.01) ys.push(p.f(x));
      const [mn, mx] = [Math.min(...ys), Math.max(...ys)];
      return checkAll(checkEqual(m > 0 ? mn : mx, yLo), Math.abs((m > 0 ? mx : mn) - yHi) < 0.05 || 'open end wrong');
    },
  });
}

function mediumStep(rng) {
  if (rng.bool(0.45)) {
    const x = round(rng.int(-60, 60) / 10 + (rng.bool() ? 0.05 : 0), 2);
    if (Number.isInteger(x)) return mediumStep(rng);
    const fl = Math.floor(x);
    const mult = rng.pick([1, 1, 2, 3]);
    const c = rng.int(-4, 4);
    const right = mult * fl + c;
    const expr = terms([[mult, `\\lfloor x \\rfloor`], [c, '']]);
    const trunc = Math.trunc(x);
    return q({
      prompt: R`The greatest integer function \(\lfloor x \rfloor\) gives the greatest integer that is less than or equal to \(x\). If \(f(x) = ${expr}\), what is \(f(${num(x)})\)?`,
      correct: right,
      wrong: [
        trunc !== fl ? { value: mult * trunc + c, why: R`For a negative number, dropping the decimal moves up: \(${trunc}\) is greater than \(${num(x)}\). The greatest integer at or below \(${num(x)}\) is \(${fl}\).` } : null,
        Math.round(x) !== fl ? { value: mult * Math.round(x) + c, why: R`\(\lfloor x \rfloor\) does not round to the nearest integer; it always goes down: \(\lfloor ${num(x)} \rfloor = ${fl}\).` } : null,
        mult * (fl + 1) + c,
        mult * x + c === right ? null : round(mult * x + c, 2),
      ],
      solution: [
        R`On a number line, the greatest integer at or to the left of \(${num(x)}\) is \(${fl}\), so \(\lfloor ${num(x)} \rfloor = ${fl}\).`,
        R`\(f(${num(x)}) = ${terms([[mult, `(${fl})`], [c, '']])} = ${right}\).`,
      ],
      rule: 4, skill: 'greatest integer function',
      check: () => { let n = -100; while (n + 1 <= x) n++; return checkEqual(mult * n + c, right); },
    });
  }
  const first = rng.pick([0.6, 0.75, 1.2, 1.5]);
  const extra = rng.pick([0.2, 0.25, 0.3, 0.4, 0.5]);
  const w = rng.pick([0.5, 0.8, 1, 1.4, 2, 2.3, 2.5, 3, 3.6, 3.9, 4.2, 5.5, 6.1, 7]);
  const n = Math.ceil(w);
  const right = round(first + extra * (n - 1), 2);
  return q({
    prompt: `Sending a letter costs ${money(first)} for the first ounce and ${money(extra)} for each additional ounce or part of an ounce. What does a letter weighing ${txt(w)} ounces cost?`,
    correct: right,
    fmt: (v) => money(v),
    wrong: [
      n > 1 ? { value: round(first + extra * n, 2), why: `The first ounce is covered by the ${money(first)}; only the ${n - 1} ${n - 1 === 1 ? 'ounce after it is' : 'ounces after it are'} extra.` } : null,
      !Number.isInteger(w) && n > 1 ? { value: round(first + extra * (Math.floor(w) - 1), 2), why: 'A part of an ounce is charged as a whole ounce, so round the weight up.' } : null,
      { value: round(first * n, 2), why: `Only the first ounce costs ${money(first)}; each later ounce costs ${money(extra)}.` },
      round(right + extra, 2),
      round(right + 2 * extra, 2),
    ],
    solution: [
      `Round the weight up to whole ounces: ${txt(w)} oz counts as ${n} ${n === 1 ? 'ounce' : 'ounces'}.`,
      n === 1 ? `That is just the first ounce: ${money(first)}.` : R`The first ounce costs ${money(first)} and the other ${n - 1 === 1 ? 'ounce costs' : `${n - 1} cost`} ${money(extra)}${n - 1 === 1 ? '' : ' each'}: \(${num(first)} + ${n - 1} \times ${num(extra)} = ${num(right, { fixed: 2 })}\).`,
      `The letter costs ${money(right)}.`,
    ],
    rule: 4, skill: 'step functions',
    check: () => { let cost = first; for (let ounces = 1; ounces < w; ounces++) cost += extra; return checkEqual(round(cost, 2), right); },
  });
}

// ───────────── Hard ─────────────

function hardKeyFeatures(rng) {
  const p = rng.int(-4, 0);
  const qq = p + rng.int(2, 4);
  const c = rng.int(-3, 4);
  const hill = rng.bool(); // rises, flat, then falls (a maximum) — or falls, flat, rises (a minimum)
  const [s1, s3] = hill ? [rng.pick([1, 2]), -rng.pick([1, 2])] : [-rng.pick([1, 2]), rng.pick([1, 2])];
  const ps = [piece(s1, c - s1 * p, -Infinity, p, false, true), piece(0, c, p, qq, true, true), piece(s3, c - s3 * qq, qq, Infinity, false, false)];
  const f = (x) => evalPieces(ps, x);
  const alt = `Graph made of three straight pieces. It ${hill ? 'rises' : 'falls'} from the left to the point ${pointText(p, c)}, stays level at height ${show(c)} until ${pointText(qq, c)}, then ${hill ? 'falls' : 'rises'} to the right.`;
  const visual = { type: 'plot', x: [-8, 8], y: [-8, 8], step: [1, 1], fns: ps.map((pc) => ({ f: pc.f, domain: [pc.lo, pc.hi] })), points: [{ x: p, y: c }, { x: qq, y: c }], alt };
  const ivLeft = R`\(x < ${p}\)`;
  const ivMid = R`\(${p} < x < ${qq}\)`;
  const ivRight = R`\(x > ${qq}\)`;
  const ask = rng.pick(['increasing', 'decreasing', 'constant', 'extreme']);
  if (ask === 'extreme') {
    const ext = hill ? 'maximum' : 'minimum';
    return q({
      prompt: `The graph shows a function f. What is its ${ext} value?`,
      visual,
      correct: c,
      wrong: [
        p !== c ? { value: p, why: R`\(${p}\) is an \(x\)-value. The ${ext} value is the ${hill ? 'greatest' : 'least'} height the graph reaches, a \(y\)-value.` } : null,
        qq !== c ? { value: qq, why: R`\(${qq}\) is an \(x\)-value where the level part ends. The ${ext} value is a height.` } : null,
        hill ? c - 2 : c + 2,
        -c,
      ],
      solution: [
        `The graph ${hill ? 'rises to a level part and then falls' : 'falls to a level part and then rises'}, so the level part is the ${hill ? 'highest' : 'lowest'} the graph gets.`,
        R`That part is at height \(${c}\), for every \(x\) from \(${p}\) to \(${qq}\). The ${ext} value is \(${c}\).`,
      ],
      rule: 3, skill: 'key features of a graph',
      check: () => { for (let x = -8; x <= 8; x += 0.1) if (hill ? f(x) > c + 1e-9 : f(x) < c - 1e-9) return 'not the extreme value'; return checkEqual(f((p + qq) / 2), c); },
    });
  }
  const want = ask === 'constant' ? ivMid : (ask === 'increasing') === hill ? ivLeft : ivRight;
  const yVersion = ask === 'constant' ? R`\(y = ${c}\)` : R`\(y ${hill ? '<' : '>'} ${c}\)`;
  const slope = (x) => f(x + 0.01) - f(x);
  return q({
    prompt: `The graph shows a function f. On which interval is f **${ask}**?`,
    visual,
    correct: want,
    wrong: [ivLeft, ivMid, ivRight].filter((v) => v !== want).map((v) => ({ value: v, why: v === ivMid ? R`Between \(x = ${p}\) and \(x = ${qq}\) the graph is level: it neither rises nor falls.` : `Read the graph from left to right: on this interval it ${(v === ivLeft) === hill ? 'rises' : 'falls'}.` })).concat([{ value: yVersion, why: R`The interval where f is ${ask} is a set of \(x\)-values, read along the horizontal axis, not a set of heights.` }]),
    solution: [
      `Read the graph from left to right.`,
      R`For \(x < ${p}\) it ${hill ? 'rises' : 'falls'}; for \(${p} < x < ${qq}\) it is level; for \(x > ${qq}\) it ${hill ? 'falls' : 'rises'}.`,
      R`So f is ${ask} on ${want}.`,
    ],
    rule: 3, skill: 'key features of a graph',
    check: () => {
      const test = (x) => (ask === 'constant' ? Math.abs(slope(x)) < 1e-9 : ask === 'increasing' ? slope(x) > 0 : slope(x) < 0);
      const xs = want === ivLeft ? [p - 3, p - 0.5] : want === ivMid ? [p + 0.3, qq - 0.3] : [qq + 0.5, qq + 3];
      return xs.every(test) ? true : 'the interval does not match the graph';
    },
  });
}

function phoneStory(rng) {
  const B = rng.pick([25, 30, 35, 40, 45]);
  const D = rng.pick([2, 3, 4, 5, 8, 10]);
  const r = rng.pick([5, 6, 8, 10, 12]);
  return { B, D, r, cost: (g) => (g <= D ? B : B + r * (g - D)) };
}

function hardPhonePlan(rng) {
  const { B, D, r, cost } = phoneStory(rng);
  const name = person(rng);
  const story = `${name}'s phone plan costs ${money(B)} a month and includes ${D} GB of data. Each GB used beyond ${D} GB costs ${money(r)}.`;
  // An independent count: pay the base, then add r for each extra GB, a tenth of a GB at a time.
  const simulate = (g) => { let c = B; for (let used = D; used < g - 1e-9; used += 0.1) c += r / 10; return round(c, 2); };
  if (rng.bool()) {
    const C = (rows) => R`\(C(g) = ${cases(rows)}\)`;
    const lo = R`0 ${LE} g ${LE} ${D}`;
    const hi = `g > ${D}`;
    return q({
      prompt: `${story} Which function gives the monthly cost C, in dollars, for g GB of data?`,
      correct: C([[num(B), lo], [`${B} + ${r}(g - ${D})`, hi]]),
      wrong: [
        { value: C([[num(B), lo], [`${B} + ${r}g`, hi]]), why: R`Only the data beyond ${D} GB is charged extra, so the extra amount is \(g - ${D}\), not \(g\).` },
        { value: C([[num(B), lo], [`${r}(g - ${D})`, hi]]), why: `The ${money(B)} monthly charge is still paid when the data goes over the limit.` },
        { value: C([[`${B} + ${r}(g - ${D})`, lo], [num(B), hi]]), why: R`The cost stays at ${money(B)} up to the limit, so the flat piece belongs to \(0 \le g \le ${D}\).` },
        C([[`${B}g`, lo], [`${B} + ${r}(g - ${D})`, hi]]),
      ],
      solution: [
        R`Up to ${D} GB the cost is the flat ${money(B)}: \(C(g) = ${B}\) for \(0 \le g \le ${D}\).`,
        R`Beyond ${D} GB, each extra GB adds ${money(r)}. The extra data is \(g - ${D}\), so \(C(g) = ${B} + ${r}(g - ${D})\) for \(g > ${D}\).`,
        R`Check at the boundary: at \(g = ${D}\) both pieces give \(${B}\), so the graph has no jump.`,
      ],
      rule: 5, skill: 'writing piecewise functions',
      check: () => [0.5, D, D + 0.5, D + 2, D + 7.3].every((g) => Math.abs(cost(g) - simulate(g)) < 1e-6) || 'the formula disagrees with the story',
    });
  }
  const over = rng.bool(0.75);
  const g = over ? D + rng.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 6]) : rng.pick([0.5, 1, 1.5]) * D / 2;
  const right = cost(g);
  return q({
    prompt: `${story} One month ${name} uses ${txt(g)} GB. What is the bill?`,
    correct: right,
    fmt: (v) => money(v),
    wrong: over
      ? [
          { value: B + r * g, why: `Only the ${txt(g - D)} GB beyond the ${D} GB limit is charged at ${money(r)} per GB.` },
          { value: r * (g - D), why: `The ${money(B)} monthly charge is still paid.` },
          { value: B, why: `${txt(g)} GB is more than the ${D} GB included, so there is an extra charge.` },
          B + r * Math.ceil(g - D) + r,
        ]
      : [
          { value: B - r * (D - g), why: `${txt(g)} GB is within the ${D} GB included, so the flat piece applies: no charge is taken off for unused data.` },
          { value: B + r * g, why: `${txt(g)} GB is within the ${D} GB included, so no extra is charged.` },
          B + r,
        ],
    solution: over
      ? [R`\(${txt(g)} > ${D}\), so use the piece \(C(g) = ${B} + ${r}(g - ${D})\).`, R`\(C(${num(g)}) = ${B} + ${r}(${num(g)} - ${D}) = ${B} + ${r}(${num(g - D)}) = ${num(right)}\).`, `The bill is ${money(right)}.`]
      : [R`\(${txt(g)} \le ${D}\), so ${name} is within the plan: use the flat piece.`, `The bill is ${money(right)}.`],
    rule: 5, skill: 'writing piecewise functions',
    check: () => checkEqual(simulate(g), right),
  });
}

function hardPieceFromGraph(rng) {
  const J = jumpPieces(rng);
  const { c, leftIn, ps } = J;
  const [p1, p2] = ps;
  const fx = (rows) => R`\(f(x) = ${cases(rows)}\)`;
  const flip = (p) => ({ ...p, loIn: !p.loIn, hiIn: !p.hiIn });
  const rightRows = [[linear(p1.m, p1.b), condTex(p1)], [linear(p2.m, p2.b), condTex(p2)]];
  const swappedIn = [[linear(p1.m, p1.b), condTex(flip(p1))], [linear(p2.m, p2.b), condTex(flip(p2))]];
  const swappedF = [[linear(p2.m, p2.b), condTex(p1)], [linear(p1.m, p1.b), condTex(p2)]];
  const wrongSlope = p2.m !== 0 ? [[linear(p1.m, p1.b), condTex(p1)], [linear(-p2.m, p2.b + 2 * p2.m * c), condTex(p2)]] : [[linear(p1.m, p1.b), condTex(p1)], [linear(1, p2.b - c), condTex(p2)]];
  return q({
    prompt: 'Which function matches the graph? Pay attention to the open and closed circles.',
    visual: jumpVisual(J),
    correct: fx(rightRows),
    wrong: [
      { value: fx(swappedIn), why: R`The closed dot at \(x = ${c}\) is on the ${leftIn ? 'left' : 'right'} piece, so that piece uses \(${leftIn ? LE : GE}\) and the other uses a strict inequality.` },
      { value: fx(swappedF), why: R`Check a point: the left piece passes through \(${point(c - 2, p1.f(c - 2))}\), and \(${linear(p1.m, p1.b)}\) is the formula that gives it.` },
      { value: fx(wrongSlope), why: R`Check a point on the right piece: \(${point(c + 2, p2.f(c + 2))}\) does not fit that formula.` },
    ],
    solution: [
      R`Left piece: a line through \(${point(c - 2, p1.f(c - 2))}\) and \(${point(c, p1.f(c))}\), with slope \(${p1.m}\): \(y = ${linear(p1.m, p1.b)}\).`,
      R`Right piece: a line through \(${point(c, p2.f(c))}\) and \(${point(c + 2, p2.f(c + 2))}\), with slope \(${p2.m}\): \(y = ${linear(p2.m, p2.b)}\).`,
      R`The closed dot at \(x = ${c}\) is on the ${leftIn ? 'left' : 'right'} piece, so the conditions are \(${condTex(p1)}\) and \(${condTex(p2)}\).`,
    ],
    rule: 3, skill: 'piecewise function from a graph',
    check: () => {
      // The chosen formulas must reproduce the graph's own points, including the closed dot at x = c.
      const g = (x) => (leftIn ? x <= c : x < c) ? p1.m * x + p1.b : p2.m * x + p2.b;
      const samples = [c - 3, c - 1, c, c + 1, c + 3];
      if (!samples.every((x) => Math.abs(g(x) - (x === c ? (leftIn ? J.L : J.Rv) : evalPieces(ps, x))) < 1e-9)) return 'formula does not fit the graph';
      return p2.m !== 0 && Math.abs((-p2.m * (c + 2) + p2.b + 2 * p2.m * c) - p2.f(c + 2)) < 1e-9 ? 'the slope slip fits the graph' : true;
    },
  });
}

// ───────────── Challenge ─────────────

function challengeTax(rng) {
  const T = rng.pick([10000, 20000, 30000, 40000]);
  const [r1, r2] = rng.pick([[10, 20], [10, 25], [12, 22], [15, 30], [10, 30]]);
  const tax = (I) => (I <= T ? (r1 / 100) * I : (r1 / 100) * T + (r2 / 100) * (I - T));
  // An independent computation: tax every $1,000 slice of income at the rate for that slice.
  const slices = (I) => { let t = 0; for (let s = 0; s < I; s += 1000) t += ((s < T ? r1 : r2) / 100) * Math.min(1000, I - s); return t; };
  const country = `In a simplified tax system, the first ${money(T)} of income is taxed at ${r1}% and any income above ${money(T)} is taxed at ${r2}%.`;
  if (rng.bool()) {
    const I = T + 1000 * rng.int(2, 40);
    const right = tax(I);
    return q({
      prompt: `${country} How much tax is paid on an income of ${money(I)}?`,
      correct: right,
      fmt: (v) => money(v),
      wrong: [
        { value: (r2 / 100) * I, why: `The ${r2}% rate applies only to the part above ${money(T)}; the first ${money(T)} is taxed at ${r1}%.` },
        { value: (r1 / 100) * T + (r2 / 100) * I, why: `Only the income above ${money(T)}, which is ${money(I - T)}, is taxed at ${r2}%.` },
        { value: (r1 / 100) * I, why: `Income above ${money(T)} is taxed at the higher rate, ${r2}%.` },
      ],
      solution: [
        R`The tax is a piecewise function of income \(I\): \(t(I) = ${cases([[`${r1 / 100}I`, `0 ${LE} I ${LE} ${num(T)}`], [`${num((r1 / 100) * T)} + ${r2 / 100}(I - ${num(T)})`, `I > ${num(T)}`]])}\)`,
        R`${money(I)} is above ${money(T)}, so use the second piece: \(${num((r1 / 100) * T)} + ${r2 / 100}(${num(I - T)}) = ${num((r1 / 100) * T)} + ${num((r2 / 100) * (I - T))} = ${num(right)}\).`,
        `The tax is ${money(right)}.`,
      ],
      rule: 5, skill: 'piecewise functions in context',
      check: () => checkEqual(slices(I), right),
    });
  }
  const I = T + 1000 * rng.int(2, 40);
  const X = tax(I);
  return q({
    prompt: `${country} Someone pays ${money(X)} in tax. What is their income?`,
    correct: I,
    fmt: (v) => money(v),
    wrong: [
      { value: (X / r2) * 100, why: `The first ${money(T)} is taxed at only ${r1}%, so ${money(X)} is not ${r2}% of the whole income.` },
      { value: (X / r1) * 100, why: `Income above ${money(T)} is taxed at ${r2}%, not ${r1}%.` },
      { value: T + (X / r2) * 100, why: `First take away the ${money((r1 / 100) * T)} paid on the first ${money(T)}; the rest of the tax is ${r2}% of the income above ${money(T)}.` },
    ].filter((w) => Math.abs(w.value - I) > 1e-6),
    solution: [
      `Tax on the first ${money(T)} is ${r1}% of ${money(T)} = ${money((r1 / 100) * T)}. The tax paid is more than that, so the income is above ${money(T)}.`,
      R`The rest, \(${num(X)} - ${num((r1 / 100) * T)} = ${num(X - (r1 / 100) * T)}\), is ${r2}% of the income above ${money(T)}: \(${num(X - (r1 / 100) * T)} \div ${r2 / 100} = ${num(I - T)}\).`,
      `Income: ${money(T)} + ${money(I - T)} = ${money(I)}.`,
    ],
    rule: 5, skill: 'working backwards',
    check: () => checkEqual(slices(I), X),
  });
}

function challengeAbsAsPiecewise(rng) {
  const p = rng.pick([1, 1, 2, 3]);
  const h = rng.nonzero(-5, 5);
  const qv = p * h;
  const k = rng.int(-6, 6);
  const f = (x) => Math.abs(p * x - qv) + k;
  const inner = linear(p, -qv);
  const shown = terms([[1, `|${inner}|`], [k, '']]);
  const L = [-p, qv + k]; // the left piece: -(px - q) + k
  const Rt = [p, -qv + k];
  const fx = (rows) => R`\(f(x) = ${cases(rows)}\)`;
  const rows = (l, r, at) => [[linear(...l), `x < ${num(at)}`], [linear(...r), `x ${GE} ${num(at)}`]];
  const cands = [
    { rows: rows(Rt, L, h), why: R`For \(x < ${h}\) the inside, \(${inner}\), is negative, so the bars change its sign: that piece is \(-(${inner})${k ? ` ${k > 0 ? '+' : '-'} ${Math.abs(k)}` : ''}\).` },
    { rows: rows([-p, -qv + k], Rt, h), why: R`\(-(${inner})\) is \(${linear(-p, qv)}\): the minus sign changes the sign of both terms.` },
    p !== 1 ? { rows: rows(L, Rt, qv), why: R`The pieces change where the inside is zero: \(${inner} = 0\) at \(x = ${h}\), not \(x = ${qv}\).` } : { rows: rows(L, Rt, -h), why: R`The pieces change where the inside is zero: \(${inner} = 0\) at \(x = ${h}\).` },
    k !== 0 && { rows: rows([-p, qv - k], Rt, h) },
  ];
  const asF = (rr, at) => (x) => (x < at ? rr[0][0] * x + rr[0][1] : rr[1][0] * x + rr[1][1]);
  const candF = [asF([Rt, L], h), asF([[-p, -qv + k], Rt], h), asF([L, Rt], p !== 1 ? qv : -h), k !== 0 && asF([[-p, qv - k], Rt], h)].filter(Boolean);
  return q({
    prompt: R`Which piecewise function is the same as \(f(x) = ${shown}\)?`,
    correct: fx(rows(L, Rt, h)),
    wrong: cands.filter(Boolean).map((c) => (c.why ? { value: fx(c.rows), why: c.why } : fx(c.rows))),
    solution: [
      R`The inside, \(${inner}\), is zero at \(x = ${h}\). That is where the formula changes.`,
      R`For \(x ${GE} ${h}\) the inside is not negative, so the bars change nothing: \(f(x) = ${inner}${k ? ` ${k > 0 ? '+' : '-'} ${Math.abs(k)} = ${linear(...Rt)}` : ''}\).`,
      R`For \(x < ${h}\) the inside is negative, so the bars change its sign: \(f(x) = -(${inner})${k ? ` ${k > 0 ? '+' : '-'} ${Math.abs(k)}` : ''} = ${linear(...L)}\).`,
    ],
    rule: 0, skill: 'absolute value as piecewise',
    check: () => {
      const g = asF([L, Rt], h);
      for (let x = h - 6; x <= h + 6; x += 0.25) if (Math.abs(g(x) - f(x)) > 1e-9) return 'the right answer differs from the absolute value';
      // Every wrong answer must differ from f somewhere.
      const xs = [];
      for (let x = -Math.abs(qv) - 4; x <= Math.abs(qv) + 4; x += 0.25) xs.push(x);
      return candF.every((w) => xs.some((x) => Math.abs(w(x) - f(x)) > 1e-9)) || 'a wrong answer equals f';
    },
  });
}

function challengeSolvePiecewise(rng) {
  const c = rng.int(-2, 3);
  const t = rng.int(-5, 8);
  const both = rng.bool(0.4);
  const x1 = both ? c - rng.int(1, 4) : c + rng.int(1, 4); // piece 1 (x < c): valid only when x1 < c
  const x2 = both ? c + rng.int(0, 4) : c + rng.int(0, 4); // piece 2 (x ≥ c): always valid here
  const [m1, m2] = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
  const ps = [piece(m1, t - m1 * x1, -Infinity, c, false, false), piece(m2, t - m2 * x2, c, Infinity, true, false)];
  if (x1 === x2 || Math.abs(ps[0].b) > 15 || Math.abs(ps[1].b) > 15) return challengeSolvePiecewise(rng);
  const good = both ? [x1, x2] : [x2];
  const ans = (xs) => R`\(${rootsTex(xs)}\)`;
  const f = (x) => evalPieces(ps, x);
  return q({
    prompt: R`Solve \(f(x) = ${t}\) for \[f(x) = ${piecesTex(ps)}\]`,
    correct: ans(good),
    wrong: both
      ? [
          { value: ans([x1]), why: R`The second piece also gives a solution: \(${linear(m2, ps[1].b)} = ${t}\) at \(x = ${x2}\), and \(${x2} ${GE} ${c}\).` },
          { value: ans([x2]), why: R`The first piece also gives a solution: \(${linear(m1, ps[0].b)} = ${t}\) at \(x = ${x1}\), and \(${x1} < ${c}\).` },
          x1 !== 0 ? ans([-x1, x2].filter((v, i, arr) => arr.indexOf(v) === i)) : null,
          ans([x1, x2 + 1]),
        ]
      : [
          { value: ans([x1, x2]), why: R`Solving \(${linear(m1, ps[0].b)} = ${t}\) gives \(x = ${x1}\), but that piece only applies when \(x < ${c}\). Since \(${x1} \ge ${c}\), it is not a solution.` },
          { value: ans([x1]), why: R`\(x = ${x1}\) is not in the first piece’s domain, \(x < ${c}\). The second piece gives the solution.` },
          ans([x2 + 1]),
          x2 !== 0 ? ans([-x2]) : null,
          ans([x2 - 1]),
        ],
    solution: [
      R`Solve each piece and keep a solution only if it lies in that piece’s interval.`,
      R`First piece: \(${linear(m1, ps[0].b)} = ${t}\) gives \(x = ${x1}\). ${x1 < c ? R`\(${x1} < ${c}\), so it counts.` : R`But \(${x1}\) is not less than \(${c}\), so it does not count.`}`,
      R`Second piece: \(${linear(m2, ps[1].b)} = ${t}\) gives \(x = ${x2}\). \(${x2} ${GE} ${c}\), so it counts.`,
      R`Solution: \(${rootsTex(good)}\).`,
    ],
    rule: 2, skill: 'solving piecewise equations',
    check: () => {
      if (!good.every((x) => Math.abs(f(x) - t) < 1e-9)) return 'an answer does not satisfy f(x) = t';
      let count = 0; // scan for solutions in steps of 1/8 (every solution here is a whole number)
      for (let x = -30; x <= 30; x += 0.125) if (Math.abs(f(x) - t) < 1e-9) count++;
      return count === good.length || `found ${count} solutions, expected ${good.length}`;
    },
  });
}

// ───────────── Interactive models ─────────────

function absModel({ a, h, k }) {
  if (a === 0) return { error: 'With a = 0 the graph is the flat line y = k, not a V. Choose a value of a other than 0.' };
  const up = a > 0;
  const f = (x) => a * Math.abs(x - h) + k;
  const A = Math.abs(a);
  return {
    problem: R`Describe the graph of \(y = ${absTex(a, h, k)}\).`,
    steps: [
      R`Vertex: the inside of the bars, \(${linear(1, -h)}\), is zero at \(x = ${h}\), where \(y = ${k}\). The vertex is \(${point(h, k)}\).`,
      R`\(a = ${num(a)}\) is ${up ? 'positive, so the V opens upward' : 'negative, so the V is reflected over the x-axis and opens downward'}. ${A === 1 ? 'The arms have slopes 1 and −1, like y = |x|.' : R`The arms have slopes \(${num(A)}\) and \(${num(-A)}\), so the V is ${A > 1 ? 'narrower' : 'wider'} than \(y = |x|\).`}`,
      R`As a piecewise function: \(y = ${cases([[linear(-a, a * h + k), `x < ${h}`], [linear(a, -a * h + k), `x ${GE} ${h}`]])}\)`,
      R`Domain: all real numbers. Range: \(y ${up ? GE : LE} ${k}\). The ${up ? 'minimum' : 'maximum'} value is \(${k}\).`,
      R`It is ${up ? 'decreasing' : 'increasing'} for \(x < ${h}\) and ${up ? 'increasing' : 'decreasing'} for \(x > ${h}\).`,
    ],
    answer: R`Vertex \(${point(h, k)}\); opens ${up ? 'upward' : 'downward'}; range \(y ${up ? GE : LE} ${k}\)`,
    visual: {
      type: 'plot', x: [Math.min(h, 0) - 6, Math.max(h, 0) + 6], y: [Math.min(k, 0) - (up ? 2 : 10), Math.max(k, 0) + (up ? 10 : 2)],
      fns: [{ f: (x) => Math.abs(x), dashed: true, color: 'b', label: 'y = |x|' }, { f, color: 'a' }],
      points: [{ x: h, y: k, label: pointText(h, k) }],
      alt: `Graph of y = |x| as a dashed V, and the V-shaped graph of the function with vertex ${pointText(h, k)}, opening ${up ? 'upward' : 'downward'} with arm slopes ${txt(A)} and −${txt(A)}.`,
    },
  };
}

function phoneModel({ B, D, r, g }) {
  const cost = (u) => (u <= D ? B : B + r * (u - D));
  const C = cost(g);
  const xMax = Math.max(g, D) * 1.4 + 1;
  return {
    problem: `A phone plan costs ${money(B)} a month and includes ${D} GB of data. Each GB beyond ${D} GB costs ${money(r)}. What is the bill for ${txt(g)} GB?`,
    steps: [
      R`Up to the limit the cost is flat: \(C(g) = ${B}\) for \(0 \le g \le ${D}\).`,
      R`Beyond the limit only the extra data, \(g - ${D}\), is charged: \(C(g) = ${B} + ${num(r)}(g - ${D})\) for \(g > ${D}\).`,
      R`Together: \(C(g) = ${cases([[num(B), `0 ${LE} g ${LE} ${D}`], [`${B} + ${num(r)}(g - ${D})`, `g > ${D}`]])}\)`,
      g <= D
        ? R`\(${num(g)} \le ${D}\), so the flat piece applies: \(C(${num(g)}) = ${B}\).`
        : R`\(${num(g)} > ${D}\), so use the second piece: \(C(${num(g)}) = ${B} + ${num(r)}(${num(g - D)}) = ${num(round(C, 2))}\).`,
    ],
    answer: `The bill is ${money(C)}.`,
    visual: {
      type: 'plot', x: [0, Math.ceil(xMax)], y: [0, Math.ceil(cost(xMax) * 1.15)], axisLabels: ['g', 'C'],
      fns: [{ f: () => B, domain: [0, D] }, { f: (u) => B + r * (u - D), domain: [D, xMax] }],
      points: [{ x: g, y: C, color: 'b', label: `(${txt(g)}, ${money(C)})` }],
      alt: `Graph of the monthly cost: flat at ${money(B)} from 0 to ${D} GB, then rising by ${money(r)} per GB. The point for ${txt(g)} GB is at ${money(C)}.`,
    },
  };
}

export default {
  id: 'piecewise-absolute',
  title: 'Absolute Value, Piecewise & Step Functions',
  summary: 'Graph and transform y = a|x − h| + k, evaluate and graph piecewise and step functions, and write them from a story.',
  standards: ['CCSS F-IF.C.7', 'CCSS F-IF.B.4', 'CCSS F-IF.B.5', 'CCSS F-BF.B.3'],

  explain: {
    intro: R`Some functions follow different rules on different parts of their domain. A phone bill is flat until the data runs out and then climbs; a car park charges the same for any part of an hour. These are piecewise functions: each piece is a formula together with the interval where it applies. The absolute value function is the simplest example, and its graph is a V.`,
    rules: [
      {
        title: 'The absolute value function',
        text: R`\(|x|\) is the distance of \(x\) from 0, so it is never negative: \(|x| = x\) when \(x \ge 0\) and \(|x| = -x\) when \(x < 0\). The graph of \(y = |x|\) is a V with its vertex at \((0, 0)\): it decreases for \(x < 0\), increases for \(x > 0\), and its minimum value is 0.`,
        example: R`\(|-6| = 6\) and \(|6| = 6\). If \(f(x) = |x - 2|\), then \(f(-3) = |-5| = 5\).`,
      },
      {
        title: 'Transformations: y = a|x − h| + k',
        text: R`The vertex is \((h, k)\), where the inside of the bars is zero. If \(a > 0\) the V opens upward and \(k\) is the minimum; if \(a < 0\) it is reflected and opens downward, and \(k\) is the maximum. The arms have slopes \(a\) and \(-a\): a larger \(|a|\) makes a narrower V. The range is \(y \ge k\) or \(y \le k\).`,
        example: R`\(y = -2|x + 1| + 4\): vertex \((-1, 4)\), opens downward, arms of slope \(\pm 2\), range \(y \le 4\).`,
      },
      {
        title: 'Evaluating a piecewise function',
        text: R`Look at the conditions first. Find the one interval that contains the input, and substitute into that piece only. A value exactly on a boundary belongs to the piece whose condition uses \(\le\) or \(\ge\) there.`,
        example: R`For \(f(x) = \begin{cases} 2x + 1 & \text{if } x < 3 \\ 10 - x & \text{if } x \ge 3 \end{cases}\): \(f(1) = 3\), and \(f(3) = 10 - 3 = 7\).`,
      },
      {
        title: 'Graphing pieces: endpoints, domain and range',
        text: R`Draw each piece only over its own interval. At an endpoint, a closed dot means the point is included (\(\le\), \(\ge\)); an open circle means it is not (\(<\), \(>\)). Each piece's domain is its interval, and its range is the set of heights it reaches. Read a graph from left to right to say where it increases, decreases or stays constant, and where its maximum or minimum is.`,
        example: R`\(y = x + 1\) for \(-2 \le x < 3\) runs from a closed dot at \((-2, -1)\) to an open circle at \((3, 4)\). Its range is \(-1 \le y < 4\).`,
      },
      {
        title: 'Step functions',
        text: R`A step function is constant on intervals and jumps between them. The greatest integer function \(\lfloor x \rfloor\) gives the greatest integer less than or equal to \(x\). Charges "per hour or part of an hour" round up instead: every started hour counts.`,
        example: R`\(\lfloor 2.7 \rfloor = 2\) and \(\lfloor -2.3 \rfloor = -3\). At ${money(4)} per started hour, 2 hours 10 minutes costs \(3 \times 4 = 12\) dollars.`,
      },
      {
        title: 'Writing a piecewise function from a story',
        text: R`Find the point where the rule changes: a data limit, a tax threshold, a time. Write one formula for each side, and check that the boundary value is given to exactly one piece. Above a threshold, usually only the amount above it follows the new rule.`,
        example: R`${money(30)} a month with 5 GB included, then ${money(8)} per extra GB: \(C(g) = \begin{cases} 30 & \text{if } 0 \le g \le 5 \\ 30 + 8(g - 5) & \text{if } g > 5 \end{cases}\)`,
      },
    ],
    vocab: [
      { term: 'absolute value', def: R`The distance of a number from 0: \(|-4| = 4\).` },
      { term: 'vertex (of a V)', def: 'The corner point of an absolute value graph, where it changes from decreasing to increasing or back.' },
      { term: 'piecewise function', def: 'A function defined by different formulas on different intervals of its domain.' },
      { term: 'open and closed endpoints', def: 'A closed dot marks an endpoint that belongs to the graph; an open circle marks one that does not.' },
      { term: 'step function', def: 'A piecewise function that is constant on each interval, so its graph looks like stairs.' },
      { term: 'greatest integer function', def: R`\(\lfloor x \rfloor\), the greatest integer less than or equal to \(x\). Also called the floor function.` },
    ],
    mistakes: [
      R`Reading \(|x + 3|\) as a shift right. The inside is zero at \(x = -3\), so the vertex moves 3 units left.`,
      R`Using the wrong piece at a boundary. Check which condition includes the boundary value (\(\le\) or \(\ge\)).`,
      R`Reading the height of an open circle as the function's value. Only a closed dot is on the graph.`,
      R`Rounding \(\lfloor -2.3 \rfloor\) to \(-2\). The greatest integer at or below \(-2.3\) is \(-3\).`,
      R`Charging the higher rate on the whole amount. Above a threshold, only the part above it follows the new rule.`,
    ],
    visual: [
      {
        type: 'plot', x: [-6, 6], y: [-3, 7], step: [1, 1],
        fns: [{ f: (x) => Math.abs(x), dashed: true, color: 'b', label: 'y = |x|', labelAt: -4.5 }, { f: (x) => 2 * Math.abs(x - 2) - 1, color: 'a', label: 'y = 2|x − 2| − 1', labelAt: 4.6 }],
        points: [{ x: 0, y: 0, color: 'b' }, { x: 2, y: -1, label: '(2, −1)' }],
        alt: 'Graph of y = |x| as a dashed V with vertex (0, 0), and y = 2|x − 2| − 1, a narrower V with vertex (2, −1) that opens upward.',
      },
      {
        type: 'plot', x: [-5, 5], y: [-2, 7], step: [1, 1],
        ...piecePlot([piece(1, 4, -Infinity, -1, false, false), piece(0, 2, -1, 2, true, false), piece(2, -1, 2, Infinity, true, false)]),
        alt: 'Graph of a piecewise function. For x < −1 it is the line y = x + 4, ending at an open circle at (−1, 3). For −1 ≤ x < 2 it is flat at y = 2, from a closed dot at (−1, 2) to an open circle at (2, 2). For x ≥ 2 it is the line y = 2x − 1, starting at a closed dot at (2, 3).',
      },
    ],
  },

  examples: [
    {
      title: 'Graphing a transformed absolute value',
      problem: R`Describe the graph of \(y = -2|x + 1| + 4\): vertex, direction, range, and where it increases.`,
      steps: [
        R`The inside \(x + 1\) is zero at \(x = -1\), and there \(y = 4\). The vertex is \((-1, 4)\).`,
        R`\(a = -2\) is negative, so the V opens downward. The arms have slopes \(2\) (left) and \(-2\) (right).`,
        R`The vertex is the highest point: the maximum is 4 and the range is \(y \le 4\).`,
        R`Reading left to right, the graph increases for \(x < -1\) and decreases for \(x > -1\).`,
      ],
      answer: R`Vertex \((-1, 4)\), opens downward, range \(y \le 4\), increasing for \(x < -1\)`,
      visual: {
        type: 'plot', x: [-6, 4], y: [-5, 6], step: [1, 1], fns: [{ f: (x) => -2 * Math.abs(x + 1) + 4 }], points: [{ x: -1, y: 4, label: '(−1, 4)' }],
        alt: 'Graph of y = −2|x + 1| + 4: an upside-down V with its vertex at (−1, 4), passing through (−3, 0) and (1, 0).',
      },
    },
    {
      title: 'Evaluating a function with three pieces',
      problem: R`For \(f(x) = \begin{cases} x + 4 & \text{if } x < -1 \\ 2 & \text{if } -1 \le x < 2 \\ 2x - 1 & \text{if } x \ge 2 \end{cases}\), find \(f(-3)\), \(f(-1)\), \(f(2)\) and \(f(4)\).`,
      steps: [
        R`\(-3 < -1\), so use the first piece: \(f(-3) = -3 + 4 = 1\).`,
        R`\(-1\) satisfies \(-1 \le x < 2\), so \(f(-1) = 2\). (The first piece stops just before \(-1\): an open circle at \((-1, 3)\).)`,
        R`\(2\) satisfies \(x \ge 2\), so \(f(2) = 2(2) - 1 = 3\). The middle piece ends with an open circle at \((2, 2)\).`,
        R`\(f(4) = 2(4) - 1 = 7\).`,
      ],
      answer: R`\(f(-3) = 1\), \(f(-1) = 2\), \(f(2) = 3\), \(f(4) = 7\)`,
    },
    {
      title: 'Word problem: paying for parking',
      word: true,
      problem: `A car park charges $4 for each hour or part of an hour. Write the cost for stays up to 3 hours, and find the cost of 2 hours 10 minutes.`,
      steps: [
        R`Any time up to 1 hour costs $4; more than 1 and up to 2 hours costs $8; more than 2 and up to 3 hours costs $12.`,
        R`As a step function of the time \(t\) in hours: \(C(t) = \begin{cases} 4 & \text{if } 0 < t \le 1 \\ 8 & \text{if } 1 < t \le 2 \\ 12 & \text{if } 2 < t \le 3 \end{cases}\)`,
        R`2 hours 10 minutes is more than 2 hours, so a third hour has started: \(C = 12\).`,
      ],
      answer: 'The stay costs $12',
      visual: {
        type: 'plot', x: [0, 3.5], y: [0, 14], step: [1, 2], axisLabels: ['t', 'C'],
        ...piecePlot([piece(0, 4, 0, 1, false, true), piece(0, 8, 1, 2, false, true), piece(0, 12, 2, 3, false, true)]),
        alt: 'Step graph of parking cost: $4 for 0 < t ≤ 1, $8 for 1 < t ≤ 2, $12 for 2 < t ≤ 3. Each step starts with an open circle on the left and ends with a closed dot on the right.',
      },
    },
    {
      title: 'Word problem: a data plan',
      word: true,
      problem: R`A plan costs $35 a month with 5 GB of data included, and $8 for each GB beyond that. Write the cost \(C(g)\) and find the bill for 7.5 GB.`,
      steps: [
        R`The rule changes at the limit, 5 GB. Up to it, the cost is flat: \(C(g) = 35\).`,
        R`Beyond it, only the extra data \(g - 5\) costs $8 per GB: \(C(g) = 35 + 8(g - 5)\).`,
        R`\(C(g) = \begin{cases} 35 & \text{if } 0 \le g \le 5 \\ 35 + 8(g - 5) & \text{if } g > 5 \end{cases}\)`,
        R`\(7.5 > 5\), so \(C(7.5) = 35 + 8(2.5) = 55\).`,
      ],
      answer: 'The bill is $55',
    },
  ],

  models: [
    {
      id: 'abs-transform',
      title: 'Transforming y = |x| into y = a|x − h| + k',
      intro: 'Change a, h and k and compare the solid V with the dashed y = |x|.',
      inputs: [
        { name: 'a', label: 'a (stretch and direction)', type: 'number', min: -4, max: 4, step: 0.5, value: -2 },
        { name: 'h', label: 'h (shift right)', type: 'int', min: -8, max: 8, value: -1 },
        { name: 'k', label: 'k (shift up)', type: 'int', min: -8, max: 8, value: 4 },
      ],
      compute: absModel,
    },
    {
      id: 'data-plan',
      title: 'Word problem: a phone bill with a data limit',
      word: true,
      intro: 'Set up a plan and a month of data use. Try usage below and above the limit.',
      inputs: [
        { name: 'B', label: 'Monthly charge ($)', type: 'int', min: 10, max: 80, value: 35 },
        { name: 'D', label: 'Data included (GB)', type: 'int', min: 1, max: 50, value: 5 },
        { name: 'r', label: 'Cost per extra GB ($)', type: 'number', min: 1, max: 20, step: 0.5, value: 8 },
        { name: 'g', label: 'Data used (GB)', type: 'number', min: 0, max: 100, step: 0.5, value: 7.5 },
      ],
      compute: phoneModel,
    },
  ],

  quiz: {
    easy: [easyAbsEval, easyVertex, easyPiecewiseEval, easyParking],
    medium: [mediumAbsGraph, mediumPiecewiseGraph, mediumRange, mediumStep],
    hard: [hardKeyFeatures, hardPhonePlan, hardPieceFromGraph],
    challenge: [challengeTax, challengeAbsAsPiecewise, challengeSolvePiecewise],
  },
};
