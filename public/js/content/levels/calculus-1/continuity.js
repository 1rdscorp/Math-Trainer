import { R, q, frac, terms, poly, polyEval, linear, factor, num, txt, rootsTex, range, checkLimit, checkAll } from '../../lib/index.js';
import { lim, cases, subst, fit, rowTable } from './_shared.js';

const side = (a, s) => `${num(a)}^{${s < 0 ? '-' : '+'}}`;
const KIND = {
  removable: 'a removable discontinuity (a hole)',
  jump: 'a jump discontinuity',
  infinite: 'an infinite discontinuity (a vertical asymptote)',
  none: R`none: \(f\) is continuous there`,
};
const kFmt = (v) => R`\(k = ${num(v)}\)`;

// ───────────── Easy ─────────────

function easyThreeConditions(rng) {
  const a = rng.int(-5, 6);
  const L = rng.int(-6, 9);
  const kind = rng.pick(['yes', 'hole', 'jump', 'moved']);
  const L2 = kind === 'jump' ? rng.intExcept(-6, 9, [L]) : L;
  const v = kind === 'yes' ? L : kind === 'moved' ? rng.intExcept(-6, 9, [L]) : kind === 'jump' ? rng.pick([L, L2]) : null;
  const choice = {
    yes: R`Yes, \(f\) is continuous at \(x = ${a}\)`,
    hole: R`No, because \(f(${a})\) is not defined`,
    jump: R`No, because \(${lim(a)} f(x)\) does not exist`,
    moved: R`No: the limit exists, but it is not equal to \(f(${a})\)`,
  };
  const whyYes = {
    hole: R`Continuity at a point needs \(f(${a})\) to exist. Here it does not.`,
    jump: 'The one-sided limits are different, so there is no limit for the value to match.',
    moved: R`The limit is \(${L}\) but \(f(${a}) = ${v}\). Continuity needs them to be equal.`,
  }[kind];
  const wrong = Object.keys(choice)
    .filter((k) => k !== kind)
    .map((k) => {
      if (k === 'yes') return { value: choice.yes, why: whyYes };
      if (k === 'moved' && kind === 'jump') return { value: choice.moved, why: 'The one-sided limits are different, so the two-sided limit does not exist at all.' };
      if (k === 'jump' && kind !== 'jump') return { value: choice.jump, why: R`Both one-sided limits equal \(${L}\), so the limit exists.` };
      return choice[k];
    });
  const limitStep = kind === 'jump' ? R`Limit: the one-sided limits \(${L}\) and \(${L2}\) are different, so \(${lim(a)} f(x)\) does not exist.` : R`Limit: both one-sided limits equal \(${L}\), so \(${lim(a)} f(x) = ${L}\).`;
  const last = {
    yes: R`The limit equals the value (\(${L} = ${L}\)), so all three conditions hold: \(f\) is continuous at \(x = ${a}\).`,
    hole: R`\(f(${a})\) is not defined, so the first condition fails: \(f\) is not continuous at \(x = ${a}\).`,
    jump: R`Without a limit, \(f\) cannot be continuous at \(x = ${a}\).`,
    moved: R`The limit \(${L}\) is not equal to the value \(${v}\), so the third condition fails.`,
  }[kind];
  return q({
    prompt: R`Suppose ${v == null ? R`\(f(${a})\) is not defined` : R`\(f(${a}) = ${v}\)`}, \(${lim(side(a, -1))} f(x) = ${L}\) and \(${lim(side(a, 1))} f(x) = ${L2}\). Is \(f\) continuous at \(x = ${a}\)?`,
    correct: choice[kind],
    wrong,
    solution: [R`Continuity at \(x = ${a}\) needs three things: \(f(${a})\) is defined, \(${lim(a)} f(x)\) exists, and the two are equal.`, limitStep, last],
    rule: 0,
    skill: 'definition of continuity',
  });
}

function easyGraphType(rng) {
  const a = rng.int(-2, 2);
  const type = rng.pick(['removable', 'jump', 'infinite', 'none']);
  const h = rng.int(1, 4);
  const m = rng.pick([-1, -0.5, 0.5, 1]);
  const base = { type: 'plot', x: [a - 4, a + 4], y: [-3.5, 9.5], step: [1, 1] };
  let visual;
  let why;
  let steps;
  if (type === 'removable') {
    const moved = rng.bool(0.5);
    const v = h + rng.pick([2, 3, 4]);
    visual = {
      ...base,
      fns: [{ f: (x) => h + m * (x - a) }],
      points: [{ x: a, y: h, open: true }, ...(moved ? [{ x: a, y: v }] : [])],
      alt: `Graph of f: a straight line with an open circle at (${txt(a)}, ${h})${moved ? ` and a separate filled dot at (${txt(a)}, ${v})` : ''}.`,
    };
    why = { none: 'The open circle shows that the point on the line is missing from the graph, so the graph has a gap there.', jump: 'Both sides approach the same height, so there is no jump. Only a single point is missing or out of place.' };
    steps = [R`From both sides the graph approaches the same height, \(${h}\), so \(${lim(a)} f(x) = ${h}\) exists.`, moved ? R`But \(f(${a}) = ${v}\), which is not equal to the limit.` : R`But \(f(${a})\) is not defined (open circle).`, 'A limit that exists but is not matched by the value is a removable discontinuity: filling the hole would repair it.'];
  } else if (type === 'jump') {
    const d = rng.pick([-2, 2, 3]);
    const m2 = rng.pick([-0.5, 0.5]);
    const leftClosed = rng.bool(0.5);
    visual = {
      ...base,
      fns: [{ f: (x) => h + m * (x - a), domain: [a - 4, a], color: 'a' }, { f: (x) => h + d + m2 * (x - a), domain: [a, a + 4], color: 'a' }],
      points: [{ x: a, y: h, open: !leftClosed }, { x: a, y: h + d, open: leftClosed }],
      alt: `Graph of f: to the left of x = ${txt(a)} a line reaching height ${h} (${leftClosed ? 'filled dot' : 'open circle'}); to the right a line starting at height ${txt(h + d)} (${leftClosed ? 'open circle' : 'filled dot'}).`,
    };
    why = { removable: 'A removable discontinuity needs both sides to approach the same height. Here they approach different heights.', none: 'The graph breaks: the left and right pieces do not meet.' };
    steps = [R`From the left the graph approaches height \(${h}\). From the right it approaches height \(${h + d}\).`, 'Both one-sided limits are finite, but they are different.', 'That is a jump discontinuity.'];
  } else if (type === 'infinite') {
    const even = rng.bool(0.4);
    const s = rng.sign();
    const f = even ? (x) => h + s / (x - a) ** 2 : (x) => h + s / (x - a);
    visual = {
      ...base,
      fns: [{ f, domain: [a - 4, a - 0.03], color: 'a' }, { f, domain: [a + 0.03, a + 4], color: 'a' }],
      vlines: [{ x: a }],
      alt: `Graph of f with a dashed vertical line at x = ${txt(a)}. Near that line the graph shoots ${even ? (s > 0 ? 'up on both sides' : 'down on both sides') : s > 0 ? 'down on the left side and up on the right side' : 'up on the left side and down on the right side'}; far from the line it levels off near height ${h}.`,
    };
    why = { jump: 'In a jump, both one-sided limits are finite. Here the graph is unbounded near the dashed line.', removable: 'A hole can be filled with one point. Here the outputs are unbounded, so no single value repairs the graph.' };
    steps = [R`As \(x \to ${a}\) the outputs grow without bound.`, R`The line \(x = ${a}\) is a vertical asymptote.`, 'That is an infinite discontinuity.'];
  } else {
    const corner = rng.bool(0.6);
    const f = corner ? (x) => h + Math.abs(m) * 1.5 * Math.abs(x - a) : (x) => h + 0.3 * (x - a) ** 2;
    visual = {
      ...base,
      fns: [{ f }],
      points: [{ x: a, y: h }],
      alt: `Graph of f: an unbroken ${corner ? 'V-shaped graph with a sharp corner' : 'U-shaped curve with its lowest point'} at the filled dot (${txt(a)}, ${h}).`,
    };
    why = { jump: corner ? 'A sharp corner is not a break. The two sides meet at the same point.' : 'The curve passes through the dot without a break.', removable: 'The filled dot lies on the graph, so no point is missing.' };
    steps = [R`From both sides the graph approaches height \(${h}\), and the filled dot shows \(f(${a}) = ${h}\).`, R`The limit equals the value, so \(f\) is continuous at \(x = ${a}\)${corner ? ' (a corner is still an unbroken graph)' : ''}.`];
  }
  return q({
    prompt: R`The graph of \(f\) is shown. What kind of discontinuity, if any, does \(f\) have at \(x = ${a}\)?`,
    visual,
    correct: KIND[type],
    wrong: Object.keys(KIND).filter((k) => k !== type).map((k) => (why[k] ? { value: KIND[k], why: why[k] } : KIND[k])),
    solution: steps,
    rule: 1,
    skill: 'types of discontinuity',
  });
}

function easyRationalWhere(rng) {
  const a = rng.nonzero(-7, 7);
  const two = rng.bool(0.5);
  const b = two ? rng.intExcept(-7, 7, [0, a, -a]) : a;
  const p = rng.intExcept(-8, 8, [0, a, -a, b, -b]);
  const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
  const den = two ? `${factor(lo)}${factor(hi)}` : linear(1, -a);
  const D = (x) => (two ? (x - a) * (x - b) : x - a);
  const at = (...xs) => (xs.length === 1 ? R`\(x = ${xs[0]}\) only` : R`\(x = ${xs[0]}\) and \(x = ${xs[1]}\)`);
  return q({
    prompt: R`For which values of \(x\) is \(f(x) = \dfrac{${linear(1, p)}}{${den}}\) discontinuous?`,
    correct: two ? at(lo, hi) : at(a),
    wrong: [
      { value: two ? at(-hi, -lo) : at(-a), why: two ? R`Solve each factor \(= 0\): \(${linear(1, -lo)} = 0\) gives \(x = ${lo}\).` : R`Solve \(${linear(1, -a)} = 0\): that gives \(x = ${a}\).` },
      { value: at(-p), why: R`At \(x = ${-p}\) the numerator is 0, so \(f(${-p}) = 0\). That is an ordinary point of the graph.` },
      two ? { value: at(lo), why: 'Each factor of the denominator gives a value where the function is not defined.' } : { value: 'nowhere: it is continuous for all real numbers', why: 'A rational function is not defined, and so not continuous, where its denominator is 0.' },
      two ? at(hi) : at(Math.min(a, -p), Math.max(a, -p)),
    ],
    solution: [
      'A rational function is continuous at every point of its domain. It fails to be continuous only where the denominator is 0.',
      two ? R`Set the denominator equal to 0: \(${den} = 0\) gives \(x = ${lo}\) or \(x = ${hi}\).` : R`Set the denominator equal to 0: \(${den} = 0\) gives \(x = ${a}\).`,
      two ? R`\(f\) is discontinuous at \(x = ${lo}\) and \(x = ${hi}\).` : R`\(f\) is discontinuous only at \(x = ${a}\).`,
    ],
    rule: 2,
    skill: 'where a function is continuous',
    check: () => (D(a) === 0 && D(b) === 0 && D(-p) !== 0 && D(-a) !== 0 ? true : 'denominator zeros are off'),
  });
}

function easyUseContinuity(rng) {
  const a = rng.int(-4, 6);
  const v = rng.nonzero(-6, 8);
  const c = rng.int(2, 6);
  const d = rng.nonzero(-9, 9);
  const k = rng.intExcept(-5, 5, [0, -a]);
  const form = rng.pick(['linear', 'product', 'value']);
  const first = R`\(f\) is continuous at \(x = ${a}\), so \(${lim(a)} f(x) = f(${a}) = ${v}\).`;
  if (form === 'value') {
    return q({
      prompt: R`A function \(g\) is continuous at \(x = ${a}\), and \(${lim(a)} g(x) = ${v}\). What is \(g(${a})\)?`,
      correct: v,
      wrong: [{ value: 'It cannot be determined', why: 'Continuity means exactly that the value equals the limit.' }, { value: a, why: R`\(${a}\) is the input. Continuity says the output \(g(${a})\) equals the limit.` }, 0, -v],
      solution: [R`Continuous at \(x = ${a}\) means \(${lim(a)} g(x) = g(${a})\).`, R`So \(g(${a}) = ${v}\).`],
      rule: 0,
      skill: 'definition of continuity',
    });
  }
  const isLin = form === 'linear';
  const ans = isLin ? c * v + d : (a + k) * v;
  return q({
    prompt: R`A function \(f\) is continuous at \(x = ${a}\) and \(f(${a}) = ${v}\). Find \(${lim(a)} ${isLin ? R`\left[${c}f(x) ${d > 0 ? '+' : '-'} ${Math.abs(d)}\right]` : R`\left[(${linear(1, k)})\,f(x)\right]`}\).`,
    correct: ans,
    wrong: isLin
      ? [{ value: 'It cannot be determined', why: R`Continuity gives the limit of \(f\): it equals \(f(${a})\).` }, c * v, v + d, c * (v + d)]
      : [{ value: 'It cannot be determined', why: R`Continuity gives the limit of \(f\): it equals \(f(${a})\).` }, { value: k * v, why: R`The factor \(${linear(1, k)}\) tends to \(${a + k}\), not \(${k}\).` }, v, a * v],
    solution: [first, isLin ? R`By the limit laws the limit is \(${c}(${v}) ${d > 0 ? '+' : '-'} ${Math.abs(d)} = ${ans}\).` : R`The factor \(${linear(1, k)}\) tends to \(${a + k}\), so the limit is \((${a + k})(${v}) = ${ans}\).`],
    rule: 0,
    skill: 'definition of continuity',
    check: () => checkLimit((x) => (isLin ? c * (v + 3 * (x - a)) + d : (x + k) * (v + 3 * (x - a))), a, ans),
  });
}

// ───────────── Medium ─────────────

function mediumFindK(rng) {
  const form = rng.pick(['kx', 'plusk', 'kx2']);
  const a = form === 'kx2' ? rng.pick([-3, -2, 2, 3]) : rng.nonzero(-3, 4);
  const k = rng.nonzero(-5, 5);
  let rows;
  let leftAt;
  let rightAt;
  let leftTex;
  let rightVal;
  let wrong;
  if (form === 'kx') {
    const b = rng.int(-6, 6);
    const c = k * a + b - a * a;
    rows = [[terms([[1, 'kx'], [b, '']]), `x < ${a}`], [poly([1, 0, c]), `x \\ge ${a}`]];
    leftAt = (kk) => kk * a + b;
    rightAt = () => a * a + c;
    leftTex = terms([[a, 'k'], [b, '']]);
    rightVal = a * a + c;
    wrong = [{ value: rightVal - b, why: R`After moving \(${b}\) across, divide by the coefficient of \(k\).` }, -k, c - b, k + 1];
  } else if (form === 'plusk') {
    const m = rng.nonzero(-4, 4);
    const b = k + a * a - m * a;
    rows = [['x^{2} + k', `x \\le ${a}`], [linear(m, b), `x > ${a}`]];
    leftAt = (kk) => a * a + kk;
    rightAt = () => m * a + b;
    leftTex = terms([[a * a, ''], [1, 'k']]);
    rightVal = m * a + b;
    wrong = [{ value: rightVal + a * a, why: R`\(${a * a}\) moves to the other side with its sign changed.` }, rightVal, -k, b];
  } else {
    const m = rng.nonzero(-4, 4);
    const b = k * a * a - m * a;
    rows = [['kx^{2}', `x < ${a}`], [linear(m, b), `x \\ge ${a}`]];
    leftAt = (kk) => kk * a * a;
    rightAt = () => m * a + b;
    leftTex = terms([[a * a, 'k']]);
    rightVal = m * a + b;
    wrong = [{ value: rightVal, why: R`\(x^{2}\) at \(x = ${a}\) is \(${a * a}\), so the equation is \(${leftTex} = ${rightVal}\).` }, -k, a === 1 || a === -1 ? k + 2 : frac(rightVal, a), k + 1];
  }
  return q({
    prompt: R`For what value of \(k\) is \(f(x) = ${cases(rows)}\) continuous at \(x = ${a}\)?`,
    correct: k,
    fmt: kFmt,
    wrong,
    solution: [
      R`The pieces must meet at \(x = ${a}\): the left-hand limit must equal the right-hand limit.`,
      R`Substitute \(x = ${a}\) into each piece: \(${leftTex}\) and \(${rightVal}\).`,
      R`Solve \(${leftTex} = ${rightVal}\): \(k = ${k}\).`,
    ],
    rule: 3,
    skill: 'continuity of piecewise functions',
    check: () => (Math.abs(leftAt(k) - rightAt(k)) < 1e-9 ? true : `pieces do not meet: ${leftAt(k)} vs ${rightAt(k)}`),
  });
}

function mediumClassify(rng) {
  const a = rng.int(-5, 5);
  const b = rng.intExcept(-6, 6, [a]);
  const c = rng.intExcept(-6, 6, [a, b]);
  const top = [1, -(a + b), a * b];
  const bot = [1, -(a + c), a * c];
  const f = (x) => polyEval(top, x) / polyEval(bot, x);
  const where = rng.pick(['hole', 'hole', 'pole', 'pole', 'zero']);
  const p = { hole: a, pole: c, zero: b }[where];
  const type = { hole: 'removable', pole: 'infinite', zero: 'none' }[where];
  const factored = R`f(x) = \dfrac{${factor(a)}${factor(b)}}{${factor(a)}${factor(c)}}`;
  const why = {
    hole: { infinite: R`The factor \(${factor(a)}\) cancels, so the limit at \(x = ${a}\) is finite.`, none: R`\(f(${a})\) has the form \(\frac{0}{0}\): it is not defined, so \(f\) cannot be continuous there.` },
    pole: { removable: R`The factor \(${factor(c)}\) does not cancel, so the outputs are unbounded near \(x = ${c}\).`, jump: 'A jump has two finite one-sided limits. Here the outputs are unbounded.' },
    zero: { removable: R`Only the numerator is 0 at \(x = ${b}\), so \(f(${b}) = 0\) is defined and equals the limit.`, infinite: R`The denominator is not 0 at \(x = ${b}\). Only the numerator is.` },
  }[where];
  const last = {
    hole: R`At \(x = ${a}\) the common factor cancels and \(${lim(a)} f(x) = ${frac(a - b, a - c).tex()}\) exists, but \(f(${a})\) is not defined: a removable discontinuity.`,
    pole: R`At \(x = ${c}\) the denominator is 0 and the numerator is not, so \(|f(x)| \to \infty\): an infinite discontinuity.`,
    zero: R`At \(x = ${b}\) the denominator is \(${polyEval(bot, b)}\), not 0, so \(f\) is defined and continuous there (\(f(${b}) = 0\)).`,
  }[where];
  return q({
    prompt: R`What kind of discontinuity, if any, does \(f(x) = \dfrac{${poly(top)}}{${poly(bot)}}\) have at \(x = ${p}\)?`,
    correct: KIND[type],
    wrong: Object.keys(KIND).filter((k) => k !== type).map((k) => (why[k] ? { value: KIND[k], why: why[k] } : KIND[k])),
    solution: [R`Factor: \(${factored}\).`, last],
    rule: 1,
    skill: 'types of discontinuity',
    check: () =>
      where === 'hole'
        ? checkLimit(f, a, (a - b) / (a - c))
        : where === 'pole'
          ? Math.abs(f(c + 1e-7)) > 1e4 || 'no blow-up at the pole'
          : checkAll(f(b) === 0 || 'f(b) should be 0', checkLimit(f, b, 0, { tol: 1e-4 })),
  });
}

function mediumRemove(rng) {
  const form = rng.pick(['poly', 'poly', 'recip', 'sine']);
  const a = form === 'sine' ? 0 : rng.nonzero(-5, 5);
  const b = rng.intExcept(-6, 6, [a, 0]);
  const p = rng.int(2, 9);
  const s = rng.intExcept(2, 9, [p]);
  const top = [1, -(a + b), a * b];
  const spec = {
    poly: {
      tex: R`\dfrac{${poly(top)}}{${linear(1, -a)}}`,
      f: (x) => polyEval(top, x) / (x - a),
      L: frac(a - b, 1),
      wrong: [a + b, b - a, -a - b],
      steps: [R`Factor and cancel: \(\dfrac{${factor(a)}${factor(b)}}{${factor(a)}} = ${linear(1, -b)}\) for \(x \ne ${a}\).`, R`So \(${lim(a)} f(x) = ${a} - ${b < 0 ? `(${b})` : b} = ${a - b}\).`],
    },
    recip: {
      tex: R`\dfrac{${linear(1, -a)}}{${poly(top)}}`,
      f: (x) => (x - a) / polyEval(top, x),
      L: frac(1, a - b),
      wrong: [frac(a - b, 1), frac(1, b - a), frac(1, a + b === 0 ? 2 * a : a + b)],
      steps: [R`Factor and cancel: \(\dfrac{${factor(a)}}{${factor(a)}${factor(b)}} = \dfrac{1}{${linear(1, -b)}}\) for \(x \ne ${a}\).`, R`So \(${lim(a)} f(x) = \dfrac{1}{${a} - ${b < 0 ? `(${b})` : b}} = ${frac(1, a - b).tex()}\).`],
    },
    sine: {
      tex: R`\dfrac{\sin ${p}x}{${s}x}`,
      f: (x) => Math.sin(p * x) / (s * x),
      L: frac(p, s),
      wrong: [{ value: 1, why: R`\(\dfrac{\sin u}{u} \to 1\) needs the same \(u\) on top and bottom. Here a factor \(\frac{${p}}{${s}}\) is left over.` }, frac(s, p), p],
      steps: [R`\(\dfrac{\sin ${p}x}{${s}x} = \dfrac{${p}}{${s}} \cdot \dfrac{\sin ${p}x}{${p}x}\), and \(\dfrac{\sin u}{u} \to 1\) as \(u \to 0\).`, R`So \(${lim(0)} f(x) = ${frac(p, s).tex()}\).`],
    },
  }[form];
  return q({
    prompt: R`The function \(f(x) = ${spec.tex}\) is not defined at \(x = ${a}\). What value should be assigned to \(f(${a})\) to make \(f\) continuous there?`,
    correct: spec.L,
    wrong: [{ value: 0, why: R`At \(x = ${a}\) the formula gives \(\frac{0}{0}\), which is not 0. Use the limit instead.` }, ...spec.wrong, { value: 'No value works', why: 'The limit exists, so the hole can be filled with that limit.' }],
    solution: [R`The discontinuity can be removed if \(${lim(a)} f(x)\) exists: define \(f(${a})\) to be that limit.`, ...spec.steps, R`Define \(f(${a}) = ${spec.L.tex()}\).`],
    rule: 4,
    skill: 'removing a discontinuity',
    check: () => checkLimit(spec.f, a, spec.L.value),
  });
}

const IVT_STORIES = [
  { text: (p, q2) => `The temperature in a greenhouse changes continuously. It is ${p}°C at 6 a.m. and ${q2}°C at noon.`, ask: 'Which temperature must occur at some time between 6 a.m. and noon?', unit: '°C', noun: 'temperature' },
  { text: (p, q2) => `The speed of a train changes continuously. It is ${p} km/h when the train passes one signal and ${q2} km/h when it passes the next.`, ask: 'Which speed must the train have at some moment between the two signals?', unit: 'km/h', noun: 'speed' },
  { text: (p, q2) => `The depth of water in a tank changes continuously. It is ${p} cm at 9 a.m. and ${q2} cm at 5 p.m.`, ask: 'Which depth must occur at some time between 9 a.m. and 5 p.m.?', unit: 'cm', noun: 'depth' },
  { text: (p, q2) => `A weather balloon's height changes continuously. It is ${p} m above the ground at one moment and ${q2} m above the ground ten minutes later.`, ask: 'Which height must the balloon have at some moment in between?', unit: 'm', noun: 'height' },
];

function mediumIVTStory(rng) {
  const s = rng.pick(IVT_STORIES);
  const p = rng.int(12, 80);
  let q2 = p + rng.sign() * rng.int(6, 30);
  if (q2 < 6) q2 = p + rng.int(6, 30);
  const lo = Math.min(p, q2);
  const hi = Math.max(p, q2);
  const N = rng.int(lo + 1, hi - 1);
  const above = hi + rng.int(1, 9);
  const below = Math.max(1, lo - rng.int(1, 9));
  const far = rng.bool(0.5) ? above + rng.int(2, 6) : Math.max(0, below - rng.int(1, 4));
  return q({
    prompt: `${s.text(p, q2)} ${s.ask}`,
    correct: N,
    unit: s.unit,
    wrong: [
      { value: above, why: `Values above ${hi} ${s.unit} may or may not occur. The theorem only guarantees the values between ${lo} and ${hi}.` },
      { value: below, why: `Values below ${lo} ${s.unit} may or may not occur. The theorem only guarantees the values between ${lo} and ${hi}.` },
      far,
    ],
    solution: [
      `The ${s.noun} is a continuous function of time, and its values at the two times are ${p} and ${q2}.`,
      `By the Intermediate Value Theorem it takes every value between ${lo} and ${hi} at some time in between.`,
      `${N} is between ${lo} and ${hi}, so ${N} ${s.unit} must occur. The other values are outside that range, so nothing guarantees them.`,
    ],
    rule: 5,
    skill: 'Intermediate Value Theorem',
    check: () => (N > lo && N < hi && [above, below, far].every((w) => w < lo || w > hi) ? true : 'choices are not on the right side of the range'),
  });
}

// ───────────── Hard ─────────────

function hardFindK(rng) {
  const form = rng.pick(['B1', 'B2', 'B3']);
  if (form === 'B3') {
    const r1 = rng.int(-4, 4);
    const r2 = rng.intExcept(-4, 5, [r1, -r1]);
    const a = r1 + r2;
    const c = a - r1 * r2;
    const rows = [[terms([[1, 'x'], [1, 'k^{2}']]), `x < ${a}`], [terms([[1, 'kx'], [c, '']]), `x \\ge ${a}`]];
    const gap = (k) => a + k * k - (k * a + c);
    const sols = (list) => R`\(${rootsTex(list, 'k')}\)`;
    return q({
      prompt: R`Find all values of \(k\) for which \(f(x) = ${cases(rows)}\) is continuous at \(x = ${a}\).`,
      correct: sols([r1, r2]),
      wrong: [
        { value: sols([r1]), why: R`The equation for \(k\) is quadratic, and both of its solutions make the pieces meet.` },
        { value: sols([-r1, -r2]), why: R`Check the signs when factoring \(${poly([1, -a, a - c], 'k')}\).` },
        sols([r2]),
        sols([r1 + 1, r2 - 1 === r1 + 1 ? r2 + 2 : r2 - 1]),
      ],
      solution: [
        R`The pieces must meet at \(x = ${a}\): \(${terms([[a, ''], [1, 'k^{2}']])} = ${terms([[a, 'k'], [c, '']])}\).`,
        R`Rearrange: \(${poly([1, -a, a - c], 'k')} = 0\).`,
        R`Factor: \(${factor(r1, 'k')}${factor(r2, 'k')} = 0\), so \(${rootsTex([r1, r2], 'k')}\).`,
      ],
      rule: 3,
      skill: 'continuity of piecewise functions',
      check: () => (gap(r1) === 0 && gap(r2) === 0 ? true : 'pieces do not meet for the claimed k'),
    });
  }
  const k = rng.nonzero(-4, 4);
  let a;
  let rows;
  let gap;
  let eq;
  let kCoef;
  let rhs;
  if (form === 'B1') {
    a = rng.intExcept(-4, 4, [-1, 0]);
    const m = a * a - k * (a + 1);
    rows = [[terms([[1, 'kx'], [m, '']]), `x < ${a}`], ['x^{2} - k', `x \\ge ${a}`]];
    gap = (kk) => kk * a + m - (a * a - kk);
    eq = R`${terms([[a, 'k'], [m, '']])} = ${terms([[a * a, ''], [-1, 'k']])}`;
    kCoef = a + 1;
    rhs = a * a - m;
  } else {
    a = rng.pick([-3, -2, 2, 3]);
    const c = rng.nonzero(-4, 4);
    const m = c * a - k * (a * a - 1);
    rows = [[terms([[1, 'kx^{2}'], [m, '']]), `x \\le ${a}`], [terms([[c, 'x'], [1, 'k']]), `x > ${a}`]];
    gap = (kk) => kk * a * a + m - (c * a + kk);
    eq = R`${terms([[a * a, 'k'], [m, '']])} = ${terms([[c * a, ''], [1, 'k']])}`;
    kCoef = a * a - 1;
    rhs = c * a - m;
  }
  return q({
    prompt: R`For what value of \(k\) is \(f(x) = ${cases(rows)}\) continuous at \(x = ${a}\)?`,
    correct: k,
    fmt: kFmt,
    wrong: [
      { value: frac(rhs, kCoef - 1 === 0 ? 3 : kCoef - 1), why: R`\(k\) appears in both pieces. Collect both \(k\)-terms on one side before dividing.` },
      { value: -k, why: 'Check the signs when the terms are moved across the equals sign.' },
      frac(rhs, kCoef + 1 === 0 ? 3 : kCoef + 1),
      k + 1,
      k - 2,
    ],
    solution: [
      R`The pieces must meet at \(x = ${a}\). Substitute \(x = ${a}\) into both: \(${eq}\).`,
      R`Collect the \(k\)-terms: \(${terms([[kCoef, 'k']])} = ${rhs}\).`,
      R`\(k = ${k}\).`,
    ],
    rule: 3,
    skill: 'continuity of piecewise functions',
    check: () => (Math.abs(gap(k)) < 1e-9 ? true : 'pieces do not meet for the claimed k'),
  });
}

function hardThreePieces(rng) {
  const a = rng.int(-3, 1);
  const b = a + rng.int(2, 3);
  const m2 = rng.nonzero(-3, 3);
  const k2 = rng.int(-5, 5);
  const p2 = (x) => m2 * x + k2;
  const contA = rng.bool(0.5);
  const contB = rng.bool(0.5);
  const m1 = rng.intExcept(-3, 3, [0, m2]);
  const k1 = p2(a) - m1 * a + (contA ? 0 : rng.pick([-3, -2, -1, 1, 2, 3]));
  const k3 = p2(b) - b * b + (contB ? 0 : rng.pick([-3, -2, -1, 1, 2, 3]));
  const f = (x) => (x < a ? m1 * x + k1 : x < b ? p2(x) : x * x + k3);
  const rows = [[linear(m1, k1), `x < ${a}`], [linear(m2, k2), `${a} \\le x < ${b}`], [poly([1, 0, k3]), `x \\ge ${b}`]];
  const choice = {
    none: R`Nowhere: \(f\) is continuous for all \(x\)`,
    a: R`At \(x = ${a}\) only`,
    b: R`At \(x = ${b}\) only`,
    both: R`At \(x = ${a}\) and at \(x = ${b}\)`,
  };
  const key = contA ? (contB ? 'none' : 'b') : contB ? 'a' : 'both';
  const why = {
    none: 'Each formula is continuous on its own, but the pieces also have to meet where the formula changes.',
    both: 'A change of formula does not have to cause a break. Compare the two pieces at each boundary.',
    a: R`Compare the pieces at \(x = ${a}\) and at \(x = ${b}\): substitute into the formulas on each side.`,
    b: R`Compare the pieces at \(x = ${a}\) and at \(x = ${b}\): substitute into the formulas on each side.`,
  };
  const la = m1 * a + k1;
  const lb = p2(b);
  const rb = b * b + k3;
  return q({
    prompt: R`At which values of \(x\), if any, is \(f(x) = ${cases(rows)}\) discontinuous?`,
    correct: choice[key],
    wrong: Object.keys(choice).filter((k) => k !== key).map((k) => ({ value: choice[k], why: why[k] })),
    solution: [
      R`Each piece is a polynomial, so \(f\) can only be discontinuous where the formula changes: at \(x = ${a}\) and \(x = ${b}\).`,
      R`At \(x = ${a}\): from the left, \(${subst([m1, k1], a)} = ${la}\); from the right, \(${subst([m2, k2], a)} = ${p2(a)}\). ${contA ? 'These agree, so the function is continuous there.' : 'These differ, so there is a jump.'}`,
      R`At \(x = ${b}\): from the left, \(${subst([m2, k2], b)} = ${lb}\); from the right, \(${subst([1, 0, k3], b)} = ${rb}\). ${contB ? 'These agree, so the function is continuous there.' : 'These differ, so there is a jump.'}`,
    ],
    rule: 3,
    skill: 'continuity of piecewise functions',
    check: () => (Math.abs(f(a - 1e-9) - f(a)) > 0.5 === !contA && Math.abs(f(b - 1e-9) - f(b)) > 0.5 === !contB ? true : 'jumps do not match the answer'),
  });
}

function hardIVTRoot(rng) {
  const n = rng.int(-3, 2);
  const p = rng.int(1, 6);
  const q0 = rng.int(-((n + 1) ** 3) - p * (n + 1) + 1, -(n ** 3) - p * n - 1);
  const coefs = [1, 0, p, q0];
  const f = (x) => polyEval(coefs, x);
  const iv = (lo) => R`\([${lo}, ${lo + 1}]\)`;
  const others = rng.shuffle([n - 2, n - 1, n + 1, n + 2]).slice(0, 3);
  return q({
    prompt: R`Let \(f(x) = ${poly(coefs)}\). On which interval does the Intermediate Value Theorem guarantee a solution of \(f(x) = 0\)?`,
    correct: iv(n),
    wrong: others.map((lo) => ({ value: iv(lo), why: R`\(f(${lo}) = ${f(lo)}\) and \(f(${lo + 1}) = ${f(lo + 1)}\) have the same sign, so the theorem guarantees nothing on this interval.` })),
    solution: [
      R`\(f\) is a polynomial, so it is continuous on every closed interval. Look for an interval where \(f\) changes sign.`,
      R`\(f(${n}) = ${f(n)}\) is negative and \(f(${n + 1}) = ${f(n + 1)}\) is positive.`,
      R`\(0\) is between \(f(${n})\) and \(f(${n + 1})\), so by the IVT there is a \(c\) in \((${n}, ${n + 1})\) with \(f(c) = 0\).`,
    ],
    rule: 5,
    skill: 'Intermediate Value Theorem',
    check: () => (f(n) < 0 && f(n + 1) > 0 && others.every((lo) => f(lo) * f(lo + 1) > 0) ? true : 'sign pattern is off'),
  });
}

function hardIVTApplies(rng) {
  const type = rng.pick(['broken', 'works', 'outside']);
  const base = { rule: 5, skill: 'Intermediate Value Theorem' };
  if (type === 'broken') {
    const r = rng.int(-4, 4);
    const u = rng.int(1, 3);
    const w = rng.int(1, 3);
    const [s, t] = [r - u, r + w];
    const f = (x) => 1 / (x - r);
    const fs = frac(-1, u).tex();
    const ft = frac(1, w).tex();
    const I = `[${s}, ${t}]`;
    return q({
      ...base,
      prompt: R`Let \(f(x) = \dfrac{1}{${linear(1, -r)}}\). Then \(f(${s}) = ${fs}\) and \(f(${t}) = ${ft}\). Does the Intermediate Value Theorem guarantee a number \(c\) in \((${s}, ${t})\) with \(f(c) = 0\)?`,
      correct: R`No: \(f\) is not continuous on \(${I}\)`,
      wrong: [
        { value: R`Yes: \(f(${s}) < 0 < f(${t})\), and a sign change always forces a zero`, why: R`A sign change forces a zero only for a continuous function. This one has a vertical asymptote at \(x = ${r}\), inside the interval.` },
        { value: R`Yes: \(f\) is continuous on \(${I}\) and \(0\) is between \(f(${s})\) and \(f(${t})\)`, why: R`\(f\) is not defined at \(x = ${r}\), which lies inside the interval, so it is not continuous on \(${I}\).` },
        R`No: \(0\) is not between \(f(${s})\) and \(f(${t})\)`,
      ],
      solution: [
        R`The IVT needs \(f\) to be continuous on the whole closed interval \(${I}\).`,
        R`\(f\) has a vertical asymptote at \(x = ${r}\), which is inside the interval, so the theorem does not apply.`,
        R`In fact \(\dfrac{1}{${linear(1, -r)}}\) is never 0: the graph jumps from negative to positive values across the asymptote.`,
      ],
      check: () => (s < r && r < t && Math.abs(f(r + 1e-9)) > 1e6 && f(s) < 0 && f(t) > 0 ? true : 'scenario is off'),
    });
  }
  const h = rng.int(-3, 3);
  const m = rng.int(-4, 5);
  const coefs = [1, -2 * h, h * h + m];
  const f = (x) => polyEval(coefs, x);
  if (type === 'works') {
    const u = rng.int(0, 2);
    const w = u + (u === 0 ? rng.int(2, 3) : rng.int(1, 3));
    const [s, t] = [h + u, h + w];
    const N = rng.int(f(s) + 1, f(t) - 1);
    const I = `[${s}, ${t}]`;
    return q({
      ...base,
      prompt: R`Let \(f(x) = ${poly(coefs)}\). Then \(f(${s}) = ${f(s)}\) and \(f(${t}) = ${f(t)}\). Does the Intermediate Value Theorem guarantee a number \(c\) in \((${s}, ${t})\) with \(f(c) = ${N}\)?`,
      correct: R`Yes: \(f\) is continuous on \(${I}\) and \(${N}\) is between \(f(${s})\) and \(f(${t})\)`,
      wrong: [
        { value: R`No: the theorem needs \(f(${s})\) and \(f(${t})\) to have opposite signs`, why: R`Opposite signs matter only when the target value is 0. The theorem works for any value between \(f(${s})\) and \(f(${t})\).` },
        { value: R`No: \(f\) is not continuous on \(${I}\)`, why: 'A polynomial is continuous everywhere.' },
        R`No: \(${N}\) is not between \(f(${s})\) and \(f(${t})\)`,
      ],
      solution: [
        R`\(f\) is a polynomial, so it is continuous on \(${I}\).`,
        R`\(${f(s)} < ${N} < ${f(t)}\): the target value is between \(f(${s})\) and \(f(${t})\).`,
        R`Both conditions of the IVT hold, so some \(c\) in \((${s}, ${t})\) has \(f(c) = ${N}\).`,
      ],
      check: () => (f(s) < N && N < f(t) ? true : 'N is not between the endpoint values'),
    });
  }
  const u = rng.int(1, 3);
  const w = rng.intExcept(1, 4, [u]);
  const [s, t] = [h - u, h + w];
  const N = m - rng.int(0, 2);
  const I = `[${s}, ${t}]`;
  return q({
    ...base,
    prompt: R`Let \(f(x) = ${poly(coefs)}\). Then \(f(${s}) = ${f(s)}\) and \(f(${t}) = ${f(t)}\). Does the Intermediate Value Theorem guarantee a number \(c\) in \((${s}, ${t})\) with \(f(c) = ${N}\)?`,
    correct: R`No: \(${N}\) is not between \(f(${s})\) and \(f(${t})\)`,
    wrong: [
      { value: R`Yes: \(f\) is continuous on \(${I}\), so it takes every value there`, why: R`A continuous function is only guaranteed to take the values between \(f(${s})\) and \(f(${t})\).` },
      { value: R`No: \(f\) is not continuous on \(${I}\)`, why: 'A polynomial is continuous everywhere. The theorem fails to apply for a different reason.' },
      R`Yes: \(f\) is continuous on \(${I}\) and \(${N}\) is between \(f(${s})\) and \(f(${t})\)`,
    ],
    solution: [
      R`\(f\) is continuous, so the IVT guarantees every value between \(f(${s}) = ${f(s)}\) and \(f(${t}) = ${f(t)}\).`,
      R`\(${N}\) is smaller than both of them, so it is not between them: the theorem guarantees nothing about it.`,
      N === m ? R`(Here \(f(${h}) = ${m}\) does happen, at the lowest point of the parabola, but the IVT is not what tells us so.)` : R`(Here \(f(x) = ${N}\) never happens, because the lowest value of \(f\) is \(${m}\).)`,
    ],
    check: () => (N < f(s) && N < f(t) && f(h) === m ? true : 'N should be below both endpoint values'),
  });
}

function hardTiered(rng) {
  const r1 = rng.int(2, 9);
  const r2 = rng.intExcept(1, 12, [r1]);
  const T = rng.pick([10, 20, 40, 50, 100, 200]);
  const k = (r1 - r2) * T;
  const [item, unit] = rng.pick([['a printing company', 'posters'], ['a water utility', 'thousand liters of water'], ['a bus company', 'kilometers of travel'], ['a data provider', 'gigabytes of data']]);
  return q({
    prompt: R`The cost, in dollars, that ${item} charges for \(x\) ${unit} is \(C(x) = ${cases([[terms([[r1, 'x']]), `0 \\le x \\le ${T}`], [terms([[r2, 'x'], [1, 'k']]), `x > ${T}`]])}\). For what value of \(k\) is \(C\) continuous, so that the cost does not jump at \(x = ${T}\)?`,
    correct: k,
    fmt: kFmt,
    wrong: [
      { value: -k, why: R`Solve \(${r1 * T} = ${r2 * T} + k\) for \(k\): subtract \(${r2 * T}\) from both sides.` },
      { value: r1 - r2, why: R`The pieces must agree at \(x = ${T}\), so substitute \(x = ${T}\) into both formulas before solving.` },
      r1 * T,
      (r1 + r2) * T,
      r2 * T,
    ],
    solution: [
      R`The two formulas must give the same cost at \(x = ${T}\).`,
      R`First formula: \(${r1}(${T}) = ${r1 * T}\). Second formula, as \(x \to ${T}^{+}\): \(${r2}(${T}) + k = ${r2 * T} + k\).`,
      R`Set them equal: \(${r1 * T} = ${r2 * T} + k\), so \(k = ${k}\).`,
    ],
    rule: 3,
    skill: 'continuity of piecewise functions',
    check: () => (r1 * T === r2 * T + k ? true : 'pieces do not meet'),
  });
}

// ───────────── Challenge ─────────────

function challengeTwoConstants(rng) {
  const x1 = rng.pick([-3, -2, -1, 1, 2]);
  const x2 = x1 + rng.pick([1, 2, 3].filter((d) => x1 + d !== 0));
  const a = rng.nonzero(-4, 4);
  const b = rng.intExcept(-6, 6, [0, a, -a]);
  const c1 = a * x1 + b - x1;
  const c2 = a * x2 + b - x2 * x2;
  const f = (x) => (x < x1 ? x + c1 : x < x2 ? a * x + b : x * x + c2);
  const y1 = x1 + c1;
  const y2 = x2 * x2 + c2;
  const pair = (u, v) => R`\(a = ${u},\ b = ${v}\)`;
  return q({
    prompt: R`Find the constants \(a\) and \(b\) that make \(f(x) = ${cases([[linear(1, c1), `x < ${x1}`], ['ax + b', `${x1} \\le x < ${x2}`], [poly([1, 0, c2]), `x \\ge ${x2}`]])}\) continuous for all \(x\).`,
    correct: pair(a, b),
    wrong: [
      { value: pair(b, a), why: R`\(a\) is the slope of the middle piece, found from the two heights it has to join.` },
      { value: pair(-a, b), why: R`Subtract the two equations in the same order on both sides to get the sign of \(a\) right.` },
      pair(a, -b),
      pair(a, y1),
      pair(a + 1, b - 1),
    ],
    solution: [
      R`At \(x = ${x1}\) the first two pieces must meet: \(${terms([[x1, 'a'], [1, 'b']])} = ${subst([1, c1], x1)} = ${y1}\).`,
      R`At \(x = ${x2}\) the last two pieces must meet: \(${terms([[x2, 'a'], [1, 'b']])} = ${subst([1, 0, c2], x2)} = ${y2}\).`,
      x2 - x1 === 1 ? R`Subtract the first equation from the second: \(a = ${y2} - ${y1 < 0 ? `(${y1})` : y1} = ${a}\).` : R`Subtract the first equation from the second: \(${terms([[x2 - x1, 'a']])} = ${y2 - y1}\), so \(a = ${a}\).`,
      R`Substitute back: \(b = ${y1} - (${x1})(${a}) = ${b}\).`,
    ],
    rule: 3,
    skill: 'continuity of piecewise functions',
    check: () => (Math.abs(f(x1 - 1e-9) - f(x1)) < 1e-6 && Math.abs(f(x2 - 1e-9) - f(x2)) < 1e-6 ? true : 'pieces do not meet'),
  });
}

function challengeTableZeros(rng) {
  const n = rng.int(5, 6);
  const x0 = rng.int(-4, 2);
  const step = rng.pick([1, 2]);
  const N = rng.pick([0, 0, 0, 1, 2, -1, 3]);
  const xs = range(0, n - 1).map((i) => x0 + i * step);
  let ys;
  let crossings;
  do {
    ys = xs.map(() => rng.intExcept(-9, 9, [N]));
    crossings = xs.slice(0, -1).filter((_, i) => (ys[i] - N) * (ys[i + 1] - N) < 0).map((_, i) => i);
    crossings = [];
    for (let i = 0; i < n - 1; i++) if ((ys[i] - N) * (ys[i + 1] - N) < 0) crossings.push(i);
  } while (crossings.length < 1 || crossings.length > n - 2);
  const count = crossings.length;
  const interp = (x) => {
    const i = Math.min(n - 2, Math.max(0, Math.floor((x - x0) / step)));
    return ys[i] + ((ys[i + 1] - ys[i]) * (x - xs[i])) / step;
  };
  return q({
    prompt: R`The function \(f\) is continuous on \([${xs[0]}, ${xs[n - 1]}]\), and some of its values are shown in the table. What is the least number of solutions that the equation \(f(x) = ${N}\) must have in this interval?`,
    visual: rowTable(['x', 'f(x)'], xs.map((x, i) => [x, ys[i]]), `Table of values: ${xs.map((x, i) => `f(${txt(x)}) = ${txt(ys[i])}`).join(', ')}.`),
    correct: count,
    wrong: [
      { value: count + 1, why: R`Only an interval where the values go from one side of \(${N}\) to the other forces a solution. Count those intervals again.` },
      { value: count - 1, why: R`Every interval where the values cross from one side of \(${N}\) to the other contains at least one solution.` },
      { value: n - 1, why: 'Not every interval between table entries has to contain a solution, only those where the values cross the target.' },
      0,
    ],
    solution: [
      N === 0 ? 'Look at the sign of each table value. Between two neighbouring inputs where the sign changes, the IVT guarantees a zero.' : R`Compare each table value with \(${N}\). Between two neighbouring inputs where the values go from one side of \(${N}\) to the other, the IVT guarantees a solution.`,
      R`That happens on ${crossings.map((i) => R`\([${xs[i]}, ${xs[i + 1]}]\)`).join(', ')}.`,
      R`So there must be at least \(${count}\) ${count === 1 ? 'solution' : 'solutions'}. (There could be more, but the table cannot show that.)`,
    ],
    rule: 5,
    skill: 'Intermediate Value Theorem',
    check: () => {
      let changes = 0;
      const steps = 4000;
      for (let i = 0; i < steps; i++) {
        const u = xs[0] + ((xs[n - 1] - xs[0]) * i) / steps;
        const v = xs[0] + ((xs[n - 1] - xs[0]) * (i + 1)) / steps;
        if ((interp(u) - N) * (interp(v) - N) < 0 || interp(u) === N) changes++;
      }
      return changes === count ? true : `piecewise-linear model crosses ${changes} times, answer says ${count}`;
    },
  });
}

function challengeRemoveSpecial(rng) {
  const p = rng.int(2, 7);
  const s = rng.intExcept(2, 9, [p]);
  const d = rng.int(2, 7);
  const a = rng.nonzero(-4, 4);
  const spec = rng.pick([
    {
      at: 0,
      tex: R`\dfrac{\sin ${p}x}{${s}x}`,
      f: (x) => Math.sin(p * x) / (s * x),
      L: frac(p, s),
      wrong: [{ value: 1, why: R`\(\dfrac{\sin u}{u} \to 1\) needs the same \(u\) on top and bottom. Here a factor \(\frac{${p}}{${s}}\) is left over.` }, frac(s, p), p],
      steps: [R`\(\dfrac{\sin ${p}x}{${s}x} = \dfrac{${p}}{${s}} \cdot \dfrac{\sin ${p}x}{${p}x} \to \dfrac{${p}}{${s}} \cdot 1\) as \(x \to 0\).`],
    },
    {
      at: 0,
      tex: R`\dfrac{\sqrt{x + ${d * d}} - ${d}}{x}`,
      f: (x) => (Math.sqrt(x + d * d) - d) / x,
      L: frac(1, 2 * d),
      wrong: [{ value: frac(1, d), why: R`The conjugate \(\sqrt{x + ${d * d}} + ${d}\) tends to \(${d} + ${d} = ${2 * d}\).` }, 2 * d, frac(1, d * d)],
      steps: [R`Multiply the top and the bottom by \(\sqrt{x + ${d * d}} + ${d}\): the numerator becomes \(x\).`, R`After cancelling \(x\): \(\dfrac{1}{\sqrt{x + ${d * d}} + ${d}} \to \dfrac{1}{${2 * d}}\) as \(x \to 0\).`],
    },
    {
      at: 0,
      tex: R`\dfrac{1 - \cos ${p}x}{x^{2}}`,
      f: (x) => (1 - Math.cos(p * x)) / (x * x),
      L: frac(p * p, 2),
      wrong: [{ value: p * p, why: R`After multiplying by \(1 + \cos ${p}x\), a factor \(\dfrac{1}{1 + \cos ${p}x} \to \frac{1}{2}\) remains.` }, frac(p, 2), p],
      steps: [R`Multiply the top and the bottom by \(1 + \cos ${p}x\): \(\dfrac{\sin^{2} ${p}x}{x^{2}} \cdot \dfrac{1}{1 + \cos ${p}x}\).`, R`\(\left(\dfrac{\sin ${p}x}{x}\right)^{2} \to ${p * p}\) and \(\dfrac{1}{1 + \cos ${p}x} \to \dfrac{1}{2}\) as \(x \to 0\).`],
    },
    {
      at: a,
      tex: R`\dfrac{${poly([1, 0, 0, -(a ** 3)])}}{${linear(1, -a)}}`,
      f: (x) => (x ** 3 - a ** 3) / (x - a),
      L: frac(3 * a * a, 1),
      wrong: [{ value: a * a, why: R`The quotient is \(${poly([1, a, a * a])}\), and each of its three terms equals \(${a * a}\) at \(x = ${a}\).` }, 2 * a * a, 3 * a],
      steps: [R`Factor the cubic: \(${poly([1, 0, 0, -(a ** 3)])} = (${linear(1, -a)})(${poly([1, a, a * a])})\).`, R`After cancelling: \(${poly([1, a, a * a])} \to ${a * a} + ${a * a} + ${a * a}\) as \(x \to ${a}\).`],
    },
  ]);
  return q({
    prompt: R`Let \(f(x) = ${cases([[spec.tex, `x \\ne ${spec.at}`], ['k', `x = ${spec.at}`]])}\). For what value of \(k\) is \(f\) continuous at \(x = ${spec.at}\)?`,
    correct: spec.L,
    fmt: (v) => (typeof v === 'string' ? v : kFmt(v)),
    wrong: [...spec.wrong, { value: 0, why: R`The formula gives \(\frac{0}{0}\) at \(x = ${spec.at}\), which is not 0. Find the limit.` }],
    solution: [R`\(f\) is continuous at \(x = ${spec.at}\) exactly when \(k = f(${spec.at})\) equals \(${lim(spec.at)} f(x)\).`, ...spec.steps, R`So \(k = ${spec.L.tex()}\).`],
    rule: 4,
    skill: 'removing a discontinuity',
    check: () => checkAll(...[1e-3, -1e-3].map((e) => (Math.abs(spec.f(spec.at + e) - spec.L.value) < 2e-2 * Math.max(1, Math.abs(spec.L.value)) ? true : `value near the point is ${spec.f(spec.at + e)}, expected ${spec.L.value}`)), checkLimit(spec.f, spec.at, spec.L.value, { tol: 5e-3 })),
  });
}

function challengeMustBeTrue(rng) {
  const a = rng.int(-4, 3);
  const b = a + rng.int(2, 5);
  const I = `[${a}, ${b}]`;
  const O = `(${a}, ${b})`;
  const type = rng.pick(['sign', 'value', 'nozero', 'same']);
  const base = { rule: 5, skill: 'Intermediate Value Theorem' };
  if (type === 'sign') {
    const up = rng.bool(0.5);
    const lo = -rng.int(1, 9);
    const hi = rng.int(1, 9);
    const [fa, fb] = up ? [lo, hi] : [hi, lo];
    return q({
      ...base,
      prompt: R`A function \(f\) is continuous on \(${I}\), with \(f(${a}) = ${fa}\) and \(f(${b}) = ${fb}\). Which statement must be true?`,
      correct: R`\(f(c) = 0\) for at least one \(c\) in \(${O}\)`,
      wrong: [
        { value: R`\(f(c) = 0\) for exactly one \(c\) in \(${O}\)`, why: 'The theorem guarantees at least one such number. The graph could cross the axis several times.' },
        { value: R`\(f\) is ${up ? 'increasing' : 'decreasing'} on \(${I}\)`, why: 'The endpoint values say nothing about the shape in between: the graph may rise and fall.' },
        { value: R`\(${lo} \le f(x) \le ${hi}\) for all \(x\) in \(${I}\)`, why: 'Between the endpoints the graph may go above or below both endpoint values.' },
      ],
      solution: [R`\(f\) is continuous on \(${I}\) and \(0\) is between \(f(${a}) = ${fa}\) and \(f(${b}) = ${fb}\).`, R`By the IVT, \(f(c) = 0\) for at least one \(c\) in \(${O}\).`, 'Nothing forces the zero to be unique, the function to be monotonic, or its values to stay between the endpoint values.'],
    });
  }
  if (type === 'value') {
    const p = rng.int(1, 8);
    const q2 = p + rng.int(3, 9);
    const [fa, fb] = rng.bool(0.5) ? [p, q2] : [q2, p];
    const N = rng.int(p + 1, q2 - 1);
    const out = q2 + rng.int(1, 5);
    return q({
      ...base,
      prompt: R`A function \(f\) is continuous on \(${I}\), with \(f(${a}) = ${fa}\) and \(f(${b}) = ${fb}\). Which statement must be true?`,
      correct: R`\(f(c) = ${N}\) for some \(c\) in \(${O}\)`,
      wrong: [
        { value: R`\(f(c) = ${out}\) for some \(c\) in \(${O}\)`, why: R`\(${out}\) is not between \(${p}\) and \(${q2}\), so nothing guarantees it.` },
        { value: R`\(f(c) = 0\) for some \(c\) in \(${O}\)`, why: R`\(0\) is not between \(${p}\) and \(${q2}\), so nothing guarantees a zero.` },
        { value: R`\(f(${num((a + b) / 2)}) = ${num((p + q2) / 2)}\)`, why: 'The theorem says that a value is taken somewhere in the interval. It does not say where.' },
      ],
      solution: [R`\(f\) is continuous on \(${I}\), so it takes every value between \(${p}\) and \(${q2}\) somewhere in \(${O}\).`, R`\(${N}\) is between \(${p}\) and \(${q2}\), so \(f(c) = ${N}\) for some \(c\).`, 'Values outside that range are not guaranteed, and the theorem never says where a value is taken.'],
    });
  }
  if (type === 'nozero') {
    const fa = rng.nonzero(-9, 9);
    const pos = fa > 0;
    return q({
      ...base,
      prompt: R`A function \(f\) is continuous on \(${I}\), \(f(x) \ne 0\) for every \(x\) in \(${I}\), and \(f(${a}) = ${fa}\). Which statement must be true?`,
      correct: R`\(f(${b}) ${pos ? '>' : '<'} 0\)`,
      wrong: [
        { value: R`\(f(${b}) ${pos ? '<' : '>'} 0\)`, why: R`If \(f(${b})\) had the opposite sign, the IVT would force a zero in between, but \(f\) has none.` },
        { value: R`\(f(${b}) = ${fa}\)`, why: 'Having no zeros does not make a function constant.' },
        { value: R`\(f(${b}) ${pos ? '>' : '<'} ${fa}\)`, why: R`Nothing says that \(f\) ${pos ? 'increases' : 'decreases'}. Only its sign is fixed.` },
      ],
      solution: [R`Suppose \(f(${b})\) had the opposite sign to \(f(${a}) = ${fa}\).`, R`Then \(0\) would be between \(f(${a})\) and \(f(${b})\), and the IVT would give a zero in \(${O}\). That contradicts \(f(x) \ne 0\).`, R`So \(f\) keeps the same sign on the whole interval: \(f(${b}) ${pos ? '>' : '<'} 0\).`],
    });
  }
  const sgn = rng.sign();
  const fa = sgn * rng.int(1, 9);
  const fb = sgn * rng.intExcept(1, 9, [Math.abs(fa)]);
  return q({
    ...base,
    prompt: R`A function \(f\) is continuous on \(${I}\), with \(f(${a}) = ${fa}\) and \(f(${b}) = ${fb}\). What does the Intermediate Value Theorem say about solutions of \(f(x) = 0\) in \(${O}\)?`,
    correct: R`Nothing: \(0\) is not between \(f(${a})\) and \(f(${b})\), so there may or may not be solutions`,
    wrong: [
      { value: 'There are no solutions', why: 'The theorem cannot rule solutions out. The graph could dip across the axis and come back.' },
      { value: 'There is at least one solution', why: R`\(f(${a})\) and \(f(${b})\) have the same sign, so \(0\) is not between them.` },
      'There are exactly two solutions',
    ],
    solution: [R`\(f(${a}) = ${fa}\) and \(f(${b}) = ${fb}\) are both ${sgn > 0 ? 'positive' : 'negative'}, so \(0\) is not between them.`, 'The IVT only guarantees values between the two endpoint values, so it is silent here.', 'The equation may have no solutions, or the graph may cross the axis and return, giving two or more.'],
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'continuity',
  title: 'Continuity & the Intermediate Value Theorem',
  summary: 'Test continuity at a point, classify and repair discontinuities, and use the Intermediate Value Theorem.',
  standards: ['AP Calculus 1.10', 'AP Calculus 1.11', 'AP Calculus 1.12', 'AP Calculus 1.13', 'AP Calculus 1.16'],

  explain: {
    intro: R`A function is continuous where its graph has no hole, jump or vertical asymptote: you can draw it without lifting the pen. Limits make that precise, and continuity is what lets us find limits by substitution. It is also the hypothesis of the Intermediate Value Theorem, the first of the big existence theorems of calculus.`,
    rules: [
      {
        title: 'Continuity at a point: three conditions',
        text: R`\(f\) is continuous at \(x = a\) when (1) \(f(a)\) is defined, (2) \(\lim\limits_{x \to a} f(x)\) exists, and (3) \(\lim\limits_{x \to a} f(x) = f(a)\). If any one fails, \(f\) is discontinuous at \(a\).`,
        example: R`\(f(x) = x^{2}\) at \(a = 3\): \(f(3) = 9\) and \(\lim\limits_{x \to 3} x^{2} = 9\). All three conditions hold.`,
      },
      {
        title: 'Three types of discontinuity',
        text: R`**Removable:** the limit exists, but \(f(a)\) is missing or is a different number (a hole). **Jump:** both one-sided limits exist but are different. **Infinite:** the outputs are unbounded near \(a\) (a vertical asymptote).`,
        example: R`\(\dfrac{x^{2} - 1}{x - 1}\) has a removable discontinuity at \(x = 1\); \(\dfrac{|x|}{x}\) has a jump at \(x = 0\); \(\dfrac{1}{x - 2}\) has an infinite discontinuity at \(x = 2\).`,
      },
      {
        title: 'Functions that are continuous on their domains',
        text: R`Polynomials are continuous everywhere. Rational, root, trigonometric, exponential and logarithmic functions are continuous at every point of their domains, and so are sums, products, quotients and compositions of continuous functions. So a rational function can only be discontinuous where its denominator is 0. A function is continuous on an interval if it is continuous at every point of it.`,
        example: R`\(f(x) = \dfrac{x + 1}{(x - 2)(x + 5)}\) is continuous except at \(x = 2\) and \(x = -5\).`,
      },
      {
        title: 'Making a piecewise function continuous',
        text: R`Each piece is usually continuous on its own, so check only the points where the formula changes. There the left-hand limit, the right-hand limit and the value must all agree. To find a constant that makes the function continuous, substitute the boundary value into both formulas, set the results equal, and solve.`,
        example: R`\(f(x) = \begin{cases} kx + 1, & x < 2 \\ x^{2}, & x \ge 2 \end{cases}\) is continuous at 2 when \(2k + 1 = 4\), so \(k = \frac{3}{2}\).`,
      },
      {
        title: 'Removing a discontinuity',
        text: R`If \(\lim\limits_{x \to a} f(x) = L\) exists but \(f(a)\) is missing or wrong, define \(f(a) = L\). The repaired function is continuous at \(a\). Jump and infinite discontinuities cannot be repaired this way, because there is no limit to use.`,
        example: R`\(f(x) = \dfrac{x^{2} - 9}{x - 3}\) has limit 6 at \(x = 3\). Setting \(f(3) = 6\) makes it continuous.`,
      },
      {
        title: 'Intermediate Value Theorem (IVT)',
        text: R`If \(f\) is continuous on the closed interval \([a, b]\) and \(N\) is any number between \(f(a)\) and \(f(b)\), then there is at least one \(c\) in \((a, b)\) with \(f(c) = N\). In particular, if \(f(a)\) and \(f(b)\) have opposite signs, \(f\) has a zero between \(a\) and \(b\). The theorem says that \(c\) exists. It does not say where \(c\) is or how many there are, and it says nothing if \(f\) is not continuous or \(N\) is not between \(f(a)\) and \(f(b)\).`,
        example: R`\(f(x) = x^{3} + x - 1\) is continuous, \(f(0) = -1\) and \(f(1) = 1\). So \(f(c) = 0\) for some \(c\) in \((0, 1)\).`,
      },
    ],
    vocab: [
      { term: 'continuous at a point', def: R`\(\lim\limits_{x \to a} f(x) = f(a)\): the limit exists, the value exists, and they are equal.` },
      { term: 'removable discontinuity', def: 'A hole: the limit exists, but the value is missing or different. It can be repaired by redefining one value.' },
      { term: 'jump discontinuity', def: 'A point where the left-hand and right-hand limits both exist but are not equal.' },
      { term: 'infinite discontinuity', def: 'A point where the outputs are unbounded: the graph has a vertical asymptote.' },
      { term: 'Intermediate Value Theorem', def: 'A continuous function on a closed interval takes every value between its two endpoint values.' },
    ],
    mistakes: [
      R`Checking only that \(f(a)\) is defined. The limit must also exist and equal \(f(a)\).`,
      R`Calling every zero of a denominator a vertical asymptote. If the factor cancels, the discontinuity is removable.`,
      R`Using the IVT without checking continuity on the whole closed interval.`,
      R`Reading the IVT as "exactly one" or as telling where \(c\) is. It only promises at least one \(c\), somewhere in the interval.`,
      R`Concluding "no solution" when the endpoint values do not straddle \(N\). In that case the IVT simply gives no information.`,
    ],
    visual: {
      type: 'plot',
      x: [-6, 6],
      y: [-4, 7],
      step: [1, 1],
      fns: [
        { f: (x) => 0.5 * x + 3, domain: [-6, 0], color: 'a', label: 'hole', labelAt: -4.4 },
        { f: (x) => 1 + 1 / (3 - x) - 1 / 3, domain: [0, 2.98], color: 'a', label: 'jump', labelAt: 0.9 },
        { f: (x) => 2 - 1 / (x - 3), domain: [3.02, 6], color: 'a', label: 'infinite', labelAt: 4.6 },
      ],
      points: [{ x: -3, y: 1.5, open: true }, { x: 0, y: 3, open: true }, { x: 0, y: 1 }],
      vlines: [{ x: 3 }],
      alt: 'Graph showing the three types of discontinuity: a hole at x = −3 on an otherwise straight line (removable), a jump at x = 0 where the graph drops from height 3 to height 1, and a vertical asymptote at x = 3 (infinite).',
    },
  },

  examples: [
    {
      title: 'Checking the three conditions',
      problem: R`Is \(f(x) = \begin{cases} x^{2} - 1, & x \ne 2 \\ 5, & x = 2 \end{cases}\) continuous at \(x = 2\)?`,
      steps: [
        R`Value: \(f(2) = 5\). It is defined.`,
        R`Limit: for \(x \ne 2\), \(f(x) = x^{2} - 1\), so \(\lim\limits_{x \to 2} f(x) = 4 - 1 = 3\). It exists.`,
        R`Compare: \(3 \ne 5\). The third condition fails.`,
      ],
      answer: R`No. \(f\) has a removable discontinuity at \(x = 2\); redefining \(f(2) = 3\) would repair it.`,
    },
    {
      title: 'Classifying the discontinuities of a rational function',
      problem: R`Find and classify the discontinuities of \(f(x) = \dfrac{x^{2} - 4}{x^{2} - x - 2}\).`,
      steps: [
        R`Factor: \(f(x) = \dfrac{(x - 2)(x + 2)}{(x - 2)(x + 1)}\). The denominator is 0 at \(x = 2\) and \(x = -1\).`,
        R`At \(x = 2\) the factor \((x - 2)\) cancels: \(\lim\limits_{x \to 2} f(x) = \dfrac{2 + 2}{2 + 1} = \dfrac{4}{3}\). The limit exists but \(f(2)\) does not: removable.`,
        R`At \(x = -1\) nothing cancels. The numerator tends to \(-3\) and the denominator to 0, so the outputs are unbounded: infinite.`,
      ],
      answer: R`A removable discontinuity (hole) at \(x = 2\) and an infinite discontinuity (vertical asymptote) at \(x = -1\).`,
    },
    {
      title: 'Choosing a constant',
      problem: R`For what value of \(k\) is \(f(x) = \begin{cases} kx + 1, & x < 2 \\ x^{2} - k, & x \ge 2 \end{cases}\) continuous everywhere?`,
      steps: [
        R`Both pieces are polynomials, so the only point to check is \(x = 2\).`,
        R`Left-hand limit: \(k(2) + 1 = 2k + 1\). Right-hand limit and value: \(2^{2} - k = 4 - k\).`,
        R`Set them equal: \(2k + 1 = 4 - k\), so \(3k = 3\).`,
      ],
      answer: R`\(k = 1\). Then both pieces give \(3\) at \(x = 2\).`,
    },
    {
      title: 'Showing that an equation has a solution',
      problem: R`Show that \(x^{3} + x - 1 = 0\) has a solution between 0 and 1.`,
      steps: [
        R`Let \(f(x) = x^{3} + x - 1\). It is a polynomial, so it is continuous on \([0, 1]\).`,
        R`\(f(0) = -1 < 0\) and \(f(1) = 1 > 0\).`,
        R`\(0\) is between \(f(0)\) and \(f(1)\), so by the IVT there is a \(c\) in \((0, 1)\) with \(f(c) = 0\).`,
        R`To narrow it down, test the midpoint: \(f(0.5) = -0.375 < 0\), so the solution is in \((0.5, 1)\).`,
      ],
      answer: R`A solution exists in \((0, 1)\) (in fact \(c \approx 0.682\)). The IVT proves it exists without finding it exactly.`,
      visual: {
        type: 'plot',
        x: [-0.5, 1.5],
        y: [-2, 2.5],
        step: [0.5, 1],
        fns: [{ f: (x) => x ** 3 + x - 1 }],
        points: [{ x: 0, y: -1 }, { x: 1, y: 1 }, { x: 0.6823, y: 0, color: 'b', label: 'c' }],
        alt: 'Graph of f(x) = x³ + x − 1 from x = −0.5 to x = 1.5. The curve rises from the point (0, −1) below the x-axis to the point (1, 1) above it, crossing the axis once in between, near x = 0.68.',
      },
    },
    {
      title: 'Word problem: a mountain hike',
      word: true,
      problem: 'A hiker leaves a trailhead at elevation 1200 m at 8 a.m. and reaches a summit at elevation 2100 m at noon. Must there be a moment when the hiker is at exactly 1750 m? Must there be a moment when the hiker is at exactly 2300 m?',
      steps: [
        R`Let \(h(t)\) be the elevation at time \(t\). Elevation cannot jump, so \(h\) is continuous on \([8, 12]\), with \(h(8) = 1200\) and \(h(12) = 2100\).`,
        R`\(1750\) is between \(1200\) and \(2100\). By the IVT there is a time \(c\) between 8 a.m. and noon with \(h(c) = 1750\).`,
        R`\(2300\) is not between \(1200\) and \(2100\), so the IVT guarantees nothing about it.`,
      ],
      answer: 'Yes for 1750 m: the IVT guarantees it. For 2300 m the theorem gives no information (the trail would have to climb above the summit).',
    },
  ],

  models: [
    {
      id: 'match-pieces',
      title: 'Make the pieces meet',
      intro: R`\(f(x)\) is \(mx + b\) for \(x < a\) and \(x^{2} + k\) for \(x \ge a\). Choose \(m\), \(b\) and \(a\), and find the \(k\) that makes \(f\) continuous.`,
      inputs: [
        { name: 'm', label: 'm (slope of the left piece)', type: 'int', min: -4, max: 4, value: 2 },
        { name: 'b', label: 'b (constant of the left piece)', type: 'int', min: -6, max: 6, value: 1 },
        { name: 'a', label: 'a (where the formula changes)', type: 'int', min: -3, max: 3, value: 1 },
      ],
      compute({ m, b, a }) {
        const left = m * a + b;
        const k = left - a * a;
        const f1 = (x) => m * x + b;
        const f2 = (x) => x * x + k;
        return {
          problem: R`Find \(k\) so that \(f(x) = ${cases([[linear(m, b), `x < ${a}`], ['x^{2} + k', `x \\ge ${a}`]])}\) is continuous at \(x = ${a}\).`,
          steps: [
            R`Left-hand limit: as \(x \to ${a}^{-}\), \(${linear(m, b)} \to ${subst([m, b], a)} = ${left}\).`,
            R`Right-hand limit and value: \(f(${a}) = (${a})^{2} + k = ${terms([[a * a, ''], [1, 'k']])}\).`,
            R`Continuity needs these to be equal: \(${terms([[a * a, ''], [1, 'k']])} = ${left}\).`,
            R`Solve: \(k = ${left} - ${a * a} = ${k}\). Then \(f(${a}) = ${left}\) and both sides approach \(${left}\).`,
          ],
          answer: R`\(k = ${k}\)`,
          visual: {
            type: 'plot',
            ...fit([(x) => (x <= a ? f1(x) : f2(x))], a - 4, a + 4, { include: [0] }),
            fns: [{ f: f1, domain: [a - 4, a], color: 'a' }, { f: f2, domain: [a, a + 4], color: 'b' }],
            points: [{ x: a, y: left }],
            alt: `Graph of the piecewise function with k = ${txt(k)}: a line on the left and a parabola on the right that meet at the point (${txt(a)}, ${txt(left)}) with no gap.`,
          },
        };
      },
    },
    {
      id: 'ivt-root',
      title: 'Does the IVT guarantee a zero?',
      intro: R`\(f(x) = x^{3} + px + q\) on the interval \([a, b]\). Change the function and the interval.`,
      inputs: [
        { name: 'p', label: 'p (coefficient of x)', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'q', label: 'q (constant)', type: 'int', min: -9, max: 9, value: -1 },
        { name: 'a', label: 'a (left endpoint)', type: 'int', min: -4, max: 3, value: 0 },
        { name: 'b', label: 'b (right endpoint)', type: 'int', min: -3, max: 4, value: 1 },
      ],
      compute({ p, q: q0, a, b }) {
        if (a >= b) return { error: 'The left endpoint a must be less than the right endpoint b.' };
        const coefs = [1, 0, p, q0];
        const f = (x) => polyEval(coefs, x);
        const fa = f(a);
        const fb = f(b);
        const mid = (a + b) / 2;
        const fm = f(mid);
        const steps = [R`\(f(x) = ${poly(coefs)}\) is a polynomial, so it is continuous on \([${a}, ${b}]\).`, R`Endpoint values: \(f(${a}) = ${fa}\) and \(f(${b}) = ${fb}\).`];
        let answer;
        if (fa === 0 || fb === 0) {
          steps.push(R`One endpoint value is exactly 0, so that endpoint is itself a zero of \(f\).`);
          answer = R`\(x = ${fa === 0 ? a : b}\) is a zero of \(f\). No theorem is needed.`;
        } else if (fa * fb < 0) {
          steps.push(R`The values have opposite signs, so \(0\) is between \(f(${a})\) and \(f(${b})\). By the IVT there is a \(c\) in \((${a}, ${b})\) with \(f(c) = 0\).`);
          steps.push(fm === 0 ? R`Test the midpoint: \(f(${num(mid)}) = 0\), so the midpoint is a zero.` : R`To narrow it down, test the midpoint: \(f(${num(mid)}) = ${num(fm, { places: 3 })}\), which is ${fm > 0 ? 'positive' : 'negative'}. So there is a zero in \((${fa * fm < 0 ? `${a}, ${num(mid)}` : `${num(mid)}, ${b}`})\).`);
          answer = R`Yes: the IVT guarantees at least one zero in \((${a}, ${b})\).`;
        } else {
          steps.push(R`Both values are ${fa > 0 ? 'positive' : 'negative'}, so \(0\) is not between them. The IVT gives no information on this interval.`);
          steps.push('That does not prove there is no zero: look at the graph to see whether the curve crosses the axis inside the interval.');
          answer = R`No guarantee: the IVT is silent on \([${a}, ${b}]\).`;
        }
        return {
          problem: R`Does the Intermediate Value Theorem guarantee a solution of \(${poly(coefs)} = 0\) in \((${a}, ${b})\)?`,
          steps,
          answer,
          visual: {
            type: 'plot',
            ...fit(f, a - 0.5, b + 0.5, { include: [0] }),
            fns: [{ f }],
            points: [{ x: a, y: fa }, { x: b, y: fb }],
            alt: `Graph of f on the interval from ${txt(a)} to ${txt(b)}, with the endpoints marked: f(${txt(a)}) = ${txt(fa)} and f(${txt(b)}) = ${txt(fb)}.`,
          },
        };
      },
    },
    {
      id: 'tiered-rate',
      title: 'Word problem: a price with no jump',
      word: true,
      intro: 'A supplier charges one rate per unit up to a threshold, then a different rate for further units. Find the constant that keeps the total cost continuous.',
      inputs: [
        { name: 'r1', label: 'Rate up to the threshold ($ per unit)', type: 'int', min: 1, max: 20, value: 8 },
        { name: 'r2', label: 'Rate beyond the threshold ($ per unit)', type: 'int', min: 1, max: 20, value: 5 },
        { name: 'T', label: 'Threshold (units)', type: 'int', min: 10, max: 500, value: 100 },
      ],
      compute({ r1, r2, T }) {
        const k = (r1 - r2) * T;
        const C = (x) => (x <= T ? r1 * x : r2 * x + k);
        return {
          problem: R`A supplier charges \(C(x) = ${cases([[terms([[r1, 'x']]), `0 \\le x \\le ${T}`], [terms([[r2, 'x'], [1, 'k']]), `x > ${T}`]])}\) dollars for \(x\) units. Find \(k\) so that the cost does not jump at \(x = ${T}\).`,
          steps: [
            R`At the threshold the first formula gives \(C(${T}) = ${r1}(${T}) = ${num(r1 * T)}\) dollars.`,
            R`Just past the threshold the second formula approaches \(${r2}(${T}) + k = ${terms([[r2 * T, ''], [1, 'k']])}\).`,
            R`No jump means these are equal: \(${terms([[r2 * T, ''], [1, 'k']])} = ${num(r1 * T)}\), so \(k = ${num(k)}\).`,
            k === 0 ? 'The two rates are the same, so the two formulas are the same line.' : R`Meaning: beyond the threshold the cost is \(${num(r1 * T)} + ${r2}(x - ${T})\): the first ${T} units at the first rate, and the rest at the second rate.`,
          ],
          answer: R`\(k = ${num(k)}\)`,
          visual: {
            type: 'plot',
            x: [-0.34 * T, 2 * T],
            y: [0, Math.max(C(2 * T), C(T)) * 1.15],
            fns: [{ f: C, domain: [0, T], color: 'a' }, { f: C, domain: [T, 2 * T], color: 'b' }],
            points: [{ x: T, y: r1 * T }],
            axisLabels: ['x (units)', 'C ($)'],
            alt: `Graph of the cost: a line with slope ${r1} up to x = ${txt(T)}, joined without a gap at the point (${txt(T)}, ${txt(r1 * T)}) to a line with slope ${r2}.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyThreeConditions, easyGraphType, easyRationalWhere, easyUseContinuity],
    medium: [mediumFindK, mediumClassify, mediumRemove, mediumIVTStory],
    hard: [hardFindK, hardThreePieces, hardIVTRoot, hardIVTApplies, hardTiered],
    challenge: [challengeTwoConstants, challengeTableZeros, challengeRemoveSpecial, challengeMustBeTrue],
  },
};
