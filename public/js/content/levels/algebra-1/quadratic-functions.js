import { R, q, frac, Frac, terms, poly, linear, factor, num, txt, paren, signed, dot, point, plural, joinList, person, fracTex, rootsTex, isSquare, polyEval, checkEqual, checkSame, checkRoots, checkAll } from '../../lib/index.js';
import { val, pointText, timesTex } from './_shared.js';

const neg = (v) => (v instanceof Frac ? v.neg() : -v);
// (x - h)^2 as LaTeX: "(x - 3)^{2}", "(x + 3)^{2}", or "x^{2}" when h is 0.
const sq = (h) => (val(h) === 0 ? 'x^{2}' : h instanceof Frac && !h.isInt() ? `\\left(${linear(1, neg(h))}\\right)^{2}` : `(${linear(1, neg(h))})^{2}`);
const vertexTex = (a, h, k) => terms([[a, sq(h)], [k, '']]); // a(x - h)^2 + k
const factoredTex = (a, r, s) => terms([[a, val(s) === 0 ? factor(s) + factor(r) : factor(r) + factor(s)]]); // a(x - r)(x - s); a zero root is written first, as x(x - r)
const eqn = (tex) => R`\(y = ${tex}\)`;
const pt = (x, y) => R`\(${point(x, y)}\)`;
const line = (v, n) => R`\(${v} = ${n}\)`;
const units = (n) => plural(Math.abs(n), 'unit');
// The plot writes a label just above its point, where an upward parabola would run through the text.
// A blank label listed first takes that spot, so the real label is written below the point instead.
const vertexDot = (x, y, label, up) => (up ? [{ x, y, label: ' ' }, { x, y, label }] : [{ x, y, label }]);

// ───────────── Easy ─────────────

function easyVertexForm(rng) {
  const a = rng.pick([1, 1, -1, 2, -2, 3, -3, 4, frac(1, 2), frac(-1, 2)]);
  const h = rng.nonzero(-9, 9);
  const k = rng.intExcept(-9, 9, [0, h, -h]);
  const askAxis = rng.bool(0.35);
  const bracket = R`The bracket is \(${linear(1, -h)}\)${h < 0 ? R`, which is \(x - (${h})\)` : ''}, so \(h = ${h}\).`;
  const sign = R`Vertex form is \(a(x - h)^2 + k\), with a minus sign built in. ${bracket}`;
  const f = (x) => val(a) * (x - h) ** 2 + k;
  return q({
    prompt: R`What is the ${askAxis ? 'axis of symmetry' : 'vertex'} of the parabola \(y = ${vertexTex(a, h, k)}\)?`,
    correct: askAxis ? line('x', h) : pt(h, k),
    wrong: askAxis
      ? [{ value: line('x', -h), why: sign }, { value: line('y', k), why: R`The axis of symmetry of this parabola is the vertical line through the vertex, so its equation is \(x =\) a number.` }, line('x', k), line('y', h)]
      : [{ value: pt(-h, k), why: sign }, { value: pt(k, h), why: R`The number inside the bracket goes with \(x\). The number added at the end is the \(y\)-coordinate.` }, pt(h, -k), pt(-h, -k)],
    solution: [
      R`Compare with vertex form, \(y = a(x - h)^2 + k\). ${bracket}`,
      R`The number added at the end is \(k = ${k}\), so the vertex is \(${point(h, k)}\).`,
      ...(askAxis ? [R`The axis of symmetry is the vertical line through the vertex: \(x = ${h}\).`] : []),
    ],
    rule: 1, skill: 'vertex form',
    check: () => checkAll(checkEqual(f(h), k), checkEqual(f(h - 1.5), f(h + 1.5))),
  });
}

function easyOpens(rng) {
  const s = rng.sign(); // the sign of a in the right answer
  const make = (sign, form) => {
    const a = sign * rng.pick([1, 1, 2, 3, 4]);
    const t = -sign; // every other number gets the opposite sign, to tempt
    const [m, n] = [rng.int(1, 6), rng.int(1, 9)];
    const [tex, f] = {
      standard: [poly([a, t * (m + 1), t * n]), (x) => a * x * x + t * (m + 1) * x + t * n],
      reordered: [terms([[t * n, ''], [a, 'x^{2}']]), (x) => t * n + a * x * x],
      vertex: [vertexTex(a, -t * m, t * n), (x) => a * (x + t * m) ** 2 + t * n],
      factored: [factoredTex(a, -t * m, -t * (m + n)), (x) => a * (x + t * m) * (x + t * (m + n))],
    }[form];
    const where = form === 'reordered' ? R`the \(x^2\) term is written last, and its coefficient is \(${a}\)`
      : form === 'standard' ? R`the coefficient of \(x^2\) is \(${a}\)`
      : R`the number multiplying the bracket${form === 'factored' ? 's' : ''} is \(${a}\)${Math.abs(a) === 1 ? ' (the 1 is not written)' : ''}`;
    return { value: eqn(tex), a, f, why: `Here ${where}. That is ${a > 0 ? 'positive' : 'negative'}, so this parabola opens ${a > 0 ? 'upward' : 'downward'}. The other signs do not change the direction.` };
  };
  const [first, ...rest] = rng.shuffle(['standard', 'vertex', 'factored', 'reordered']);
  const right = make(s, first);
  const others = rest.map((form) => make(-s, form));
  const dir = (sign) => (sign > 0 ? 'upward' : 'downward');
  const ext = s > 0 ? 'minimum' : 'maximum';
  const askExt = rng.bool();
  return q({
    prompt: askExt ? `Which function has a **${ext}** value?` : `Which parabola opens **${dir(s)}**?`,
    correct: right.value,
    wrong: others.map(({ value, why }) => ({ value, why })),
    solution: [
      R`Only the sign of \(a\), the coefficient of \(x^2\), decides the direction. Positive: opens upward, with a minimum. Negative: opens downward, with a maximum.`,
      R`In ${right.value}, \(a = ${right.a}\). That is ${s > 0 ? 'positive' : 'negative'}, so the parabola opens ${dir(s)}${askExt ? ` and has a ${ext}` : ''}.`,
      R`In the other three, the values of \(a\) are ${joinList(others.map((o) => R`\(${o.a}\)`))}: all ${s > 0 ? 'negative' : 'positive'}, so those parabolas open ${dir(-s)}.`,
    ],
    rule: 0, skill: 'direction of opening',
    check: () => ([right, ...others].every((c, i) => Math.sign(c.f(1) + c.f(-1) - 2 * c.f(0)) === (i ? -s : s)) ? true : 'a parabola opens the wrong way'),
  });
}

function easyIntercepts(rng) {
  const a = rng.pick([1, 1, 1, -1, 2, -2, 3]);
  const r = rng.nonzero(-9, 9);
  const s = rng.intExcept(-9, 9, [0, r, -r]);
  const both = (u, v) => R`\(x = ${Math.min(u, v)}\) and \(x = ${Math.max(u, v)}\)`;
  const zero = (u) => R`\(${linear(1, -u)} = 0\) when \(x = ${u}\)`;
  return q({
    prompt: R`Where does the graph of \(y = ${factoredTex(a, r, s)}\) cross the \(x\)-axis?`,
    correct: both(r, s),
    wrong: [
      { value: both(-r, -s), why: `A bracket is zero for the opposite of the number written in it: ${zero(r)}.` },
      { value: both(-r, s), why: `Test each bracket on its own: ${zero(r)}.` },
      { value: both(r, -s), why: `Test each bracket on its own: ${zero(s)}.` },
    ],
    solution: [
      R`The graph crosses the \(x\)-axis where \(y = 0\).`,
      `A product is zero only when one of its factors is zero: ${zero(r)}, and ${zero(s)}.`,
      R`The graph crosses the \(x\)-axis at \(x = ${Math.min(r, s)}\) and \(x = ${Math.max(r, s)}\).`,
    ],
    rule: 3, skill: 'intercepts',
    check: () => checkRoots((x) => a * (x - r) * (x - s), [r, s]),
  });
}

function easyGraph(rng) {
  const a = rng.pick([1, 1, -1, -1, 2, -2, 0.5, -0.5]);
  const up = a > 0;
  const h = rng.nonzero(-4, 4);
  const k = rng.intExcept(up ? -6 : -1, up ? 1 : 6, [0, h, -h]);
  const f = (x) => a * (x - h) ** 2 + k;
  const y0 = Number.isInteger(f(0)) && Math.abs(f(0)) <= 8 ? f(0) : null; // the y-intercept, when it can be read off the picture
  const [low, ext] = up ? ['lowest', 'minimum'] : ['highest', 'maximum'];
  const askValue = rng.bool(0.4);
  return q({
    prompt: askValue ? `What is the ${ext} value of the function shown in the graph?` : 'What is the vertex of the parabola in the graph?',
    visual: {
      type: 'plot', x: [-8, 8], y: [-8, 8], step: [1, 1], square: true, fns: [{ f }],
      alt: `Graph of a parabola that opens ${up ? 'upward' : 'downward'}. Its turning point is at ${pointText(h, k)}.`,
    },
    correct: askValue ? k : pt(h, k),
    wrong: askValue
      ? [
          { value: h, why: R`That is the \(x\)-value where the ${ext} happens. The ${ext} value is the \(y\)-coordinate of the vertex.` },
          y0 == null ? null : { value: y0, why: R`That is where the curve crosses the \(y\)-axis. The ${ext} value is the \(y\)-coordinate of the ${low} point.` },
          -k,
        ]
      : [
          { value: pt(k, h), why: R`The \(x\)-coordinate comes first: read across for \(x\), then up or down for \(y\).` },
          y0 == null ? null : { value: pt(0, y0), why: R`That is the \(y\)-intercept, where the curve crosses the \(y\)-axis. The vertex is the turning point.` },
          pt(-h, k),
          pt(h, -k),
        ],
    solution: [
      `The vertex is the turning point of the parabola. This one opens ${up ? 'upward' : 'downward'}, so the vertex is its ${low} point.`,
      R`That point is at \(x = ${h}\), \(y = ${k}\), so the vertex is \(${point(h, k)}\).`,
      ...(askValue ? [R`The ${ext} value of the function is the \(y\)-coordinate of the vertex: \(${k}\).`] : []),
    ],
    rule: 0, skill: 'reading a graph',
    check: () => checkAll(checkEqual(f(h), k), checkEqual(f(h - 2), f(h + 2)), f(h + 1) > k === up ? true : 'opens the wrong way'),
  });
}

// ───────────── Medium ─────────────

function mediumVertexStandard(rng) {
  const a = rng.pick([1, 1, -1, 2, -2, 3]);
  const h = rng.nonzero(-5, 5);
  const k = rng.intExcept(-12, 12, [-a * h * h]); // keeps c away from 0
  const [b, c] = [-2 * a * h, a * h * h + k];
  const f = (x) => polyEval([a, b, c], x);
  return q({
    prompt: R`What is the vertex of the parabola \(y = ${poly([a, b, c])}\)?`,
    correct: pt(h, k),
    wrong: [
      { value: pt(-h, f(-h)), why: R`The formula has a negative sign in front: \(x = -\dfrac{b}{2a}\). Here \(b = ${b}\), so \(-b = ${-b}\).` },
      { value: pt(h, c), why: R`\(${c}\) is the \(y\)-intercept, the value at \(x = 0\). Substitute \(x = ${h}\) to get the \(y\)-coordinate of the vertex.` },
      { value: pt(2 * h, f(2 * h)), why: R`The bottom of the formula is \(2a\), which is \(${2 * a}\) here, not \(a\).` },
      pt(k, h),
    ],
    solution: [
      R`Axis of symmetry: \(x = -\dfrac{b}{2a} = -\dfrac{${paren(b)}}{2(${a})} = ${fracTex(-b, 2 * a)} = ${h}\).`,
      R`Substitute \(x = ${h}\): \(y = ${terms([[a, `(${h})^{2}`], [b, `(${h})`], [c, '']])} = ${terms([[a * h * h, ''], [b * h, ''], [c, '']])} = ${k}\).`,
      R`The vertex is \(${point(h, k)}\).`,
    ],
    rule: 2, skill: 'vertex from standard form',
    check: () => checkAll(checkEqual(f(h), k), checkEqual(f(h - 0.7), f(h + 0.7)), checkEqual(f(h - 1.9), f(h + 1.9))),
  });
}

function mediumTransform(rng) {
  const refl = rng.bool(0.3) ? -1 : 1;
  const h = rng.nonzero(-8, 8);
  const k = rng.intExcept(-8, 8, [0, h, -h]);
  const side = (v) => (v > 0 ? 'right' : 'left');
  const vert = (v) => (v > 0 ? 'up' : 'down');
  const moves = (hh, kk) => `${units(hh)} ${side(hh)} and ${units(kk)} ${vert(kk)}`;
  const g = (x) => refl * (x - h) ** 2 + k;
  // The points (0, 0), (1, 1) and (-1, 1) of y = x² must land where the description says.
  const check = () => checkAll(checkEqual(g(h), k), checkEqual(g(h + 1), k + refl), checkEqual(g(h - 1), k + refl));
  const inside = R`The left-right shift goes inside the bracket with \(x\). The up-down shift is the number added outside.`;
  if (rng.bool()) {
    return q({
      prompt: R`The graph of \(y = x^2\) is ${refl < 0 ? R`reflected over the \(x\)-axis and then ` : ''}shifted ${moves(h, k)}. Which equation describes the new graph?`,
      correct: eqn(vertexTex(refl, h, k)),
      wrong: [
        { value: eqn(vertexTex(refl, -h, k)), why: R`A shift of ${units(h)} to the ${side(h)} replaces \(x\) with \(${linear(1, -h)}\): the new vertex is where the bracket equals 0, at \(x = ${h}\).` },
        { value: eqn(vertexTex(refl, k, h)), why: inside },
        eqn(vertexTex(refl, h, -k)),
        eqn(vertexTex(refl, -h, -k)),
      ],
      solution: [
        ...(refl < 0 ? [R`Reflecting over the \(x\)-axis changes the sign of every \(y\)-value: \(y = -x^2\).`] : []),
        R`Shifting ${units(h)} ${side(h)} replaces \(x\) with \(${linear(1, -h)}\): \(y = ${vertexTex(refl, h, 0)}\).`,
        R`Shifting ${units(k)} ${vert(k)} ${k > 0 ? 'adds' : 'subtracts'} \(${Math.abs(k)}\): \(y = ${vertexTex(refl, h, k)}\).`,
      ],
      rule: 5, skill: 'transformations', check,
    });
  }
  const say = (hh, kk) => `${refl < 0 ? R`Reflect it over the \(x\)-axis, then shift it` : 'Shift it'} ${moves(hh, kk)}`;
  return q({
    prompt: R`How is the graph of \(y = ${vertexTex(refl, h, k)}\) obtained from the graph of \(y = x^2\)?`,
    correct: say(h, k),
    wrong: [
      { value: say(-h, k), why: R`\(${sq(h)}\) is zero when \(x = ${h}\), so the vertex is at \(x = ${h}\): a shift to the ${side(h)}.` },
      { value: say(k, h), why: inside },
      say(h, -k),
      say(-h, -k),
    ],
    solution: [
      R`Compare with \(y = a(x - h)^2 + k\): here \(a = ${refl}\), \(h = ${h}\) and \(k = ${k}\).`,
      ...(refl < 0 ? [R`\(a = -1\) reflects the graph over the \(x\)-axis.`] : []),
      R`\(h = ${h}\) shifts the graph ${units(h)} ${side(h)}, and \(k = ${k}\) shifts it ${units(k)} ${vert(k)}.`,
      R`The vertex moves from \((0, 0)\) to \(${point(h, k)}\).`,
    ],
    rule: 5, skill: 'transformations', check,
  });
}

function mediumMaxStory(rng) {
  const feet = rng.bool(0.3);
  const [a, u, long] = feet ? [-16, 'ft', 'feet'] : [-5, 'm', 'metres'];
  const t0 = rng.int(1, feet ? 4 : 6);
  const c = rng.int(0, 15);
  const thing = feet ? 'rocket' : t0 <= 2 ? 'ball' : 'firework'; // a thrown ball stays at a speed a person can manage
  const start = thing === 'ball' ? `${person(rng)} throws a ball straight up.` : thing === 'rocket' ? 'A model rocket is launched straight up.' : 'A firework is fired straight up.';
  const b = -2 * a * t0;
  const f = (t) => polyEval([a, b, c], t);
  const top = f(t0);
  const askTop = rng.bool();
  return q({
    prompt: R`${start} After \(t\) seconds the height of the ${thing}, in ${long}, is \(h = ${poly([a, b, c], 't')}\). ${askTop ? `What is the greatest height the ${thing} reaches?` : `After how many seconds does the ${thing} reach its greatest height?`}`,
    correct: askTop ? top : t0,
    unit: askTop ? u : 's',
    wrong: askTop
      ? [
          { value: t0, why: `That is the time, in seconds, at which the ${thing} is highest. Substitute it into the formula to find the height.` },
          c > 0 ? { value: c, why: R`That is the height at the start, when \(t = 0\).` } : null,
          top - c,
          b * t0 + c,
        ]
      : [
          { value: 2 * t0, why: R`The bottom of the formula is \(2a\), which is \(${2 * a}\) here, not \(a\).` },
          { value: top, why: 'That is the greatest height. The question asks for the time at which it is reached.' },
          b / 2,
          b,
        ],
    solution: [
      R`The coefficient of \(t^2\) is negative, so the graph opens downward and its vertex is the highest point.`,
      R`The vertex is at \(t = -\dfrac{b}{2a} = -\dfrac{${b}}{2(${a})} = ${t0}\).`,
      askTop
        ? R`Substitute \(t = ${t0}\): \(h = ${terms([[a, `(${t0})^{2}`], [b, `(${t0})`], [c, '']])} = ${terms([[a * t0 * t0, ''], [b * t0, ''], [c, '']])} = ${top}\). The greatest height is ${txt(top)} ${long}.`
        : `The ${thing} is highest after ${plural(t0, 'second')}.`,
    ],
    rule: 6, skill: 'maximum in context',
    check: () => checkAll(checkEqual(top, c - (b * b) / (4 * a)), checkEqual(f(t0 - 1), f(t0 + 1)), f(t0 + 0.5) < top ? true : 'not a maximum'),
  });
}

// ───────────── Hard ─────────────

function hardCompleteSquare(rng) {
  const a = rng.pick([1, 1, -1, 2, -2, 3, -3, 4]);
  const h = rng.nonzero(-6, 6);
  const k = rng.intExcept(-15, 15, [0, -a * h * h]);
  const [b, c] = [-2 * a * h, a * h * h + k];
  const vf = (hh, kk) => eqn(vertexTex(a, hh, kk));
  const balance = a === 1
    ? R`Add \(${h * h}\) to make a perfect square, and subtract \(${h * h}\) as well so that the value does not change:`
    : R`Add \(${h * h}\) inside the bracket to make a perfect square. That changes the expression by \(${dot(a, h * h)} = ${a * h * h}\), so ${a > 0 ? 'subtract' : 'add'} \(${Math.abs(a * h * h)}\) outside the bracket:`;
  return q({
    prompt: R`Write \(y = ${poly([a, b, c])}\) in vertex form.`,
    correct: vf(h, k),
    wrong: [
      { value: vf(-h, k), why: R`Half of \(${-2 * h}\) is \(${-h}\), so the bracket is \(${linear(1, -h)}\). Expand your answer to check the \(x\)-term.` },
      a === 1 ? null : { value: vf(h, c - h * h), why: R`The \(${h * h}\) added inside the bracket is multiplied by \(${a}\), so the expression changes by \(${a * h * h}\). Balance that amount outside the bracket.` },
      { value: vf(h, c), why: R`Adding \(${h * h}\) to complete the square changes the expression. Balance it so the value stays the same.` },
      vf(2 * h, c - 4 * a * h * h),
      vf(h, c + a * h * h),
    ],
    solution: [
      ...(a === 1 ? [] : [R`Factor \(${a}\) out of the two \(x\)-terms: \(y = ${timesTex(a, poly([1, -2 * h, 0]))} ${signed(c)}\).`]),
      R`Half of \(${-2 * h}\) is \(${-h}\), and \(${paren(-h)}^2 = ${h * h}\). ${balance} \(y = ${timesTex(a, poly([1, -2 * h, h * h]))} ${signed(c)} ${signed(-a * h * h)}\).`,
      R`Write the bracket as a square and combine the constants: \(y = ${vertexTex(a, h, k)}\).`,
    ],
    rule: 4, skill: 'completing the square',
    check: () => checkSame((x) => polyEval([a, b, c], x), (x) => a * (x - h) ** 2 + k),
  });
}

function hardFactoredVertex(rng) {
  const a = rng.pick([1, 1, -1, 2, -2]);
  const r = rng.int(-6, 6);
  const s = rng.intExcept(Math.max(-6, r - 7), Math.min(6, r + 7), [r, -r]);
  const h = frac(r + s, 2);
  const [d1, d2] = [h.sub(r), h.sub(s)];
  const k = d1.mul(d2).mul(a);
  const f = (x) => a * (x - r) * (x - s);
  const wrap = (tex) => `\\left(${tex}\\right)`;
  return q({
    prompt: R`What is the vertex of the parabola \(y = ${factoredTex(a, r, s)}\)?`,
    correct: pt(h, k),
    wrong: [
      { value: pt(h.neg(), k), why: R`The \(x\)-intercepts are \(x = ${r}\) and \(x = ${s}\), the values that make a bracket zero. The vertex is halfway between them.` },
      { value: pt(r + s, a * r * s), why: R`Halfway between the intercepts means adding them and then dividing by 2: \(x = \dfrac{${r} + ${paren(s)}}{2} = ${h.tex()}\).` },
      { value: pt(h, a * r * s), why: R`\(${a * r * s}\) is the \(y\)-value at \(x = 0\). Substitute \(x = ${h.tex()}\) to get the \(y\)-coordinate of the vertex.` },
      pt(h, k.neg()),
    ],
    solution: [
      R`The \(x\)-intercepts are \(x = ${r}\) and \(x = ${s}\), where a bracket is zero.`,
      R`The axis of symmetry is halfway between them: \(x = \dfrac{${r} + ${paren(s)}}{2} = ${h.tex()}\).`,
      R`Substitute \(x = ${h.tex()}\): \(y = ${terms([[a, wrap(`${h.tex()} - ${paren(r)}`) + wrap(`${h.tex()} - ${paren(s)}`)]])} = ${terms([[a, wrap(d1.tex()) + wrap(d2.tex())]])} = ${k.tex()}\).`,
      R`The vertex is \(${point(h, k)}\).`,
    ],
    rule: 3, skill: 'vertex from factored form',
    check: () => checkAll(checkEqual(f(h.value), k.value), checkEqual(f(h.value - 1), f(h.value + 1)), checkRoots(f, [r, s])),
  });
}

function hardFromGraph(rng) {
  const a = frac(...rng.pick([[2, 1], [-2, 1], [3, 1], [-3, 1], [1, 2], [-1, 2], [1, 4], [-1, 4]]));
  const up = a.value > 0;
  const h = rng.nonzero(-4, 4);
  const k = rng.intExcept(up ? -6 : 1, up ? -1 : 6, [h]);
  let dx = (a.d === 1 ? 1 : a.d === 2 ? 2 : rng.pick([2, 4])) * rng.sign();
  if (Math.abs(h + dx) > 7) dx = -dx;
  const [x1, y1] = [h + dx, k + a.value * dx * dx];
  const f = (x) => a.value * (x - h) ** 2 + k;
  const vf = (aa, hh, kk) => eqn(vertexTex(aa, hh, kk));
  const one = up ? 1 : -1;
  return q({
    prompt: 'The graph shows a parabola with its vertex and one other point marked. Which equation matches the graph?',
    visual: {
      type: 'plot', x: [-8, 8], y: [-8, 8], step: [1, 1], square: true, fns: [{ f }], points: [{ x: h, y: k }, { x: x1, y: y1, color: 'b' }],
      alt: `Graph of a parabola that opens ${up ? 'upward' : 'downward'}, with its vertex marked at ${pointText(h, k)}. A second marked point on the curve is ${pointText(x1, y1)}.`,
    },
    correct: vf(a, h, k),
    wrong: [
      { value: vf(one, h, k), why: R`This has the right vertex, but at \(x = ${x1}\) it gives \(y = ${k + one * dx * dx}\), not \(${y1}\). Use the second point to find \(a\).` },
      { value: vf(a, -h, k), why: R`Vertex form uses \((x - h)\). With \(h = ${h}\) the bracket is \(${linear(1, -h)}\).` },
      vf(a.inv(), h, k),
      vf(a.neg(), h, k),
    ],
    solution: [
      R`The vertex is \(${point(h, k)}\), so the equation has the form \(y = a${sq(h)} ${signed(k)}\).`,
      R`Substitute the other marked point, \(${point(x1, y1)}\): \(${y1} = a(${x1} - ${paren(h)})^2 ${signed(k)}\), which is \(${y1} = ${terms([[dx * dx, 'a'], [k, '']])}\).`,
      dx * dx === 1 ? R`So \(a = ${y1} - ${paren(k)} = ${a.tex()}\).` : R`So \(${dx * dx}a = ${y1 - k}\), and \(a = ${a.tex()}\).`,
      R`The equation is \(y = ${vertexTex(a, h, k)}\).`,
    ],
    rule: 1, skill: 'equation from a graph',
    check: () => checkAll(checkEqual(f(h), k), checkEqual(f(x1), y1), checkEqual(f(h - 1), f(h + 1))),
  });
}

function hardFenceStory(rng) {
  const m = rng.int(5, 30);
  const L = 4 * m;
  const d = Math.max(1, Math.round(m / 5));
  const askSide = rng.bool(0.4);
  const equal = m % 3 === 0 ? 'Three equal sides do not give the largest area here. Write the area as a quadratic and find its vertex.' : null;
  const area = (x) => x * (L - 2 * x);
  return q({
    prompt: `${person(rng)} has ${L} m of fencing to make a rectangular pen against a long straight wall. The wall is one side of the pen, so only the other three sides need fencing. ${askSide ? 'For the largest possible area, how long should the side parallel to the wall be?' : 'What is the largest area the pen can have?'}`,
    correct: askSide ? 2 * m : 2 * m * m,
    unit: askSide ? 'm' : 'm²',
    wrong: askSide
      ? [
          { value: m, why: 'That is the length of each of the two sides that meet the wall. The question asks for the side parallel to the wall.' },
          equal && { value: L / 3, why: equal },
          3 * m,
          L,
        ]
      : [
          { value: m * m, why: 'That is the largest area when the fencing has to go round all four sides. Here the wall is one side, so the best shape is not a square.' },
          { value: 4 * m * m, why: R`Two sides of length \(x\) meet the wall, so the side parallel to the wall is \(${L} - 2x\), not \(${L} - x\).` },
          equal && { value: (L / 3) ** 2, why: equal },
          2 * (m + d) * (m - d),
        ],
    solution: [
      R`Let \(x\) be the length, in metres, of each of the two sides that meet the wall. The side parallel to the wall gets the rest of the fencing: \(${L} - 2x\).`,
      R`Area: \(A = x(${L} - 2x)\). This quadratic opens downward and is zero at \(x = 0\) and \(x = ${L / 2}\).`,
      R`The maximum is at the vertex, halfway between the zeros: \(x = ${m}\).`,
      askSide ? R`The side parallel to the wall is \(${L} - 2(${m}) = ${2 * m}\) m.` : R`The side parallel to the wall is then \(${L} - 2(${m}) = ${2 * m}\), so the largest area is \(${m} \cdot ${2 * m} = ${2 * m * m}\) m².`,
    ],
    rule: 6, skill: 'maximum in context',
    check: () => {
      let best = 0; // try every width from 0 to L/2 in steps of 0.25
      for (let x = 0; x <= L / 2; x += 0.25) if (area(x) > area(best)) best = x;
      return checkEqual(askSide ? L - 2 * best : area(best), askSide ? 2 * m : 2 * m * m);
    },
  });
}

// ───────────── Challenge ─────────────

function challengeMissing(rng) {
  const a = rng.pick([1, -1, 2, -2, 3, 4]);
  if (rng.bool()) {
    const h = rng.nonzero(-6, 6);
    const c = rng.nonzero(-9, 9);
    const b = -2 * a * h;
    const f = (x) => polyEval([a, b, c], x);
    return q({
      prompt: R`The parabola \(y = ${terms([[a, 'x^{2}'], [1, 'bx'], [c, '']])}\) has the line \(x = ${h}\) as its axis of symmetry. What is the value of \(b\)?`,
      correct: b,
      fmt: (v) => R`\(b = ${num(v)}\)`,
      wrong: [
        { value: -b, why: R`\(-\dfrac{b}{2a} = ${h}\) gives \(-b = ${-b}\). Change the sign once more to get \(b\).` },
        { value: -a * h, why: R`The bottom of the formula is \(2a\), which is \(${2 * a}\) here, not \(a\).` },
        Math.abs(a) === 1 ? null : { value: -2 * h, why: R`Multiply \(${h}\) by \(2a = ${2 * a}\), not just by 2.` },
        a * h,
      ],
      solution: [
        R`The axis of symmetry is \(x = -\dfrac{b}{2a}\), and here \(2a = ${2 * a}\).`,
        R`Set the formula equal to \(${h}\) and multiply both sides by \(${2 * a}\): \(-b = ${dot(2 * a, h)} = ${2 * a * h}\).`,
        R`So \(b = ${b}\). Check: \(-\dfrac{b}{2a} = ${fracTex(-b, 2 * a)} = ${h}\). ✓`,
      ],
      rule: 2, skill: 'working backwards',
      check: () => checkAll(checkEqual(f(h - 1.3), f(h + 1.3)), checkEqual(f(h - 3), f(h + 3))),
    });
  }
  const h = rng.nonzero(-4, 4);
  const k = rng.int(-12, 12);
  const [b, c] = [-2 * a * h, k + a * h * h];
  const f = (x) => polyEval([a, b, c], x);
  const ext = a > 0 ? 'minimum' : 'maximum';
  return q({
    prompt: R`The ${ext} value of \(y = ${terms([[a, 'x^{2}'], [b, 'x'], [1, 'c']])}\) is \(${k}\). What is the value of \(c\)?`,
    correct: c,
    fmt: (v) => R`\(c = ${num(v)}\)`,
    wrong: [
      { value: k, why: R`\(c\) is the value of \(y\) at \(x = 0\). The ${ext} is at the vertex, where \(x = ${h}\).` },
      { value: k - a * h * h, why: R`At \(x = ${h}\) the two \(x\)-terms add up to \(${-a * h * h}\), so \(c ${signed(-a * h * h)} = ${k}\). Undo that to find \(c\).` },
      k - 3 * a * h * h,
      k + 2 * a * h * h,
    ],
    solution: [
      R`The ${ext} is at the vertex: \(x = -\dfrac{b}{2a} = -\dfrac{${paren(b)}}{2(${a})} = ${h}\).`,
      R`At \(x = ${h}\): \(y = ${terms([[a, `(${h})^{2}`], [b, `(${h})`]])} + c = ${terms([[a * h * h, ''], [b * h, '']])} + c = c ${signed(-a * h * h)}\).`,
      R`This must equal \(${k}\): \(c ${signed(-a * h * h)} = ${k}\), so \(c = ${c}\).`,
    ],
    rule: 2, skill: 'working backwards',
    check: () => checkAll(checkEqual(f(h), k), checkEqual(f(h - 1), f(h + 1)), f(h + 1) > k === a > 0 ? true : 'wrong kind of extreme value'),
  });
}

function challengeSymmetry(rng) {
  const h = rng.nonzero(-6, 6);
  const d = rng.int(1, 7) * rng.sign();
  const [x1, x2] = [h + d, h - d];
  if (x1 === 0 || h === 2 * x1) return challengeSymmetry(rng);
  const gap = R`\(${Math.abs(d)}\) ${Math.abs(d) === 1 ? 'unit' : 'units'}`;
  const yAxis = R`That reflects the point across the \(y\)-axis, which is the line \(x = 0\). The mirror line of this parabola is \(x = ${h}\).`;
  if (rng.bool()) {
    const y1 = rng.nonzero(-9, 9);
    const f = (x) => 2 * (x - h) ** 2 + y1 - 2 * d * d; // one parabola with this axis through the point
    return q({
      prompt: R`A parabola has the line \(x = ${h}\) as its axis of symmetry and passes through the point \(${point(x1, y1)}\). Which other point must also be on the parabola?`,
      correct: pt(x2, y1),
      wrong: [
        { value: pt(-x1, y1), why: yAxis },
        { value: pt(x1, -y1), why: R`The mirror line is vertical, so the reflected point keeps the same height, \(y = ${y1}\). Only its \(x\)-coordinate changes.` },
        { value: pt(h - x1, y1), why: R`Find how far \(${point(x1, y1)}\) is from the line \(x = ${h}\), then go the same distance on the other side of the line.` },
        pt(x2, -y1),
      ],
      solution: [
        R`A parabola is a mirror image of itself across its axis of symmetry, \(x = ${h}\).`,
        R`The point \(${point(x1, y1)}\) is ${gap} to the ${d > 0 ? 'right' : 'left'} of that line.`,
        R`Its mirror image is ${gap} to the ${d > 0 ? 'left' : 'right'} of the line, at the same height: \(x = ${h} ${signed(-d)} = ${x2}\).`,
        R`The point \(${point(x2, y1)}\) must also be on the parabola.`,
      ],
      rule: 3, skill: 'using symmetry',
      check: () => checkAll(checkEqual(f(x1), y1), checkEqual(f(x2), y1), checkEqual((x1 + x2) / 2, h)),
    });
  }
  const k = rng.nonzero(-9, 9);
  const mid = (h + x1) / 2;
  return q({
    prompt: R`A parabola has its vertex at \(${point(h, k)}\), and one of its \(x\)-intercepts is \(${point(x1, 0)}\). What is its other \(x\)-intercept?`,
    correct: pt(x2, 0),
    wrong: [
      { value: pt(-x1, 0), why: yAxis },
      Number.isInteger(mid) ? { value: pt(mid, 0), why: R`That is halfway between the vertex and the given intercept. The \(x\)-value of the vertex, \(${h}\), is halfway between the two intercepts.` } : null,
      { value: pt(x1 + d, 0), why: R`That point is on the same side of the line \(x = ${h}\) as the given intercept. The other intercept is on the opposite side.` },
      pt(h - x1, 0),
      pt(2 * h + x1, 0),
    ],
    solution: [
      R`The axis of symmetry passes through the vertex, so it is the line \(x = ${h}\).`,
      R`The intercept \(${point(x1, 0)}\) is ${gap} to the ${d > 0 ? 'right' : 'left'} of that line.`,
      R`The other intercept is the same distance on the other side: \(x = ${h} ${signed(-d)} = ${x2}\).`,
      R`The other \(x\)-intercept is \(${point(x2, 0)}\).`,
    ],
    rule: 3, skill: 'using symmetry',
    check: () => checkRoots((x) => (-k / (d * d)) * (x - h) ** 2 + k, [x1, x2]),
  });
}

function challengeToFactored(rng) {
  const a = rng.pick([1, 1, -1, 2, -2, 3]);
  const d = rng.int(1, 6);
  const h = rng.intExcept(-7, 7, [0, d, -d]);
  const k = -a * d * d;
  const [r, s] = [h - d, h + d];
  const ff = (aa, u, v) => eqn(factoredTex(aa, u, v));
  return q({
    prompt: R`Which equation is the factored form of \(y = ${vertexTex(a, h, k)}\)?`,
    correct: ff(a, r, s),
    wrong: [
      { value: ff(a, -r, -s), why: R`The \(x\)-intercepts are \(x = ${r}\) and \(x = ${s}\). An intercept at \(x = r\) gives the factor \((x - r)\), so each bracket shows the opposite sign.` },
      a === 1 ? null : { value: ff(1, r, s), why: R`Multiplied out, this starts with \(x^2\), but the original starts with \(${terms([[a, 'x^{2}']])}\). Keep the factor \(${a}\) in front.` },
      d === 1 ? null : { value: ff(a, h - d * d, h + d * d), why: R`From \(${sq(h)} = ${d * d}\), take the square root of both sides: \(${linear(1, -h)} = \pm ${d}\).` },
      ff(a, -r, s),
      ff(a, h, k),
    ],
    solution: [
      R`Find the \(x\)-intercepts by setting \(y = 0\): \(${terms([[a, sq(h)]])} = ${-k}\)${a === 1 ? '' : R`, so \(${sq(h)} = ${d * d}\)`}.`,
      R`Take the square root of both sides: \(${linear(1, -h)} = \pm ${d}\), so \(x = ${r}\) or \(x = ${s}\).`,
      R`Each intercept gives a factor, and the coefficient of \(x^2\) is still \(${a}\): \(y = ${factoredTex(a, r, s)}\).`,
    ],
    rule: 4, skill: 'converting to factored form',
    check: () => checkSame((x) => a * (x - h) ** 2 + k, (x) => a * (x - r) * (x - s)),
  });
}

// ───────────── Interactive models ─────────────

function standardModel({ a, b, c }) {
  if (a === 0) return { error: 'With a = 0 there is no x² term, so the graph is a straight line, not a parabola. Give a a value other than 0.' };
  const h = frac(-b, 2 * a);
  const k = frac(4 * a * c - b * b, 4 * a);
  const D = b * b - 4 * a * c;
  const up = a > 0;
  const f = (x) => a * x * x + b * x + c;
  const hx = h.isInt() && h.n >= 0 ? `(${h.tex()})` : `\\left(${h.tex()}\\right)`;
  const root = Math.sqrt(Math.max(D, 0));
  const xs = D > 0 ? [(-b - root) / (2 * a), (-b + root) / (2 * a)].sort((u, v) => u - v) : D === 0 ? [h.value] : [];
  const solve = R`\(x\)-intercepts: solve \(${poly([a, b, c])} = 0\). The discriminant is \(b^2 - 4ac = ${D}\)`;
  const crossing = D < 0 ? R`${solve}, which is negative, so there are no real solutions. The graph never crosses the \(x\)-axis.`
    : D === 0 ? R`${solve}, so there is exactly one solution, \(x = ${h.tex()}\). The vertex sits on the \(x\)-axis.`
    : isSquare(D) ? R`${solve}, and \(\sqrt{${D}} = ${root}\), so the solutions are \(${rootsTex([frac(-b - root, 2 * a), frac(-b + root, 2 * a)])}\).`
    : R`${solve}, so \(x = \dfrac{-b \pm \sqrt{${D}}}{2a}\): \(x \approx ${num(xs[0], { places: 2 })}\) or \(x \approx ${num(xs[1], { places: 2 })}\).`;
  // The window keeps the vertex, both axes and the x-intercepts in view, and stops a steep parabola from flattening the picture.
  const half = Math.min(12, Math.max(4, Math.abs(h.value) + 1, ...xs.map((x) => Math.abs(x - h.value) + 2)));
  const [lo, hi] = [Math.floor(h.value - half), Math.ceil(h.value + half)];
  const top = up ? Math.min(Math.max(f(lo), f(hi)), Math.max(k.value, c, 0) + 30) : Math.max(k.value, 0);
  const bottom = up ? Math.min(k.value, 0) : Math.max(Math.min(f(lo), f(hi)), Math.min(k.value, c, 0) - 30);
  const pad = (top - bottom) * 0.15;
  return {
    problem: R`Find the key features of \(y = ${poly([a, b, c])}\).`,
    steps: [
      R`\(a = ${a}\) is ${up ? 'positive' : 'negative'}, so the parabola opens ${up ? 'upward' : 'downward'} and its vertex is a ${up ? 'minimum' : 'maximum'}.`,
      b === 0 ? R`There is no \(x\)-term (\(b = 0\)), so the axis of symmetry is the \(y\)-axis: \(x = 0\).` : R`Axis of symmetry: \(x = -\dfrac{b}{2a} = -\dfrac{${paren(b)}}{2(${a})} = ${h.tex()}\).`,
      R`Vertex: substitute \(x = ${h.tex()}\). \(y = ${terms([[a, `${hx}^{2}`], [b, hx], [c, '']])} = ${k.tex()}\), so the vertex is \(${point(h, k)}\).`,
      R`\(y\)-intercept: at \(x = 0\), \(y = ${c}\). The point is \((0, ${c})\).`,
      crossing,
      R`Vertex form: \(y = ${vertexTex(a, h, k)}\).`,
    ],
    answer: R`Vertex \(${point(h, k)}\); axis of symmetry \(x = ${h.tex()}\); opens ${up ? 'upward' : 'downward'}; \(y\)-intercept \((0, ${c})\)`,
    visual: {
      type: 'plot', x: [lo, hi], y: [Math.floor(bottom - pad), Math.ceil(top + pad)], fns: [{ f }], vlines: [{ x: h.value }],
      points: [
        ...xs.map((x) => ({ x, y: 0, color: 'c' })),
        ...(b === 0 ? [] : [{ x: 0, y: c, color: 'b', label: Math.abs(h.value) < half / 4 ? undefined : pointText(0, c) }]),
        ...vertexDot(h.value, k.value, pointText(h, k), up),
      ],
      alt: `Graph of a parabola that opens ${up ? 'upward' : 'downward'} with vertex ${pointText(h, k)} and a dashed axis of symmetry. It crosses the y-axis at ${txt(c)}${xs.length ? ` and ${xs.length === 1 ? 'touches' : 'crosses'} the x-axis ${xs.length === 1 ? 'once' : 'twice'}` : ' and does not reach the x-axis'}.`,
    },
  };
}

function transformModel({ a, h, k }) {
  if (a === 0) return { error: 'With a = 0 the x² term disappears and the graph is a horizontal line. Choose a value of a other than 0.' };
  const mag = Math.abs(a);
  const f = (x) => a * (x - h) ** 2 + k;
  const stretch = mag === 1 ? '' : R`Every \(y\)-value is multiplied by \(${num(mag)}\), so the graph is ${mag > 1 ? 'stretched away from' : 'squeezed toward'} the \(x\)-axis and looks ${mag > 1 ? 'narrower' : 'wider'}.`;
  return {
    problem: R`Describe how \(y = ${vertexTex(a, h, k)}\) is obtained from \(y = x^2\).`,
    steps: [
      R`Start from \(y = x^2\), a parabola that opens upward with its vertex at \((0, 0)\).`,
      a === 1 ? R`\(a = 1\), so the shape does not change.` : `${a < 0 ? R`\(a\) is negative, so the graph is reflected over the \(x\)-axis and opens downward.` : ''} ${stretch}`.trim(),
      h === 0 ? R`\(h = 0\), so there is no shift left or right.` : R`\(${sq(h)}\) replaces \(x\) with \(${linear(1, -h)}\), which shifts the graph ${units(h)} to the ${h > 0 ? 'right' : 'left'}.`,
      k === 0 ? R`\(k = 0\), so there is no shift up or down.` : R`${k > 0 ? 'Adding' : 'Subtracting'} \(${Math.abs(k)}\) shifts the graph ${units(k)} ${k > 0 ? 'up' : 'down'}.`,
      R`The vertex moves from \((0, 0)\) to \(${point(h, k)}\). Multiplied out, the equation is \(y = ${poly([a, -2 * a * h, a * h * h + k])}\).`,
    ],
    answer: R`Vertex \(${point(h, k)}\), axis of symmetry \(x = ${h}\), opens ${a > 0 ? 'upward' : 'downward'}`,
    visual: {
      type: 'plot', x: [Math.min(h, 0) - 5, Math.max(h, 0) + 5], y: [Math.min(-2, k - (a < 0 ? 12 : 4)), Math.max(12, k + (a > 0 ? 12 : 4))],
      fns: [{ f: (x) => x * x, dashed: true, color: 'b', label: 'y = x²' }, { f, color: 'a' }],
      points: vertexDot(h, k, pointText(h, k), a > 0),
      alt: `Graph of y = x² as a dashed curve, and the transformed parabola with vertex ${pointText(h, k)}, which opens ${a > 0 ? 'upward' : 'downward'}.`,
    },
  };
}

function throwModel({ v, h0 }) {
  const f = (t) => -5 * t * t + v * t + h0;
  const [tTop, top] = [v / 10, h0 + (v * v) / 20];
  const disc = v * v + 20 * h0;
  const tLand = (v + Math.sqrt(disc)) / 10;
  const n2 = (x) => num(x, { places: 2 });
  const t2 = (x) => txt(x, { places: 2 });
  const exact = isSquare(disc);
  return {
    problem: R`A ball is thrown straight up at ${v} m/s from a height of ${h0} m. After \(t\) seconds its height in metres is \(h = ${poly([-5, v, h0], 't')}\). How high does the ball go, and when does it land?`,
    steps: [
      R`The coefficient of \(t^2\) is \(-5\), which is negative. The graph opens downward, so its vertex is the highest point.`,
      R`Time at the vertex: \(t = -\dfrac{b}{2a} = -\dfrac{${v}}{2(-5)} = ${n2(tTop)}\) seconds.`,
      R`Greatest height: \(h = ${terms([[-5, `(${n2(tTop)})^{2}`], [v, `(${n2(tTop)})`], [h0, '']])} = ${n2(top)}\) metres.`,
      h0 === 0
        ? R`The ball is on the ground when \(h = 0\): \(${poly([-5, v, 0], 't')} = 0\) factors as \(-5t(t - ${n2(v / 5)}) = 0\), so \(t = 0\) (the throw) or \(t = ${n2(v / 5)}\) (the landing).`
        : R`The ball lands when \(h = 0\). The quadratic formula gives \(t ${exact ? '=' : R`\approx`} ${n2(tLand)}\) seconds. The other solution is negative, before the throw, so it is ignored.`,
    ],
    answer: `Greatest height ${t2(top)} m, after ${t2(tTop)} s. The ball lands after ${exact ? '' : 'about '}${t2(tLand)} s.`,
    visual: {
      type: 'plot', x: [0, Math.ceil(tLand + 0.5)], y: [0, Math.ceil(top * 1.15 + 1)], axisLabels: ['t', 'h'], fns: [{ f, domain: [0, tLand] }],
      points: [{ x: tTop, y: top, label: `(${t2(tTop)}, ${t2(top)})` }, { x: tLand, y: 0, color: 'b' }],
      alt: `Graph of the height of the ball against time: a parabola opening downward that starts at ${h0} m, peaks at ${t2(top)} m after ${t2(tTop)} seconds, and reaches the ground after ${t2(tLand)} seconds.`,
    },
  };
}

export default {
  id: 'quadratic-functions',
  title: 'Quadratic Functions & Parabolas',
  summary: 'Read the vertex, axis, intercepts and direction of a parabola from any form, change forms, and find maximum and minimum values.',
  standards: ['CCSS F-IF.B.4', 'CCSS F-IF.C.7', 'CCSS F-IF.C.8', 'CCSS F-BF.B.3'],

  explain: {
    intro: R`A quadratic function has \(x^2\) as its highest power, and its graph is a U-shaped curve called a parabola. Every parabola has one turning point, the vertex, and is a mirror image of itself across the vertical line through the vertex. The same function can be written in three forms, and each form makes different features easy to read.`,
    rules: [
      {
        title: 'The sign of a sets the direction',
        text: R`In \(y = ax^2 + bx + c\), if \(a\) is positive the parabola opens upward and the vertex is its lowest point, a minimum. If \(a\) is negative it opens downward and the vertex is its highest point, a maximum. The larger the size of \(a\), the narrower the parabola.`,
        example: R`\(y = -2x^2 + 3\) opens downward, so it has a maximum. \(y = 5 - x + x^2\) opens upward, because the coefficient of \(x^2\) is \(1\).`,
      },
      {
        title: 'Vertex form: y = a(x − h)² + k',
        text: R`The vertex is \((h, k)\) and the axis of symmetry is the vertical line \(x = h\). The form has a minus sign built in, so \((x + 3)^2\) means \(h = -3\).`,
        example: R`\(y = 2(x - 3)^2 + 1\) has vertex \((3, 1)\). \(y = (x + 3)^2 - 4\) has vertex \((-3, -4)\).`,
      },
      {
        title: 'Standard form: y = ax² + bx + c',
        text: R`The axis of symmetry is \(x = -\dfrac{b}{2a}\). Substitute that \(x\)-value into the equation to get the \(y\)-coordinate of the vertex. The \(y\)-intercept is \((0, c)\).`,
        example: R`\(y = x^2 - 6x + 5\): the axis is \(x = \frac{6}{2} = 3\), and \(y = 3^2 - 6(3) + 5 = -4\), so the vertex is \((3, -4)\). The \(y\)-intercept is \((0, 5)\).`,
      },
      {
        title: 'Factored form: y = a(x − r)(x − s)',
        text: R`The graph crosses the \(x\)-axis at \(x = r\) and \(x = s\), the values that make a bracket zero. The axis of symmetry is halfway between them, at \(x = \dfrac{r + s}{2}\).`,
        example: R`\(y = (x - 1)(x - 5)\) crosses the \(x\)-axis at 1 and 5, so its axis is \(x = 3\). Then \(y = (2)(-2) = -4\), so the vertex is \((3, -4)\).`,
      },
      {
        title: 'Changing from one form to another',
        text: R`Multiply out vertex form or factored form to get standard form. To go from standard form to vertex form, complete the square. To get factored form, factor the expression, or find the \(x\)-intercepts and keep the same \(a\).`,
        example: R`\(y = x^2 - 6x + 5 = (x^2 - 6x + 9) - 9 + 5 = (x - 3)^2 - 4\). Factoring the same expression gives \(y = (x - 1)(x - 5)\).`,
      },
      {
        title: 'Transformations of y = x²',
        text: R`\(y = a(x - h)^2 + k\) is the graph of \(y = x^2\) after three changes. It is stretched vertically by the size of \(a\), and reflected over the \(x\)-axis if \(a\) is negative. It is shifted \(h\) units right (left if \(h\) is negative). It is shifted \(k\) units up (down if \(k\) is negative).`,
        example: R`\(y = -(x - 3)^2 + 2\): reflect \(y = x^2\) over the \(x\)-axis, then shift it 3 right and 2 up. The vertex moves to \((3, 2)\).`,
      },
      {
        title: 'Maximum and minimum in a story',
        text: R`When a quantity is modelled by a quadratic, its greatest or least value is the \(y\)-coordinate of the vertex. The \(x\)-coordinate of the vertex tells you where or when that happens. Check which of the two the question asks for.`,
        example: R`\(h = -5t^2 + 20t + 2\) has its vertex at \(t = 2\), where \(h = 22\). The greatest height is 22 m, reached after 2 seconds.`,
      },
    ],
    vocab: [
      { term: 'parabola', def: 'The U-shaped graph of a quadratic function.' },
      { term: 'vertex', def: 'The turning point of a parabola: its lowest point if it opens upward, its highest point if it opens downward.' },
      { term: 'axis of symmetry', def: 'The vertical line through the vertex. The two halves of the parabola are mirror images across it.' },
      { term: 'x-intercepts (zeros)', def: R`The points where the graph crosses the \(x\)-axis. Their \(x\)-values make \(y = 0\).` },
      { term: 'maximum or minimum value', def: R`The greatest or least value the function reaches: the \(y\)-coordinate of the vertex.` },
      { term: 'completing the square', def: R`Rewriting \(x^2 + bx\) as a perfect square minus a constant: \(x^2 + 6x = (x + 3)^2 - 9\).` },
    ],
    mistakes: [
      R`Reading \((x + 3)^2\) as \(h = 3\). Vertex form is \((x - h)^2\), and \(x + 3 = x - (-3)\), so \(h = -3\).`,
      R`Dropping the negative sign in \(x = -\dfrac{b}{2a}\), or dividing by \(a\) instead of \(2a\).`,
      R`Giving the \(x\)-coordinate of the vertex when the question asks for the maximum or minimum **value**, which is the \(y\)-coordinate.`,
      R`Expanding \((x - 3)^2\) as \(x^2 + 9\) or \(x^2 - 9\). It is \((x - 3)(x - 3) = x^2 - 6x + 9\).`,
      R`Completing the square when \(a\) is not 1 and forgetting that the number added inside the bracket gets multiplied by \(a\).`,
    ],
    visual: {
      type: 'plot', x: [-2, 8], y: [-6, 9], step: [1, 1],
      fns: [{ f: (x) => x * x - 6 * x + 5, label: 'y = x² − 6x + 5', labelAt: 6.1 }],
      vlines: [{ x: 3 }],
      points: [{ x: 1, y: 0, color: 'c' }, { x: 5, y: 0, color: 'c' }, { x: 0, y: 5, color: 'b', label: '(0, 5)' }, ...vertexDot(3, -4, 'vertex (3, −4)', true)],
      alt: 'Graph of y = x² − 6x + 5, a parabola opening upward. Its vertex is (3, −4), the dashed axis of symmetry is x = 3, it crosses the x-axis at 1 and 5, and it crosses the y-axis at (0, 5).',
    },
  },

  examples: [
    {
      title: 'Key features from standard form',
      problem: R`Find the direction, axis of symmetry, vertex and intercepts of \(y = x^2 - 6x + 5\).`,
      steps: [
        R`\(a = 1\) is positive, so the parabola opens upward and the vertex is a minimum.`,
        R`Axis of symmetry: \(x = -\frac{b}{2a} = \frac{6}{2} = 3\).`,
        R`Vertex: \(y = 3^2 - 6(3) + 5 = 9 - 18 + 5 = -4\), so the vertex is \((3, -4)\).`,
        R`\(y\)-intercept: \((0, 5)\), the constant term.`,
        R`\(x\)-intercepts: \(x^2 - 6x + 5 = (x - 1)(x - 5) = 0\) gives \(x = 1\) and \(x = 5\). The axis, \(x = 3\), is halfway between them. ✓`,
      ],
      answer: R`Opens upward; axis \(x = 3\); vertex \((3, -4)\); intercepts \((0, 5)\), \((1, 0)\) and \((5, 0)\)`,
    },
    {
      title: 'The vertex from factored form',
      problem: R`Find the vertex of \(y = -2(x + 1)(x - 5)\), then write the function in standard form.`,
      steps: [
        R`The brackets are zero at \(x = -1\) and \(x = 5\). Those are the \(x\)-intercepts.`,
        R`The axis of symmetry is halfway between them: \(x = \frac{-1 + 5}{2} = 2\).`,
        R`Substitute \(x = 2\): \(y = -2(2 + 1)(2 - 5) = -2(3)(-3) = 18\). The vertex is \((2, 18)\), a maximum because \(a = -2\).`,
        R`Standard form: \((x + 1)(x - 5) = x^2 - 4x - 5\). Multiply by \(-2\): \(y = -2x^2 + 8x + 10\).`,
      ],
      answer: R`Vertex \((2, 18)\); \(y = -2x^2 + 8x + 10\)`,
    },
    {
      title: 'Standard form to vertex form',
      problem: R`Write \(y = 2x^2 - 12x + 13\) in vertex form by completing the square.`,
      steps: [
        R`Factor 2 out of the two \(x\)-terms: \(y = 2(x^2 - 6x) + 13\).`,
        R`Half of \(-6\) is \(-3\), and \((-3)^2 = 9\). Add 9 inside the bracket. That changes the expression by \(2 \cdot 9 = 18\), so subtract 18 outside: \(y = 2(x^2 - 6x + 9) + 13 - 18\).`,
        R`Write the bracket as a square and combine the constants: \(y = 2(x - 3)^2 - 5\).`,
        R`Check by expanding: \(2(x^2 - 6x + 9) - 5 = 2x^2 - 12x + 13\). ✓`,
      ],
      answer: R`\(y = 2(x - 3)^2 - 5\), with vertex \((3, -5)\)`,
    },
    {
      title: 'Reading a transformation',
      problem: R`Describe how the graph of \(y = -(x + 5)^2 + 2\) is obtained from the graph of \(y = x^2\).`,
      steps: [
        R`Compare with \(y = a(x - h)^2 + k\): \(a = -1\), \(h = -5\) (because \(x + 5 = x - (-5)\)) and \(k = 2\).`,
        R`\(a = -1\): the graph is reflected over the \(x\)-axis, so it opens downward.`,
        R`\(h = -5\): it is shifted 5 units left. \(k = 2\): it is shifted 2 units up.`,
        R`The vertex moves from \((0, 0)\) to \((-5, 2)\).`,
      ],
      answer: R`Reflect over the \(x\)-axis, then shift 5 units left and 2 units up`,
      visual: {
        type: 'plot', x: [-9, 4], y: [-6, 8], step: [1, 2],
        fns: [{ f: (x) => x * x, dashed: true, color: 'b', label: 'y = x²', labelAt: 2.2 }, { f: (x) => -((x + 5) ** 2) + 2, color: 'a' }],
        points: [{ x: 0, y: 0, color: 'b' }, { x: -5, y: 2, label: '(−5, 2)' }],
        alt: 'Graph of y = x² as a dashed curve with vertex (0, 0), and the parabola y = −(x + 5)² + 2, which opens downward from its vertex at (−5, 2).',
      },
    },
    {
      title: 'Word problem: the highest point of a throw',
      word: true,
      problem: R`A ball is thrown upward from a balcony. After \(t\) seconds its height in metres is \(h = -5t^2 + 20t + 2\). What is the greatest height the ball reaches, and when?`,
      steps: [
        R`The height is a quadratic function of time. The coefficient of \(t^2\) is negative, so the graph opens downward and the vertex is the highest point.`,
        R`Time at the vertex: \(t = -\frac{b}{2a} = -\frac{20}{2(-5)} = 2\) seconds.`,
        R`Height at that time: \(h = -5(2)^2 + 20(2) + 2 = -20 + 40 + 2 = 22\).`,
        'The question asks for both numbers: 22 is the greatest height (the maximum value), and 2 is when it happens.',
      ],
      answer: 'The greatest height is 22 m, reached after 2 seconds',
      visual: {
        type: 'plot', x: [0, 5], y: [0, 26], axisLabels: ['t', 'h'],
        fns: [{ f: (t) => -5 * t * t + 20 * t + 2, domain: [0, 4.1] }],
        points: [{ x: 2, y: 22, label: '(2, 22)' }, { x: 0, y: 2, color: 'b', label: '(0, 2)' }],
        alt: 'Graph of height against time: a parabola opening downward that starts at (0, 2), peaks at (2, 22) and comes back down to the ground just after 4 seconds.',
      },
    },
  ],

  models: [
    {
      id: 'standard-form',
      title: 'Key features of y = ax² + bx + c',
      intro: 'Choose a, b and c. Try a negative a, or values that keep the graph off the x-axis.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x²)', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'b', label: 'b (coefficient of x)', type: 'int', min: -12, max: 12, value: -6 },
        { name: 'c', label: 'c (constant term)', type: 'int', min: -20, max: 20, value: 5 },
      ],
      compute: standardModel,
    },
    {
      id: 'vertex-form',
      title: 'Transforming y = x² into y = a(x − h)² + k',
      intro: 'Change a, h and k one at a time and watch how the solid curve moves away from the dashed one.',
      inputs: [
        { name: 'a', label: 'a (stretch and direction)', type: 'number', min: -4, max: 4, step: 0.5, value: -1 },
        { name: 'h', label: 'h (shift right)', type: 'int', min: -8, max: 8, value: 3 },
        { name: 'k', label: 'k (shift up)', type: 'int', min: -8, max: 8, value: 2 },
      ],
      compute: transformModel,
    },
    {
      id: 'thrown-ball',
      title: 'Word problem: how high does the ball go?',
      word: true,
      intro: 'Change the speed of the throw and the height it starts from.',
      inputs: [
        { name: 'v', label: 'Upward speed at the start (m/s)', type: 'int', min: 5, max: 40, value: 20 },
        { name: 'h0', label: 'Starting height (m)', type: 'int', min: 0, max: 50, value: 2 },
      ],
      compute: throwModel,
    },
  ],

  quiz: {
    easy: [easyVertexForm, easyOpens, easyIntercepts, easyGraph],
    medium: [mediumVertexStandard, mediumTransform, mediumMaxStory],
    hard: [hardCompleteSquare, hardFactoredVertex, hardFromGraph, hardFenceStory],
    challenge: [challengeMissing, challengeSymmetry, challengeToFactored],
  },
};
