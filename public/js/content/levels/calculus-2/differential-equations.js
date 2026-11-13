import { R, q, frac, terms, power, num, paren, checkEqual, close } from '../../lib/index.js';
import { M, K, exactChoices, funcChoices, fterms, lnCombo, checkODE } from './_shared.js';

// Euler's method: n steps of size h for dy/dx = f(x, y) starting at (x0, y0).
function euler(f, x0, y0, h, n) {
  let x = x0;
  let y = y0;
  for (let i = 0; i < n; i++) {
    y += h * f(x, y);
    x += h;
  }
  return y;
}
// A fine Runge–Kutta solve, used only by checks as the "true" value.
function rk4(f, x0, y0, x1, n = 2000) {
  const h = (x1 - x0) / n;
  let x = x0;
  let y = y0;
  for (let i = 0; i < n; i++) {
    const k1 = f(x, y);
    const k2 = f(x + h / 2, y + (h * k1) / 2);
    const k3 = f(x + h / 2, y + (h * k2) / 2);
    const k4 = f(x + h, y + h * k3);
    y += (h * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
    x += h;
  }
  return y;
}
const eTo = (cx2) => (cx2 === '' ? 'e' : `e^{${cx2}}`);
const Y = (tex) => M(`y = ${tex}`);
// Right-hand sides f(x, y) for slope fields.
const FIELDS = [
  { tex: 'x + y', f: (x, y) => x + y },
  { tex: 'x - y', f: (x, y) => x - y },
  { tex: 'y - x', f: (x, y) => y - x },
  { tex: 'xy', f: (x, y) => x * y },
  { tex: '2x - y', f: (x, y) => 2 * x - y },
  { tex: 'x + 2y', f: (x, y) => x + 2 * y },
  { tex: 'x^{2} - y', f: (x, y) => x * x - y },
  { tex: 'y^{2} - x', f: (x, y) => y * y - x },
  { tex: 'x', f: (x) => x },
  { tex: 'y', f: (x, y) => y },
];

// ───────────── Easy ─────────────

function easyWriteDE(rng) {
  const [y, t] = rng.pick([['y', 't'], ['P', 't'], ['N', 't'], ['T', 't'], ['y', 'x'], ['A', 't']]);
  const A = rng.int(2, 9) * 10;
  const lhs = R`\dfrac{d${y}}{d${t}}`;
  const cases = [
    { say: R`is proportional to \(${y}\)`, rhs: `k${y}` },
    { say: R`is proportional to the square of \(${y}\)`, rhs: `k${y}^{2}` },
    { say: R`is inversely proportional to \(${y}\)`, rhs: R`\dfrac{k}{${y}}` },
    { say: R`is proportional to the difference between \(${y}\) and \(${A}\)`, rhs: `k(${y} - ${A})` },
    { say: R`is proportional to the product of \(${y}\) and \(${A} - ${y}\)`, rhs: `k${y}(${A} - ${y})` },
    { say: R`is proportional to \(${t}\)`, rhs: `k${t}` },
    { say: R`is proportional to the square root of \(${y}\)`, rhs: R`k\sqrt{${y}}` },
    { say: R`is proportional to the product of \(${t}\) and \(${y}\)`, rhs: `k${t}${y}` },
  ];
  const i = rng.int(0, cases.length - 1);
  const cs = cases[i];
  const others = rng.shuffle(cases.filter((_, j) => j !== i)).slice(0, 2);
  const eq = (rhs) => M(`${lhs} = ${rhs}`);
  return q({
    prompt: R`Which differential equation says: "The rate of change of \(${y}\) with respect to \(${t}\) ${cs.say}"? Here \(k\) is a constant.`,
    correct: eq(cs.rhs),
    wrong: [
      { value: eq(others[0].rhs), why: R`Read the sentence again: "proportional to" a quantity means \(k\) times exactly that quantity.` },
      { value: M(`${y} = ${cs.rhs}`), why: R`A rate of change is a derivative. The left side must be \(${lhs}\), not \(${y}\).` },
      eq(others[1].rhs),
    ],
    solution: [
      R`"The rate of change of \(${y}\) with respect to \(${t}\)" is the derivative \(${lhs}\).`,
      R`"Is proportional to" means "equals a constant \(k\) times". So \(${lhs} = ${cs.rhs}\).`,
    ],
    rule: 0,
    skill: 'writing a differential equation',
  });
}

function easyVerify(rng) {
  const a = rng.int(2, 5);
  const c = rng.int(2, 6);
  const fam = rng.pick(['exp', 'poly', 'power', 'recip']);
  const set = {
    exp: {
      rhs: terms([[a, 'y']]), g: (x, y) => a * y,
      right: { tex: `${c}e^{${a}x}`, f: (x) => c * Math.exp(a * x) },
      wrongs: [
        { tex: `${a}e^{x}`, f: (x) => a * Math.exp(x), why: R`For \(y = ${a}e^{x}\), \(\frac{dy}{dx} = ${a}e^{x} = y\), which is not \(${a}y\).` },
        { tex: terms([[frac(a, 2), 'x^{2}']]), f: (x) => (a / 2) * x * x, why: R`That solves \(\frac{dy}{dx} = ${a}x\). Here the right side contains \(y\).` },
        { tex: `${c}x^{${a}}`, f: (x) => c * x ** a },
        { tex: `e^{x} + ${a}`, f: (x) => Math.exp(x) + a },
      ],
      test: R`\(\dfrac{dy}{dx} = ${a * c}e^{${a}x}\), and \(${a}y = ${a}\cdot ${c}e^{${a}x} = ${a * c}e^{${a}x}\). The two sides match.`,
    },
    poly: {
      rhs: terms([[2 * a, 'x']]), g: (x) => 2 * a * x,
      right: { tex: `${a}x^{2} + ${c}`, f: (x) => a * x * x + c },
      wrongs: [
        { tex: `${c}e^{${2 * a}x}`, f: (x) => c * Math.exp(2 * a * x), why: R`That solves \(\frac{dy}{dx} = ${2 * a}y\). Here the right side is \(${2 * a}x\).` },
        { tex: `${2 * a}x^{2} + ${c}`, f: (x) => 2 * a * x * x + c, why: R`Its derivative is \(${4 * a}x\), twice too large.` },
        { tex: `${2 * a}x + ${c}`, f: (x) => 2 * a * x + c },
        { tex: `${a}x^{2} + ${c}x`, f: (x) => a * x * x + c * x },
      ],
      test: R`\(\dfrac{dy}{dx} = ${2 * a}x\), which is exactly the right side. (Any constant may be added.)`,
    },
    power: {
      rhs: R`\dfrac{${a}y}{x}`, g: (x, y) => (a * y) / x,
      right: { tex: `${c}x^{${a}}`, f: (x) => c * x ** a },
      wrongs: [
        { tex: `${c}e^{${a}x}`, f: (x) => c * Math.exp(a * x), why: R`That solves \(\frac{dy}{dx} = ${a}y\). Here the right side is also divided by \(x\).` },
        { tex: `${c}x^{${a}} + 1`, f: (x) => c * x ** a + 1, why: R`Then \(\frac{${a}y}{x} = ${a * c}${power('x', a - 1)} + \frac{${a}}{x}\), which has an extra term.` },
        { tex: `x^{${a + 1}}`, f: (x) => x ** (a + 1) },
        { tex: `${a}x^{${c === a ? c + 1 : c}}`, f: (x) => a * x ** (c === a ? c + 1 : c) },
      ],
      test: R`\(\dfrac{dy}{dx} = ${a * c}${power('x', a - 1)}\), and \(\dfrac{${a}y}{x} = \dfrac{${a}\cdot ${c}x^{${a}}}{x} = ${a * c}${power('x', a - 1)}\). The two sides match.`,
    },
    recip: {
      rhs: R`-\dfrac{y}{x}`, g: (x, y) => -y / x,
      right: { tex: R`\dfrac{${c}}{x}`, f: (x) => c / x },
      wrongs: [
        { tex: `${c}x`, f: (x) => c * x, why: R`For \(y = ${c}x\), \(\frac{dy}{dx} = ${c}\) but \(-\frac{y}{x} = -${c}\).` },
        { tex: R`\dfrac{${c}}{x^{2}}`, f: (x) => c / (x * x), why: R`Its derivative is \(-\frac{${2 * c}}{x^{3}}\), but \(-\frac{y}{x} = -\frac{${c}}{x^{3}}\).` },
        { tex: `${c}e^{-x}`, f: (x) => c * Math.exp(-x) },
        { tex: `-${c}\\ln x`, f: (x) => -c * Math.log(x) },
      ],
      test: R`\(\dfrac{dy}{dx} = -\dfrac{${c}}{x^{2}}\), and \(-\dfrac{y}{x} = -\dfrac{${c}}{x^{2}}\). The two sides match.`,
    },
  }[fam];
  const xs = [0.5, 1, 1.5, 2];
  return q({
    prompt: R`Which function is a solution of the differential equation \(\dfrac{dy}{dx} = ${set.rhs}\)?`,
    ...funcChoices(set.right, set.wrongs, xs, Y),
    solution: [R`To test a function, substitute it into both sides of the equation.`, R`For \(y = ${set.right.tex}\): ${set.test}`, R`So \(y = ${set.right.tex}\) is a solution.`],
    rule: 1,
    skill: 'verifying a solution',
    check: () => checkODE(set.right.f, set.g, xs),
  });
}

function easySlopeAtPoint(rng) {
  const fld = rng.pick(FIELDS.slice(0, 8));
  const p = rng.int(-3, 3);
  const qy = rng.int(-3, 3);
  const slope = fld.f(p, qy);
  return q({
    prompt: R`In the slope field of \(\dfrac{dy}{dx} = ${fld.tex}\), what is the slope of the short segment drawn at the point \((${p}, ${qy})\)?`,
    correct: slope,
    wrong: [
      { value: fld.f(qy, p), why: R`The point is \((x, y) = (${p}, ${qy})\): substitute \(x = ${p}\) and \(y = ${qy}\), in that order.` },
      p !== 0 ? { value: frac(qy, p), why: R`That is the slope of the line from the origin to the point. A slope field gets its slopes from the differential equation.` } : null,
      -slope,
      slope + 1,
      slope - 2,
    ],
    solution: [R`A slope field shows, at each point, a segment whose slope is the value of \(\dfrac{dy}{dx}\) there.`, R`Substitute \(x = ${p}\) and \(y = ${qy}\) into \(${fld.tex}\): the slope is \(${slope}\).`],
    rule: 2,
    skill: 'slope fields',
    check: () => checkEqual(slope, fld.f(p, qy), 1e-12, 'slope'),
  });
}

// ───────────── Medium ─────────────

function mediumSlopeTable(rng) {
  const x0 = rng.int(-2, 0);
  const y0 = rng.int(-1, 1);
  const xs = [x0, x0 + 1, x0 + 2, x0 + 3];
  const ys = [y0 + 2, y0 + 1, y0, y0 - 1];
  const table = (f) => ys.map((y) => xs.map((x) => f(x, y)));
  const order = rng.shuffle(FIELDS);
  const right = order[0];
  const key = JSON.stringify(table(right.f));
  const wrong = order.slice(1).filter((w) => JSON.stringify(table(w.f)) !== key).slice(0, 3);
  const eq = (tex) => M(R`\dfrac{dy}{dx} = ${tex}`);
  const [tx, ty] = [xs[3], ys[0]];
  const [ux, uy] = [xs[0], ys[3]];
  return q({
    prompt: 'The table gives the slopes of the segments in a slope field at sixteen points. Which differential equation matches the table?',
    visual: {
      type: 'table',
      rowHeaders: true,
      headers: ['Slope at', ...xs.map((x) => R`\(x = ${x}\)`)],
      rows: ys.map((y) => [R`\(y = ${y}\)`, ...xs.map((x) => R`\(${right.f(x, y)}\)`)]),
      alt: `Table of slopes. Columns are x = ${xs.join(', ')}; rows are y = ${ys.join(', ')}. ${ys.map((y) => `Row y = ${y}: ${xs.map((x) => right.f(x, y)).join(', ')}.`).join(' ')}`,
    },
    correct: eq(right.tex),
    wrong: wrong.map((w, i) => {
      // a grid point where this equation disagrees with the table
      const [bx, by] = ys.flatMap((y) => xs.map((x) => [x, y])).find(([x, y]) => w.f(x, y) !== right.f(x, y));
      return i < 2 ? { value: eq(w.tex), why: R`Test the point \((${bx}, ${by})\): this equation gives slope \(${w.f(bx, by)}\), but the table shows \(${right.f(bx, by)}\).` } : eq(w.tex);
    }),
    solution: [
      R`Each entry is the value of \(\dfrac{dy}{dx}\) at that point, so test the equations at points from the table.`,
      R`At \((${tx}, ${ty})\) the table shows \(${right.f(tx, ty)}\), and at \((${ux}, ${uy})\) it shows \(${right.f(ux, uy)}\).`,
      R`\(\dfrac{dy}{dx} = ${right.tex}\) gives exactly these values, and it matches every other entry too.`,
    ],
    rule: 2,
    skill: 'slope fields',
    check: () => (wrong.length === 3 && wrong.every((w) => JSON.stringify(table(w.f)) !== key) ? true : 'a wrong equation gives the same table'),
  });
}

function mediumEuler(rng) {
  let a;
  let b;
  do {
    a = rng.int(-1, 2);
    b = rng.int(-1, 2);
  } while (b === 0);
  const x0 = rng.int(0, 1);
  const y0 = rng.int(1, 4);
  const h = rng.pick([0.5, 0.2, 0.1]);
  const f = (x, y) => a * x + b * y;
  const rhs = terms([[a, 'x'], [b, 'y']]);
  const m0 = f(x0, y0);
  const y1 = y0 + h * m0;
  const x1 = x0 + h;
  const m1 = f(x1, y1);
  const y2 = y1 + h * m1;
  const x2 = x0 + 2 * h;
  const n4 = (v) => num(v, { places: 4 });
  return q({
    prompt: R`Use Euler's method with two steps of size \(${num(h)}\) to approximate \(y(${num(x2)})\), given \(\dfrac{dy}{dx} = ${rhs}\) and \(y(${x0}) = ${y0}\).`,
    correct: Math.round(y2 * 1e4) / 1e4,
    wrong: [
      { value: Math.round(y1 * 1e4) / 1e4, why: R`That is the value after one step, at \(x = ${num(x1)}\). Take a second step.` },
      { value: Math.round((y0 + 2 * h * m0) * 1e4) / 1e4, why: R`The slope has to be recomputed at the new point \((${num(x1)}, ${n4(y1)})\) before the second step.` },
      a !== 0 ? { value: Math.round((y1 + h * f(x0, y1)) * 1e4) / 1e4, why: R`In the second step, \(x\) has moved to \(${num(x1)}\) as well.` } : null,
      Math.round((y2 + h * m1) * 1e4) / 1e4,
      Math.round((y0 + m0 + m1) * 1e4) / 1e4,
    ],
    solution: [
      R`Euler's method: new \(y\) = old \(y\) + (slope at the old point) × (step size).`,
      R`Step 1: at \((${x0}, ${y0})\) the slope is \(${n4(m0)}\), so \(y_{1} = ${y0} + ${num(h)}\cdot ${paren(Math.round(m0 * 1e4) / 1e4)} = ${n4(y1)}\) at \(x = ${num(x1)}\).`,
      R`Step 2: at \((${num(x1)}, ${n4(y1)})\) the slope is \(${n4(m1)}\), so \(y_{2} = ${n4(y1)} + ${num(h)}\cdot ${paren(Math.round(m1 * 1e4) / 1e4)} = ${n4(y2)}\).`,
      R`So \(y(${num(x2)}) \approx ${n4(y2)}\).`,
    ],
    rule: 3,
    skill: "Euler's method",
    check: () => checkEqual(euler(f, x0, y0, h, 2), y2, 1e-9, 'Euler value'),
  });
}

function mediumSeparable(rng) {
  const c = rng.int(2, 6);
  const fam = rng.pick(['xy', 'xOverY', 'ySquared']);
  if (fam === 'xy') {
    const m = rng.pick([1, 2, 3, -1, -2]);
    const ex = terms([[m, 'x^{2}']]);
    const sol = { tex: `${c}${eTo(ex)}`, f: (x) => c * Math.exp(m * x * x) };
    return q({
      prompt: R`Solve \(\dfrac{dy}{dx} = ${terms([[2 * m, 'xy']])}\) with \(y(0) = ${c}\).`,
      ...funcChoices(sol, [
        { tex: `${eTo(ex)} + ${c - 1}`, f: (x) => Math.exp(m * x * x) + c - 1, why: R`After exponentiating, the constant multiplies: \(y = Ce^{${ex}}\). It is not added.` },
        { tex: `${c}${eTo(terms([[2 * m, 'x^{2}']]))}`, f: (x) => c * Math.exp(2 * m * x * x), why: R`\(\displaystyle\int ${terms([[2 * m, 'x']])}\,dx = ${ex}\). The power rule divides by 2.` },
        { tex: terms([[m, 'x^{2}'], [c, '']]), f: (x) => m * x * x + c, why: R`That solves \(\frac{dy}{dx} = ${terms([[2 * m, 'x']])}\). The factor \(y\) must be moved to the left side first.` },
        { tex: `${c}${eTo(terms([[2 * m, 'x']]))}`, f: (x) => c * Math.exp(2 * m * x) },
      ], [0.3, 0.8, 1.4], Y),
      solution: [
        R`Separate the variables: \(\dfrac{dy}{y} = ${terms([[2 * m, 'x']])}\,dx\).`,
        R`Integrate both sides: \(\ln|y| = ${ex} + C_{1}\), so \(y = Ce^{${ex}}\).`,
        R`Use \(y(0) = ${c}\): \(C = ${c}\). So \(y = ${sol.tex}\).`,
      ],
      rule: 4,
      skill: 'separable equations',
      check: () => checkODE(sol.f, (x, y) => 2 * m * x * y, [0.3, 0.6, 0.9], [0, c]),
    });
  }
  if (fam === 'xOverY') {
    const a = rng.int(1, 5);
    const ax2 = terms([[a, 'x^{2}']]);
    const sol = { tex: R`\sqrt{${ax2} + ${c * c}}`, f: (x) => Math.sqrt(a * x * x + c * c) };
    return q({
      prompt: R`Solve \(\dfrac{dy}{dx} = \dfrac{${terms([[a, 'x']])}}{y}\) with \(y(0) = ${c}\).`,
      ...funcChoices(sol, [
        { tex: R`\sqrt{${ax2} + ${c}}`, f: (x) => Math.sqrt(a * x * x + c), why: R`Put \(x = 0\), \(y = ${c}\) into \(y^{2} = ${ax2} + C\): \(C = ${c * c}\).` },
        { tex: R`\sqrt{${ax2}} + ${c}`, f: (x) => Math.sqrt(a) * x + c, why: R`The constant belongs inside the square root: first \(y^{2} = ${ax2} + C\), then take the root.` },
        { tex: terms([[frac(a, 2), 'x^{2}'], [c, '']]), f: (x) => (a / 2) * x * x + c, why: R`That solves \(\frac{dy}{dx} = ${terms([[a, 'x']])}\). Multiply both sides by \(y\) first.` },
        { tex: R`\sqrt{${terms([[frac(a, 2), 'x^{2}']])} + ${c * c}}`, f: (x) => Math.sqrt((a / 2) * x * x + c * c) },
      ], [0.3, 0.8, 1.4], Y),
      solution: [
        R`Separate the variables: \(y\,dy = ${terms([[a, 'x']])}\,dx\).`,
        R`Integrate both sides: \(\dfrac{y^{2}}{2} = ${terms([[frac(a, 2), 'x^{2}']])} + C_{1}\), so \(y^{2} = ${ax2} + C\).`,
        R`Use \(y(0) = ${c}\): \(C = ${c * c}\). Since \(y(0) > 0\), take the positive root: \(y = ${sol.tex}\).`,
      ],
      rule: 4,
      skill: 'separable equations',
      check: () => checkODE(sol.f, (x, y) => (a * x) / y, [0.3, 0.8, 1.4], [0, c]),
    });
  }
  const a = rng.int(1, 3);
  const xs = [0.1, 0.2, 0.3].map((t) => t / (a * c));
  const den = (sign) => `1 ${sign} ${a * c}x`;
  const sol = { tex: R`\dfrac{${c}}{${den('-')}}`, f: (x) => c / (1 - a * c * x) };
  return q({
    prompt: R`Solve \(\dfrac{dy}{dx} = ${terms([[a, 'y^{2}']])}\) with \(y(0) = ${c}\).`,
    ...funcChoices(sol, [
      { tex: R`\dfrac{${c}}{${den('+')}}`, f: (x) => c / (1 + a * c * x), why: R`\(\displaystyle\int y^{-2}\,dy = -\dfrac{1}{y}\). Keep track of that minus sign.` },
      { tex: `${c}e^{${a === 1 ? '' : a}x}`, f: (x) => c * Math.exp(a * x), why: R`That solves \(\frac{dy}{dx} = ${terms([[a, 'y']])}\). Here \(y\) is squared, so \(\int \frac{dy}{y^{2}}\) is not a logarithm.` },
      { tex: R`\dfrac{1}{${c} - ${a === 1 ? '' : a}x}`, f: (x) => 1 / (c - a * x) },
      { tex: terms([[a, 'x'], [c, '']]), f: (x) => a * x + c },
    ], xs, Y),
    solution: [
      R`Separate the variables: \(\dfrac{dy}{y^{2}} = ${a}\,dx\).`,
      R`Integrate both sides: \(-\dfrac{1}{y} = ${terms([[a, 'x']])} + C\).`,
      R`Use \(y(0) = ${c}\): \(C = -\dfrac{1}{${c}}\). Then \(\dfrac{1}{y} = \dfrac{1}{${c}} - ${terms([[a, 'x']])}\), so \(y = ${sol.tex}\).`,
    ],
    rule: 4,
    skill: 'separable equations',
    check: () => checkODE(sol.f, (x, y) => a * y * y, xs, [0, c]),
  });
}

function mediumWordGrowth(rng) {
  const T = rng.int(2, 10);
  const n = rng.int(2, 4);
  if (rng.bool()) {
    const r = rng.int(2, 3);
    const y0 = rng.int(1, 9) * 100;
    const ans = y0 * r ** n;
    return q({
      prompt: R`A colony of bacteria grows at a rate proportional to its size. It has ${y0} cells at first and ${y0 * r} cells after ${T} hours. How many cells does it have after ${n * T} hours?`,
      correct: ans,
      unit: 'cells',
      wrong: [
        { value: y0 + n * (y0 * r - y0), why: R`That adds the same number of cells every ${T} hours. Growth proportional to size multiplies by the same factor every ${T} hours.` },
        { value: y0 * r * n, why: R`Every ${T} hours the colony is multiplied by \(${r}\). After ${n} such periods the factor is \(${r}^{${n}}\), not \(${r}\cdot ${n}\).` },
        y0 * r ** (n - 1),
        y0 * r ** (n + 1),
      ],
      solution: [
        R`"Rate proportional to size" means \(\dfrac{dy}{dt} = ky\), so \(y = ${y0}e^{kt}\).`,
        R`From the data, \(e^{${T}k} = \dfrac{${y0 * r}}{${y0}} = ${r}\): the colony is multiplied by \(${r}\) every ${T} hours.`,
        R`${n * T} hours is ${n} such periods: \(y = ${y0}\cdot ${r}^{${n}} = ${num(ans)}\) cells.`,
      ],
      rule: 5,
      skill: 'exponential growth and decay',
      check: () => checkEqual(y0 * Math.exp((Math.log(r) / T) * n * T), ans, 1e-9, 'population'),
    });
  }
  const left = rng.int(1, 9) * 5;
  const y0 = left * 2 ** n;
  return q({
    prompt: R`A radioactive sample decays at a rate proportional to the amount present. Its half-life is ${T} days. If the sample starts with ${y0} milligrams, how much is left after ${n * T} days?`,
    correct: left,
    unit: 'mg',
    wrong: [
      { value: frac(y0, 2 * n), why: R`Each half-life halves what is left. After ${n} half-lives the fraction is \(\left(\frac{1}{2}\right)^{${n}}\), not \(\frac{1}{${2 * n}}\).` },
      { value: 0, why: 'Exponential decay never reaches 0. Each half-life removes half of what remains, not half of the original amount.' },
      left * 2,
      left / 2,
      y0 / 2,
    ],
    solution: [
      R`"Rate proportional to the amount" means \(\dfrac{dy}{dt} = ky\) with \(k < 0\), so \(y = ${y0}e^{kt}\).`,
      R`A half-life of ${T} days means the amount is multiplied by \(\frac{1}{2}\) every ${T} days.`,
      R`${n * T} days is ${n} half-lives: \(y = ${y0}\cdot\left(\frac{1}{2}\right)^{${n}} = ${left}\) mg.`,
    ],
    rule: 5,
    skill: 'exponential growth and decay',
    check: () => checkEqual(y0 * Math.exp((-Math.log(2) / T) * n * T), left, 1e-9, 'amount'),
  });
}

// ───────────── Hard ─────────────

function hardSeparable(rng) {
  const c = rng.int(2, 6);
  const a = rng.int(1, 3);
  const fam = rng.pick(['cos', 'expNeg', 'shift', 'tan']);
  const A = a === 1 ? '' : String(a);
  if (fam === 'cos') {
    const sol = { tex: `${c}e^{${A}\\sin x}`, f: (x) => c * Math.exp(a * Math.sin(x)) };
    return q({
      prompt: R`Solve \(\dfrac{dy}{dx} = ${A}y\cos x\) with \(y(0) = ${c}\).`,
      ...funcChoices(sol, [
        { tex: `e^{${A}\\sin x} + ${c - 1}`, f: (x) => Math.exp(a * Math.sin(x)) + c - 1, why: R`After exponentiating, the constant multiplies: \(y = Ce^{${A}\sin x}\). It is not added.` },
        { tex: `${c} + ${A}\\sin x`, f: (x) => c + a * Math.sin(x), why: R`That ignores the factor \(y\). Divide by \(y\) first, which leads to a logarithm.` },
        { tex: `${c}e^{-${A}\\sin x}`, f: (x) => c * Math.exp(-a * Math.sin(x)) },
        { tex: `${c}e^{${A}\\cos x}`, f: (x) => c * Math.exp(a * Math.cos(x)) },
      ], [0.3, 0.8, 1.4], Y),
      solution: [R`Separate: \(\dfrac{dy}{y} = ${A}\cos x\,dx\).`, R`Integrate: \(\ln|y| = ${A}\sin x + C_{1}\), so \(y = Ce^{${A}\sin x}\).`, R`Use \(y(0) = ${c}\): \(C = ${c}\). So \(y = ${sol.tex}\).`],
      rule: 4,
      skill: 'separable equations',
      check: () => checkODE(sol.f, (x, y) => a * y * Math.cos(x), [0.3, 0.8, 1.4], [0, c]),
    });
  }
  if (fam === 'expNeg') {
    const mx2 = terms([[a, 'x^{2}']]);
    const sol = { tex: R`\ln(${mx2} + 1)`, f: (x) => Math.log(a * x * x + 1) };
    return q({
      prompt: R`Solve \(\dfrac{dy}{dx} = ${terms([[2 * a, 'x']])}e^{-y}\) with \(y(0) = 0\).`,
      ...funcChoices(sol, [
        { tex: R`\ln(${terms([[2 * a, 'x^{2}']])} + 1)`, f: (x) => Math.log(2 * a * x * x + 1), why: R`\(\displaystyle\int ${terms([[2 * a, 'x']])}\,dx = ${mx2}\). The power rule divides by 2.` },
        { tex: mx2, f: (x) => a * x * x, why: R`That is \(e^{y} - 1\). Solve \(e^{y} = ${mx2} + 1\) for \(y\) by taking a logarithm.` },
        { tex: R`-\ln(1 - ${mx2})`, f: (x) => -Math.log(1 - a * x * x), why: R`Multiply both sides by \(e^{y}\): the left side becomes \(e^{y}\,dy\), not \(e^{-y}\,dy\).` },
        { tex: R`\ln(${mx2}) + 1`, f: (x) => Math.log(a * x * x) + 1 },
      ], [0.2, 0.35, 0.5], Y),
      solution: [R`Separate: \(e^{y}\,dy = ${terms([[2 * a, 'x']])}\,dx\).`, R`Integrate: \(e^{y} = ${mx2} + C\).`, R`Use \(y(0) = 0\): \(1 = C\). So \(e^{y} = ${mx2} + 1\) and \(y = ${sol.tex}\).`],
      rule: 4,
      skill: 'separable equations',
      check: () => checkODE(sol.f, (x, y) => 2 * a * x * Math.exp(-y), [0.2, 0.35, 0.5], [0, 0]),
    });
  }
  if (fam === 'shift') {
    const k = rng.pick([-3, -2, -1, 1, 2]);
    const b = rng.int(1, 9);
    const y0 = b + rng.nonzero(-6, 6);
    const d = y0 - b;
    const E = k === 1 ? 'e^{x}' : k === -1 ? 'e^{-x}' : `e^{${k}x}`;
    const sol = { tex: terms([[b, ''], [d, E]]), f: (x) => b + d * Math.exp(k * x) };
    return q({
      prompt: R`Solve \(\dfrac{dy}{dx} = ${k === 1 ? '' : k === -1 ? '-' : k}(y - ${b})\) with \(y(0) = ${y0}\).`,
      ...funcChoices(sol, [
        { tex: terms([[b, ''], [y0, E]]), f: (x) => b + y0 * Math.exp(k * x), why: R`At \(x = 0\) this gives \(${b + y0}\). The constant is \(y(0) - ${b} = ${d}\).` },
        { tex: terms([[y0, E]]), f: (x) => y0 * Math.exp(k * x), why: R`That solves \(\frac{dy}{dx} = ${terms([[k, 'y']])}\). Here the right side is a multiple of \(y - ${b}\), so \(y - ${b}\) is what grows or decays exponentially.` },
        { tex: terms([[b, ''], [d, k === 1 ? 'e^{-x}' : k === -1 ? 'e^{x}' : `e^{${-k}x}`]]), f: (x) => b + d * Math.exp(-k * x) },
        { tex: terms([[d, ''], [b, E]]), f: (x) => d + b * Math.exp(k * x) },
      ], [0.3, 0.8, 1.4], Y),
      solution: [
        R`Separate: \(\dfrac{dy}{y - ${b}} = ${k}\,dx\).`,
        R`Integrate: \(\ln|y - ${b}| = ${terms([[k, 'x']])} + C_{1}\), so \(y - ${b} = C${E}\).`,
        R`Use \(y(0) = ${y0}\): \(C = ${y0} - ${b} = ${d}\). So \(y = ${sol.tex}\).`,
      ],
      rule: 4,
      skill: 'separable equations',
      check: () => checkODE(sol.f, (x, y) => k * (y - b), [0.3, 0.8, 1.4], [0, y0]),
    });
  }
  const ax2 = terms([[a, 'x^{2}']]);
  const sol = { tex: R`\tan(${ax2})`, f: (x) => Math.tan(a * x * x) };
  return q({
    prompt: R`Solve \(\dfrac{dy}{dx} = ${terms([[2 * a, 'x']])}(1 + y^{2})\) with \(y(0) = 0\).`,
    ...funcChoices(sol, [
      { tex: R`\arctan(${ax2})`, f: (x) => Math.atan(a * x * x), why: R`Integrating gives \(\arctan y = ${ax2}\). Solving for \(y\) applies the tangent, not the arctangent.` },
      { tex: R`\tan(${terms([[2 * a, 'x^{2}']])})`, f: (x) => Math.tan(2 * a * x * x), why: R`\(\displaystyle\int ${terms([[2 * a, 'x']])}\,dx = ${ax2}\). The power rule divides by 2.` },
      { tex: ax2, f: (x) => a * x * x, why: R`That ignores the factor \(1 + y^{2}\). Divide by it first.` },
      { tex: `e^{${ax2}} - 1`, f: (x) => Math.exp(a * x * x) - 1 },
    ], [0.2, 0.4, 0.6], Y),
    solution: [R`Separate: \(\dfrac{dy}{1 + y^{2}} = ${terms([[2 * a, 'x']])}\,dx\).`, R`Integrate: \(\arctan y = ${ax2} + C\).`, R`Use \(y(0) = 0\): \(C = 0\). So \(y = ${sol.tex}\).`],
    rule: 4,
    skill: 'separable equations',
    check: () => checkODE(sol.f, (x, y) => 2 * a * x * (1 + y * y), [0.2, 0.4, 0.6], [0, 0]),
  });
}

function hardWordCooling(rng) {
  const Ts = rng.pick([18, 20, 22, 25]);
  const [rn, rd, D0s] = rng.pick([[1, 2, [16, 32, 48, 64, 80]], [1, 3, [27, 54, 81]], [2, 3, [27, 54]], [3, 4, [64]]]);
  const D0 = rng.pick(D0s);
  const t1 = rng.pick([5, 10, 15, 20]);
  const n = rd === 2 ? rng.int(2, 3) : 2;
  const T0 = Ts + D0;
  const T1 = Ts + (D0 * rn) / rd;
  const ans = Ts + (D0 * rn ** n) / rd ** n;
  const what = rng.pick(['A bowl of soup', 'A mug of tea', 'A tray of cookies']);
  const r = frac(rn, rd);
  return q({
    prompt: R`${what} at ${T0}°C is left to cool in a room kept at ${Ts}°C. After ${t1} minutes its temperature is ${T1}°C. Assuming Newton's law of cooling, what is its temperature after ${n * t1} minutes?`,
    correct: ans,
    unit: '°C',
    wrong: [
      { value: T0 - n * (T0 - T1), why: R`That assumes it loses the same number of degrees every ${t1} minutes. Cooling slows down as the temperature gets closer to the room's.` },
      { value: Math.round(T0 * (T1 / T0) ** n * 10) / 10, why: R`The quantity that decays exponentially is the difference from room temperature, \(T - ${Ts}\), not \(T\) itself.` },
      { value: Ts, why: 'The temperature approaches room temperature but does not reach it in a finite time.' },
      T1,
      ans + 2,
    ],
    solution: [
      R`Newton's law of cooling: \(\dfrac{dT}{dt} = -k(T - ${Ts})\), so the difference \(T - ${Ts}\) decays exponentially.`,
      R`The difference starts at \(${T0} - ${Ts} = ${D0}\) and is \(${T1} - ${Ts} = ${(D0 * rn) / rd}\) after ${t1} minutes: it is multiplied by \(${r.tex()}\) every ${t1} minutes.`,
      R`After ${n * t1} minutes the difference is \(${D0}\cdot\left(${r.tex()}\right)^{${n}} = ${(D0 * rn ** n) / rd ** n}\), so \(T = ${Ts} + ${(D0 * rn ** n) / rd ** n} = ${ans}\)°C.`,
    ],
    rule: 5,
    skill: "Newton's law of cooling",
    check: () => {
      const k = -Math.log(rn / rd) / t1;
      const T = (t) => Ts + D0 * Math.exp(-k * t);
      return close(T(t1), T1, 1e-9) && close(T(n * t1), ans, 1e-9) ? checkODE(T, (t, y) => -k * (y - Ts), [1, 4, 9]) : 'model does not fit the data';
    },
  });
}

function hardLogistic(rng) {
  const form = rng.bool();
  let M;
  let k;
  do {
    M = rng.pick([200, 400, 500, 600, 800, 1000, 1200]);
    k = rng.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8]);
    // In the factored form the coefficient k/M is printed, so it must be a short exact decimal.
  } while (!form && Math.abs((k / M) * 1e5 - Math.round((k / M) * 1e5)) > 1e-9);
  const rhs = form ? R`${num(k)}P\left(1 - \dfrac{P}{${M}}\right)` : R`${num(k / M)}P(${M} - P)`;
  const g = (P) => k * P * (1 - P / M);
  const ask = rng.pick(['capacity', 'fastest', 'maxrate', 'limit']);
  const base = R`A population \(P(t)\) satisfies the logistic equation \(\dfrac{dP}{dt} = ${rhs}\)`;
  const P0 = rng.pick([M / 10, M / 4, (3 * M) / 2]);
  const zero = R`The growth rate is 0 when \(P = 0\) or \(P = ${M}\). Below \(${M}\) the population grows; above it, the population shrinks.`;
  if (ask === 'capacity' || ask === 'limit') {
    return q({
      prompt: ask === 'capacity' ? R`${base}. What is the carrying capacity?` : R`${base}, with \(P(0) = ${P0}\). What is \(\displaystyle\lim_{t\to\infty} P(t)\)?`,
      correct: M,
      wrong: [
        { value: M / 2, why: R`\(P = ${M / 2}\) is where the population grows fastest. It keeps growing until it levels off at the carrying capacity.` },
        ask === 'limit' ? { value: P0, why: R`\(${P0}\) is only the starting value. The population moves toward the level where \(\frac{dP}{dt} = 0\).` } : { value: (k * M) / 4, why: R`That is the greatest growth rate, not a population size.` },
        2 * M,
        M / 4,
        M + 100,
      ],
      solution: [zero, ask === 'capacity' ? R`So the population levels off at the carrying capacity, \(${M}\).` : R`Starting from \(P(0) = ${P0}\), the population ${P0 < M ? 'rises' : 'falls'} toward \(${M}\). The limit is \(${M}\).`],
      rule: 6,
      skill: 'logistic model',
      check: () => (Math.abs(g(M)) < 1e-9 && g(M * 0.9) > 0 && g(M * 1.1) < 0 ? true : 'M is not a stable equilibrium'),
    });
  }
  const want = ask === 'fastest' ? M / 2 : (k * M) / 4;
  // The greatest rate, written by substituting P = M/2 into the equation in the form it was given.
  const atHalf = form ? R`${num(k)}\cdot ${M / 2}\cdot\left(1 - \dfrac{1}{2}\right)` : R`${num(k / M)}\cdot ${M / 2}\cdot (${M} - ${M / 2})`;
  return q({
    prompt: ask === 'fastest' ? R`${base}. For what population size is the population growing fastest?` : R`${base}. What is the greatest possible growth rate \(\dfrac{dP}{dt}\)?`,
    correct: want,
    wrong:
      ask === 'fastest'
        ? [{ value: M, why: R`At \(P = ${M}\) the growth rate is 0. The rate is greatest halfway to the carrying capacity.` }, { value: (k * M) / 4, why: 'That is the greatest growth rate. The question asks for the population size at which it happens.' }, M / 4, M / 10, (3 * M) / 4]
        : [
            { value: M / 2, why: R`That is the population at which growth is fastest. Substitute it into the equation to get the rate.` },
            { value: k * M, why: R`The rate is greatest at \(P = ${M / 2}\), where it equals \(${atHalf} = ${num((k * M) / 4)}\).` },
            (k * M) / 2,
            k * M * 2,
            (k * M) / 8,
          ],
    solution: [
      R`The growth rate is a quadratic in \(P\) that is 0 at \(P = 0\) and \(P = ${M}\). Its maximum is halfway between: \(P = ${M / 2}\), half the carrying capacity.`,
      ask === 'fastest' ? R`So the population grows fastest when \(P = ${M / 2}\).` : R`At \(P = ${M / 2}\): \(\dfrac{dP}{dt} = ${atHalf} = ${num((k * M) / 4)}\).`,
    ],
    rule: 6,
    skill: 'logistic model',
    check: () => {
      let best = 0;
      for (let i = 1; i <= 2000; i++) if (g((M * i) / 2000) > g(best)) best = (M * i) / 2000;
      return checkEqual(ask === 'fastest' ? best : g(best), want, 1e-6, 'maximum');
    },
  });
}

// ───────────── Challenge ─────────────

function challengeEulerEstimate(rng) {
  const c = rng.int(1, 5);
  const a = rng.int(2, 8);
  const fam = rng.pick(['exp', 'toward', 'toward', 'sum', 'recip']);
  const set = {
    exp: () => {
      const k = rng.pick([1, 2, -1, -2]);
      return { rhs: terms([[k, 'y']]), y0: c, f: (x, y) => k * y, up: true, rising: k > 0, y2: R`\dfrac{d^{2}y}{dx^{2}} = ${terms([[k, R`\dfrac{dy}{dx}`]])} = ${terms([[k * k, 'y']])}`, sign: R`positive, because \(y > 0\)` };
    },
    toward: () => {
      const y0 = a + rng.pick([-1, 1]) * rng.int(1, a - 1 > 0 ? Math.min(a - 1, 4) : 1);
      const below = y0 < a;
      return { rhs: `${a} - y`, y0, f: (x, y) => a - y, up: !below, rising: below, y2: R`\dfrac{d^{2}y}{dx^{2}} = -\dfrac{dy}{dx} = -(${a} - y)`, sign: below ? R`negative, because \(y < ${a}\)` : R`positive, because \(y > ${a}\)` };
    },
    sum: () => ({ rhs: 'x + y', y0: c, f: (x, y) => x + y, up: true, rising: true, y2: R`\dfrac{d^{2}y}{dx^{2}} = 1 + \dfrac{dy}{dx} = 1 + x + y`, sign: R`positive for \(x \ge 0\), because \(y > 0\)` }),
    recip: () => ({ rhs: R`\dfrac{1}{y}`, y0: c, f: (x, y) => 1 / y, up: false, rising: true, y2: R`\dfrac{d^{2}y}{dx^{2}} = -\dfrac{1}{y^{2}}\cdot\dfrac{dy}{dx} = -\dfrac{1}{y^{3}}`, sign: R`negative, because \(y > 0\)` }),
  }[fam]();
  const UNDER = 'An underestimate, because the solution curve is concave up';
  const OVER = 'An overestimate, because the solution curve is concave down';
  const moving = set.rising ? 'increasing' : 'decreasing';
  return q({
    prompt: R`Euler's method with a few equal steps is used to approximate \(y(1)\), where \(\dfrac{dy}{dx} = ${set.rhs}\) and \(y(0) = ${set.y0}\). Is the approximation an overestimate or an underestimate, and why?`,
    correct: set.up ? UNDER : OVER,
    wrong: [
      { value: set.up ? OVER : UNDER, why: R`Check the sign of \(\dfrac{d^{2}y}{dx^{2}}\) by differentiating the equation. Here it is ${set.sign}.` },
      { value: `${set.up ? 'An overestimate' : 'An underestimate'}, because the solution is ${moving}`, why: 'Whether Euler\'s method lands above or below depends on concavity, not on whether the solution rises or falls.' },
      { value: "Exact, because each step follows the tangent line", why: 'A tangent line matches the curve only at the point of tangency. The curve bends away from it.' },
    ],
    solution: [
      R`Each Euler step follows a tangent line. Tangent lines lie below a concave-up curve and above a concave-down curve.`,
      R`Differentiate the equation: \(${set.y2}\), which is ${set.sign} along this solution.`,
      set.up ? 'The solution is concave up, so the Euler approximation is an underestimate.' : 'The solution is concave down, so the Euler approximation is an overestimate.',
    ],
    rule: 3,
    skill: "Euler's method",
    check: () => {
      const approx = euler(set.f, 0, set.y0, 0.25, 4);
      const exact = rk4(set.f, 0, set.y0, 1);
      return approx < exact === set.up ? true : `Euler ${approx} vs exact ${exact} contradicts the key`;
    },
  });
}

function challengeFindRate(rng) {
  const T = rng.int(2, 12);
  const [word, factor, what] = rng.pick([['doubles', 2, 'A population'], ['triples', 3, 'A population'], ['is multiplied by 5', 5, 'An investment'], ['halves', frac(1, 2), 'The amount of a medicine in the blood'], ['falls to one third of its value', frac(1, 3), 'The charge on a capacitor']]);
  const growing = typeof factor === 'number';
  const base = growing ? factor : factor.d;
  const sign = growing ? 1 : -1;
  const right = lnCombo([[frac(sign, T), base]]);
  const opt = (tex, value) => ({ tex, value });
  return q({
    prompt: R`${what} \(y\) changes at a rate proportional to itself, \(\dfrac{dy}{dt} = ky\), and it ${word} every ${T} ${growing ? 'years' : 'hours'}. Find \(k\).`,
    ...exactChoices(
      right,
      [
        { k: opt(growing ? frac(base, T).tex() : frac(-1, base * T).tex(), growing ? base / T : -1 / (base * T)), why: R`Solve \(e^{${T}k} = ${growing ? base : frac(1, base).tex()}\) with a logarithm. The factor itself is not divided by the time.` },
        { k: lnCombo([[sign * T, base]]), why: R`From \(${T}k = ${growing ? '' : '-'}\ln ${base}\), divide by \(${T}\).` },
        { k: lnCombo([[frac(-sign, T), base]]), why: growing ? R`The quantity grows, so \(k\) is positive.` : R`The quantity shrinks, so \(k\) is negative: \(\ln\frac{1}{${base}} = -\ln ${base}\).` },
        opt(R`\dfrac{${T}}{\ln ${base}}`, T / Math.log(base)),
        lnCombo([[frac(sign, T), base + 1]]),
      ],
      (tex) => R`\(k = ${tex}\)`,
    ),
    solution: [
      R`The solution of \(\dfrac{dy}{dt} = ky\) is \(y = y_{0}e^{kt}\).`,
      R`"${word[0].toUpperCase()}${word.slice(1)} every ${T} ${growing ? 'years' : 'hours'}" means \(e^{${T}k} = ${growing ? base : frac(1, base).tex()}\).`,
      R`Take logarithms: \(${T}k = ${growing ? '' : '-'}\ln ${base}\), so \(k = ${right.tex} \approx ${num(right.value, { places: 3 })}\).`,
    ],
    rule: 5,
    skill: 'exponential growth and decay',
    check: () => checkEqual(Math.exp(right.value * T), growing ? base : 1 / base, 1e-9, 'growth factor'),
  });
}

function challengeWordMixing(rng) {
  const [V, r] = rng.pick([[100, 5], [100, 10], [200, 5], [200, 10], [200, 20], [300, 10], [400, 20], [400, 10], [500, 25], [600, 20]]);
  const [n, nth] = rng.pick([[2, 'half'], [3, 'one third'], [4, 'one quarter'], [5, 'one fifth'], [10, 'one tenth']]);
  const S0 = rng.int(2, 9) * 100;
  const tau = V / r;
  const right = lnCombo([[tau, n]]);
  const mins = (tex) => R`\(${tex}\) minutes`;
  return q({
    prompt: R`A tank holds ${V} liters of salt water containing ${S0} grams of salt. Fresh water flows in at ${r} liters per minute, and the well-mixed solution flows out at the same rate, so the amount of salt \(S\) satisfies \(\dfrac{dS}{dt} = -\dfrac{${r}}{${V}}S\). After how many minutes is only ${nth} of the salt left?`,
    ...exactChoices(
      right,
      [
        { k: { tex: frac(tau * (n - 1), n).tex(), value: (tau * (n - 1)) / n }, why: 'That assumes salt leaves at a constant rate. The rate falls as the water gets less salty, so the decay is exponential.' },
        { k: lnCombo([[frac(r, V), n]]), why: R`From \(e^{-t/${tau}} = \frac{1}{${n}}\): \(t = ${tau}\ln ${n}\). Multiply by \(${tau}\), do not divide.` },
        { k: { tex: frac(tau, n).tex(), value: tau / n } },
        lnCombo([[tau, n + 1]]),
        { tex: String(tau), value: tau },
      ],
      mins,
    ),
    solution: [
      R`The equation is \(\dfrac{dS}{dt} = kS\) with \(k = -\dfrac{${r}}{${V}} = -\dfrac{1}{${tau}}\), so \(S = ${S0}e^{-t/${tau}}\).`,
      R`Set \(${S0}e^{-t/${tau}} = \dfrac{${S0}}{${n}}\): \(e^{-t/${tau}} = \dfrac{1}{${n}}\).`,
      R`Take logarithms: \(-\dfrac{t}{${tau}} = -\ln ${n}\), so \(t = ${tau}\ln ${n}${right.tex === `${tau}\\ln ${n}` ? '' : ` = ${right.tex}`} \approx ${num(right.value, { places: 1 })}\) minutes.`,
    ],
    rule: 5,
    skill: 'exponential growth and decay',
    check: () => checkEqual(S0 * Math.exp((-r / V) * right.value), S0 / n, 1e-9, 'salt left'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'differential-equations',
  title: 'Differential Equations',
  summary: 'Write, check and solve differential equations: slope fields, Euler steps, separation of variables and growth models.',
  standards: ['AP Calculus 7.1', 'AP Calculus 7.2', 'AP Calculus 7.3', 'AP Calculus 7.4', 'AP Calculus 7.5', 'AP Calculus 7.6', 'AP Calculus 7.7', 'AP Calculus 7.8', 'AP Calculus 7.9'],

  explain: {
    intro: R`A differential equation is an equation that involves a function and its derivatives, such as \(\dfrac{dy}{dx} = 2y\). Its solutions are functions, not numbers. Many laws of nature say how fast something changes, so they are differential equations. This lesson shows how to write them, picture them, approximate their solutions and solve the separable ones exactly.`,
    rules: [
      {
        title: 'Writing a differential equation',
        text: R`"The rate of change of \(y\)" is \(\dfrac{dy}{dt}\). "Is proportional to" means "equals a constant \(k\) times". Translate the sentence piece by piece.`,
        example: R`"A population grows at a rate proportional to its size": \(\dfrac{dP}{dt} = kP\).`,
      },
      {
        title: 'Verifying a solution',
        text: R`A function is a solution if substituting it and its derivative makes the equation true for every \(x\). A particular solution must also satisfy the initial condition.`,
        example: R`\(y = 3e^{2x}\) solves \(\dfrac{dy}{dx} = 2y\), because \(\dfrac{dy}{dx} = 6e^{2x} = 2(3e^{2x})\).`,
      },
      {
        title: 'Slope fields',
        text: R`For \(\dfrac{dy}{dx} = f(x, y)\), draw at each point \((x, y)\) a short segment of slope \(f(x, y)\). Solution curves follow the segments. Segments are horizontal wherever \(f(x, y) = 0\).`,
        example: R`For \(\dfrac{dy}{dx} = x - y\), the segment at \((2, 1)\) has slope \(1\), and every segment on the line \(y = x\) is horizontal.`,
      },
      {
        title: "Euler's method",
        text: R`Step along tangent lines: \(y_{\text{new}} = y_{\text{old}} + f(x_{\text{old}}, y_{\text{old}})\cdot\Delta x\), then recompute the slope at the new point. Smaller steps give better approximations. The result is an underestimate if the solution is concave up, an overestimate if it is concave down.`,
        example: R`\(\dfrac{dy}{dx} = x + y\), \(y(0) = 1\), \(\Delta x = 0.5\): \(y(0.5) \approx 1 + 0.5(1) = 1.5\), then \(y(1) \approx 1.5 + 0.5(2) = 2.5\).`,
      },
      {
        title: 'Separable equations',
        text: R`If \(\dfrac{dy}{dx} = g(x)h(y)\), move every \(y\) to one side and every \(x\) to the other: \(\dfrac{dy}{h(y)} = g(x)\,dx\). Integrate both sides, add one constant, then use the initial condition to find it.`,
        example: R`\(\dfrac{dy}{dx} = xy\), \(y(0) = 2\): \(\ln|y| = \tfrac{1}{2}x^{2} + C\), so \(y = 2e^{x^{2}/2}\).`,
      },
      {
        title: 'Exponential models and cooling',
        text: R`\(\dfrac{dy}{dt} = ky\) has solution \(y = y_{0}e^{kt}\): equal time steps multiply \(y\) by equal factors. Newton's law of cooling, \(\dfrac{dT}{dt} = -k(T - T_{s})\), says the same about the difference from the surroundings: \(T = T_{s} + (T_{0} - T_{s})e^{-kt}\).`,
        example: R`A half-life of 8 days means the amount is multiplied by \(\frac{1}{2}\) every 8 days: after 24 days, \(\frac{1}{8}\) is left.`,
      },
      {
        title: 'The logistic model',
        text: R`\(\dfrac{dP}{dt} = kP\left(1 - \dfrac{P}{M}\right)\) describes growth that levels off. \(M\) is the carrying capacity: \(P \to M\) as \(t \to \infty\). The population grows fastest when \(P = \dfrac{M}{2}\).`,
        example: R`For \(\dfrac{dP}{dt} = 0.4P\left(1 - \dfrac{P}{600}\right)\) the carrying capacity is 600, and growth is fastest at \(P = 300\).`,
      },
    ],
    vocab: [
      { term: 'differential equation', def: 'An equation relating a function to one or more of its derivatives.' },
      { term: 'general solution', def: 'The whole family of solutions, written with an arbitrary constant.' },
      { term: 'particular solution', def: 'The one solution that also satisfies a given initial condition.' },
      { term: 'separable', def: R`An equation that can be written as \(\dfrac{dy}{dx} = g(x)h(y)\), so the variables can be separated.` },
      { term: 'carrying capacity', def: 'The population level that a logistic model approaches in the long run.' },
    ],
    mistakes: [
      R`Adding the constant too late. After \(\ln|y| = \dots + C\), exponentiating turns \(C\) into a multiplier: \(y = Ce^{\dots}\).`,
      R`In Euler's method, reusing the first slope for every step. Recompute it at each new point.`,
      R`Treating Newton's law of cooling as exponential decay of \(T\) itself. It is the difference \(T - T_{s}\) that decays.`,
      R`Saying a logistic population grows fastest at the carrying capacity. There the growth rate is 0.`,
    ],
    visual: {
      type: 'plot',
      x: [0, 20],
      y: [0, 700],
      fns: [{ f: (t) => 600 / (1 + 11 * Math.exp(-0.4 * t)), label: 'P(t)', labelAt: 13 }],
      hlines: [{ y: 600 }, { y: 300, color: 'b' }],
      points: [{ x: Math.log(11) / 0.4, y: 300, label: 'fastest growth' }],
      axisLabels: ['t', 'P'],
      alt: 'A logistic curve starting at 50, rising in an S shape and levelling off at the carrying capacity 600, shown as a dashed line. A second dashed line at 300, half the carrying capacity, crosses the curve at its steepest point.',
    },
  },

  examples: [
    {
      title: 'A separable equation with an initial condition',
      problem: R`Solve \(\dfrac{dy}{dx} = \dfrac{2x}{y}\) with \(y(0) = 3\).`,
      steps: [
        R`Separate the variables: \(y\,dy = 2x\,dx\).`,
        R`Integrate both sides: \(\dfrac{y^{2}}{2} = x^{2} + C_{1}\), so \(y^{2} = 2x^{2} + C\).`,
        R`Use \(y(0) = 3\): \(9 = C\). Since \(y(0)\) is positive, take the positive square root.`,
      ],
      answer: R`\(y = \sqrt{2x^{2} + 9}\)`,
    },
    {
      title: "Euler's method",
      problem: R`For \(\dfrac{dy}{dx} = x + y\) with \(y(0) = 1\), use two steps of size 0.5 to approximate \(y(1)\).`,
      steps: [
        R`Step 1: at \((0, 1)\) the slope is \(0 + 1 = 1\). So \(y(0.5) \approx 1 + 0.5(1) = 1.5\).`,
        R`Step 2: at \((0.5, 1.5)\) the slope is \(0.5 + 1.5 = 2\). So \(y(1) \approx 1.5 + 0.5(2) = 2.5\).`,
        R`The exact solution is \(y = 2e^{x} - x - 1\), so \(y(1) = 2e - 2 \approx 3.44\). Euler's value is too small because the solution is concave up.`,
      ],
      answer: R`\(y(1) \approx 2.5\)`,
      visual: {
        type: 'table',
        headers: ['Step', R`\(x\)`, R`\(y\)`, R`slope \(x + y\)`, R`new \(y\)`],
        rows: [[R`\(1\)`, R`\(0\)`, R`\(1\)`, R`\(1\)`, R`\(1 + 0.5(1) = 1.5\)`], [R`\(2\)`, R`\(0.5\)`, R`\(1.5\)`, R`\(2\)`, R`\(1.5 + 0.5(2) = 2.5\)`]],
        alt: 'Euler table. Step 1: x = 0, y = 1, slope 1, new y = 1.5. Step 2: x = 0.5, y = 1.5, slope 2, new y = 2.5.',
      },
    },
    {
      title: 'Word problem: a cooling drink',
      word: true,
      problem: R`A cup of coffee at 90°C is left in a 20°C room. After 10 minutes it is at 55°C. What is its temperature after 20 minutes?`,
      steps: [
        R`Newton's law of cooling: \(\dfrac{dT}{dt} = -k(T - 20)\). The difference \(T - 20\) decays exponentially.`,
        R`The difference starts at \(90 - 20 = 70\) and is \(55 - 20 = 35\) after 10 minutes. So it halves every 10 minutes.`,
        R`After 20 minutes the difference is \(70\cdot\frac{1}{2}\cdot\frac{1}{2} = 17.5\).`,
      ],
      answer: R`\(20 + 17.5 = 37.5\)°C`,
      visual: {
        type: 'plot',
        x: [0, 45],
        y: [0, 100],
        fns: [{ f: (t) => 20 + 70 * 0.5 ** (t / 10) }],
        hlines: [{ y: 20 }],
        points: [{ x: 0, y: 90, label: '90°' }, { x: 10, y: 55, label: '55°' }, { x: 20, y: 37.5, label: '37.5°' }],
        axisLabels: ['t (min)', 'T (°C)'],
        alt: 'Cooling curve starting at 90 degrees, passing through 55 degrees at 10 minutes and 37.5 degrees at 20 minutes, and flattening toward the dashed line at the room temperature of 20 degrees.',
      },
    },
    {
      title: 'A logistic model',
      problem: R`A lake is stocked with fish, and the population follows \(\dfrac{dP}{dt} = 0.5P\left(1 - \dfrac{P}{2000}\right)\). Find the carrying capacity, and the population at which the fish are multiplying fastest.`,
      steps: [
        R`The growth rate is 0 when \(P = 0\) or \(P = 2000\). For \(0 < P < 2000\) it is positive, so the population rises toward 2000.`,
        R`The rate \(0.5P\left(1 - \frac{P}{2000}\right)\) is a downward parabola in \(P\) with zeros at 0 and 2000. Its peak is halfway, at \(P = 1000\).`,
        R`At that moment \(\dfrac{dP}{dt} = 0.5(1000)\left(\frac{1}{2}\right) = 250\) fish per unit time.`,
      ],
      answer: 'Carrying capacity 2000 fish; fastest growth when P = 1000.',
    },
  ],

  models: [
    {
      id: 'euler-steps',
      title: "Euler's method for dy/dx = a·x + b·y",
      intro: 'Choose the equation, the starting value y(0), the step size and the number of steps. Compare the Euler points with the exact solution.',
      inputs: [
        { name: 'a', label: 'a (coefficient of x)', type: 'int', min: -3, max: 3, value: 1 },
        { name: 'b', label: 'b (coefficient of y)', type: 'int', min: -3, max: 3, value: 1 },
        { name: 'y0', label: 'y(0)', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'h', label: 'Step size', type: 'number', min: 0.1, max: 1, step: 0.1, value: 0.5 },
        { name: 'n', label: 'Number of steps', type: 'int', min: 1, max: 6, value: 2 },
      ],
      compute({ a, b, y0, h, n }) {
        const f = (x, y) => a * x + b * y;
        const rhs = terms([[a, 'x'], [b, 'y']]);
        const exact = b === 0 ? (x) => y0 + (a * x * x) / 2 : (x) => (y0 + a / (b * b)) * Math.exp(b * x) - (a / b) * x - a / (b * b);
        const n4 = (v) => num(v, { places: 4 });
        const pts = [[0, y0]];
        const rows = [];
        const steps = [R`Euler's method: new \(y\) = old \(y\) + (slope at the old point) × \(${num(h)}\).`];
        let x = 0;
        let y = y0;
        for (let i = 1; i <= n; i++) {
          const m = f(x, y);
          const yNew = y + h * m;
          rows.push([R`\(${i}\)`, R`\(${num(x)}\)`, R`\(${n4(y)}\)`, R`\(${n4(m)}\)`, R`\(${n4(yNew)}\)`]);
          steps.push(R`Step ${i}: at \((${num(x)}, ${n4(y)})\) the slope is \(${n4(m)}\), so the new \(y\) is \(${n4(y)} + ${num(h)}\cdot ${paren(Math.round(m * 1e4) / 1e4)} = ${n4(yNew)}\).`);
          x = Math.round((x + h) * 1e6) / 1e6;
          y = yNew;
          pts.push([x, y]);
        }
        const xEnd = x;
        const truth = exact(xEnd);
        steps.push(R`The exact solution gives \(y(${num(xEnd)}) = ${n4(truth)}\), so the error is \(${n4(Math.abs(y - truth))}\). Smaller steps reduce it.`);
        const ys = pts.map((p) => p[1]).concat([truth, exact(xEnd / 2)]);
        const lo = Math.min(0, ...ys);
        const hi = Math.max(0, ...ys);
        const pad = 0.12 * (hi - lo || 1);
        return {
          problem: R`Approximate \(y(${num(xEnd)})\) for \(\dfrac{dy}{dx} = ${rhs}\), \(y(0) = ${y0}\), using ${n} Euler ${n === 1 ? 'step' : 'steps'} of size \(${num(h)}\).`,
          steps,
          answer: R`\(y(${num(xEnd)}) \approx ${n4(y)}\)`,
          visual: [
            { type: 'table', headers: ['Step', R`\(x\)`, R`\(y\)`, 'slope', R`new \(y\)`], rows, alt: `Euler table with ${n} steps, ending at y = ${n4(y)}.` },
            {
              type: 'plot',
              x: [0, xEnd * 1.1],
              y: [lo - pad, hi + pad],
              fns: [{ f: exact, label: 'exact' }],
              segments: pts.slice(1).map((p, i) => ({ from: pts[i], to: p })),
              points: pts.map(([px, py]) => ({ x: px, y: py, color: 'b' })),
              alt: `The exact solution curve together with the Euler approximation, drawn as ${n} straight segments starting at (0, ${y0}). The Euler path ends at y = ${n4(y)}; the exact value there is ${n4(truth)}.`,
            },
          ],
        };
      },
    },
    {
      id: 'cooling',
      title: "Word problem: Newton's law of cooling",
      word: true,
      intro: 'A hot drink cools toward room temperature. Choose the temperatures, the cooling constant and the time.',
      inputs: [
        { name: 'T0', label: 'Starting temperature (°C)', type: 'int', min: 30, max: 100, value: 90 },
        { name: 'Ts', label: 'Room temperature (°C)', type: 'int', min: 0, max: 29, value: 20 },
        { name: 'k', label: 'Cooling constant k (per minute)', type: 'number', min: 0.01, max: 0.3, step: 0.01, value: 0.07 },
        { name: 't', label: 'Time (minutes)', type: 'int', min: 0, max: 120, value: 10 },
      ],
      compute({ T0, Ts, k, t }) {
        const D = T0 - Ts;
        const T = (s) => Ts + D * Math.exp(-k * s);
        const now = T(t);
        const half = Math.log(2) / k;
        const p2 = { places: 2 };
        return {
          problem: R`A drink at ${T0}°C is left in a room at ${Ts}°C. Its temperature follows Newton's law of cooling with \(k = ${num(k)}\) per minute. What is its temperature after ${t} minutes?`,
          steps: [
            R`Newton's law of cooling: \(\dfrac{dT}{dt} = -${num(k)}(T - ${Ts})\).`,
            R`The difference \(T - ${Ts}\) starts at \(${T0} - ${Ts} = ${D}\) and decays exponentially: \(T - ${Ts} = ${D}e^{-${num(k)}t}\).`,
            R`At \(t = ${t}\): \(T = ${Ts} + ${D}e^{-${num(k * t, p2)}} \approx ${Ts} + ${num(D * Math.exp(-k * t), p2)} = ${num(now, p2)}\).`,
            R`The difference from room temperature halves every \(\dfrac{\ln 2}{${num(k)}} \approx ${num(half, { places: 1 })}\) minutes.`,
          ],
          answer: R`About \(${num(now, { places: 1 })}\)°C`,
          visual: {
            type: 'plot',
            x: [0, Math.max(30, t * 1.3, 4 * half)],
            y: [0, T0 * 1.1],
            fns: [{ f: T }],
            hlines: [{ y: Ts }],
            points: [{ x: t, y: now, label: `${num(now, { places: 1 })}°` }],
            axisLabels: ['t (min)', 'T (°C)'],
            alt: `Cooling curve starting at ${T0} degrees and flattening toward the dashed line at room temperature, ${Ts} degrees. After ${t} minutes the temperature is about ${num(now, { places: 1 })} degrees.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyWriteDE, easyVerify, easySlopeAtPoint],
    medium: [mediumSlopeTable, mediumEuler, mediumSeparable, mediumWordGrowth],
    hard: [hardSeparable, hardWordCooling, hardLogistic],
    challenge: [challengeEulerEstimate, challengeFindRate, challengeWordMixing],
  },
};
