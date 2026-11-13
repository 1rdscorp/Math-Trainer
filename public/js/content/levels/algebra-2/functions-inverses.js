import { R, q, frac, Frac, terms, linear, poly, num, txt, money, paren, texFrac, polyEval, polyAdd, polyMul, polyScale, person, checkSame } from '../../lib/index.js';
import { M, val, symChoices } from './_shared.js';

// ───────────── Helpers ─────────────

// Parent functions: LaTeX for p(u), a plain-text name, and the function itself.
const PARENTS = {
  sq: { tex: (u) => (u === 'x' ? 'x^{2}' : `(${u})^{2}`), plain: 'x²', shape: 'parabola', anchor: 'vertex', f: (x) => x * x },
  abs: { tex: (u) => `|${u}|`, plain: '|x|', shape: 'V-shaped graph', anchor: 'vertex', f: (x) => Math.abs(x) },
  sqrt: { tex: (u) => `\\sqrt{${u}}`, plain: '√x', shape: 'square-root curve', anchor: 'starting point', f: (x) => Math.sqrt(x) },
  cube: { tex: (u) => (u === 'x' ? 'x^{3}' : `(${u})^{3}`), plain: 'x³', shape: 'cubic curve', anchor: 'centre point', f: (x) => x ** 3 },
};
// a·p(x − h) + k as LaTeX and as a function.
const gTex = (p, a, h, k) => terms([[a, PARENTS[p].tex(linear(1, -h))], [k, '']]);
const gFn = (p, a, h, k) => (x) => val(a) * PARENTS[p].f(x - h) + k;
const shiftWords = (h, k) => [h ? `${Math.abs(h)} ${h > 0 ? 'right' : 'left'}` : null, k ? `${Math.abs(k)} ${k > 0 ? 'up' : 'down'}` : null].filter(Boolean).join(' and ');
const fx = (name, tex) => `${name}(x) = ${tex}`;

// ───────────── Easy ─────────────

function easyShift(rng) {
  const p = rng.pick(['sq', 'abs', 'sqrt', 'cube']);
  const h = rng.nonzero(-7, 7);
  const k = rng.intExcept(-7, 7, [0, h, -h]);
  const parent = PARENTS[p].tex('x');
  if (rng.bool(0.5)) {
    return q({
      prompt: R`The graph of \(g(x) = ${gTex(p, 1, h, k)}\) is the graph of \(f(x) = ${parent}\) after which shift?`,
      correct: `Shifted ${shiftWords(h, k)}`,
      wrong: [
        { value: `Shifted ${shiftWords(-h, k)}`, why: R`A change inside the function works the opposite way: \(${linear(1, -h)}\) is zero when \(x = ${h}\), so the graph moves ${h > 0 ? 'right' : 'left'}.` },
        { value: `Shifted ${shiftWords(h, -k)}`, why: R`The number added outside the function moves the graph the way its sign says: \(${k > 0 ? '+' : '-'} ${Math.abs(k)}\) moves it ${k > 0 ? 'up' : 'down'}.` },
        `Shifted ${shiftWords(k, h)}`,
        `Shifted ${shiftWords(-h, -k)}`,
      ],
      solution: [
        R`Compare with \(f(x - h) + k\), which shifts the graph \(h\) to the right and \(k\) up.`,
        R`Here \(${linear(1, -h)} = x - (${h})\), so \(h = ${h}\): ${Math.abs(h)} ${h > 0 ? 'right' : 'left'}. And \(k = ${k}\): ${Math.abs(k)} ${k > 0 ? 'up' : 'down'}.`,
      ],
      rule: 0,
      skill: 'shifts',
    });
  }
  return q({
    prompt: R`The graph of \(f(x) = ${parent}\) is shifted ${shiftWords(h, k)}. Which function has the new graph?`,
    correct: M(fx('g', gTex(p, 1, h, k))),
    wrong: [
      { value: M(fx('g', gTex(p, 1, -h, k))), why: `To move the graph ${h > 0 ? 'right' : 'left'} by ${Math.abs(h)}, replace x with x ${h > 0 ? '−' : '+'} ${Math.abs(h)}. Inside the function the sign looks reversed.` },
      { value: M(fx('g', gTex(p, 1, h, -k))), why: `Moving ${k > 0 ? 'up' : 'down'} ${k > 0 ? 'adds' : 'subtracts'} ${Math.abs(k)} outside the function.` },
      M(fx('g', gTex(p, 1, k, h))),
      M(fx('g', gTex(p, 1, -h, -k))),
    ],
    solution: [
      R`A shift of \(h\) to the right and \(k\) up turns \(f(x)\) into \(f(x - h) + k\).`,
      R`Here \(h = ${h}\) and \(k = ${k}\), so replace \(x\) with \(${linear(1, -h)}\) and ${k > 0 ? 'add' : 'subtract'} \(${Math.abs(k)}\): \(g(x) = ${gTex(p, 1, h, k)}\).`,
    ],
    rule: 0,
    skill: 'shifts',
  });
}

function easyCombine(rng) {
  const F = [rng.intExcept(-5, 5, [0, 1]), rng.nonzero(-6, 6)];
  const G = rng.bool(0.6) ? [1, 0, rng.nonzero(-6, 6)] : [rng.intExcept(-4, 4, [0, 1]), rng.nonzero(-6, 6)];
  const a = rng.int(-3, 4);
  const [fa, ga] = [polyEval(F, a), polyEval(G, a)];
  const kind = rng.pick(['sum', 'difference', 'product', 'compose', 'compose']);
  const spec = {
    sum: { sym: '(f + g)', value: fa + ga, how: R`\((f + g)(${a}) = f(${a}) + g(${a}) = ${fa} + ${paren(ga)} = ${fa + ga}\).`, via: polyAdd(F, G) },
    difference: { sym: '(f - g)', value: fa - ga, how: R`\((f - g)(${a}) = f(${a}) - g(${a}) = ${fa} - ${paren(ga)} = ${fa - ga}\).`, via: polyAdd(F, polyScale(G, -1)) },
    product: { sym: '(fg)', value: fa * ga, how: R`\((fg)(${a}) = f(${a}) \cdot g(${a}) = ${fa} \cdot ${paren(ga)} = ${fa * ga}\).`, via: polyMul(F, G) },
    compose: { sym: R`(f \circ g)`, value: polyEval(F, ga), how: R`\((f \circ g)(${a}) = f(g(${a})) = f(${ga}) = ${polyEval(F, ga)}\).`, via: polyAdd(polyScale(G, F[0]), [F[1]]) },
  }[kind];
  return q({
    prompt: R`Let \(f(x) = ${poly(F)}\) and \(g(x) = ${poly(G)}\). Find \(${spec.sym}(${a})\).`,
    correct: spec.value,
    wrong: kind === 'compose'
      ? [{ value: polyEval(G, fa), why: R`That is \(g(f(${a}))\). In \((f \circ g)(${a})\) the inside function \(g\) is used first.` }, { value: fa * ga, why: 'The small circle means composition (one function inside the other), not multiplication.' }, fa + ga, ga]
      : [{ value: polyEval(F, ga), why: R`That is \(f(g(${a}))\), a composition. \(${spec.sym}\) combines the two outputs \(f(${a})\) and \(g(${a})\).` }, kind === 'product' ? fa + ga : fa * ga, kind === 'difference' ? fa + ga : fa - ga, fa],
    solution: [R`Evaluate each function at \(${a}\): \(f(${a}) = ${fa}\) and \(g(${a}) = ${ga}\).`, spec.how],
    rule: kind === 'compose' ? 3 : 2,
    skill: kind === 'compose' ? 'composition' : 'combining functions',
    check: () => (polyEval(spec.via, a) === spec.value ? true : 'combining the formulas first gives a different value'),
  });
}

function easyInverseTable(rng) {
  const order = rng.sample([-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9], 5);
  const f = new Map(order.map((x, i) => [x, order[(i + 1) % 5]]));
  const xs = [...order].sort((a, b) => a - b);
  const i = rng.int(0, 4);
  const t = order[i];
  const answer = order[(i + 4) % 5];
  return q({
    prompt: R`The table gives all the values of a one-to-one function \(f\). What is \(f^{-1}(${t})\)?`,
    visual: {
      type: 'table',
      headers: [R`\(x\)`, ...xs.map((x) => R`\(${x}\)`)],
      rows: [[R`\(f(x)\)`, ...xs.map((x) => R`\(${f.get(x)}\)`)]],
      rowHeaders: true,
      alt: `Table of values of f: ${xs.map((x) => `f(${txt(x)}) = ${txt(f.get(x))}`).join(', ')}.`,
    },
    correct: answer,
    wrong: [
      { value: f.get(t), why: R`That is \(f(${t})\). For \(f^{-1}(${t})\), look for \(${t}\) in the output row and read the input above it.` },
      { value: frac(1, t), why: R`\(f^{-1}\) means the inverse function, not the reciprocal \(\frac{1}{f}\).` },
      -t,
      order[(i + 2) % 5],
    ],
    solution: [
      R`\(f^{-1}(${t})\) asks: which input gives the output \(${t}\)?`,
      R`In the table, \(f(${answer}) = ${t}\). So \(f^{-1}(${t}) = ${answer}\).`,
    ],
    rule: 4,
    skill: 'inverse from a table',
    check: () => (f.get(answer) === t ? true : 'f(answer) is not the target value'),
  });
}

// ───────────── Medium ─────────────

function describe({ reflect, factor, h, k }) {
  const parts = [];
  if (reflect) parts.push(`reflected in the ${reflect}-axis`);
  if (factor > 1) parts.push(`stretched vertically by a factor of ${factor}`);
  if (factor < 1) parts.push('compressed vertically to half its height');
  parts.push(`shifted ${shiftWords(h, k)}`);
  const s = parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, then ${parts[parts.length - 1]}` : parts[0];
  return s[0].toUpperCase() + s.slice(1);
}

function mediumDescribeTransform(rng) {
  const p = rng.pick(['sq', 'abs', 'sqrt', 'cube']);
  const a = rng.pick([-1, 2, -2, 3, -3, frac(1, 2), frac(-1, 2)]);
  const h = rng.nonzero(-6, 6);
  const k = rng.int(-6, 6);
  const factor = Math.abs(val(a));
  const base = { reflect: val(a) < 0 ? 'x' : null, factor, h, k };
  return q({
    prompt: R`How is the graph of \(g(x) = ${gTex(p, a, h, k)}\) obtained from the graph of \(f(x) = ${PARENTS[p].tex('x')}\)?`,
    correct: describe(base),
    wrong: [
      { value: describe({ ...base, h: -h }), why: R`Inside the function the shift works the opposite way: \(${linear(1, -h)}\) moves the graph ${Math.abs(h)} to the ${h > 0 ? 'right' : 'left'}.` },
      { value: describe({ ...base, reflect: base.reflect ? null : 'x' }), why: val(a) < 0 ? 'The negative sign in front of the function flips the graph over the x-axis.' : 'There is no negative sign in front of the function, so the graph is not flipped.' },
      k !== 0 ? describe({ ...base, k: -k }) : null,
      factor !== 1 ? describe({ ...base, factor: factor > 1 ? 0.5 : 2 }) : null,
      // For the odd function x³, reflecting in the y-axis gives the same graph as reflecting in the x-axis, so that choice is not offered there.
      val(a) < 0 && p !== 'cube' ? { value: describe({ ...base, reflect: 'y' }), why: R`A negative sign in front of the whole function changes every output, which is a reflection in the x-axis. A reflection in the y-axis needs \(-x\) inside the function.` } : null,
      describe({ ...base, h: -h, reflect: base.reflect ? null : 'x' }),
    ],
    solution: [
      R`Compare with \(a \cdot f(x - h) + k\): here \(a = ${num(a)}\), \(h = ${h}\), \(k = ${k}\).`,
      `${val(a) < 0 ? 'a is negative, so the graph is reflected in the x-axis. ' : ''}${factor > 1 ? `|a| = ${factor}, so every height is multiplied by ${factor} (a vertical stretch). ` : factor < 1 ? '|a| = ½, so every height is halved (a vertical compression). ' : ''}`.trim() || 'a = 1, so there is no stretch or reflection.',
      `h = ${txt(h)} moves the graph ${Math.abs(h)} to the ${h > 0 ? 'right' : 'left'}${k ? `, and k = ${txt(k)} moves it ${Math.abs(k)} ${k > 0 ? 'up' : 'down'}` : ''}.`,
    ],
    rule: 1,
    skill: 'describing transformations',
  });
}

function mediumCompose(rng) {
  const a = rng.intExcept(-4, 4, [0, 1]);
  const b = rng.nonzero(-6, 6);
  const F = [a, b];
  const G = rng.bool(0.65) ? [1, rng.int(-4, 4), rng.nonzero(-6, 6)] : [rng.intExcept(-4, 4, [0, 1]), rng.nonzero(-6, 6)];
  const fg = polyAdd(polyScale(G, a), [b]); // f(g(x)) = a·g(x) + b
  const gf = G.length === 3 ? [a * a, 2 * a * b + G[1] * a, b * b + G[1] * b + G[2]] : [G[0] * a, G[0] * b + G[1]]; // g(f(x))
  const outer = rng.bool(0.6);
  const [right, other] = outer ? [fg, gf] : [gf, fg];
  const opt = (c, why) => ({ tex: poly(c), f: (x) => polyEval(c, x), why });
  const inner = outer ? poly(G) : poly(F);
  return q({
    prompt: R`Let \(f(x) = ${poly(F)}\) and \(g(x) = ${poly(G)}\). Find \(${outer ? R`(f \circ g)(x)` : R`(g \circ f)(x)`}\).`,
    ...symChoices(opt(right), [
      opt(other, R`That is \(${outer ? 'g(f(x))' : 'f(g(x))'}\). The order matters: here \(${outer ? 'g' : 'f'}\) goes inside \(${outer ? 'f' : 'g'}\).`),
      opt(polyMul(F, G), 'That is the product of the two functions. Composition substitutes one function into the other.'),
      opt(polyAdd(F, G)),
      opt(outer ? polyScale(G, a) : polyAdd(right, [1])),
      opt(right.map((c, i) => (i === right.length - 1 ? -c || 1 : c))),
    ]),
    solution: [
      outer ? R`\((f \circ g)(x) = f(g(x))\): put \(g(x)\) wherever \(f\) has an \(x\).` : R`\((g \circ f)(x) = g(f(x))\): put \(f(x)\) wherever \(g\) has an \(x\).`,
      outer
        ? R`\(f(${inner}) = ${a}(${inner}) ${b > 0 ? '+' : '-'} ${Math.abs(b)}\).`
        : G.length === 3
          ? R`\(g(${inner}) = (${inner})^{2} ${G[1] ? `${G[1] > 0 ? '+' : '-'} ${Math.abs(G[1]) === 1 ? '' : Math.abs(G[1])}(${inner}) ` : ''}${G[2] > 0 ? '+' : '-'} ${Math.abs(G[2])}\), and \((${inner})^{2} = ${poly([a * a, 2 * a * b, b * b])}\).`
          : R`\(g(${inner}) = ${G[0]}(${inner}) ${G[1] > 0 ? '+' : '-'} ${Math.abs(G[1])}\).`,
      R`Expand and collect like terms: \(${poly(right)}\).`,
    ],
    rule: 3,
    skill: 'composition',
    check: () => checkSame((x) => (outer ? polyEval(F, polyEval(G, x)) : polyEval(G, polyEval(F, x))), (x) => polyEval(right, x)),
  });
}

// (x − b)/a written with a positive denominator.
function invLinearTex(a, b) {
  if (a > 0) return `\\frac{${linear(1, -b)}}{${a}}`;
  return b > 0 ? `\\frac{${b} - x}{${-a}}` : `-\\frac{${linear(1, -b)}}{${-a}}`;
}

function mediumInverseLinear(rng) {
  const a = rng.intExcept(-6, 6, [-1, 0, 1]);
  const b = rng.nonzero(-9, 9);
  const opt = (tex, f, why) => ({ tex: fx('f^{-1}', tex), f, why });
  return q({
    prompt: R`Find the inverse of \(f(x) = ${linear(a, b)}\).`,
    ...symChoices(opt(invLinearTex(a, b), (x) => (x - b) / a), [
      opt(`\\frac{1}{${linear(a, b)}}`, (x) => 1 / (a * x + b), R`That is the reciprocal of \(f\). The inverse function undoes \(f\): it must turn \(f(x)\) back into \(x\).`),
      opt(invLinearTex(a, -b), (x) => (x + b) / a, R`To undo \(${b > 0 ? '+' : '-'} ${Math.abs(b)}\), ${b > 0 ? 'subtract' : 'add'} \(${Math.abs(b)}\).`),
      opt(terms([[frac(1, a), 'x'], [-b, '']]), (x) => x / a - b, R`Undo the steps in reverse order: first ${b > 0 ? 'subtract' : 'add'} \(${Math.abs(b)}\), then divide the whole result by \(${a}\).`),
      opt(linear(a, -b), (x) => a * x - b),
      opt(linear(-a, -b), (x) => -a * x - b),
    ]),
    solution: [
      R`Write \(y = ${linear(a, b)}\), then swap \(x\) and \(y\): \(x = ${linear(a, b, 'y')}\).`,
      R`Solve for \(y\). ${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\): \(${linear(1, -b)} = ${terms([[a, 'y']])}\). Divide by \(${a}\): \(y = ${invLinearTex(a, b)}\).`,
      R`So \(f^{-1}(x) = ${invLinearTex(a, b)}\). Check: \(f(f^{-1}(x)) = ${a}\left(${invLinearTex(a, b)}\right) ${b > 0 ? '+' : '-'} ${Math.abs(b)} = x\). ✓`,
    ],
    rule: 4,
    skill: 'finding an inverse',
    check: () => checkSame((x) => a * ((x - b) / a) + b, (x) => x),
  });
}

function mediumWordCompose(rng) {
  if (rng.bool(0.5)) {
    const price = 10 * rng.int(4, 20);
    const c = rng.pick([5, 10, 15, 20]);
    const p = rng.pick([10, 20, 25, 30, 40, 50]);
    const couponFirst = rng.bool(0.5);
    const k = 1 - p / 100;
    const right = couponFirst ? k * (price - c) : k * price - c;
    const other = couponFirst ? k * price - c : k * (price - c);
    return q({
      prompt: `A store takes $${c} off with a coupon, modelled by f(x) = x − ${c}, and has a ${p}%-off sale, modelled by g(x) = ${num(k)}x. ${couponFirst ? 'The coupon is applied first and then the sale discount' : 'The sale discount is applied first and then the coupon'}. What is the final price of an item marked $${price}?`,
      correct: right,
      fmt: money,
      wrong: [
        { value: other, why: `That applies the discounts in the other order. Here the ${couponFirst ? 'coupon' : 'sale discount'} comes first, so it is the inside function.` },
        { value: price - c - p, why: `${p}% off means multiplying by ${num(k)}, not subtracting ${p} dollars.` },
        k * price,
        price - c,
      ],
      solution: [
        couponFirst ? R`The coupon is used first, so it goes inside: the final price is \(g(f(${price}))\).` : R`The sale discount is used first, so it goes inside: the final price is \(f(g(${price}))\).`,
        couponFirst ? R`\(f(${price}) = ${price} - ${c} = ${price - c}\).` : R`\(g(${price}) = ${num(k)} \cdot ${price} = ${num(k * price)}\).`,
        couponFirst ? R`\(g(${price - c}) = ${num(k)} \cdot ${price - c} = ${num(right)}\). The final price is ${money(right)}.` : R`\(f(${num(k * price)}) = ${num(k * price)} - ${c} = ${num(right)}\). The final price is ${money(right)}.`,
      ],
      rule: 3,
      skill: 'composition in context',
      check: () => {
        const first = couponFirst ? price - c : price - (p / 100) * price;
        const second = couponFirst ? first - (p / 100) * first : first - c;
        return Math.abs(second - right) < 1e-9 ? true : 'applying the discounts one at a time gives a different price';
      },
    });
  }
  const rate = 10 * rng.int(2, 9);
  const cost = rng.int(2, 9);
  const fixed = 50 * rng.int(2, 10);
  const t = rng.int(3, 12);
  const n = rate * t;
  const total = cost * n + fixed;
  return q({
    prompt: R`A factory makes \(n(t) = ${rate}t\) parts in \(t\) hours. Making \(n\) parts costs \(C(n) = ${cost}n + ${fixed}\) dollars. What is the cost of running the factory for ${t} hours?`,
    correct: total,
    fmt: money,
    wrong: [
      { value: cost * t + fixed, why: R`\(C\) needs the number of parts, not the number of hours. First find \(n(${t}) = ${n}\).` },
      { value: cost * n, why: R`The fixed cost of \(${fixed}\) dollars is part of \(C(n)\) too.` },
      rate * (cost * t + fixed),
      total + fixed,
    ],
    solution: [
      R`The cost depends on the number of parts, and the number of parts depends on the time. So the cost after \(t\) hours is the composition \(C(n(t))\).`,
      R`Inside first: \(n(${t}) = ${rate} \cdot ${t} = ${n}\) parts.`,
      R`Then \(C(${n}) = ${cost} \cdot ${n} + ${fixed} = ${num(total)}\). The cost is ${money(total)}.`,
    ],
    rule: 3,
    skill: 'composition in context',
    check: () => (cost * rate * t + fixed === total ? true : 'the composed formula gives a different cost'),
  });
}

// ───────────── Hard ─────────────

function hardGraphTransform(rng) {
  const p = rng.pick(['sq', 'abs', 'sqrt']);
  const a = rng.pick([1, -1, 2, -2]);
  const h = rng.int(-4, 4);
  const k = rng.intExcept(-4, 4, h === 0 ? [0] : []);
  const g = gFn(p, a, h, k);
  const xs = [h + 0.5, h + 1.7, h + 3.1];
  const opt = (aa, hh, kk, why) => ({ tex: fx('g', gTex(p, aa, hh, kk)), f: gFn(p, aa, hh, kk), why });
  const P = PARENTS[p];
  return q({
    prompt: R`The graph shows a transformation of \(f(x) = ${P.tex('x')}\). Which function is graphed?`,
    visual: {
      type: 'plot',
      x: [h - 6, h + 6],
      y: [k - 7, k + 7],
      step: [1, 1],
      fns: [{ f: g }],
      points: [{ x: h, y: k, label: `(${txt(h)}, ${txt(k)})` }, { x: h + 1, y: a + k, color: 'b' }],
      alt: `Graph of a ${P.shape} with its ${P.anchor} at (${txt(h)}, ${txt(k)}), ${p === 'sqrt' ? (a > 0 ? 'rising' : 'falling') + ' to the right' : 'opening ' + (a > 0 ? 'upward' : 'downward')}. It passes through (${txt(h + 1)}, ${txt(a + k)}).`,
    },
    ...symChoices(opt(a, h, k), [
      h !== 0 ? opt(a, -h, k, R`The ${P.anchor} is at \(x = ${h}\), so the inside of the function is \(${linear(1, -h)}\).`) : null,
      opt(-a, h, k, `The graph ${p === 'sqrt' ? (a > 0 ? 'rises' : 'falls') : 'opens ' + (a > 0 ? 'upward' : 'downward')}, so the number in front is ${a > 0 ? 'positive' : 'negative'}.`),
      k !== 0 ? opt(a, h, -k) : null,
      opt(a, k, h),
      opt(a === 1 || a === -1 ? 2 * a : a / 2, h, k),
      opt(a, h + 1, k),
    ], xs),
    solution: [
      `The ${P.anchor} has moved from (0, 0) to (${txt(h)}, ${txt(k)}): a shift of ${shiftWords(h, k)}.`,
      R`One step to the right of the ${P.anchor}, the graph is at height \(${a + k}\), which is \(${Math.abs(a)}\) ${a > 0 ? 'above' : 'below'} it. For the parent function that change is \(1\) up, so \(a = ${a}\).`,
      R`So \(g(x) = ${gTex(p, a, h, k)}\).`,
    ],
    rule: 1,
    skill: 'transformations from a graph',
    check: () => (Math.abs(g(h) - k) < 1e-12 && Math.abs(g(h + 1) - (a + k)) < 1e-12 ? true : 'the marked points are not on the graph'),
  });
}

function hardInverse(rng) {
  const kind = rng.pick(['rational', 'rational', 'restricted', 'cubic']);
  const name = (tex) => fx('f^{-1}', tex);
  if (kind === 'rational') {
    const a = rng.nonzero(-5, 5);
    const d = rng.intExcept(-6, 6, [0, -a]);
    const b = rng.intExcept(-7, 7, [0, a * d]);
    const top = d < 0 || b < 0 ? terms([[-d, 'x'], [b, '']]) : terms([[b, ''], [-d, 'x']]);
    const right = d > 0 && b < 0 ? `-\\frac{${terms([[d, 'x'], [-b, '']])}}{${linear(1, -a)}}` : `\\frac{${top}}{${linear(1, -a)}}`;
    const f = (x) => (a * x + b) / (x + d);
    const inv = (x) => (b - d * x) / (x - a);
    const opt = (tex, fn, why) => ({ tex: name(tex), f: fn, why });
    return q({
      prompt: R`Find the inverse of \(f(x) = \dfrac{${linear(a, b)}}{${linear(1, d)}}\).`,
      ...symChoices(opt(right, inv), [
        opt(`\\frac{${linear(1, d)}}{${linear(a, b)}}`, (x) => (x + d) / (a * x + b), R`That is the reciprocal \(\frac{1}{f(x)}\). To find the inverse, swap \(x\) and \(y\) and solve for \(y\).`),
        opt(`\\frac{${terms([[d, 'x'], [b, '']])}}{${linear(1, -a)}}`, (x) => (d * x + b) / (x - a), R`After expanding \(x(${linear(1, d, 'y')})\), the term \(${terms([[d, 'x']])}\) moves to the other side and changes sign.`),
        opt(`\\frac{${top}}{${linear(1, a)}}`, (x) => (b - d * x) / (x + a)),
        opt(`\\frac{${linear(a, b)}}{${linear(1, -d)}}`, (x) => (a * x + b) / (x - d)),
        opt(`\\frac{${terms([[d, 'x'], [-b, '']])}}{${linear(1, -a)}}`, (x) => (d * x - b) / (x - a)),
      ]),
      solution: [
        R`Write \(y = \dfrac{${linear(a, b)}}{${linear(1, d)}}\) and swap \(x\) and \(y\): \(x = \dfrac{${linear(a, b, 'y')}}{${linear(1, d, 'y')}}\).`,
        R`Multiply both sides by \(${linear(1, d, 'y')}\): \(${terms([[1, 'xy'], [d, 'x']])} = ${linear(a, b, 'y')}\).`,
        R`Collect the \(y\) terms on one side: \(${terms([[1, 'xy'], [-a, 'y']])} = ${terms([[-d, 'x'], [b, '']])}\), so \(y(${linear(1, -a)}) = ${terms([[-d, 'x'], [b, '']])}\).`,
        R`Divide: \(f^{-1}(x) = ${right}\).`,
      ],
      rule: 4,
      skill: 'finding an inverse',
      check: () => checkSame((x) => f(inv(x)), (x) => x),
    });
  }
  const h = rng.nonzero(-6, 6);
  const k = rng.nonzero(-6, 6);
  if (kind === 'restricted') {
    const root = `\\sqrt{${linear(1, -k)}}`;
    const xs = [k + 0.37, k + 1.29, k + 2.23];
    const opt = (tex, fn, why) => ({ tex: name(tex), f: fn, why });
    return q({
      prompt: R`Find the inverse of \(f(x) = (${linear(1, -h)})^{2} ${k > 0 ? '+' : '-'} ${Math.abs(k)}\) on the domain \(x \ge ${h}\).`,
      ...symChoices(opt(terms([[1, root], [h, '']]), (x) => Math.sqrt(x - k) + h), [
        opt(terms([[-1, root], [h, '']]), (x) => -Math.sqrt(x - k) + h, R`The domain of \(f\) is \(x \ge ${h}\), so the outputs of \(f^{-1}\) must be at least \(${h}\). That needs the positive square root.`),
        opt(terms([[1, `\\sqrt{${linear(1, -h)}}`], [k, '']]), (x) => Math.sqrt(x - h) + k, R`Undo the steps of \(f\) in reverse order: first undo \(${k > 0 ? '+' : '-'} ${Math.abs(k)}\), then the square, then \(${h > 0 ? '-' : '+'} ${Math.abs(h)}\).`),
        opt(terms([[1, root], [-h, '']]), (x) => Math.sqrt(x - k) - h),
        opt(terms([[1, `\\sqrt{${linear(1, k)}}`], [h, '']]), (x) => Math.sqrt(x + k) + h),
      ], xs),
      solution: [
        R`Swap \(x\) and \(y\): \(x = (${linear(1, -h, 'y')})^{2} ${k > 0 ? '+' : '-'} ${Math.abs(k)}\).`,
        R`${k > 0 ? 'Subtract' : 'Add'} \(${Math.abs(k)}\): \(${linear(1, -k)} = (${linear(1, -h, 'y')})^{2}\).`,
        R`Take the square root. Because \(y \ge ${h}\), \(${linear(1, -h, 'y')}\) is not negative, so use the positive root: \(${linear(1, -h, 'y')} = ${root}\).`,
        R`So \(f^{-1}(x) = ${terms([[1, root], [h, '']])}\), for \(x \ge ${k}\).`,
      ],
      rule: 6,
      skill: 'inverse with a restricted domain',
      check: () => checkSame((x) => (Math.sqrt(x - k) + h - h) ** 2 + k, (x) => x, xs),
    });
  }
  const a = rng.pick([1, 1, 2, 3, 4]);
  const inside = a === 1 ? linear(1, -k) : `\\frac{${linear(1, -k)}}{${a}}`;
  const cbrt = (u) => `\\sqrt[3]{${u}}`;
  const opt = (tex, fn, why) => ({ tex: name(tex), f: fn, why });
  return q({
    prompt: R`Find the inverse of \(f(x) = ${terms([[a, `(${linear(1, -h)})^{3}`], [k, '']])}\).`,
    ...symChoices(opt(terms([[1, cbrt(inside)], [h, '']]), (x) => Math.cbrt((x - k) / a) + h), [
      opt(terms([[1, cbrt(a === 1 ? linear(1, k) : `\\frac{${linear(1, k)}}{${a}}`)], [h, '']]), (x) => Math.cbrt((x + k) / a) + h, R`To undo \(${k > 0 ? '+' : '-'} ${Math.abs(k)}\), ${k > 0 ? 'subtract' : 'add'} \(${Math.abs(k)}\).`),
      opt(terms([[1, cbrt(inside)], [-h, '']]), (x) => Math.cbrt((x - k) / a) - h, R`The last step undoes \(${h > 0 ? '-' : '+'} ${Math.abs(h)}\), so ${h > 0 ? 'add' : 'subtract'} \(${Math.abs(h)}\).`),
      a > 1 ? opt(terms([[frac(1, a), cbrt(linear(1, -k))], [h, '']]), (x) => Math.cbrt(x - k) / a + h, R`Divide by \(${a}\) before taking the cube root, because \(f\) multiplies by \(${a}\) after cubing.`) : null,
      opt(terms([[1, cbrt(linear(1, -h))], [k, '']]), (x) => Math.cbrt(x - h) + k),
      opt(terms([[1, `(${inside})^{3}`], [h, '']]), (x) => ((x - k) / a) ** 3 + h),
    ]),
    solution: [
      R`Swap \(x\) and \(y\): \(x = ${terms([[a, `(${linear(1, -h, 'y')})^{3}`], [k, '']])}\).`,
      R`Undo the operations in reverse order. ${k > 0 ? 'Subtract' : 'Add'} \(${Math.abs(k)}\)${a > 1 ? R` and divide by \(${a}\)` : ''}: \(${inside} = (${linear(1, -h, 'y')})^{3}\).`,
      R`Take the cube root: \(${cbrt(inside)} = ${linear(1, -h, 'y')}\). Then ${h > 0 ? 'add' : 'subtract'} \(${Math.abs(h)}\).`,
      R`So \(f^{-1}(x) = ${terms([[1, cbrt(inside)], [h, '']])}\).`,
    ],
    rule: 4,
    skill: 'finding an inverse',
    check: () => checkSame((x) => a * (Math.cbrt((x - k) / a) + h - h) ** 3 + k, (x) => x),
  });
}

function hardCompositionDomain(rng) {
  if (rng.bool(0.6)) {
    const b = rng.intExcept(-5, 5, [0]);
    const m = rng.nonzero(-8, 8);
    const c = -b * m; // g(x) = bx + c is zero at x = m
    const rel = b > 0 ? R`\ge` : R`\le`;
    const flip = b > 0 ? R`\le` : R`\ge`;
    const D = (r, v) => M(`x ${r} ${v}`);
    return q({
      prompt: R`Let \(f(x) = \sqrt{x}\) and \(g(x) = ${linear(b, c)}\). What is the domain of \((f \circ g)(x)\)?`,
      correct: D(rel, m),
      wrong: [
        { value: D(flip, m), why: b < 0 ? R`Dividing an inequality by the negative number \(${b}\) reverses the inequality sign.` : R`Solve \(${linear(b, c)} \ge 0\): the sign stays as it is when dividing by a positive number.` },
        { value: D(R`\ge`, 0), why: R`That is the domain of \(f\) alone. In \(f(g(x))\), it is \(g(x)\) that must be at least 0.` },
        'All real numbers',
        D(rel, -m),
        D(rel, c),
      ],
      solution: [
        R`\((f \circ g)(x) = f(g(x)) = \sqrt{${linear(b, c)}}\).`,
        R`\(g\) accepts every real number, but \(f\) needs an input that is not negative: \(${linear(b, c)} \ge 0\).`,
        b === 1 ? R`Solve: \(x \ge ${m}\).` : R`Solve: \(${terms([[b, 'x']])} \ge ${-c}\), so \(x ${rel} ${m}\)${b < 0 ? ' (dividing by a negative number reverses the sign)' : ''}.`,
      ],
      rule: 3,
      skill: 'domain of a composition',
      check: () => {
        const g = (x) => b * x + c;
        const inside = b > 0 ? m + 1 : m - 1;
        const outside = b > 0 ? m - 1 : m + 1;
        return g(m) === 0 && g(inside) > 0 && g(outside) < 0 ? true : 'the boundary of the domain is wrong';
      },
    });
  }
  const a = rng.int(2, 9);
  const D = (tex) => M(tex);
  return q({
    prompt: R`Let \(f(x) = \dfrac{1}{x - ${a}}\) and \(g(x) = \sqrt{x}\). What is the domain of \((f \circ g)(x)\)?`,
    correct: D(R`x \ge 0 \text{ and } x \ne ${a * a}`),
    wrong: [
      { value: D(R`x \ge 0 \text{ and } x \ne ${a}`), why: R`The denominator is \(\sqrt{x} - ${a}\), which is 0 when \(\sqrt{x} = ${a}\), that is, when \(x = ${a * a}\).` },
      { value: D(R`x \ne ${a}`), why: R`That is the domain of \(f\) alone. The input of \(f\) here is \(\sqrt{x}\), and \(g\) needs \(x \ge 0\) as well.` },
      D(R`x \ge 0`),
      D(R`x > ${a * a}`),
    ],
    solution: [
      R`\((f \circ g)(x) = f(\sqrt{x}) = \dfrac{1}{\sqrt{x} - ${a}}\).`,
      R`First, \(g(x) = \sqrt{x}\) needs \(x \ge 0\).`,
      R`Second, the denominator cannot be 0: \(\sqrt{x} \ne ${a}\), so \(x \ne ${a * a}\).`,
      R`Domain: \(x \ge 0\) and \(x \ne ${a * a}\).`,
    ],
    rule: 3,
    skill: 'domain of a composition',
    check: () => (Math.sqrt(a * a) - a === 0 ? true : 'the excluded value is wrong'),
  });
}

const COSTS = [
  { story: (r, f) => R`A taxi ride of \(n\) miles costs \(C(n) = ${r}n + ${f}\) dollars.`, ask: (v) => `How long is a ride that costs $${v}`, unit: 'miles' },
  { story: (r, f) => R`Printing \(n\) T-shirts costs \(C(n) = ${r}n + ${f}\) dollars, including the set-up fee.`, ask: (v) => `How many shirts can be printed for $${v}`, unit: 'shirts' },
  { story: (r, f) => R`A gym charges \(C(n) = ${r}n + ${f}\) dollars for \(n\) months, including the joining fee.`, ask: (v) => `How many months of membership cost $${v}`, unit: 'months' },
];

function hardWordInverse(rng) {
  const ctx = rng.pick(COSTS);
  const rate = rng.pick([2, 3, 4, 5, 6, 8, 12, 15]);
  const fee = rng.pick([4, 5, 6, 8, 10, 20, 25, 30]);
  const n = rng.int(4, 24);
  const v = rate * n + fee;
  return q({
    prompt: R`${ctx.story(rate, fee)} ${ctx.ask(v)}? (This is the value of \(C^{-1}(${v})\).)`,
    correct: n,
    unit: ctx.unit,
    wrong: [
      { value: rate * v + fee, why: R`That is \(C(${v})\), the cost of \(${v}\) ${ctx.unit}. The inverse works backwards from a cost to a number of ${ctx.unit}.` },
      { value: frac(v + fee, rate), why: R`To undo \(+ ${fee}\), subtract \(${fee}\) from the cost before dividing.` },
      { value: frac(v, rate), why: R`The fee of \(${fee}\) dollars has to be taken off the cost first.` },
      n + 2,
    ],
    solution: [
      R`\(C^{-1}(${v})\) is the input \(n\) for which \(C(n) = ${v}\): solve \(${rate}n + ${fee} = ${v}\).`,
      R`Subtract \(${fee}\): \(${rate}n = ${v - fee}\). Divide by \(${rate}\): \(n = ${n}\).`,
      R`In general \(C^{-1}(x) = \dfrac{x - ${fee}}{${rate}}\), which turns a cost back into a number of ${ctx.unit}.`,
    ],
    rule: 4,
    skill: 'inverse in context',
    check: () => (rate * n + fee === v ? true : 'C(n) does not equal the given cost'),
  });
}

// ───────────── Challenge ─────────────

function challengeFindInner(rng) {
  const a = rng.intExcept(-5, 5, [-1, 0, 1]);
  const b = rng.nonzero(-9, 9);
  const G = rng.bool(0.7) ? [1, rng.int(-5, 5), rng.int(-6, 6)] : [rng.intExcept(-5, 5, [0]), rng.nonzero(-6, 6)];
  const H = polyAdd(polyScale(G, a), [b]);
  const opt = (c, why) => ({ tex: fx('g', poly(c)), f: (x) => polyEval(c, x), why });
  return q({
    prompt: R`Suppose \(f(x) = ${linear(a, b)}\) and \((f \circ g)(x) = ${poly(H)}\). Which function is \(g\)?`,
    ...symChoices(opt(G), [
      opt(polyAdd(H, [-b]), R`That undoes only the \(${b > 0 ? '+' : '-'} ${Math.abs(b)}\). \(f\) also multiplies by \(${a}\), so divide by \(${a}\) as well.`),
      opt(polyAdd(polyScale(H, a), [b]), R`That applies \(f\) to the result again. To find \(g\), undo \(f\) instead.`),
      opt(polyAdd(G, [b])),
      opt(G.map((c, i) => (i === G.length - 1 ? c + 1 : c))),
      opt(polyScale(G, -1)),
    ]),
    solution: [
      R`\((f \circ g)(x) = f(g(x)) = ${a} \cdot g(x) ${b > 0 ? '+' : '-'} ${Math.abs(b)}\).`,
      R`Set this equal to the given expression: \(${a} \cdot g(x) ${b > 0 ? '+' : '-'} ${Math.abs(b)} = ${poly(H)}\).`,
      R`${b > 0 ? 'Subtract' : 'Add'} \(${Math.abs(b)}\): \(${a} \cdot g(x) = ${poly(polyAdd(H, [-b]))}\). Divide by \(${a}\): \(g(x) = ${poly(G)}\).`,
    ],
    rule: 3,
    skill: 'working backwards',
    check: () => checkSame((x) => a * polyEval(G, x) + b, (x) => polyEval(H, x)),
  });
}

function challengeOrder(rng) {
  const opt = (tex, f, why) => ({ tex: `y = ${tex}`, f, why });
  if (rng.bool(0.5)) {
    const p = rng.pick(['sq', 'abs', 'sqrt', 'cube']);
    const P = PARENTS[p];
    const a = rng.pick([2, 3, 4]);
    const k = rng.nonzero(-6, 6);
    const stretchFirst = rng.bool(0.5);
    const core = P.tex('x');
    const first = { tex: terms([[a, core], [k, '']]), f: (x) => a * P.f(x) + k }; // stretch, then shift
    const second = { tex: terms([[a, core], [a * k, '']]), f: (x) => a * (P.f(x) + k) }; // shift, then stretch
    const [right, other] = stretchFirst ? [first, second] : [second, first];
    const xs = p === 'sqrt' ? [0.37, 1.29, 2.23] : [-1.7, 0.37, 2.23];
    return q({
      prompt: R`The graph of \(y = ${core}\) is ${stretchFirst ? `stretched vertically by a factor of ${a} and then shifted ${shiftWords(0, k)}` : `shifted ${shiftWords(0, k)} and then stretched vertically by a factor of ${a}`}. What is the equation of the new graph?`,
      ...symChoices(opt(right.tex, right.f), [
        opt(other.tex, other.f, stretchFirst ? 'The shift happens after the stretch, so it is not multiplied.' : R`The shift happens first, so the stretch multiplies it too: \(${a}(${terms([[1, core], [k, '']])})\).`),
        opt(terms([[1, P.tex(`${a}x`)], [k, '']]), (x) => P.f(a * x) + k, R`A vertical stretch multiplies the outputs, so the \(${a}\) goes outside the function.`),
        opt(terms([[a, P.tex(linear(1, k))]]), (x) => a * P.f(x + k)),
        opt(terms([[a, core], [-k, '']]), (x) => a * P.f(x) - k),
        opt(terms([[1, core], [a * k, '']]), (x) => P.f(x) + a * k),
        opt(terms([[a, core], [a + k, '']]), (x) => a * P.f(x) + a + k),
      ], xs),
      solution: stretchFirst
        ? [R`Stretch first: every output is multiplied by \(${a}\), giving \(y = ${terms([[a, core]])}\).`, R`Then shift ${shiftWords(0, k)}: \(y = ${first.tex}\).`]
        : [R`Shift first: \(y = ${terms([[1, core], [k, '']])}\).`, R`Then stretch: every output, including the \(${k}\), is multiplied by \(${a}\): \(y = ${a}(${terms([[1, core], [k, '']])}) = ${second.tex}\).`],
      rule: 1,
      skill: 'order of transformations',
      check: () => {
        const stretch = (F) => (x) => a * F(x);
        const shift = (F) => (x) => F(x) + k;
        return checkSame(stretchFirst ? shift(stretch(P.f)) : stretch(shift(P.f)), right.f, xs);
      },
    });
  }
  const p = rng.pick(['sqrt', 'cube']);
  const P = PARENTS[p];
  const h = rng.int(1, 7);
  const reflectFirst = rng.bool(0.5);
  const A = { tex: P.tex(`${h} - x`), f: (x) => P.f(h - x) }; // reflect in the y-axis, then shift right h
  const B = { tex: P.tex(`-x - ${h}`), f: (x) => P.f(-x - h) }; // shift right h, then reflect in the y-axis
  const [right, other] = reflectFirst ? [A, B] : [B, A];
  const xs = [-h - 3.3, -h - 1.7, -h - 0.4];
  return q({
    prompt: R`The graph of \(y = ${P.tex('x')}\) is ${reflectFirst ? `reflected in the y-axis and then shifted ${h} to the right` : `shifted ${h} to the right and then reflected in the y-axis`}. What is the equation of the new graph?`,
    ...symChoices(opt(right.tex, right.f), [
      opt(other.tex, other.f, reflectFirst ? R`The shift comes last, so replace \(x\) with \(x - ${h}\) in \(${P.tex('-x')}\): \(-(x - ${h}) = ${h} - x\).` : R`The reflection comes last, so replace \(x\) with \(-x\) in \(${P.tex(`x - ${h}`)}\).`),
      opt(`-${P.tex(`x - ${h}`)}`, (x) => -P.f(x - h), R`A minus sign in front reflects in the x-axis. A reflection in the y-axis replaces \(x\) with \(-x\).`),
      opt(terms([[1, P.tex('-x')], [h, '']]), (x) => P.f(-x) + h),
      opt(P.tex(`x + ${h}`), (x) => P.f(x + h)),
    ], xs),
    solution: reflectFirst
      ? [R`Reflect in the y-axis: replace \(x\) with \(-x\) to get \(y = ${P.tex('-x')}\).`, R`Shift ${h} right: replace \(x\) with \(x - ${h}\): \(y = ${P.tex(`-(x - ${h})`)} = ${A.tex}\).`]
      : [R`Shift ${h} right: replace \(x\) with \(x - ${h}\) to get \(y = ${P.tex(`x - ${h}`)}\).`, R`Reflect in the y-axis: replace \(x\) with \(-x\): \(y = ${B.tex}\).`],
    rule: 1,
    skill: 'order of transformations',
    check: () => {
      const reflect = (F) => (x) => F(-x);
      const shift = (F) => (x) => F(x - h);
      return checkSame(reflectFirst ? shift(reflect(P.f)) : reflect(shift(P.f)), right.f, xs);
    },
  });
}

function challengeRestrict(rng) {
  const p = rng.pick(['sq', 'sq', 'abs']);
  const a = rng.sign();
  const h = rng.nonzero(-5, 5);
  const k = rng.int(-4, 4);
  const g = gFn(p, a, h, k);
  const useRight = rng.bool(0.5);
  const big = 40;
  // Each option: its text and the interval it describes.
  const good = useRight ? { tex: R`x \ge ${h}`, lo: h, hi: big } : { tex: R`x \le ${h}`, lo: -big, hi: h };
  const c1 = rng.int(1, 3);
  const c2 = rng.int(1, 3);
  const bad = [
    { tex: useRight ? R`x \ge ${h - c1}` : R`x \le ${h + c1}`, lo: useRight ? h - c1 : -big, hi: useRight ? big : h + c1, why: R`That interval still contains points on both sides of \(x = ${h}\), where the graph turns around. Two of them share the same output.` },
    0 < h && useRight ? { tex: R`x \ge 0`, lo: 0, hi: big, why: R`The graph turns around at \(x = ${h}\), not at \(x = 0\).` } : null,
    0 > h && !useRight ? { tex: R`x \le 0`, lo: -big, hi: 0, why: R`The graph turns around at \(x = ${h}\), not at \(x = 0\).` } : null,
    { tex: R`${h - c2} \le x \le ${h + c2}`, lo: h - c2, hi: h + c2 },
    { tex: R`\text{all real numbers}`, lo: -big, hi: big, why: 'On all real numbers the function fails the horizontal line test, so it has no inverse function.' },
    { tex: useRight ? R`x \le ${h + c1 + 1}` : R`x \ge ${h - c1 - 1}`, lo: useRight ? -big : h - c1 - 1, hi: useRight ? h + c1 + 1 : big },
  ].filter(Boolean);
  const oneToOne = (o) => {
    let dir = 0;
    for (let i = 1; i <= 200; i++) {
      const d = Math.sign(g(o.lo + ((o.hi - o.lo) * i) / 200) - g(o.lo + ((o.hi - o.lo) * (i - 1)) / 200));
      if (d !== 0 && dir !== 0 && d !== dir) return false;
      if (d !== 0) dir = d;
    }
    return true;
  };
  return q({
    prompt: R`The function \(f(x) = ${gTex(p, a, h, k)}\) is not one-to-one. On which domain is it one-to-one, so that it has an inverse function?`,
    visual: {
      type: 'plot',
      x: [h - 6, h + 6],
      y: a > 0 ? [k - 2, k + 10] : [k - 10, k + 2],
      fns: [{ f: g }],
      points: [{ x: h, y: k, label: `(${txt(h)}, ${txt(k)})` }],
      alt: `Graph of f, a ${PARENTS[p].shape} opening ${a > 0 ? 'upward' : 'downward'} with its vertex at (${txt(h)}, ${txt(k)}). A horizontal line above or below the vertex crosses the graph twice.`,
    },
    correct: M(good.tex),
    wrong: bad.map((o) => (o.why ? { value: M(o.tex), why: o.why } : M(o.tex))),
    solution: [
      R`A function is one-to-one when no horizontal line meets its graph more than once. This graph turns around at its vertex, \(x = ${h}\).`,
      R`Keeping only one side of the vertex removes the repeated outputs. On \(${good.tex}\) the function is always ${(useRight ? 1 : -1) * a > 0 ? 'increasing' : 'decreasing'}, so it is one-to-one.`,
      'Each of the other domains contains points on both sides of the vertex.',
    ],
    rule: 6,
    skill: 'one-to-one functions',
    check: () => (oneToOne(good) && bad.every((o) => !oneToOne(o)) ? true : 'a choice is on the wrong side of one-to-one'),
  });
}

// ───────────── Models ─────────────

function transformModel({ parent, a, h, k }) {
  if (a === 0) return { error: 'With a = 0 every output becomes k, so the graph is a horizontal line. Choose a value of a other than 0.' };
  const P = PARENTS[parent];
  const g = gFn(parent, a, h, k);
  const steps = [R`Start with the parent function \(f(x) = ${P.tex('x')}\) and compare with \(g(x) = a \cdot f(x - h) + k\): here \(a = ${num(a)}\), \(h = ${h}\), \(k = ${k}\).`];
  steps.push(h === 0 ? 'h = 0: there is no horizontal shift.' : R`Inside the function, \(x\) is replaced by \(${linear(1, -h)}\): the graph shifts ${Math.abs(h)} to the ${h > 0 ? 'right' : 'left'}.`);
  if (Math.abs(a) !== 1) steps.push(`Every output is multiplied by ${txt(Math.abs(a))}: a vertical ${Math.abs(a) > 1 ? 'stretch' : 'compression'}.`);
  if (a < 0) steps.push('a is negative: the graph is reflected in the x-axis.');
  steps.push(k === 0 ? 'k = 0: there is no vertical shift.' : `${Math.abs(k)} is ${k > 0 ? 'added' : 'subtracted'} outside the function: the graph shifts ${Math.abs(k)} ${k > 0 ? 'up' : 'down'}.`);
  const ys = [];
  for (let i = 0; i <= 40; i++) {
    const x = h - 5 + i / 4;
    for (const y of [g(x), P.f(x)]) if (Number.isFinite(y)) ys.push(Math.max(-14, Math.min(14, y)));
  }
  return {
    problem: R`\(g(x) = ${gTex(parent, a, h, k)}\)`,
    steps,
    answer: R`The ${P.anchor} moves from \((0, 0)\) to \((${h}, ${k})\)${a < 0 ? ', and the graph is turned upside down' : ''}.`,
    visual: {
      type: 'plot',
      x: [Math.min(h, 0) - 5, Math.max(h, 0) + 5],
      y: [Math.min(...ys, -1) - 1, Math.max(...ys, 1) + 1],
      fns: [{ f: P.f, dashed: true, color: 'b', label: `y = ${P.plain}` }, { f: g, color: 'a' }],
      points: [{ x: h, y: k, label: `(${txt(h)}, ${txt(k)})` }],
      alt: `Graph of the parent function y = ${P.plain} (dashed) and the transformed function (solid), whose ${P.anchor} is at (${txt(h)}, ${txt(k)}).`,
    },
  };
}

function couponModel({ price, c, p }) {
  if (c >= price) return { error: 'The coupon is worth more than the item. Choose a higher price or a smaller coupon.' };
  const k = 1 - p / 100;
  const couponFirst = k * (price - c);
  const saleFirst = k * price - c;
  return {
    problem: `A jacket is marked $${price}. Mei has a coupon for $${c} off, and the store also takes ${p}% off. Does the order of the two discounts matter?`,
    steps: [
      R`Write each discount as a function of the price \(x\): coupon \(f(x) = x - ${c}\), sale \(g(x) = ${num(k)}x\).`,
      R`Coupon first, then sale: \(g(f(${price})) = ${num(k)}(${price} - ${c}) = ${num(k)} \cdot ${price - c} = ${num(couponFirst, { places: 2 })}\).`,
      R`Sale first, then coupon: \(f(g(${price})) = ${num(k)} \cdot ${price} - ${c} = ${num(saleFirst, { places: 2 })}\).`,
      R`In general \(g(f(x)) = ${num(k)}x - ${num(k * c)}\) and \(f(g(x)) = ${num(k)}x - ${c}\). The two compositions are different functions.`,
    ],
    answer: `Yes. Coupon first costs ${money(couponFirst)}; sale first costs ${money(saleFirst)}, which is ${money(couponFirst - saleFirst)} less.`,
  };
}

export default {
  id: 'functions-inverses',
  title: 'Transformations, Composition & Inverse Functions',
  summary: 'Shift, stretch and reflect graphs, combine and compose functions, and find and check inverse functions.',
  standards: ['CCSS F-BF.A.1', 'CCSS F-BF.B.3', 'CCSS F-BF.B.4'],

  explain: {
    intro: R`New functions are built from old ones in three main ways. Changing the formula slightly moves or reshapes the graph. Two functions can be added, multiplied or composed, which means feeding the output of one into the other. And a function that never repeats an output can be run backwards: that is its inverse.`,
    rules: [
      {
        title: 'Shifts',
        text: R`\(g(x) = f(x - h) + k\) shifts the graph of \(f\) by \(h\) to the right and \(k\) up. A number added outside the function moves the graph vertically, the way its sign says. A number inside, with \(x\), moves it horizontally in the opposite direction to its sign.`,
        example: R`\(g(x) = (x - 3)^{2} + 2\) is \(y = x^{2}\) moved 3 right and 2 up. \(g(x) = |x + 4|\) is \(y = |x|\) moved 4 left.`,
      },
      {
        title: 'Stretches and reflections',
        text: R`\(g(x) = a \cdot f(x)\) multiplies every output by \(a\): a vertical stretch if \(|a| > 1\), a compression if \(|a| < 1\), and a reflection in the x-axis if \(a\) is negative. \(g(x) = f(-x)\) reflects the graph in the y-axis. The order of the steps matters.`,
        example: R`\(g(x) = -2\sqrt{x}\) is \(y = \sqrt{x}\) stretched by a factor of 2 and flipped over the x-axis.`,
      },
      {
        title: 'Combining functions',
        text: R`\((f + g)(x) = f(x) + g(x)\), and in the same way for \(f - g\), \(fg\) and \(\dfrac{f}{g}\). The combination is defined only where both functions are defined, and \(\dfrac{f}{g}\) also needs \(g(x) \ne 0\).`,
        example: R`If \(f(x) = x + 1\) and \(g(x) = x^{2}\), then \((f + g)(3) = 4 + 9 = 13\) and \((fg)(3) = 4 \cdot 9 = 36\).`,
      },
      {
        title: 'Composition',
        text: R`\((f \circ g)(x) = f(g(x))\): apply \(g\) first, then apply \(f\) to the result. Usually \(f \circ g\) and \(g \circ f\) are different. The domain is every \(x\) in the domain of \(g\) for which \(g(x)\) is in the domain of \(f\).`,
        example: R`If \(f(x) = 2x + 3\) and \(g(x) = x^{2}\), then \(f(g(x)) = 2x^{2} + 3\) but \(g(f(x)) = (2x + 3)^{2}\).`,
      },
      {
        title: 'Finding an inverse',
        text: R`The inverse \(f^{-1}\) undoes \(f\): if \(f(a) = b\) then \(f^{-1}(b) = a\). To find its formula, write \(y = f(x)\), swap \(x\) and \(y\), and solve for \(y\). Note that \(f^{-1}\) does not mean \(\dfrac{1}{f}\).`,
        example: R`\(f(x) = 2x + 6\): swap to get \(x = 2y + 6\), so \(y = \dfrac{x - 6}{2}\). Then \(f^{-1}(x) = \dfrac{x - 6}{2}\).`,
      },
      {
        title: 'Checking inverses by composition',
        text: R`\(f\) and \(g\) are inverses exactly when \(f(g(x)) = x\) and \(g(f(x)) = x\) for every \(x\) in the domains: each one undoes the other.`,
        example: R`\(f(x) = 2x + 6\) and \(g(x) = \dfrac{x - 6}{2}\): \(f(g(x)) = 2 \cdot \dfrac{x - 6}{2} + 6 = x\). ✓`,
      },
      {
        title: 'One-to-one functions and the line y = x',
        text: R`Only a one-to-one function (no horizontal line meets its graph twice) has an inverse function. The graph of \(f^{-1}\) is the graph of \(f\) reflected in the line \(y = x\): every point \((a, b)\) becomes \((b, a)\). A function that is not one-to-one can be given an inverse by restricting its domain.`,
        example: R`\(f(x) = x^{2}\) is not one-to-one, but on \(x \ge 0\) it is, with inverse \(f^{-1}(x) = \sqrt{x}\).`,
      },
    ],
    vocab: [
      { term: 'parent function', def: R`The simplest function of a family, such as \(y = x^{2}\), \(y = |x|\) or \(y = \sqrt{x}\).` },
      { term: 'transformation', def: 'A change to a graph: a shift, a stretch or compression, or a reflection.' },
      { term: 'composition', def: R`Using the output of one function as the input of another, written \((f \circ g)(x) = f(g(x))\).` },
      { term: 'inverse function', def: R`The function \(f^{-1}\) that reverses \(f\): it sends each output of \(f\) back to its input.` },
      { term: 'one-to-one', def: 'A function in which different inputs always give different outputs.' },
    ],
    mistakes: [
      R`Shifting the wrong way horizontally: \(f(x - 3)\) moves the graph right, not left.`,
      R`Composing in the wrong order. In \(f(g(x))\), \(g\) acts first.`,
      R`Reading \((f \circ g)(x)\) as a product. The circle means "substitute", not "multiply".`,
      R`Reading \(f^{-1}(x)\) as \(\dfrac{1}{f(x)}\). The inverse undoes the function; the reciprocal does not.`,
      'Finding an inverse without checking that the function is one-to-one on its domain.',
    ],
    visual: {
      type: 'plot',
      x: [-1, 6],
      y: [-1, 6],
      square: true,
      fns: [
        { f: (x) => x * x, domain: [0, 6], label: 'f(x) = x², x ≥ 0', labelAt: 1.55 },
        { f: (x) => Math.sqrt(x), color: 'b', label: 'f⁻¹(x) = √x', labelAt: 4.6 },
        { f: (x) => x, color: 'c', dashed: true },
      ],
      points: [{ x: 2, y: 4, label: '(2, 4)' }, { x: 4, y: 2, label: '(4, 2)', color: 'b' }],
      alt: 'Graph of f(x) = x² for x ≥ 0 and its inverse, the square-root function, with the dashed line y = x between them. Each curve is the mirror image of the other in that line: the point (2, 4) on f matches the point (4, 2) on the inverse.',
    },
  },

  examples: [
    {
      title: 'Reading the transformations',
      problem: R`Describe how the graph of \(g(x) = -2\sqrt{x + 3} - 1\) comes from \(f(x) = \sqrt{x}\).`,
      steps: [
        R`Compare with \(a \cdot f(x - h) + k\): \(a = -2\), \(h = -3\), \(k = -1\).`,
        R`\(x + 3 = x - (-3)\): shift 3 to the left.`,
        R`\(a = -2\): stretch vertically by a factor of 2 and reflect in the x-axis.`,
        R`\(k = -1\): shift 1 down. The starting point moves from \((0, 0)\) to \((-3, -1)\).`,
      ],
      answer: 'Reflected in the x-axis, stretched vertically by a factor of 2, then shifted 3 left and 1 down.',
      visual: {
        type: 'plot',
        x: [-5, 7],
        y: [-8, 4],
        fns: [{ f: (x) => Math.sqrt(x), dashed: true, color: 'b', label: 'y = √x' }, { f: (x) => -2 * Math.sqrt(x + 3) - 1, color: 'a', label: 'y = −2√(x + 3) − 1', labelAt: 3.5 }],
        points: [{ x: -3, y: -1, label: '(−3, −1)' }],
        alt: 'Graph of y = √x (dashed) and y = −2√(x + 3) − 1 (solid). The solid curve starts at (−3, −1) and falls to the right, twice as steeply as the dashed curve rises.',
      },
    },
    {
      title: 'Composition in both orders',
      problem: R`Let \(f(x) = 2x + 3\) and \(g(x) = x^{2} - 1\). Find \(f(g(x))\), \(g(f(x))\) and \(f(g(2))\).`,
      steps: [
        R`\(f(g(x))\): put \(g(x)\) into \(f\): \(2(x^{2} - 1) + 3 = 2x^{2} + 1\).`,
        R`\(g(f(x))\): put \(f(x)\) into \(g\): \((2x + 3)^{2} - 1 = 4x^{2} + 12x + 8\).`,
        R`The two results are different, so the order matters.`,
        R`\(f(g(2))\): \(g(2) = 3\), then \(f(3) = 9\). (The formula agrees: \(2(2)^{2} + 1 = 9\).)`,
      ],
      answer: R`\(f(g(x)) = 2x^{2} + 1\), \(g(f(x)) = 4x^{2} + 12x + 8\), \(f(g(2)) = 9\)`,
    },
    {
      title: 'Finding and checking an inverse',
      problem: R`Find the inverse of \(f(x) = \dfrac{x + 1}{x - 2}\) and check it.`,
      steps: [
        R`Write \(y = \dfrac{x + 1}{x - 2}\) and swap the variables: \(x = \dfrac{y + 1}{y - 2}\).`,
        R`Multiply by \(y - 2\): \(xy - 2x = y + 1\).`,
        R`Collect the \(y\) terms: \(xy - y = 2x + 1\), so \(y(x - 1) = 2x + 1\) and \(y = \dfrac{2x + 1}{x - 1}\).`,
        R`Check with one value: \(f(3) = 4\) and \(f^{-1}(4) = \dfrac{9}{3} = 3\). ✓`,
      ],
      answer: R`\(f^{-1}(x) = \dfrac{2x + 1}{x - 1}\)`,
    },
    {
      title: 'Word problem: converting temperatures back',
      word: true,
      problem: R`The function \(F(c) = \dfrac{9}{5}c + 32\) converts a temperature from degrees Celsius to degrees Fahrenheit. Find the inverse function and use it to convert 77°F to Celsius.`,
      steps: [
        R`The inverse turns a Fahrenheit temperature back into Celsius. Write \(x = \dfrac{9}{5}y + 32\) and solve for \(y\).`,
        R`Subtract 32: \(x - 32 = \dfrac{9}{5}y\). Multiply by \(\dfrac{5}{9}\): \(y = \dfrac{5}{9}(x - 32)\).`,
        R`So \(F^{-1}(x) = \dfrac{5}{9}(x - 32)\).`,
        R`\(F^{-1}(77) = \dfrac{5}{9}(45) = 25\). Check: \(F(25) = 45 + 32 = 77\). ✓`,
      ],
      answer: R`\(F^{-1}(x) = \dfrac{5}{9}(x - 32)\); 77°F is 25°C.`,
    },
  ],

  models: [
    {
      id: 'transform-parent',
      title: 'Transform a parent function: g(x) = a·f(x − h) + k',
      intro: 'Pick a parent function and change a, h and k. The dashed graph is the parent; the solid graph is g.',
      inputs: [
        { name: 'parent', label: 'Parent function', type: 'select', value: 'sq', options: [{ value: 'sq', label: 'x²' }, { value: 'abs', label: '|x|' }, { value: 'sqrt', label: '√x' }, { value: 'cube', label: 'x³' }] },
        { name: 'a', label: 'a (stretch and reflection)', type: 'number', min: -3, max: 3, step: 0.5, value: 2 },
        { name: 'h', label: 'h (shift right)', type: 'int', min: -5, max: 5, value: 3 },
        { name: 'k', label: 'k (shift up)', type: 'int', min: -5, max: 5, value: -1 },
      ],
      compute: transformModel,
    },
    {
      id: 'coupon-order',
      title: 'Word problem: does the order of discounts matter?',
      word: true,
      intro: 'Change the price, the coupon and the percent off.',
      inputs: [
        { name: 'price', label: 'Marked price (dollars)', type: 'int', min: 10, max: 500, value: 80 },
        { name: 'c', label: 'Coupon (dollars off)', type: 'int', min: 1, max: 50, value: 10 },
        { name: 'p', label: 'Sale (percent off)', type: 'int', min: 5, max: 60, value: 20 },
      ],
      compute: couponModel,
    },
  ],

  quiz: {
    easy: [easyShift, easyCombine, easyInverseTable],
    medium: [mediumDescribeTransform, mediumCompose, mediumInverseLinear, mediumWordCompose],
    hard: [hardGraphTransform, hardInverse, hardCompositionDomain, hardWordInverse],
    challenge: [challengeFindInner, challengeOrder, challengeRestrict],
  },
};
