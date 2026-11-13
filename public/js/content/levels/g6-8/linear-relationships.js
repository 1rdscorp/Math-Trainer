import { R, q, num, txt, frac, tryFrac, fracTex, paren, signed, linear, terms, point, money, people, checkEqual, checkRoots, checkAll } from '../../lib/index.js';
import { grid } from './_shared.js';

const m = (tex) => R`\(${tex}\)`;
/** The line y = kx + b as LaTeX. k and b may be numbers or Fracs. */
const eq = (k, b) => `y = ${linear(k, b)}`;
/** A point as plain text for a picture label: lab(2, -3) → "(2, −3)". */
const lab = (x, y) => `(${txt(x)}, ${txt(y)})`;
/** dy/dx as written, followed by its simplest form when that is different: ratio(8, 4) → \frac{8}{4} = 2. */
const ratio = (dy, dx) => (fracTex(dy, dx) === frac(dy, dx).tex() ? fracTex(dy, dx) : `${fracTex(dy, dx)} = ${frac(dy, dx).tex()}`);
/** "Subtract 3x from" or "Add 3x to", whichever removes the term c·sym from one side of an equation. */
const undo = (c, sym = '') => `${c > 0 ? 'Subtract' : 'Add'} \\(${terms([[Math.abs(c), sym]])}\\) ${c > 0 ? 'from' : 'to'} both sides`;
const xy = (rows, alt) => ({ type: 'table', headers: [R`\(x\)`, R`\(y\)`], rows, alt });
const SLOPES = [[1, 1], [2, 1], [3, 1], [-1, 1], [-2, 1], [-3, 1], [1, 2], [-1, 2], [3, 2], [-3, 2], [1, 3], [-1, 3], [2, 3], [-2, 3]];

// ───────────── Easy: read a slope, read an equation, write an equation from a story ─────────────

function easySlopeFromGraph(rng) {
  for (;;) {
    const [rise, run] = rng.pick(SLOPES);
    const t = rng.pick([1, 1, 2]);
    const [dx, dy] = [run * t, rise * t];
    const [x1, y1] = [rng.int(-5, 5 - dx), rng.int(-5, 5)];
    const [x2, y2] = [x1 + dx, y1 + dy];
    if (Math.abs(y2) > 5) continue;
    const k = frac(rise, run);
    const up = rise > 0;
    return q({
      prompt: 'What is the slope of the line?',
      visual: grid(-6, 6, { fns: [{ f: (x) => y1 + (rise / run) * (x - x1) }], points: [{ x: x1, y: y1, label: lab(x1, y1) }, { x: x2, y: y2, label: lab(x2, y2) }], alt: `A straight line on a coordinate grid. It passes through the marked points ${lab(x1, y1)} and ${lab(x2, y2)}.` }),
      correct: k,
      wrong: [{ value: frac(dx, dy), why: 'Slope is rise over run. The change in y goes on top.' }, { value: k.neg(), why: `The line goes ${up ? 'up' : 'down'} from left to right, so its slope is ${up ? 'positive' : 'negative'}.` }, dx > 1 ? { value: dy, why: R`\(${dy}\) is only the rise. Divide it by the run, \(${dx}\).` } : null, frac(dx, dy).neg()],
      solution: [R`Use the two marked points. From \(${point(x1, y1)}\) to \(${point(x2, y2)}\) the line goes ${up ? 'up' : 'down'} ${Math.abs(dy)} and right ${dx}, so the rise is \(${dy}\) and the run is \(${dx}\).`, R`Slope \(= \frac{\text{rise}}{\text{run}} = ${ratio(dy, dx)}\).`],
      rule: 0,
      skill: 'slope from a graph',
      check: () => checkEqual(y1 + k.value * dx, y2),
    });
  }
}

const MEANINGS = [
  { lead: R`The cost \(y\), in dollars, of renting a kayak for \(x\) hours is`, per: 'hour', slope: 'the cost for each hour', start: 'a fee that is paid once', others: ['the total cost of the rental', 'the number of hours'] },
  { lead: R`The height \(y\), in centimeters, of a plant after \(x\) weeks is`, per: 'week', slope: 'the growth each week', start: 'the height at the start', others: ['the height at the end', 'the number of weeks'] },
  { lead: R`The amount \(y\), in dollars, in a savings jar after \(x\) weeks is`, per: 'week', slope: 'the amount added each week', start: 'the amount at the start', others: ['the amount at the end', 'the number of weeks'] },
  { lead: R`The cost \(y\), in dollars, of a taxi ride of \(x\) miles is`, per: 'mile', slope: 'the cost for each mile', start: 'a fee that is paid once', others: ['the total cost of the ride', 'the number of miles'] },
];

function easyReadEquation(rng) {
  const askSlope = rng.bool();
  if (rng.bool(0.35)) {
    const c = rng.pick(MEANINGS);
    const r = rng.int(2, 9);
    const s = rng.intExcept(3, 30, [r]);
    return q({
      prompt: R`${c.lead} \(${eq(r, s)}\). What does the number \(${askSlope ? r : s}\) stand for?`,
      correct: askSlope ? c.slope : c.start,
      wrong: [askSlope ? { value: c.start, why: R`That is what \(${s}\), the number added on its own, stands for. \(${r}\) multiplies \(x\), so it is a rate.` } : { value: c.slope, why: R`That is what \(${r}\), the number multiplying \(x\), stands for. \(${s}\) is the value of \(y\) when \(x = 0\).` }, ...c.others],
      solution: [R`In \(y = mx + b\), the slope \(m\) is the change in \(y\) for each 1 unit of \(x\), and \(b\) is the value of \(y\) when \(x = 0\).`, askSlope ? R`\(${r}\) multiplies \(x\), so \(y\) goes up by \(${r}\) for every extra ${c.per}. It stands for ${c.slope}.` : R`When \(x = 0\), \(y = ${s}\). So \(${s}\) stands for ${c.start}.`],
      rule: 2,
      skill: 'meaning of slope and intercept',
    });
  }
  const k = rng.bool(0.3) ? frac(rng.sign() * rng.pick([1, 2, 3]), rng.pick([2, 3, 4, 5])) : frac(rng.nonzero(-9, 9));
  const b = rng.int(-12, 12);
  const unit = Math.abs(k.value) === 1;
  return q({
    prompt: R`What is the ${askSlope ? 'slope' : R`\(y\)-intercept`} of the line \(${eq(k, b)}\)?`,
    correct: askSlope ? k : b,
    wrong: askSlope
      ? [
          unit ? { value: 0, why: R`\(${terms([[k, 'x']])}\) means \(${k.tex()} \cdot x\), so the slope is \(${k.tex()}\), not \(0\).` } : null,
          b !== 0 ? { value: b, why: R`\(${b}\) is the \(y\)-intercept: the number on its own. The slope is the number that multiplies \(x\).` } : null,
          { value: k.neg(), why: R`Keep the sign in front of the \(x\)-term. It is part of the slope.` },
          -b,
        ]
      : [{ value: k, why: R`\(${k.tex()}\) multiplies \(x\), so it is the slope. The \(y\)-intercept is the number on its own.` }, b !== 0 ? { value: -b, why: 'Keep the sign in front of the number. It is part of the intercept.' } : null, k.neg(), 0],
    solution: [
      R`In \(y = mx + b\), \(m\) is the slope and \(b\) is the \(y\)-intercept.`,
      askSlope
        ? R`In \(${eq(k, b)}\), the number multiplying \(x\) is \(${k.tex()}\)${unit ? R` (\(${terms([[k, 'x']])}\) means \(${k.tex()} \cdot x\))` : ''}. So the slope is \(${k.tex()}\).`
        : b !== 0
          ? R`In \(${eq(k, b)}\), the number on its own is \(${b}\). So the \(y\)-intercept is \(${b}\): the line crosses the \(y\)-axis at \(${point(0, b)}\).`
          : R`In \(${eq(k, b)}\), no number is added, so \(b = 0\). The line crosses the \(y\)-axis at \((0, 0)\).`,
    ],
    rule: 2,
    skill: 'reading y = mx + b',
    check: () => checkEqual(askSlope ? k.value * 1 + b - b : k.value * 0 + b, askSlope ? k.value : b),
  });
}

const RATE_STORIES = [
  { sign: 1, per: 'hour', pick: (rng) => [5 * rng.int(4, 12), 5 * rng.int(3, 9)], text: (s, r) => R`A plumber charges ${money(s)} for a visit plus ${money(r)} for each hour of work. Which equation gives the total cost \(y\), in dollars, for \(x\) hours of work?` },
  { sign: 1, per: 'minute', pick: (rng) => [50 * rng.int(2, 18), rng.int(8, 30)], text: (s, r) => R`A pool already holds ${s} liters of water. A hose adds ${r} liters each minute. Which equation gives the amount of water \(y\), in liters, after \(x\) minutes?` },
  { sign: 1, per: 'week', pick: (rng) => [rng.int(3, 25), rng.int(2, 6)], text: (s, r) => R`A plant is ${s} centimeters tall and grows ${r} centimeters each week. Which equation gives its height \(y\), in centimeters, after \(x\) weeks?` },
  { sign: -1, per: 'hour', pick: (rng) => [rng.int(15, 40), rng.int(2, 5)], text: (s, r) => R`A candle is ${s} centimeters tall and burns down ${r} centimeters each hour. Which equation gives its height \(y\), in centimeters, after \(x\) hours?` },
  { sign: -1, per: 'minute', pick: (rng) => [50 * rng.int(2, 10), rng.int(5, 25)], text: (s, r) => R`A tank holds ${s} liters of water. Water drains out at ${r} liters each minute. Which equation gives the amount of water \(y\), in liters, after \(x\) minutes?` },
  { sign: -1, per: 'week', pick: (rng) => [5 * rng.int(8, 30), rng.int(5, 20)], text: (s, r) => R`A gift card is worth ${money(s)}. Each week, ${money(r)} is spent from it. Which equation gives the amount left \(y\), in dollars, after \(x\) weeks?` },
];

function easyEquationFromStory(rng) {
  const c = rng.pick(RATE_STORIES);
  let s;
  let r;
  do [s, r] = c.pick(rng);
  while (s === r);
  const k = c.sign * r;
  return q({
    prompt: c.text(s, r),
    correct: m(eq(k, s)),
    wrong: [{ value: m(eq(c.sign * s, r)), why: R`The amount that repeats every ${c.per} multiplies \(x\). The starting amount is the number on its own.` }, { value: m(eq(-k, s)), why: R`The amount goes ${k > 0 ? 'up' : 'down'} as \(x\) grows, so the slope is ${k > 0 ? 'positive' : 'negative'}.` }, m(eq(c.sign * (r + s), 0)), m(eq(k, -s))],
    solution: [R`The starting amount is \(${s}\). That is the value of \(y\) when \(x = 0\), so \(b = ${s}\).`, R`Each ${c.per} the amount goes ${k > 0 ? 'up' : 'down'} by \(${r}\), so the slope is \(m = ${k}\).`, R`The equation is \(${eq(k, s)}\).`],
    rule: 3,
    skill: 'equation from a story',
    check: () => {
      let amount = s;
      for (let i = 0; i < 4; i++) amount += k;
      return checkEqual(k * 4 + s, amount);
    },
  });
}

// ───────────── Medium: slope from points and tables, equations from graphs, linear or not, both sides ─────────────

function mediumSlope(rng) {
  const table = rng.bool(0.45);
  for (;;) {
    const dx = table ? rng.int(2, 5) : rng.nonzero(-8, 8);
    const dy = rng.nonzero(-12, 12);
    const k = frac(dy, dx);
    const [x1, y1] = [rng.int(-6, 6), rng.int(-9, 9)];
    const [x2, y2] = [x1 + dx, y1 + dy];
    if (k.d > 5 || Math.abs(k.n) > 9 || Math.abs(y2) > 15) continue;
    const flipped = { value: frac(dx, dy), why: 'Slope is the change in y divided by the change in x. The change in y goes on top.' };
    if (table) {
      const rows = [0, 1, 2, 3].map((i) => [x1 + i * dx, y1 + i * dy]);
      return q({
        prompt: 'The table shows a linear relationship. What is its slope?',
        visual: xy(rows, `A table of values. ${rows.map(([x, y]) => `When x is ${txt(x)}, y is ${txt(y)}`).join('. ')}.`),
        correct: k,
        wrong: [{ value: dy, why: R`\(${dy}\) is the change in \(y\) from one row to the next. Divide it by the change in \(x\), which is \(${dx}\).` }, flipped, k.neg(), tryFrac(y1, x1)],
        solution: [R`From one row to the next, \(x\) goes up by \(${dx}\) and \(y\) changes by \(${dy}\).`, R`Slope \(= \frac{\text{change in } y}{\text{change in } x} = ${ratio(dy, dx)}\).`],
        rule: 1,
        skill: 'slope from a table',
        check: () => (rows.every(([x, y]) => Math.abs(y1 + k.value * (x - x1) - y) < 1e-9) ? true : 'the rows do not fit the slope'),
      });
    }
    return q({
      prompt: R`What is the slope of the line through \(${point(x1, y1)}\) and \(${point(x2, y2)}\)?`,
      correct: k,
      wrong: [flipped, { value: k.neg(), why: 'Subtract the coordinates in the same order on the top and on the bottom.' }, { value: tryFrac(y1 + y2, x1 + x2), why: 'Slope uses the differences of the coordinates, not their sums.' }, frac(dx, dy).neg()],
      solution: [R`Change in \(y\): \(${y2} - ${paren(y1)} = ${dy}\).`, R`Change in \(x\): \(${x2} - ${paren(x1)} = ${dx}\).`, R`Slope \(= \frac{\text{change in } y}{\text{change in } x} = ${ratio(dy, dx)}\).`],
      rule: 1,
      skill: 'slope from two points',
      check: () => checkEqual(y1 + k.value * (x2 - x1), y2),
    });
  }
}

function mediumEquationFromGraph(rng) {
  for (;;) {
    const [rise, run] = rng.pick(SLOPES);
    const b = rng.nonzero(-4, 4);
    const t = rng.pick([1, 2, -1]);
    const [px, py] = [run * t, b + rise * t];
    const k = frac(rise, run);
    if (Math.abs(px) > 5 || Math.abs(py) > 5 || k.eq(b)) continue;
    const [[xa, ya], [xb, yb]] = t > 0 ? [[0, b], [px, py]] : [[px, py], [0, b]];
    const up = rise > 0;
    return q({
      prompt: 'Which equation matches the line on the graph?',
      visual: grid(-6, 6, { fns: [{ f: (x) => (rise / run) * x + b }], points: [{ x: 0, y: b, label: lab(0, b) }, { x: px, y: py, label: lab(px, py) }], alt: `A straight line on a coordinate grid. It passes through the marked points ${lab(xa, ya)} and ${lab(xb, yb)}.` }),
      correct: m(eq(k, b)),
      wrong: [{ value: m(eq(k.neg(), b)), why: `The line goes ${up ? 'up' : 'down'} from left to right, so its slope is ${up ? 'positive' : 'negative'}.` }, { value: m(eq(b, k)), why: R`The line crosses the \(y\)-axis at \(${b}\), so \(${b}\) is the \(y\)-intercept \(b\), not the slope.` }, Math.abs(rise) !== run ? { value: m(eq(frac(run, rise), b)), why: 'Slope is rise over run, not run over rise.' } : null, m(eq(k, -b))],
      solution: [R`The line crosses the \(y\)-axis at \(${point(0, b)}\), so \(b = ${b}\).`, R`From \(${point(xa, ya)}\) to \(${point(xb, yb)}\) the rise is \(${yb - ya}\) and the run is \(${xb - xa}\), so \(m = ${ratio(yb - ya, xb - xa)}\).`, R`The equation is \(${eq(k, b)}\).`],
      rule: 3,
      skill: 'equation from a graph',
      check: () => checkAll(checkEqual(k.value * px + b, py), checkEqual((yb - ya) / (xb - xa), k.value)),
    });
  }
}

function mediumLinearOrNot(rng) {
  const wantLinear = rng.bool();
  const [a, b, c] = [rng.int(2, 9), rng.int(1, 9), rng.int(2, 6)];
  const bends = (f) => Math.abs(f(1) - 2 * f(2) + f(3)) > 1e-9;
  if (rng.bool()) {
    const lines = rng.shuffle([{ tex: `y = ${linear(a, -b)}`, f: (x) => a * x - b }, { tex: `y = ${b} - ${a}x`, f: (x) => b - a * x, as: `y = ${linear(-a, b)}` }, { tex: R`y = \frac{x}{${c}} + ${b}`, f: (x) => x / c + b, as: R`y = \frac{1}{${c}}x + ${b}` }, { tex: `y = ${a}(x + ${b})`, f: (x) => a * (x + b), as: `y = ${linear(a, a * b)}` }, { tex: `y = -${c}x`, f: (x) => -c * x }]);
    const curves = rng.shuffle([{ tex: `y = x^{2} + ${b}`, f: (x) => x * x + b, why: R`\(x\) is squared` }, { tex: `y = ${a}x^{2}`, f: (x) => a * x * x, why: R`\(x\) is squared` }, { tex: R`y = \frac{${a}}{x}`, f: (x) => a / x, why: R`\(x\) is in the denominator` }, { tex: `y = x^{3} - ${b}`, f: (x) => x ** 3 - b, why: R`\(x\) is cubed` }, { tex: `y = x^{2} + ${c}x`, f: (x) => x * x + c * x, why: R`\(x\) is squared` }]);
    const [right, others] = wantLinear ? [lines[0], curves.slice(0, 3)] : [curves[0], lines.slice(0, 3)];
    return q({
      prompt: wantLinear ? 'Which equation is a linear function?' : R`Which equation is **not** a linear function?`,
      correct: m(right.tex),
      wrong: others.map((o) => m(o.tex)),
      solution: wantLinear
        ? [R`A linear function can be written as \(y = mx + b\): \(x\) is multiplied by a number, and a number is added.`, R`\(${right.tex}\) fits that pattern${right.as ? R`: it is the same as \(${right.as}\)` : ''}.`, R`In the other equations \(x\) is squared, cubed or in a denominator, so their graphs are not straight lines.`]
        : [R`A linear function can be written as \(y = mx + b\).`, R`In \(${right.tex}\), ${right.why}, so the rate of change is not constant and the graph is not a straight line.`, R`Each of the other equations can be written as \(y = mx + b\).`],
      rule: 4,
      skill: 'linear or not',
      check: () => (bends(right.f) !== wantLinear && others.every((o) => bends(o.f) === wantLinear) ? true : 'a choice is in the wrong group'),
    });
  }
  const steady = rng.shuffle([[b, a], [3 * c, -c], [a + b, c], [10 * c, -a]]).map(([s, d]) => [0, 1, 2, 3].map((i) => s + d * i));
  const curved = rng.shuffle([[1, 4, 9, 16].map((v) => v + b), [1, 2, 4, 8].map((v) => v * c), [1, 3, 6, 10].map((v) => v + b), [24, 12, 8, 6], [1, 8, 27, 64]]);
  const [right, others] = wantLinear ? [steady[0], curved.slice(0, 3)] : [curved[0], steady.slice(0, 3)];
  const show = (list) => list.map((v) => txt(v)).join(', ');
  const steps = (list) => [1, 2, 3].map((i) => list[i] - list[i - 1]);
  const moves = (d) => (d > 0 ? `go up by ${d}` : `go down by ${-d}`);
  const curve = wantLinear ? others[0] : right;
  return q({
    prompt: R`A function has the inputs \(x = 1, 2, 3, 4\). Which list of outputs ${wantLinear ? 'shows a **linear** function' : R`does **not** show a linear function`}?`,
    correct: show(right),
    wrong: others.map(show),
    solution: [
      'The inputs go up by 1 each time, so the outputs of a linear function must change by the same amount each time.',
      wantLinear ? `In the list ${show(right)}, the outputs ${moves(steps(right)[0])} every time, so the function is linear.` : `In the list ${show(right)}, the outputs change by ${steps(right).map((v) => txt(v)).join(', then ')}. The change is not constant, so the function is not linear.`,
      wantLinear ? `The other lists do not change by a constant amount. For example, ${show(curve)} changes by ${steps(curve).map((v) => txt(v)).join(', then ')}.` : 'In each of the other lists the outputs change by the same amount every time.',
    ],
    rule: 4,
    skill: 'linear or not',
    check: () => {
      const even = (list) => new Set(steps(list)).size === 1;
      return even(right) === wantLinear && others.every((o) => even(o) !== wantLinear) ? true : 'a list is in the wrong group';
    },
  });
}

function mediumSolveBothSides(rng) {
  for (;;) {
    const a = rng.int(2, 9);
    const c = rng.intExcept(1, 9, [a]);
    const [x, b] = [rng.nonzero(-8, 9), rng.nonzero(-15, 15)];
    const [k, d] = [a - c, (a - c) * x + b];
    if (d === 0 || Math.abs(d) > 40) continue;
    return q({
      prompt: R`Solve for \(x\): \(\;${linear(a, b)} = ${linear(c, d)}\)`,
      correct: x,
      fmt: (v) => R`\(x = ${num(v)}\)`,
      wrong: [{ value: tryFrac(d - b, a + c), why: R`To move \(${terms([[c, 'x']])}\) to the left, subtract it from both sides. That leaves \(${terms([[k, 'x']])}\) on the left, not \(${a + c}x\).` }, { value: tryFrac(d + b, k), why: R`To undo \(${signed(b)}\), ${b > 0 ? 'subtract' : 'add'} \(${Math.abs(b)}\) on both sides.` }, -x, frac(d - b, a)],
      solution: [R`${undo(c, 'x')}: \(${linear(k, b)} = ${d}\).`, R`${undo(b)}: \(${terms([[k, 'x']])} = ${d - b}\).`, ...(k === 1 ? [] : [R`Divide both sides by \(${k}\): \(x = ${x}\).`]), R`Check: when \(x = ${x}\), both sides equal \(${a * x + b}\). ✓`],
      rule: 5,
      skill: 'variables on both sides',
      check: () => checkAll(checkRoots((t) => a * t + b - (c * t + d), [x]), checkEqual(a * x + b, c * x + d)),
    });
  }
}

// ───────────── Hard: equations from points, tables and stories; distributing; counting solutions ─────────────

function hardEquationFromPoints(rng) {
  const table = rng.bool(0.4);
  for (;;) {
    const [rise, run] = rng.pick([...SLOPES, [4, 1], [-4, 1]]);
    const k = frac(rise, run);
    const b = rng.nonzero(-9, 9);
    const i1 = table ? rng.int(1, 3) : rng.nonzero(-4, 4);
    const i2 = table ? i1 + rng.int(1, 2) : rng.intExcept(-4, 4, [0, i1]);
    const pts = (table ? [0, 1, 2, 3].map((j) => i1 + j * (i2 - i1)) : [i1, i2]).map((i) => [run * i, rise * i + b]);
    const [[x1, y1], [x2, y2]] = pts;
    const [dx, dy] = [x2 - x1, y2 - y1];
    const kx1 = rise * i1;
    if (Math.abs(y1) > 20 || pts.some(([, y]) => Math.abs(y) > 30)) continue;
    const times = k.eq(1) ? `${x1}` : k.eq(-1) ? `-${paren(x1)}` : `${k.tex()}(${x1})`;
    return q({
      prompt: table ? 'The table shows a linear relationship. Which equation fits the table?' : R`Which equation is the line through \(${point(x1, y1)}\) and \(${point(x2, y2)}\)?`,
      visual: table ? xy(pts, `A table of values. ${pts.map(([x, y]) => `When x is ${txt(x)}, y is ${txt(y)}`).join('. ')}.`) : undefined,
      correct: m(eq(k, b)),
      wrong: [{ value: m(eq(k, y1)), why: R`\(${y1}\) is the value of \(y\) when \(x = ${x1}\). The \(y\)-intercept is the value of \(y\) when \(x = 0\).` }, { value: m(eq(k, y1 + kx1)), why: R`Substituting \(${point(x1, y1)}\) gives \(${y1} = ${kx1} + b\). To find \(b\), ${kx1 > 0 ? 'subtract' : 'add'} \(${Math.abs(kx1)}\) on both sides.` }, Math.abs(rise) !== run ? m(eq(frac(run, rise), b)) : null, m(eq(k.neg(), b)), m(eq(k, -b))],
      solution: [table ? R`From one row to the next, \(x\) changes by \(${dx}\) and \(y\) changes by \(${dy}\), so \(m = ${ratio(dy, dx)}\).` : R`Slope: \(m = \frac{${y2} - ${paren(y1)}}{${x2} - ${paren(x1)}} = ${ratio(dy, dx)}\).`, R`Substitute \(${point(x1, y1)}\) into \(y = mx + b\): \(${y1} = ${times} + b\), so \(${y1} = ${kx1} + b\) and \(b = ${b}\).`, R`The equation is \(${eq(k, b)}\). Check with \(${point(x2, y2)}\): \(${rise * (x2 / run)} ${signed(b)} = ${y2}\). ✓`],
      rule: 3,
      skill: table ? 'equation from a table' : 'equation from two points',
      check: () => (pts.every(([x, y]) => Math.abs(k.value * x + b - y) < 1e-9) ? true : 'a point is not on the line'),
    });
  }
}

const an = (n) => ([8, 11, 18].includes(n) ? 'an' : 'a');
const TWO_VALUE_STORIES = [
  { sign: 1, rate: [2, 5], per: 'week', unit: 'cm', text: (x1, y1, x2, y2) => `A plant grows by the same amount every week. After ${x1} weeks it is ${y1} cm tall, and after ${x2} weeks it is ${y2} cm tall.`, start: 'How tall was the plant at the start (week 0)?', later: (x) => `How tall will it be after ${x} weeks?` },
  { sign: 1, rate: [2, 4], per: 'mile', unit: 'dollars', text: (x1, y1, x2, y2) => `A taxi ride costs a fixed fee plus the same amount for every mile. A ${x1}-mile ride costs ${money(y1)} and ${an(x2)} ${x2}-mile ride costs ${money(y2)}.`, start: 'How much is the fixed fee?', later: (x) => `How much does ${an(x)} ${x}-mile ride cost?` },
  { sign: -1, rate: [1, 3], per: 'hour', unit: 'cm', text: (x1, y1, x2, y2) => `A candle burns down at a steady rate. After ${x1} hours it is ${y1} cm tall, and after ${x2} hours it is ${y2} cm tall.`, start: 'How tall was the candle before it was lit?', later: (x) => `How tall will it be after ${x} hours?` },
  { sign: -1, rate: [2, 9], per: 'minute', unit: 'liters', text: (x1, y1, x2, y2) => `A water tank drains at a steady rate. After ${x1} minutes it holds ${y1} liters, and after ${x2} minutes it holds ${y2} liters.`, start: 'How much water was in the tank at the start?', later: (x) => `How much water will it hold after ${x} minutes?` },
];

function hardStoryTwoValues(rng) {
  const c = rng.pick(TWO_VALUE_STORIES);
  const askStart = rng.bool();
  const r = rng.int(...c.rate);
  const k = c.sign * r;
  const x1 = rng.int(2, 4);
  const x2 = x1 + rng.int(2, 4);
  const x3 = x2 + rng.int(2, 3);
  const b = c.sign > 0 ? rng.int(3, c.unit === 'dollars' ? 10 : 30) : r * x3 + rng.int(2, 10);
  const at = (x) => k * x + b;
  const [y1, y2, y3] = [at(x1), at(x2), at(x3)];
  const answer = askStart ? b : y3;
  return q({
    prompt: `${c.text(x1, y1, x2, y2)} ${askStart ? c.start : c.later(x3)}`,
    correct: answer,
    unit: c.unit,
    wrong: (askStart
      ? [
          { value: y1 - k, why: R`The amount changes by \(${r}\) each ${c.per}, and ${x1} ${c.per}s have passed. Go back \(${x1} \times ${r}\), not just \(${r}\).` },
          { value: y1, why: `That is the amount after ${x1} ${c.per}s, not at the start.` },
          y1 - (y2 - y1),
          b + k,
        ]
      : [
          { value: y2 + k, why: R`That is only one more ${c.per} after ${x2}. From ${x2} to ${x3} is \(${x3 - x2}\) ${c.per}s.` },
          { value: r * x3, why: R`\(${r} \times ${x3}\) is only the change. Combine it with the starting amount, \(${b}\).` },
          y2 + k * x3,
          y3 - k,
        ]
    ).filter((w) => (w.value ?? w) > 0),
    solution: [R`Rate of change: \(\frac{${y2} - ${y1}}{${x2} - ${x1}} = ${ratio(y2 - y1, x2 - x1)}\) ${c.unit} per ${c.per}.`, R`Go back from ${x1} ${c.per}s to the start: \(${y1} - ${x1}(${k}) = ${b}\). So the starting amount is \(${b}\) and the equation is \(${eq(k, b)}\).`, ...(askStart ? [] : [R`When \(x = ${x3}\): \(y = ${k}(${x3}) + ${b} = ${y3}\).`]), `The answer is ${answer} ${c.unit}.`],
    rule: 3,
    skill: 'linear story from two values',
    check: () => {
      const slope = (y2 - y1) / (x2 - x1);
      return checkEqual(askStart ? y1 - slope * x1 : y1 + slope * (x3 - x1), answer);
    },
  });
}

function hardSolveDistribute(rng) {
  if (rng.bool(0.35)) {
    const [one, two] = rng.pick([['Gym A', 'Gym B'], ['Plan A', 'Plan B'], ['Club A', 'Club B']]);
    const x = rng.int(2, 12);
    const r2 = rng.int(2, 9) * 5;
    const r1 = r2 + rng.int(1, 6) * 5;
    const s1 = rng.int(0, 8) * 10;
    const s2 = s1 + (r1 - r2) * x;
    const total = r1 * x + s1;
    return q({
      prompt: `${one} charges ${s1 ? `${money(s1)} to join plus ` : ''}${money(r1)} each month. ${two} charges ${money(s2)} to join plus ${money(r2)} each month. After how many months is the total cost the same?`,
      correct: x,
      unit: 'months',
      wrong: [{ value: tryFrac(s2 - s1, r1 + r2)?.isInt() ? (s2 - s1) / (r1 + r2) : null, why: 'To collect the monthly charges on one side, subtract one from the other. Do not add them.' }, { value: tryFrac(s2 - s1, r1)?.isInt() ? (s2 - s1) / r1 : null, why: R`Both plans charge every month. Only the difference, \(${r1} - ${r2} = ${r1 - r2}\) dollars a month, closes the gap.` }, { value: r1 - r2, why: R`\(${r1 - r2}\) dollars is how much closer the two totals get each month. It is not the number of months.` }, x + 1, x - 1],
      solution: [R`Let \(x\) be the number of months. ${one} costs \(${linear(r1, s1)}\) dollars and ${two} costs \(${linear(r2, s2)}\) dollars.`, R`The costs are the same when \(${linear(r1, s1)} = ${linear(r2, s2)}\).`, R`Subtract \(${r2}x\) from both sides: \(${linear(r1 - r2, s1)} = ${s2}\).${s1 ? R` Subtract \(${s1}\): \(${r1 - r2}x = ${s2 - s1}\).` : ''}`, R`Divide by \(${r1 - r2}\): \(x = ${x}\). After ${x} months both cost ${money(total)}.`],
      rule: 5,
      skill: 'equations from stories',
      check: () => checkEqual(r1 * x + s1, r2 * x + s2),
    });
  }
  for (;;) {
    const a = rng.pick([2, 3, 4, 5, 6, -2, -3, -4]);
    const b = rng.nonzero(-9, 9);
    const c = rng.intExcept(-6, 9, [0, a]);
    const x = rng.bool(0.6) ? frac(rng.nonzero(-8, 8)) : frac(rng.sign() * rng.pick([1, 2, 4, 5, 7]), rng.pick([2, 3]));
    const dF = x.mul(a - c).add(a * b);
    if (!dF.isInt() || dF.value === 0 || Math.abs(dF.value) > 60) continue;
    const [d, k, ab] = [dF.value, a - c, a * b];
    return q({
      prompt: R`Solve for \(x\): \(\;${a}(${linear(1, b)}) = ${linear(c, d)}\)`,
      correct: x,
      fmt: (v) => R`\(x = ${num(v)}\)`,
      wrong: [{ value: tryFrac(d - b, k), why: R`\(${a}\) multiplies both terms in the parentheses: \(${a} \times ${paren(b)} = ${ab}\).` }, { value: tryFrac(d - ab, a + c), why: R`To move \(${terms([[c, 'x']])}\) to the left, ${c > 0 ? 'subtract it from' : R`add \(${terms([[-c, 'x']])}\) to`} both sides. That leaves \(${terms([[k, 'x']])}\) on the left.` }, x.neg(), tryFrac(d + ab, k)],
      solution: [R`Distribute on the left: \(${linear(a, ab)} = ${linear(c, d)}\).`, R`${undo(c, 'x')}: \(${linear(k, ab)} = ${d}\).`, R`${undo(ab)}: \(${terms([[k, 'x']])} = ${d - ab}\).`, ...(k === 1 ? [] : [R`Divide both sides by \(${k}\): \(x = ${ratio(d - ab, k)}\).`])],
      rule: 5,
      skill: 'distributing, then solving',
      check: () => checkRoots((t) => a * (t + b) - (c * t + d), [x.value]),
    });
  }
}

const COUNTS = { none: 'No solution', one: 'Exactly one solution', two: 'Exactly two solutions', many: 'Infinitely many solutions' };

function hardSolutionCount(rng) {
  const kind = rng.pick(['none', 'one', 'many']);
  const a = rng.pick([2, 3, 4, 5, 6, -2, -3]);
  const b = rng.nonzero(-8, 8);
  const split = rng.bool();
  const p = rng.int(1, 5);
  const [A, B] = split ? [a, b] : [a, a * b];
  const left = split ? terms([[p, 'x'], [b, ''], [a - p, 'x']]) : `${a}(${linear(1, b)})`;
  const c = kind === 'one' ? rng.intExcept(-6, 9, [0, A]) : A;
  const d = kind === 'many' ? B : B + rng.nonzero(-9, 9);
  const x = kind === 'one' ? frac(d - B, A - c) : null;
  if (split && a === p) return hardSolutionCount(rng);
  const f = (t) => A * t + B - (c * t + d);
  return q({
    prompt: R`How many solutions does this equation have? \(\;${left} = ${linear(c, d)}\)`,
    correct: COUNTS[kind],
    wrong: [
      kind === 'none' ? { value: COUNTS.many, why: R`The \(x\)-terms cancel, but what is left, \(${B} = ${d}\), is false. No value of \(x\) makes the equation true.` } : null,
      kind === 'many' ? { value: COUNTS.none, why: R`The \(x\)-terms cancel and what is left, \(${B} = ${d}\), is true. So every value of \(x\) makes the equation true.` } : null,
      kind === 'one' ? { value: B === d ? COUNTS.many : COUNTS.none, why: R`The \(x\)-terms are different, so they do not cancel. Solving gives the single solution \(x = ${x.tex()}\).` } : null,
      { value: COUNTS.two, why: 'An equation like this one has no solution, exactly one solution or infinitely many. It cannot have exactly two.' },
      COUNTS.none,
      COUNTS.one,
      COUNTS.many,
    ],
    solution: [
      R`${split ? 'Combine like terms' : 'Distribute'} on the left: \(${linear(A, B)} = ${linear(c, d)}\).`,
      kind === 'one' ? R`The \(x\)-terms are different, so they do not cancel. ${undo(c, 'x')}: \(${linear(A - c, B)} = ${d}\).` : R`${undo(A, 'x')}: \(${B} = ${d}\).`,
      kind === 'one' ? R`Solving gives \(x = ${x.tex()}\). That is the only solution, so there is exactly one.` : kind === 'none' ? R`\(${B} = ${d}\) is never true, so no value of \(x\) works. There is no solution.` : R`\(${B} = ${d}\) is always true, so every value of \(x\) works. There are infinitely many solutions.`,
    ],
    rule: 6,
    skill: 'number of solutions',
    check: () => ((f(0) === 0 && f(1) === 0 ? 'many' : f(0) === f(1) ? 'none' : 'one') === kind ? true : 'the count is wrong'),
  });
}

// ───────────── Challenge: work backwards and compare ─────────────

function challengeFindK(rng) {
  const kind = rng.pick(['none', 'many', 'given']);
  const p = rng.int(2, 6);
  const q0 = rng.int(2, 5);
  const b = rng.nonzero(-8, 8);
  const fmt = (v) => R`\(k = ${num(v)}\)`;
  if (kind === 'none') {
    const d = p * b + rng.nonzero(-9, 9);
    return q({
      prompt: R`For which value of \(k\) does this equation have **no solution**? \(\;${p}(${linear(q0, b)}) = kx ${signed(d)}\)`,
      correct: p * q0,
      fmt,
      wrong: [{ value: q0, why: R`Distribute first. The left side is \(${linear(p * q0, p * b)}\), so its \(x\)-term is \(${p * q0}x\).` }, { value: p, why: R`Distribute first. The left side is \(${linear(p * q0, p * b)}\), so its \(x\)-term is \(${p * q0}x\).` }, -p * q0, p + q0],
      solution: [R`Distribute on the left: \(${linear(p * q0, p * b)} = kx ${signed(d)}\).`, R`There is no solution when the \(x\)-terms cancel and a false statement is left. The \(x\)-terms cancel when \(k = ${p * q0}\).`, R`Then the equation becomes \(${p * b} = ${d}\), which is false. So \(k = ${p * q0}\).`],
      rule: 6,
      skill: 'choosing a value for no solution',
      check: () => (p * b !== d ? true : 'that value gives infinitely many solutions'),
    });
  }
  if (kind === 'many') {
    return q({
      prompt: R`For which value of \(k\) does this equation have **infinitely many solutions**? \(\;${p}(${linear(q0, b)}) = ${p * q0}x + k\)`,
      correct: p * b,
      fmt,
      wrong: [{ value: b, why: R`Distribute first: \(${p} \times ${paren(b)} = ${p * b}\). The plain numbers on the two sides must match.` }, { value: -p * b, why: R`The left side is \(${linear(p * q0, p * b)}\). The right side must be exactly the same.` }, p + b, p * q0],
      solution: [R`Distribute on the left: \(${linear(p * q0, p * b)} = ${p * q0}x + k\).`, R`The \(x\)-terms are the same on both sides. There are infinitely many solutions when the plain numbers match too.`, R`So \(k = ${p * b}\). Then both sides are \(${linear(p * q0, p * b)}\) for every value of \(x\).`],
      rule: 6,
      skill: 'choosing a value for many solutions',
      check: () => checkAll(checkEqual(p * (q0 * 1.7 + b), p * q0 * 1.7 + p * b), checkEqual(p * (q0 * -2 + b), p * q0 * -2 + p * b)),
    });
  }
  const c = rng.intExcept(2, 9, [p]);
  const x = rng.nonzero(-6, 8);
  const k = c * x + b - p * x;
  return q({
    prompt: R`The solution of \(${p}x + k = ${linear(c, b)}\) is \(x = ${x}\). What is the value of \(k\)?`,
    correct: k,
    fmt,
    wrong: [{ value: c * x + b, why: R`That is the value of the right side. The left side is \(${p}(${x}) + k\), so ${p * x > 0 ? 'subtract' : 'add'} \(${Math.abs(p * x)}\) as well.` }, { value: c * x + b + p * x, why: R`\(${p}(${x}) = ${p * x}\) is on the same side as \(k\). To undo it, do the opposite on both sides.` }, -k, b - p],
    solution: [R`A solution makes the equation true, so substitute \(x = ${x}\): \(${p}(${x}) + k = ${c}(${x}) ${signed(b)}\).`, R`Work out both sides: \(${p * x} + k = ${c * x + b}\).`, R`${undo(p * x)}: \(k = ${k}\).`],
    rule: 5,
    skill: 'working back from a solution',
    check: () => checkEqual(p * x + k, c * x + b),
  });
}

function challengeMissingCoordinate(rng) {
  for (;;) {
    const [rise, run] = rng.pick(SLOPES);
    const k = frac(rise, run);
    const [x1, y1, t] = [rng.int(-6, 6), rng.int(-8, 8), rng.nonzero(-4, 4)];
    const [dx, dy] = [run * t, rise * t];
    const [x2, y2] = [x1 + dx, y1 + dy];
    if (Math.abs(x2) > 12 || Math.abs(y2) > 12) continue;
    const missY = rng.bool();
    const kTex = k.value < 0 ? R`\left(${k.tex()}\right)` : k.tex();
    return q({
      prompt: R`The line through \(${point(x1, y1)}\) and \(${missY ? `(${x2}, k)` : `(k, ${y2})`}\) has slope \(${k.tex()}\). What is the value of \(k\)?`,
      correct: missY ? y2 : x2,
      fmt: (v) => R`\(k = ${num(v)}\)`,
      wrong: missY
        ? [
            { value: k.add(y1), why: R`The slope is the change in \(y\) for each 1 unit of \(x\). Here \(x\) changes by \(${dx}\), so \(y\) changes by \(${kTex} \times ${paren(dx)} = ${dy}\).` },
            { value: y1 - dy, why: R`\(x\) changes by \(${dx}\), so \(y\) changes by \(${dy}\). Add that change to \(${y1}\).` },
            k.mul(x2),
            y1 + dx,
          ]
        : [
            { value: k.mul(dy).add(x1), why: R`The change in \(y\) divided by the change in \(x\) equals the slope. So divide \(${dy}\) by the slope to find the change in \(x\).` },
            { value: x1 - dx, why: R`The change in \(x\) is \(${dx}\). Add that change to \(${x1}\).` },
            x1 + dy,
            k.mul(y2),
          ],
      solution: missY
        ? [R`From the first point to the second, \(x\) changes by \(${x2} - ${paren(x1)} = ${dx}\).`, R`Slope is the change in \(y\) divided by the change in \(x\), so the change in \(y\) is \(${kTex} \times ${paren(dx)} = ${dy}\).`, R`So \(k = ${y1} ${signed(dy)} = ${y2}\).`]
        : [R`From the first point to the second, \(y\) changes by \(${y2} - ${paren(y1)} = ${dy}\).`, R`Slope is the change in \(y\) divided by the change in \(x\), so the change in \(x\) is \(${dy} \div ${kTex} = ${dx}\).`, R`So \(k = ${x1} ${signed(dx)} = ${x2}\).`],
      rule: 1,
      skill: 'missing coordinate',
      check: () => checkEqual((y2 - y1) / (x2 - x1), k.value),
    });
  }
}

const RACES = [{ names: ['Tank A', 'Tank B'], y: 'liter', per: 'minute', lead: 'Two tanks are being filled with water.', word: 'is filling faster', amount: (n) => `the amount of water in ${n}` }, { names: null, y: 'dollar', per: 'week', lead: 'Two friends are saving money.', word: 'is saving faster', amount: (n) => `${n}'s savings` }, { names: ['Printer A', 'Printer B'], y: 'page', per: 'minute', lead: 'Two printers are printing at steady rates.', word: 'is printing faster', amount: (n) => `the number of pages printed by ${n}` }];

function challengeCompareRates(rng) {
  const c = rng.pick(RACES);
  const [n1, n2] = c.names ?? people(rng, 2);
  for (;;) {
    const [m1, m2] = [rng.int(3, 15), rng.int(3, 15)];
    const s = rng.int(2, 5);
    const [b1, b2] = [rng.int(0, 8) * 5, rng.int(0, 8) * 5];
    const raw = m2 * s;
    if (m1 === m2 || raw === m1) continue;
    const rows = [1, 2, 3, 4].map((i) => [s * i, m2 * s * i + b2]);
    const say = (who, by) => `${who}, by ${by} ${c.y}${by === 1 ? '' : 's'} per ${c.per}`;
    const [fast, slow] = m1 > m2 ? [n1, n2] : [n2, n1];
    const diff = Math.abs(m1 - m2);
    return q({
      prompt: R`${c.lead} After \(x\) ${c.per}s, ${c.amount(n1)} is \(y = ${linear(m1, b1)}\) ${c.y}s. The table shows ${c.amount(n2)}. Which one ${c.word}, and by how much?`,
      visual: { type: 'table', headers: [`${c.per[0].toUpperCase()}${c.per.slice(1)}s`, `${c.y[0].toUpperCase()}${c.y.slice(1)}s (${n2})`], rows, alt: `A table for ${n2}. ${rows.map(([x, y]) => `After ${x} ${c.per}s: ${y} ${c.y}s`).join('. ')}.` },
      correct: say(fast, diff),
      wrong: [{ value: say(m1 > raw ? n1 : n2, Math.abs(m1 - raw)), why: R`In the table, \(${raw}\) ${c.y}s is the change for ${s} ${c.per}s. Divide by ${s} to get the rate for one ${c.per}: \(${m2}\).` }, say(slow, diff), say(m1 > raw ? n2 : n1, Math.abs(m1 - raw)), say(fast, m1 + m2), say(slow, m1 + m2)],
      solution: [R`The rate for ${n1} is the slope of the equation: \(${m1}\) ${c.y}s per ${c.per}.`, R`In the table, \(x\) goes up by \(${s}\) and \(y\) goes up by \(${raw}\) from one row to the next. The rate for ${n2} is \(\frac{${raw}}{${s}} = ${m2}\) ${c.y}s per ${c.per}.`, R`\(${Math.max(m1, m2)} - ${Math.min(m1, m2)} = ${diff}\), so the answer is: ${say(fast, diff)}.`],
      rule: 1,
      skill: 'comparing rates',
      check: () => {
        const tableRate = (rows[3][1] - rows[0][1]) / (rows[3][0] - rows[0][0]);
        return checkAll(checkEqual(Math.abs(m1 - tableRate), diff), (m1 > tableRate ? n1 : n2) === fast ? true : 'the faster one is wrong');
      },
    });
  }
}

// ───────────── Interactive models ─────────────

/** The steps for solving ax + b = cx + d, and the solution as a Frac (null when there is none or every number works). */
function bothSides(a, b, c, d) {
  const k = a - c;
  const steps = [];
  if (c !== 0) steps.push(R`${undo(c, 'x')}: \(${linear(k, b)} = ${d}\).`);
  if (k === 0) {
    const same = b === d;
    steps.push(R`The \(x\)-terms have cancelled. What is left, \(${b} = ${d}\), is ${same ? 'always true' : 'never true'}.`);
    return { steps, x: null, answer: same ? 'Every number is a solution: infinitely many solutions' : 'No solution' };
  }
  if (b !== 0) steps.push(R`${undo(b)}: \(${terms([[k, 'x']])} = ${d - b}\).`);
  const x = frac(d - b, k);
  if (k !== 1) steps.push(R`Divide both sides by \(${k}\): \(x = ${ratio(d - b, k)}\).`);
  steps.push(R`Check: when \(x = ${x.tex()}\), both sides equal \(${x.mul(a).add(b).tex()}\). ✓`);
  return { steps, x, answer: R`\(x = ${x.tex()}\)` };
}

export default {
  id: 'linear-relationships',
  title: 'Slope & Linear Relationships',
  summary: 'Find slope from graphs, tables and points, write equations of lines, and solve equations with the variable on both sides.',
  grade: 'Grade 8',
  standards: ['CCSS 8.EE.B.5', 'CCSS 8.EE.B.6', 'CCSS 8.EE.C.7', 'CCSS 8.F.A.3', 'CCSS 8.F.B.4'],

  explain: {
    intro: R`A **linear relationship** changes at a constant rate, so its graph is a straight line. The **slope** measures that rate, and the equation \(y = mx + b\) describes the whole line. This topic also covers solving equations that have the variable on both sides.`,
    rules: [
      {
        title: 'Slope: rise over run',
        text: R`The **slope** of a line tells how steep it is. Pick two points on the line. The **rise** is the change in \(y\) and the **run** is the change in \(x\): \(\text{slope} = \frac{\text{rise}}{\text{run}}\). A line that goes up from left to right has a positive slope. A line that goes down has a negative slope.`,
        example: R`From \((1, 3)\) to \((3, 7)\) a line rises 4 and runs 2, so its slope is \(\frac{4}{2} = 2\).`,
      },
      {
        title: 'Slope from two points or a table',
        text: R`For the points \((x_1, y_1)\) and \((x_2, y_2)\), \(m = \frac{y_2 - y_1}{x_2 - x_1}\). Subtract in the same order on the top and on the bottom. In a table, divide the change in \(y\) by the change in \(x\). Any two points on the same line give the same slope.`,
        example: R`Through \((2, 5)\) and \((6, 13)\): \(m = \frac{13 - 5}{6 - 2} = \frac{8}{4} = 2\).`,
      },
      {
        title: R`Slope-intercept form: \(y = mx + b\)`,
        text: R`In \(y = mx + b\), \(m\) is the slope and \(b\) is the \(y\)-intercept: the value of \(y\) when \(x = 0\), where the line crosses the \(y\)-axis. In a story, \(m\) is the rate of change and \(b\) is the starting amount.`,
        example: R`\(y = 3x - 5\) has slope \(3\) and \(y\)-intercept \(-5\). A taxi that costs $4 plus $2 a mile has \(y = 2x + 4\).`,
      },
      {
        title: 'Writing the equation of a line',
        text: R`First find the slope \(m\). Then find \(b\): read it from the graph or the story, or substitute one point into \(y = mx + b\) and solve for \(b\).`,
        example: R`Through \((2, 5)\) and \((6, 13)\): \(m = 2\). Substitute \((2, 5)\): \(5 = 2(2) + b\), so \(b = 1\). The line is \(y = 2x + 1\).`,
      },
      {
        title: 'Linear or not linear',
        text: R`A function is **linear** if its rate of change is constant: equal steps in \(x\) always give equal steps in \(y\). Its graph is a straight line and its equation can be written as \(y = mx + b\). If \(x\) is squared, cubed or in a denominator, the function is not linear.`,
        example: R`For \(x = 1, 2, 3, 4\), the outputs 5, 8, 11, 14 go up by 3 each time: linear. The outputs 1, 4, 9, 16 go up by 3, then 5, then 7: not linear.`,
      },
      {
        title: 'Solving with the variable on both sides',
        text: R`Distribute and combine like terms on each side first. Then add or subtract the same variable term on both sides, so that the variable is on one side only. Finish in the usual way and check by substituting.`,
        example: R`\(5x - 3 = 2x + 12\). Subtract \(2x\): \(3x - 3 = 12\). Add 3: \(3x = 15\). Divide by 3: \(x = 5\).`,
      },
      {
        title: 'One solution, no solution or infinitely many',
        text: R`If the variable terms cancel and a **false** statement such as \(6 = 1\) is left, the equation has no solution. If a **true** statement such as \(6 = 6\) is left, every number is a solution. If the variable terms do not cancel, there is exactly one solution.`,
        example: R`\(2(x + 3) = 2x + 6\) becomes \(6 = 6\): infinitely many solutions. \(2(x + 3) = 2x + 1\) becomes \(6 = 1\): no solution.`,
      },
    ],
    vocab: [
      { term: 'slope', def: R`How steep a line is: the change in \(y\) divided by the change in \(x\) between two points.` },
      { term: 'rate of change', def: R`How much \(y\) changes for each 1 unit of \(x\). For a line, it is the slope.` },
      { term: 'y-intercept', def: R`The value of \(y\) when \(x = 0\). The line crosses the \(y\)-axis there.` },
      { term: 'linear function', def: R`A function with a constant rate of change. Its graph is a straight line and its equation can be written as \(y = mx + b\).` },
      { term: 'solution', def: 'A value of the variable that makes an equation true.' },
    ],
    mistakes: [
      R`Putting the change in \(x\) on top. Slope is the change in \(y\) divided by the change in \(x\).`,
      R`Subtracting in different orders on the top and bottom: \(\frac{y_2 - y_1}{x_1 - x_2}\) has the wrong sign.`,
      R`Mixing up \(m\) and \(b\): in \(y = 2x + 7\) the slope is 2, not 7.`,
      R`Using a point's \(y\)-value as \(b\). The \(y\)-intercept is the value of \(y\) only when \(x = 0\).`,
      R`Calling \(x = 0\) "no solution". Zero is a number, so an equation with \(x = 0\) has one solution.`,
    ],
    visual: {
      type: 'plot',
      x: [-3, 6],
      y: [-2, 9],
      step: [1, 1],
      fns: [{ f: (x) => 2 * x + 1, label: 'y = 2x + 1', labelAt: 4.2 }],
      segments: [{ from: [1, 3], to: [3, 3], dashed: true, label: 'run 2' }, { from: [3, 3], to: [3, 7], dashed: true, label: 'rise 4' }],
      points: [{ x: 0, y: 1, label: '(0, 1)' }, { x: 1, y: 3 }, { x: 3, y: 7 }],
      alt: 'The graph of y = 2x + 1. It crosses the y-axis at (0, 1). Between the points (1, 3) and (3, 7) a dashed step shows a run of 2 and a rise of 4, so the slope is 2.',
    },
  },

  examples: [
    {
      title: 'Slope from a graph',
      problem: R`Find the slope of the line through \((0, 4)\) and \((2, 1)\).`,
      steps: [R`Go from the left point to the right point. From \((0, 4)\) to \((2, 1)\) the line goes down 3 and right 2.`, R`Going down means the rise is negative: rise \(= -3\), run \(= 2\).`, R`Slope \(= \frac{\text{rise}}{\text{run}} = -\frac{3}{2}\). The line goes down from left to right, so a negative slope makes sense.`],
      answer: R`\(-\frac{3}{2}\)`,
      visual: grid(-2, 6, { fns: [{ f: (x) => 4 - 1.5 * x }], segments: [{ from: [0, 4], to: [0, 1], dashed: true, label: 'down 3' }, { from: [0, 1], to: [2, 1], dashed: true, label: 'right 2' }], points: [{ x: 0, y: 4, label: '(0, 4)' }, { x: 2, y: 1, label: '(2, 1)' }], alt: 'A line going down from (0, 4) to (2, 1). Dashed segments show a drop of 3 and a move of 2 to the right.' }),
    },
    {
      title: 'The equation of a line from a table',
      problem: 'Write the equation of the linear relationship in the table.',
      steps: [R`Find the slope. From one row to the next, \(x\) goes up by 2 and \(y\) goes up by 4, so \(m = \frac{4}{2} = 2\).`, R`Find \(b\). Substitute the point \((2, 7)\) into \(y = mx + b\): \(7 = 2(2) + b\), so \(7 = 4 + b\) and \(b = 3\).`, R`The equation is \(y = 2x + 3\). Check with \((8, 19)\): \(2(8) + 3 = 19\). ✓`],
      answer: R`\(y = 2x + 3\)`,
      visual: xy([[2, 7], [4, 11], [6, 15], [8, 19]], 'A table of values: when x is 2, y is 7; when x is 4, y is 11; when x is 6, y is 15; when x is 8, y is 19.'),
    },
    {
      title: 'Word problem: a draining tank',
      word: true,
      problem: 'A water tank drains at a steady rate. After 2 minutes it holds 70 liters, and after 5 minutes it holds 40 liters. Write an equation for the amount of water y after x minutes. When is the tank empty?',
      steps: [R`The two facts are the points \((2, 70)\) and \((5, 40)\). Slope: \(m = \frac{40 - 70}{5 - 2} = -\frac{30}{3} = -10\). The tank loses 10 liters each minute.`, R`Find the starting amount. Substitute \((2, 70)\): \(70 = -10(2) + b\), so \(70 = -20 + b\) and \(b = 90\).`, R`The equation is \(y = -10x + 90\).`, R`The tank is empty when \(y = 0\): \(0 = -10x + 90\), so \(10x = 90\) and \(x = 9\).`],
      answer: R`\(y = -10x + 90\); the tank is empty after 9 minutes`,
    },
    {
      title: 'The variable on both sides',
      problem: R`Solve \(3(x - 2) = x + 8\).`,
      steps: [R`Distribute on the left: \(3x - 6 = x + 8\).`, R`Subtract \(x\) from both sides: \(2x - 6 = 8\).`, R`Add 6 to both sides: \(2x = 14\).`, R`Divide both sides by 2: \(x = 7\). Check: \(3(7 - 2) = 15\) and \(7 + 8 = 15\). ✓`],
      answer: R`\(x = 7\)`,
    },
    {
      title: 'How many solutions?',
      problem: R`How many solutions does each equation have? (a) \(4x + 6 = 2(2x + 3)\)   (b) \(4x + 6 = 2(2x + 5)\)   (c) \(4x + 6 = 2(x + 5)\)`,
      steps: [R`(a) Distribute: \(4x + 6 = 4x + 6\). Subtract \(4x\): \(6 = 6\). This is always true, so every number is a solution.`, R`(b) Distribute: \(4x + 6 = 4x + 10\). Subtract \(4x\): \(6 = 10\). This is never true, so there is no solution.`, R`(c) Distribute: \(4x + 6 = 2x + 10\). Subtract \(2x\): \(2x + 6 = 10\). Then \(2x = 4\) and \(x = 2\). There is exactly one solution.`],
      answer: '(a) infinitely many solutions; (b) no solution; (c) exactly one solution',
    },
  ],

  models: [
    {
      id: 'line-through-two-points',
      title: 'The line through two points',
      intro: 'Choose two points. The steps find the slope and the equation of the line, and the graph shows the rise and the run.',
      inputs: [{ name: 'x1', label: 'First point: x', type: 'int', min: -8, max: 8, value: 1 }, { name: 'y1', label: 'First point: y', type: 'int', min: -8, max: 8, value: 3 }, { name: 'x2', label: 'Second point: x', type: 'int', min: -8, max: 8, value: 3 }, { name: 'y2', label: 'Second point: y', type: 'int', min: -8, max: 8, value: 7 }],
      compute({ x1, y1, x2, y2 }) {
        if (x1 === x2 && y1 === y2) return { error: 'The two points are the same. Change one of them so that there are two different points.' };
        const points = [{ x: x1, y: y1, label: lab(x1, y1) }, { x: x2, y: y2, label: lab(x2, y2) }];
        const problem = R`Find the equation of the line through \(${point(x1, y1)}\) and \(${point(x2, y2)}\).`;
        const frame = { type: 'plot', x: [-10, 10], y: [-10, 10], step: [2, 2], square: true, points };
        if (x1 === x2) {
          return {
            problem,
            steps: [R`Both points have \(x = ${x1}\), so the line goes straight up and down.`, 'The run is 0, and dividing by 0 is not possible. A vertical line has no slope.', R`Every point on the line has \(x = ${x1}\), so that is its equation.`],
            answer: R`\(x = ${x1}\) (a vertical line)`,
            visual: { ...frame, vlines: [{ x: x1, dashed: false, color: 'a' }], alt: `A vertical line through ${lab(x1, y1)} and ${lab(x2, y2)}.` },
          };
        }
        const [dx, dy] = [x2 - x1, y2 - y1];
        const k = frac(dy, dx);
        const b = k.mul(-x1).add(y1);
        const kx1 = k.mul(x1);
        return {
          problem,
          steps: [
            R`Change in \(y\): \(${y2} - ${paren(y1)} = ${dy}\). Change in \(x\): \(${x2} - ${paren(x1)} = ${dx}\).`,
            R`Slope: \(m = ${ratio(dy, dx)}\).${dy === 0 ? ' The line is horizontal.' : ''}`,
            R`Substitute \(${point(x1, y1)}\) into \(y = mx + b\). The slope times \(${x1}\) is \(${kx1.tex()}\), so \(${y1} = ${kx1.tex()} + b\) and \(b = ${b.tex()}\).`,
            R`Check with \(${point(x2, y2)}\): \(${k.mul(x2).tex()} ${signed(b)} = ${y2}\). ✓`,
          ],
          answer: R`\(${eq(k, b)}\)`,
          visual: {
            ...frame,
            fns: [{ f: (x) => k.value * (x - x1) + y1 }],
            segments: dy === 0 ? [] : [{ from: [x1, y1], to: [x2, y1], dashed: true, label: `run ${txt(dx)}` }, { from: [x2, y1], to: [x2, y2], dashed: true, label: `rise ${txt(dy)}` }],
            alt: `The line through ${lab(x1, y1)} and ${lab(x2, y2)}. Dashed segments show a run of ${txt(dx)} and a rise of ${txt(dy)}.`,
          },
        };
      },
    },
    {
      id: 'variable-on-both-sides',
      title: 'Solve ax + b = cx + d',
      intro: 'Choose the four numbers. Each side of the equation is drawn as a line: the solution is where the lines cross.',
      inputs: [{ name: 'a', label: 'a (x-coefficient on the left)', type: 'int', min: -9, max: 9, value: 5 }, { name: 'b', label: 'b (number on the left)', type: 'int', min: -20, max: 20, value: -3 }, { name: 'c', label: 'c (x-coefficient on the right)', type: 'int', min: -9, max: 9, value: 2 }, { name: 'd', label: 'd (number on the right)', type: 'int', min: -20, max: 20, value: 12 }],
      compute({ a, b, c, d }) {
        const r = bothSides(a, b, c, d);
        const mid = r.x ? r.x.value : 0;
        const ys = [-5, 5].flatMap((t) => [a * (mid + t) + b, c * (mid + t) + d]);
        const pad = Math.max(2, (Math.max(...ys) - Math.min(...ys)) * 0.1);
        return {
          problem: R`Solve \(${linear(a, b)} = ${linear(c, d)}\).`,
          steps: r.steps,
          answer: r.answer,
          visual: {
            type: 'plot',
            x: [mid - 5, mid + 5],
            y: [Math.min(...ys) - pad, Math.max(...ys) + pad],
            fns: [{ f: (t) => a * t + b }, { f: (t) => c * t + d, color: 'b', dashed: a === c && b === d }],
            points: r.x ? [{ x: mid, y: a * mid + b, label: `x = ${r.x.text()}` }] : [],
            alt: r.x ? `Two lines, one for each side of the equation. They cross where x = ${r.x.text()}.` : a === c && b === d ? 'The two sides of the equation give the same line, so every value of x is a solution.' : 'Two parallel lines, one for each side of the equation. They never cross, so there is no solution.',
          },
        };
      },
    },
    {
      id: 'burning-candle',
      title: 'Word problem: a burning candle',
      word: true,
      intro: 'Change the height of the candle, how fast it burns and the number of hours.',
      inputs: [{ name: 'h', label: 'Height at the start (cm)', type: 'int', min: 10, max: 40, value: 24 }, { name: 'r', label: 'Centimeters burned each hour', type: 'number', min: 0.5, max: 5, step: 0.5, value: 1.5 }, { name: 't', label: 'Hours', type: 'int', min: 1, max: 20, value: 6 }],
      compute({ h, r, t }) {
        const y = h - r * t;
        const end = h / r;
        const gone = y <= 0;
        return {
          problem: `A candle is ${h} cm tall. It burns down ${num(r)} cm each hour. Write an equation for its height y after x hours. How tall is the candle after ${t} hours?`,
          steps: [
            R`The height at the start is \(${h}\) cm. That is the value of \(y\) when \(x = 0\), so \(b = ${h}\).`,
            R`The height goes down by \(${num(r)}\) cm each hour, so the slope is \(m = ${num(-r)}\).`,
            R`The equation is \(${eq(-r, h)}\).`,
            gone ? R`The candle is gone when \(y = 0\): \(${terms([[r, 'x']])} = ${h}\), so \(x = ${num(end, { places: 2 })}\). That is ${end === t ? 'exactly' : 'before'} ${t} hours.` : R`Substitute \(x = ${t}\): \(y = ${num(-r)}(${t}) + ${h} = ${num(y)}\).`,
          ],
          answer: gone ? R`\(${eq(-r, h)}\); after ${t} hours the candle has burned away` : R`\(${eq(-r, h)}\); after ${t} hours the candle is \(${num(y)}\) cm tall`,
          visual: {
            type: 'plot',
            x: [0, Math.ceil(end * 1.2) + 1],
            y: [0, h + 4],
            axisLabels: ['hours', 'cm'],
            fns: [{ f: (x) => h - r * x, domain: [0, end] }],
            points: [{ x: 0, y: h, label: lab(0, h) }, ...(gone ? [] : [{ x: t, y, label: lab(t, y), color: 'b' }])],
            alt: `A line going down from ${lab(0, h)} to the horizontal axis at ${num(end, { places: 2 })} hours. ${gone ? '' : `The point ${lab(t, y)} is marked.`}`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easySlopeFromGraph, easyReadEquation, easyEquationFromStory],
    medium: [mediumSlope, mediumEquationFromGraph, mediumLinearOrNot, mediumSolveBothSides],
    hard: [hardEquationFromPoints, hardStoryTwoValues, hardSolveDistribute, hardSolutionCount],
    challenge: [challengeFindK, challengeMissingCoordinate, challengeCompareRates],
  },
};
