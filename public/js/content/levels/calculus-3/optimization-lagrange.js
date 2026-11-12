import { R, q, frac, num, lcm, money, product, terms, person, numPartial, checkEqual } from '../../lib/index.js';
import { M, Pt, V, vadd, vscale, vdot, vlen2, quadVec, orthTo, planeTex, mpTex, mpEval, mpD, mpClean } from './_shared.js';

const KIND = { min: 'local minimum', max: 'local maximum', saddle: 'saddle point', flat: 'the test gives no conclusion' };
/** D = f_xx·f_yy − f_xy² and what the second derivative test concludes from it. */
const testKind = (fxx, fyy, fxy) => (fxx * fyy - fxy * fxy > 0 ? (fxx > 0 ? 'min' : 'max') : fxx * fyy - fxy * fxy < 0 ? 'saddle' : 'flat');
/** The same conclusion found a second way: sample the quadratic form ½·a·x² + b·xy + ½·c·y² in 3600 directions. */
function shape(a, b, c) {
  let [lo, hi] = [1e300, -1e300];
  for (let i = 0; i < 3600; i++) {
    const t = (i * Math.PI) / 3600;
    const v = 0.5 * a * Math.cos(t) ** 2 + b * Math.cos(t) * Math.sin(t) + 0.5 * c * Math.sin(t) ** 2;
    [lo, hi] = [Math.min(lo, v), Math.max(hi, v)];
  }
  const tol = 1e-4 * Math.max(Math.abs(lo), Math.abs(hi), 1e-12);
  return lo > tol ? 'min' : hi < -tol ? 'max' : lo < -tol && hi > tol ? 'saddle' : 'flat';
}
const num2 = (f, pt, a, b) => numPartial((x, y) => numPartial(f, [x, y], a, 1e-4), pt, b, 1e-4);
/** Numerical second derivative test at a point: is the gradient zero, and which shape does the Hessian have? */
function numericKind(f, pt) {
  if (Math.abs(numPartial(f, pt, 0)) > 1e-5 || Math.abs(numPartial(f, pt, 1)) > 1e-5) return 'not critical';
  return shape(num2(f, pt, 0, 0), num2(f, pt, 0, 1), num2(f, pt, 1, 1));
}
const kindWhy = (right, picked, D) => {
  if (right === 'flat') return R`Here \(D = 0\), and in that case the test cannot decide.`;
  if (picked === 'flat') return R`The test fails only when \(D = 0\). Here \(D = ${D}\).`;
  if (right === 'saddle') return R`\(D = ${D}\) is negative: the surface curves up in one direction and down in another.`;
  if (picked === 'saddle') return R`A saddle needs \(D < 0\). Here \(D = ${D}\) is positive.`;
  return R`With \(D > 0\), the sign of \(f_{xx}\) decides: positive means a minimum, negative a maximum.`;
};
const kindChoices = (right, D) => Object.keys(KIND).filter((k) => k !== right).map((k) => ({ value: KIND[k], why: kindWhy(right, k, D) }));

// ───────────── Easy ─────────────

function easyClassify(rng) {
  const want = rng.pick(['min', 'max', 'saddle', 'saddle', 'flat']);
  let fxx;
  let fyy;
  let fxy;
  do [fxx, fyy, fxy] = [rng.nonzero(-8, 8), rng.nonzero(-8, 8), rng.int(-6, 6)];
  while (testKind(fxx, fyy, fxy) !== want);
  const D = fxx * fyy - fxy * fxy;
  return q({
    prompt: R`At a critical point \((a, b)\) of \(f\), the second partial derivatives are \(f_{xx} = ${fxx}\), \(f_{yy} = ${fyy}\) and \(f_{xy} = ${fxy}\). What does the second derivative test say about \((a, b)\)?`,
    correct: KIND[want],
    wrong: kindChoices(want, D),
    solution: [
      R`\(D = f_{xx}f_{yy} - (f_{xy})^{2} = ${product(fxx, fyy)} - (${fxy})^{2} = ${D}\).`,
      D > 0 ? R`\(D > 0\) and \(f_{xx} = ${fxx}\) is ${fxx > 0 ? 'positive' : 'negative'}, so the point is a ${KIND[want]}.` : D < 0 ? R`\(D < 0\), so the point is a saddle point.` : R`\(D = 0\), so the test gives no conclusion.`,
    ],
    rule: 1,
    skill: 'second derivative test',
    check: () => (shape(fxx, fxy, fyy) === want ? true : `quadratic form looks like ${shape(fxx, fxy, fyy)}`),
  });
}

function easyCriticalPoint(rng) {
  const [A, B] = [rng.nonzero(-3, 3), rng.nonzero(-3, 3)];
  const p = rng.nonzero(-4, 4);
  const s = rng.intExcept(-4, 4, [0, p, -p]);
  const f = mpClean([[A, 2, 0], [B, 0, 2], [-2 * A * p, 1, 0], [-2 * B * s, 0, 1], [rng.int(-9, 9), 0, 0]]);
  return q({
    prompt: R`Find the critical point of \(f(x, y) = ${mpTex(f)}\).`,
    correct: M(Pt([p, s])),
    wrong: [
      { value: M(Pt([-p, -s])), why: R`Solve \(${terms([[2 * A, 'x'], [-2 * A * p, '']])} = 0\) carefully: the constant changes sign when it crosses the equals sign.` },
      { value: M(Pt([2 * A * p, 2 * B * s])), why: R`Set \(f_{x} = 0\) and \(f_{y} = 0\) and solve. The coefficients of \(x\) and \(y\) are not the coordinates.` },
      M(Pt([s, p])),
      M(Pt([p, -s])),
      M(Pt([2 * p, 2 * s])),
    ],
    solution: [
      R`A critical point is where both partial derivatives are 0.`,
      R`\(f_{x} = ${mpTex(mpD(f, 0))} = 0\) gives \(x = ${p}\).`,
      R`\(f_{y} = ${mpTex(mpD(f, 1))} = 0\) gives \(y = ${s}\). The critical point is \((${p}, ${s})\).`,
    ],
    rule: 0,
    skill: 'critical points',
    check: () => (Math.abs(numPartial((x, y) => mpEval(f, x, y), [p, s], 0)) < 1e-6 && Math.abs(numPartial((x, y) => mpEval(f, x, y), [p, s], 1)) < 1e-6 ? true : 'gradient is not zero there'),
  });
}

function easyLagrangeSetup(rng) {
  const a = rng.int(2, 6);
  const b = rng.intExcept(2, 6, [a]);
  const c = rng.int(4, 20);
  const L = (k) => terms([[k, '\\lambda']]);
  const sys = (...eqs) => M(eqs.join(',\\quad '));
  const lin = `${terms([[a, 'x'], [b, 'y']])} = ${c}`;
  const k = rng.pick([
    { ask: R`maximize \(f(x, y) = xy\) subject to \(${lin}\)`, right: [`y = ${L(a)}`, `x = ${L(b)}`, lin], swap: [`x = ${L(a)}`, `y = ${L(b)}`, lin], noG: ['y = \\lambda', 'x = \\lambda', lin], grad: R`\(\nabla f = \langle y, x \rangle\) and \(\nabla g = \langle ${a}, ${b} \rangle\)`, zero: `${terms([[a, 'x'], [b, 'y']])} = 0` },
    { ask: R`minimize \(f(x, y) = x^{2} + y^{2}\) subject to \(${lin}\)`, right: [`2x = ${L(a)}`, `2y = ${L(b)}`, lin], swap: [`2y = ${L(a)}`, `2x = ${L(b)}`, lin], noG: ['2x = \\lambda', '2y = \\lambda', lin], grad: R`\(\nabla f = \langle 2x, 2y \rangle\) and \(\nabla g = \langle ${a}, ${b} \rangle\)`, zero: `${terms([[a, 'x'], [b, 'y']])} = 0` },
    { ask: R`maximize \(f(x, y) = ${terms([[a, 'x'], [b, 'y']])}\) subject to \(x^{2} + y^{2} = ${c}\)`, right: [`${a} = 2\\lambda x`, `${b} = 2\\lambda y`, `x^{2} + y^{2} = ${c}`], swap: [`${a} = 2\\lambda y`, `${b} = 2\\lambda x`, `x^{2} + y^{2} = ${c}`], noG: [`${a} = \\lambda`, `${b} = \\lambda`, `x^{2} + y^{2} = ${c}`], grad: R`\(\nabla f = \langle ${a}, ${b} \rangle\) and \(\nabla g = \langle 2x, 2y \rangle\)`, zero: 'x^{2} + y^{2} = 0' },
  ]);
  return q({
    prompt: R`You want to ${k.ask} using a Lagrange multiplier. Which system of equations do you solve?`,
    correct: sys(...k.right),
    wrong: [
      { value: sys(...k.swap), why: R`Match the components in order: \(f_{x} = \lambda g_{x}\) and \(f_{y} = \lambda g_{y}\).` },
      { value: sys(...k.noG), why: R`\(\lambda\) multiplies the components of \(\nabla g\), which are not both 1 here.` },
      { value: sys(k.right[0], k.right[1], k.zero), why: 'The third equation is the constraint itself, with its own right side.' },
      sys(k.right[0], k.right[1]),
    ],
    solution: [R`Write the constraint as \(g(x, y) = c\). At a constrained maximum or minimum, \(\nabla f = \lambda\nabla g\).`, R`Here ${k.grad}.`, R`Together with the constraint, the system is \(${k.right.join(',\\quad ')}\).`],
    rule: 3,
    skill: 'setting up Lagrange multipliers',
  });
}

// ───────────── Medium ─────────────

function mediumClassifyQuadratic(rng) {
  let A;
  let B;
  let C;
  do [A, B, C] = [rng.nonzero(-3, 3), rng.int(-4, 4), rng.nonzero(-3, 3)];
  while (4 * A * C - B * B === 0);
  const p = rng.nonzero(-3, 3);
  const s = rng.intExcept(-3, 3, [p]);
  const f = mpClean([[A, 2, 0], [B, 1, 1], [C, 0, 2], [-2 * A * p - B * s, 1, 0], [-B * p - 2 * C * s, 0, 1], [rng.int(-5, 5), 0, 0]]);
  const D = 4 * A * C - B * B;
  const kind = testKind(2 * A, 2 * C, B);
  const at = (k, pt) => R`${KIND[k]} at \(${Pt(pt)}\)`;
  const others = ['min', 'max', 'saddle'].filter((k) => k !== kind);
  return q({
    prompt: R`Find and classify the critical point of \(f(x, y) = ${mpTex(f)}\).`,
    correct: at(kind, [p, s]),
    wrong: [
      { value: at(others[0], [p, s]), why: kindWhy(kind, others[0], D) },
      { value: at(others[1], [p, s]), why: kindWhy(kind, others[1], D) },
      at(kind, [-p, -s]),
      at(kind, [s, p]),
    ],
    solution: [
      R`Set both partial derivatives to 0: \(f_{x} = ${mpTex(mpD(f, 0))} = 0\) and \(f_{y} = ${mpTex(mpD(f, 1))} = 0\).`,
      R`Solving the two linear equations gives \((x, y) = (${p}, ${s})\).`,
      R`\(f_{xx} = ${2 * A}\), \(f_{yy} = ${2 * C}\), \(f_{xy} = ${B}\), so \(D = ${product(2 * A, 2 * C)} - (${B})^{2} = ${D}\).`,
      D > 0 ? R`\(D > 0\) and \(f_{xx}\) is ${A > 0 ? 'positive' : 'negative'}: a ${KIND[kind]}.` : R`\(D < 0\): a saddle point.`,
    ],
    rule: 1,
    skill: 'second derivative test',
    check: () => {
      const found = numericKind((x, y) => mpEval(f, x, y), [p, s]);
      return found === kind ? true : `numerically the point is ${found}`;
    },
  });
}

const TRIPLES = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [6, 8, 10], [8, 6, 10]];

function mediumLagrangeCircle(rng) {
  const [a0, b0, c] = rng.pick(TRIPLES);
  const [a, b] = [a0 * rng.sign(), b0 * rng.sign()];
  const r = rng.int(1, 5);
  const max = rng.bool();
  const ans = max ? r * c : -r * c;
  const pt = [frac(r * a, c), frac(r * b, c)].map((v) => (max ? v : v.neg()));
  return q({
    prompt: R`Use Lagrange multipliers to find the ${max ? 'maximum' : 'minimum'} value of \(f(x, y) = ${terms([[a, 'x'], [b, 'y']])}\) on the circle \(x^{2} + y^{2} = ${r * r}\).`,
    correct: ans,
    wrong: [
      { value: (max ? 1 : -1) * r * (a0 + b0), why: R`The points \((\pm ${r}, \pm ${r})\) are not on the circle. Solve \(\nabla f = \lambda\nabla g\) together with the constraint.` },
      { value: (max ? 1 : -1) * c, why: R`That would be the answer on the unit circle. Here the radius is \(${r}\).` },
      -ans,
      (max ? 1 : -1) * r * Math.max(a0, b0),
      (max ? 1 : -1) * r * r * c,
    ],
    solution: [
      R`\(\nabla f = \lambda\nabla g\) gives \(${a} = 2\lambda x\) and \(${b} = 2\lambda y\), so \((x, y)\) is a multiple of \(\langle ${a}, ${b} \rangle\): \(x = ${a}t\), \(y = ${b}t\).`,
      R`Constraint: \(${a * a}t^{2} + ${b * b}t^{2} = ${r * r}\), so \(t = \pm ${frac(r, c).tex()}\).`,
      R`At \(${Pt(pt)}\): \(f = ${ans}\), the ${max ? 'maximum' : 'minimum'}. The opposite point gives \(${-ans}\).`,
    ],
    rule: 3,
    skill: 'Lagrange multipliers',
    check: () => {
      let best = max ? -1e300 : 1e300;
      for (let i = 0; i < 7200; i++) {
        const v = a * r * Math.cos((i * Math.PI) / 3600) + b * r * Math.sin((i * Math.PI) / 3600);
        best = max ? Math.max(best, v) : Math.min(best, v);
      }
      return checkEqual(ans, best, 1e-5, 'extreme value on the circle');
    },
  });
}

const GOODS = [['notebooks', 'pens'], ['apples', 'oranges'], ['paint brushes', 'tubes of paint'], ['tomato plants', 'pepper plants'], ['muffins', 'bagels']];

function mediumBudget(rng) {
  const [p, s] = rng.sample([2, 3, 4, 5, 6, 8, 10], 2);
  const B = 2 * lcm(p, s) * rng.int(1, 4);
  const [x, y] = [B / (2 * p), B / (2 * s)];
  const who = person(rng);
  const [g1, g2] = rng.pick(GOODS);
  return q({
    prompt: R`${who} has ${money(B)} to spend on ${g1} (${money(p)} each) and ${g2} (${money(s)} each). Buying \(x\) ${g1} and \(y\) ${g2} gives a satisfaction score of \(U(x, y) = xy\). How many ${g1} should ${who} buy to make \(U\) as large as possible while spending exactly ${money(B)}?`,
    correct: x,
    wrong: [
      { value: B / p, why: `Spending everything on ${g1} leaves y = 0, so U = 0.` },
      { value: y, why: `That is the best number of ${g2}.` },
      { value: frac(B, p + s), why: R`Equal numbers of each is not the condition. \(\nabla U = \lambda\nabla g\) gives \(${p}x = ${s}y\): equal amounts of **money** on each.` },
      x + 1,
      2 * x,
    ],
    solution: [
      R`Maximize \(U = xy\) subject to the budget \(${terms([[p, 'x'], [s, 'y']])} = ${B}\).`,
      R`\(\nabla U = \lambda\nabla g\): \(y = ${p}\lambda\) and \(x = ${s}\lambda\), so \(${p}x = ${s}y\). Half of the money goes on each kind.`,
      R`\(${p}x = ${B / 2}\), so \(x = ${x}\) (and \(y = ${y}\), giving \(U = ${x * y}\)).`,
    ],
    rule: 4,
    skill: 'budget problems',
    check: () => {
      let [best, at] = [-1, 0];
      for (let i = 0; i <= 4000; i++) {
        const xx = ((B / p) * i) / 4000;
        const u = (xx * (B - p * xx)) / s;
        if (u > best) [best, at] = [u, xx];
      }
      return checkEqual(x, at, 1e-3, 'best x');
    },
  });
}

// ───────────── Hard ─────────────

function hardCubicCritical(rng) {
  const p = rng.int(1, 4);
  const c = rng.pick([-3, -2, -1, 1, 2, 3]);
  const a = p * rng.sign();
  const fam = rng.pick([
    { f: terms([[1, 'x^{3}'], [1, 'y^{3}'], [-3 * a, 'xy']]), js: (x, y) => x ** 3 + y ** 3 - 3 * a * x * y, pts: [[0, 0], [a, a]], h: (x, y) => [6 * x, 6 * y, -3 * a], hTex: ['6x', '6y', String(-3 * a)] },
    { f: terms([[1, 'x^{3}'], [-3 * p * p, 'x'], [c, 'y^{2}']]), js: (x, y) => x ** 3 - 3 * p * p * x + c * y * y, pts: [[p, 0], [-p, 0]], h: (x) => [6 * x, 2 * c, 0], hTex: ['6x', String(2 * c), '0'] },
    { f: terms([[1, 'x^{4}'], [-2 * p * p, 'x^{2}'], [c, 'y^{2}']]), js: (x, y) => x ** 4 - 2 * p * p * x * x + c * y * y, pts: [[0, 0], [p, 0], [-p, 0]], h: (x) => [12 * x * x - 4 * p * p, 2 * c, 0], hTex: [terms([[12, 'x^{2}'], [-4 * p * p, '']]), String(2 * c), '0'] },
  ]);
  const pt = rng.pick(fam.pts);
  const [fxx, fyy, fxy] = fam.h(...pt);
  const D = fxx * fyy - fxy * fxy;
  const kind = testKind(fxx, fyy, fxy);
  return q({
    prompt: R`The function \(f(x, y) = ${fam.f}\) has a critical point at \(${Pt(pt)}\). Classify it.`,
    correct: KIND[kind],
    wrong: kindChoices(kind, D),
    solution: [
      R`\(f_{xx} = ${fam.hTex[0]}\), \(f_{yy} = ${fam.hTex[1]}\) and \(f_{xy} = ${fam.hTex[2]}\). At \(${Pt(pt)}\) these are \(${fxx}\), \(${fyy}\) and \(${fxy}\).`,
      R`\(D = ${product(fxx, fyy)} - (${fxy})^{2} = ${D}\).`,
      D > 0 ? R`\(D > 0\) and \(f_{xx} = ${fxx}\) is ${fxx > 0 ? 'positive' : 'negative'}: a ${KIND[kind]}.` : R`\(D < 0\): a saddle point.`,
    ],
    rule: 1,
    skill: 'second derivative test',
    check: () => {
      const found = numericKind(fam.js, pt);
      return found === kind ? true : `numerically the point is ${found}`;
    },
  });
}

function hardAbsoluteRect(rng) {
  // f = g(x) + h(y) with g = a·x² − 2a·xs·x and h = b·y² − 2b·ys·y: vertices at x = xs and y = ys
  const [a, b] = [rng.pick([-2, -1, 1, 2]), rng.pick([-2, -1, 1, 2])];
  const [x1, y1] = [rng.int(-1, 1), rng.int(-1, 1)];
  const [x2, y2] = [x1 + rng.int(2, 4), y1 + rng.int(2, 4)];
  // the vertex is usually inside the rectangle, so that the interior critical point matters
  const [xs, ys] = [rng.bool(0.7) ? rng.int(x1 + 1, x2 - 1) : rng.pick([x1 - 1, x2 + 1]), rng.bool(0.7) ? rng.int(y1 + 1, y2 - 1) : rng.pick([y1 - 1, y2 + 1])];
  const k = rng.int(-4, 4);
  const f = mpClean([[a, 2, 0], [b, 0, 2], [-2 * a * xs, 1, 0], [-2 * b * ys, 0, 1], [k, 0, 0]]);
  const val = (x, y) => mpEval(f, x, y);
  const xsIn = xs > x1 && xs < x2;
  const ysIn = ys > y1 && ys < y2;
  const cand = [];
  for (const x of [x1, x2, ...(xsIn ? [xs] : [])]) for (const y of [y1, y2, ...(ysIn ? [ys] : [])]) cand.push([x, y, val(x, y)]);
  const max = rng.bool();
  const vals = cand.map((t) => t[2]);
  const ans = max ? Math.max(...vals) : Math.min(...vals);
  const where = cand.find((t) => t[2] === ans);
  const inside = xsIn && ysIn;
  return q({
    prompt: R`Find the absolute ${max ? 'maximum' : 'minimum'} value of \(f(x, y) = ${mpTex(f)}\) on the rectangle \(${x1} \le x \le ${x2}\), \(${y1} \le y \le ${y2}\).`,
    correct: ans,
    wrong: [
      inside && val(xs, ys) !== ans ? { value: val(xs, ys), why: 'That is the value at the critical point. On a closed region, compare it with the values on the boundary as well.' } : null,
      { value: max ? Math.min(...vals) : Math.max(...vals), why: `That is the absolute ${max ? 'minimum' : 'maximum'}.` },
      ...rng.shuffle(vals.filter((v) => v !== ans)).slice(0, 2),
      ans + (max ? 2 : -2),
      ans + (max ? 1 : -1),
    ],
    solution: [
      R`Inside: \(f_{x} = ${mpTex(mpD(f, 0))} = 0\) and \(f_{y} = ${mpTex(mpD(f, 1))} = 0\) give \((${xs}, ${ys})\), which is ${inside ? 'inside the rectangle' : 'not inside the rectangle'}.`,
      R`Boundary: on each edge \(f\) is a function of one variable. Its candidates are the corners${xsIn || ysIn ? R`, and the edge points where \(${[xsIn ? `x = ${xs}` : null, ysIn ? `y = ${ys}` : null].filter(Boolean).join('\\) or \\(')}\)` : ''}.`,
      R`Values at all candidates: ${cand.map(([x, y, v]) => R`\(f(${x}, ${y}) = ${v}\)`).join(', ')}.`,
      R`The ${max ? 'largest' : 'smallest'} is \(${ans}\), at \((${where[0]}, ${where[1]})\).`,
    ],
    rule: 2,
    skill: 'absolute extrema on a region',
    check: () => {
      let best = max ? -1e300 : 1e300;
      for (let i = 0; i <= 200; i++) for (let j = 0; j <= 200; j++) {
        const v = val(x1 + ((x2 - x1) * i) / 200, y1 + ((y2 - y1) * j) / 200);
        best = max ? Math.max(best, v) : Math.min(best, v);
      }
      return checkEqual(ans, best, 2e-3, 'extreme value on the rectangle');
    },
  });
}

function hardBoxVolume(rng) {
  const kind = rng.int(0, 3);
  const k = kind === 0 ? rng.pick([2, 4, 6, 8, 10]) : rng.int(2, 9);
  // each case: the story, the best volume, V as a function of two free dimensions, and how far to search
  const cases = [
    { story: R`A rectangular box with no lid is to be made from ${3 * k * k} cm² of cardboard. Find the largest possible volume of the box.`, ans: (k * k * k) / 2, V: (x, y) => (x * y * (3 * k * k - x * y)) / (2 * (x + y)), top: 2 * k, sol: [R`Maximize \(V = xyz\) subject to \(xy + 2xz + 2yz = ${3 * k * k}\) (a base and four sides).`, R`\(\nabla V = \lambda\nabla g\): \(yz = \lambda(y + 2z)\), \(xz = \lambda(x + 2z)\), \(xy = \lambda(2x + 2y)\). Comparing the equations gives \(x = y = 2z\).`, R`Constraint: \(4z^{2} + 4z^{2} + 4z^{2} = ${3 * k * k}\), so \(z = ${k / 2}\) and \(x = y = ${k}\).`, R`\(V = ${product(k, k, k / 2)} = ${(k * k * k) / 2}\) cm³.`], slip: [k * k * k, R`A cube is best only when the box has a lid. Without one, the best height is half the side of the base.`] },
    { story: R`A closed rectangular box is to have a total surface area of ${6 * k * k} cm². Find the largest possible volume of the box.`, ans: k * k * k, V: (x, y) => (x * y * (3 * k * k - x * y)) / (x + y), top: 2 * k, sol: [R`Maximize \(V = xyz\) subject to \(2xy + 2xz + 2yz = ${6 * k * k}\).`, R`\(\nabla V = \lambda\nabla g\): \(yz = 2\lambda(y + z)\), \(xz = 2\lambda(x + z)\), \(xy = 2\lambda(x + y)\). By symmetry \(x = y = z\): the box is a cube.`, R`Constraint: \(6x^{2} = ${6 * k * k}\), so \(x = ${k}\).`, R`\(V = ${k}^{3} = ${k * k * k}\) cm³.`], slip: [(k * k * k) / 2, R`With a lid, all three dimensions play the same role, so the best box is a cube of side \(${k}\).`] },
    { story: R`An airline requires that the length, width and height of a suitcase add up to at most ${3 * k * 10} cm. Find the largest possible volume of a rectangular suitcase.`, ans: 1000 * k * k * k, V: (x, y) => x * y * (30 * k - x - y), top: 20 * k, sol: [R`Maximize \(V = xyz\) subject to \(x + y + z = ${30 * k}\).`, R`\(\nabla V = \lambda\nabla g\): \(yz = \lambda\), \(xz = \lambda\), \(xy = \lambda\), so \(x = y = z\).`, R`Constraint: \(3x = ${30 * k}\), so \(x = ${10 * k}\).`, R`\(V = ${10 * k}^{3} = ${num(1000 * k * k * k)}\) cm³.`], slip: [(30 * k) ** 3 / 8, R`All three dimensions must share the ${30 * k} cm. Solve \(\nabla V = \lambda\nabla g\) to see that they should be equal.`] },
    { story: R`A parcel service accepts a rectangular box only if its length plus its girth (the distance around the box, at right angles to the length) is at most ${60 * k} cm. Find the largest possible volume of such a box.`, ans: 2000 * k * k * k, V: (y, z) => (60 * k - 2 * y - 2 * z) * y * z, top: 20 * k, sol: [R`With length \(x\) and cross-section \(y\) by \(z\), the girth is \(2y + 2z\). Maximize \(V = xyz\) subject to \(x + 2y + 2z = ${60 * k}\).`, R`\(\nabla V = \lambda\nabla g\): \(yz = \lambda\), \(xz = 2\lambda\), \(xy = 2\lambda\), so \(y = z\) and \(x = 2y\).`, R`Constraint: \(2y + 2y + 2y = ${60 * k}\), so \(y = z = ${10 * k}\) and \(x = ${20 * k}\).`, R`\(V = ${product(20 * k, 10 * k, 10 * k)} = ${num(2000 * k * k * k)}\) cm³.`], slip: [1000 * k * k * k, R`The length counts once but each cross-section dimension counts twice in the girth, so the best length is twice the other two dimensions.`] },
  ][kind];
  return q({
    prompt: cases.story,
    correct: cases.ans,
    unit: 'cm³',
    wrong: [{ value: cases.slip[0], why: cases.slip[1] }, cases.ans * 2, (cases.ans * 3) / 4, (cases.ans * 3) / 2],
    solution: cases.sol,
    rule: 4,
    skill: 'applied optimization',
    check: () => {
      let best = 0;
      for (let i = 1; i < 400; i++) for (let j = 1; j < 400; j++) best = Math.max(best, cases.V((cases.top * i) / 400, (cases.top * j) / 400));
      return checkEqual(cases.ans, best, 1e-4, 'largest volume');
    },
  });
}

// ───────────── Challenge ─────────────

function challengeEllipse(rng) {
  if (rng.bool(0.3)) {
    const a = rng.int(2, 6);
    const b = rng.intExcept(1, 6, [a]);
    const ans = frac(a * b, 2);
    return q({
      prompt: R`Find the maximum value of \(f(x, y) = xy\) on the ellipse \(\dfrac{x^{2}}{${a * a}} + ${b === 1 ? 'y^{2}' : `\\dfrac{y^{2}}{${b * b}}`} = 1\).`,
      correct: ans,
      wrong: [{ value: a * b, why: R`The point \((${a}, ${b})\) is not on the ellipse: there \(\dfrac{x^{2}}{${a * a}} + \dfrac{y^{2}}{${b * b}} = 2\).` }, frac(a * b, 4), frac(a * a * b * b, 2), frac(a + b, 2)],
      solution: [
        R`\(\nabla f = \lambda\nabla g\): \(y = \dfrac{2\lambda x}{${a * a}}\) and \(x = \dfrac{2\lambda y}{${b * b}}\). Dividing one equation by the other gives \(\dfrac{x^{2}}{${a * a}} = \dfrac{y^{2}}{${b * b}}\).`,
        R`With the constraint, each of those fractions is \(\frac{1}{2}\): \(x = \pm\dfrac{${a}}{\sqrt{2}}\) and \(y = \pm\dfrac{${b}}{\sqrt{2}}\).`,
        R`The maximum, with \(x\) and \(y\) of the same sign, is \(xy = \dfrac{${a * b}}{2}${ans.isInt() ? ` = ${ans.tex()}` : ''}\).`,
      ],
      rule: 3,
      skill: 'Lagrange multipliers',
      check: () => {
        let best = -1e300;
        for (let i = 0; i < 7200; i++) best = Math.max(best, a * Math.cos((i * Math.PI) / 3600) * b * Math.sin((i * Math.PI) / 3600));
        return checkEqual(ans.value, best, 1e-5);
      },
    });
  }
  const [u, v, c] = rng.pick(TRIPLES);
  const a = rng.pick([1, 2, 3, 4, 5, 6].filter((d) => u % d === 0));
  const b = rng.pick([1, 2, 3, 4, 5, 6].filter((d) => v % d === 0 && d !== a));
  const [p, s] = [u / a, v / b];
  const sq = (name, d) => (d === 1 ? `${name}^{2}` : `\\dfrac{${name}^{2}}{${d * d}}`);
  return q({
    prompt: R`Find the maximum value of \(f(x, y) = ${terms([[p, 'x'], [s, 'y']])}\) on the ellipse \(${sq('x', a)} + ${sq('y', b)} = 1\).`,
    correct: c,
    wrong: [
      { value: u + v, why: R`\((${a}, ${b})\) is a corner of the box around the ellipse, not a point on it. Use \(\nabla f = \lambda\nabla g\) to find where the lines \(f = k\) just touch the ellipse.` },
      { value: Math.max(u, v), why: R`That is the largest value at the ends of the axes. A point between them does better.` },
      c + 1,
      c - 1,
      2 * c,
    ],
    solution: [
      R`\(\nabla f = \lambda\nabla g\): \(${p} = \dfrac{2\lambda x}{${a * a}}\) and \(${s} = \dfrac{2\lambda y}{${b * b}}\), so \(x = \dfrac{${p * a * a}}{2\lambda}\) and \(y = \dfrac{${s * b * b}}{2\lambda}\).`,
      R`Constraint: \(\dfrac{${u * u}}{4\lambda^{2}} + \dfrac{${v * v}}{4\lambda^{2}} = 1\), so \(4\lambda^{2} = ${c * c}\) and \(2\lambda = \pm ${c}\).`,
      R`With \(2\lambda = ${c}\): \((x, y) = \left(${frac(p * a * a, c).tex()}, ${frac(s * b * b, c).tex()}\right)\) and \(f = \dfrac{${u * u} + ${v * v}}{${c}} = ${c}\).`,
    ],
    rule: 3,
    skill: 'Lagrange multipliers',
    check: () => {
      let best = -1e300;
      for (let i = 0; i < 7200; i++) best = Math.max(best, p * a * Math.cos((i * Math.PI) / 3600) + s * b * Math.sin((i * Math.PI) / 3600));
      return checkEqual(c, best, 1e-5);
    },
  });
}

function challengeSaddleK(rng) {
  const [a, c] = rng.pick([[1, 1], [1, 4], [4, 1], [2, 2], [1, 9], [9, 1], [3, 3], [2, 8], [8, 2], [4, 4], [5, 5], [3, 12], [12, 3]]);
  const s = 2 * Math.round(Math.sqrt(a * c));
  const saddle = rng.bool();
  const f = terms([[a, 'x^{2}'], [1, 'kxy'], [c, 'y^{2}']]);
  return q({
    prompt: R`For which values of \(k\) does \(f(x, y) = ${f}\) have a ${saddle ? 'saddle point' : 'local minimum'} at the origin, according to the second derivative test?`,
    correct: M(saddle ? `|k| > ${s}` : `|k| < ${s}`),
    wrong: [
      { value: M(saddle ? `|k| < ${s}` : `|k| > ${s}`), why: R`\(D = ${4 * a * c} - k^{2}\). A saddle needs \(D < 0\); a minimum needs \(D > 0\).` },
      { value: M(saddle ? `k > ${s}` : `k < ${s}`), why: R`\(D\) depends on \(k^{2}\), so large negative values of \(k\) behave like large positive ones.` },
      { value: M(saddle ? `|k| > ${4 * a * c}` : `|k| < ${4 * a * c}`), why: R`\(k^{2}\) is compared with \(${4 * a * c}\). Take the square root to get the condition on \(|k|\).` },
      M(saddle ? `|k| > ${s / 2}` : `|k| < ${s / 2}`),
      M(saddle ? `k < -${s}` : `k > -${s}`),
    ],
    solution: [
      R`\(f_{xx} = ${2 * a}\), \(f_{yy} = ${2 * c}\) and \(f_{xy} = k\), so \(D = ${product(2 * a, 2 * c)} - k^{2} = ${4 * a * c} - k^{2}\).`,
      saddle ? R`A saddle point needs \(D < 0\): \(k^{2} > ${4 * a * c}\).` : R`A local minimum needs \(D > 0\) (and \(f_{xx} = ${2 * a} > 0\), which holds): \(k^{2} < ${4 * a * c}\).`,
      R`So \(|k| ${saddle ? '>' : '<'} ${s}\). (When \(|k| = ${s}\), \(D = 0\) and the test gives no conclusion.)`,
    ],
    rule: 1,
    skill: 'second derivative test',
    check: () => (shape(2 * a, s + 0.5, 2 * c) === 'saddle' && shape(2 * a, -s - 0.5, 2 * c) === 'saddle' && shape(2 * a, s - 0.5, 2 * c) === 'min' && shape(2 * a, 0.5 - s, 2 * c) === 'min' ? true : 'threshold for k is wrong'),
  });
}

function challengeClosestPoint(rng) {
  const { v: n, len } = quadVec(rng, 9);
  const P = [rng.int(-3, 3), rng.int(-3, 3), rng.int(-3, 3)];
  const m = rng.pick([-2, -1, 1, 2]);
  const d = vdot(n, P) + m * len * len;
  const X = vadd(P, vscale(n, m));
  return q({
    prompt: R`Find the point on the plane \(${planeTex(n, d)}\) that is closest to the point \(${Pt(P)}\).`,
    correct: M(Pt(X)),
    wrong: [
      { value: M(Pt(vadd(P, vscale(n, -m)))), why: 'That point is on the other side: substitute it into the plane equation to see that it is not on the plane.' },
      Math.abs(m) !== 1 ? { value: M(Pt(vadd(P, n))), why: R`Moving along the normal is right, but the distance must be chosen so that the point lands on the plane. Solve for the multiplier.` } : null,
      { value: M(Pt(vscale(n, d / (len * len)).map((x) => frac(Math.round(x * len * len), len * len)))), why: R`That is the point of the plane closest to the origin. Measure from \(${Pt(P)}\).` },
      M(Pt(vadd(P, vscale(n, m + 1)))),
      M(Pt(vadd(X, [1, 0, 0]))),
      M(Pt(vadd(P, vscale(n, 2 * m)))),
    ],
    solution: [
      R`Minimize the squared distance \(f = ${[0, 1, 2].map((i) => (P[i] === 0 ? `${'xyz'[i]}^{2}` : `(${terms([[1, 'xyz'[i]], [-P[i], '']])})^{2}`)).join(' + ')}\) subject to \(${planeTex(n, d)}\).`,
      R`\(\nabla f = \lambda\nabla g\) says the vector from \(${Pt(P)}\) to the closest point is a multiple of the normal \(${V(n)}\): \((x, y, z) = ${Pt(P)} + t\,${V(n)}\).`,
      R`Put this into the plane equation: \(${vdot(n, P)} + ${len * len}t = ${d}\), so \(t = ${m}\).`,
      R`The closest point is \(${Pt(X)}\), at distance \(${Math.abs(m) * len}\).`,
    ],
    rule: 3,
    skill: 'closest point',
    check: () => {
      const d2 = (pt) => vlen2(pt.map((c, i) => c - P[i]));
      return vdot(n, X) === d && orthTo(n, 3).every((w) => vdot(n, vadd(X, w)) === d && d2(vadd(X, w)) > d2(X)) ? true : 'another point of the plane is closer';
    },
  });
}

export default {
  id: 'optimization-lagrange',
  title: 'Maxima, Minima & Lagrange Multipliers',
  summary: 'Find and classify critical points, locate absolute extrema on closed regions, and optimize under a constraint with Lagrange multipliers.',
  standards: ['OpenStax Calculus Vol. 3 §4.7', 'OpenStax Calculus Vol. 3 §4.8'],

  explain: {
    intro: R`A function of two variables can have a peak, a pit, or a **saddle**: a point that is a maximum in one direction and a minimum in another. As in single-variable calculus, the search starts where the derivative is zero, which now means that both partial derivatives vanish. When the variables are tied together by a constraint, Lagrange multipliers find the best point without solving the constraint for one variable.`,
    rules: [
      { title: 'Critical points', text: R`A critical point of \(f(x, y)\) is a point where \(f_{x} = 0\) and \(f_{y} = 0\) (or where a partial derivative does not exist). Local maxima and minima can only occur at critical points.`, example: R`For \(f = x^{2} + y^{2} - 2x + 4y\): \(f_{x} = 2x - 2 = 0\) and \(f_{y} = 2y + 4 = 0\) give the critical point \((1, -2)\).` },
      { title: 'Second derivative test', text: R`At a critical point compute \(D = f_{xx}f_{yy} - (f_{xy})^{2}\). If \(D > 0\) and \(f_{xx} > 0\): local minimum. If \(D > 0\) and \(f_{xx} < 0\): local maximum. If \(D < 0\): saddle point. If \(D = 0\): the test gives no conclusion.`, example: R`For \(f = x^{3} - 3x + y^{2}\) at \((1, 0)\): \(f_{xx} = 6\), \(f_{yy} = 2\), \(f_{xy} = 0\), so \(D = 12 > 0\) with \(f_{xx} > 0\): a local minimum.` },
      { title: 'Absolute extrema on a closed, bounded region', text: R`A continuous function on a closed, bounded region has an absolute maximum and minimum. Find the critical points inside the region, then find the largest and smallest values on the boundary (one edge at a time, as single-variable problems, remembering the corners). Compare all the values.`, example: R`On the square \(0 \le x, y \le 3\), \(f = x^{2} - 2x + y^{2} - 4y\) has the interior value \(f(1, 2) = -5\) (the minimum) and the corner value \(f(3, 0) = 3\) (the maximum).` },
      { title: 'Lagrange multipliers', text: R`To maximize or minimize \(f\) subject to a constraint \(g = c\), solve \(\nabla f = \lambda\nabla g\) together with \(g = c\), then compare the values of \(f\) at the solutions. At the best point the level curve of \(f\) just touches the constraint curve, so the two gradients are parallel.`, example: R`Maximize \(xy\) subject to \(x + 2y = 10\): \(y = \lambda\), \(x = 2\lambda\), so \(4\lambda = 10\), giving \((5, \frac{5}{2})\) and \(xy = \frac{25}{2}\).` },
      { title: 'Applied problems', text: R`Name the quantity to optimize (the objective) and the condition that limits the variables (the constraint), each as a formula in the same variables. Then use Lagrange multipliers, or substitute the constraint into the objective.`, example: R`Open box from 12 m² of material: maximize \(V = xyz\) subject to \(xy + 2xz + 2yz = 12\). The best box is \(2 \times 2 \times 1\), with volume 4 m³.` },
    ],
    vocab: [
      { term: 'critical point', def: R`A point where \(f_{x} = 0\) and \(f_{y} = 0\), or where one of them does not exist.` },
      { term: 'saddle point', def: 'A critical point that is neither a local maximum nor a local minimum: the surface rises in some directions and falls in others.' },
      { term: 'discriminant', def: R`\(D = f_{xx}f_{yy} - (f_{xy})^{2}\), the number the second derivative test looks at.` },
      { term: 'constraint', def: R`An equation \(g(x, y) = c\) that the variables must satisfy.` },
      { term: 'Lagrange multiplier', def: R`The number \(\lambda\) in \(\nabla f = \lambda\nabla g\). It measures how fast the best value changes as the constraint constant \(c\) increases.` },
    ],
    mistakes: [
      R`Deciding from \(f_{xx}\) alone. Check \(D\) first: if \(D < 0\) the point is a saddle whatever the sign of \(f_{xx}\).`,
      R`Forgetting to square \(f_{xy}\) or to subtract it in \(D\).`,
      'Stopping at the critical points when the region has a boundary. The absolute maximum or minimum is often on the edge or at a corner.',
      R`Leaving out the constraint equation. \(\nabla f = \lambda\nabla g\) alone has too many unknowns.`,
    ],
    visual: {
      type: 'plot',
      x: [-3.5, 3.5],
      y: [-3.5, 3.5],
      square: true,
      param: [{ x: (t) => 2 * Math.cos(t), y: (t) => 2 * Math.sin(t), t: [0, 2 * Math.PI], color: 'a' }],
      fns: [
        { f: (x) => -x, color: 'c', dashed: true, label: 'f = 0', labelAt: -2.6 },
        { f: (x) => 2 - x, color: 'c', dashed: true, label: 'f = 2', labelAt: -0.6 },
        { f: (x) => 2 * Math.SQRT2 - x, color: 'b', label: 'f = 2√2', labelAt: 2.55 },
      ],
      segments: [{ from: [Math.SQRT2, Math.SQRT2], to: [Math.SQRT2 + 0.8, Math.SQRT2 + 0.8], arrow: true, color: 'd' }],
      points: [{ x: Math.SQRT2, y: Math.SQRT2, label: 'max', color: 'b' }],
      alt: 'The constraint circle x² + y² = 4 with three level lines of f(x, y) = x + y. The lines x + y = 0 and x + y = 2 cross the circle. The line x + y = 2√2 just touches it, at (√2, √2): that point gives the largest value of f on the circle, and there the gradients of f and of the constraint point the same way.',
    },
  },

  examples: [
    {
      title: 'Classifying critical points',
      problem: R`Find and classify the critical points of \(f(x, y) = x^{3} - 3x + y^{2}\).`,
      steps: [
        R`\(f_{x} = 3x^{2} - 3 = 0\) gives \(x = \pm 1\), and \(f_{y} = 2y = 0\) gives \(y = 0\). Critical points: \((1, 0)\) and \((-1, 0)\).`,
        R`\(f_{xx} = 6x\), \(f_{yy} = 2\), \(f_{xy} = 0\), so \(D = 12x\).`,
        R`At \((1, 0)\): \(D = 12 > 0\) and \(f_{xx} = 6 > 0\), a local minimum.`,
        R`At \((-1, 0)\): \(D = -12 < 0\), a saddle point.`,
      ],
      answer: R`Local minimum at \((1, 0)\); saddle point at \((-1, 0)\)`,
    },
    {
      title: 'Absolute extrema on a square',
      problem: R`Find the absolute maximum and minimum of \(f(x, y) = x^{2} - 2x + y^{2} - 4y\) on the square \(0 \le x \le 3\), \(0 \le y \le 3\).`,
      steps: [
        R`Inside: \(f_{x} = 2x - 2 = 0\) and \(f_{y} = 2y - 4 = 0\) give \((1, 2)\), with \(f(1, 2) = -5\).`,
        R`Edges: on \(y = 0\), \(f = x^{2} - 2x\) is smallest at \(x = 1\) (\(f = -1\)). On \(y = 3\), \(f = x^{2} - 2x - 3\) is smallest at \(x = 1\) (\(f = -4\)). On \(x = 0\), \(f = y^{2} - 4y\) is smallest at \(y = 2\) (\(f = -4\)). On \(x = 3\), \(f = y^{2} - 4y + 3\) is smallest at \(y = 2\) (\(f = -1\)).`,
        R`Corners: \(f(0, 0) = 0\), \(f(3, 0) = 3\), \(f(0, 3) = -3\), \(f(3, 3) = 0\).`,
        'Compare all the values found.',
      ],
      answer: R`Absolute maximum \(3\) at \((3, 0)\); absolute minimum \(-5\) at \((1, 2)\)`,
    },
    {
      title: 'A Lagrange multiplier problem',
      problem: R`Find the maximum value of \(f(x, y) = xy\) subject to \(x + 2y = 10\).`,
      steps: [
        R`With \(g = x + 2y\): \(\nabla f = \langle y, x \rangle\) and \(\nabla g = \langle 1, 2 \rangle\).`,
        R`\(\nabla f = \lambda\nabla g\): \(y = \lambda\) and \(x = 2\lambda\).`,
        R`Constraint: \(2\lambda + 2\lambda = 10\), so \(\lambda = \frac{5}{2}\), \(x = 5\) and \(y = \frac{5}{2}\).`,
        R`\(f\left(5, \frac{5}{2}\right) = \frac{25}{2}\). Other points of the line, such as \((10, 0)\), give smaller values, so this is the maximum.`,
      ],
      answer: R`Maximum \(\dfrac{25}{2}\), at \(\left(5, \dfrac{5}{2}\right)\)`,
    },
    {
      title: 'Word problem: the biggest open box',
      word: true,
      problem: 'A box with no lid is to be made from 12 m² of sheet metal. What dimensions give the largest volume, and what is that volume?',
      steps: [
        R`Let the base be \(x\) by \(y\) and the height \(z\). Objective: \(V = xyz\). Constraint (a base and four sides): \(xy + 2xz + 2yz = 12\).`,
        R`\(\nabla V = \lambda\nabla g\): \(yz = \lambda(y + 2z)\), \(xz = \lambda(x + 2z)\), \(xy = \lambda(2x + 2y)\).`,
        R`Multiply the first equation by \(x\) and the second by \(y\): both left sides are \(xyz\), so \(x(y + 2z) = y(x + 2z)\), which gives \(x = y\). Comparing the second and third in the same way gives \(y = 2z\).`,
        R`Constraint with \(x = y = 2z\): \(4z^{2} + 4z^{2} + 4z^{2} = 12\), so \(z = 1\) and \(x = y = 2\).`,
      ],
      answer: 'A base of 2 m by 2 m and a height of 1 m, with volume 4 m³.',
    },
  ],

  models: [
    {
      id: 'second-derivative-test',
      title: 'Second derivative test for a quadratic function',
      intro: 'Choose the coefficients of f(x, y) = a·x² + b·xy + c·y² + d·x + e·y.',
      inputs: [
        { name: 'a', label: 'a (x² coefficient)', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'b', label: 'b (xy coefficient)', type: 'int', min: -5, max: 5, value: 1 },
        { name: 'c', label: 'c (y² coefficient)', type: 'int', min: -5, max: 5, value: 2 },
        { name: 'd', label: 'd (x coefficient)', type: 'int', min: -9, max: 9, value: -4 },
        { name: 'e', label: 'e (y coefficient)', type: 'int', min: -9, max: 9, value: -2 },
      ],
      compute({ a, b, c, d, e }) {
        const D = 4 * a * c - b * b;
        const f = mpClean([[a, 2, 0], [b, 1, 1], [c, 0, 2], [d, 1, 0], [e, 0, 1]]);
        if (D === 0) return { error: 'For these numbers 4ac − b² = 0, so the equations f_x = 0 and f_y = 0 do not have exactly one solution. Change a, b or c.' };
        const [x, y] = [frac(b * e - 2 * c * d, D), frac(b * d - 2 * a * e, D)];
        const value = x.mul(d).add(y.mul(e)).div(2);
        const kind = testKind(2 * a, 2 * c, b);
        return {
          problem: R`Find and classify the critical point of \(f(x, y) = ${mpTex(f)}\).`,
          steps: [
            R`Set the partial derivatives to 0: \(f_{x} = ${mpTex(mpD(f, 0))} = 0\) and \(f_{y} = ${mpTex(mpD(f, 1))} = 0\).`,
            R`Solve the two linear equations: \(x = ${x.tex()}\), \(y = ${y.tex()}\).`,
            R`Second derivatives: \(f_{xx} = ${2 * a}\), \(f_{yy} = ${2 * c}\), \(f_{xy} = ${b}\).`,
            R`\(D = f_{xx}f_{yy} - (f_{xy})^{2} = ${product(2 * a, 2 * c)} - (${b})^{2} = ${D}\).`,
            D > 0 ? R`\(D > 0\) and \(f_{xx} = ${2 * a}\) is ${a > 0 ? 'positive' : 'negative'}, so this is a ${KIND[kind]}. The value there is \(${value.tex()}\).` : R`\(D < 0\), so this is a saddle point. The value there is \(${value.tex()}\).`,
          ],
          answer: R`${KIND[kind][0].toUpperCase()}${KIND[kind].slice(1)} at \(\left(${x.tex()}, ${y.tex()}\right)\)`,
        };
      },
    },
    {
      id: 'budget',
      title: 'Word problem: the best way to spend a budget',
      word: true,
      intro: 'Two goods cost p and q dollars each, and satisfaction is U = xy. Choose the prices and the budget.',
      inputs: [
        { name: 'p', label: 'Price of the first good ($)', type: 'int', min: 1, max: 20, value: 4 },
        { name: 's', label: 'Price of the second good ($)', type: 'int', min: 1, max: 20, value: 6 },
        { name: 'B', label: 'Budget ($)', type: 'int', min: 10, max: 500, value: 120 },
      ],
      compute({ p, s, B }) {
        const [x, y] = [frac(B, 2 * p), frac(B, 2 * s)];
        const U = frac(B * B, 4 * p * s);
        const lam = frac(B, 2 * p * s);
        const [xm, ym] = [B / p, B / s];
        return {
          problem: R`With ${money(B)} to spend on two goods costing ${money(p)} and ${money(s)} each, how many of each (\(x\) and \(y\)) make the satisfaction \(U = xy\) as large as possible?`,
          steps: [
            R`Objective: \(U = xy\). Constraint (spend the whole budget): \(${terms([[p, 'x'], [s, 'y']])} = ${B}\).`,
            R`\(\nabla U = \lambda\nabla g\): \(y = ${terms([[p, '\\lambda']])}\) and \(x = ${terms([[s, '\\lambda']])}\). So \(${terms([[p, 'x']])} = ${terms([[s, 'y']])}\): the same amount of money goes on each good.`,
            R`Half the budget on each: \(${terms([[p, 'x']])} = ${num(B / 2)}\) gives \(x = ${x.tex()}\), and \(${terms([[s, 'y']])} = ${num(B / 2)}\) gives \(y = ${y.tex()}\).`,
            R`Largest satisfaction: \(U = ${U.tex()}\). The multiplier is \(\lambda = ${lam.tex()}\): one more dollar of budget would raise \(U\) by about that much.`,
            'In the picture the budget line just touches the curve U = constant through the best point. Any other point of the line lies on a lower curve.',
          ],
          answer: R`\(x = ${x.tex()}\) and \(y = ${y.tex()}\), giving \(U = ${U.tex()}\)`,
          visual: {
            type: 'plot',
            x: [0, xm * 1.15],
            y: [0, ym * 1.15],
            fns: [
              { f: (t) => (B - p * t) / s, domain: [0, xm], color: 'a', label: 'budget line' },
              { f: (t) => U.value / t, domain: [xm / 40, xm * 1.15], color: 'b', dashed: true },
            ],
            points: [{ x: x.value, y: y.value, label: 'best point', color: 'b' }],
            axisLabels: ['x', 'y'],
            alt: `The budget line from (0, ${num(ym, { places: 1 })}) to (${num(xm, { places: 1 })}, 0) and the curve xy = ${num(U.value, { places: 1 })}. The curve touches the line at one point, (${num(x.value, { places: 1 })}, ${num(y.value, { places: 1 })}), the best choice.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyClassify, easyCriticalPoint, easyLagrangeSetup],
    medium: [mediumClassifyQuadratic, mediumLagrangeCircle, mediumBudget],
    hard: [hardCubicCritical, hardAbsoluteRect, hardBoxVolume],
    challenge: [challengeEllipse, challengeSaddleK, challengeClosestPoint],
  },
};
