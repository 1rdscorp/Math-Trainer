import { R, q, frac, terms, poly, linear, num, txt, money, round, checkEqual, checkSame, checkAll } from '../../lib/index.js';
import { M, fit, fromBank, piTimes } from './_shared.js';

// Independent check for optimization answers: no point of a fine grid on [lo, hi] does better than x.
function isBest(f, lo, hi, x, sign = 1, n = 20000) {
  let b = -Infinity;
  for (let i = 0; i <= n; i++) b = Math.max(b, sign * f(lo + ((hi - lo) * i) / n));
  const v = sign * f(x);
  if (!(x >= lo - 1e-9 && x <= hi + 1e-9)) return `x = ${x} is outside the allowed interval`;
  return b - v <= 1e-9 * Math.max(1, Math.abs(v)) ? true : `x = ${x} gives ${sign * v}, but ${sign * b} is possible`;
}

// ───────────── Easy ─────────────

function easySetup(rng) {
  const P = 4 * rng.int(5, 50);
  const S = rng.int(8, 60);
  const V = rng.pick([4, 32, 108, 256, 500, 10, 20, 50]);
  const s = rng.pick([
    {
      prompt: R`A rectangle has perimeter ${P} cm. Let \(x\) be its width. Which function gives its area in terms of \(x\) alone?`,
      ok: `A(x) = x(${P / 2} - x)`,
      wrong: [{ value: `A(x) = x(${P} - x)`, why: R`The perimeter counts both pairs of sides: \(2x + 2y = ${P}\), so \(y = ${P / 2} - x\).` }, { value: `A(x) = x(${P} - 2x)`, why: R`From \(2x + 2y = ${P}\), divide by 2 to get \(y = ${P / 2} - x\).` }, `A(x) = 2x + 2(${P / 2} - x)`, `A(x) = x^{2}(${P / 2} - x)`],
      steps: [R`Constraint: \(2x + 2y = ${P}\), so the length is \(y = ${P / 2} - x\).`, R`Objective: area \(= xy = x(${P / 2} - x)\).`],
      f: (x) => x * ((P - 2 * x) / 2),
      g: (x) => x * (P / 2 - x),
    },
    {
      prompt: R`A rectangular pen is built against a long straight wall, so only three sides need fencing. There are ${P} m of fencing. Let \(x\) be the length of each of the two sides that meet the wall. Which function gives the area of the pen in terms of \(x\) alone?`,
      ok: `A(x) = x(${P} - 2x)`,
      wrong: [{ value: `A(x) = x(${P / 2} - x)`, why: R`Only three sides are fenced: \(2x + y = ${P}\), so \(y = ${P} - 2x\).` }, { value: `A(x) = x(${P} - x)`, why: R`Two sides have length \(x\): \(2x + y = ${P}\), so \(y = ${P} - 2x\).` }, `A(x) = 2x(${P} - 2x)`, `A(x) = 2x + (${P} - 2x)`],
      steps: [R`Constraint: the fence covers two sides of length \(x\) and one side of length \(y\): \(2x + y = ${P}\), so \(y = ${P} - 2x\).`, R`Objective: area \(= xy = x(${P} - 2x)\).`],
      f: (x) => x * (P - x - x),
      g: (x) => x * (P - 2 * x),
    },
    {
      prompt: R`Two numbers have a sum of ${S}. Let \(x\) be one of them. Which function gives their product in terms of \(x\) alone?`,
      ok: `P(x) = x(${S} - x)`,
      wrong: [{ value: `P(x) = x(x - ${S})`, why: R`The other number is what is left of the sum: \(${S} - x\).` }, { value: `P(x) = x + (${S} - x)`, why: 'That adds the two numbers. The question asks for their product.' }, `P(x) = ${S}x`, `P(x) = x(${S} + x)`],
      steps: [R`Constraint: \(x + y = ${S}\), so the other number is \(y = ${S} - x\).`, R`Objective: product \(= xy = x(${S} - x)\).`],
      f: (x) => x * (S - x),
      g: (x) => S * x - x * x,
    },
    {
      prompt: R`A box with a square base and no lid must have a volume of ${V} cm³. Let \(x\) be the side of the base. Which function gives the area of material used (base plus four sides) in terms of \(x\) alone?`,
      ok: `S(x) = x^{2} + \\dfrac{${4 * V}}{x}`,
      wrong: [{ value: `S(x) = x^{2} + \\dfrac{${V}}{x}`, why: R`There are four sides, each of area \(xh\), and \(h = \dfrac{${V}}{x^{2}}\).` }, { value: `S(x) = 2x^{2} + \\dfrac{${4 * V}}{x}`, why: 'The box has no lid, so the square is counted once.' }, `S(x) = x^{2} + ${4 * V}x`, `S(x) = x^{2} + \\dfrac{${4 * V}}{x^{2}}`],
      steps: [R`Constraint: volume \(x^{2}h = ${V}\), so the height is \(h = \dfrac{${V}}{x^{2}}\).`, R`Objective: material \(= x^{2} + 4xh = x^{2} + 4x \cdot \dfrac{${V}}{x^{2}} = x^{2} + \dfrac{${4 * V}}{x}\).`],
      f: (x) => x * x + 4 * x * (V / (x * x)),
      g: (x) => x * x + (4 * V) / x,
    },
  ]);
  return q({
    prompt: s.prompt,
    correct: M(s.ok),
    wrong: s.wrong.map((w) => (typeof w === 'string' ? M(w) : { value: M(w.value), why: w.why })),
    solution: [...s.steps, R`So the function to optimize is \(${s.ok}\).`],
    rule: 1,
    skill: 'setting up the objective function',
    check: () => checkSame(s.f, s.g),
  });
}

function easyTwoNumbers(rng) {
  const kind = rng.pick(['product', 'sum', 'squares']);
  const base = { rule: 0, skill: 'optimizing with one constraint' };
  if (kind === 'product') {
    const S = 2 * rng.int(3, 25);
    const h = S / 2;
    return q({
      ...base,
      prompt: `Two positive numbers have a sum of ${S}. What is the largest possible value of their product?`,
      correct: h * h,
      wrong: [{ value: h, why: `That is the value of each number. The question asks for their product.` }, { value: S - 1, why: `1 and ${S - 1} is one possible pair, but pairs closer together have a larger product.` }, S * S, 2 * S, h * h - 1],
      solution: [R`Let the numbers be \(x\) and \(${S} - x\). Maximize \(P(x) = x(${S} - x) = ${S}x - x^{2}\).`, R`\(P'(x) = ${S} - 2x = 0\) at \(x = ${h}\), and \(P''(x) = -2 < 0\), so this is a maximum.`, R`The numbers are \(${h}\) and \(${h}\), with product \(${h * h}\).`],
      check: () => isBest((x) => x * (S - x), 0, S, h),
    });
  }
  if (kind === 'sum') {
    const k = rng.int(2, 15);
    return q({
      ...base,
      prompt: `Two positive numbers have a product of ${k * k}. What is the smallest possible value of their sum?`,
      correct: 2 * k,
      wrong: [{ value: k, why: `That is the value of each number. The question asks for their sum.` }, { value: k * k + 1, why: `1 and ${k * k} is one possible pair, but pairs closer together have a smaller sum.` }, k * k, 4 * k, 2 * k + 1],
      solution: [R`Let the numbers be \(x\) and \(\dfrac{${k * k}}{x}\). Minimize \(S(x) = x + \dfrac{${k * k}}{x}\) for \(x > 0\).`, R`\(S'(x) = 1 - \dfrac{${k * k}}{x^{2}} = 0\) at \(x = ${k}\), and \(S''(x) = \dfrac{${2 * k * k}}{x^{3}} > 0\), so this is a minimum.`, R`The numbers are \(${k}\) and \(${k}\), with sum \(${2 * k}\).`],
      check: () => isBest((x) => x + (k * k) / x, 0.05, 20 * k, k, -1),
    });
  }
  const S = 2 * rng.int(2, 12);
  const h = S / 2;
  return q({
    ...base,
    prompt: `Two numbers have a sum of ${S}. What is the smallest possible value of the sum of their squares?`,
    correct: 2 * h * h,
    wrong: [{ value: S * S, why: `That uses the pair 0 and ${S}. Pairs closer together give a smaller sum of squares.` }, { value: h * h, why: `Both squares count: \\(${h}^{2} + ${h}^{2}\\).` }, h, 0, 2 * h * h + 2],
    solution: [R`Let the numbers be \(x\) and \(${S} - x\). Minimize \(Q(x) = x^{2} + (${S} - x)^{2}\).`, R`\(Q'(x) = 2x - 2(${S} - x) = 4x - ${2 * S} = 0\) at \(x = ${h}\), and \(Q''(x) = 4 > 0\), so this is a minimum.`, R`\(Q(${h}) = ${h * h} + ${h * h} = ${2 * h * h}\).`],
    check: () => isBest((x) => x * x + (S - x) ** 2, -S, 2 * S, h, -1),
  });
}

function easyVertex(rng) {
  const askValue = rng.bool(0.4);
  if (rng.bool(0.5)) {
    const a = rng.int(1, 4);
    const xv = rng.int(5, 40);
    const c = 10 * rng.int(2, 20);
    const P = (x) => -a * x * x + 2 * a * xv * x - c;
    const tex = poly([-a, 2 * a * xv, -c]);
    return q({
      prompt: R`A stall's daily profit from selling \(x\) baskets is \(P(x) = ${tex}\) dollars. ${askValue ? 'What is the largest possible daily profit?' : 'How many baskets should it sell each day to make the largest profit?'}`,
      correct: askValue ? P(xv) : xv,
      unit: askValue ? 'dollars' : 'baskets',
      wrong: askValue
        ? [{ value: xv, why: `That is the number of baskets. Substitute it into the profit formula.` }, { value: 2 * a * xv, why: R`That is the coefficient of \(x\). Find where \(P'(x) = 0\), then evaluate \(P\) there.` }, P(xv) + c, P(xv - 2), -c]
        : [{ value: 2 * xv, why: R`\(P'(x) = ${linear(-2 * a, 2 * a * xv)}\). Solving \(P'(x) = 0\) divides by \(${2 * a}\), not by \(${a}\).` }, { value: 2 * a * xv, why: R`That is the coefficient of \(x\). Set \(P'(x) = 0\) and solve for \(x\).` }, xv + 5, Math.max(1, xv - a), a * xv === xv ? 3 * xv : a * xv],
      solution: [R`\(P'(x) = ${linear(-2 * a, 2 * a * xv)}\), which is 0 at \(x = ${xv}\).`, R`\(P''(x) = ${-2 * a} < 0\), so the graph is concave down and \(x = ${xv}\) gives the maximum.`, askValue ? R`\(P(${xv}) = ${P(xv)}\) dollars.` : R`The stall should sell \(${xv}\) baskets.`],
      rule: 0,
      skill: 'maximizing a quadratic model',
      check: () => isBest(P, 0, 3 * xv, xv),
    });
  }
  const tv = rng.int(1, 6);
  const h0 = rng.int(0, 30);
  const h = (t) => -5 * t * t + 10 * tv * t + h0;
  return q({
    prompt: R`A ball is thrown upward. Its height after \(t\) seconds is \(h(t) = ${poly([-5, 10 * tv, h0], 't')}\) meters. ${askValue ? 'What is the greatest height it reaches?' : 'After how many seconds does it reach its greatest height?'}`,
    correct: askValue ? h(tv) : tv,
    unit: askValue ? 'm' : 's',
    wrong: askValue
      ? [{ value: tv, why: `That is the time at which the ball is highest. Substitute it into the height formula.` }, { value: 10 * tv, why: R`That is the launch speed, the coefficient of \(t\).` }, h(tv) - h0 === h(tv) ? h(tv) + 5 : h(tv) - h0, h(tv) + 5 * tv, h0]
      : [{ value: 2 * tv, why: R`\(h'(t) = ${linear(-10, 10 * tv, 't')}\). Solving \(h'(t) = 0\) gives \(t = ${tv}\). At \(t = ${2 * tv}\) the ball is back at its starting height.` }, { value: 10 * tv, why: R`That is the coefficient of \(t\). Set \(h'(t) = 0\) and solve.` }, tv + 1, tv + 2, 5 * tv],
    solution: [R`\(h'(t) = ${linear(-10, 10 * tv, 't')}\), which is 0 at \(t = ${tv}\).`, R`\(h''(t) = -10 < 0\), so this is a maximum: the ball stops rising at \(t = ${tv}\) s.`, askValue ? R`\(h(${tv}) = ${h(tv)}\) m.` : R`The greatest height is reached after \(${tv}\) seconds.`],
    rule: 0,
    skill: 'maximizing a quadratic model',
    check: () => isBest(h, 0, 3 * tv, tv),
  });
}

// ───────────── Medium ─────────────

function mediumFence(rng) {
  const kind = rng.pick(['river', 'river', 'pens', 'minFence']);
  const base = { rule: 3, skill: 'fencing problems' };
  if (kind === 'minFence') {
    const k = rng.pick([5, 10, 15, 20, 25, 30]);
    const A = 2 * k * k;
    const F = (x) => 2 * x + A / x;
    return q({
      ...base,
      prompt: `A rectangular garden of area ${txt(A)} m² is to be laid out along a straight river. No fence is needed along the river. What is the shortest length of fencing that can enclose it?`,
      correct: 4 * k,
      unit: 'm',
      wrong: [{ value: 2 * k, why: `That is the length of the side parallel to the river. Add the two other sides.` }, { value: round(3 * Math.sqrt(A), 1), why: 'That uses a square garden. With one side free, the best shape is twice as long as it is wide.' }, 6 * k, 3 * k, 4 * k + 10],
      solution: [R`Let \(x\) be each side that meets the river and \(y\) the side parallel to it. Constraint: \(xy = ${A}\), so \(y = \dfrac{${A}}{x}\).`, R`Minimize \(F(x) = 2x + \dfrac{${A}}{x}\) for \(x > 0\). \(F'(x) = 2 - \dfrac{${A}}{x^{2}} = 0\) gives \(x^{2} = ${k * k}\), so \(x = ${k}\).`, R`\(F''(x) = \dfrac{${2 * A}}{x^{3}} > 0\) for \(x > 0\), so this is the absolute minimum.`, R`Then \(y = ${2 * k}\) and \(F = 2(${k}) + ${2 * k} = ${4 * k}\) m.`],
      check: () => isBest(F, 0.5, 20 * k, k, -1),
    });
  }
  const pens = kind === 'pens' ? rng.int(2, 3) : 1;
  const n = pens + 1;
  const P = 4 * n * rng.int(2, 20);
  const x = P / (2 * n);
  const y = P / 2;
  const area = x * y;
  const A = (t) => t * (P - n * t);
  const ask = rng.pick(['area', 'area', 'y']);
  const setup = pens === 1 ? `A farmer has ${P} m of fencing to make a rectangular field along a straight river. No fence is needed along the river.` : `A farmer has ${P} m of fencing to make ${pens} identical rectangular pens side by side along a straight river. No fence is needed along the river, but fences are needed between the pens.`;
  return q({
    ...base,
    prompt: `${setup} ${ask === 'area' ? 'What is the largest total area that can be enclosed?' : 'For the largest total area, how long should the side parallel to the river be?'}`,
    correct: ask === 'area' ? area : y,
    unit: ask === 'area' ? 'm²' : 'm',
    wrong:
      ask === 'area'
        ? [{ value: (P / (n + 1)) ** 2 === area ? area + P : round((P / (n + 1)) ** 2, 1), why: `That makes every piece of fence the same length. The best plan uses half of the fencing for the side parallel to the river.` }, { value: y, why: 'That is the length of one side. Multiply by the other side to get the area.' }, 2 * area, area / 2, x * x]
        : [{ value: x, why: `That is the length of each fence that meets the river. The side parallel to the river is \\(${P} - ${n}(${x})\\).` }, { value: round(P / (n + 1), 1), why: 'Making all the pieces equal does not give the largest area here.' }, P, y / 2 === x ? y + x : y / 2, y + 10],
    solution: [
      R`Let \(x\) be the length of each fence that meets the river (there are ${n} of them) and \(y\) the side parallel to the river. Constraint: \(${n}x + y = ${P}\), so \(y = ${P} - ${n}x\).`,
      R`Maximize \(A(x) = x(${P} - ${n}x) = ${P}x - ${n}x^{2}\) for \(0 \le x \le ${P / n}\).`,
      R`\(A'(x) = ${P} - ${2 * n}x = 0\) at \(x = ${x}\). \(A''(x) = ${-2 * n} < 0\), so this is the maximum.`,
      ask === 'area' ? R`Then \(y = ${y}\) and the area is \(${x} \times ${y} = ${num(area)}\) m².` : R`Then \(y = ${P} - ${n}(${x}) = ${y}\) m.`,
    ],
    check: () => checkAll(isBest(A, 0, P / n, x), checkEqual(A(x), area, 1e-9, 'area')),
  });
}

function mediumOpenBox(rng) {
  const square = rng.bool(0.6);
  const k = square ? rng.int(1, 6) : rng.int(1, 4);
  const [L, W] = square ? [6 * k, 6 * k] : [8 * k, 5 * k];
  const V = (x) => x * (L - 2 * x) * (W - 2 * x);
  const vol = V(k);
  const askCut = rng.bool(0.5);
  const sheet = square ? `a square sheet of cardboard ${L} cm on each side` : `a rectangular sheet of cardboard ${L} cm by ${W} cm`;
  const dTex = square ? R`V'(x) = (${L} - 2x)^{2} - 4x(${L} - 2x) = (${L} - 2x)(${L} - 6x)` : R`V(x) = 4x^{3} - ${2 * (L + W)}x^{2} + ${L * W}x`;
  return q({
    prompt: `An open box is made from ${sheet} by cutting equal squares from the four corners and folding up the sides. ${askCut ? 'What side length of the cut-out squares gives the box with the largest volume?' : 'What is the largest possible volume of the box?'}`,
    correct: askCut ? k : vol,
    unit: askCut ? 'cm' : 'cm³',
    wrong: askCut
      ? [{ value: W / 2, why: `Cutting ${W / 2} cm from each corner leaves no base at all: the volume would be 0.` }, { value: W / 4, why: R`Set \(V'(x) = 0\) and solve. The cut is not simply a quarter of the side.` }, k + 1, 2 * k, k / 2]
      : [{ value: V(k / 2) === vol ? vol / 2 : round(V(k / 2), 2), why: 'That comes from a smaller cut than the best one. Find the critical point of the volume function.' }, { value: L * W * k, why: R`The base shrinks when the corners are removed: its sides are \(${L} - 2x\) and \(${W} - 2x\).` }, round(V(1.5 * k), 2), vol + 2 * k, k],
    solution: [
      R`Let \(x\) be the side of each cut-out square. The box has height \(x\) and base \(${L} - 2x\) by \(${W} - 2x\), so \(V(x) = x(${L} - 2x)(${W} - 2x)\) for \(0 < x < ${num(W / 2)}\).`,
      square ? R`\(${dTex}\), which is 0 at \(x = ${L / 2}\) (no box) and at \(x = ${k}\).` : R`Expand: \(${dTex}\), so \(V'(x) = 12x^{2} - ${4 * (L + W)}x + ${L * W} = 4(x - ${k})(3x - ${10 * k})\).`,
      square ? R`\(V\) is 0 at both ends of the interval and positive in between, so the critical point \(x = ${k}\) gives the maximum.` : R`Only \(x = ${k}\) lies in the interval. \(V\) is 0 at both ends and positive in between, so \(x = ${k}\) gives the maximum.`,
      askCut ? R`Cut squares of side \(${k}\) cm.` : R`\(V(${k}) = ${k}(${L - 2 * k})(${W - 2 * k}) = ${num(vol)}\) cm³.`,
    ],
    rule: 3,
    skill: 'box problems',
    check: () => isBest(V, 0, W / 2, k),
  });
}

function mediumRevenue(rng) {
  const d = rng.int(1, 6);
  const k = rng.pick([5, 10, 20]);
  const p0 = 2 * d + rng.int(2, 10);
  const n0 = k * (p0 - 2 * d);
  const Rv = (t) => (p0 - t) * (n0 + k * t);
  const price = p0 - d;
  const best = Rv(d);
  const askPrice = rng.bool(0.5);
  const [shop, item] = rng.pick([['A cinema', 'tickets'], ['A bakery', 'loaves'], ['A market stall', 'T-shirts'], ['A campsite', 'pitches']]);
  return q({
    prompt: `${shop} sells ${n0} ${item} a day at ${money(p0)} each. For every ${money(1)} the price is lowered, ${k} more ${item} are sold each day. ${askPrice ? 'What price gives the largest daily revenue?' : 'What is the largest possible daily revenue?'}`,
    correct: askPrice ? price : best,
    fmt: (v) => money(v),
    wrong: askPrice
      ? [{ value: d, why: `That is the size of the price cut. The new price is ${money(p0)} minus the cut.` }, { value: p0, why: 'At the current price, a small cut still raises revenue, because the extra sales outweigh the lower price.' }, price - 1, price + 2, p0 / 2 === price ? price + 3 : p0 / 2]
      : [{ value: p0 * n0, why: 'That is the revenue at the current price. Lowering the price sells enough extra to earn more.' }, { value: price * n0, why: `At the lower price more are sold: ${n0} + ${k}(${d}) = ${n0 + k * d}.` }, best + k, p0 * (n0 + k * d), best - k],
    solution: [
      R`Let \(x\) be the number of dollars the price is lowered. Price: \(${p0} - x\). Number sold: \(${n0} + ${k}x\).`,
      R`Revenue: \(R(x) = (${p0} - x)(${n0} + ${k}x) = ${poly([-k, k * p0 - n0, p0 * n0])}\).`,
      R`\(R'(x) = ${linear(-2 * k, k * p0 - n0)} = 0\) at \(x = ${d}\), and \(R''(x) = ${-2 * k} < 0\), so this is the maximum.`,
      askPrice ? `The best price is ${money(p0)} − ${money(d)} = ${money(price)}.` : R`\(R(${d}) = (${price})(${n0 + k * d}) = ${num(best)}\) dollars.`,
    ],
    rule: 3,
    skill: 'revenue and profit',
    check: () => isBest(Rv, 0, p0, d),
  });
}

const JUSTIFY_BANK = [
  (rng) => {
    const P = 8 * rng.int(5, 50);
    const c = P / 4;
    return {
      prompt: R`To enclose the largest area, the function \(A(x) = x(${P} - 2x)\) is maximized, and its only critical point is \(x = ${c}\). Which statement justifies that \(x = ${c}\) gives the absolute maximum?`,
      correct: R`\(A''(x) = -4 < 0\) for all \(x\), so the graph is concave down everywhere and its only critical point is the highest point`,
      wrong: [{ value: R`\(A'(${c}) = 0\), and a critical point always gives a maximum`, why: 'A critical point can be a maximum, a minimum or neither. More evidence is needed.' }, { value: R`\(A''(x) = -4 < 0\) for all \(x\), so the critical point is the lowest point of the graph`, why: 'A negative second derivative means concave down, which makes the critical point the highest point.' }, R`\(A(${c}) = ${num(c * (P - 2 * c))}\) is a positive number`],
      solution: [R`\(A'(x) = ${P} - 4x\) is 0 only at \(x = ${c}\).`, R`\(A''(x) = -4\) is negative everywhere: the graph is a parabola opening downward, so its single critical point is the absolute maximum.`],
    };
  },
  (rng) => {
    const P = 8 * rng.int(5, 50);
    const c = P / 4;
    return {
      prompt: R`The area \(A(x) = x(${P} - 2x)\) is to be maximized for \(0 \le x \le ${P / 2}\). Its only critical point is \(x = ${c}\). Which statement justifies that \(x = ${c}\) gives the absolute maximum?`,
      correct: R`\(A\) is continuous on \([0, ${P / 2}]\), with \(A(0) = 0\), \(A(${P / 2}) = 0\) and \(A(${c}) = ${num(c * (P - 2 * c))}\), so the largest candidate value is at \(x = ${c}\)`,
      wrong: [{ value: R`\(A(0) = 0\) and \(A(${P / 2}) = 0\), so the maximum must be halfway between the endpoints`, why: 'The candidates test compares values of the function at the critical points and endpoints. Symmetry is not part of it.' }, { value: R`\(A'(${c}) = 0\), and a critical point always gives a maximum`, why: 'A critical point can be a maximum, a minimum or neither. More evidence is needed.' }, R`\(A(${c})\) is positive, and a positive value is always a maximum`],
      solution: ['Candidates test: a continuous function on a closed interval has its absolute maximum at a critical point or an endpoint.', R`The candidate values are \(A(0) = 0\), \(A(${c}) = ${num(c * (P - 2 * c))}\) and \(A(${P / 2}) = 0\). The largest is at \(x = ${c}\).`],
    };
  },
  (rng) => {
    const k = rng.int(1, 5);
    const V = 4 * k ** 3;
    return {
      prompt: R`To use the least material, the function \(S(x) = x^{2} + \dfrac{${4 * V}}{x}\) is minimized for \(x > 0\), and its only critical point is \(x = ${2 * k}\). Which statement justifies that \(x = ${2 * k}\) gives the absolute minimum?`,
      correct: R`\(S''(x) = 2 + \dfrac{${8 * V}}{x^{3}} > 0\) for all \(x > 0\), so the graph is concave up and its only critical point is the lowest point`,
      wrong: [{ value: R`\(S'(${2 * k}) = 0\), and a critical point always gives a minimum`, why: 'A critical point can be a maximum, a minimum or neither. More evidence is needed.' }, { value: R`\(S''(x) > 0\) for all \(x > 0\), so the critical point is the highest point of the graph`, why: 'A positive second derivative means concave up, which makes the critical point the lowest point.' }, R`\(S(${2 * k}) = ${12 * k * k}\) is smaller than \(S(${2 * k + 1})\)`],
      solution: [R`\(S'(x) = 2x - \dfrac{${4 * V}}{x^{2}}\) is 0 only at \(x = ${2 * k}\).`, R`\(S''(x) = 2 + \dfrac{${8 * V}}{x^{3}}\) is positive for every \(x > 0\): the graph is concave up on the whole domain, so the single critical point is the absolute minimum.`],
    };
  },
  (rng) => {
    const k = rng.int(1, 5);
    const V = 4 * k ** 3;
    const c = 2 * k;
    return {
      prompt: R`The function \(S(x) = x^{2} + \dfrac{${4 * V}}{x}\), for \(x > 0\), has derivative \(S'(x) = \dfrac{2(x^{3} - ${2 * V})}{x^{2}}\), which is 0 only at \(x = ${c}\). Which statement justifies that \(x = ${c}\) gives the absolute minimum?`,
      correct: R`\(S'(x) < 0\) for \(0 < x < ${c}\) and \(S'(x) > 0\) for \(x > ${c}\), so \(S\) decreases until \(x = ${c}\) and increases after it`,
      wrong: [{ value: R`\(S'(x) > 0\) for \(0 < x < ${c}\) and \(S'(x) < 0\) for \(x > ${c}\), so \(S\) increases until \(x = ${c}\) and decreases after it`, why: R`For \(0 < x < ${c}\), \(x^{3} < ${2 * V}\), so \(S'(x)\) is negative there. (And this pattern would describe a maximum.)` }, { value: R`\(S'(${c}) = 0\), and a critical point always gives a minimum`, why: 'A critical point can be a maximum, a minimum or neither. More evidence is needed.' }, R`\(S(x)\) is positive for all \(x > 0\)`],
      solution: [R`The sign of \(S'(x)\) is the sign of \(x^{3} - ${2 * V}\): negative for \(x < ${c}\), positive for \(x > ${c}\).`, R`So \(S\) is decreasing on \((0, ${c})\) and increasing on \((${c}, \infty)\): the value at \(x = ${c}\) is the smallest of all.`],
    };
  },
];

function mediumJustify(rng) {
  return fromBank(rng, JUSTIFY_BANK, { rule: 2, skill: 'justifying an extreme value' });
}

// ───────────── Hard ─────────────

function hardCan(rng) {
  const k = rng.int(2, 6);
  const closed = rng.bool(0.6);
  const V = (closed ? 2 : 1) * k ** 3;
  const S = (r) => (closed ? 2 : 1) * Math.PI * r * r + (2 * V * Math.PI) / r;
  const h = closed ? 2 * k : k;
  const area = closed ? 6 * k * k : 3 * k * k;
  const ask = rng.pick(['r', 'h', 'S']);
  const what = closed ? 'A closed cylindrical can (with a top and a bottom)' : 'A cylindrical cup with no lid';
  const question = { r: 'What radius uses the least material?', h: 'What height uses the least material?', S: 'What is the least possible area of material?' }[ask];
  const ends = closed ? '2\\pi r^{2}' : '\\pi r^{2}';
  const wrong = {
    r: [{ value: h === k ? 2 * k : h, why: closed ? 'That is the best height. For a closed can the height equals the diameter, so the radius is half of it.' : 'For a cup with no lid the best radius equals the best height.' }, k + 1, 3 * k, k - 1],
    h: [{ value: closed ? k : 2 * k, why: closed ? 'That is the best radius. For a closed can the best height equals the diameter.' : 'For a cup with no lid the best height equals the radius, not the diameter.' }, h + 1, 3 * k, 4 * k],
    S: [{ value: closed ? 4 * k * k : 2 * k * k, why: 'That counts only the curved side. Add the circular end as well.' }, { value: closed ? 2 * k * k : k * k, why: 'That counts only the circular end. Add the curved side as well.' }, area + k * k, 2 * area],
  }[ask];
  return q({
    prompt: `${what} must hold ${V}π cm³. ${question}`,
    correct: ask === 'r' ? k : ask === 'h' ? h : area,
    fmt: (v) => (ask === 'S' ? R`\(${piTimes(v)}\) cm²` : R`\(${num(v)}\) cm`),
    wrong,
    solution: [
      R`Constraint: \(\pi r^{2}h = ${V}\pi\), so \(h = \dfrac{${V}}{r^{2}}\).`,
      R`Material: \(S = ${ends} + 2\pi rh = ${ends} + \dfrac{${2 * V}\pi}{r}\), for \(r > 0\).`,
      R`\(S'(r) = ${closed ? '4' : '2'}\pi r - \dfrac{${2 * V}\pi}{r^{2}} = 0\) gives \(r^{3} = ${k ** 3}\), so \(r = ${k}\). \(S''(r) > 0\) for all \(r > 0\), so this is the absolute minimum.`,
      ask === 'r' ? R`The best radius is \(${k}\) cm.` : ask === 'h' ? R`\(h = \dfrac{${V}}{${k}^{2}} = ${h}\) cm${closed ? ', equal to the diameter' : ', equal to the radius'}.` : R`With \(r = ${k}\) and \(h = ${h}\): \(S = ${closed ? 2 * k * k : k * k}\pi + ${2 * k * h}\pi = ${area}\pi\) cm².`,
    ],
    rule: 3,
    skill: 'least surface area',
    check: () => checkAll(isBest(S, 0.2, 6 * k, k, -1), checkEqual(S(k), area * Math.PI, 1e-9, 'area'), checkEqual(Math.PI * k * k * h, V * Math.PI, 1e-9, 'volume')),
  });
}

function hardClosest(rng) {
  if (rng.bool(0.5)) {
    const a = rng.int(1, 9);
    const D2 = (x) => (x - a) ** 2 + x;
    const ans = frac(2 * a - 1, 2);
    return q({
      prompt: R`Which point on the curve \(y = \sqrt{x}\) is closest to the point \((${a}, 0)\)? Give its \(x\)-coordinate.`,
      correct: ans,
      fmt: (v) => R`\(x = ${num(v)}\)`,
      wrong: [{ value: a, why: R`The point directly above \((${a}, 0)\) is not the closest. Minimize the squared distance \((x - ${a})^{2} + x\).` }, { value: frac(2 * a + 1, 2), why: R`\(2(x - ${a}) + 1 = 0\) gives \(x = ${a} - \frac{1}{2}\).` }, a - 1, frac(a, 2).eq(ans) ? a + 1 : frac(a, 2)],
      solution: [
        R`A point on the curve is \((x, \sqrt{x})\). Its distance from \((${a}, 0)\) is smallest when the squared distance \(D(x) = (x - ${a})^{2} + (\sqrt{x})^{2} = (x - ${a})^{2} + x\) is smallest.`,
        R`\(D'(x) = 2(x - ${a}) + 1 = 0\) gives \(x = ${ans.tex()}\).`,
        R`\(D''(x) = 2 > 0\), so this is the absolute minimum.`,
      ],
      rule: 3,
      skill: 'closest point on a curve',
      check: () => isBest(D2, 0, 3 * a + 2, ans.value, -1),
    });
  }
  const [m, unit] = rng.pick([[1, 2], [2, 5], [3, 10], [-2, 5], [-1, 2], [-3, 10]]);
  const b = unit * rng.int(1, 3) * rng.sign();
  const x0 = (-m * b) / (1 + m * m);
  const y0 = b / (1 + m * m);
  const D2 = (x) => x * x + (m * x + b) ** 2;
  const pt = (x, y) => R`\((${num(x)}, ${num(y)})\)`;
  return q({
    prompt: R`Which point on the line \(y = ${linear(m, b)}\) is closest to the origin?`,
    correct: pt(x0, y0),
    wrong: [{ value: pt(0, b), why: R`That is the \(y\)-intercept. Minimize the squared distance \(x^{2} + (${linear(m, b)})^{2}\) to find the closest point.` }, { value: pt(-x0, y0), why: R`Check the sign when solving \(D'(x) = 0\).` }, pt(y0, x0), pt(x0, -y0), pt(-x0, -y0)],
    solution: [
      R`A point on the line is \((x, ${linear(m, b)})\). Minimize the squared distance from the origin: \(D(x) = x^{2} + (${linear(m, b)})^{2}\).`,
      R`\(D'(x) = 2x + ${2 * m < 0 ? `(${2 * m})` : 2 * m}(${linear(m, b)}) = ${linear(2 + 2 * m * m, 2 * m * b)} = 0\) gives \(x = ${num(x0)}\).`,
      R`\(D''(x) = ${2 + 2 * m * m} > 0\), so this is the absolute minimum. Then \(y = ${num(y0)}\).`,
    ],
    rule: 3,
    skill: 'closest point on a curve',
    check: () => checkAll(isBest(D2, -3 * Math.abs(b) - 5, 3 * Math.abs(b) + 5, x0, -1), checkEqual(m * x0 + b, y0, 1e-9, 'point is on the line')),
  });
}

function hardBox(rng) {
  const k = rng.int(1, 5);
  const V = 4 * k ** 3;
  const Mat = 12 * k * k;
  const fixedVolume = rng.bool(0.5);
  const ask = rng.pick(['x', 'h', 'value']);
  const S = (x) => x * x + (4 * V) / x;
  const Vol = (x) => (x * (Mat - x * x)) / 4;
  const value = fixedVolume ? Mat : V;
  const question = { x: 'What should the side of the base be?', h: 'What should the height be?', value: fixedVolume ? 'What is the least area of material needed?' : 'What is the largest possible volume?' }[ask];
  return q({
    prompt: fixedVolume ? `A box with a square base and no lid must have a volume of ${V} cm³, and it should use as little material as possible. ${question}` : `A box with a square base and no lid is to be made from ${Mat} cm² of material, and it should hold as much as possible. ${question}`,
    correct: ask === 'x' ? 2 * k : ask === 'h' ? k : value,
    unit: ask === 'value' ? (fixedVolume ? 'cm²' : 'cm³') : 'cm',
    wrong: {
      x: [{ value: k, why: 'That is the best height. The base side is twice the height.' }, 4 * k, 3 * k, 2 * k + 1],
      h: [{ value: 2 * k, why: 'That is the best base side. The height is half of it.' }, k + 1, 3 * k, 4 * k],
      value: fixedVolume ? [{ value: 4 * k * k, why: 'That is the area of the base alone. Add the four sides.' }, 8 * k * k, 16 * k * k, Mat + 4] : [{ value: 8 * k ** 3, why: R`The volume is \(x^{2}h\) with \(x = ${2 * k}\) and \(h = ${k}\).` }, 2 * k ** 3, 6 * k ** 3, V + 4],
    }[ask],
    solution: fixedVolume
      ? [
          R`Let \(x\) be the base side and \(h\) the height. Constraint: \(x^{2}h = ${V}\), so \(h = \dfrac{${V}}{x^{2}}\).`,
          R`Material: \(S(x) = x^{2} + 4xh = x^{2} + \dfrac{${4 * V}}{x}\), for \(x > 0\).`,
          R`\(S'(x) = 2x - \dfrac{${4 * V}}{x^{2}} = 0\) gives \(x^{3} = ${2 * V}\), so \(x = ${2 * k}\). \(S''(x) > 0\) for \(x > 0\), so this is the absolute minimum.`,
          R`Then \(h = \dfrac{${V}}{${4 * k * k}} = ${k}\) cm, and the material is \(${4 * k * k} + 4(${2 * k})(${k}) = ${Mat}\) cm².`,
        ]
      : [
          R`Let \(x\) be the base side and \(h\) the height. Constraint: \(x^{2} + 4xh = ${Mat}\), so \(h = \dfrac{${Mat} - x^{2}}{4x}\).`,
          R`Volume: \(V(x) = x^{2}h = \dfrac{x(${Mat} - x^{2})}{4} = ${terms([[3 * k * k, 'x'], [frac(-1, 4), 'x^{3}']])}\), for \(0 < x < \sqrt{${Mat}}\).`,
          R`\(V'(x) = ${3 * k * k} - \dfrac{3}{4}x^{2} = 0\) gives \(x^{2} = ${4 * k * k}\), so \(x = ${2 * k}\). \(V''(x) = -\dfrac{3}{2}x < 0\), so this is the maximum.`,
          R`Then \(h = \dfrac{${Mat} - ${4 * k * k}}{${8 * k}} = ${k}\) cm, and the volume is \((${2 * k})^{2}(${k}) = ${V}\) cm³.`,
        ],
    rule: 3,
    skill: 'box problems',
    check: () => (fixedVolume ? checkAll(isBest(S, 0.2, 12 * k, 2 * k, -1), checkEqual(S(2 * k), Mat, 1e-9, 'material')) : checkAll(isBest(Vol, 0, Math.sqrt(Mat), 2 * k), checkEqual(Vol(2 * k), V, 1e-9, 'volume'))),
  });
}

// ───────────── Challenge ─────────────

function challengeCost(rng) {
  const k = rng.int(1, 4);
  const b = rng.int(2, 6);
  const ratio = rng.pick([1, 2, 4]);
  const a = ratio * b;
  const V = ratio === 1 ? 4 * k ** 3 : ratio === 2 ? k ** 3 : 2 * k ** 3;
  const x = ratio === 1 ? 2 * k : k;
  const h = V / (x * x);
  const C = (t) => a * t * t + (4 * b * V) / t;
  const cost = C(x);
  const askCost = rng.bool(0.5);
  return q({
    prompt: `A storage box with a square base and no lid must have a volume of ${V} m³. Material for the base costs ${money(a)} per square meter and material for the sides costs ${money(b)} per square meter. ${askCost ? 'What is the lowest possible cost of the materials?' : 'What base side gives the lowest cost?'}`,
    correct: askCost ? cost : x,
    fmt: (v) => (askCost ? money(v) : R`\(${num(v)}\) m`),
    wrong: askCost
      ? [{ value: round(x * x + 4 * x * h, 2), why: 'That is the area of material in square meters. Multiply each part by its price.' }, { value: a * x * x, why: 'That is the cost of the base alone. Add the cost of the four sides.' }, cost + 4 * b, round(C(x + 1), 2), cost / 2]
      : [{ value: h === x ? 2 * x : h, why: R`That is the height. The base side comes from solving \(C'(x) = 0\).` }, { value: round(Math.cbrt(2 * V), 2) === x ? x + 2 : round(Math.cbrt(2 * V), 2), why: 'That would be the answer if both materials cost the same. The prices change the best shape.' }, x + 1, 3 * x],
    solution: [
      R`Let \(x\) be the base side and \(h\) the height. Constraint: \(x^{2}h = ${V}\), so \(h = \dfrac{${V}}{x^{2}}\).`,
      R`Cost: \(C(x) = ${a}x^{2} + ${b}(4xh) = ${a}x^{2} + \dfrac{${4 * b * V}}{x}\), for \(x > 0\).`,
      R`\(C'(x) = ${2 * a}x - \dfrac{${4 * b * V}}{x^{2}} = 0\) gives \(x^{3} = ${(2 * b * V) / a}\), so \(x = ${x}\). \(C''(x) > 0\) for \(x > 0\), so this is the absolute minimum.`,
      askCost ? R`\(C(${x}) = ${a}(${x * x}) + \dfrac{${4 * b * V}}{${x}} = ${a * x * x} + ${(4 * b * V) / x} = ${cost}\) dollars.` : R`The base should be \(${x}\) m on each side (and the height \(${num(h)}\) m).`,
    ],
    rule: 3,
    skill: 'minimizing cost',
    check: () => checkAll(isBest(C, 0.1, 12 * k + 4, x, -1), checkEqual(x * x * h, V, 1e-9, 'volume')),
  });
}

function challengeInscribed(rng) {
  const k = rng.int(1, 4);
  const c = 3 * k * k;
  const A = (x) => 2 * x * (c - x * x);
  const area = 4 * k ** 3;
  const ask = rng.pick(['area', 'area', 'width', 'height']);
  const gx = 0.55 * Math.sqrt(c);
  const question = { area: 'What is the largest possible area of such a rectangle?', width: 'How wide is the rectangle of largest area?', height: 'How tall is the rectangle of largest area?' }[ask];
  return q({
    prompt: R`A rectangle has its base on the \(x\)-axis and its two upper corners on the parabola \(y = ${c} - x^{2}\). ${question}`,
    visual: {
      type: 'plot',
      x: [-Math.sqrt(c) - 1, Math.sqrt(c) + 1],
      y: [-0.1 * c, 1.15 * c],
      fns: [{ f: (x) => c - x * x }],
      polygons: [{ points: [[-gx, 0], [gx, 0], [gx, c - gx * gx], [-gx, c - gx * gx]], color: 'b' }],
      points: [{ x: gx, y: c - gx * gx, label: '(x, y)' }],
      alt: `The parabola y = ${c} − x², opening downward with its top at (0, ${c}). One of the possible rectangles is drawn: its base lies on the x-axis and its two upper corners are on the parabola, at (x, y) and (−x, y).`,
    },
    correct: ask === 'area' ? area : ask === 'width' ? 2 * k : 2 * k * k,
    wrong: {
      area: [{ value: 2 * k ** 3, why: R`The rectangle reaches from \(-x\) to \(x\), so its width is \(2x\), not \(x\).` }, { value: 2 * k * c, why: R`The height is \(y = ${c} - x^{2}\) at the corner, not the full height \(${c}\) of the parabola.` }, 8 * k ** 3, 3 * k ** 3, area + 2],
      width: [{ value: k, why: R`\(x = ${k}\) is half the width: the rectangle reaches from \(-${k}\) to \(${k}\).` }, 2 * k * k === 2 * k ? 3 * k : 2 * k * k, 4 * k, 2 * k + 1],
      height: [{ value: c, why: R`That is the height of the parabola at \(x = 0\). The corner is at \(x = ${k}\), where \(y = ${c} - ${k * k}\).` }, k * k, 2 * k === 2 * k * k ? 3 * k : 2 * k, 2 * k * k + 1],
    }[ask],
    solution: [
      R`Let the upper right corner be \((x, y)\) with \(y = ${c} - x^{2}\). The rectangle has width \(2x\) and height \(y\).`,
      R`Area: \(A(x) = 2x(${c} - x^{2}) = ${2 * c}x - 2x^{3}\), for \(0 \le x \le \sqrt{${c}}\).`,
      R`\(A'(x) = ${2 * c} - 6x^{2} = 0\) gives \(x^{2} = ${k * k}\), so \(x = ${k}\). \(A\) is 0 at both ends of the interval and positive in between, so this is the maximum.`,
      R`Width \(2x = ${2 * k}\), height \(y = ${c} - ${k * k} = ${2 * k * k}\), area \(${2 * k} \times ${2 * k * k} = ${area}\).`,
    ],
    rule: 3,
    skill: 'inscribed shapes',
    check: () => checkAll(isBest(A, 0, Math.sqrt(c), k), checkEqual(A(k), area, 1e-9, 'area')),
  });
}

function challengeRestricted(rng) {
  const P = rng.pick([120, 160, 200, 240, 280, 320]);
  const Mx = 20 * rng.int(1, P / 40 - 1);
  const A = (y) => (y * (P - y)) / 2;
  const ans = A(Mx);
  return q({
    prompt: `A farmer has ${P} m of fencing to make a rectangular pen along a straight river. No fence is needed along the river. Because of a row of trees, the side parallel to the river can be at most ${Mx} m long. What is the largest area the pen can have?`,
    correct: ans,
    unit: 'm²',
    wrong: [
      { value: (P * P) / 8, why: `That area needs a side of ${P / 2} m along the river, which is longer than the ${Mx} m allowed. On a restricted interval the best value can be at an endpoint.` },
      { value: Mx * (P - Mx), why: `The remaining ${P - Mx} m of fencing is shared between two sides, so each is ${(P - Mx) / 2} m.` },
      Mx * Mx,
      (Mx * P) / 2,
      ans - Mx,
    ],
    solution: [
      R`Let \(y\) be the side parallel to the river. The other two sides are each \(\dfrac{${P} - y}{2}\), so \(A(y) = \dfrac{y(${P} - y)}{2}\), for \(0 \le y \le ${Mx}\).`,
      R`\(A'(y) = \dfrac{${P} - 2y}{2}\) is 0 at \(y = ${P / 2}\), which is outside the allowed interval.`,
      R`On \([0, ${Mx}]\), \(A'(y) > 0\), so \(A\) is increasing and its largest value is at the endpoint \(y = ${Mx}\).`,
      R`\(A(${Mx}) = \dfrac{${Mx}(${P - Mx})}{2} = ${num(ans)}\) m².`,
    ],
    rule: 2,
    skill: 'optimizing on a restricted interval',
    check: () => isBest(A, 0, Mx, Mx),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'optimization',
  title: 'Optimization',
  summary: 'Set up and solve applied maximum and minimum problems, and justify that the answer is the best possible.',
  standards: ['AP Calculus 5.10', 'AP Calculus 5.11'],

  explain: {
    intro: R`Optimization problems ask for the best value of something: the largest area, the least material, the lowest cost. The calculus is usually short. Most of the work is in translating the words into a function of one variable, and in showing that the critical point you find really is the maximum or minimum that was asked for.`,
    rules: [
      {
        title: 'The method',
        text: R`(1) Draw a picture and name the quantities. (2) Write a formula for the quantity to be maximized or minimized (the **objective**). (3) Use the given condition (the **constraint**) to rewrite the objective in terms of one variable. (4) State the interval of values that make sense. (5) Find the critical points. (6) Justify that you have the maximum or minimum. (7) Answer the question that was asked, with units.`,
        example: R`Largest product of two numbers with sum 20: maximize \(P(x) = x(20 - x)\) on \([0, 20]\). \(P'(x) = 20 - 2x = 0\) at \(x = 10\); the product is 100.`,
      },
      {
        title: 'Using the constraint',
        text: R`The objective usually starts with two variables. The constraint is an equation linking them; solve it for one variable and substitute. Do this **before** differentiating.`,
        example: R`A pen against a wall uses 80 m of fence on three sides: \(2x + y = 80\), so \(y = 80 - 2x\) and the area is \(A(x) = x(80 - 2x)\).`,
      },
      {
        title: 'Justifying the answer',
        text: R`A critical point is only a candidate. Justify it in one of three ways. **Closed interval:** compare the values at the critical points and the endpoints. **Second derivative:** if \(f''\) has one sign on the whole interval, the only critical point is the absolute maximum (\(f'' < 0\)) or minimum (\(f'' > 0\)). **First derivative:** show that \(f'\) changes sign in the right direction and has no other zeros. If the critical point lies outside the allowed interval, the best value is at an endpoint.`,
        example: R`\(A(x) = x(80 - 2x)\): \(A''(x) = -4 < 0\) everywhere, so the critical point \(x = 20\) gives the absolute maximum.`,
      },
      {
        title: 'Models that come up often',
        text: R`**Fencing:** area \(xy\) with a fixed length of fence. **Open box from a sheet:** \(V = x(L - 2x)(W - 2x)\). **Cans:** volume \(\pi r^{2}h\), surface \(2\pi r^{2} + 2\pi rh\). **Closest point:** minimize the squared distance, which has the same minimizer and no square root. **Revenue:** price times quantity sold; profit is revenue minus cost.`,
        example: R`A closed can of fixed volume uses the least metal when its height equals its diameter, \(h = 2r\).`,
      },
    ],
    vocab: [
      { term: 'objective function', def: 'The quantity to be made as large or as small as possible, written as a function of one variable.' },
      { term: 'constraint', def: 'An equation that the variables must satisfy, such as a fixed perimeter or a fixed volume.' },
      { term: 'feasible interval', def: 'The values of the variable that make sense in the problem (for example, lengths cannot be negative).' },
      { term: 'absolute maximum / minimum', def: 'The largest or smallest value of the objective over the whole feasible interval.' },
    ],
    mistakes: [
      R`Differentiating while the objective still contains two variables. Use the constraint first.`,
      R`Stopping at \(f'(x) = 0\) without justifying that the critical point is a maximum or minimum.`,
      R`Ignoring the feasible interval: a critical point outside it is not an answer, and an endpoint may be best.`,
      R`Answering a different question: giving \(x\) when the problem asks for the area, or the area when it asks for the dimensions.`,
      R`For a three-sided pen, using the full perimeter \(2x + 2y\) instead of \(2x + y\).`,
    ],
    visual: {
      type: 'plot',
      x: [0, 44],
      y: [0, 900],
      fns: [{ f: (x) => x * (80 - 2 * x) }],
      points: [{ x: 20, y: 800, label: 'maximum: (20, 800)' }],
      axisLabels: ['x (m)', 'A (m²)'],
      alt: 'Graph of the area A(x) = x(80 − 2x) for a pen against a wall: a parabola opening downward that is 0 at x = 0 and x = 40 and reaches its highest point, 800 square meters, at x = 20.',
    },
  },

  examples: [
    {
      title: 'Word problem: a field by a river',
      word: true,
      problem: 'A farmer has 800 m of fencing and wants to fence a rectangular field along a straight river. No fence is needed along the river. What dimensions give the largest area?',
      steps: [
        R`Let \(x\) be the length of each side that meets the river and \(y\) the side parallel to it. Objective: area \(A = xy\).`,
        R`Constraint: \(2x + y = 800\), so \(y = 800 - 2x\) and \(A(x) = x(800 - 2x) = 800x - 2x^{2}\), for \(0 \le x \le 400\).`,
        R`\(A'(x) = 800 - 4x = 0\) at \(x = 200\).`,
        R`Justify: \(A(0) = 0\), \(A(400) = 0\) and \(A(200) = 80{,}000\), so the maximum is at \(x = 200\). (Also \(A'' = -4 < 0\).)`,
      ],
      answer: '200 m by 400 m, with the 400 m side parallel to the river. The area is 80,000 m².',
    },
    {
      title: 'Word problem: an open box',
      word: true,
      problem: 'A square sheet of cardboard 12 cm on each side is made into an open box by cutting equal squares from the corners and folding up the sides. What size of cut gives the largest volume?',
      steps: [
        R`Let \(x\) be the side of each cut-out square. The box has height \(x\) and a square base of side \(12 - 2x\): \(V(x) = x(12 - 2x)^{2}\), for \(0 \le x \le 6\).`,
        R`\(V'(x) = (12 - 2x)^{2} - 4x(12 - 2x) = (12 - 2x)(12 - 6x)\).`,
        R`\(V'(x) = 0\) at \(x = 6\) and \(x = 2\).`,
        R`Justify: \(V(0) = 0\), \(V(6) = 0\) and \(V(2) = 2 \cdot 8^{2} = 128\).`,
      ],
      answer: 'Cut squares of side 2 cm. The box is 8 cm by 8 cm by 2 cm, with volume 128 cm³.',
      visual: {
        type: 'plot',
        x: [0, 6.5],
        y: [0, 150],
        fns: [{ f: (x) => x * (12 - 2 * x) ** 2, domain: [0, 6] }],
        points: [{ x: 2, y: 128, label: '(2, 128)' }],
        axisLabels: ['x (cm)', 'V (cm³)'],
        alt: 'Graph of the volume V(x) = x(12 − 2x)² for x from 0 to 6. It rises from 0 to a maximum of 128 at x = 2 and then falls back to 0 at x = 6.',
      },
    },
    {
      title: 'Word problem: the cheapest can',
      word: true,
      problem: R`A closed cylindrical can must hold \(250\pi\) cm³. What radius and height use the least metal?`,
      steps: [
        R`Objective: surface area \(S = 2\pi r^{2} + 2\pi rh\). Constraint: \(\pi r^{2}h = 250\pi\), so \(h = \dfrac{250}{r^{2}}\).`,
        R`\(S(r) = 2\pi r^{2} + \dfrac{500\pi}{r}\), for \(r > 0\).`,
        R`\(S'(r) = 4\pi r - \dfrac{500\pi}{r^{2}} = 0\) gives \(r^{3} = 125\), so \(r = 5\) and \(h = \dfrac{250}{25} = 10\).`,
        R`Justify: \(S''(r) = 4\pi + \dfrac{1000\pi}{r^{3}} > 0\) for all \(r > 0\), so the only critical point is the absolute minimum.`,
      ],
      answer: R`Radius 5 cm and height 10 cm (the height equals the diameter). The area is \(150\pi\) cm².`,
    },
    {
      title: 'Closest point on a curve',
      problem: R`Which point on the curve \(y = \sqrt{x}\) is closest to the point \((4, 0)\)?`,
      steps: [
        R`A point on the curve is \((x, \sqrt{x})\). Minimize the squared distance: \(D(x) = (x - 4)^{2} + (\sqrt{x})^{2} = (x - 4)^{2} + x\), for \(x \ge 0\).`,
        R`\(D'(x) = 2(x - 4) + 1 = 2x - 7 = 0\) at \(x = \dfrac{7}{2}\).`,
        R`Justify: \(D''(x) = 2 > 0\), so this is the absolute minimum.`,
      ],
      answer: R`The point \(\left(\dfrac{7}{2}, \sqrt{\dfrac{7}{2}}\right)\), at distance \(\sqrt{\dfrac{15}{4}} \approx 1.94\).`,
    },
  ],

  models: [
    {
      id: 'fence-river',
      title: 'Word problem: pens along a river',
      word: true,
      intro: 'Choose the amount of fencing and how many pens to build side by side along the river.',
      inputs: [
        { name: 'P', label: 'Fencing available (m)', type: 'int', min: 20, max: 2000, value: 800 },
        { name: 'pens', label: 'Number of pens', type: 'int', min: 1, max: 5, value: 1 },
      ],
      compute({ P, pens }) {
        const n = pens + 1;
        const x = P / (2 * n);
        const y = P / 2;
        const A = (t) => t * (P - n * t);
        const show = (v) => num(round(v, 2));
        return {
          problem: `A farmer has ${txt(P)} m of fencing to make ${pens === 1 ? 'a rectangular field' : `${pens} identical pens side by side`} along a straight river. No fence is needed along the river. What dimensions give the largest total area?`,
          steps: [
            R`Let \(x\) be the length of each fence that meets the river (there are ${n}) and \(y\) the side parallel to the river. Constraint: \(${n}x + y = ${P}\), so \(y = ${P} - ${n}x\).`,
            R`Objective: \(A(x) = x(${P} - ${n}x) = ${P}x - ${n}x^{2}\), for \(0 \le x \le ${show(P / n)}\).`,
            R`\(A'(x) = ${P} - ${2 * n}x = 0\) at \(x = ${show(x)}\).`,
            R`Justify: \(A''(x) = ${-2 * n} < 0\), so the parabola opens downward and this is the maximum. Then \(y = ${show(y)}\).`,
          ],
          answer: R`Each fence that meets the river is \(${show(x)}\) m long and the side parallel to the river is \(${show(y)}\) m. The total area is \(${show(A(x))}\) m².`,
          note: 'Whatever the number of pens, half of the fencing goes on the side parallel to the river.',
          visual: {
            type: 'plot',
            x: [(-0.17 * P) / n, P / n],
            y: [0, A(x) * 1.15],
            fns: [{ f: A, domain: [0, P / n] }],
            points: [{ x, y: A(x), label: `max at x = ${txt(round(x, 2))}` }],
            axisLabels: ['x (m)', 'A (m²)'],
            alt: `Graph of the total area A(x) as a function of x: a parabola opening downward, with its highest point at x = ${txt(round(x, 2))}.`,
          },
        };
      },
    },
    {
      id: 'open-box',
      title: 'Word problem: the open box',
      word: true,
      intro: 'Choose the size of the cardboard sheet. Equal squares are cut from the corners and the sides are folded up.',
      inputs: [
        { name: 'L', label: 'Length of the sheet (cm)', type: 'int', min: 4, max: 60, value: 12 },
        { name: 'W', label: 'Width of the sheet (cm)', type: 'int', min: 4, max: 60, value: 12 },
      ],
      compute({ L, W }) {
        const V = (x) => x * (L - 2 * x) * (W - 2 * x);
        const disc = L * L - L * W + W * W;
        const x = (L + W - Math.sqrt(disc)) / 6;
        const other = (L + W + Math.sqrt(disc)) / 6;
        const half = Math.min(L, W) / 2;
        const show = (v) => num(round(v, 3));
        const exact = Number.isInteger(Math.sqrt(disc)) ? '=' : '\\approx';
        return {
          problem: `An open box is made from a sheet of cardboard ${L} cm by ${W} cm, by cutting equal squares from the corners and folding up the sides. What size of cut gives the largest volume?`,
          steps: [
            R`Let \(x\) be the side of each cut-out square: \(V(x) = x(${L} - 2x)(${W} - 2x) = 4x^{3} - ${2 * (L + W)}x^{2} + ${L * W}x\), for \(0 \le x \le ${show(half)}\).`,
            R`\(V'(x) = 12x^{2} - ${4 * (L + W)}x + ${L * W}\).`,
            R`\(V'(x) = 0\) when \(x = \dfrac{${L + W} \pm \sqrt{${disc}}}{6}\): \(x ${exact} ${show(x)}\) or \(x ${exact} ${show(other)}\).`,
            R`Only \(x ${exact} ${show(x)}\) lies inside the interval. \(V\) is 0 at both ends and positive in between, so this critical point gives the maximum.`,
          ],
          answer: R`Cut squares of side about \(${show(x)}\) cm. The largest volume is about \(${num(round(V(x), 2))}\) cm³.`,
          visual: {
            type: 'plot',
            x: [-0.17 * half, half * 1.08],
            y: [0, V(x) * 1.2],
            fns: [{ f: V, domain: [0, half] }],
            points: [{ x, y: V(x), label: `max at x ≈ ${txt(round(x, 2))}` }],
            axisLabels: ['x (cm)', 'V (cm³)'],
            alt: `Graph of the volume V(x) for cuts from 0 to ${txt(half)} cm. It rises to a maximum at about x = ${txt(round(x, 2))} and falls back to 0.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easySetup, easyTwoNumbers, easyVertex],
    medium: [mediumFence, mediumOpenBox, mediumRevenue, mediumJustify],
    hard: [hardCan, hardClosest, hardBox],
    challenge: [challengeCost, challengeInscribed, challengeRestricted],
  },
};
