import { R, q, person, plural } from '../../lib/index.js';
import { M } from './_shared.js';

// ───────────── Expressions: a tiny evaluator and step-by-step worker ─────────────
// Expressions are written in a short form such as "2*(8+7)" or "3*[12-(4+5)]".

const tok = (s) => s.match(/\d+|[-+*/()[\]]/g);
const OPEN = ['(', '['];
const CLOSE = [')', ']'];

// Standard order: grouping, then × and ÷ left to right, then + and − left to right.
function evalStd(t) {
  let i = 0;
  const atom = () => {
    const x = t[i++];
    if (OPEN.includes(x)) {
      const v = sum();
      i++;
      return v;
    }
    return Number(x);
  };
  const prod = () => {
    let v = atom();
    while (t[i] === '*' || t[i] === '/') v = t[i++] === '*' ? v * atom() : v / atom();
    return v;
  };
  const sum = () => {
    let v = prod();
    while (t[i] === '+' || t[i] === '-') v = t[i++] === '+' ? v + prod() : v - prod();
    return v;
  };
  return sum();
}
// The slip: grouping kept, but every operation done left to right.
function evalLTR(t) {
  let i = 0;
  const atom = () => {
    const x = t[i++];
    if (OPEN.includes(x)) {
      const v = run();
      i++;
      return v;
    }
    return Number(x);
  };
  const run = () => {
    let v = atom();
    while (i < t.length && !CLOSE.includes(t[i])) {
      const o = t[i++];
      const w = atom();
      v = o === '+' ? v + w : o === '-' ? v - w : o === '*' ? v * w : v / w;
    }
    return v;
  };
  return run();
}
const strip = (t) => t.filter((x) => !OPEN.includes(x) && !CLOSE.includes(x));
const val = (s) => evalStd(tok(s));
const TEXOP = { '*': '\\times', '/': '\\div' };
const tex = (s) => (Array.isArray(s) ? s : tok(s)).map((x) => TEXOP[x] ?? x).join(' ').replace(/([([]) /g, '$1').replace(/ ([)\]])/g, '$1');
const ex = (s) => R`\(${tex(s)}\)`;
// A whole number at or above 0, else null (for wrong answers built from slips).
const okNum = (v) => (Number.isInteger(v) && v >= 0 ? v : null);

// Work an expression one operation at a time: innermost grouping first, then × ÷, then + −.
function stepsOf(src) {
  let t = tok(src);
  const out = [];
  while (t.length > 1) {
    let open = -1;
    let close = -1;
    for (let i = 0; i < t.length; i++) {
      if (OPEN.includes(t[i])) open = i;
      else if (CLOSE.includes(t[i])) {
        close = i;
        break;
      }
    }
    const inside = close >= 0;
    const lo = inside ? open + 1 : 0;
    const hi = inside ? close : t.length;
    const seg = t.slice(lo, hi);
    let k = seg.findIndex((x) => x === '*' || x === '/');
    if (k < 0) k = seg.findIndex((x) => x === '+' || x === '-');
    const [a, op, b] = [Number(seg[k - 1]), seg[k], Number(seg[k + 1])];
    const v = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b;
    const newSeg = [...seg.slice(0, k - 1), String(v), ...seg.slice(k + 2)];
    const next = inside && newSeg.length === 1 ? [...t.slice(0, open), String(v), ...t.slice(close + 1)] : [...t.slice(0, lo), ...newSeg, ...t.slice(hi)];
    out.push({ a, op, b, v, where: inside ? (t[open] === '[' ? 'brackets' : 'parentheses') : null, next });
    t = next;
  }
  return out;
}
const VERB = { '+': 'Add', '-': 'Subtract', '*': 'Multiply', '/': 'Divide' };
const stepText = (st) =>
  (st.where ? `Inside the ${st.where}: ` : `${VERB[st.op]}: `) + R`\(${tex([String(st.a), st.op, String(st.b)])} = ${st.v}\).` + (st.next.length > 1 ? R` Now it is \(${tex(st.next)}\).` : '');
const workLines = (src) => stepsOf(src).map(stepText);
// Every step gives a whole number at or above 0.
const cleanSteps = (src) => stepsOf(src).every((st) => Number.isInteger(st.v) && st.v >= 0);

// ───────────── Coordinate helpers ─────────────

const pt = (x, y) => R`\((${x}, ${y})\)`;
const grid = (max, points, alt, extra = {}) => ({ type: 'plot', x: [0, max], y: [0, max], step: [1, 1], square: true, points, alt, ...extra });
const PLACES = ['library', 'park', 'school', 'pool', 'bakery', 'zoo', 'museum', 'playground', 'pet shop', 'garden'];

// ───────────── Shapes: properties from the drawing ─────────────

const NAMES = ['square', 'rectangle', 'rhombus', 'parallelogram', 'trapezoid', 'quadrilateral', 'polygon'];
const article = (w) => (/^[aeiou]/.test(w) ? `an ${w}` : `a ${w}`);
// What a name needs, from the definitions.
const NEEDS = {
  polygon: [],
  quadrilateral: ['four'],
  trapezoid: ['four', 'onePar'],
  parallelogram: ['four', 'onePar', 'twoPar'],
  rectangle: ['four', 'onePar', 'twoPar', 'right'],
  rhombus: ['four', 'onePar', 'twoPar', 'equal'],
  square: ['four', 'onePar', 'twoPar', 'right', 'equal'],
};
// Measure a drawn four-sided shape: parallel pairs, right angles, equal sides.
function measure(pts) {
  const v = (i) => [pts[(i + 1) % 4][0] - pts[i][0], pts[(i + 1) % 4][1] - pts[i][1]];
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const dotp = (a, b) => a[0] * b[0] + a[1] * b[1];
  const len2 = (a) => dotp(a, a);
  const par = [cross(v(0), v(2)) === 0, cross(v(1), v(3)) === 0].filter(Boolean).length;
  const props = ['four'];
  if (par >= 1) props.push('onePar');
  if (par === 2) props.push('twoPar');
  if ([0, 1, 2, 3].every((i) => dotp(v(i), v((i + 1) % 4)) === 0)) props.push('right');
  if ([1, 2, 3].every((i) => len2(v(i)) === len2(v(0)))) props.push('equal');
  return props;
}
const fitsName = (props, name) => NEEDS[name].every((p) => props.includes(p));

// A drawn shape of one kind, with sides marked and a description that says what the picture shows.
function shapeOf(rng, kind) {
  let pts;
  let marks;
  let right;
  let words;
  if (kind === 'rectangle') {
    const L = rng.int(4, 8);
    const W = rng.intExcept(2, 6, [L]);
    pts = [[0, 0], [L, 0], [L, W], [0, W]];
    marks = [1, 2, 1, 2];
    right = [0, 1, 2, 3];
    words = 'Opposite sides are parallel and equal. It has 4 right angles. Its sides are not all equal.';
  } else if (kind === 'rhombus') {
    const [d, h, s] = rng.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]]);
    pts = [[0, 0], [s, 0], [s + d, h], [d, h]];
    marks = [1, 1, 1, 1];
    words = 'Opposite sides are parallel. All 4 sides are equal. It has no right angles.';
  } else if (kind === 'parallelogram') {
    const d = rng.int(1, 3);
    const h = rng.int(2, 4);
    const L = rng.intExcept(5, 9, [5]); // the slanted side (at most 5 long) must not match the bottom
    pts = [[0, 0], [L, 0], [L + d, h], [d, h]];
    marks = [1, 2, 1, 2];
    words = 'Opposite sides are parallel and equal. It has no right angles. Its sides are not all equal.';
  } else {
    const L = rng.int(6, 10);
    const d1 = rng.int(1, 2);
    const d2 = rng.int(1, 3);
    const h = rng.int(2, 4);
    pts = [[0, 0], [L, 0], [L - d2, h], [d1, h]];
    words = 'Only the top and bottom sides are parallel. The other two sides are not.';
  }
  return { pts, words, visual: { type: 'polygon', points: pts, marks, right, alt: `A four-sided shape. ${words}` } };
}
const FITS_LIST = {
  rectangle: ['rectangle', 'parallelogram', 'quadrilateral', 'polygon'],
  rhombus: ['rhombus', 'parallelogram', 'quadrilateral', 'polygon'],
  parallelogram: ['parallelogram', 'quadrilateral', 'polygon'],
  trapezoid: ['trapezoid', 'quadrilateral', 'polygon'],
};
const MISFITS = { rectangle: ['square', 'rhombus'], rhombus: ['square', 'rectangle'], parallelogram: ['rectangle', 'rhombus', 'square'], trapezoid: ['parallelogram', 'rectangle', 'rhombus', 'square'] };
const PROP_WORDS = { right: 'have 4 right angles', equal: 'have 4 equal sides', twoPar: 'have 2 pairs of parallel sides', onePar: 'have a pair of parallel sides', four: 'have 4 sides' };

// "Every X is a Y" and "Every X has P" sentences with their truth from the definitions.
const KINDS = ['square', 'rectangle', 'rhombus', 'parallelogram', 'quadrilateral'];
function sentences() {
  const out = [];
  for (const x of KINDS) {
    for (const y of KINDS) {
      if (x === y) continue;
      const missing = NEEDS[y].filter((p) => !NEEDS[x].includes(p));
      out.push({ x, y, text: `Every ${x} is ${article(y)}.`, ok: missing.length === 0, why: missing.length ? `${article(x).replace(/^./, (c) => c.toUpperCase())} does not always ${PROP_WORDS[missing[0]]}.` : null });
    }
    for (const p of ['right', 'equal', 'twoPar']) {
      out.push({ x, p, text: `Every ${x} has ${PROP_WORDS[p].slice(5)}.`, ok: NEEDS[x].includes(p), why: `${article(x).replace(/^./, (c) => c.toUpperCase())} does not always ${PROP_WORDS[p]}.` });
    }
  }
  return out;
}
const SENTENCES = sentences();
// A second, separate record of the family tree: each shape and the shapes it always is.
const PARENT = { square: ['rectangle', 'rhombus'], rectangle: ['parallelogram'], rhombus: ['parallelogram'], parallelogram: ['quadrilateral'], quadrilateral: [] };
const ancestors = (x) => PARENT[x].flatMap((p) => [p, ...ancestors(p)]);
const HAS = { square: ['right', 'equal', 'twoPar'], rectangle: ['right', 'twoPar'], rhombus: ['equal', 'twoPar'], parallelogram: ['twoPar'], quadrilateral: [] };
const truthAgain = (s) => (s.y ? ancestors(s.x).includes(s.y) : HAS[s.x].includes(s.p));

// ───────────── Easy ─────────────

const EASY_FORMS = [
  (a, b, c) => `${a}*(${b}+${c})`,
  (a, b, c) => `(${a}+${b})*${c}`,
  (a, b, c) => `${a}+${b}*${c}`,
  (a, b, c) => `${a}*${b}-${Math.min(c, a * b - 1)}`,
  (a, b, c) => `(${a + b}-${b})*${c}`,
  (a, b, c) => `${a * c + b * c}-${b}*${c}`,
];

function easyEvaluate(rng) {
  const s = rng.pick(EASY_FORMS)(rng.int(2, 9), rng.int(2, 9), rng.int(2, 9));
  const t = tok(s);
  const ans = evalStd(t);
  const ltr = okNum(evalLTR(t));
  const noGroup = okNum(evalStd(strip(t)));
  return q({
    prompt: R`What is the value of \(${tex(s)}\)?`,
    correct: ans,
    wrong: [
      t.includes('(') ? { value: noGroup, why: 'Work inside the parentheses first.' } : { value: ltr, why: 'Multiply before you add or subtract.' },
      ltr,
      ans + 1,
      ans + 2,
      ans > 2 ? ans - 2 : ans + 3,
    ],
    solution: [...workLines(s), `The value is ${ans}.`],
    rule: t.includes('(') ? 0 : 1,
    skill: 'order of operations',
    check: () => (stepsOf(s).at(-1).v === ans && cleanSteps(s) ? true : 'steps do not reach the answer'),
  });
}

function easyReadPoint(rng) {
  const x = rng.int(1, 9);
  const y = rng.intExcept(1, 9, [x]);
  const ny = y === 9 ? y - 1 : y + 1;
  return q({
    prompt: 'What are the coordinates of point A?',
    visual: grid(10, [{ x, y, label: 'A' }], `A grid from 0 to 10 on both axes. Point A is ${x} units to the right of 0 and ${y} units up.`),
    correct: pt(x, y),
    wrong: [{ value: pt(y, x), why: 'The x-coordinate comes first. It tells how far across.' }, pt(x, ny), pt(x - 1, y), pt(x + 1, y + (y < 9 ? 1 : -1))],
    solution: [`Start at the origin, (0, 0).`, `Go across to point A: ${plural(x, 'unit')}. That is x.`, `Go up to point A: ${plural(y, 'unit')}. That is y.`, `Point A is at ${pt(x, y)}.`],
    rule: 4,
    skill: 'reading points',
    check: () => (grid(10, [{ x, y }], '').points[0].x === x && x !== y && pt(x, y) !== pt(y, x) ? true : 'point is wrong'),
  });
}

function easyWhichPoint(rng) {
  const x = rng.int(1, 8);
  const y = rng.intExcept(1, 8, [x]);
  const others = [[y, x], [x + 1, y + 1], [x, y + 2], [x + 2, y], [x + 1, y - 1]].filter(([u, v]) => u >= 1 && v >= 1 && u <= 9 && v <= 9 && !(u === x && v === y));
  const uniq = others.filter(([u, v], i) => others.findIndex(([p, r]) => p === u && r === v) === i).slice(0, 3);
  const all = rng.shuffle([[x, y], ...uniq]);
  const labels = ['A', 'B', 'C', 'D'];
  const at = (p) => labels[all.indexOf(p)];
  const target = all.find(([u, v]) => u === x && v === y);
  const swap = all.find(([u, v]) => u === y && v === x);
  return q({
    prompt: R`Which point is at \((${x}, ${y})\)?`,
    visual: grid(10, all.map(([u, v], i) => ({ x: u, y: v, label: labels[i] })), `A grid from 0 to 10 on both axes. ${all.map(([u, v], i) => `Point ${labels[i]} is ${u} across and ${v} up.`).join(' ')}`),
    correct: `Point ${at(target)}`,
    wrong: all.filter((p) => p !== target).map((p) => (p === swap ? { value: `Point ${at(p)}`, why: `Point ${at(p)} is at (${y}, ${x}). Go across first, then up.` } : `Point ${at(p)}`)),
    solution: [`The first number, ${x}, says go ${plural(x, 'unit')} across.`, `The second number, ${y}, says go ${plural(y, 'unit')} up.`, `That is point ${at(target)}.`],
    rule: 4,
    skill: 'plotting points',
    check: () => (all.filter(([u, v]) => u === x && v === y).length === 1 && new Set(all.map(String)).size === 4 ? true : 'points are not distinct'),
  });
}

// ───────────── Medium ─────────────

const WORD_FORMS = [
  (a, b, c) => ({ words: `add ${a} and ${b}, then multiply by ${c}`, right: `${c}*(${a}+${b})`, wrong: [[`${c}*${a}+${b}`, 'Without parentheses, you would multiply first.'], [`${a}+${b}*${c}`], [`(${c}+${a})*${b}`], [`${c}+${a}+${b}`]] }),
  (a, b, c) => ({ words: `multiply ${a} by ${b}, then add ${c}`, right: `${a}*${b}+${c}`, wrong: [[`${a}*(${b}+${c})`, 'The parentheses make you add first. The words say multiply first.'], [`${a}+${b}*${c}`], [`${a}*${b}*${c}`], [`(${a}+${c})*${b}`]] }),
  (a, b, c) => ({ words: `${c} times the sum of ${a} and ${b}`, right: `${c}*(${a}+${b})`, wrong: [[`${c}*${a}+${b}`, 'The sum must be found first, so it needs parentheses.'], [`${c}+${a}*${b}`], [`${c}+${a}+${b}`], [`(${c}+${a})*${b}`]] }),
  (a, b, c) => ({ words: `subtract ${b} from ${a + b}, then multiply by ${c}`, right: `${c}*(${a + b}-${b})`, wrong: [[`${c}*${a + b}-${b}`, 'Without parentheses, you would multiply first.'], [`${a + b}-${b}*${c}`], [`${c}*${a + b}+${b}`], [`${a + b}-${b}+${c}`]] }),
  (a, b, c) => ({ words: `add ${a * c} and ${b * c}, then divide by ${c}`, right: `(${a * c}+${b * c})/${c}`, wrong: [[`${a * c}+${b * c}/${c}`, 'Without parentheses, you would divide first.'], [`(${a * c}+${b * c})*${c}`], [`${a * c}*${b * c}/${c}`], [`${a * c}+${b * c}-${c}`]] }),
];

function mediumWordsToExpr(rng) {
  const [a, b] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 2);
  const c = rng.int(2, 9);
  const f = rng.pick(WORD_FORMS)(a, b, c);
  const rv = val(f.right);
  const wrong = f.wrong.map(([w, why]) => (val(w) !== rv ? (why ? { value: ex(w), why } : ex(w)) : null));
  return q({
    prompt: `Which expression means "${f.words}"?`,
    correct: ex(f.right),
    wrong,
    solution: [`The words say which step comes first.`, `Put parentheses around a step that must happen before a multiply or divide.`, `The expression is ${ex(f.right)}.`],
    rule: 2,
    skill: 'writing expressions',
    check: () => (f.wrong.every(([w], i) => wrong[i] == null || val(w) !== rv) && cleanSteps(f.right) ? true : 'a wrong expression has the right value'),
  });
}

function mediumInterpret(rng) {
  const p = rng.int(1200, 98000);
  const r = rng.int(120, 990);
  const k = rng.int(2, 9);
  const base = `${p}+${r}`;
  const forms = [
    { s: `${k}*(${base})`, ans: 'times', note: `It is ${k} groups of the same sum.` },
    { s: `(${base})*${k}`, ans: 'times', note: `It is the same sum, ${k} times.` },
    { s: `(${base})+${k}`, ans: 'more', note: `It is the same sum with ${k} added on.` },
    { s: `(${base})-${k}`, ans: 'less', note: `It is the same sum with ${k} taken away.` },
  ];
  const f = rng.pick(forms);
  const CH = { times: R`The first is \(${k}\) times as large.`, more: R`The first is \(${k}\) more.`, less: R`The first is \(${k}\) less.`, same: 'They are equal.' };
  const order = ['times', 'more', 'less', 'same'].filter((c) => c !== f.ans);
  const big = (s) => R`\(${tex(s).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1{,}')}\)`;
  return q({
    prompt: `Compare the first expression, ${big(f.s)}, with the second, ${big(base)}. Do not work them out. Which is true?`,
    correct: CH[f.ans],
    wrong: order.map((c) => (c === 'times' && f.ans !== 'times' ? { value: CH[c], why: `Look at the sign. Multiplying by ${k} makes it ${k} times as large. This one does not multiply.` } : c === 'more' && f.ans === 'times' ? { value: CH[c], why: `The sum is multiplied by ${k}, not added to ${k}.` } : CH[c])),
    solution: [`Think of ${big(base)} as one amount.`, f.note, `So: ${CH[f.ans]}`],
    rule: 2,
    skill: 'reading expressions',
    check: () => {
      const a = val(f.s);
      const b = val(base);
      const got = a === k * b ? 'times' : a === b + k ? 'more' : a === b - k ? 'less' : 'same';
      return got === f.ans ? true : 'comparison is wrong';
    },
  });
}

function mediumShapeName(rng) {
  const kind = rng.pick(['rectangle', 'rhombus', 'parallelogram', 'trapezoid']);
  const sh = shapeOf(rng, kind);
  const props = measure(sh.pts);
  const fitsAsk = (kind === 'parallelogram' || kind === 'trapezoid') && rng.bool();
  if (fitsAsk) {
    const right = rng.pick(FITS_LIST[kind].filter((n) => n !== 'polygon'));
    const bad = rng.shuffle(MISFITS[kind]);
    return q({
      prompt: `${sh.words} Which name fits this shape?`,
      visual: sh.visual,
      correct: right,
      wrong: bad.map((n, i) => (i === 0 ? { value: n, why: `${article(n).replace(/^./, (c) => c.toUpperCase())} must ${PROP_WORDS[NEEDS[n].find((p) => !props.includes(p))]}.` } : n)),
      solution: [`The shape is ${article(kind)}.`, right === kind ? `It follows the rules for ${article(kind)}.` : `Every ${kind} has 4 sides, so it is a quadrilateral.`, `So "${right}" fits.`],
      rule: 5,
      skill: 'classifying shapes',
      check: () => (fitsName(props, right) && bad.every((n) => !fitsName(props, n)) ? true : 'shape names do not match the drawing'),
    });
  }
  const notFit = rng.pick(MISFITS[kind]);
  const fit = rng.sample(FITS_LIST[kind], 3);
  const need = NEEDS[notFit].find((p) => !props.includes(p));
  return q({
    prompt: `${sh.words} Which name does NOT fit this shape?`,
    visual: sh.visual,
    correct: notFit,
    wrong: fit.map((n) => (n === 'parallelogram' || n === 'polygon' ? { value: n, why: n === 'polygon' ? 'Every closed shape with straight sides is a polygon.' : 'It has 2 pairs of parallel sides, so it is a parallelogram.' } : n)),
    solution: [`The shape is ${article(kind)}.`, `${article(notFit).replace(/^./, (c) => c.toUpperCase())} must ${PROP_WORDS[need]}. This shape does not.`, `So "${notFit}" does not fit.`],
    rule: 5,
    skill: 'classifying shapes',
    check: () => (!fitsName(props, notFit) && fit.every((n) => fitsName(props, n)) ? true : 'shape names do not match the drawing'),
  });
}

function mediumAlwaysTrue(rng) {
  const right = rng.pick(SENTENCES.filter((s) => s.ok && s.x !== 'quadrilateral'));
  const bad = rng.sample(SENTENCES.filter((s) => !s.ok), 3);
  return q({
    prompt: 'Which sentence is always true?',
    correct: right.text,
    wrong: bad.map((s) => ({ value: s.text, why: s.why })),
    solution: right.y
      ? [`${article(right.x).replace(/^./, (c) => c.toUpperCase())} has everything ${article(right.y)} needs.`, `So: ${right.text}`]
      : [`Every ${right.x} must ${PROP_WORDS[right.p]}.`, `So: ${right.text}`],
    rule: 5,
    skill: 'shape families',
    check: () => (truthAgain(right) && bad.every((s) => !truthAgain(s)) ? true : 'sentence truth is wrong'),
  });
}

// ───────────── Hard ─────────────

const HARD_FORMS = [
  (rng) => { const c = rng.int(5, 12); const d = rng.int(1, c - 1); return `${rng.int(2, 6)}*[${rng.int(2, 9)}+(${c}-${d})]`; },
  (rng) => `[(${rng.int(2, 9)}+${rng.int(2, 9)})*${rng.int(2, 5)}]-${rng.int(1, 9)}`,
  (rng) => `${rng.int(2, 20)}+[${rng.int(2, 6)}*(${rng.int(2, 9)}+${rng.int(1, 9)})]`,
  (rng) => { const d = rng.int(2, 5); const s = d * rng.int(2, 6); const b = rng.int(1, s - 1); return `[${rng.int(2, 5)}*(${s - b}+${b})]/${d}`; },
  (rng) => { const c = rng.int(6, 12); return `(${rng.int(2, 9)}+${rng.int(2, 9)})*(${c}-${rng.int(1, c - 2)})`; },
];

function hardBrackets(rng) {
  const s = rng.pick(HARD_FORMS)(rng);
  const t = tok(s);
  const ans = evalStd(t);
  const flat = okNum(evalStd(strip(t)));
  const ltrFlat = okNum(evalLTR(strip(t)));
  return q({
    prompt: R`What is the value of \(${tex(s)}\)?`,
    correct: ans,
    wrong: [{ value: flat, why: 'Work from the inside out: parentheses first, then brackets.' }, ltrFlat, ans + 10, ans - 2 >= 0 ? ans - 2 : ans + 4, ans + 2, ans + 1],
    solution: [...workLines(s), `The value is ${ans}.`],
    rule: 0,
    skill: 'brackets',
    check: () => (stepsOf(s).at(-1).v === ans && cleanSteps(s) ? true : 'steps do not reach the answer'),
  });
}

function hardMapDistance(rng) {
  const [A, B] = rng.sample(PLACES, 2);
  const across = rng.bool();
  const fixed = rng.int(1, 9);
  const a = rng.int(1, 9);
  const b = rng.intExcept(1, 9, [a, a + 1, a - 1]);
  const [x1, y1, x2, y2] = across ? [a, fixed, b, fixed] : [fixed, a, fixed, b];
  const d = Math.abs(b - a);
  return q({
    prompt: R`On a town map, the ${A} is at \((${x1}, ${y1})\). The ${B} is at \((${x2}, ${y2})\). Each grid unit is 1 block. How many blocks is it along the street from the ${A} to the ${B}?`,
    visual: grid(10, [{ x: x1, y: y1, label: A }, { x: x2, y: y2, label: B }], `A map grid from 0 to 10 on both axes. The ${A} is at (${x1}, ${y1}). The ${B} is at (${x2}, ${y2}).`),
    correct: d,
    unit: 'blocks',
    wrong: [
      { value: a + b, why: `Subtract the ${across ? 'x' : 'y'}-coordinates to find the distance. Do not add them.` },
      { value: fixed, why: `${fixed} is the coordinate that stays the same. Use the ones that change.` },
      d + 1,
      d - 1,
    ],
    solution: [`Both places have the same ${across ? 'y' : 'x'}-coordinate, ${fixed}. So they are on one ${across ? 'line across' : 'line up and down'}.`, `Compare the other coordinates: ${Math.min(a, b)} and ${Math.max(a, b)}.`, R`\(${Math.max(a, b)} - ${Math.min(a, b)} = ${d}\). It is ${d} blocks.`],
    rule: 4,
    skill: 'word problems',
    check: () => {
      let steps = 0;
      for (let u = Math.min(a, b); u < Math.max(a, b); u++) steps++;
      return steps === d && (x1 === x2 || y1 === y2) ? true : 'block count is wrong';
    },
  });
}

function hardTwoPatterns(rng) {
  const a = rng.int(1, 2);
  const k = rng.int(2, 3);
  const b = a * k;
  const A = [0, a, 2 * a, 3 * a];
  const B = [0, b, 2 * b, 3 * b];
  const yMax = 4 * b + 2;
  const table = { type: 'table', headers: ['Term', '1', '2', '3', '4'], rowHeaders: true, rows: [['Pattern A', ...A.map(String)], ['Pattern B', ...B.map(String)]], alt: `Pattern A: ${A.join(', ')}. Pattern B: ${B.join(', ')}.` };
  const plotPic = { type: 'plot', x: [0, 4 * a + 2], y: [0, yMax], step: [1, yMax > 14 ? 2 : 1], points: A.map((x, i) => ({ x, y: B[i] })), axisLabels: ['A', 'B'], alt: `The ordered pairs ${A.map((x, i) => `(${x}, ${B[i]})`).join(', ')} plotted on a grid.` };
  const intro = `Pattern A starts at 0 and adds ${a}. Pattern B starts at 0 and adds ${b}.`;
  if (rng.bool()) {
    const [x, y] = [4 * a, 4 * b];
    return q({
      prompt: `${intro} Each ordered pair is (A term, B term). The first four are graphed. Which ordered pair comes next?`,
      visual: [table, plotPic],
      correct: pt(x, y),
      wrong: [{ value: pt(y, x), why: 'The A term comes first, then the B term.' }, { value: pt(x, 3 * b), why: 'Both patterns move on one term.' }, pt(3 * a, y), pt(x + a, y + b)],
      solution: [`Term 5 of A: ${R`\(${3 * a} + ${a} = ${x}\)`}.`, `Term 5 of B: ${R`\(${3 * b} + ${b} = ${y}\)`}.`, `The next ordered pair is ${pt(x, y)}.`],
      rule: 3,
      skill: 'two patterns',
      check: () => (y === k * x && x === 4 * a ? true : 'pair does not follow the rules'),
    });
  }
  return q({
    prompt: `${intro} Compare each B term with the matching A term. Which is true?`,
    visual: [table, plotPic],
    correct: R`Each B term is \(${k}\) times the A term.`,
    wrong: [
      { value: R`Each B term is \(${b - a}\) more than the A term.`, why: R`Check term 3: \(${A[2]} + ${b - a} = ${A[2] + b - a}\), but the B term is ${B[2]}.` },
      R`Each B term is \(${b}\) times the A term.`,
      R`Each A term is \(${k}\) times the B term.`,
      R`Each B term is \(${b}\) more than the A term.`,
    ],
    solution: [`Pattern A: ${A.join(', ')}. Pattern B: ${B.join(', ')}.`, R`Look at the terms after 0: \(${A[1]} \times ${k} = ${B[1]}\), \(${A[2]} \times ${k} = ${B[2]}\), \(${A[3]} \times ${k} = ${B[3]}\).`, `Each B term is ${k} times the A term, because B adds ${k} times as much each time.`],
    rule: 3,
    skill: 'two patterns',
    check: () => (A.every((x, i) => B[i] === k * x) && A.some((x, i) => B[i] !== x + (b - a)) ? true : 'relation is wrong'),
  });
}

// ───────────── Challenge ─────────────

function challengeMissing(rng) {
  const a = rng.int(2, 9);
  const b = rng.int(2, 6);
  const form = rng.int(0, 2);
  const x = form === 1 ? rng.int(a + 1, a + 12) : rng.int(2, 15);
  const make = [(v) => `(${v}+${a})*${b}`, (v) => `${b}*(${v}-${a})`, (v) => `${v}*${b}+${a}`][form];
  const src = make(x);
  const T = val(src);
  // a and b are 2 to 9, so the only 0 in make('0') is the box.
  const shown = tex(make('0')).replace('0', '\\square');
  const lines = [
    [R`Undo the multiply: \(${T} \div ${b} = ${T / b}\).`, R`Undo the add: \(${T / b} - ${a} = ${x}\).`],
    [R`Undo the multiply: \(${T} \div ${b} = ${T / b}\).`, R`Undo the subtract: \(${T / b} + ${a} = ${x}\).`],
    [R`Undo the add: \(${T} - ${a} = ${T - a}\).`, R`Undo the multiply: \(${T - a} \div ${b} = ${x}\).`],
  ][form];
  const wrong = [
    [{ value: T / b, why: `That is what the parentheses equal. Now take away ${a}.` }, { value: okNum((T - a) / b), why: 'Undo the steps in reverse order: the multiply was done last.' }, T / b + a, T - a],
    [{ value: T / b, why: `That is what the parentheses equal. Now add ${a}.` }, okNum(T / b - a), okNum((T + a) / b), T + a],
    [{ value: okNum(T / b - a), why: `Undo the last step first: take away ${a}, then divide by ${b}.` }, { value: T - a, why: `Now divide by ${b}.` }, okNum(T / b), T - b],
  ][form];
  return q({
    prompt: R`What number goes in the box? \(${shown} = ${T}\)`,
    correct: x,
    wrong: [...wrong, x + 1, x - 1],
    solution: [...lines, R`Check: \(${tex(src)} = ${T}\). The box is ${x}.`],
    rule: 1,
    skill: 'missing number',
    check: () => (val(make(x)) === T && stepsOf(src).at(-1).v === T ? true : 'number does not rebuild the total'),
  });
}

function challengeNotTrue(rng) {
  const bad = rng.pick(SENTENCES.filter((s) => !s.ok));
  const good = rng.sample(SENTENCES.filter((s) => s.ok && s.x !== 'quadrilateral'), 3);
  return q({
    prompt: 'Three of these sentences are always true. Which one is NOT always true?',
    correct: bad.text,
    wrong: good.map((s) => s.text),
    solution: [bad.why, `So "${bad.text}" is not always true.`, `The other three follow from the shape family: square, rectangle and rhombus, parallelogram, quadrilateral.`],
    rule: 5,
    skill: 'shape families',
    check: () => (!truthAgain(bad) && good.every(truthAgain) ? true : 'sentence truth is wrong'),
  });
}

function challengeFourthCorner(rng) {
  const name = person(rng);
  const x1 = rng.int(1, 4);
  const y1 = rng.int(1, 4);
  const square = rng.bool(0.3);
  const w = rng.int(2, 5);
  const h = square ? w : rng.intExcept(2, 5, [w]);
  const [x2, y2] = [x1 + w, y1 + h];
  const corners = [[x1, y1], [x2, y1], [x2, y2]];
  const shape = square ? 'square' : 'rectangle';
  return q({
    prompt: R`${name} draws a ${shape} on a grid. Three corners are at \((${x1}, ${y1})\), \((${x2}, ${y1})\) and \((${x2}, ${y2})\). Where is the fourth corner?`,
    visual: grid(10, corners.map(([u, v]) => ({ x: u, y: v })), `A grid from 0 to 10 on both axes. Points at (${x1}, ${y1}), (${x2}, ${y1}) and (${x2}, ${y2}).`, { segments: [{ from: [x1, y1], to: [x2, y1] }, { from: [x2, y1], to: [x2, y2] }] }),
    correct: pt(x1, y2),
    wrong: [x1 !== y2 ? { value: pt(y2, x1), why: 'Write the x-coordinate first.' } : null, { value: pt(x1, y1), why: 'That corner is already given.' }, pt(x1, y2 + 1), pt(x1 + 1, y2), pt(x1, h)],
    solution: [`Two corners are at x = ${x2}. The other two must share x = ${x1}.`, `Two corners are at y = ${y1}. The other two must share y = ${y2}.`, `The fourth corner is at ${pt(x1, y2)}.`],
    rule: 4,
    skill: 'shapes on the grid',
    check: () => {
      const p = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
      return measure(p).includes('right') && (square ? measure(p).includes('equal') : !measure(p).includes('equal')) ? true : 'corners do not make the shape';
    },
  });
}

function challengeRoute(rng) {
  const name = person(rng);
  const [A, B] = rng.sample(PLACES, 2);
  const x1 = rng.int(1, 4);
  const y1 = rng.int(1, 4);
  const x2 = rng.int(x1 + 2, 9);
  const y2 = rng.int(y1 + 2, 9);
  const dx = x2 - x1;
  const dy = y2 - y1;
  return q({
    prompt: R`${name} walks from the ${A} at \((${x1}, ${y1})\) to the ${B} at \((${x2}, ${y2})\). ${name} goes along the streets: across first, then up. Each grid unit is 1 block. How many blocks does ${name} walk?`,
    visual: grid(10, [{ x: x1, y: y1, label: A }, { x: x2, y: y2, label: B }], `A map grid from 0 to 10 on both axes. The ${A} is at (${x1}, ${y1}). The ${B} is at (${x2}, ${y2}). A path goes across, then up.`, { segments: [{ from: [x1, y1], to: [x2, y1], arrow: true }, { from: [x2, y1], to: [x2, y2], arrow: true }] }),
    correct: dx + dy,
    unit: 'blocks',
    wrong: [{ value: dx, why: `That is only the walk across. Add the ${dy} blocks up.` }, { value: x2 + y2, why: `That is the walk from (0, 0). Start at the ${A} instead.` }, dy, dx + dy + 1],
    solution: [R`Across: from x = ${x1} to x = ${x2} is \(${x2} - ${x1} = ${dx}\) blocks.`, R`Up: from y = ${y1} to y = ${y2} is \(${y2} - ${y1} = ${dy}\) blocks.`, R`Total: \(${dx} + ${dy} = ${dx + dy}\) blocks.`],
    rule: 4,
    skill: 'word problems',
    check: () => {
      let [cx, cy, n] = [x1, y1, 0];
      while (cx < x2) (cx++, n++);
      while (cy < y2) (cy++, n++);
      return n === dx + dy ? true : 'walk does not add up';
    },
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'expressions-coordinates',
  title: 'Expressions & the Coordinate Plane',
  summary: 'Work out and write expressions, graph number patterns, find points on a grid, and sort shapes into families.',
  grade: 'Grade 5',
  standards: ['CCSS 5.OA.A.1', 'CCSS 5.OA.A.2', 'CCSS 5.OA.B.3', 'CCSS 5.G.A.1', 'CCSS 5.G.A.2', 'CCSS 5.G.B.3', 'CCSS 5.G.B.4'],

  explain: {
    intro: 'An **expression** is numbers joined by operations. Parentheses tell you which part to do first. A **coordinate grid** uses two numbers to name a point. Shapes belong to families.',
    rules: [
      {
        title: 'Grouping symbols first',
        text: 'Work inside parentheses first. Brackets go around parentheses. Work from the inside out.',
        example: R`\(2 \times [10 - (3 + 4)] = 2 \times [10 - 7] = 2 \times 3 = 6\).`,
      },
      {
        title: 'Then multiply and divide, then add and subtract',
        text: 'With no grouping, multiply and divide first, from left to right. Then add and subtract, from left to right.',
        example: R`\(5 + 4 \times 3 = 5 + 12 = 17\).`,
      },
      {
        title: 'Writing and reading expressions',
        text: 'Turn words into an expression. Use parentheses for a step that comes first. You can compare expressions without working them out.',
        example: R`"Add 8 and 7, then multiply by 2" is \(2 \times (8 + 7)\). It is twice as large as \(8 + 7\).`,
      },
      {
        title: 'Two patterns make ordered pairs',
        text: 'Make two patterns from two rules. Pair the matching terms. Graph each pair as a point.',
        example: 'A: add 3 from 0 gives 0, 3, 6. B: add 6 from 0 gives 0, 6, 12. Pairs: (0, 0), (3, 6), (6, 12).',
      },
      {
        title: 'Points on the coordinate grid',
        text: 'Start at the origin, (0, 0). The first number says how far across. The second says how far up.',
        example: 'To plot (3, 5), go 3 across, then 5 up.',
      },
      {
        title: 'Shape families',
        text: 'A shape gets every name whose rules it follows. A square is a rectangle and a rhombus. Every rectangle and every rhombus is a parallelogram.',
        example: 'A square has 4 right angles, so it is a rectangle. It has 4 equal sides, so it is a rhombus.',
      },
    ],
    vocab: [
      { term: 'expression', def: 'Numbers and operation signs that stand for a value, such as 2 × (8 + 7).' },
      { term: 'parentheses and brackets', def: 'Grouping symbols ( ) and [ ]. Work inside them first.' },
      { term: 'origin', def: 'The point (0, 0), where the two axes meet.' },
      { term: 'ordered pair', def: 'Two numbers that name a point. The x-coordinate comes first, then the y-coordinate.' },
      { term: 'parallelogram', def: 'A four-sided shape with two pairs of parallel sides.' },
      { term: 'rhombus', def: 'A parallelogram with four equal sides.' },
    ],
    mistakes: [
      'Working left to right and ignoring parentheses. Grouping comes first.',
      'Adding before multiplying when there are no parentheses.',
      'Swapping the coordinates. Go across first, then up.',
      'Thinking a square is not a rectangle. A square follows every rule for rectangles.',
    ],
    visual: [
      grid(8, [{ x: 3, y: 5, label: '(3, 5)' }], 'A grid from 0 to 8 on both axes. A path goes 3 across from the origin, then 5 up, to the point (3, 5).', { segments: [{ from: [0, 0], to: [3, 0], dashed: true }, { from: [3, 0], to: [3, 5], dashed: true }], axisLabels: ['x', 'y'] }),
      { type: 'polygon', points: [[0, 0], [4, 0], [4, 4], [0, 4]], marks: [1, 1, 1, 1], right: [0, 1, 2, 3], alt: 'A square with 4 equal sides and 4 right angles. It is also a rectangle, a rhombus and a parallelogram.' },
    ],
  },

  examples: [
    {
      title: 'Brackets and parentheses',
      problem: R`Find the value of \(3 \times [20 - (4 + 6)]\).`,
      steps: workLines('3*[20-(4+6)]'),
      answer: '30',
    },
    {
      title: 'Write it, then read it',
      problem: R`Write "add 8 and 7, then multiply by 2". Then compare \(3 \times (18{,}932 + 921)\) with \(18{,}932 + 921\).`,
      steps: [R`The adding comes first, so it goes in parentheses: \(2 \times (8 + 7)\).`, R`\(3 \times (18{,}932 + 921)\) is 3 groups of the sum.`, 'So it is three times as large. No need to work it out.'],
      answer: R`\(2 \times (8 + 7)\); three times as large`,
    },
    {
      title: 'Two patterns on a graph',
      problem: 'Pattern A starts at 0 and adds 3. Pattern B starts at 0 and adds 6. Make ordered pairs and graph them.',
      steps: ['A: 0, 3, 6, 9. B: 0, 6, 12, 18.', 'Pairs: (0, 0), (3, 6), (6, 12), (9, 18).', 'Each B term is twice the A term. B adds twice as much each time.'],
      answer: 'Each B term is 2 times the A term',
      visual: { type: 'plot', x: [0, 10], y: [0, 20], step: [1, 2], points: [{ x: 0, y: 0 }, { x: 3, y: 6 }, { x: 6, y: 12 }, { x: 9, y: 18 }], axisLabels: ['A', 'B'], alt: 'The points (0, 0), (3, 6), (6, 12) and (9, 18) on a grid. They lie on a straight line.' },
    },
    {
      title: 'Word problem: a map grid',
      word: true,
      problem: 'On a map, the school is at (2, 7). The park is at (2, 3). Each unit is 1 block. How far is it along the street?',
      steps: ['Both places have x-coordinate 2. They are on one line up and down.', R`Compare the y-coordinates: \(7 - 3 = 4\).`, 'The park is 4 blocks from the school.'],
      answer: '4 blocks',
      visual: grid(8, [{ x: 2, y: 7, label: 'school' }, { x: 2, y: 3, label: 'park' }], 'A map grid from 0 to 8. The school is at (2, 7). The park is at (2, 3).'),
    },
  ],

  models: [
    {
      id: 'where-parentheses-go',
      title: 'Where the parentheses go',
      intro: 'Choose three numbers and a form. See how the grouping changes the value.',
      inputs: [
        { name: 'a', label: 'First number', type: 'int', min: 0, max: 20, value: 2 },
        { name: 'b', label: 'Second number', type: 'int', min: 0, max: 20, value: 8 },
        { name: 'c', label: 'Third number', type: 'int', min: 0, max: 20, value: 7 },
        {
          name: 'form', label: 'Form', type: 'select', value: 'a*(b+c)',
          options: [
            { value: 'a*(b+c)', label: 'a × (b + c)' },
            { value: 'a*b+c', label: 'a × b + c' },
            { value: '(a+b)*c', label: '(a + b) × c' },
            { value: 'a+b*c', label: 'a + b × c' },
            { value: '(a-b)*c', label: '(a − b) × c' },
          ],
        },
      ],
      compute({ a, b, c, form }) {
        if (form === '(a-b)*c' && b > a) return { error: 'For a − b, the first number must be at least as big as the second.' };
        const src = form.replace(/[abc]/g, (ch) => ({ a, b, c })[ch]);
        const v = val(src);
        const other = form.includes('(') ? strip(tok(src)) : null;
        return {
          problem: R`Find the value of \(${tex(src)}\).`,
          steps: [...workLines(src), `The value is ${v}.`],
          answer: M(v),
          note: other && evalStd(other) !== v ? R`Without the parentheses, \(${tex(other)}\) would be ${evalStd(other)}.` : undefined,
        };
      },
    },
    {
      id: 'map-walk',
      title: 'Word problem: walking on a map grid',
      word: true,
      intro: 'Put home and school on the grid. See how many blocks the walk is.',
      inputs: [
        { name: 'x1', label: 'Home x', type: 'int', min: 1, max: 9, value: 1 },
        { name: 'y1', label: 'Home y', type: 'int', min: 1, max: 9, value: 2 },
        { name: 'x2', label: 'School x', type: 'int', min: 1, max: 9, value: 6 },
        { name: 'y2', label: 'School y', type: 'int', min: 1, max: 9, value: 5 },
      ],
      compute({ x1, y1, x2, y2 }) {
        if (x1 === x2 && y1 === y2) return { error: 'Home and school are at the same point. Move one of them.' };
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const segs = [];
        if (dx) segs.push({ from: [x1, y1], to: [x2, y1], arrow: true });
        if (dy) segs.push({ from: [x2, y1], to: [x2, y2], arrow: true });
        return {
          problem: `Mia walks along the streets from home at (${x1}, ${y1}) to school at (${x2}, ${y2}). Each unit is 1 block. How far does Mia walk?`,
          steps: [
            dx ? R`Across: from x = ${Math.min(x1, x2)} to x = ${Math.max(x1, x2)} is \(${Math.max(x1, x2)} - ${Math.min(x1, x2)} = ${dx}\) ${dx === 1 ? 'block' : 'blocks'}.` : 'The x-coordinates match, so there is no walk across.',
            dy ? R`${y2 > y1 ? 'Up' : 'Down'}: from y = ${y1} to y = ${y2} is \(${Math.max(y1, y2)} - ${Math.min(y1, y2)} = ${dy}\) ${dy === 1 ? 'block' : 'blocks'}.` : 'The y-coordinates match, so there is no walk up or down.',
            R`Total: \(${dx} + ${dy} = ${dx + dy}\).`,
          ],
          answer: `${dx + dy} ${dx + dy === 1 ? 'block' : 'blocks'}`,
          visual: grid(10, [{ x: x1, y: y1, label: 'home' }, { x: x2, y: y2, label: 'school' }], `A map grid from 0 to 10. Home is at (${x1}, ${y1}). School is at (${x2}, ${y2}). The path goes across, then ${y2 >= y1 ? 'up' : 'down'}.`, { segments: segs }),
        };
      },
    },
  ],

  quiz: {
    easy: [easyEvaluate, easyReadPoint, easyWhichPoint],
    medium: [mediumWordsToExpr, mediumInterpret, mediumShapeName, mediumAlwaysTrue],
    hard: [hardBrackets, hardMapDistance, hardTwoPatterns],
    challenge: [challengeMissing, challengeNotTrue, challengeFourthCorner, challengeRoute],
  },
};
