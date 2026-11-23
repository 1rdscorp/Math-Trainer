import { R, q, gcd, frac, Frac, num, txt, terms, poly, polyEval, polyMul, polyAdd, linear, texFrac, over, power, checkAll, checkAntideriv, checkIntegral, checkSame, checkEqual, integrate, numDeriv, close, person, round } from '../../lib/index.js';
import { M, fit, fromBank } from './_shared.js';

// ───────────── Helpers ─────────────

const C = (tex) => M(`${tex} + C`); // every indefinite integral carries + C
const F = (c) => (c instanceof Frac ? c : frac(c));
const PTS = [0.37, 0.83, 1.29, 1.71];
// True when G is not an antiderivative of f: somewhere G′ ≠ f.
const notAnti = (G, f, xs) => xs.some((x) => !close(numDeriv(G, x), f(x), 1e-4));
// The right choice differentiates to f at several points, and no wrong choice does (one that differed
// from the right one only by a constant would also be a correct answer).
const antiCheck = (f, right, wrongs, xs) => () => checkAll(checkAntideriv(right, f, xs), ...wrongs.map((w, i) => (notAnti(w, f, xs) ? true : `wrong choice ${i + 1} is also an antiderivative`)));

/**
 * An "find the antiderivative" question. right = [TeX, function]; wrong = [[TeX, function, note?], …].
 * A slip that happens to give another antiderivative for these numbers is dropped before the choices are made.
 */
function antiQ({ prompt, f, right, wrong, solution, rule, skill, xs = PTS }) {
  const seen = new Set([right[0]]);
  const ws = wrong.filter((w) => w && !seen.has(w[0]) && seen.add(w[0]) && notAnti(w[1], f, xs));
  return q({
    prompt,
    correct: C(right[0]),
    wrong: ws.map(([tex, , why]) => (why ? { value: C(tex), why } : C(tex))),
    solution,
    rule,
    skill,
    check: antiCheck(f, right[1], ws.map((w) => w[1]), xs),
  });
}

/**
 * A sum of terms with tidy signs. Each item is [coefficient, body]: body is a TeX symbol (coefficient × symbol),
 * or { den } for coefficient over den, written as one fraction: [frac(-3, 2), { den: 'x^{2}' }] → "-\frac{3}{2x^{2}}".
 */
function sumTex(items) {
  let out = '';
  for (const [c0, b] of items) {
    const c = F(c0);
    if (c.value === 0) continue;
    const a = c.abs();
    const body = typeof b === 'object' ? R`\frac{${a.n}}{${a.d === 1 ? '' : a.d}${b.den}}` : terms([[a, b]]);
    out += out ? (c.value < 0 ? ' - ' : ' + ') + body : (c.value < 0 ? '-' : '') + body;
  }
  return out || '0';
}
/** c·xᵉ as an item for sumTex: positive powers as a symbol, negative ones as a fraction. */
const xItem = (c, e) => (e >= 0 ? [c, power('x', e)] : [c, { den: power('x', -e) }]);
/** c·π as TeX: piTex(frac(3, 4)) → "\frac{3\pi}{4}", piTex(frac(-1, 2)) → "-\frac{\pi}{2}". */
function piTex(c0) {
  const c = F(c0);
  const top = `${Math.abs(c.n) === 1 ? '' : Math.abs(c.n)}\\pi`;
  return `${c.n < 0 ? '-' : ''}${c.d === 1 ? top : `\\frac{${top}}{${c.d}}`}`;
}
/** A number a + b·π as TeX, written with the whole number first: "3 - \frac{3\pi}{4}". */
const plusPi = (a, b) => (F(a).value === 0 ? piTex(b) : `${F(a).tex()} ${F(b).value < 0 ? '-' : '+'} ${piTex(F(b).abs())}`);
// "x/a" inside an inverse trig function: atanArg('x + 2', 3) → "\left(\frac{x + 2}{3}\right)"; with a = 1 just "(x + 2)" or "x".
const argTex = (u, a) => (a === 1 ? (u === 'x' ? ' x' : `(${u})`) : R`\left(\frac{${u}}{${a}}\right)`);
const fnArg = (fn, b) => (b === 1 ? `\\${fn} x` : `\\${fn}(${b}x)`);
const fnPow = (fn, n, b) => (b === 1 ? `\\${fn}^{${n}} x` : `\\${fn}^{${n}}(${b}x)`);
/** Antiderivative of a polynomial (highest power first) as sumTex items and as a function. */
const antiPolyItems = (Q) => Q.map((c, i) => xItem(frac(c, Q.length - i), Q.length - i));
const antiPolyFn = (Q) => (x) => Q.reduce((s, c, i) => s + (c * x ** (Q.length - i)) / (Q.length - i), 0);
const texFracS = (n, d) => texFrac(n, d).replace('\\frac', '\\dfrac');
const dover = (n, d) => over(n, d).replace('\\frac', '\\dfrac');
const plusFrac = (n, d) => `${n < 0 ? '-' : '+'} ${dover(Math.abs(n), d)}`; // "+ \dfrac{3}{x - 1}" or "- \dfrac{3}{x - 1}"
const plain = (tex) => tex.replace(/\^\{2\}/g, '²').replace(/\^\{3\}/g, '³').replace(/[{}]/g, '').replace(/-/g, '−'); // TeX of a polynomial → picture text
const integral = (lo, hi, body) => R`\displaystyle\int_{${lo}}^{${hi}} ${body}\,dx`;

// ───────────── Easy ─────────────

function easySplit(rng) {
  const k = rng.pick([1, 2]);
  const d = rng.int(k + 1, 3);
  let N;
  do {
    N = Array.from({ length: d + 1 }, (_, i) => (i === 0 ? rng.nonzero(-5, 6) : rng.bool(0.75) ? rng.nonzero(-9, 9) : 0));
  } while (N.filter((c) => c !== 0).length < 2 || N[d - k + 1] === 0); // keep a term that becomes c/x
  const terms0 = N.map((c, i) => ({ c, e: d - i - k })).filter((t) => t.c !== 0); // integrand pieces c·xᵉ
  const f = (x) => polyEval(N, x) / x ** k;
  const anti = (t, slip = null) => (t.e === -1 ? [t.c, R`\ln|x|`] : xItem(slip === 'noDivide' ? F(t.c) : frac(t.c, t.e + 1).mul(slip === 'sign' && t.e < -1 ? -1 : 1), t.e + 1));
  const antiFn = (t, slip = null) => (x) => (t.e === -1 ? t.c * Math.log(Math.abs(x)) : ((slip === 'noDivide' ? t.c : (t.c / (t.e + 1)) * (slip === 'sign' && t.e < -1 ? -1 : 1)) * x ** (t.e + 1)));
  const build = (slip) => [sumTex(terms0.map((t) => anti(t, slip))), (x) => terms0.reduce((s, t) => s + antiFn(t, slip)(x), 0)];
  const logT = terms0.find((t) => t.e === -1);
  const others = terms0.filter((t) => t !== logT);
  const denX = power('x', k);
  const topAnti = sumTex(antiPolyItems(N));
  return antiQ({
    prompt: R`Find \(\displaystyle\int \frac{${poly(N)}}{${denX}}\,dx\).`,
    f,
    right: build(null),
    wrong: [
      [R`\frac{${topAnti}}{${denX}}`, (x) => antiPolyFn(N)(x) / x ** k, 'The numerator cannot be integrated on its own while the denominator waits. Split the fraction into separate terms first.'],
      [sumTex([...others.map((t) => anti(t)), [-logT.c, { den: 'x^{2}' }]]), (x) => others.reduce((s, t) => s + antiFn(t)(x), 0) - logT.c / x ** 2, R`\(${over(logT.c, 'x').replace('\\frac', '\\dfrac')}\) integrates to \(${terms([[logT.c, R`\ln|x|`]])}\); the power rule does not apply to \(x^{-1}\).`],
      [...build('sign'), 'A negative new exponent changes the sign when you divide by it.'],
      build('noDivide'),
      [sumTex([...others.map((t) => anti(t)), [logT.c, 'x']]), (x) => others.reduce((s, t) => s + antiFn(t)(x), 0) + logT.c * x],
    ],
    solution: [
      R`Divide each term of the numerator by \(${denX}\): the integrand is \(${sumTex(terms0.map((t) => xItem(t.c, t.e)))}\).`,
      R`Integrate term by term with the power rule, and \(\int \frac{1}{x}\,dx = \ln|x|\).`,
      R`\(${build(null)[0]} + C\).`,
    ],
    rule: 0,
    skill: 'splitting a fraction',
  });
}

function easyInverseForm(rng) {
  const a = rng.int(1, 6);
  const A = a * a;
  const k = rng.int(1, 8);
  const at = (c, aa = a) => [terms([[c, R`\arctan${argTex('x', aa)}`]]), (x) => F(c).value * Math.atan(x / aa)];
  const as = (c, aa = a) => [terms([[c, R`\arcsin${argTex('x', aa)}`]]), (x) => F(c).value * Math.asin(Math.max(-1, Math.min(1, x / aa)))];
  if (rng.bool()) {
    const f = (x) => k / (x * x + A);
    return antiQ({
      prompt: R`Find \(\displaystyle\int \frac{${k}}{x^{2} + ${A}}\,dx\).`,
      f,
      right: at(frac(k, a)),
      wrong: [
        [...at(k), R`\(\int \frac{du}{u^{2} + a^{2}} = \frac{1}{a}\arctan\frac{u}{a}\). The factor \(\frac{1}{${a}}\) is missing.`],
        [terms([[frac(k, 2), R`\ln(x^{2} + ${A})`]]), (x) => (k / 2) * Math.log(x * x + A), R`A logarithm needs the derivative of the denominator, \(2x\), in the numerator. Here the numerator is a constant.`],
        at(frac(k, A)),
        [...as(frac(k, a)), R`Arcsine goes with \(\sqrt{a^{2} - u^{2}}\). A sum \(u^{2} + a^{2}\) gives arctangent.`],
        at(frac(k, a), A),
        [over(-k, `x^{2} + ${A}`), (x) => -k / (x * x + A), R`The power rule on \((x^{2} + ${A})^{-1}\) would need a factor \(2x\), which is not there.`],
        at(frac(2 * k, a)),
      ],
      solution: [R`The denominator is \(x^{2} + ${A} = x^{2} + ${a}^{2}\): the arctangent form with \(a = ${a}\).`, R`\(\displaystyle\int \frac{dx}{x^{2} + a^{2}} = \frac{1}{a}\arctan\frac{x}{a} + C\).`, R`Multiply by ${k}: \(${at(frac(k, a))[0]} + C\).`],
      rule: 2,
      skill: 'inverse trig forms',
    });
  }
  const f = (x) => k / Math.sqrt(A - x * x);
  return antiQ({
    prompt: R`Find \(\displaystyle\int \frac{${k}}{\sqrt{${A} - x^{2}}}\,dx\).`,
    f,
    xs: [0.15, 0.35, 0.55, 0.75].map((t) => t * a),
    right: as(k),
    wrong: [
      [...as(frac(k, a)), R`For arcsine there is no extra factor: \(\int \frac{du}{\sqrt{a^{2} - u^{2}}} = \arcsin\frac{u}{a}\).`],
      [...at(frac(k, a)), R`Arctangent goes with \(u^{2} + a^{2}\). A square root of \(a^{2} - u^{2}\) gives arcsine.`],
      [terms([[-2 * k, R`\sqrt{${A} - x^{2}}`]]), (x) => -2 * k * Math.sqrt(A - x * x), R`That would need a factor \(x\) in the numerator, for the substitution \(u = ${A} - x^{2}\).`],
      as(k, A),
      [terms([[k, R`\arcsin x`]]), (x) => k * Math.asin(Math.max(-1, Math.min(1, x)))],
      as(frac(k, 2)),
      [terms([[-k, R`\sqrt{${A} - x^{2}}`]]), (x) => -k * Math.sqrt(A - x * x)],
    ],
    solution: [R`The root is \(\sqrt{${A} - x^{2}} = \sqrt{${a}^{2} - x^{2}}\): the arcsine form with \(a = ${a}\).`, R`\(\displaystyle\int \frac{dx}{\sqrt{a^{2} - x^{2}}} = \arcsin\frac{x}{a} + C\).`, R`Multiply by ${k}: \(${as(k)[0]} + C\).`],
    rule: 2,
    skill: 'inverse trig forms',
  });
}

function easyIdentity(rng) {
  const k = rng.int(1, 6);
  const b = rng.pick([1, 1, 2, 3]);
  const kind = rng.pick(['tan', 'cot', 'sin', 'cos']);
  const xs = [0.2, 0.4, 0.6, 0.8].map((t) => t / b);
  const kb = frac(k, b);
  if (kind === 'tan' || kind === 'cot') {
    const isTan = kind === 'tan';
    const T = isTan ? (x) => Math.tan(b * x) : (x) => 1 / Math.tan(b * x);
    const s = isTan ? 1 : -1; // ∫ sec² = tan, ∫ csc² = −cot
    const G = (c1, c2) => [sumTex([[kb.mul(c1), fnArg(kind, b)], [c2 * k, 'x']]), (x) => kb.value * c1 * T(x) + c2 * k * x];
    return antiQ({
      prompt: R`Find \(\displaystyle\int ${terms([[k, fnPow(kind, 2, b)]])}\,dx\).`,
      f: (x) => k * T(x) ** 2,
      xs,
      right: G(s, -1),
      wrong: [
        [...G(s, 1), isTan ? R`\(\tan^{2}\theta = \sec^{2}\theta - 1\): the 1 is subtracted.` : R`\(\cot^{2}\theta = \csc^{2}\theta - 1\): the 1 is subtracted.`],
        [terms([[frac(k, 3 * b), fnPow(kind, 3, b)]]), (x) => (k / (3 * b)) * T(x) ** 3, R`The power rule needs the derivative of \(${fnArg(kind, b)}\) as a factor, and it is not there. Use the identity instead.`],
        [...G(-s, -1), isTan ? '' : R`\(\int \csc^{2}\theta\,d\theta = -\cot\theta\), with a minus sign.`].filter((v) => v !== ''),
        b > 1 ? [sumTex([[s * k, fnArg(kind, b)], [-k, 'x']]), (x) => s * k * T(x) - k * x, R`The inside function is \(${b}x\), so divide by \(${b}\).`] : null,
        [terms([[kb.mul(s), fnArg(kind, b)]]), (x) => kb.value * s * T(x)],
      ],
      solution: [
        R`Rewrite with ${isTan ? R`\(\tan^{2}\theta = \sec^{2}\theta - 1\)` : R`\(\cot^{2}\theta = \csc^{2}\theta - 1\)`}: the integrand is \(${terms([[k, fnPow(isTan ? 'sec' : 'csc', 2, b)], [-k, '']])}\).`,
        R`\(\int ${fnPow(isTan ? 'sec' : 'csc', 2, b)}\,dx = ${terms([[frac(s, b), fnArg(kind, b)]])}\) and \(\int ${k}\,dx = ${terms([[k, 'x']])}\).`,
        R`\(${G(s, -1)[0]} + C\).`,
      ],
      rule: 4,
      skill: 'trig identities',
    });
  }
  const isSin = kind === 'sin';
  const T = isSin ? Math.sin : Math.cos;
  const s = isSin ? -1 : 1;
  const S2 = fnArg('sin', 2 * b);
  const G = (c1, c2) => [sumTex([[frac(k * c1, 2), 'x'], [frac(k * c2, 4 * b), S2]]), (x) => (k * c1 * x) / 2 + ((k * c2) / (4 * b)) * Math.sin(2 * b * x)];
  return antiQ({
    prompt: R`Find \(\displaystyle\int ${terms([[k, fnPow(kind, 2, b)]])}\,dx\).`,
    f: (x) => k * T(b * x) ** 2,
    xs,
    right: G(1, s),
    wrong: [
      [...G(1, -s), R`\(\sin^{2}\theta = \frac{1 - \cos 2\theta}{2}\) and \(\cos^{2}\theta = \frac{1 + \cos 2\theta}{2}\). Check the sign.`],
      [terms([[frac(k, 3 * b), fnPow(kind, 3, b)]]), (x) => (k / (3 * b)) * T(b * x) ** 3, R`The power rule needs the derivative of \(${fnArg(kind, b)}\) as a factor, and it is not there. Use the half-angle identity.`],
      [sumTex([[frac(k, 2), 'x'], [frac(k * s, 2), S2]]), (x) => (k * x) / 2 + ((k * s) / 2) * Math.sin(2 * b * x), R`\(\int \cos(${2 * b}x)\,dx = \frac{1}{${2 * b}}\sin(${2 * b}x)\). Divide by \(${2 * b}\).`],
      G(2, 2 * s),
    ],
    solution: [
      R`Use the half-angle identity: \(${fnPow(kind, 2, b)} = \dfrac{1 ${isSin ? '-' : '+'} ${fnArg('cos', 2 * b)}}{2}\).`,
      R`Integrate: \(\dfrac{${k}}{2}\left(x ${isSin ? '-' : '+'} \dfrac{${fnArg('sin', 2 * b)}}{${2 * b}}\right)\).`,
      R`\(${G(1, s)[0]} + C\).`,
    ],
    rule: 4,
    skill: 'trig identities',
  });
}

// ───────────── Medium ─────────────

// N(x) = Q(x)(x − r) + Rm, with Rm ≠ 0.
function divisionCase(rng) {
  const r = rng.nonzero(-4, 4);
  const Q = rng.bool(0.6) ? [rng.int(1, 3), rng.int(-5, 5)] : [rng.int(1, 2), rng.int(-4, 4), rng.int(-5, 5)];
  const Rm = rng.nonzero(-7, 7);
  const N = polyAdd(polyMul(Q, [1, -r]), [Rm]);
  return { r, Q, Rm, N, den: linear(1, -r), f: (x) => polyEval(N, x) / (x - r) };
}

function mediumLongDivision(rng) {
  const t = divisionCase(rng);
  const { r, Q, Rm, N } = t;
  const ln = (rr) => R`\ln|${linear(1, -rr)}|`;
  const lnF = (rr) => (x) => Math.log(Math.abs(x - rr));
  const right = [sumTex([...antiPolyItems(Q), [Rm, ln(r)]]), (x) => antiPolyFn(Q)(x) + Rm * lnF(r)(x)];
  const Rbad = polyEval(N, -r);
  const xs = [0.6, 1.4, 2.2, 3.1].map((v) => Math.max(r, -r) + v);
  return antiQ({
    prompt: R`Find \(\displaystyle\int \frac{${poly(N)}}{${t.den}}\,dx\).`,
    f: t.f,
    xs,
    right,
    wrong: [
      [sumTex(antiPolyItems(Q)), antiPolyFn(Q), R`Long division leaves the remainder \(${dover(Rm, t.den)}\). It has to be integrated too.`],
      [sumTex([...antiPolyItems(Q), [Rm, ln(-r)]]), (x) => antiPolyFn(Q)(x) + Rm * lnF(-r)(x), R`The remainder sits over \(${t.den}\), so the logarithm is \(${ln(r)}\).`],
      [sumTex([...Q.map((c, i) => xItem(c, Q.length - 1 - i)), [Rm, ln(r)]]), (x) => polyEval(Q, x) + Rm * lnF(r)(x), R`The quotient \(${poly(Q)}\) must be integrated as well, not copied.`],
      Rbad !== Rm ? [sumTex([...antiPolyItems(Q), [Rbad, ln(r)]]), (x) => antiPolyFn(Q)(x) + Rbad * lnF(r)(x)] : null,
      [sumTex([...antiPolyItems(Q), [-Rm, ln(r)]]), (x) => antiPolyFn(Q)(x) - Rm * lnF(r)(x)],
    ],
    solution: [
      R`The numerator has degree ${N.length - 1}, at least the degree of the denominator, so divide first.`,
      R`Long division: \(\dfrac{${poly(N)}}{${t.den}} = ${poly(Q)} ${plusFrac(Rm, t.den)}\). (Check: \((${poly(Q)})(${t.den}) ${Rm < 0 ? '-' : '+'} ${Math.abs(Rm)} = ${poly(N)}\).)`,
      R`Integrate each part: \(${right[0]} + C\).`,
    ],
    rule: 1,
    skill: 'long division',
  });
}

function mediumCompleteSquare(rng) {
  const a = rng.int(1, 5);
  const h = rng.nonzero(-5, 5);
  const k = rng.int(1, 9);
  const c = h * h + a * a;
  const quad = poly([1, 2 * h, c]);
  const u = linear(1, h);
  const uBad = linear(1, -h);
  const at = (coef, uu, aa = a, hh = h) => [terms([[coef, R`\arctan${argTex(uu, aa)}`]]), (x) => F(coef).value * Math.atan((x + hh) / aa)];
  return antiQ({
    prompt: R`Find \(\displaystyle\int \frac{${k}}{${quad}}\,dx\).`,
    f: (x) => k / (x * x + 2 * h * x + c),
    right: at(frac(k, a), u),
    wrong: [
      [...at(frac(k, a), uBad, a, -h), R`Half of the \(x\)-coefficient \(${2 * h}\) is \(${h}\), so the square is \((${u})^{2}\).`],
      [...at(k, u), R`\(\int \frac{du}{u^{2} + a^{2}} = \frac{1}{a}\arctan\frac{u}{a}\): divide by \(a = ${a}\).`],
      [terms([[k, R`\ln(${quad})`]]), (x) => k * Math.log(x * x + 2 * h * x + c), R`A logarithm would need the derivative \(${linear(2, 2 * h)}\) in the numerator.`],
      at(frac(k, a * a), u),
      at(frac(k, a), u, a * a),
      [...at(frac(k, a), 'x', a, 0), R`The shift belongs inside: \(u = ${u}\), so the answer has \(${u}\) where \(x\) would be.`],
      [over(-k, quad), (x) => -k / (x * x + 2 * h * x + c), R`The power rule on \((${quad})^{-1}\) would need the factor \(${linear(2, 2 * h)}\).`],
    ],
    solution: [
      R`Complete the square: \(${quad} = (${u})^{2} + ${a * a}\), since \(${c} - ${h * h} = ${a * a}\).`,
      R`With \(u = ${u}\) (so \(du = dx\)) and \(a = ${a}\), use \(\displaystyle\int \frac{du}{u^{2} + a^{2}} = \frac{1}{a}\arctan\frac{u}{a}\).`,
      R`\(${at(frac(k, a), u)[0]} + C\).`,
    ],
    rule: 3,
    skill: 'completing the square',
  });
}

function mediumWord(rng) {
  const who = person(rng);
  if (rng.bool()) {
    const a = rng.int(1, 5);
    const k = rng.pick([4, 6, 8, 10, 12, 20]) * a;
    const val = frac(k, 4 * a); // (k/a)·arctan(1) = kπ/(4a)
    const fmt = (c) => R`${M(piTex(c))} liters`;
    return q({
      prompt: R`Water flows into ${who}'s rain barrel at \(r(t) = \dfrac{${k}}{t^{2} + ${a * a}}\) liters per minute, where \(t\) is in minutes. How much water flows in during the first ${a} ${a === 1 ? 'minute' : 'minutes'}?`,
      correct: fmt(val),
      wrong: [
        { value: fmt(frac(k, 4)), why: R`\(\int \frac{dt}{t^{2} + a^{2}} = \frac{1}{a}\arctan\frac{t}{a}\): divide by \(a = ${a}\).` },
        { value: fmt(frac(k, 2 * a)), why: R`\(\arctan 1 = \frac{\pi}{4}\), the angle whose tangent is 1.` },
        a > 1 ? fmt(frac(k, 4 * a * a)) : null,
        M(`${num(k / a)}`) + ' liters',
        fmt(frac(k, 3 * a)),
      ],
      solution: [
        R`The amount is \(${integral(0, a, R`\frac{${k}}{t^{2} + ${a * a}}`).replace('dx', 'dt')}\).`,
        R`Antiderivative: \(\dfrac{${k}}{${a}}\arctan\dfrac{t}{${a}}\).`,
        R`Evaluate: \(\dfrac{${k}}{${a}}\left(\arctan 1 - \arctan 0\right) = \dfrac{${k}}{${a}} \cdot \dfrac{\pi}{4} = ${piTex(val)} \approx ${num(round(val.value * Math.PI, 2))}\) liters.`,
      ],
      rule: 5,
      skill: 'definite integral in context',
      check: () => checkIntegral((t) => k / (t * t + a * a), 0, a, val.value * Math.PI),
    });
  }
  // A cart's velocity v(t) = (t² + pt + c)/(t + 1) = t + (p − 1) + Rm/(t + 1).
  const p = rng.int(1, 5);
  const Rm = rng.int(1, 6);
  const c = Rm + p - 1;
  const T = rng.pick([1, 2, 3]);
  const poly0 = frac(T * T, 2).add(frac((p - 1) * T));
  const fmt = (A, B, n = T + 1) => R`${M(B === 0 ? F(A).tex() : sumTex([[A, ''], [B, R`\ln ${n}`]]))} meters`;
  const v = (t) => (t * t + p * t + c) / (t + 1);
  const exact = poly0.value + Rm * Math.log(T + 1);
  return q({
    prompt: R`A robot cart moves forward with velocity \(v(t) = \dfrac{${poly([1, p, c], 't')}}{t + 1}\) meters per second. How far does it travel from \(t = 0\) to \(t = ${T}\) seconds?`,
    correct: fmt(poly0, Rm),
    wrong: [
      { value: fmt(poly0, 0), why: R`Division gives \(${linear(1, p - 1, 't')} + \dfrac{${Rm}}{t + 1}\). The remainder term adds \(${terms([[Rm, R`\ln ${T + 1}`]])}\).` },
      { value: fmt(poly0.add(2 * T), Rm), why: R`Check the division: \((t + 1)(${linear(1, p - 1, 't')}) + ${Rm} = ${poly([1, p, c], 't')}\).` },
      fmt(poly0, -Rm),
      fmt(poly0.add(frac(1, 2)), Rm),
    ],
    solution: [
      R`Distance is \(\int_0^{${T}} v(t)\,dt\) (the velocity is positive). Divide first: \(v(t) = ${linear(1, p - 1, 't')} + \dfrac{${Rm}}{t + 1}\).`,
      R`Antiderivative: \(${sumTex([[frac(1, 2), 't^{2}'], [p - 1, 't'], [Rm, R`\ln(t + 1)`]])}\).`,
      R`Evaluate from 0 to ${T} (\(\ln 1 = 0\)): \(${sumTex([[poly0, ''], [Rm, R`\ln ${T + 1}`]])} \approx ${num(round(exact, 2))}\) meters.`,
    ],
    rule: 1,
    skill: 'definite integral in context',
    check: () => checkAll(checkIntegral(v, 0, T, exact), checkSame(v, (t) => t + p - 1 + Rm / (t + 1))),
  });
}

// ───────────── Hard ─────────────

function hardScaled(rng) {
  let [a, b] = [rng.int(2, 5), rng.int(2, 4)];
  while (gcd(a, b) !== 1) [a, b] = [rng.int(2, 5), rng.int(2, 4)];
  const k = rng.int(1, 6);
  const bx = `${b}x`;
  const u = (a === 1 ? bx : R`\frac{${b}x}{${a}}`);
  const inv = (fn, c, uu = u, s = b / a) => [terms([[c, a === 1 && uu === bx ? `\\${fn}(${bx})` : `\\${fn}\\left(${uu}\\right)`]]), (x) => F(c).value * (fn === 'arctan' ? Math.atan(s * x) : Math.asin(Math.max(-1, Math.min(1, s * x))))];
  if (rng.bool()) {
    const f = (x) => k / (a * a + b * b * x * x);
    return antiQ({
      prompt: R`Find \(\displaystyle\int \frac{${k}}{${a * a} + ${b * b}x^{2}}\,dx\).`,
      f,
      right: inv('arctan', frac(k, a * b)),
      wrong: [
        [...inv('arctan', frac(k, a)), R`With \(u = ${b}x\), \(du = ${b}\,dx\): divide by \(${b}\) as well as by \(a = ${a}\).`],
        [...inv('arctan', frac(k * b, a)), R`\(dx = \frac{1}{${b}}\,du\): divide by \(${b}\), do not multiply.`],
        inv('arctan', frac(k, a * b), a === 1 ? `${b * b}x` : R`\frac{${b * b}x}{${a * a}}`, (b * b) / (a * a)),
        inv('arctan', frac(k, a * b * b)),
      ],
      solution: [
        R`Write the denominator as \(${a}^{2} + (${b}x)^{2}\) and let \(u = ${b}x\), so \(dx = \frac{1}{${b}}\,du\).`,
        R`\(\dfrac{${k}}{${b}}\displaystyle\int \frac{du}{${a}^{2} + u^{2}} = \dfrac{${k}}{${b}} \cdot \dfrac{1}{${a}}\arctan\dfrac{u}{${a}}\).`,
        R`\(${inv('arctan', frac(k, a * b))[0]} + C\).`,
      ],
      rule: 2,
      skill: 'inverse trig forms',
    });
  }
  const f = (x) => k / Math.sqrt(a * a - b * b * x * x);
  return antiQ({
    prompt: R`Find \(\displaystyle\int \frac{${k}}{\sqrt{${a * a} - ${b * b}x^{2}}}\,dx\).`,
    f,
    xs: [0.15, 0.35, 0.55, 0.75].map((t) => (t * a) / b),
    right: inv('arcsin', frac(k, b)),
    wrong: [
      [...inv('arcsin', k), R`With \(u = ${b}x\), \(du = ${b}\,dx\), so divide by \(${b}\).`],
      [...inv('arcsin', frac(k, a * b)), R`For arcsine there is no factor \(\frac{1}{a}\): \(\int \frac{du}{\sqrt{a^{2} - u^{2}}} = \arcsin\frac{u}{a}\).`],
      [...inv('arctan', frac(k, a * b)), R`A square root of \(a^{2} - u^{2}\) gives arcsine, not arctangent.`],
      inv('arcsin', frac(k * b, 1)),
    ],
    solution: [
      R`Write the root as \(\sqrt{${a}^{2} - (${b}x)^{2}}\) and let \(u = ${b}x\), so \(dx = \frac{1}{${b}}\,du\).`,
      R`\(\dfrac{${k}}{${b}}\displaystyle\int \frac{du}{\sqrt{${a}^{2} - u^{2}}} = \dfrac{${k}}{${b}}\arcsin\dfrac{u}{${a}}\).`,
      R`\(${inv('arcsin', frac(k, b))[0]} + C\).`,
    ],
    rule: 2,
    skill: 'inverse trig forms',
  });
}

function hardSplitInverse(rng) {
  const a = rng.int(1, 4);
  const A = a * a;
  const ATAN = R`\arctan${argTex('x', a)}`;
  const atan = (x) => Math.atan(x / a);
  const LN = R`\ln(x^{2} + ${A})`;
  const ln = (x) => Math.log(x * x + A);
  if (rng.bool()) {
    const p = rng.nonzero(-6, 6);
    const qq = rng.nonzero(-8, 8);
    const G = (cl, ct) => [sumTex([[cl, LN], [ct, ATAN]]), (x) => F(cl).value * ln(x) + F(ct).value * atan(x)];
    return antiQ({
      prompt: R`Find \(\displaystyle\int \frac{${linear(p, qq)}}{x^{2} + ${A}}\,dx\).`,
      f: (x) => (p * x + qq) / (x * x + A),
      right: G(frac(p, 2), frac(qq, a)),
      wrong: [
        [...G(p, frac(qq, a)), R`With \(u = x^{2} + ${A}\), \(du = 2x\,dx\), so \(\int \frac{x}{x^{2} + ${A}}\,dx = \frac{1}{2}\ln(x^{2} + ${A})\).`],
        [...G(frac(p, 2), qq), R`\(\int \frac{dx}{x^{2} + a^{2}} = \frac{1}{a}\arctan\frac{x}{a}\): divide by \(${a}\).`],
        [...G(frac(p, 2), 0), R`Split the fraction: the constant \(${qq}\) over \(x^{2} + ${A}\) gives an arctangent term.`],
        G(frac(qq, 2), frac(p, a)),
        G(frac(p, 2), frac(-qq, a)),
      ],
      solution: [
        R`Split: \(\dfrac{${linear(p, qq)}}{x^{2} + ${A}} = ${texFracS(terms([[p, 'x']]), `x^{2} + ${A}`)} ${qq < 0 ? '-' : '+'} \dfrac{${Math.abs(qq)}}{x^{2} + ${A}}\).`,
        R`First part: \(u = x^{2} + ${A}\) gives \(${terms([[frac(p, 2), LN]])}\). Second part: the arctangent form gives \(${terms([[frac(qq, a), ATAN]])}\).`,
        R`\(${G(frac(p, 2), frac(qq, a))[0]} + C\).`,
      ],
      rule: 2,
      skill: 'split, then inverse trig',
    });
  }
  let bb = rng.int(-6, 12);
  if (bb === A) bb += 1;
  const rem = bb - A;
  const G = (c1, ct) => [sumTex([[c1, 'x'], [ct, ATAN]]), (x) => F(c1).value * x + F(ct).value * atan(x)];
  return antiQ({
    prompt: R`Find \(\displaystyle\int \frac{${poly([1, 0, bb])}}{x^{2} + ${A}}\,dx\).`,
    f: (x) => (x * x + bb) / (x * x + A),
    right: G(1, frac(rem, a)),
    wrong: [
      [...G(1, rem), R`\(\int \frac{dx}{x^{2} + a^{2}} = \frac{1}{a}\arctan\frac{x}{a}\): divide by \(${a}\).`],
      [...G(0, frac(rem, a)), R`Division gives \(1 ${rem < 0 ? '-' : '+'} \dfrac{${Math.abs(rem)}}{x^{2} + ${A}}\). The 1 integrates to \(x\).`],
      [...G(1, frac(bb + A, a)), R`The remainder is \(${bb} - ${A} = ${rem}\): subtract, since \(${poly([1, 0, bb])} = (x^{2} + ${A}) ${rem < 0 ? '-' : '+'} ${Math.abs(rem)}\).`],
      bb !== 0 ? G(0, frac(bb, a)) : null,
      G(1, frac(-rem, a)),
      [...G(1, 0), R`Division leaves the remainder \(${dover(rem, `x^{2} + ${A}`)}\) as well; it integrates to an arctangent.`],
    ],
    solution: [
      R`The degrees are equal, so divide: \(${poly([1, 0, bb])} = (x^{2} + ${A}) ${rem < 0 ? '-' : '+'} ${Math.abs(rem)}\), giving \(1 ${rem < 0 ? '-' : '+'} \dfrac{${Math.abs(rem)}}{x^{2} + ${A}}\).`,
      R`\(\int 1\,dx = x\) and \(\displaystyle\int ${rem < 0 ? '-' : ''}\frac{${Math.abs(rem)}}{x^{2} + ${A}}\,dx = ${terms([[frac(rem, a), ATAN]])}\).`,
      R`\(${G(1, frac(rem, a))[0]} + C\).`,
    ],
    rule: 1,
    skill: 'division, then inverse trig',
  });
}

// Definite integrals with exact values. Each case: the integral TeX, the integrand, the limits, the value as TeX
// and number, wrong values (TeX, number, note?), and steps.
const DEFINITE = [
  (rng) => {
    const [a, k] = [rng.int(1, 5), rng.int(1, 8)];
    const third = rng.bool();
    const hi = third ? (a === 1 ? R`\sqrt{3}` : R`${a}\sqrt{3}`) : `${a}`;
    const val = frac(k, (third ? 3 : 4) * a);
    return {
      tex: integral(0, hi, R`\frac{${k}}{x^{2} + ${a * a}}`), f: (x) => k / (x * x + a * a), lo: 0, hi: third ? a * Math.sqrt(3) : a,
      right: [piTex(val), val.value * Math.PI],
      wrong: [[piTex(frac(k, third ? 3 : 4)), (k * Math.PI) / (third ? 3 : 4), R`Remember the factor \(\frac{1}{a} = \frac{1}{${a}}\) in \(\frac{1}{a}\arctan\frac{x}{a}\).`], [piTex(frac(k, (third ? 6 : 2) * a)), (k * Math.PI) / ((third ? 6 : 2) * a), R`\(\arctan ${third ? R`\sqrt{3} = \frac{\pi}{3}` : R`1 = \frac{\pi}{4}`}\).`], third ? null : [F(frac(k, a)).tex(), k / a, R`\(\arctan 1\) is the angle \(\frac{\pi}{4}\), not the number 1.`], [piTex(val.mul(2)), val.value * 2 * Math.PI], [terms([[k, R`\ln 2`]]), k * Math.log(2)]],
      steps: [R`Antiderivative: \(\dfrac{${k}}{${a}}\arctan\dfrac{x}{${a}}\).`, R`At the limits: \(\dfrac{${k}}{${a}}\left(\arctan ${third ? R`\sqrt{3}` : '1'} - \arctan 0\right) = \dfrac{${k}}{${a}} \cdot \dfrac{\pi}{${third ? 3 : 4}}\).`],
    };
  },
  (rng) => {
    const [a, k] = [rng.int(1, 6), rng.int(1, 6)];
    const val = frac(k, 6);
    const hi = F(frac(a, 2)).tex();
    return {
      tex: integral(0, hi, R`\frac{${k}}{\sqrt{${a * a} - x^{2}}}`), f: (x) => k / Math.sqrt(a * a - x * x), lo: 0, hi: a / 2,
      right: [piTex(val), val.value * Math.PI],
      wrong: [[piTex(frac(k, 3)), (k * Math.PI) / 3, R`\(\arcsin\frac{1}{2} = \frac{\pi}{6}\), since \(\sin\frac{\pi}{6} = \frac{1}{2}\).`], a > 1 ? [piTex(frac(k, 6 * a)), (k * Math.PI) / (6 * a), R`The arcsine form has no factor \(\frac{1}{a}\).`] : null, [F(frac(k, 2)).tex(), k / 2, R`Evaluate the antiderivative \(${terms([[k, R`\arcsin\frac{x}{${a}}`]])}\), not the fraction \(\frac{x}{${a}}\) alone.`], [piTex(frac(k, 4)), (k * Math.PI) / 4]],
      steps: [R`Antiderivative: \(${terms([[k, R`\arcsin\dfrac{x}{${a}}`]])}\).`, R`At the limits: \(${k === 1 ? '' : k}\left(\arcsin\frac{1}{2} - \arcsin 0\right) = ${k === 1 ? '' : `${k} \\cdot `}\dfrac{\pi}{6}\).`],
    };
  },
  (rng) => {
    const t = divisionCase(rng);
    const lo = t.r + 1;
    const hi = t.r + rng.pick([2, 3]);
    const A = antiPolyItems(t.Q);
    const Pv = (x) => t.Q.reduce((s, c, i) => s.add(frac(c, t.Q.length - i).mul(frac(x).pow(t.Q.length - i))), frac(0));
    const polyPart = Pv(hi).sub(Pv(lo));
    const n = hi - t.r;
    const val = polyPart.value + t.Rm * Math.log(n);
    const T = (P, c, nn = n) => sumTex([[P, ''], [c, R`\ln ${nn}`]]);
    return {
      tex: integral(lo, hi, R`\frac{${poly(t.N)}}{${t.den}}`), f: t.f, lo, hi,
      right: [T(polyPart, t.Rm), val],
      wrong: [[polyPart.tex(), polyPart.value, R`The remainder \(${dover(t.Rm, t.den)}\) contributes \(${terms([[t.Rm, R`\ln ${n}`]])}\).`], [T(polyPart, -t.Rm), polyPart.value - t.Rm * Math.log(n)], [T(polyPart, t.Rm, n + 1), polyPart.value + t.Rm * Math.log(n + 1), R`At \(x = ${hi}\) the logarithm is \(\ln|${hi} ${t.r < 0 ? '+' : '-'} ${Math.abs(t.r)}| = \ln ${n}\), and at \(x = ${lo}\) it is \(\ln 1 = 0\).`], [T(Pv(hi), t.Rm), Pv(hi).value + t.Rm * Math.log(n)]],
      steps: [R`Divide: \(\dfrac{${poly(t.N)}}{${t.den}} = ${poly(t.Q)} ${plusFrac(t.Rm, t.den)}\).`, R`Antiderivative: \(${sumTex([...A, [t.Rm, R`\ln|${t.den}|`]])}\).`, R`From ${lo} to ${hi}: the polynomial part gives \(${polyPart.tex()}\), and the logarithm gives \(${terms([[t.Rm, R`\ln ${n}`]])} - ${terms([[t.Rm, R`\ln 1`]])}\).`],
    };
  },
  (rng) => {
    const k = rng.int(1, 6);
    return {
      tex: integral(0, R`\frac{\pi}{4}`, terms([[k, R`\tan^{2} x`]])), f: (x) => k * Math.tan(x) ** 2, lo: 0, hi: Math.PI / 4,
      right: [plusPi(k, frac(-k, 4)), k - (k * Math.PI) / 4],
      wrong: [[plusPi(k, frac(k, 4)), k + (k * Math.PI) / 4, R`\(\tan^{2} x = \sec^{2} x - 1\): the \(x\)-term is subtracted.`], [F(frac(k, 3)).tex(), k / 3, R`\(\frac{1}{3}\tan^{3} x\) is not an antiderivative: its derivative has an extra factor \(\sec^{2} x\).`], [`${k}`, k, R`Integrate the \(-1\) too: it gives \(-x\), worth \(-\frac{\pi}{4}\) here.`], [piTex(frac(k, 4)), (k * Math.PI) / 4]],
      steps: [R`Use \(\tan^{2} x = \sec^{2} x - 1\): the antiderivative is \(${k === 1 ? '' : k}(\tan x - x)\).`, R`At the limits: \(${k === 1 ? '' : k}\left(\tan\frac{\pi}{4} - \frac{\pi}{4}\right) - ${k === 1 ? '' : k}(0 - 0)\).`],
    };
  },
];

function hardDefinite(rng) {
  const t = rng.pick(DEFINITE)(rng);
  const wrong = t.wrong.filter((w) => w && w[0] && Math.abs(w[1] - t.right[1]) > 1e-6);
  return q({
    prompt: R`Evaluate \(${t.tex}\) exactly.`,
    correct: M(t.right[0]),
    wrong: wrong.map(([tex, , why]) => (why ? { value: M(tex), why } : M(tex))),
    solution: [...t.steps, R`The value is \(${t.right[0]} \approx ${num(round(t.right[1], 4))}\).`],
    rule: 5,
    skill: 'exact definite integrals',
    // Simpson's rule on a fine grid, and every wrong value really differs from it.
    check: () => checkAll(checkIntegral(t.f, t.lo, t.hi, t.right[1], 1e-6), ...wrong.map(([, v], i) => (Math.abs(v - integrate(t.f, t.lo, t.hi)) > 1e-3 ? true : `wrong value ${i + 1} equals the integral`))),
  });
}

// ───────────── Challenge ─────────────

// "What is the first step?" Each item: the integrand (TeX and function), its rewritten form as a function, and the technique.
const TECHNIQUES = {
  divide: 'Polynomial long division, then integrate the quotient and the remainder term',
  square: 'Complete the square, then use the arctangent form',
  squareSin: 'Complete the square, then use the arcsine form',
  split: 'Split the fraction into separate terms, then use the power rule',
  identity: R`Rewrite with the identity \(\tan^{2}\theta = \sec^{2}\theta - 1\)`,
  usub: R`Substitute \(u\) = the denominator, since the numerator is a multiple of \(du\)`,
};
const TECH_ITEMS = [
  (rng) => { const t = divisionCase(rng); return { key: 'divide', tex: R`\frac{${poly(t.N)}}{${t.den}}`, f: t.f, g: (x) => polyEval(t.Q, x) + t.Rm / (x - t.r), why: { split: R`Splitting term by term works only for a single-term denominator such as \(x^{2}\).` } }; },
  (rng) => { const [h, a] = [rng.nonzero(-4, 4), rng.int(1, 4)]; return { key: 'square', tex: R`\frac{1}{${poly([1, 2 * h, h * h + a * a])}}`, f: (x) => 1 / (x * x + 2 * h * x + h * h + a * a), g: (x) => 1 / ((x + h) ** 2 + a * a), why: { usub: R`The numerator would need to be a multiple of \(${linear(2, 2 * h)}\) for that.`, squareSin: 'Arcsine goes with the square root of a difference, not with a sum of squares.' } }; },
  (rng) => { const [h, a] = [rng.nonzero(-3, 3), rng.int(2, 4)]; return { key: 'squareSin', tex: R`\frac{1}{\sqrt{${terms([[a * a - h * h, ''], [2 * h, 'x'], [-1, 'x^{2}']])}}}`, f: (x) => 1 / Math.sqrt(a * a - h * h + 2 * h * x - x * x), g: (x) => 1 / Math.sqrt(a * a - (x - h) ** 2), xs: [h - 0.5, h + 0.3, h + 0.8], why: { square: R`Completing the square gives \(${a * a} - (${linear(1, -h)})^{2}\) under a square root: a difference, which leads to arcsine.` } }; },
  (rng) => { const [p, c] = [rng.nonzero(-6, 6), rng.nonzero(-9, 9)]; return { key: 'split', tex: R`\frac{${poly([1, p, 0, c])}}{x^{2}}`, f: (x) => (x ** 3 + p * x * x + c) / (x * x), g: (x) => x + p + c / (x * x), why: { divide: R`Long division by \(x^{2}\) is the same as dividing each term by \(x^{2}\): splitting is the quicker way to say it.` } }; },
  (rng) => { const k = rng.int(1, 6); return { key: 'identity', tex: terms([[k, R`\tan^{2} x`]]), f: (x) => k * Math.tan(x) ** 2, g: (x) => k / Math.cos(x) ** 2 - k, xs: [0.3, 0.6, 0.9], why: { usub: R`There is no fraction here, and \(u = \tan x\) would need a factor \(\sec^{2} x\), which is not there.` } }; },
  (rng) => { const [a, k] = [rng.int(1, 5), rng.int(1, 6)]; return { key: 'usub', tex: R`\frac{${terms([[k, 'x']])}}{x^{2} + ${a * a}}`, f: (x) => (k * x) / (x * x + a * a), g: (x) => (k / 2) * ((2 * x) / (x * x + a * a)), why: { square: R`\(x^{2} + ${a * a}\) is already a sum of squares, and the numerator \(${terms([[k, 'x']])}\) is a multiple of its derivative \(2x\): a logarithm, not an arctangent.` } }; },
];

function challengeTechnique(rng) {
  const t = rng.pick(TECH_ITEMS)(rng);
  const others = rng.shuffle(Object.keys(TECHNIQUES).filter((k) => k !== t.key));
  const firstWhy = Object.keys(t.why);
  const order = [...firstWhy, ...others.filter((k) => !firstWhy.includes(k))].slice(0, 3);
  return q({
    prompt: R`What is the best first step for \(\displaystyle\int ${t.tex}\,dx\)?`,
    correct: TECHNIQUES[t.key],
    wrong: order.map((k) => (t.why[k] ? { value: TECHNIQUES[k], why: t.why[k] } : TECHNIQUES[k])),
    solution: [
      {
        divide: 'The numerator has degree at least that of the denominator, a linear factor: divide first.',
        square: 'The denominator is a quadratic with no real roots and the numerator is a constant: complete the square to reach u² + a².',
        squareSin: 'Under the square root is a quadratic with leading coefficient −1: complete the square to reach a² − u².',
        split: 'The denominator is a single power of x: divide each term of the numerator by it.',
        identity: R`No substitution fits \(\tan^{2} x\) directly, but \(\sec^{2} x - 1\) integrates at once.`,
        usub: R`The numerator is a constant multiple of the derivative of the denominator, so \(u\) = denominator gives a logarithm.`,
      }[t.key],
      'The rewritten form equals the original integrand, and each piece then has a standard antiderivative.',
    ],
    rule: { divide: 1, square: 3, squareSin: 3, split: 0, identity: 4, usub: 2 }[t.key],
    skill: 'choosing the algebra',
    check: () => checkSame(t.f, t.g, t.xs ?? [0.6, 1.3, 2.7], 1e-9),
  });
}

// ∫₀ᵇ of an inverse-trig integrand has a given exact value: find b.
function challengeFindLimit(rng) {
  const a = rng.int(2, 6);
  // (a/d)·√r in simplest form
  const root = (r, d) => {
    const c = frac(a, d);
    const top = `${c.n === 1 ? '' : c.n}\\sqrt{${r}}`;
    return [c.d === 1 ? top : `\\frac{${top}}{${c.d}}`, (a * Math.sqrt(r)) / d];
  };
  const B = { a: [`${a}`, a], a3: root(3, 1), a33: root(3, 3), a2: [F(frac(a, 2)).tex(), a / 2], a32: root(3, 2), a22: root(2, 2) };
  if (rng.bool()) {
    const [key, d, ang] = rng.pick([['a', 4, '1'], ['a3', 3, R`\sqrt{3}`], ['a33', 6, R`\frac{\sqrt{3}}{3}`]]);
    const f = (x) => 1 / (x * x + a * a);
    const val = frac(1, d * a);
    const wrongKeys = ['a', 'a3', 'a33', 'a2'].filter((k) => k !== key);
    return q({
      prompt: R`For which \(b > 0\) is \(\displaystyle\int_0^{b} \frac{dx}{x^{2} + ${a * a}} = ${piTex(val)}\)?`,
      correct: M(`b = ${B[key][0]}`),
      wrong: wrongKeys.map((k, i) => (i === 0 ? { value: M(`b = ${B[k][0]}`), why: R`Set \(\dfrac{1}{${a}}\arctan\dfrac{b}{${a}} = ${piTex(val)}\): then \(\arctan\dfrac{b}{${a}} = \dfrac{\pi}{${d}}\).` } : M(`b = ${B[k][0]}`))),
      solution: [
        R`\(\displaystyle\int_0^{b} \frac{dx}{x^{2} + ${a * a}} = \frac{1}{${a}}\arctan\frac{b}{${a}}\).`,
        R`Set it equal to \(${piTex(val)}\): \(\arctan\dfrac{b}{${a}} = \dfrac{\pi}{${d}}\), so \(\dfrac{b}{${a}} = \tan\dfrac{\pi}{${d}} = ${ang}\).`,
        R`\(b = ${B[key][0]}\).`,
      ],
      rule: 5,
      skill: 'working backwards',
      check: () => checkAll(checkIntegral(f, 0, B[key][1], val.value * Math.PI), ...wrongKeys.map((k) => (Math.abs(integrate(f, 0, B[k][1]) - val.value * Math.PI) > 1e-4 ? true : `b = ${k} also works`))),
    });
  }
  const [key, d, ang] = rng.pick([['a2', 6, R`\frac{1}{2}`], ['a32', 3, R`\frac{\sqrt{3}}{2}`], ['a22', 4, R`\frac{\sqrt{2}}{2}`]]);
  const f = (x) => 1 / Math.sqrt(a * a - x * x);
  const wrongKeys = ['a2', 'a32', 'a22', 'a33'].filter((k) => k !== key);
  return q({
    prompt: R`For which \(b\) with \(0 < b < ${a}\) is \(\displaystyle\int_0^{b} \frac{dx}{\sqrt{${a * a} - x^{2}}} = \frac{\pi}{${d}}\)?`,
    correct: M(`b = ${B[key][0]}`),
    wrong: wrongKeys.map((k, i) => (i === 0 ? { value: M(`b = ${B[k][0]}`), why: R`Set \(\arcsin\dfrac{b}{${a}} = \dfrac{\pi}{${d}}\): then \(\dfrac{b}{${a}} = \sin\dfrac{\pi}{${d}} = ${ang}\).` } : M(`b = ${B[k][0]}`))),
    solution: [
      R`\(\displaystyle\int_0^{b} \frac{dx}{\sqrt{${a * a} - x^{2}}} = \arcsin\frac{b}{${a}}\).`,
      R`Set it equal to \(\dfrac{\pi}{${d}}\): \(\dfrac{b}{${a}} = \sin\dfrac{\pi}{${d}} = ${ang}\).`,
      R`\(b = ${B[key][0]}\).`,
    ],
    rule: 5,
    skill: 'working backwards',
    check: () => checkAll(checkIntegral(f, 0, B[key][1], Math.PI / d, 1e-5), ...wrongKeys.map((k) => (Math.abs(integrate(f, 0, B[k][1]) - Math.PI / d) > 1e-4 ? true : `b = ${k} also works`))),
  });
}

function challengeSquareDefinite(rng) {
  const a = rng.int(1, 5);
  const h = rng.nonzero(-4, 4);
  const k = rng.int(1, 6);
  if (rng.bool()) {
    const quad = poly([1, 2 * h, h * h + a * a]);
    const [lo, hi] = [-h, -h + a];
    const f = (x) => k / (x * x + 2 * h * x + h * h + a * a);
    const val = frac(k, 4 * a);
    return q({
      prompt: R`Evaluate \(${integral(lo, hi, R`\frac{${k}}{${quad}}`)}\) exactly.`,
      correct: M(piTex(val)),
      wrong: [
        { value: M(piTex(frac(k, 4))), why: R`\(\frac{1}{a}\arctan\frac{u}{a}\) has the factor \(\frac{1}{${a}}\).` },
        { value: M(piTex(frac(k, 2 * a))), why: R`\(\arctan 1 = \frac{\pi}{4}\).` },
        a > 1 ? M(piTex(frac(k, 4 * a * a))) : M(piTex(frac(k, 8))),
        M(F(frac(k, a)).tex()),
      ],
      solution: [
        R`Complete the square: \(${quad} = (${linear(1, h)})^{2} + ${a * a}\). Let \(u = ${linear(1, h)}\).`,
        R`The limits become \(u = ${lo} + ${h < 0 ? `(${h})` : h} = 0\) and \(u = ${hi} + ${h < 0 ? `(${h})` : h} = ${a}\).`,
        R`\(\displaystyle\int_0^{${a}} \frac{${k}\,du}{u^{2} + ${a * a}} = \frac{${k}}{${a}}\left(\arctan 1 - \arctan 0\right) = ${piTex(val)}\).`,
      ],
      rule: 3,
      skill: 'completing the square',
      check: () => checkIntegral(f, lo, hi, val.value * Math.PI),
    });
  }
  const inside = terms([[a * a - h * h, ''], [2 * h, 'x'], [-1, 'x^{2}']]);
  const f = (x) => k / Math.sqrt(a * a - (x - h) ** 2);
  const val = frac(k, 6);
  const hiTex = F(frac(2 * h + a, 2)).tex();
  return q({
    prompt: R`Evaluate \(${integral(h, hiTex, R`\frac{${k}}{\sqrt{${inside}}}`)}\) exactly.`,
    correct: M(piTex(val)),
    wrong: [
      { value: M(piTex(frac(k, 3))), why: R`\(\arcsin\frac{1}{2} = \frac{\pi}{6}\).` },
      a > 1 ? { value: M(piTex(frac(k, 6 * a))), why: R`The arcsine form has no factor \(\frac{1}{a}\).` } : null,
      M(F(frac(k, 2)).tex()),
      M(piTex(frac(k, 2))),
    ],
    solution: [
      R`Complete the square: \(${inside} = ${a * a} - (${linear(1, -h)})^{2}\). Let \(u = ${linear(1, -h)}\).`,
      R`The limits become \(u = 0\) and \(u = ${F(frac(a, 2)).tex()}\).`,
      R`\(\displaystyle\int_0^{${F(frac(a, 2)).tex()}} \frac{${k}\,du}{\sqrt{${a * a} - u^{2}}} = ${k === 1 ? '' : k}\left(\arcsin\frac{1}{2} - \arcsin 0\right) = ${piTex(val)}\).`,
    ],
    rule: 3,
    skill: 'completing the square',
    check: () => checkIntegral(f, h, h + a / 2, val.value * Math.PI),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'integration-techniques',
  title: 'Integration by Algebra & Inverse Trig',
  summary: 'Rewrite an integrand with algebra or an identity, by splitting, dividing or completing the square, so a basic or inverse-trig rule applies.',
  standards: ['AP Calculus 6.10', 'AP Calculus 6.9', 'AP Calculus 6.8'],

  explain: {
    intro: R`Many integrands match no rule as written, yet become easy after a little algebra. A fraction with a single power of \(x\) underneath splits into separate terms. A fraction whose top has at least the degree of its bottom is divided first. A quadratic with no real roots is completed to a square, which leads to arctangent or arcsine. Some trig powers are rewritten with an identity. Always rewrite first, then integrate.`,
    rules: [
      {
        title: 'Split a fraction term by term',
        text: R`When the denominator is a single term such as \(x\) or \(x^{2}\), divide each term of the numerator by it. Then integrate each piece; a piece \(\frac{c}{x}\) gives \(c\ln|x|\).`,
        example: R`\(\displaystyle\int \frac{x^{2} + 3}{x}\,dx = \int \left(x + \frac{3}{x}\right)dx = \frac{x^{2}}{2} + 3\ln|x| + C\).`,
      },
      {
        title: 'Divide when the fraction is improper',
        text: R`If the numerator's degree is at least the denominator's, use polynomial long division: \(\dfrac{N(x)}{D(x)} = Q(x) + \dfrac{R(x)}{D(x)}\). Integrate the quotient as a polynomial and the remainder term separately.`,
        example: R`\(\dfrac{x^{2} + 1}{x - 1} = x + 1 + \dfrac{2}{x - 1}\), so \(\displaystyle\int \frac{x^{2} + 1}{x - 1}\,dx = \frac{x^{2}}{2} + x + 2\ln|x - 1| + C\).`,
      },
      {
        title: 'The inverse trig forms',
        text: R`For \(a > 0\): \(\displaystyle\int \frac{du}{u^{2} + a^{2}} = \frac{1}{a}\arctan\frac{u}{a} + C\) and \(\displaystyle\int \frac{du}{\sqrt{a^{2} - u^{2}}} = \arcsin\frac{u}{a} + C\). Note the factor \(\frac{1}{a}\) in the first and none in the second. If \(u = bx\), divide by \(b\) as in any substitution.`,
        example: R`\(\displaystyle\int \frac{dx}{9 + 4x^{2}} = \frac{1}{2}\int \frac{du}{9 + u^{2}} = \frac{1}{6}\arctan\frac{2x}{3} + C\) with \(u = 2x\).`,
      },
      {
        title: 'Complete the square',
        text: R`A quadratic with no real roots: \(x^{2} + bx + c = \left(x + \frac{b}{2}\right)^{2} + \left(c - \frac{b^{2}}{4}\right)\). Then \(u = x + \frac{b}{2}\), \(du = dx\), and an inverse trig form applies. With \(-x^{2}\) under a square root, the result is \(a^{2} - (x - h)^{2}\), which leads to arcsine.`,
        example: R`\(x^{2} + 4x + 13 = (x + 2)^{2} + 9\), so \(\displaystyle\int \frac{dx}{x^{2} + 4x + 13} = \frac{1}{3}\arctan\frac{x + 2}{3} + C\).`,
      },
      {
        title: 'Rewrite with an identity',
        text: R`\(\tan^{2} x = \sec^{2} x - 1\) and \(\cot^{2} x = \csc^{2} x - 1\) turn squares into functions with known antiderivatives. For \(\sin^{2} x\) and \(\cos^{2} x\) use the half-angle identities \(\sin^{2} x = \frac{1 - \cos 2x}{2}\) and \(\cos^{2} x = \frac{1 + \cos 2x}{2}\).`,
        example: R`\(\displaystyle\int \tan^{2} x\,dx = \int (\sec^{2} x - 1)\,dx = \tan x - x + C\).`,
      },
      {
        title: 'Exact definite integrals',
        text: R`Evaluate the antiderivative at the limits and use exact values: \(\arctan 1 = \frac{\pi}{4}\), \(\arctan\sqrt{3} = \frac{\pi}{3}\), \(\arcsin\frac{1}{2} = \frac{\pi}{6}\), \(\arctan 0 = \arcsin 0 = 0\), \(\ln 1 = 0\).`,
        example: R`\(\displaystyle\int_0^{1} \frac{dx}{x^{2} + 1} = \arctan 1 - \arctan 0 = \frac{\pi}{4}\).`,
      },
    ],
    vocab: [
      { term: 'improper rational function', def: 'A fraction of polynomials whose numerator has degree at least that of the denominator. It is divided before integrating.' },
      { term: 'quotient and remainder', def: R`In \(\frac{N}{D} = Q + \frac{R}{D}\), \(Q\) is the quotient and \(R\) the remainder, of lower degree than \(D\).` },
      { term: 'completing the square', def: R`Rewriting \(x^{2} + bx + c\) as \((x + h)^{2} + k\), with \(h = \frac{b}{2}\).` },
      { term: 'arctangent, arcsine', def: R`The inverse functions of tangent and sine: \(\arctan 1 = \frac{\pi}{4}\) because \(\tan\frac{\pi}{4} = 1\).` },
    ],
    mistakes: [
      'Integrating the numerator and the denominator separately. Rewrite the fraction first.',
      R`Forgetting the remainder after long division, or the factor \(\frac{1}{a}\) in \(\frac{1}{a}\arctan\frac{u}{a}\).`,
      R`Putting a factor \(\frac{1}{a}\) in front of arcsine. The arcsine form has none.`,
      R`Using the power rule on \(\tan^{2} x\) or \(\sin^{2} x\). It needs the derivative of the inside function as a factor.`,
      R`Confusing \(\int \frac{x}{x^{2} + a^{2}}\,dx\) (a logarithm) with \(\int \frac{1}{x^{2} + a^{2}}\,dx\) (an arctangent).`,
    ],
    visual: {
      type: 'plot',
      x: [-3, 3],
      y: [-0.2, 1.2],
      step: [0.5, 0.25],
      fns: [{ f: (x) => 1 / (x * x + 1), label: 'y = 1/(x² + 1)', labelAt: 1.8 }],
      shade: [{ f: (x) => 1 / (x * x + 1), from: 0, to: 1 }],
      alt: 'Graph of y = 1/(x² + 1), a bell-shaped curve with its peak (0, 1) and the x-axis as asymptote. The region under it from x = 0 to x = 1 is shaded; its area is arctan 1 − arctan 0 = π/4 ≈ 0.785.',
    },
  },

  examples: [
    {
      title: 'Split, then integrate',
      problem: R`Find \(\displaystyle\int \frac{x^{3} - 2x + 5}{x^{2}}\,dx\).`,
      steps: [R`Divide each term by \(x^{2}\): \(x - \dfrac{2}{x} + \dfrac{5}{x^{2}}\).`, R`Integrate: \(\int x\,dx = \frac{x^{2}}{2}\), \(\int \frac{2}{x}\,dx = 2\ln|x|\), \(\int 5x^{-2}\,dx = -5x^{-1}\).`],
      answer: R`\(\dfrac{x^{2}}{2} - 2\ln|x| - \dfrac{5}{x} + C\)`,
    },
    {
      title: 'Long division first',
      problem: R`Find \(\displaystyle\int \frac{x^{2} + 1}{x - 1}\,dx\).`,
      steps: [R`The degrees are 2 and 1, so divide: \(x^{2} + 1 = (x - 1)(x + 1) + 2\).`, R`So \(\dfrac{x^{2} + 1}{x - 1} = x + 1 + \dfrac{2}{x - 1}\).`, R`Integrate each part: \(\dfrac{x^{2}}{2} + x + 2\ln|x - 1|\).`],
      answer: R`\(\dfrac{x^{2}}{2} + x + 2\ln|x - 1| + C\)`,
      visual: { type: 'plot', x: [-3, 5], y: [-8, 10], step: [1, 2], fns: [{ f: (x) => (x * x + 1) / (x - 1), label: 'y = (x² + 1)/(x − 1)', labelAt: 3.3 }, { f: (x) => x + 1, color: 'b', dashed: true, label: 'y = x + 1', labelAt: -2 }], vlines: [{ x: 1 }], alt: 'Graph of y = (x² + 1)/(x − 1), with a vertical asymptote at x = 1. Far from x = 1 the graph approaches the dashed line y = x + 1, the quotient; the gap between them is the remainder term 2/(x − 1).' },
    },
    {
      title: 'Completing the square',
      problem: R`Find \(\displaystyle\int \frac{dx}{x^{2} + 4x + 13}\).`,
      steps: [R`\(x^{2} + 4x + 13 = (x^{2} + 4x + 4) + 9 = (x + 2)^{2} + 3^{2}\).`, R`Let \(u = x + 2\), \(du = dx\): \(\displaystyle\int \frac{du}{u^{2} + 3^{2}} = \frac{1}{3}\arctan\frac{u}{3}\).`],
      answer: R`\(\dfrac{1}{3}\arctan\left(\dfrac{x + 2}{3}\right) + C\)`,
    },
    {
      title: 'An identity in a definite integral',
      problem: R`Evaluate \(\displaystyle\int_0^{\pi/4} \tan^{2} x\,dx\) exactly.`,
      steps: [R`\(\tan^{2} x = \sec^{2} x - 1\), so the antiderivative is \(\tan x - x\).`, R`\(\left(\tan\frac{\pi}{4} - \frac{\pi}{4}\right) - (\tan 0 - 0) = 1 - \frac{\pi}{4}\).`],
      answer: R`\(1 - \dfrac{\pi}{4} \approx 0.2146\)`,
    },
    {
      title: 'Word problem: filling a rain barrel',
      word: true,
      problem: R`Water flows into a barrel at \(r(t) = \dfrac{20}{t^{2} + 4}\) liters per minute. How much flows in during the first 2 minutes?`,
      steps: [R`Amount \(= \displaystyle\int_0^{2} \frac{20}{t^{2} + 4}\,dt\), an arctangent form with \(a = 2\).`, R`Antiderivative: \(20 \cdot \dfrac{1}{2}\arctan\dfrac{t}{2} = 10\arctan\dfrac{t}{2}\).`, R`\(10(\arctan 1 - \arctan 0) = 10 \cdot \dfrac{\pi}{4}\).`],
      answer: R`\(\dfrac{5\pi}{2} \approx 7.85\) liters`,
    },
  ],

  models: [
    {
      id: 'divide-integrate',
      title: 'Divide, then integrate',
      intro: R`Choose \((ax^{2} + bx + c)/(x - r)\). See the long division and the antiderivative, and the graph next to its quotient line.`,
      inputs: [
        { name: 'a', label: 'a (x² coefficient)', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'b', label: 'b (x coefficient)', type: 'int', min: -9, max: 9, value: 0 },
        { name: 'c', label: 'c (constant)', type: 'int', min: -20, max: 20, value: 1 },
        { name: 'r', label: 'r in x − r', type: 'int', min: -6, max: 6, value: 1 },
      ],
      compute({ a, b, c, r }) {
        if (a === 0 && b === 0) return { error: 'With a = 0 and b = 0 the numerator is a constant: nothing to divide. Make a or b nonzero.' };
        const N = [a, b, c];
        const Q = a === 0 ? [b] : [a, a * r + b];
        const Rm = polyEval(N, r);
        const den = linear(1, -r);
        const lead = a === 0 ? 1 : 2;
        const anti = sumTex([...antiPolyItems(Q), [Rm, R`\ln|${den}|`]]);
        const f = (x) => polyEval(N, x) / (x - r);
        return {
          problem: R`Find \(\displaystyle\int \frac{${poly(N)}}{${den}}\,dx\).`,
          steps: [
            R`The numerator has degree ${lead}, the denominator degree 1: divide first.`,
            Rm === 0 ? R`\(${poly(N)} = (${den})(${poly(Q)})\): the division is exact, so the integrand is \(${poly(Q)}\) (for \(x \neq ${r}\)).` : R`\(${poly(N)} = (${den})(${poly(Q)}) ${Rm < 0 ? '-' : '+'} ${Math.abs(Rm)}\), so the integrand is \(${poly(Q)} ${plusFrac(Rm, den)}\).`,
            R`Integrate the quotient term by term${Rm === 0 ? '' : R` and the remainder as \(${terms([[Rm, R`\ln|${den}|`]])}\)`}.`,
          ],
          answer: R`\(${anti} + C\)`,
          visual: {
            type: 'plot',
            x: [r - 6, r + 6],
            y: fit([(x) => polyEval(Q, x)], r - 6, r + 6, { minPad: 3 }).y,
            fns: [{ f, label: 'integrand' }, { f: (x) => polyEval(Q, x), color: 'b', dashed: true, label: 'quotient' }],
            vlines: Rm === 0 ? [] : [{ x: r }],
            alt: `Graph of y = (${plain(poly(N))})/(${plain(den)}) with the dashed quotient line y = ${plain(poly(Q))}.${Rm === 0 ? ' The two coincide except at x = ' + txt(r) + '.' : ` There is a vertical asymptote at x = ${txt(r)}; far from it the graph approaches the quotient line, and the gap is the remainder ${txt(Rm)}/(${plain(den)}).`}`,
          },
        };
      },
    },
    {
      id: 'barrel',
      title: 'Word problem: how much water flows in?',
      word: true,
      intro: R`Water flows in at \(r(t) = \dfrac{k}{t^{2} + a^{2}}\) liters per minute. Choose \(k\), \(a\) and the time \(T\).`,
      inputs: [
        { name: 'k', label: 'k', type: 'int', min: 1, max: 100, value: 20 },
        { name: 'a', label: 'a', type: 'number', min: 0.5, max: 10, step: 0.5, value: 2 },
        { name: 'T', label: 'Time T (minutes)', type: 'number', min: 0.5, max: 30, step: 0.5, value: 2 },
      ],
      compute({ k, a, T }) {
        const amount = (k / a) * Math.atan(T / a);
        const r = (t) => k / (t * t + a * a);
        return {
          problem: R`Water flows into a barrel at \(r(t) = \dfrac{${k}}{t^{2} + ${num(a * a)}}\) liters per minute. How much flows in during the first ${txt(T)} ${T === 1 ? 'minute' : 'minutes'}?`,
          steps: [
            R`Amount \(= \displaystyle\int_0^{${num(T)}} \frac{${k}}{t^{2} + ${num(a)}^{2}}\,dt\): the arctangent form with \(a = ${num(a)}\).`,
            R`Antiderivative: \(\dfrac{${k}}{${num(a)}}\arctan\dfrac{t}{${num(a)}}\).`,
            R`\(\dfrac{${k}}{${num(a)}}\left(\arctan ${num(round(T / a, 4))} - \arctan 0\right) \approx ${num(round(k / a, 4))} \times ${num(round(Math.atan(T / a), 4))}\).`,
          ],
          answer: R`About \(${num(round(amount, 2))}\) liters`,
          note: `However long the water flows, the total never exceeds (k/a)·(π/2) ≈ ${txt(round((k / a) * (Math.PI / 2), 2))} liters, because arctan approaches π/2.`,
          visual: {
            type: 'plot',
            x: [0, T * 1.25],
            y: [0, (k / (a * a)) * 1.15],
            axisLabels: ['t', 'r'],
            fns: [{ f: r }],
            shade: [{ f: r, from: 0, to: T }],
            alt: `Graph of the inflow rate r(t) = ${k}/(t² + ${txt(a * a)}), starting at ${txt(round(k / (a * a), 3))} liters per minute at t = 0 and decreasing. The shaded area from t = 0 to t = ${txt(T)} is the amount of water, about ${txt(round(amount, 2))} liters.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easySplit, easyInverseForm, easyIdentity],
    medium: [mediumLongDivision, mediumCompleteSquare, mediumWord],
    hard: [hardScaled, hardSplitInverse, hardDefinite],
    challenge: [challengeTechnique, challengeFindLimit, challengeSquareDefinite],
  },
};
