import { R, q, frac, linear, terms, poly, num, txt, gcd, isSquare, rootsTex, factor, polyEval, checkRoots, checkSame } from '../../lib/index.js';
import { val, surd, quadSolve, fitY, show } from './_shared.js';

const sol = (list) => R`\(${rootsTex(list)}\)`;
const quad = (a, b, c) => (x) => a * x * x + b * x + c;
// Keep only wrong solution sets that really differ from the right one (compared as sets of numbers).
function wrongSets(right, cands) {
  const key = (list) => [...new Set(list.map((v) => val(v).toFixed(9)))].sort().join(',');
  return cands.filter(Boolean).map((c) => (Array.isArray(c) ? { set: c } : c)).filter((c) => key(c.set) !== key(right)).map((c) => (c.why ? { value: sol(c.set), why: c.why } : sol(c.set)));
}

// ───────────── Easy ─────────────

function easyZeroProduct(rng) {
  const p = rng.nonzero(-9, 9);
  const r = rng.intExcept(-9, 9, [0, p, -p]);
  const kind = rng.pick(['two', 'two', 'x', 'coef']);
  if (kind === 'coef') {
    const a = rng.int(2, 5);
    if (gcd(a, p) !== 1) return easyZeroProduct(rng);
    const roots = [frac(p, a), r];
    return q({
      prompt: R`Solve: \(\;(${linear(a, -p)})${factor(r)} = 0\)`,
      correct: sol(roots),
      wrong: wrongSets(roots, [
        { set: [p, r], why: R`From \(${linear(a, -p)} = 0\) you get \(${a}x = ${p}\). Divide by \(${a}\) to finish.` },
        { set: [frac(-p, a), -r], why: 'Set each factor equal to 0 and solve. The solutions have the opposite signs to the constants in the factors.' },
        [frac(a, p), r],
        [frac(p, a), -r],
      ]),
      solution: [
        'A product is 0 only when one of its factors is 0, so set each factor equal to 0.',
        R`\(${linear(a, -p)} = 0\) gives \(${a}x = ${p}\), so \(x = ${frac(p, a).tex()}\).`,
        R`\(${linear(1, -r)} = 0\) gives \(x = ${r}\). So \(${rootsTex(roots)}\).`,
      ],
      rule: 0,
      skill: 'zero-product property',
      check: () => checkRoots((t) => (a * t - p) * (t - r), roots.map(val)),
    });
  }
  const roots = kind === 'x' ? [0, p] : [p, r];
  const tex = kind === 'x' ? `x${factor(p)}` : `${factor(p)}${factor(r)}`;
  return q({
    prompt: R`Solve: \(\;${tex} = 0\)`,
    correct: sol(roots),
    wrong: wrongSets(roots, [
      { set: roots.map((v) => -v), why: R`Set each factor equal to 0: \(${linear(1, -p)} = 0\) gives \(x = ${p}\). The solution has the opposite sign to the constant in the factor.` },
      { set: [p], why: 'A product is 0 when either factor is 0, so each factor gives a solution.' },
      kind === 'x' ? [p, -p] : [p, -r],
      kind === 'x' ? [1, p] : [-p, r],
    ]),
    solution: [
      'A product is 0 only when one of its factors is 0, so set each factor equal to 0.',
      kind === 'x' ? R`The first factor is \(x\) itself: \(x = 0\).` : R`\(${linear(1, -r)} = 0\) gives \(x = ${r}\).`,
      R`\(${linear(1, -p)} = 0\) gives \(x = ${p}\). So \(${rootsTex(roots)}\).`,
    ],
    rule: 0,
    skill: 'zero-product property',
    check: () => checkRoots((t) => (kind === 'x' ? t : t - r) * (t - p), roots),
  });
}

function easySquareRoot(rng) {
  const k = rng.int(2, 12);
  const a = rng.int(2, 6);
  const kind = rng.pick(['plain', 'coef', 'zero']);
  const tex = { plain: `x^{2} = ${k * k}`, coef: `${a}x^{2} = ${a * k * k}`, zero: `x^{2} - ${k * k} = 0` }[kind];
  const roots = [-k, k];
  return q({
    prompt: R`Solve: \(\;${tex}\)`,
    correct: sol(roots),
    wrong: wrongSets(roots, [
      { set: [k], why: R`Two numbers have a square of \(${k * k}\): \(${k}\) and \(-${k}\). Write both.` },
      { set: [frac(-k * k, 2), frac(k * k, 2)], why: 'Squaring is undone by taking a square root, not by dividing by 2.' },
      [-k],
      [-k * k, k * k],
    ]),
    solution: [
      kind === 'coef' ? R`Divide both sides by \(${a}\): \(x^{2} = ${k * k}\).` : kind === 'zero' ? R`Add \(${k * k}\) to both sides: \(x^{2} = ${k * k}\).` : R`The \(x^{2}\) is already alone on one side.`,
      R`Take the square root of both sides. Remember both signs: \(x = \pm\sqrt{${k * k}} = \pm ${k}\).`,
      R`So \(${rootsTex(roots)}\).`,
    ],
    rule: 2,
    skill: 'solving by square roots',
    check: () => checkRoots((t) => t * t - k * k, roots),
  });
}

function easyFactorSolve(rng) {
  const r1 = rng.nonzero(-9, 9);
  const r2 = rng.intExcept(-9, 9, [0, r1, -r1]);
  const [b, c] = [-(r1 + r2), r1 * r2];
  const roots = [r1, r2];
  return q({
    prompt: R`Solve by factoring: \(\;${poly([1, b, c])} = 0\)`,
    correct: sol(roots),
    wrong: wrongSets(roots, [
      { set: [-r1, -r2], why: R`Those are the numbers inside the factors \(${factor(r1)}${factor(r2)}\). Each solution makes its factor equal 0, so it has the opposite sign.` },
      { set: [b, c], why: R`\(${b}\) and \(${c}\) are the coefficients. Factor first, then set each factor equal to 0.` },
      [r1, -r2],
      [-r1, r2],
    ]),
    solution: [
      R`Find two numbers with product \(${c}\) and sum \(${b}\): \(${-r1}\) and \(${-r2}\).`,
      R`Factor: \(${factor(r1)}${factor(r2)} = 0\).`,
      R`Set each factor equal to 0: \(${rootsTex(roots)}\).`,
    ],
    rule: 1,
    skill: 'solving by factoring',
    check: () => checkRoots(quad(1, b, c), roots),
  });
}

// ───────────── Medium ─────────────

function mediumRearrange(rng) {
  const r1 = rng.nonzero(-9, 9);
  const r2 = rng.intExcept(-9, 9, [0, r1, -r1]);
  const [b, c] = [-(r1 + r2), r1 * r2]; // x² + bx + c = 0
  const roots = [r1, r2];
  const rhs = -c;
  return q({
    prompt: R`Solve: \(\;${terms([[1, 'x^{2}'], [b, 'x']])} = ${rhs}\)`,
    correct: sol(roots),
    wrong: wrongSets(roots, [
      { set: [rhs, rhs - b], why: R`Factoring the left side as \(x(${linear(1, b)})\) does not help while the other side is \(${rhs}\). The zero-product property needs 0 on one side.` },
      { set: [-r1, -r2], why: 'Each solution makes its factor equal 0, so it has the opposite sign to the constant in that factor.' },
      [r1, -r2],
      [-r1, r2],
      [0, -b],
    ]),
    solution: [
      R`Get 0 on one side: ${rhs > 0 ? 'subtract' : 'add'} \(${Math.abs(rhs)}\) ${rhs > 0 ? 'from' : 'to'} both sides. \(${poly([1, b, c])} = 0\)`,
      R`Factor: two numbers with product \(${c}\) and sum \(${b}\) are \(${-r1}\) and \(${-r2}\), so \(${factor(r1)}${factor(r2)} = 0\).`,
      R`Set each factor equal to 0: \(${rootsTex(roots)}\).`,
    ],
    rule: 1,
    skill: 'solving by factoring',
    check: () => checkRoots((t) => t * t + b * t - rhs, roots),
  });
}

function mediumSquareShift(rng) {
  const h = rng.nonzero(-9, 9);
  const k = rng.int(1, 9);
  const a = rng.pick([1, 1, 2, 3, 5]);
  const inner = `(${linear(1, -h)})^{2}`;
  const roots = [h - k, h + k];
  return q({
    prompt: R`Solve: \(\;${a === 1 ? '' : a}${inner} = ${a * k * k}\)`,
    correct: sol(roots),
    wrong: wrongSets(roots, [
      { set: [h + k], why: R`The square root of \(${k * k}\) can be \(${k}\) or \(-${k}\). Use both.` },
      { set: [-h - k, -h + k], why: R`After taking square roots, \(${linear(1, -h)} = \pm ${k}\). Undo the \(${h > 0 ? '-' : '+'} ${Math.abs(h)}\) with the opposite operation.` },
      [h - k * k, h + k * k],
      [h - k],
    ]),
    solution: [
      a === 1 ? 'The squared part is already alone on one side.' : R`Divide both sides by \(${a}\): \(${inner} = ${k * k}\).`,
      R`Take the square root of both sides, with both signs: \(${linear(1, -h)} = \pm ${k}\).`,
      R`${h > 0 ? 'Add' : 'Subtract'} \(${Math.abs(h)}\): \(x = ${h} + ${k} = ${h + k}\) or \(x = ${h} - ${k} = ${h - k}\).`,
    ],
    rule: 2,
    skill: 'solving by square roots',
    check: () => checkRoots((t) => a * (t - h) ** 2 - a * k * k, roots),
  });
}

function mediumDiscriminant(rng) {
  const kind = rng.pick(['two', 'one', 'none']);
  let a = rng.nonzero(-4, 4);
  let b = rng.int(-9, 9);
  let c = rng.nonzero(-9, 9);
  if (kind === 'one') {
    const [p, r] = [rng.int(1, 3), rng.nonzero(-5, 5)];
    [a, b, c] = [p * p, 2 * p * r, r * r];
  }
  const D = b * b - 4 * a * c;
  if ((kind === 'two' && D <= 0) || (kind === 'none' && D >= 0)) return mediumDiscriminant(rng);
  const NAMES = { two: 'Two real solutions', one: 'Exactly one real solution', none: 'No real solutions', three: 'Three real solutions' };
  const reason = { two: 'It is positive, so the square root in the quadratic formula gives two different values.', one: 'It is 0, so the plus-or-minus part of the quadratic formula adds nothing: both values are the same.', none: 'It is negative, and a negative number has no real square root.' }[kind];
  return q({
    prompt: R`How many real solutions does \(\;${poly([a, b, c])} = 0\;\) have?`,
    correct: NAMES[kind],
    wrong: [
      ...['two', 'one', 'none'].filter((n) => n !== kind).map((n, i) => (i === 0 ? { value: NAMES[n], why: R`The discriminant is \(b^{2} - 4ac = ${D}\). ${reason}` } : NAMES[n])),
      { value: NAMES.three, why: 'A quadratic equation never has more than two solutions.' },
    ],
    solution: [
      R`Here \(a = ${a}\), \(b = ${b}\) and \(c = ${c}\).`,
      R`Discriminant: \(b^{2} - 4ac = (${b})^{2} - 4(${a})(${c}) = ${b * b} ${-4 * a * c < 0 ? '-' : '+'} ${Math.abs(4 * a * c)} = ${D}\).`,
      `${reason} So there ${kind === 'two' ? 'are two real solutions' : kind === 'one' ? 'is exactly one real solution' : 'are no real solutions'}.`,
    ],
    rule: 5,
    skill: 'discriminant',
    check: () => {
      const top = polyEval([a, b, c], -b / (2 * a)) * Math.sign(a); // the vertex, with the parabola turned to open upward
      const found = Math.abs(top) < 1e-9 ? 'one' : top < 0 ? 'two' : 'none';
      return found === kind ? true : `the graph shows ${found}, not ${kind}`;
    },
  });
}

function mediumStoryArea(rng) {
  const thing = rng.pick(['garden', 'playground', 'car park', 'courtyard', 'vegetable plot']);
  const w = rng.int(3, 15);
  const k = rng.int(1, 9);
  const A = w * (w + k);
  return q({
    prompt: `A rectangular ${thing} is ${k} ${k === 1 ? 'metre' : 'metres'} longer than it is wide. Its area is ${A} square metres. How wide is it?`,
    correct: w,
    unit: 'metres',
    wrong: [
      { value: w + k, why: 'That is the length. The question asks for the width.' },
      { value: Math.round(A / k), why: R`The area is width times length, \(w(w + ${k})\). It is not \(${k}\) times the width.` },
      w - 1,
      w + 1,
      w + 2,
    ],
    solution: [
      R`Let \(w\) be the width. The length is \(w + ${k}\), and width times length is the area: \(w(w + ${k}) = ${A}\).`,
      R`Expand and get 0 on one side: \(w^{2} + ${k === 1 ? '' : k}w - ${A} = 0\).`,
      R`Factor: \((w - ${w})(w + ${w + k}) = 0\), so \(w = ${w}\) or \(w = -${w + k}\).`,
      `A width cannot be negative, so the width is ${w} metres (and the length is ${w + k} metres).`,
    ],
    rule: 6,
    skill: 'quadratic word problems',
    check: () => checkRoots((t) => t * (t + k) - A, [w]),
  });
}

// ───────────── Hard ─────────────

function hardFormula(rng) {
  const a = rng.int(1, 3);
  const b = rng.nonzero(-9, 9);
  const c = rng.nonzero(-9, 9);
  const D = b * b - 4 * a * c;
  if (D <= 0 || isSquare(D)) return hardFormula(rng);
  const s = quadSolve(a, b, c);
  const form = (tex) => R`\(x = ${tex}\)`;
  const D2 = b * b + 4 * a * c;
  return q({
    prompt: R`Solve with the quadratic formula: \(\;${poly([a, b, c])} = 0\)`,
    correct: R`\(${s.tex}\)`,
    wrong: [
      { value: form(surd(b, D, 2 * a)), why: R`The formula starts with \(-b\). Here \(b = ${b}\), so \(-b = ${-b}\).` },
      { value: form(surd(-b, D, a)), why: R`The denominator is \(2a = ${2 * a}\), not \(a\).` },
      D2 > 0 && !isSquare(D2) ? { value: form(surd(-b, D2, 2 * a)), why: R`Under the root: \(b^{2} - 4ac = ${b * b} - 4(${a})(${c}) = ${D}\). Watch the sign of \(c\).` } : null,
      form(surd(-b, D, 4 * a)),
      form(surd(b, D, a)),
    ],
    solution: [
      R`Identify \(a = ${a}\), \(b = ${b}\), \(c = ${c}\).`,
      R`Discriminant: \(b^{2} - 4ac = ${b * b} - 4(${a})(${c}) = ${D}\).`,
      R`Substitute into \(x = \dfrac{-b \pm \sqrt{b^{2} - 4ac}}{2a}\): \(x = \dfrac{${-b} \pm \sqrt{${D}}}{${2 * a}}\).`,
      R`Simplify the root and the fraction where possible: \(${s.tex}\) (about \(${num(s.values[0], { places: 2 })}\) and \(${num(s.values[1], { places: 2 })}\)).`,
    ],
    rule: 4,
    skill: 'quadratic formula',
    check: () => checkRoots(quad(a, b, c), s.values, 1e-6),
  });
}

function hardCompleteSquare(rng) {
  const h = rng.nonzero(-8, 8);
  const N = rng.int(1, 30);
  const c = h * h - N;
  if (c === 0) return hardCompleteSquare(rng);
  const b = 2 * h;
  const form = (inside, right) => R`\((${linear(1, inside)})^{2} = ${right}\)`;
  return q({
    prompt: R`Complete the square. Which equation has the same solutions as \(\;${poly([1, b, c])} = 0\)?`,
    correct: form(h, N),
    wrong: [
      { value: form(h, -c), why: R`\(${h * h}\) was added on the left to complete the square, so it must be added on the right too.` },
      { value: form(h, h * h + c), why: R`First move the constant across: \(${terms([[1, 'x^{2}'], [b, 'x']])} = ${-c}\). Its sign changes.` },
      { value: form(b, b * b - c), why: R`Use half of the coefficient of \(x\): half of \(${b}\) is \(${h}\).` },
      form(-h, N),
    ],
    solution: [
      R`Move the constant to the other side: \(${terms([[1, 'x^{2}'], [b, 'x']])} = ${-c}\).`,
      R`Half of \(${b}\) is \(${h}\), and \(${h < 0 ? `(${h})` : h}^{2} = ${h * h}\). Add \(${h * h}\) to both sides: \(${poly([1, b, h * h])} = ${N}\).`,
      R`The left side is now a perfect square: \((${linear(1, h)})^{2} = ${N}\).`,
      R`From here, \(${linear(1, h)} = \pm\sqrt{${N}}\) gives the solutions.`,
    ],
    rule: 3,
    skill: 'completing the square',
    check: () => checkSame(quad(1, b, c), (t) => (t + h) ** 2 - N),
  });
}

function hardStoryProjectile(rng) {
  const metric = rng.bool();
  const g = metric ? 5 : 16;
  const T = metric ? rng.int(2, 7) : rng.pick([2, 2.5, 3, 3.5, 4, 5, 6]);
  const s = metric ? rng.int(0, 3) : rng.pick([0, 0.5, 1, 1.5, 2]);
  if (s >= T) return hardStoryProjectile(rng);
  const [v, h0] = [g * (T - s), g * T * s];
  const unit = metric ? 'metres' : 'feet';
  const D = v * v + 4 * g * h0;
  return q({
    prompt: R`A ball is ${h0 === 0 ? 'kicked upward from the ground' : `thrown upward from a platform ${h0} ${unit} high`}. Its height after \(t\) seconds is \(h = ${poly([-g, v, h0], 't')}\) ${unit}. After how many seconds does it hit the ground?`,
    correct: T,
    fmt: (t) => R`\(${num(t)}\) ${t === 1 ? 'second' : 'seconds'}`,
    wrong: [
      s > 0 ? { value: s, why: R`The equation also has the solution \(t = -${num(s)}\), but a time before the throw makes no sense. Use the positive solution.` } : null,
      { value: (T - s) / 2, why: 'That is when the ball is at its highest point. It reaches the ground later.' },
      s > 0 ? { value: T - s, why: `That would be right if the ball started at ground level. It starts ${h0} ${unit} up, so it takes longer to land.` } : null,
      T + 1,
      2 * T,
    ],
    solution: [
      R`On the ground the height is 0, so solve \(${poly([-g, v, h0], 't')} = 0\).`,
      R`Quadratic formula with \(a = ${-g}\), \(b = ${v}\), \(c = ${h0}\): \(b^{2} - 4ac = ${v * v} + ${4 * g * h0} = ${D}\), and \(\sqrt{${D}} = ${num(Math.sqrt(D))}\).`,
      R`\(t = \dfrac{-${v} \pm ${num(Math.sqrt(D))}}{${-2 * g}}\), so \(t = ${num(T)}\) or \(t = ${num(-s)}\).`,
      s > 0 ? `Time cannot be negative here, so the ball lands after ${txt(T)} seconds.` : `t = 0 is the moment the ball is kicked, so it lands after ${txt(T)} seconds.`,
    ],
    rule: 6,
    skill: 'quadratic word problems',
    check: () => checkRoots((t) => -g * t * t + v * t + h0, [T]),
  });
}

// ───────────── Challenge ─────────────

function challengeDiscriminantK(rng) {
  const a = rng.pick([1, 1, 2, 3, 4]);
  const b = rng.nonzero(-10, 10);
  const bound = frac(b * b, 4 * a);
  const want = rng.pick(['two', 'none', 'one']);
  const REL = { two: '<', none: '>', one: '=' };
  const SAY = { two: 'two different real solutions', none: 'no real solutions', one: 'exactly one real solution' };
  const form = (rel, v) => R`\(k ${rel} ${num(v)}\)`;
  const need = { two: 'positive', none: 'negative', one: 'zero' };
  return q({
    prompt: R`For which values of \(k\) does \(\;${terms([[a, 'x^{2}'], [b, 'x']])} + k = 0\;\) have ${SAY[want]}?`,
    correct: form(REL[want], bound),
    wrong: [
      ...Object.keys(REL).filter((n) => n !== want).map((n, i) => (i === 0 ? { value: form(REL[n], bound), why: `That gives ${SAY[n]}. For ${SAY[want]} the discriminant must be ${need[want]}.` } : form(REL[n], bound))),
      { value: form(REL[want], b * b), why: R`The discriminant is \(${b * b} - ${4 * a}k\). Divide by \(${4 * a}\) when you solve for \(k\).` },
      form(REL[want], bound.neg()),
    ],
    solution: [
      R`The discriminant is \(b^{2} - 4ac = (${b})^{2} - 4(${a})(k) = ${b * b} - ${4 * a}k\).`,
      R`For ${SAY[want]} it must be ${need[want]}: \(${b * b} - ${4 * a}k ${{ two: '>', none: '<', one: '=' }[want]} 0\).`,
      R`So \(${4 * a}k ${REL[want]} ${b * b}\), which gives \(k ${REL[want]} ${num(bound)}\).`,
    ],
    rule: 5,
    skill: 'discriminant',
    check: () => {
      const count = (kv) => { const D = b * b - 4 * a * kv; return Math.abs(D) < 1e-9 ? 'one' : D > 0 ? 'two' : 'none'; };
      const probe = { two: bound.value - 1, none: bound.value + 1, one: bound.value }[want];
      return count(probe) === want && (want === 'one' || count(bound.value + (want === 'two' ? 1 : -1)) !== want) ? true : 'the condition on k does not give that number of solutions';
    },
  });
}

function challengeWriteEquation(rng) {
  const d = rng.int(2, 5);
  const p = rng.nonzero(-7, 7);
  const r2 = rng.nonzero(-6, 6);
  if (gcd(p, d) !== 1) return challengeWriteEquation(rng);
  const r1 = frac(p, d);
  const right = [d, -(p + d * r2), p * r2];
  const fits = (coefs) => Math.abs(polyEval(coefs, r1.value)) < 1e-9 && Math.abs(polyEval(coefs, r2)) < 1e-9;
  const eqn = (coefs) => R`\(${poly(coefs)} = 0\)`;
  const cands = [
    { coefs: [d, p + d * r2, p * r2], why: R`That equation has the solutions \(x = ${r1.neg().tex()}\) and \(x = ${-r2}\). A solution \(x = r\) comes from the factor \((x - r)\).` },
    { coefs: [d, -(r2 + d * p), p * r2], why: R`\(x = ${r1.tex()}\) comes from the factor \((${linear(d, -p)})\): the denominator multiplies \(x\) in the same factor as its numerator.` },
    { coefs: [d, p - d * r2, -p * r2] },
    { coefs: [1, -(p + r2), p * r2] },
    { coefs: [d, -(p + d * r2), -p * r2] },
  ].filter((c) => !fits(c.coefs));
  return q({
    prompt: R`Which equation has the solutions \(x = ${r1.tex()}\) and \(x = ${r2}\)?`,
    correct: eqn(right),
    wrong: cands.map((c) => (c.why ? { value: eqn(c.coefs), why: c.why } : eqn(c.coefs))),
    solution: [
      R`Work backwards from the zero-product property. \(x = ${r2}\) comes from the factor \(${factor(r2)}\).`,
      R`\(x = ${r1.tex()}\) means \(${d}x = ${p}\), which comes from the factor \((${linear(d, -p)})\).`,
      R`Multiply the factors: \((${linear(d, -p)})${factor(r2)} = ${poly(right)}\). So the equation is \(${poly(right)} = 0\).`,
    ],
    rule: 0,
    skill: 'zero-product property',
    check: () => (fits(right) ? checkRoots((t) => polyEval(right, t), [r1.value, r2]) : 'the equation does not have those solutions'),
  });
}

function challengeStoryBorder(rng) {
  const [inner, outer] = rng.pick([['A swimming pool', 'deck'], ['A lawn', 'path'], ['A painting', 'frame'], ['A flower bed', 'gravel border']]);
  const W = rng.int(4, 14);
  const L = W + rng.int(2, 8);
  const x = rng.pick([1, 1.5, 2, 2.5, 3]);
  const A = (L + 2 * x) * (W + 2 * x);
  const B = 2 * (L + W);
  const D = B * B + 16 * (A - L * W);
  return q({
    prompt: `${inner} measures ${L} m by ${W} m. It is surrounded by a ${outer} that has the same width all the way round. Together they cover ${txt(A)} square metres. How wide is the ${outer}?`,
    correct: x,
    unit: 'm',
    wrong: [
      { value: 2 * x, why: `That is how much longer each outside measurement is. The ${outer} is on both sides, so its width is half of that.` },
      { value: Math.round(((A - L * W) / B) * 100) / 100, why: `That leaves out the four corner squares of the ${outer}. They are the reason the equation is quadratic.` },
      x + 0.5,
      x + 1,
      x / 2,
    ],
    solution: [
      R`Let \(x\) be the width. The outside rectangle measures \(${L} + 2x\) by \(${W} + 2x\), so \((${L} + 2x)(${W} + 2x) = ${num(A)}\).`,
      R`Expand and get 0 on one side: \(4x^{2} + ${B}x + ${L * W} = ${num(A)}\), so \(4x^{2} + ${B}x - ${num(A - L * W)} = 0\).`,
      R`Quadratic formula: \(b^{2} - 4ac = ${B * B} + ${16 * (A - L * W)} = ${D}\) and \(\sqrt{${D}} = ${num(Math.sqrt(D))}\), so \(x = \dfrac{-${B} \pm ${num(Math.sqrt(D))}}{8}\).`,
      `The positive solution is x = ${txt(x)}. (The other solution is negative, which is impossible for a width.) The ${outer} is ${txt(x)} m wide.`,
    ],
    rule: 6,
    skill: 'quadratic word problems',
    check: () => checkRoots((t) => (L + 2 * t) * (W + 2 * t) - A, [x]),
  });
}

// ───────────── Interactive models ─────────────

function formulaModel({ a, b, c }) {
  if (a === 0) return { error: 'With a = 0 there is no x² term, so the equation is not quadratic. Choose a value other than 0 for a.' };
  const s = quadSolve(a, b, c);
  const f = quad(a, b, c);
  const vx = -b / (2 * a);
  const half = Math.max(3, s.count === 2 ? (s.values[1] - s.values[0]) / 2 + 2 : 3);
  const steps = [
    R`Identify the coefficients: \(a = ${a}\), \(b = ${b}\), \(c = ${c}\).`,
    R`Discriminant: \(b^{2} - 4ac = (${b})^{2} - 4(${a})(${c}) = ${s.D}\).`,
  ];
  if (s.count === 0) steps.push('The discriminant is negative, and a negative number has no real square root. The graph never reaches the x-axis.');
  else {
    steps.push(R`Substitute into \(x = \dfrac{-b \pm \sqrt{b^{2} - 4ac}}{2a}\): \(x = \dfrac{${-b} \pm \sqrt{${s.D}}}{${2 * a}}\).`);
    if (s.count === 1) steps.push(R`The discriminant is 0, so both signs give the same value: \(${s.tex}\). The graph touches the x-axis once.`);
    else if (isSquare(s.D)) steps.push(R`\(\sqrt{${s.D}} = ${Math.sqrt(s.D)}\), so the two solutions are \(${s.tex}\).`);
    else steps.push(R`\(${s.D}\) is not a perfect square, so leave the root in the answer: \(${s.tex}\). As decimals, \(x \approx ${num(s.values[0], { places: 3 })}\) or \(x \approx ${num(s.values[1], { places: 3 })}\).`);
  }
  return {
    problem: R`Solve \(${poly([a, b, c])} = 0\).`,
    steps,
    answer: s.count === 0 ? 'No real solutions' : R`\(${s.tex}\)`,
    visual: {
      type: 'plot', x: [vx - half, vx + half], y: fitY(f, vx - half, vx + half), fns: [{ f }],
      points: s.values.map((x) => ({ x, y: 0, label: show(Math.round(x * 100) / 100) })),
      alt: `Graph of the parabola. It ${s.count === 0 ? 'does not meet the x-axis' : s.count === 1 ? `touches the x-axis once, at ${show(Math.round(s.values[0] * 100) / 100)}` : `crosses the x-axis at about ${show(Math.round(s.values[0] * 100) / 100)} and ${show(Math.round(s.values[1] * 100) / 100)}`}.`,
    },
  };
}

function projectileModel({ v, h0 }) {
  if (v === 0 && h0 === 0) return { error: 'The ball starts on the ground and is not moving, so nothing happens. Give it a starting speed or a starting height.' };
  const D = v * v + 64 * h0;
  const root = Math.sqrt(D);
  const [t1, t2] = [(v - root) / 32, (v + root) / 32];
  const f = (t) => -16 * t * t + v * t + h0;
  const rootTex = isSquare(D) ? num(root) : R`\sqrt{${num(D)}}`;
  return {
    problem: R`A ball is thrown upward at ${v} feet per second from a height of ${h0} feet. Its height after \(t\) seconds is \(h = ${poly([-16, v, h0], 't')}\) feet. When does it hit the ground?`,
    steps: [
      R`On the ground the height is 0, so solve \(${poly([-16, v, h0], 't')} = 0\).`,
      R`Quadratic formula with \(a = -16\), \(b = ${v}\), \(c = ${h0}\). Discriminant: \(${v}^{2} - 4(-16)(${h0}) = ${num(D)}\).`,
      R`\(t = \dfrac{${v === 0 ? '' : `-${v} `}\pm ${rootTex}}{-32}\), which gives \(t ${isSquare(D) && Number.isInteger(t1 * 4) ? '=' : R`\approx`} ${num(t1, { places: 2 })}\) or \(t ${isSquare(D) && Number.isInteger(t2 * 4) ? '=' : R`\approx`} ${num(t2, { places: 2 })}\).`,
      t1 < -1e-9 ? 'A negative time would be before the throw, so that solution does not fit the story. Keep the positive one.' : 'The solution t = 0 is the moment of the throw (the ball starts on the ground), so the landing is the other solution.',
    ],
    answer: `The ball hits the ground after about ${txt(t2, { places: 2 })} seconds.`,
    visual: {
      type: 'plot', x: [0, t2 * 1.3], y: [0, Math.max(f(v / 32), h0, 1) * 1.15], axisLabels: ['t', 'h'], fns: [{ f, domain: [0, t2] }],
      points: [{ x: t2, y: 0, label: `t ≈ ${txt(t2, { places: 2 })}` }],
      alt: `Graph of height against time: the ball rises from ${h0} feet, peaks, and comes down to the ground at about ${txt(t2, { places: 2 })} seconds.`,
    },
  };
}

export default {
  id: 'quadratic-equations',
  title: 'Solving Quadratic Equations',
  summary: 'Solve quadratic equations by factoring, square roots, completing the square and the quadratic formula.',
  standards: ['CCSS A-REI.B.4', 'CCSS A-SSE.B.3', 'CCSS A-CED.A.1'],

  explain: {
    intro: R`A quadratic equation has an \(x^{2}\) term, as in \(x^{2} - 2x - 3 = 0\). It can have two solutions, one, or none, and they are the places where the graph of \(y = x^{2} - 2x - 3\) meets the \(x\)-axis. There are four ways to solve one. Factoring and square roots are quick when they fit; completing the square and the quadratic formula always work.`,
    rules: [
      {
        title: 'The zero-product property',
        text: R`If a product equals 0, at least one of its factors is 0. So when one side of an equation is a product and the other side is 0, set each factor equal to 0 and solve.`,
        example: R`\((x - 7)(x + 2) = 0\) gives \(x - 7 = 0\) or \(x + 2 = 0\), so \(x = 7\) or \(x = -2\).`,
      },
      {
        title: 'Solving by factoring',
        text: R`Move every term to one side so that the other side is 0. Factor, then use the zero-product property. It only works with 0 on one side.`,
        example: R`\(x^{2} - 5x = 14\) becomes \(x^{2} - 5x - 14 = 0\), then \((x - 7)(x + 2) = 0\): \(x = 7\) or \(x = -2\).`,
      },
      {
        title: 'Solving by square roots',
        text: R`When the variable appears only inside a square, isolate the square and take the square root of both sides. A positive number has two square roots, so write \(\pm\).`,
        example: R`\(2(x - 3)^{2} = 50\): \((x - 3)^{2} = 25\), so \(x - 3 = \pm 5\) and \(x = 8\) or \(x = -2\).`,
      },
      {
        title: 'Completing the square',
        text: R`To solve \(x^{2} + bx + c = 0\): move \(c\) across, add \(\left(\frac{b}{2}\right)^{2}\) to both sides, write the left side as \(\left(x + \frac{b}{2}\right)^{2}\), then take square roots.`,
        example: R`\(x^{2} + 6x - 7 = 0\): \(x^{2} + 6x = 7\), then \(x^{2} + 6x + 9 = 16\), so \((x + 3)^{2} = 16\) and \(x = 1\) or \(x = -7\).`,
      },
      {
        title: 'The quadratic formula',
        text: R`The solutions of \(ax^{2} + bx + c = 0\) are \(x = \dfrac{-b \pm \sqrt{b^{2} - 4ac}}{2a}\). It comes from completing the square on the general equation, so it works for every quadratic.`,
        example: R`\(2x^{2} - 3x - 4 = 0\): \(x = \frac{3 \pm \sqrt{9 + 32}}{4} = \frac{3 \pm \sqrt{41}}{4}\).`,
      },
      {
        title: 'The discriminant',
        text: R`The number under the root, \(b^{2} - 4ac\), tells you how many real solutions there are. Positive: two. Zero: exactly one. Negative: none, because a negative number has no real square root.`,
        example: R`\(x^{2} + 2x + 5 = 0\) has \(b^{2} - 4ac = 4 - 20 = -16\): no real solutions.`,
      },
      {
        title: 'Quadratics in stories',
        text: R`Write the equation from the situation, solve it, and then check each solution against the story. A negative length or a time before the start is a solution of the equation but not an answer to the question.`,
        example: R`A width \(w\) with \(w(w + 3) = 40\) gives \(w = 5\) or \(w = -8\). Only 5 makes sense.`,
      },
    ],
    vocab: [
      { term: 'quadratic equation', def: R`An equation that can be written as \(ax^{2} + bx + c = 0\) with \(a \ne 0\).` },
      { term: 'root, zero, solution', def: R`Three names for a value of \(x\) that makes the equation true. On a graph it is an \(x\)-intercept.` },
      { term: 'discriminant', def: R`The expression \(b^{2} - 4ac\). Its sign gives the number of real solutions.` },
      { term: 'completing the square', def: 'Adding a number to make a perfect-square trinomial, so that the equation can be solved by square roots.' },
    ],
    mistakes: [
      R`Using the zero-product property when the other side is not 0: from \(x(x - 5) = 14\) you cannot conclude \(x = 14\).`,
      R`Giving only the positive square root: \(x^{2} = 49\) has the solutions 7 and \(-7\).`,
      R`Losing a solution by dividing both sides by \(x\): \(x^{2} = 5x\) has the solutions 0 and 5.`,
      R`Sign slips in the formula: it starts with \(-b\), and \(-4ac\) becomes positive when \(a\) and \(c\) have opposite signs.`,
      R`Dividing only part of the numerator: the whole of \(-b \pm \sqrt{\,\cdot\,}\) is divided by \(2a\).`,
    ],
    visual: {
      type: 'plot', x: [-3, 5], y: [-5, 6], step: [1, 1],
      fns: [{ f: (x) => x * x - 2 * x - 3, label: 'y = x² − 2x − 3', labelAt: 3.9 }],
      points: [{ x: -1, y: 0, label: '(−1, 0)' }, { x: 3, y: 0, label: '(3, 0)' }],
      alt: 'Graph of y = x² − 2x − 3, a parabola that crosses the x-axis at −1 and 3. Those are the solutions of x² − 2x − 3 = 0.',
    },
  },

  examples: [
    {
      title: 'Factoring, after getting 0 on one side',
      problem: R`Solve \(x^{2} - 5x = 14\).`,
      steps: [
        R`Subtract 14 so that one side is 0: \(x^{2} - 5x - 14 = 0\).`,
        R`Factor: two numbers with product \(-14\) and sum \(-5\) are \(-7\) and 2. So \((x - 7)(x + 2) = 0\).`,
        R`Set each factor equal to 0: \(x = 7\) or \(x = -2\).`,
        R`Check: \(7^{2} - 5(7) = 14\) and \((-2)^{2} - 5(-2) = 14\). ✓`,
      ],
      answer: R`\(x = -2\) or \(x = 7\)`,
    },
    {
      title: 'Completing the square',
      problem: R`Solve \(x^{2} + 6x - 7 = 0\) by completing the square.`,
      steps: [
        R`Move the constant: \(x^{2} + 6x = 7\).`,
        R`Half of 6 is 3, and \(3^{2} = 9\). Add 9 to both sides: \(x^{2} + 6x + 9 = 16\).`,
        R`The left side is a perfect square: \((x + 3)^{2} = 16\).`,
        R`Take square roots: \(x + 3 = \pm 4\), so \(x = 1\) or \(x = -7\).`,
      ],
      answer: R`\(x = -7\) or \(x = 1\)`,
    },
    {
      title: 'The quadratic formula',
      problem: R`Solve \(2x^{2} - 3x - 4 = 0\).`,
      steps: [
        R`It does not factor with integers, so use the formula with \(a = 2\), \(b = -3\), \(c = -4\).`,
        R`Discriminant: \(b^{2} - 4ac = 9 - 4(2)(-4) = 9 + 32 = 41\).`,
        R`\(x = \dfrac{-(-3) \pm \sqrt{41}}{2(2)} = \dfrac{3 \pm \sqrt{41}}{4}\).`,
        R`As decimals: \(x \approx 2.35\) or \(x \approx -0.85\).`,
      ],
      answer: R`\(x = \frac{3 \pm \sqrt{41}}{4}\)`,
    },
    {
      title: 'Word problem: a ball thrown upward',
      word: true,
      problem: R`A ball is thrown upward from a 64-foot platform. Its height after \(t\) seconds is \(h = -16t^{2} + 48t + 64\) feet. When does it hit the ground?`,
      steps: [
        R`On the ground the height is 0: \(-16t^{2} + 48t + 64 = 0\).`,
        R`Divide every term by \(-16\): \(t^{2} - 3t - 4 = 0\).`,
        R`Factor: \((t - 4)(t + 1) = 0\), so \(t = 4\) or \(t = -1\).`,
        'A time of −1 second is before the throw, so it does not fit the story. The ball lands after 4 seconds.',
      ],
      answer: '4 seconds',
      visual: {
        type: 'plot', x: [-1.5, 5], y: [-20, 110], axisLabels: ['t', 'h'],
        fns: [{ f: (t) => -16 * t * t + 48 * t + 64 }],
        points: [{ x: 4, y: 0, label: '(4, 0)' }, { x: -1, y: 0, open: true, label: '(−1, 0)' }, { x: 0, y: 64, label: '(0, 64)' }],
        alt: 'Graph of the height: it starts at 64 feet, rises to a peak of 100 feet at 1.5 seconds and reaches the ground at 4 seconds. The curve extended backwards would cross the axis at −1.',
      },
    },
  ],

  models: [
    {
      id: 'quadratic-formula',
      title: 'Solve ax² + bx + c = 0 with the quadratic formula',
      intro: 'Choose the three coefficients. The discriminant tells you how many times the graph meets the x-axis.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x²)', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'b', label: 'b (coefficient of x)', type: 'int', min: -20, max: 20, value: -3 },
        { name: 'c', label: 'c (constant)', type: 'int', min: -30, max: 30, value: -4 },
      ],
      compute: formulaModel,
    },
    {
      id: 'projectile',
      title: 'Word problem: when does the ball land?',
      word: true,
      intro: 'Change the throwing speed and the starting height.',
      inputs: [
        { name: 'v', label: 'Upward speed (feet per second)', type: 'int', min: 0, max: 160, value: 48 },
        { name: 'h0', label: 'Starting height (feet)', type: 'int', min: 0, max: 400, value: 64 },
      ],
      compute: projectileModel,
    },
  ],

  quiz: {
    easy: [easyZeroProduct, easySquareRoot, easyFactorSolve],
    medium: [mediumRearrange, mediumSquareShift, mediumDiscriminant, mediumStoryArea],
    hard: [hardFormula, hardCompleteSquare, hardStoryProjectile],
    challenge: [challengeDiscriminantK, challengeWriteEquation, challengeStoryBorder],
  },
};
