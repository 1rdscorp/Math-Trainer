import { R, q, frac, tryFrac, linear, terms, num, txt, point, money, lcm, person, range } from '../../lib/index.js';
import { val, F, lineEq, lineText, pointText, SYM, STRICT, holds } from './_shared.js';

const pt = (x, y) => R`\(${point(x, y)}\)`;
const eqTex = (a, b, c) => `${terms([[a, 'x'], [b, 'y']])} = ${num(c)}`;
const sys = (e1, e2) => R`\[\begin{cases} ${e1} \\ ${e2} \end{cases}\]`;
const plug = (a, b, x, y) => terms([[a, `(${num(x)})`], [b, `(${num(y)})`]]); // ax + by with numbers put in
const art = (n) => (/^(8|11|18)/.test(String(n)) ? 'an' : 'a'); // "an 80% solution"
const fits = (a, b, c) => (x, y) => Math.abs(a * val(x) + b * val(y) - c) < 1e-9;

// Wrong ordered pairs: drop any candidate that happens to solve the system. A candidate is [x, y] or { at: [x, y], why }.
function wrongPairs(cands, ok) {
  return cands
    .filter(Boolean)
    .map((c) => (Array.isArray(c) ? { at: c } : c))
    .filter((c) => !ok(...c.at))
    .map((c) => (c.why ? { value: pt(...c.at), why: c.why } : pt(...c.at)));
}

// Elimination of y from a1x + b1y = c1 and a2x + b2y = c2 (b1, b2 not 0, lines not parallel).
function eliminate(a1, b1, c1, a2, b2, c2) {
  const L = lcm(Math.abs(b1), Math.abs(b2));
  const [k1, k2] = [L / Math.abs(b1), L / Math.abs(b2)];
  const s = Math.sign(b1) === Math.sign(b2) ? -1 : 1; // subtract when the y-terms match, add when they are opposite
  const kx = a1 * k1 + s * a2 * k2;
  const rhs = c1 * k1 + s * c2 * k2;
  const x = frac(rhs, kx);
  const y = F(c1).sub(x.mul(a1)).div(b1);
  const steps = [];
  const mult = [k1 > 1 ? R`the first equation by \(${k1}\)` : '', k2 > 1 ? R`the second equation by \(${k2}\)` : ''].filter(Boolean);
  if (mult.length) steps.push(R`Make the \(y\)-terms match. Multiply ${mult.join(' and ')}: \(${eqTex(a1 * k1, b1 * k1, c1 * k1)}\) and \(${eqTex(a2 * k2, b2 * k2, c2 * k2)}\).`);
  steps.push(R`${s < 0 ? 'Subtract the second equation from the first' : 'Add the two equations'}. The \(y\)-terms cancel: \(${terms([[kx, 'x']])} = ${rhs}\)${kx === 1 ? '' : R`, so \(x = ${x.tex()}\)`}.`);
  steps.push(R`Substitute \(x = ${x.tex()}\) into the first equation: \(${terms([[a1, `(${x.tex()})`], [b1, 'y']])} = ${c1}\), so \(${terms([[b1, 'y']])} = ${F(c1).sub(x.mul(a1)).tex()}\) and \(y = ${y.tex()}\).`);
  return { steps, x, y, k1, k2, s, kx };
}

// ───────────── Easy ─────────────

function easyIsSolution(rng) {
  const x0 = rng.int(-5, 5);
  const y0 = rng.intExcept(-5, 5, [x0]);
  const [a1, b1, a2, b2] = [rng.nonzero(-4, 4), rng.nonzero(-4, 4), rng.nonzero(-4, 4), rng.nonzero(-4, 4)];
  if (a1 * b2 === a2 * b1) return easyIsSolution(rng);
  const [c1, c2] = [a1 * x0 + b1 * y0, a2 * x0 + b2 * y0];
  const ok = (x, y) => fits(a1, b1, c1)(x, y) && fits(a2, b2, c2)(x, y);
  const p1 = [x0 + b1, y0 - a1]; // on the first line only
  const p2 = [x0 - b2, y0 + a2]; // on the second line only
  return q({
    prompt: R`Which ordered pair is a solution of the system? ${sys(eqTex(a1, b1, c1), eqTex(a2, b2, c2))}`,
    correct: pt(x0, y0),
    wrong: wrongPairs([
      { at: p1, why: R`That pair fits the first equation, but in the second it gives \(${a2 * p1[0] + b2 * p1[1]}\), not \(${c2}\). A solution must fit both.` },
      { at: p2, why: R`That pair fits the second equation, but in the first it gives \(${a1 * p2[0] + b1 * p2[1]}\), not \(${c1}\). A solution must fit both.` },
      [y0, x0],
      [-x0, -y0],
      [x0 + 1, y0],
    ], ok),
    solution: [
      R`Substitute \(${point(x0, y0)}\) into the first equation: \(${plug(a1, b1, x0, y0)} = ${c1}\). ✓`,
      R`Substitute it into the second equation: \(${plug(a2, b2, x0, y0)} = ${c2}\). ✓`,
      'It makes both equations true, so it is the solution. Each other pair fails at least one of them.',
    ],
    rule: 0,
    skill: 'checking solutions',
    check: () => (ok(x0, y0) ? true : 'the pair does not satisfy both equations'),
  });
}

function easyFromGraph(rng) {
  const x0 = rng.int(-4, 4);
  const y0 = rng.intExcept(-4, 4, [x0]);
  const [m1, m2] = rng.sample([-2, -1, -0.5, 0.5, 1, 2, 3], 2);
  const [b1, b2] = [y0 - m1 * x0, y0 - m2 * x0];
  const ok = (x, y) => x === x0 && y === y0;
  return q({
    prompt: 'The graph shows the two lines of a system of equations. What is the solution of the system?',
    visual: {
      type: 'plot', x: [-7, 7], y: [-7, 7], step: [1, 1], square: true,
      fns: [{ f: (x) => m1 * x + b1 }, { f: (x) => m2 * x + b2, color: 'b' }],
      points: [{ x: x0, y: y0 }],
      alt: `Graph of two straight lines that cross at the point ${pointText(x0, y0)}.`,
    },
    correct: pt(x0, y0),
    wrong: wrongPairs([
      { at: [y0, x0], why: R`An ordered pair lists \(x\) first, then \(y\). The crossing point is at \(x = ${x0}\), \(y = ${y0}\).` },
      Number.isInteger(b1) && Math.abs(b1) <= 7 ? { at: [0, b1], why: R`That is where one line crosses the \(y\)-axis. The solution is where the two lines cross each other.` } : null,
      [x0, -y0],
      [-x0, y0],
      [x0 + 1, y0 + 1],
    ], ok),
    solution: [
      'A solution of a system is a point that lies on both lines, so look for the point where they cross.',
      R`The lines cross at \(x = ${x0}\), \(y = ${y0}\). The solution is \(${point(x0, y0)}\).`,
    ],
    rule: 0,
    skill: 'solving by graphing',
    check: () => (Math.abs(m1 * x0 + b1 - y0) < 1e-9 && Math.abs(m2 * x0 + b2 - y0) < 1e-9 ? true : 'lines do not cross at the stated point'),
  });
}

function easyAddEliminate(rng) {
  const x0 = rng.int(-9, 9);
  const y0 = rng.intExcept(-9, 9, [0, x0]);
  const [s, d] = [x0 + y0, x0 - y0];
  const ok = (x, y) => fits(1, 1, s)(x, y) && fits(1, -1, d)(x, y);
  return q({
    prompt: R`Solve the system: ${sys(eqTex(1, 1, s), eqTex(1, -1, d))}`,
    correct: pt(x0, y0),
    wrong: wrongPairs([
      { at: [2 * x0, 2 * y0], why: R`Adding the equations gives \(2x = ${s + d}\). Divide by 2 to get \(x\).` },
      { at: [y0, x0], why: R`Check the second equation: \(x - y\) must equal \(${d}\), and here it equals \(${y0 - x0}\).` },
      [x0, -y0],
      [s, d],
      [x0 + 1, y0 - 1],
    ], ok),
    solution: [
      R`The \(y\)-terms are opposites, so add the equations: \(2x = ${s + d}\), so \(x = ${x0}\).`,
      R`Substitute into \(x + y = ${s}\): \(${x0} + y = ${s}\), so \(y = ${y0}\).`,
      R`Check in the second equation: \(${x0} - ${y0 < 0 ? `(${y0})` : y0} = ${d}\). ✓ The solution is \(${point(x0, y0)}\).`,
    ],
    rule: 2,
    skill: 'elimination',
    check: () => (ok(x0, y0) ? true : 'the pair does not satisfy both equations'),
  });
}

// ───────────── Medium ─────────────

function mediumSubstitution(rng) {
  const m = rng.nonzero(-4, 4);
  const b = rng.nonzero(-6, 6);
  const x0 = rng.nonzero(-5, 5);
  const y0 = m * x0 + b;
  const A = rng.nonzero(-5, 5);
  const B = rng.intExcept(-5, 5, [0, 1]);
  const k = A + B * m;
  if (k === 0 || Math.abs(k) === 1) return mediumSubstitution(rng);
  const C = A * x0 + B * y0;
  const ok = (x, y) => fits(-m, 1, b)(x, y) && fits(A, B, C)(x, y);
  const slip = frac(C - b, k); // B was not multiplied by the constant b
  const rule = linear(m, b);
  return q({
    prompt: R`Solve the system by substitution: ${sys(lineEq(m, b), eqTex(A, B, C))}`,
    correct: pt(x0, y0),
    wrong: wrongPairs([
      { at: [slip, slip.mul(m).add(b)], why: R`\(${B}\) multiplies the whole expression \((${rule})\): \(${B}(${rule}) = ${linear(B * m, B * b)}\).` },
      { at: [y0, x0], why: R`An ordered pair is written \((x, y)\). Here \(x = ${x0}\) and \(y = ${y0}\).` },
      [x0, m * x0 - b],
      [-x0, y0],
      [x0 + 1, y0 + m],
    ], ok),
    solution: [
      R`The first equation gives \(y\) in terms of \(x\). Replace \(y\) in the second equation: \(${terms([[A, 'x'], [B, `(${rule})`]])} = ${C}\).`,
      R`Distribute and combine: \(${linear(k, B * b)} = ${C}\), so \(${terms([[k, 'x']])} = ${C - B * b}\) and \(x = ${x0}\).`,
      R`Substitute back: \(y = ${terms([[m, `(${x0})`], [b, '']])} = ${y0}\). The solution is \(${point(x0, y0)}\).`,
    ],
    rule: 1,
    skill: 'substitution',
    check: () => (ok(x0, y0) ? true : 'the pair does not satisfy both equations'),
  });
}

function mediumElimination(rng) {
  const x0 = rng.nonzero(-6, 6);
  const y0 = rng.nonzero(-6, 6);
  const b = rng.int(1, 5);
  const add = rng.bool();
  const a1 = rng.nonzero(-5, 5);
  const a2 = rng.intExcept(-5, 5, [0, add ? -a1 : a1]);
  const b2 = add ? -b : b;
  const [c1, c2] = [a1 * x0 + b * y0, a2 * x0 + b2 * y0];
  const ok = (x, y) => fits(a1, b, c1)(x, y) && fits(a2, b2, c2)(x, y);
  const k = add ? a1 + a2 : a1 - a2;
  const slipX = frac(add ? c1 - c2 : c1 + c2, k); // right-hand sides combined the wrong way
  const yFor = (x) => F(c1).sub(F(x).mul(a1)).div(b);
  return q({
    prompt: R`Solve the system by elimination: ${sys(eqTex(a1, b, c1), eqTex(a2, b2, c2))}`,
    correct: pt(x0, y0),
    wrong: wrongPairs([
      { at: [slipX, yFor(slipX)], why: add ? R`Add the right-hand sides as well: \(${c1} + ${c2 < 0 ? `(${c2})` : c2} = ${c1 + c2}\).` : R`Subtract the right-hand sides as well: \(${c1} - ${c2 < 0 ? `(${c2})` : c2} = ${c1 - c2}\).` },
      { at: [y0, x0], why: R`An ordered pair is written \((x, y)\). Here \(x = ${x0}\) and \(y = ${y0}\).` },
      [x0, -y0],
      [-x0, y0],
      [x0 + 1, y0],
    ], ok),
    solution: [
      R`The \(y\)-terms are ${add ? 'opposites, so add' : 'the same, so subtract'} the equations: \(${terms([[k, 'x']])} = ${add ? c1 + c2 : c1 - c2}\)${k === 1 ? '' : R`, so \(x = ${x0}\)`}.`,
      R`Substitute \(x = ${x0}\) into the first equation: \(${terms([[a1, `(${x0})`], [b, 'y']])} = ${c1}\), so \(${terms([[b, 'y']])} = ${c1 - a1 * x0}\) and \(y = ${y0}\).`,
      R`Check in the second equation: \(${plug(a2, b2, x0, y0)} = ${c2}\). ✓ The solution is \(${point(x0, y0)}\).`,
    ],
    rule: 2,
    skill: 'elimination',
    check: () => (ok(x0, y0) ? true : 'the pair does not satisfy both equations'),
  });
}

function mediumHowMany(rng) {
  const kind = rng.pick(['none', 'many', 'one']);
  const a = rng.nonzero(-5, 5);
  const b = rng.nonzero(-5, 5);
  const c = rng.int(-9, 9);
  const k = rng.pick([2, 3, -1, -2]);
  const second = { none: [k * a, k * b, k * c + rng.nonzero(-6, 6)], many: [k * a, k * b, k * c], one: [b, -a + rng.pick([0, 1]), rng.int(-9, 9)] }[kind];
  const [a2, b2, c2] = second;
  if (b2 === 0 || a * b2 === a2 * b) return mediumHowMany(rng);
  const [m1, m2] = [frac(-a, b), frac(-a2, b2)];
  const [i1, i2] = [frac(c, b), frac(c2, b2)];
  const NAMES = { none: 'No solution', one: 'Exactly one solution', many: 'Infinitely many solutions', two: 'Exactly two solutions' };
  const last = {
    none: R`The slopes are equal but the \(y\)-intercepts are different (\(${i1.tex()}\) and \(${i2.tex()}\)). The lines are parallel and never meet: no solution.`,
    many: R`The slopes and the \(y\)-intercepts are both equal, so the two equations describe the same line. Every point on it is a solution.`,
    one: R`The slopes are different, so the lines cross at exactly one point.`,
  }[kind];
  return q({
    prompt: R`How many solutions does this system have? ${sys(eqTex(a, b, c), eqTex(a2, b2, c2))}`,
    correct: NAMES[kind],
    wrong: [
      kind === 'many' ? { value: NAMES.none, why: R`Multiplying the first equation by \(${k}\) gives the second equation exactly, right-hand side included. They are the same line.` } : kind === 'none' ? { value: NAMES.many, why: R`Multiplying the first equation by \(${k}\) gives \(${eqTex(k * a, k * b, k * c)}\), but the second equation has \(${c2}\) on the right. Same slope, different lines.` } : null,
      { value: NAMES.two, why: 'Two different straight lines can cross at most once.' },
      NAMES.none,
      NAMES.one,
      NAMES.many,
    ],
    solution: [
      R`Write each equation as \(y = mx + b\). First: \(${lineEq(m1, i1)}\). Second: \(${lineEq(m2, i2)}\).`,
      R`Compare the slopes: \(${m1.tex()}\) and \(${m2.tex()}\).`,
      last,
    ],
    rule: 3,
    skill: 'number of solutions',
    check: () => {
      const det = a * b2 - a2 * b;
      const found = det !== 0 ? 'one' : a * c2 === a2 * c && b * c2 === b2 * c ? 'many' : 'none';
      return found === kind ? true : `system has ${found}, not ${kind}`;
    },
  });
}

const SALES = [
  { place: 'A school play', a: 'adult', b: 'student', pa: [8, 12], pb: [3, 6] },
  { place: 'A cinema', a: 'evening', b: 'afternoon', pa: [11, 15], pb: [6, 9] },
  { place: 'A zoo', a: 'adult', b: 'child', pa: [14, 20], pb: [7, 11] },
  { place: 'A museum', a: 'full-price', b: 'reduced-price', pa: [10, 16], pb: [4, 8] },
];

function mediumStoryTickets(rng) {
  const c = rng.pick(SALES);
  const pa = rng.int(...c.pa);
  const pb = rng.int(...c.pb);
  const na = rng.int(20, 120);
  const nb = rng.intExcept(20, 150, [na]);
  const [N, T] = [na + nb, pa * na + pb * nb];
  const signSlip = tryFrac(T - pb * N, pa + pb);
  return q({
    prompt: `${c.place} sold ${N} tickets for ${money(T)} in total. ${c.a[0].toUpperCase()}${c.a.slice(1)} tickets cost ${money(pa)} each and ${c.b} tickets cost ${money(pb)} each. How many ${c.a} tickets were sold?`,
    correct: na,
    wrong: [
      { value: nb, why: `That is the number of ${c.b} tickets. The question asks for ${c.a} tickets.` },
      signSlip?.isInt() ? { value: signSlip, why: R`\(${pb}(${N} - x)\) is \(${pb * N} - ${pb}x\), so the \(x\)-terms combine to \(${pa - pb}x\).` } : null,
      Math.round(T / pa),
      Math.round(N / 2),
      na + 10,
    ],
    solution: [
      R`Let \(x\) be the number of ${c.a} tickets and \(y\) the number of ${c.b} tickets. Count the tickets: \(x + y = ${N}\). Count the money: \(${pa}x + ${pb}y = ${T}\).`,
      R`From the first equation \(y = ${N} - x\). Substitute: \(${pa}x + ${pb}(${N} - x) = ${T}\).`,
      R`Distribute and combine: \(${pa - pb}x + ${pb * N} = ${T}\), so \(${pa - pb}x = ${T - pb * N}\) and \(x = ${na}\).`,
      `So ${na} ${c.a} tickets (and ${nb} ${c.b} tickets) were sold.`,
    ],
    rule: 4,
    skill: 'systems word problems',
    check: () => (na + nb === N && pa * na + pb * nb === T ? true : 'ticket counts do not match the totals'),
  });
}

// ───────────── Hard ─────────────

function hardEliminationMultiply(rng) {
  const d = rng.pick([1, 1, 1, 2, 3]);
  const x0 = frac(rng.nonzero(-6, 6), d);
  const y0 = frac(rng.nonzero(-6, 6), d);
  const [a1, b1, a2, b2] = [0, 0, 0, 0].map(() => rng.intExcept(-7, 7, [-1, 0, 1]));
  const [c1, c2] = [x0.mul(a1).add(y0.mul(b1)), x0.mul(a2).add(y0.mul(b2))];
  if (a1 * b2 === a2 * b1 || Math.abs(b1) === Math.abs(b2) || Math.abs(a1) === Math.abs(a2) || !c1.isInt() || !c2.isInt()) return hardEliminationMultiply(rng);
  const e = eliminate(a1, b1, c1.n, a2, b2, c2.n);
  const ok = (x, y) => fits(a1, b1, c1.n)(x, y) && fits(a2, b2, c2.n)(x, y);
  const yFor = (x) => F(c1.n).sub(x.mul(a1)).div(b1);
  const noRight = frac(c1.n + e.s * c2.n, e.kx); // right-hand sides were not multiplied
  const signSlip = frac(c1.n * e.k1 - e.s * c2.n * e.k2, e.kx); // right-hand sides combined the wrong way
  return q({
    prompt: R`Solve the system: ${sys(eqTex(a1, b1, c1.n), eqTex(a2, b2, c2.n))}`,
    correct: pt(x0, y0),
    wrong: wrongPairs([
      { at: [noRight, yFor(noRight)], why: 'When you multiply an equation, multiply every term, including the number on the right-hand side.' },
      { at: [signSlip, yFor(signSlip)], why: e.s < 0 ? 'When you subtract the equations, subtract the right-hand sides as well.' : 'When you add the equations, add the right-hand sides as well.' },
      [y0, x0],
      [x0, y0.neg()],
      [x0.neg(), y0],
    ], ok),
    solution: [...e.steps, R`Check in the second equation: \(${plug(a2, b2, x0, y0)} = ${c2.n}\). ✓ The solution is \(${point(x0, y0)}\).`],
    rule: 2,
    skill: 'elimination',
    check: () => (ok(x0, y0) && e.x.eq(x0) && e.y.eq(y0) ? true : 'elimination result does not satisfy both equations'),
  });
}

function hardStory(rng) {
  if (rng.bool()) {
    const name = person(rng);
    const [small, big, vs, vb] = rng.pick([['dimes', 'quarters', 10, 25], ['nickels', 'dimes', 5, 10], ['nickels', 'quarters', 5, 25]]);
    const ns = rng.int(4, 20);
    const nb = rng.intExcept(4, 20, [ns]);
    const [N, cents] = [ns + nb, ns * vs + nb * vb];
    return q({
      prompt: `${name} has ${N} coins, all ${small} and ${big}. Together they are worth ${money(cents / 100)}. How many ${big} does ${name} have?`,
      correct: nb,
      wrong: [
        { value: ns, why: `That is the number of ${small}. The question asks for ${big}.` },
        { value: Math.round(cents / vb), why: `That would be right if every coin were one of the ${big}. Some of the value comes from ${small}.` },
        nb + 2,
        nb - 2,
        N,
      ],
      solution: [
        R`Let \(s\) be the number of ${small} and \(b\) the number of ${big}. Count the coins: \(s + b = ${N}\). Count the value in cents: \(${vs}s + ${vb}b = ${cents}\).`,
        R`Substitute \(s = ${N} - b\): \(${vs}(${N} - b) + ${vb}b = ${cents}\), so \(${vs * N} + ${vb - vs}b = ${cents}\).`,
        R`Then \(${vb - vs}b = ${cents - vs * N}\), so \(b = ${nb}\). There are ${nb} ${big} and ${ns} ${small}.`,
      ],
      rule: 4,
      skill: 'systems word problems',
      check: () => (ns + nb === N && vs * ns + vb * nb === cents ? true : 'coin counts do not match the totals'),
    });
  }
  const [p1, p2] = rng.pick([[10, 30], [10, 40], [20, 50], [20, 60], [25, 50], [30, 60], [15, 45], [40, 80], [5, 25]]);
  const V = rng.pick([10, 12, 20, 24, 30, 40, 60]);
  const options = range(p1 + 1, p2 - 1).filter((p) => (V * (p2 - p)) % (p2 - p1) === 0 && 2 * p !== p1 + p2);
  if (!options.length) return hardStory(rng);
  const pt0 = rng.pick(options);
  const x = (V * (p2 - pt0)) / (p2 - p1);
  const y = V - x;
  return q({
    prompt: `A lab technician mixes ${art(p1)} ${p1}% salt solution with ${art(p2)} ${p2}% salt solution to make ${V} litres of ${art(pt0)} ${pt0}% salt solution. How many litres of the ${p1}% solution are needed?`,
    correct: x,
    unit: 'litres',
    wrong: [
      { value: y, why: `That is the amount of the ${p2}% solution. The question asks for the ${p1}% solution.` },
      { value: V / 2, why: `Equal amounts would give a strength halfway between the two, ${(p1 + p2) / 2}%.` },
      { value: (V * pt0) / 100, why: 'That is the amount of salt in the mixture, not the volume of one of the solutions.' },
      V,
    ],
    solution: [
      R`Let \(x\) be the litres of ${p1}% solution and \(y\) the litres of ${p2}% solution. Total volume: \(x + y = ${V}\).`,
      R`Amount of salt: \(${num(p1 / 100)}x + ${num(p2 / 100)}y = ${num(pt0 / 100)}(${V}) = ${num((pt0 * V) / 100)}\). Multiply by 100: \(${p1}x + ${p2}y = ${pt0 * V}\).`,
      R`Substitute \(y = ${V} - x\): \(${p1}x + ${p2}(${V} - x) = ${pt0 * V}\), so \(${p1 - p2}x = ${pt0 * V - p2 * V}\) and \(x = ${x}\).`,
      `So ${txt(x)} litres of the ${p1}% solution and ${txt(y)} litres of the ${p2}% solution.`,
    ],
    rule: 4,
    skill: 'systems word problems',
    check: () => (Math.abs(p1 * x + p2 * y - pt0 * V) < 1e-9 && x + y === V ? true : 'mixture amounts do not give the target strength'),
  });
}

const OPS = ['lt', 'le', 'gt', 'ge'];

function hardInequalityPoint(rng) {
  const [m1, m2] = rng.sample([-3, -2, -1, 1, 2, 3], 2);
  const [b1, b2] = [rng.int(-5, 5), rng.int(-5, 5)];
  const [op1, op2] = [rng.pick(OPS), rng.pick(OPS)];
  const t1 = ([x, y]) => holds(op1, y, m1 * x + b1);
  const t2 = ([x, y]) => holds(op2, y, m2 * x + b2);
  const grid = range(-5, 5).flatMap((x) => range(-5, 5).map((y) => [x, y]));
  const both = grid.filter((p) => t1(p) && t2(p));
  const only1 = grid.filter((p) => t1(p) && !t2(p));
  const only2 = grid.filter((p) => !t1(p) && t2(p));
  const edge = grid.filter((p) => (STRICT[op1] && p[1] === m1 * p[0] + b1 && t2(p)) || (STRICT[op2] && p[1] === m2 * p[0] + b2 && t1(p)));
  const neither = grid.filter((p) => !t1(p) && !t2(p));
  if (!both.length || !only1.length || !only2.length || !(edge.length || neither.length)) return hardInequalityPoint(rng);
  const good = rng.pick(both);
  const [w1, w2] = [rng.pick(only1), rng.pick(only2)];
  const show1 = ([x, y]) => R`\(${y} ${SYM[op1]} ${m1 * x + b1}\)`;
  const show2 = ([x, y]) => R`\(${y} ${SYM[op2]} ${m2 * x + b2}\)`;
  return q({
    prompt: R`Which point is a solution of this system of inequalities? ${sys(`y ${SYM[op1]} ${linear(m1, b1)}`, `y ${SYM[op2]} ${linear(m2, b2)}`)}`,
    correct: pt(...good),
    wrong: [
      edge.length ? { value: pt(...rng.pick(edge)), why: R`That point lies exactly on a boundary line whose sign is strict (\(<\) or \(>\)), so it is not included.` } : null,
      { value: pt(...w1), why: R`It satisfies the first inequality, but the second fails: ${show2(w1)} is false.` },
      { value: pt(...w2), why: R`It satisfies the second inequality, but the first fails: ${show1(w2)} is false.` },
      neither.length ? pt(...rng.pick(neither)) : null,
      pt(...rng.pick(only1)),
      pt(...rng.pick(only2)),
    ],
    solution: [
      R`A solution must make both inequalities true. Test \(${point(...good)}\) in the first: \(${linear(m1, b1)}\) is \(${m1 * good[0] + b1}\) when \(x = ${good[0]}\), and ${show1(good)} is true. ✓`,
      R`Test it in the second: \(${linear(m2, b2)}\) is \(${m2 * good[0] + b2}\), and ${show2(good)} is true. ✓`,
      'Each of the other points fails at least one of the two inequalities.',
    ],
    rule: 5,
    skill: 'systems of inequalities',
    check: () => (t1(good) && t2(good) && !(t1(w1) && t2(w1)) && !(t1(w2) && t2(w2)) ? true : 'point classification is wrong'),
  });
}

// ───────────── Challenge ─────────────

function challengeFindK(rng) {
  const a = rng.nonzero(-5, 5);
  const b = rng.intExcept(-5, 5, [0, a]);
  const c = rng.nonzero(-9, 9);
  const t = rng.pick([2, 3, -2, -3]);
  const asK = (v) => R`\(k = ${num(v)}\)`;
  if (rng.bool()) {
    const c2 = t * c + rng.nonzero(-6, 6);
    return q({
      prompt: R`For what value of \(k\) does this system have **no solution**? ${sys(eqTex(a, b, c), `${terms([[t * a, 'x'], [1, 'ky']])} = ${c2}`)}`,
      correct: t * b,
      fmt: asK,
      wrong: [
        { value: b, why: R`The second \(x\)-coefficient is \(${t}\) times the first, so the \(y\)-coefficient must also be \(${t}\) times the first for the lines to be parallel.` },
        { value: -t * b, why: R`Parallel lines need the same slope. Keep the sign: \(k = ${t} \cdot ${b < 0 ? `(${b})` : b}\).` },
        t * a,
        c2,
      ],
      solution: [
        R`A system has no solution when the lines are parallel: same slope, different intercepts.`,
        R`The second \(x\)-coefficient is \(${t}\) times the first (\(${t} \cdot ${a < 0 ? `(${a})` : a} = ${t * a}\)). For the same slope, \(k\) must be \(${t}\) times \(${b}\): \(k = ${t * b}\).`,
        R`Then the left side of the second equation is \(${t}\) times the left side of the first, but \(${t} \cdot ${c < 0 ? `(${c})` : c} = ${t * c}\) is not \(${c2}\). The lines are parallel, so there is no solution.`,
      ],
      rule: 3,
      skill: 'number of solutions',
      check: () => (a * (t * b) - t * a * b === 0 && a * c2 !== t * a * c ? true : 'system is not inconsistent for this k'),
    });
  }
  return q({
    prompt: R`For what value of \(k\) does this system have **infinitely many solutions**? ${sys(eqTex(a, b, c), `${terms([[t * a, 'x'], [t * b, 'y']])} = k`)}`,
    correct: t * c,
    fmt: asK,
    wrong: [
      { value: c, why: R`With \(k = ${c}\) the left sides are multiples of each other but the right sides are not, so the lines are parallel: no solution.` },
      { value: -t * c, why: R`Multiply the whole first equation by \(${t}\), keeping the sign of the right-hand side.` },
      t * b,
      t + c,
    ],
    solution: [
      R`A system has infinitely many solutions when both equations describe the same line.`,
      R`The second left side is \(${t}\) times the first: \(${t}(${terms([[a, 'x'], [b, 'y']])}) = ${terms([[t * a, 'x'], [t * b, 'y']])}\).`,
      R`So the right side must also be \(${t}\) times \(${c}\): \(k = ${t * c}\).`,
    ],
    rule: 3,
    skill: 'number of solutions',
    check: () => (a * (t * c) === t * a * c && b * (t * c) === t * b * c ? true : 'equations are not multiples of each other'),
  });
}

function challengeDigits(rng) {
  const t = rng.int(1, 8);
  const u = rng.intExcept(1, 9, [t]);
  const n = 10 * t + u;
  const rev = 10 * u + t;
  const [s, D] = [t + u, rev - n];
  const others = range(10, 99).filter((v) => v !== n && v !== rev && Math.floor(v / 10) + (v % 10) === s);
  const sameGap = [n + 11, n - 11].filter((v) => v >= 12 && v <= 98 && v % 10 !== 0);
  return q({
    prompt: `The digits of a two-digit number add up to ${s}. When the digits are reversed, the new number is ${Math.abs(D)} ${D > 0 ? 'greater' : 'less'} than the original number. What is the original number?`,
    correct: n,
    wrong: [
      { value: rev, why: 'That is the number after its digits are reversed. The question asks for the original number.' },
      others.length ? { value: rng.pick(others), why: `Its digits do add up to ${s}, but reversing it does not change it by ${Math.abs(D)}. Both conditions must hold.` } : null,
      sameGap.length ? { value: sameGap[0], why: `Reversing it does change it by ${Math.abs(D)}, but its digits do not add up to ${s}. Both conditions must hold.` } : null,
      ...[n + 9, n - 9, n + 18, n - 18].filter((v) => v >= 10 && v <= 99),
    ],
    solution: [
      R`Let \(t\) be the tens digit and \(u\) the units digit. The number is \(10t + u\) and the reversed number is \(10u + t\).`,
      R`Digit sum: \(t + u = ${s}\). Reversal: \((10u + t) - (10t + u) = ${D}\), which simplifies to \(9u - 9t = ${D}\), so \(u - t = ${D / 9}\).`,
      R`Add the two equations: \(2u = ${s + D / 9}\), so \(u = ${u}\) and \(t = ${t}\).`,
      `The original number is ${n}. Check: reversed it is ${rev}, and ${rev} − ${n} = ${txt(D)}.`,
    ],
    rule: 4,
    skill: 'systems word problems',
    check: () => (t + u === s && rev - n === D ? true : 'digits do not satisfy the conditions'),
  });
}

function challengeRegion(rng) {
  const x0 = rng.int(-2, 2);
  const y0 = rng.int(-2, 2);
  const [mA, mB] = rng.sample([-2, -1, 1, 2, 3], 2);
  const [m1, m2] = [Math.max(mA, mB), Math.min(mA, mB)]; // line 1 is the steeper one: below line 2 on the left of the crossing
  const [b1, b2] = [y0 - m1 * x0, y0 - m2 * x0];
  const [f1, f2] = [(x) => m1 * x + b1, (x) => m2 * x + b2];
  const [up1, up2] = [rng.bool(), rng.bool()];
  const [strict1, strict2] = [rng.bool(), rng.bool()];
  const op = (up, strict) => (up ? (strict ? 'gt' : 'ge') : strict ? 'lt' : 'le');
  const system = (u1, u2) => sys(`y ${SYM[op(u1, strict1)]} ${linear(m1, b1)}`, `y ${SYM[op(u2, strict2)]} ${linear(m2, b2)}`);
  const shade = up1 && up2 ? { f: (x) => Math.max(f1(x), f2(x)), g: () => 40, from: -8, to: 8 }
    : !up1 && !up2 ? { f: (x) => Math.min(f1(x), f2(x)), g: () => -40, from: -8, to: 8 }
    : up1 ? { f: f1, g: f2, from: -8, to: x0 } : { f: f1, g: f2, from: x0, to: 8 };
  const inside = range(-6, 6).flatMap((x) => range(-6, 6).map((y) => [x, y])).filter(([x, y]) => (up1 ? y > f1(x) : y < f1(x)) && (up2 ? y > f2(x) : y < f2(x)));
  if (inside.length < 3) return challengeRegion(rng);
  const test = inside.sort((p, r) => Math.abs(p[0] - x0) + Math.abs(p[1] - y0) - Math.abs(r[0] - x0) - Math.abs(r[1] - y0))[2];
  const spot = (f, right) => { const xs = range(-6, 6).filter((x) => f(x) > -6.5 && f(x) < 5.5); return xs.length ? (right ? Math.max(...xs) : Math.min(...xs)) : 0; }; // where a line label fits
  const side = (up) => (up ? 'above' : 'below');
  const style = (strict) => (strict ? 'dashed' : 'solid');
  return q({
    prompt: 'Which system of inequalities has the shaded region as its solution? A dashed line is not part of the region; a solid line is.',
    visual: {
      type: 'plot', x: [-8, 8], y: [-8, 8], step: [1, 1], square: true,
      fns: [{ f: f1, dashed: strict1, label: `y = ${lineText(m1, b1)}`, labelAt: spot(f1, true) }, { f: f2, dashed: strict2, color: 'b', label: `y = ${lineText(m2, b2)}`, labelAt: spot(f2, false) }],
      shade: [{ ...shade, color: 'c' }],
      alt: `Two lines crossing at ${pointText(x0, y0)}: y = ${lineText(m1, b1)}, drawn ${style(strict1)}, and y = ${lineText(m2, b2)}, drawn ${style(strict2)}. The shaded region is ${side(up1)} the first line and ${side(up2)} the second line.`,
    },
    correct: system(up1, up2),
    wrong: [
      { value: system(!up1, up2), why: R`Test the point \(${point(...test)}\) from the shaded region in the first inequality. It makes that one false.` },
      { value: system(up1, !up2), why: R`Test the point \(${point(...test)}\) from the shaded region in the second inequality. It makes that one false.` },
      system(!up1, !up2),
    ],
    solution: [
      R`The shading is ${side(up1)} the line \(${lineEq(m1, b1)}\), so \(y\) is ${up1 ? 'greater' : 'less'} than \(${linear(m1, b1)}\) there. That line is ${style(strict1)}, so the sign is \(${SYM[op(up1, strict1)]}\).`,
      R`The shading is ${side(up2)} the line \(${lineEq(m2, b2)}\), and that line is ${style(strict2)}: \(y ${SYM[op(up2, strict2)]} ${linear(m2, b2)}\).`,
      R`Check with a point in the region, \(${point(...test)}\): \(${test[1]} ${SYM[op(up1, strict1)]} ${f1(test[0])}\) and \(${test[1]} ${SYM[op(up2, strict2)]} ${f2(test[0])}\) are both true. ✓`,
    ],
    rule: 5,
    skill: 'systems of inequalities',
    check: () => (test && holds(op(up1, strict1), test[1], f1(test[0])) && holds(op(up2, strict2), test[1], f2(test[0])) ? true : 'test point is not in the region'),
  });
}

// ───────────── Interactive models ─────────────

function systemPlot(lines, sol, alt) {
  const cx = sol ? sol[0].value : 0;
  const cy = sol ? sol[1].value : frac(lines[0][2], lines[0][1] || 1).value;
  const fns = [];
  const vlines = [];
  lines.forEach(([a, b, c], i) => (b !== 0 ? fns.push({ f: (t) => (c - a * t) / b, color: 'ab'[i] }) : vlines.push({ x: c / a, dashed: false, color: 'ab'[i] })));
  return { type: 'plot', x: [Math.floor(cx) - 6, Math.ceil(cx) + 6], y: [Math.floor(cy) - 8, Math.ceil(cy) + 8], fns, vlines, points: sol ? [{ x: cx, y: cy, label: pointText(sol[0], sol[1]) }] : [], alt };
}

function systemModel({ a1, b1, c1, a2, b2, c2 }) {
  if ((a1 === 0 && b1 === 0) || (a2 === 0 && b2 === 0)) return { error: 'Each equation needs an x-term or a y-term. In both equations, give a or b a value other than 0.' };
  const problem = R`Solve the system: ${sys(eqTex(a1, b1, c1), eqTex(a2, b2, c2))}`;
  const lines = [[a1, b1, c1], [a2, b2, c2]];
  if (a1 * b2 === a2 * b1) {
    const k = a1 !== 0 ? frac(a2, a1) : frac(b2, b1);
    const same = k.mul(c1).eq(c2);
    return {
      problem,
      steps: [
        k.eq(1) ? 'The left sides of the two equations are identical.' : R`Multiply the first equation by \(${k.tex()}\): \(${terms([[a2, 'x'], [b2, 'y']])} = ${k.mul(c1).tex()}\).`,
        same ? 'The right sides match as well, so both equations describe the same line. Every point on that line is a solution.' : R`The left sides match, but the right sides are different (\(${k.mul(c1).tex()}\) and \(${c2}\)). Both cannot be true at once, so the lines are parallel.`,
      ],
      answer: same ? 'Infinitely many solutions (the same line)' : 'No solution (parallel lines)',
      visual: systemPlot(lines, null, same ? 'Both equations give the same line.' : 'Two parallel lines that never cross.'),
    };
  }
  let steps;
  let x;
  let y;
  if (b1 === 0 || b2 === 0) {
    const [p, r] = b1 === 0 ? [lines[0], lines[1]] : [lines[1], lines[0]]; // p has no y-term
    x = frac(p[2], p[0]);
    y = F(r[2]).sub(x.mul(r[0])).div(r[1]);
    steps = [
      R`The ${b1 === 0 ? 'first' : 'second'} equation has no \(y\)-term, so it gives \(x\) directly: \(${terms([[p[0], 'x']])} = ${p[2]}\), so \(x = ${x.tex()}\).`,
      R`Substitute into the other equation: \(${terms([[r[0], `(${x.tex()})`], [r[1], 'y']])} = ${r[2]}\), so \(y = ${y.tex()}\).`,
    ];
  } else if (a1 === 0 || a2 === 0) {
    const [p, r] = a1 === 0 ? [lines[0], lines[1]] : [lines[1], lines[0]]; // p has no x-term
    y = frac(p[2], p[1]);
    x = F(r[2]).sub(y.mul(r[1])).div(r[0]);
    steps = [
      R`The ${a1 === 0 ? 'first' : 'second'} equation has no \(x\)-term, so it gives \(y\) directly: \(${terms([[p[1], 'y']])} = ${p[2]}\), so \(y = ${y.tex()}\).`,
      R`Substitute into the other equation: \(${terms([[r[0], 'x'], [r[1], `(${y.tex()})`]])} = ${r[2]}\), so \(x = ${x.tex()}\).`,
    ];
  } else {
    ({ steps, x, y } = eliminate(a1, b1, c1, a2, b2, c2));
    steps.push(R`Check in the second equation: \(${plug(a2, b2, x, y)} = ${c2}\). ✓`);
  }
  return {
    problem,
    steps,
    answer: R`\(${point(x, y)}\)`,
    visual: systemPlot(lines, [x, y], `Graph of the two lines, which cross at ${pointText(x, y)}.`),
  };
}

export default {
  id: 'systems',
  title: 'Systems of Linear Equations',
  summary: 'Solve two equations in two unknowns by graphing, substitution and elimination, and set up systems from stories.',
  standards: ['CCSS A-REI.C.5', 'CCSS A-REI.C.6', 'CCSS A-CED.A.3', 'CCSS A-REI.D.12'],

  explain: {
    intro: R`A system of equations is two or more equations that must be true at the same time. For two lines, the solution is the ordered pair \((x, y)\) that fits both equations, which is the point where their graphs cross. Graphing shows the idea; substitution and elimination find the point exactly.`,
    rules: [
      {
        title: 'A solution fits every equation',
        text: R`An ordered pair is a solution only if it makes both equations true. On a graph it is the point where the two lines meet. To check an answer, substitute it into both equations.`,
        example: R`\((2, 3)\) solves \(y = x + 1\) and \(y = -2x + 7\), because \(3 = 2 + 1\) and \(3 = -2(2) + 7\).`,
      },
      {
        title: 'Substitution',
        text: R`When one equation is already solved for a variable (or easily can be), replace that variable in the other equation. You get one equation with one unknown. Solve it, then substitute back to find the other variable.`,
        example: R`\(y = 2x - 1\) and \(3x + 2y = 12\): \(3x + 2(2x - 1) = 12\), so \(7x = 14\), \(x = 2\) and \(y = 3\).`,
      },
      {
        title: 'Elimination',
        text: R`Add or subtract the equations so that one variable cancels. If no variable is ready to cancel, first multiply one or both equations so that the coefficients of one variable match. Whatever you do to an equation, do it to every term on both sides.`,
        example: R`\(3x + 2y = 16\) and \(5x - 2y = 8\): adding gives \(8x = 24\), so \(x = 3\) and then \(y = 3.5\).`,
      },
      {
        title: 'No solution or infinitely many',
        text: R`If the variables cancel and leave a false statement such as \(0 = 5\), the lines are parallel and there is no solution. If they leave a true statement such as \(0 = 0\), both equations describe the same line and there are infinitely many solutions.`,
        example: R`\(y = 2x + 3\) and \(y = 2x - 1\) have the same slope and different intercepts: no solution.`,
      },
      {
        title: 'Systems from stories',
        text: R`Name the two unknowns. Then write one equation for each fact in the story: often one counts things (how many in all) and the other measures them (total cost, total value, total amount).`,
        example: R`150 tickets sold, $12 adult and $7 child, $1,400 in total: \(a + c = 150\) and \(12a + 7c = 1400\).`,
      },
      {
        title: 'Systems of inequalities',
        text: R`A point is a solution of a system of inequalities when it makes every inequality true. On a graph the solutions are the region where the shaded half-planes overlap. A dashed boundary (\(<\) or \(>\)) is not included; a solid one (\(\le\) or \(\ge\)) is.`,
        example: R`\((1, 2)\) solves \(y \ge x - 2\) and \(y < -x + 4\), because \(2 \ge -1\) and \(2 < 3\).`,
      },
    ],
    vocab: [
      { term: 'system of equations', def: 'Two or more equations that share the same variables and must all be true together.' },
      { term: 'solution of a system', def: 'An ordered pair that makes every equation in the system true.' },
      { term: 'substitution', def: 'Replacing a variable with an expression that equals it.' },
      { term: 'elimination', def: 'Adding or subtracting equations so that one variable cancels.' },
      { term: 'break-even point', def: 'The point where income equals cost, found by setting the two expressions equal.' },
    ],
    mistakes: [
      'Stopping after finding one variable. A solution of a system is an ordered pair.',
      R`Multiplying only the left side of an equation. \(2(x + 3y) = 2(5)\) changes both sides.`,
      R`Forgetting to distribute when substituting: \(2(3x - 1)\) is \(6x - 2\), not \(6x - 1\).`,
      'Subtracting equations but adding the right-hand sides, or the other way round.',
      'Testing a point in only one inequality. It must satisfy all of them.',
    ],
    visual: {
      type: 'plot', x: [-2, 6], y: [-2, 8], step: [1, 1],
      fns: [{ f: (x) => x + 1, label: 'y = x + 1', labelAt: 4.6 }, { f: (x) => -2 * x + 7, color: 'b', label: 'y = −2x + 7', labelAt: 3.6 }],
      points: [{ x: 2, y: 3, label: '(2, 3)' }],
      alt: 'Graph of the lines y = x + 1 and y = −2x + 7. They cross at the point (2, 3), the solution of the system.',
    },
  },

  examples: [
    {
      title: 'Substitution',
      problem: R`Solve the system \(y = 2x - 1\) and \(3x + 2y = 12\).`,
      steps: [
        R`The first equation says \(y\) is the same as \(2x - 1\). Replace \(y\) in the second equation: \(3x + 2(2x - 1) = 12\).`,
        R`Distribute and combine: \(3x + 4x - 2 = 12\), so \(7x = 14\) and \(x = 2\).`,
        R`Substitute back: \(y = 2(2) - 1 = 3\).`,
        R`Check in the second equation: \(3(2) + 2(3) = 12\). ✓`,
      ],
      answer: R`\((2, 3)\)`,
    },
    {
      title: 'Elimination, multiplying first',
      problem: R`Solve the system \(2x + 3y = 12\) and \(5x - 2y = 11\).`,
      steps: [
        R`No variable is ready to cancel. Make the \(y\)-terms opposites: multiply the first equation by 2 and the second by 3.`,
        R`\(4x + 6y = 24\) and \(15x - 6y = 33\).`,
        R`Add the equations: \(19x = 57\), so \(x = 3\).`,
        R`Substitute into the first equation: \(2(3) + 3y = 12\), so \(3y = 6\) and \(y = 2\).`,
      ],
      answer: R`\((3, 2)\)`,
    },
    {
      title: 'Word problem: ticket sales',
      word: true,
      problem: 'A theatre sold 150 tickets for $1,400. Adult tickets cost $12 and child tickets cost $7. How many of each were sold?',
      steps: [
        R`Two unknowns: \(a\) adult tickets and \(c\) child tickets. Counting tickets: \(a + c = 150\). Counting money: \(12a + 7c = 1400\).`,
        R`Solve the first equation for \(c\): \(c = 150 - a\). Substitute: \(12a + 7(150 - a) = 1400\).`,
        R`Distribute: \(12a + 1050 - 7a = 1400\), so \(5a = 350\) and \(a = 70\).`,
        R`Then \(c = 150 - 70 = 80\). Check the money: \(12(70) + 7(80) = 840 + 560 = 1400\). ✓`,
      ],
      answer: '70 adult tickets and 80 child tickets',
    },
    {
      title: 'A system of inequalities',
      problem: R`Is \((1, 2)\) a solution of \(y \ge x - 2\) and \(y < -x + 4\)? What about \((3, 1)\)?`,
      steps: [
        R`Test \((1, 2)\): \(2 \ge 1 - 2\) is true, and \(2 < -1 + 4\) is true. Both hold, so it is a solution.`,
        R`Test \((3, 1)\): \(1 \ge 3 - 2\) is true (the boundary is included), but \(1 < -3 + 4\) says \(1 < 1\), which is false.`,
        R`\((3, 1)\) lies on the dashed boundary of the second inequality, so it is not a solution.`,
      ],
      answer: R`\((1, 2)\) is a solution; \((3, 1)\) is not`,
      visual: {
        type: 'plot', x: [-3, 7], y: [-5, 6], step: [1, 1],
        fns: [{ f: (x) => x - 2, label: 'y = x − 2', labelAt: 5 }, { f: (x) => -x + 4, color: 'b', dashed: true, label: 'y = −x + 4', labelAt: 0.4 }],
        shade: [{ f: (x) => x - 2, g: (x) => -x + 4, from: -3, to: 3, color: 'c' }],
        points: [{ x: 1, y: 2, label: '(1, 2)' }, { x: 3, y: 1, open: true, label: '(3, 1)' }],
        alt: 'The solid line y = x − 2 and the dashed line y = −x + 4 cross at (3, 1). The region above the solid line and below the dashed line is shaded; it contains (1, 2).',
      },
    },
  ],

  models: [
    {
      id: 'solve-system',
      title: 'Solve a system of two linear equations',
      intro: 'Choose the six numbers. The steps use elimination, and the graph shows the two lines.',
      inputs: [
        { name: 'a1', label: 'First equation: coefficient of x', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'b1', label: 'First equation: coefficient of y', type: 'int', min: -9, max: 9, value: 3 },
        { name: 'c1', label: 'First equation: right side', type: 'int', min: -40, max: 40, value: 12 },
        { name: 'a2', label: 'Second equation: coefficient of x', type: 'int', min: -9, max: 9, value: 5 },
        { name: 'b2', label: 'Second equation: coefficient of y', type: 'int', min: -9, max: 9, value: -2 },
        { name: 'c2', label: 'Second equation: right side', type: 'int', min: -40, max: 40, value: 11 },
      ],
      compute: systemModel,
    },
    {
      id: 'mixture',
      title: 'Word problem: mixing two solutions',
      word: true,
      intro: 'Change the strengths and the amount in the story.',
      inputs: [
        { name: 'p1', label: 'Strength of the first solution (%)', type: 'int', min: 0, max: 100, value: 20 },
        { name: 'p2', label: 'Strength of the second solution (%)', type: 'int', min: 0, max: 100, value: 50 },
        { name: 'V', label: 'Litres of mixture wanted', type: 'int', min: 1, max: 200, value: 30 },
        { name: 'pt', label: 'Strength of the mixture (%)', type: 'int', min: 0, max: 100, value: 40 },
      ],
      compute({ p1, p2, V, pt }) {
        if (p1 === p2) return { error: 'Both solutions have the same strength, so any mixture of them has that strength too. Choose two different strengths.' };
        if (pt < Math.min(p1, p2) || pt > Math.max(p1, p2)) return { error: `A mixture is never stronger or weaker than both of its parts. Choose a mixture strength between ${Math.min(p1, p2)}% and ${Math.max(p1, p2)}%.` };
        const x = frac(V * (p2 - pt), p2 - p1);
        const y = F(V).sub(x);
        const dec = (v) => (v.isInt() ? v.tex() : R`${v.tex()} \approx ${num(v.value, { places: 2 })}`);
        return {
          problem: `A chemist mixes ${art(p1)} ${p1}% acid solution with ${art(p2)} ${p2}% acid solution to make ${V} ${V === 1 ? 'litre' : 'litres'} of ${art(pt)} ${pt}% acid solution. How much of each is needed?`,
          steps: [
            R`Let \(x\) be the litres of the ${p1}% solution and \(y\) the litres of the ${p2}% solution. Total volume: \(x + y = ${V}\).`,
            R`Amount of pure acid: \(${p1}\%\) of \(x\) plus \(${p2}\%\) of \(y\) equals \(${pt}\%\) of \(${V}\). Multiplying by 100: \(${terms([[p1, 'x'], [p2, 'y']])} = ${pt * V}\).`,
            R`Substitute \(y = ${V} - x\): \(${terms([[p1, 'x'], [p2, `(${V} - x)`]])} = ${pt * V}\), so \(${terms([[p1 - p2, 'x']])} = ${pt * V - p2 * V}\).`,
            R`So \(x = ${dec(x)}\) and \(y = ${V} - x = ${dec(y)}\).`,
          ],
          answer: `${txt(x.value, { places: 2 })} litres of the ${p1}% solution and ${txt(y.value, { places: 2 })} litres of the ${p2}% solution`,
          visual: {
            type: 'barModel',
            rows: [{ label: 'Mixture', parts: [{ value: x.value, label: `${p1}%` }, { value: y.value, label: `${p2}%` }], total: `${V} litres at ${pt}%` }],
            alt: `A bar of ${V} litres split into ${txt(x.value, { places: 2 })} litres of the ${p1}% solution and ${txt(y.value, { places: 2 })} litres of the ${p2}% solution.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyIsSolution, easyFromGraph, easyAddEliminate],
    medium: [mediumSubstitution, mediumElimination, mediumHowMany, mediumStoryTickets],
    hard: [hardEliminationMultiply, hardStory, hardInequalityPoint],
    challenge: [challengeFindK, challengeDigits, challengeRegion],
  },
};
