import { R, q, frac, tryFrac, linear, terms, poly, polyEval, num, paren, money, round, rootsTex, checkEqual, checkSame } from '../../lib/index.js';
import { M } from './_shared.js';

// A polynomial with a number substituted for x: subst([2, -3, 1], -2) → "2(-2)^{2} - 3(-2) + 1".
const subst = (coefs, x) => {
  const n = coefs.length - 1;
  return terms(coefs.map((c, i) => [c, n - i === 0 ? '' : n - i === 1 ? `(${num(x)})` : `(${num(x)})^{${n - i}}`]));
};
// A table of values laid out in two rows.
const xfTable = (xs, rows) => ({
  type: 'table',
  headers: [M('x'), ...xs.map((x) => M(num(x)))],
  rows: rows.map(([name, ys]) => [M(name), ...ys.map((y) => M(num(y)))]),
  rowHeaders: true,
  alt: `Table of values. x: ${xs.join(', ')}. ${rows.map(([name, ys]) => `${name.replace(/[\\{}^]/g, '')}: ${ys.join(', ')}`).join('. ')}.`,
});
// mx + k with the positive term first: lead(-2, 3) → "3 - 2x".
const lead = (m, k) => (m > 0 ? linear(m, k) : terms([[k, ''], [m, 'x']]));
// a·(inner) with a coefficient of 1 or −1 hidden: times(-1, 'x + 2') → "-(x + 2)".
const times = (a, inner) => `${a === 1 ? '' : a === -1 ? '-' : a}(${inner})`;
// Dollars inside math mode: whole amounts as they are, others with two decimals.
const usd = (v) => num(v, Number.isInteger(Math.round(v * 100) / 100) ? {} : { fixed: 2 });
const same = (f, g, xs) => xs.every((x) => Number.isFinite(f(x)) && Number.isFinite(g(x)) && Math.abs(f(x) - g(x)) < 1e-9 * Math.max(1, Math.abs(f(x))));

// ───────────── Easy ─────────────

function easyAroc(rng) {
  const coefs = [rng.nonzero(-3, 3), rng.int(-6, 6), rng.int(-9, 9)];
  const p = rng.int(-4, 3);
  const w = rng.int(2, 5);
  const r = p + w;
  const fp = polyEval(coefs, p);
  const fr = polyEval(coefs, r);
  const ans = coefs[0] * (p + r) + coefs[1];
  return q({
    prompt: R`Find the average rate of change of \(f(x) = ${poly(coefs)}\) on the interval \([${p}, ${r}]\).`,
    correct: ans,
    wrong: [
      { value: fr - fp, why: 'That is only the change in the output. Divide it by the change in the input.' },
      { value: tryFrac(fr + fp, w), why: 'A rate of change uses the difference of the two outputs, not their sum.' },
      { value: tryFrac(fr - fp, r + p), why: R`The change in input is \(${r} - ${paren(p)} = ${w}\).` },
      -ans,
    ],
    solution: [
      R`\(f(${r}) = ${subst(coefs, r)} = ${fr}\) and \(f(${p}) = ${subst(coefs, p)} = ${fp}\).`,
      R`Average rate of change \(= \dfrac{f(${r}) - f(${p})}{${r} - ${paren(p)}} = \dfrac{${fr} - ${paren(fp)}}{${w}}\).`,
      R`\(= \dfrac{${fr - fp}}{${w}} = ${ans}\). This is the slope of the secant line through the two points.`,
    ],
    rule: 1,
    skill: 'average rate of change',
    check: () => checkEqual(ans, (fr - fp) / (r - p)),
  });
}

function easyPiecewise(rng) {
  const k = rng.int(-2, 3);
  const top = [rng.nonzero(-4, 4), rng.int(-6, 6)];
  const bot = rng.bool() ? [rng.pick([1, -1, 2]), 0, rng.int(-6, 6)] : [rng.nonzero(-4, 4), rng.int(-6, 6)];
  const x0 = rng.pick([k, rng.int(k - 4, k - 1), rng.int(k + 1, k + 4)]);
  const second = x0 >= k;
  const ans = polyEval(second ? bot : top, x0);
  const other = polyEval(second ? top : bot, x0);
  if (ans === other) return easyPiecewise(rng);
  return q({
    prompt: R`Let \(f(x) = \begin{cases} ${poly(top)} & \text{if } x < ${k} \\ ${poly(bot)} & \text{if } x \ge ${k} \end{cases}\) Find \(f(${x0})\).`,
    correct: ans,
    wrong: [
      { value: other, why: x0 === k ? R`At the boundary, use the rule whose condition includes it: \(x \ge ${k}\).` : R`\(${x0}\) is ${second ? 'not ' : ''}less than \(${k}\), so the ${second ? 'second' : 'first'} rule is the one to use.` },
      { value: ans + other, why: 'Only one rule applies to each input. Do not add the two.' },
      -ans,
      ans + 2,
    ],
    solution: [
      R`Decide which condition \(x = ${x0}\) satisfies: \(${x0} ${second ? R`\ge` : '<'} ${k}\), so use the ${second ? 'second' : 'first'} rule.`,
      R`\(f(${x0}) = ${subst(second ? bot : top, x0)} = ${ans}\).`,
    ],
    rule: 4,
    skill: 'piecewise functions',
    check: () => checkEqual(ans, x0 < k ? polyEval(top, x0) : polyEval(bot, x0)),
  });
}

function easyComposeValue(rng) {
  const a = rng.intExcept(-4, 4, [0, 1]);
  const b = rng.nonzero(-6, 6);
  const c = rng.int(-5, 5);
  const n = rng.int(-3, 4);
  const f = (x) => a * x + b;
  const g = (x) => x * x + c;
  const fg = rng.bool(0.6);
  const ans = fg ? f(g(n)) : g(f(n));
  return q({
    prompt: R`Let \(f(x) = ${linear(a, b)}\) and \(g(x) = ${poly([1, 0, c])}\). Find \(${fg ? `(f \\circ g)(${n})` : `(g \\circ f)(${n})`}\).`,
    correct: ans,
    wrong: [
      { value: fg ? g(f(n)) : f(g(n)), why: fg ? R`\((f \circ g)(x) = f(g(x))\): apply \(g\) first, then \(f\).` : R`\((g \circ f)(x) = g(f(x))\): apply \(f\) first, then \(g\).` },
      { value: f(n) * g(n), why: 'Composition feeds one output into the other function. It is not multiplication.' },
      f(n) + g(n),
      fg ? g(n) : f(n),
    ],
    solution: fg
      ? [R`Work from the inside out. First \(g(${n}) = ${subst([1, 0, c], n)} = ${g(n)}\).`, R`Then \(f(${g(n)}) = ${subst([a, b], g(n))} = ${ans}\).`]
      : [R`Work from the inside out. First \(f(${n}) = ${subst([a, b], n)} = ${f(n)}\).`, R`Then \(g(${f(n)}) = ${subst([1, 0, c], f(n))} = ${ans}\).`],
    rule: 5,
    skill: 'composition',
    check: () => checkEqual(ans, fg ? a * n * n + a * c + b : a * a * n * n + 2 * a * b * n + b * b + c),
  });
}

function easyEvenOdd(rng) {
  const c = () => rng.nonzero(-6, 6);
  const kind = rng.pick(['even', 'odd', 'neither']);
  const shapes = {
    even: [[c(), 0, c(), 0, c()], [c(), 0, c()], [c(), 0, 0, 0, c()], [c(), 0, c(), 0, 0]],
    odd: [[c(), 0, c(), 0], [c(), 0, c(), 0, c(), 0], [c(), 0, 0, 0, c(), 0], [c(), 0, 0, 0]],
    neither: [[c(), c(), 0, 0], [c(), 0, c(), c()], [c(), c(), 0], [c(), 0, 0, c(), 0], [c(), 0, 0, c()]],
  };
  const coefs = rng.pick(shapes[kind]);
  const n = coefs.length - 1;
  const flipped = coefs.map((v, i) => ((n - i) % 2 ? -v : v));
  const names = { even: 'Even', odd: 'Odd', neither: 'Neither even nor odd' };
  const oddPlusConstant = kind === 'neither' && coefs[n] !== 0 && coefs.every((v, i) => i === n || v === 0 || (n - i) % 2 === 1);
  return q({
    prompt: R`Is \(f(x) = ${poly(coefs)}\) even, odd, or neither?`,
    correct: names[kind],
    wrong: [
      { value: 'Even', why: R`An even function needs \(f(-x) = f(x)\) for every \(x\). Here \(f(-x) = ${poly(flipped)}\).` },
      { value: 'Odd', why: oddPlusConstant ? R`The constant \(${coefs[n]}\) does not change sign when \(x\) does, so \(f(-x) \ne -f(x)\).` : R`An odd function needs \(f(-x) = -f(x)\) for every \(x\). Here \(f(-x) = ${poly(flipped)}\).` },
      'Neither even nor odd',
      'Both even and odd',
    ],
    solution: [
      R`Replace \(x\) with \(-x\). Even powers keep their sign and odd powers change sign: \(f(-x) = ${poly(flipped)}\).`,
      kind === 'even' ? R`That is exactly \(f(x)\), so \(f\) is even (its graph is symmetric about the \(y\)-axis).`
        : kind === 'odd' ? R`That is \(-f(x) = ${poly(coefs.map((v) => -v))}\), so \(f\) is odd (its graph is symmetric about the origin).`
          : R`That equals neither \(f(x)\) nor \(-f(x) = ${poly(coefs.map((v) => -v))}\), so \(f\) is neither even nor odd.`,
    ],
    rule: 3,
    skill: 'even and odd functions',
    check: () => {
      const xs = [0.7, 1.3, 2.1];
      const isEven = same((x) => polyEval(coefs, -x), (x) => polyEval(coefs, x), xs);
      const isOdd = same((x) => polyEval(coefs, -x), (x) => -polyEval(coefs, x), xs);
      return (isEven ? 'even' : isOdd ? 'odd' : 'neither') === kind ? true : 'symmetry does not match';
    },
  });
}

function easyDomain(rng) {
  const a = rng.nonzero(-9, 9);
  const kind = rng.pick(['root', 'flip', 'recip']);
  const ge = R`\(x \ge ${a}\)`;
  const le = R`\(x \le ${a}\)`;
  const ne = R`\(x \ne ${a}\)`;
  if (kind === 'root') {
    return q({
      prompt: R`What is the domain of \(f(x) = \sqrt{${linear(1, -a)}}\)?`,
      correct: ge,
      wrong: [
        { value: R`\(x \ge ${-a}\)`, why: R`Solve \(${linear(1, -a)} \ge 0\) for \(x\).` },
        { value: R`\(x > ${a}\)`, why: R`\(\sqrt{0} = 0\) is a real number, so \(x = ${a}\) is allowed.` },
        le,
        ne,
      ],
      solution: [R`A square root needs a radicand that is not negative: \(${linear(1, -a)} \ge 0\).`, R`${a > 0 ? 'Add' : 'Subtract'} \(${Math.abs(a)}\) on both sides: \(x \ge ${a}\).`],
      rule: 0,
      skill: 'domain',
      check: () => (Number.isFinite(Math.sqrt(a - a)) && Number.isNaN(Math.sqrt(a - 0.01 - a)) ? true : 'domain boundary is wrong'),
    });
  }
  if (kind === 'flip') {
    const inside = terms([[a, ''], [-1, 'x']]);
    return q({
      prompt: R`What is the domain of \(f(x) = \sqrt{${inside}}\)?`,
      correct: le,
      wrong: [
        { value: ge, why: R`Solving \(${inside} \ge 0\) gives \(${a} \ge x\), which reads \(x \le ${a}\).` },
        R`\(x \le ${-a}\)`,
        R`\(x < ${a}\)`,
        ne,
      ],
      solution: [R`The radicand must not be negative: \(${inside} \ge 0\).`, R`Add \(x\) to both sides: \(${a} \ge x\), that is \(x \le ${a}\).`],
      rule: 0,
      skill: 'domain',
      check: () => (Number.isFinite(Math.sqrt(a - (a - 1))) && Number.isNaN(Math.sqrt(a - (a + 0.01))) ? true : 'domain boundary is wrong'),
    });
  }
  const top = rng.int(1, 9);
  return q({
    prompt: R`What is the domain of \(f(x) = \dfrac{${top}}{${linear(1, -a)}}\)?`,
    correct: ne,
    wrong: [
      { value: R`\(x \ne ${-a}\)`, why: R`The denominator \(${linear(1, -a)}\) is zero when \(x = ${a}\).` },
      { value: 'All real numbers', why: 'Division by zero is not allowed, so one input has to be left out.' },
      R`\(x > ${a}\)`,
      ge,
    ],
    solution: [R`A fraction is not defined when its denominator is 0. Solve \(${linear(1, -a)} = 0\): \(x = ${a}\).`, R`Every other real number works, so the domain is \(x \ne ${a}\).`],
    rule: 0,
    skill: 'domain',
    check: () => (!Number.isFinite(top / (a - a)) && Number.isFinite(top / (a + 1 - a)) ? true : 'excluded value is wrong'),
  });
}

// ───────────── Medium ─────────────

function mediumConcavityTable(rng) {
  const inc = rng.bool();
  const up = rng.bool();
  const h = rng.int(1, 3);
  const x0 = rng.int(-3, 4);
  const xs = [0, 1, 2, 3, 4].map((i) => x0 + i * h);
  const mags = [rng.int(1, 3)];
  for (let i = 1; i < 4; i++) mags.push(mags[i - 1] + rng.int(1, 4));
  const diffs = (inc === up ? mags : mags.slice().reverse()).map((v) => (inc ? v : -v));
  const ys = [rng.int(-12, 25)];
  diffs.forEach((d) => ys.push(ys[ys.length - 1] + d));
  const name = (i, u) => `${i ? 'Increasing' : 'Decreasing'} and concave ${u ? 'up' : 'down'}`;
  return q({
    prompt: R`The table gives values of a function \(f\) at equally spaced inputs. Which description fits \(f\) on this interval?`,
    visual: xfTable(xs, [['f(x)', ys]]),
    correct: name(inc, up),
    wrong: [
      { value: name(inc, !up), why: inc ? R`List the changes in \(f\) from one column to the next and see whether they are getting larger or smaller.` : R`List the changes in \(f\) from one column to the next. They are negative, and a negative number closer to zero is the larger one.` },
      { value: name(!inc, up), why: R`Check the direction first: the outputs ${inc ? 'rise' : 'fall'} as \(x\) increases.` },
      name(!inc, !up),
    ],
    solution: [
      R`The inputs go up in equal steps of \(${h}\), so compare the changes in \(f\): \(${diffs.join(R`,\ `)}\).`,
      inc ? R`Every change is positive, so \(f\) is increasing.` : R`Every change is negative, so \(f\) is decreasing.`,
      up
        ? R`The changes are increasing (\(${diffs.join(' < ')}\)), so the average rate of change is increasing: the graph is concave up.`
        : R`The changes are decreasing (\(${diffs.join(' > ')}\)), so the average rate of change is decreasing: the graph is concave down.`,
    ],
    rule: 2,
    skill: 'concavity from a table',
    check: () => {
      const d1 = ys.slice(1).map((y, i) => y - ys[i]);
      const d2 = d1.slice(1).map((d, i) => d - d1[i]);
      return d1.every((d) => (inc ? d > 0 : d < 0)) && d2.every((d) => (up ? d > 0 : d < 0)) ? true : 'table does not match its description';
    },
  });
}

function mediumComposeFormula(rng) {
  const a = rng.intExcept(-4, 4, [0, 1]);
  const b = rng.nonzero(-6, 6);
  const d = rng.nonzero(-6, 6);
  const fg = rng.bool();
  const c = fg ? rng.int(-4, 4) : 0;
  const f = (x) => a * x + b;
  const g = (x) => x * x + c * x + d;
  const right = fg ? [a, a * c, a * d + b] : [a * a, 2 * a * b, b * b + d];
  const reversed = fg ? [a * a, 2 * a * b + a * c, b * b + b * c + d] : [a, 0, a * d + b];
  return q({
    prompt: R`Let \(f(x) = ${linear(a, b)}\) and \(g(x) = ${poly([1, c, d])}\). Write \(${fg ? '(f \\circ g)(x)' : '(g \\circ f)(x)'}\) in simplified form.`,
    correct: M(poly(right)),
    wrong: [
      { value: M(poly(reversed)), why: fg ? R`That is \(g(f(x))\). For \((f \circ g)(x)\), put \(g(x)\) into \(f\).` : R`That is \(f(g(x))\). For \((g \circ f)(x)\), put \(f(x)\) into \(g\).` },
      fg
        ? { value: M(poly([a, a * c, d + b])), why: R`\(${a}\) multiplies every term of \(g(x)\), including the constant \(${d}\).` }
        : { value: M(poly([a * a, 0, b * b + d])), why: R`\((${linear(a, b)})^{2}\) has a middle term: \(2 \cdot ${paren(a)}x \cdot ${paren(b)} = ${terms([[2 * a * b, 'x']])}\).` },
      M(poly(fg ? [a, a * c, a * d - b] : [a * a, a * b, b * b + d])),
      M(poly(fg ? [a, c, a * d + b] : [a * a, 2 * a * b, b * b - d])),
      M(poly(fg ? [a, a * c + 1, a * d + b] : [a, 2 * a * b, b * b + d])),
    ],
    solution: fg
      ? [
        R`\((f \circ g)(x) = f(g(x))\): replace the \(x\) in \(f\) with \(g(x)\).`,
        R`\(f(g(x)) = ${times(a, poly([1, c, d]))} ${b > 0 ? '+' : '-'} ${Math.abs(b)}\).`,
        R`Distribute and combine: \(${poly([a, a * c, a * d])} ${b > 0 ? '+' : '-'} ${Math.abs(b)} = ${poly(right)}\).`,
      ]
      : [
        R`\((g \circ f)(x) = g(f(x))\): replace the \(x\) in \(g\) with \(f(x)\).`,
        R`\(g(f(x)) = (${linear(a, b)})^{2} ${d > 0 ? '+' : '-'} ${Math.abs(d)}\).`,
        R`Expand the square: \(${poly([a * a, 2 * a * b, b * b])} ${d > 0 ? '+' : '-'} ${Math.abs(d)} = ${poly(right)}\).`,
      ],
    rule: 5,
    skill: 'composition',
    check: () => checkSame((x) => (fg ? f(g(x)) : g(f(x))), (x) => polyEval(right, x)),
  });
}

function mediumInverseLinear(rng) {
  const a = rng.int(2, 9);
  const s = rng.sign();
  const b = rng.nonzero(-9, 9);
  const fTex = s > 0 ? linear(a, b) : terms([[b, ''], [-a, 'x']]);
  const topRight = s > 0 ? linear(1, -b) : terms([[b, ''], [-1, 'x']]);
  const topWrong = s > 0 ? linear(1, b) : terms([[-b, ''], [-1, 'x']]);
  return q({
    prompt: R`Find the inverse of \(f(x) = ${fTex}\).`,
    correct: R`\(f^{-1}(x) = \dfrac{${topRight}}{${a}}\)`,
    wrong: [
      { value: R`\(f^{-1}(x) = \dfrac{1}{${fTex}}\)`, why: R`\(f^{-1}\) means the inverse function, which undoes \(f\). It is not the reciprocal \(\frac{1}{f(x)}\).` },
      { value: R`\(f^{-1}(x) = \dfrac{${topWrong}}{${a}}\)`, why: R`Undo the constant with the opposite operation before dividing.` },
      { value: R`\(f^{-1}(x) = ${s > 0 ? '' : '-'}\dfrac{x}{${a}} ${b > 0 ? '-' : '+'} ${Math.abs(b)}\)`, why: R`Undo the steps of \(f\) in reverse order: deal with the constant first, then divide the whole result.` },
      R`\(f^{-1}(x) = ${s > 0 ? linear(a, -b) : terms([[-b, ''], [-a, 'x']])}\)`,
    ],
    solution: [
      R`Write \(y = ${fTex}\), then swap \(x\) and \(y\): \(x = ${s > 0 ? linear(a, b, 'y') : terms([[b, ''], [-a, 'y']])}\).`,
      R`Solve for \(y\). ${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\): \(${linear(1, -b)} = ${terms([[s * a, 'y']])}\).`,
      R`Divide by \(${s * a}\): \(y = \dfrac{${topRight}}{${a}}\). So \(f^{-1}(x) = \dfrac{${topRight}}{${a}}\).`,
    ],
    rule: 6,
    skill: 'inverse functions',
    check: () => checkSame((x) => s * a * ((x - b) / (s * a)) + b, (x) => x) === true && checkSame((x) => (s * a * x + b - b) / (s * a), (x) => x),
  });
}

function mediumDomain(rng) {
  const kind = rng.pick(['rootOver', 'recipRoot', 'between', 'quadDen']);
  if (kind === 'rootOver') {
    const a = rng.int(-6, 5);
    const b = a + rng.int(1, 6);
    const f = (x) => Math.sqrt(x - a) / (x - b);
    return q({
      prompt: R`What is the domain of \(f(x) = \dfrac{\sqrt{${linear(1, -a)}}}{${linear(1, -b)}}\)?`,
      correct: R`\(x \ge ${a}\) and \(x \ne ${b}\)`,
      wrong: [
        { value: R`\(x \ge ${a}\)`, why: R`The denominator is zero at \(x = ${b}\), so that input has to be removed as well.` },
        { value: R`\(x \ne ${b}\)`, why: R`The square root also needs \(${linear(1, -a)} \ge 0\).` },
        R`\(x > ${a}\) and \(x \ne ${b}\)`,
        R`\(x \ge ${b}\)`,
      ],
      solution: [a === 0 ? R`The square root needs \(x \ge 0\).` : R`The square root needs \(${linear(1, -a)} \ge 0\), so \(x \ge ${a}\).`, R`The denominator must not be zero, so \(x \ne ${b}\).`, R`Both conditions must hold: \(x \ge ${a}\) and \(x \ne ${b}\).`],
      rule: 0,
      skill: 'domain',
      check: () => (Number.isFinite(f(a)) && !Number.isFinite(f(b)) && Number.isNaN(f(a - 0.5)) && Number.isFinite(f(b + 0.5)) ? true : 'domain is wrong'),
    });
  }
  if (kind === 'recipRoot') {
    const a = rng.nonzero(-9, 9);
    const c = rng.int(1, 9);
    const f = (x) => c / Math.sqrt(x - a);
    return q({
      prompt: R`What is the domain of \(f(x) = \dfrac{${c}}{\sqrt{${linear(1, -a)}}}\)?`,
      correct: R`\(x > ${a}\)`,
      wrong: [
        { value: R`\(x \ge ${a}\)`, why: R`At \(x = ${a}\) the denominator is \(\sqrt{0} = 0\), and division by zero is not allowed.` },
        R`\(x \ne ${a}\)`,
        R`\(x > ${-a}\)`,
        R`\(x < ${a}\)`,
      ],
      solution: [R`The radicand must not be negative, and the denominator must not be zero.`, R`Together these say \(${linear(1, -a)} > 0\), so \(x > ${a}\).`],
      rule: 0,
      skill: 'domain',
      check: () => (!Number.isFinite(f(a)) && Number.isFinite(f(a + 0.01)) && Number.isNaN(f(a - 0.01)) ? true : 'domain is wrong'),
    });
  }
  if (kind === 'between') {
    const a = rng.int(-8, 4);
    const b = a + rng.int(2, 9);
    const f = (x) => Math.sqrt(x - a) + Math.sqrt(b - x);
    return q({
      prompt: R`What is the domain of \(f(x) = \sqrt{${linear(1, -a)}} + \sqrt{${terms([[b, ''], [-1, 'x']])}}\)?`,
      correct: R`\(${a} \le x \le ${b}\)`,
      wrong: [
        { value: R`\(x \ge ${a}\)`, why: R`The second root needs \(${terms([[b, ''], [-1, 'x']])} \ge 0\) too.` },
        R`\(x \le ${b}\)`,
        R`\(x \le ${a}\) or \(x \ge ${b}\)`,
        R`\(${a} < x < ${b}\)`,
      ],
      solution: [R`First root: \(${linear(1, -a)} \ge 0\) gives \(x \ge ${a}\).`, R`Second root: \(${terms([[b, ''], [-1, 'x']])} \ge 0\) gives \(x \le ${b}\).`, R`Both must hold: \(${a} \le x \le ${b}\).`],
      rule: 0,
      skill: 'domain',
      check: () => (Number.isFinite(f(a)) && Number.isFinite(f(b)) && Number.isNaN(f(a - 0.1)) && Number.isNaN(f(b + 0.1)) ? true : 'domain is wrong'),
    });
  }
  const r1 = rng.int(-7, 5);
  const r2 = rng.intExcept(r1 + 1, 8, [-r1]);
  const c = rng.intExcept(-6, 6, [0, -r1, -r2]);
  const den = [1, -(r1 + r2), r1 * r2];
  return q({
    prompt: R`What is the domain of \(f(x) = \dfrac{${linear(1, c)}}{${poly(den)}}\)?`,
    correct: R`\(x \ne ${r1}\) and \(x \ne ${r2}\)`,
    wrong: [
      { value: R`\(x \ne ${-r2}\) and \(x \ne ${-r1}\)`, why: R`The denominator factors as \(${[r1, r2].map((r) => (r === 0 ? 'x' : `(${linear(1, -r)})`)).join('')}\). Set each factor equal to 0.` },
      { value: R`\(x \ne ${-c}\)`, why: 'A numerator of 0 is fine. Only a zero denominator has to be excluded.' },
      'All real numbers',
      R`\(x \ne ${r2}\)`,
    ],
    solution: [
      R`The function is not defined where the denominator is 0. Factor: \(${poly(den)} = ${[r1, r2].map((r) => (r === 0 ? 'x' : `(${linear(1, -r)})`)).join('')}\).`,
      R`The denominator is 0 when \(${rootsTex([r1, r2])}\).`,
      R`The domain is every real number except those two: \(x \ne ${r1}\) and \(x \ne ${r2}\).`,
    ],
    rule: 0,
    skill: 'domain',
    check: () => (polyEval(den, r1) === 0 && polyEval(den, r2) === 0 ? true : 'excluded values are not zeros of the denominator'),
  });
}

function mediumCouponOrder(rng) {
  const P = rng.pick([40, 60, 80, 100, 120, 150, 200]);
  const c = rng.pick([5, 10, 15, 20]);
  const r = rng.pick([10, 20, 25, 30, 40, 50]);
  const k = 1 - r / 100;
  const fg = rng.bool();
  const saleFirst = P * k - c;
  const couponFirst = (P - c) * k;
  const ans = fg ? saleFirst : couponFirst;
  return q({
    prompt: R`A shop takes ${money(c)} off with a coupon, modelled by \(f(x) = x - ${c}\), and ${r}% off in a sale, modelled by \(g(x) = ${num(k)}x\), where \(x\) is a price in dollars. Find \(${fg ? '(f \\circ g)' : '(g \\circ f)'}(${P})\), the final price of a ${money(P)} item when the ${fg ? 'sale is applied first and the coupon second' : 'coupon is applied first and the sale second'}.`,
    correct: money(ans),
    wrong: [
      { value: money(fg ? couponFirst : saleFirst), why: fg ? R`That is \(g(f(${P}))\): the coupon first, then the sale. The function written next to the input acts first.` : R`That is \(f(g(${P}))\): the sale first, then the coupon. The function written next to the input acts first.` },
      { value: money(P - c - r), why: `${r}% off means ${r}% of the price, not ${r} dollars.` },
      money(fg ? P * k : P - c),
      money(ans + c),
      money(P * k + c),
      money(ans - c),
      money(ans + 5),
    ],
    solution: fg
      ? [R`\((f \circ g)(${P}) = f(g(${P}))\). Work from the inside out.`, R`Sale first: \(g(${P}) = ${num(k)} \cdot ${P} = ${num(P * k)}\).`, R`Then the coupon: \(f(${num(P * k)}) = ${num(P * k)} - ${c} = ${usd(ans)}\). The final price is ${money(ans)}.`]
      : [R`\((g \circ f)(${P}) = g(f(${P}))\). Work from the inside out.`, R`Coupon first: \(f(${P}) = ${P} - ${c} = ${P - c}\).`, R`Then the sale: \(g(${P - c}) = ${num(k)} \cdot ${P - c} = ${usd(ans)}\). The final price is ${money(ans)}.`],
    rule: 5,
    skill: 'composition in context',
    check: () => checkEqual(ans, fg ? couponFirst - (c * r) / 100 : saleFirst + (c * r) / 100),
  });
}

const SYM_GRAPHS = [
  { f: (x) => 0.5 * x * x - 2, kind: 'even' },
  { f: (x) => Math.abs(x) - 2, kind: 'even' },
  { f: (x) => 0.25 * x ** 4 - x * x, kind: 'even' },
  { f: (x) => 4 / (x * x + 1) - 2, kind: 'even' },
  { f: (x) => x ** 3 / 4, kind: 'odd' },
  { f: (x) => x ** 3 / 3 - x, kind: 'odd' },
  { f: (x) => (4 * x) / (x * x + 1), kind: 'odd' },
  { f: (x) => x, kind: 'odd' },
  { f: (x) => 0.5 * (x - 1) ** 2 - 2, kind: 'neither' },
  { f: (x) => x ** 3 / 4 + 1, kind: 'neither' },
  { f: (x) => 0.5 * x + 1, kind: 'neither' },
  { f: (x) => 2 ** x - 2, kind: 'neither' },
  { f: (x) => Math.abs(x - 1) - 1, kind: 'neither' },
];

function mediumSymmetryGraph(rng) {
  const i = rng.int(0, SYM_GRAPHS.length - 1);
  const g = SYM_GRAPHS[i];
  const k = rng.pick([1, -1, 1.5, -1.5, 0.5, -0.5]);
  const f = (x) => k * g.f(x);
  const val = (x) => num(f(x), { places: 2 });
  const names = { even: 'Even: symmetric about the y-axis', odd: 'Odd: symmetric about the origin', neither: 'Neither even nor odd' };
  const compare = [1, 2].map((x) => R`\(f(${-x}) = ${val(-x)}\) and \(f(${x}) = ${val(x)}\)`).join('; ');
  return q({
    prompt: R`The graph of \(y = f(x)\) is shown. Is \(f\) even, odd, or neither?`,
    visual: {
      type: 'plot',
      x: [-4, 4],
      y: [-6, 6],
      fns: [{ f }],
      points: [-2, -1, 1, 2].map((x) => ({ x, y: f(x) })),
      alt: `Graph of a function. It passes through the points ${[-2, -1, 0, 1, 2].map((x) => `(${x}, ${num(f(x), { places: 2 })})`).join(', ')}.`,
    },
    key: `symmetry-graph-${i}-${k}`,
    correct: names[g.kind],
    wrong: [
      g.kind === 'odd' ? { value: names.even, why: R`For an even function the heights at \(x\) and \(-x\) match. Here they are opposites.` } : names.even,
      g.kind === 'even' ? { value: names.odd, why: R`For an odd function the heights at \(x\) and \(-x\) are opposites. Here they are equal.` } : names.odd,
      names.neither,
      'Both even and odd',
    ],
    solution: [
      R`Compare the heights at opposite inputs: ${compare}.`,
      g.kind === 'even' ? R`Opposite inputs give equal outputs, \(f(-x) = f(x)\). The left half is a mirror image of the right half, so \(f\) is even.`
        : g.kind === 'odd' ? R`Opposite inputs give opposite outputs, \(f(-x) = -f(x)\). A half-turn about the origin maps the graph onto itself, so \(f\) is odd.`
          : R`The outputs are neither equal nor opposite, so the graph has neither symmetry: \(f\) is neither even nor odd.`,
    ],
    rule: 3,
    skill: 'even and odd functions',
    check: () => {
      const xs = [0.6, 1, 2, 2.9];
      const kind = same((x) => f(-x), f, xs) ? 'even' : same((x) => f(-x), (x) => -f(x), xs) ? 'odd' : 'neither';
      return kind === g.kind ? true : `graph ${i} is ${kind}`;
    },
  });
}

// ───────────── Hard ─────────────

function hardInverseRational(rng) {
  const a = rng.nonzero(-6, 6);
  const b = rng.nonzero(-7, 7);
  const c = rng.intExcept(-6, 6, [0]);
  if (a * c === b) return hardInverseRational(rng);
  const f = (x) => (a * x + b) / (x + c);
  const inv = (x) => (b - c * x) / (x - a);
  const fr = (top, bot) => (top === bot ? null : R`\(f^{-1}(x) = \dfrac{${top}}{${bot}}\)`);
  return q({
    prompt: R`Find the inverse of \(f(x) = \dfrac{${linear(a, b)}}{${linear(1, c)}}\).`,
    correct: fr(lead(-c, b), linear(1, -a)),
    wrong: [
      { value: fr(linear(1, c), linear(a, b)), why: R`That is the reciprocal \(\frac{1}{f(x)}\). The inverse function undoes \(f\): swap \(x\) and \(y\), then solve for \(y\).` },
      { value: fr(lead(c, b), linear(1, -a)), why: R`After multiplying out, the \(${terms([[c, 'x']])}\) term moves to the other side and changes sign.` },
      fr(lead(-c, b), linear(1, a)),
      fr(lead(-c, -b), linear(1, -a)),
      fr(lead(c, -b), linear(1, a)),
    ],
    solution: [
      R`Write \(y = \dfrac{${linear(a, b)}}{${linear(1, c)}}\) and swap the variables: \(x = \dfrac{${linear(a, b, 'y')}}{${linear(1, c, 'y')}}\).`,
      R`Multiply both sides by \(${linear(1, c, 'y')}\): \(xy ${c > 0 ? '+' : '-'} ${terms([[Math.abs(c), 'x']])} = ${linear(a, b, 'y')}\).`,
      R`Collect the \(y\) terms on one side: \(xy ${a > 0 ? '-' : '+'} ${terms([[Math.abs(a), 'y']])} = ${lead(-c, b)}\), so \(y(${linear(1, -a)}) = ${lead(-c, b)}\).`,
      R`Divide: \(f^{-1}(x) = \dfrac{${lead(-c, b)}}{${linear(1, -a)}}\).`,
    ],
    rule: 6,
    skill: 'inverse functions',
    check: () => checkSame((x) => f(inv(x)), (x) => x, [0.37, 1.29, 2.23, 9.4].filter((x) => Math.abs(x - a) > 0.2 && Math.abs(inv(x) + c) > 0.2)),
  });
}

function hardInverseRestricted(rng) {
  const h = rng.nonzero(-6, 6);
  const k = rng.intExcept(-8, 8, [0, h, -h]);
  const s = rng.sign(); // +1: domain x ≥ h, −1: domain x ≤ h
  const root = (inside) => R`\sqrt{${inside}}`;
  const form = (c, sg, inside) => R`\(f^{-1}(x) = ${terms([[c, ''], [sg, root(inside)]])}\)`;
  const inv = (x) => h + s * Math.sqrt(x - k);
  return q({
    prompt: R`The function \(f(x) = ${terms([[1, `(${linear(1, -h)})^{2}`], [k, '']])}\) is restricted to the domain \(x ${s > 0 ? R`\ge` : R`\le`} ${h}\) so that it is one-to-one. Find \(f^{-1}(x)\).`,
    correct: form(h, s, linear(1, -k)),
    wrong: [
      { value: form(h, -s, linear(1, -k)), why: R`The outputs of \(f^{-1}\) are the inputs of \(f\), so they must satisfy \(y ${s > 0 ? R`\ge` : R`\le`} ${h}\). That decides the sign of the root.` },
      { value: form(-h, s, linear(1, -k)), why: R`After taking the square root, \(${linear(1, -h, 'y')} = ${s > 0 ? '' : '-'}\sqrt{${linear(1, -k)}}\). Undo \(${h > 0 ? '-' : '+'} ${Math.abs(h)}\) with the opposite operation.` },
      form(h, s, linear(1, k)),
      form(k, s, linear(1, -h)),
      form(-h, -s, linear(1, k)),
    ],
    solution: [
      R`Swap \(x\) and \(y\): \(x = ${terms([[1, `(${linear(1, -h, 'y')})^{2}`], [k, '']])}\).`,
      R`${k > 0 ? 'Subtract' : 'Add'} \(${Math.abs(k)}\): \((${linear(1, -h, 'y')})^{2} = ${linear(1, -k)}\).`,
      R`Take the square root. Because \(y ${s > 0 ? R`\ge` : R`\le`} ${h}\), \(${linear(1, -h, 'y')}\) is ${s > 0 ? 'not negative' : 'not positive'}: \(${linear(1, -h, 'y')} = ${s > 0 ? '' : '-'}\sqrt{${linear(1, -k)}}\).`,
      R`So \(f^{-1}(x) = ${terms([[h, ''], [s, root(linear(1, -k))]])}\), with domain \(x \ge ${k}\).`,
    ],
    rule: 6,
    skill: 'restricting a domain',
    check: () => {
      for (const t of [k + 0.5, k + 2, k + 7.3]) {
        const y = inv(t);
        if (Math.abs((y - h) ** 2 + k - t) > 1e-9) return `f(f⁻¹(${t})) ≠ ${t}`;
        if (s * (y - h) < 0) return 'inverse leaves the restricted domain';
      }
      return true;
    },
  });
}

function hardPiecewiseSolve(rng) {
  const k = rng.int(-1, 2);
  const s = rng.int(Math.max(1, k), 4);
  const c = rng.int(-6, 6);
  const v = s * s + c;
  const m = rng.intExcept(-3, 3, [0]);
  const x1 = rng.intExcept(k - 5, k + 3, [s, -s]);
  const b = v - m * x1;
  const f = (x) => (x < k ? m * x + b : x * x + c);
  const candidates = [x1, -s, s];
  const valid = candidates.filter((x) => Math.abs(f(x) - v) < 1e-9);
  const show = (list) => M(rootsTex(list));
  return q({
    prompt: R`Let \(f(x) = \begin{cases} ${linear(m, b)} & \text{if } x < ${k} \\ ${poly([1, 0, c])} & \text{if } x \ge ${k} \end{cases}\) Find all solutions of \(f(x) = ${v}\).`,
    correct: show(valid),
    wrong: [
      { value: show(candidates), why: 'Each solution must satisfy the condition of the rule it came from. Test every candidate against its condition.' },
      { value: show([x1, s]), why: R`Check \(x = ${x1}\) against \(x < ${k}\) and both square roots against \(x \ge ${k}\).` },
      show([-s, s]),
      show([s]),
      show([x1, -s]),
      show([x1]),
    ],
    solution: [
      R`First rule: \(${linear(m, b)} = ${v}\) gives \(x = ${x1}\). The condition is \(x < ${k}\), so this solution is ${x1 < k ? 'kept' : 'rejected'}.`,
      R`Second rule: \(${poly([1, 0, c])} = ${v}\) gives \(x^{2} = ${s * s}\), so \(x = ${s}\) or \(x = ${-s}\).`,
      R`The condition is \(x \ge ${k}\): \(x = ${s}\) is kept and \(x = ${-s}\) is ${-s >= k ? 'kept' : 'rejected'}.`,
      R`Solutions: \(${rootsTex(valid)}\).`,
    ],
    rule: 4,
    skill: 'piecewise functions',
    check: () => {
      const wantX1 = x1 < k;
      const wantNeg = -s >= k;
      const ok = valid.includes(s) && valid.includes(x1) === wantX1 && valid.includes(-s) === wantNeg && valid.length === 1 + (wantX1 ? 1 : 0) + (wantNeg ? 1 : 0);
      return ok ? true : 'solution set does not respect the conditions';
    },
  });
}

function hardEvenOddValues(rng) {
  const a = rng.int(1, 9);
  const p = rng.nonzero(-9, 9);
  const g0 = rng.nonzero(-9, 9);
  const c1 = rng.nonzero(-4, 4);
  const c2 = rng.nonzero(-4, 4);
  const ans = c1 * p - c2 * g0;
  return q({
    prompt: R`\(f\) is an even function and \(g\) is an odd function. If \(f(${a}) = ${p}\) and \(g(${a}) = ${g0}\), find \(${terms([[c1, `f(${-a})`], [c2, `g(${-a})`]])}\).`,
    correct: ans,
    wrong: [
      { value: c1 * p + c2 * g0, why: R`\(g\) is odd, so \(g(${-a}) = -g(${a}) = ${-g0}\).` },
      { value: -c1 * p - c2 * g0, why: R`\(f\) is even, so \(f(${-a}) = f(${a}) = ${p}\) with no sign change.` },
      -c1 * p + c2 * g0,
      ans + c1,
    ],
    solution: [
      R`Even: \(f(-x) = f(x)\), so \(f(${-a}) = ${p}\).`,
      R`Odd: \(g(-x) = -g(x)\), so \(g(${-a}) = ${-g0}\).`,
      R`\(${terms([[c1, `(${p})`], [c2, `(${-g0})`]])} = ${ans}\).`,
    ],
    rule: 3,
    skill: 'even and odd functions',
    // Test against concrete functions with these values: f(x) = p(x/a)², g(x) = g0(x/a)³.
    check: () => checkEqual(ans, c1 * p * (-a / a) ** 2 + c2 * g0 * (-a / a) ** 3),
  });
}

function hardDecompose(rng) {
  const a = rng.int(2, 6);
  const b = rng.nonzero(-9, 9);
  const n = rng.int(3, 5);
  const c = rng.int(1, 9);
  const k = rng.int(2, 9);
  const lin = linear(a, b);
  const pair = (fTex, gTex, f, g) => ({ text: R`\(f(x) = ${fTex}\) and \(g(x) = ${gTex}\)`, h: (x) => f(g(x)) });
  const kind = rng.pick(['root', 'power', 'recip']);
  let hTex;
  let h;
  let options;
  if (kind === 'root') {
    hTex = R`\sqrt{${lin}}`;
    h = (x) => Math.sqrt(a * x + b);
    options = [
      pair(R`\sqrt{x}`, lin, Math.sqrt, (x) => a * x + b),
      pair(lin, R`\sqrt{x}`, (x) => a * x + b, Math.sqrt),
      pair(R`\sqrt{x} ${b > 0 ? '+' : '-'} ${Math.abs(b)}`, `${a}x`, (x) => Math.sqrt(x) + b, (x) => a * x),
      pair(R`\sqrt{${a}x}`, linear(1, b), (x) => Math.sqrt(a * x), (x) => x + b),
    ];
  } else if (kind === 'power') {
    hTex = R`(${lin})^{${n}}`;
    h = (x) => (a * x + b) ** n;
    options = [
      pair(`x^{${n}}`, lin, (x) => x ** n, (x) => a * x + b),
      pair(lin, `x^{${n}}`, (x) => a * x + b, (x) => x ** n),
      pair(`${a}x^{${n}}`, linear(1, b), (x) => a * x ** n, (x) => x + b),
      pair(R`x^{${n}} ${b > 0 ? '+' : '-'} ${Math.abs(b)}`, `${a}x`, (x) => x ** n + b, (x) => a * x),
    ];
  } else {
    hTex = R`\dfrac{${k}}{x^{2} + ${c}}`;
    h = (x) => k / (x * x + c);
    options = [
      pair(R`\dfrac{${k}}{x}`, `x^{2} + ${c}`, (x) => k / x, (x) => x * x + c),
      pair(`x^{2} + ${c}`, R`\dfrac{${k}}{x}`, (x) => x * x + c, (x) => k / x),
      pair(R`\dfrac{${k}}{x^{2}}`, `x + ${c}`, (x) => k / (x * x), (x) => x + c),
      pair(R`\dfrac{${k}}{x} + ${c}`, 'x^{2}', (x) => k / x + c, (x) => x * x),
    ];
  }
  const pts = [5.3, 6.1, 7.7];
  const [right, swapped, ...rest] = options;
  return q({
    prompt: R`Which pair of functions satisfies \(h(x) = f(g(x))\) for \(h(x) = ${hTex}\)?`,
    correct: right.text,
    wrong: [
      { value: swapped.text, why: R`With this pair, \(g(f(x)) = h(x)\) but \(f(g(x))\) is a different function. The inner function \(g\) must act first.` },
      ...rest.map((o) => o.text),
    ],
    solution: [
      R`Ask what is done to \(x\) first. ${kind === 'recip' ? R`It is squared and \(${c}\) is added: that inner step is \(g(x) = x^{2} + ${c}\).` : R`It is multiplied by \(${a}\) and \(${Math.abs(b)}\) is ${b > 0 ? 'added' : 'subtracted'}: that inner step is \(g(x) = ${lin}\).`}`,
      kind === 'root' ? R`Then the square root is taken, so the outer function is \(f(x) = \sqrt{x}\).` : kind === 'power' ? R`Then the result is raised to the power \(${n}\), so the outer function is \(f(x) = x^{${n}}\).` : R`Then \(${k}\) is divided by the result, so the outer function is \(f(x) = \dfrac{${k}}{x}\).`,
      R`Check: \(f(g(x)) = ${hTex}\). So ${right.text.replace(' and ', ', ')}.`,
    ],
    rule: 5,
    skill: 'decomposition',
    check: () => (same(right.h, h, pts) && [swapped, ...rest].every((o) => !same(o.h, h, pts)) ? true : 'a wrong pair also composes to h, or the right pair does not'),
  });
}

function hardWordAroc(rng) {
  if (rng.bool()) {
    const v = rng.pick([20, 25, 30, 35, 40]);
    const h0 = rng.pick([0, 2, 5, 10]);
    const t1 = rng.int(0, 2);
    const t2 = t1 + rng.int(1, 2);
    const h = [-5, v, h0];
    const h1 = polyEval(h, t1);
    const h2 = polyEval(h, t2);
    const ans = -5 * (t1 + t2) + v;
    return q({
      prompt: R`A ball is thrown upward. Its height after \(t\) seconds is \(h(t) = ${poly(h, 't')}\) metres. What is the average rate of change of its height between \(t = ${t1}\) and \(t = ${t2}\)?`,
      correct: ans,
      unit: 'm/s',
      wrong: [
        { value: h2 - h1, why: 'That is the change in height, in metres. Divide by the time that passed.' },
        Number.isInteger((h1 + h2) / 2) ? { value: (h1 + h2) / 2, why: 'That averages the two heights. A rate of change compares the change in height with the change in time.' } : null,
        Number.isInteger(h2 / t2) ? { value: h2 / t2, why: R`Use both points: the change from \(t = ${t1}\) to \(t = ${t2}\), not from the start.` } : null,
        -ans,
        ans + 5,
      ],
      solution: [
        R`\(h(${t2}) = ${h2}\) and \(h(${t1}) = ${h1}\).`,
        R`Average rate of change \(= \dfrac{${h2} - ${paren(h1)}}{${t2} - ${t1}} = \dfrac{${h2 - h1}}{${t2 - t1}} = ${ans}\) m/s.`,
        ans > 0 ? 'On average the ball gains height over this interval.' : ans < 0 ? 'The negative sign means that, on average, the ball loses height over this interval.' : 'The ball is at the same height at both times, so the average rate of change is 0.',
      ],
      rule: 1,
      skill: 'rates of change in context',
      check: () => checkEqual(ans, (h2 - h1) / (t2 - t1)),
    });
  }
  const gaps = [rng.int(1, 3), rng.int(1, 3), rng.int(1, 3), rng.int(1, 3)];
  const speeds = [rng.int(8, 24), rng.int(8, 24), rng.int(8, 24), rng.int(8, 24)];
  const ts = [0];
  const ds = [0];
  gaps.forEach((g, i) => {
    ts.push(ts[i] + g);
    ds.push(ds[i] + g * speeds[i]);
  });
  const i = rng.int(0, 2);
  const j = rng.int(i + 2, 4);
  const dd = ds[j] - ds[i];
  const dt = ts[j] - ts[i];
  if (dd % dt !== 0 || dt === j - i) return hardWordAroc(rng);
  const ans = dd / dt;
  return q({
    prompt: R`The table shows how far a cyclist has travelled, \(d\) kilometres, after \(t\) hours. What is the cyclist's average speed between \(t = ${ts[i]}\) and \(t = ${ts[j]}\)?`,
    visual: {
      type: 'table',
      headers: [R`\(t\) (h)`, ...ts.map((t) => M(t))],
      rows: [[R`\(d\) (km)`, ...ds.map((d) => M(d))]],
      rowHeaders: true,
      alt: `Table of distance against time. t in hours: ${ts.join(', ')}. d in kilometres: ${ds.join(', ')}.`,
    },
    correct: ans,
    unit: 'km/h',
    wrong: [
      { value: round(dd / (j - i), 1), why: 'Divide by the time that passed, not by the number of columns between the two readings.' },
      { value: dd, why: 'That is the distance covered. Average speed is distance divided by time.' },
      ts[i] > 0 ? { value: round(ds[j] / ts[j], 1), why: R`That is the average speed from \(t = 0\). Use the change between the two given times.` } : null,
      round((ds[j] + ds[i]) / dt, 1),
      ans + 4,
    ],
    solution: [
      R`Average speed is the average rate of change of distance: \(\dfrac{\text{change in } d}{\text{change in } t}\).`,
      R`Change in \(d\): \(${ds[j]} - ${ds[i]} = ${dd}\) km. Change in \(t\): \(${ts[j]} - ${ts[i]} = ${dt}\) h.`,
      R`\(\dfrac{${dd}}{${dt}} = ${ans}\) km/h.`,
    ],
    rule: 1,
    skill: 'rates of change in context',
    check: () => checkEqual(ans * (ts[j] - ts[i]), ds[j] - ds[i]),
  });
}

// ───────────── Challenge ─────────────

function challengeFindEndpoint(rng) {
  const a = rng.pick([1, 1, 2, -1, 3]);
  const b = rng.int(-6, 6);
  const c = rng.int(-9, 9);
  const p = rng.nonzero(-4, 3);
  const k = p + rng.int(2, 6);
  const coefs = [a, b, c];
  const rate = a * (p + k) + b;
  const km = linear(1, -p, 'k'); // k − p
  const kp = linear(1, p, 'k'); // k + p
  const plain = a === 1 && b === 0;
  return q({
    prompt: R`The average rate of change of \(f(x) = ${poly(coefs)}\) on the interval \([${p}, k]\) is \(${rate}\), where \(k > ${p}\). Find \(k\).`,
    correct: k,
    fmt: (v) => R`\(k = ${num(v)}\)`,
    wrong: [
      { value: k + p, why: R`That is the value of \(${kp}\). One more step isolates \(k\).` },
      { value: k + 2 * p, why: R`To undo \(${p > 0 ? '+' : '-'} ${Math.abs(p)}\) in \(${kp}\), use the opposite operation.` },
      b !== 0 ? { value: tryFrac(rate - a * p, a), why: R`The \(${terms([[b, 'x']])}\) term also contributes \(${b}\) to the average rate of change.` } : null,
      k + 1,
      k - 1,
      k + 2,
      k + 3,
    ].filter((w) => w != null && (w.value ?? w) > p),
    solution: [
      R`The change in output is \(f(k) - f(${p}) = ${plain ? `k^{2} - ${p * p}` : terms([[a, `(k^{2} - ${p * p})`], [b, `(${km})`]])}\); the constant${c === 0 ? '' : R` \(${c}\)`} cancels.`,
      R`Since \(k^{2} - ${p * p} = (${km})(${kp})\), dividing by the change in input \(${km}\) leaves the average rate of change \(${plain ? kp : terms([[a, `(${kp})`], [b, '']])}\).`,
      a === 1 || a * p + b === 0
        ? R`Set this equal to \(${rate}\): \(${terms([[a, 'k'], [a * p + b, '']])} = ${rate}\), so \(k = ${k}\).`
        : R`Set this equal to \(${rate}\): \(${terms([[a, 'k'], [a * p + b, '']])} = ${rate}\), so \(${terms([[a, 'k']])} = ${rate - a * p - b}\) and \(k = ${k}\).`,
    ],
    rule: 1,
    skill: 'working backwards',
    check: () => checkEqual((polyEval(coefs, k) - polyEval(coefs, p)) / (k - p), rate),
  });
}

function challengeConcavityPredict(rng) {
  const inc = rng.bool();
  const up = rng.bool();
  const s = inc ? 1 : -1;
  const d = rng.int(3, 9);
  const h = rng.int(1, 4);
  const x0 = rng.int(-3, 5);
  const y0 = rng.int(-10, 30);
  const y1 = y0 + s * d;
  const grows = inc === up;
  const c2 = s * (grows ? d + rng.int(1, d) : rng.int(1, d - 1));
  const other = s * (grows ? rng.int(1, d - 1) : d + rng.int(1, d));
  const desc = `${inc ? 'increasing' : 'decreasing'} and concave ${up ? 'up' : 'down'}`;
  return q({
    prompt: R`A function \(f\) is ${desc} on the interval \([${x0}, ${x0 + 2 * h}]\), with \(f(${x0}) = ${y0}\) and \(f(${x0 + h}) = ${y1}\). Which of these could be the value of \(f(${x0 + 2 * h})\)?`,
    correct: y1 + c2,
    wrong: [
      { value: y1 + s * d, why: R`That repeats the same change of \(${s * d}\), which is a constant rate of change: a straight line, not a concave graph.` },
      { value: y1 + other, why: `That would make the rate of change ${up ? 'decrease' : 'increase'}, which is concave ${up ? 'down' : 'up'}.` },
      { value: y1 - s * rng.int(1, d), why: `The function is ${inc ? 'increasing' : 'decreasing'}, so the next value must be ${inc ? 'greater' : 'less'} than the one before.` },
      y1,
    ],
    solution: [
      R`The two intervals have equal width \(${h}\). On the first, \(f\) changes by \(${y1} - ${paren(y0)} = ${s * d}\).`,
      inc ? R`Increasing: the next change must be positive.` : R`Decreasing: the next change must be negative.`,
      R`Concave ${up ? 'up' : 'down'}: the rate of change is ${up ? 'increasing' : 'decreasing'}, so the next change must be ${up ? 'greater' : 'less'} than \(${s * d}\).`,
      R`So the next change is ${grows ? (inc ? R`more than \(${d}\)` : R`less than \(${-d}\)`) : inc ? R`between \(0\) and \(${d}\)` : R`between \(${-d}\) and \(0\)`}. Only \(${y1 + c2}\) fits: its change is \(${c2}\).`,
    ],
    rule: 2,
    skill: 'concavity',
    check: () => {
      const second = c2 - s * d;
      return (inc ? c2 > 0 : c2 < 0) && (up ? second > 0 : second < 0) ? true : 'value does not fit the description';
    },
  });
}

function challengeCommute(rng) {
  const a = rng.intExcept(-4, 5, [0, 1]);
  const c = rng.intExcept(-4, 5, [0, 1, a]);
  const t = rng.nonzero(-3, 3);
  const d = (c - 1) * t;
  const b = (a - 1) * t;
  const fTex = terms([[a, 'x'], [1, 'b']]);
  return q({
    prompt: R`Let \(f(x) = ${fTex}\) and \(g(x) = ${linear(c, d)}\). For which value of \(b\) is \((f \circ g)(x) = (g \circ f)(x)\) for every \(x\)?`,
    correct: b,
    fmt: (v) => R`\(b = ${num(v)}\)`,
    wrong: [
      { value: d, why: R`Matching the constants of \(f\) and \(g\) is not enough. Compare the constants of the two compositions.` },
      { value: d * (a - 1), why: R`After collecting the \(b\) terms, divide by the coefficient of \(b\).` },
      -b,
      t,
      a * d,
    ],
    solution: [
      R`\(f(g(x)) = ${times(a, linear(c, d))} + b = ${terms([[a * c, 'x'], [a * d, ''], [1, 'b']])}\).`,
      R`\(g(f(x)) = ${times(c, fTex)} ${d > 0 ? '+' : '-'} ${Math.abs(d)} = ${terms([[a * c, 'x'], [c, 'b'], [d, '']])}\).`,
      R`The \(x\) terms already match. Set the constants equal: \(${terms([[a * d, ''], [1, 'b']])} = ${terms([[c, 'b'], [d, '']])}\).`,
      R`Collect terms: \(${terms([[1 - c, 'b']])} = ${d - a * d}\), so \(b = ${b}\).`,
    ],
    rule: 5,
    skill: 'composition',
    check: () => checkSame((x) => a * (c * x + d) + b, (x) => c * (a * x + b) + d),
  });
}

function challengeInverseTable(rng) {
  const x0 = rng.int(-2, 3);
  const xs = [0, 1, 2, 3, 4].map((i) => x0 + i);
  // No value is sent to itself and f, g never agree, so every look-up in the table is a real step.
  let fs;
  let gs;
  do {
    fs = rng.shuffle(xs);
    gs = rng.shuffle(xs);
  } while (xs.some((x, i) => fs[i] === x || gs[i] === x || fs[i] === gs[i]));
  const f = (x) => fs[xs.indexOf(x)];
  const g = (x) => gs[xs.indexOf(x)];
  const fInv = (y) => xs[fs.indexOf(y)];
  const gInv = (y) => xs[gs.indexOf(y)];
  const a = rng.pick(xs);
  const kind = rng.pick(['finvg', 'gfinv', 'fginv']);
  const table = xfTable(xs, [['f(x)', fs], ['g(x)', gs]]);
  if (kind === 'finvg') {
    const ans = fInv(g(a));
    return q({
      prompt: R`The table gives all the values of two one-to-one functions. Find \(f^{-1}(g(${a}))\).`,
      visual: table,
      correct: ans,
      wrong: [
        { value: f(g(a)), why: R`\(f^{-1}\) reverses \(f\): find the input whose output in the \(f\) row is \(${g(a)}\).` },
        { value: g(a), why: R`That is \(g(${a})\). It still has to go into \(f^{-1}\).` },
        gInv(f(a)),
        fInv(a),
        ...xs,
      ],
      solution: [R`Inside first: \(g(${a}) = ${g(a)}\).`, R`\(f^{-1}(${g(a)})\) asks: which input does \(f\) send to \(${g(a)}\)? In the \(f\) row, \(f(${ans}) = ${g(a)}\).`, R`So \(f^{-1}(g(${a})) = ${ans}\).`],
      rule: 6,
      skill: 'inverses from a table',
      check: () => (f(ans) === g(a) ? true : 'f(answer) is not g(a)'),
    });
  }
  if (kind === 'gfinv') {
    const ans = g(fInv(a));
    return q({
      prompt: R`The table gives all the values of two one-to-one functions. Find \(g(f^{-1}(${a}))\).`,
      visual: table,
      correct: ans,
      wrong: [
        { value: g(f(a)), why: R`\(f^{-1}(${a})\) is the input that \(f\) sends to \(${a}\), which is \(${fInv(a)}\), not \(f(${a})\).` },
        { value: fInv(a), why: R`That is \(f^{-1}(${a})\). It still has to go into \(g\).` },
        fInv(g(a)),
        g(a),
        ...xs,
      ],
      solution: [R`Inside first: \(f^{-1}(${a})\) is the input with \(f\)-output \(${a}\). In the \(f\) row, \(f(${fInv(a)}) = ${a}\), so \(f^{-1}(${a}) = ${fInv(a)}\).`, R`Then \(g(${fInv(a)}) = ${ans}\).`],
      rule: 6,
      skill: 'inverses from a table',
      check: () => (f(fInv(a)) === a && g(fInv(a)) === ans ? true : 'table lookup is wrong'),
    });
  }
  const ans = f(gInv(a));
  return q({
    prompt: R`The table gives all the values of two one-to-one functions. Find \((f \circ g^{-1})(${a})\).`,
    visual: table,
    correct: ans,
    wrong: [
      { value: f(g(a)), why: R`\(g^{-1}(${a})\) is the input that \(g\) sends to \(${a}\), which is \(${gInv(a)}\), not \(g(${a})\).` },
      { value: gInv(f(a)), why: R`\((f \circ g^{-1})(${a}) = f(g^{-1}(${a}))\): \(g^{-1}\) acts first.` },
      gInv(a),
      fInv(g(a)),
      ...xs,
    ],
    solution: [R`\((f \circ g^{-1})(${a}) = f(g^{-1}(${a}))\).`, R`In the \(g\) row, \(g(${gInv(a)}) = ${a}\), so \(g^{-1}(${a}) = ${gInv(a)}\).`, R`Then \(f(${gInv(a)}) = ${ans}\).`],
    rule: 6,
    skill: 'inverses from a table',
    check: () => (g(gInv(a)) === a && f(gInv(a)) === ans ? true : 'table lookup is wrong'),
  });
}

function challengeCompositeDomain(rng) {
  if (rng.bool(0.3)) {
    const c = rng.int(1, 9);
    const fg = (x) => Math.sqrt(c * c - x * x);
    return q({
      prompt: R`Let \(f(x) = \sqrt{x}\) and \(g(x) = ${c * c} - x^{2}\). What is the domain of \((f \circ g)(x)\)?`,
      correct: R`\(${-c} \le x \le ${c}\)`,
      wrong: [
        { value: R`\(x \le ${-c}\) or \(x \ge ${c}\)`, why: R`That is where \(${c * c} - x^{2} \le 0\). The square root needs \(${c * c} - x^{2} \ge 0\).` },
        { value: R`\(x \ge 0\)`, why: R`That is the domain of \(f\) on its own. Here the input of \(f\) is \(g(x)\), so \(g(x) \ge 0\) is what is needed.` },
        R`\(x \le ${c}\)`,
        R`\(${-c * c} \le x \le ${c * c}\)`,
      ],
      solution: [R`\((f \circ g)(x) = \sqrt{${c * c} - x^{2}}\).`, R`The radicand must not be negative: \(${c * c} - x^{2} \ge 0\), so \(x^{2} \le ${c * c}\).`, R`That holds exactly when \(${-c} \le x \le ${c}\).`],
      rule: 5,
      skill: 'domain of a composition',
      check: () => (Number.isFinite(fg(c)) && Number.isFinite(fg(-c)) && Number.isNaN(fg(c + 0.01)) && Number.isNaN(fg(-c - 0.01)) ? true : 'domain is wrong'),
    });
  }
  const a = rng.int(1, 4);
  const b = rng.intExcept(-6, a - 1, [a - a * a]);
  const hole = a * a + b;
  const fg = (x) => 1 / (Math.sqrt(x - b) - a);
  return q({
    prompt: R`Let \(f(x) = \dfrac{1}{${linear(1, -a)}}\) and \(g(x) = \sqrt{${linear(1, -b)}}\). What is the domain of \((f \circ g)(x)\)?`,
    correct: R`\(x \ge ${b}\) and \(x \ne ${hole}\)`,
    wrong: [
      { value: R`\(x \ge ${b}\) and \(x \ne ${a}\)`, why: R`\(f\) rejects the input \(${a}\), and its input here is \(g(x)\). Solve \(g(x) = ${a}\) to find which \(x\) to remove.` },
      { value: R`\(x \ge ${b}\)`, why: R`Inputs with \(g(x) = ${a}\) must also be removed, because \(f(${a})\) is not defined.` },
      { value: R`\(x \ne ${hole}\)`, why: R`\(x\) must first be in the domain of \(g\): \(${linear(1, -b)} \ge 0\).` },
      R`\(x > ${b}\) and \(x \ne ${hole}\)`,
    ],
    solution: [
      R`\(x\) must be in the domain of \(g\): \(${linear(1, -b)} \ge 0\), so \(x \ge ${b}\).`,
      R`Then \(g(x)\) must be in the domain of \(f\): \(\sqrt{${linear(1, -b)}} \ne ${a}\). Squaring, \(${linear(1, -b)} \ne ${a * a}\), so \(x \ne ${hole}\).`,
      R`Domain: \(x \ge ${b}\) and \(x \ne ${hole}\).`,
    ],
    rule: 5,
    skill: 'domain of a composition',
    check: () => (Number.isFinite(fg(b)) && !Number.isFinite(fg(hole)) && Number.isNaN(fg(b - 0.01)) && Number.isFinite(fg(hole + 1)) ? true : 'domain is wrong'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'functions-analysis',
  title: 'Functions: Rates of Change, Composition & Inverses',
  summary: 'Find domains and average rates of change, read concavity from tables, test symmetry, and compose and invert functions.',
  standards: ['AP Precalculus 1.1', 'AP Precalculus 1.2', 'AP Precalculus 1.3', 'AP Precalculus 2.7', 'AP Precalculus 2.8', 'CCSS F-BF.A.1', 'CCSS F-BF.B.4'],

  explain: {
    intro: R`A function turns each input into exactly one output. Precalculus asks how the output changes as the input changes: how fast, in which direction, and whether that rate is itself speeding up or slowing down. It also treats functions as objects that can be chained together (composition) and run backwards (inverses).`,
    rules: [
      {
        title: 'Domain and range',
        text: R`The domain is the set of inputs the function accepts. From a formula, start with all real numbers and remove what breaks it: a zero denominator, or a negative number under an even root. The range is the set of outputs that actually occur.`,
        example: R`\(f(x) = \dfrac{\sqrt{x - 3}}{x - 7}\) needs \(x - 3 \ge 0\) and \(x - 7 \ne 0\), so its domain is \(x \ge 3\) and \(x \ne 7\).`,
      },
      {
        title: 'Average rate of change',
        text: R`On the interval \([a, b]\), the average rate of change of \(f\) is \(\dfrac{f(b) - f(a)}{b - a}\): change in output divided by change in input. It is the slope of the secant line through \((a, f(a))\) and \((b, f(b))\).`,
        example: R`For \(f(x) = x^{2}\) on \([1, 4]\): \(\dfrac{16 - 1}{4 - 1} = 5\).`,
      },
      {
        title: 'How the rate of change varies',
        text: R`\(f\) is increasing where its rates of change are positive and decreasing where they are negative. Over equal-width intervals, if the average rates of change keep increasing the graph is concave up; if they keep decreasing it is concave down. A constant rate of change means the function is linear.`,
        example: R`Outputs \(3, 11, 15, 17\) at equally spaced inputs change by \(8, 4, 2\): increasing, with decreasing rates, so concave down.`,
      },
      {
        title: 'Even and odd functions',
        text: R`Replace \(x\) with \(-x\). If \(f(-x) = f(x)\) for every \(x\), \(f\) is even and its graph is symmetric about the \(y\)-axis. If \(f(-x) = -f(x)\), \(f\) is odd and its graph is symmetric about the origin. Most functions are neither.`,
        example: R`\(x^{4} - 3x^{2}\) is even. \(x^{3} - 5x\) is odd. \(x^{3} + 1\) is neither.`,
      },
      {
        title: 'Piecewise functions',
        text: R`A piecewise function uses different formulas on different parts of its domain. To evaluate it, first find the condition the input satisfies, then use only that formula. When solving \(f(x) = c\), solve each piece and keep only solutions that satisfy that piece's condition.`,
        example: R`If \(f(x) = x + 5\) for \(x < 0\) and \(f(x) = x^{2}\) for \(x \ge 0\), then \(f(-2) = 3\) and \(f(3) = 9\).`,
      },
      {
        title: 'Composition',
        text: R`\((f \circ g)(x) = f(g(x))\): apply \(g\) first, then apply \(f\) to the result. Order matters. Its domain is every \(x\) in the domain of \(g\) for which \(g(x)\) is in the domain of \(f\). To decompose a function, ask what is done to \(x\) first (the inner function) and what is done last (the outer function).`,
        example: R`If \(f(x) = 2x + 1\) and \(g(x) = x^{2}\), then \(f(g(3)) = f(9) = 19\) but \(g(f(3)) = g(7) = 49\).`,
      },
      {
        title: 'Inverse functions',
        text: R`\(f^{-1}\) undoes \(f\): \(f^{-1}(f(x)) = x\). Only a one-to-one function has an inverse; if \(f\) is not one-to-one, restrict its domain first. To find \(f^{-1}\), write \(y = f(x)\), swap \(x\) and \(y\), and solve for \(y\). The domain and range trade places, and the graphs are mirror images in the line \(y = x\).`,
        example: R`\(f(x) = 3x - 6\): swap to get \(x = 3y - 6\), so \(f^{-1}(x) = \dfrac{x + 6}{3}\).`,
      },
    ],
    vocab: [
      { term: 'secant line', def: 'The straight line through two points of a graph. Its slope is the average rate of change between them.' },
      { term: 'concave up / concave down', def: 'Concave up: the rate of change is increasing (the graph bends upward). Concave down: the rate of change is decreasing.' },
      { term: 'composition', def: R`The function \(f \circ g\) made by using the output of \(g\) as the input of \(f\).` },
      { term: 'one-to-one', def: 'A function in which different inputs always give different outputs, so each output comes from exactly one input.' },
      { term: 'inverse function', def: R`The function \(f^{-1}\) that sends each output of \(f\) back to the input it came from.` },
    ],
    mistakes: [
      R`Reading \(f^{-1}(x)\) as \(\dfrac{1}{f(x)}\). The \(-1\) is not an exponent here: it names the inverse function.`,
      R`Composing in the wrong order. In \(f(g(x))\) the inside function \(g\) acts first.`,
      R`Calling \(x^{3} + 1\) odd. A constant term behaves like an even power, so it breaks odd symmetry.`,
      R`Judging concavity by whether outputs go up or down. Concavity is about how the changes themselves change.`,
    ],
    visual: {
      type: 'plot',
      x: [0, 6],
      y: [0, 9],
      fns: [
        { f: (x) => 0.25 * x * x, label: 'concave up', labelAt: 4.4 },
        { f: (x) => 3.5 * Math.sqrt(x), label: 'concave down', color: 'b', labelAt: 2.2 },
      ],
      alt: 'Two increasing curves. One bends upward and gets steeper: it is concave up, with an increasing rate of change. The other bends downward and levels off: it is concave down, with a decreasing rate of change.',
    },
  },

  examples: [
    {
      title: 'Average rate of change from a formula',
      problem: R`Find the average rate of change of \(f(x) = x^{2} - 3x\) on \([1, 5]\).`,
      steps: [
        R`Evaluate at the endpoints: \(f(1) = 1 - 3 = -2\) and \(f(5) = 25 - 15 = 10\).`,
        R`Change in output: \(10 - (-2) = 12\). Change in input: \(5 - 1 = 4\).`,
        R`Average rate of change \(= \dfrac{12}{4} = 3\). The secant line through \((1, -2)\) and \((5, 10)\) has slope 3.`,
      ],
      answer: R`\(3\)`,
      visual: {
        type: 'plot',
        x: [-1, 6.5],
        y: [-4, 14],
        fns: [{ f: (x) => x * x - 3 * x }],
        segments: [{ from: [1, -2], to: [5, 10], label: 'slope 3' }],
        points: [{ x: 1, y: -2, label: '(1, −2)' }, { x: 5, y: 10, label: '(5, 10)' }],
        alt: 'Graph of the parabola y = x² − 3x with a secant line drawn from the point (1, −2) to the point (5, 10). The secant line has slope 3.',
      },
    },
    {
      title: 'Word problem: reading a table',
      word: true,
      problem: R`A tank is being filled. The depth of water is 3 cm at the start, 11 cm after 2 minutes, 15 cm after 4 minutes and 17 cm after 6 minutes. Describe how the depth is changing.`,
      steps: [
        R`The times are equally spaced (every 2 minutes), so compare the changes in depth: \(11 - 3 = 8\), \(15 - 11 = 4\), \(17 - 15 = 2\).`,
        R`As rates: \(\dfrac{8}{2} = 4\), \(\dfrac{4}{2} = 2\) and \(\dfrac{2}{2} = 1\) cm per minute.`,
        R`All the rates are positive, so the depth is increasing.`,
        R`The rates are decreasing (\(4 > 2 > 1\)), so the graph of depth against time is concave down: the tank fills more and more slowly.`,
      ],
      answer: 'The depth is increasing at a decreasing rate (increasing and concave down).',
    },
    {
      title: 'Composition in both orders',
      problem: R`Let \(f(x) = 2x + 1\) and \(g(x) = x^{2} - 4\). Find \((f \circ g)(x)\) and \((g \circ f)(x)\).`,
      steps: [
        R`\((f \circ g)(x) = f(g(x)) = 2(x^{2} - 4) + 1 = 2x^{2} - 7\).`,
        R`\((g \circ f)(x) = g(f(x)) = (2x + 1)^{2} - 4 = 4x^{2} + 4x + 1 - 4 = 4x^{2} + 4x - 3\).`,
        R`The two results are different functions: composition is not commutative.`,
      ],
      answer: R`\((f \circ g)(x) = 2x^{2} - 7\) and \((g \circ f)(x) = 4x^{2} + 4x - 3\)`,
    },
    {
      title: 'An inverse that needs a restricted domain',
      problem: R`\(f(x) = (x - 2)^{2} + 1\) is not one-to-one. Restrict it to \(x \ge 2\) and find \(f^{-1}(x)\).`,
      steps: [
        R`On \(x \ge 2\) the parabola only rises, so the restricted function is one-to-one. Its range is \(y \ge 1\).`,
        R`Swap \(x\) and \(y\): \(x = (y - 2)^{2} + 1\).`,
        R`Subtract 1 and take the square root: \(y - 2 = \pm\sqrt{x - 1}\). Because \(y \ge 2\), choose the positive root.`,
        R`\(f^{-1}(x) = 2 + \sqrt{x - 1}\), with domain \(x \ge 1\) (the range of \(f\)).`,
      ],
      answer: R`\(f^{-1}(x) = 2 + \sqrt{x - 1}\), for \(x \ge 1\)`,
      visual: {
        type: 'plot',
        x: [0, 8],
        y: [0, 8],
        square: true,
        fns: [
          { f: (x) => (x - 2) ** 2 + 1, domain: [2, 8], label: 'f', labelAt: 4.2 },
          { f: (x) => 2 + Math.sqrt(x - 1), domain: [1, 8], color: 'b', label: 'f⁻¹', labelAt: 6.5 },
          { f: (x) => x, color: 'c', dashed: true },
        ],
        points: [{ x: 2, y: 1, label: '(2, 1)' }, { x: 1, y: 2, label: '(1, 2)', color: 'b' }],
        alt: 'Graph of the right half of the parabola y = (x − 2)² + 1 starting at (2, 1), and its inverse y = 2 + √(x − 1) starting at (1, 2). The two curves are mirror images in the dashed line y = x.',
      },
    },
  ],

  models: [
    {
      id: 'secant-slope',
      title: 'Average rate of change of a quadratic',
      intro: 'Choose a quadratic and two x-values. The secant line through the two points has the average rate of change as its slope.',
      inputs: [
        { name: 'a', label: 'a (x² coefficient)', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'b', label: 'b (x coefficient)', type: 'int', min: -8, max: 8, value: -2 },
        { name: 'c', label: 'c (constant)', type: 'int', min: -9, max: 9, value: 0 },
        { name: 'p', label: 'First x-value', type: 'int', min: -6, max: 6, value: 1 },
        { name: 'r', label: 'Second x-value', type: 'int', min: -6, max: 6, value: 4 },
      ],
      compute({ a, b, c, p, r }) {
        if (p === r) return { error: 'The two x-values must be different, otherwise the change in x is 0.' };
        const [lo, hi] = p < r ? [p, r] : [r, p];
        const coefs = [a, b, c];
        const f = (x) => polyEval(coefs, x);
        const rate = frac(f(hi) - f(lo), hi - lo);
        const ys = [];
        for (let i = 0; i <= 40; i++) ys.push(f(lo - 2 + ((hi - lo + 4) * i) / 40));
        const pad = Math.max(1, (Math.max(...ys) - Math.min(...ys)) * 0.1);
        return {
          problem: R`Find the average rate of change of \(f(x) = ${poly(coefs)}\) on \([${lo}, ${hi}]\).`,
          steps: [
            R`\(f(${lo}) = ${subst(coefs, lo)} = ${f(lo)}\).`,
            R`\(f(${hi}) = ${subst(coefs, hi)} = ${f(hi)}\).`,
            R`Change in output: \(${f(hi)} - ${paren(f(lo))} = ${f(hi) - f(lo)}\). Change in input: \(${hi} - ${paren(lo)} = ${hi - lo}\).`,
            R`Average rate of change \(= \dfrac{${f(hi) - f(lo)}}{${hi - lo}} = ${rate.tex()}\).`,
            rate.value > 0 ? 'On average the function rises over this interval.' : rate.value < 0 ? 'On average the function falls over this interval.' : 'The function ends at the height where it started, so the average rate of change is 0.',
          ],
          answer: R`\(${rate.tex()}\)`,
          visual: {
            type: 'plot',
            x: [lo - 2, hi + 2],
            y: [Math.min(...ys) - pad, Math.max(...ys) + pad],
            fns: [{ f }],
            segments: [{ from: [lo, f(lo)], to: [hi, f(hi)], label: `slope ${rate.text()}` }],
            points: [{ x: lo, y: f(lo) }, { x: hi, y: f(hi) }],
            alt: `Graph of the function with a secant line through the points (${lo}, ${f(lo)}) and (${hi}, ${f(hi)}). The slope of the secant line is ${rate.text()}.`,
          },
        };
      },
    },
    {
      id: 'coupon-order',
      title: 'Word problem: coupon first or sale first?',
      word: true,
      intro: 'A coupon subtracts dollars and a sale takes off a percentage. Composing them in the two possible orders gives different prices.',
      inputs: [
        { name: 'price', label: 'Marked price (dollars)', type: 'int', min: 10, max: 500, value: 80 },
        { name: 'coupon', label: 'Coupon (dollars off)', type: 'int', min: 1, max: 50, value: 10 },
        { name: 'pct', label: 'Sale (percent off)', type: 'int', min: 5, max: 90, value: 25 },
      ],
      compute({ price, coupon, pct }) {
        if (coupon >= price) return { error: 'The coupon is worth at least as much as the item. Choose a higher price or a smaller coupon.' };
        const k = 1 - pct / 100;
        const saleFirst = price * k - coupon;
        const couponFirst = (price - coupon) * k;
        if (saleFirst <= 0) return { error: 'With these numbers the sale price is no more than the coupon. Choose a higher price or a smaller discount.' };
        return {
          problem: R`An item is marked ${money(price)}. A coupon takes ${money(coupon)} off and a sale takes ${pct}% off. Does the order of the two discounts matter?`,
          steps: [
            R`Coupon: \(f(x) = x - ${coupon}\). Sale: \(g(x) = ${num(k)}x\), because ${pct}% off leaves ${100 - pct}% of the price.`,
            R`Sale first, then coupon: \(f(g(${price})) = ${num(k)} \cdot ${price} - ${coupon} = ${usd(saleFirst)}\).`,
            R`Coupon first, then sale: \(g(f(${price})) = ${num(k)}(${price} - ${coupon}) = ${usd(couponFirst)}\).`,
            `The difference is ${money(couponFirst - saleFirst)}: when the coupon comes first, the sale also takes ${pct}% off the coupon.`,
          ],
          answer: `Sale first costs ${money(saleFirst)}; coupon first costs ${money(couponFirst)}. Taking the sale first is cheaper by ${money(couponFirst - saleFirst)}.`,
        };
      },
    },
    {
      id: 'inverse-linear',
      title: 'Inverse of a linear function',
      intro: 'Choose the slope and intercept of f(x) = ax + b. The inverse is found by swapping x and y, and its graph is the mirror image in the line y = x.',
      inputs: [
        { name: 'a', label: 'a (slope)', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'b', label: 'b (y-intercept)', type: 'int', min: -12, max: 12, value: -6 },
      ],
      compute({ a, b }) {
        if (a === 0) return { error: 'With a = 0 the function is constant, so it is not one-to-one and has no inverse. Choose a slope other than 0.' };
        const slope = frac(1, a);
        const icpt = frac(-b, a);
        const inv = terms([[slope, 'x'], [icpt, '']]);
        const steps = [
          R`Write \(y = ${linear(a, b)}\) and swap \(x\) and \(y\): \(x = ${linear(a, b, 'y')}\).`,
        ];
        if (b !== 0) steps.push(R`${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\) on both sides: \(${linear(1, -b)} = ${terms([[a, 'y']])}\).`);
        if (a !== 1) steps.push(R`Divide both sides by \(${a}\): \(y = ${inv}\).`);
        steps.push(R`Check: \(f(f^{-1}(x)) = ${a === 1 ? '' : a === -1 ? '-' : a}\left(${inv}\right) ${b === 0 ? '' : `${b > 0 ? '+' : '-'} ${Math.abs(b)}`} = x\). ✓`);
        return {
          problem: R`Find the inverse of \(f(x) = ${linear(a, b)}\).`,
          steps,
          answer: R`\(f^{-1}(x) = ${inv}\)`,
          visual: {
            type: 'plot',
            x: [-10, 10],
            y: [-10, 10],
            square: true,
            fns: [{ f: (x) => a * x + b, label: 'f' }, { f: (x) => (x - b) / a, color: 'b', label: 'f⁻¹' }, { f: (x) => x, color: 'c', dashed: true }],
            alt: `Graph of f, its inverse, and the dashed line y = x. The graph of the inverse is the mirror image of the graph of f in the line y = x.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyAroc, easyPiecewise, easyComposeValue, easyEvenOdd, easyDomain],
    medium: [mediumConcavityTable, mediumComposeFormula, mediumInverseLinear, mediumDomain, mediumCouponOrder, mediumSymmetryGraph],
    hard: [hardInverseRational, hardInverseRestricted, hardPiecewiseSolve, hardEvenOddValues, hardDecompose, hardWordAroc],
    challenge: [challengeFindEndpoint, challengeConcavityPredict, challengeCommute, challengeInverseTable, challengeCompositeDomain],
  },
};
