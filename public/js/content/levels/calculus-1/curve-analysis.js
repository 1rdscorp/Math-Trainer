import { R, q, frac, terms, poly, polyEval, polyDeriv, linear, factor, rootsTex, sqrtTex, num, txt, round, checkEqual, checkAll, numDeriv, integrate } from '../../lib/index.js';
import { M, fit, rowTable, fromBank, numDeriv2 } from './_shared.js';

// Count the places in (lo, hi) where g changes sign in the given direction (+1: from negative to positive).
function crossings(g, lo, hi, dir, n = 6000) {
  let count = 0;
  let prev = 0;
  for (let i = 1; i < n; i++) {
    const s = Math.sign(g(lo + ((hi - lo) * i) / n));
    if (s === 0) continue;
    if (prev !== 0 && s !== prev && s === dir) count++;
    prev = s;
  }
  return count;
}
// A cubic whose derivative is 3s(x − p)(x − q): coefficients, highest power first.
const cubicWith = (p, qv, s = 1, c = 0) => [s, (-3 * s * (p + qv)) / 2, 3 * s * p * qv, c];
const xEq = (v) => R`\(x = ${num(v)}\)`;

// ───────────── Easy ─────────────

function easyCriticalPoints(rng) {
  if (rng.bool(0.45)) {
    const a = rng.nonzero(-4, 4);
    const h = rng.nonzero(-6, 6);
    const coefs = [a, -2 * a * h, rng.int(-9, 9)];
    return q({
      prompt: R`Find the critical point of \(f(x) = ${poly(coefs)}\).`,
      correct: h,
      fmt: xEq,
      wrong: [{ value: -h, why: R`Solve \(${linear(2 * a, -2 * a * h)} = 0\) carefully: the solution is \(x = ${h}\).` }, { value: 2 * h, why: R`\(f'(x) = ${linear(2 * a, -2 * a * h)}\). Divide by the coefficient of \(x\), which is \(${2 * a}\).` }, -2 * a * h, 0, h + 1],
      solution: [R`Critical points are where \(f'(x) = 0\) (or where \(f'\) is not defined).`, R`\(f'(x) = ${linear(2 * a, -2 * a * h)}\).`, R`\(${linear(2 * a, -2 * a * h)} = 0\) gives \(x = ${h}\).`],
      rule: 1,
      skill: 'critical points',
      check: () => checkEqual(numDeriv((x) => polyEval(coefs, x), h), 0, 1e-6, "f'(h)"),
    });
  }
  const p = rng.int(-4, 3);
  const qv = p + 2 * rng.int(1, 3);
  const coefs = cubicWith(p, qv, 1, rng.int(-9, 9));
  const f = (x) => polyEval(coefs, x);
  const m = (p + qv) / 2;
  const set = (list) => M(rootsTex(list));
  return q({
    prompt: R`Find the critical points of \(f(x) = ${poly(coefs)}\).`,
    correct: set([p, qv]),
    wrong: [
      { value: set([m]), why: R`\(x = ${m}\) is where \(f''(x) = 0\). Critical points come from \(f'(x) = 0\).` },
      { value: set([-p, -qv]), why: R`\(f'(x) = 3${factor(p)}${factor(qv)}\): each factor is 0 at \(x = ${p}\) or \(x = ${qv}\).` },
      set([p]),
      set([p + 1, qv + 1]),
      set([0, qv === 0 ? p : qv]),
    ],
    solution: [R`\(f'(x) = ${poly(polyDeriv(coefs))} = 3(${poly([1, -(p + qv), p * qv])})\).`, R`Factor: \(f'(x) = 3${factor(p)}${factor(qv)}\).`, R`\(f'(x) = 0\) when \(${rootsTex([p, qv])}\).`],
    rule: 1,
    skill: 'critical points',
    check: () => checkAll(checkEqual(numDeriv(f, p), 0, 1e-5, "f'(p)"), checkEqual(numDeriv(f, qv), 0, 1e-5, "f'(q)")),
  });
}

function easySignChart(rng) {
  const a = rng.int(-5, 3);
  const b = a + rng.int(1, 5);
  const signs = [rng.sign(), rng.sign(), rng.sign()];
  const atA = rng.bool(0.5);
  const c = atA ? a : b;
  const [before, after] = atA ? [signs[0], signs[1]] : [signs[1], signs[2]];
  const kind = before > 0 && after < 0 ? 'max' : before < 0 && after > 0 ? 'min' : 'neither';
  const sg = (s) => (s > 0 ? '+' : '-');
  const word = (s) => (s > 0 ? 'positive' : 'negative');
  const choice = { max: 'A local maximum', min: 'A local minimum', neither: 'Neither a local maximum nor a local minimum', none: R`Nothing can be concluded from the signs of \(f'\)` };
  const why = {
    max: R`\(f'\) goes from ${word(before)} to ${word(after)} at \(x = ${c}\), which is not the pattern "rising, then falling".`,
    min: R`\(f'\) goes from ${word(before)} to ${word(after)} at \(x = ${c}\), which is not the pattern "falling, then rising".`,
    neither: R`\(f'\) changes sign at \(x = ${c}\), so the function does turn around there.`,
    none: 'The first derivative test uses exactly this information: the sign of the derivative on each side.',
  };
  const cols = [[M(`x < ${a}`), M(sg(signs[0]))], [M(`${a} < x < ${b}`), M(sg(signs[1]))], [M(`x > ${b}`), M(sg(signs[2]))]];
  const fp = (x) => (x < a ? signs[0] : x < b ? signs[1] : signs[2]) * Math.abs((x - a) * (x - b));
  return q({
    prompt: R`A function \(f\) is differentiable for all \(x\), with \(f'(${a}) = 0\) and \(f'(${b}) = 0\). The table shows the sign of \(f'(x)\) on each interval. What does \(f\) have at \(x = ${c}\)?`,
    visual: rowTable(['\\text{interval}', "f'(x)"], cols, `Sign of f′: ${word(signs[0])} for x less than ${txt(a)}, ${word(signs[1])} between ${txt(a)} and ${txt(b)}, ${word(signs[2])} for x greater than ${txt(b)}.`),
    correct: choice[kind],
    wrong: Object.keys(choice).filter((k) => k !== kind).map((k) => ({ value: choice[k], why: why[k] })),
    solution: [
      R`First derivative test: look at the sign of \(f'\) just to the left and just to the right of \(x = ${c}\).`,
      R`To the left \(f'\) is ${word(before)} (\(f\) is ${before > 0 ? 'increasing' : 'decreasing'}); to the right \(f'\) is ${word(after)} (\(f\) is ${after > 0 ? 'increasing' : 'decreasing'}).`,
      kind === 'max' ? R`\(f\) rises and then falls, so it has a local maximum at \(x = ${c}\).` : kind === 'min' ? R`\(f\) falls and then rises, so it has a local minimum at \(x = ${c}\).` : R`\(f'\) does not change sign, so \(f\) keeps ${before > 0 ? 'rising' : 'falling'}: there is no local extremum at \(x = ${c}\).`,
    ],
    rule: 2,
    skill: 'first derivative test',
    check: () => {
      const d = Math.min(0.4, (b - a) / 3);
      const [L, Rr] = [integrate(fp, c, c - d), integrate(fp, c, c + d)];
      const seen = L < 0 && Rr < 0 ? 'max' : L > 0 && Rr > 0 ? 'min' : 'neither';
      return seen === kind ? true : `integrating the sign pattern gives "${seen}"`;
    },
  });
}

function easyIncreasing(rng) {
  const a = rng.int(-6, 4);
  const b = a + rng.int(1, 6);
  const s = rng.sign();
  const wantInc = rng.bool(0.5);
  const fp = (x) => s * (x - a) * (x - b);
  const tex = `${s < 0 ? '-' : ''}${factor(a)}${factor(b)}`;
  const between = R`\(${a} < x < ${b}\)`;
  const outside = R`\(x < ${a}\) and \(x > ${b}\)`;
  const isBetween = (s > 0) !== wantInc;
  const want = wantInc ? 'increasing' : 'decreasing';
  return q({
    prompt: R`The derivative of a function \(f\) is \(f'(x) = ${tex}\). On which interval or intervals is \(f\) ${want}?`,
    correct: isBetween ? between : outside,
    wrong: [
      { value: isBetween ? outside : between, why: R`Test a point: at \(x = ${num((a + b) / 2)}\), \(f'\) is ${fp((a + b) / 2) > 0 ? 'positive' : 'negative'}, so \(f\) is ${fp((a + b) / 2) > 0 ? 'increasing' : 'decreasing'} between \(${a}\) and \(${b}\).` },
      { value: R`\(x > ${a}\)`, why: R`The sign of \(f'\) changes again at \(x = ${b}\).` },
      R`\(x < ${b}\)`,
      R`\(x > ${b}\) only`,
    ],
    solution: [
      R`\(f\) is ${want} where \(f'(x) ${wantInc ? '>' : '<'} 0\). The sign of \(f'\) can only change at its zeros, \(x = ${a}\) and \(x = ${b}\).`,
      R`Test one point in each interval: \(f'(${a - 1}) = ${fp(a - 1)}\), \(f'(${num((a + b) / 2)}) = ${num(fp((a + b) / 2))}\), \(f'(${b + 1}) = ${fp(b + 1)}\).`,
      isBetween ? R`\(f'\) is ${wantInc ? 'positive' : 'negative'} only between the zeros: \(${a} < x < ${b}\).` : R`\(f'\) is ${wantInc ? 'positive' : 'negative'} outside the zeros: \(x < ${a}\) and \(x > ${b}\).`,
    ],
    rule: 2,
    skill: 'increasing and decreasing',
    check: () => {
      const ok = (x) => (wantInc ? fp(x) > 0 : fp(x) < 0);
      return ok((a + b) / 2) === isBetween && ok(a - 1) === !isBetween && ok(b + 1) === !isBetween ? true : 'signs do not match the answer';
    },
  });
}

// ───────────── Medium ─────────────

function mediumCubic(rng) {
  const p = rng.int(-4, 2);
  const qv = p + 2 * rng.int(1, 2);
  const s = rng.sign();
  const coefs = cubicWith(p, qv, s, rng.int(-6, 9));
  const f = (x) => polyEval(coefs, x);
  const m = (p + qv) / 2;
  const [xmax, xmin] = s > 0 ? [p, qv] : [qv, p];
  const kind = rng.pick(['interval', 'maxx', 'minval']);
  const d1 = R`\(f'(x) = ${poly(polyDeriv(coefs))} = ${3 * s}${factor(p)}${factor(qv)}\), which is 0 at \(x = ${p}\) and \(x = ${qv}\).`;
  const signs = R`\(f'\) is ${s > 0 ? 'positive' : 'negative'} for \(x < ${p}\), ${s > 0 ? 'negative' : 'positive'} for \(${p} < x < ${qv}\), and ${s > 0 ? 'positive' : 'negative'} for \(x > ${qv}\).`;
  const base = { rule: 2, skill: 'first derivative test' };
  if (kind === 'interval') {
    const inside = R`\(${p} < x < ${qv}\)`;
    return q({
      ...base,
      prompt: R`On which interval is \(f(x) = ${poly(coefs)}\) ${s > 0 ? 'decreasing' : 'increasing'}?`,
      correct: inside,
      wrong: [
        { value: R`\(x < ${p}\) and \(x > ${qv}\)`, why: R`There \(f'\) has the other sign: test \(x = ${qv + 1}\), where \(f'(${qv + 1}) = ${polyEval(polyDeriv(coefs), qv + 1)}\).` },
        { value: R`\(x < ${m}\)`, why: R`\(x = ${m}\) is where the concavity changes. Increase and decrease are decided by the sign of \(f'\), which changes at \(x = ${p}\) and \(x = ${qv}\).` },
        R`\(x > ${m}\)`,
        R`\(x > ${qv}\)`,
      ],
      solution: [d1, signs, R`So \(f\) is ${s > 0 ? 'decreasing' : 'increasing'} on \(${p} < x < ${qv}\).`],
      check: () => (Math.sign(numDeriv(f, m)) === -s && Math.sign(numDeriv(f, p - 1)) === s && Math.sign(numDeriv(f, qv + 1)) === s ? true : 'signs of the derivative are off'),
    });
  }
  if (kind === 'maxx') {
    return q({
      ...base,
      prompt: R`At which value of \(x\) does \(f(x) = ${poly(coefs)}\) have a local maximum?`,
      correct: xmax,
      fmt: xEq,
      wrong: [
        { value: xmin, why: R`At \(x = ${xmin}\), \(f'\) changes from negative to positive: that is a local minimum.` },
        { value: m, why: R`\(x = ${m}\) is where \(f''(x) = 0\): an inflection point, not an extremum.` },
        -xmax === xmin || -xmax === m || xmax === 0 ? xmax + 3 : -xmax,
        xmax - 1 === m || xmax - 1 === xmin ? xmax - 3 : xmax - 1,
      ],
      solution: [d1, signs, R`\(f'\) changes from positive to negative at \(x = ${xmax}\), so \(f\) has a local maximum there.`],
      check: () => (f(xmax - 0.01) < f(xmax) && f(xmax + 0.01) < f(xmax) ? true : 'not a local maximum'),
    });
  }
  return q({
    ...base,
    prompt: R`What is the local minimum value of \(f(x) = ${poly(coefs)}\)?`,
    correct: f(xmin),
    wrong: [
      { value: f(xmax), why: R`That is the local maximum value, \(f(${xmax})\).` },
      { value: xmin, why: R`\(x = ${xmin}\) is where the minimum occurs. Its value is \(f(${xmin})\).` },
      f(m),
      coefs[3],
      f(xmin) - 2,
    ],
    solution: [d1, signs, R`\(f'\) changes from negative to positive at \(x = ${xmin}\): a local minimum.`, R`Its value is \(f(${xmin}) = ${f(xmin)}\).`],
    check: () => (f(xmin - 0.01) > f(xmin) && f(xmin + 0.01) > f(xmin) ? true : 'not a local minimum'),
  });
}

function mediumConcavity(rng) {
  const base = { rule: 3, skill: 'concavity and inflection points' };
  if (rng.bool(0.5)) {
    const h = rng.nonzero(-4, 4);
    const coefs = [1, -3 * h, rng.int(-6, 6), rng.int(-9, 9)];
    const f = (x) => polyEval(coefs, x);
    const askPoint = rng.bool(0.5);
    const d2 = R`\(f'(x) = ${poly(polyDeriv(coefs))}\) and \(f''(x) = ${linear(6, -6 * h)}\).`;
    const check = () => (numDeriv2(f, h - 1) < 0 && numDeriv2(f, h + 1) > 0 ? true : 'concavity does not change as claimed');
    if (askPoint) {
      return q({
        ...base,
        prompt: R`At which value of \(x\) does the graph of \(f(x) = ${poly(coefs)}\) have an inflection point?`,
        correct: h,
        fmt: xEq,
        wrong: [{ value: -h, why: R`Solve \(${linear(6, -6 * h)} = 0\): \(x = ${h}\).` }, { value: 3 * h, why: R`\(f''(x) = ${linear(6, -6 * h)}\), so divide \(${6 * h}\) by 6.` }, 2 * h, 0],
        solution: [d2, R`\(f''(x) = 0\) at \(x = ${h}\), and \(f''\) changes from negative to positive there.`, R`The concavity changes, so there is an inflection point at \(x = ${h}\).`],
        check,
      });
    }
    return q({
      ...base,
      prompt: R`On which interval is the graph of \(f(x) = ${poly(coefs)}\) concave up?`,
      correct: R`\(x > ${h}\)`,
      wrong: [{ value: R`\(x < ${h}\)`, why: R`For \(x < ${h}\), \(f''(x) = ${linear(6, -6 * h)}\) is negative: the graph is concave down there.` }, { value: R`\(x > ${-h}\)`, why: R`Solve \(${linear(6, -6 * h)} > 0\): \(x > ${h}\).` }, R`\(x > ${3 * h}\)`, 'all real numbers'],
      solution: [d2, R`The graph is concave up where \(f''(x) > 0\): \(${linear(6, -6 * h)} > 0\).`, R`So \(x > ${h}\).`],
      check,
    });
  }
  const k = rng.int(1, 4);
  const coefs = [1, 0, -6 * k * k, rng.int(-6, 6), rng.int(-9, 9)];
  const f = (x) => polyEval(coefs, x);
  const up = rng.bool(0.5);
  return q({
    ...base,
    prompt: R`On which interval or intervals is the graph of \(f(x) = ${poly(coefs)}\) concave ${up ? 'up' : 'down'}?`,
    correct: up ? R`\(x < ${-k}\) and \(x > ${k}\)` : R`\(${-k} < x < ${k}\)`,
    wrong: [
      { value: up ? R`\(${-k} < x < ${k}\)` : R`\(x < ${-k}\) and \(x > ${k}\)`, why: R`Test \(x = 0\): \(f''(0) = ${-12 * k * k}\) is negative, so the graph is concave down between \(${-k}\) and \(${k}\).` },
      { value: R`\(x > 0\)`, why: R`\(f''(x) = 12x^{2} - ${12 * k * k}\) changes sign at \(x = ${-k}\) and \(x = ${k}\), not at 0.` },
      up ? R`\(x > ${k}\) only` : R`\(x < ${k}\)`,
      up ? R`\(x < ${-k * k}\) and \(x > ${k * k}\)` : R`\(${-k * k} < x < ${k * k}\)`,
    ],
    solution: [R`\(f'(x) = ${poly(polyDeriv(coefs))}\) and \(f''(x) = 12x^{2} - ${12 * k * k} = 12(x - ${k})(x + ${k})\).`, R`\(f''\) is positive for \(x < ${-k}\) and \(x > ${k}\), and negative for \(${-k} < x < ${k}\).`, up ? R`Concave up: \(x < ${-k}\) and \(x > ${k}\).` : R`Concave down: \(${-k} < x < ${k}\).`],
    check: () => (numDeriv2(f, 0) < 0 && numDeriv2(f, k + 1) > 0 && numDeriv2(f, -k - 1) > 0 ? true : 'concavity is not as claimed'),
  });
}

function mediumMVT(rng) {
  const kind = rng.pick(['quad', 'quad', 'sqrt', 'cubic']);
  const base = { rule: 0, skill: 'Mean Value Theorem' };
  const ask = (fTex, a, b) => R`Find the number \(c\) in \((${a}, ${b})\) that satisfies the conclusion of the Mean Value Theorem for \(f(x) = ${fTex}\) on \([${a}, ${b}]\).`;
  const check = (f, a, b, c) => () => checkAll(c > a && c < b ? true : 'c is outside the interval', checkEqual(numDeriv(f, c), (f(b) - f(a)) / (b - a), 1e-5, "f'(c)"));
  if (kind === 'quad') {
    const A = rng.nonzero(-3, 3);
    const B = rng.int(-6, 6);
    const a = rng.int(-4, 3);
    const b = a + rng.int(2, 6);
    const coefs = [A, B, rng.int(-5, 5)];
    const f = (x) => polyEval(coefs, x);
    const slope = (f(b) - f(a)) / (b - a);
    const c = (a + b) / 2;
    return q({
      ...base,
      prompt: ask(poly(coefs), a, b),
      correct: c,
      fmt: (v) => R`\(c = ${num(v)}\)`,
      wrong: [{ value: slope, why: R`That is the average rate of change. The question asks for the input \(c\) where \(f'(c)\) equals it.` }, { value: (slope - B) / A, why: R`Solve \(${linear(2 * A, B, 'c')} = ${slope}\): divide by \(${2 * A}\), not by \(${A}\).` }, c + 1, b - a, c - 0.5],
      solution: [R`Average rate of change: \(\dfrac{f(${b}) - f(${a})}{${b} - ${a < 0 ? `(${a})` : a}} = \dfrac{${f(b)} - ${f(a) < 0 ? `(${f(a)})` : f(a)}}{${b - a}} = ${slope}\).`, R`\(f'(x) = ${linear(2 * A, B)}\). Set \(f'(c) = ${slope}\): \(${linear(2 * A, B, 'c')} = ${slope}\).`, R`\(c = ${num(c)}\), which lies in \((${a}, ${b})\).`],
      check: check(f, a, b, c),
    });
  }
  if (kind === 'sqrt') {
    const p = rng.int(0, 4);
    const qv = p + 2 * rng.int(1, 3);
    const [a, b] = [p * p, qv * qv];
    const half = (p + qv) / 2;
    const c = half * half;
    return q({
      ...base,
      prompt: ask('\\sqrt{x}', a, b),
      correct: c,
      fmt: (v) => R`\(c = ${num(v)}\)`,
      wrong: [{ value: (a + b) / 2, why: 'The point c is the midpoint of the interval only for a parabola. Solve the equation for this function.' }, { value: half, why: R`That is \(\sqrt{c}\). Square it to get \(c\).` }, frac(1, p + qv), c + 1, 2 * c],
      solution: [R`Average rate of change: \(\dfrac{\sqrt{${b}} - \sqrt{${a}}}{${b} - ${a}} = \dfrac{${qv - p}}{${b - a}} = \dfrac{1}{${p + qv}}\).`, R`\(f'(x) = \dfrac{1}{2\sqrt{x}}\). Set \(\dfrac{1}{2\sqrt{c}} = \dfrac{1}{${p + qv}}\): \(\sqrt{c} = ${num(half)}\).`, R`\(c = ${num(c)}\), which lies in \((${a}, ${b})\).`],
      check: check(Math.sqrt, a, b, c),
    });
  }
  const k = rng.int(1, 4);
  const b = 3 * k;
  const root = (n) => M(`c = ${n}`);
  return q({
    ...base,
    prompt: ask('x^{3}', 0, b),
    correct: root(sqrtTex(3, k)),
    wrong: [{ value: root(num(b / 2)), why: 'The point c is the midpoint of the interval only for a parabola. Solve the equation for this function.' }, { value: root(String(b * b)), why: R`That is the average rate of change. Set \(f'(c) = 3c^{2}\) equal to it and solve for \(c\).` }, { value: root(sqrtTex(3, -k)), why: R`\(c\) must lie inside the interval \((0, ${b})\), so take the positive root.` }, root(sqrtTex(3, 3 * k))],
    solution: [R`Average rate of change: \(\dfrac{${b}^{3} - 0}{${b} - 0} = ${b * b}\).`, R`\(f'(x) = 3x^{2}\). Set \(3c^{2} = ${b * b}\): \(c^{2} = ${3 * k * k}\).`, R`\(c = ${sqrtTex(3, k)}\) (the positive root, because \(c\) must be in \((0, ${b})\)).`],
    check: check((x) => x ** 3, 0, b, k * Math.sqrt(3)),
  });
}

const THEOREM_BANK = [
  (rng) => {
    const a = rng.int(-5, 3);
    const b = a + rng.int(2, 6);
    return {
      prompt: R`A function \(f\) is continuous on the closed interval \([${a}, ${b}]\). Which statement must be true?`,
      correct: R`\(f\) has an absolute maximum and an absolute minimum on \([${a}, ${b}]\)`,
      wrong: [{ value: R`\(f'(c) = 0\) for some \(c\) in \((${a}, ${b})\)`, why: 'An extreme value can occur at an endpoint, or at a corner where the derivative does not exist.' }, { value: R`The absolute maximum of \(f\) occurs at \(x = ${a}\) or at \(x = ${b}\)`, why: 'It may occur at an endpoint or at a critical point inside the interval.' }, R`\(f\) is differentiable on \((${a}, ${b})\)`],
      solution: ['Extreme Value Theorem: a function that is continuous on a closed interval attains both an absolute maximum and an absolute minimum there.', 'It does not say where they occur, and it does not need the function to be differentiable.'],
      rule: 0,
    };
  },
  (rng) => {
    const c = rng.int(-6, 6);
    return {
      prompt: R`A differentiable function \(f\) has \(f'(${c}) = 0\). Which statement must be true?`,
      correct: R`\(x = ${c}\) is a critical point of \(f\)`,
      wrong: [{ value: R`\(f\) has a local maximum or a local minimum at \(x = ${c}\)`, why: R`Not necessarily: \(${c === 0 ? 'x^{3}' : `(${linear(1, -c)})^{3}`}\) has derivative 0 at \(x = ${c}\) but keeps increasing.` }, { value: R`The graph of \(f\) has an inflection point at \(x = ${c}\)`, why: 'A horizontal tangent says nothing about a change of concavity.' }, R`\(f(${c}) = 0\)`],
      solution: [R`A critical point is a point of the domain where \(f'\) is 0 or does not exist, so \(x = ${c}\) is a critical point.`, 'A critical point is only a candidate for a local extremum. The first or second derivative test decides what happens there.'],
      rule: 1,
    };
  },
  (rng) => {
    const c = rng.int(-6, 6);
    return {
      prompt: R`A differentiable function \(f\) has a local minimum at \(x = ${c}\). Which statement must be true?`,
      correct: R`\(f'(${c}) = 0\)`,
      wrong: [{ value: R`\(f''(${c}) > 0\)`, why: R`The second derivative can be 0 at a minimum: \(${c === 0 ? 'x^{4}' : `(${linear(1, -c)})^{4}`}\) has a minimum at \(x = ${c}\) with \(f''(${c}) = 0\).` }, { value: R`\(f(${c}) \le f(x)\) for every \(x\)`, why: 'A local minimum is the smallest value nearby, not necessarily the smallest value overall.' }, R`\(f(${c}) = 0\)`],
      solution: ['At a local extremum of a differentiable function the tangent line is horizontal (Fermat\'s theorem).', R`So \(f'(${c}) = 0\).`],
      rule: 1,
    };
  },
  (rng) => {
    const c = rng.int(-6, 6);
    return {
      prompt: R`A function \(f\) has a continuous second derivative, and \(f''(${c}) = 0\). What can be concluded?`,
      correct: R`The graph has an inflection point at \(x = ${c}\) only if \(f''\) changes sign there`,
      wrong: [{ value: R`The graph has an inflection point at \(x = ${c}\)`, why: R`Not necessarily: for \(${c === 0 ? 'x^{4}' : `(${linear(1, -c)})^{4}`}\) the second derivative is 0 at \(x = ${c}\) but the graph is concave up on both sides.` }, { value: R`\(f\) has a local maximum or minimum at \(x = ${c}\)`, why: 'Local extrema are found from the first derivative, not from a zero of the second.' }, R`\(f'(${c}) = 0\)`],
      solution: ['An inflection point is a point where the concavity changes.', R`\(f''(${c}) = 0\) only makes \(x = ${c}\) a candidate. The sign of \(f''\) on each side decides.`],
      rule: 3,
    };
  },
  (rng) => {
    const a = rng.int(-5, 3);
    const b = a + rng.int(2, 6);
    return {
      prompt: R`A function \(f\) is continuous on \([${a}, ${b}]\) and \(f'(x) > 0\) for all \(x\) in \((${a}, ${b})\). Where does \(f\) attain its absolute maximum on \([${a}, ${b}]\)?`,
      correct: R`At \(x = ${b}\)`,
      wrong: [{ value: R`At \(x = ${a}\)`, why: R`\(f' > 0\) means \(f\) is increasing, so its smallest value is at the left endpoint.` }, { value: R`At a critical point inside \((${a}, ${b})\)`, why: R`There are no critical points: \(f'\) is never 0 on the interval.` }, R`At \(x = ${num((a + b) / 2)}\)`],
      solution: [R`\(f'(x) > 0\) on the whole interval, so \(f\) is increasing on \([${a}, ${b}]\).`, R`An increasing function is largest at the right endpoint: the absolute maximum is \(f(${b})\).`],
      rule: 5,
    };
  },
];

function mediumTheorems(rng) {
  return fromBank(rng, THEOREM_BANK, { skill: 'theorems about extrema' });
}

// ───────────── Hard ─────────────

function hardCandidates(rng) {
  const p = rng.int(1, 2);
  const qv = p + 2;
  const H = qv + rng.int(0, 2);
  const s = rng.sign();
  const base0 = s > 0 ? rng.int(8, 20) : rng.int(24, 36);
  const coefs = cubicWith(p, qv, s, base0);
  const f = (x) => polyEval(coefs, x);
  const story = rng.pick([
    { fn: 'T', text: (ft) => R`The temperature in a greenhouse \(t\) hours after noon is \(T(t) = ${ft}\) degrees Celsius, for \(0 \le t \le ${H}\).`, hi: 'What is the highest temperature during this period?', lo: 'What is the lowest temperature during this period?', unit: '°C' },
    { fn: 'D', text: (ft) => R`The depth of water in a harbor \(t\) hours after midnight is \(D(t) = ${ft}\) feet, for \(0 \le t \le ${H}\).`, hi: 'What is the greatest depth during this period?', lo: 'What is the least depth during this period?', unit: 'ft' },
  ]);
  const wantMax = rng.bool(0.5);
  const cands = [0, p, qv, H].filter((x, i, arr) => arr.indexOf(x) === i);
  const vals = cands.map(f);
  const ans = wantMax ? Math.max(...vals) : Math.min(...vals);
  const at = cands[vals.indexOf(ans)];
  const localOther = wantMax ? f(s > 0 ? p : qv) : f(s > 0 ? qv : p);
  let scan = wantMax ? -Infinity : Infinity;
  for (let i = 0; i <= 20000; i++) scan = wantMax ? Math.max(scan, f((H * i) / 20000)) : Math.min(scan, f((H * i) / 20000));
  return q({
    prompt: `${story.text(poly(coefs, 't'))} ${wantMax ? story.hi : story.lo}`,
    correct: ans,
    unit: story.unit,
    wrong: [
      localOther !== ans ? { value: localOther, why: `That is a local ${wantMax ? 'maximum' : 'minimum'} value, but an endpoint of the interval gives a ${wantMax ? 'larger' : 'smaller'} one. Always check the endpoints too.` } : { value: wantMax ? Math.min(...vals) : Math.max(...vals), why: `That is the ${wantMax ? 'lowest' : 'highest'} value on the interval.` },
      { value: at, why: `That is the time at which it happens. The question asks for the value of the function then.` },
      ...vals.filter((v) => v !== ans),
      ans + (wantMax ? 2 : -2),
    ],
    solution: [
      R`Candidates test: on a closed interval the extreme values occur at critical points or at endpoints.`,
      R`Derivative: \(${poly(polyDeriv(coefs), 't')} = ${3 * s}(t - ${p})(t - ${qv})\), which is 0 at \(t = ${p}\) and \(t = ${qv}\).`,
      R`Evaluate at every candidate: ${cands.map((x) => R`\(${story.fn}(${x}) = ${f(x)}\)`).join(', ')}.`,
      R`The ${wantMax ? 'largest' : 'smallest'} of these is \(${ans}\) ${story.unit}, at ${cands.filter((x) => f(x) === ans).map((x) => R`\(t = ${x}\)`).join(' and ')}.`,
    ],
    rule: 5,
    skill: 'absolute extrema on a closed interval',
    check: () => checkEqual(scan, ans, 1e-4, 'extreme value found by scanning the interval'),
  });
}

function hardGraphOfDerivative(rng) {
  const r1 = rng.int(-4, 1);
  const gap = rng.pick([2, 4]);
  const r2 = r1 + gap;
  const m = (r1 + r2) / 2;
  const s = rng.sign();
  const k = (s * (gap === 2 ? 1 : 0.5));
  const fp = (x) => k * (x - r1) * (x - r2);
  const ask = rng.pick(['max', 'min', 'inflection', 'increasing', 'concaveUp']);
  const [xmax, xmin] = s > 0 ? [r1, r2] : [r2, r1];
  const visual = {
    type: 'plot',
    ...fit(fp, r1 - 2, r2 + 2, { include: [0], pad: 0.1 }),
    fns: [{ f: fp, label: 'f′', labelAt: m }],
    points: [{ x: r1, y: 0 }, { x: r2, y: 0 }],
    alt: `Graph of the derivative f′: a parabola opening ${s > 0 ? 'upward' : 'downward'} that crosses the x-axis at x = ${txt(r1)} and x = ${txt(r2)} and has its ${s > 0 ? 'lowest' : 'highest'} point at x = ${txt(m)}.`,
  };
  const head = R`The graph shown is the graph of \(f'\), the derivative of a function \(f\).`;
  const base = { visual, rule: 6, skill: 'reading the graph of the derivative' };
  const between = R`\(${r1} < x < ${r2}\)`;
  const outside = R`\(x < ${r1}\) and \(x > ${r2}\)`;
  if (ask === 'max' || ask === 'min') {
    const isMax = ask === 'max';
    const ans = isMax ? xmax : xmin;
    const other = isMax ? xmin : xmax;
    return q({
      ...base,
      prompt: `${head} At which value of \\(x\\) does \\(f\\) have a local ${isMax ? 'maximum' : 'minimum'}?`,
      correct: ans,
      fmt: xEq,
      wrong: [
        { value: other, why: R`At \(x = ${other}\) the graph of \(f'\) crosses the axis from ${isMax ? 'below to above' : 'above to below'}: \(f\) has a local ${isMax ? 'minimum' : 'maximum'} there.` },
        { value: m, why: R`At \(x = ${m}\) it is \(f'\) that has a turning point. For \(f\) that marks an inflection point, not an extremum.` },
        ans === 0 || -ans === other || -ans === m ? ans + 5 : -ans,
        r2 + 1,
      ],
      solution: [R`\(f\) has a local ${isMax ? 'maximum' : 'minimum'} where \(f'\) changes from ${isMax ? 'positive to negative' : 'negative to positive'}.`, R`On the graph, \(f'\) crosses the \(x\)-axis from ${isMax ? 'above to below' : 'below to above'} at \(x = ${ans}\).`, R`So \(f\) has a local ${isMax ? 'maximum' : 'minimum'} at \(x = ${ans}\).`],
      check: () => (Math.sign(fp(ans - 0.1)) === (isMax ? 1 : -1) && Math.sign(fp(ans + 0.1)) === (isMax ? -1 : 1) ? true : 'sign change is the wrong way round'),
    });
  }
  if (ask === 'inflection') {
    return q({
      ...base,
      prompt: `${head} At which value of \\(x\\) does the graph of \\(f\\) have an inflection point?`,
      correct: m,
      fmt: xEq,
      wrong: [{ value: r1, why: R`At \(x = ${r1}\), \(f'\) is 0: that gives a local extremum of \(f\), not an inflection point.` }, { value: r2, why: R`At \(x = ${r2}\), \(f'\) is 0: that gives a local extremum of \(f\), not an inflection point.` }, m === 0 ? r2 + 1 : -m === r1 || -m === r2 ? m + 4 : -m, r1 - 1],
      solution: [R`\(f\) has an inflection point where \(f''\) changes sign, that is, where \(f'\) changes from increasing to decreasing or the reverse.`, R`The graph of \(f'\) turns around at its ${s > 0 ? 'lowest' : 'highest'} point, \(x = ${m}\).`, R`So the graph of \(f\) has an inflection point at \(x = ${m}\).`],
      check: () => (Math.sign(numDeriv(fp, m - 0.1)) === -Math.sign(numDeriv(fp, m + 0.1)) ? true : 'the derivative does not turn around there'),
    });
  }
  if (ask === 'increasing') {
    const ans = s > 0 ? outside : between;
    return q({
      ...base,
      prompt: `${head} On which interval or intervals is \\(f\\) increasing?`,
      correct: ans,
      wrong: [{ value: s > 0 ? between : outside, why: R`There the graph of \(f'\) is below the \(x\)-axis, so \(f' < 0\) and \(f\) is decreasing.` }, { value: R`\(x > ${m}\)`, why: R`That is where \(f'\) is increasing (so \(f\) is concave up). \(f\) itself increases where \(f'\) is positive.` }, R`\(x < ${m}\)`, R`\(x > ${r1}\)`],
      solution: [R`\(f\) is increasing where \(f'(x) > 0\), that is, where the graph of \(f'\) is above the \(x\)-axis.`, s > 0 ? R`That happens to the left of \(x = ${r1}\) and to the right of \(x = ${r2}\).` : R`That happens between \(x = ${r1}\) and \(x = ${r2}\).`],
      check: () => ((fp(m) > 0) === (s < 0) && (fp(r1 - 1) > 0) === (s > 0) ? true : 'sign of the derivative is off'),
    });
  }
  const ans = s > 0 ? R`\(x > ${m}\)` : R`\(x < ${m}\)`;
  return q({
    ...base,
    prompt: `${head} On which interval is the graph of \\(f\\) concave up?`,
    correct: ans,
    wrong: [{ value: s > 0 ? R`\(x < ${m}\)` : R`\(x > ${m}\)`, why: R`There \(f'\) is decreasing, so \(f'' < 0\) and the graph of \(f\) is concave down.` }, { value: s > 0 ? outside : between, why: R`That is where \(f'\) is positive, which tells where \(f\) is increasing. Concavity depends on whether \(f'\) is increasing.` }, s > 0 ? between : outside, R`\(x > ${r2}\)`],
    solution: [R`The graph of \(f\) is concave up where \(f'' > 0\), that is, where \(f'\) is increasing.`, R`The graph of \(f'\) rises to the ${s > 0 ? 'right' : 'left'} of \(x = ${m}\).`, R`So the graph of \(f\) is concave up for ${ans}.`],
    check: () => ((numDeriv(fp, m + 1) > 0) === (s > 0) ? true : 'the derivative is not increasing there'),
  });
}

function hardSecondDerivativeTest(rng) {
  const a = rng.int(1, 5);
  const k = rng.int(1, 9);
  const u = linear(1, -a);
  const s = rng.pick([
    { tex: `x + \\dfrac{${a * a}}{x}`, c: a, f: (x) => x + (a * a) / x, d2: R`f''(x) = \dfrac{${2 * a * a}}{x^{3}}`, val: frac(2, a).tex() },
    { tex: `x + \\dfrac{${a * a}}{x}`, c: -a, f: (x) => x + (a * a) / x, d2: R`f''(x) = \dfrac{${2 * a * a}}{x^{3}}`, val: frac(-2, a).tex() },
    { tex: poly([1, 0, -3 * a * a, k]), c: a, f: (x) => x ** 3 - 3 * a * a * x + k, d2: R`f''(x) = 6x`, val: String(6 * a) },
    { tex: poly([1, 0, -3 * a * a, k]), c: -a, f: (x) => x ** 3 - 3 * a * a * x + k, d2: R`f''(x) = 6x`, val: String(-6 * a) },
    { tex: `${terms([[a * a, '\\ln x']])} - \\dfrac{1}{2}x^{2}`, c: a, f: (x) => a * a * Math.log(x) - 0.5 * x * x, d2: R`f''(x) = -\dfrac{${a * a}}{x^{2}} - 1`, val: '-2' },
    { tex: `(${u})^{4} + ${k}`, c: a, f: (x) => (x - a) ** 4 + k, d2: R`f''(x) = 12(${u})^{2}`, val: '0' },
    { tex: `(${u})^{3} + ${k}`, c: a, f: (x) => (x - a) ** 3 + k, d2: R`f''(x) = 6(${u})`, val: '0' },
    { tex: `x^{2}e^{x}`, c: 0, f: (x) => x * x * Math.exp(x), d2: R`f''(x) = (x^{2} + 4x + 2)e^{x}`, val: '2' },
    { tex: `x^{2}e^{x}`, c: -2, f: (x) => x * x * Math.exp(x), d2: R`f''(x) = (x^{2} + 4x + 2)e^{x}`, val: '-2e^{-2}' },
  ]);
  const d2 = numDeriv2(s.f, s.c, 1e-3);
  const kind = Math.abs(d2) < 1e-4 ? 'none' : d2 < 0 ? 'max' : 'min';
  const fc = `f''(${s.c})`;
  const choice = {
    max: R`A local maximum, because \(${fc} < 0\)`,
    min: R`A local minimum, because \(${fc} > 0\)`,
    none: R`The test gives no conclusion, because \(${fc} = 0\)`,
    mixed: kind === 'min' ? R`A local maximum, because \(${fc} > 0\)` : R`A local minimum, because \(${fc} < 0\)`,
  };
  const why = {
    max: R`\(${fc} = ${s.val}\), which is not negative.`,
    min: R`\(${fc} = ${s.val}\), which is not positive.`,
    none: R`\(${fc} = ${s.val}\), which is not 0, so the test does decide.`,
    mixed: kind === 'none' ? R`\(${fc} = ${s.val}\), so the test does not decide.` : kind === 'min' ? 'A positive second derivative means the graph is concave up, like a cup: the critical point is a minimum.' : 'A negative second derivative means the graph is concave down, like a cap: the critical point is a maximum.',
  };
  return q({
    prompt: R`The function \(f(x) = ${s.tex}\) has a critical point at \(x = ${s.c}\) (where \(f'(${s.c}) = 0\)). What does the second derivative test say about it?`,
    correct: choice[kind],
    wrong: Object.keys(choice).filter((key) => key !== kind).map((key) => ({ value: choice[key], why: why[key] })),
    solution: [
      R`Second derivative: \(${s.d2}\).`,
      R`At the critical point: \(${fc} = ${s.val}\).`,
      kind === 'max' ? 'The second derivative is negative there, so the graph is concave down: a local maximum.' : kind === 'min' ? 'The second derivative is positive there, so the graph is concave up: a local minimum.' : 'The second derivative is 0 there, so the test is inconclusive. The first derivative test would be needed instead.',
    ],
    rule: 4,
    skill: 'second derivative test',
    check: () => checkEqual(numDeriv(s.f, s.c), 0, 1e-4, "f'(c)"),
  });
}

// ───────────── Challenge ─────────────

const MVT_BANK = [
  (rng) => {
    const H = rng.int(2, 5);
    const v = rng.int(12, 30);
    const [who, how] = rng.pick([['A cyclist', 'rides'], ['A delivery van', 'travels'], ['A kayaker', 'paddles']]);
    return {
      prompt: `${who} ${how} ${v * H} km in ${H} hours, without ever stopping abruptly (the position is a differentiable function of time). Which statement must be true?`,
      correct: `At some instant the speed was exactly ${v} km/h`,
      wrong: [
        { value: `The speed was ${v} km/h during the whole trip`, why: `${v} km/h is the average speed. The Mean Value Theorem only guarantees that it is reached at some instant.` },
        { value: `The speed was never greater than ${v} km/h`, why: 'Unless the speed is constant, it must be above the average at some times and below it at others.' },
        `Exactly halfway through the trip, the speed was ${v} km/h`,
      ],
      solution: [`Average speed: ${v * H} ÷ ${H} = ${v} km/h.`, 'By the Mean Value Theorem, at some instant the instantaneous rate of change (the speed) equals the average rate of change.', 'The theorem does not say when that happens, or how many times.'],
    };
  },
  (rng) => {
    const a = rng.int(-4, 3);
    const b = a + rng.int(2, 5);
    const slope = rng.nonzero(-5, 6);
    const fa = rng.int(-8, 8);
    const fb = fa + slope * (b - a);
    return {
      prompt: R`A function \(f\) is differentiable for all \(x\), with \(f(${a}) = ${fa}\) and \(f(${b}) = ${fb}\). For at least one \(c\) in \((${a}, ${b})\), \(f'(c)\) must equal which number?`,
      correct: slope,
      wrong: [{ value: fb - fa, why: R`That is the change in \(f\). Divide it by the length of the interval, \(${b - a}\).` }, { value: 0, why: R`That would be guaranteed only if \(f(${a}) = f(${b})\) (Rolle's theorem).` }, (fa + fb) / 2, -slope, slope + 1],
      solution: [R`\(f\) is differentiable, so the Mean Value Theorem applies on \([${a}, ${b}]\).`, R`\(f'(c) = \dfrac{f(${b}) - f(${a})}{${b} - ${a < 0 ? `(${a})` : a}} = \dfrac{${fb - fa}}{${b - a}} = ${slope}\) for some \(c\) in \((${a}, ${b})\).`],
      check: () => checkEqual(numDeriv((x) => fa + slope * (x - a), (a + b) / 2), slope, 1e-6, 'average slope'),
    };
  },
  (rng) => {
    const a = rng.int(-4, 3);
    const b = a + rng.int(2, 5);
    const v = rng.nonzero(-6, 9);
    return {
      prompt: R`A function \(f\) is differentiable for all \(x\), and \(f(${a}) = f(${b}) = ${v}\). Which statement must be true?`,
      correct: R`\(f'(c) = 0\) for some \(c\) in \((${a}, ${b})\)`,
      wrong: [{ value: R`\(f(x) = ${v}\) for all \(x\) in \([${a}, ${b}]\)`, why: 'The function can rise and come back down (or the reverse). Equal endpoint values do not make it constant.' }, { value: R`\(f'(c) = ${v}\) for some \(c\) in \((${a}, ${b})\)`, why: R`The average rate of change is \(\frac{${v} - ${v < 0 ? `(${v})` : v}}{${b - a}} = 0\), not \(${v}\).` }, R`\(f\) has a local maximum at \(x = ${num((a + b) / 2)}\)`],
      solution: [R`The average rate of change on \([${a}, ${b}]\) is \(\dfrac{f(${b}) - f(${a})}{${b - a}} = 0\).`, R`By the Mean Value Theorem (this special case is Rolle's theorem), \(f'(c) = 0\) for some \(c\) in \((${a}, ${b})\).`],
    };
  },
  (rng) => {
    const k = rng.int(-3, 3);
    const a = k - rng.int(1, 3);
    const b = k + rng.int(1, 3);
    const bad = rng.bool(0.5) ? { tex: `|${linear(1, -k)}|`, why: R`\(|${linear(1, -k)}|\) has a corner at \(x = ${k}\), inside the interval, so it is not differentiable on \((${a}, ${b})\).` } : { tex: `\\dfrac{1}{${linear(1, -k)}}`, why: R`\(\dfrac{1}{${linear(1, -k)}}\) is not defined at \(x = ${k}\), inside the interval, so it is not continuous on \([${a}, ${b}]\).` };
    const smooth = 'Polynomials, sine and exponential functions are continuous and differentiable everywhere, so the theorem applies to them on any interval.';
    return {
      prompt: R`For which function do the hypotheses of the Mean Value Theorem fail on the interval \([${a}, ${b}]\)?`,
      correct: R`\(f(x) = ${bad.tex}\)`,
      wrong: [{ value: R`\(f(x) = ${k === 0 ? 'x^{3}' : `(${linear(1, -k)})^{3}`}\)`, why: smooth }, { value: R`\(f(x) = ${poly([1, -k, 0])}\)`, why: smooth }, { value: R`\(f(x) = ${k === 0 ? '\\sin x' : `\\sin(${linear(1, -k)})`}\)`, why: smooth }],
      solution: [R`The theorem needs \(f\) to be continuous on \([${a}, ${b}]\) and differentiable on \((${a}, ${b})\).`, bad.why, 'The other three functions are continuous and differentiable everywhere.'],
    };
  },
];

function challengeMVT(rng) {
  return fromBank(rng, MVT_BANK, { rule: 0, skill: 'Mean Value Theorem' });
}

function challengeFindCoefficients(rng) {
  const p = rng.int(-4, 2);
  const qv = p + 2 * rng.int(1, 3);
  const a = (-3 * (p + qv)) / 2;
  const b = 3 * p * qv;
  const f = (x) => x ** 3 + a * x * x + b * x + 5;
  const pair = (u, v) => R`\(a = ${num(u)},\ b = ${num(v)}\)`;
  return q({
    prompt: R`The function \(f(x) = x^{3} + ax^{2} + bx + 5\) has critical points at \(x = ${p}\) and \(x = ${qv}\). Find \(a\) and \(b\).`,
    correct: pair(a, b),
    wrong: [
      { value: pair(-(p + qv), p * qv), why: R`\(f'(x) = 3x^{2} + 2ax + b\) must equal \(3${factor(p)}${factor(qv)}\). Keep the factor 3 and the 2 in \(2a\).` },
      { value: pair(-a, b), why: R`Expanding \(3${factor(p)}${factor(qv)}\) gives the \(x\)-coefficient \(${-3 * (p + qv)}\), so \(2a = ${-3 * (p + qv)}\).` },
      pair(-3 * (p + qv), b),
      pair(a, -b === b ? b + 3 : -b),
      pair(b, a),
    ],
    solution: [
      R`\(f'(x) = 3x^{2} + 2ax + b\) must be 0 at \(x = ${p}\) and \(x = ${qv}\), so \(f'(x) = 3${factor(p)}${factor(qv)}\).`,
      R`Expand: \(3(${poly([1, -(p + qv), p * qv])}) = ${poly([3, -3 * (p + qv), 3 * p * qv])}\).`,
      R`Compare coefficients: \(2a = ${-3 * (p + qv)}\) and \(b = ${b}\), so \(a = ${num(a)}\) and \(b = ${b}\).`,
    ],
    rule: 1,
    skill: 'working backwards',
    check: () => checkAll(checkEqual(numDeriv(f, p), 0, 1e-5, "f'(p)"), checkEqual(numDeriv(f, qv), 0, 1e-5, "f'(q)")),
  });
}

function challengeCountFromGraph(rng) {
  const r1 = rng.int(-4, -1);
  const r2 = r1 + rng.int(2, 3);
  const r3 = r2 + rng.int(2, 3);
  const s = rng.sign();
  const shape = rng.pick(['three', 'three', 'doubleLeft', 'doubleRight']);
  const raw = shape === 'three' ? (x) => (x - r1) * (x - r2) * (x - r3) : shape === 'doubleLeft' ? (x) => (x - r1) ** 2 * (x - r3) : (x) => (x - r1) * (x - r3) ** 2;
  const [lo, hi] = [r1 - 1, r3 + 1];
  let top = 0;
  for (let i = 0; i <= 200; i++) top = Math.max(top, Math.abs(raw(lo + ((hi - lo) * i) / 200)));
  const fp = (x) => (s * 4 * raw(x)) / top;
  // Put the curve's name above its peak, where the curve is flat and the label is clear of it.
  let peak = (lo + hi) / 2;
  for (let i = 1; i < 400; i++) {
    const x = lo + ((hi - lo) * i) / 400;
    if (fp(x) > fp(x - (hi - lo) / 400) && fp(x) >= fp(x + (hi - lo) / 400)) peak = x;
  }
  const ask = rng.pick(['local maxima', 'local minima', 'inflection points']);
  const count = ask === 'local maxima' ? crossings(fp, lo, hi, -1) : ask === 'local minima' ? crossings(fp, lo, hi, 1) : crossings((x) => numDeriv(fp, x), lo, hi, 1) + crossings((x) => numDeriv(fp, x), lo, hi, -1);
  const zeros = shape === 'three' ? [r1, r2, r3] : [r1, r3];
  const touch = shape === 'doubleLeft' ? r1 : shape === 'doubleRight' ? r3 : null;
  const expected = { 'local maxima': shape === 'three' ? (s > 0 ? 1 : 2) : shape === 'doubleLeft' ? (s > 0 ? 0 : 1) : s > 0 ? 0 : 1, 'local minima': shape === 'three' ? (s > 0 ? 2 : 1) : shape === 'doubleLeft' ? (s > 0 ? 1 : 0) : s > 0 ? 1 : 0, 'inflection points': 2 }[ask];
  return q({
    prompt: R`The graph shown is the graph of \(f'\), the derivative of a function \(f\), for \(${lo} \le x \le ${hi}\). How many ${ask} does \(f\) have in this interval?`,
    visual: {
      type: 'plot',
      x: [lo, hi],
      y: [-5.5, 5.5],
      step: [1, 1],
      fns: [{ f: fp, label: 'f′', labelAt: peak }],
      points: zeros.map((x) => ({ x, y: 0 })),
      alt: `Graph of the derivative f′ from x = ${txt(lo)} to x = ${txt(hi)}. It ${zeros.map((x) => (x === touch ? `touches the x-axis without crossing at x = ${txt(x)}` : `crosses the x-axis at x = ${txt(x)}`)).join(', and ')}. It starts ${fp(lo + 0.01) > 0 ? 'above' : 'below'} the axis and has two turning points.`,
    },
    correct: count,
    wrong: [
      { value: ask === 'inflection points' ? zeros.length : crossings(fp, lo, hi, 1) + crossings(fp, lo, hi, -1), why: ask === 'inflection points' ? R`The zeros of \(f'\) give candidates for extrema of \(f\). Inflection points of \(f\) are where \(f'\) has its own turning points.` : R`That counts every sign change of \(f'\). A local ${ask === 'local maxima' ? 'maximum' : 'minimum'} needs a change from ${ask === 'local maxima' ? 'positive to negative' : 'negative to positive'}.` },
      { value: zeros.length, why: touch == null ? R`Not every zero of \(f'\) is of the kind asked for. Look at how the sign of \(f'\) changes at each one.` : R`At \(x = ${touch}\) the graph only touches the axis: \(f'\) does not change sign there, so \(f\) has no extremum there.` },
      count + 1,
      count === 0 ? 3 : count - 1,
      3,
    ],
    solution:
      ask === 'inflection points'
        ? [R`Inflection points of \(f\) occur where \(f''\) changes sign, that is, where \(f'\) changes from increasing to decreasing or the reverse.`, R`The graph of \(f'\) has two turning points (one peak and one valley).`, R`So \(f\) has \(2\) inflection points.`]
        : [
            R`\(f\) has a local ${ask === 'local maxima' ? 'maximum' : 'minimum'} where \(f'\) changes from ${ask === 'local maxima' ? 'positive to negative' : 'negative to positive'}.`,
            R`Go through the zeros of \(f'\): ${zeros.map((x) => (x === touch ? R`at \(x = ${x}\) the graph touches the axis and \(f'\) keeps its sign` : R`at \(x = ${x}\) it changes from ${fp(x - 0.05) > 0 ? 'positive to negative' : 'negative to positive'}`)).join('; ')}.`,
            R`The number of ${ask} is \(${count}\).`,
          ],
    rule: 6,
    skill: 'reading the graph of the derivative',
    check: () => (count === expected ? true : `counted ${count} on the graph, expected ${expected} from the shape`),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'curve-analysis',
  title: 'Analyzing Functions with Derivatives',
  summary: 'Use the first and second derivatives to find where a function rises, falls and bends, and where its extreme values are.',
  standards: ['AP Calculus 5.1', 'AP Calculus 5.2', 'AP Calculus 5.3', 'AP Calculus 5.4', 'AP Calculus 5.5', 'AP Calculus 5.6', 'AP Calculus 5.7', 'AP Calculus 5.8', 'AP Calculus 5.9'],

  explain: {
    intro: R`The first derivative tells whether a function is rising or falling; the second tells which way its graph bends. Together they locate the high points, low points and inflection points of a graph without plotting it point by point. Two theorems about continuous functions, the Extreme Value Theorem and the Mean Value Theorem, explain why these methods work.`,
    rules: [
      {
        title: 'Two theorems: extreme values and mean values',
        text: R`**Extreme Value Theorem:** a function that is continuous on a closed interval \([a, b]\) has an absolute maximum and an absolute minimum there. **Mean Value Theorem:** if \(f\) is continuous on \([a, b]\) and differentiable on \((a, b)\), then for some \(c\) in \((a, b)\), \(f'(c) = \dfrac{f(b) - f(a)}{b - a}\): at some point the instantaneous rate equals the average rate.`,
        example: R`\(f(x) = x^{2}\) on \([1, 3]\): the average rate is \(\dfrac{9 - 1}{2} = 4\), and \(f'(c) = 2c = 4\) at \(c = 2\).`,
      },
      {
        title: 'Critical points',
        text: R`A critical point of \(f\) is a number \(c\) in its domain where \(f'(c) = 0\) or \(f'(c)\) does not exist. Local maxima and minima can occur only at critical points (or at endpoints of the domain). A critical point is a candidate, not a guarantee.`,
        example: R`\(f(x) = x^{3} - 3x\): \(f'(x) = 3x^{2} - 3 = 3(x - 1)(x + 1)\), so the critical points are \(x = -1\) and \(x = 1\).`,
      },
      {
        title: 'Increasing, decreasing and the first derivative test',
        text: R`Where \(f' > 0\), \(f\) is increasing; where \(f' < 0\), \(f\) is decreasing. At a critical point \(c\): if \(f'\) changes from positive to negative, \(f\) has a local maximum; from negative to positive, a local minimum; if \(f'\) does not change sign, neither.`,
        example: R`For \(f(x) = x^{3} - 3x\): \(f'\) is positive for \(x < -1\), negative for \(-1 < x < 1\), positive for \(x > 1\). Local maximum at \(x = -1\), local minimum at \(x = 1\).`,
      },
      {
        title: 'Concavity and inflection points',
        text: R`Where \(f'' > 0\) the graph is concave up (it bends upward, and \(f'\) is increasing); where \(f'' < 0\) it is concave down. An **inflection point** is a point where the concavity changes. \(f''(c) = 0\) alone is not enough: \(f''\) must change sign at \(c\).`,
        example: R`\(f(x) = x^{3} - 3x\): \(f''(x) = 6x\) is negative for \(x < 0\) and positive for \(x > 0\), so \((0, 0)\) is an inflection point.`,
      },
      {
        title: 'Second derivative test',
        text: R`If \(f'(c) = 0\) and \(f''(c) > 0\), then \(f\) has a local minimum at \(c\) (concave up, like a cup). If \(f'(c) = 0\) and \(f''(c) < 0\), a local maximum. If \(f''(c) = 0\), the test gives no conclusion; use the first derivative test.`,
        example: R`\(f(x) = x^{3} - 3x\): \(f''(1) = 6 > 0\), a local minimum; \(f''(-1) = -6 < 0\), a local maximum.`,
      },
      {
        title: 'Absolute extrema on a closed interval',
        text: R`Candidates test: (1) find the critical points inside the interval; (2) evaluate \(f\) at those points and at both endpoints; (3) the largest value is the absolute maximum and the smallest is the absolute minimum.`,
        example: R`\(f(x) = x^{3} - 3x\) on \([0, 3]\): \(f(0) = 0\), \(f(1) = -2\), \(f(3) = 18\). Absolute minimum \(-2\), absolute maximum \(18\).`,
      },
      {
        title: R`Reading the graphs of \(f'\) and \(f''\)`,
        text: R`Graph of \(f'\) above the axis: \(f\) is increasing. Graph of \(f'\) crossing the axis downward: local maximum of \(f\); crossing upward: local minimum. Graph of \(f'\) rising: \(f\) is concave up. A turning point of the graph of \(f'\): an inflection point of \(f\).`,
        example: R`If the graph of \(f'\) is a line crossing the axis upward at \(x = 2\), then \(f\) has a local minimum at \(x = 2\) and is concave up everywhere.`,
      },
    ],
    vocab: [
      { term: 'critical point', def: R`A number \(c\) in the domain where \(f'(c) = 0\) or \(f'(c)\) does not exist.` },
      { term: 'local (relative) extremum', def: 'A value that is the largest or the smallest among nearby values.' },
      { term: 'absolute (global) extremum', def: 'The largest or the smallest value on the whole interval or domain.' },
      { term: 'concave up / concave down', def: R`Concave up: \(f'' > 0\), the graph lies above its tangent lines. Concave down: \(f'' < 0\), it lies below them.` },
      { term: 'inflection point', def: 'A point on the graph where the concavity changes.' },
    ],
    mistakes: [
      R`Assuming every critical point is a maximum or a minimum. \(f(x) = x^{3}\) has \(f'(0) = 0\) but no extremum at 0.`,
      R`Calling \(x = c\) an inflection point just because \(f''(c) = 0\). Check that \(f''\) changes sign.`,
      R`Forgetting the endpoints when finding absolute extrema on a closed interval.`,
      R`Reading the graph of \(f'\) as if it were the graph of \(f\): a peak of \(f'\) is an inflection point of \(f\), not a maximum of \(f\).`,
      R`Giving the \(x\)-value when the question asks for the maximum or minimum value, \(f(x)\).`,
    ],
    visual: {
      type: 'plot',
      x: [-2.6, 2.6],
      y: [-4, 4],
      step: [1, 1],
      fns: [{ f: (x) => x ** 3 - 3 * x }],
      points: [{ x: -1, y: 2, label: 'local max' }, { x: 1, y: -2, label: 'local min', color: 'b' }, { x: 0, y: 0, label: 'inflection', color: 'c' }],
      alt: 'Graph of y = x³ − 3x. It rises to a local maximum at (−1, 2), falls through an inflection point at the origin to a local minimum at (1, −2), and rises again. It is concave down to the left of the origin and concave up to the right.',
    },
  },

  examples: [
    {
      title: 'A complete analysis',
      problem: R`Find the intervals of increase and decrease, the local extrema and the inflection point of \(f(x) = x^{3} - 3x^{2} - 9x + 5\).`,
      steps: [
        R`\(f'(x) = 3x^{2} - 6x - 9 = 3(x - 3)(x + 1)\). Critical points: \(x = -1\) and \(x = 3\).`,
        R`Sign of \(f'\): positive for \(x < -1\), negative for \(-1 < x < 3\), positive for \(x > 3\). So \(f\) increases, then decreases, then increases.`,
        R`First derivative test: local maximum at \(x = -1\), with \(f(-1) = 10\); local minimum at \(x = 3\), with \(f(3) = -22\).`,
        R`\(f''(x) = 6x - 6\) changes from negative to positive at \(x = 1\): concave down for \(x < 1\), concave up for \(x > 1\).`,
      ],
      answer: R`Increasing on \(x < -1\) and \(x > 3\); decreasing on \(-1 < x < 3\). Local maximum \(10\) at \(x = -1\); local minimum \(-22\) at \(x = 3\); inflection point at \((1, -6)\).`,
      visual: {
        type: 'plot',
        x: [-3.5, 5.5],
        y: [-28, 16],
        fns: [{ f: (x) => x ** 3 - 3 * x * x - 9 * x + 5 }],
        points: [{ x: -1, y: 10, label: '(−1, 10)' }, { x: 3, y: -22, label: '(3, −22)', color: 'b' }, { x: 1, y: -6, label: '(1, −6)', color: 'c' }],
        alt: 'Graph of f(x) = x³ − 3x² − 9x + 5 with its local maximum at (−1, 10), its local minimum at (3, −22) and its inflection point at (1, −6) marked.',
      },
    },
    {
      title: 'Word problem: the candidates test',
      word: true,
      problem: R`Over a 5-hour period the temperature in a greenhouse is \(T(t) = t^{3} - 6t^{2} + 9t + 15\) degrees Celsius, where \(t\) is the time in hours and \(0 \le t \le 5\). Find the highest and lowest temperatures.`,
      steps: [
        R`\(T\) is continuous on the closed interval \([0, 5]\), so it has an absolute maximum and minimum there, at a critical point or an endpoint.`,
        R`\(T'(t) = 3t^{2} - 12t + 9 = 3(t - 1)(t - 3)\): critical points \(t = 1\) and \(t = 3\).`,
        R`Evaluate at all candidates: \(T(0) = 15\), \(T(1) = 19\), \(T(3) = 15\), \(T(5) = 35\).`,
      ],
      answer: 'The highest temperature is 35°C, at the end of the period (t = 5). The lowest is 15°C, reached at t = 0 and again at t = 3.',
    },
    {
      title: 'The Mean Value Theorem',
      problem: R`Find the number \(c\) guaranteed by the Mean Value Theorem for \(f(x) = x^{2} + 2x\) on \([1, 5]\).`,
      steps: [
        R`\(f\) is a polynomial, so it is continuous on \([1, 5]\) and differentiable on \((1, 5)\).`,
        R`Average rate of change: \(\dfrac{f(5) - f(1)}{5 - 1} = \dfrac{35 - 3}{4} = 8\).`,
        R`\(f'(x) = 2x + 2\). Set \(2c + 2 = 8\).`,
      ],
      answer: R`\(c = 3\). At \(x = 3\) the tangent line (dashed in the graph) is parallel to the secant line through the endpoints.`,
      visual: {
        type: 'plot',
        x: [0, 6],
        y: [-5, 50],
        fns: [{ f: (x) => x * x + 2 * x }, { f: (x) => 3 + 8 * (x - 1), color: 'b' }, { f: (x) => 15 + 8 * (x - 3), color: 'c', dashed: true }],
        points: [{ x: 1, y: 3 }, { x: 5, y: 35 }, { x: 3, y: 15, color: 'c' }],
        alt: 'Graph of f(x) = x² + 2x with the secant line through (1, 3) and (5, 35) and the tangent line at x = 3. The two lines are parallel: both have slope 8.',
      },
    },
    {
      title: 'Reading the graph of the derivative',
      problem: R`The graph of \(f'\) is the parabola \(f'(x) = (x + 1)(x - 3)\). Where does \(f\) have local extrema, and where does its graph have an inflection point?`,
      steps: [
        R`\(f'\) is positive for \(x < -1\), negative for \(-1 < x < 3\) and positive for \(x > 3\).`,
        R`At \(x = -1\), \(f'\) changes from positive to negative: local maximum. At \(x = 3\), from negative to positive: local minimum.`,
        R`The parabola has its lowest point at \(x = 1\): there \(f'\) stops decreasing and starts increasing, so \(f''\) changes sign.`,
      ],
      answer: R`Local maximum at \(x = -1\), local minimum at \(x = 3\), inflection point at \(x = 1\).`,
    },
  ],

  models: [
    {
      id: 'cubic-analysis',
      title: 'Analyze a cubic',
      intro: R`\(f(x) = x^{3} + bx^{2} + cx\). Choose \(b\) and \(c\) and see the critical points, their type, and the inflection point.`,
      inputs: [
        { name: 'b', label: 'b (x² coefficient)', type: 'int', min: -9, max: 9, value: -3 },
        { name: 'c', label: 'c (x coefficient)', type: 'int', min: -24, max: 24, value: -9 },
      ],
      compute({ b, c }) {
        const coefs = [1, b, c, 0];
        const f = (x) => polyEval(coefs, x);
        const disc = 4 * b * b - 12 * c;
        const infl = -b / 3;
        const steps = [R`\(f'(x) = ${poly([3, 2 * b, c])}\) and \(f''(x) = ${linear(6, 2 * b)}\).`];
        const points = [{ x: infl, y: f(infl), color: 'c', label: 'inflection' }];
        let answer;
        if (disc > 0) {
          const x1 = (-2 * b - Math.sqrt(disc)) / 6;
          const x2 = (-2 * b + Math.sqrt(disc)) / 6;
          const show = (v) => num(round(v, 3));
          steps.push(R`\(f'(x) = 0\) when \(x = \dfrac{${-2 * b} \pm \sqrt{${disc}}}{6}\): \(x ${Number.isInteger(x1) ? '=' : '\\approx'} ${show(x1)}\) and \(x ${Number.isInteger(x2) ? '=' : '\\approx'} ${show(x2)}\).`);
          steps.push(R`Second derivative test: \(f''(${show(x1)}) = ${show(6 * x1 + 2 * b)} < 0\), a local maximum; \(f''(${show(x2)}) = ${show(6 * x2 + 2 * b)} > 0\), a local minimum.`);
          steps.push(R`\(f''(x) = 0\) at \(x = ${show(infl)}\), where \(f''\) changes from negative to positive: an inflection point.`);
          answer = R`Local maximum \(${show(f(x1))}\) at \(x = ${show(x1)}\); local minimum \(${show(f(x2))}\) at \(x = ${show(x2)}\); inflection point at \(x = ${show(infl)}\).`;
          points.push({ x: x1, y: f(x1), label: 'local max' }, { x: x2, y: f(x2), color: 'b', label: 'local min' });
        } else {
          steps.push(disc === 0 ? R`\(f'(x) = 3(x ${infl > 0 ? '-' : '+'} ${num(round(Math.abs(infl), 3))})^{2}\) is 0 only at \(x = ${num(round(infl, 3))}\) and is positive everywhere else.` : R`The discriminant of \(f'\) is \(${disc} < 0\), so \(f'(x)\) is never 0: it is always positive.`);
          steps.push(R`So \(f\) is increasing everywhere and has no local maximum or minimum.`);
          steps.push(R`\(f''(x) = 0\) at \(x = ${num(round(infl, 3))}\), where the concavity changes from down to up: an inflection point.`);
          answer = R`No local extrema; \(f\) is increasing for all \(x\). Inflection point at \(x = ${num(round(infl, 3))}\).`;
        }
        return {
          problem: R`Analyze \(f(x) = ${poly(coefs)}\).`,
          steps,
          answer,
          visual: {
            type: 'plot',
            ...fit(f, infl - 4, infl + 4, { cap: [f(infl) - 60, f(infl) + 60] }),
            fns: [{ f }],
            points,
            alt: `Graph of the cubic f. ${disc > 0 ? 'It has a local maximum, then a local minimum, with an inflection point halfway between them.' : 'It increases everywhere and has an inflection point where its bend changes from downward to upward.'}`,
          },
        };
      },
    },
    {
      id: 'best-production',
      title: 'Word problem: the best value on an interval',
      word: true,
      intro: 'A workshop can make between a least and a greatest number of chairs each week. Find the production level with the largest profit.',
      inputs: [
        { name: 'b', label: 'b in the profit formula P(x) = −2x² + bx − 100', type: 'int', min: 20, max: 200, value: 80 },
        { name: 'lo', label: 'Fewest chairs per week', type: 'int', min: 0, max: 40, value: 5 },
        { name: 'hi', label: 'Most chairs per week', type: 'int', min: 5, max: 60, value: 30 },
      ],
      compute({ b, lo, hi }) {
        if (lo >= hi) return { error: 'The fewest number of chairs must be less than the most. Change one of the two limits.' };
        const P = (x) => -2 * x * x + b * x - 100;
        const crit = b / 4;
        const inside = crit > lo && crit < hi;
        const cands = inside ? [lo, crit, hi] : [lo, hi];
        const vals = cands.map(P);
        const best = cands[vals.indexOf(Math.max(...vals))];
        return {
          problem: R`A workshop's weekly profit from making \(x\) chairs is \(P(x) = ${poly([-2, b, -100])}\) dollars, and it can make between ${lo} and ${hi} chairs a week. How many chairs give the largest profit?`,
          steps: [
            R`\(P\) is continuous on \([${lo}, ${hi}]\), so its largest value occurs at a critical point or at an endpoint.`,
            R`\(P'(x) = ${linear(-4, b)} = 0\) at \(x = ${num(crit)}\), which is ${inside ? 'inside' : 'not inside'} the interval.`,
            R`Evaluate the candidates: ${cands.map((x) => R`\(P(${num(x)}) = ${num(round(P(x), 2))}\)`).join(', ')}.`,
            R`The largest value is \(${num(round(Math.max(...vals), 2))}\), at \(x = ${num(best)}\).`,
          ],
          answer: R`Make \(${num(best)}\) chairs, for a profit of \(${num(round(P(best), 2))}\) dollars.${Number.isInteger(best) ? '' : ' (In practice, compare the two nearest whole numbers.)'}`,
          visual: {
            type: 'plot',
            ...fit(P, lo, hi, { include: [0], pad: 0.1 }),
            fns: [{ f: P, domain: [lo, hi] }],
            points: [{ x: best, y: P(best), label: `best: x = ${txt(best)}` }],
            axisLabels: ['x (chairs)', 'P ($)'],
            alt: `Graph of the profit P(x) for x from ${lo} to ${hi}. The highest point on this part of the parabola is at x = ${txt(best)}.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyCriticalPoints, easySignChart, easyIncreasing],
    medium: [mediumCubic, mediumConcavity, mediumMVT, mediumTheorems],
    hard: [hardCandidates, hardGraphOfDerivative, hardSecondDerivativeTest],
    challenge: [challengeMVT, challengeFindCoefficients, challengeCountFromGraph],
  },
};
