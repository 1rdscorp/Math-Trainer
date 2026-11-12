import { R, q, frac, terms, power, poly, num, choose, checkAntideriv, checkIntegral, checkEqual, integrate, numDeriv, close } from '../../lib/index.js';
import { M, K, exactChoices, combo, antiChoices, fterms, kx } from './_shared.js';

// sin³x and friends: tp('\\sin', 3) → "\sin^{3}x", tp('\\sin', 1) → "\sin x", tp('\\sin', 0) → "".
const tp = (fn, n, arg = 'x') => (n === 0 ? '' : n === 1 ? `${fn} ${arg}` : `${fn}^{${n}}${arg}`);
const sec = (x) => 1 / Math.cos(x);
// c·(inner), without brackets when c is 1.
const scaled = (c, inner) => (c === 1 ? inner : terms([[c, `\\left(${inner}\\right)`]]));
const POWER_RULE_WHY = 'The power rule alone does not integrate a power of a trig function. It needs the derivative of that function as an extra factor.';

// The three trig substitutions, for a² = A.
const SUBS = {
  sin: { fn: '\\sin', rad: (A) => `\\sqrt{${A} - x^{2}}`, inside: (A) => `${A} - x^{2}`, becomes: '\\cos', dx: (a) => `${a}\\cos\\theta\\,d\\theta`, theta: (a) => (x) => Math.asin(x / a), radJs: (A) => (x) => Math.sqrt(A - x * x) },
  tan: { fn: '\\tan', rad: (A) => `\\sqrt{x^{2} + ${A}}`, inside: (A) => `x^{2} + ${A}`, becomes: '\\sec', dx: (a) => `${a}\\sec^{2}\\theta\\,d\\theta`, theta: (a) => (x) => Math.atan(x / a), radJs: (A) => (x) => Math.sqrt(x * x + A) },
  sec: { fn: '\\sec', rad: (A) => `\\sqrt{x^{2} - ${A}}`, inside: (A) => `x^{2} - ${A}`, becomes: '\\tan', dx: (a) => `${a}\\sec\\theta\\tan\\theta\\,d\\theta`, theta: (a) => (x) => Math.acos(a / x), radJs: (A) => (x) => Math.sqrt(x * x - A) },
};

// ───────────── Easy ─────────────

function easyStrategy(rng) {
  const kind = rng.pick(['sinOdd', 'cosOdd', 'even']);
  let m;
  let n;
  if (kind === 'sinOdd') {
    n = rng.pick([0, 2, 4, 6]);
    m = n === 0 ? rng.pick([3, 5]) : rng.pick([1, 3, 5]);
  } else if (kind === 'cosOdd') {
    m = rng.pick([0, 2, 4, 6]);
    n = m === 0 ? rng.pick([3, 5]) : rng.pick([1, 3, 5]);
  } else {
    do {
      m = rng.pick([0, 2, 4, 6]);
      n = rng.pick([0, 2, 4, 6]);
    } while (m + n === 0);
  }
  const saveSin = { value: R`Save one \(\sin x\) and substitute \(u = \cos x\)`, why: R`That strategy needs an odd power of sine. Here the power of sine is \(${m}\).` };
  const saveCos = { value: R`Save one \(\cos x\) and substitute \(u = \sin x\)`, why: R`That strategy needs an odd power of cosine. Here the power of cosine is \(${n}\).` };
  const half = { value: 'Use the half-angle identities to lower the powers', why: 'The half-angle identities are for the case where both powers are even. An odd power allows a quick substitution instead.' };
  const sub = { value: R`Use the trig substitution \(x = \sin\theta\)`, why: R`Trig substitution replaces \(x\) inside radicals such as \(\sqrt{1 - x^{2}}\). This integrand is already written with sine and cosine.` };
  const correct = kind === 'sinOdd' ? saveSin : kind === 'cosOdd' ? saveCos : half;
  const solution =
    kind === 'even'
      ? [
          R`Both powers are even (sine: \(${m}\), cosine: \(${n}\)), so no single factor can be saved for a substitution.`,
          R`Lower the powers with \(\sin^{2}x = \frac{1 - \cos 2x}{2}\) and \(\cos^{2}x = \frac{1 + \cos 2x}{2}\).`,
        ]
      : kind === 'sinOdd'
        ? [
            R`The power of sine is odd (\(${m}\)).`,
            R`Save one \(\sin x\) for \(du\), turn the remaining even power of sine into cosines with \(\sin^{2}x = 1 - \cos^{2}x\), and let \(u = \cos x\).`,
          ]
        : [
            R`The power of cosine is odd (\(${n}\)).`,
            R`Save one \(\cos x\) for \(du\), turn the remaining even power of cosine into sines with \(\cos^{2}x = 1 - \sin^{2}x\), and let \(u = \sin x\).`,
          ];
  return q({
    prompt: R`Which strategy fits \(\displaystyle\int ${tp('\\sin', m)}${m && n ? '\\,' : ''}${tp('\\cos', n)}\,dx\)?`,
    correct: correct.value,
    wrong: [saveSin, saveCos, half, sub].filter((c) => c !== correct),
    solution,
    rule: kind === 'even' ? 1 : 0,
    skill: 'choosing a strategy',
  });
}

function easyWhichSub(rng) {
  const a = rng.int(2, 9);
  const A = a * a;
  const kind = rng.pick(['sin', 'tan', 'sec']);
  const S = SUBS[kind];
  const rad = S.rad(A);
  const integrand = rng.pick({
    sin: [rad, R`\dfrac{1}{${rad}}`, `x^{2}${rad}`, R`\dfrac{x^{2}}{${rad}}`, R`\dfrac{1}{x^{2}${rad}}`],
    tan: [rad, R`\dfrac{1}{${rad}}`, R`\dfrac{1}{x^{2}${rad}}`, R`\dfrac{1}{(x^{2} + ${A})^{3/2}}`],
    sec: [rad, R`\dfrac{${rad}}{x}`, R`\dfrac{1}{x^{2}${rad}}`, R`\dfrac{1}{${rad}}`],
  }[kind]);
  const opt = (k, c = a) => M(`x = ${c}${SUBS[k].fn}\\theta`);
  const notes = {
    sin: R`\(x = a\sin\theta\) is for a difference \(a^{2} - x^{2}\), because \(1 - \sin^{2}\theta = \cos^{2}\theta\).`,
    tan: R`\(x = a\tan\theta\) is for a sum \(x^{2} + a^{2}\), because \(\tan^{2}\theta + 1 = \sec^{2}\theta\).`,
    sec: R`\(x = a\sec\theta\) is for a difference \(x^{2} - a^{2}\), because \(\sec^{2}\theta - 1 = \tan^{2}\theta\).`,
  };
  const identity = {
    sin: R`\(${A} - x^{2} = ${A}(1 - \sin^{2}\theta) = ${A}\cos^{2}\theta\)`,
    tan: R`\(x^{2} + ${A} = ${A}(\tan^{2}\theta + 1) = ${A}\sec^{2}\theta\)`,
    sec: R`\(x^{2} - ${A} = ${A}(\sec^{2}\theta - 1) = ${A}\tan^{2}\theta\)`,
  }[kind];
  const form = { sin: 'a^{2} - x^{2}', tan: 'x^{2} + a^{2}', sec: 'x^{2} - a^{2}' }[kind];
  return q({
    prompt: R`Which substitution removes the square root in \(\displaystyle\int ${integrand}\,dx\)?`,
    correct: opt(kind),
    wrong: [
      ...['sin', 'tan', 'sec'].filter((k) => k !== kind).map((k) => ({ value: opt(k), why: notes[k] })),
      { value: opt(kind, A), why: R`The constant in the substitution is \(a = \sqrt{${A}} = ${a}\), not \(a^{2}\).` },
    ],
    solution: [
      R`The expression under the root has the form \(${form}\) with \(a^{2} = ${A}\), so \(a = ${a}\).`,
      R`Use \(x = ${a}${S.fn}\theta\). Then ${identity}, a perfect square, so the root disappears.`,
    ],
    rule: 3,
    skill: 'choosing a trig substitution',
  });
}

function easyRadicalBecomes(rng) {
  const a = rng.int(2, 9);
  const A = a * a;
  const kind = rng.pick(['sin', 'tan', 'sec']);
  const S = SUBS[kind];
  const t = (fn, c = a, p = 1) => M(`${c}${tp(fn, p, '\\theta')}`);
  if (rng.bool()) {
    const other = { sin: '\\sin', tan: '\\tan', sec: '\\sec' }[kind];
    return q({
      prompt: R`With the substitution \(x = ${a}${S.fn}\theta\), what does \(${S.rad(A)}\) become? (Take \(\theta\) in the usual range, where the result is positive.)`,
      correct: t(S.becomes),
      wrong: [
        { value: t(S.becomes, A, 2), why: R`That is \(${S.inside(A)}\) itself. Take the square root.` },
        { value: t(other), why: R`Use the Pythagorean identity: the root turns into the partner function of \(${S.fn}\theta\), not \(${S.fn}\theta\) itself.` },
        { value: t(S.becomes, A), why: R`\(\sqrt{${A}} = ${a}\).` },
      ],
      solution: [
        R`Substitute: \(${S.inside(A)}\) becomes \(${{ sin: `${A} - ${A}\\sin^{2}\\theta`, tan: `${A}\\tan^{2}\\theta + ${A}`, sec: `${A}\\sec^{2}\\theta - ${A}` }[kind]}\).`,
        R`Factor and use the identity: \(${{ sin: `${A}(1 - \\sin^{2}\\theta) = ${A}\\cos^{2}\\theta`, tan: `${A}(\\tan^{2}\\theta + 1) = ${A}\\sec^{2}\\theta`, sec: `${A}(\\sec^{2}\\theta - 1) = ${A}\\tan^{2}\\theta` }[kind]}\).`,
        R`Take the square root: \(${a}${S.becomes}\theta\).`,
      ],
      rule: 3,
      skill: 'simplifying the radical',
    });
  }
  const D = (tex) => M(`dx = ${tex}\\,d\\theta`);
  const opts = {
    sin: [D(`${a}\\cos\\theta`), { value: D(`-${a}\\cos\\theta`), why: R`The derivative of \(\sin\theta\) is \(+\cos\theta\).` }, { value: D('\\cos\\theta'), why: R`The constant \(${a}\) stays when you differentiate.` }, D(`${a}\\sin\\theta`)],
    tan: [D(`${a}\\sec^{2}\\theta`), { value: D(`${a}\\sec\\theta\\tan\\theta`), why: R`That is the derivative of \(${a}\sec\theta\). The derivative of \(\tan\theta\) is \(\sec^{2}\theta\).` }, { value: D('\\sec^{2}\\theta'), why: R`The constant \(${a}\) stays when you differentiate.` }, D(`${a}\\sec\\theta`)],
    sec: [D(`${a}\\sec\\theta\\tan\\theta`), { value: D(`${a}\\sec^{2}\\theta`), why: R`That is the derivative of \(${a}\tan\theta\). The derivative of \(\sec\theta\) is \(\sec\theta\tan\theta\).` }, { value: D('\\sec\\theta\\tan\\theta'), why: R`The constant \(${a}\) stays when you differentiate.` }, D(`${a}\\tan\\theta`)],
  }[kind];
  return q({
    prompt: R`An integral contains \(${S.rad(A)}\), so you substitute \(x = ${a}${S.fn}\theta\). What replaces \(dx\)?`,
    correct: opts[0],
    wrong: opts.slice(1),
    solution: [
      R`Differentiate \(x = ${a}${S.fn}\theta\) with respect to \(\theta\).`,
      R`\(\dfrac{dx}{d\theta} = ${S.dx(a).replace('\\,d\\theta', '')}\), so \(dx = ${S.dx(a)}\).`,
      R`Every \(dx\) in the integral must be replaced by this whole expression.`,
    ],
    rule: 3,
    skill: 'replacing dx',
  });
}

function easyPowerTimesDerivative(rng) {
  const a = rng.int(1, 6);
  const n = rng.int(1, 5);
  const kind = rng.pick(['sin', 'cos', 'tan']);
  const c = frac(a, n + 1);
  const sinp = (x) => Math.sin(x) ** (n + 1);
  const cosp = (x) => Math.cos(x) ** (n + 1);
  const xs = [0.2, 0.5, 0.8, 1.1];
  const set = {
    sin: {
      integrand: `${tp('\\sin', n)}\\cos x`, f: (x) => a * Math.sin(x) ** n * Math.cos(x), u: '\\sin x', du: '\\cos x\\,dx', sign: 1,
      right: { tex: terms([[c, tp('\\sin', n + 1)]]), F: (x) => c.value * sinp(x) },
      wrongs: [
        { tex: terms([[c.neg(), tp('\\sin', n + 1)]]), F: (x) => -c.value * sinp(x), why: R`Here \(u = \sin x\) and \(du = \cos x\,dx\): no minus sign appears.` },
        { tex: terms([[c, `${tp('\\sin', n + 1)}\\cos x`]]), F: (x) => c.value * sinp(x) * Math.cos(x), why: R`The factor \(\cos x\,dx\) is used up as \(du\). It does not stay in the answer.` },
        { tex: terms([[c, tp('\\cos', n + 1)]]), F: (x) => c.value * cosp(x) },
        { tex: terms([[a, tp('\\sin', n + 1)]]), F: (x) => a * sinp(x) },
      ],
    },
    cos: {
      integrand: `${tp('\\cos', n)}\\sin x`, f: (x) => a * Math.cos(x) ** n * Math.sin(x), u: '\\cos x', du: '-\\sin x\\,dx', sign: -1,
      right: { tex: terms([[c.neg(), tp('\\cos', n + 1)]]), F: (x) => -c.value * cosp(x) },
      wrongs: [
        { tex: terms([[c, tp('\\cos', n + 1)]]), F: (x) => c.value * cosp(x), why: R`With \(u = \cos x\), \(du = -\sin x\,dx\). The minus sign carries through to the answer.` },
        { tex: terms([[c.neg(), `${tp('\\cos', n + 1)}\\sin x`]]), F: (x) => -c.value * cosp(x) * Math.sin(x), why: R`The factor \(\sin x\,dx\) is used up as \(du\). It does not stay in the answer.` },
        { tex: terms([[c.neg(), tp('\\sin', n + 1)]]), F: (x) => -c.value * sinp(x) },
        { tex: terms([[-a, tp('\\cos', n + 1)]]), F: (x) => -a * cosp(x) },
      ],
    },
    tan: {
      integrand: `${tp('\\tan', n)}\\sec^{2}x`, f: (x) => a * Math.tan(x) ** n * sec(x) ** 2, u: '\\tan x', du: '\\sec^{2}x\\,dx', sign: 1,
      right: { tex: terms([[c, tp('\\tan', n + 1)]]), F: (x) => c.value * Math.tan(x) ** (n + 1) },
      wrongs: [
        { tex: terms([[c, `${tp('\\tan', n + 1)}\\sec^{2}x`]]), F: (x) => c.value * Math.tan(x) ** (n + 1) * sec(x) ** 2, why: R`The factor \(\sec^{2}x\,dx\) is used up as \(du\). It does not stay in the answer.` },
        { tex: terms([[frac(a, 3 * (n + 1)), `${tp('\\tan', n + 1)}\\sec^{3}x`]]), F: (x) => (a / (3 * (n + 1))) * Math.tan(x) ** (n + 1) * sec(x) ** 3, why: POWER_RULE_WHY },
        { tex: terms([[c.neg(), tp('\\tan', n + 1)]]), F: (x) => -c.value * Math.tan(x) ** (n + 1) },
        { tex: terms([[c, tp('\\sec', n + 1)]]), F: (x) => c.value * sec(x) ** (n + 1) },
      ],
    },
  }[kind];
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, set.integrand]])}\,dx\).`,
    ...antiChoices(set.right, set.wrongs, xs),
    solution: [
      R`Let \(u = ${set.u}\). Then \(du = ${set.du}\), which matches the other factor${set.sign < 0 ? ' except for a minus sign' : ''}.`,
      R`The integral becomes \(${terms([[set.sign * a, `\\displaystyle\\int ${power('u', n)}\\,du`]])} = ${terms([[frac(set.sign * a, n + 1), power('u', n + 1)]])}\).`,
      R`Substitute back: \(${set.right.tex} + C\).`,
    ],
    rule: kind === 'tan' ? 2 : 0,
    skill: 'substitution with trig powers',
    check: () => checkAntideriv(set.right.F, set.f, xs),
  });
}

// ───────────── Medium ─────────────

function mediumOddPower(rng) {
  const a = rng.int(1, 5);
  const n = rng.pick([0, 2, 4, 6]);
  const sinOdd = rng.bool();
  const [T, Tjs, other, otherJs] = sinOdd ? ['\\cos', Math.cos, '\\sin', Math.sin] : ['\\sin', Math.sin, '\\cos', Math.cos];
  const basis = [{ tex: tp(T, n + 1), f: (x) => Tjs(x) ** (n + 1) }, { tex: tp(T, n + 3), f: (x) => Tjs(x) ** (n + 3) }];
  const s = sinOdd ? -1 : 1;
  const c = [frac(s * a, n + 1), frac(-s * a, n + 3)];
  const right = combo(basis, c);
  const integrand = sinOdd ? `\\sin^{3}x${tp('\\cos', n)}` : `${tp('\\sin', n)}\\cos^{3}x`;
  const un = power('u', n);
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, integrand]])}\,dx\).`,
    ...antiChoices(right, [
      {
        ...combo(basis, [c[0].neg(), c[1].neg()]),
        why: sinOdd ? R`With \(u = \cos x\), \(du = -\sin x\,dx\). That minus sign multiplies the whole integral.` : R`With \(u = \sin x\), \(du = \cos x\,dx\): there is no extra minus sign.`,
      },
      { ...combo(basis, [c[0], c[1].neg()]), why: R`\(${other}^{2}x = 1 - ${T}^{2}x\), so the two terms have opposite signs.` },
      {
        tex: terms([[frac(a, 4 * (n + 1)), `${other}^{4}x${n === 0 ? '\\,' : ''}${tp(T, n + 1)}`]]),
        F: (x) => (a / (4 * (n + 1))) * otherJs(x) ** 4 * Tjs(x) ** (n + 1),
        why: POWER_RULE_WHY,
      },
      combo(basis, [frac(s * a, n + 3), frac(-s * a, n + 1)]),
    ]),
    solution: sinOdd
      ? [
          R`The power of sine is odd. Save one \(\sin x\) and convert the other two: \(\sin^{3}x = (1 - \cos^{2}x)\sin x\).`,
          R`Let \(u = \cos x\), so \(du = -\sin x\,dx\). The integral becomes \(${terms([[-a, `\\displaystyle\\int (1 - u^{2})${un}\\,du`]])}\).`,
          R`Expand and integrate: \(${scaled(-a, terms([[frac(1, n + 1), power('u', n + 1)], [frac(-1, n + 3), power('u', n + 3)]]))}\).`,
          R`Substitute back \(u = \cos x\): \(${right.tex} + C\).`,
        ]
      : [
          R`The power of cosine is odd. Save one \(\cos x\) and convert the other two: \(\cos^{3}x = (1 - \sin^{2}x)\cos x\).`,
          R`Let \(u = \sin x\), so \(du = \cos x\,dx\). The integral becomes \(${terms([[a, `\\displaystyle\\int ${un}(1 - u^{2})\\,du`]])}\).`,
          R`Expand and integrate: \(${scaled(a, terms([[frac(1, n + 1), power('u', n + 1)], [frac(-1, n + 3), power('u', n + 3)]]))}\).`,
          R`Substitute back \(u = \sin x\): \(${right.tex} + C\).`,
        ],
    rule: 0,
    skill: 'odd power of sine or cosine',
    check: () => checkAntideriv(right.F, (x) => a * (sinOdd ? Math.sin(x) ** 3 * Math.cos(x) ** n : Math.sin(x) ** n * Math.cos(x) ** 3)),
  });
}

function mediumHalfAngle(rng) {
  const a = rng.int(1, 6);
  const k = rng.int(1, 4);
  const isSin = rng.bool();
  const fn = isSin ? '\\sin' : '\\cos';
  const fnJs = isSin ? Math.sin : Math.cos;
  const S2 = `\\sin ${kx(2 * k)}`;
  const C2 = `\\cos ${kx(2 * k)}`;
  const basis = [{ tex: 'x', f: (x) => x }, { tex: S2, f: (x) => Math.sin(2 * k * x) }];
  const s = isSin ? -1 : 1;
  const c = [frac(a, 2), frac(s * a, 4 * k)];
  const right = combo(basis, c);
  const arg = kx(k);
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, tp(fn, 2, arg)]])}\,dx\).`,
    ...antiChoices(right, [
      { ...combo(basis, [c[0], c[1].neg()]), why: R`\(\sin^{2}\theta = \frac{1 - \cos 2\theta}{2}\) has the minus sign and \(\cos^{2}\theta = \frac{1 + \cos 2\theta}{2}\) has the plus sign.` },
      { ...combo(basis, [c[0], frac(s * a, 2)]), why: R`\(\int ${C2}\,dx = ${terms([[frac(1, 2 * k), S2]])}\). Divide by the inner coefficient \(${2 * k}\).` },
      { tex: terms([[frac(a, 3 * k), tp(fn, 3, arg)]]), F: (x) => (a / (3 * k)) * fnJs(k * x) ** 3, why: POWER_RULE_WHY },
      combo(basis, [a, frac(s * a, 2 * k)]),
    ]),
    solution: [
      R`The power is even, so use the half-angle identity \(${fn}^{2}\theta = \dfrac{1 ${isSin ? '-' : '+'} \cos 2\theta}{2}\) with \(\theta = ${arg}\).`,
      R`\(\displaystyle\int ${terms([[a, tp(fn, 2, arg)]])}\,dx = ${frac(a, 2).tex()}\int \left(1 ${isSin ? '-' : '+'} ${C2}\right)dx\).`,
      R`Integrate each term: \(\int 1\,dx = x\) and \(\int ${C2}\,dx = ${terms([[frac(1, 2 * k), S2]])}\).`,
      R`Multiply out: \(${right.tex} + C\).`,
    ],
    rule: 1,
    skill: 'half-angle identities',
    check: () => checkAntideriv(right.F, (x) => a * fnJs(k * x) ** 2),
  });
}

function mediumSecTan(rng) {
  const a = rng.int(1, 5);
  const xs = [0.2, 0.5, 0.8, 1.1];
  const tanp = (p) => ({ tex: tp('\\tan', p), f: (x) => Math.tan(x) ** p });
  const secp = (p) => ({ tex: tp('\\sec', p), f: (x) => sec(x) ** p });
  if (rng.bool()) {
    const n = rng.int(0, 4);
    const basis = [tanp(n + 1), tanp(n + 3)];
    const c = [frac(a, n + 1), frac(a, n + 3)];
    const right = combo(basis, c);
    return q({
      prompt: R`Find \(\displaystyle\int ${terms([[a, `${tp('\\tan', n)}\\sec^{4}x`]])}\,dx\).`,
      ...antiChoices(
        right,
        [
          { ...combo(basis, [c[0], c[1].neg()]), why: R`\(\sec^{2}x = 1 + \tan^{2}x\), with a plus sign.` },
          { ...combo(basis, [c[0], 0]), why: R`Only one \(\sec^{2}x\) becomes \(du\). The other turns into \(1 + \tan^{2}x\) and adds a second term.` },
          { tex: terms([[frac(a, 5 * (n + 1)), `${tp('\\tan', n + 1)}\\sec^{5}x`]]), F: (x) => (a / (5 * (n + 1))) * Math.tan(x) ** (n + 1) * sec(x) ** 5, why: POWER_RULE_WHY },
          combo(basis, [c[1], c[0]]),
        ],
        xs,
      ),
      solution: [
        R`The power of secant is even. Save one \(\sec^{2}x\) for \(du\) and write the other as \(1 + \tan^{2}x\).`,
        R`Let \(u = \tan x\), \(du = \sec^{2}x\,dx\). The integral becomes \(${terms([[a, `\\displaystyle\\int ${power('u', n)}(1 + u^{2})\\,du`]])}\).`,
        R`Expand and integrate: \(${terms([[c[0], power('u', n + 1)], [c[1], power('u', n + 3)]])}\).`,
        R`Substitute back \(u = \tan x\): \(${right.tex} + C\).`,
      ],
      rule: 2,
      skill: 'secant–tangent integrals',
      check: () => checkAntideriv(right.F, (x) => a * Math.tan(x) ** n * sec(x) ** 4, xs),
    });
  }
  const n = rng.int(1, 4);
  const basis = [secp(n + 2), secp(n)];
  const c = [frac(a, n + 2), frac(-a, n)];
  const right = combo(basis, c);
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, `\\tan^{3}x${tp('\\sec', n)}`]])}\,dx\).`,
    ...antiChoices(
      right,
      [
        { ...combo(basis, [c[0], c[1].neg()]), why: R`\(\tan^{2}x = \sec^{2}x - 1\), with a minus sign.` },
        { ...combo([secp(n + 3), secp(n + 1)], [frac(a, n + 3), frac(-a, n + 1)]), why: R`\(du = \sec x\tan x\,dx\) uses up one power of secant as well as one power of tangent.` },
        { tex: terms([[frac(a, 4 * (n + 1)), `\\tan^{4}x${tp('\\sec', n + 1)}`]]), F: (x) => (a / (4 * (n + 1))) * Math.tan(x) ** 4 * sec(x) ** (n + 1), why: POWER_RULE_WHY },
        combo(basis, [c[0].neg(), c[1].neg()]),
      ],
      xs,
    ),
    solution: [
      R`The power of tangent is odd. Save \(\sec x\tan x\) for \(du\) and write the remaining \(\tan^{2}x\) as \(\sec^{2}x - 1\).`,
      R`Let \(u = \sec x\), \(du = \sec x\tan x\,dx\). The integral becomes \(${terms([[a, `\\displaystyle\\int (u^{2} - 1)${power('u', n - 1)}\\,du`]])}\).`,
      R`Expand and integrate: \(${terms([[c[0], power('u', n + 2)], [c[1], power('u', n)]])}\).`,
      R`Substitute back \(u = \sec x\): \(${right.tex} + C\).`,
    ],
    rule: 2,
    skill: 'secant–tangent integrals',
    check: () => checkAntideriv(right.F, (x) => a * Math.tan(x) ** 3 * sec(x) ** n, xs),
  });
}

function mediumTrigSubSetup(rng) {
  const a = rng.int(2, 7);
  const A = a * a;
  const a3 = a * A;
  const I = (tex) => M(`\\displaystyle\\int ${tex}\\,d\\theta`);
  const FORGOT_DX = R`Replace \(dx\) too. It is not just \(d\theta\).`;
  const bank = [
    {
      kind: 'sin', integrand: SUBS.sin.rad(A), f: (x) => Math.sqrt(A - x * x), g: (t) => A * Math.cos(t) ** 2,
      right: `${A}\\cos^{2}\\theta`, wrong: [{ value: `${a}\\cos\\theta`, why: FORGOT_DX }, `${A}\\cos\\theta`, `${A}\\sin^{2}\\theta`, `${a}\\cos^{2}\\theta`],
      line: R`\((${a}\cos\theta)(${a}\cos\theta\,d\theta) = ${A}\cos^{2}\theta\,d\theta\)`,
    },
    {
      kind: 'sin', integrand: R`\dfrac{x^{2}}{${SUBS.sin.rad(A)}}`, f: (x) => (x * x) / Math.sqrt(A - x * x), g: (t) => A * Math.sin(t) ** 2,
      right: `${A}\\sin^{2}\\theta`, wrong: [{ value: `${a}\\sin\\theta\\tan\\theta`, why: FORGOT_DX }, `${A}\\cos^{2}\\theta`, `${a}\\sin^{2}\\theta`, `${A}\\sin^{2}\\theta\\cos\\theta`],
      line: R`\(\dfrac{${A}\sin^{2}\theta}{${a}\cos\theta}\cdot ${a}\cos\theta\,d\theta = ${A}\sin^{2}\theta\,d\theta\)`,
    },
    {
      kind: 'sin', integrand: R`\dfrac{1}{x^{2}${SUBS.sin.rad(A)}}`, f: (x) => 1 / (x * x * Math.sqrt(A - x * x)), g: (t) => 1 / (A * Math.sin(t) ** 2),
      right: R`\frac{\csc^{2}\theta}{${A}}`, wrong: [{ value: R`\frac{\csc^{2}\theta\sec\theta}{${a3}}`, why: FORGOT_DX }, R`\frac{\sec^{2}\theta}{${A}}`, R`\frac{\csc^{2}\theta}{${a}}`, `${A}\\csc^{2}\\theta`],
      line: R`\(\dfrac{${a}\cos\theta\,d\theta}{${A}\sin^{2}\theta\cdot ${a}\cos\theta} = \dfrac{\csc^{2}\theta}{${A}}\,d\theta\)`,
    },
    {
      kind: 'tan', integrand: R`\dfrac{1}{${SUBS.tan.rad(A)}}`, f: (x) => 1 / Math.sqrt(x * x + A), g: (t) => sec(t),
      right: R`\sec\theta`, wrong: [{ value: R`\frac{\cos\theta}{${a}}`, why: FORGOT_DX }, R`\sec^{2}\theta`, `${a}\\sec\\theta`, R`\sec^{3}\theta`],
      line: R`\(\dfrac{${a}\sec^{2}\theta\,d\theta}{${a}\sec\theta} = \sec\theta\,d\theta\)`,
    },
    {
      kind: 'tan', integrand: SUBS.tan.rad(A), f: (x) => Math.sqrt(x * x + A), g: (t) => A * sec(t) ** 3,
      right: `${A}\\sec^{3}\\theta`, wrong: [{ value: `${a}\\sec\\theta`, why: FORGOT_DX }, `${A}\\sec^{2}\\theta`, `${a}\\sec^{3}\\theta`, `${A}\\sec\\theta\\tan\\theta`],
      line: R`\((${a}\sec\theta)(${a}\sec^{2}\theta\,d\theta) = ${A}\sec^{3}\theta\,d\theta\)`,
    },
    {
      kind: 'tan', integrand: R`\dfrac{1}{(x^{2} + ${A})^{3/2}}`, f: (x) => (x * x + A) ** -1.5, g: (t) => Math.cos(t) / A,
      right: R`\frac{\cos\theta}{${A}}`, wrong: [{ value: R`\frac{\cos^{3}\theta}{${a3}}`, why: FORGOT_DX }, R`\frac{\sec\theta}{${A}}`, R`\frac{\cos\theta}{${a}}`, `${A}\\cos\\theta`],
      line: R`\(\dfrac{${a}\sec^{2}\theta\,d\theta}{${a3}\sec^{3}\theta} = \dfrac{\cos\theta}{${A}}\,d\theta\)`,
    },
    {
      kind: 'sec', integrand: R`\dfrac{${SUBS.sec.rad(A)}}{x}`, f: (x) => Math.sqrt(x * x - A) / x, g: (t) => a * Math.tan(t) ** 2,
      right: `${a}\\tan^{2}\\theta`, wrong: [{ value: R`\sin\theta`, why: FORGOT_DX }, `${a}\\tan\\theta`, `${A}\\tan^{2}\\theta`, `${a}\\sec\\theta\\tan\\theta`],
      line: R`\(\dfrac{${a}\tan\theta}{${a}\sec\theta}\cdot ${a}\sec\theta\tan\theta\,d\theta = ${a}\tan^{2}\theta\,d\theta\)`,
    },
    {
      kind: 'sec', integrand: R`\dfrac{1}{${SUBS.sec.rad(A)}}`, f: (x) => 1 / Math.sqrt(x * x - A), g: (t) => sec(t),
      right: R`\sec\theta`, wrong: [{ value: R`\frac{\cot\theta}{${a}}`, why: FORGOT_DX }, R`\tan\theta`, `${a}\\sec\\theta`, R`\sec\theta\tan\theta`],
      line: R`\(\dfrac{${a}\sec\theta\tan\theta\,d\theta}{${a}\tan\theta} = \sec\theta\,d\theta\)`,
    },
  ];
  const item = rng.pick(bank);
  const S = SUBS[item.kind];
  const [x0, x1] = { sin: [0.2 * a, 0.7 * a], tan: [0.3 * a, 1.5 * a], sec: [1.2 * a, 2.5 * a] }[item.kind];
  const th = S.theta(a);
  return q({
    prompt: R`Rewrite \(\displaystyle\int ${item.integrand}\,dx\) using the substitution \(x = ${a}${S.fn}\theta\). Which integral in \(\theta\) do you get?`,
    correct: I(item.right),
    wrong: item.wrong.map((w) => (typeof w === 'string' ? I(w) : { value: I(w.value), why: w.why })),
    solution: [
      R`From \(x = ${a}${S.fn}\theta\): \(dx = ${S.dx(a)}\) and \(${S.rad(A)} = ${a}${S.becomes}\theta\).`,
      R`Replace every piece of the integrand, including \(dx\): ${item.line}.`,
      R`So the integral is \(\displaystyle\int ${item.right}\,d\theta\).`,
    ],
    rule: 3,
    skill: 'setting up a trig substitution',
    check: () => checkEqual(integrate(item.g, th(x0), th(x1)), integrate(item.f, x0, x1), 1e-6, 'theta integral'),
  });
}

function mediumWordPower(rng) {
  const A = rng.pick([20, 30, 40, 50, 60, 80, 90, 100, 120, 150]);
  const k = rng.int(1, 5);
  const full = rng.bool();
  const isSin = rng.bool();
  const fn = isSin ? '\\sin' : '\\cos';
  const den = full ? k : 2 * k;
  const top = den === 1 ? '\\pi' : `\\pi/${den}`;
  const right = K([[frac(A, 2 * den), '\\pi']]);
  const joules = (tex) => R`\(${tex}\) J`;
  const arg = kx(k, 't');
  return q({
    prompt: R`A heating element on alternating current uses power \(P(t) = ${A}${tp(fn, 2, arg)}\) watts, where \(t\) is in seconds. Energy is the integral of power over time. How much energy, in joules, does it use from \(t = 0\) to \(t = ${top}\)?`,
    ...exactChoices(
      right,
      [
        { k: K([[frac(A, den), '\\pi']]), why: R`The half-angle identity has a factor \(\frac{1}{2}\): \(${fn}^{2}\theta = \frac{1 ${isSin ? '-' : '+'} \cos 2\theta}{2}\).` },
        { k: K([[frac(isSin ? (full ? 2 * A : A) : full ? 0 : A, k), '']]), why: R`That integrates \(${A}${fn} ${arg}\). The power has the function squared.` },
        K([[frac(A, 4 * den), '\\pi']]),
        K([[frac(A, 2), '\\pi']]),
        K([[frac(A * den, 2), '\\pi']]),
      ],
      joules,
    ),
    solution: [
      R`Energy \(= \displaystyle\int_{0}^{${top}} ${A}${tp(fn, 2, arg)}\,dt\).`,
      R`Half-angle identity: \(${tp(fn, 2, arg)} = \dfrac{1 ${isSin ? '-' : '+'} \cos ${kx(2 * k, 't')}}{2}\), so the energy is \(${A / 2}\displaystyle\int_{0}^{${top}} \left(1 ${isSin ? '-' : '+'} \cos ${kx(2 * k, 't')}\right)dt\).`,
      R`The cosine term integrates to \(${terms([[frac(1, 2 * k), `\\sin ${kx(2 * k, 't')}`]])}\), which is 0 at both limits. That leaves \(${A / 2}\cdot ${den === 1 ? '\\pi' : `\\dfrac{\\pi}{${den}}`}\).`,
      R`Energy \(= ${right.tex}\) J, about \(${num(right.value, { places: 1 })}\) J.`,
    ],
    rule: 1,
    skill: 'half-angle identities',
    check: () => checkIntegral((t) => A * (isSin ? Math.sin(k * t) : Math.cos(k * t)) ** 2, 0, Math.PI / den, right.value),
  });
}

// ───────────── Hard ─────────────

function hardTrigSub(rng) {
  const a = rng.int(2, 6);
  const A = a * a;
  const form = rng.int(1, 8);
  const kind = [null, 'sin', 'tan', 'sec', 'sin', 'tan', 'sec', 'sin', 'sin'][form];
  const S = SUBS[kind];
  const rad = S.rad(A);
  const radJs = S.radJs(A);
  const xs = kind === 'sin' ? [0.2, 0.4, 0.6, 0.8].map((t) => t * a) : kind === 'tan' ? [0.37, 0.83, 1.29, 1.71] : [1.2, 1.5, 2, 2.6].map((t) => t * a);
  const setup = R`Let \(x = ${a}${S.fn}\theta\), so \(dx = ${S.dx(a)}\) and \(${rad} = ${a}${S.becomes}\theta\).`;
  const triangle = {
    sin: R`\(\sin\theta = \frac{x}{${a}}\): opposite \(x\), hypotenuse \(${a}\), adjacent \(${rad}\)`,
    tan: R`\(\tan\theta = \frac{x}{${a}}\): opposite \(x\), adjacent \(${a}\), hypotenuse \(${rad}\)`,
    sec: R`\(\sec\theta = \frac{x}{${a}}\): hypotenuse \(x\), adjacent \(${a}\), opposite \(${rad}\)`,
  }[kind];
  if (form <= 6) {
    // sgn·(radical)/(den·x)  and  sgn·x/(den·radical)
    const RX = (sgn, den) => ({ tex: `${sgn < 0 ? '-' : ''}\\frac{${rad}}{${den === 1 ? '' : den}x}`, F: (x) => (sgn * radJs(x)) / (den * x) });
    const XR = (sgn, den) => ({ tex: `${sgn < 0 ? '-' : ''}\\frac{x}{${den === 1 ? '' : den}${rad}}`, F: (x) => (sgn * x) / (den * radJs(x)) });
    const first = form <= 3;
    const s = form === 3 || form === 4 || form === 5 ? 1 : -1;
    const [Good, Flip] = first ? [RX, XR] : [XR, RX];
    const right = Good(s, A);
    const theta = [
      null,
      { becomes: R`\dfrac{${a}\cos\theta}{${A}\sin^{2}\theta\cdot ${a}\cos\theta}\,d\theta = \dfrac{1}{${A}}\displaystyle\int \csc^{2}\theta\,d\theta = -\dfrac{1}{${A}}\cot\theta`, ratio: R`\cot\theta = \dfrac{${rad}}{x}`, sign: R`\(\int \csc^{2}\theta\,d\theta = -\cot\theta\). Keep the minus sign.` },
      { becomes: R`\dfrac{${a}\sec^{2}\theta}{${A}\tan^{2}\theta\cdot ${a}\sec\theta}\,d\theta = \dfrac{1}{${A}}\displaystyle\int \dfrac{\cos\theta}{\sin^{2}\theta}\,d\theta = -\dfrac{1}{${A}}\csc\theta`, ratio: R`\csc\theta = \dfrac{${rad}}{x}`, sign: R`\(\int \frac{\cos\theta}{\sin^{2}\theta}\,d\theta = -\frac{1}{\sin\theta}\). Keep the minus sign.` },
      { becomes: R`\dfrac{${a}\sec\theta\tan\theta}{${A}\sec^{2}\theta\cdot ${a}\tan\theta}\,d\theta = \dfrac{1}{${A}}\displaystyle\int \cos\theta\,d\theta = \dfrac{1}{${A}}\sin\theta`, ratio: R`\sin\theta = \dfrac{${rad}}{x}`, sign: R`\(\int \cos\theta\,d\theta = +\sin\theta\).` },
      { becomes: R`\dfrac{${a}\cos\theta}{${a * A}\cos^{3}\theta}\,d\theta = \dfrac{1}{${A}}\displaystyle\int \sec^{2}\theta\,d\theta = \dfrac{1}{${A}}\tan\theta`, ratio: R`\tan\theta = \dfrac{x}{${rad}}`, sign: R`\(\int \sec^{2}\theta\,d\theta = +\tan\theta\).` },
      { becomes: R`\dfrac{${a}\sec^{2}\theta}{${a * A}\sec^{3}\theta}\,d\theta = \dfrac{1}{${A}}\displaystyle\int \cos\theta\,d\theta = \dfrac{1}{${A}}\sin\theta`, ratio: R`\sin\theta = \dfrac{x}{${rad}}`, sign: R`\(\int \cos\theta\,d\theta = +\sin\theta\).` },
      { becomes: R`\dfrac{${a}\sec\theta\tan\theta}{${a * A}\tan^{3}\theta}\,d\theta = \dfrac{1}{${A}}\displaystyle\int \dfrac{\cos\theta}{\sin^{2}\theta}\,d\theta = -\dfrac{1}{${A}}\csc\theta`, ratio: R`\csc\theta = \dfrac{x}{${rad}}`, sign: R`\(\int \frac{\cos\theta}{\sin^{2}\theta}\,d\theta = -\frac{1}{\sin\theta}\). Keep the minus sign.` },
    ][form];
    const integrand = first ? R`\dfrac{dx}{x^{2}${rad}}` : R`\dfrac{dx}{(${S.inside(A)})^{3/2}}`;
    return q({
      prompt: R`Find \(\displaystyle\int ${integrand}\).`,
      ...antiChoices(
        right,
        [
          { ...Good(-s, A), why: theta.sign },
          { ...Flip(s, A), why: 'Check the reference triangle: this ratio is upside down.' },
          { ...Good(s, a), why: R`Count the factors of \(${a}\): one from \(dx\) on top and three underneath, which leaves \(\frac{1}{${A}}\).` },
          Good(s, 1),
          Flip(-s, A),
        ],
        xs,
      ),
      solution: [
        setup,
        R`The integral becomes \(\displaystyle\int ${theta.becomes}\).`,
        R`Draw the triangle for ${triangle}. So \(${theta.ratio}\).`,
        R`Answer: \(${right.tex} + C\).`,
      ],
      rule: 4,
      skill: 'trig substitution',
      check: () => checkAntideriv(right.F, first ? (x) => 1 / (x * x * radJs(x)) : (x) => radJs(x) ** -3, xs),
    });
  }
  const asin = `\\arcsin\\frac{x}{${a}}`;
  const basis = [{ tex: asin, f: (x) => Math.asin(x / a) }, { tex: `x${rad}`, f: (x) => x * radJs(x) }];
  const s = form === 7 ? 1 : -1;
  const right = combo(basis, [frac(A, 2), frac(s, 2)]);
  const trig = form === 7 ? '\\cos' : '\\sin';
  return q({
    prompt: form === 7 ? R`Find \(\displaystyle\int ${rad}\,dx\).` : R`Find \(\displaystyle\int \frac{x^{2}}{${rad}}\,dx\).`,
    ...antiChoices(
      right,
      [
        { ...combo(basis, [frac(A, 2), frac(-s, 2)]), why: R`\(\int ${trig}^{2}\theta\,d\theta = \frac{\theta}{2} ${s > 0 ? '+' : '-'} \frac{\sin 2\theta}{4}\). Check the sign of the second term.` },
        { ...combo(basis, [frac(A, 2), 0]), why: R`The \(\sin 2\theta\) term does not vanish. Write \(\sin 2\theta = 2\sin\theta\cos\theta\) and use the triangle.` },
        { ...combo(basis, [A, s]), why: R`The half-angle identity brings a factor \(\frac{1}{2}\).` },
        combo(basis, [frac(a, 2), frac(s, 2)]),
      ],
      xs,
    ),
    solution: [
      setup,
      form === 7
        ? R`The integral becomes \(\displaystyle\int (${a}\cos\theta)(${a}\cos\theta)\,d\theta = ${A}\int \cos^{2}\theta\,d\theta = ${frac(A, 2).tex()}\left(\theta + \sin\theta\cos\theta\right)\), using the half-angle identity and \(\sin 2\theta = 2\sin\theta\cos\theta\).`
        : R`The integral becomes \(\displaystyle\int \frac{${A}\sin^{2}\theta}{${a}\cos\theta}\cdot ${a}\cos\theta\,d\theta = ${A}\int \sin^{2}\theta\,d\theta = ${frac(A, 2).tex()}\left(\theta - \sin\theta\cos\theta\right)\), using the half-angle identity and \(\sin 2\theta = 2\sin\theta\cos\theta\).`,
      R`Convert back: \(\theta = ${asin}\), \(\sin\theta = \dfrac{x}{${a}}\) and \(\cos\theta = \dfrac{${rad}}{${a}}\), so \(\sin\theta\cos\theta = \dfrac{x${rad}}{${A}}\).`,
      R`Answer: \(${right.tex} + C\).`,
    ],
    rule: 4,
    skill: 'trig substitution',
    check: () => checkAntideriv(right.F, form === 7 ? radJs : (x) => (x * x) / radJs(x), xs),
  });
}

function hardEvenPowers(rng) {
  const a = rng.pick([1, 2, 3, 4, 6, 8, 16]);
  const k = rng.int(1, 2);
  const form = rng.pick(['s2c2', 's4', 'c4']);
  const arg = kx(k);
  const S2 = `\\sin ${kx(2 * k)}`;
  const S4 = `\\sin ${kx(4 * k)}`;
  const basis = [{ tex: 'x', f: (x) => x }, { tex: S2, f: (x) => Math.sin(2 * k * x) }, { tex: S4, f: (x) => Math.sin(4 * k * x) }];
  const sk = (x) => Math.sin(k * x);
  const ck = (x) => Math.cos(k * x);
  if (form === 's2c2') {
    const c = [frac(a, 8), 0, frac(-a, 32 * k)];
    const right = combo(basis, c);
    return q({
      prompt: R`Find \(\displaystyle\int ${terms([[a, `\\sin^{2}${arg}\\cos^{2}${arg}`]])}\,dx\).`,
      ...antiChoices(right, [
        { ...combo(basis, [frac(a, 4), 0, frac(-a, 16 * k)]), why: R`Two factors of \(\frac{1}{2}\) appear: \(\sin\theta\cos\theta = \frac{1}{2}\sin 2\theta\) (squared gives \(\frac{1}{4}\)), then the half-angle identity gives another \(\frac{1}{2}\).` },
        { ...combo(basis, [frac(a, 8), 0, frac(-a, 8)]), why: R`\(\int \cos ${kx(4 * k)}\,dx = ${terms([[frac(1, 4 * k), S4]])}\). Divide by the inner coefficient.` },
        { ...combo(basis, [frac(a, 8), 0, frac(a, 32 * k)]), why: R`\(\sin^{2}\phi = \frac{1 - \cos 2\phi}{2}\), with a minus sign.` },
        { tex: terms([[frac(a, 9 * k), `\\sin^{3}${arg}\\cos^{3}${arg}`]]), F: (x) => (a / (9 * k)) * sk(x) ** 3 * ck(x) ** 3, why: POWER_RULE_WHY },
      ]),
      solution: [
        R`Both powers are even. Start with \(\sin\theta\cos\theta = \frac{1}{2}\sin 2\theta\), so \(\sin^{2}${arg}\cos^{2}${arg} = \frac{1}{4}\sin^{2}${kx(2 * k)}\).`,
        R`Half-angle identity: \(\sin^{2}${kx(2 * k)} = \dfrac{1 - \cos ${kx(4 * k)}}{2}\). The integrand is \(${frac(a, 8).value === 1 ? `1 - \\cos ${kx(4 * k)}` : terms([[frac(a, 8), `\\left(1 - \\cos ${kx(4 * k)}\\right)`]])}\).`,
        R`Integrate: \(\int \cos ${kx(4 * k)}\,dx = ${terms([[frac(1, 4 * k), S4]])}\).`,
        R`Answer: \(${right.tex} + C\).`,
      ],
      rule: 1,
      skill: 'even powers',
      check: () => checkAntideriv(right.F, (x) => a * sk(x) ** 2 * ck(x) ** 2),
    });
  }
  const s = form === 's4' ? -1 : 1;
  const fn = form === 's4' ? '\\sin' : '\\cos';
  const c = [frac(3 * a, 8), frac(s * a, 4 * k), frac(a, 32 * k)];
  const right = combo(basis, c);
  const sg = s < 0 ? '-' : '+';
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, tp(fn, 4, arg)]])}\,dx\).`,
    ...antiChoices(right, [
      { ...combo(basis, [frac(a, 4), c[1], c[2]]), why: R`\(\cos^{2}2\theta = \frac{1 + \cos 4\theta}{2}\) contributes a constant \(\frac{1}{2}\) as well, which raises \(\frac{1}{4}\) to \(\frac{3}{8}\).` },
      { ...combo(basis, [c[0], c[1].neg(), c[2]]), why: R`\(${fn}^{2}\theta = \frac{1 ${sg} \cos 2\theta}{2}\). Check the sign of the \(\cos 2\theta\) term.` },
      { ...combo(basis, [c[0], c[1], 0]), why: R`Squaring the half-angle identity leaves a \(\cos^{2}\) term, which needs the identity a second time.` },
      { tex: terms([[frac(a, 5 * k), tp(fn, 5, arg)]]), F: (x) => (a / (5 * k)) * (form === 's4' ? sk(x) : ck(x)) ** 5, why: POWER_RULE_WHY },
    ]),
    solution: [
      R`Even power: \(${tp(fn, 4, arg)} = \left(\dfrac{1 ${sg} \cos ${kx(2 * k)}}{2}\right)^{2} = \dfrac{1 ${sg} 2\cos ${kx(2 * k)} + \cos^{2}${kx(2 * k)}}{4}\).`,
      R`Use the identity again: \(\cos^{2}${kx(2 * k)} = \dfrac{1 + \cos ${kx(4 * k)}}{2}\). So \(${tp(fn, 4, arg)} = \dfrac{3}{8} ${sg} \dfrac{1}{2}\cos ${kx(2 * k)} + \dfrac{1}{8}\cos ${kx(4 * k)}\).`,
      R`Integrate term by term, dividing each sine by its inner coefficient, and multiply by \(${a}\).`,
      R`Answer: \(${right.tex} + C\).`,
    ],
    rule: 1,
    skill: 'even powers',
    check: () => checkAntideriv(right.F, (x) => a * (form === 's4' ? sk(x) : ck(x)) ** 4),
  });
}

// Antiderivative of (1 − u²)^k · u^n as a list of [coefficient, exponent].
function oddPowerPoly(k, n, sign = -1) {
  const out = [];
  for (let j = 0; j <= k; j++) out.push([frac(choose(k, j) * sign ** j, 2 * j + n + 1), 2 * j + n + 1]);
  return out;
}
const evalPoly = (G, u) => G.reduce((s, [c, e]) => s.add(c.mul(u.pow(e))), frac(0));
const polyTex = (G) => terms(G.map(([c, e]) => [c, power('u', e)]));

function hardDefiniteOdd(rng) {
  const sinOdd = rng.bool();
  const a = rng.int(1, 3);
  const one = frac(1);
  // A limit where u = 1/2 keeps the numbers readable only for the smaller powers.
  const halfLimit = rng.bool(0.3);
  const odd = halfLimit ? 3 : rng.pick([3, 5]);
  const other = halfLimit ? rng.pick([0, 2]) : rng.pick([0, 2, 4]);
  const k = (odd - 1) / 2;
  const bracket = k === 1 ? '(1 - u^{2})' : '(1 - u^{2})^{2}';
  const G = oddPowerPoly(k, other);
  const plus = oddPowerPoly(k, other, 1);
  const lead = (tex) => terms([[a, tex]]);
  const finish = (base) => (a === 1 ? [] : [R`Multiply by the constant \(${a}\): \(${base.mul(a).tex()}\).`]);
  if (sinOdd) {
    const L = halfLimit
      ? { tex: R`\pi/3`, v: Math.PI / 3, u: frac(1, 2), cos: R`\cos\frac{\pi}{3} = \frac{1}{2}` }
      : rng.pick([
          { tex: R`\pi/2`, v: Math.PI / 2, u: frac(0), cos: R`\cos\frac{\pi}{2} = 0` },
          { tex: R`\pi`, v: Math.PI, u: frac(-1), cos: R`\cos\pi = -1` },
        ]);
    const base = evalPoly(G, one).sub(evalPoly(G, L.u));
    const value = base.mul(a);
    return q({
      prompt: R`Evaluate \(\displaystyle\int_{0}^{${L.tex}} ${lead(`${tp('\\sin', odd)}${tp('\\cos', other)}`)}\,dx\).`,
      correct: value,
      wrong: [
        { value: value.neg(), why: R`\(du = -\sin x\,dx\). That minus sign reverses the limits, so the result is positive.` },
        { value: evalPoly(plus, one).sub(evalPoly(plus, L.u)).mul(a), why: R`\(\sin^{2}x = 1 - \cos^{2}x\), with a minus sign.` },
        { value: evalPoly(G, one).mul(a), why: R`Change the limits: when \(x = ${L.tex}\), \(u = ${L.cos}\).` },
        frac(a, (odd + 1) * (other + 1)),
        value.mul(2),
      ],
      solution: [
        R`The power of sine is odd. Save one \(\sin x\) and write \(${tp('\\sin', odd - 1)} = ${k === 1 ? '1 - \\cos^{2}x' : '(1 - \\cos^{2}x)^{2}'}\).`,
        R`Let \(u = \cos x\), \(du = -\sin x\,dx\). Limits: \(x = 0\) gives \(u = 1\), and \(x = ${L.tex}\) gives \(u = ${L.cos}\).`,
        R`The minus sign swaps the limits: \(\displaystyle\int_{${L.u.tex()}}^{1} ${bracket}${power('u', other)}\,du = \Big[${polyTex(G)}\Big]_{${L.u.tex()}}^{1}\).`,
        R`Evaluate: \(${evalPoly(G, one).tex()} - ${L.u.n < 0 ? `\\left(${evalPoly(G, L.u).tex()}\\right)` : evalPoly(G, L.u).tex()} = ${base.tex()}\).`,
        ...finish(base),
      ],
      rule: 0,
      skill: 'odd power of sine or cosine',
      check: () => checkIntegral((x) => a * Math.sin(x) ** odd * Math.cos(x) ** other, 0, L.v, value.value),
    });
  }
  const L = halfLimit
    ? { tex: R`\pi/6`, v: Math.PI / 6, u: frac(1, 2), sin: R`\sin\frac{\pi}{6} = \frac{1}{2}` }
    : { tex: R`\pi/2`, v: Math.PI / 2, u: frac(1), sin: R`\sin\frac{\pi}{2} = 1` };
  const base = evalPoly(G, L.u);
  const value = base.mul(a);
  return q({
    prompt: R`Evaluate \(\displaystyle\int_{0}^{${L.tex}} ${lead(`${tp('\\sin', other)}${tp('\\cos', odd)}`)}\,dx\).`,
    correct: value,
    wrong: [
      { value: evalPoly(plus, L.u).mul(a), why: R`\(\cos^{2}x = 1 - \sin^{2}x\), with a minus sign.` },
      L.u.eq(1) ? null : { value: evalPoly(G, one).mul(a), why: R`Change the limits: when \(x = ${L.tex}\), \(u = ${L.sin}\).` },
      value.neg(),
      frac(a, (odd + 1) * (other + 1)),
      value.mul(2),
    ],
    solution: [
      R`The power of cosine is odd. Save one \(\cos x\) and write \(${tp('\\cos', odd - 1)} = ${k === 1 ? '1 - \\sin^{2}x' : '(1 - \\sin^{2}x)^{2}'}\).`,
      R`Let \(u = \sin x\), \(du = \cos x\,dx\). Limits: \(x = 0\) gives \(u = 0\), and \(x = ${L.tex}\) gives \(u = ${L.sin}\).`,
      R`\(\displaystyle\int_{0}^{${L.u.tex()}} ${power('u', other)}${bracket}\,du = \Big[${polyTex(G)}\Big]_{0}^{${L.u.tex()}} = ${base.tex()}\).`,
      ...finish(base),
    ],
    rule: 0,
    skill: 'odd power of sine or cosine',
    check: () => checkIntegral((x) => a * Math.sin(x) ** other * Math.cos(x) ** odd, 0, L.v, value.value),
  });
}

function hardWordQuarterDisc(rng) {
  const a = rng.pick([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  const A = a * a;
  const left = rng.bool();
  const h = a / 2;
  const arc = (x) => Math.sqrt(Math.max(0, A - x * x));
  const right = left ? K([[frac(A, 12), '\\pi'], [frac(A, 8), '\\sqrt{3}']]) : K([[frac(A, 6), '\\pi'], [frac(-A, 8), '\\sqrt{3}']]);
  const cm2 = (tex) => R`\(${tex}\) cm²`;
  const [lo, hi] = left ? [0, h] : [h, a];
  return q({
    prompt: R`A metal plate has the shape of a quarter disc of radius ${a} cm: the region under \(y = \sqrt{${A} - x^{2}}\) for \(0 \le x \le ${a}\). It is cut along the vertical line \(x = ${h}\). What is the area of the piece on the ${left ? 'left' : 'right'}?`,
    visual: {
      type: 'plot',
      x: [-0.1 * a, 1.15 * a],
      y: [-0.1 * a, 1.15 * a],
      square: true,
      fns: [{ f: arc, domain: [0, a] }],
      shade: [{ f: arc, from: lo, to: hi }],
      vlines: [{ x: h }],
      alt: `A quarter disc of radius ${a} in the first quadrant, cut by the vertical line x = ${h}. The piece on the ${left ? 'left, from x = 0 to x = ' + h : 'right, from x = ' + h + ' to x = ' + a}, is shaded.`,
    },
    ...exactChoices(
      right,
      left
        ? [
            { k: K([[frac(A, 12), '\\pi']]), why: R`The \(\sin\theta\cos\theta\) term is not 0 at \(\theta = \frac{\pi}{6}\). It adds \(${fterms([[frac(A, 8), '\\sqrt{3}']])}\).` },
            { k: K([[frac(A, 6), '\\pi'], [frac(A, 4), '\\sqrt{3}']]), why: R`The half-angle identity brings a factor \(\frac{1}{2}\): \(\int \cos^{2}\theta\,d\theta = \frac{1}{2}(\theta + \sin\theta\cos\theta)\).` },
            K([[frac(A, 12), '\\pi'], [frac(-A, 8), '\\sqrt{3}']]),
            K([[frac(A, 6), '\\pi'], [frac(A, 8), '\\sqrt{3}']]),
          ]
        : [
            { k: K([[frac(A, 6), '\\pi']]), why: R`The \(\sin\theta\cos\theta\) term is not 0 at \(\theta = \frac{\pi}{6}\). It removes \(${fterms([[frac(A, 8), '\\sqrt{3}']])}\).` },
            { k: K([[frac(A, 12), '\\pi'], [frac(A, 8), '\\sqrt{3}']]), why: 'That is the piece on the left. Subtract it from the quarter disc, or integrate from the cut to the edge.' },
            K([[frac(A, 6), '\\pi'], [frac(A, 8), '\\sqrt{3}']]),
            K([[frac(A, 3), '\\pi'], [frac(-A, 4), '\\sqrt{3}']]),
          ],
      cm2,
    ),
    solution: [
      R`Area \(= \displaystyle\int_{${lo}}^{${hi}} \sqrt{${A} - x^{2}}\,dx\). Let \(x = ${a}\sin\theta\), so \(dx = ${a}\cos\theta\,d\theta\) and the root is \(${a}\cos\theta\).`,
      R`New limits: \(x = ${lo}\) gives \(\theta = ${left ? '0' : '\\frac{\\pi}{6}'}\), and \(x = ${hi}\) gives \(\theta = ${left ? '\\frac{\\pi}{6}' : '\\frac{\\pi}{2}'}\).`,
      R`\(\displaystyle\int ${A}\cos^{2}\theta\,d\theta = ${frac(A, 2).tex()}\left(\theta + \sin\theta\cos\theta\right)\).`,
      left
        ? R`At \(\frac{\pi}{6}\): \(${frac(A, 2).tex()}\left(\frac{\pi}{6} + \frac{1}{2}\cdot\frac{\sqrt{3}}{2}\right)\). At 0: 0. Area \(= ${right.tex}\) cm².`
        : R`At \(\frac{\pi}{2}\): \(${frac(A, 2).tex()}\cdot\frac{\pi}{2}\). At \(\frac{\pi}{6}\): \(${frac(A, 2).tex()}\left(\frac{\pi}{6} + \frac{\sqrt{3}}{4}\right)\). Area \(= ${right.tex}\) cm².`,
    ],
    rule: 5,
    skill: 'area with trig substitution',
    check: () => checkIntegral((x) => Math.sqrt(A - x * x), lo, left ? hi : hi - 1e-9, right.value, 1e-4),
  });
}

// ───────────── Challenge ─────────────

function challengeTrigSubDefinite(rng) {
  const a = rng.int(2, 5);
  const A = a * a;
  const a3 = a * A;
  const half = frac(a, 2).tex();
  const r2 = '\\sqrt{2}';
  const r3 = '\\sqrt{3}';
  const sinSetup = R`Let \(x = ${a}\sin\theta\): \(dx = ${a}\cos\theta\,d\theta\) and \(\sqrt{${A} - x^{2}} = ${a}\cos\theta\).`;
  const tanSetup = R`Let \(x = ${a}\tan\theta\): \(dx = ${a}\sec^{2}\theta\,d\theta\) and \(\sqrt{x^{2} + ${A}} = ${a}\sec\theta\).`;
  const secSetup = R`Let \(x = ${a}\sec\theta\): \(dx = ${a}\sec\theta\tan\theta\,d\theta\) and \(\sqrt{x^{2} - ${A}} = ${a}\tan\theta\).`;
  const bank = [
    {
      int: R`\int_{0}^{${half}} \frac{x^{2}}{\sqrt{${A} - x^{2}}}\,dx`, f: (x) => (x * x) / Math.sqrt(A - x * x), lo: 0, hi: a / 2,
      right: K([[frac(A, 12), '\\pi'], [frac(-A, 8), r3]]),
      wrongs: [
        { k: K([[frac(A, 12), '\\pi'], [frac(A, 8), r3]]), why: R`\(\int \sin^{2}\theta\,d\theta = \frac{\theta}{2} - \frac{\sin 2\theta}{4}\), with a minus sign.` },
        { k: K([[frac(A, 12), '\\pi']]), why: R`The \(\sin 2\theta\) term is not 0 at \(\theta = \frac{\pi}{6}\).` },
        K([[frac(A, 6), '\\pi'], [frac(-A, 4), r3]]),
        K([[frac(A, 6), '\\pi'], [frac(-A, 8), r3]]),
      ],
      steps: [
        sinSetup,
        R`Limits: \(x = 0\) gives \(\theta = 0\); \(x = ${half}\) gives \(\sin\theta = \frac{1}{2}\), so \(\theta = \frac{\pi}{6}\).`,
        R`The integral becomes \(\displaystyle\int_{0}^{\pi/6} ${A}\sin^{2}\theta\,d\theta = ${frac(A, 2).tex()}\Big[\theta - \tfrac{1}{2}\sin 2\theta\Big]_{0}^{\pi/6} = ${frac(A, 2).tex()}\left(\frac{\pi}{6} - \frac{\sqrt{3}}{4}\right)\).`,
      ],
    },
    {
      int: R`\int_{${a}}^{${2 * a}} \frac{\sqrt{x^{2} - ${A}}}{x}\,dx`, f: (x) => Math.sqrt(Math.max(0, x * x - A)) / x, lo: a, hi: 2 * a,
      right: K([[a, r3], [frac(-a, 3), '\\pi']]),
      wrongs: [
        { k: K([[a, r3]]), why: R`\(\int \tan^{2}\theta\,d\theta = \tan\theta - \theta\). The \(-\theta\) term contributes \(-\frac{\pi}{3}\).` },
        { k: K([[a, r3], [frac(-a, 6), '\\pi']]), why: R`The upper limit \(x = ${2 * a}\) gives \(\sec\theta = 2\), so \(\theta = \frac{\pi}{3}\).` },
        K([[a, r3], [frac(a, 3), '\\pi']]),
        K([[A, r3], [frac(-A, 3), '\\pi']]),
      ],
      steps: [
        secSetup,
        R`Limits: \(x = ${a}\) gives \(\sec\theta = 1\), so \(\theta = 0\); \(x = ${2 * a}\) gives \(\sec\theta = 2\), so \(\theta = \frac{\pi}{3}\).`,
        R`The integral becomes \(\displaystyle\int_{0}^{\pi/3} ${a}\tan^{2}\theta\,d\theta = ${a}\Big[\tan\theta - \theta\Big]_{0}^{\pi/3} = ${a}\left(\sqrt{3} - \frac{\pi}{3}\right)\).`,
      ],
    },
    {
      int: R`\int_{0}^{${a}} \frac{dx}{(x^{2} + ${A})^{3/2}}`, f: (x) => (x * x + A) ** -1.5, lo: 0, hi: a,
      right: K([[frac(1, 2 * A), r2]]),
      wrongs: [
        { k: K([[frac(1, 4 * A), '\\pi']]), why: R`After the substitution the integrand is \(\frac{1}{${A}}\cos\theta\), and \(\int_{0}^{\pi/4}\cos\theta\,d\theta = \sin\frac{\pi}{4}\).` },
        { k: K([[frac(1, 2), r2]]), why: R`The constants do not cancel completely: \(\frac{${a}}{${a3}} = \frac{1}{${A}}\) stays in front.` },
        K([[frac(1, 2 * a), r2]]),
        K([[frac(1, 2 * A), '']]),
        K([[frac(1, A), r2]]),
      ],
      steps: [
        tanSetup,
        R`Limits: \(x = 0\) gives \(\theta = 0\); \(x = ${a}\) gives \(\tan\theta = 1\), so \(\theta = \frac{\pi}{4}\).`,
        R`The integral becomes \(\displaystyle\int_{0}^{\pi/4} \frac{${a}\sec^{2}\theta}{${a3}\sec^{3}\theta}\,d\theta = \frac{1}{${A}}\int_{0}^{\pi/4}\cos\theta\,d\theta = \frac{1}{${A}}\sin\frac{\pi}{4}\).`,
      ],
    },
    {
      int: R`\int_{0}^{${a}\sqrt{3}} \frac{dx}{(x^{2} + ${A})^{3/2}}`, f: (x) => (x * x + A) ** -1.5, lo: 0, hi: a * Math.sqrt(3),
      right: K([[frac(1, 2 * A), r3]]),
      wrongs: [
        { k: K([[frac(1, 2 * A), '']]), why: R`The upper limit gives \(\tan\theta = \sqrt{3}\), so \(\theta = \frac{\pi}{3}\), and \(\sin\frac{\pi}{3} = \frac{\sqrt{3}}{2}\).` },
        { k: K([[frac(1, 3 * A), '\\pi']]), why: R`After the substitution the integrand is \(\frac{1}{${A}}\cos\theta\), not \(\frac{1}{${A}}\).` },
        K([[frac(1, 2 * a), r3]]),
        K([[frac(1, A), r3]]),
        K([[frac(1, 2), r3]]),
      ],
      steps: [
        tanSetup,
        R`Limits: \(x = 0\) gives \(\theta = 0\); \(x = ${a}\sqrt{3}\) gives \(\tan\theta = \sqrt{3}\), so \(\theta = \frac{\pi}{3}\).`,
        R`The integral becomes \(\dfrac{1}{${A}}\displaystyle\int_{0}^{\pi/3}\cos\theta\,d\theta = \frac{1}{${A}}\sin\frac{\pi}{3}\).`,
      ],
    },
    {
      int: R`\int_{0}^{${half}} \frac{dx}{(${A} - x^{2})^{3/2}}`, f: (x) => (A - x * x) ** -1.5, lo: 0, hi: a / 2,
      right: K([[frac(1, 3 * A), r3]]),
      wrongs: [
        { k: K([[frac(1, A), r3]]), why: R`\(\sin\theta = \frac{1}{2}\) gives \(\theta = \frac{\pi}{6}\), and \(\tan\frac{\pi}{6} = \frac{\sqrt{3}}{3}\).` },
        { k: K([[frac(1, 6 * A), '\\pi']]), why: R`After the substitution the integrand is \(\frac{1}{${A}}\sec^{2}\theta\), whose antiderivative is \(\frac{1}{${A}}\tan\theta\).` },
        K([[frac(1, 2 * A), '']]),
        K([[frac(1, 3 * a), r3]]),
      ],
      steps: [
        sinSetup,
        R`Limits: \(x = 0\) gives \(\theta = 0\); \(x = ${half}\) gives \(\sin\theta = \frac{1}{2}\), so \(\theta = \frac{\pi}{6}\).`,
        R`The integral becomes \(\displaystyle\int_{0}^{\pi/6} \frac{${a}\cos\theta}{${a3}\cos^{3}\theta}\,d\theta = \frac{1}{${A}}\int_{0}^{\pi/6}\sec^{2}\theta\,d\theta = \frac{1}{${A}}\tan\frac{\pi}{6}\).`,
      ],
    },
    {
      int: R`\int_{${a}\sqrt{2}}^{${2 * a}} \frac{dx}{x^{2}\sqrt{x^{2} - ${A}}}`, f: (x) => 1 / (x * x * Math.sqrt(x * x - A)), lo: a * Math.SQRT2, hi: 2 * a,
      right: K([[frac(1, 2 * A), r3], [frac(-1, 2 * A), r2]]),
      wrongs: [
        { k: K([[frac(1, 2 * A), r3], [frac(1, 2 * A), r2]]), why: 'Subtract the value at the lower limit.' },
        { k: K([[frac(1, 2 * A), r3]]), why: R`The lower limit is not \(\theta = 0\): \(x = ${a}\sqrt{2}\) gives \(\sec\theta = \sqrt{2}\), so \(\theta = \frac{\pi}{4}\).` },
        K([[frac(1, 2), r3], [frac(-1, 2), r2]]),
        K([[frac(1, 2 * a), r3], [frac(-1, 2 * a), r2]]),
        K([[frac(1, 12 * A), '\\pi']]),
      ],
      steps: [
        secSetup,
        R`Limits: \(x = ${a}\sqrt{2}\) gives \(\sec\theta = \sqrt{2}\), so \(\theta = \frac{\pi}{4}\); \(x = ${2 * a}\) gives \(\sec\theta = 2\), so \(\theta = \frac{\pi}{3}\).`,
        R`The integral becomes \(\displaystyle\int_{\pi/4}^{\pi/3} \frac{${a}\sec\theta\tan\theta}{${A}\sec^{2}\theta\cdot ${a}\tan\theta}\,d\theta = \frac{1}{${A}}\int_{\pi/4}^{\pi/3}\cos\theta\,d\theta = \frac{1}{${A}}\left(\frac{\sqrt{3}}{2} - \frac{\sqrt{2}}{2}\right)\).`,
      ],
    },
    {
      int: R`\int_{0}^{${a}} x^{2}\sqrt{${A} - x^{2}}\,dx`, f: (x) => x * x * Math.sqrt(Math.max(0, A - x * x)), lo: 0, hi: a,
      right: K([[frac(A * A, 16), '\\pi']]),
      wrongs: [
        { k: K([[frac(A * A, 8), '\\pi']]), why: R`\(\sin^{2}\theta\cos^{2}\theta = \frac{1}{4}\sin^{2}2\theta\), and \(\int_{0}^{\pi/2}\sin^{2}2\theta\,d\theta = \frac{\pi}{4}\).` },
        { k: K([[frac(A, 16), '\\pi']]), why: R`Count the factors of \(${a}\): two from \(x^{2}\), one from the root and one from \(dx\) make \(${a}^{4} = ${A * A}\).` },
        K([[frac(A * A, 4), '\\pi']]),
        K([[frac(A * A, 3), '']]),
      ],
      steps: [
        sinSetup,
        R`Limits: \(x = 0\) gives \(\theta = 0\); \(x = ${a}\) gives \(\theta = \frac{\pi}{2}\).`,
        R`The integral becomes \(\displaystyle\int_{0}^{\pi/2} (${A}\sin^{2}\theta)(${a}\cos\theta)(${a}\cos\theta)\,d\theta = ${A * A}\int_{0}^{\pi/2}\sin^{2}\theta\cos^{2}\theta\,d\theta\).`,
        R`Since \(\sin^{2}\theta\cos^{2}\theta = \frac{1}{4}\sin^{2}2\theta = \frac{1}{8}(1 - \cos 4\theta)\), the last integral is \(\frac{\pi}{16}\).`,
      ],
    },
    {
      int: R`\int_{0}^{${a}} \frac{dx}{(x^{2} + ${A})^{2}}`, f: (x) => (x * x + A) ** -2, lo: 0, hi: a,
      right: K([[frac(1, 8 * a3), '\\pi'], [frac(1, 4 * a3), '']]),
      wrongs: [
        { k: K([[frac(1, 8 * a3), '\\pi']]), why: R`\(\int \cos^{2}\theta\,d\theta = \frac{\theta}{2} + \frac{\sin 2\theta}{4}\), and the second term is \(\frac{1}{4}\) at \(\theta = \frac{\pi}{4}\).` },
        { k: K([[frac(1, 4 * a3), '\\pi'], [frac(1, 2 * a3), '']]), why: R`The half-angle identity brings a factor \(\frac{1}{2}\).` },
        K([[frac(1, 8 * a3), '\\pi'], [frac(-1, 4 * a3), '']]),
        K([[frac(1, 8 * A), '\\pi'], [frac(1, 4 * A), '']]),
      ],
      steps: [
        R`Let \(x = ${a}\tan\theta\): \(dx = ${a}\sec^{2}\theta\,d\theta\) and \(x^{2} + ${A} = ${A}\sec^{2}\theta\).`,
        R`Limits: \(x = 0\) gives \(\theta = 0\); \(x = ${a}\) gives \(\theta = \frac{\pi}{4}\).`,
        R`The integral becomes \(\displaystyle\int_{0}^{\pi/4} \frac{${a}\sec^{2}\theta}{${A * A}\sec^{4}\theta}\,d\theta = \frac{1}{${a3}}\int_{0}^{\pi/4}\cos^{2}\theta\,d\theta = \frac{1}{${a3}}\left(\frac{\pi}{8} + \frac{1}{4}\right)\).`,
      ],
    },
  ];
  const item = rng.pick(bank);
  return q({
    prompt: R`Evaluate \(\displaystyle${item.int}\).`,
    ...exactChoices(item.right, item.wrongs),
    solution: [...item.steps, R`The value is \(${item.right.tex}\).`],
    rule: 5,
    skill: 'definite trig substitution',
    check: () => checkIntegral(item.f, item.lo, item.hi, item.right.value, 1e-4),
  });
}

function challengeCompleteSquare(rng) {
  const a = rng.int(2, 5);
  const A = a * a;
  const h = rng.nonzero(-4, 4);
  const u = terms([[1, 'x'], [h, '']]);
  const uBad = terms([[1, 'x'], [-h, '']]);
  const arg = (inner, den) => R`\left(\frac{${inner}}{${den}}\right)`;
  if (rng.bool()) {
    const c = h * h + A;
    const quad = poly([1, 2 * h, c]);
    const right = { tex: R`\frac{1}{${a}}\arctan${arg(u, a)}`, F: (x) => Math.atan((x + h) / a) / a };
    return q({
      prompt: R`Find \(\displaystyle\int \frac{dx}{${quad}}\).`,
      ...antiChoices(right, [
        { tex: R`\arctan${arg(u, a)}`, F: (x) => Math.atan((x + h) / a), why: R`\(\int \frac{du}{u^{2} + a^{2}} = \frac{1}{a}\arctan\frac{u}{a}\). The factor \(\frac{1}{a}\) is left over from \(du = a\sec^{2}\theta\,d\theta\).` },
        { tex: R`\frac{1}{${a}}\arctan${arg(uBad, a)}`, F: (x) => Math.atan((x - h) / a) / a, why: R`Completing the square gives \((${u})^{2}\): half of the \(x\)-coefficient \(${2 * h}\) is \(${h}\).` },
        { tex: R`\ln\left|${quad}\right|`, F: (x) => Math.log(Math.abs(x * x + 2 * h * x + c)), why: R`A logarithm would need the derivative of the denominator, \(${terms([[2, 'x'], [2 * h, '']])}\), in the numerator.` },
        { tex: R`\frac{1}{${A}}\arctan${arg(u, A)}`, F: (x) => Math.atan((x + h) / A) / A },
      ]),
      solution: [
        R`Complete the square: \(${quad} = (${u})^{2} + ${A}\).`,
        R`Let \(u = ${u}\). The integral is \(\displaystyle\int \frac{du}{u^{2} + ${A}}\), which has the form \(u^{2} + a^{2}\) with \(a = ${a}\).`,
        R`Substituting \(u = ${a}\tan\theta\) turns it into \(\displaystyle\int \frac{${a}\sec^{2}\theta}{${A}\sec^{2}\theta}\,d\theta = \frac{\theta}{${a}}\), and \(\theta = \arctan\frac{u}{${a}}\).`,
        R`Answer: \(${right.tex} + C\).`,
      ],
      rule: 3,
      skill: 'completing the square',
      check: () => checkAntideriv(right.F, (x) => 1 / (x * x + 2 * h * x + c)),
    });
  }
  const c = A - h * h;
  const inside = terms([[c, ''], [-2 * h, 'x'], [-1, 'x^{2}']]);
  const xs = [-0.6, -0.2, 0.3, 0.7].map((t) => -h + t * a);
  const right = { tex: R`\arcsin${arg(u, a)}`, F: (x) => Math.asin((x + h) / a) };
  return q({
    prompt: R`Find \(\displaystyle\int \frac{dx}{\sqrt{${inside}}}\).`,
    ...antiChoices(
      right,
      [
        { tex: R`\frac{1}{${a}}\arcsin${arg(u, a)}`, F: (x) => Math.asin((x + h) / a) / a, why: R`For arcsine the constants cancel: \(du = ${a}\cos\theta\,d\theta\) and the root is \(${a}\cos\theta\).` },
        { tex: R`\arcsin${arg(uBad, a)}`, F: (x) => Math.asin(Math.max(-1, Math.min(1, (x - h) / a))) + 0 * x, why: R`Completing the square gives \(${A} - (${u})^{2}\). Check the sign inside the bracket.` },
        { tex: R`\arctan${arg(u, a)}`, F: (x) => Math.atan((x + h) / a), why: R`A difference \(a^{2} - u^{2}\) under a square root leads to arcsine. Arctangent goes with \(u^{2} + a^{2}\).` },
        { tex: R`\arcsin${arg(u, A)}`, F: (x) => Math.asin((x + h) / A) },
      ],
      xs,
    ),
    solution: [
      R`Complete the square: \(${inside} = ${A} - (${u})^{2}\).`,
      R`Let \(u = ${u}\). The integral is \(\displaystyle\int \frac{du}{\sqrt{${A} - u^{2}}}\), which has the form \(a^{2} - u^{2}\) with \(a = ${a}\).`,
      R`Substituting \(u = ${a}\sin\theta\) turns it into \(\displaystyle\int \frac{${a}\cos\theta}{${a}\cos\theta}\,d\theta = \theta\), and \(\theta = \arcsin\frac{u}{${a}}\).`,
      R`Answer: \(${right.tex} + C\).`,
    ],
    rule: 3,
    skill: 'completing the square',
    check: () => checkAntideriv(right.F, (x) => 1 / Math.sqrt(c - 2 * h * x - x * x), xs),
  });
}

function challengeFindPower(rng) {
  const n = rng.int(2, 12);
  const kind = rng.pick(['sin', 'cos', 'tan']);
  const set = {
    sin: { int: R`\int_{0}^{\pi/2} \sin^{n}x\cos x\,dx`, f: (x) => Math.sin(x) ** n * Math.cos(x), hi: Math.PI / 2, u: R`u = \sin x`, lim: R`\(u\) runs from 0 to 1` },
    cos: { int: R`\int_{0}^{\pi/2} \cos^{n}x\sin x\,dx`, f: (x) => Math.cos(x) ** n * Math.sin(x), hi: Math.PI / 2, u: R`u = \cos x`, lim: R`\(u\) runs from 1 down to 0, and \(du = -\sin x\,dx\) flips the limits back` },
    tan: { int: R`\int_{0}^{\pi/4} \tan^{n}x\sec^{2}x\,dx`, f: (x) => Math.tan(x) ** n * sec(x) ** 2, hi: Math.PI / 4, u: R`u = \tan x`, lim: R`\(u\) runs from 0 to 1` },
  }[kind];
  return q({
    prompt: R`For which positive integer \(n\) is \(\displaystyle${set.int} = \frac{1}{${n + 1}}\)?`,
    correct: n,
    fmt: (v) => R`\(n = ${v}\)`,
    wrong: [
      { value: n + 1, why: R`The integral equals \(\frac{1}{n + 1}\), so \(n + 1 = ${n + 1}\).` },
      { value: n - 1, why: R`Integrating \(u^{n}\) raises the power by 1: the result is \(\frac{1}{n + 1}\).` },
      n + 2,
      2 * n,
    ],
    solution: [
      R`Substitute \(${set.u}\). Then ${set.lim}.`,
      R`The integral becomes \(\displaystyle\int_{0}^{1} u^{n}\,du = \frac{1}{n + 1}\).`,
      R`Set \(\dfrac{1}{n + 1} = \dfrac{1}{${n + 1}}\): \(n = ${n}\).`,
    ],
    rule: kind === 'tan' ? 2 : 0,
    skill: 'working backwards',
    check: () => checkIntegral(set.f, 0, set.hi, 1 / (n + 1)),
  });
}

function challengeEquivalentForms(rng) {
  const a = rng.int(1, 8);
  const bad = rng.pick(['none', 'none', 'A', 'B', 'C']);
  const forms = {
    A: { good: { tex: terms([[frac(a, 2), '\\sin^{2}x']]), F: (x) => (a / 2) * Math.sin(x) ** 2 }, bad: { tex: terms([[a, '\\sin^{2}x']]), F: (x) => a * Math.sin(x) ** 2 }, how: R`u = \sin x` },
    B: { good: { tex: terms([[frac(-a, 2), '\\cos^{2}x']]), F: (x) => (-a / 2) * Math.cos(x) ** 2 }, bad: { tex: terms([[frac(a, 2), '\\cos^{2}x']]), F: (x) => (a / 2) * Math.cos(x) ** 2 }, how: R`u = \cos x` },
    C: { good: { tex: terms([[frac(-a, 4), '\\cos 2x']]), F: (x) => (-a / 4) * Math.cos(2 * x) }, bad: { tex: terms([[frac(-a, 2), '\\cos 2x']]), F: (x) => (-a / 2) * Math.cos(2 * x) }, how: R`\sin 2x = 2\sin x\cos x` },
  };
  const shown = Object.fromEntries(['A', 'B', 'C'].map((k) => [k, bad === k ? forms[k].bad : forms[k].good]));
  const f = (x) => a * Math.sin(x) * Math.cos(x);
  const integrand = terms([[a, '\\sin x\\cos x']]);
  const answers = { none: 'All three are correct', A: 'Only B and C', B: 'Only A and C', C: 'Only A and B' };
  const derivative = {
    A: bad === 'A' ? terms([[2 * a, '\\sin x\\cos x']]) : integrand,
    B: bad === 'B' ? terms([[-a, '\\sin x\\cos x']]) : integrand,
    C: bad === 'C' ? R`${terms([[a, '\\sin 2x']])} = ${terms([[2 * a, '\\sin x\\cos x']])}` : R`${terms([[frac(a, 2), '\\sin 2x']])} = ${integrand}`,
  };
  const ok = (k) => (bad === k ? 'This does not match the integrand.' : 'Correct.');
  return q({
    prompt: R`Three students find \(\displaystyle\int ${integrand}\,dx\) in different ways.
Student A (using \(${forms.A.how}\)): \(${shown.A.tex} + C\)
Student B (using \(${forms.B.how}\)): \(${shown.B.tex} + C\)
Student C (using \(${forms.C.how}\)): \(${shown.C.tex} + C\)
Whose answers are correct?`,
    correct: answers[bad],
    wrong: [
      ...['none', 'A', 'B', 'C'].filter((k) => k !== bad).map((k) => (bad === 'none' ? { value: answers[k], why: 'Answers that look different can still all be right: antiderivatives may differ by a constant. Differentiate each one to test it.' } : answers[k])),
    ],
    solution: [
      R`Test each answer by differentiating. A: \(\dfrac{d}{dx}\left[${shown.A.tex}\right] = ${derivative.A}\). ${ok('A')}`,
      R`B: \(\dfrac{d}{dx}\left[${shown.B.tex}\right] = ${derivative.B}\). ${ok('B')}`,
      R`C: \(\dfrac{d}{dx}\left[${shown.C.tex}\right] = ${derivative.C}\). ${ok('C')}`,
      bad === 'none'
        ? R`All three are correct. They differ only by constants, because \(\sin^{2}x = 1 - \cos^{2}x\) and \(\cos 2x = 1 - 2\sin^{2}x\).`
        : R`So the answer is: ${answers[bad]}. Two correct answers may look different because antiderivatives can differ by a constant.`,
    ],
    rule: 0,
    skill: 'equivalent antiderivatives',
    check: () => {
      const xs = [0.37, 0.83, 1.29];
      for (const k of ['A', 'B', 'C']) {
        const isRight = xs.every((x) => close(numDeriv(shown[k].F, x), f(x), 1e-5));
        if (isRight !== (bad !== k)) return `form ${k} is ${isRight ? 'right' : 'wrong'} but the key says otherwise`;
      }
      return true;
    },
  });
}

// ───────────── Models ─────────────

// sinᵐx·cosⁿx with m and n even, written as c₀ + Σ c_e·cos(e·x): returns [[c₀, 0], [c₂, 2], …] (Frac coefficients).
function evenPowerExpansion(m, n) {
  const coef = new Map();
  for (let j = 0; j <= m; j++) {
    for (let i = 0; i <= n; i++) {
      const e = m - 2 * j + n - 2 * i;
      coef.set(e, (coef.get(e) ?? 0) + choose(m, j) * (-1) ** j * choose(n, i));
    }
  }
  const scale = (-1) ** (m / 2);
  const den = 2 ** (m + n);
  const out = [[frac(scale * coef.get(0), den), 0]];
  for (let e = 2; e <= m + n; e += 2) {
    const c = coef.get(e) ?? 0;
    if (c !== 0) out.push([frac(2 * scale * c, den), e]);
  }
  return out;
}

const TRIANGLES = {
  sin: (a, rad) => ({ sides: [rad, 'x', String(a)], alt: `Right triangle with angle θ. The side opposite θ is x, the hypotenuse is ${a} and the adjacent side is ${rad}.` }),
  tan: (a, rad) => ({ sides: [String(a), 'x', rad], alt: `Right triangle with angle θ. The side opposite θ is x, the adjacent side is ${a} and the hypotenuse is ${rad}.` }),
  sec: (a, rad) => ({ sides: [String(a), rad, 'x'], alt: `Right triangle with angle θ. The hypotenuse is x, the adjacent side is ${a} and the opposite side is ${rad}.` }),
};
function triangleVisual(kind, a) {
  const A = a * a;
  const rad = { sin: `√(${A} − x²)`, tan: `√(x² + ${A})`, sec: `√(x² − ${A})` }[kind];
  const t = TRIANGLES[kind](a, rad);
  return { type: 'polygon', points: [[0, 0], [4, 0], [4, 3]], sides: t.sides, angles: ['θ', '', ''], right: [1], alt: t.alt };
}

export default {
  id: 'trig-integrals-substitution',
  title: 'Trigonometric Integrals & Trig Substitution',
  summary: 'Integrate powers of sine, cosine, secant and tangent, and remove square roots with trig substitutions.',
  standards: ['OpenStax Calculus Vol. 2 §3.2', 'OpenStax Calculus Vol. 2 §3.3'],

  explain: {
    intro: R`Powers of trig functions are integrated by rearranging them, with an identity, until a substitution works. The same identities, used in reverse, remove square roots such as \(\sqrt{a^{2} - x^{2}}\): replace \(x\) by a trig function so the expression under the root becomes a perfect square.`,
    rules: [
      {
        title: 'An odd power of sine or cosine: save one factor',
        text: R`If the power of sine is odd, save one \(\sin x\), change the remaining sines to cosines with \(\sin^{2}x = 1 - \cos^{2}x\), and let \(u = \cos x\) (so \(du = -\sin x\,dx\)). If the power of cosine is odd, do the same with the roles reversed and \(u = \sin x\).`,
        example: R`\(\displaystyle\int \sin^{3}x\,dx = \int (1 - \cos^{2}x)\sin x\,dx = -\cos x + \tfrac{1}{3}\cos^{3}x + C\).`,
      },
      {
        title: 'Even powers only: half-angle identities',
        text: R`When both powers are even, lower them with \(\sin^{2}\theta = \dfrac{1 - \cos 2\theta}{2}\) and \(\cos^{2}\theta = \dfrac{1 + \cos 2\theta}{2}\). Repeat if a squared cosine appears again.`,
        example: R`\(\displaystyle\int \cos^{2}x\,dx = \int \frac{1 + \cos 2x}{2}\,dx = \frac{x}{2} + \frac{\sin 2x}{4} + C\).`,
      },
      {
        title: 'Secant and tangent',
        text: R`Use \(\sec^{2}x = 1 + \tan^{2}x\). If the power of secant is even, save \(\sec^{2}x\) and let \(u = \tan x\). If the power of tangent is odd (and there is a secant), save \(\sec x\tan x\) and let \(u = \sec x\).`,
        example: R`\(\displaystyle\int \tan^{2}x\sec^{4}x\,dx = \int u^{2}(1 + u^{2})\,du = \tfrac{1}{3}\tan^{3}x + \tfrac{1}{5}\tan^{5}x + C\).`,
      },
      {
        title: 'Three trig substitutions',
        text: R`For \(\sqrt{a^{2} - x^{2}}\) let \(x = a\sin\theta\); the root becomes \(a\cos\theta\). For \(\sqrt{x^{2} + a^{2}}\) let \(x = a\tan\theta\); the root becomes \(a\sec\theta\). For \(\sqrt{x^{2} - a^{2}}\) let \(x = a\sec\theta\); the root becomes \(a\tan\theta\). Replace \(dx\) as well.`,
        example: R`\(\displaystyle\int \frac{dx}{\sqrt{9 - x^{2}}}\): let \(x = 3\sin\theta\), \(dx = 3\cos\theta\,d\theta\). The integral is \(\displaystyle\int \frac{3\cos\theta}{3\cos\theta}\,d\theta = \theta + C = \arcsin\frac{x}{3} + C\).`,
      },
      {
        title: 'Convert back with a reference triangle',
        text: R`The answer must be in terms of \(x\). Draw a right triangle that shows the substitution (for \(x = a\tan\theta\): opposite \(x\), adjacent \(a\)), find the third side with the Pythagorean theorem, and read off whichever trig functions of \(\theta\) you need.`,
        example: R`If \(x = 2\tan\theta\), the hypotenuse is \(\sqrt{x^{2} + 4}\), so \(\sin\theta = \dfrac{x}{\sqrt{x^{2} + 4}}\).`,
      },
      {
        title: 'Definite integrals: change the limits',
        text: R`With a substitution in a definite integral, convert the limits to values of the new variable. Then there is no need to convert back.`,
        example: R`\(\displaystyle\int_{0}^{2}\sqrt{4 - x^{2}}\,dx\) with \(x = 2\sin\theta\): \(\theta\) runs from 0 to \(\frac{\pi}{2}\), giving \(\displaystyle\int_{0}^{\pi/2} 4\cos^{2}\theta\,d\theta = \pi\).`,
      },
    ],
    vocab: [
      { term: 'Pythagorean identities', def: R`\(\sin^{2}x + \cos^{2}x = 1\) and \(\tan^{2}x + 1 = \sec^{2}x\).` },
      { term: 'half-angle (power-reducing) identities', def: R`\(\sin^{2}\theta = \frac{1 - \cos 2\theta}{2}\) and \(\cos^{2}\theta = \frac{1 + \cos 2\theta}{2}\). They trade a square for a first power of a cosine.` },
      { term: 'trigonometric substitution', def: R`Replacing \(x\) by \(a\sin\theta\), \(a\tan\theta\) or \(a\sec\theta\) so that a square root simplifies.` },
      { term: 'reference triangle', def: 'A right triangle labelled from the substitution, used to rewrite the answer in terms of x.' },
    ],
    mistakes: [
      R`Forgetting to replace \(dx\). With \(x = a\sin\theta\), \(dx = a\cos\theta\,d\theta\).`,
      R`Losing the minus sign when \(u = \cos x\): \(du = -\sin x\,dx\).`,
      R`Using the power rule directly: \(\int \sin^{2}x\,dx\) is not \(\frac{1}{3}\sin^{3}x\).`,
      R`Leaving the answer in terms of \(\theta\). Convert back to \(x\), or change the limits of a definite integral.`,
    ],
    visual: {
      type: 'table',
      caption: 'The three trig substitutions',
      headers: ['The integrand contains', 'Substitute', R`Replace \(dx\) by`, 'The root becomes'],
      rows: [
        [R`\(\sqrt{a^{2} - x^{2}}\)`, R`\(x = a\sin\theta\)`, R`\(a\cos\theta\,d\theta\)`, R`\(a\cos\theta\)`],
        [R`\(\sqrt{x^{2} + a^{2}}\)`, R`\(x = a\tan\theta\)`, R`\(a\sec^{2}\theta\,d\theta\)`, R`\(a\sec\theta\)`],
        [R`\(\sqrt{x^{2} - a^{2}}\)`, R`\(x = a\sec\theta\)`, R`\(a\sec\theta\tan\theta\,d\theta\)`, R`\(a\tan\theta\)`],
      ],
      alt: 'Table of trig substitutions. For the square root of a squared minus x squared, substitute x = a sine theta. For the square root of x squared plus a squared, substitute x = a tangent theta. For the square root of x squared minus a squared, substitute x = a secant theta.',
    },
  },

  examples: [
    {
      title: 'An odd power: save one factor',
      problem: R`Find \(\displaystyle\int \sin^{3}x\cos^{2}x\,dx\).`,
      steps: [
        R`The power of sine is odd. Save one \(\sin x\): \(\sin^{2}x\cos^{2}x\cdot\sin x\).`,
        R`Replace \(\sin^{2}x\) by \(1 - \cos^{2}x\) and let \(u = \cos x\), \(du = -\sin x\,dx\).`,
        R`The integral becomes \(-\displaystyle\int (1 - u^{2})u^{2}\,du = -\int (u^{2} - u^{4})\,du = -\frac{u^{3}}{3} + \frac{u^{5}}{5}\).`,
      ],
      answer: R`\(-\frac{1}{3}\cos^{3}x + \frac{1}{5}\cos^{5}x + C\)`,
    },
    {
      title: 'Even powers: a half-angle identity',
      problem: R`Find \(\displaystyle\int \cos^{2}3x\,dx\).`,
      steps: [
        R`The power is even, so use \(\cos^{2}\theta = \dfrac{1 + \cos 2\theta}{2}\) with \(\theta = 3x\).`,
        R`\(\displaystyle\int \cos^{2}3x\,dx = \frac{1}{2}\int (1 + \cos 6x)\,dx\).`,
        R`\(\int \cos 6x\,dx = \frac{1}{6}\sin 6x\), so the result is \(\frac{1}{2}\left(x + \frac{1}{6}\sin 6x\right)\).`,
      ],
      answer: R`\(\frac{1}{2}x + \frac{1}{12}\sin 6x + C\)`,
    },
    {
      title: 'Secant and tangent',
      problem: R`Find \(\displaystyle\int \tan^{3}x\sec x\,dx\).`,
      steps: [
        R`The power of tangent is odd. Save \(\sec x\tan x\): the integrand is \(\tan^{2}x\cdot\sec x\tan x\).`,
        R`Replace \(\tan^{2}x\) by \(\sec^{2}x - 1\) and let \(u = \sec x\), \(du = \sec x\tan x\,dx\).`,
        R`The integral becomes \(\displaystyle\int (u^{2} - 1)\,du = \frac{u^{3}}{3} - u\).`,
      ],
      answer: R`\(\frac{1}{3}\sec^{3}x - \sec x + C\)`,
    },
    {
      title: 'Trig substitution with a reference triangle',
      problem: R`Find \(\displaystyle\int \frac{dx}{x^{2}\sqrt{x^{2} + 4}}\).`,
      steps: [
        R`The root has the form \(\sqrt{x^{2} + a^{2}}\) with \(a = 2\). Let \(x = 2\tan\theta\), so \(dx = 2\sec^{2}\theta\,d\theta\) and \(\sqrt{x^{2} + 4} = 2\sec\theta\).`,
        R`The integral becomes \(\displaystyle\int \frac{2\sec^{2}\theta}{4\tan^{2}\theta\cdot 2\sec\theta}\,d\theta = \frac{1}{4}\int \frac{\cos\theta}{\sin^{2}\theta}\,d\theta = -\frac{1}{4\sin\theta}\).`,
        R`Triangle for \(\tan\theta = \frac{x}{2}\): opposite \(x\), adjacent 2, hypotenuse \(\sqrt{x^{2} + 4}\). So \(\sin\theta = \dfrac{x}{\sqrt{x^{2} + 4}}\).`,
      ],
      answer: R`\(-\dfrac{\sqrt{x^{2} + 4}}{4x} + C\)`,
      visual: triangleVisual('tan', 2),
    },
    {
      title: 'Word problem: the area of an elliptical flower bed',
      word: true,
      problem: R`A flower bed is an ellipse 10 m long and 6 m wide, so its edge is \(\dfrac{x^{2}}{25} + \dfrac{y^{2}}{9} = 1\). Find its area.`,
      steps: [
        R`The top half is \(y = \frac{3}{5}\sqrt{25 - x^{2}}\). By symmetry the area is 4 times the area in the first quadrant: \(A = 4\displaystyle\int_{0}^{5} \tfrac{3}{5}\sqrt{25 - x^{2}}\,dx\).`,
        R`Let \(x = 5\sin\theta\), \(dx = 5\cos\theta\,d\theta\). The root becomes \(5\cos\theta\), and \(\theta\) runs from 0 to \(\frac{\pi}{2}\).`,
        R`\(A = 4\cdot\tfrac{3}{5}\displaystyle\int_{0}^{\pi/2} 25\cos^{2}\theta\,d\theta = 60\int_{0}^{\pi/2}\frac{1 + \cos 2\theta}{2}\,d\theta = 60\cdot\frac{\pi}{4}\).`,
      ],
      answer: R`\(15\pi \approx 47.1\) square meters`,
      visual: {
        type: 'plot',
        x: [-6, 6],
        y: [-6, 6],
        square: true,
        param: [{ x: (t) => 5 * Math.cos(t), y: (t) => 3 * Math.sin(t), t: [0, 2 * Math.PI] }],
        shade: [{ f: (x) => 0.6 * Math.sqrt(Math.max(0, 25 - x * x)), from: 0, to: 5 }],
        alt: 'An ellipse centred at the origin, reaching 5 units left and right and 3 units up and down. The quarter of the ellipse in the first quadrant is shaded; the whole area is 4 times that quarter.',
      },
    },
  ],

  models: [
    {
      id: 'sine-cosine-powers',
      title: 'Integrate sinᵐx · cosⁿx',
      intro: 'Choose the two powers. The model picks the strategy (odd power or half-angle) and carries it out.',
      inputs: [
        { name: 'm', label: 'Power of sine (m)', type: 'int', min: 0, max: 6, value: 3 },
        { name: 'n', label: 'Power of cosine (n)', type: 'int', min: 0, max: 6, value: 2 },
      ],
      compute({ m, n }) {
        if (m === 0 && n === 0) return { error: 'Both powers are 0, so the integrand is just 1. Choose at least one positive power.' };
        const integrand = `${tp('\\sin', m)}${tp('\\cos', n)}`;
        const f = (x) => Math.sin(x) ** m * Math.cos(x) ** n;
        const visual = {
          type: 'plot',
          x: [0, 2 * Math.PI],
          y: [-1.15, 1.15],
          piTicks: true,
          fns: [{ f }],
          alt: `Graph of sine to the power ${m} times cosine to the power ${n} on the interval from 0 to 2π.`,
        };
        const problem = R`\(\displaystyle\int ${integrand}\,dx\)`;
        if (m % 2 === 1 || n % 2 === 1) {
          const sinOdd = m % 2 === 1;
          const odd = sinOdd ? m : n;
          const other = sinOdd ? n : m;
          const k = (odd - 1) / 2;
          const [save, T, U] = sinOdd ? ['\\sin', '\\cos', 'u = \\cos x,\\; du = -\\sin x\\,dx'] : ['\\cos', '\\sin', 'u = \\sin x,\\; du = \\cos x\\,dx'];
          const G = oddPowerPoly(k, other);
          const sgn = sinOdd ? -1 : 1;
          const bracket = k === 0 ? '' : k === 1 ? '(1 - u^{2})' : `(1 - u^{2})^{${k}}`;
          const answer = terms(G.map(([c, e]) => [sgn < 0 ? c.neg() : c, tp(T, e)]));
          return {
            problem,
            steps: [
              R`The power of ${sinOdd ? 'sine' : 'cosine'} is odd (\(${odd}\)), so save one \(${save} x\) for \(du\).`,
              k === 0
                ? R`No other factor of \(${save} x\) is left, so no identity is needed.`
                : R`Rewrite the remaining even power: \(${tp(save, odd - 1)} = ${k === 1 ? `1 - ${T}^{2}x` : `(1 - ${T}^{2}x)^{${k}}`}\).`,
              R`Substitute \(${U}\). The integral becomes \(${terms([[sgn, `\\displaystyle\\int ${bracket}${power('u', other)}\\,du`]])}\).`,
              R`Expand and integrate: \(${G.length === 1 ? terms([[sgn, polyTex(G)]]) : scaled(sgn, polyTex(G))}\).`,
              R`Substitute back \(u = ${T} x\).`,
            ],
            answer: R`\(${answer} + C\)`,
            visual,
          };
        }
        const exp = evenPowerExpansion(m, n);
        const expanded = terms(exp.map(([c, e]) => [c, e === 0 ? '' : `\\cos ${e}x`]));
        const answer = terms(exp.map(([c, e]) => (e === 0 ? [c, 'x'] : [c.div(e), `\\sin ${e}x`])));
        return {
          problem,
          steps: [
            R`Both powers are even, so no factor can be saved. Use \(\sin^{2}x = \dfrac{1 - \cos 2x}{2}\) and \(\cos^{2}x = \dfrac{1 + \cos 2x}{2}\).`,
            R`Apply the identities (again whenever a squared cosine appears) until only first powers of cosines remain: \(${integrand} = ${expanded}\).`,
            R`Integrate term by term, using \(\displaystyle\int \cos kx\,dx = \frac{1}{k}\sin kx\).`,
          ],
          answer: R`\(${answer} + C\)`,
          visual,
        };
      },
    },
    {
      id: 'trig-substitution',
      title: 'Trig substitution and its triangle',
      intro: 'Choose the kind of expression and the constant a. See the substitution, the reference triangle and a worked integral.',
      inputs: [
        {
          name: 'kind', label: 'The integral contains', type: 'select', value: 'tan',
          options: [{ value: 'sin', label: 'a² − x²' }, { value: 'tan', label: 'x² + a²' }, { value: 'sec', label: 'x² − a²' }],
        },
        { name: 'a', label: 'a', type: 'int', min: 1, max: 9, value: 3 },
      ],
      compute({ kind, a }) {
        const A = a * a;
        const S = SUBS[kind];
        const rad = S.rad(A);
        const c = (sym) => terms([[a, sym]]);
        const dx = { sin: c('\\cos\\theta'), tan: c('\\sec^{2}\\theta'), sec: c('\\sec\\theta\\tan\\theta') }[kind];
        const cube = terms([[a * A, { sin: '\\cos^{3}\\theta', tan: '\\sec^{3}\\theta', sec: '\\tan^{3}\\theta' }[kind]]]);
        const lead = A === 1 ? '' : R`\dfrac{1}{${A}}`;
        const work = {
          sin: { simp: R`${lead}\displaystyle\int \sec^{2}\theta\,d\theta = ${lead}\tan\theta`, ratio: R`\tan\theta = \dfrac{x}{${rad}}`, answer: R`\dfrac{x}{${A === 1 ? '' : A}${rad}}` },
          tan: { simp: R`${lead}\displaystyle\int \cos\theta\,d\theta = ${lead}\sin\theta`, ratio: R`\sin\theta = \dfrac{x}{${rad}}`, answer: R`\dfrac{x}{${A === 1 ? '' : A}${rad}}` },
          sec: { simp: R`${lead}\displaystyle\int \dfrac{\cos\theta}{\sin^{2}\theta}\,d\theta = -${lead}\csc\theta`, ratio: R`\csc\theta = \dfrac{x}{${rad}}`, answer: R`-\dfrac{x}{${A === 1 ? '' : A}${rad}}` },
        }[kind];
        const sides = {
          sin: R`opposite \(x\), hypotenuse \(${a}\), adjacent \(${rad}\)`,
          tan: R`opposite \(x\), adjacent \(${a}\), hypotenuse \(${rad}\)`,
          sec: R`hypotenuse \(x\), adjacent \(${a}\), opposite \(${rad}\)`,
        }[kind];
        return {
          problem: R`\(\displaystyle\int \frac{dx}{(${S.inside(A)})^{3/2}}\)`,
          steps: [
            R`The expression \(${S.inside(A)}\) matches \(${{ sin: 'a^{2} - x^{2}', tan: 'x^{2} + a^{2}', sec: 'x^{2} - a^{2}' }[kind]}\) with \(a = ${a}\). Substitute \(x = ${c(`${S.fn}\\theta`)}\).`,
            R`Then \(dx = ${dx}\,d\theta\) and \(${rad} = ${c(`${S.becomes}\\theta`)}\), so \((${S.inside(A)})^{3/2} = ${cube}\).`,
            R`The integral becomes \(\displaystyle\int \frac{${dx}}{${cube}}\,d\theta = ${work.simp}\).`,
            R`Reference triangle for \(${S.fn}\theta = ${a === 1 ? 'x' : R`\frac{x}{${a}}`}\): ${sides}. So \(${work.ratio}\).`,
          ],
          answer: R`\(${work.answer} + C\)`,
          visual: triangleVisual(kind, a),
        };
      },
    },
    {
      id: 'ellipse-area',
      title: 'Word problem: the area of an elliptical garden',
      word: true,
      intro: 'Choose the two semi-axes of an elliptical garden bed. The area comes from a trig substitution.',
      inputs: [
        { name: 'a', label: 'Half the width east–west, a (m)', type: 'int', min: 2, max: 15, value: 5 },
        { name: 'b', label: 'Half the width north–south, b (m)', type: 'int', min: 2, max: 15, value: 3 },
      ],
      compute(input) {
        const a = frac(input.a);
        const b = frac(input.b);
        const L = 2 * input.a;
        const W = 2 * input.b;
        const a2 = a.mul(a);
        const ratio = b.div(a);
        const ab = a.mul(b);
        const lim = Math.max(L, W) * 0.6;
        const area = Math.PI * ab.value;
        return {
          problem: R`An elliptical garden bed measures ${L} m from east to west and ${W} m from north to south. Its edge is \(\dfrac{x^{2}}{${a2.tex()}} + \dfrac{y^{2}}{${b.mul(b).tex()}} = 1\). What is its area?`,
          steps: [
            R`The semi-axes are \(a = ${a.tex()}\) and \(b = ${b.tex()}\). The top half of the ellipse is \(y = ${terms([[ratio, `\\sqrt{${a2.tex()} - x^{2}}`]])}\).`,
            R`By symmetry, the area is 4 times the first-quadrant area: \(A = 4\displaystyle\int_{0}^{${a.tex()}} ${terms([[ratio, `\\sqrt{${a2.tex()} - x^{2}}`]])}\,dx\).`,
            R`Substitute \(x = ${terms([[a, '\\sin\\theta']])}\), \(dx = ${terms([[a, '\\cos\\theta']])}\,d\theta\). The root becomes \(${terms([[a, '\\cos\\theta']])}\) and \(\theta\) runs from 0 to \(\frac{\pi}{2}\).`,
            R`\(A = ${terms([[ab.mul(4), `\\displaystyle\\int_{0}^{\\pi/2}\\cos^{2}\\theta\\,d\\theta`]])}\), and the half-angle identity gives \(\displaystyle\int_{0}^{\pi/2}\cos^{2}\theta\,d\theta = \frac{\pi}{4}\).`,
            R`\(A = ${fterms([[ab, '\\pi']])}\). In general the area of an ellipse is \(\pi ab\).`,
          ],
          answer: R`\(${fterms([[ab, '\\pi']])} \approx ${num(area, { places: 1 })}\) square meters`,
          visual: {
            type: 'plot',
            x: [-lim, lim],
            y: [-lim, lim],
            square: true,
            param: [{ x: (t) => a.value * Math.cos(t), y: (t) => b.value * Math.sin(t), t: [0, 2 * Math.PI] }],
            shade: [{ f: (x) => ratio.value * Math.sqrt(Math.max(0, a2.value - x * x)), from: 0, to: a.value }],
            alt: `An ellipse centred at the origin with semi-axes ${num(a.value)} and ${num(b.value)}. The first-quadrant quarter is shaded. The whole area is about ${num(area, { places: 1 })} square meters.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyStrategy, easyWhichSub, easyRadicalBecomes, easyPowerTimesDerivative],
    medium: [mediumOddPower, mediumHalfAngle, mediumSecTan, mediumTrigSubSetup, mediumWordPower],
    hard: [hardTrigSub, hardEvenPowers, hardDefiniteOdd, hardWordQuarterDisc],
    challenge: [challengeTrigSubDefinite, challengeCompleteSquare, challengeFindPower, challengeEquivalentForms],
  },
};
