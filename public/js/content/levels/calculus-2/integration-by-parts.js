import { R, q, frac, terms, linear, power, num, paren, gcd, checkAntideriv, checkIntegral, checkAll } from '../../lib/index.js';
import { M, K, exactChoices, combo, antiChoices, fterms, ekx, kx } from './_shared.js';

const sinT = (k) => `\\sin ${kx(k)}`;
const cosT = (k) => `\\cos ${kx(k)}`;
const eTo = (c) => (c === 1 ? 'e' : `e^{${c}}`);
// a·dx with tidy coefficients: dxOf(1) → "dx", dxOf(-1) → "-dx", dxOf(6) → "6\,dx".
const dxOf = (a, x = 'x') => (a === 1 ? `d${x}` : a === -1 ? `-d${x}` : `${a}\\,d${x}`);
// Parentheses around an expression that starts with a minus sign.
const par = (tex) => (String(tex).startsWith('-') ? `\\left(${tex}\\right)` : tex);
const ONLY_UV = R`That is only the \(uv\) part. The integral \(\int v\,du\) still has to be subtracted.`;

// ───────────── Easy ─────────────

function easyChooseU(rng) {
  const kind = rng.pick(['exp', 'exp', 'sin', 'cos', 'ln', 'ln', 'alone']);
  const n = rng.int(1, 4);
  const xn = power('x', n);
  const pair = (u, dv) => R`\(u = ${u},\quad dv = ${dv ? `${dv}\\,` : ''}dx\)`;
  const liate = R`LIATE ranks the factors: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential. Take \(u\) from the type that comes first.`;
  if (kind === 'alone') {
    const f = rng.pick(['\\ln x', '\\arctan x', '\\arcsin x']);
    return q({
      prompt: R`You want to find \(\displaystyle\int ${f}\,dx\) using integration by parts. Which choice of \(u\) and \(dv\) is the best start?`,
      correct: pair(f, ''),
      wrong: [
        { value: pair('1', f), why: R`With \(dv = ${f}\,dx\), finding \(v\) is the original problem all over again.` },
        { value: pair('x', `\\dfrac{${f}}{x}`), why: R`This makes \(dv\) harder to integrate than the function you started with.` },
        pair(R`\dfrac{1}{x}`, `x\\,${f}`),
      ],
      solution: [
        R`There is only one factor, and you know its derivative but not its antiderivative. So it must be \(u\).`,
        R`Take \(u = ${f}\) and \(dv = dx\). Then \(v = x\), and \(du\) is an algebraic expression that is easier to integrate.`,
      ],
      rule: 2,
      skill: 'choosing u and dv',
    });
  }
  if (kind === 'ln') {
    const a = rng.int(1, 6);
    const lead = terms([[a, xn]]);
    return q({
      prompt: R`You want to find \(\displaystyle\int ${lead}\ln x\,dx\) using integration by parts. Which choice of \(u\) and \(dv\) is the best start?`,
      correct: pair('\\ln x', lead),
      wrong: [
        { value: pair(lead, '\\ln x'), why: R`Then you would need \(\int \ln x\,dx\) just to find \(v\). A logarithm is easier to differentiate than to integrate.` },
        { value: pair(`${lead}\\ln x`, ''), why: R`Then \(du\) needs the product rule and \(v = x\), so the new integral is harder than the old one.` },
        pair('1', `${lead}\\ln x`),
      ],
      solution: [
        liate,
        R`\(\ln x\) is a logarithm and \(${lead}\) is algebraic, so \(u = \ln x\) and \(dv = ${lead}\,dx\).`,
        R`Then \(du = \frac{1}{x}\,dx\) and \(v = ${terms([[frac(a, n + 1), power('x', n + 1)]])}\): the logarithm disappears from the new integral.`,
      ],
      rule: 1,
      skill: 'choosing u and dv',
    });
  }
  const k = kind === 'exp' ? rng.intExcept(-3, 5, [0]) : rng.int(1, 5);
  const P = kind === 'exp' ? ekx(k) : kind === 'sin' ? sinT(k) : cosT(k);
  const typeName = kind === 'exp' ? 'exponential' : 'trigonometric';
  return q({
    prompt: R`You want to find \(\displaystyle\int ${xn}\,${P}\,dx\) using integration by parts. Which choice of \(u\) and \(dv\) is the best start?`,
    correct: pair(xn, P),
    wrong: [
      { value: pair(P, xn), why: R`Then \(v = ${terms([[frac(1, n + 1), power('x', n + 1)]])}\), and the new integral has a higher power of \(x\) than before.` },
      { value: pair(`${xn}\\,${P}`, ''), why: R`Then \(du\) needs the product rule and \(v = x\), so the new integral is harder than the old one.` },
      { value: pair('1', `${xn}\\,${P}`), why: R`Finding \(v\) would need the very integral you are trying to compute.` },
    ],
    solution: [
      liate,
      R`\(${xn}\) is algebraic and \(${P}\) is ${typeName}, so \(u = ${xn}\) and \(dv = ${P}\,dx\).`,
      R`This works because \(du = ${terms([[n, power('x', n - 1)]])}\,dx\) is simpler than \(u\), and \(v\) is easy to find.`,
    ],
    rule: 1,
    skill: 'choosing u and dv',
  });
}

function easyFindV(rng) {
  const kind = rng.pick(['exp', 'exp', 'sin', 'cos']);
  const k = kind === 'exp' ? rng.intExcept(-9, 9, [-1, 0, 1]) : rng.int(2, 9);
  const inv = frac(1, k);
  const V = (tex) => M(`v = ${tex}`);
  let dv;
  let right;
  let wrong;
  let F;
  let f;
  if (kind === 'exp') {
    const E = ekx(k);
    dv = E;
    right = terms([[inv, E]]);
    F = (x) => Math.exp(k * x) / k;
    f = (x) => Math.exp(k * x);
    wrong = [
      { value: V(terms([[k, E]])), why: R`That is the derivative of \(${E}\). Integrating divides by \(${k}\) instead.` },
      { value: V(E), why: R`Check by differentiating: \(\frac{d}{dx}\,${E} = ${terms([[k, E]])}\), so a factor of \(${inv.tex()}\) is needed.` },
      V(terms([[inv.neg(), E]])),
      V(terms([[-k, E]])),
    ];
  } else if (kind === 'sin') {
    dv = sinT(k);
    right = terms([[inv.neg(), cosT(k)]]);
    F = (x) => -Math.cos(k * x) / k;
    f = (x) => Math.sin(k * x);
    wrong = [
      { value: V(terms([[inv, cosT(k)]])), why: 'An antiderivative of sine is negative cosine.' },
      { value: V(terms([[-k, cosT(k)]])), why: R`Integrating divides by \(${k}\). Multiplying by \(${k}\) is what differentiation does.` },
      V(terms([[-1, cosT(k)]])),
      V(terms([[k, cosT(k)]])),
    ];
  } else {
    dv = cosT(k);
    right = terms([[inv, sinT(k)]]);
    F = (x) => Math.sin(k * x) / k;
    f = (x) => Math.cos(k * x);
    wrong = [
      { value: V(terms([[k, sinT(k)]])), why: R`Integrating divides by \(${k}\). Multiplying by \(${k}\) is what differentiation does.` },
      { value: V(terms([[inv.neg(), sinT(k)]])), why: 'An antiderivative of cosine is positive sine. The minus sign belongs to the derivative of cosine.' },
      V(sinT(k)),
      V(terms([[-k, sinT(k)]])),
    ];
  }
  return q({
    prompt: R`To find \(\displaystyle\int x\,${dv}\,dx\) by parts, take \(u = x\) and \(dv = ${dv}\,dx\). What is \(v\)?`,
    correct: V(right),
    wrong,
    solution: [
      R`\(v\) is an antiderivative of \(dv\): \(v = \displaystyle\int ${dv}\,dx\).`,
      R`Because of the inner \(${kx(k)}\), divide by \(${k}\): \(v = ${right}\).`,
      R`Check: \(\dfrac{d}{dx}\left[${right}\right] = ${dv}\). No \(+C\) is needed for \(v\).`,
    ],
    rule: 0,
    skill: 'finding v and du',
    check: () => checkAntideriv(F, f),
  });
}

function easyBasicProduct(rng) {
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  const kind = rng.pick(['exp', 'sin', 'cos']);
  const set = {
    exp: {
      g: 'e^{x}',
      basis: [{ tex: 'xe^{x}', f: (x) => x * Math.exp(x) }, { tex: 'e^{x}', f: Math.exp }],
      coefs: [a, -a],
      half: { tex: terms([[frac(a, 2), 'x^{2}e^{x}']]), F: (x) => (a / 2) * x * x * Math.exp(x) },
      line: R`\(\displaystyle\int xe^{x}\,dx = xe^{x} - \int e^{x}\,dx = xe^{x} - e^{x}\).`,
      parts: R`\(dv = e^{x}\,dx\), so \(du = dx\) and \(v = e^{x}\)`,
      f: (x) => a * x * Math.exp(x),
    },
    sin: {
      g: '\\sin x',
      basis: [{ tex: 'x\\cos x', f: (x) => x * Math.cos(x) }, { tex: '\\sin x', f: Math.sin }],
      coefs: [-a, a],
      half: { tex: terms([[frac(-a, 2), 'x^{2}\\cos x']]), F: (x) => (-a / 2) * x * x * Math.cos(x) },
      line: R`\(\displaystyle\int x\sin x\,dx = -x\cos x + \int \cos x\,dx = -x\cos x + \sin x\).`,
      parts: R`\(dv = \sin x\,dx\), so \(du = dx\) and \(v = -\cos x\)`,
      f: (x) => a * x * Math.sin(x),
    },
    cos: {
      g: '\\cos x',
      basis: [{ tex: 'x\\sin x', f: (x) => x * Math.sin(x) }, { tex: '\\cos x', f: Math.cos }],
      coefs: [a, a],
      half: { tex: terms([[frac(a, 2), 'x^{2}\\sin x']]), F: (x) => (a / 2) * x * x * Math.sin(x) },
      line: R`\(\displaystyle\int x\cos x\,dx = x\sin x - \int \sin x\,dx = x\sin x + \cos x\).`,
      parts: R`\(dv = \cos x\,dx\), so \(du = dx\) and \(v = \sin x\)`,
      f: (x) => a * x * Math.cos(x),
    },
  }[kind];
  const right = combo(set.basis, set.coefs);
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, `x${set.g}`]])}\,dx\).`,
    ...antiChoices(right, [
      { ...combo(set.basis, [set.coefs[0], -set.coefs[1]]), why: R`Check the sign of the second term: the formula is \(uv - \int v\,du\), and \(v\) may carry a sign of its own.` },
      { ...set.half, why: 'A product cannot be integrated one factor at a time. Use integration by parts.' },
      { ...combo(set.basis, [set.coefs[0], 0]), why: ONLY_UV },
      combo(set.basis, [-set.coefs[0], set.coefs[1]]),
    ]),
    solution: [
      R`Keep the constant \(${a}\) in front. Let \(u = x\) and ${set.parts}.`,
      set.line,
      R`Multiply by \(${a}\): \(${right.tex} + C\).`,
    ],
    rule: 0,
    skill: 'one round of parts',
    check: () => checkAntideriv(right.F, set.f),
  });
}

// ───────────── Medium ─────────────

function mediumLinearExp(rng) {
  const k = rng.pick([2, 3, 4, 5, -2, -3, -4]);
  const a = rng.nonzero(-6, 6);
  const E = ekx(k);
  const basis = [{ tex: `x${E}`, f: (x) => x * Math.exp(k * x) }, { tex: E, f: (x) => Math.exp(k * x) }];
  const right = combo(basis, [frac(a, k), frac(-a, k * k)]);
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, `x${E}`]])}\,dx\).`,
    ...antiChoices(right, [
      { ...combo(basis, [frac(a, k), frac(a, k * k)]), why: R`The formula is \(uv - \int v\,du\): the second part is subtracted.` },
      { ...combo(basis, [frac(a, k), frac(-a, k)]), why: R`Integrating \(${E}\) the second time divides by \(${k}\) again, which gives \(${frac(1, k * k).tex()}\).` },
      { ...combo(basis, [a * k, -a * k * k]), why: R`Multiplying by \(${k}\) is what differentiation does. Integrating \(${E}\) divides by \(${k}\).` },
      { tex: terms([[frac(a, 2 * k), `x^{2}${E}`]]), F: (x) => (a / (2 * k)) * x * x * Math.exp(k * x) },
    ]),
    solution: [
      R`Let \(u = ${terms([[a, 'x']])}\) and \(dv = ${E}\,dx\). Then \(du = ${dxOf(a)}\) and \(v = ${terms([[frac(1, k), E]])}\).`,
      R`\(uv = ${terms([[frac(a, k), `x${E}`]])}\).`,
      R`\(\displaystyle\int v\,du = \int ${terms([[frac(a, k), E]])}\,dx = ${terms([[frac(a, k * k), E]])}\).`,
      R`Subtract: \(uv - \displaystyle\int v\,du = ${right.tex} + C\).`,
    ],
    rule: 0,
    skill: 'one round of parts',
    check: () => checkAntideriv(right.F, (x) => a * x * Math.exp(k * x)),
  });
}

function mediumLinearTrig(rng) {
  const k = rng.int(2, 5);
  const a = rng.nonzero(-6, 6);
  const isSin = rng.bool();
  const S = sinT(k);
  const Co = cosT(k);
  const basis = isSin
    ? [{ tex: `x${Co}`, f: (x) => x * Math.cos(k * x) }, { tex: S, f: (x) => Math.sin(k * x) }]
    : [{ tex: `x${S}`, f: (x) => x * Math.sin(k * x) }, { tex: Co, f: (x) => Math.cos(k * x) }];
  const c = isSin ? [frac(-a, k), frac(a, k * k)] : [frac(a, k), frac(a, k * k)];
  const right = combo(basis, c);
  const wrongs = isSin
    ? [
        { ...combo(basis, [c[0], c[1].neg()]), why: R`Here \(v = ${terms([[frac(-1, k), Co]])}\) is negative, so \(-\int v\,du\) turns into a plus.` },
        { ...combo(basis, [c[0].neg(), c[1].neg()]), why: R`An antiderivative of \(${S}\) is \(${terms([[frac(-1, k), Co]])}\). Note the minus sign.` },
        { ...combo(basis, [c[0], frac(a, k)]), why: R`Integrating \(${Co}\) divides by \(${k}\) once more.` },
        combo(basis, [-a * k, a * k * k]),
      ]
    : [
        { ...combo(basis, [c[0], c[1].neg()]), why: R`\(\int ${S}\,dx = ${terms([[frac(-1, k), Co]])}\), and subtracting a negative gives a plus.` },
        { ...combo(basis, [c[0], frac(a, k)]), why: R`Integrating \(${S}\) divides by \(${k}\) once more.` },
        combo(basis, [c[0].neg(), c[1]]),
        combo(basis, [a * k, a * k * k]),
      ];
  const vTex = isSin ? terms([[frac(-1, k), Co]]) : terms([[frac(1, k), S]]);
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, `x${isSin ? S : Co}`]])}\,dx\).`,
    ...antiChoices(right, wrongs),
    solution: [
      R`Let \(u = ${terms([[a, 'x']])}\) and \(dv = ${isSin ? S : Co}\,dx\). Then \(du = ${dxOf(a)}\) and \(v = ${vTex}\).`,
      R`\(uv = ${terms([[c[0], basis[0].tex]])}\).`,
      R`\(\displaystyle\int v\,du = \int ${terms([[c[0], isSin ? Co : S]])}\,dx = ${terms([[c[1].neg(), basis[1].tex]])}\).`,
      R`Subtract: \(uv - \displaystyle\int v\,du = ${right.tex} + C\).`,
    ],
    rule: 0,
    skill: 'one round of parts',
    check: () => checkAntideriv(right.F, (x) => a * x * (isSin ? Math.sin(k * x) : Math.cos(k * x))),
  });
}

function mediumPowerLn(rng) {
  const n = rng.int(1, 5);
  const a = rng.int(1, 9);
  const up = power('x', n + 1);
  const basis = [{ tex: `${up}\\ln x`, f: (x) => x ** (n + 1) * Math.log(x) }, { tex: up, f: (x) => x ** (n + 1) }];
  const c0 = frac(a, n + 1);
  const c1 = frac(-a, (n + 1) ** 2);
  const right = combo(basis, [c0, c1]);
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, `${power('x', n)}\\ln x`]])}\,dx\).`,
    ...antiChoices(right, [
      { ...combo(basis, [c0, c1.neg()]), why: R`The formula is \(uv - \int v\,du\): the second part is subtracted.` },
      { ...combo(basis, [c0, c0.neg()]), why: R`\(\int v\,du = \int ${terms([[c0, power('x', n)]])}\,dx\), and integrating \(${power('x', n)}\) divides by \(${n + 1}\) again.` },
      {
        tex: terms([[c0, `${up}\\ln x`], [frac(-a, (n + 1) * (n + 2)), power('x', n + 2)]]),
        F: (x) => c0.value * x ** (n + 1) * Math.log(x) - (a / ((n + 1) * (n + 2))) * x ** (n + 2),
        why: R`Remember \(du = \frac{1}{x}\,dx\): the new integrand is \(v\cdot\frac{1}{x}\), not \(v\).`,
      },
      combo(basis, [a, c0.neg()]),
    ]),
    solution: [
      R`A logarithm comes first in LIATE: \(u = \ln x\) and \(dv = ${terms([[a, power('x', n)]])}\,dx\). Then \(du = \frac{1}{x}\,dx\) and \(v = ${terms([[c0, up]])}\).`,
      R`\(uv = ${terms([[c0, `${up}\\ln x`]])}\).`,
      R`\(\displaystyle\int v\,du = \int ${terms([[c0, up]])}\cdot\frac{1}{x}\,dx = \int ${terms([[c0, power('x', n)]])}\,dx = ${terms([[c1.neg(), up]])}\).`,
      R`Subtract: \(${right.tex} + C\).`,
    ],
    rule: 1,
    skill: 'logarithm times a power',
    check: () => checkAntideriv(right.F, (x) => a * x ** n * Math.log(x)),
  });
}

function mediumLogAlone(rng) {
  const a = rng.intExcept(-9, 9, [-1, 0, 1]);
  const kind = rng.pick(['ln', 'arctan', 'arcsin']);
  if (kind === 'ln') {
    const basis = [{ tex: 'x\\ln x', f: (x) => x * Math.log(x) }, { tex: 'x', f: (x) => x }];
    const right = combo(basis, [a, -a]);
    return q({
      prompt: R`Find \(\displaystyle\int ${terms([[a, '\\ln x']])}\,dx\).`,
      ...antiChoices(right, [
        { tex: fterms([[a, '', 'x']]), F: (x) => a / x, why: R`That is the derivative of \(${terms([[a, '\\ln x']])}\). The question asks for an antiderivative.` },
        { tex: terms([[a, 'x\\ln x'], [-a, '']]), F: (x) => a * x * Math.log(x) - a, why: R`\(\int x\cdot\frac{1}{x}\,dx = \int 1\,dx = x\), not 1.` },
        { ...combo(basis, [a, a]), why: R`The formula is \(uv - \int v\,du\): the second part is subtracted.` },
        { tex: terms([[frac(a, 2), '(\\ln x)^{2}']]), F: (x) => (a / 2) * Math.log(x) ** 2 },
      ]),
      solution: [
        R`Keep \(${a}\) in front. With only one factor, take \(u = \ln x\) and \(dv = dx\), so \(du = \frac{1}{x}\,dx\) and \(v = x\).`,
        R`\(\displaystyle\int \ln x\,dx = x\ln x - \int x\cdot\frac{1}{x}\,dx = x\ln x - \int 1\,dx = x\ln x - x\).`,
        R`Multiply by \(${a}\): \(${right.tex} + C\).`,
      ],
      rule: 2,
      skill: 'a single function as u',
      check: () => checkAntideriv(right.F, (x) => a * Math.log(x)),
    });
  }
  if (kind === 'arctan') {
    const basis = [{ tex: 'x\\arctan x', f: (x) => x * Math.atan(x) }, { tex: '\\ln(1 + x^{2})', f: (x) => Math.log(1 + x * x) }];
    const right = combo(basis, [a, frac(-a, 2)]);
    return q({
      prompt: R`Find \(\displaystyle\int ${terms([[a, '\\arctan x']])}\,dx\).`,
      ...antiChoices(right, [
        { ...combo(basis, [a, -a]), why: R`With \(w = 1 + x^{2}\), \(x\,dx = \frac{1}{2}\,dw\). The \(\frac{1}{2}\) stays in the answer.` },
        { tex: fterms([[a, '', '1 + x^{2}']]), F: (x) => a / (1 + x * x), why: R`That is the derivative of \(${terms([[a, '\\arctan x']])}\). The question asks for an antiderivative.` },
        { ...combo(basis, [a, frac(a, 2)]), why: R`The formula is \(uv - \int v\,du\): the second part is subtracted.` },
        combo(basis, [a, 0]),
      ]),
      solution: [
        R`Keep \(${a}\) in front. Take \(u = \arctan x\) and \(dv = dx\), so \(du = \dfrac{1}{1 + x^{2}}\,dx\) and \(v = x\).`,
        R`\(\displaystyle\int \arctan x\,dx = x\arctan x - \int \frac{x}{1 + x^{2}}\,dx\).`,
        R`Substitute \(w = 1 + x^{2}\), \(dw = 2x\,dx\): \(\displaystyle\int \frac{x}{1 + x^{2}}\,dx = \frac{1}{2}\ln(1 + x^{2})\).`,
        R`Multiply by \(${a}\): \(${right.tex} + C\).`,
      ],
      rule: 2,
      skill: 'a single function as u',
      check: () => checkAntideriv(right.F, (x) => a * Math.atan(x)),
    });
  }
  const xs = [0.15, 0.4, 0.62, 0.85];
  const basis = [{ tex: 'x\\arcsin x', f: (x) => x * Math.asin(x) }, { tex: '\\sqrt{1 - x^{2}}', f: (x) => Math.sqrt(1 - x * x) }];
  const right = combo(basis, [a, a]);
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, '\\arcsin x']])}\,dx\).`,
    ...antiChoices(
      right,
      [
        { ...combo(basis, [a, -a]), why: R`\(\int \frac{x}{\sqrt{1 - x^{2}}}\,dx = -\sqrt{1 - x^{2}}\). Subtracting it gives a plus sign.` },
        { tex: fterms([[a, '', '\\sqrt{1 - x^{2}}']]), F: (x) => a / Math.sqrt(1 - x * x), why: R`That is the derivative of \(${terms([[a, '\\arcsin x']])}\). The question asks for an antiderivative.` },
        combo(basis, [a, frac(a, 2)]),
        combo(basis, [a, 0]),
      ],
      xs,
    ),
    solution: [
      R`Keep \(${a}\) in front. Take \(u = \arcsin x\) and \(dv = dx\), so \(du = \dfrac{1}{\sqrt{1 - x^{2}}}\,dx\) and \(v = x\).`,
      R`\(\displaystyle\int \arcsin x\,dx = x\arcsin x - \int \frac{x}{\sqrt{1 - x^{2}}}\,dx\).`,
      R`Substitute \(w = 1 - x^{2}\), \(dw = -2x\,dx\): \(\displaystyle\int \frac{x}{\sqrt{1 - x^{2}}}\,dx = -\sqrt{1 - x^{2}}\).`,
      R`Multiply by \(${a}\): \(${right.tex} + C\).`,
    ],
    rule: 2,
    skill: 'a single function as u',
    check: () => checkAntideriv(right.F, (x) => a * Math.asin(x), xs),
  });
}

function mediumWordDose(rng) {
  const a = rng.int(2, 9);
  const T = rng.int(1, 4);
  const E = `e^{-${T}}`;
  const right = K([[a, ''], [-a * (T + 1), E]]);
  const mg = (tex) => R`\(${tex}\) mg`;
  return q({
    prompt: R`A medicine enters the bloodstream at a rate of \(r(t) = ${a}t\,e^{-t}\) milligrams per hour, where \(t\) is the time in hours. How much medicine enters during the first ${T === 1 ? 'hour' : `${T} hours`}?`,
    ...exactChoices(
      right,
      [
        { k: K([[-a * (T + 1), E]]), why: R`The lower limit matters: at \(t = 0\) the antiderivative equals \(${-a}\), and subtracting it adds \(${a}\).` },
        { k: K([[a, ''], [-a * T, E]]), why: R`Both parts have a value at \(t = ${T}\): \(${terms([[-a * T, E]])}\) from \(uv\) and \(${terms([[-a, E]])}\) from the remaining integral.` },
        K([[a, ''], [-a * (T - 1), E]]),
        K([[a * T, E]]),
        K([[a, ''], [a * (T + 1), E]]),
      ],
      mg,
    ),
    solution: [
      R`A rate integrated over time gives an amount: \(\displaystyle\int_{0}^{${T}} ${a}t\,e^{-t}\,dt\).`,
      R`Parts with \(u = ${a}t\), \(dv = e^{-t}\,dt\): \(du = ${a}\,dt\), \(v = -e^{-t}\). An antiderivative is \(${terms([[-a, 'te^{-t}'], [-a, 'e^{-t}']])}\).`,
      R`At \(t = ${T}\): \(${terms([[-a * (T + 1), E]])}\). At \(t = 0\): \(${-a}\).`,
      R`Subtract: \(${right.tex}\) mg, which is about \(${num(right.value, { places: 2 })}\) mg.`,
    ],
    rule: 4,
    skill: 'accumulation with parts',
    check: () => checkIntegral((t) => a * t * Math.exp(-t), 0, T, right.value),
  });
}

// ───────────── Hard ─────────────

function hardTabular(rng) {
  const kind = rng.pick(['exp', 'exp', 'sin', 'cos']);
  const a = rng.pick([1, 2, 3, 4, -1, -2]);
  const k = kind === 'exp' ? rng.pick([1, -1, 2, -2, 3]) : rng.int(1, 3);
  const E = ekx(k);
  const S = sinT(k);
  const Co = cosT(k);
  const ek = (x) => Math.exp(k * x);
  const sk = (x) => Math.sin(k * x);
  const ck = (x) => Math.cos(k * x);
  const set = {
    exp: { P: E, basis: [{ tex: `x^{2}${E}`, f: (x) => x * x * ek(x) }, { tex: `x${E}`, f: (x) => x * ek(x) }, { tex: E, f: ek }], c: [frac(a, k), frac(-2 * a, k * k), frac(2 * a, k ** 3)], ints: [terms([[frac(1, k), E]]), terms([[frac(1, k * k), E]]), terms([[frac(1, k ** 3), E]])], f: (x) => a * x * x * ek(x) },
    sin: { P: S, basis: [{ tex: `x^{2}${Co}`, f: (x) => x * x * ck(x) }, { tex: `x${S}`, f: (x) => x * sk(x) }, { tex: Co, f: ck }], c: [frac(-a, k), frac(2 * a, k * k), frac(2 * a, k ** 3)], ints: [terms([[frac(-1, k), Co]]), terms([[frac(-1, k * k), S]]), terms([[frac(1, k ** 3), Co]])], f: (x) => a * x * x * sk(x) },
    cos: { P: Co, basis: [{ tex: `x^{2}${S}`, f: (x) => x * x * sk(x) }, { tex: `x${Co}`, f: (x) => x * ck(x) }, { tex: S, f: sk }], c: [frac(a, k), frac(2 * a, k * k), frac(-2 * a, k ** 3)], ints: [terms([[frac(1, k), S]]), terms([[frac(-1, k * k), Co]]), terms([[frac(-1, k ** 3), S]])], f: (x) => a * x * x * ck(x) },
  }[kind];
  const [c0, c1, c2] = set.c;
  const right = combo(set.basis, set.c);
  const d = [terms([[a, 'x^{2}']]), terms([[2 * a, 'x']]), String(2 * a)];
  return q({
    prompt: R`Find \(\displaystyle\int ${terms([[a, `x^{2}${set.P}`]])}\,dx\).`,
    ...antiChoices(right, [
      { ...combo(set.basis, [c0, c1.neg(), c2]), why: R`Check the middle term. The signs along the table alternate \(+,\,-,\,+\), and each antiderivative brings its own sign.` },
      { ...combo(set.basis, [c0, c1, 0]), why: R`One more step is needed: after the second round an integral of \(${set.P}\) is still left.` },
      { ...combo(set.basis, [c0, c1.div(2), c2.div(2)]), why: R`The derivative of \(x^{2}\) is \(2x\), and the derivative of that is 2. Those factors of 2 belong in the answer.` },
      combo(set.basis, [c0, c1, c2.neg()]),
    ]),
    solution: [
      R`Use the tabular method: differentiate \(${d[0]}\) until it reaches 0, and integrate \(${set.P}\) the same number of times.`,
      R`Derivatives: \(${d[0]},\; ${d[1]},\; ${d[2]},\; 0\). Integrals: \(${set.P},\; ${set.ints[0]},\; ${set.ints[1]},\; ${set.ints[2]}\).`,
      R`Multiply along the diagonals with signs \(+,\,-,\,+\): \(\left(${d[0]}\right)\left(${set.ints[0]}\right) - \left(${d[1]}\right)\left(${set.ints[1]}\right) + \left(${d[2]}\right)\left(${set.ints[2]}\right)\).`,
      R`Simplify: \(${right.tex} + C\).`,
    ],
    rule: 3,
    skill: 'repeated integration by parts',
    check: () => checkAntideriv(right.F, set.f),
  });
}

function hardDefinite(rng) {
  const a = rng.int(1, 6);
  const fam = rng.pick(['exp', 'ln', 'trig', 'trig']);
  if (fam === 'exp') {
    const c = rng.int(1, 4);
    const Ec = eTo(c);
    const right = K([[a * (c - 1), Ec], [a, '']]);
    return q({
      prompt: R`Evaluate \(\displaystyle\int_{0}^{${c}} ${terms([[a, 'xe^{x}']])}\,dx\).`,
      ...exactChoices(right, [
        { k: K([[a * (c - 1), Ec]]), why: R`The lower limit matters: at \(x = 0\) the antiderivative equals \(${-a}\), and subtracting it adds \(${a}\).` },
        { k: K([[a * c, Ec]]), why: ONLY_UV },
        K([[a * (c - 1), Ec], [-a, '']]),
        K([[a * (c + 1), Ec], [-a, '']]),
        K([[a * c, Ec], [a, '']]),
      ]),
      solution: [
        R`Let \(u = ${terms([[a, 'x']])}\) and \(dv = e^{x}\,dx\), so \(du = ${dxOf(a)}\) and \(v = e^{x}\).`,
        R`\(\displaystyle\int_{0}^{${c}} ${terms([[a, 'xe^{x}']])}\,dx = \Big[${terms([[a, 'xe^{x}']])}\Big]_{0}^{${c}} - \int_{0}^{${c}} ${terms([[a, 'e^{x}']])}\,dx\).`,
        R`\(\Big[${terms([[a, 'xe^{x}']])}\Big]_{0}^{${c}} = ${terms([[a * c, Ec]])}\) and \(\displaystyle\int_{0}^{${c}} ${terms([[a, 'e^{x}']])}\,dx = ${terms([[a, Ec], [-a, '']])}\).`,
        R`Subtract: \(${right.tex}\).`,
      ],
      rule: 4,
      skill: 'definite integrals by parts',
      check: () => checkIntegral((x) => a * x * Math.exp(x), 0, c, right.value),
    });
  }
  if (fam === 'ln') {
    const n = rng.int(0, 3);
    const m = n + 1;
    const Em = eTo(m);
    const xn = power('x', n);
    const right = K([[frac(a * n, m * m), Em], [frac(a, m * m), '']]);
    return q({
      prompt: R`Evaluate \(\displaystyle\int_{1}^{e} ${terms([[a, `${xn}\\ln x`]])}\,dx\).`,
      ...exactChoices(right, [
        { k: K([[frac(a, m), Em]]), why: ONLY_UV },
        { k: K([[frac(a * n, m * m), Em], [frac(-a, m * m), '']]), why: R`At the lower limit \(x = 1\) the second integral contributes \(${frac(a, m * m).tex()}\) with a plus sign.` },
        K([[frac(a * (n + 2), m * m), Em], [frac(-a, m * m), '']]),
        K([[frac(a * n, m * m), Em]]),
        K([[frac(a, m), Em], [frac(a, m * m), '']]),
      ]),
      solution: [
        R`Let \(u = \ln x\) and \(dv = ${terms([[a, xn]]) === String(a) ? `${a}\\,` : terms([[a, xn]]) + '\\,'}dx\), so \(du = \frac{1}{x}\,dx\) and \(v = ${terms([[frac(a, m), power('x', m)]])}\).`,
        R`\(\Big[uv\Big]_{1}^{e} = ${terms([[frac(a, m), Em]])}\cdot\ln e - ${frac(a, m).tex()}\cdot\ln 1 = ${fterms([[frac(a, m), Em]])}\).`,
        R`\(\displaystyle\int_{1}^{e} v\,du = \int_{1}^{e} ${terms([[frac(a, m), xn]])}\,dx = ${fterms([[frac(a, m * m), Em], [frac(-a, m * m), '']])}\).`,
        R`Subtract: \(${right.tex}\).`,
      ],
      rule: 4,
      skill: 'definite integrals by parts',
      check: () => checkIntegral((x) => a * x ** n * Math.log(x), 1, Math.E, right.value),
    });
  }
  const half = frac(a, 2);
  const cases = [
    {
      g: '\\cos x', top: R`\pi/2`, hi: Math.PI / 2, f: (x) => a * x * Math.cos(x),
      right: K([[half, '\\pi'], [-a, '']]),
      wrongs: [
        { k: K([[half, '\\pi'], [a, '']]), why: R`\(\int_{0}^{\pi/2}\sin x\,dx = 1\), and it is subtracted.` },
        { k: K([[half, '\\pi']]), why: ONLY_UV },
        K([[a, '']]),
        K([[a, '\\pi'], [-a, '']]),
      ],
      steps: [
        R`\(v = \sin x\), so the integral equals \(\Big[${terms([[a, 'x\\sin x']])}\Big]_{0}^{\pi/2} - \displaystyle\int_{0}^{\pi/2} ${terms([[a, '\\sin x']])}\,dx\).`,
        R`\(\Big[${terms([[a, 'x\\sin x']])}\Big]_{0}^{\pi/2} = ${fterms([[half, '\\pi']])}\) and \(\displaystyle\int_{0}^{\pi/2} ${terms([[a, '\\sin x']])}\,dx = ${a}\).`,
      ],
    },
    {
      g: '\\sin x', top: R`\pi`, hi: Math.PI, f: (x) => a * x * Math.sin(x),
      right: K([[a, '\\pi']]),
      wrongs: [
        { k: K([[-a, '\\pi']]), why: R`\(v = -\cos x\) and \(\cos\pi = -1\), so \(\big[-x\cos x\big]_{0}^{\pi} = +\pi\).` },
        { k: K([[2 * a, '']]), why: R`That is \(\int_{0}^{\pi} ${terms([[a, '\\sin x']])}\,dx\), without the factor \(x\).` },
        K([[a, '\\pi'], [-2 * a, '']]),
        K([[a, '\\pi'], [2 * a, '']]),
      ],
      steps: [
        R`\(v = -\cos x\), so the integral equals \(\Big[${terms([[-a, 'x\\cos x']])}\Big]_{0}^{\pi} + \displaystyle\int_{0}^{\pi} ${terms([[a, '\\cos x']])}\,dx\).`,
        R`\(\Big[${terms([[-a, 'x\\cos x']])}\Big]_{0}^{\pi} = ${terms([[a, '\\pi']])}\) because \(\cos\pi = -1\), and \(\displaystyle\int_{0}^{\pi} ${terms([[a, '\\cos x']])}\,dx = 0\).`,
      ],
    },
    {
      g: '\\sin x', top: R`\pi/2`, hi: Math.PI / 2, f: (x) => a * x * Math.sin(x),
      right: K([[a, '']]),
      wrongs: [
        { k: K([[half, '\\pi']]), why: R`\(\cos\frac{\pi}{2} = 0\), so the \(uv\) part is 0 here. The value comes from the second integral.` },
        K([[-a, '']]),
        K([[half, '\\pi'], [-a, '']]),
        K([[half, '\\pi'], [a, '']]),
      ],
      steps: [
        R`\(v = -\cos x\), so the integral equals \(\Big[${terms([[-a, 'x\\cos x']])}\Big]_{0}^{\pi/2} + \displaystyle\int_{0}^{\pi/2} ${terms([[a, '\\cos x']])}\,dx\).`,
        R`\(\Big[${terms([[-a, 'x\\cos x']])}\Big]_{0}^{\pi/2} = 0\) because \(\cos\frac{\pi}{2} = 0\), and \(\displaystyle\int_{0}^{\pi/2} ${terms([[a, '\\cos x']])}\,dx = ${a}\).`,
      ],
    },
    {
      g: '\\cos x', top: R`\pi`, hi: Math.PI, f: (x) => a * x * Math.cos(x),
      right: K([[-2 * a, '']]),
      wrongs: [
        { k: K([[2 * a, '']]), why: R`\(\int_{0}^{\pi} ${terms([[a, '\\sin x']])}\,dx = ${2 * a}\) is subtracted, so the answer is negative.` },
        { k: K([[a, '\\pi']]), why: R`\(\sin\pi = 0\), so the \(uv\) part is 0 here.` },
        K([[-a, '']]),
        K([[a, '\\pi'], [-2 * a, '']]),
      ],
      steps: [
        R`\(v = \sin x\), so the integral equals \(\Big[${terms([[a, 'x\\sin x']])}\Big]_{0}^{\pi} - \displaystyle\int_{0}^{\pi} ${terms([[a, '\\sin x']])}\,dx\).`,
        R`\(\Big[${terms([[a, 'x\\sin x']])}\Big]_{0}^{\pi} = 0\) because \(\sin\pi = 0\), and \(\displaystyle\int_{0}^{\pi} ${terms([[a, '\\sin x']])}\,dx = ${2 * a}\).`,
      ],
    },
  ];
  const cs = rng.pick(cases);
  return q({
    prompt: R`Evaluate \(\displaystyle\int_{0}^{${cs.top}} ${terms([[a, `x${cs.g}`]])}\,dx\).`,
    ...exactChoices(cs.right, cs.wrongs),
    solution: [R`Let \(u = ${terms([[a, 'x']])}\) and \(dv = ${cs.g}\,dx\), so \(du = ${dxOf(a)}\).`, ...cs.steps, R`Combine: \(${cs.right.tex}\).`],
    rule: 4,
    skill: 'definite integrals by parts',
    check: () => checkIntegral(cs.f, 0, cs.hi, cs.right.value),
  });
}

function hardLnAwkward(rng) {
  const a = rng.nonzero(-6, 6);
  const kind = rng.pick(['pow', 'pow', 'pow', 'sqrt', 'invsqrt']);
  if (kind === 'pow') {
    const n = rng.int(2, 4);
    const m = n - 1;
    const X = power('x', m);
    const form = (p, r, why) => ({ tex: fterms([[p, '\\ln x', X], [r, '', X]]), F: (x) => (p.value * Math.log(x) + r.value) / x ** m, why });
    const p = frac(-a, m);
    const r = frac(-a, m * m);
    const right = form(p, r);
    return q({
      prompt: R`Find \(\displaystyle\int ${fterms([[a, '\\ln x', power('x', n)]])}\,dx\).`,
      ...antiChoices(right, [
        form(p, r.neg(), R`Track both signs: \(v\) is negative, and integrating \(x^{-${n}}\) a second time gives another negative power-rule factor.`),
        form(p, p, R`Integrating \(x^{-${n}}\) the second time divides by \(${-m}\) again.`),
        { tex: fterms([[-a * n, '\\ln x', power('x', n + 1)]]), F: (x) => (-a * n * Math.log(x)) / x ** (n + 1), why: 'That differentiates the power instead of integrating it.' },
        form(p.neg(), r),
      ]),
      solution: [
        R`Write the integrand as \(${terms([[a, `x^{${-n}}\\ln x`]])}\). LIATE: \(u = \ln x\) and \(dv = ${terms([[a, `x^{${-n}}`]])}\,dx\).`,
        R`Then \(du = \frac{1}{x}\,dx\) and \(v = ${fterms([[p, '', X]])}\), so \(uv = ${fterms([[p, '\\ln x', X]])}\).`,
        R`\(\displaystyle\int v\,du = \int ${fterms([[p, '', power('x', n)]])}\,dx = ${fterms([[r.neg(), '', X]])}\).`,
        R`Subtract: \(${right.tex} + C\).`,
      ],
      rule: 1,
      skill: 'logarithm times a power',
      check: () => checkAntideriv(right.F, (x) => (a * Math.log(x)) / x ** n),
    });
  }
  if (kind === 'sqrt') {
    const basis = [{ tex: 'x^{3/2}\\ln x', f: (x) => x ** 1.5 * Math.log(x) }, { tex: 'x^{3/2}', f: (x) => x ** 1.5 }];
    const c0 = frac(2 * a, 3);
    const c1 = frac(-4 * a, 9);
    const right = combo(basis, [c0, c1]);
    return q({
      prompt: R`Find \(\displaystyle\int ${terms([[a, '\\sqrt{x}\\,\\ln x']])}\,dx\).`,
      ...antiChoices(right, [
        { ...combo(basis, [c0, c0.neg()]), why: R`\(\int v\,du = \int ${terms([[c0, 'x^{1/2}']])}\,dx\), and integrating \(x^{1/2}\) multiplies by \(\frac{2}{3}\) again.` },
        { ...combo(basis, [c0, c1.neg()]), why: R`The formula is \(uv - \int v\,du\): the second part is subtracted.` },
        { ...combo(basis, [frac(3 * a, 2), frac(-9 * a, 4)]), why: R`Integrating \(x^{1/2}\) divides by \(\frac{3}{2}\), which is the same as multiplying by \(\frac{2}{3}\).` },
        combo(basis, [c0, frac(-2 * a, 9)]),
      ]),
      solution: [
        R`Write \(\sqrt{x} = x^{1/2}\). LIATE: \(u = \ln x\) and \(dv = ${terms([[a, 'x^{1/2}']])}\,dx\).`,
        R`Then \(du = \frac{1}{x}\,dx\) and \(v = ${terms([[c0, 'x^{3/2}']])}\), so \(uv = ${terms([[c0, 'x^{3/2}\\ln x']])}\).`,
        R`\(\displaystyle\int v\,du = \int ${terms([[c0, 'x^{1/2}']])}\,dx = ${terms([[c1.neg(), 'x^{3/2}']])}\).`,
        R`Subtract: \(${right.tex} + C\).`,
      ],
      rule: 1,
      skill: 'logarithm times a power',
      check: () => checkAntideriv(right.F, (x) => a * Math.sqrt(x) * Math.log(x)),
    });
  }
  const basis = [{ tex: '\\sqrt{x}\\,\\ln x', f: (x) => Math.sqrt(x) * Math.log(x) }, { tex: '\\sqrt{x}', f: Math.sqrt }];
  const right = combo(basis, [2 * a, -4 * a]);
  return q({
    prompt: R`Find \(\displaystyle\int ${fterms([[a, '\\ln x', '\\sqrt{x}']])}\,dx\).`,
    ...antiChoices(right, [
      { ...combo(basis, [2 * a, -2 * a]), why: R`\(\int v\,du = \int ${terms([[2 * a, 'x^{-1/2}']])}\,dx\), and integrating \(x^{-1/2}\) doubles the coefficient again.` },
      { ...combo(basis, [2 * a, 4 * a]), why: R`The formula is \(uv - \int v\,du\): the second part is subtracted.` },
      { ...combo(basis, [frac(a, 2), frac(-a, 4)]), why: R`Integrating \(x^{-1/2}\) divides by \(\frac{1}{2}\), which multiplies by 2.` },
      combo(basis, [2 * a, -a]),
    ]),
    solution: [
      R`Write the integrand as \(${terms([[a, 'x^{-1/2}\\ln x']])}\). LIATE: \(u = \ln x\) and \(dv = ${terms([[a, 'x^{-1/2}']])}\,dx\).`,
      R`Then \(du = \frac{1}{x}\,dx\) and \(v = ${terms([[2 * a, 'x^{1/2}']])}\), so \(uv = ${terms([[2 * a, '\\sqrt{x}\\,\\ln x']])}\).`,
      R`\(\displaystyle\int v\,du = \int ${terms([[2 * a, 'x^{-1/2}']])}\,dx = ${terms([[4 * a, '\\sqrt{x}']])}\).`,
      R`Subtract: \(${right.tex} + C\).`,
    ],
    rule: 1,
    skill: 'logarithm times a power',
    check: () => checkAntideriv(right.F, (x) => (a * Math.log(x)) / Math.sqrt(x)),
  });
}

function hardWordCart(rng) {
  const p = rng.int(1, 5);
  const b = rng.int(1, 6);
  const T = rng.pick([2, 4, 6]);
  const E = `e^{-${T / 2}}`;
  const big = 2 * p * T + 2 * b + 4 * p;
  const right = K([[2 * b + 4 * p, ''], [-big, E]]);
  const meters = (tex) => R`\(${tex}\) m`;
  return q({
    prompt: R`A cart rolls along a straight track with velocity \(v(t) = (${linear(p, b, 't')})\,e^{-t/2}\) meters per second. How far does it travel during the first ${T} seconds?`,
    ...exactChoices(
      right,
      [
        { k: K([[b + p, ''], [-(p * T + b + p), E]]), why: R`\(\int e^{-t/2}\,dt = -2e^{-t/2}\): dividing by \(-\frac{1}{2}\) multiplies by \(-2\).` },
        { k: K([[-big, E]]), why: R`Evaluate at the lower limit too. At \(t = 0\) the antiderivative is \(${-(2 * b + 4 * p)}\), not 0.` },
        { k: K([[2 * b + 4 * p, ''], [big, E]]), why: R`The value at \(t = ${T}\) is negative: \(${terms([[-big, E]])}\). It lowers the total.` },
        K([[2 * b, ''], [-(2 * p * T + 2 * b), E]]),
        K([[2 * b - 4 * p, ''], [-(2 * p * T + 2 * b - 4 * p), E]]),
      ],
      meters,
    ),
    solution: [
      R`The velocity is positive, so the distance is \(\displaystyle\int_{0}^{${T}} (${linear(p, b, 't')})\,e^{-t/2}\,dt\).`,
      R`Parts with \(u = ${linear(p, b, 't')}\), \(dv = e^{-t/2}\,dt\): \(du = ${dxOf(p, 't')}\), \(v = -2e^{-t/2}\).`,
      R`\(uv - \displaystyle\int v\,du = -2(${linear(p, b, 't')})e^{-t/2} + ${2 * p}\int e^{-t/2}\,dt = -2(${linear(p, b, 't')})e^{-t/2} - ${4 * p}e^{-t/2}\).`,
      R`At \(t = ${T}\): \(${terms([[-big, E]])}\). At \(t = 0\): \(${-(2 * b + 4 * p)}\).`,
      R`Subtract: \(${right.tex}\) m, which is about \(${num(right.value, { places: 2 })}\) m.`,
    ],
    rule: 4,
    skill: 'accumulation with parts',
    check: () => checkIntegral((t) => (p * t + b) * Math.exp(-t / 2), 0, T, right.value),
  });
}

// ───────────── Challenge ─────────────

function challengeCyclic(rng) {
  const a = rng.pick([1, 2, 3, -1, -2]);
  const b = rng.int(1, 4);
  const isSin = rng.bool();
  const E = ekx(a);
  const S = sinT(b);
  const Co = cosT(b);
  const d = a * a + b * b;
  // e^{ax}(p·sin bx + r·cos bx)/den, written in lowest terms with any leading minus sign in front.
  const form = (p, r, den, why) => {
    const g = gcd(gcd(p, r), den);
    const sgn = p < 0 && r <= 0 ? -1 : 1;
    const pair = [[(sgn * p) / g, S], [(sgn * r) / g, Co]];
    const inner = `${E}(${terms(p < 0 && r > 0 ? pair.reverse() : pair)})`;
    return {
      tex: `${sgn < 0 ? '-' : ''}${den / g === 1 ? inner : R`\frac{${inner}}{${den / g}}`}`,
      F: (x) => (Math.exp(a * x) * (p * Math.sin(b * x) + r * Math.cos(b * x))) / den,
      why,
    };
  };
  const [p, r] = isSin ? [a, -b] : [b, a];
  const right = form(p, r, d);
  const T1 = isSin ? S : Co; // the trig factor in the integrand
  const T2 = isSin ? Co : S; // the one that appears after the first round
  const s1 = isSin ? -1 : 1; // sign of the first new integral: ∫e^{ax}sin → −(b/a)∫e^{ax}cos, ∫e^{ax}cos → +(b/a)∫e^{ax}sin
  return q({
    prompt: R`Find \(\displaystyle\int ${E}${T1}\,dx\).`,
    ...antiChoices(right, [
      form(isSin ? p : -p, isSin ? -r : r, d, R`Watch the sign that comes from integrating or differentiating the trig factor in each round.`),
      form(p, r, 1, R`The original integral shows up on both sides. Collecting both copies leaves a factor that you still have to divide by.`),
      form(r, p, d),
      d !== 2 ? form(p, r, 2) : null,
      form(-p, -r, d),
    ]),
    solution: [
      R`Call the integral \(I\). First round, with \(u = ${T1}\) and \(dv = ${E}\,dx\): \(I = ${terms([[frac(1, a), E + T1], [frac(s1 * b, a), `\\displaystyle\\int ${E}${T2}\\,dx`]])}\).`,
      R`Second round on the new integral, with \(u = ${T2}\): \(\displaystyle\int ${E}${T2}\,dx = ${terms([[frac(1, a), E + T2], [frac(-s1 * b, a), 'I']])}\).`,
      R`Substitute: \(I = ${terms([[frac(1, a), E + T1], [frac(s1 * b, a * a), E + T2], [frac(-b * b, a * a), 'I']])}\).`,
      R`Collect the \(I\) terms: \(${frac(d, a * a).tex()}\,I = ${terms([[frac(1, a), E + T1], [frac(s1 * b, a * a), E + T2]])}\).`,
      R`Solve for \(I\): \(I = ${right.tex} + C\).`,
    ],
    rule: 5,
    skill: 'cyclic integrals',
    check: () => checkAntideriv(right.F, (x) => Math.exp(a * x) * (isSin ? Math.sin(b * x) : Math.cos(b * x))),
  });
}

function challengeTable(rng) {
  const p = rng.int(0, 2);
  const w = rng.int(1, 4);
  const s = p + w;
  let fa;
  let fb;
  let ga;
  let gb;
  do {
    fa = rng.int(-6, 6);
    fb = rng.int(-6, 6);
    ga = rng.int(-6, 6);
    gb = rng.int(-6, 6);
  } while (fa === fb || ga === gb || ((fb - fa) * (ga + gb)) % 2 !== 0 || fb * gb === fa * ga);
  // One concrete pair with these values: f and g linear. Then ∫ f′g = (f(s) − f(p))·(g(p) + g(s))/2.
  const Kint = ((fb - fa) * (ga + gb)) / 2;
  const ans = fb * gb - fa * ga - Kint;
  const f = (x) => fa + ((fb - fa) * (x - p)) / w;
  const g = (x) => ga + ((gb - ga) * (x - p)) / w;
  return q({
    prompt: R`The functions \(f\) and \(g\) are differentiable, with the values in the table. If \(\displaystyle\int_{${p}}^{${s}} f'(x)\,g(x)\,dx = ${Kint}\), find \(\displaystyle\int_{${p}}^{${s}} f(x)\,g'(x)\,dx\).`,
    visual: {
      type: 'table',
      headers: [R`\(x\)`, R`\(f(x)\)`, R`\(g(x)\)`],
      rows: [[R`\(${p}\)`, R`\(${fa}\)`, R`\(${ga}\)`], [R`\(${s}\)`, R`\(${fb}\)`, R`\(${gb}\)`]],
      alt: `Table of values. At x = ${p}: f is ${fa} and g is ${ga}. At x = ${s}: f is ${fb} and g is ${gb}.`,
    },
    correct: ans,
    wrong: [
      { value: fb * gb - fa * ga + Kint, why: R`The formula subtracts the other integral: \(\int f g'\,dx = \big[fg\big] - \int f'g\,dx\).` },
      { value: fb * gb - fa * ga, why: R`That is only \(\big[f(x)g(x)\big]\). Subtract \(\int f'(x)g(x)\,dx\) as well.` },
      fa * ga - fb * gb - Kint,
      fb * gb + fa * ga - Kint,
      Kint,
    ],
    solution: [
      R`Integration by parts with \(u = f(x)\) and \(dv = g'(x)\,dx\): \(\displaystyle\int_{${p}}^{${s}} f g'\,dx = \Big[f(x)g(x)\Big]_{${p}}^{${s}} - \int_{${p}}^{${s}} f' g\,dx\).`,
      R`\(\Big[f(x)g(x)\Big]_{${p}}^{${s}} = (${fb})(${gb}) - (${fa})(${ga}) = ${fb * gb - fa * ga}\).`,
      R`Subtract the given integral: \(${fb * gb - fa * ga} - ${paren(Kint)} = ${ans}\).`,
    ],
    rule: 4,
    skill: 'parts with unknown functions',
    check: () => checkAll(checkIntegral((x) => ((fb - fa) / w) * g(x), p, s, Kint), checkIntegral((x) => (f(x) * (gb - ga)) / w, p, s, ans)),
  });
}

function challengeSecondDerivative(rng) {
  // A concrete f with these values: f(x) = f0 + c1·x + c2·x². The answer must hold for it.
  let a;
  let f0;
  let c1;
  let c2;
  let fa;
  let dfa;
  do {
    a = rng.int(1, 4);
    f0 = rng.nonzero(-5, 5);
    c1 = rng.int(-4, 4);
    c2 = rng.nonzero(-3, 3);
    fa = f0 + c1 * a + c2 * a * a;
    dfa = c1 + 2 * c2 * a;
  } while (fa === f0 || fa === 0 || dfa === 0 || Math.abs(fa) > 30);
  const ans = a * dfa - fa + f0;
  return q({
    prompt: R`A function \(f\) has a continuous second derivative, with \(f(0) = ${f0}\), \(f(${a}) = ${fa}\) and \(f'(${a}) = ${dfa}\). Find \(\displaystyle\int_{0}^{${a}} x\,f''(x)\,dx\).`,
    correct: ans,
    wrong: [
      { value: a * dfa - fa - f0, why: R`\(-\displaystyle\int_{0}^{${a}} f'(x)\,dx = -\big(f(${a}) - f(0)\big)\), so \(f(0)\) comes back with a plus sign.` },
      { value: a * dfa, why: ONLY_UV },
      { value: a * dfa + fa - f0, why: R`The formula subtracts \(\int v\,du = \int_{0}^{${a}} f'(x)\,dx\).` },
      dfa - fa + f0,
      a * fa - dfa + f0,
    ],
    solution: [
      R`Let \(u = x\) and \(dv = f''(x)\,dx\). Then \(du = dx\) and \(v = f'(x)\).`,
      R`\(\displaystyle\int_{0}^{${a}} x f''(x)\,dx = \Big[x f'(x)\Big]_{0}^{${a}} - \int_{0}^{${a}} f'(x)\,dx\).`,
      R`\(\Big[x f'(x)\Big]_{0}^{${a}} = ${a}\cdot${paren(dfa)} - 0 = ${a * dfa}\), and \(\displaystyle\int_{0}^{${a}} f'(x)\,dx = f(${a}) - f(0) = ${fa} - ${paren(f0)} = ${fa - f0}\).`,
      R`Subtract: \(${a * dfa} - ${paren(fa - f0)} = ${ans}\).`,
    ],
    rule: 4,
    skill: 'parts with unknown functions',
    check: () => checkIntegral((x) => x * 2 * c2, 0, a, ans),
  });
}

function challengeDefiniteBank(rng) {
  const a = rng.int(1, 4);
  const A = (sym) => terms([[a, sym]]);
  const h = (d) => frac(a, d);
  const bank = [
    {
      int: R`\int_{0}^{1} ${A('\\arctan x')}\,dx`, f: (x) => a * Math.atan(x), lo: 0, hi: 1,
      right: K([[h(4), '\\pi'], [h(2).neg(), '\\ln 2']]),
      wrongs: [
        { k: K([[h(4), '\\pi'], [-a, '\\ln 2']]), why: R`\(\int_{0}^{1}\frac{x}{1 + x^{2}}\,dx = \frac{1}{2}\ln 2\). The substitution \(w = 1 + x^{2}\) brings a factor \(\frac{1}{2}\).` },
        { k: K([[h(4), '\\pi']]), why: ONLY_UV },
        K([[h(4), '\\pi'], [h(2), '\\ln 2']]),
        K([[h(2), '\\pi'], [h(2).neg(), '\\ln 2']]),
      ],
      steps: [
        R`Let \(u = \arctan x\), \(dv = dx\): \(du = \frac{1}{1 + x^{2}}\,dx\), \(v = x\).`,
        R`\(\Big[x\arctan x\Big]_{0}^{1} = \frac{\pi}{4}\), and \(\displaystyle\int_{0}^{1}\frac{x}{1 + x^{2}}\,dx = \Big[\tfrac{1}{2}\ln(1 + x^{2})\Big]_{0}^{1} = \tfrac{1}{2}\ln 2\).`,
        R`So \(\displaystyle\int_{0}^{1}\arctan x\,dx = \frac{\pi}{4} - \frac{\ln 2}{2}\).`,
      ],
    },
    {
      int: R`\int_{0}^{1} ${A('x\\arctan x')}\,dx`, f: (x) => a * x * Math.atan(x), lo: 0, hi: 1,
      right: K([[h(4), '\\pi'], [h(2).neg(), '']]),
      wrongs: [
        { k: K([[h(8), '\\pi'], [h(2).neg(), '']]), why: R`\(\frac{x^{2}}{1 + x^{2}} = 1 - \frac{1}{1 + x^{2}}\), so the second integral contributes another \(\frac{\pi}{8}\).` },
        { k: K([[h(8), '\\pi']]), why: ONLY_UV },
        K([[h(4), '\\pi'], [h(2), '']]),
        K([[h(4), '\\pi'], [-a, '']]),
      ],
      steps: [
        R`Let \(u = \arctan x\), \(dv = x\,dx\): \(du = \frac{1}{1 + x^{2}}\,dx\), \(v = \frac{x^{2}}{2}\).`,
        R`\(\Big[\tfrac{x^{2}}{2}\arctan x\Big]_{0}^{1} = \frac{\pi}{8}\), and \(\displaystyle\int_{0}^{1}\frac{x^{2}}{2(1 + x^{2})}\,dx = \frac{1}{2}\int_{0}^{1}\left(1 - \frac{1}{1 + x^{2}}\right)dx = \frac{1}{2} - \frac{\pi}{8}\).`,
        R`So \(\displaystyle\int_{0}^{1} x\arctan x\,dx = \frac{\pi}{8} - \frac{1}{2} + \frac{\pi}{8} = \frac{\pi}{4} - \frac{1}{2}\).`,
      ],
    },
    {
      int: R`\int_{1}^{e} ${A('(\\ln x)^{2}')}\,dx`, f: (x) => a * Math.log(x) ** 2, lo: 1, hi: Math.E,
      right: K([[a, 'e'], [-2 * a, '']]),
      wrongs: [
        { k: K([[a, 'e'], [-a, '']]), why: R`\(du = \frac{2\ln x}{x}\,dx\), so the second integral is \(2\int_{1}^{e}\ln x\,dx = 2\).` },
        { k: K([[a, 'e']]), why: ONLY_UV },
        K([[a, 'e'], [2 * a, '']]),
        K([[2 * a, 'e'], [-2 * a, '']]),
      ],
      steps: [
        R`Let \(u = (\ln x)^{2}\), \(dv = dx\): \(du = \frac{2\ln x}{x}\,dx\), \(v = x\).`,
        R`\(\Big[x(\ln x)^{2}\Big]_{1}^{e} = e\), and \(\displaystyle\int_{1}^{e} 2\ln x\,dx = 2\Big[x\ln x - x\Big]_{1}^{e} = 2\) (parts again).`,
        R`So \(\displaystyle\int_{1}^{e}(\ln x)^{2}\,dx = e - 2\).`,
      ],
    },
    {
      int: R`\int_{0}^{1} ${A('\\ln(1 + x)')}\,dx`, f: (x) => a * Math.log(1 + x), lo: 0, hi: 1,
      right: K([[2 * a, '\\ln 2'], [-a, '']]),
      wrongs: [
        { k: K([[a, '\\ln 2'], [-a, '']]), why: R`\(\frac{x}{1 + x} = 1 - \frac{1}{1 + x}\), so \(\int_{0}^{1}\frac{x}{1 + x}\,dx = 1 - \ln 2\), not 1.` },
        { k: K([[a, '\\ln 2']]), why: ONLY_UV },
        K([[2 * a, '\\ln 2'], [a, '']]),
        K([[2 * a, '\\ln 2']]),
      ],
      steps: [
        R`Let \(u = \ln(1 + x)\), \(dv = dx\): \(du = \frac{1}{1 + x}\,dx\), \(v = x\).`,
        R`\(\Big[x\ln(1 + x)\Big]_{0}^{1} = \ln 2\), and \(\displaystyle\int_{0}^{1}\frac{x}{1 + x}\,dx = \int_{0}^{1}\left(1 - \frac{1}{1 + x}\right)dx = 1 - \ln 2\).`,
        R`So \(\displaystyle\int_{0}^{1}\ln(1 + x)\,dx = \ln 2 - (1 - \ln 2) = 2\ln 2 - 1\).`,
      ],
    },
    {
      int: R`\int_{0}^{1/2} ${A('\\arcsin x')}\,dx`, f: (x) => a * Math.asin(x), lo: 0, hi: 0.5,
      right: K([[h(12), '\\pi'], [h(2), '\\sqrt{3}'], [-a, '']]),
      wrongs: [
        { k: K([[h(12), '\\pi'], [h(2).neg(), '\\sqrt{3}'], [a, '']]), why: R`\(\int \frac{x}{\sqrt{1 - x^{2}}}\,dx = -\sqrt{1 - x^{2}}\), and that integral is subtracted.` },
        { k: K([[h(12), '\\pi']]), why: ONLY_UV },
        K([[h(6), '\\pi'], [h(2), '\\sqrt{3}'], [-a, '']]),
        K([[h(12), '\\pi'], [h(2), '\\sqrt{3}']]),
      ],
      steps: [
        R`Let \(u = \arcsin x\), \(dv = dx\): \(du = \frac{1}{\sqrt{1 - x^{2}}}\,dx\), \(v = x\).`,
        R`\(\Big[x\arcsin x\Big]_{0}^{1/2} = \frac{1}{2}\cdot\frac{\pi}{6} = \frac{\pi}{12}\), and \(\displaystyle\int_{0}^{1/2}\frac{x}{\sqrt{1 - x^{2}}}\,dx = \Big[-\sqrt{1 - x^{2}}\Big]_{0}^{1/2} = 1 - \frac{\sqrt{3}}{2}\).`,
        R`So \(\displaystyle\int_{0}^{1/2}\arcsin x\,dx = \frac{\pi}{12} + \frac{\sqrt{3}}{2} - 1\).`,
      ],
    },
    {
      int: R`\int_{0}^{1} ${A('x^{2}e^{x}')}\,dx`, f: (x) => a * x * x * Math.exp(x), lo: 0, hi: 1,
      right: K([[a, 'e'], [-2 * a, '']]),
      wrongs: [
        { k: K([[a, 'e']]), why: R`The lower limit matters: at \(x = 0\) the antiderivative \(e^{x}(x^{2} - 2x + 2)\) equals 2.` },
        { k: K([[5 * a, 'e'], [-2 * a, '']]), why: R`The signs in the tabular method alternate: \(e^{x}(x^{2} - 2x + 2)\).` },
        K([[a, 'e'], [2 * a, '']]),
        K([[a, 'e'], [-a, '']]),
      ],
      steps: [
        R`Tabular method: derivatives \(x^{2},\,2x,\,2,\,0\); integrals \(e^{x},\,e^{x},\,e^{x},\,e^{x}\); signs \(+,\,-,\,+\).`,
        R`An antiderivative is \(e^{x}(x^{2} - 2x + 2)\).`,
        R`\(\Big[e^{x}(x^{2} - 2x + 2)\Big]_{0}^{1} = e - 2\).`,
      ],
    },
    {
      int: R`\int_{0}^{\pi} ${A('x^{2}\\sin x')}\,dx`, f: (x) => a * x * x * Math.sin(x), lo: 0, hi: Math.PI,
      right: K([[a, '\\pi^{2}'], [-4 * a, '']]),
      wrongs: [
        { k: K([[a, '\\pi^{2}'], [-2 * a, '']]), why: R`The lower limit matters: at \(x = 0\) the antiderivative equals \(2\cos 0 = 2\), which is subtracted too.` },
        { k: K([[a, '\\pi^{2}']]), why: R`That is only the first term. The later rows of the table also contribute at both limits.` },
        K([[a, '\\pi^{2}'], [4 * a, '']]),
        K([[-a, '\\pi^{2}'], [4 * a, '']]),
      ],
      steps: [
        R`Tabular method: derivatives \(x^{2},\,2x,\,2,\,0\); integrals \(\sin x,\,-\cos x,\,-\sin x,\,\cos x\); signs \(+,\,-,\,+\).`,
        R`An antiderivative is \(-x^{2}\cos x + 2x\sin x + 2\cos x\).`,
        R`At \(x = \pi\): \(\pi^{2} + 0 - 2\). At \(x = 0\): \(2\). The difference is \(\pi^{2} - 4\).`,
      ],
    },
    {
      int: R`\int_{0}^{\pi/2} ${A('x^{2}\\cos x')}\,dx`, f: (x) => a * x * x * Math.cos(x), lo: 0, hi: Math.PI / 2,
      right: K([[h(4), '\\pi^{2}'], [-2 * a, '']]),
      wrongs: [
        { k: K([[h(4), '\\pi^{2}']]), why: R`That is only the first term. The last row of the table gives \(-2\sin x\), which is \(-2\) at \(x = \frac{\pi}{2}\).` },
        { k: K([[h(4), '\\pi^{2}'], [2 * a, '']]), why: R`The signs alternate \(+,\,-,\,+\), and \(\int\int \cos x = -\cos x\), then \(-\sin x\): the last term is \(-2\sin x\).` },
        K([[h(2), '\\pi^{2}'], [-2 * a, '']]),
        K([[h(4), '\\pi^{2}'], [-a, '']]),
      ],
      steps: [
        R`Tabular method: derivatives \(x^{2},\,2x,\,2,\,0\); integrals \(\cos x,\,\sin x,\,-\cos x,\,-\sin x\); signs \(+,\,-,\,+\).`,
        R`An antiderivative is \(x^{2}\sin x + 2x\cos x - 2\sin x\).`,
        R`At \(x = \frac{\pi}{2}\): \(\frac{\pi^{2}}{4} + 0 - 2\). At \(x = 0\): \(0\). The difference is \(\frac{\pi^{2}}{4} - 2\).`,
      ],
    },
    {
      int: R`\int_{0}^{\pi/2} ${A('e^{x}\\cos x')}\,dx`, f: (x) => a * Math.exp(x) * Math.cos(x), lo: 0, hi: Math.PI / 2,
      right: K([[h(2), 'e^{\\pi/2}'], [h(2).neg(), '']]),
      wrongs: [
        { k: K([[a, 'e^{\\pi/2}'], [-a, '']]), why: R`Two rounds of parts give \(2I = \big[e^{x}(\sin x + \cos x)\big]\). Divide by 2 to get \(I\).` },
        { k: K([[h(2), 'e^{\\pi/2}'], [h(2), '']]), why: R`At \(x = 0\) the antiderivative equals \(\frac{1}{2}\), and it is subtracted.` },
        K([[h(2), 'e^{\\pi/2}']]),
        K([[a, 'e^{\\pi/2}']]),
      ],
      steps: [
        R`Integrate by parts twice. The original integral \(I\) comes back: \(I = e^{x}\sin x + e^{x}\cos x - I\).`,
        R`So an antiderivative is \(\frac{1}{2}e^{x}(\sin x + \cos x)\).`,
        R`At \(x = \frac{\pi}{2}\): \(\frac{1}{2}e^{\pi/2}\). At \(x = 0\): \(\frac{1}{2}\). The difference is \(\frac{e^{\pi/2} - 1}{2}\).`,
      ],
    },
    {
      int: R`\int_{0}^{\pi} ${A('e^{x}\\sin x')}\,dx`, f: (x) => a * Math.exp(x) * Math.sin(x), lo: 0, hi: Math.PI,
      right: K([[h(2), 'e^{\\pi}'], [h(2), '']]),
      wrongs: [
        { k: K([[h(2), 'e^{\\pi}'], [h(2).neg(), '']]), why: R`At \(x = 0\) the antiderivative equals \(-\frac{1}{2}\). Subtracting it adds \(\frac{1}{2}\).` },
        { k: K([[a, 'e^{\\pi}'], [a, '']]), why: R`Two rounds of parts give \(2I = \big[e^{x}(\sin x - \cos x)\big]\). Divide by 2 to get \(I\).` },
        K([[h(2), 'e^{\\pi}']]),
        K([[a, 'e^{\\pi}']]),
      ],
      steps: [
        R`Integrate by parts twice. The original integral \(I\) comes back: \(I = e^{x}\sin x - e^{x}\cos x - I\).`,
        R`So an antiderivative is \(\frac{1}{2}e^{x}(\sin x - \cos x)\).`,
        R`At \(x = \pi\): \(\frac{1}{2}e^{\pi}\). At \(x = 0\): \(-\frac{1}{2}\). The difference is \(\frac{e^{\pi} + 1}{2}\).`,
      ],
    },
  ];
  const item = rng.pick(bank);
  return q({
    prompt: R`Evaluate \(\displaystyle${item.int}\).`,
    ...exactChoices(item.right, item.wrongs),
    solution: [...item.steps, a === 1 ? R`The value is \(${item.right.tex}\).` : R`Multiply by the constant \(${a}\): \(${item.right.tex}\).`],
    rule: 4,
    skill: 'definite integrals by parts',
    check: () => checkIntegral(item.f, item.lo, item.hi, item.right.value),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'integration-by-parts',
  title: 'Integration by Parts',
  summary: 'Integrate products such as x·eˣ, x·sin x and x·ln x, including repeated, definite and cyclic cases.',
  standards: ['AP Calculus 6.11'],

  explain: {
    intro: R`Integration by parts is the product rule run backwards. It trades one integral for another: you differentiate one factor and integrate the other. The method pays off when the new integral is simpler than the one you started with.`,
    rules: [
      {
        title: 'The formula',
        text: R`Split the integrand into a factor \(u\) and a factor \(dv\). Differentiate \(u\) to get \(du\), integrate \(dv\) to get \(v\), then use \(\displaystyle\int u\,dv = uv - \int v\,du\).`,
        example: R`\(\displaystyle\int x\cos x\,dx\): take \(u = x\), \(dv = \cos x\,dx\). Then \(du = dx\), \(v = \sin x\), so the integral is \(x\sin x - \displaystyle\int \sin x\,dx = x\sin x + \cos x + C\).`,
      },
      {
        title: 'Choosing u: LIATE',
        text: R`Pick \(u\) from the type that comes first in this list: **L**ogarithmic, **I**nverse trig, **A**lgebraic (powers of \(x\)), **T**rigonometric, **E**xponential. The rest, including \(dx\), is \(dv\). The aim is a \(u\) that gets simpler when differentiated and a \(dv\) you can integrate.`,
        example: R`In \(\displaystyle\int x^{3}\ln x\,dx\) take \(u = \ln x\). In \(\displaystyle\int x\,e^{2x}\,dx\) take \(u = x\).`,
      },
      {
        title: 'A logarithm or inverse trig function on its own',
        text: R`When the integrand is a single function that you can differentiate but not integrate at sight, let that function be \(u\) and let \(dv = dx\), so \(v = x\).`,
        example: R`\(\displaystyle\int \ln x\,dx = x\ln x - \int x\cdot\frac{1}{x}\,dx = x\ln x - x + C\).`,
      },
      {
        title: 'Repeated parts and the tabular method',
        text: R`For \(x^{n}\) times \(e^{kx}\), \(\sin kx\) or \(\cos kx\), parts is needed \(n\) times. Organise it in a table: differentiate the power down to 0 in one column, integrate the other factor in the next, then multiply along the diagonals with signs \(+,\,-,\,+,\,\dots\)`,
        example: R`\(\displaystyle\int x^{2}e^{x}\,dx = x^{2}e^{x} - 2xe^{x} + 2e^{x} + C\).`,
      },
      {
        title: 'Definite integrals',
        text: R`Carry the limits through every part: \(\displaystyle\int_{a}^{b} u\,dv = \Big[uv\Big]_{a}^{b} - \int_{a}^{b} v\,du\). Evaluate \(uv\) at both limits.`,
        example: R`\(\displaystyle\int_{0}^{1} xe^{x}\,dx = \Big[xe^{x}\Big]_{0}^{1} - \int_{0}^{1} e^{x}\,dx = e - (e - 1) = 1\).`,
      },
      {
        title: 'Integrals that come back',
        text: R`For \(e^{ax}\sin bx\) or \(e^{ax}\cos bx\), integrate by parts twice with the same kind of choice each time. The original integral \(I\) reappears on the right. Move it to the left and solve for \(I\).`,
        example: R`\(I = \displaystyle\int e^{x}\sin x\,dx = e^{x}\sin x - e^{x}\cos x - I\), so \(I = \tfrac{1}{2}e^{x}(\sin x - \cos x) + C\).`,
      },
    ],
    vocab: [
      { term: 'integration by parts', def: R`The rule \(\int u\,dv = uv - \int v\,du\), which comes from integrating the product rule \((uv)' = u'v + uv'\).` },
      { term: 'LIATE', def: 'A guide for choosing u: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential.' },
      { term: 'tabular method', def: 'A table of repeated derivatives and repeated integrals that carries out several rounds of integration by parts at once.' },
    ],
    mistakes: [
      R`Dropping the minus sign: the formula is \(uv - \int v\,du\), and \(v\) often has a sign of its own (\(\int \sin x\,dx = -\cos x\)).`,
      R`Forgetting the inner constant when finding \(v\): \(\int e^{3x}\,dx = \frac{1}{3}e^{3x}\), not \(e^{3x}\).`,
      R`Choosing \(u = e^{x}\) and \(dv = x\,dx\). That raises the power of \(x\) and makes the integral harder.`,
      R`In a definite integral, evaluating \(uv\) at only one limit. Use both, and remember that the value at the lower limit is often not 0.`,
    ],
    visual: {
      type: 'table',
      caption: R`Tabular method for \(\int x^{2}e^{3x}\,dx\): each derivative of \(u = x^{2}\) is multiplied by the next integral of \(dv = e^{3x}\,dx\)`,
      headers: ['Sign', R`Derivative of \(u\)`, R`Times this integral of \(dv\)`],
      rows: [
        [R`\(+\)`, R`\(x^{2}\)`, R`\(\frac{1}{3}e^{3x}\)`],
        [R`\(-\)`, R`\(2x\)`, R`\(\frac{1}{9}e^{3x}\)`],
        [R`\(+\)`, R`\(2\)`, R`\(\frac{1}{27}e^{3x}\)`],
      ],
      alt: 'Tabular method for the integral of x squared times e to the 3x. Plus x squared times one third e to the 3x, minus 2x times one ninth e to the 3x, plus 2 times one twenty-seventh e to the 3x. The next derivative is 0, so the table stops.',
    },
  },

  examples: [
    {
      title: 'A polynomial times an exponential',
      problem: R`Find \(\displaystyle\int x\,e^{2x}\,dx\).`,
      steps: [
        R`LIATE: \(x\) is algebraic and \(e^{2x}\) is exponential, so \(u = x\) and \(dv = e^{2x}\,dx\).`,
        R`Then \(du = dx\) and \(v = \frac{1}{2}e^{2x}\).`,
        R`\(\displaystyle\int x\,e^{2x}\,dx = \frac{1}{2}xe^{2x} - \int \frac{1}{2}e^{2x}\,dx\).`,
        R`The remaining integral is \(\frac{1}{4}e^{2x}\).`,
      ],
      answer: R`\(\frac{1}{2}xe^{2x} - \frac{1}{4}e^{2x} + C\)`,
    },
    {
      title: 'A logarithm times a power',
      problem: R`Find \(\displaystyle\int x^{2}\ln x\,dx\).`,
      steps: [
        R`A logarithm comes first in LIATE: \(u = \ln x\), \(dv = x^{2}\,dx\).`,
        R`Then \(du = \frac{1}{x}\,dx\) and \(v = \frac{1}{3}x^{3}\).`,
        R`\(\displaystyle\int x^{2}\ln x\,dx = \frac{1}{3}x^{3}\ln x - \int \frac{1}{3}x^{3}\cdot\frac{1}{x}\,dx = \frac{1}{3}x^{3}\ln x - \int \frac{1}{3}x^{2}\,dx\).`,
        R`The remaining integral is \(\frac{1}{9}x^{3}\).`,
      ],
      answer: R`\(\frac{1}{3}x^{3}\ln x - \frac{1}{9}x^{3} + C\)`,
    },
    {
      title: 'Parts twice: the tabular method',
      problem: R`Find \(\displaystyle\int x^{2}\cos x\,dx\).`,
      steps: [
        R`Differentiate \(x^{2}\) down to 0: \(x^{2},\; 2x,\; 2,\; 0\).`,
        R`Integrate \(\cos x\) three times: \(\sin x,\; -\cos x,\; -\sin x\).`,
        R`Multiply along the diagonals with signs \(+,\,-,\,+\): \((x^{2})(\sin x) - (2x)(-\cos x) + (2)(-\sin x)\).`,
      ],
      answer: R`\(x^{2}\sin x + 2x\cos x - 2\sin x + C\)`,
    },
    {
      title: 'An integral that comes back',
      problem: R`Find \(I = \displaystyle\int e^{x}\cos x\,dx\).`,
      steps: [
        R`First round, \(u = \cos x\), \(dv = e^{x}\,dx\): \(I = e^{x}\cos x + \displaystyle\int e^{x}\sin x\,dx\).`,
        R`Second round, \(u = \sin x\), \(dv = e^{x}\,dx\): \(\displaystyle\int e^{x}\sin x\,dx = e^{x}\sin x - I\).`,
        R`Substitute: \(I = e^{x}\cos x + e^{x}\sin x - I\), so \(2I = e^{x}(\cos x + \sin x)\).`,
      ],
      answer: R`\(I = \frac{1}{2}e^{x}(\sin x + \cos x) + C\)`,
    },
    {
      title: 'Word problem: distance from a velocity',
      word: true,
      problem: R`A cart moves along a track with velocity \(v(t) = t\,e^{-t}\) meters per second. How far does it travel in the first 2 seconds?`,
      steps: [
        R`The velocity is positive, so distance is the integral of velocity: \(\displaystyle\int_{0}^{2} t\,e^{-t}\,dt\).`,
        R`Parts with \(u = t\), \(dv = e^{-t}\,dt\): \(du = dt\), \(v = -e^{-t}\).`,
        R`\(\displaystyle\int_{0}^{2} t\,e^{-t}\,dt = \Big[-te^{-t}\Big]_{0}^{2} + \int_{0}^{2} e^{-t}\,dt = -2e^{-2} + \left(1 - e^{-2}\right)\).`,
        R`Simplify: \(1 - 3e^{-2} \approx 0.594\).`,
      ],
      answer: R`\(1 - 3e^{-2} \approx 0.59\) meters`,
      visual: {
        type: 'plot',
        x: [0, 5],
        y: [0, 0.45],
        fns: [{ f: (t) => t * Math.exp(-t), label: 'v = t·e⁻ᵗ' }],
        shade: [{ f: (t) => t * Math.exp(-t), from: 0, to: 2 }],
        axisLabels: ['t (s)', 'v (m/s)'],
        alt: 'Graph of the velocity t times e to the minus t. It rises from 0 to a peak near t = 1 and then decays. The area under the curve from t = 0 to t = 2 is shaded; it equals the distance travelled, about 0.59 meters.',
      },
    },
  ],

  models: [
    {
      id: 'linear-times-exponential',
      title: 'Integrate (ax + b)·e^(kx)',
      intro: 'Choose the linear factor and the rate k in the exponent. Every step uses your numbers.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x)', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'b', label: 'b (constant)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'k', label: 'k (in the exponent)', type: 'int', min: -5, max: 5, value: 3 },
      ],
      compute({ a, b, k }) {
        if (k === 0) return { error: 'With k = 0 the exponential factor is just 1, so there is nothing to integrate by parts. Choose a non-zero k.' };
        if (a === 0 && b === 0) return { error: 'With a = 0 and b = 0 the integrand is 0. Choose a non-zero a or b.' };
        const E = ekx(k);
        const lin = linear(a, b);
        if (a === 0) {
          return {
            problem: R`\(\displaystyle\int ${terms([[b, E]])}\,dx\)`,
            steps: [R`With \(a = 0\) there is no factor of \(x\), so integration by parts is not needed.`, R`Integrating \(${E}\) divides by \(${k}\).`],
            answer: R`\(${terms([[frac(b, k), E]])} + C\)`,
          };
        }
        return {
          problem: R`\(\displaystyle\int (${lin})\,${E}\,dx\)`,
          steps: [
            R`LIATE: the algebraic factor is \(u\). Let \(u = ${lin}\) and \(dv = ${E}\,dx\).`,
            R`Differentiate and integrate: \(du = ${a}\,dx\) and \(v = ${terms([[frac(1, k), E]])}\).`,
            R`\(uv = ${terms([[frac(1, k), `(${lin})${E}`]])}\).`,
            R`\(\displaystyle\int v\,du = \int ${terms([[frac(a, k), E]])}\,dx = ${terms([[frac(a, k * k), E]])}\).`,
            R`Subtract: \(uv - \displaystyle\int v\,du = ${terms([[frac(1, k), `(${lin})${E}`]])} - ${par(terms([[frac(a, k * k), E]]))}\).`,
            R`Expand the bracket and collect the \(${E}\) terms: their coefficient is \(${frac(b, k).tex()} - ${par(frac(a, k * k).tex())} = ${frac(b * k - a, k * k).tex()}\).`,
          ],
          answer: R`\(${terms([[frac(a, k), `x${E}`], [frac(b * k - a, k * k), E]])} + C\)`,
        };
      },
    },
    {
      id: 'power-times-log',
      title: 'Integrate xⁿ·ln x',
      intro: 'Choose the power of x. Negative powers work too, and n = −1 is a special case.',
      inputs: [{ name: 'n', label: 'Power n', type: 'int', min: -5, max: 6, value: 2 }],
      compute({ n }) {
        const xn = power('x', n);
        const problem = n === 0 ? R`\(\displaystyle\int \ln x\,dx\)` : R`\(\displaystyle\int ${xn}\ln x\,dx\)`;
        if (n === -1) {
          return {
            problem,
            steps: [
              R`Here \(x^{-1} = \frac{1}{x}\) is exactly the derivative of \(\ln x\), so substitution is the right tool, not parts.`,
              R`Let \(w = \ln x\), \(dw = \frac{1}{x}\,dx\). The integral becomes \(\displaystyle\int w\,dw = \frac{w^{2}}{2}\).`,
            ],
            answer: R`\(\frac{1}{2}(\ln x)^{2} + C\)`,
          };
        }
        const m = n + 1;
        const up = m === 1 ? 'x' : `x^{${m}}`;
        return {
          problem,
          steps: [
            R`A logarithm comes first in LIATE: \(u = \ln x\) and \(dv = ${n === 0 ? '' : `${xn}\\,`}dx\).`,
            R`Then \(du = \frac{1}{x}\,dx\) and \(v = ${terms([[frac(1, m), up]])}\) (power rule: divide by \(${n} + 1 = ${m}\)).`,
            R`\(uv = ${terms([[frac(1, m), `${up}\\ln x`]])}\).`,
            R`\(\displaystyle\int v\,du = \int ${terms([[frac(1, m), up]])}\cdot\frac{1}{x}\,dx = \int ${terms([[frac(1, m), n === 0 ? '' : xn]])}\,dx = ${terms([[frac(1, m * m), up]])}\).`,
            R`Subtract: \(uv - \displaystyle\int v\,du\).`,
          ],
          answer: R`\(${terms([[frac(1, m), `${up}\\ln x`], [frac(-1, m * m), up]])} + C\)`,
        };
      },
    },
    {
      id: 'amount-from-rate',
      title: 'Word problem: how much medicine is absorbed?',
      word: true,
      intro: 'A rate of the form A·t·e^(−kt) rises, peaks and fades. Change the numbers and see the amount absorbed.',
      inputs: [
        { name: 'A', label: 'A (strength of the dose)', type: 'int', min: 1, max: 20, value: 6 },
        { name: 'k', label: 'k (how fast it fades)', type: 'number', min: 0.25, max: 3, step: 0.25, value: 1 },
        { name: 'T', label: 'T (hours)', type: 'number', min: 0.5, max: 10, step: 0.5, value: 3 },
      ],
      compute({ A, k, T }) {
        const ek = k === 1 ? 'e^{-t}' : `e^{-${num(k)}t}`;
        const At = terms([[A, 't']]);
        const r = (t) => A * t * Math.exp(-k * t);
        const eT = Math.exp(-k * T);
        const uv = (-A * T * eT) / k;
        const rest = (A / (k * k)) * (1 - eT);
        const total = uv + rest;
        const peak = r(1 / k);
        const xMax = Math.max(T * 1.25, 4 / k);
        const p3 = { places: 3 };
        return {
          problem: R`A medicine enters the bloodstream at a rate of \(r(t) = ${At}\,${ek}\) mg per hour. How much enters during the first ${num(T)} hours?`,
          steps: [
            R`A rate integrated over time gives an amount: \(\displaystyle\int_{0}^{${num(T)}} ${At}\,${ek}\,dt\).`,
            R`Parts with \(u = ${At}\) and \(dv = ${ek}\,dt\): \(du = ${dxOf(A, 't')}\) and \(v = -${k === 1 ? '' : `${num(1 / k, { places: 4 })}\\,`}${ek}\).`,
            R`\(\Big[uv\Big]_{0}^{${num(T)}} = -${num(A / k, { places: 4 })}\cdot${num(T)}\cdot e^{-${num(k * T, p3)}} - 0 \approx ${num(uv, p3)}\).`,
            R`\(-\displaystyle\int_{0}^{${num(T)}} v\,du = ${num(A / k, { places: 4 })}\int_{0}^{${num(T)}} ${ek}\,dt = ${num(A / (k * k), { places: 4 })}\left(1 - e^{-${num(k * T, p3)}}\right) \approx ${num(rest, p3)}\).`,
            R`Add the two parts: \(${num(uv, p3)} + ${num(rest, p3)} \approx ${num(total, p3)}\).`,
          ],
          answer: R`About \(${num(total, { places: 2 })}\) mg`,
          note: R`If you waited forever, the total absorbed would approach \(\frac{A}{k^{2}} = ${num(A / (k * k), p3)}\) mg.`,
          visual: {
            type: 'plot',
            x: [0, xMax],
            y: [0, peak * 1.2],
            fns: [{ f: r }],
            shade: [{ f: r, from: 0, to: T }],
            axisLabels: ['t (h)', 'r (mg/h)'],
            alt: `Graph of the absorption rate. It rises from 0, peaks at t = ${num(1 / k, { places: 2 })} hours and then fades. The area under the curve from 0 to ${num(T)} hours is shaded: about ${num(total, { places: 2 })} mg.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyChooseU, easyFindV, easyBasicProduct],
    medium: [mediumLinearExp, mediumLinearTrig, mediumPowerLn, mediumLogAlone, mediumWordDose],
    hard: [hardTabular, hardDefinite, hardLnAwkward, hardWordCart],
    challenge: [challengeCyclic, challengeTable, challengeSecondDerivative, challengeDefiniteBank],
  },
};
