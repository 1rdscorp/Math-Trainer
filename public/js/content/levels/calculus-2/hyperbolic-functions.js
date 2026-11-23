import { R, q, num, txt, round, frac, terms, person, checkEqual, checkDeriv, checkIntegral, integrate, close } from '../../lib/index.js';
import { M, K, N, kx, fterms, lnCombo, exactChoices, antiChoices, funcChoices } from './_shared.js';

// ───────────── Helpers ─────────────

const { sinh, cosh, tanh, asinh, acosh, atanh, log, sqrt, exp } = Math;
const sech = (x) => 1 / cosh(x);
// A hyperbolic function applied to an argument: hyp('sinh', '3x') → "\sinh 3x", hyp('cosh', 'x^{2}') → "\cosh(x^{2})".
const hyp = (name, arg, pow = '') => {
  const op = name === 'sech' ? `\\operatorname{sech}${pow}` : `\\${name}${pow}`;
  return /^-?\d*x$/.test(arg) ? `${op} ${arg}` : `${op}(${arg})`;
};
const D = (v, p = 2) => num(round(v, p), { fixed: p });
const plainNum = (v, p = 2) => txt(round(v, p), { fixed: p });

// Rationals a > 1 for which sinh(ln a), cosh(ln a), tanh(ln a) are tidy fractions: [n, d] means a = n/d.
const AS = [[2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [3, 2], [5, 2], [7, 2], [4, 3], [5, 3], [7, 3], [5, 4], [7, 4]];
const lnTex = ([n, d]) => (d === 1 ? `\\ln ${n}` : `\\ln\\frac{${n}}{${d}}`);
// sinh, cosh and tanh of ln(n/d) as exact fractions.
const sOf = ([n, d]) => frac(n * n - d * d, 2 * n * d);
const cOf = ([n, d]) => frac(n * n + d * d, 2 * n * d);
const tOf = ([n, d]) => frac(n * n - d * d, n * n + d * d);
const VAL = { sinh: sOf, cosh: cOf, tanh: tOf };

// Plot of a catenary y = a cosh(x/a) between poles at x = ±L/2, optionally with the matching parabola.
function catenaryPlot(a, L, { parabola = false, alt }) {
  const H = a * cosh(L / (2 * a));
  const pad = 0.08 * L;
  const fns = [{ f: (x) => a * cosh(x / a), domain: [-L / 2, L / 2], label: 'catenary' }];
  if (parabola) fns.push({ f: (x) => a + (x * x) / (2 * a), domain: [-L / 2, L / 2], color: 'b', dashed: true, label: 'parabola' });
  // A shallow cable would look flat with the window starting at y = 0, so zoom in on the cable when it is shallow.
  const sag = H - a;
  const lo = sag > 0.5 * a ? 0 : a - 0.8 * sag;
  return {
    type: 'plot', x: [-L / 2 - pad, L / 2 + pad], y: [lo, H + 0.15 * (H - lo)], axisLabels: ['x (m)', 'y (m)'],
    fns,
    segments: [{ from: [-L / 2, lo], to: [-L / 2, H], color: 'd' }, { from: [L / 2, lo], to: [L / 2, H], color: 'd' }, { from: [0, a], to: [0, H], dashed: true, color: 'c', label: 'sag' }],
    points: [{ x: 0, y: a }],
    alt: lo > 0 ? `${alt} The vertical axis starts at y = ${plainNum(lo, 1)} m, which makes the sag look deeper than it is.` : alt,
  };
}

// ───────────── Easy ─────────────

function easyValue(rng) {
  const A = rng.pick(AS);
  const name = rng.pick(['sinh', 'cosh', 'tanh']);
  const neg = rng.bool(0.3);
  const sgn = neg && name !== 'cosh' ? -1 : 1;
  const value = VAL[name](A).mul(sgn);
  const a = frac(A[0], A[1]);
  const arg = neg ? `-${lnTex(A)}` : lnTex(A);
  const ea = neg ? a.inv() : a; // e^x
  const wrongs = {
    sinh: [
      { value: cOf(A), why: R`That is \(\cosh\): \(\frac{e^{x} + e^{-x}}{2}\). \(\sinh\) subtracts: \(\frac{e^{x} - e^{-x}}{2}\).` },
      { value: ea.sub(ea.inv()), why: R`Divide by 2: \(\sinh x = \frac{e^{x} - e^{-x}}{2}\).` },
      { value: ea, why: R`\(e^{-${lnTex(A)}} = \frac{1}{${a.tex()}}\), not \(-${a.tex()}\).` },
      value.neg(),
    ],
    cosh: [
      { value: sOf(A), why: R`That is \(\sinh\). \(\cosh x = \frac{e^{x} + e^{-x}}{2}\) adds the two exponentials.` },
      { value: a.add(a.inv()), why: R`Divide by 2: \(\cosh x = \frac{e^{x} + e^{-x}}{2}\).` },
      { value: a, why: R`\(e^{\ln a} = a\), but \(\cosh\) averages \(e^{x}\) and \(e^{-x}\).` },
      cOf(A).inv(),
    ],
    tanh: [
      { value: tOf(A).inv().mul(sgn), why: R`That is \(\coth x = \frac{\cosh x}{\sinh x}\). \(\tanh x = \frac{\sinh x}{\cosh x}\).` },
      { value: sOf(A).mul(sgn), why: R`That is \(\sinh(${arg})\). Divide it by \(\cosh(${arg})\).` },
      value.neg(),
      cOf(A),
    ],
  }[name];
  const sv = sOf(A).mul(neg ? -1 : 1);
  const cv = cOf(A);
  return q({
    prompt: R`Find the exact value of \(${'\\' + name}\left(${arg}\right)\).`,
    correct: value,
    wrong: wrongs,
    solution: [
      R`\(e^{${arg}} = ${ea.tex()}\) and \(e^{-(${arg})} = ${ea.inv().tex()}\).`,
      name === 'tanh'
        ? R`\(\sinh = \frac{1}{2}\left(${ea.tex()} - ${ea.inv().tex()}\right) = ${sv.tex()}\) and \(\cosh = \frac{1}{2}\left(${ea.tex()} + ${ea.inv().tex()}\right) = ${cv.tex()}\).`
        : R`\(${'\\' + name}\left(${arg}\right) = \dfrac{${ea.tex()} ${name === 'sinh' ? '-' : '+'} ${ea.inv().tex()}}{2}\).`,
      name === 'tanh' ? R`\(\tanh = \dfrac{${sv.tex()}}{${cv.tex()}} = ${value.tex()}\).` : R`\(= ${value.tex()}\).`,
    ],
    rule: 0,
    skill: 'values of hyperbolic functions',
    check: () => checkEqual(Math[name](neg ? -log(a.value) : log(a.value)), value.value, 1e-9, name),
  });
}

function easyDerivative(rng) {
  const name = rng.pick(['sinh', 'cosh', 'tanh']);
  const c = rng.pick([1, 1, 2, 3, 4, 5, -1, -2, -3]);
  const k = rng.int(1, 5);
  const u = kx(k);
  const f = (x) => c * Math[name](k * x);
  const deriv = { sinh: [hyp('cosh', u), (x) => cosh(k * x)], cosh: [hyp('sinh', u), (x) => sinh(k * x)], tanh: [hyp('sech', u, '^{2}'), (x) => sech(k * x) ** 2] };
  const [dTex, dJs] = deriv[name];
  const right = { tex: terms([[c * k, dTex]]), f: (x) => c * k * dJs(x) };
  const wrong = [
    c < 0 ? { tex: terms([[-c * k, dTex]]), f: (x) => -c * k * dJs(x), why: R`The factor \(${c}\) carries through unchanged, and the derivative of \(${'\\' + name} u\) has no minus sign of its own, so the result is negative.` } : name !== 'sinh' ? { tex: terms([[-c * k, dTex]]), f: (x) => -c * k * dJs(x), why: R`Unlike \(\cos\), there is no minus sign: \(\frac{d}{dx}\cosh x = \sinh x\) and \(\frac{d}{dx}\tanh x = \operatorname{sech}^{2} x\).` } : { tex: terms([[-c * k, dTex]]), f: (x) => -c * k * dJs(x), why: R`\(\frac{d}{dx}\sinh x = \cosh x\), with no minus sign.` },
    k > 1 ? { tex: terms([[c, dTex]]), f: (x) => c * dJs(x), why: R`The chain rule multiplies by the derivative of \(${u}\), which is \(${k}\).` } : null,
    name === 'tanh' ? { tex: terms([[c * k, hyp('tanh', u, '^{2}')]]), f: (x) => c * k * tanh(k * x) ** 2 } : { tex: terms([[c * k, hyp(name, u)]]), f: (x) => c * k * Math[name](k * x), why: `The derivative of a hyperbolic function is a different function: sinh and cosh swap.` },
    { tex: terms([[c * k, name === 'tanh' ? hyp('sech', u) : dTex.replace(/ /, '^{2} ')]]), f: name === 'tanh' ? (x) => c * k * sech(k * x) : (x) => c * k * dJs(x) ** 2 },
    k > 1 ? { tex: fterms([[frac(c, k), dTex]]), f: (x) => (c / k) * dJs(x) } : null,
  ].filter((w) => w && Number.isFinite(w.f(0.5)));
  return q({
    prompt: R`Find \(\dfrac{d}{dx}\left[${terms([[c, hyp(name, u)]])}\right]\).`,
    ...funcChoices(right, wrong),
    solution: [
      name === 'tanh' ? R`\(\dfrac{d}{dx}\tanh u = \operatorname{sech}^{2} u \cdot u'\).` : R`\(\dfrac{d}{dx}${'\\' + name} u = ${name === 'sinh' ? '\\cosh' : '\\sinh'} u \cdot u'\).`,
      R`Here \(u = ${u}\) and \(u' = ${k}\).`,
      R`So the derivative is \(${right.tex}\).`,
    ],
    rule: 2,
    skill: 'derivatives',
    check: () => checkDeriv(f, right.f),
  });
}

function easyIdentity(rng) {
  const A = rng.pick(AS);
  const s = sOf(A);
  const c = cOf(A);
  const t = tOf(A);
  const mode = rng.pick(['s2c', 'c2s', 'c2t']);
  const spec = {
    s2c: {
      given: R`\(\sinh x = ${s.tex()}\)`, ask: '\\cosh x', correct: c,
      wrong: [
        { value: s.mul(s).add(1), why: R`\(\cosh^{2} x = 1 + \sinh^{2} x = ${s.mul(s).add(1).tex()}\). Take the square root.` },
        { value: s.div(c), why: R`That is \(\tanh x = \frac{\sinh x}{\cosh x}\).` },
        s.inv(), c.add(1),
      ],
      steps: [R`\(\cosh^{2} x - \sinh^{2} x = 1\), so \(\cosh^{2} x = 1 + ${s.mul(s).tex()} = ${c.mul(c).tex()}\).`, R`\(\cosh x\) is always positive, so \(\cosh x = ${c.tex()}\).`],
    },
    c2s: {
      given: R`\(\cosh x = ${c.tex()}\) and \(x > 0\)`, ask: '\\sinh x', correct: s,
      wrong: [
        { value: s.neg(), why: R`For \(x > 0\), \(\sinh x > 0\). The negative root belongs to \(x < 0\).` },
        { value: c.mul(c).sub(1), why: R`\(\sinh^{2} x = \cosh^{2} x - 1 = ${c.mul(c).sub(1).tex()}\). Take the square root.` },
        { value: c.inv(), why: R`That is \(\operatorname{sech} x = \frac{1}{\cosh x}\).` },
        t,
      ],
      steps: [R`\(\sinh^{2} x = \cosh^{2} x - 1 = ${c.mul(c).tex()} - 1 = ${s.mul(s).tex()}\).`, R`For \(x > 0\), \(\sinh x > 0\), so \(\sinh x = ${s.tex()}\).`],
    },
    c2t: {
      given: R`\(\cosh x = ${c.tex()}\) and \(x > 0\)`, ask: '\\tanh x', correct: t,
      wrong: [
        { value: t.inv(), why: R`That is \(\coth x = \frac{\cosh x}{\sinh x}\). \(\tanh x = \frac{\sinh x}{\cosh x}\).` },
        { value: s, why: R`That is \(\sinh x\). Divide it by \(\cosh x\).` },
        c.inv(), t.neg(),
      ],
      steps: [R`\(\sinh x = \sqrt{\cosh^{2} x - 1} = \sqrt{${c.mul(c).tex()} - 1} = ${s.tex()}\) (positive because \(x > 0\)).`, R`\(\tanh x = \dfrac{\sinh x}{\cosh x} = \dfrac{${s.tex()}}{${c.tex()}} = ${t.tex()}\).`],
    },
  }[mode];
  const x = log(A[0] / A[1]);
  return q({
    prompt: R`Given ${spec.given}, find \(${spec.ask}\).`,
    correct: spec.correct,
    wrong: spec.wrong,
    solution: [...spec.steps, R`So \(${spec.ask} = ${spec.correct.tex()}\).`],
    rule: 1,
    skill: 'the identity cosh² − sinh² = 1',
    check: () => checkEqual({ s2c: cosh(asinh(s.value)), c2s: sinh(acosh(c.value)), c2t: tanh(acosh(c.value)) }[mode], spec.correct.value, 1e-9, mode) === true && checkEqual(cosh(x) ** 2 - sinh(x) ** 2, 1, 1e-9, 'identity'),
  });
}

// ───────────── Medium ─────────────

// Derivatives that need the chain, product or log rule. Each item gets c (outer factor) and k.
const CHAIN = [
  (c, k) => ({
    f: terms([[c, `\\ln(${hyp('cosh', kx(k))})`]]), F: (x) => c * log(cosh(k * x)),
    right: { tex: terms([[c * k, hyp('tanh', kx(k))]]), f: (x) => c * k * tanh(k * x) },
    wrong: [{ tex: terms([[c * k, hyp('coth', kx(k))]]), f: (x) => (c * k) / tanh(k * x), why: R`\(\frac{d}{dx}\ln(\cosh u) = \frac{\sinh u}{\cosh u}\cdot u'\): sinh over cosh, which is \(\tanh\).` }, { tex: terms([[c, hyp('tanh', kx(k))]]), f: (x) => c * tanh(k * x), why: R`Include the chain-rule factor \(${k}\) from \(${kx(k)}\).` }, { tex: fterms([[c, '', hyp('cosh', kx(k))]]), f: (x) => c / cosh(k * x) }, { tex: terms([[-c * k, hyp('tanh', kx(k))]]), f: (x) => -c * k * tanh(k * x) }],
    steps: [R`\(\dfrac{d}{dx}\ln(\cosh u) = \dfrac{1}{\cosh u}\cdot \sinh u \cdot u' = \tanh u \cdot u'\) with \(u = ${kx(k)}\).`],
  }),
  (c, k) => ({
    f: terms([[c, `x${hyp('sinh', kx(k))}`]]), F: (x) => c * x * sinh(k * x),
    right: { tex: terms([[c, hyp('sinh', kx(k))], [c * k, `x${hyp('cosh', kx(k))}`]]), f: (x) => c * sinh(k * x) + c * k * x * cosh(k * x) },
    wrong: [{ tex: terms([[c * k, hyp('cosh', kx(k))]]), f: (x) => c * k * cosh(k * x), why: R`Use the product rule: \((uv)' = u'v + uv'\) with \(u = x\).` }, { tex: terms([[c, hyp('sinh', kx(k))], [-c * k, `x${hyp('cosh', kx(k))}`]]), f: (x) => c * sinh(k * x) - c * k * x * cosh(k * x), why: R`\(\frac{d}{dx}\sinh u = +\cosh u\cdot u'\). There is no minus sign.` }, { tex: terms([[c, hyp('cosh', kx(k))], [c * k, `x${hyp('sinh', kx(k))}`]]), f: (x) => c * cosh(k * x) + c * k * x * sinh(k * x) }, { tex: terms([[c * k, `x${hyp('cosh', kx(k))}`]]), f: (x) => c * k * x * cosh(k * x) }],
    steps: [R`Product rule: \(\dfrac{d}{dx}\left[x\sinh u\right] = \sinh u + x\cosh u \cdot u'\) with \(u = ${kx(k)}\), \(u' = ${k}\).`],
  }),
  (c, k) => ({
    f: terms([[c, hyp('sinh', kx(k), '^{2}')]]), F: (x) => c * sinh(k * x) ** 2,
    right: { tex: terms([[2 * c * k, `${hyp('sinh', kx(k))}${hyp('cosh', kx(k))}`]]), f: (x) => 2 * c * k * sinh(k * x) * cosh(k * x) },
    wrong: [{ tex: terms([[2 * c, `${hyp('sinh', kx(k))}${hyp('cosh', kx(k))}`]]), f: (x) => 2 * c * sinh(k * x) * cosh(k * x), why: R`The chain rule also brings out the derivative of \(${kx(k)}\).` }, { tex: terms([[2 * c * k, hyp('cosh', kx(k))]]), f: (x) => 2 * c * k * cosh(k * x), why: R`\(\sinh^{2} u = (\sinh u)^{2}\): bring down the 2, keep \(\sinh u\), then multiply by \(\cosh u \cdot u'\).` }, { tex: terms([[2 * c * k, hyp('cosh', kx(k), '^{2}')]]), f: (x) => 2 * c * k * cosh(k * x) ** 2 }, { tex: terms([[-2 * c * k, `${hyp('sinh', kx(k))}${hyp('cosh', kx(k))}`]]), f: (x) => -2 * c * k * sinh(k * x) * cosh(k * x) }],
    steps: [R`Chain rule twice: \(\dfrac{d}{dx}\sinh^{2} u = 2\sinh u \cdot \cosh u \cdot u'\) with \(u = ${kx(k)}\).`],
  }),
  (c, k) => ({
    f: terms([[c, hyp('cosh', `${k === 1 ? '' : k}x^{2}`)]]), F: (x) => c * cosh(k * x * x),
    right: { tex: terms([[2 * c * k, `x${hyp('sinh', `${k === 1 ? '' : k}x^{2}`)}`]]), f: (x) => 2 * c * k * x * sinh(k * x * x) },
    wrong: [{ tex: terms([[c, hyp('sinh', `${k === 1 ? '' : k}x^{2}`)]]), f: (x) => c * sinh(k * x * x), why: R`Multiply by the derivative of the inside, \(${terms([[2 * k, 'x']])}\).` }, { tex: terms([[-2 * c * k, `x${hyp('sinh', `${k === 1 ? '' : k}x^{2}`)}`]]), f: (x) => -2 * c * k * x * sinh(k * x * x), why: R`\(\frac{d}{dx}\cosh u = +\sinh u \cdot u'\). The minus sign belongs to \(\cos\), not \(\cosh\).` }, { tex: terms([[2 * c * k, `x${hyp('cosh', `${k === 1 ? '' : k}x^{2}`)}`]]), f: (x) => 2 * c * k * x * cosh(k * x * x) }, { tex: terms([[c * k, `x^{2}${hyp('sinh', `${k === 1 ? '' : k}x^{2}`)}`]]), f: (x) => c * k * x * x * sinh(k * x * x) }],
    steps: [R`\(\dfrac{d}{dx}\cosh u = \sinh u \cdot u'\) with \(u = ${terms([[k, 'x^{2}']])}\), \(u' = ${terms([[2 * k, 'x']])}\).`],
  }),
  (c, k) => ({
    f: terms([[c, hyp('tanh', `${k === 1 ? '' : k}\\sqrt{x}`)]]), F: (x) => c * tanh(k * sqrt(x)),
    right: { tex: fterms([[frac(c * k, 2), hyp('sech', `${k === 1 ? '' : k}\\sqrt{x}`, '^{2}'), '\\sqrt{x}']]), f: (x) => ((c * k) / (2 * sqrt(x))) * sech(k * sqrt(x)) ** 2 },
    wrong: [{ tex: terms([[c * k, hyp('sech', `${k === 1 ? '' : k}\\sqrt{x}`, '^{2}')]]), f: (x) => c * k * sech(k * sqrt(x)) ** 2, why: R`The derivative of \(\sqrt{x}\) is \(\frac{1}{2\sqrt{x}}\), not 1.` }, { tex: fterms([[frac(-c * k, 2), hyp('sech', `${k === 1 ? '' : k}\\sqrt{x}`, '^{2}'), '\\sqrt{x}']]), f: (x) => ((-c * k) / (2 * sqrt(x))) * sech(k * sqrt(x)) ** 2, why: R`\(\frac{d}{dx}\tanh u = +\operatorname{sech}^{2} u \cdot u'\).` }, { tex: fterms([[frac(c * k, 2), hyp('tanh', `${k === 1 ? '' : k}\\sqrt{x}`, '^{2}'), '\\sqrt{x}']]), f: (x) => ((c * k) / (2 * sqrt(x))) * tanh(k * sqrt(x)) ** 2 }, { tex: fterms([[frac(c * k, 2), hyp('sech', `${k === 1 ? '' : k}\\sqrt{x}`), '\\sqrt{x}']]), f: (x) => ((c * k) / (2 * sqrt(x))) * sech(k * sqrt(x)) }],
    steps: [R`\(\dfrac{d}{dx}\tanh u = \operatorname{sech}^{2} u \cdot u'\) with \(u = ${terms([[k, '\\sqrt{x}']])}\), \(u' = ${fterms([[frac(k, 2), '', '\\sqrt{x}']])}\).`],
  }),
];

function mediumChain(rng) {
  const c = rng.pick([1, 1, 2, 3, -1, 4]);
  const k = rng.int(1, 4);
  const item = rng.pick(CHAIN)(c, k);
  return q({
    prompt: R`Find \(\dfrac{d}{dx}\left[${item.f}\right]\).`,
    ...funcChoices(item.right, item.wrong),
    solution: [...item.steps, R`The derivative is \(${item.right.tex}\).`],
    rule: 2,
    skill: 'chain rule with hyperbolic functions',
    check: () => checkDeriv(item.F, item.right.f),
  });
}

function mediumIntegral(rng) {
  if (rng.bool(0.3)) {
    // A definite integral from 0 to ln a.
    const A = rng.pick(AS);
    const name = rng.pick(['sinh', 'cosh']);
    const c = rng.int(1, 6);
    const value = name === 'cosh' ? sOf(A).mul(c) : cOf(A).sub(1).mul(c);
    return q({
      prompt: R`Evaluate \(\displaystyle\int_{0}^{${lnTex(A)}} ${terms([[c, `\\${name} x`]])}\,dx\).`,
      correct: value,
      wrong: name === 'cosh'
        ? [{ value: cOf(A).sub(1).mul(c), why: R`An antiderivative of \(\cosh x\) is \(\sinh x\), not \(\cosh x\).` }, { value: sOf(A).mul(-c), why: R`\(\int \cosh x\,dx = +\sinh x\). There is no minus sign.` }, cOf(A).mul(c), sOf(A).mul(c).add(c)]
        : [{ value: cOf(A).mul(c), why: R`Subtract the value at the lower limit: \(\cosh 0 = 1\), not 0.` }, { value: cOf(A).sub(1).mul(-c), why: R`\(\int \sinh x\,dx = +\cosh x\). There is no minus sign.` }, { value: sOf(A).mul(c), why: R`An antiderivative of \(\sinh x\) is \(\cosh x\).` }, cOf(A).add(1).mul(c)],
      solution: [
        R`An antiderivative is \(${terms([[c, name === 'cosh' ? '\\sinh x' : '\\cosh x']])}\).`,
        name === 'cosh' ? R`\(${c === 1 ? '' : c}\left[\sinh(${lnTex(A)}) - \sinh 0\right] = ${c === 1 ? '' : c}\left(${sOf(A).tex()} - 0\right)\).` : R`\(${c === 1 ? '' : c}\left[\cosh(${lnTex(A)}) - \cosh 0\right] = ${c === 1 ? '' : c}\left(${cOf(A).tex()} - 1\right)\).`,
        R`\(= ${value.tex()}\).`,
      ],
      rule: 3,
      skill: 'integrals',
      check: () => checkIntegral((x) => c * Math[name](x), 0, log(A[0] / A[1]), value.value),
    });
  }
  const c = rng.int(1, 6);
  const k = rng.int(1, 4);
  const u = kx(k);
  const ck = frac(c, k);
  const items = [
    { rc: ck, base: hyp('sinh', u), f: terms([[c, hyp('cosh', u)]]), right: { tex: fterms([[ck, hyp('sinh', u)]]), F: (x) => (c / k) * sinh(k * x) }, wrong: [{ tex: terms([[c * k, hyp('sinh', u)]]), F: (x) => c * k * sinh(k * x), why: R`Divide by the inside coefficient \(${k}\); multiplying is what differentiation does.` }, { tex: fterms([[ck.neg(), hyp('sinh', u)]]), F: (x) => -(c / k) * sinh(k * x), why: R`\(\int \cosh u\,du = +\sinh u\).` }, { tex: fterms([[ck, hyp('cosh', u)]]), F: (x) => (c / k) * cosh(k * x) }], steps: [R`\(\int \cosh u\,du = \sinh u\).${k > 1 ? R` With \(u = ${u}\), divide by \(${k}\).` : ''}`] },
    { rc: ck, base: hyp('cosh', u), f: terms([[c, hyp('sinh', u)]]), right: { tex: fterms([[ck, hyp('cosh', u)]]), F: (x) => (c / k) * cosh(k * x) }, wrong: [{ tex: fterms([[ck.neg(), hyp('cosh', u)]]), F: (x) => -(c / k) * cosh(k * x), why: R`\(\int \sinh u\,du = +\cosh u\). The minus sign belongs to \(\int \sin u\,du = -\cos u\).` }, { tex: terms([[c * k, hyp('cosh', u)]]), F: (x) => c * k * cosh(k * x), why: R`Divide by \(${k}\), the derivative of \(${u}\).` }, { tex: fterms([[ck, hyp('sinh', u)]]), F: (x) => (c / k) * sinh(k * x) }], steps: [R`\(\int \sinh u\,du = \cosh u\).${k > 1 ? R` With \(u = ${u}\), divide by \(${k}\).` : ''}`] },
    { rc: ck, base: hyp('tanh', u), f: terms([[c, hyp('sech', u, '^{2}')]]), right: { tex: fterms([[ck, hyp('tanh', u)]]), F: (x) => (c / k) * tanh(k * x) }, wrong: [{ tex: terms([[c * k, hyp('tanh', u)]]), F: (x) => c * k * tanh(k * x), why: R`Divide by \(${k}\), the derivative of \(${u}\).` }, { tex: fterms([[ck.neg(), hyp('tanh', u)]]), F: (x) => -(c / k) * tanh(k * x), why: R`\(\frac{d}{dx}\tanh x = +\operatorname{sech}^{2} x\), so no minus sign.` }, { tex: fterms([[ck, `\\ln(${hyp('cosh', u)})`]]), F: (x) => (c / k) * log(cosh(k * x)) }], steps: [R`\(\frac{d}{du}\tanh u = \operatorname{sech}^{2} u\), so \(\int \operatorname{sech}^{2} u\,du = \tanh u\).${k > 1 ? R` Divide by \(${k}\).` : ''}`] },
    { rc: ck, base: `\\ln(${hyp('cosh', u)})`, f: terms([[c, hyp('tanh', u)]]), right: { tex: fterms([[ck, `\\ln(${hyp('cosh', u)})`]]), F: (x) => (c / k) * log(cosh(k * x)) }, wrong: [{ tex: fterms([[ck, `\\ln|${hyp('sinh', u)}|`]]), F: (x) => (c / k) * log(Math.abs(sinh(k * x))), why: R`\(\tanh u = \frac{\sinh u}{\cosh u}\): the denominator is \(\cosh u\), and its derivative \(\sinh u\) is on top, so the answer is \(\ln(\cosh u)\).` }, { tex: fterms([[ck, hyp('sech', u, '^{2}')]]), F: (x) => (c / k) * sech(k * x) ** 2, why: R`\(\operatorname{sech}^{2}\) is the derivative of \(\tanh\), not its integral.` }, { tex: terms([[c * k, `\\ln(${hyp('cosh', u)})`]]), F: (x) => c * k * log(cosh(k * x)) }], steps: [R`\(\tanh u = \dfrac{\sinh u}{\cosh u}\); substitute \(w = \cosh u\), \(dw = \sinh u\,du\): \(\int \frac{dw}{w} = \ln w\).`, R`\(\cosh u > 0\), so no absolute value is needed.${k > 1 ? R` Divide by \(${k}\) for \(u = ${u}\).` : ''}`] },
    { rc: frac(c, 2 * k), base: hyp('sinh', `${k === 1 ? '' : k}x^{2}`), f: terms([[c, `x${hyp('cosh', `${k === 1 ? '' : k}x^{2}`)}`]]), right: { tex: fterms([[frac(c, 2 * k), hyp('sinh', `${k === 1 ? '' : k}x^{2}`)]]), F: (x) => (c / (2 * k)) * sinh(k * x * x) }, wrong: [{ tex: fterms([[ck, hyp('sinh', `${k === 1 ? '' : k}x^{2}`)]]), F: (x) => (c / k) * sinh(k * x * x), why: R`With \(w = ${terms([[k, 'x^{2}']])}\), \(dw = ${terms([[2 * k, 'x']])}\,dx\): divide by \(${2 * k}\).` }, { tex: fterms([[frac(c, 2 * k), hyp('cosh', `${k === 1 ? '' : k}x^{2}`)]]), F: (x) => (c / (2 * k)) * cosh(k * x * x), why: R`\(\int \cosh w\,dw = \sinh w\).` }, { tex: fterms([[frac(c, 2), `x^{2}${hyp('sinh', `${k === 1 ? '' : k}x^{2}`)}`]]), F: (x) => (c / 2) * x * x * sinh(k * x * x) }], steps: [R`Substitute \(w = ${terms([[k, 'x^{2}']])}\), \(dw = ${terms([[2 * k, 'x']])}\,dx\): the integral becomes \(${fterms([[frac(c, 2 * k), '']])}\int \cosh w\,dw\).`] },
  ];
  const it = rng.pick(items);
  // Two more slips with the coefficient: doubled and halved.
  for (const m of [2, frac(1, 2)]) it.wrong.push({ tex: fterms([[it.rc.mul(m), it.base]]), F: (x) => (m === 2 ? 2 : 0.5) * it.right.F(x) });
  return q({
    prompt: R`Find \(\displaystyle\int ${it.f}\,dx\).`,
    ...antiChoices(it.right, it.wrong),
    solution: [...it.steps, R`\(\displaystyle\int ${it.f}\,dx = ${it.right.tex} + C\).`],
    rule: 3,
    skill: 'integrals',
    check: () => {
      const fJs = (x) => (it.right.F(x + 1e-5) - it.right.F(x - 1e-5)) / 2e-5;
      // Compare with the integrand built independently from the prompt's pieces.
      const g = [(x) => c * cosh(k * x), (x) => c * sinh(k * x), (x) => c * sech(k * x) ** 2, (x) => c * tanh(k * x), (x) => c * x * cosh(k * x * x)][items.indexOf(it)];
      return [0.37, 0.83, 1.29].every((x) => close(fJs(x), g(x), 1e-4)) ? true : 'antiderivative mismatch';
    },
  });
}

const CABLES = [
  { story: (name) => `${name} hangs a decorative chain between two posts`, as: [1, 1.5, 2, 2.5, 3], Ls: [2, 2.5, 3, 3.5, 4, 5, 6] },
  { story: (name) => `A cable carrying only its own weight hangs across a gorge. ${name}, an engineer, models it`, as: [150, 200, 250, 300], Ls: [150, 200, 240, 300, 360] },
  { story: (name) => `${name} studies a power line strung between two towers`, as: [300, 400, 500, 600], Ls: [200, 250, 300, 400] },
];
function cableSetup(rng) {
  for (;;) {
    const s = rng.pick(CABLES);
    const a = rng.pick(s.as);
    const L = rng.pick(s.Ls);
    const u = L / (2 * a);
    if (u >= 0.15 && u <= 1) return { s, a, L, u, name: person(rng) };
  }
}
// Keep wrong numeric answers well apart (at least 4 hundredths) from the answer and from each other.
function apart(correct, list, gap = 0.04) {
  const p = gap >= 0.4 ? 1 : 2;
  const kept = [round(correct, p)];
  const out = [];
  for (const w of list) {
    const v = typeof w === 'object' && w ? w.value : w;
    if (v == null || !Number.isFinite(v)) continue;
    const r = round(v, p);
    if (kept.some((k) => Math.abs(k - r) < gap - 1e-9)) continue;
    kept.push(r);
    out.push(typeof w === 'object' ? { ...w, value: r } : r);
  }
  return out;
}

function mediumWordSag(rng) {
  const { s, a, L, name } = cableSetup(rng);
  const H = a * cosh(L / (2 * a));
  const sag = H - a;
  return q({
    prompt: R`${s.story(name)} as the catenary \(y = ${num(a)}\cosh\left(\dfrac{x}{${num(a)}}\right)\), with supports at \(x = \pm ${num(L / 2)}\) (in meters). How far does the middle of the cable sag below the supports? Round to two decimal places.`,
    visual: catenaryPlot(a, L, { alt: `The catenary y = ${a} cosh(x/${a}) hanging between supports at x = −${L / 2} and x = ${L / 2}. Its lowest point is (0, ${a}); the sag is the vertical distance from the lowest point up to the height of the supports.` }),
    correct: round(sag, 2),
    fmt: (v) => R`\(${D(v)}\) m`,
    wrong: apart(sag, [
      { value: H, why: R`That is the height of the supports, \(y(${num(L / 2)})\). The sag is that height minus the height of the lowest point, \(y(0) = ${num(a)}\).` },
      { value: a * cosh(L / a) - a, why: R`The supports are at \(x = \pm ${num(L / 2)}\), half the span, so evaluate at \(${num(L / 2)}\), not \(${num(L)}\).` },
      { value: a * sinh(L / (2 * a)), why: R`That is the arc length from the lowest point to a support, \(a\sinh\frac{x}{a}\). The sag uses \(\cosh\).` },
      sag * 2,
      sag / 2,
    ]),
    solution: [
      R`The lowest point is at \(x = 0\): \(y(0) = ${num(a)}\cosh 0 = ${num(a)}\).`,
      R`At a support: \(y(${num(L / 2)}) = ${num(a)}\cosh\left(\dfrac{${num(L / 2)}}{${num(a)}}\right) \approx ${D(H, 4)}\).`,
      R`Sag \(= ${D(H, 4)} - ${num(a)} \approx ${D(sag)}\) m.`,
    ],
    rule: 5,
    skill: 'catenary sag',
    // The rise from the lowest point is the integral of the slope y' = sinh(x/a).
    check: () => checkIntegral((x) => sinh(x / a), 0, L / 2, sag, 1e-7),
  });
}

// ───────────── Hard ─────────────

function hardInverseLog(rng) {
  const A = rng.pick(AS);
  const name = rng.pick(['sinh', 'cosh', 'tanh']);
  const neg = name !== 'cosh' && rng.bool(0.3);
  const input = VAL[name](A).mul(neg ? -1 : 1);
  const right = lnCombo([[neg ? -1 : 1, A[0], A[1]]]);
  const formula = { sinh: R`\ln\left(x + \sqrt{x^{2} + 1}\right)`, cosh: R`\ln\left(x + \sqrt{x^{2} - 1}\right)`, tanh: R`\frac{1}{2}\ln\frac{1 + x}{1 - x}` }[name];
  const inv = { sinh: asinh, cosh: acosh, tanh: atanh }[name];
  const steps = {
    sinh: [R`\(x^{2} + 1 = ${input.mul(input).add(1).tex()}\), so \(\sqrt{x^{2} + 1} = ${cOf(A).tex()}\).`, R`\(x + \sqrt{x^{2} + 1} = ${input.tex()} + ${cOf(A).tex()} = ${input.add(cOf(A)).tex()}\).`],
    cosh: [R`\(x^{2} - 1 = ${input.mul(input).sub(1).tex()}\), so \(\sqrt{x^{2} - 1} = ${sOf(A).tex()}\).`, R`\(x + \sqrt{x^{2} - 1} = ${input.tex()} + ${sOf(A).tex()} = ${input.add(sOf(A)).tex()}\).`],
    tanh: [R`\(\dfrac{1 + x}{1 - x} = \dfrac{${input.add(1).tex()}}{${frac(1, 1).sub(input).tex()}} = ${input.add(1).div(frac(1, 1).sub(input)).tex()}\).`, R`\(\frac{1}{2}\ln\left(${input.add(1).div(frac(1, 1).sub(input)).tex()}\right) = \frac{1}{2}\cdot 2\ln${neg ? `\\frac{${A[1]}}{${A[0]}}` : A[1] === 1 ? ` ${A[0]}` : `\\frac{${A[0]}}{${A[1]}}`}\).`],
  }[name];
  const pos = input.value > 0 ? input : null;
  return q({
    prompt: R`Use the logarithm form of \(${'\\' + name}^{-1}\) to find the exact value of \(${'\\' + name}^{-1}\left(${input.tex()}\right)\).`,
    ...exactChoices(right, [
      { k: lnCombo([[neg ? 1 : -1, A[0], A[1]]]), why: name === 'cosh' ? R`\(\cosh^{-1}\) gives the non-negative solution, \(${right.tex}\).` : R`\(${'\\' + name}^{-1}\) of a ${neg ? 'negative' : 'positive'} number is ${neg ? 'negative' : 'positive'}.` },
      { k: lnCombo([[neg ? -2 : 2, A[0], A[1]]]), why: name === 'tanh' ? R`Keep the factor \(\frac{1}{2}\) in \(\tanh^{-1} x = \frac{1}{2}\ln\frac{1 + x}{1 - x}\).` : null },
      { k: lnCombo([[frac(neg ? -1 : 1, 2), A[0], A[1]]]) },
      pos ? { k: lnCombo([[1, pos.n, pos.d]]), why: R`That is \(\ln x\). Use \(${formula}\).` } : null,
      lnCombo([[neg ? -1 : 1, 2 * A[0], A[1]]]),
    ].map((w) => (w && w.why === null ? { k: w.k } : w))),
    solution: [R`\(${'\\' + name}^{-1} x = ${formula}\) with \(x = ${input.tex()}\).`, ...steps, R`So \(${'\\' + name}^{-1}\left(${input.tex()}\right) = ${right.tex}\).`],
    rule: 4,
    skill: 'inverse hyperbolics as logarithms',
    check: () => checkEqual(inv(input.value), right.value, 1e-9, `${name}⁻¹`),
  });
}

function hardInverseDerivative(rng) {
  const c = rng.int(1, 4);
  const k = rng.int(1, 5);
  const kk = k * k;
  const sq = (s) => terms([[kk, 'x^{2}'], [s, '']]);
  const top = (m) => (m === 1 ? '1' : String(m));
  const arg = kx(k);
  const fam = rng.pick(['sinh', 'cosh', 'tanh', 'sinh', 'tanh', 'x2', 'sin']);
  let f, F, right, wrong, xs, steps;
  if (fam === 'sinh' || fam === 'cosh') {
    const s = fam === 'sinh' ? 1 : -1;
    f = terms([[c, `\\${fam}^{-1}(${arg})`]]);
    F = (x) => c * (fam === 'sinh' ? asinh : acosh)(k * x);
    xs = fam === 'sinh' ? [0.3, 0.8, 1.4] : [1.3 / k, 1.8 / k, 2.6 / k];
    const g = (sg, m) => (x) => m / sqrt(kk * x * x + sg);
    right = { tex: `\\frac{${top(c * k)}}{\\sqrt{${sq(s)}}}`, f: g(s, c * k) };
    wrong = [
      { tex: `\\frac{${top(c * k)}}{\\sqrt{${sq(-s)}}}`, f: g(-s, c * k), why: fam === 'sinh' ? R`That is the derivative of \(\cosh^{-1}\). For \(\sinh^{-1}\) the square root is \(\sqrt{u^{2} + 1}\).` : R`That is the derivative of \(\sinh^{-1}\). For \(\cosh^{-1}\) the square root is \(\sqrt{u^{2} - 1}\).` },
      k > 1 ? { tex: `\\frac{${top(c)}}{\\sqrt{${sq(s)}}}`, f: g(s, c), why: R`The chain rule multiplies by \(\frac{d}{dx}(${arg}) = ${k}\).` } : null,
      { tex: `\\frac{${top(c * k)}}{${sq(s)}}`, f: (x) => (c * k) / (kk * x * x + s), why: R`The derivative has a square root in the denominator. (\(\frac{1}{1 + u^{2}}\) is the derivative of \(\tan^{-1} u\).)` },
      { tex: `\\frac{${top(c * k)}}{\\sqrt{${terms([[1, ''], [-kk, 'x^{2}']])}}}`, f: (x) => (c * k) / sqrt(1 - kk * x * x) },
    ];
    steps = [R`\(\dfrac{d}{dx}${'\\' + fam}^{-1} u = \dfrac{u'}{\sqrt{u^{2} ${s > 0 ? '+' : '-'} 1}}\) with \(u = ${arg}\), \(u' = ${k}\).`];
  } else if (fam === 'tanh') {
    f = terms([[c, `\\tanh^{-1}(${arg})`]]);
    F = (x) => c * atanh(k * x);
    xs = [0.15 / k, 0.4 / k, 0.7 / k];
    right = { tex: `\\frac{${top(c * k)}}{${terms([[1, ''], [-kk, 'x^{2}']])}}`, f: (x) => (c * k) / (1 - kk * x * x) };
    wrong = [
      { tex: `\\frac{${top(c * k)}}{${terms([[1, ''], [kk, 'x^{2}']])}}`, f: (x) => (c * k) / (1 + kk * x * x), why: R`That is the derivative of \(\tan^{-1}\). For \(\tanh^{-1}\) it is \(\frac{1}{1 - u^{2}}\).` },
      k > 1 ? { tex: `\\frac{${top(c)}}{${terms([[1, ''], [-kk, 'x^{2}']])}}`, f: (x) => c / (1 - kk * x * x), why: R`Multiply by \(\frac{d}{dx}(${arg}) = ${k}\).` } : null,
      { tex: `\\frac{${top(c * k)}}{\\sqrt{${terms([[1, ''], [-kk, 'x^{2}']])}}}`, f: (x) => (c * k) / sqrt(1 - kk * x * x), why: R`There is no square root in the derivative of \(\tanh^{-1}\).` },
      { tex: `${top(c * k) === '1' ? '' : top(c * k)}\\operatorname{sech}^{2}(${arg})`.replace(/^/, ''), f: (x) => (c * k) / cosh(k * x) ** 2 },
    ];
    steps = [R`\(\dfrac{d}{dx}\tanh^{-1} u = \dfrac{u'}{1 - u^{2}}\) with \(u = ${arg}\), \(u' = ${k}\) (for \(|u| < 1\)).`];
  } else if (fam === 'x2') {
    f = terms([[c, '\\sinh^{-1}(x^{2})']]);
    F = (x) => c * asinh(x * x);
    xs = [0.3, 0.8, 1.4];
    right = { tex: `\\frac{${2 * c}x}{\\sqrt{x^{4} + 1}}`, f: (x) => (2 * c * x) / sqrt(x ** 4 + 1) };
    wrong = [
      { tex: `\\frac{${top(c)}}{\\sqrt{x^{4} + 1}}`, f: (x) => c / sqrt(x ** 4 + 1), why: R`Multiply by \(\frac{d}{dx}(x^{2}) = 2x\).` },
      { tex: `\\frac{${2 * c}x}{\\sqrt{x^{2} + 1}}`, f: (x) => (2 * c * x) / sqrt(x * x + 1), why: R`Square the inside function: \(u^{2} = (x^{2})^{2} = x^{4}\).` },
      { tex: `\\frac{${2 * c}x}{\\sqrt{x^{4} - 1}}`, f: (x) => (2 * c * x) / sqrt(x ** 4 - 1) },
      { tex: `\\frac{${2 * c}x}{x^{4} + 1}`, f: (x) => (2 * c * x) / (x ** 4 + 1) },
    ];
    steps = [R`\(\dfrac{d}{dx}\sinh^{-1} u = \dfrac{u'}{\sqrt{u^{2} + 1}}\) with \(u = x^{2}\), \(u' = 2x\), \(u^{2} = x^{4}\).`];
  } else {
    f = terms([[c, '\\tanh^{-1}(\\sin x)']]);
    F = (x) => c * atanh(Math.sin(x));
    xs = [0.3, 0.8, 1.2];
    right = { tex: terms([[c, '\\sec x']]), f: (x) => c / Math.cos(x) };
    wrong = [
      { tex: terms([[c, '\\sec^{2} x']]), f: (x) => c / Math.cos(x) ** 2, why: R`Multiply by \(u' = \cos x\): \(\frac{\cos x}{1 - \sin^{2} x} = \frac{\cos x}{\cos^{2} x}\).` },
      { tex: fterms([[c, '\\cos x', '1 + \\sin^{2} x']]), f: (x) => (c * Math.cos(x)) / (1 + Math.sin(x) ** 2), why: R`For \(\tanh^{-1}\) the denominator is \(1 - u^{2}\), not \(1 + u^{2}\).` },
      { tex: terms([[c, '\\cos x']]), f: (x) => c * Math.cos(x) },
      { tex: terms([[c, '\\tan x']]), f: (x) => c * Math.tan(x) },
    ];
    steps = [R`\(\dfrac{d}{dx}\tanh^{-1} u = \dfrac{u'}{1 - u^{2}}\) with \(u = \sin x\), \(u' = \cos x\).`, R`\(\dfrac{\cos x}{1 - \sin^{2} x} = \dfrac{\cos x}{\cos^{2} x} = \sec x\).`];
  }
  if (c > 1 && fam !== 'sin') steps.push(R`Multiply by the constant \(${c}\).`);
  return q({
    prompt: R`Find \(\dfrac{d}{dx}\left[${f}\right]\).`,
    ...funcChoices(right, wrong, xs),
    solution: [...steps, R`The derivative is \(${right.tex}\).`],
    rule: 4,
    skill: 'derivatives of inverse hyperbolics',
    check: () => checkDeriv(F, right.f, xs),
  });
}

// Arc length of the parabola y = a + x²/(2a) from −L/2 to L/2 (numeric), for distractors and comparisons.
const parabolaLength = (a, L) => integrate((x) => sqrt(1 + (x / a) ** 2), -L / 2, L / 2, 400);

function hardWordLength(rng) {
  const { s, a, L, name } = cableSetup(rng);
  const len = 2 * a * sinh(L / (2 * a));
  return q({
    prompt: R`${s.story(name)} as the catenary \(y = ${num(a)}\cosh\left(\dfrac{x}{${num(a)}}\right)\), with supports at \(x = \pm ${num(L / 2)}\) (in meters). How long is the cable between the supports? Round to two decimal places.`,
    visual: catenaryPlot(a, L, { alt: `The catenary y = ${a} cosh(x/${a}) hanging between supports at x = −${L / 2} and x = ${L / 2}, which are ${L} m apart. The lowest point is (0, ${a}).` }),
    correct: round(len, 2),
    fmt: (v) => R`\(${D(v)}\) m`,
    wrong: apart(len, [
      { value: len / 2, why: R`\(a\sinh\frac{x}{a}\) measures from the lowest point to one support. Double it for the whole cable.` },
      { value: L, why: 'That is the straight-line distance between the supports. A hanging cable is longer.' },
      { value: 2 * a * sinh(L / a), why: R`Each half of the cable runs from \(x = 0\) to \(x = ${num(L / 2)}\), not to \(${num(L)}\).` },
      { value: 2 * a * cosh(L / (2 * a)), why: R`Arc length uses \(\sqrt{1 + (y')^{2}} = \cosh\frac{x}{a}\), whose integral is \(a\sinh\frac{x}{a}\).` },
      len * 1.1,
    ]),
    solution: [
      R`\(y' = \sinh\frac{x}{${num(a)}}\), so \(\sqrt{1 + (y')^{2}} = \sqrt{1 + \sinh^{2}\frac{x}{${num(a)}}} = \cosh\frac{x}{${num(a)}}\).`,
      R`Length \(= \displaystyle\int_{-${num(L / 2)}}^{${num(L / 2)}} \cosh\frac{x}{${num(a)}}\,dx = 2(${num(a)})\sinh\left(\dfrac{${num(L / 2)}}{${num(a)}}\right)\).`,
      R`\(\approx ${D(len)}\) m (compared with a span of ${num(L)} m).`,
    ],
    rule: 5,
    skill: 'arc length of a catenary',
    check: () => checkIntegral((x) => sqrt(1 + sinh(x / a) ** 2), -L / 2, L / 2, len, 1e-7),
  });
}

// ───────────── Challenge ─────────────

function challengeSolve(rng) {
  const mode = rng.pick(['cosh', 'cosh', 'sinh', 'tanh', 'dec']);
  if (mode === 'dec') {
    const k = rng.int(2, 12);
    const x = log(k + sqrt(k * k - 1));
    const show = (v, both = true) => R`\(x ${both ? '= \\pm' : '='} ${D(v, 4)}\)`;
    const far = (v) => (Math.abs(v - x) > 0.002 ? v : null);
    const opts = [
      { value: show(x, false), why: R`\(\cosh\) is even, so \(-${D(x, 4)}\) is also a solution.` },
      far(log(2 * k)) && { value: show(log(2 * k)), why: R`\(\ln 2k\) only approximates \(\cosh^{-1} k\) for large \(k\). Use \(\ln\left(k + \sqrt{k^{2} - 1}\right)\).` },
      far(log(k + sqrt(k * k + 1))) && { value: show(log(k + sqrt(k * k + 1))), why: R`That is \(\sinh^{-1} ${k}\). For \(\cosh\) the square root is \(\sqrt{k^{2} - 1}\).` },
      show(log(k)),
      show(log(k + k * k - 1)),
    ].filter(Boolean);
    return q({
      prompt: R`Solve \(\cosh x = ${k}\). Round to four decimal places.`,
      correct: show(x),
      wrong: opts,
      solution: [
        R`\(\cosh x = ${k}\) has two solutions, \(x = \pm\cosh^{-1} ${k}\), because \(\cosh\) is even and \(${k} > 1\).`,
        R`\(\cosh^{-1} ${k} = \ln\left(${k} + \sqrt{${k * k} - 1}\right) = \ln\left(${k} + \sqrt{${k * k - 1}}\right) \approx ${D(x, 4)}\).`,
        R`So \(x \approx \pm ${D(x, 4)}\).`,
      ],
      rule: 5,
      skill: 'solving cosh x = k',
      check: () => checkEqual(cosh(round(x, 4)), k, 1e-3, 'cosh of the root') === true && checkEqual(acosh(k), x, 1e-12, 'acosh'),
    });
  }
  const A = rng.pick(AS);
  const neg = mode !== 'cosh' && rng.bool(0.4);
  const value = VAL[mode](A).mul(neg ? -1 : 1);
  const ln = lnCombo([[neg ? -1 : 1, A[0], A[1]]]);
  const lnPos = lnCombo([[1, A[0], A[1]]]);
  const both = R`\(x = \pm ${lnPos.tex}\)`;
  const one = R`\(x = ${ln.tex}\)`;
  const right = mode === 'cosh' ? both : one;
  const lnV = lnCombo([[1, Math.abs(value.n), value.d]]);
  const wrong = mode === 'cosh'
    ? [{ value: R`\(x = ${lnPos.tex}\)`, why: R`\(\cosh\) is even: \(\cosh(-x) = \cosh x\), so there is also a negative solution.` }, { value: R`\(x = \pm ${lnV.tex}\)`, why: R`That takes the logarithm of \(${value.tex()}\) directly. Solve \(e^{x} + e^{-x} = ${value.mul(2).tex()}\) as a quadratic in \(e^{x}\).` }, R`\(x = \pm ${lnCombo([[1, 2 * A[0], A[1]]]).tex}\)`, R`\(x = \pm ${lnCombo([[2, A[0], A[1]]]).tex}\)`]
    : [{ value: R`\(x = \pm ${lnPos.tex}\)`, why: R`\(${'\\' + mode}\) is one-to-one (it is always increasing), so there is exactly one solution.` }, { value: R`\(x = ${lnCombo([[neg ? 1 : -1, A[0], A[1]]]).tex}\)`, why: R`\(${'\\' + mode} x\) has the same sign as \(x\), so \(x\) must be ${neg ? 'negative' : 'positive'}.` }, value.n !== 0 && lnV.tex !== lnPos.tex ? R`\(x = ${neg ? '-' : ''}${lnV.tex}\)` : null, R`\(x = ${lnCombo([[neg ? -2 : 2, A[0], A[1]]]).tex}\)`, R`\(x = ${lnCombo([[neg ? -1 : 1, 2 * A[0], A[1]]]).tex}\)`];
  const quad = {
    cosh: [R`Multiply \(\frac{e^{x} + e^{-x}}{2} = ${value.tex()}\) by \(2e^{x}\): \(e^{2x} - ${value.mul(2).tex()}e^{x} + 1 = 0\).`, R`The roots are \(e^{x} = ${frac(A[0], A[1]).tex()}\) and \(e^{x} = ${frac(A[1], A[0]).tex()}\), so \(x = \pm ${lnPos.tex}\).`],
    sinh: [R`Multiply \(\frac{e^{x} - e^{-x}}{2} = ${value.tex()}\) by \(2e^{x}\): \(e^{2x} ${value.n < 0 ? '+' : '-'} ${value.abs().mul(2).tex()}e^{x} - 1 = 0\).`, R`Only the positive root counts: \(e^{x} = ${frac(neg ? A[1] : A[0], neg ? A[0] : A[1]).tex()}\), so \(x = ${ln.tex}\).`],
    tanh: [R`\(\tanh x = \dfrac{e^{2x} - 1}{e^{2x} + 1} = ${value.tex()}\) gives \(e^{2x} = \dfrac{1 + ${value.n < 0 ? `(${value.tex()})` : value.tex()}}{1 - ${value.n < 0 ? `(${value.tex()})` : value.tex()}} = ${value.add(1).div(frac(1, 1).sub(value)).tex()}\).`, R`So \(2x = \ln${value.add(1).div(frac(1, 1).sub(value)).tex().startsWith('\\frac') ? value.add(1).div(frac(1, 1).sub(value)).tex() : ` ${value.add(1).div(frac(1, 1).sub(value)).tex()}`}\) and \(x = ${ln.tex}\).`],
  }[mode];
  return q({
    prompt: R`Solve \(${'\\' + mode} x = ${value.tex()}\) exactly.`,
    correct: right,
    wrong,
    solution: [...quad, R`Answer: ${right}.`],
    rule: 5,
    skill: `solving ${mode} x = k`,
    check: () => {
      const roots = mode === 'cosh' ? [lnPos.value, -lnPos.value] : [ln.value];
      return roots.every((r) => close(Math[mode](r), value.value, 1e-9)) ? true : 'a root does not satisfy the equation';
    },
  });
}

// Identities (true) and look-alikes (false), each with a numeric test l(x, y) = r(x, y).
const csch = (x) => 1 / sinh(x);
const coth = (x) => 1 / tanh(x);
const IDS = [
  [true, '\\cosh^{2} x - \\sinh^{2} x = 1', (x) => cosh(x) ** 2 - sinh(x) ** 2, () => 1],
  [true, '1 - \\tanh^{2} x = \\operatorname{sech}^{2} x', (x) => 1 - tanh(x) ** 2, (x) => sech(x) ** 2],
  [true, '\\coth^{2} x - 1 = \\operatorname{csch}^{2} x', (x) => coth(x) ** 2 - 1, (x) => csch(x) ** 2],
  [true, '\\sinh 2x = 2\\sinh x\\cosh x', (x) => sinh(2 * x), (x) => 2 * sinh(x) * cosh(x)],
  [true, '\\cosh 2x = \\cosh^{2} x + \\sinh^{2} x', (x) => cosh(2 * x), (x) => cosh(x) ** 2 + sinh(x) ** 2],
  [true, '\\cosh 2x = 1 + 2\\sinh^{2} x', (x) => cosh(2 * x), (x) => 1 + 2 * sinh(x) ** 2],
  [true, '\\cosh 2x = 2\\cosh^{2} x - 1', (x) => cosh(2 * x), (x) => 2 * cosh(x) ** 2 - 1],
  [true, '\\sinh(x + y) = \\sinh x\\cosh y + \\cosh x\\sinh y', (x, y) => sinh(x + y), (x, y) => sinh(x) * cosh(y) + cosh(x) * sinh(y)],
  [true, '\\cosh(x + y) = \\cosh x\\cosh y + \\sinh x\\sinh y', (x, y) => cosh(x + y), (x, y) => cosh(x) * cosh(y) + sinh(x) * sinh(y)],
  [true, '\\cosh x + \\sinh x = e^{x}', (x) => cosh(x) + sinh(x), (x) => exp(x)],
  [true, '\\cosh x - \\sinh x = e^{-x}', (x) => cosh(x) - sinh(x), (x) => exp(-x)],
  [true, '\\sinh(-x) = -\\sinh x', (x) => sinh(-x), (x) => -sinh(x)],
  [true, '\\cosh(-x) = \\cosh x', (x) => cosh(-x), (x) => cosh(x)],
  [true, '\\sinh^{2} x = \\frac{\\cosh 2x - 1}{2}', (x) => sinh(x) ** 2, (x) => (cosh(2 * x) - 1) / 2],
  [true, '\\cosh^{2} x = \\frac{\\cosh 2x + 1}{2}', (x) => cosh(x) ** 2, (x) => (cosh(2 * x) + 1) / 2],
  [true, '\\tanh(x + y) = \\frac{\\tanh x + \\tanh y}{1 + \\tanh x\\tanh y}', (x, y) => tanh(x + y), (x, y) => (tanh(x) + tanh(y)) / (1 + tanh(x) * tanh(y))],
  [false, '\\cosh^{2} x + \\sinh^{2} x = 1', (x) => cosh(x) ** 2 + sinh(x) ** 2, () => 1],
  [false, '1 + \\tanh^{2} x = \\operatorname{sech}^{2} x', (x) => 1 + tanh(x) ** 2, (x) => sech(x) ** 2],
  [false, '\\tanh^{2} x - 1 = \\operatorname{sech}^{2} x', (x) => tanh(x) ** 2 - 1, (x) => sech(x) ** 2],
  [false, '\\cosh 2x = 1 - 2\\sinh^{2} x', (x) => cosh(2 * x), (x) => 1 - 2 * sinh(x) ** 2],
  [false, '\\cosh 2x = \\cosh^{2} x - \\sinh^{2} x', (x) => cosh(2 * x), (x) => cosh(x) ** 2 - sinh(x) ** 2],
  [false, '\\sinh 2x = 2\\sinh x', (x) => sinh(2 * x), (x) => 2 * sinh(x)],
  [false, '\\cosh(x + y) = \\cosh x\\cosh y - \\sinh x\\sinh y', (x, y) => cosh(x + y), (x, y) => cosh(x) * cosh(y) - sinh(x) * sinh(y)],
  [false, '\\sinh(x + y) = \\sinh x\\cosh y - \\cosh x\\sinh y', (x, y) => sinh(x + y), (x, y) => sinh(x) * cosh(y) - cosh(x) * sinh(y)],
  [false, '\\cosh x - \\sinh x = e^{x}', (x) => cosh(x) - sinh(x), (x) => exp(x)],
  [false, '\\sinh(-x) = \\sinh x', (x) => sinh(-x), (x) => sinh(x)],
  [false, '\\cosh(-x) = -\\cosh x', (x) => cosh(-x), (x) => -cosh(x)],
  [false, '\\sinh^{2} x = \\frac{1 + \\cosh 2x}{2}', (x) => sinh(x) ** 2, (x) => (1 + cosh(2 * x)) / 2],
  [false, '\\cosh^{2} x = \\frac{\\cosh 2x - 1}{2}', (x) => cosh(x) ** 2, (x) => (cosh(2 * x) - 1) / 2],
  [false, '\\tanh(x + y) = \\frac{\\tanh x + \\tanh y}{1 - \\tanh x\\tanh y}', (x, y) => tanh(x + y), (x, y) => (tanh(x) + tanh(y)) / (1 - tanh(x) * tanh(y))],
];
const TESTS = [[0.4, 0.9], [1, 0.5], [-0.7, 1.3], [1.6, -0.2], [2.1, 0.6]];
const holds = (id) => TESTS.every(([x, y]) => close(id[2](x, y), id[3](x, y), 1e-9));
const has2 = (id) => id[1].includes('y');
const failure = (id, lead = 'Test') => {
  const [x, y] = [1, 0.5];
  return R`${lead} it at \(x = 1${has2(id) ? ', y = 0.5' : ''}\): the left side is about \(${D(id[2](x, y), 4)}\) and the right side about \(${D(id[3](x, y), 4)}\).`;
};

function challengeIdentity(rng) {
  const askTrue = rng.bool();
  const pool = (t) => IDS.filter((id) => id[0] === t);
  const key = rng.pick(pool(askTrue));
  const others = rng.sample(pool(!askTrue), 3);
  return q({
    prompt: askTrue ? 'Exactly one of these equations holds for every value of the variables. Which one is an identity?' : 'Three of these equations are identities. Which one is NOT an identity?',
    correct: M(key[1]),
    wrong: others.map((id) => ({ value: M(id[1]), why: askTrue ? failure(id) : 'That one holds for every x (and y): it is an identity. Check it from the definitions in terms of eˣ and e⁻ˣ.' })),
    solution: askTrue
      ? [R`Write each side with \(e^{x}\) and \(e^{-x}\), or test a value. The identity \(${key[1]}\) holds for every input.`, R`The others are trigonometric identities with a sign that is wrong for hyperbolic functions (Osborn's rule: a product of two sines changes sign). For example, ${failure(others[0], 'test')}`]
      : [failure(key), R`So \(${key[1]}\) is not an identity. The other three hold for every input.`],
    rule: 1,
    skill: 'checking identities',
    check: () => (holds(key) === askTrue && others.every((id) => holds(id) === !askTrue) ? true : 'an identity is labelled wrongly'),
  });
}

function challengeWordParabola(rng) {
  const { s, a, L, name } = cableSetup(rng);
  const h = L / 2;
  const cat = a * cosh(h / a);
  const par = a + (h * h) / (2 * a);
  const diff = cat - par;
  const cm = diff < 0.5; // small gaps in centimeters
  const sc = cm ? 100 : 1;
  const pl = cm ? 1 : 2;
  const unit = cm ? 'cm' : 'm';
  return q({
    prompt: R`${s.story(name)} as the catenary \(y = ${num(a)}\cosh\left(\dfrac{x}{${num(a)}}\right)\) with supports at \(x = \pm ${num(h)}\) (in meters). A quick model replaces it with the parabola \(y = ${num(a)} + \dfrac{x^{2}}{${num(2 * a)}}\), the first two terms of the Maclaurin series. At the supports, how much higher is the catenary than the parabola, in ${cm ? 'centimeters' : 'meters'}? Round to ${cm ? 'one decimal place' : 'two decimal places'}.`,
    visual: catenaryPlot(a, L, { parabola: true, alt: `The catenary y = ${a} cosh(x/${a}) (solid) and the parabola y = ${a} + x²/${2 * a} (dashed) between x = −${h} and x = ${h}. They agree at the lowest point (0, ${a}); towards the supports the catenary rises above the parabola.` }),
    correct: round(sc * diff, pl),
    fmt: (v) => R`\(${D(v, pl)}\) ${unit}`,
    wrong: apart(sc * diff, [
      { value: sc * (cat - a), why: R`That is the sag of the catenary. Subtract the parabola's height at the support, \(${D(par, 4)}\), not the lowest point.` },
      { value: sc * (par - a), why: R`That is the sag of the parabola, \(\frac{x^{2}}{${num(2 * a)}}\) at \(x = ${num(h)}\).` },
      { value: sc * (a * cosh(L / a) - a - (L * L) / (2 * a)), why: R`The supports are at \(x = \pm ${num(h)}\), half the span.` },
      2 * sc * diff,
      0.5 * sc * diff,
    ], cm ? 0.4 : 0.04),
    solution: [
      R`\(\cosh u = 1 + \dfrac{u^{2}}{2} + \dfrac{u^{4}}{24} + \cdots\), so \(${num(a)}\cosh\frac{x}{${num(a)}} \approx ${num(a)} + \frac{x^{2}}{${num(2 * a)}}\): the parabola matches the lowest point and the curvature there.`,
      R`At \(x = ${num(h)}\): catenary \(${num(a)}\cosh\left(\frac{${num(h)}}{${num(a)}}\right) \approx ${D(cat, 4)}\), parabola \(${num(a)} + \frac{${num(h)}^{2}}{${num(2 * a)}} = ${D(par, 4)}\).`,
      R`Difference \(\approx ${D(cat, 4)} - ${D(par, 4)} = ${D(diff, 4)}\) m${cm ? R` \(\approx ${D(100 * diff, 1)}\) cm` : ''}. (The next series term, \(\frac{x^{4}}{24a^{3}}\), accounts for most of it.)`,
    ],
    rule: 5,
    skill: 'catenary versus parabola',
    // The gap is the integral of the difference in slopes: sinh(x/a) − x/a.
    check: () => checkIntegral((x) => sinh(x / a) - x / a, 0, h, diff, 1e-7) === true && checkEqual(round(sc * diff, pl), round(sc * (a * cosh(h / a) - a - (h * h) / (2 * a)), pl), 1e-9, unit),
  });
}

// ───────────── Pictures for the lesson ─────────────

const threeCurves = (x0 = null) => ({
  type: 'plot', x: [-3, 3], y: [-4, 4], step: [1, 1],
  fns: [{ f: cosh, label: 'cosh x', labelAt: 2 }, { f: sinh, color: 'b', label: 'sinh x', labelAt: -1.9 }, { f: tanh, color: 'c', label: 'tanh x', labelAt: 2.5 }, { f: (x) => exp(x) / 2, color: 'd', dashed: true }],
  hlines: [{ y: 1 }, { y: -1 }],
  points: x0 == null ? [{ x: 0, y: 1 }] : [{ x: x0, y: cosh(x0) }, { x: x0, y: sinh(x0), color: 'b' }, { x: x0, y: tanh(x0), color: 'c' }],
  alt: `Graphs of y = cosh x (a U shape with lowest point (0, 1)), y = sinh x (increasing through the origin, odd), and y = tanh x (increasing from −1 to 1, with horizontal asymptotes y = ±1). For large x both cosh x and sinh x approach the dashed curve eˣ/2.${x0 == null ? '' : ` Points are marked at x = ${plainNum(x0, 1)}: cosh ≈ ${plainNum(cosh(x0), 3)}, sinh ≈ ${plainNum(sinh(x0), 3)}, tanh ≈ ${plainNum(tanh(x0), 3)}.`}`,
});

// ───────────── Topic ─────────────

export default {
  id: 'hyperbolic-functions',
  title: 'Hyperbolic Functions',
  summary: 'Evaluate, differentiate and integrate sinh, cosh and tanh and their inverses, and model a hanging cable with a catenary.',
  standards: ['Calculus II: hyperbolic functions'],

  explain: {
    intro: R`The hyperbolic functions are built from \(e^{x}\) and \(e^{-x}\). They behave like the trigonometric functions with a few sign changes: \(\cosh^{2} x - \sinh^{2} x = 1\) instead of \(\cos^{2} + \sin^{2} = 1\), and the derivative of \(\cosh\) is \(+\sinh\). A chain or cable hanging under its own weight takes the shape \(y = a\cosh(x/a)\), the catenary.`,
    rules: [
      {
        title: 'Definitions and values',
        text: R`\(\sinh x = \dfrac{e^{x} - e^{-x}}{2}\), \(\cosh x = \dfrac{e^{x} + e^{-x}}{2}\), \(\tanh x = \dfrac{\sinh x}{\cosh x}\); also \(\operatorname{sech} x = \frac{1}{\cosh x}\), \(\operatorname{csch} x = \frac{1}{\sinh x}\), \(\coth x = \frac{1}{\tanh x}\). \(\cosh\) is even with \(\cosh 0 = 1\); \(\sinh\) and \(\tanh\) are odd. At \(x = \ln a\), use \(e^{\ln a} = a\) and \(e^{-\ln a} = \frac{1}{a}\).`,
        example: R`\(\sinh(\ln 2) = \frac{2 - \frac{1}{2}}{2} = \frac{3}{4}\), \(\cosh(\ln 2) = \frac{5}{4}\), \(\tanh(\ln 2) = \frac{3}{5}\).`,
      },
      {
        title: 'Identities',
        text: R`\(\cosh^{2} x - \sinh^{2} x = 1\) and \(1 - \tanh^{2} x = \operatorname{sech}^{2} x\). Also \(\sinh 2x = 2\sinh x\cosh x\), \(\cosh 2x = \cosh^{2} x + \sinh^{2} x\), \(\cosh(x + y) = \cosh x\cosh y + \sinh x\sinh y\). To check a claimed identity, rewrite both sides with exponentials, or test a few values: one failure disproves it.`,
        example: R`If \(\sinh x = \frac{3}{4}\), then \(\cosh^{2} x = 1 + \frac{9}{16} = \frac{25}{16}\), so \(\cosh x = \frac{5}{4}\) (\(\cosh\) is always positive).`,
      },
      {
        title: 'Derivatives',
        text: R`\(\dfrac{d}{dx}\sinh x = \cosh x\), \(\dfrac{d}{dx}\cosh x = \sinh x\) (no minus sign), \(\dfrac{d}{dx}\tanh x = \operatorname{sech}^{2} x\). With the chain rule, multiply by the derivative of the inside.`,
        example: R`\(\dfrac{d}{dx}\cosh(x^{2}) = 2x\sinh(x^{2})\) and \(\dfrac{d}{dx}\ln(\cosh x) = \tanh x\).`,
      },
      {
        title: 'Integrals',
        text: R`\(\int \cosh x\,dx = \sinh x + C\), \(\int \sinh x\,dx = \cosh x + C\), \(\int \operatorname{sech}^{2} x\,dx = \tanh x + C\), \(\int \tanh x\,dx = \ln(\cosh x) + C\). For \(\cosh kx\), divide by \(k\).`,
        example: R`\(\displaystyle\int_{0}^{\ln 3} \cosh x\,dx = \sinh(\ln 3) - 0 = \frac{3 - \frac{1}{3}}{2} = \frac{4}{3}\).`,
      },
      {
        title: 'Inverse hyperbolic functions',
        text: R`Solving \(x = \sinh y\) as a quadratic in \(e^{y}\) gives \(\sinh^{-1} x = \ln\left(x + \sqrt{x^{2} + 1}\right)\). Likewise \(\cosh^{-1} x = \ln\left(x + \sqrt{x^{2} - 1}\right)\) for \(x \ge 1\) and \(\tanh^{-1} x = \frac{1}{2}\ln\frac{1 + x}{1 - x}\) for \(|x| < 1\). Derivatives: \(\frac{1}{\sqrt{x^{2} + 1}}\), \(\frac{1}{\sqrt{x^{2} - 1}}\), \(\frac{1}{1 - x^{2}}\).`,
        example: R`\(\sinh^{-1}\frac{3}{4} = \ln\left(\frac{3}{4} + \frac{5}{4}\right) = \ln 2\), and \(\dfrac{d}{dx}\sinh^{-1}(3x) = \dfrac{3}{\sqrt{9x^{2} + 1}}\).`,
      },
      {
        title: 'The catenary; solving cosh x = k',
        text: R`A cable hanging between supports at \(x = \pm\frac{L}{2}\) follows \(y = a\cosh\frac{x}{a}\). Its lowest point is \((0, a)\), its sag is \(a\cosh\frac{L}{2a} - a\), and its length from the lowest point to \(x\) is \(a\sinh\frac{x}{a}\), because \(\sqrt{1 + \sinh^{2}} = \cosh\). Near the bottom it looks like the parabola \(y = a + \frac{x^{2}}{2a}\). For \(k > 1\), \(\cosh x = k\) has two solutions, \(x = \pm\ln\left(k + \sqrt{k^{2} - 1}\right)\).`,
        example: R`\(y = 20\cosh\frac{x}{20}\) between \(x = \pm 20\): sag \(= 20(\cosh 1 - 1) \approx 10.86\) m, length \(= 40\sinh 1 \approx 47.01\) m.`,
      },
    ],
    vocab: [
      { term: 'hyperbolic sine and cosine', def: R`\(\sinh x = \frac{e^{x} - e^{-x}}{2}\), \(\cosh x = \frac{e^{x} + e^{-x}}{2}\). The point \((\cosh t, \sinh t)\) lies on the hyperbola \(x^{2} - y^{2} = 1\).` },
      { term: 'catenary', def: R`The curve \(y = a\cosh\frac{x}{a}\) of a flexible cable hanging under its own weight.` },
      { term: 'sag', def: 'The vertical drop from the supports to the lowest point of a hanging cable.' },
      { term: 'inverse hyperbolic function', def: R`\(\sinh^{-1}\), \(\cosh^{-1}\) (for \(x \ge 1\), with values \(\ge 0\)), \(\tanh^{-1}\) (for \(|x| < 1\)); each is a logarithm.` },
    ],
    mistakes: [
      R`Carrying a minus sign over from trigonometry: \(\frac{d}{dx}\cosh x = +\sinh x\) and \(\int \sinh x\,dx = +\cosh x\).`,
      R`Writing \(\cosh^{2} x + \sinh^{2} x = 1\). The hyperbolic identity has a minus sign: \(\cosh^{2} x - \sinh^{2} x = 1\).`,
      R`Forgetting the 2 in the denominator of the definitions.`,
      R`Giving one solution of \(\cosh x = k\). \(\cosh\) is even, so \(x = \pm\cosh^{-1} k\). (\(\sinh x = k\) and \(\tanh x = k\) have one solution each.)`,
      R`Using the full span instead of half of it in the catenary formulas.`,
    ],
    visual: threeCurves(),
  },

  examples: [
    {
      title: 'Values at ln 2',
      problem: R`Find \(\sinh(\ln 2)\), \(\cosh(\ln 2)\) and \(\tanh(\ln 2)\), and check \(\cosh^{2} - \sinh^{2} = 1\).`,
      steps: [
        R`\(e^{\ln 2} = 2\) and \(e^{-\ln 2} = \frac{1}{2}\).`,
        R`\(\sinh(\ln 2) = \frac{2 - \frac{1}{2}}{2} = \frac{3}{4}\), \(\cosh(\ln 2) = \frac{2 + \frac{1}{2}}{2} = \frac{5}{4}\), \(\tanh(\ln 2) = \frac{3/4}{5/4} = \frac{3}{5}\).`,
        R`Check: \(\frac{25}{16} - \frac{9}{16} = 1\).`,
      ],
      answer: R`\(\frac{3}{4}\), \(\frac{5}{4}\), \(\frac{3}{5}\)`,
      visual: threeCurves(log(2)),
    },
    {
      title: 'Derivatives with the chain rule',
      problem: R`Differentiate \(f(x) = \ln(\cosh 3x)\) and \(g(x) = x^{2}\sinh x\).`,
      steps: [
        R`\(f'(x) = \dfrac{1}{\cosh 3x}\cdot \sinh 3x \cdot 3 = 3\tanh 3x\).`,
        R`Product rule: \(g'(x) = 2x\sinh x + x^{2}\cosh x\).`,
      ],
      answer: R`\(f'(x) = 3\tanh 3x\), \(g'(x) = 2x\sinh x + x^{2}\cosh x\)`,
    },
    {
      title: 'An inverse hyperbolic function as a logarithm',
      problem: R`Show that \(\sinh^{-1} x = \ln\left(x + \sqrt{x^{2} + 1}\right)\), and find its derivative.`,
      steps: [
        R`Let \(y = \sinh^{-1} x\), so \(x = \frac{e^{y} - e^{-y}}{2}\). Multiply by \(2e^{y}\): \(e^{2y} - 2xe^{y} - 1 = 0\).`,
        R`Quadratic in \(e^{y}\): \(e^{y} = x \pm \sqrt{x^{2} + 1}\). Only the + sign gives \(e^{y} > 0\), so \(y = \ln\left(x + \sqrt{x^{2} + 1}\right)\).`,
        R`Derivative: \(\dfrac{1 + \frac{x}{\sqrt{x^{2} + 1}}}{x + \sqrt{x^{2} + 1}} = \dfrac{1}{\sqrt{x^{2} + 1}}\).`,
      ],
      answer: R`\(\dfrac{d}{dx}\sinh^{-1} x = \dfrac{1}{\sqrt{x^{2} + 1}}\)`,
    },
    {
      title: 'Word problem: a hanging cable',
      word: true,
      problem: R`A cable hangs as \(y = 20\cosh\frac{x}{20}\) between towers at \(x = \pm 20\) (meters). Find its sag and its length.`,
      steps: [
        R`Lowest point \(y(0) = 20\); at a tower \(y(20) = 20\cosh 1 \approx 30.86\). Sag \(\approx 10.86\) m.`,
        R`\(\sqrt{1 + (y')^{2}} = \sqrt{1 + \sinh^{2}\frac{x}{20}} = \cosh\frac{x}{20}\), so length \(= \displaystyle\int_{-20}^{20} \cosh\frac{x}{20}\,dx = 40\sinh 1 \approx 47.01\) m.`,
        R`The parabola \(y = 20 + \frac{x^{2}}{40}\) with the same lowest point would reach only \(30\) m at the towers: it sags \(10\) m.`,
      ],
      answer: R`Sag \(\approx 10.86\) m; length \(\approx 47.01\) m`,
      visual: catenaryPlot(20, 40, { parabola: true, alt: 'The catenary y = 20 cosh(x/20) (solid) between towers at x = −20 and x = 20, reaching about 30.86 m at the towers, and the parabola y = 20 + x²/40 (dashed), which reaches 30 m. Both have lowest point (0, 20).' }),
    },
  ],

  models: [
    {
      id: 'values',
      title: 'sinh, cosh and tanh at any x',
      intro: 'Type a value of x. The steps build sinh, cosh and tanh from eˣ and e⁻ˣ and check the main identity.',
      inputs: [{ name: 'x', label: 'x', type: 'number', min: -3, max: 3, step: 0.1, value: 0.7 }],
      compute({ x }) {
        const [ep, em] = [exp(x), exp(-x)];
        const p = (v) => D(v, 4);
        return {
          problem: R`Find \(\sinh x\), \(\cosh x\) and \(\tanh x\) for \(x = ${num(x)}\).`,
          steps: [
            R`\(e^{${num(x)}} \approx ${p(ep)}\) and \(e^{${num(-x)}} \approx ${p(em)}\).`,
            R`\(\sinh x = \dfrac{${p(ep)} - ${p(em)}}{2} \approx ${p(sinh(x))}\); \(\cosh x = \dfrac{${p(ep)} + ${p(em)}}{2} \approx ${p(cosh(x))}\).`,
            R`\(\tanh x = \dfrac{\sinh x}{\cosh x} \approx ${p(tanh(x))}\).`,
            R`Check: \(\cosh^{2} x - \sinh^{2} x \approx ${p(cosh(x) ** 2)} - ${p(sinh(x) ** 2)} = 1\) (up to rounding).`,
          ],
          answer: R`\(\sinh ${num(x)} \approx ${p(sinh(x))}\), \(\cosh ${num(x)} \approx ${p(cosh(x))}\), \(\tanh ${num(x)} \approx ${p(tanh(x))}\)`,
          visual: threeCurves(x),
        };
      },
    },
    {
      id: 'cable',
      title: 'Word problem: a hanging cable',
      word: true,
      intro: 'A cable hangs as y = a·cosh(x/a) between two supports. Choose the parameter a (the height of the lowest point) and the span between the supports.',
      inputs: [
        { name: 'a', label: 'Parameter a (m)', type: 'number', min: 0.5, max: 200, step: 0.5, value: 20 },
        { name: 'L', label: 'Span between supports (m)', type: 'number', min: 1, max: 600, step: 1, value: 40 },
      ],
      compute({ a, L }) {
        const u = L / (2 * a);
        if (u > 4) return { error: `With a span of ${txt(L)} m and a = ${txt(a)} m the cable would hang far deeper than it is wide. Make a at least ${txt(Math.ceil(L / 8 * 2) / 2)} m or shorten the span.` };
        const H = a * cosh(u);
        const sag = H - a;
        const len = 2 * a * sinh(u);
        const parSag = (L * L) / (8 * a);
        return {
          problem: R`A cable hangs as \(y = ${num(a)}\cosh\frac{x}{${num(a)}}\) between supports \(${num(L)}\) m apart. Find its sag and its length, and compare with a parabola.`,
          steps: [
            R`The supports are at \(x = \pm ${num(L / 2)}\). Lowest point: \(y(0) = ${num(a)}\). At a support: \(${num(a)}\cosh\left(${num(u, { places: 4 })}\right) \approx ${D(H)}\).`,
            R`Sag \(= ${D(H)} - ${num(a)} \approx ${D(sag)}\) m.`,
            R`Length \(= 2(${num(a)})\sinh\left(${num(u, { places: 4 })}\right) \approx ${D(len)}\) m, compared with the span of ${num(L)} m.`,
            R`The parabola \(y = ${num(a)} + \frac{x^{2}}{${num(2 * a)}}\) sags \(\frac{(${num(L / 2)})^{2}}{${num(2 * a)}} \approx ${D(parSag)}\) m and is about \(${D(parabolaLength(a, L))}\) m long.`,
          ],
          answer: R`Sag \(\approx ${D(sag)}\) m; length \(\approx ${D(len)}\) m`,
          note: u < 0.5 ? 'For a shallow cable the catenary and the parabola are almost the same.' : 'For a deep cable the catenary rises noticeably above the parabola near the supports.',
          visual: catenaryPlot(a, L, { parabola: true, alt: `The catenary y = ${txt(a)} cosh(x/${txt(a)}) (solid) between supports at x = ±${txt(L / 2)}, reaching about ${plainNum(H)} m at the supports, with the parabola y = ${txt(a)} + x²/${txt(2 * a)} (dashed). The sag is about ${plainNum(sag)} m and the cable is about ${plainNum(len)} m long.` }),
        };
      },
    },
  ],

  quiz: {
    easy: [easyValue, easyDerivative, easyIdentity],
    medium: [mediumChain, mediumIntegral, mediumWordSag],
    hard: [hardInverseLog, hardInverseDerivative, hardWordLength],
    challenge: [challengeSolve, challengeIdentity, challengeWordParabola],
  },
};
