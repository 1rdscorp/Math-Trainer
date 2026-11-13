import { R, q, frac, num, terms, linear, poly, power, over, texFrac, checkEqual, checkIntegral, checkAntideriv, checkAll, integrate, numDeriv, close } from '../../lib/index.js';
import { M, fit } from './_shared.js';

// ───────────── Helpers ─────────────

const C = (tex) => M(`${tex} + C`); // every indefinite integral carries + C
const coef = (c, body) => terms([[c, body]]); // coef(frac(1, 3), '\\sin(3x)') → "\frac{1}{3}\sin(3x)"; a coefficient of 1 is hidden
const integral = (lo, hi, body, v = 'x') => R`\int_{${lo}}^{${hi}} ${body}\,d${v}`;
const PTS = [0.37, 0.83, 1.29, 1.71];
const TRIG_PTS = [0.3, 0.6, 0.9, 1.2]; // away from the asymptotes of tan and sec
// True when F is not an antiderivative of f: somewhere F′ ≠ f.
const notAnti = (F, f, xs) => xs.some((x) => !close(numDeriv(F, x), f(x), 1e-4));
// Check for "find the antiderivative": the right choice differentiates to f and no wrong choice does.
// (A wrong choice that differed from the right one only by a constant would also be a correct answer.)
const antiCheck = (f, right, wrongs, xs = PTS) => () => checkAll(checkAntideriv(right, f, xs), ...wrongs.map((w, i) => (notAnti(w, f, xs) ? true : `wrong choice ${i + 1} is also an antiderivative`)));
// Answer choices are written [TeX, function, note?]. These turn a list of them into q() choices and into functions.
const asChoices = (list) => list.map(([tex, , why]) => (why ? { value: C(tex), why } : C(tex)));
const fns = (list) => list.map((w) => w[1]);
// The inside function xᵐ + c with the pieces of its derivative.
function insideOf(rng, cLo, cHi) {
  const [m, c] = [rng.int(2, 3), rng.nonzero(cLo, cHi)];
  return { m, c, tex: terms([[1, `x^{${m}}`], [c, '']]), d: m === 2 ? '2x' : '3x^{2}', xd: m === 2 ? 'x' : 'x^{2}', ufn: (x) => x ** m + c, dfn: (x) => m * x ** (m - 1) };
}

// ───────────── Easy ─────────────

// Integrals in which du appears exactly. Each entry gives TeX for the integrand, u, the integrand in u, the factor that
// turns into du (and its reciprocal) and the outer function, the same things as functions, and the answer with two slips.
const SETUPS = [
  (rng) => {
    const [g, n] = [insideOf(rng, -9, 9), rng.int(2, 7)];
    const B = `(${g.tex})^{${n + 1}}`;
    return {
      whole: `${g.d}(${g.tex})^{${n}}`, u: g.tex, target: `u^{${n}}`, du: g.d, inv: R`\frac{1}{${g.d}}`, outer: `(${g.tex})^{${n}}`,
      f: (x) => g.dfn(x) * g.ufn(x) ** n, T: (u) => u ** n, ufn: g.ufn, dfn: g.dfn,
      ans: [coef(frac(1, n + 1), B), (x) => g.ufn(x) ** (n + 1) / (n + 1)],
      slip: [B, (x) => g.ufn(x) ** (n + 1), R`\(\int u^{${n}}\,du = \frac{u^{${n + 1}}}{${n + 1}}\). Divide by the new exponent.`],
      kept: [coef(frac(g.m, n + 1), `${g.xd}${B}`), (x) => (g.dfn(x) * g.ufn(x) ** (n + 1)) / (n + 1)],
    };
  },
  (rng) => {
    const g = insideOf(rng, 1, 9);
    const B = `(${g.tex})^{3/2}`;
    return {
      whole: R`${g.d}\sqrt{${g.tex}}`, u: g.tex, target: R`\sqrt{u}`, du: g.d, inv: R`\frac{1}{${g.d}}`, outer: R`\sqrt{${g.tex}}`,
      f: (x) => g.dfn(x) * Math.sqrt(g.ufn(x)), T: Math.sqrt, ufn: g.ufn, dfn: g.dfn,
      ans: [coef(frac(2, 3), B), (x) => (2 * g.ufn(x) ** 1.5) / 3],
      slip: [coef(frac(3, 2), B), (x) => 1.5 * g.ufn(x) ** 1.5, R`\(\int u^{1/2}\,du = \frac{2}{3}u^{3/2}\): dividing by \(\frac{3}{2}\) multiplies by \(\frac{2}{3}\).`],
      kept: [coef(frac(2 * g.m, 3), `${g.xd}${B}`), (x) => (2 * g.dfn(x) * g.ufn(x) ** 1.5) / 3],
    };
  },
  (rng) => {
    const n = rng.int(2, 6);
    const B = R`\sin^{${n + 1}} x`;
    return {
      whole: R`\sin^{${n}} x\cos x`, u: R`\sin x`, target: `u^{${n}}`, du: R`\cos x`, inv: R`\frac{1}{\cos x}`, outer: R`\sin^{${n}} x`,
      f: (x) => Math.sin(x) ** n * Math.cos(x), T: (u) => u ** n, ufn: Math.sin, dfn: Math.cos,
      ans: [coef(frac(1, n + 1), B), (x) => Math.sin(x) ** (n + 1) / (n + 1)],
      slip: [B, (x) => Math.sin(x) ** (n + 1), R`\(\int u^{${n}}\,du = \frac{u^{${n + 1}}}{${n + 1}}\). Divide by the new exponent.`],
      kept: [coef(frac(1, n + 1), R`${B}\cos x`), (x) => (Math.sin(x) ** (n + 1) * Math.cos(x)) / (n + 1)],
    };
  },
  (rng) => {
    const m = rng.int(2, 3);
    const [d, E] = [m === 2 ? '2x' : '3x^{2}', `e^{x^{${m}}}`];
    return {
      whole: `${d}${E}`, u: `x^{${m}}`, target: 'e^{u}', du: d, inv: R`\frac{1}{${d}}`, outer: E,
      f: (x) => m * x ** (m - 1) * Math.exp(x ** m), T: Math.exp, ufn: (x) => x ** m, dfn: (x) => m * x ** (m - 1),
      ans: [E, (x) => Math.exp(x ** m)],
      slip: [coef(frac(1, m), E), (x) => Math.exp(x ** m) / m, R`\(${d}\,dx\) is exactly \(du\), so no extra constant is needed.`],
      kept: [`${d}${E}`, (x) => m * x ** (m - 1) * Math.exp(x ** m)],
    };
  },
  (rng) => {
    const g = insideOf(rng, -9, 9);
    return {
      whole: R`${g.d}\cos(${g.tex})`, u: g.tex, target: R`\cos u`, du: g.d, inv: R`\frac{1}{${g.d}}`, outer: R`\cos(${g.tex})`,
      f: (x) => g.dfn(x) * Math.cos(g.ufn(x)), T: Math.cos, ufn: g.ufn, dfn: g.dfn,
      ans: [R`\sin(${g.tex})`, (x) => Math.sin(g.ufn(x))],
      slip: [R`-\sin(${g.tex})`, (x) => -Math.sin(g.ufn(x)), R`\(\int \cos u\,du = \sin u\), with no minus sign.`],
      kept: [R`${g.d}\sin(${g.tex})`, (x) => g.dfn(x) * Math.sin(g.ufn(x))],
    };
  },
  (rng) => {
    const n = rng.int(2, 5);
    const B = R`(\ln x)^{${n + 1}}`;
    return {
      whole: R`\frac{(\ln x)^{${n}}}{x}`, u: R`\ln x`, target: `u^{${n}}`, du: R`\frac{1}{x}`, inv: 'x', outer: R`(\ln x)^{${n}}`,
      f: (x) => Math.log(x) ** n / x, T: (u) => u ** n, ufn: Math.log, dfn: (x) => 1 / x,
      ans: [coef(frac(1, n + 1), B), (x) => Math.log(x) ** (n + 1) / (n + 1)],
      slip: [B, (x) => Math.log(x) ** (n + 1), R`\(\int u^{${n}}\,du = \frac{u^{${n + 1}}}{${n + 1}}\). Divide by the new exponent.`],
      kept: [R`\frac{${B}}{${n + 1}x}`, (x) => Math.log(x) ** (n + 1) / ((n + 1) * x)],
    };
  },
];

function easySetUp(rng) {
  const t = rng.pick(SETUPS)(rng);
  const pickU = rng.bool();
  const whole = R`\displaystyle\int ${t.whole}\,dx`;
  // u fits when T(u(x))·u′(x) is the integrand: that is what "the integral becomes ∫ T(u) du" means.
  const fits = (ufn) => [0.6, 1.1, 1.4].every((x) => close(t.T(ufn(x)) * numDeriv(ufn, x), t.f(x), 1e-5));
  const others = [t.dfn, (x) => t.T(t.ufn(x)), (x) => x];
  return q({
    prompt: pickU ? R`Which substitution turns \(${whole}\) into \(\displaystyle\int ${t.target}\,du\)?` : R`Use the substitution \(u = ${t.u}\) to rewrite \(${whole}\) as an integral in \(u\).`,
    correct: pickU ? M(`u = ${t.u}`) : M(R`\int ${t.target}\,du`),
    wrong: pickU
      ? [
        { value: M(`u = ${t.du}`), why: R`Choose the inside function. Its derivative should be the other factor, so that it can become \(du\).` },
        { value: M(`u = ${t.outer}`), why: R`\(u\) is only the inside function, \(${t.u}\). The outer function stays, written in terms of \(u\).` },
        M('u = x'),
      ]
      : [
        { value: M(R`\int ${t.du}\,${t.target}\,du`), why: R`The factor \(${t.du}\,dx\) is exactly \(du\). It is used up by the substitution.` },
        { value: M(R`\int ${t.target}\,dx`), why: R`Everything must be written in terms of \(u\), including \(dx\): replace \(${t.du}\,dx\) by \(du\).` },
        M(R`\int ${t.inv}\,${t.target}\,du`),
      ],
    solution: [
      R`Let \(u = ${t.u}\), the inside function. Then \(du = ${t.du}\,dx\).`,
      R`The factor \(${t.du}\,dx\) in the integrand is exactly \(du\), and what is left is \(${t.target}\).`,
      R`So \(\displaystyle\int ${t.whole}\,dx = \int ${t.target}\,du\).`,
    ],
    rule: 1, skill: 'choosing u',
    check: () => (fits(t.ufn) && others.every((u) => !fits(u)) ? true : 'the key must turn the integrand into T(u) du, and the other substitutions must not'),
  });
}

function easyPerfectMatch(rng) {
  const t = rng.pick(SETUPS)(rng);
  const wrong = [
    t.slip,
    [...t.kept, R`The factor \(${t.du}\,dx\) turned into \(du\). It does not appear again in the answer.`],
    [t.outer, (x) => t.T(t.ufn(x)), R`That only writes the integrand in terms of \(u\). The integral \(\int ${t.target}\,du\) still has to be found.`],
    [coef(-1, t.ans[0]).replace('--', ''), (x) => -t.ans[1](x)],
  ].filter((w) => w[0] !== t.ans[0]);
  return q({
    prompt: R`Find \(\displaystyle\int ${t.whole}\,dx\).`,
    correct: C(t.ans[0]),
    wrong: asChoices(wrong),
    solution: [
      R`Let \(u = ${t.u}\). Then \(du = ${t.du}\,dx\), which is the other factor of the integrand.`,
      R`The integral becomes \(\displaystyle\int ${t.target}\,du\). Integrate, then replace \(u\) by \(${t.u}\).`,
      R`\(${t.ans[0]} + C\).`,
    ],
    rule: 0, skill: 'substitution',
    check: antiCheck(t.f, t.ans[1], fns(wrong)),
  });
}

// Functions of a linear expression L = ax + b. The antiderivative of g(L) is (s/a)·G(L).
const LINEAR = (n) => [
  { of: (L) => R`\cos(${L})`, G: (L) => R`\sin(${L})`, s: frac(1), js: Math.cos, Gjs: Math.sin },
  { of: (L) => R`\sin(${L})`, G: (L) => R`\cos(${L})`, s: frac(-1), js: Math.sin, Gjs: Math.cos },
  { of: (L) => `e^{${L}}`, G: (L) => `e^{${L}}`, s: frac(1), js: Math.exp, Gjs: Math.exp },
  { of: (L) => `(${L})^{${n}}`, G: (L) => `(${L})^{${n + 1}}`, s: frac(1, n + 1), js: (u) => u ** n, Gjs: (u) => u ** (n + 1) },
];

function easyLinearInside(rng) {
  const g = rng.pick(LINEAR(rng.int(2, 6)));
  const [a, b] = [rng.int(2, 7), rng.int(-5, 5)];
  const L = linear(a, b);
  const k = g.s.mul(frac(1, a));
  const F = (c) => (x) => c * g.Gjs(a * x + b);
  const GL = g.G(L);
  const wrong = [
    [coef(g.s, GL), F(g.s.value), R`The inside function has derivative \(${a}\), so \(dx = \frac{1}{${a}}\,du\). Divide by \(${a}\).`],
    [coef(g.s.mul(a), GL), F(g.s.value * a), R`Dividing by \(${a}\) undoes the chain rule. Multiplying by \(${a}\) is what differentiating would do.`],
    [coef(k.neg(), GL), F(-k.value)],
  ];
  return q({
    prompt: R`Find \(\displaystyle\int ${g.of(L)}\,dx\).`,
    correct: C(coef(k, GL)),
    wrong: asChoices(wrong),
    solution: [
      R`Let \(u = ${L}\). Then \(du = ${a}\,dx\), so \(dx = \frac{1}{${a}}\,du\).`,
      R`The integral becomes \(\frac{1}{${a}}\displaystyle\int ${g.of('u')}\,du = ${coef(k, g.G('u'))} + C\).`,
      R`Replace \(u\) by \(${L}\): \(${coef(k, GL)} + C\).`,
    ],
    rule: 2, skill: 'linear inside function',
    check: antiCheck((x) => g.js(a * x + b), F(k.value), fns(wrong)),
  });
}

// ───────────── Medium ─────────────

// Outer functions T(u) with antiderivative s·G(u). The TeX builders take u both bare and in parentheses. s2 is a common wrong value for s.
const OUTERS = (n) => [
  { T: (b, w) => `${w}^{${n}}`, G: (b, w) => `${w}^{${n + 1}}`, s: frac(1, n + 1), s2: frac(1), js: (u) => u ** n, Gjs: (u) => u ** (n + 1), why: R`\(\int u^{${n}}\,du = \frac{u^{${n + 1}}}{${n + 1}}\). Divide by the new exponent.` },
  { T: (b) => R`\sqrt{${b}}`, G: (b, w) => `${w}^{3/2}`, s: frac(2, 3), s2: frac(3, 2), js: Math.sqrt, Gjs: (u) => u ** 1.5, positive: true, why: R`\(\int \sqrt{u}\,du = \frac{2}{3}u^{3/2}\).` },
  { T: (b, w) => R`\cos ${w}`, G: (b, w) => R`\sin ${w}`, s: frac(1), s2: frac(-1), js: Math.cos, Gjs: Math.sin, why: R`\(\int \cos u\,du = \sin u\), with no minus sign.` },
  { T: (b, w) => R`\sin ${w}`, G: (b, w) => R`\cos ${w}`, s: frac(-1), s2: frac(1), js: Math.sin, Gjs: Math.cos, why: R`\(\int \sin u\,du = -\cos u\).` },
  { T: (b) => `e^{${b}}`, G: (b) => `e^{${b}}`, s: frac(1), s2: null, js: Math.exp, Gjs: Math.exp },
];

function mediumAdjust(rng) {
  const o = rng.pick(OUTERS(rng.int(2, 5)));
  const g = o.positive ? insideOf(rng, 1, 9) : insideOf(rng, -9, 9);
  const k = rng.intExcept(1, 6, [g.m]);
  const cu = frac(k, g.m); // k·x^(m−1) dx = cu·du
  const front = coef(k, g.xd);
  const Gx = o.G(g.tex, `(${g.tex})`);
  const F = (c) => (x) => c * o.Gjs(g.ufn(x));
  const right = cu.mul(o.s);
  const wrong = [
    [coef(o.s.mul(k), Gx), F(o.s.value * k), R`\(du = ${g.d}\,dx\), so \(${front}\,dx = ${cu.tex()}\,du\). The factor \(${cu.tex()}\) is missing.`],
    [coef(o.s.mul(k * g.m), Gx), F(o.s.value * k * g.m), R`Divide by \(${g.m}\) to make up for \(du = ${g.d}\,dx\). Do not multiply by it.`],
    o.s2 ? [coef(cu.mul(o.s2), Gx), F(cu.value * o.s2.value), o.why] : null,
    [coef(right.neg(), Gx), F(-right.value)],
  ].filter(Boolean);
  return q({
    prompt: R`Find \(\displaystyle\int ${front}${o.T(g.tex, `(${g.tex})`)}\,dx\).`,
    correct: C(coef(right, Gx)),
    wrong: asChoices(wrong),
    solution: [
      R`Let \(u = ${g.tex}\). Then \(du = ${g.d}\,dx\), so \(${front}\,dx = ${cu.tex()}\,du\).`,
      R`The integral becomes \(${coef(cu, R`\displaystyle\int ${o.T('u', 'u')}\,du`)} = ${coef(right, o.G('u', 'u'))} + C\).`,
      R`Replace \(u\) by \(${g.tex}\): \(${coef(right, Gx)} + C\).`,
    ],
    rule: 2, skill: 'adjusting for a constant',
    check: antiCheck((x) => k * x ** (g.m - 1) * o.js(g.ufn(x)), F(right.value), fns(wrong)),
  });
}

const LOGS = [
  (rng) => {
    const [a, b, c] = [rng.int(1, 9), rng.int(2, 6), rng.nonzero(-9, 9)];
    const lin = linear(b, c);
    const L = R`\ln|${lin}|`;
    const ln = (x) => Math.log(Math.abs(b * x + c));
    const cu = frac(a, b);
    return {
      body: over(a, lin), f: (x) => a / (b * x + c), right: [coef(cu, L), (x) => cu.value * ln(x)],
      wrong: [
        a !== b ? [coef(a, L), (x) => a * ln(x), R`With \(u = ${lin}\), \(du = ${b}\,dx\), so \(dx = \frac{1}{${b}}\,du\). Divide by \(${b}\).`] : null,
        [coef(a * b, L), (x) => a * b * ln(x), R`Divide by \(${b}\) to make up for \(du = ${b}\,dx\). Do not multiply by it.`],
        [over(-a * b, `(${lin})^{2}`), (x) => (-a * b) / (b * x + c) ** 2, 'That is the derivative of the integrand, not an antiderivative.'],
        [coef(cu.neg(), L), (x) => -cu.value * ln(x)],
      ],
      steps: [R`Let \(u = ${lin}\), the denominator. Then \(du = ${b}\,dx\), so \(dx = \frac{1}{${b}}\,du\).`, R`The integral becomes \(${coef(cu, R`\displaystyle\int \frac{1}{u}\,du`)} = ${coef(cu, R`\ln|u|`)} + C\).`],
    };
  },
  (rng) => {
    const g = insideOf(rng, 1, 9);
    const k = rng.intExcept(1, 6, [g.m]);
    const cu = frac(k, g.m);
    const L = R`\ln|${g.tex}|`;
    const ln = (x) => Math.log(Math.abs(g.ufn(x)));
    const top = coef(k, g.xd);
    return {
      body: texFrac(top, g.tex), f: (x) => (k * x ** (g.m - 1)) / g.ufn(x), right: [coef(cu, L), (x) => cu.value * ln(x)],
      wrong: [
        [coef(k, L), (x) => k * ln(x), R`\(du = ${g.d}\,dx\), so \(${top}\,dx = ${cu.tex()}\,du\). The factor \(${cu.tex()}\) is missing.`],
        [coef(k * g.m, L), (x) => k * g.m * ln(x), R`Divide by \(${g.m}\) to make up for \(du = ${g.d}\,dx\). Do not multiply by it.`],
        [coef(cu, R`\ln|x^{${g.m}}|`), (x) => cu.value * Math.log(Math.abs(x ** g.m))],
        [coef(cu.neg(), L), (x) => -cu.value * ln(x)],
      ],
      steps: [R`Let \(u = ${g.tex}\), the denominator. Then \(du = ${g.d}\,dx\), so \(${top}\,dx = ${cu.tex()}\,du\).`, R`The integral becomes \(${coef(cu, R`\displaystyle\int \frac{1}{u}\,du`)} = ${coef(cu, R`\ln|u|`)} + C\).`],
    };
  },
  (rng) => {
    const k = rng.nonzero(-6, 6);
    const ln = (x) => Math.log(Math.abs(Math.cos(x)));
    return {
      body: coef(k, R`\tan x`), f: (x) => k * Math.tan(x), right: [coef(-k, R`\ln|\cos x|`), (x) => -k * ln(x)], xs: TRIG_PTS,
      wrong: [
        [coef(k, R`\ln|\cos x|`), (x) => k * ln(x), R`With \(u = \cos x\), \(du = -\sin x\,dx\). The minus sign carries through.`],
        [coef(k, R`\sec^{2} x`), (x) => k / Math.cos(x) ** 2, R`That is the derivative of \(${coef(k, R`\tan x`)}\), not an antiderivative.`],
        [coef(k, R`\ln|\sin x|`), (x) => k * Math.log(Math.abs(Math.sin(x)))],
        [coef(-k, R`\ln|\sin x|`), (x) => -k * Math.log(Math.abs(Math.sin(x)))],
      ],
      steps: [R`Write \(\tan x = \dfrac{\sin x}{\cos x}\) and let \(u = \cos x\). Then \(du = -\sin x\,dx\), so \(\sin x\,dx = -du\).`, R`The integral becomes \(${coef(-k, R`\displaystyle\int \frac{1}{u}\,du`)} = ${coef(-k, R`\ln|u|`)} + C\).`],
    };
  },
  (rng) => {
    const [k, b, c] = [rng.int(1, 5), rng.nonzero(-6, 6), rng.int(1, 9)];
    const [quad, lin] = [poly([1, b, c]), linear(2, b)];
    const L = R`\ln|${quad}|`;
    const u = (x) => x * x + b * x + c;
    const ln = (x) => Math.log(Math.abs(u(x)));
    return {
      body: texFrac(k === 1 ? lin : `${k}(${lin})`, quad), f: (x) => (k * (2 * x + b)) / u(x), right: [coef(k, L), (x) => k * ln(x)],
      wrong: [
        [coef(frac(k, 2), L), (x) => (k * ln(x)) / 2, R`The numerator \(${lin}\) is exactly the derivative of the denominator, so no factor of \(\frac{1}{2}\) is needed.`],
        [coef(k, R`\ln|${lin}|`), (x) => k * Math.log(Math.abs(2 * x + b)), R`Let \(u\) be the denominator, \(${quad}\). The numerator supplies \(du\).`],
        [coef(2 * k, L), (x) => 2 * k * ln(x)],
        [coef(-k, L), (x) => -k * ln(x)],
      ],
      steps: [R`The numerator contains the derivative of the denominator. Let \(u = ${quad}\), so \(du = (${lin})\,dx\).`, R`The integral becomes \(${coef(k, R`\displaystyle\int \frac{1}{u}\,du`)} = ${coef(k, R`\ln|u|`)} + C\).`],
    };
  },
];

function mediumLog(rng) {
  const t = rng.pick(LOGS)(rng);
  const wrong = t.wrong.filter(Boolean);
  return q({
    prompt: R`Find \(\displaystyle\int ${t.body}\,dx\).`,
    correct: C(t.right[0]),
    wrong: asChoices(wrong),
    solution: [...t.steps, R`Replace \(u\) by the expression in \(x\): \(${t.right[0]} + C\).`],
    rule: 3, skill: 'integrals that give ln|u|',
    check: antiCheck(t.f, t.right[1], fns(wrong), t.xs),
  });
}

function mediumChangeLimits(rng) {
  const root = rng.bool(0.3);
  const n = rng.int(2, 4);
  const [m, c] = [rng.int(2, 3), rng.int(0, 5)];
  const a = rng.int(0, 1);
  const b = a + rng.int(1, 2);
  const [A, B] = [a ** m + c, b ** m + c];
  if (A === a && B === b) return mediumChangeLimits(rng);
  const k = rng.pick([m, m, 1, 2, 4, 5, 6]);
  const cu = frac(k, m);
  const inside = terms([[1, `x^{${m}}`], [c, '']]);
  const [d, xd] = [m === 2 ? '2x' : '3x^{2}', m === 2 ? 'x' : 'x^{2}'];
  const front = coef(k, xd);
  const Tu = root ? R`\sqrt{u}` : `u^{${n}}`;
  const G = (u) => (root ? (2 * u ** 1.5) / 3 : u ** (n + 1) / (n + 1)); // antiderivative of T(u)
  const form = (co, lo, hi) => ({ tex: M(coef(co, integral(lo, hi, Tu, 'u'))), val: co.value * (G(hi) - G(lo)) });
  const right = form(cu, A, B);
  const other = cu.value === 1 ? frac(1, m) : frac(1);
  const wrong = [
    { ...form(cu, a, b), why: R`\(${a}\) and \(${b}\) are values of \(x\). When \(x = ${a}\), \(u = ${A}\), and when \(x = ${b}\), \(u = ${B}\).` },
    { ...form(other, A, B), why: cu.value === 1 ? R`\(${d}\,dx\) is exactly \(du\), so no extra constant is needed.` : R`\(du = ${d}\,dx\), so \(${front}\,dx = ${cu.tex()}\,du\). That factor is missing.` },
    form(other, a, b),
    form(cu.mul(m), A, B),
  ].filter((w) => !close(w.val, right.val, 1e-9));
  const f = (x) => k * x ** (m - 1) * (root ? Math.sqrt(x ** m + c) : (x ** m + c) ** n);
  return q({
    prompt: R`Use the substitution \(u = ${inside}\) to rewrite \(\displaystyle${integral(a, b, `${front}${root ? R`\sqrt{${inside}}` : `(${inside})^{${n}}`}`)}\) as an integral in \(u\).`,
    correct: right.tex,
    wrong: wrong.map((w) => (w.why ? { value: w.tex, why: w.why } : w.tex)),
    solution: [
      R`\(u = ${inside}\) gives \(du = ${d}\,dx\)${cu.value === 1 ? ', which is exactly the other factor' : R`, so \(${front}\,dx = ${cu.tex()}\,du\)`}.`,
      R`Change the limits to values of \(u\): when \(x = ${a}\), \(u = ${A}\), and when \(x = ${b}\), \(u = ${B}\).`,
      R`The integral becomes \(${coef(cu, R`\displaystyle${integral(A, B, Tu, 'u')}`)}\).`,
    ],
    rule: 4, skill: 'changing the limits',
    // The value of the original integral must equal the value of the chosen integral in u, and of no other choice.
    check: () => (wrong.length >= 3 ? checkIntegral(f, a, b, right.val, 1e-6) : 'fewer than three wrong choices are left'),
  });
}

const RATES = [
  { ask: (r, T) => R`A tank leaks water at the rate \(r(t) = ${r}\) liters per minute, where \(t\) is the time in minutes. Exactly how much water leaks out during the first ${T} minutes?`, unit: 'liters', grows: false },
  { ask: (r, T) => R`A medicine enters the bloodstream at the rate \(r(t) = ${r}\) milligrams per hour, where \(t\) is the time in hours. Exactly how much enters during the first ${T} hours?`, unit: 'mg', grows: false },
  { ask: (r, T) => R`A culture of bacteria grows at the rate \(r(t) = ${r}\) grams per hour, where \(t\) is the time in hours. Exactly how much mass does it gain during the first ${T} hours?`, unit: 'grams', grows: true },
];

function mediumRate(rng) {
  const c = rng.pick(RATES);
  const [A, d, j] = [rng.int(2, 9), rng.pick([2, 4, 5, 10]), rng.int(1, 3)];
  const T = d * j;
  const sgn = c.grows ? 1 : -1;
  const ePow = c.grows ? (j === 1 ? 'e' : `e^{${j}}`) : `e^{-${j}}`;
  const bracket = c.grows ? R`\left(${ePow} - 1\right)` : R`\left(1 - ${ePow}\right)`;
  const size = Math.abs(Math.exp(sgn * j) - 1); // the value of the bracket
  const form = (co, body = bracket, val = size) => ({ tex: R`\(${coef(co, body)}\) ${c.unit}`, val: Number(co) * val });
  const right = form(A * d);
  const uT = sgn * j;
  const wrong = [
    { ...form(A), why: R`With \(u = ${c.grows ? '' : '-'}\frac{t}{${d}}\), \(dt = ${sgn * d}\,du\). The factor \(${d}\) is missing.` },
    { ...form(frac(A, d)), why: R`\(dt = ${sgn * d}\,du\): multiply by \(${d}\), do not divide by it.` },
    { ...form(A * d, ePow, Math.exp(uT)), why: R`The antiderivative must also be evaluated at \(t = 0\), where \(e^{0} = 1\).` },
    form(-A * d),
  ];
  const r = (t) => A * Math.exp((sgn * t) / d);
  return q({
    prompt: c.ask(coef(A, `e^{${c.grows ? '' : '-'}t/${d}}`), T),
    correct: right.tex,
    wrong: wrong.map((w) => (w.why ? { value: w.tex, why: w.why } : w.tex)),
    solution: [
      R`The amount is \(\displaystyle${integral(0, T, coef(A, `e^{${c.grows ? '' : '-'}t/${d}}`), 't')}\). Let \(u = ${c.grows ? '' : '-'}\frac{t}{${d}}\), so \(dt = ${sgn * d}\,du\).`,
      R`Change the limits: \(t = 0\) gives \(u = 0\), and \(t = ${T}\) gives \(u = ${uT}\).`,
      R`\(${sgn * A * d}\displaystyle${integral(0, uT, 'e^{u}', 'u')} = ${sgn * A * d}\left(e^{${uT}} - 1\right) = ${coef(A * d, bracket)} \approx ${num(right.val, { places: 1 })}\) ${c.unit}.`,
    ],
    rule: 4, skill: 'substitution in context',
    check: () => (wrong.every((w) => !close(w.val, right.val, 1e-6)) ? checkIntegral(r, 0, T, right.val, 1e-6) : 'a wrong choice has the same value as the key'),
  });
}

// ───────────── Hard ─────────────

// Definite integrals by substitution. Each entry gives the integrand, the limits as [TeX, number], the steps and the exact value.
const DEFINITE = [
  (rng) => {
    const [k, c, b, n] = [rng.int(1, 4), rng.int(0, 2), rng.int(1, 2), rng.int(2, 3)];
    const [A, B] = [c, b * b + c];
    const inside = terms([[1, 'x^{2}'], [c, '']]);
    const cu = frac(k, 2);
    const top = B ** (n + 1) - A ** (n + 1);
    return {
      body: `${coef(k, 'x')}(${inside})^{${n}}`, lo: ['0', 0], hi: [`${b}`, b], f: (x) => k * x * (x * x + c) ** n, value: frac(k * top, 2 * (n + 1)),
      steps: [
        R`Let \(u = ${inside}\). Then \(du = 2x\,dx\), so \(${coef(k, 'x')}\,dx = ${cu.tex()}\,du\). When \(x = 0\), \(u = ${A}\), and when \(x = ${b}\), \(u = ${B}\).`,
        R`\(${coef(cu, R`\displaystyle${integral(A, B, `u^{${n}}`, 'u')}`)} = ${coef(cu, R`\left[\frac{u^{${n + 1}}}{${n + 1}}\right]_{${A}}^{${B}}`)} = ${coef(frac(k, 2 * (n + 1)), R`\left(${B ** (n + 1)} - ${A ** (n + 1)}\right)`)}\).`,
      ],
      wrong: [
        { value: frac(k * b ** (n + 1), 2 * (n + 1)), why: R`The limits \(0\) and \(${b}\) are values of \(x\). In terms of \(u\) they are \(${A}\) and \(${B}\).` },
        { value: frac(k * top, n + 1), why: R`\(du = 2x\,dx\), so \(${coef(k, 'x')}\,dx = ${cu.tex()}\,du\). That factor is missing.` },
        c ? frac(k * B ** (n + 1), 2 * (n + 1)) : null, frac(k * top, 2), frac(2 * k * top, n + 1),
      ],
    };
  },
  (rng) => {
    const [c, b, A, B] = rng.pick([[9, 4, 3, 5], [16, 3, 4, 5], [64, 6, 8, 10], [36, 8, 6, 10], [144, 5, 12, 13]]);
    const under = rng.bool(); // x/√(x² + c) instead of x·√(x² + c)
    const inside = `x^{2} + ${c}`;
    const cubes = B ** 3 - A ** 3;
    return {
      body: under ? R`\frac{x}{\sqrt{${inside}}}` : R`x\sqrt{${inside}}`, lo: ['0', 0], hi: [`${b}`, b], f: (x) => (under ? x / Math.sqrt(x * x + c) : x * Math.sqrt(x * x + c)), value: under ? B - A : frac(cubes, 3),
      steps: [
        R`Let \(u = ${inside}\). Then \(du = 2x\,dx\), so \(x\,dx = \frac{1}{2}\,du\). When \(x = 0\), \(u = ${c}\), and when \(x = ${b}\), \(u = ${b * b + c}\).`,
        under
          ? R`\(\frac{1}{2}\displaystyle${integral(c, b * b + c, 'u^{-1/2}', 'u')} = \Big[\sqrt{u}\Big]_{${c}}^{${b * b + c}} = ${B} - ${A}\).`
          : R`\(\frac{1}{2}\displaystyle${integral(c, b * b + c, R`\sqrt{u}`, 'u')} = \Big[\tfrac{1}{3}u^{3/2}\Big]_{${c}}^{${b * b + c}} = \tfrac{1}{3}\left(${B ** 3} - ${A ** 3}\right)\).`,
      ],
      wrong: under
        ? [{ value: 2 * (B - A), why: R`\(x\,dx = \frac{1}{2}\,du\), and \(\frac{1}{2}\int u^{-1/2}\,du = \sqrt{u}\). The factor \(\frac{1}{2}\) was left out.` }, { value: B, why: R`When \(x = 0\), \(u = ${c}\), not \(0\). Subtract \(\sqrt{${c}} = ${A}\).` }, frac(B - A, 2), b]
        : [{ value: frac(2 * cubes, 3), why: R`\(x\,dx = \frac{1}{2}\,du\). The factor \(\frac{1}{2}\) was left out.` }, { value: frac(B ** 3, 3), why: R`When \(x = 0\), \(u = ${c}\), not \(0\). Subtract the value at the lower limit.` }, frac(cubes, 2), frac(cubes, 6)],
    };
  },
  (rng) => {
    const [k, n] = [rng.int(1, 6), rng.int(2, 5)];
    const viaCos = rng.bool(); // cosⁿx·sin x instead of sinⁿx·cos x
    const [p, s] = viaCos ? [R`\cos`, R`\sin`] : [R`\sin`, R`\cos`];
    const neg = viaCos ? '-' : '';
    return {
      body: coef(k, R`${p}^{${n}} x${s} x`), lo: ['0', 0], hi: [R`\frac{\pi}{2}`, Math.PI / 2], f: (x) => (viaCos ? k * Math.cos(x) ** n * Math.sin(x) : k * Math.sin(x) ** n * Math.cos(x)), value: frac(k, n + 1),
      steps: [
        R`Let \(u = ${p} x\). Then \(du = ${neg}${s} x\,dx\). When \(x = 0\), \(u = ${viaCos ? 1 : 0}\), and when \(x = \frac{\pi}{2}\), \(u = ${viaCos ? 0 : 1}\).`,
        viaCos
          ? R`\(${coef(-k, R`\displaystyle${integral(1, 0, `u^{${n}}`, 'u')}`)} = ${coef(k, R`\displaystyle${integral(0, 1, `u^{${n}}`, 'u')}`)} = ${coef(k, R`\left[\frac{u^{${n + 1}}}{${n + 1}}\right]_{0}^{1}`)}\). Swapping the limits removes the minus sign.`
          : R`\(${coef(k, R`\displaystyle${integral(0, 1, `u^{${n}}`, 'u')}`)} = ${coef(k, R`\left[\frac{u^{${n + 1}}}{${n + 1}}\right]_{0}^{1}`)}\).`,
      ],
      wrong: [
        { value: frac(-k, n + 1), why: viaCos ? R`\(du = -\sin x\,dx\) gives one minus sign, and the limits run from \(u = 1\) down to \(u = 0\), which gives another. They cancel.` : R`\(du = \cos x\,dx\) and the limits run from \(u = 0\) up to \(u = 1\), so nothing is negative.` },
        { value: k, why: R`\(\int u^{${n}}\,du = \frac{u^{${n + 1}}}{${n + 1}}\). Divide by the new exponent.` },
        frac(k, n), 0,
      ],
    };
  },
  (rng) => {
    const [k, n, j] = [rng.int(1, 5), rng.int(1, 3), rng.int(1, 2)];
    const E = j === 1 ? 'e' : 'e^{2}';
    return {
      body: texFrac(coef(k, n === 1 ? R`\ln x` : R`(\ln x)^{${n}}`), 'x'), lo: ['1', 1], hi: [E, Math.exp(j)], f: (x) => (k * Math.log(x) ** n) / x, value: frac(k * j ** (n + 1), n + 1),
      steps: [
        R`Let \(u = \ln x\). Then \(du = \frac{1}{x}\,dx\). When \(x = 1\), \(u = 0\), and when \(x = ${E}\), \(u = ${j}\).`,
        R`\(${coef(k, R`\displaystyle${integral(0, j, power('u', n), 'u')}`)} = ${coef(k, R`\left[\frac{u^{${n + 1}}}{${n + 1}}\right]_{0}^{${j}}`)}\).`,
      ],
      wrong: [
        j > 1 ? { value: frac(k, n + 1), why: R`When \(x = ${E}\), \(u = \ln ${E} = ${j}\), so the upper limit is \(${j}\).` } : null,
        { value: k * j ** (n + 1), why: R`\(\int u^{${n}}\,du = \frac{u^{${n + 1}}}{${n + 1}}\). Divide by the new exponent.` },
        frac(k * j ** n, n), frac(k * j ** (n + 1), n), frac(-k * j ** (n + 1), n + 1),
      ],
    };
  },
  (rng) => {
    const [w, a] = [rng.int(2, 5), rng.int(1, 4)];
    const A = w * a;
    return {
      prompt: R`A piston moves with velocity \(v(t) = ${A}\sin(${w}t)\) centimeters per second. How far does it move between \(t = 0\) and \(t = \frac{\pi}{${w}}\) seconds?`,
      unit: 'cm', lo: ['0', 0], hi: ['', Math.PI / w], f: (t) => A * Math.sin(w * t), value: 2 * a,
      steps: [
        R`The velocity is not negative on this interval, so the distance is \(\displaystyle${integral(0, R`\pi/${w}`, R`${A}\sin(${w}t)`, 't')}\). Let \(u = ${w}t\), so \(dt = \frac{1}{${w}}\,du\). When \(t = 0\), \(u = 0\), and when \(t = \frac{\pi}{${w}}\), \(u = \pi\).`,
        R`\(${coef(a, R`\displaystyle${integral(0, R`\pi`, R`\sin u`, 'u')}`)} = ${coef(a, R`\Big[-\cos u\Big]_{0}^{\pi}`)} = ${coef(a, '(1 + 1)')}\).`,
      ],
      wrong: [
        { value: 2 * A, why: R`\(dt = \frac{1}{${w}}\,du\). The factor \(\frac{1}{${w}}\) was left out.` },
        { value: 0, why: R`\(\cos \pi = -1\), so \(-\cos \pi + \cos 0 = 2\), not \(0\).` },
        a, -2 * a, 2 * a * w * w,
      ],
    };
  },
];

function hardDefinite(rng) {
  const t = rng.pick(DEFINITE)(rng);
  return q({
    prompt: t.prompt ?? R`Evaluate \(\displaystyle${integral(t.lo[0], t.hi[0], t.body)}\).`,
    correct: t.value,
    unit: t.unit,
    wrong: t.wrong,
    solution: [...t.steps, R`The value is \(${num(t.value)}\)${t.unit ? ` ${t.unit}` : ''}.`],
    rule: 4, skill: 'definite integrals by substitution',
    check: () => checkIntegral(t.f, t.lo[1], t.hi[1], Number(t.value), 1e-4),
  });
}

// Integrals where the method has to be chosen: substitution is tempting in all of them but works in only one.
const TECHNIQUES = [
  (rng) => {
    const c = rng.nonzero(-5, 5);
    const u = terms([[1, 'x^{2}'], [c, '']]);
    return {
      body: `(${u})^{2}`, f: (x) => (x * x + c) ** 2,
      right: [poly([frac(1, 5), 0, frac(2 * c, 3), 0, c * c, 0]), (x) => x ** 5 / 5 + (2 * c * x ** 3) / 3 + c * c * x],
      wrong: [
        [R`\frac{(${u})^{3}}{3}`, (x) => (x * x + c) ** 3 / 3, R`That would need a factor \(2x\) to make \(du\), and there is none. Expand the square instead.`],
        [R`\frac{(${u})^{3}}{6x}`, (x) => (x * x + c) ** 3 / (6 * x), R`Only a constant can be divided out to make up for \(du\). \(2x\) is not a constant.`],
        [poly([frac(1, 5), 0, 0, 0, c * c, 0]), (x) => x ** 5 / 5 + c * c * x, R`\((${u})^{2}\) is not \(x^{4} + ${c * c}\). The middle term \(${coef(2 * c, 'x^{2}')}\) is missing.`],
      ],
      steps: [R`There is no factor of \(x\) to supply \(du = 2x\,dx\), so substitution does not work. Expand: \((${u})^{2} = ${poly([1, 0, 2 * c, 0, c * c])}\).`, 'Integrate term by term with the power rule.'],
    };
  },
  (rng) => {
    const c = rng.nonzero(-6, 6);
    const u = terms([[1, 'x^{2}'], [c, '']]);
    return {
      body: R`\frac{${u}}{x}`, f: (x) => (x * x + c) / x,
      right: [terms([[frac(1, 2), 'x^{2}'], [c, R`\ln|x|`]]), (x) => (x * x) / 2 + c * Math.log(Math.abs(x))],
      wrong: [
        [R`\left(${poly([frac(1, 3), 0, c, 0])}\right)\ln|x|`, (x) => (x ** 3 / 3 + c * x) * Math.log(Math.abs(x)), 'A quotient cannot be integrated top and bottom separately. Divide each term of the numerator by x first.'],
        [coef(frac(1, 2), R`\ln|${u}|`), (x) => Math.log(Math.abs(x * x + c)) / 2, R`The substitution \(u = ${u}\) needs \(x\) in the numerator, not in the denominator.`],
        [R`\frac{1}{2}x^{2} ${c > 0 ? '-' : '+'} \frac{${Math.abs(c)}}{x^{2}}`, (x) => (x * x) / 2 - c / (x * x), R`\(\int \frac{1}{x}\,dx = \ln|x|\). The power rule does not apply to \(x^{-1}\).`],
      ],
      steps: [R`Divide each term of the numerator by \(x\): \(\dfrac{${u}}{x} = x ${c > 0 ? '+' : '-'} \dfrac{${Math.abs(c)}}{x}\).`, R`Integrate term by term: \(\int x\,dx = \frac{1}{2}x^{2}\) and \(\int \frac{1}{x}\,dx = \ln|x|\).`],
    };
  },
  (rng) => {
    const c = rng.nonzero(-5, 5);
    const u = terms([[1, 'e^{x}'], [c, '']]);
    return {
      body: `(${u})^{2}`, f: (x) => (Math.exp(x) + c) ** 2,
      right: [terms([[frac(1, 2), 'e^{2x}'], [2 * c, 'e^{x}'], [c * c, 'x']]), (x) => Math.exp(2 * x) / 2 + 2 * c * Math.exp(x) + c * c * x],
      wrong: [
        [R`\frac{(${u})^{3}}{3}`, (x) => (Math.exp(x) + c) ** 3 / 3, R`That would need a factor \(e^{x}\) to make \(du\), and there is none. Expand the square instead.`],
        [R`\frac{(${u})^{3}}{3e^{x}}`, (x) => (Math.exp(x) + c) ** 3 / (3 * Math.exp(x)), R`Only a constant can be divided out to make up for \(du\). \(e^{x}\) is not a constant.`],
        [terms([[frac(1, 2), 'e^{2x}'], [c * c, 'x']]), (x) => Math.exp(2 * x) / 2 + c * c * x, R`\((${u})^{2}\) is not \(e^{2x} + ${c * c}\). The middle term \(${coef(2 * c, 'e^{x}')}\) is missing.`],
      ],
      steps: [R`There is no factor of \(e^{x}\) to supply \(du = e^{x}\,dx\), so expand: \((${u})^{2} = ${terms([[1, 'e^{2x}'], [2 * c, 'e^{x}'], [c * c, '']])}\).`, R`Integrate term by term, using \(\int e^{2x}\,dx = \frac{1}{2}e^{2x}\).`],
    };
  },
  (rng) => {
    const c = rng.nonzero(-5, 5);
    const u = terms([[1, 'x^{2}'], [c, '']]);
    const cube = (k) => (x) => k * (x * x + c) ** 3;
    return {
      body: `x(${u})^{2}`, f: (x) => x * (x * x + c) ** 2,
      right: [R`\frac{(${u})^{3}}{6}`, cube(1 / 6)],
      wrong: [
        [R`\frac{(${u})^{3}}{3}`, cube(1 / 3), R`\(du = 2x\,dx\), so \(x\,dx = \frac{1}{2}\,du\). The factor \(\frac{1}{2}\) is missing.`],
        [R`\frac{x^{2}(${u})^{3}}{6}`, (x) => (x * x * (x * x + c) ** 3) / 6, R`The factor \(x\,dx\) became \(\frac{1}{2}\,du\). It is not integrated separately.`],
        [R`\frac{2(${u})^{3}}{3}`, cube(2 / 3)],
      ],
      steps: [R`Here the factor \(x\) is a constant multiple of the derivative of \(${u}\), so substitute: \(u = ${u}\), \(du = 2x\,dx\), \(x\,dx = \frac{1}{2}\,du\).`, R`\(\frac{1}{2}\displaystyle\int u^{2}\,du = \frac{u^{3}}{6} + C\). Replace \(u\) by \(${u}\).`],
    };
  },
];

function hardTechnique(rng) {
  const t = rng.pick(TECHNIQUES)(rng);
  return q({
    prompt: R`Find \(\displaystyle\int ${t.body}\,dx\). First decide whether it calls for a basic rule, some algebra, or a substitution.`,
    correct: C(t.right[0]),
    wrong: asChoices(t.wrong),
    solution: [...t.steps, R`\(${t.right[0]} + C\).`],
    rule: 5, skill: 'choosing a technique',
    check: antiCheck(t.f, t.right[1], fns(t.wrong)),
  });
}

// Substitutions with trig, exponential and logarithmic inside functions.
const FUNCTIONS = [
  (rng) => {
    const [a, n] = [rng.int(1, 6), rng.int(2, 5)];
    const pow = (k, fn) => (x) => k * fn(x) ** (n + 1);
    return {
      body: coef(a, R`\tan^{${n}} x\sec^{2} x`), f: (x) => (a * Math.tan(x) ** n) / Math.cos(x) ** 2, xs: TRIG_PTS,
      right: [coef(frac(a, n + 1), R`\tan^{${n + 1}} x`), pow(a / (n + 1), Math.tan)],
      wrong: [
        [coef(a, R`\tan^{${n + 1}} x`), pow(a, Math.tan), R`\(\int u^{${n}}\,du = \frac{u^{${n + 1}}}{${n + 1}}\). Divide by the new exponent.`],
        [coef(frac(a, n + 1), R`\sec^{${n + 1}} x`), pow(a / (n + 1), (x) => 1 / Math.cos(x)), R`Choose \(u = \tan x\), because its derivative \(\sec^{2} x\) is the other factor.`],
        [coef(frac(-a, n + 1), R`\tan^{${n + 1}} x`), pow(-a / (n + 1), Math.tan)],
      ],
      steps: [R`Let \(u = \tan x\). Then \(du = \sec^{2} x\,dx\), which is the other factor.`, R`The integral becomes \(${coef(a, R`\displaystyle\int u^{${n}}\,du`)} = ${coef(frac(a, n + 1), `u^{${n + 1}}`)} + C\).`],
    };
  },
  (rng) => {
    const a = rng.int(1, 6);
    const E = R`e^{\sqrt{x}}`;
    const e = (x) => Math.exp(Math.sqrt(x));
    return {
      body: texFrac(coef(a, E), R`\sqrt{x}`), f: (x) => (a * e(x)) / Math.sqrt(x),
      right: [coef(2 * a, E), (x) => 2 * a * e(x)],
      wrong: [
        [coef(a, E), (x) => a * e(x), R`\(du = \frac{1}{2\sqrt{x}}\,dx\), so \(\frac{1}{\sqrt{x}}\,dx = 2\,du\). The factor \(2\) is missing.`],
        [coef(frac(a, 2), E), (x) => (a * e(x)) / 2, R`\(\frac{1}{\sqrt{x}}\,dx = 2\,du\): multiply by \(2\), do not divide by it.`],
        [coef(2 * a, R`\sqrt{x}\,${E}`), (x) => 2 * a * Math.sqrt(x) * e(x)],
      ],
      steps: [R`Let \(u = \sqrt{x}\). Then \(du = \frac{1}{2\sqrt{x}}\,dx\), so \(\frac{1}{\sqrt{x}}\,dx = 2\,du\).`, R`The integral becomes \(${2 * a}\displaystyle\int e^{u}\,du = ${2 * a}e^{u} + C\).`],
    };
  },
  (rng) => {
    const a = rng.int(1, 6);
    const lnx = (x) => Math.log(x);
    return {
      body: over(a, R`x\ln x`), f: (x) => a / (x * lnx(x)),
      right: [coef(a, R`\ln|\ln x|`), (x) => a * Math.log(Math.abs(lnx(x)))],
      wrong: [
        [coef(a, R`\ln|x\ln x|`), (x) => a * Math.log(Math.abs(x * lnx(x))), R`Let \(u = \ln x\) alone. Then \(\frac{1}{x}\,dx\) is \(du\), and the integral is \(\int \frac{1}{u}\,du\).`],
        [coef(frac(a, 2), R`(\ln x)^{2}`), (x) => (a * lnx(x) ** 2) / 2, R`That is \(\int \frac{${coef(a, R`\ln x`)}}{x}\,dx\). Here \(\ln x\) is in the denominator.`],
        [over(-a, R`(\ln x)^{2}`), (x) => -a / lnx(x) ** 2],
      ],
      steps: [R`Let \(u = \ln x\). Then \(du = \frac{1}{x}\,dx\), and the integrand is \(${over(a, 'u')}\) times \(du\).`, R`The integral becomes \(${coef(a, R`\displaystyle\int \frac{1}{u}\,du`)} = ${coef(a, R`\ln|u|`)} + C\).`],
    };
  },
  (rng) => {
    const a = rng.int(1, 6);
    const E = R`e^{\cos x}`;
    const e = (x) => Math.exp(Math.cos(x));
    return {
      body: coef(a, R`\sin x\,${E}`), f: (x) => a * Math.sin(x) * e(x),
      right: [coef(-a, E), (x) => -a * e(x)],
      wrong: [
        [coef(a, E), (x) => a * e(x), R`With \(u = \cos x\), \(du = -\sin x\,dx\). The minus sign carries through.`],
        [coef(-a, R`\cos x\,${E}`), (x) => -a * Math.cos(x) * e(x)],
        [coef(a, R`e^{\sin x}`), (x) => a * Math.exp(Math.sin(x))],
      ],
      steps: [R`Let \(u = \cos x\), the exponent. Then \(du = -\sin x\,dx\), so \(\sin x\,dx = -du\).`, R`The integral becomes \(${coef(-a, R`\displaystyle\int e^{u}\,du`)} = ${coef(-a, 'e^{u}')} + C\).`],
    };
  },
  (rng) => {
    const [a, c] = [rng.int(1, 6), rng.int(1, 5)];
    const u = `e^{x} + ${c}`;
    const den = (x) => Math.exp(x) + c;
    return {
      body: texFrac(coef(a, 'e^{x}'), `(${u})^{2}`), f: (x) => (a * Math.exp(x)) / den(x) ** 2,
      right: [over(-a, u), (x) => -a / den(x)],
      wrong: [
        [over(a, u), (x) => a / den(x), R`\(\int u^{-2}\,du = -u^{-1}\). The minus sign is missing.`],
        [coef(a, R`\ln|${u}|`), (x) => a * Math.log(den(x)), R`\(\ln|u|\) is the antiderivative of \(u^{-1}\), not of \(u^{-2}\).`],
        [over(-a, `3(${u})^{3}`), (x) => -a / (3 * den(x) ** 3)],
      ],
      steps: [R`Let \(u = ${u}\). Then \(du = e^{x}\,dx\), which is the numerator.`, R`The integral becomes \(${coef(a, R`\displaystyle\int u^{-2}\,du`)} = ${coef(-a, 'u^{-1}')} + C\).`],
    };
  },
];

function hardFunctions(rng) {
  const t = rng.pick(FUNCTIONS)(rng);
  return q({
    prompt: R`Find \(\displaystyle\int ${t.body}\,dx\).`,
    correct: C(t.right[0]),
    wrong: asChoices(t.wrong),
    solution: [...t.steps, R`Replace \(u\) by the expression in \(x\): \(${t.right[0]} + C\).`],
    rule: 1, skill: 'substitution',
    check: antiCheck(t.f, t.right[1], fns(t.wrong), t.xs),
  });
}

// ───────────── Challenge ─────────────

function challengeGiven(rng) {
  const K = rng.nonzero(-12, 12);
  const a = rng.int(0, 1);
  const b = a + rng.int(1, 2);
  const k = rng.int(2, 4);
  const c = rng.int(1, 5);
  // inner: the argument of f; weight: the factor in front; co: the constant that the substitution brings out; p, q: the limits in u
  const t = {
    scale: { inner: `${k}x`, weight: '', co: frac(1, k), p: k * a, q: k * b, g: (x) => k * x, w: () => 1, du: R`${k}\,dx`, fix: R`dx = \frac{1}{${k}}\,du` },
    square: { inner: 'x^{2}', weight: 'x', co: frac(1, 2), p: a * a, q: b * b, g: (x) => x * x, w: (x) => x, du: R`2x\,dx`, fix: R`x\,dx = \frac{1}{2}\,du` },
    cube: { inner: 'x^{3}', weight: 'x^{2}', co: frac(1, 3), p: a ** 3, q: b ** 3, g: (x) => x ** 3, w: (x) => x * x, du: R`3x^{2}\,dx`, fix: R`x^{2}\,dx = \frac{1}{3}\,du` },
    shift: { inner: `x + ${c}`, weight: '', co: frac(1), p: a + c, q: b + c, g: (x) => x + c, w: () => 1, du: 'dx', fix: 'no constant is needed' },
  }[rng.pick(['scale', 'square', 'cube', 'shift'])];
  const value = t.co.mul(K);
  const whole = integral(a, b, `${t.weight}f(${t.inner})`);
  const f = (u) => K / (t.q - t.p) + 0.7 * (u - (t.p + t.q) / 2); // a function with ∫ₚ^q f = K
  const one = t.co.value === 1;
  return q({
    prompt: R`Suppose \(f\) is continuous and \(\displaystyle${integral(t.p, t.q, 'f(x)')} = ${K}\). What is \(\displaystyle${whole}\)?`,
    correct: value,
    wrong: one
      ? [{ value: frac(K, c + 1), why: R`With \(u = ${t.inner}\), \(du = dx\). Shifting changes the limits but brings out no constant.` }, { value: K + c, why: R`The shift moves the limits from \(${a}\) and \(${b}\) to \(${t.p}\) and \(${t.q}\). It does not add to the value.` }, K * c, K - c, -K]
      : [{ value: t.co.inv().mul(K), why: R`\(du = ${t.du}\), so \(${t.fix}\). Divide by the constant, do not multiply.` }, { value: K, why: R`\(du = ${t.du}\), so \(${t.fix}\). That constant is missing.` }, value.neg(), t.co.mul(K).mul(t.co)],
    solution: [
      R`Let \(u = ${t.inner}\). Then \(du = ${t.du}\)${one ? '' : R`, so \(${t.fix}\)`}.`,
      R`Change the limits: when \(x = ${a}\), \(u = ${t.p}\), and when \(x = ${b}\), \(u = ${t.q}\).`,
      R`\(${whole} = ${coef(t.co, integral(t.p, t.q, 'f(u)', 'u'))} = ${one ? K : R`${t.co.tex()}(${K}) = ${value.tex()}`}\).`,
    ],
    rule: 4, skill: 'changing the limits',
    // Try it on a real function f whose integral from p to q is K.
    check: () => checkEqual(value.value, integrate((x) => t.w(x) * f(t.g(x)), a, b), 1e-7, 'integral for a test function'),
  });
}

function challengeBackSub(rng) {
  if (rng.bool()) {
    const [p, s] = rng.pick([[1, 2], [1, 3], [2, 3], [2, 4], [3, 4]]);
    const [a, hi] = [p * p, s * s - p * p]; // u = x + a runs from p² to s²
    const [five, three] = [frac(2 * (s ** 5 - p ** 5), 5), frac(2 * a * (s ** 3 - p ** 3), 3)];
    const value = five.sub(three);
    return q({
      prompt: R`Evaluate \(\displaystyle${integral(0, hi, R`x\sqrt{x + ${a}}`)}\).`,
      correct: value,
      wrong: [
        { value: five, why: R`With \(u = x + ${a}\), \(x = u - ${a}\), not \(u\). The term \(-${a === 1 ? '' : a}\sqrt{u}\) is missing.` },
        { value: five.add(three), why: R`\(u = x + ${a}\) gives \(x = u - ${a}\), so the second term is subtracted.` },
        frac(hi * hi * (s ** 3 - p ** 3), 3), value.neg(), value.mul(2),
      ],
      solution: [
        R`Let \(u = x + ${a}\). Then \(du = dx\) and \(x = u - ${a}\). When \(x = 0\), \(u = ${a}\), and when \(x = ${hi}\), \(u = ${s * s}\).`,
        R`\(\displaystyle${integral(a, s * s, R`(u - ${a})\sqrt{u}`, 'u')} = ${integral(a, s * s, R`\left(u^{3/2} - ${a === 1 ? '' : a}u^{1/2}\right)`, 'u')} = \left[\tfrac{2}{5}u^{5/2} - ${frac(2 * a, 3).tex()}u^{3/2}\right]_{${a}}^{${s * s}}\).`,
        R`\(\tfrac{2}{5}\left(${s ** 5} - ${p ** 5}\right) - ${frac(2 * a, 3).tex()}\left(${s ** 3} - ${p ** 3}\right) = ${value.tex()}\).`,
      ],
      rule: 1, skill: 'substitution',
      check: () => checkIntegral((x) => x * Math.sqrt(x + a), 0, hi, value.value),
    });
  }
  const [a, n] = [rng.int(1, 3), rng.int(2, 5)];
  const top = a ** (n + 2);
  const value = frac(top, (n + 1) * (n + 2));
  return q({
    prompt: R`Evaluate \(\displaystyle${integral(0, a, `x(${a} - x)^{${n}}`)}\).`,
    correct: value,
    wrong: [
      { value: frac(top, n + 2), why: R`With \(u = ${a} - x\), \(x = ${a} - u\), not \(u\). The integrand becomes \((${a} - u)u^{${n}}\).` },
      { value: value.neg(), why: R`\(du = -dx\) gives a minus sign, and the limits run from \(u = ${a}\) down to \(u = 0\), which gives another. They cancel.` },
      frac(top, n + 1), frac(a * a * a ** (n + 1), 2 * (n + 1)),
    ],
    solution: [
      R`Let \(u = ${a} - x\). Then \(du = -dx\) and \(x = ${a} - u\). When \(x = 0\), \(u = ${a}\), and when \(x = ${a}\), \(u = 0\).`,
      R`\(-\displaystyle${integral(a, 0, `(${a} - u)u^{${n}}`, 'u')} = ${integral(0, a, R`\left(${coef(a, `u^{${n}}`)} - u^{${n + 1}}\right)`, 'u')} = \left[${coef(frac(a, n + 1), `u^{${n + 1}}`)} - \frac{u^{${n + 2}}}{${n + 2}}\right]_{0}^{${a}}\).`,
      R`\(\frac{${top}}{${n + 1}} - \frac{${top}}{${n + 2}} = ${value.tex()}\).`,
    ],
    rule: 1, skill: 'substitution',
    check: () => checkIntegral((x) => x * (a - x) ** n, 0, a, value.value),
  });
}

function challengeFindLimit(rng) {
  const whole = (x) => (Number.isInteger(x) && x > 0 ? x : null);
  if (rng.bool(0.3)) {
    const b = rng.int(2, 4);
    const K = b * b;
    return q({
      prompt: R`Find the positive number \(b\) for which \(\displaystyle${integral(0, 'b', '2xe^{x^{2}}')} = e^{${K}} - 1\).`,
      correct: b,
      fmt: (v) => R`\(b = ${num(v)}\)`,
      wrong: [{ value: K, why: R`That is \(b^{2}\). Take the square root.` }, { value: K / 2, why: R`With \(u = x^{2}\), the upper limit becomes \(b^{2}\), so \(b^{2} = ${K}\).` }, 2 * K, b + 1],
      solution: [
        R`Let \(u = x^{2}\), so \(du = 2x\,dx\). When \(x = 0\), \(u = 0\), and when \(x = b\), \(u = b^{2}\).`,
        R`\(\displaystyle${integral(0, 'b^{2}', 'e^{u}', 'u')} = e^{b^{2}} - 1\).`,
        R`Setting \(e^{b^{2}} - 1 = e^{${K}} - 1\) gives \(b^{2} = ${K}\), so \(b = ${b}\).`,
      ],
      rule: 4, skill: 'working backwards',
      check: () => checkIntegral((x) => 2 * x * Math.exp(x * x), 0, b, Math.exp(K) - 1, 1e-4),
    });
  }
  const [c, b] = rng.pick([[1, 1], [1, 2], [1, 3], [1, 4], [2, 2], [2, 4], [3, 3], [4, 2], [4, 4], [5, 5]]);
  const m = (b * b) / c + 1;
  const u = `x^{2} + ${c}`;
  return q({
    prompt: R`Find the positive number \(b\) for which \(\displaystyle${integral(0, 'b', R`\frac{2x}{${u}}`)} = \ln ${m}\).`,
    correct: b,
    fmt: (v) => R`\(b = ${num(v)}\)`,
    wrong: [
      b > 1 ? { value: b * b, why: R`That is \(b^{2}\). Take the square root.` } : null,
      c > 1 ? { value: whole(Math.sqrt(m - c)), why: R`When \(x = 0\), \(u = ${c}\), so the lower limit contributes \(\ln ${c}\). It cannot be left out.` } : null,
      m, m - 1, b + 1, b + 2,
    ],
    solution: [
      R`Let \(u = ${u}\), so \(du = 2x\,dx\). When \(x = 0\), \(u = ${c}\), and when \(x = b\), \(u = b^{2} + ${c}\).`,
      c === 1 ? R`\(\displaystyle${integral(1, 'b^{2} + 1', R`\frac{1}{u}`, 'u')} = \ln\left(b^{2} + 1\right) - \ln 1 = \ln\left(b^{2} + 1\right)\).` : R`\(\displaystyle${integral(c, `b^{2} + ${c}`, R`\frac{1}{u}`, 'u')} = \ln\left(b^{2} + ${c}\right) - \ln ${c} = \ln\frac{b^{2} + ${c}}{${c}}\).`,
      c === 1 ? R`Setting \(b^{2} + 1 = ${m}\) gives \(b^{2} = ${m - 1}\), so \(b = ${b}\).` : R`Setting \(\dfrac{b^{2} + ${c}}{${c}} = ${m}\) gives \(b^{2} = ${c * (m - 1)}\), so \(b = ${b}\).`,
    ],
    rule: 3, skill: 'working backwards',
    check: () => checkIntegral((x) => (2 * x) / (x * x + c), 0, b, Math.log(m)),
  });
}

// ───────────── Topic ─────────────

const leak = (t) => 8 * Math.exp(-t / 5);

export default {
  id: 'u-substitution',
  title: 'Integration by Substitution',
  summary: 'Reverse the chain rule: choose u, adjust for constants, change the limits, and recognise when substitution is the right tool.',
  standards: ['AP Calculus 6.9', 'AP Calculus 6.14'],

  explain: {
    intro: R`Substitution is the chain rule run backwards. When an integrand contains an inside function together with its derivative, renaming the inside function \(u\) turns a complicated integral in \(x\) into a basic one in \(u\).`,
    rules: [
      {
        title: 'The substitution rule',
        text: R`If an integrand has the form \(f(g(x))\,g'(x)\), let \(u = g(x)\). Then \(du = g'(x)\,dx\), and \(\int f(g(x))\,g'(x)\,dx = \int f(u)\,du\). Integrate in \(u\), then replace \(u\) by \(g(x)\).`,
        example: R`\(\int 2x\cos\left(x^{2}\right)dx\): with \(u = x^{2}\) and \(du = 2x\,dx\), this is \(\int \cos u\,du = \sin u + C = \sin\left(x^{2}\right) + C\).`,
      },
      {
        title: 'Choosing u',
        text: R`Look for an inside function whose derivative is also a factor of the integrand, apart from a constant multiple. Good candidates are the expression inside a power or a root, the angle of a trig function, an exponent, or a denominator.`,
        example: R`In \(\int \dfrac{(\ln x)^{3}}{x}\,dx\), choose \(u = \ln x\), because \(du = \dfrac{1}{x}\,dx\) is the other factor.`,
      },
      {
        title: 'Adjusting for a constant factor',
        text: R`If the integrand contains only a constant multiple of \(du\), solve for the part you have. Only constants may be adjusted for in this way, never expressions that contain \(x\). For a linear inside function this gives \(\int f(ax + b)\,dx = \dfrac{1}{a}F(ax + b) + C\).`,
        example: R`\(\int x\left(x^{2} + 1\right)^{3}dx\): \(u = x^{2} + 1\) and \(du = 2x\,dx\), so \(x\,dx = \tfrac{1}{2}\,du\) and the integral is \(\tfrac{1}{2}\int u^{3}\,du = \tfrac{1}{8}\left(x^{2} + 1\right)^{4} + C\).`,
      },
      {
        title: 'Integrals that give a logarithm',
        text: R`When the numerator is the derivative of the denominator (or a constant multiple of it), let \(u\) be the denominator. The integral becomes \(\int \dfrac{1}{u}\,du = \ln|u| + C\). Keep the absolute value bars unless \(u\) is always positive.`,
        example: R`\(\int \tan x\,dx = \int \dfrac{\sin x}{\cos x}\,dx = -\ln|\cos x| + C\), using \(u = \cos x\) and \(du = -\sin x\,dx\).`,
      },
      {
        title: 'Definite integrals: change the limits',
        text: R`The limits of a definite integral are values of \(x\). After substituting, replace them by the matching values of \(u\): \(\int_a^b f(g(x))\,g'(x)\,dx = \int_{g(a)}^{g(b)} f(u)\,du\). Then there is no need to go back to \(x\).`,
        example: R`\(\int_{0}^{1} 2x\left(x^{2} + 1\right)^{3}dx = \int_{1}^{2} u^{3}\,du = \Big[\tfrac{1}{4}u^{4}\Big]_{1}^{2} = \tfrac{15}{4}\).`,
      },
      {
        title: 'Choosing the technique',
        text: R`Try a basic antiderivative first, then algebra (expand a product, or divide a fraction term by term), and use substitution when you can see an inside function together with its derivative. If the derivative of the inside function is missing and is not just a constant, substitution will not work.`,
        example: R`\(\int \left(x^{2} + 1\right)^{2}dx\) has no factor of \(x\), so expand: \(\int \left(x^{4} + 2x^{2} + 1\right)dx = \tfrac{1}{5}x^{5} + \tfrac{2}{3}x^{3} + x + C\).`,
      },
    ],
    vocab: [
      { term: 'substitution', def: R`Replacing an inside function \(g(x)\) by a single letter \(u\) so that the integral becomes a basic one. Also called \(u\)-substitution.` },
      { term: 'differential', def: R`The relation \(du = g'(x)\,dx\) between \(du\) and \(dx\). It tells you what to replace \(dx\) with.` },
      { term: 'inside function', def: R`The function that another function is applied to: in \(\cos\left(x^{2}\right)\) the inside function is \(x^{2}\).` },
      { term: 'back-substitution', def: R`Replacing \(u\) by \(g(x)\) at the end of an indefinite integral, so that the answer is in terms of \(x\).` },
    ],
    mistakes: [
      R`Leaving a stray \(x\) in an integral in \(u\), or leaving \(dx\) where \(du\) should be. After substituting, everything must be in terms of \(u\).`,
      R`Forgetting the constant factor: with \(u = 3x\), \(dx = \tfrac{1}{3}\,du\), so \(\int \cos 3x\,dx = \tfrac{1}{3}\sin 3x + C\).`,
      R`Dividing by an expression that contains \(x\) to make up for a missing \(du\). Only constants can be adjusted for.`,
      R`Using the old \(x\)-limits on an integral in \(u\).`,
      R`Writing \(\ln u\) where \(u\) can be negative. The antiderivative of \(\frac{1}{u}\) is \(\ln|u|\).`,
      R`Stopping at an answer in \(u\) for an indefinite integral. Replace \(u\) by the expression in \(x\).`,
    ],
  },

  examples: [
    {
      title: 'When du is already there',
      problem: R`Find \(\displaystyle\int 2x\left(x^{2} + 1\right)^{4}dx\).`,
      steps: [
        R`The inside function is \(x^{2} + 1\), and its derivative \(2x\) is the other factor. Let \(u = x^{2} + 1\), so \(du = 2x\,dx\).`,
        R`The integral becomes \(\displaystyle\int u^{4}\,du = \frac{u^{5}}{5} + C\).`,
        R`Replace \(u\) by \(x^{2} + 1\).`,
        R`Check with the chain rule: \(\dfrac{d}{dx}\left[\dfrac{(x^{2} + 1)^{5}}{5}\right] = (x^{2} + 1)^{4} \cdot 2x\).`,
      ],
      answer: R`\(\dfrac{\left(x^{2} + 1\right)^{5}}{5} + C\)`,
    },
    {
      title: 'Adjusting for a constant factor',
      problem: R`Find \(\displaystyle\int x^{2}\sqrt{x^{3} + 5}\,dx\).`,
      steps: [
        R`Let \(u = x^{3} + 5\). Then \(du = 3x^{2}\,dx\), so \(x^{2}\,dx = \tfrac{1}{3}\,du\).`,
        R`The integral becomes \(\tfrac{1}{3}\displaystyle\int \sqrt{u}\,du = \tfrac{1}{3} \cdot \tfrac{2}{3}u^{3/2} + C = \tfrac{2}{9}u^{3/2} + C\).`,
        R`Replace \(u\) by \(x^{3} + 5\).`,
      ],
      answer: R`\(\tfrac{2}{9}\left(x^{3} + 5\right)^{3/2} + C\)`,
    },
    {
      title: 'An integral that gives a logarithm',
      problem: R`Find \(\displaystyle\int \frac{x}{x^{2} + 4}\,dx\).`,
      steps: [
        R`The numerator is a constant multiple of the derivative of the denominator. Let \(u = x^{2} + 4\), so \(du = 2x\,dx\) and \(x\,dx = \tfrac{1}{2}\,du\).`,
        R`The integral becomes \(\tfrac{1}{2}\displaystyle\int \frac{1}{u}\,du = \tfrac{1}{2}\ln|u| + C\).`,
        R`Replace \(u\) by \(x^{2} + 4\). Here \(x^{2} + 4\) is always positive, so the bars could be left out.`,
      ],
      answer: R`\(\tfrac{1}{2}\ln\left|x^{2} + 4\right| + C\)`,
    },
    {
      title: 'A definite integral: change the limits',
      problem: R`Evaluate \(\displaystyle\int_{0}^{2} x\,e^{x^{2}}\,dx\).`,
      steps: [
        R`Let \(u = x^{2}\). Then \(du = 2x\,dx\), so \(x\,dx = \tfrac{1}{2}\,du\).`,
        R`Change the limits to values of \(u\): \(x = 0\) gives \(u = 0\), and \(x = 2\) gives \(u = 4\).`,
        R`\(\tfrac{1}{2}\displaystyle\int_{0}^{4} e^{u}\,du = \tfrac{1}{2}\Big[e^{u}\Big]_{0}^{4} = \tfrac{1}{2}\left(e^{4} - 1\right)\). There is no need to go back to \(x\).`,
      ],
      answer: R`\(\tfrac{1}{2}\left(e^{4} - 1\right) \approx 26.8\)`,
    },
    {
      title: 'Word problem: a leaking tank',
      word: true,
      problem: R`Water leaks from a tank at the rate \(r(t) = 8e^{-t/5}\) liters per minute, where \(t\) is the time in minutes. How much water leaks out during the first 10 minutes?`,
      steps: [
        R`The amount is the integral of the rate: \(\displaystyle\int_{0}^{10} 8e^{-t/5}\,dt\).`,
        R`Let \(u = -\tfrac{t}{5}\). Then \(du = -\tfrac{1}{5}\,dt\), so \(dt = -5\,du\).`,
        R`Change the limits: \(t = 0\) gives \(u = 0\), and \(t = 10\) gives \(u = -2\).`,
        R`\(-40\displaystyle\int_{0}^{-2} e^{u}\,du = -40\left(e^{-2} - 1\right) = 40\left(1 - e^{-2}\right)\).`,
      ],
      answer: R`\(40\left(1 - e^{-2}\right) \approx 34.6\) liters`,
      visual: {
        type: 'plot', x: [0, 12], y: [0, 9], fns: [{ f: leak }], shade: [{ f: leak, from: 0, to: 10 }], axisLabels: ['t (min)', 'r (L/min)'],
        alt: 'Graph of the leak rate, a curve that falls from 8 liters per minute at time 0 towards 0. The region under the curve from t = 0 to t = 10 is shaded; its area is the amount of water that leaks out, about 34.6 liters.',
      },
    },
  ],

  models: [
    {
      id: 'power-substitution',
      title: 'Substitution with a power: ∫ k·xᵐ⁻¹(xᵐ + c)ⁿ dx',
      intro: 'Choose the numbers. The steps pick u, adjust for the constant and integrate. Try n = −1 to see a logarithm appear.',
      inputs: [
        { name: 'k', label: 'k (coefficient in front)', type: 'int', min: -9, max: 9, value: 3 },
        { name: 'm', label: 'm (power of x inside)', type: 'int', min: 1, max: 3, value: 2 },
        { name: 'c', label: 'c (constant inside)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'n', label: 'n (outside power)', type: 'int', min: -3, max: 6, value: 4 },
      ],
      compute({ k, m, c, n }) {
        if (k === 0) return { error: 'Choose a coefficient k other than 0, so that there is something to integrate.' };
        const inside = terms([[1, power('x', m)], [c, '']]);
        const xd = power('x', m - 1);
        const front = xd ? coef(k, xd) : `${k}`;
        const lead = front === '1' ? '' : front === '-1' ? '-' : front;
        const cu = frac(k, m);
        const dTex = m === 1 ? '' : coef(m, xd);
        const bracket = (p) => (p === 1 ? `(${inside})` : `(${inside})^{${p}}`);
        const problem = R`Find \(\displaystyle\int ${n === 0 ? front : `${lead}${bracket(n)}`}\,dx\).`;
        if (n === 0) {
          return { problem, steps: ['With n = 0 the bracket is raised to the power 0, so it equals 1 and no substitution is needed.', R`Use the power rule on \(${front}\).`], answer: R`\(${coef(cu, power('x', m))} + C\)` };
        }
        const log = n === -1;
        const inU = log ? coef(cu, R`\ln|u|`) : coef(cu.mul(frac(1, n + 1)), power('u', n + 1));
        return {
          problem,
          steps: [
            R`Let \(u = ${inside}\), the inside function. Then \(du = ${dTex}\,dx\).`,
            cu.value === 1 ? R`The factor \(${front === '1' ? '' : front}\,dx\) in the integrand is exactly \(du\).` : R`The integrand contains \(${front}\,dx\), which is \(${coef(cu, 'du')}\).`,
            R`The integral becomes \(${coef(cu, log ? R`\displaystyle\int \frac{1}{u}\,du` : R`\displaystyle\int ${power('u', n)}\,du`)} = ${inU} + C\).${log ? R` The power rule does not work for \(u^{-1}\); its antiderivative is \(\ln|u|\).` : ''}`,
            R`Replace \(u\) by \(${inside}\).`,
          ],
          answer: R`\(${log ? coef(cu, R`\ln\left|${inside}\right|`) : coef(cu.mul(frac(1, n + 1)), bracket(n + 1))} + C\)`,
        };
      },
    },
    {
      id: 'leaking-tank',
      title: 'Word problem: how much leaks out?',
      word: true,
      intro: 'A leak slows down exponentially. Change the starting rate, how quickly it slows, and the length of time.',
      inputs: [
        { name: 'A', label: 'Starting leak rate (L/min)', type: 'int', min: 1, max: 50, value: 8 },
        { name: 'd', label: 'd in the exponent −t/d (minutes)', type: 'int', min: 1, max: 10, value: 5 },
        { name: 'T', label: 'Time (minutes)', type: 'int', min: 1, max: 30, value: 10 },
      ],
      compute({ A, d, T }) {
        const r = (t) => A * Math.exp(-t / d);
        const rTex = coef(A, d === 1 ? 'e^{-t}' : `e^{-t/${d}}`);
        const uT = frac(-T, d).tex();
        const value = A * d * (1 - Math.exp(-T / d));
        const exact = coef(A * d, R`\left(1 - e^{${uT}}\right)`);
        return {
          problem: R`Water leaks from a tank at the rate \(r(t) = ${rTex}\) liters per minute, where \(t\) is the time in minutes. How much water leaks out during the first ${T === 1 ? 'minute' : `${T} minutes`}?`,
          steps: [
            R`The amount is the integral of the rate: \(\displaystyle${integral(0, T, rTex, 't')}\).`,
            R`Let \(u = ${d === 1 ? '-t' : R`-\frac{t}{${d}}`}\). Then \(du = ${d === 1 ? '-' : R`-\frac{1}{${d}}`}\,dt\), so \(dt = ${coef(-d, 'du')}\).`,
            R`Change the limits: \(t = 0\) gives \(u = 0\), and \(t = ${T}\) gives \(u = ${uT}\).`,
            R`\(${coef(-A * d, R`\displaystyle${integral(0, uT, 'e^{u}', 'u')}`)} = ${coef(-A * d, R`\left(e^{${uT}} - 1\right)`)} = ${exact}\).`,
          ],
          answer: R`\(${exact} \approx ${num(value, { places: 2 })}\) liters`,
          note: R`However long the leak lasts, the total stays below \(${A * d}\) liters, because \(e^{-t/${d}}\) shrinks towards 0.`,
          visual: {
            type: 'plot', ...fit(r, 0, T, { include: [0], minPad: 0.5 }), fns: [{ f: r }], shade: [{ f: r, from: 0, to: T }], axisLabels: ['t (min)', 'r (L/min)'],
            alt: `Graph of the leak rate, a curve that falls from ${A} liters per minute at time 0 towards 0. The region under the curve from t = 0 to t = ${T} is shaded; its area is about ${num(value, { places: 2 })} liters.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easySetUp, easyPerfectMatch, easyLinearInside],
    medium: [mediumAdjust, mediumLog, mediumChangeLimits, mediumRate],
    hard: [hardDefinite, hardTechnique, hardFunctions],
    challenge: [challengeGiven, challengeBackSub, challengeFindLimit],
  },
};
