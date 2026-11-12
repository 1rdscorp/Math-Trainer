import { R, q, frac, num, terms, power, over, numPartial, checkEqual } from '../../lib/index.js';
import { M, mpTex, mpEval, mpD, mpAdd, mpScale, piTex } from './_shared.js';

const fn = (p) => (x, y) => mpEval(p, x, y);
/** Second partial derivative by nested central differences: variables a then b (0 = x, 1 = y). */
const num2 = (f, pt, a, b) => numPartial((x, y) => numPartial(f, [x, y], a, 1e-4), pt, b, 1e-4);
const PAIRS = [[1, 0], [2, 0], [3, 0], [0, 1], [0, 2], [0, 3], [1, 1], [2, 1], [1, 2], [2, 2], [3, 1], [1, 3], [3, 2], [2, 3]];
/** Three terms c·xⁱyʲ, at least one of them containing both variables, highest total degree first. */
function randPoly2(rng) {
  let e;
  do e = rng.sample(PAIRS, 3);
  while (!e.some(([i, j]) => i && j) || !e.some(([i]) => i >= 2) || !e.some(([, j]) => j >= 2));
  return e.sort((a, b) => b[0] + b[1] - a[0] - a[1]).map(([i, j]) => [rng.nonzero(-6, 6), i, j]);
}

// ───────────── Easy ─────────────

function easyPartialPoly(rng) {
  const p = randPoly2(rng);
  const v = rng.int(0, 1);
  const [name, other] = v === 0 ? ['x', 'y'] : ['y', 'x'];
  const ans = mpD(p, v);
  const stay = p.filter((t) => t[1 + v] === 0);
  const noDrop = p.filter((t) => t[1 + v] > 0).map(([c, i, j]) => [c * [i, j][v], i, j]);
  return q({
    prompt: R`Find \(f_{${name}}(x, y)\) for \(f(x, y) = ${mpTex(p)}\).`,
    correct: M(mpTex(ans)),
    wrong: [
      { value: M(mpTex(mpD(p, 1 - v))), why: R`That is \(f_{${other}}\). Hold \(${other}\) constant and differentiate with respect to \(${name}\).` },
      stay.length ? { value: M(mpTex(mpAdd(ans, stay))), why: R`A term with no \(${name}\) in it is a constant here, so its derivative is 0.` } : null,
      { value: M(mpTex(noDrop)), why: R`After multiplying by the exponent, lower the power of \(${name}\) by 1.` },
      M(mpTex(mpAdd(mpD(p, 0), mpD(p, 1)))),
      M(mpTex(mpScale(ans, -1))),
    ],
    solution: [
      R`Treat \(${other}\) as a constant and differentiate each term with respect to \(${name}\).`,
      `${p.map((t) => R`\(${mpTex([t])} \to ${mpTex(mpD([t], v))}\)`).join(', ')}.`,
      R`\(f_{${name}}(x, y) = ${mpTex(ans)}\).`,
    ],
    rule: 3,
    skill: 'first partial derivatives',
    check: () => checkEqual(mpEval(ans, 0.7, -1.2), numPartial(fn(p), [0.7, -1.2], v), 1e-5, 'partial derivative'),
  });
}

const LEVEL_CURVES = [
  (rng) => {
    const r = rng.int(2, 9);
    return { f: 'x^{2} + y^{2}', c: r * r, correct: R`a circle of radius \(${r}\) centered at the origin`, wrong: [{ value: R`a circle of radius \(${r * r}\) centered at the origin`, why: R`\(x^{2} + y^{2} = ${r * r}\) is a circle of radius \(\sqrt{${r * r}} = ${r}\).` }, R`a parabola with vertex \((0, ${r})\)`, R`a line with slope \(${-r}\)`], how: R`\(x^{2} + y^{2} = ${r * r}\) is a circle centered at the origin with radius \(\sqrt{${r * r}} = ${r}\).` };
  },
  (rng) => {
    const c = rng.pick([2, 3, 5, 6, 7, 8]);
    return { f: '\\sqrt{x^{2} + y^{2}}', c, correct: R`a circle of radius \(${c}\) centered at the origin`, wrong: [{ value: R`a circle of radius \(${c * c}\) centered at the origin`, why: R`Squaring both sides gives \(x^{2} + y^{2} = ${c * c}\), a circle of radius \(${c}\).` }, R`a circle of radius \(\sqrt{${c}}\) centered at the origin`, R`a line with slope \(${c}\)`], how: R`Square both sides: \(x^{2} + y^{2} = ${c * c}\), a circle centered at the origin with radius \(${c}\).` };
  },
  (rng) => {
    const a = rng.int(1, 4);
    const c = rng.nonzero(-6, 6);
    return { f: terms([[1, 'y'], [-a, 'x^{2}']]), c, correct: R`a parabola with vertex \((0, ${c})\)`, wrong: [{ value: R`a parabola with vertex \((${c}, 0)\)`, why: R`Solve for \(y\): \(y = ${terms([[a, 'x^{2}'], [c, '']])}\). The constant shifts the parabola up or down.` }, R`a line with slope \(${a}\)`, R`a circle of radius \(${Math.abs(c)}\) centered at the origin`], how: R`Solve for \(y\): \(y = ${terms([[a, 'x^{2}'], [c, '']])}\), a parabola with vertex \((0, ${c})\).` };
  },
  (rng) => {
    const a = rng.nonzero(-5, 5);
    const b = rng.intExcept(-5, 5, [0, a, -a]);
    const c = rng.int(-6, 6);
    return { f: terms([[a, 'x'], [b, 'y']]), c, correct: R`a line with slope \(${frac(-a, b).tex()}\)`, wrong: [{ value: R`a line with slope \(${frac(a, b).tex()}\)`, why: R`Solve for \(y\): \(${terms([[b, 'y']])} = ${terms([[-a, 'x'], [c, '']])}\). The \(x\)-term changes sign when it moves across.` }, R`a line with slope \(${frac(-b, a).tex()}\)`, 'a parabola with its vertex at the origin', R`a line with slope \(${frac(b, a).tex()}\)`], how: R`Solve for \(y\): \(y = ${terms([[frac(-a, b), 'x'], [frac(c, b), '']])}\), a line with slope \(${frac(-a, b).tex()}\).` };
  },
  (rng) => {
    const a = rng.int(2, 5);
    const b = rng.intExcept(2, 5, [a]);
    return { f: terms([[b * b, 'x^{2}'], [a * a, 'y^{2}']]), c: a * a * b * b, correct: R`an ellipse with \(x\)-intercepts \(\pm ${a}\) and \(y\)-intercepts \(\pm ${b}\)`, wrong: [{ value: R`an ellipse with \(x\)-intercepts \(\pm ${b}\) and \(y\)-intercepts \(\pm ${a}\)`, why: R`Set \(y = 0\) to find the \(x\)-intercepts: \(${b * b}x^{2} = ${a * a * b * b}\).` }, R`a circle of radius \(${a * b}\) centered at the origin`, R`a hyperbola with vertices \((\pm ${a}, 0)\)`], how: R`Divide by \(${a * a * b * b}\): \(\dfrac{x^{2}}{${a * a}} + \dfrac{y^{2}}{${b * b}} = 1\), an ellipse with \(x\)-intercepts \(\pm ${a}\) and \(y\)-intercepts \(\pm ${b}\).` };
  },
  (rng) => {
    const c = rng.nonzero(-9, 9);
    return { f: 'xy', c, correct: 'a hyperbola with the coordinate axes as asymptotes', wrong: [{ value: 'a line through the origin', why: R`\(xy = ${c}\) means \(y = \dfrac{${c}}{x}\), which is not a line.` }, 'a circle centered at the origin', 'a parabola with its vertex at the origin'], how: R`\(y = \dfrac{${c}}{x}\): a hyperbola that approaches both coordinate axes.` };
  },
];

function easyLevelCurve(rng) {
  const k = rng.pick(LEVEL_CURVES)(rng);
  return q({
    prompt: R`The level curve \(f(x, y) = ${k.c}\) of \(f(x, y) = ${k.f}\) is:`,
    correct: k.correct,
    wrong: k.wrong,
    solution: [R`A level curve is the set of points where \(f\) takes one fixed value. Here: \(${k.f} = ${k.c}\).`, k.how],
    rule: 1,
    skill: 'level curves',
  });
}

const DOMAINS = [
  (rng) => {
    const c = rng.int(-5, 5);
    const s = terms([[1, 'x'], [1, 'y'], [-c, '']]);
    return { f: `\\sqrt{${s}}`, ans: `x + y \\ge ${c}`, wrong: [[`x + y > ${c}`, 'A square root is defined when the inside is 0, so the boundary line is part of the domain.'], [`x + y \\le ${c}`], [`x \\ge ${c} \\text{ and } y \\ge ${c}`]], why: R`A square root needs \(${s} \ge 0\).`, js: (x, y) => Math.sqrt(x + y - c), ok: (x, y) => x + y >= c, pts: [[c, 0], [c + 1, 0], [c - 1, 0], [0, 0]] };
  },
  (rng) => {
    const c = rng.int(-5, 5);
    const s = terms([[1, 'x'], [1, 'y'], [-c, '']]);
    return { f: `\\ln(${s})`, ans: `x + y > ${c}`, wrong: [[`x + y \\ge ${c}`, R`\(\ln 0\) is not defined, so the boundary line is not part of the domain.`], [`x + y < ${c}`], [`x + y \\ne ${c}`]], why: R`A logarithm needs \(${s} > 0\).`, js: (x, y) => Math.log(x + y - c), ok: (x, y) => x + y > c, pts: [[c, 0], [c + 1, 0], [c - 1, 0], [0, 0]] };
  },
  (rng) => {
    const r = rng.int(1, 6);
    return { f: `\\dfrac{1}{x^{2} + y^{2} - ${r * r}}`, ans: `x^{2} + y^{2} \\ne ${r * r}`, wrong: [[`x^{2} + y^{2} > ${r * r}`, 'Points inside the circle are allowed too. Only the circle itself makes the denominator 0.'], [`(x, y) \\ne (${r}, ${r})`], [`x^{2} + y^{2} \\ge ${r * r}`]], why: R`The denominator cannot be 0, so \(x^{2} + y^{2} \ne ${r * r}\): every point except those on the circle of radius \(${r}\).`, js: (x, y) => 1 / (x * x + y * y - r * r), ok: (x, y) => x * x + y * y !== r * r, pts: [[r, 0], [0, -r], [0, 0], [r + 1, 0], [r, r]] };
  },
  (rng) => {
    const r = rng.int(1, 6);
    return { f: `\\sqrt{${r * r} - x^{2} - y^{2}}`, ans: `x^{2} + y^{2} \\le ${r * r}`, wrong: [[`x^{2} + y^{2} < ${r * r}`, 'The square root of 0 is defined, so the boundary circle is included.'], [`x^{2} + y^{2} \\ge ${r * r}`], [`x \\le ${r} \\text{ and } y \\le ${r}`]], why: R`A square root needs \(${r * r} - x^{2} - y^{2} \ge 0\): the disk of radius \(${r}\), boundary included.`, js: (x, y) => Math.sqrt(r * r - x * x - y * y), ok: (x, y) => x * x + y * y <= r * r, pts: [[r, 0], [0, 0], [r + 1, 0], [-r, -r]] };
  },
  (rng) => {
    const r = rng.int(1, 6);
    return { f: `\\ln(${r * r} - x^{2} - y^{2})`, ans: `x^{2} + y^{2} < ${r * r}`, wrong: [[`x^{2} + y^{2} \\le ${r * r}`, R`\(\ln 0\) is not defined, so the boundary circle is excluded.`], [`x^{2} + y^{2} > ${r * r}`], [`x^{2} + y^{2} \\ne ${r * r}`]], why: R`A logarithm needs \(${r * r} - x^{2} - y^{2} > 0\): the inside of the circle of radius \(${r}\).`, js: (x, y) => Math.log(r * r - x * x - y * y), ok: (x, y) => x * x + y * y < r * r, pts: [[r, 0], [0, 0], [r + 1, 0], [-r, -r]] };
  },
  (rng) => {
    const c = rng.nonzero(-9, 9);
    const m = rng.int(1, 4);
    const line = terms([[m, 'x']]);
    return { f: `\\dfrac{${c}}{${terms([[1, 'y'], [-m, 'x']])}}`, ans: `y \\ne ${line}`, wrong: [[`(x, y) \\ne (0, 0)`, R`The denominator is 0 at every point of the line \(y = ${line}\), not only at the origin.`], [`y > ${line}`], [`x \\ne 0 \\text{ and } y \\ne 0`]], why: R`The denominator cannot be 0, so \(y \ne ${line}\): every point off that line.`, js: (x, y) => c / (y - m * x), ok: (x, y) => y !== m * x, pts: [[0, 0], [1, m], [1, 0], [0, 2], [-2, -2 * m]] };
  },
];

function easyDomain(rng) {
  const k = rng.pick(DOMAINS)(rng);
  return q({
    prompt: R`Find the domain of \(f(x, y) = ${k.f}\).`,
    correct: M(k.ans),
    wrong: k.wrong.map(([tex, why]) => (why ? { value: M(tex), why } : M(tex))),
    solution: ['The domain is the set of points (x, y) at which the formula can be evaluated.', k.why, R`Domain: \(${k.ans}\).`],
    rule: 0,
    skill: 'domain',
    check: () => (k.pts.every(([x, y]) => Number.isFinite(k.js(x, y)) === k.ok(x, y)) ? true : 'domain is wrong at a test point'),
  });
}

// ───────────── Medium ─────────────

function mediumPartialChain(rng) {
  const a = rng.int(2, 6);
  const n = rng.int(2, 5);
  const kind = rng.int(0, 3);
  const b = kind === 3 ? rng.intExcept(2, 6, [a]) : rng.pick([-1, 1]) * rng.intExcept(2, 6, [a]);
  const u = terms([[a, 'x'], [b, 'y']]);
  // f = g(ax + by); d(c) is LaTeX for c·g′(ax + by) and gp is g′ as a function
  const g = [
    { f: `e^{${u}}`, d: (c) => terms([[c, `e^{${u}}`]]), js: Math.exp, gp: Math.exp, rule: R`\(\dfrac{d}{du}e^{u} = e^{u}\)` },
    { f: `\\sin(${u})`, d: (c) => terms([[c, `\\cos(${u})`]]), js: Math.sin, gp: Math.cos, rule: R`\(\dfrac{d}{du}\sin u = \cos u\)` },
    { f: `(${u})^{${n}}`, d: (c) => terms([[c * n, power(`(${u})`, n - 1)]]), js: (t) => t ** n, gp: (t) => n * t ** (n - 1), rule: R`\(\dfrac{d}{du}u^{${n}} = ${n}${power('u', n - 1)}\)` },
    { f: `\\ln(${u})`, d: (c) => over(c, u), js: Math.log, gp: (t) => 1 / t, rule: R`\(\dfrac{d}{du}\ln u = \dfrac{1}{u}\)` },
  ][kind];
  const v = rng.int(0, 1);
  const [name, other] = v === 0 ? ['x', 'y'] : ['y', 'x'];
  const [mine, theirs] = v === 0 ? [a, b] : [b, a];
  return q({
    prompt: R`Find \(\dfrac{\partial f}{\partial ${name}}\) for \(f(x, y) = ${g.f}\).`,
    correct: M(g.d(mine)),
    wrong: [
      { value: M(g.d(1)), why: R`Chain rule: multiply by the derivative of the inside with respect to \(${name}\), which is \(${mine}\).` },
      { value: M(g.d(theirs)), why: R`That is \(\dfrac{\partial f}{\partial ${other}}\). The inside has \(${name}\)-derivative \(${mine}\).` },
      M(g.d(-mine)),
      M(g.d(a + b)),
      M(g.d(a * b)),
    ],
    solution: [R`Let \(u = ${u}\). The outside function gives ${g.rule}.`, R`Chain rule: multiply by \(\dfrac{\partial u}{\partial ${name}} = ${mine}\), treating \(${other}\) as a constant.`, R`\(\dfrac{\partial f}{\partial ${name}} = ${g.d(mine)}\).`],
    rule: 3,
    skill: 'partials with the chain rule',
    check: () => checkEqual(mine * g.gp(a * 0.9 + b * 0.2), numPartial((x, y) => g.js(a * x + b * y), [0.9, 0.2], v), 1e-5, 'partial derivative'),
  });
}

function mediumSecondPartial(rng) {
  let p;
  let w;
  let ans;
  do {
    p = randPoly2(rng);
    w = rng.pick([[0, 0], [0, 1], [1, 1]]);
    ans = mpD(mpD(p, w[0]), w[1]);
  } while (!ans.length);
  const name = w.map((v) => 'xy'[v]).join('');
  const others = [[0, 0], [0, 1], [1, 1]].filter((o) => o.join() !== w.join()).map((o) => M(mpTex(mpD(mpD(p, o[0]), o[1]))));
  return q({
    prompt: R`Find \(f_{${name}}(x, y)\) for \(f(x, y) = ${mpTex(p)}\).`,
    correct: M(mpTex(ans)),
    wrong: [
      { value: M(mpTex(mpD(p, w[0]))), why: R`That is \(f_{${'xy'[w[0]]}}\). Differentiate it once more, with respect to \(${'xy'[w[1]]}\).` },
      ...others,
      M(mpTex(mpScale(ans, -1))),
      M(mpTex(mpAdd(ans, [[1, 0, 0]]))),
    ],
    solution: [
      R`First \(f_{${'xy'[w[0]]}}(x, y) = ${mpTex(mpD(p, w[0]))}\).`,
      R`Differentiate that with respect to \(${'xy'[w[1]]}\): \(f_{${name}}(x, y) = ${mpTex(ans)}\).`,
      ...(name === 'xy' ? [R`(Differentiating in the other order gives the same result: \(f_{yx} = f_{xy}\).)`] : []),
    ],
    rule: 4,
    skill: 'second partial derivatives',
    check: () => checkEqual(mpEval(ans, 0.8, -0.6), num2(fn(p), [0.8, -0.6], w[0], w[1]), 1e-3, 'second partial'),
  });
}

function mediumPathLimit(rng) {
  const kind = rng.int(0, 2);
  const m = rng.pick([-3, -2, -1, 1, 2, 3]);
  let a;
  let b;
  do {
    a = rng.nonzero(-6, 6);
    b = rng.nonzero(-6, 6);
  } while (a + b * m * m === 0 || a === b);
  const top = kind === 1 ? a + b * m * m : a * m;
  const ans = frac(top, 1 + m * m);
  const f = [`\\dfrac{${terms([[a, 'xy']])}}{x^{2} + y^{2}}`, `\\dfrac{${terms([[a, 'x^{2}'], [b, 'y^{2}']])}}{x^{2} + y^{2}}`, `\\dfrac{${terms([[a, 'x^{2}y']])}}{x^{4} + y^{2}}`][kind];
  const path = terms([[m, kind === 2 ? 'x^{2}' : 'x']]);
  const xs = kind === 2 ? 'x^{4}' : 'x^{2}';
  const js = [(x, y) => (a * x * y) / (x * x + y * y), (x, y) => (a * x * x + b * y * y) / (x * x + y * y), (x, y) => (a * x * x * y) / (x ** 4 + y * y)][kind];
  return q({
    prompt: R`Find the limit of \(f(x, y) = ${f}\) as \((x, y) \to (0, 0)\) along the ${kind === 2 ? 'parabola' : 'line'} \(y = ${path}\).`,
    correct: ans,
    wrong: [
      { value: 0, why: R`Putting in \((0, 0)\) gives \(\frac{0}{0}\), which is not a value. Substitute the path first, then simplify.` },
      { value: top, why: R`Keep the denominator: on this path it is \(${1 + m * m}${xs}\).` },
      frac(top, 1 + Math.abs(m)),
      frac(a, 1 + m * m),
      ans.neg(),
    ],
    solution: [
      R`Substitute \(y = ${path}\): the numerator becomes \(${terms([[top, xs]])}\) and the denominator becomes \(${terms([[1, xs], [m * m, xs]])} = ${1 + m * m}${xs}\).`,
      R`Cancel \(${xs}\) (allowed because \(x \ne 0\) on the way in): the function equals \(${ans.tex()}\) at every point of the path.`,
      R`The limit along this path is \(${ans.tex()}\).`,
    ],
    rule: 2,
    skill: 'limits along paths',
    check: () => checkEqual(ans.value, js(1e-3, kind === 2 ? m * 1e-6 : m * 1e-3), 1e-6, 'path limit'),
  });
}

// ───────────── Hard ─────────────

const DNE = 'The limit does not exist.';
// Each family: { f, at, js, lim: a number or DNE, wrong, sol }.
const LIMITS = [
  (rng) => {
    const a = rng.nonzero(-6, 6);
    const b = rng.intExcept(-6, 6, [0, a]);
    return { f: `\\dfrac{${terms([[a, 'x^{2}'], [b, 'y^{2}']])}}{x^{2} + y^{2}}`, js: (x, y) => (a * x * x + b * y * y) / (x * x + y * y), lim: DNE, wrong: [{ value: frac(a + b, 2), why: 'Two different limits along two paths do not average out. They show that there is no limit.' }, a, b, 0], sol: [R`Along the \(x\)-axis (\(y = 0\)): \(f = \dfrac{${terms([[a, 'x^{2}']])}}{x^{2}} = ${a}\).`, R`Along the \(y\)-axis (\(x = 0\)): \(f = \dfrac{${terms([[b, 'y^{2}']])}}{y^{2}} = ${b}\).`, 'Two paths give two different values, so the limit does not exist.'] };
  },
  (rng) => {
    const a = 2 * rng.nonzero(-4, 4);
    return { f: `\\dfrac{${terms([[a, 'xy']])}}{x^{2} + y^{2}}`, js: (x, y) => (a * x * y) / (x * x + y * y), lim: DNE, wrong: [{ value: 0, why: R`Along both axes the limit is 0, but along the line \(y = x\) it is \(${a / 2}\). All paths must agree.` }, a / 2, a], sol: [R`Along the \(x\)-axis (\(y = 0\)): \(f = 0\).`, R`Along the line \(y = x\): \(f = \dfrac{${terms([[a, 'x^{2}']])}}{2x^{2}} = ${a / 2}\).`, 'Two paths give two different values, so the limit does not exist.'] };
  },
  (rng) => {
    const a = 2 * rng.nonzero(-4, 4);
    return { f: `\\dfrac{${terms([[a, 'x^{2}y']])}}{x^{4} + y^{2}}`, js: (x, y) => (a * x * x * y) / (x ** 4 + y * y), lim: DNE, wrong: [{ value: 0, why: R`Every straight line through the origin gives 0, but the parabola \(y = x^{2}\) gives \(${a / 2}\). Lines are not the only paths.` }, a / 2, a], sol: [R`Along any line \(y = mx\): \(f = \dfrac{${terms([[a, 'mx^{3}']])}}{x^{4} + m^{2}x^{2}} \to 0\).`, R`Along the parabola \(y = x^{2}\): \(f = \dfrac{${terms([[a, 'x^{4}']])}}{2x^{4}} = ${a / 2}\).`, 'Two paths give two different values, so the limit does not exist.'] };
  },
  (rng) => {
    const a = rng.nonzero(-6, 6);
    return { f: `\\dfrac{${terms([[a, 'x^{2}y']])}}{x^{2} + y^{2}}`, js: (x, y) => (a * x * x * y) / (x * x + y * y), lim: 0, wrong: [{ value: DNE, why: R`Here the function can be trapped: \(|f| \le ${Math.abs(a)}|y|\), which goes to 0 along every path.` }, frac(a, 2), a], sol: [R`Since \(0 \le \dfrac{x^{2}}{x^{2} + y^{2}} \le 1\), we have \(|f(x, y)| \le ${Math.abs(a)}|y|\).`, R`As \((x, y) \to (0, 0)\), \(${Math.abs(a)}|y| \to 0\), so by the squeeze theorem \(f \to 0\).`, R`The limit is \(0\).`] };
  },
  (rng) => {
    const p = rng.nonzero(-6, 6);
    return { f: '\\dfrac{x^{2} - y^{2}}{x - y}', at: [p, p], js: (x, y) => (x * x - y * y) / (x - y), lim: 2 * p, wrong: [{ value: DNE, why: R`\(\frac{0}{0}\) does not settle the question. Factor and cancel first.` }, 0, p], sol: [R`Factor: \(\dfrac{(x - y)(x + y)}{x - y} = x + y\) wherever \(x \ne y\).`, R`As \((x, y) \to (${p}, ${p})\), \(x + y \to ${2 * p}\).`, R`The limit is \(${2 * p}\).`] };
  },
  (rng) => {
    const a = rng.nonzero(-6, 6);
    return { f: `\\dfrac{${terms([[a, 'x^{4}'], [-a, 'y^{4}']])}}{x^{2} + y^{2}}`, js: (x, y) => (a * x ** 4 - a * y ** 4) / (x * x + y * y), lim: 0, wrong: [{ value: DNE, why: R`\(\frac{0}{0}\) does not settle the question. Factor the numerator as a difference of squares.` }, a, 2 * a], sol: [R`Factor: \(${a === 1 ? '' : a === -1 ? '-' : a}(x^{2} - y^{2})(x^{2} + y^{2})\) over \(x^{2} + y^{2}\) leaves \(${terms([[a, 'x^{2}'], [-a, 'y^{2}']])}\).`, R`That polynomial is continuous, and its value at \((0, 0)\) is 0.`, R`The limit is \(0\).`] };
  },
];

function hardLimitExists(rng) {
  const k = rng.pick(LIMITS)(rng);
  const [x0, y0] = k.at ?? [0, 0];
  const show = (v) => (typeof v === 'string' ? v : M(num(v)));
  return q({
    prompt: R`Evaluate \(\lim\limits_{(x, y) \to (${x0}, ${y0})} ${k.f}\), or decide that it does not exist.`,
    correct: show(k.lim),
    wrong: [...k.wrong.map((w) => (w.why ? { value: show(w.value), why: w.why } : show(w))), M('1'), M('-1')],
    solution: k.sol,
    rule: 2,
    skill: 'two-variable limits',
    check: () => {
      const t = 1e-3;
      const paths = [[t, 0], [0, t], [t, t], [t, -t], [t, 2 * t], [-t, 3 * t], [t, t * t], [t * t, t]];
      const vals = paths.map(([dx, dy]) => k.js(x0 + dx, y0 + dy)).filter(Number.isFinite);
      const spread = Math.max(...vals) - Math.min(...vals);
      if (k.lim === DNE) return spread > 0.05 ? true : 'all sampled paths agree, so the limit may exist';
      return vals.every((v) => Math.abs(v - k.lim) < 0.02) ? true : `paths do not all approach ${k.lim}`;
    },
  });
}

function hardTableEstimate(rng) {
  const [x0, y0] = [rng.int(2, 6), rng.int(2, 6)];
  const [h, k] = [rng.pick([frac(1, 2), frac(1), frac(2)]), rng.pick([frac(1, 2), frac(1), frac(2)])];
  const base = rng.int(20, 60);
  const tw = rng.int(-2, 2);
  let sx;
  let sy;
  do {
    sx = rng.nonzero(-6, 6);
    sy = rng.nonzero(-6, 6);
  } while (frac(sx).div(h).eq(frac(sy).div(k)) || frac(sx).div(h).eq(frac(sy).div(k).neg()));
  const val = (i, j) => base + sx * i + sy * j + tw * i * j; // linear along the middle row and column
  const wrtX = rng.bool();
  const [s, step, name] = wrtX ? [sx, h, 'x'] : [sy, k, 'y'];
  const ans = frac(s).div(step);
  const [lo, hi] = wrtX ? [val(-1, 0), val(1, 0)] : [val(0, -1), val(0, 1)];
  const xs = [-1, 0, 1].map((i) => frac(x0).add(h.mul(i)));
  const ys = [-1, 0, 1].map((j) => frac(y0).add(k.mul(j)));
  return q({
    prompt: R`The table gives values of a function \(f(x, y)\). Use the entries on either side of \((${x0}, ${y0})\) to estimate \(f_{${name}}(${x0}, ${y0})\).`,
    visual: { type: 'table', rowHeaders: true, headers: [R`\(f(x, y)\)`, ...xs.map((x) => R`\(x = ${num(x.value)}\)`)], rows: ys.map((y, j) => [R`\(y = ${num(y.value)}\)`, ...[-1, 0, 1].map((i) => R`\(${val(i, j - 1)}\)`)]), alt: `Table of values of f for x = ${xs.map((x) => x.value).join(', ')} and y = ${ys.map((y) => y.value).join(', ')}. The middle entry, at (${x0}, ${y0}), is ${base}.` },
    correct: ans,
    wrong: [
      { value: frac(wrtX ? sy : sx).div(wrtX ? k : h), why: R`That is an estimate of \(f_{${wrtX ? 'y' : 'x'}}\). For \(f_{${name}}\), keep \(${wrtX ? 'y' : 'x'}\) fixed and let \(${name}\) change.` },
      { value: hi - lo, why: R`Divide the change in \(f\) by the change in \(${name}\), which is \(${num(step.mul(2).value)}\).` },
      frac(s).div(step.mul(2)),
      ans.neg(),
      frac(val(1, 1) - val(-1, -1)).div(step.mul(2)),
    ],
    solution: [
      R`Hold \(${wrtX ? 'y' : 'x'} = ${wrtX ? y0 : x0}\) fixed (the middle ${wrtX ? 'row' : 'column'}). As \(${name}\) goes from \(${num((wrtX ? xs : ys)[0].value)}\) to \(${num((wrtX ? xs : ys)[2].value)}\), \(f\) goes from \(${lo}\) to \(${hi}\).`,
      R`\(f_{${name}}(${x0}, ${y0}) \approx \dfrac{${hi} - ${lo}}{${num(step.mul(2).value)}} = ${ans.tex()}\).`,
    ],
    rule: 3,
    skill: 'estimating partials from a table',
    check: () => (frac(hi - base).div(step).eq(ans) && frac(base - lo).div(step).eq(ans) ? true : 'one-sided estimates disagree'),
  });
}

function hardApplication(rng) {
  const kind = rng.int(0, 2);
  if (kind === 0) {
    const [r, h] = [rng.int(2, 9), rng.int(2, 12)];
    const wrtR = rng.bool();
    const ans = wrtR ? 2 * r * h : r * r;
    const show = (c) => R`\(${piTex(c)}\) cm³ per cm`;
    return q({
      prompt: R`The volume of a cylindrical can is \(V = \pi r^{2}h\). For a can with radius ${r} cm and height ${h} cm, at what rate does the volume change as the ${wrtR ? 'radius' : 'height'} increases, if the ${wrtR ? 'height' : 'radius'} stays fixed?`,
      correct: show(ans),
      wrong: [{ value: show(wrtR ? r * r : 2 * r * h), why: `That is the rate of change with respect to the ${wrtR ? 'height' : 'radius'}.` }, { value: show(r * r * h), why: 'That is the volume itself, not a rate of change.' }, show(wrtR ? r * h : 2 * r), show(2 * ans), show(ans + r)],
      solution: [wrtR ? R`Hold \(h\) constant: \(\dfrac{\partial V}{\partial r} = 2\pi rh\).` : R`Hold \(r\) constant: \(\dfrac{\partial V}{\partial h} = \pi r^{2}\).`, R`At \(r = ${r}\), \(h = ${h}\): \(${wrtR ? `2\\pi(${r})(${h})` : `\\pi(${r})^{2}`} = ${piTex(ans)}\) cm³ per cm.`],
      rule: 5,
      skill: 'partials as rates of change',
      check: () => checkEqual(ans * Math.PI, numPartial((x, y) => Math.PI * x * x * y, [r, h], wrtR ? 0 : 1), 1e-5),
    });
  }
  if (kind === 1) {
    const k = rng.pick([2, 4, 8]);
    const V = rng.pick([2, 4, 5, 10]);
    const T = rng.pick([200, 250, 300, 400]);
    const ans = frac(-k * T, V * V);
    return q({
      prompt: R`The pressure of a gas (in kPa) is \(P = \dfrac{${k}T}{V}\), where \(T\) is its temperature in kelvins and \(V\) its volume in liters. Find \(\dfrac{\partial P}{\partial V}\) when \(T = ${T}\) and \(V = ${V}\).`,
      correct: ans,
      unit: 'kPa per liter',
      wrong: [{ value: ans.neg(), why: R`\(\dfrac{d}{dV}\,\dfrac{1}{V} = -\dfrac{1}{V^{2}}\). The pressure falls as the volume grows.` }, { value: frac(k, V), why: R`That is \(\dfrac{\partial P}{\partial T}\). Here \(T\) is held constant and \(V\) changes.` }, frac(-k * T, V), frac(k * T, V)],
      solution: [R`Hold \(T\) constant and write \(P = ${k}T\,V^{-1}\).`, R`\(\dfrac{\partial P}{\partial V} = -${k}T\,V^{-2} = -\dfrac{${k}T}{V^{2}}\).`, R`At \(T = ${T}\), \(V = ${V}\): \(-\dfrac{${k * T}}{${V * V}} = ${ans.tex()}\) kPa per liter. The negative sign says that the pressure falls as the gas is given more room.`],
      rule: 5,
      skill: 'partials as rates of change',
      check: () => checkEqual(ans.value, numPartial((t, v) => (k * t) / v, [T, V], 1), 1e-5),
    });
  }
  const c = rng.pick([20, 40, 60, 100]);
  const [m, n] = rng.sample([1, 2, 3, 4, 5], 2);
  const u = rng.pick([1, 4, 9]);
  const [L, K] = [u * m * m, u * n * n];
  const ans = frac(c * n, 2 * m);
  return q({
    prompt: R`A factory's output is \(P(L, K) = ${c}\sqrt{LK}\) units, where \(L\) is the number of hours of labor and \(K\) the number of units of capital. Find the marginal productivity of labor, \(\dfrac{\partial P}{\partial L}\), when \(L = ${L}\) and \(K = ${K}\).`,
    correct: ans,
    unit: 'units per hour',
    wrong: [{ value: frac(c * m, 2 * n), why: R`That is \(\dfrac{\partial P}{\partial K}\). Here capital is held fixed and labor changes.` }, { value: frac(c * n, m), why: R`The derivative of \(L^{1/2}\) is \(\frac{1}{2}L^{-1/2}\). Keep the \(\frac{1}{2}\).` }, c * u * m * n, frac(c, 2)],
    solution: [R`Write \(P = ${c}L^{1/2}K^{1/2}\) and hold \(K\) constant: \(\dfrac{\partial P}{\partial L} = ${c / 2}L^{-1/2}K^{1/2} = ${c / 2}\sqrt{\dfrac{K}{L}}\).`, R`At \(L = ${L}\), \(K = ${K}\): \(${c / 2}\sqrt{\dfrac{${K}}{${L}}} = ${c / 2} \cdot ${frac(n, m).tex()} = ${ans.tex()}\).`, 'One more hour of labor adds about that many units of output, with capital unchanged.'],
    rule: 5,
    skill: 'partials as rates of change',
    check: () => checkEqual(ans.value, numPartial((l, kk) => c * Math.sqrt(l * kk), [L, K], 0), 1e-5),
  });
}

// ───────────── Challenge ─────────────

function challengeLaplace(rng) {
  const a = rng.nonzero(-5, 5);
  const c = rng.int(-5, 5);
  const fam = rng.pick([
    { u: terms([[a, 'x^{2}'], [1, 'ky^{2}'], [c, 'xy']]), k: frac(-a), uxx: String(2 * a), uyy: '2k', sum: `${2 * a} + 2k`, js: (k) => (x, y) => a * x * x + k * y * y + c * x * y },
    { u: terms([[a, 'x^{3}'], [1, 'kxy^{2}'], [c, 'y']]), k: frac(-3 * a), uxx: terms([[6 * a, 'x']]), uyy: '2kx', sum: `(${6 * a} + 2k)x`, js: (k) => (x, y) => a * x ** 3 + k * x * y * y + c * y },
    { u: terms([[a, 'x^{4}'], [1, 'kx^{2}y^{2}'], [a, 'y^{4}']]), k: frac(-6 * a), uxx: `${terms([[12 * a, 'x^{2}']])} + 2ky^{2}`, uyy: `2kx^{2} ${a < 0 ? '-' : '+'} ${Math.abs(12 * a)}y^{2}`, sum: `(${12 * a} + 2k)(x^{2} + y^{2})`, js: (k) => (x, y) => a * x ** 4 + k * x * x * y * y + a * y ** 4 },
    { u: terms([[3 * a, 'x^{2}y'], [1, 'ky^{3}'], [c, 'x']]), k: frac(-a), uxx: terms([[6 * a, 'y']]), uyy: '6ky', sum: `(${6 * a} + 6k)y`, js: (k) => (x, y) => 3 * a * x * x * y + k * y ** 3 + c * x },
  ]);
  return q({
    prompt: R`For which value of \(k\) does \(u(x, y) = ${fam.u}\) satisfy Laplace's equation \(u_{xx} + u_{yy} = 0\)?`,
    correct: fam.k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [{ value: fam.k.neg(), why: R`The two second derivatives must cancel, so \(u_{yy}\) needs the opposite sign to \(u_{xx}\).` }, fam.k.mul(2), frac(a), fam.k.mul(3), frac(-a, 2)],
    solution: [R`\(u_{xx} = ${fam.uxx}\) and \(u_{yy} = ${fam.uyy}\).`, R`\(u_{xx} + u_{yy} = ${fam.sum}\), which must be 0 for all \(x\) and \(y\).`, R`So \(k = ${fam.k.tex()}\).`],
    rule: 4,
    skill: 'Laplace equation',
    check: () => {
      const u = fam.js(fam.k.value);
      return Math.abs(num2(u, [0.7, -0.4], 0, 0) + num2(u, [0.7, -0.4], 1, 1)) < 1e-3 ? true : 'u is not harmonic for this k';
    },
  });
}

function challengeClairaut(rng) {
  const [p, n] = [rng.int(1, 3), rng.int(2, 4)];
  const c = rng.nonzero(-6, 6);
  const [ax, by] = [rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
  const k = frac(c * (p + 1), n);
  const mixed = power('x', p) + power('y', n - 1);
  return q({
    prompt: R`A function \(f(x, y)\) with continuous second partial derivatives has \(f_{x} = ${terms([[1, `k${power('x', p)}${power('y', n)}`], [ax, 'x']])}\) and \(f_{y} = ${terms([[c, power('x', p + 1) + power('y', n - 1)], [by, 'y']])}\). Find \(k\).`,
    correct: k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [{ value: c, why: R`The coefficients need not match. The mixed partials \(f_{xy}\) and \(f_{yx}\) must.` }, { value: frac(c * n, p + 1), why: R`\(f_{xy} = ${n}k\,${mixed}\) and \(f_{yx} = ${c * (p + 1)}${mixed}\). Solve \(${n}k = ${c * (p + 1)}\).` }, c * (p + 1), k.neg()],
    solution: [R`By Clairaut's theorem \(f_{xy} = f_{yx}\).`, R`Differentiate \(f_{x}\) with respect to \(y\): \(f_{xy} = ${n}k\,${mixed}\). Differentiate \(f_{y}\) with respect to \(x\): \(f_{yx} = ${terms([[c * (p + 1), mixed]])}\).`, R`So \(${n}k = ${c * (p + 1)}\), and \(k = ${k.tex()}\).`],
    rule: 4,
    skill: 'equality of mixed partials',
    check: () => checkEqual(numPartial((x, y) => k.value * x ** p * y ** n + ax * x, [0.9, 1.3], 1), numPartial((x, y) => c * x ** (p + 1) * y ** (n - 1) + by * y, [0.9, 1.3], 0), 1e-5, 'mixed partials'),
  });
}

function challengePde(rng) {
  const b = rng.int(2, 5);
  if (rng.bool()) {
    const al = rng.int(1, 4);
    const k = al * b * b;
    const u = (x, t) => Math.exp(-k * t) * Math.sin(b * x);
    return q({
      prompt: R`For which value of \(k\) does \(u(x, t) = e^{-kt}\sin ${b}x\) satisfy the heat equation \(u_{t} = ${al === 1 ? '' : al}u_{xx}\)?`,
      correct: k,
      fmt: (v) => R`\(k = ${num(v)}\)`,
      wrong: [{ value: al * b, why: R`Differentiating \(\sin ${b}x\) twice brings out \(${b}\) twice: \(u_{xx} = -${b * b}u\).` }, { value: -k, why: R`\(u_{t} = -ku\) and \(u_{xx} = -${b * b}u\): both sides are negative, so \(k\) is positive.` }, b * b + al, al],
      solution: [R`\(u_{t} = -k\,e^{-kt}\sin ${b}x = -ku\).`, R`\(u_{x} = ${b}e^{-kt}\cos ${b}x\) and \(u_{xx} = -${b * b}e^{-kt}\sin ${b}x = -${b * b}u\).`, R`\(u_{t} = ${al === 1 ? '' : al}u_{xx}\) requires \(-k = -${al * b * b}\), so \(k = ${k}\).`],
      rule: 4,
      skill: 'checking a PDE',
      check: () => checkEqual(numPartial(u, [0.4, 0.05], 1, 1e-6), al * num2(u, [0.4, 0.05], 0, 0), 1e-3, 'heat equation'),
    });
  }
  const c = rng.int(2, 6);
  const w = b * c;
  const u = (x, t) => Math.sin(b * x) * Math.cos(w * t);
  return q({
    prompt: R`For which positive value of \(c\) does \(u(x, t) = \sin ${b}x\,\cos ${w}t\) satisfy the wave equation \(u_{tt} = c^{2}u_{xx}\)?`,
    correct: c,
    fmt: (v) => R`\(c = ${num(v)}\)`,
    wrong: [{ value: w, why: R`\(u_{tt} = -${w * w}u\) and \(u_{xx} = -${b * b}u\), so \(c^{2} = \dfrac{${w * w}}{${b * b}}\).` }, { value: c * c, why: R`\(${c * c}\) is \(c^{2}\). Take the square root.` }, frac(w, b * b), w * b],
    solution: [R`\(u_{tt} = -${w * w}\sin ${b}x\,\cos ${w}t = -${w * w}u\).`, R`\(u_{xx} = -${b * b}\sin ${b}x\,\cos ${w}t = -${b * b}u\).`, R`\(u_{tt} = c^{2}u_{xx}\) requires \(${w * w} = ${b * b}c^{2}\), so \(c^{2} = ${c * c}\) and \(c = ${c}\).`],
    rule: 4,
    skill: 'checking a PDE',
    check: () => checkEqual(num2(u, [0.4, 0.05], 1, 1), c * c * num2(u, [0.4, 0.05], 0, 0), 1e-3, 'wave equation'),
  });
}

export default {
  id: 'partial-derivatives',
  title: 'Functions of Several Variables & Partial Derivatives',
  summary: 'Find domains, level curves and limits of f(x, y), and compute and interpret first and second partial derivatives.',
  standards: ['OpenStax Calculus Vol. 3 §4.1', 'OpenStax Calculus Vol. 3 §4.2', 'OpenStax Calculus Vol. 3 §4.3'],

  explain: {
    intro: R`A function \(z = f(x, y)\) takes a point of the plane and returns a number, so its graph is a surface. Because there are many directions in which to move, there is one rate of change for each variable: a **partial derivative**, found by holding every other variable constant.`,
    rules: [
      { title: 'Domain', text: R`The domain of \(f(x, y)\) is the set of points \((x, y)\) where the formula makes sense: no division by 0, nothing negative under an even root, and only positive numbers inside a logarithm. It is a region of the plane, described by an inequality.`, example: R`\(f(x, y) = \sqrt{9 - x^{2} - y^{2}}\) needs \(x^{2} + y^{2} \le 9\): the disk of radius 3, boundary included.` },
      { title: 'Level curves', text: R`The level curve of \(f\) at height \(c\) is the set of points where \(f(x, y) = c\). Drawing several of them gives a contour map of the surface. Where the curves are close together, the surface is steep.`, example: R`For \(f(x, y) = x^{2} + y^{2}\) the level curve \(f = 4\) is the circle \(x^{2} + y^{2} = 4\), of radius 2.` },
      { title: 'Limits', text: R`\(\lim\limits_{(x, y) \to (a, b)} f(x, y) = L\) means \(f\) approaches \(L\) along **every** path into \((a, b)\). If two paths give different values, the limit does not exist. Agreement along a few paths proves nothing, so to show that a limit exists, simplify the function or trap it (squeeze theorem).`, example: R`For \(\dfrac{xy}{x^{2} + y^{2}}\): along \(y = 0\) the values are 0, along \(y = x\) they are \(\frac{1}{2}\). No limit at \((0, 0)\).` },
      { title: 'First partial derivatives', text: R`\(f_{x} = \dfrac{\partial f}{\partial x}\) is the derivative of \(f\) with respect to \(x\) with \(y\) treated as a constant, and \(f_{y}\) is the derivative with respect to \(y\) with \(x\) held constant. \(f_{x}(a, b)\) is the slope of the surface at \((a, b)\) in the \(x\)-direction.`, example: R`For \(f = x^{3}y^{2} - 2xy\): \(f_{x} = 3x^{2}y^{2} - 2y\) and \(f_{y} = 2x^{3}y - 2x\).` },
      { title: 'Second partial derivatives', text: R`Differentiating again gives \(f_{xx}\), \(f_{yy}\) and the mixed partials \(f_{xy}\) (first \(x\), then \(y\)) and \(f_{yx}\). **Clairaut's theorem:** if the mixed partials are continuous, they are equal: \(f_{xy} = f_{yx}\).`, example: R`For \(f = x^{3}y^{2} - 2xy\): \(f_{xy} = 6x^{2}y - 2\) and \(f_{yx} = 6x^{2}y - 2\).` },
      { title: 'Partial derivatives as rates of change', text: R`In an application, \(\dfrac{\partial f}{\partial x}\) is the rate at which the output changes per unit increase in \(x\) while the other inputs stay fixed. Its units are output units per unit of \(x\).`, example: R`For a can, \(V = \pi r^{2}h\): \(\dfrac{\partial V}{\partial r} = 2\pi rh\) is the extra volume per extra centimeter of radius, with the height unchanged.` },
    ],
    vocab: [
      { term: 'level curve', def: R`The set of points in the plane where \(f(x, y)\) equals a fixed number \(c\).` },
      { term: 'partial derivative', def: 'The derivative with respect to one variable while the others are held constant.' },
      { term: 'mixed partial', def: R`A second derivative taken with respect to two different variables, such as \(f_{xy}\).` },
    ],
    mistakes: [
      R`Differentiating a term that does not contain the variable. When finding \(f_{x}\), a term such as \(5y^{2}\) is a constant and its derivative is 0.`,
      'Deciding that a limit exists because two or three paths agree. Only a disagreement settles anything.',
      R`Forgetting the chain rule: \(\dfrac{\partial}{\partial x}e^{3x + 2y} = 3e^{3x + 2y}\).`,
      'Including or excluding a boundary carelessly in a domain: a square root allows 0, a logarithm does not.',
    ],
    visual: {
      type: 'plot',
      x: [-3.5, 3.5],
      y: [-3.5, 3.5],
      square: true,
      param: [2, 4, 6, 8].map((c) => ({ x: (t) => Math.sqrt(c) * Math.cos(t), y: (t) => Math.sqrt(c) * Math.sin(t), t: [0, 2 * Math.PI], color: 'a' })),
      points: [{ x: 0, y: Math.sqrt(2), label: 'c = 2' }, { x: 2, y: 2, label: 'c = 8' }],
      alt: 'Contour map of f(x, y) = x² + y²: the level curves for c = 2, 4, 6 and 8 are circles centered at the origin. The circles get closer together as c grows, because the surface gets steeper.',
    },
  },

  examples: [
    {
      title: 'First and second partial derivatives',
      problem: R`Find all first and second partial derivatives of \(f(x, y) = x^{3}y^{2} - 2xy\).`,
      steps: [
        R`Hold \(y\) constant: \(f_{x} = 3x^{2}y^{2} - 2y\).`,
        R`Hold \(x\) constant: \(f_{y} = 2x^{3}y - 2x\).`,
        R`Differentiate \(f_{x}\): \(f_{xx} = 6xy^{2}\) and \(f_{xy} = 6x^{2}y - 2\).`,
        R`Differentiate \(f_{y}\): \(f_{yy} = 2x^{3}\) and \(f_{yx} = 6x^{2}y - 2\), equal to \(f_{xy}\) as Clairaut's theorem promises.`,
      ],
      answer: R`\(f_{x} = 3x^{2}y^{2} - 2y\), \(f_{y} = 2x^{3}y - 2x\), \(f_{xx} = 6xy^{2}\), \(f_{yy} = 2x^{3}\), \(f_{xy} = f_{yx} = 6x^{2}y - 2\)`,
    },
    {
      title: 'A limit that does not exist',
      problem: R`Show that \(\lim\limits_{(x, y) \to (0, 0)} \dfrac{x^{2} - y^{2}}{x^{2} + y^{2}}\) does not exist.`,
      steps: [
        R`Along the \(x\)-axis, \(y = 0\): the function is \(\dfrac{x^{2}}{x^{2}} = 1\), so the limit along this path is 1.`,
        R`Along the \(y\)-axis, \(x = 0\): the function is \(\dfrac{-y^{2}}{y^{2}} = -1\), so the limit along this path is \(-1\).`,
        'A limit must be the same along every path. These two disagree.',
      ],
      answer: 'The limit does not exist.',
    },
    {
      title: 'Chain rule inside a partial derivative',
      problem: R`Find \(f_{x}\) and \(f_{y}\) for \(f(x, y) = \sin(3x - 2y)\).`,
      steps: [
        R`The outside function is sine, with derivative cosine. The inside is \(u = 3x - 2y\).`,
        R`For \(f_{x}\), the inside has derivative \(\dfrac{\partial u}{\partial x} = 3\): \(f_{x} = 3\cos(3x - 2y)\).`,
        R`For \(f_{y}\), the inside has derivative \(\dfrac{\partial u}{\partial y} = -2\): \(f_{y} = -2\cos(3x - 2y)\).`,
      ],
      answer: R`\(f_{x} = 3\cos(3x - 2y)\) and \(f_{y} = -2\cos(3x - 2y)\)`,
    },
    {
      title: 'Word problem: which change adds more volume?',
      word: true,
      problem: R`A can has radius 3 cm and height 10 cm, so \(V = \pi r^{2}h\). Does the volume grow faster per centimeter of extra radius or per centimeter of extra height?`,
      steps: [
        R`Rate with respect to the radius (height fixed): \(\dfrac{\partial V}{\partial r} = 2\pi rh = 2\pi(3)(10) = 60\pi\) cm³ per cm.`,
        R`Rate with respect to the height (radius fixed): \(\dfrac{\partial V}{\partial h} = \pi r^{2} = 9\pi\) cm³ per cm.`,
        R`Compare: \(60\pi \approx 188\) against \(9\pi \approx 28\).`,
      ],
      answer: 'Widening the can adds volume much faster: about 188 cm³ per extra centimeter of radius, against about 28 cm³ per extra centimeter of height.',
    },
  ],

  models: [
    {
      id: 'power-partials',
      title: 'Partial derivatives of a·xᵐ·yⁿ at a point',
      intro: 'Choose the function f(x, y) = a·xᵐ·yⁿ and a point.',
      inputs: [
        { name: 'a', label: 'Coefficient a', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'm', label: 'Power of x (m)', type: 'int', min: 0, max: 5, value: 3 },
        { name: 'n', label: 'Power of y (n)', type: 'int', min: 0, max: 5, value: 2 },
        { name: 'x0', label: 'x-coordinate of the point', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'y0', label: 'y-coordinate of the point', type: 'int', min: -5, max: 5, value: 2 },
      ],
      compute({ a, m, n, x0, y0 }) {
        const p = [[a, m, n]];
        const [fx, fy] = [mpD(p, 0), mpD(p, 1)];
        const fxy = mpD(fx, 1);
        const at = (d) => mpEval(d, x0, y0);
        return {
          problem: R`For \(f(x, y) = ${mpTex(p)}\), find \(f_{x}\), \(f_{y}\) and \(f_{xy}\) at \((${x0}, ${y0})\).`,
          steps: [
            R`Hold \(y\) constant and use the power rule in \(x\): \(f_{x} = ${mpTex(fx)}\), so \(f_{x}(${x0}, ${y0}) = ${at(fx)}\).`,
            R`Hold \(x\) constant and use the power rule in \(y\): \(f_{y} = ${mpTex(fy)}\), so \(f_{y}(${x0}, ${y0}) = ${at(fy)}\).`,
            R`Differentiate \(f_{x}\) with respect to \(y\): \(f_{xy} = ${mpTex(fxy)}\), so \(f_{xy}(${x0}, ${y0}) = ${at(fxy)}\). Differentiating \(f_{y}\) with respect to \(x\) gives the same thing.`,
            R`Meaning: at this point the surface has slope \(${at(fx)}\) in the \(x\)-direction and slope \(${at(fy)}\) in the \(y\)-direction.`,
          ],
          answer: R`\(f_{x}(${x0}, ${y0}) = ${at(fx)}\), \(\;f_{y}(${x0}, ${y0}) = ${at(fy)}\), \(\;f_{xy}(${x0}, ${y0}) = ${at(fxy)}\)`,
        };
      },
    },
    {
      id: 'hot-plate',
      title: 'Word problem: temperature on a metal plate',
      word: true,
      intro: 'The plate is hottest at the origin. Choose how fast it cools in each direction and where to stand.',
      inputs: [
        { name: 'a', label: 'Cooling coefficient in x', type: 'int', min: 1, max: 4, value: 2 },
        { name: 'b', label: 'Cooling coefficient in y', type: 'int', min: 1, max: 4, value: 1 },
        { name: 'x0', label: 'x-coordinate (cm)', type: 'int', min: -4, max: 4, value: 2 },
        { name: 'y0', label: 'y-coordinate (cm)', type: 'int', min: -4, max: 4, value: 3 },
      ],
      compute({ a, b, x0, y0 }) {
        const drop = a * x0 * x0 + b * y0 * y0;
        const levels = drop > 0 ? [drop / 3, drop, drop * 1.8] : [4, 10, 18];
        const w = Math.sqrt(levels[2] / Math.min(a, b)) + 0.8;
        const [tx, ty] = [-2 * a * x0, -2 * b * y0];
        const say = (v, name) => (v === 0 ? `not changing as ${name} increases` : `${v > 0 ? 'rising' : 'falling'} by about ${Math.abs(v)} °C per cm as ${name} increases`);
        return {
          problem: R`The temperature of a plate is \(T(x, y) = ${terms([[200, ''], [-a, 'x^{2}'], [-b, 'y^{2}']])}\) °C, with \(x\) and \(y\) in cm. How fast does the temperature change at \((${x0}, ${y0})\) in the \(x\)-direction and in the \(y\)-direction?`,
          steps: [
            R`Temperature at the point: \(T(${x0}, ${y0}) = 200 - ${a * x0 * x0} - ${b * y0 * y0} = ${200 - drop}\) °C.`,
            R`Hold \(y\) fixed: \(T_{x} = ${terms([[-2 * a, 'x']])}\), so \(T_{x}(${x0}, ${y0}) = ${tx}\) °C per cm.`,
            R`Hold \(x\) fixed: \(T_{y} = ${terms([[-2 * b, 'y']])}\), so \(T_{y}(${x0}, ${y0}) = ${ty}\) °C per cm.`,
            `Moving in the x-direction, the temperature is ${say(tx, 'x')}. Moving in the y-direction, it is ${say(ty, 'y')}.`,
          ],
          answer: R`\(T_{x} = ${tx}\) °C per cm and \(T_{y} = ${ty}\) °C per cm`,
          visual: {
            type: 'plot',
            x: [-w, w],
            y: [-w, w],
            square: true,
            param: levels.map((c) => ({ x: (t) => Math.sqrt(c / a) * Math.cos(t), y: (t) => Math.sqrt(c / b) * Math.sin(t), t: [0, 2 * Math.PI], color: 'a' })),
            points: [{ x: x0, y: y0, label: `${200 - drop} °C`, color: 'b' }, { x: 0, y: 0, label: '200 °C', color: 'c' }],
            axisLabels: ['x', 'y'],
            alt: `Level curves of the temperature (isotherms): ellipses centered at the hottest point, the origin. The point (${x0}, ${y0}), where the temperature is ${200 - drop} degrees, is marked.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyPartialPoly, easyLevelCurve, easyDomain],
    medium: [mediumPartialChain, mediumSecondPartial, mediumPathLimit],
    hard: [hardLimitExists, hardTableEstimate, hardApplication],
    challenge: [challengeLaplace, challengeClairaut, challengePde],
  },
};
