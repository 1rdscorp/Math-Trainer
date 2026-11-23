import { R, q, frac, num, txt, gcd, plural, person, linear, terms, signed, paren, round, isSquare, simplifySqrt, sqrtTex, checkEqual, checkRoots, checkAll } from '../../lib/index.js';

const M = (tex) => `\\(${tex}\\)`;
const S = simplifySqrt;
const SQFREE = [2, 3, 5, 6, 7, 10, 11];
// c√r as LaTeX and as a number (r square-free; r = 1 gives the plain number).
const RT = (c, r) => ({ tex: r === 1 ? num(c) : `${c === 1 ? '' : c === -1 ? '-' : num(c)}\\sqrt{${r}}`, v: c * Math.sqrt(r) });
// p√r / d in lowest terms (d > 0), with the minus sign in front of the fraction.
function RF(p, r, d) {
  const g = gcd(Math.abs(p), d);
  const [pp, dd] = [p / g, d / g];
  if (dd === 1) return RT(pp, r);
  return { tex: `${pp < 0 ? '-' : ''}\\frac{${RT(Math.abs(pp), r).tex}}{${dd}}`, v: (pp * Math.sqrt(r)) / dd };
}
// √n simplified, as { tex, v }.
const SQ = (n) => ({ tex: sqrtTex(n), v: S(n).coef * Math.sqrt(S(n).rad) });
// Is v a fraction with a small denominator? (Used by checks to tell rational values from irrational ones.)
const looksRational = (v) => {
  for (let d = 1; d <= 500; d++) if (Math.abs(v * d - Math.round(v * d)) < 1e-8) return true;
  return false;
};
/**
 * Wrong answers from candidates { tex, v, why?, form? }. A candidate equal in value to the right answer
 * (or to an earlier candidate) is dropped, unless it is declared a form slip. v: null skips the test.
 */
function wrongs(right, cands, wrap = M) {
  const seen = [right];
  const out = [];
  for (const c of cands) {
    if (!c) continue;
    const same = c.v != null && seen.some((s) => Math.abs(s - c.v) < 1e-9);
    if (c.form) {
      if (c.why && Math.abs(c.v - right) < 1e-9) out.push({ value: wrap(c.tex), why: c.why, form: true });
      continue;
    }
    if (same) continue;
    if (c.v != null) seen.push(c.v);
    out.push(c.why ? { value: wrap(c.tex), why: c.why } : wrap(c.tex));
  }
  return out;
}

// ───────────── Easy ─────────────

function easyRoot(rng) {
  const kind = rng.pick(['sqrt', 'sqrt', 'cbrt', 'half', 'third']);
  if (kind === 'sqrt' || kind === 'half') {
    const n = rng.int(2, 15);
    const N = n * n;
    const shown = kind === 'sqrt' ? `\\sqrt{${N}}` : `${N}^{\\frac{1}{2}}`;
    return q({
      prompt: R`Evaluate \(${shown}\).`,
      correct: n,
      wrong: [
        { value: frac(N, 2), why: kind === 'half' ? R`The exponent \(\frac{1}{2}\) means a square root, not multiplying by \(\frac{1}{2}\). Find the number whose square is \(${N}\).` : R`A square root is not half of the number. Find the number that, multiplied by itself, gives \(${N}\).` },
        { value: -n, why: R`\((${-n})^2\) is also \(${N}\), but the symbol \(\sqrt{\;}\) means the nonnegative square root.` },
      ],
      solution: [
        ...(kind === 'half' ? [R`An exponent of \(\frac{1}{2}\) means a square root: \(${N}^{\frac{1}{2}} = \sqrt{${N}}\).`] : []),
        R`\(${n}^2 = ${N}\), and \(${n}\) is not negative, so \(\sqrt{${N}} = ${n}\).`,
      ],
      rule: 0, skill: kind === 'half' ? 'fractional exponents' : 'square roots',
      check: () => checkEqual(N ** 0.5, n),
    });
  }
  const n = kind === 'third' ? rng.int(2, 5) : rng.int(2, 6) * rng.sign();
  const N = n ** 3;
  const shown = kind === 'cbrt' ? `\\sqrt[3]{${N}}` : `${N}^{\\frac{1}{3}}`;
  return q({
    prompt: R`Evaluate \(${shown}\).`,
    correct: n,
    wrong: [
      { value: frac(N, 3), why: kind === 'third' ? R`The exponent \(\frac{1}{3}\) means a cube root, not dividing by 3. Find the number whose cube is \(${N}\).` : R`A cube root is not a third of the number. Find the number that, used three times as a factor, gives \(${N}\).` },
      { value: -n, why: n < 0 ? R`A negative number cubed stays negative: \(${paren(n)}^3 = ${N}\), so the cube root of \(${N}\) is negative.` : R`\((${-n})^3 = ${-N}\), not \(${N}\): an odd power keeps the sign.` },
      n * n,
    ],
    solution: [
      ...(kind === 'third' ? [R`An exponent of \(\frac{1}{3}\) means a cube root: \(${N}^{\frac{1}{3}} = \sqrt[3]{${N}}\).`] : []),
      R`\(${paren(n)}^3 = ${paren(n)} \cdot ${paren(n)} \cdot ${paren(n)} = ${N}\).`,
      R`So the cube root of \(${N}\) is \(${n}\).`,
    ],
    rule: 0, skill: kind === 'third' ? 'fractional exponents' : 'cube roots',
    check: () => checkEqual(Math.cbrt(N), n),
  });
}

// Numbers for "which is rational / irrational" questions: { tex, v, why } where `why` explains the number's type.
const RATIONAL = {
  square(rng) { const k = rng.int(2, 12); return { tex: `\\sqrt{${k * k}}`, v: k, why: R`\(\sqrt{${k * k}} = ${k}\), a whole number, so it is rational.` }; },
  cube(rng) { const k = rng.int(2, 5); return { tex: `\\sqrt[3]{${k ** 3}}`, v: k, why: R`\(\sqrt[3]{${k ** 3}} = ${k}\), because \(${k}^3 = ${k ** 3}\). That is rational.` }; },
  fraction(rng) { const f = frac(rng.int(1, 8), rng.int(2, 9)); return f.isInt() ? null : { tex: f.tex(), v: f.value, why: 'A fraction of two integers is rational by definition.' }; },
  decimal(rng) { const d = rng.pick([0.25, 0.4, 1.5, 2.75, 3.125, 0.6, 4.2]); return { tex: num(d), v: d, why: R`A decimal that ends is a fraction: \(${num(d)} = ${frac(Math.round(d * 1000), 1000).tex()}\). It is rational.` }; },
  repeating(rng) { const d = rng.int(1, 8); return { tex: `0.\\overline{${d}}`, v: d / 9, why: R`A repeating decimal is rational: \(0.\overline{${d}} = ${frac(d, 9).tex()}\).` }; },
};
const IRRATIONAL = {
  root(rng) { const n = rng.pick([2, 3, 5, 6, 7, 8, 10, 12, 15, 18, 20, 24, 27, 30, 32, 40, 45, 50]); return { tex: `\\sqrt{${n}}`, v: Math.sqrt(n), why: R`\(${n}\) is not a perfect square, so \(\sqrt{${n}}\) is irrational: its decimal never ends or repeats.` }; },
  pi() { return { tex: '\\pi', v: Math.PI, why: R`\(\pi\) is irrational: its decimal never ends or repeats. \(3.14\) is only an approximation.` }; },
  cubeRoot(rng) { const n = rng.pick([2, 3, 4, 5, 6, 7, 9, 10, 12, 16, 20, 25]); return { tex: `\\sqrt[3]{${n}}`, v: Math.cbrt(n), why: R`\(${n}\) is not a perfect cube, so \(\sqrt[3]{${n}}\) is irrational.` }; },
  sum(rng) { const [p, r] = [rng.int(1, 9), rng.pick(SQFREE)]; return { tex: `${p} + \\sqrt{${r}}`, v: p + Math.sqrt(r), why: R`\(\sqrt{${r}}\) is irrational, and a rational number plus an irrational number is always irrational.` }; },
  product(rng) { const [p, r] = [rng.int(2, 9), rng.pick(SQFREE)]; return { tex: `${p}\\sqrt{${r}}`, v: p * Math.sqrt(r), why: R`\(\sqrt{${r}}\) is irrational, and a nonzero rational number times an irrational number is always irrational.` }; },
};

function easyIrrational(rng) {
  const wantIrr = rng.bool();
  const [mine, other] = wantIrr ? [IRRATIONAL, RATIONAL] : [RATIONAL, IRRATIONAL];
  const right = mine[rng.pick(Object.keys(mine))](rng);
  const rest = rng.sample(Object.keys(other), 3).map((k) => other[k](rng));
  const vals = [right, ...rest].map((c) => c && c.v);
  if (rest.includes(null) || !right || new Set(vals.map((v) => v.toFixed(9))).size < 4) return easyIrrational(rng);
  return q({
    prompt: `Which number is **${wantIrr ? 'irrational' : 'rational'}**?`,
    correct: M(right.tex),
    wrong: rest.map((c) => ({ value: M(c.tex), why: c.why })),
    solution: [
      'A rational number can be written as a fraction of two integers; its decimal ends or repeats. An irrational number cannot; its decimal goes on forever without repeating.',
      right.why,
      `Each of the other three numbers is ${wantIrr ? 'rational' : 'irrational'}.`,
    ],
    rule: 1, skill: 'rational or irrational',
    check: () => (looksRational(right.v) === !wantIrr && rest.every((c) => looksRational(c.v) === wantIrr) ? true : 'a number is in the wrong group'),
  });
}

function easySimplify(rng) {
  const r = rng.pick(SQFREE);
  const k = rng.int(2, r <= 3 ? 10 : 6);
  const n = k * k * r;
  const j = [2, 3, 5].find((d) => k % d === 0 && d !== k); // a partial factor, for "not finished" answers
  const right = RT(k, r);
  return q({
    prompt: R`Simplify \(\sqrt{${n}}\).`,
    correct: M(right.tex),
    wrong: wrongs(right.v, [
      j && { tex: `${j}\\sqrt{${(k / j) ** 2 * r}}`, v: right.v, form: true, why: R`This is equal to \(\sqrt{${n}}\), but \(${(k / j) ** 2 * r}\) still has the perfect-square factor \(${(k / j) ** 2}\). Take out the largest perfect square, \(${k * k}\).` },
      { tex: `${k * k}\\sqrt{${r}}`, v: k * k * Math.sqrt(r), why: R`The perfect square \(${k * k}\) comes out of the root as its square root, \(\sqrt{${k * k}} = ${k}\).` },
      n % 2 === 0 && !isSquare(n / 2) && { tex: `2\\sqrt{${n / 2}}`, v: 2 * Math.sqrt(n / 2), why: R`Only a perfect-square factor can come out. \(2\) is not a perfect square, so \(\sqrt{2 \cdot ${n / 2}}\) is not \(2\sqrt{${n / 2}}\).` },
      S(k).coef === 1 && r !== k && { tex: `${r}\\sqrt{${k}}`, v: r * Math.sqrt(k) },
      { tex: `${k + 1}\\sqrt{${r}}`, v: (k + 1) * Math.sqrt(r) },
      { tex: `${k}\\sqrt{${r + 1}}`, v: k * Math.sqrt(r + 1) },
    ]),
    solution: [
      R`Look for the largest perfect square that divides \(${n}\): it is \(${k * k}\), and \(${n} = ${k * k} \cdot ${r}\).`,
      R`\(\sqrt{${n}} = \sqrt{${k * k}} \cdot \sqrt{${r}} = ${right.tex}\).`,
      R`Check with decimals: \(\sqrt{${n}} \approx ${num(Math.sqrt(n), { places: 3 })}\) and \(${k} \times ${num(Math.sqrt(r), { places: 4 })} \approx ${num(right.v, { places: 3 })}\). ✓`,
    ],
    rule: 2, skill: 'simplifying roots',
    check: () => checkEqual(right.v, Math.sqrt(n)),
  });
}

function easySquareSide(rng) {
  const [thing, unit, lo, hi] = rng.pick([['garden', 'm', 3, 20], ['patio', 'm', 3, 9], ['rug', 'ft', 3, 12], ['quilt', 'in', 30, 90], ['floor tile', 'cm', 10, 60], ['vegetable plot', 'ft', 4, 25]]);
  const s = rng.int(lo, hi);
  const A = s * s;
  const sqUnit = { m: 'square metres', ft: 'square feet', in: 'square inches', cm: 'square centimetres' }[unit];
  return q({
    prompt: `${person(rng)} has a square ${thing} with an area of ${txt(A)} ${sqUnit}. How long is each side?`,
    correct: s,
    unit,
    wrong: [
      { value: A / 4, why: 'Dividing by 4 shares out a perimeter among four sides. The area of a square is side × side, so the side is the square root of the area.' },
      { value: A / 2, why: R`Side × side is the area, so the side is \(\sqrt{${A}}\), not half of \(${A}\).` },
    ],
    solution: [
      R`The area of a square is \(s^2\), so \(s^2 = ${A}\).`,
      R`The side is a length, so take the positive square root: \(s = \sqrt{${A}} = ${s}\), because \(${s}^2 = ${A}\).`,
      `Each side is ${s} ${unit}.`,
    ],
    rule: 5, skill: 'roots in context',
    check: () => checkEqual(Math.sqrt(A), s),
  });
}

// ───────────── Medium ─────────────

const NONSQ = [2, 3, 5, 6, 7, 8, 10, 12, 14, 15, 18, 20, 21, 24, 27, 28, 30];

function mediumMultiply(rng) {
  const mode = rng.pick(['two', 'coef', 'quot']);
  if (mode === 'quot') {
    const b = rng.pick([2, 3, 5, 6, 7]);
    const m = rng.pick([4, 8, 9, 12, 16, 18, 20, 25, 27, 32, 36, 45, 50, 49]);
    const a = b * m;
    const right = SQ(m);
    return q({
      prompt: R`Simplify \(\dfrac{\sqrt{${a}}}{\sqrt{${b}}}\).`,
      correct: M(right.tex),
      wrong: wrongs(right.v, [
        S(m).coef > 1 && S(m).rad > 1 && { tex: `\\sqrt{${m}}`, v: right.v, form: true, why: R`This is equal, but \(${m}\) has the perfect-square factor \(${S(m).coef ** 2}\), so the root can be simplified.` },
        { tex: sqrtTex(a - b), v: Math.sqrt(a - b), why: R`\(\dfrac{\sqrt{a}}{\sqrt{b}} = \sqrt{\dfrac{a}{b}}\): divide the numbers under the roots, do not subtract them.` },
        { tex: num(m), v: m, why: R`\(${a} \div ${b} = ${m}\) is still under a square root: the answer is \(\sqrt{${m}}\).` },
        { tex: `\\frac{${sqrtTex(a)}}{${b}}`, v: Math.sqrt(a) / b },
      ]),
      solution: [
        R`Divide under one root: \(\dfrac{\sqrt{${a}}}{\sqrt{${b}}} = \sqrt{\dfrac{${a}}{${b}}} = \sqrt{${m}}\).`,
        S(m).rad === 1 ? R`\(${m}\) is a perfect square: \(\sqrt{${m}} = ${right.tex}\).` : R`Simplify: \(\sqrt{${m}} = \sqrt{${S(m).coef ** 2}} \cdot \sqrt{${S(m).rad}} = ${right.tex}\).`,
      ],
      rule: 3, skill: 'multiplying and dividing roots',
      check: () => checkEqual(right.v, Math.sqrt(a) / Math.sqrt(b)),
    });
  }
  const [a, b] = rng.sample(NONSQ, 2);
  const p = a * b;
  const { coef, rad } = S(p);
  if (coef === 1) return mediumMultiply(rng);
  const [c, d] = mode === 'coef' ? [rng.int(2, 6), rng.int(2, 6)] : [1, 1];
  const C = c * d;
  const right = RT(C * coef, rad);
  const shown = mode === 'coef' ? `(${c}\\sqrt{${a}})(${d}\\sqrt{${b}})` : `\\sqrt{${a}} \\cdot \\sqrt{${b}}`;
  return q({
    prompt: R`Multiply and simplify: \(${shown}\)`,
    correct: M(right.tex),
    wrong: wrongs(right.v, [
      { tex: `${C === 1 ? '' : C}\\sqrt{${p}}`, v: right.v, form: true, why: R`This is equal, but \(${p}\) has the perfect-square factor \(${coef * coef}\). Take it out: \(\sqrt{${p}} = ${sqrtTex(p)}\).` },
      mode === 'coef' && { tex: RT((c + d) * coef, rad).tex, v: RT((c + d) * coef, rad).v, why: R`The numbers in front multiply: \(${c} \cdot ${d} = ${C}\).` },
      mode === 'coef' && { tex: RT(C, rad).tex, v: RT(C, rad).v, why: R`\(\sqrt{${p}} = ${sqrtTex(p)}\): the \(${coef}\) that comes out of the root multiplies the \(${C}\) in front.` },
      mode === 'two' && { tex: sqrtTex(a + b), v: Math.sqrt(a + b), why: R`\(\sqrt{a} \cdot \sqrt{b} = \sqrt{ab}\): multiply the numbers under the roots, do not add them.` },
      mode === 'two' && { tex: num(p), v: p, why: R`The product is still under a square root: \(\sqrt{${a}} \cdot \sqrt{${b}} = \sqrt{${p}}\), not \(${p}\).` },
      { tex: RT(C * coef * coef, rad).tex, v: RT(C * coef * coef, rad).v, why: R`\(${coef * coef}\) comes out of the root as \(\sqrt{${coef * coef}} = ${coef}\).` },
    ]),
    solution: [
      mode === 'coef' ? R`Multiply the numbers in front and the numbers under the roots: \(${c} \cdot ${d} = ${C}\) and \(\sqrt{${a}} \cdot \sqrt{${b}} = \sqrt{${p}}\), giving \(${C}\sqrt{${p}}\).` : R`Multiply under one root: \(\sqrt{${a}} \cdot \sqrt{${b}} = \sqrt{${p}}\).`,
      rad === 1 ? R`\(${p}\) is a perfect square: \(\sqrt{${p}} = ${coef}\).` : R`Take out the largest perfect square: \(${p} = ${coef * coef} \cdot ${rad}\), so \(\sqrt{${p}} = ${coef}\sqrt{${rad}}\).`,
      R`So the product is \(${right.tex}\).`,
    ],
    rule: 3, skill: 'multiplying and dividing roots',
    check: () => checkEqual(right.v, c * Math.sqrt(a) * d * Math.sqrt(b)),
  });
}

function mediumAddLike(rng) {
  const r = rng.pick([2, 3, 5, 6, 7]);
  const [p, qq] = rng.sample([1, 2, 3, 4, 5], 2);
  const [a, b] = [rng.int(1, 4), rng.int(1, 4)];
  const s = rng.pick([1, -1]);
  const total = a * p + s * b * qq;
  if (total === 0) return mediumAddLike(rng);
  const shown = `${a === 1 ? '' : a}\\sqrt{${p * p * r}} ${s > 0 ? '+' : '-'} ${b === 1 ? '' : b}\\sqrt{${qq * qq * r}}`;
  const right = RT(total, r);
  const sep = (c, k) => (k === 1 ? RT(c, r).tex : `${c === 1 ? '' : c}\\sqrt{${k * k * r}}`);
  const simpl = (c, k) => (k === 1 ? R`\(${RT(c, r).tex}\) is already simplified` : c === 1 ? R`\(${sep(c, k)} = ${RT(k, r).tex}\)` : R`\(${sep(c, k)} = ${c} \cdot ${k}\sqrt{${r}} = ${RT(c * k, r).tex}\)`);
  const lin = (c) => (c !== 0 ? RT(c, r) : null);
  const under = s > 0 ? (p * p + qq * qq) * r : (p * p - qq * qq) * r;
  return q({
    prompt: R`Simplify \(${shown}\).`,
    correct: M(right.tex),
    wrong: wrongs(right.v, [
      under > 0 && a + s * b !== 0 && { tex: `${a + s * b === 1 ? '' : a + s * b === -1 ? '-' : a + s * b}\\sqrt{${under}}`, v: (a + s * b) * Math.sqrt(under), why: R`Like radicals combine by ${s > 0 ? 'adding' : 'subtracting'} the numbers in front; the number under the root stays the same. Simplify each root first so they match.` },
      lin(a + s * b) && { ...lin(a + s * b), why: R`Simplify each root first, and keep what comes out: ${simpl(a, p)} and ${simpl(b, qq)}.` },
      lin(a * p - s * b * qq) && { ...lin(a * p - s * b * qq), why: R`Keep the sign between the terms: the second term is ${s > 0 ? 'added' : 'subtracted'}.` },
      RT(-total, r),
      RT(total + 1, r),
    ]),
    solution: [
      R`Simplify each root: ${simpl(a, p)}, and ${simpl(b, qq)}.`,
      R`Now both are like radicals (multiples of \(\sqrt{${r}}\)): \(${RT(a * p, r).tex} ${s > 0 ? '+' : '-'} ${RT(b * qq, r).tex}\).`,
      R`Combine the numbers in front: \(${a * p} ${s > 0 ? '+' : '-'} ${b * qq} = ${total}\), so the answer is \(${right.tex}\).`,
    ],
    rule: 4, skill: 'adding like radicals',
    check: () => checkEqual(right.v, a * Math.sqrt(p * p * r) + s * b * Math.sqrt(qq * qq * r)),
  });
}

function mediumSolveSquare(rng) {
  const a = rng.pick([1, 1, 2, 3, 4, 5]);
  const m = rng.int(1, 6);
  const r = rng.pick([1, 2, 2, 3, 5, 6, 7]);
  if (m === 1 && r === 1) return mediumSolveSquare(rng);
  const k = m * m * r;
  const c = rng.bool(0.25) ? 0 : rng.nonzero(-20, 20);
  const d = a * k + c;
  const right = RT(m, r);
  const pm = (t) => `x = \\pm ${t}`;
  const flipped = (d + c) / a; // the slip of adding c instead of subtracting it
  const lhs = terms([[a, 'x^{2}'], [c, '']]);
  return q({
    prompt: R`Solve \(${lhs} = ${d}\). Give exact answers in simplest form.`,
    correct: M(pm(right.tex)),
    wrong: wrongs(right.v, [
      { tex: `x = ${right.tex}`, v: null, why: R`Two numbers have a square of \(${k}\): \(${right.tex}\) and its opposite. Write \(\pm\).` },
      c !== 0 && Number.isInteger(flipped) && flipped > 0 && { tex: pm(sqrtTex(flipped)), v: Math.sqrt(flipped), why: R`To undo ${c > 0 ? R`adding \(${c}\)` : R`subtracting \(${-c}\)`}, ${c > 0 ? 'subtract' : 'add'} \(${Math.abs(c)}\) on both sides.` },
      a !== 1 && { tex: pm(sqrtTex(d - c)), v: Math.sqrt(d - c), why: R`Divide both sides by \(${a}\) before taking the square root: \(x^2 = ${k}\).` },
      { tex: pm(num(k)), v: k, why: R`\(x^2 = ${k}\), so \(x\) is a square root of \(${k}\), not \(${k}\) itself.` },
      { tex: pm(RT(m + 1, r).tex), v: (m + 1) * Math.sqrt(r) },
    ]),
    solution: [
      ...(c === 0 ? [] : [R`${c > 0 ? 'Subtract' : 'Add'} \(${Math.abs(c)}\) on both sides: \(${terms([[a, 'x^{2}']])} = ${a * k}\).`]),
      ...(a === 1 ? [] : [R`Divide both sides by \(${a}\): \(x^2 = ${k}\).`]),
      R`Take the square root of both sides, remembering both signs: \(x = \pm\sqrt{${k}}\).`,
      r === 1 ? R`\(${k}\) is a perfect square, so \(x = \pm ${m}\).` : m === 1 ? R`\(\sqrt{${k}}\) is already in simplest form: \(x = \pm\sqrt{${k}}\), about \(\pm ${num(right.v, { places: 2 })}\).` : R`Simplify: \(\sqrt{${k}} = ${right.tex}\), so \(x = \pm ${right.tex}\) (about \(\pm ${num(right.v, { places: 2 })}\)).`,
    ],
    rule: 5, skill: 'solving x² = k',
    check: () => checkRoots((x) => a * x * x + c - d, [right.v, -right.v]),
  });
}

function mediumDiagonal(rng) {
  const square = rng.bool(0.35);
  const name = person(rng);
  let l, w, u, story;
  if (square) {
    l = w = rng.int(2, 15);
    [u, story] = rng.pick([
      ['cm', `A square floor tile has sides of ${l} cm. How long is its diagonal, from one corner to the opposite corner?`],
      ['m', `A square park has sides of ${l} m. A straight path runs from one corner to the opposite corner. How long is the path?`],
      ['in', `${name} cuts a square of cloth with sides of ${l} in along its diagonal. How long is the cut?`],
    ]);
  } else {
    l = rng.int(3, 12);
    w = rng.int(1, l - 1);
    [u, story] = rng.pick([
      ['m', `${name} walks straight across a rectangular field from one corner to the opposite corner. The field is ${l} m long and ${w} m wide. How far does ${name} walk?`],
      ['ft', `A rectangular gate is ${l} ft wide and ${w} ft tall. A wooden brace runs from one corner to the opposite corner. How long is the brace?`],
      ['cm', `A rectangular card is ${l} cm long and ${w} cm wide. How long is its diagonal?`],
    ]);
  }
  const D = l * l + w * w;
  const right = SQ(D);
  const unitWrap = (tex) => `\\(${tex}\\) ${u}`;
  return q({
    prompt: `${story} Give the exact length in simplest form.`,
    correct: unitWrap(right.tex),
    wrong: wrongs(right.v, [
      { tex: num(l + w), v: l + w, why: R`The diagonal is a shortcut, so it is shorter than going along two sides. Use the Pythagorean theorem: \(d^2 = ${l}^2 + ${w}^2\).` },
      !isSquare(l + w) && { tex: sqrtTex(l + w), v: Math.sqrt(l + w), why: R`Square each side before adding: \(d^2 = ${l * l} + ${w * w} = ${D}\).` },
      square && { tex: num(l * l), v: l * l, why: 'That is the area of the square, not the length of its diagonal.' },
      !square && { tex: sqrtTex(l * l - w * w), v: Math.sqrt(l * l - w * w), why: R`The diagonal is the hypotenuse, the longest side, so add the squares: \(${l * l} + ${w * w}\).` },
      S(D).coef > 1 && S(D).rad > 1 && { tex: `\\sqrt{${D}}`, v: right.v, form: true, why: R`This is the right length, but not in simplest form: \(${D}\) has the perfect-square factor \(${S(D).coef ** 2}\).` },
      { tex: RT(S(D).coef + 1, S(D).rad).tex, v: (S(D).coef + 1) * Math.sqrt(S(D).rad) },
    ], unitWrap),
    solution: [
      R`The diagonal and two sides form a right triangle, with the diagonal as the hypotenuse: \(d^2 = ${l}^2 + ${w}^2 = ${l * l} + ${w * w} = ${D}\).`,
      R`\(d = \sqrt{${D}}${S(D).coef > 1 && S(D).rad > 1 ? R` = \sqrt{${S(D).coef ** 2}} \cdot \sqrt{${S(D).rad}} = ${right.tex}` : S(D).rad === 1 ? R` = ${right.tex}` : ''}\).`,
      R`The length is \(${right.tex}\) ${u}${S(D).rad === 1 ? '' : R`, about \(${num(right.v, { places: 2 })}\) ${u}`}.`,
    ],
    rule: 5, skill: 'roots in context',
    visual: {
      type: 'polygon', points: [[0, 0], [l, 0], [l, w], [0, w]], sides: [`${l} ${u}`, `${w} ${u}`, '', ''], right: [0, 1, 2, 3],
      extra: [{ from: [0, 0], to: [l, w], dashed: true, label: 'd' }],
      alt: `A ${square ? 'square' : 'rectangle'} ${l} ${u} long and ${w} ${u} wide, with a dashed diagonal d from one corner to the opposite corner.`,
    },
    check: () => checkEqual(right.v, Math.hypot(l, w)),
  });
}

// ───────────── Hard ─────────────

function hardRationalize(rng) {
  const mode = rng.pick(['one', 'one', 'coef', 'root']);
  const b = rng.pick([2, 3, 5, 6, 7, 10, 11]);
  if (mode === 'root') {
    const a = rng.int(1, 12);
    if (gcd(a, b) !== 1 || isSquare(a * b)) return hardRationalize(rng);
    const { coef, rad } = S(a * b);
    const right = RF(coef, rad, b);
    return q({
      prompt: R`Simplify \(\sqrt{\dfrac{${a}}{${b}}}\) and rationalize the denominator.`,
      correct: M(right.tex),
      wrong: wrongs(right.v, [
        coef > 1 && { tex: `\\frac{\\sqrt{${a * b}}}{${b}}`, v: right.v, form: true, why: R`This is equal, but \(${a * b}\) has the perfect-square factor \(${coef * coef}\), so the root is not simplified.` },
        { tex: `\\frac{${sqrtTex(a)}}{${b}}`, v: Math.sqrt(a) / b, why: R`\(\sqrt{\dfrac{${a}}{${b}}} = \dfrac{\sqrt{${a}}}{\sqrt{${b}}}\): the bottom is \(\sqrt{${b}}\), not \(${b}\). Multiply top and bottom by \(\sqrt{${b}}\).` },
        { ...RF(coef, rad, a === 1 ? b * b : a), why: a === 1 ? R`\(\sqrt{${b}} \cdot \sqrt{${b}} = ${b}\), not \(${b * b}\).` : R`That turns the fraction upside down: it equals \(\sqrt{\dfrac{${b}}{${a}}}\).` },
        RF(coef, rad, b * b),
        RF(coef + 1, rad, b),
      ]),
      solution: [
        R`Split the root: \(\sqrt{\dfrac{${a}}{${b}}} = \dfrac{${sqrtTex(a)}}{\sqrt{${b}}}\).`,
        R`Multiply top and bottom by \(\sqrt{${b}}\): \(\dfrac{${a === 1 ? '' : `\\sqrt{${a}} \\cdot `}\sqrt{${b}}}{\sqrt{${b}} \cdot \sqrt{${b}}} = \dfrac{\sqrt{${a * b}}}{${b}}\).`,
        ...(coef > 1 ? [R`Simplify the root: \(\sqrt{${a * b}} = ${coef}\sqrt{${rad}}\), so the result is \(${right.tex}\).`] : [R`The result is \(${right.tex}\).`]),
      ],
      rule: 3, skill: 'rationalizing',
      check: () => checkEqual(right.v, Math.sqrt(a / b)),
    });
  }
  const c = mode === 'coef' ? rng.int(2, 5) : 1;
  const a = rng.int(1, mode === 'coef' ? 20 : 15);
  if (a % b === 0 && c === 1 && a === b) return hardRationalize(rng); // b/√b is just √b: fine, but too easy
  const right = RF(a, b, c * b);
  const den = c === 1 ? `\\sqrt{${b}}` : `${c}\\sqrt{${b}}`;
  const g = gcd(a, c * b);
  return q({
    prompt: R`Rationalize the denominator and simplify: \(\dfrac{${a}}{${den}}\)`,
    correct: M(right.tex),
    wrong: wrongs(right.v, [
      g > 1 && c * b / g !== 1 && { tex: `\\frac{${RT(a, b).tex}}{${c * b}}`, v: right.v, form: true, why: R`This is equal, but not simplified: \(${a}\) and \(${c * b}\) share the factor \(${g}\).` },
      g > 1 && c * b / g === 1 && { tex: `\\frac{${RT(a, b).tex}}{${c * b}}`, v: right.v, form: true, why: R`This is equal, but not simplified: \(\dfrac{${a}}{${c * b}} = ${a / (c * b)}\), so it simplifies to \(${right.tex}\).` },
      { ...RF(a, b, c), why: c === 1 ? R`Multiplying the top by \(\sqrt{${b}}\) means multiplying the bottom by \(\sqrt{${b}}\) too, which makes it \(${b}\).` : R`The bottom becomes \(${c}\sqrt{${b}} \cdot \sqrt{${b}} = ${c} \cdot ${b} = ${c * b}\), not \(${c}\).` },
      { tex: frac(a, c * b).tex(), v: a / (c * b), why: R`The top is multiplied by \(\sqrt{${b}}\) as well: it becomes \(${RT(a, b).tex}\).` },
      { ...RF(a, b, c * b * b), why: R`\(\sqrt{${b}} \cdot \sqrt{${b}} = ${b}\), not \(${b * b}\).` },
      RF(a + 1, b, c * b),
    ]),
    solution: [
      R`Multiply top and bottom by \(\sqrt{${b}}\), which does not change the value: \(\dfrac{${a} \cdot \sqrt{${b}}}{${den} \cdot \sqrt{${b}}}\).`,
      R`\(\sqrt{${b}} \cdot \sqrt{${b}} = ${b}\), so this is \(\dfrac{${RT(a, b).tex}}{${c * b}}\).`,
      g > 1 ? R`Reduce \(\dfrac{${a}}{${c * b}}\) by \(${g}\): the result is \(${right.tex}\).` : R`\(${a}\) and \(${c * b}\) share no factor, so the result is \(${right.tex}\).`,
    ],
    rule: 3, skill: 'rationalizing',
    check: () => checkEqual(right.v, a / (c * Math.sqrt(b))),
  });
}

function hardBinomial(rng) {
  if (rng.bool(0.4)) {
    const a = rng.int(1, 9);
    const b = rng.pick([2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 17, 19, 20]);
    const right = a * a - b;
    return q({
      prompt: R`Multiply: \((${a} + \sqrt{${b}})(${a} - \sqrt{${b}})\)`,
      correct: right,
      wrong: [
        { value: a * a + b, why: R`The last terms multiply to \((\sqrt{${b}})(-\sqrt{${b}}) = -${b}\).` },
        { value: a * a - b * b, why: R`\(\sqrt{${b}} \cdot \sqrt{${b}} = ${b}\), not \(${b * b}\).` },
        { value: a - b, why: R`The first terms multiply to \(${a} \cdot ${a} = ${a * a}\).` },
      ],
      solution: [
        R`Multiply each term by each term: \(${a * a} - ${a}\sqrt{${b}} + ${a}\sqrt{${b}} - \sqrt{${b}} \cdot \sqrt{${b}}\).`,
        R`The middle terms cancel, and \(\sqrt{${b}} \cdot \sqrt{${b}} = ${b}\).`,
        R`So the product is \(${a * a} - ${b} = ${right}\). Two irrational numbers have multiplied to a rational one.`,
      ],
      rule: 1, skill: 'multiplying binomials with roots',
      check: () => checkEqual(right, (a + Math.sqrt(b)) * (a - Math.sqrt(b))),
    });
  }
  const mm = rng.pick([2, 3, 5, 6, 7, 10, 11]);
  const n = rng.nonzero(-6, 6);
  const right = { tex: terms([[mm + n * n, ''], [2 * n, `\\sqrt{${mm}}`]]), v: mm + n * n + 2 * n * Math.sqrt(mm) };
  const shown = `(\\sqrt{${mm}} ${signed(n)})^{2}`;
  const tw = (c0, c1) => ({ tex: terms([[c0, ''], [c1, `\\sqrt{${mm}}`]]), v: c0 + c1 * Math.sqrt(mm) });
  return q({
    prompt: R`Expand and simplify: \(${shown}\)`,
    correct: M(right.tex),
    wrong: wrongs(right.v, [
      { tex: num(mm + n * n), v: mm + n * n, why: R`Squaring a sum is not squaring each term: \((p + q)^2 = p^2 + 2pq + q^2\). The middle term \(2 \cdot ${paren(n)} \cdot \sqrt{${mm}}\) is missing.` },
      { ...tw(mm + n * n, n), why: R`The middle term appears twice, once from each bracket: \(2 \cdot ${paren(n)} \cdot \sqrt{${mm}} = ${RT(2 * n, mm).tex}\).` },
      { ...tw(mm * mm + n * n, 2 * n), why: R`\((\sqrt{${mm}})^2 = ${mm}\), not \(${mm * mm}\).` },
      tw(mm + n * n, -2 * n),
    ]),
    solution: [
      R`Use \((p + q)^2 = p^2 + 2pq + q^2\) with \(p = \sqrt{${mm}}\) and \(q = ${n}\).`,
      R`\(p^2 = ${mm}\), \(2pq = 2 \cdot ${paren(n)} \cdot \sqrt{${mm}} = ${RT(2 * n, mm).tex}\), and \(q^2 = ${n * n}\).`,
      R`Add the whole numbers: \(${mm} + ${n * n} = ${mm + n * n}\). The result is \(${right.tex}\).`,
    ],
    rule: 4, skill: 'multiplying binomials with roots',
    check: () => checkEqual(right.v, (Math.sqrt(mm) + n) ** 2),
  });
}

function hardFallTime(rng) {
  const ft = rng.bool(0.6);
  const [G, unit, long] = ft ? [16, 'ft', 'feet'] : [5, 'm', 'metres'];
  const k = rng.pick(ft ? [2, 3, 5, 6, 7, 8, 10, 12, 18, 20] : [2, 3, 5, 6, 7, 8, 10, 12, 18, 20, 24, 27]);
  const d = G * k;
  const where = rng.pick([`from a bridge ${d} ${long} above the water`, `from the top of a cliff ${d} ${long} high`, `from a window ${d} ${long} above the ground`, `from a hot-air balloon ${d} ${long} up`]);
  const thing = rng.pick(['stone', 'ball', 'pebble', 'water balloon']);
  const exact = rng.bool();
  const t = S(k).coef * Math.sqrt(S(k).rad);
  const setup = R`A ${thing} is dropped ${where}. The distance it has fallen after \(t\) seconds is \(d = ${G}t^2\) ${long}.`;
  const steps = [
    R`The ${thing} reaches the ${where.includes('water') ? 'water' : 'ground'} when \(${G}t^2 = ${d}\).`,
    R`Divide by \(${G}\): \(t^2 = ${k}\). Time is positive, so \(t = \sqrt{${k}}\).`,
  ];
  // An independent check: step the time forward until the fall reaches d.
  const byStepping = () => { let s = 0; while (G * s * s < d) s += 1e-4; return s; };
  if (exact) {
    const right = SQ(k);
    const wrapS = (tex) => `\\(${tex}\\) seconds`;
    return q({
      prompt: `${setup} How long does it take to fall? Give the exact time in simplest form.`,
      correct: wrapS(right.tex),
      wrong: wrongs(right.v, [
        { ...SQ(d), why: R`Divide by \(${G}\) first: \(t^2 = ${k}\). Then take the square root.` },
        { tex: num(k), v: k, why: R`\(${k}\) is \(t^2\). Take its square root to find \(t\).` },
        { ...RF(S(d).coef, S(d).rad, G), why: R`Dividing by \(${G}\) after taking the root is not the same: \(\sqrt{${d}} \div ${G}\) is not \(\sqrt{${d} \div ${G}}\).` },
        { tex: num(k / 2), v: k / 2 },
      ], wrapS),
      solution: [...steps, S(k).coef > 1 ? R`Simplify: \(\sqrt{${k}} = ${right.tex}\) seconds, about \(${num(t, { places: 2 })}\) s.` : R`\(\sqrt{${k}}\) is already simplified: about \(${num(t, { places: 2 })}\) s.`],
      rule: 5, skill: 'roots in context',
      check: () => checkAll(checkEqual(G * right.v ** 2, d), Math.abs(byStepping() - right.v) < 1e-3 || 'stepping disagrees'),
    });
  }
  const right = round(t, 1);
  return q({
    prompt: `${setup} How long does it take to fall, to the nearest tenth of a second?`,
    correct: right,
    unit: 's',
    wrong: [
      { value: round(Math.sqrt(d), 1), why: R`Divide by \(${G}\) before taking the square root: \(t^2 = ${k}\).` },
      { value: k, why: R`\(${k}\) is \(t^2\). Take its square root to find \(t\).` },
      { value: round(Math.sqrt(d) / G, 1), why: R`Taking the root and then dividing by \(${G}\) is not the same as dividing first: \(\sqrt{${d}} \div ${G} \ne \sqrt{${d} \div ${G}}\).` },
    ],
    solution: [...steps, R`\(\sqrt{${k}} \approx ${num(t, { places: 3 })}\), which rounds to \(${num(right)}\) seconds.`],
    rule: 5, skill: 'roots in context',
    check: () => checkEqual(round(byStepping(), 1), right),
  });
}

// ───────────── Challenge ─────────────

const RAT_PAIRS = [[2, 8], [3, 12], [2, 18], [3, 27], [5, 20], [2, 32], [6, 24], [7, 28], [5, 45], [3, 48], [2, 50]];
function challengeClosure(rng) {
  const wantRat = rng.bool();
  const rat = [
    () => { const [a, b] = rng.pick(RAT_PAIRS); return { tex: `\\sqrt{${a}} \\cdot \\sqrt{${b}}`, v: Math.sqrt(a * b), why: R`\(\sqrt{${a}} \cdot \sqrt{${b}} = \sqrt{${a * b}} = ${Math.sqrt(a * b)}\): two irrational numbers can multiply to a rational one.` }; },
    () => { const [b, a] = rng.pick(RAT_PAIRS); return { tex: `\\frac{\\sqrt{${a}}}{\\sqrt{${b}}}`, v: Math.sqrt(a / b), why: R`\(\dfrac{\sqrt{${a}}}{\sqrt{${b}}} = \sqrt{${a / b}} = ${Math.sqrt(a / b)}\), which is rational.` }; },
    () => { const r = rng.pick(SQFREE); const p = rng.int(2, 6); return { tex: `${p}\\sqrt{${r}} - \\sqrt{${r * p * p}}`, v: 0, why: R`\(\sqrt{${r * p * p}} = ${p}\sqrt{${r}}\), so the difference is \(0\), which is rational.` }; },
    () => { const r = rng.pick(SQFREE); const p = rng.int(1, 9); return { tex: `(${p} + \\sqrt{${r}}) - \\sqrt{${r}}`, v: p, why: R`The two copies of \(\sqrt{${r}}\) cancel, leaving \(${p}\), which is rational.` }; },
  ];
  const irr = [
    () => { const r = rng.pick(SQFREE); const p = rng.int(1, 9); return { tex: `${p} + \\sqrt{${r}}`, v: p + Math.sqrt(r), why: R`A rational number plus an irrational number is always irrational. (If \(${p} + \sqrt{${r}}\) were rational, then \(\sqrt{${r}}\), which is that number minus \(${p}\), would be rational too.)` }; },
    () => { const r = rng.pick(SQFREE); const f = frac(rng.pick([1, 2, 3, 5, 7]), rng.pick([2, 3, 4])); if (f.isInt()) return irr[0](); return { tex: `${f.tex()}\\sqrt{${r}}`, v: f.value * Math.sqrt(r), why: R`A nonzero rational number times an irrational number is always irrational.` }; },
    () => { const [a, b] = rng.pick([[2, 6], [3, 6], [2, 10], [3, 15], [2, 14], [5, 10], [6, 10], [3, 21]]); return { tex: `\\sqrt{${a}} \\cdot \\sqrt{${b}}`, v: Math.sqrt(a * b), why: R`\(\sqrt{${a}} \cdot \sqrt{${b}} = \sqrt{${a * b}} = ${sqrtTex(a * b)}\), which is still irrational.` }; },
    () => { const [a, b] = rng.sample([2, 3, 5, 7], 2); return { tex: `\\sqrt{${a}} + \\sqrt{${b}}`, v: Math.sqrt(a) + Math.sqrt(b), why: R`These are not like radicals, and the sum is irrational: its square is \((\sqrt{${a}} + \sqrt{${b}})^2 = ${a + b} + 2\sqrt{${a * b}}\), which is irrational, and the square of a rational number would be rational.` }; },
  ];
  const [mine, other] = wantRat ? [rat, irr] : [irr, rat];
  const right = rng.pick(mine)();
  const rest = rng.sample(other, 3).map((f) => f());
  if (new Set([right, ...rest].map((c) => c.v.toFixed(9))).size < 4) return challengeClosure(rng);
  return q({
    prompt: `Which expression has ${wantRat ? 'a **rational**' : 'an **irrational**'} value?`,
    correct: M(right.tex),
    wrong: rest.map((c) => ({ value: M(c.tex), why: c.why })),
    solution: [
      'Simplify each expression before deciding. Rational plus irrational is irrational, and nonzero rational times irrational is irrational, but two irrational numbers can combine to give a rational number.',
      right.why,
      `The other three are ${wantRat ? 'irrational' : 'rational'}.`,
    ],
    rule: 1, skill: 'rational or irrational',
    check: () => (looksRational(right.v) === wantRat && rest.every((c) => looksRational(c.v) === !wantRat) ? true : 'an expression is in the wrong group'),
  });
}

function challengeWorkBack(rng) {
  if (rng.bool()) {
    const k = rng.int(2, 9);
    const r = rng.pick(SQFREE);
    const n = k * k * r;
    return q({
      prompt: R`Write \(${k}\sqrt{${r}}\) as the square root of a single whole number: \(${k}\sqrt{${r}} = \sqrt{n}\). What is \(n\)?`,
      correct: n,
      fmt: (v) => R`\(n = ${num(v)}\)`,
      wrong: [
        { value: k * r, why: R`\(${k} = \sqrt{${k * k}}\), so the \(${k}\) goes under the root as \(${k * k}\).` },
        { value: k * k + r, why: R`\(\sqrt{${k * k}} \cdot \sqrt{${r}} = \sqrt{${k * k} \cdot ${r}}\): multiply, do not add.` },
        (k * r) ** 2,
      ],
      solution: [
        R`Write the \(${k}\) as a square root: \(${k} = \sqrt{${k * k}}\).`,
        R`Then \(${k}\sqrt{${r}} = \sqrt{${k * k}} \cdot \sqrt{${r}} = \sqrt{${n}}\).`,
        R`Check with decimals: \(${k} \times ${num(Math.sqrt(r), { places: 4 })} \approx ${num(k * Math.sqrt(r), { places: 3 })}\) and \(\sqrt{${n}} \approx ${num(Math.sqrt(n), { places: 3 })}\). ✓`,
      ],
      rule: 2, skill: 'working backwards',
      check: () => checkEqual(Math.sqrt(n), k * Math.sqrt(r)),
    });
  }
  const a = rng.pick([2, 3, 5, 6, 7, 8, 12]);
  const j = rng.int(1, 5);
  const x = a * j * j;
  const c = a * j;
  return q({
    prompt: R`Find the whole number \(x\) that makes \(\sqrt{${a}} \cdot \sqrt{x} = ${c}\) true.`,
    correct: x,
    fmt: (v) => R`\(x = ${num(v)}\)`,
    wrong: [
      { value: c * c, why: R`\(\sqrt{${a}x} = ${c}\) gives \(${a}x = ${c * c}\). Divide by \(${a}\) as well.` },
      j !== 1 ? { value: j, why: R`\(\sqrt{${a}x} = ${c}\) gives \(${a}x = ${c}^2\): square both sides before dividing by \(${a}\).` } : null,
      c * a,
    ],
    solution: [
      R`Combine the roots: \(\sqrt{${a}} \cdot \sqrt{x} = \sqrt{${a}x}\), so \(\sqrt{${a}x} = ${c}\).`,
      R`Square both sides: \(${a}x = ${c * c}\), so \(x = ${x}\).`,
      R`Check: \(\sqrt{${a}} \cdot \sqrt{${x}} = \sqrt{${a * x}} = ${c}\). ✓`,
    ],
    rule: 3, skill: 'working backwards',
    check: () => checkEqual(Math.sqrt(a) * Math.sqrt(x), c),
  });
}

const COMBOS = [];
for (let p = 2; p <= 9; p++) for (const r of SQFREE) if (p * p * r >= 20 && p * p * r <= 300) COMBOS.push([p, r]);

function challengeCompare(rng) {
  const greatest = rng.bool();
  let pick;
  for (let tries = 0; tries < 60; tries++) {
    pick = rng.sample(COMBOS, 4);
    const sizes = pick.map(([p, r]) => p * p * r);
    if (new Set(sizes).size < 4 || new Set(pick.map(([p]) => p)).size < 4) continue;
    const best = pick[sizes.indexOf(greatest ? Math.max(...sizes) : Math.min(...sizes))];
    const ps = pick.map(([p]) => p);
    if (best[0] !== (greatest ? Math.max(...ps) : Math.min(...ps))) break; // the biggest number in front is not the answer
  }
  const sizes = pick.map(([p, r]) => p * p * r);
  const target = greatest ? Math.max(...sizes) : Math.min(...sizes);
  const best = pick[sizes.indexOf(target)];
  const ps = pick.map(([p]) => p);
  const lure = pick[ps.indexOf(greatest ? Math.max(...ps) : Math.min(...ps))];
  const show = ([p, r]) => `${p}\\sqrt{${r}}`;
  return q({
    prompt: `Which number is the **${greatest ? 'greatest' : 'least'}**? Decide without a calculator.`,
    correct: M(show(best)),
    wrong: pick.filter((c) => c !== best).map((c) => (c === lure ? { value: M(show(c)), why: R`A ${greatest ? 'bigger' : 'smaller'} number in front does not settle it, because the roots differ: \(${show(c)} = \sqrt{${c[0] ** 2 * c[1]}}\).` } : M(show(c)))),
    solution: [
      R`Move each number in front under the root, using \(p\sqrt{r} = \sqrt{p^2 r}\): ${pick.map((c) => R`\(${show(c)} = \sqrt{${c[0] ** 2 * c[1]}}\)`).join(', ')}.`,
      R`A larger number under the root gives a larger square root. The ${greatest ? 'largest' : 'smallest'} is \(\sqrt{${target}}\).`,
      R`So \(${show(best)}\) is the ${greatest ? 'greatest' : 'least'}.`,
    ],
    rule: 2, skill: 'comparing roots',
    check: () => {
      const vals = pick.map(([p, r]) => p * Math.sqrt(r));
      const v = best[0] * Math.sqrt(best[1]);
      return vals.every((u) => (greatest ? u <= v + 1e-12 : u >= v - 1e-12)) ? true : 'not the extreme value';
    },
  });
}

function challengeSolveShift(rng) {
  const a = rng.pick([1, 1, 2, 3]);
  const h = rng.nonzero(-9, 9);
  const m = rng.int(1, 5);
  const r = rng.pick([2, 3, 5, 6, 7]);
  const k = m * m * r;
  const c = a === 1 && rng.bool(0.4) ? 0 : rng.nonzero(-15, 15);
  const d = a * k + c;
  const root = RT(m, r);
  const sol = (hh, t) => `x = ${hh} \\pm ${t}`;
  const sq = `(${linear(1, -h)})^{2}`;
  const lhs = terms([[a, sq], [c, '']]);
  const shiftK = (d + c) / a;
  return q({
    prompt: R`Solve \(${lhs} = ${d}\). Give exact answers in simplest form.`,
    correct: M(sol(h, root.tex)),
    wrong: wrongs(root.v, [
      { tex: sol(-h, root.tex), v: null, why: R`From \(${linear(1, -h)} = \pm ${root.tex}\), ${h > 0 ? 'add' : 'subtract'} \(${Math.abs(h)}\) on both sides: \(x = ${h} \pm ${root.tex}\).` },
      m > 1 && { tex: sol(h, `\\sqrt{${k}}`), v: root.v, form: true, why: R`These are the right solutions, but \(\sqrt{${k}}\) is not in simplest form: \(\sqrt{${k}} = ${root.tex}\).` },
      { tex: `x = ${h} + ${root.tex}`, v: null, why: R`A square of \(${k}\) comes from \(${root.tex}\) or from \(-${root.tex}\), so there are two solutions.` },
      a !== 1 && { tex: sol(h, sqrtTex(d - c)), v: Math.sqrt(d - c), why: R`Divide both sides by \(${a}\) before taking the square root.` },
      c !== 0 && Number.isInteger(shiftK) && shiftK > 0 && !isSquare(shiftK) && { tex: sol(h, sqrtTex(shiftK)), v: Math.sqrt(shiftK), why: R`${c > 0 ? 'Subtract' : 'Add'} \(${Math.abs(c)}\) on both sides to undo the ${c > 0 ? 'addition' : 'subtraction'}.` },
      { tex: sol(h, num(k)), v: k, why: R`\(${linear(1, -h)}\) is a square root of \(${k}\), not \(${k}\) itself.` },
      { tex: sol(-h, num(k)), v: null },
    ]),
    solution: [
      ...(c === 0 ? [] : [R`${c > 0 ? 'Subtract' : 'Add'} \(${Math.abs(c)}\) on both sides: \(${terms([[a, sq]])} = ${a * k}\).`]),
      ...(a === 1 ? [] : [R`Divide both sides by \(${a}\): \(${sq} = ${k}\).`]),
      R`Take the square root of both sides: \(${linear(1, -h)} = \pm\sqrt{${k}}${m > 1 ? ` = \\pm ${root.tex}` : ''}\).`,
      R`${h > 0 ? 'Add' : 'Subtract'} \(${Math.abs(h)}\): \(x = ${h} \pm ${root.tex}\), about \(${num(h - root.v, { places: 2 })}\) and \(${num(h + root.v, { places: 2 })}\).`,
    ],
    rule: 5, skill: 'solving x² = k',
    check: () => checkRoots((x) => a * (x - h) ** 2 + c - d, [h - root.v, h + root.v]),
  });
}

// ───────────── Interactive models ─────────────

function simplifyModel({ n }) {
  const { coef, rad } = S(n);
  const lo = Math.floor(Math.sqrt(n));
  const v = Math.sqrt(n);
  const steps = [];
  if (rad === 1) {
    steps.push(R`\(${n}\) is a perfect square: \(${coef}^2 = ${n}\).`, R`So \(\sqrt{${n}} = ${coef}\), a whole number, which is rational.`);
  } else if (coef === 1) {
    steps.push(
      R`Look for a perfect square (4, 9, 16, 25, …) that divides \(${n}\). None does, apart from 1.`,
      R`So \(\sqrt{${n}}\) is already in simplest form. \(${n}\) is not a perfect square, so \(\sqrt{${n}}\) is irrational.`,
    );
  } else {
    steps.push(
      R`Find the largest perfect square that divides \(${n}\): it is \(${coef * coef} = ${coef}^2\), and \(${n} = ${coef * coef} \cdot ${rad}\).`,
      R`Split the root: \(\sqrt{${n}} = \sqrt{${coef * coef}} \cdot \sqrt{${rad}} = ${coef}\sqrt{${rad}}\).`,
      R`\(${rad}\) has no perfect-square factor left, so \(${coef}\sqrt{${rad}}\) is in simplest form. It is irrational.`,
      R`Check with decimals: \(\sqrt{${n}} \approx ${num(v, { places: 4 })}\) and \(${coef} \times ${num(Math.sqrt(rad), { places: 5 })} \approx ${num(coef * Math.sqrt(rad), { places: 4 })}\). ✓`,
    );
  }
  if (rad !== 1) steps.push(R`\(${lo}^2 = ${lo * lo}\) and \(${lo + 1}^2 = ${(lo + 1) ** 2}\), so \(\sqrt{${n}}\) lies between \(${lo}\) and \(${lo + 1}\).`);
  const label = `√${n}`;
  return {
    problem: R`Simplify \(\sqrt{${n}}\).`,
    steps,
    answer: R`\(\sqrt{${n}} = ${sqrtTex(n)}\)${rad === 1 ? '' : R` \(\approx ${num(v, { places: 3 })}\)`}`,
    visual: {
      type: 'numberLine', min: Math.max(0, lo - 1), max: lo + 2, step: 1,
      points: [{ value: v, label }],
      alt: `Number line from ${Math.max(0, lo - 1)} to ${lo + 2} with a point at ${label}${rad === 1 ? `, exactly at ${lo}` : `, about ${txt(v, { places: 2 })}, between ${lo} and ${lo + 1}`}.`,
    },
  };
}

function diagonalModel({ l, w }) {
  const D = l * l + w * w;
  const { coef, rad } = S(D);
  const d = Math.sqrt(D);
  const square = l === w;
  return {
    problem: `A rectangular field is ${l} m long and ${w} m wide. A path runs straight from one corner to the opposite corner. How long is the path, and how much shorter is it than walking along two sides?`,
    steps: [
      R`The path and two sides of the field form a right triangle, with the path as the hypotenuse.`,
      R`Pythagorean theorem: \(d^2 = ${l}^2 + ${w}^2 = ${l * l} + ${w * w} = ${D}\).`,
      rad === 1 ? R`\(${D}\) is a perfect square, so \(d = ${coef}\) m exactly.`
        : coef === 1 ? R`\(${D}\) has no perfect-square factor, so \(d = \sqrt{${D}}\) m.`
        : R`\(d = \sqrt{${D}} = \sqrt{${coef * coef}} \cdot \sqrt{${rad}} = ${coef}\sqrt{${rad}}\) m.`,
      ...(square ? [R`The field is a square, and the diagonal of any square is its side times \(\sqrt{2}\): \(${l}\sqrt{2}\).`] : []),
      R`As a decimal, \(d \approx ${num(d, { places: 2 })}\) m. Walking along two sides is \(${l} + ${w} = ${l + w}\) m, so the path saves about \(${num(l + w - d, { places: 2 })}\) m.`,
    ],
    answer: rad === 1 ? `${coef} m` : R`\(${sqrtTex(D)}\) m, about ${txt(d, { places: 2 })} m`,
    visual: {
      type: 'polygon', points: [[0, 0], [l, 0], [l, w], [0, w]], sides: [`${l} m`, `${w} m`, '', ''], right: [0, 1, 2, 3],
      extra: [{ from: [0, 0], to: [l, w], dashed: true, label: `≈ ${txt(d, { places: 2 })} m` }],
      alt: `A ${square ? 'square' : 'rectangular'} field ${l} m long and ${w} m wide, with a dashed diagonal path of about ${txt(d, { places: 2 })} m.`,
    },
  };
}

export default {
  id: 'radicals',
  title: 'Square Roots & Radicals',
  summary: 'Simplify, multiply, divide and add square roots, tell rational from irrational numbers, and solve x² = k exactly.',
  standards: ['CCSS N-RN.A.2', 'CCSS N-RN.B.3', 'CCSS A-REI.B.4'],

  explain: {
    intro: R`A square root undoes squaring: \(\sqrt{49} = 7\) because \(7^2 = 49\). Most whole numbers are not perfect squares, and their square roots are irrational: the decimals never end or repeat. Working with them exactly means keeping the root sign and writing the result in simplest form, such as \(6\sqrt{2}\) instead of \(\sqrt{72}\) or \(8.485\ldots\)`,
    rules: [
      {
        title: 'Square roots, cube roots and fractional exponents',
        text: R`\(\sqrt{a}\) is the nonnegative number whose square is \(a\). \(\sqrt[3]{a}\) is the number whose cube is \(a\); it is negative when \(a\) is negative. Perfect squares (1, 4, 9, 16, 25, …) have whole-number square roots. As exponents, \(x^{\frac{1}{2}} = \sqrt{x}\) and \(x^{\frac{1}{3}} = \sqrt[3]{x}\).`,
        example: R`\(\sqrt{81} = 9\), \(\sqrt[3]{-64} = -4\), and \(25^{\frac{1}{2}} = \sqrt{25} = 5\).`,
      },
      {
        title: 'Rational and irrational numbers',
        text: R`A rational number is a fraction of two integers; its decimal ends or repeats. The square root of a whole number that is not a perfect square is irrational. A rational number plus an irrational number is irrational: if \(3 + \sqrt{2}\) were rational, then \(\sqrt{2} = (3 + \sqrt{2}) - 3\) would be rational too. In the same way a nonzero rational number times an irrational number is irrational. Two irrational numbers, though, can give a rational result.`,
        example: R`\(3 + \sqrt{2}\) and \(5\sqrt{2}\) are irrational, but \(\sqrt{2} \cdot \sqrt{8} = \sqrt{16} = 4\) is rational.`,
      },
      {
        title: 'Simplify by taking out perfect squares',
        text: R`Use \(\sqrt{ab} = \sqrt{a} \cdot \sqrt{b}\). Find the largest perfect square that divides the number under the root, and take its square root out in front. The root is in simplest form when no perfect square other than 1 divides what is left. Check by comparing decimals.`,
        example: R`\(\sqrt{72} = \sqrt{36 \cdot 2} = 6\sqrt{2}\). Check: \(\sqrt{72} \approx 8.485\) and \(6 \times 1.414 \approx 8.485\).`,
      },
      {
        title: 'Multiply, divide and rationalize',
        text: R`\(\sqrt{a} \cdot \sqrt{b} = \sqrt{ab}\) and \(\dfrac{\sqrt{a}}{\sqrt{b}} = \sqrt{\dfrac{a}{b}}\). Numbers in front multiply with numbers in front. Simplify at the end. To clear a root from a denominator, multiply the top and bottom by that root: \(\dfrac{a}{\sqrt{b}} = \dfrac{a\sqrt{b}}{b}\).`,
        example: R`\((2\sqrt{3})(5\sqrt{6}) = 10\sqrt{18} = 30\sqrt{2}\), and \(\dfrac{6}{\sqrt{3}} = \dfrac{6\sqrt{3}}{3} = 2\sqrt{3}\).`,
      },
      {
        title: 'Add and subtract like radicals',
        text: R`Like radicals have the same number under the root. Combine them by adding or subtracting the numbers in front, the way \(3x + 5x = 8x\). Simplify each root first, because roots that look different may become alike. Roots that stay different cannot be combined: \(\sqrt{2} + \sqrt{3}\) is not \(\sqrt{5}\).`,
        example: R`\(\sqrt{50} + \sqrt{18} = 5\sqrt{2} + 3\sqrt{2} = 8\sqrt{2}\).`,
      },
      {
        title: 'Solve x² = k with ±',
        text: R`Get \(x^2\) alone, then take the square root of both sides. For \(k > 0\) there are two solutions, \(x = \pm\sqrt{k}\); write them in simplest form. In a measurement (a side, a length, a time) only the positive root makes sense.`,
        example: R`\(2x^2 = 36\) gives \(x^2 = 18\), so \(x = \pm 3\sqrt{2}\). A square with area 18 has side \(3\sqrt{2} \approx 4.24\).`,
      },
    ],
    vocab: [
      { term: 'radical', def: R`An expression with a root sign, such as \(\sqrt{7}\) or \(\sqrt[3]{10}\). The number under the sign is the radicand.` },
      { term: 'perfect square', def: R`The square of a whole number: 1, 4, 9, 16, 25, 36, …` },
      { term: 'rational number', def: 'A number that can be written as a fraction of two integers. Its decimal ends or repeats.' },
      { term: 'irrational number', def: R`A real number that is not rational, such as \(\sqrt{2}\) or \(\pi\). Its decimal never ends or repeats.` },
      { term: 'simplest radical form', def: R`A root with no perfect-square factor left under the sign, and no root in a denominator: \(3\sqrt{2}\), \(\dfrac{\sqrt{6}}{3}\).` },
      { term: 'like radicals', def: R`Multiples of the same root, such as \(2\sqrt{5}\) and \(7\sqrt{5}\).` },
      { term: 'rationalizing the denominator', def: 'Rewriting a fraction so that its denominator has no root.' },
    ],
    mistakes: [
      R`Adding under the roots: \(\sqrt{9} + \sqrt{16} = 3 + 4 = 7\), not \(\sqrt{25} = 5\).`,
      R`Leaving the perfect square inside: \(\sqrt{72} = 6\sqrt{2}\), not \(36\sqrt{2}\), and not \(2\sqrt{18}\), which is not finished.`,
      R`Forgetting the negative solution of \(x^2 = k\). Both \(\sqrt{k}\) and \(-\sqrt{k}\) square to \(k\).`,
      R`Reading \(x^{\frac{1}{2}}\) as half of \(x\). It means \(\sqrt{x}\): \(16^{\frac{1}{2}} = 4\), not 8.`,
      R`Rationalizing only the top: in \(\dfrac{5}{\sqrt{2}}\), multiply the top and the bottom by \(\sqrt{2}\), giving \(\dfrac{5\sqrt{2}}{2}\).`,
    ],
    visual: {
      type: 'numberLine', min: 0, max: 4, step: 1,
      points: [{ value: Math.SQRT2, label: '√2' }, { value: Math.sqrt(5), label: '√5' }, { value: 3, label: '√9', color: 'c' }],
      alt: 'Number line from 0 to 4 with points at √2 (about 1.41), √5 (about 2.24) and √9, which is exactly 3.',
    },
  },

  examples: [
    {
      title: 'Simplifying a square root',
      problem: R`Simplify \(\sqrt{180}\).`,
      steps: [
        R`List perfect squares that divide 180: 4, 9 and 36. The largest is 36, and \(180 = 36 \cdot 5\).`,
        R`\(\sqrt{180} = \sqrt{36} \cdot \sqrt{5} = 6\sqrt{5}\).`,
        R`5 has no perfect-square factor, so this is simplest form.`,
        R`Check: \(\sqrt{180} \approx 13.416\) and \(6 \times 2.236 \approx 13.416\). ✓`,
      ],
      answer: R`\(6\sqrt{5}\)`,
    },
    {
      title: 'Multiplying, adding and rationalizing',
      problem: R`Simplify (a) \(\sqrt{6} \cdot \sqrt{15}\), (b) \(\sqrt{12} + \sqrt{75}\), (c) \(\dfrac{10}{\sqrt{5}}\).`,
      steps: [
        R`(a) \(\sqrt{6} \cdot \sqrt{15} = \sqrt{90} = \sqrt{9 \cdot 10} = 3\sqrt{10}\).`,
        R`(b) \(\sqrt{12} = 2\sqrt{3}\) and \(\sqrt{75} = 5\sqrt{3}\). These are like radicals: \(2\sqrt{3} + 5\sqrt{3} = 7\sqrt{3}\).`,
        R`(c) Multiply top and bottom by \(\sqrt{5}\): \(\dfrac{10\sqrt{5}}{5} = 2\sqrt{5}\).`,
      ],
      answer: R`(a) \(3\sqrt{10}\)  (b) \(7\sqrt{3}\)  (c) \(2\sqrt{5}\)`,
    },
    {
      title: 'Solving with square roots',
      problem: R`Solve \(3x^2 - 7 = 47\).`,
      steps: [
        R`Add 7 to both sides: \(3x^2 = 54\). Divide by 3: \(x^2 = 18\).`,
        R`Take the square root of both sides, with both signs: \(x = \pm\sqrt{18}\).`,
        R`Simplify: \(\sqrt{18} = \sqrt{9 \cdot 2} = 3\sqrt{2}\).`,
        R`Check: \(3(3\sqrt{2})^2 - 7 = 3 \cdot 18 - 7 = 47\). ✓`,
      ],
      answer: R`\(x = \pm 3\sqrt{2}\) (about \(\pm 4.24\))`,
    },
    {
      title: 'Word problem: how long does a fall take?',
      word: true,
      problem: R`A stone is dropped from a bridge 128 ft above a river. After \(t\) seconds it has fallen \(d = 16t^2\) feet. How long does it take to reach the water?`,
      steps: [
        R`The stone reaches the water when the distance fallen is 128 ft: \(16t^2 = 128\).`,
        R`Divide by 16: \(t^2 = 8\). Time cannot be negative, so \(t = \sqrt{8}\).`,
        R`Simplify: \(\sqrt{8} = \sqrt{4 \cdot 2} = 2\sqrt{2}\).`,
        R`As a decimal, \(2\sqrt{2} \approx 2.83\) seconds.`,
      ],
      answer: R`\(2\sqrt{2}\) seconds, about 2.8 s`,
    },
  ],

  models: [
    {
      id: 'simplify-root',
      title: 'Simplify any square root',
      intro: 'Type a whole number to see its square root taken apart into a perfect square and what is left.',
      inputs: [{ name: 'n', label: 'Number under the root', type: 'int', min: 1, max: 2000, value: 72 }],
      compute: simplifyModel,
    },
    {
      id: 'field-diagonal',
      title: 'Word problem: the shortcut across a field',
      word: true,
      intro: 'Change the length and width of the field. Try equal sides to see the square-root-of-2 pattern.',
      inputs: [
        { name: 'l', label: 'Length (m)', type: 'int', min: 1, max: 60, value: 10 },
        { name: 'w', label: 'Width (m)', type: 'int', min: 1, max: 60, value: 5 },
      ],
      compute: diagonalModel,
    },
  ],

  quiz: {
    easy: [easyRoot, easyIrrational, easySimplify, easySquareSide],
    medium: [mediumMultiply, mediumAddLike, mediumSolveSquare, mediumDiagonal],
    hard: [hardRationalize, hardBinomial, hardFallTime],
    challenge: [challengeClosure, challengeWorkBack, challengeCompare, challengeSolveShift],
  },
};
