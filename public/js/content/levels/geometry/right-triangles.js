import { R, q, num, round, sqrtTex, simplifySqrt, isSquare, person } from '../../lib/index.js';
import { T, sqrtT, rad, TRIPLES, LENGTH_UNITS } from './_shared.js';

// A right triangle with horizontal leg a and vertical leg b; sides are labelled [a, hypotenuse, b].
const rt = (a, b, sides, alt, more = {}) => ({ type: 'polygon', points: [[0, 0], [a, 0], [0, b]], right: [0], sides, alt, ...more });
const legs = (rng) => {
  const [a, b, c] = rng.pick(TRIPLES);
  return rng.bool() ? [a, b, c] : [b, a, c];
};
const root = (n, unit) => R`\(${sqrtTex(n)}\) ${unit}`;
// Keep only wrong choices whose value is clearly different from the right one and from each other.
function distinct(correct, list, gap = 1e-6) {
  const seen = [correct];
  return list.filter((w) => w && Number.isFinite(w.v) && w.v > 0 && seen.every((s) => Math.abs(s - w.v) > gap) && seen.push(w.v));
}

// ───────────── Easy ─────────────

function easyHypotenuse(rng) {
  const [a, b, c] = legs(rng);
  const u = rng.pick(LENGTH_UNITS);
  return q({
    prompt: R`A right triangle has legs of \(${a}\) ${u} and \(${b}\) ${u}. How long is its hypotenuse?`,
    visual: rt(a, b, [`${a}`, 'c', `${b}`], `A right triangle with legs ${a} ${u} and ${b} ${u}. The hypotenuse is marked c.`),
    correct: c,
    unit: u,
    wrong: [
      { value: a + b, why: 'Add the squares of the legs, then take the square root. Adding the legs themselves gives a length that is too long.' },
      { value: a * a + b * b, why: R`That is \(c^2\). Take the square root to get \(c\).` },
      c + 2,
      c - 1,
      Math.max(a, b) + 1,
    ],
    solution: [R`Pythagorean theorem: \(c^2 = a^2 + b^2 = ${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${c * c}\).`, R`\(c = \sqrt{${c * c}} = ${c}\) ${u}.`],
    rule: 0,
    skill: 'finding the hypotenuse',
    check: () => (Math.abs(Math.hypot(a, b) - c) < 1e-9 ? true : 'not the distance between the ends of the legs'),
  });
}

function easyLeg(rng) {
  const [a, b, c] = legs(rng);
  const u = rng.pick(LENGTH_UNITS);
  return q({
    prompt: R`A right triangle has a hypotenuse of \(${c}\) ${u} and one leg of \(${b}\) ${u}. How long is the other leg?`,
    visual: rt(a, b, ['x', `${c}`, `${b}`], `A right triangle with hypotenuse ${c} ${u} and one leg ${b} ${u}. The other leg is marked x.`),
    correct: a,
    unit: u,
    wrong: [
      { value: c - b, why: 'Subtract the squares of the lengths, not the lengths themselves, and then take the square root.' },
      { value: c * c - b * b, why: R`That is the square of the leg. Take the square root.` },
      { value: round(Math.hypot(c, b), 0), why: 'The hypotenuse is the longest side, so a leg must be shorter than it. Subtract the squares instead of adding them.' },
      a + 2,
      a > 2 ? a - 1 : a + 3,
    ],
    solution: [R`Pythagorean theorem with \(c = ${c}\): \(x^2 + ${b}^2 = ${c}^2\).`, R`\(x^2 = ${c * c} - ${b * b} = ${a * a}\).`, R`\(x = \sqrt{${a * a}} = ${a}\) ${u}.`],
    rule: 0,
    skill: 'finding a leg',
    check: () => (a * a + b * b === c * c ? true : 'sides do not satisfy the Pythagorean theorem'),
  });
}

function easyWhichRight(rng) {
  for (;;) {
    const [a, b, c] = rng.pick(TRIPLES);
    const near = rng.shuffle([[a, b, c + 1], [a + 1, b, c], [a, b + 1, c + 1], [a, b - 1, c], [a + 1, b + 1, c + 1], [a, b + 2, c + 1]]).filter(([x, y, z]) => x * x + y * y !== z * z && x + y > z && x < z && y < z).slice(0, 3);
    if (near.length < 3) continue;
    const show = (t) => R`\(${t[0]},\ ${t[1]},\ ${t[2]}\)`;
    const test = ([x, y, z]) => R`\(${x}^2 + ${y}^2 = ${x * x + y * y}\), but \(${z}^2 = ${z * z}\)`;
    return q({
      prompt: 'Which three lengths are the sides of a right triangle?',
      correct: show([a, b, c]),
      wrong: [{ value: show(near[0]), why: `${test(near[0])}.` }, { value: show(near[1]), why: `${test(near[1])}.` }, show(near[2])],
      solution: [
        R`A triangle is a right triangle exactly when the square of its longest side equals the sum of the squares of the other two.`,
        R`\(${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${c * c}\) and \(${c}^2 = ${c * c}\). ✓`,
        `For the others: ${near.map(test).join('; ')}.`,
      ],
      rule: 2,
      skill: 'converse of the Pythagorean theorem',
      check: () => (a * a + b * b === c * c && near.every(([x, y, z]) => x * x + y * y !== z * z) ? true : 'not exactly one right triangle'),
    });
  }
}

// ───────────── Medium ─────────────

function mediumRadical(rng) {
  for (;;) {
    const findHyp = rng.bool();
    const a = rng.int(2, 12);
    const b = findHyp ? rng.int(2, 12) : rng.int(a + 1, 15); // when finding a leg, b is the hypotenuse
    const n = findHyp ? a * a + b * b : b * b - a * a;
    if (isSquare(n)) continue;
    const { coef, rad: r } = simplifySqrt(n);
    const other = findHyp ? Math.abs(a * a - b * b) : a * a + b * b;
    const wrong = distinct(Math.sqrt(n), [
      other > 0 ? { value: root(other, 'cm'), v: Math.sqrt(other), why: findHyp ? 'For the hypotenuse, add the squares of the legs. Subtracting is for finding a leg.' : 'The hypotenuse is the longest side. To find a leg, subtract the squares.' } : null,
      coef > 1 ? { value: R`\(${r}\sqrt{${coef}}\) cm`, v: r * Math.sqrt(coef), why: R`\(\sqrt{${n}} = \sqrt{${coef * coef} \cdot ${r}}\). The perfect square \(${coef * coef}\) comes out as \(${coef}\), and \(${r}\) stays under the root.` } : null,
      { value: R`\(${findHyp ? a + b : b - a}\) cm`, v: findHyp ? a + b : b - a, why: 'Work with the squares of the sides, not the sides themselves.' },
      { value: root(n + (coef > 1 ? r : 3), 'cm'), v: Math.sqrt(n + (coef > 1 ? r : 3)) },
      { value: R`\(${n}\) cm`, v: n },
      { value: root(2 * n, 'cm'), v: Math.sqrt(2 * n) },
    ]);
    const lab = (v) => `${v}`;
    return q({
      prompt: findHyp
        ? R`A right triangle has legs of \(${a}\) cm and \(${b}\) cm. Find the hypotenuse in simplest radical form.`
        : R`A right triangle has a hypotenuse of \(${b}\) cm and one leg of \(${a}\) cm. Find the other leg in simplest radical form.`,
      visual: findHyp ? rt(a, b, [lab(a), 'x', lab(b)], `A right triangle with legs ${a} cm and ${b} cm. The hypotenuse is marked x.`) : rt(Math.sqrt(n), a, ['x', lab(b), lab(a)], `A right triangle with hypotenuse ${b} cm and one leg ${a} cm. The other leg is marked x.`),
      correct: root(n, 'cm'),
      wrong,
      solution: [
        findHyp ? R`\(x^2 = ${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${n}\), so \(x = \sqrt{${n}}\).` : R`\(x^2 = ${b}^2 - ${a}^2 = ${b * b} - ${a * a} = ${n}\), so \(x = \sqrt{${n}}\).`,
        coef > 1 ? R`Simplify: \(\sqrt{${n}} = \sqrt{${coef * coef} \cdot ${r}} = ${coef}\sqrt{${r}}\).` : R`\(${n}\) has no perfect-square factor other than 1, so \(\sqrt{${n}}\) is already in simplest form.`,
        R`\(x = ${sqrtTex(n)}\) cm, which is about \(${num(Math.sqrt(n), { places: 2 })}\) cm.`,
      ],
      rule: 1,
      skill: 'simplest radical form',
      check: () => (coef * coef * r === n && Math.abs(findHyp ? Math.hypot(a, b) - Math.sqrt(n) : Math.hypot(a, Math.sqrt(n)) - b) < 1e-9 ? true : 'radical does not match the triangle'),
    });
  }
}

function mediumClassify(rng) {
  for (;;) {
    const kind = rng.pick(['Acute', 'Right', 'Obtuse', 'Not a triangle']);
    let [a, b] = [rng.int(3, 14), rng.int(3, 14)].sort((x, y) => x - y);
    let c;
    if (kind === 'Right') [a, b, c] = rng.pick(TRIPLES);
    else {
      const h = Math.sqrt(a * a + b * b);
      const range = kind === 'Acute' ? [b, Math.ceil(h) - 1] : kind === 'Obtuse' ? [Math.floor(h) + 1, a + b - 1] : [a + b, a + b + 4];
      if (range[0] > range[1]) continue;
      c = rng.int(range[0], range[1]);
      if (c * c === a * a + b * b) continue;
    }
    const order = rng.shuffle([a, b, c]);
    const sum = a * a + b * b;
    const sign = c * c === sum ? '=' : c * c < sum ? '<' : '>';
    return q({
      prompt: R`A student is given three lengths: \(${order[0]}\), \(${order[1]}\) and \(${order[2]}\). What kind of triangle do they form?`,
      correct: kind,
      wrong: [
        kind === 'Obtuse' ? { value: 'Acute', why: R`When \(c^2\) is greater than \(a^2 + b^2\), the longest side is too long for a right angle, so the angle opposite it is obtuse.` } : kind === 'Acute' ? { value: 'Obtuse', why: R`When \(c^2\) is less than \(a^2 + b^2\), the longest side is too short for a right angle, so the largest angle is acute.` } : 'Acute',
        'Right',
        'Obtuse',
        'Not a triangle',
      ],
      solution:
        kind === 'Not a triangle'
          ? [R`First check that the lengths can form a triangle: the two shorter sides must add to more than the longest.`, R`\(${a} + ${b} = ${a + b}\), which is not greater than \(${c}\). These lengths cannot form a triangle.`]
          : [
              R`The longest side is \(c = ${c}\), and \(${a} + ${b} > ${c}\), so a triangle exists. Compare \(c^2\) with \(a^2 + b^2\).`,
              R`\(c^2 = ${c * c}\) and \(a^2 + b^2 = ${a * a} + ${b * b} = ${sum}\), so \(c^2 ${sign} a^2 + b^2\).`,
              kind === 'Right' ? 'They are equal, so the triangle is a right triangle.' : kind === 'Acute' ? 'The longest side is shorter than a hypotenuse would be, so the triangle is acute.' : 'The longest side is longer than a hypotenuse would be, so the triangle is obtuse.',
            ],
      rule: 2,
      skill: 'classifying by side lengths',
      check: () => {
        if (a + b <= c) return kind === 'Not a triangle' ? true : 'lengths do not form a triangle';
        const big = (Math.acos((a * a + b * b - c * c) / (2 * a * b)) * 180) / Math.PI; // angle opposite c
        return (Math.abs(big - 90) < 1e-9 ? 'Right' : big < 90 ? 'Acute' : 'Obtuse') === kind && c >= b ? true : `largest angle is ${big}`;
      },
    });
  }
}

function mediumStory(rng) {
  let [a, b, c] = legs(rng);
  while (c > 30) [a, b, c] = legs(rng);
  const name = person(rng);
  const s = rng.pick([
    { text: R`A ladder \(${c}\) ft long leans against a wall. Its foot is \(${a}\) ft from the wall. How high up the wall does the ladder reach?`, ans: b, u: 'ft', hyp: false, lab: [`${a}`, `${c}`, 'x'], alt: `The ladder is the hypotenuse, ${c} ft. The ground distance is ${a} ft and the height on the wall is marked x.` },
    { text: R`A ladder leans against a wall. Its foot is \(${a}\) ft from the wall and its top is \(${b}\) ft above the ground. How long is the ladder?`, ans: c, u: 'ft', hyp: true, lab: [`${a}`, 'x', `${b}`], alt: `The ground distance is ${a} ft, the height on the wall is ${b} ft, and the ladder (the hypotenuse) is marked x.` },
    { text: R`${name} walks \(${a}\) m due east and then \(${b}\) m due north. How far is ${name} from the starting point, in a straight line?`, ans: c, u: 'm', hyp: true, lab: [`${a}`, 'x', `${b}`], alt: `The walk is ${a} m east, then ${b} m north. The straight-line distance back to the start is the hypotenuse, marked x.` },
    { text: R`A rectangular gate is \(${a}\) ft wide and \(${b}\) ft tall. ${name} nails a brace along its diagonal. How long is the brace?`, ans: c, u: 'ft', hyp: true, lab: [`${a}`, 'x', `${b}`], alt: `Half of the gate: a right triangle with width ${a} ft and height ${b} ft. The diagonal brace is the hypotenuse, marked x.` },
    { text: R`A wire \(${c}\) m long runs from the top of a pole to a point on the ground \(${a}\) m from the base of the pole. How tall is the pole?`, ans: b, u: 'm', hyp: false, lab: [`${a}`, `${c}`, 'x'], alt: `The wire is the hypotenuse, ${c} m. The ground distance is ${a} m and the pole's height is marked x.` },
  ]);
  return q({
    prompt: s.text,
    visual: rt(a, b, s.lab, `A right triangle. ${s.alt}`),
    correct: s.ans,
    unit: s.u,
    wrong: s.hyp
      ? [{ value: a + b, why: 'The straight line is shorter than going along both legs. Add the squares, then take the square root.' }, { value: a * a + b * b, why: R`That is the square of the length. Take the square root.` }, c + 2, c - 1, Math.max(a, b) + 1]
      : [{ value: c - a, why: 'Subtract the squares of the lengths, not the lengths themselves.' }, { value: round(Math.hypot(c, a), 0), why: `The ${c}-${s.u} length is the hypotenuse, the longest side. The missing side is a leg, so subtract the squares.` }, b + 2, b > 2 ? b - 1 : b + 3, c],
    solution: s.hyp
      ? [`The two given lengths are at right angles, so they are the legs. The unknown length is the hypotenuse.`, R`\(x^2 = ${a}^2 + ${b}^2 = ${a * a + b * b}\).`, R`\(x = \sqrt{${c * c}} = ${c}\) ${s.u}.`]
      : [`The wall or pole is at right angles to the ground. The slanted length, ${c} ${s.u}, is the hypotenuse.`, R`\(x^2 + ${a}^2 = ${c}^2\), so \(x^2 = ${c * c} - ${a * a} = ${b * b}\).`, R`\(x = \sqrt{${b * b}} = ${b}\) ${s.u}.`],
    rule: 6,
    skill: 'right-triangle word problems',
    check: () => (a * a + b * b === c * c && s.ans === (s.hyp ? c : b) ? true : 'answer does not complete the right triangle'),
  });
}

// ───────────── Hard ─────────────

function hardSpecial45(rng) {
  const s = rng.int(2, 15);
  const kind = rng.pick(['leg', 'hyp-radical', 'hyp-whole', 'square']);
  const pts = { type: 'polygon', points: [[0, 0], [4, 0], [0, 4]], right: [0] };
  const half = s % 2 === 0 ? R`${sqrtTex(2, s / 2)}` : R`\frac{${s}\sqrt{2}}{2}`;
  const halfV = (s * Math.SQRT2) / 2;
  const data = {
    leg: { text: R`Each leg of a \(45^\circ\)-\(45^\circ\)-\(90^\circ\) triangle is \(${s}\) cm long. How long is the hypotenuse?`, sides: [`${s}`, 'x', `${s}`], right: R`${s}\sqrt{2}`, v: s * Math.SQRT2, steps: [R`In a \(45^\circ\)-\(45^\circ\)-\(90^\circ\) triangle the hypotenuse is \(\sqrt{2}\) times a leg.`, R`\(x = ${s}\sqrt{2}\) cm. (Check: \(${s}^2 + ${s}^2 = ${2 * s * s} = (${s}\sqrt{2})^2\).)`], wrong: [[R`${2 * s}`, 2 * s, R`The hypotenuse is \(\sqrt{2}\) times a leg, not \(2\) times.`], [R`${s}\sqrt{3}`, s * Math.sqrt(3), R`\(\sqrt{3}\) belongs to the \(30^\circ\)-\(60^\circ\)-\(90^\circ\) triangle.`], [half, halfV], [`${s}`, s]] },
    'hyp-radical': { text: R`The hypotenuse of a \(45^\circ\)-\(45^\circ\)-\(90^\circ\) triangle is \(${s}\sqrt{2}\) cm long. How long is each leg?`, sides: ['x', `${s}√2`, 'x'], right: `${s}`, v: s, steps: [R`The hypotenuse is \(\sqrt{2}\) times a leg, so a leg is the hypotenuse divided by \(\sqrt{2}\).`, R`\(x = \dfrac{${s}\sqrt{2}}{\sqrt{2}} = ${s}\) cm.`], wrong: [[R`${2 * s}`, 2 * s, R`Divide the hypotenuse by \(\sqrt{2}\) to get a leg. Multiplying gives a longer length.`], [half, halfV, R`Dividing by \(\sqrt{2}\) removes the \(\sqrt{2}\) completely.`], [R`${s}\sqrt{2}`, s * Math.SQRT2], [R`${s}\sqrt{3}`, s * Math.sqrt(3)]] },
    'hyp-whole': { text: R`The hypotenuse of a \(45^\circ\)-\(45^\circ\)-\(90^\circ\) triangle is \(${s}\) cm long. How long is each leg, in simplest radical form?`, sides: ['x', `${s}`, 'x'], right: half, v: halfV, steps: [R`A leg is the hypotenuse divided by \(\sqrt{2}\): \(x = \dfrac{${s}}{\sqrt{2}}\).`, R`Rationalise by multiplying top and bottom by \(\sqrt{2}\): \(x = \dfrac{${s}\sqrt{2}}{2}${s % 2 === 0 ? ` = ${half}` : ''}\) cm.`], wrong: [[R`${s}\sqrt{2}`, s * Math.SQRT2, R`A leg is shorter than the hypotenuse. Divide by \(\sqrt{2}\) instead of multiplying.`], [s % 2 === 0 ? `${s / 2}` : R`\frac{${s}}{2}`, s / 2, R`Half the hypotenuse is the short leg of a \(30^\circ\)-\(60^\circ\)-\(90^\circ\) triangle. Here divide by \(\sqrt{2}\).`], [R`${2 * s}`, 2 * s], [R`\frac{${s}\sqrt{3}}{2}`, (s * Math.sqrt(3)) / 2]] },
    square: { text: R`A square has sides \(${s}\) cm long. How long is its diagonal?`, sides: [`${s}`, 'x', `${s}`], right: R`${s}\sqrt{2}`, v: s * Math.SQRT2, steps: [R`The diagonal cuts the square into two \(45^\circ\)-\(45^\circ\)-\(90^\circ\) triangles with legs \(${s}\) cm.`, R`The hypotenuse is \(\sqrt{2}\) times a leg: \(x = ${s}\sqrt{2}\) cm.`], wrong: [[R`${2 * s}`, 2 * s, 'That is the distance along two sides. The diagonal is a shortcut.'], [R`${s * s}`, s * s, 'That is the area of the square.'], [R`${s}\sqrt{3}`, s * Math.sqrt(3)], [half, halfV]] },
  }[kind];
  return q({
    prompt: data.text,
    visual: { ...pts, sides: data.sides, angles: ['', '45°', '45°'], alt: `A right triangle with two 45 degree angles. In centimetres, its bottom leg is labelled ${data.sides[0]}, its hypotenuse ${data.sides[1]} and its upright leg ${data.sides[2]}.` },
    correct: R`\(${data.right}\) cm`,
    wrong: distinct(data.v, data.wrong.map(([tex, v, why]) => ({ value: R`\(${tex}\) cm`, v, why }))),
    solution: data.steps,
    rule: 4,
    skill: '45-45-90 triangles',
    check: () => (Math.abs(kind === 'leg' || kind === 'square' ? data.v - Math.hypot(s, s) : Math.hypot(data.v, data.v) - (kind === 'hyp-radical' ? s * Math.SQRT2 : s)) < 1e-9 ? true : 'sides do not fit a 45-45-90 triangle'),
  });
}

function hardSpecial30(rng) {
  const x = rng.int(2, 12);
  const given = rng.pick(['short', 'hyp', 'long-radical', 'long-whole']);
  const g = given.startsWith('long') ? 'long' : given;
  const ask = rng.pick(['short', 'long', 'hyp'].filter((k) => k !== g));
  // Each side is m or m√3. With shorter leg s the sides are s, s√3, 2s; for 'long-whole' the longer leg is 3x, so s = x√3.
  const whole = given === 'long-whole';
  const side = whole ? { short: [x, true], long: [3 * x, false], hyp: [2 * x, true] } : { short: [x, false], long: [x, true], hyp: [2 * x, false] };
  const tex = ([m, r]) => (r ? sqrtTex(3, m) : `${m}`);
  const val = ([m, r]) => (r ? m * Math.sqrt(3) : m);
  const txt = ([m, r]) => (r ? `${m}√3` : `${m}`);
  const choice = (s, why) => ({ value: R`\(${tex(s)}\) cm`, v: val(s), why });
  const full = { short: 'shorter leg', long: 'longer leg', hyp: 'hypotenuse' };
  const names = { short: R`shorter leg (opposite the \(30^\circ\) angle)`, long: R`longer leg (opposite the \(60^\circ\) angle)`, hyp: 'hypotenuse' };
  const label = (k) => (k === g ? txt(side[k]) : k === ask ? 'x' : '');
  const [gm, gr] = side[g];
  const third = ['short', 'long', 'hyp'].find((k) => k !== g && k !== ask);
  return q({
    prompt: R`In a \(30^\circ\)-\(60^\circ\)-\(90^\circ\) triangle, the ${names[g]} is \(${tex(side[g])}\) cm long. How long is the ${names[ask]}?`,
    visual: { type: 'polygon', points: [[0, 0], [5.196, 0], [0, 3]], right: [0], angles: ['', '30°', '60°'], sides: [label('long'), label('hyp'), label('short')], alt: `A right triangle with angles of 30 and 60 degrees. The ${full[g]} is ${txt(side[g])} cm and the ${full[ask]} is marked x.` },
    correct: R`\(${tex(side[ask])}\) cm`,
    wrong: distinct(val(side[ask]), [
      choice(side[third], `That is the ${full[third]}. Check which side the question asks for.`),
      { value: R`\(${sqrtTex(2, gm)}\) cm`, v: gm * Math.SQRT2 * (gr ? 0 : 1) || null, why: R`\(\sqrt{2}\) belongs to the \(45^\circ\)-\(45^\circ\)-\(90^\circ\) triangle. This triangle uses \(\sqrt{3}\) and \(2\).` },
      choice([2 * gm, gr]),
      gm % 2 === 0 ? choice([gm / 2, gr]) : null,
      choice([gm, !gr]),
      choice([3 * gm, gr]),
    ]),
    solution: [
      R`In a \(30^\circ\)-\(60^\circ\)-\(90^\circ\) triangle with shorter leg \(s\), the longer leg is \(s\sqrt{3}\) and the hypotenuse is \(2s\).`,
      g === 'short' ? R`Here \(s = ${tex(side.short)}\).` : g === 'hyp' ? R`The hypotenuse is \(2s = ${tex(side.hyp)}\), so \(s = ${tex(side.short)}\).` : whole ? R`The longer leg is \(s\sqrt{3} = ${3 * x}\), so \(s = \dfrac{${3 * x}}{\sqrt{3}} = \dfrac{${3 * x}\sqrt{3}}{3} = ${x}\sqrt{3}\).` : R`The longer leg is \(s\sqrt{3} = ${x}\sqrt{3}\), so \(s = ${x}\).`,
      ask === 'short' ? R`The shorter leg is \(${tex(side.short)}\) cm.` : ask === 'long' ? R`The longer leg is \(s\sqrt{3} = ${tex(side.long)}\) cm.` : R`The hypotenuse is \(2s = ${tex(side.hyp)}\) cm.`,
    ],
    rule: 5,
    skill: '30-60-90 triangles',
    check: () => (Math.abs(val(side.short) / val(side.hyp) - Math.sin(rad(30))) < 1e-9 && Math.abs(val(side.long) / val(side.short) - Math.tan(rad(60))) < 1e-9 ? true : 'sides do not fit a 30-60-90 triangle'),
  });
}

function hardNearestTenth(rng) {
  for (;;) {
    const a = rng.int(3, 20);
    const b = rng.int(3, 20);
    const name = person(rng);
    const s = rng.pick([
      { ok: !isSquare(a * a + b * b), text: R`A rectangular field is \(${a}\) m wide and \(${b}\) m long. ${name} walks straight across it from one corner to the opposite corner. How far is that, to the nearest tenth of a metre?`, hyp: true, u: 'm' },
      { ok: !isSquare(a * a + b * b), text: R`A boat sails \(${a}\) km due south and then \(${b}\) km due west. How far is it from where it started, to the nearest tenth of a kilometre?`, hyp: true, u: 'km' },
      { ok: b > a + 1 && !isSquare(b * b - a * a), text: R`A ladder \(${b}\) ft long leans against a wall with its foot \(${a}\) ft from the wall. How high up the wall does it reach, to the nearest tenth of a foot?`, hyp: false, u: 'ft' },
      { ok: b > a + 1 && !isSquare(b * b - a * a), text: R`A kite string is \(${b}\) m long and pulled tight. The kite is directly above a point on the ground \(${a}\) m from ${name}, who holds the string at ground level. How high is the kite, to the nearest tenth of a metre?`, hyp: false, u: 'm' },
    ]);
    if (!s.ok) continue;
    const n = s.hyp ? a * a + b * b : b * b - a * a;
    const ans = round(Math.sqrt(n), 1);
    if (Number.isInteger(ans)) continue;
    const wrong = distinct(ans, [
      { value: s.hyp ? a + b : b - a, v: s.hyp ? a + b : b - a, why: 'Square the lengths first. The sides themselves cannot simply be added or subtracted.' },
      { value: round(Math.sqrt(s.hyp ? Math.abs(a * a - b * b) : a * a + b * b), 1), v: Math.sqrt(s.hyp ? Math.abs(a * a - b * b) : a * a + b * b), why: s.hyp ? 'The unknown length is the hypotenuse, so add the squares.' : `The ${b}-${s.u} length is the hypotenuse, so subtract the squares to find the leg.` },
      { value: n, v: n, why: 'That is the square of the length. Take the square root.' },
      { value: round(ans * 2, 1), v: ans * 2 },
      { value: round(ans / 2, 1), v: ans / 2 },
    ], 0.6);
    return q({
      prompt: s.text,
      correct: ans,
      unit: s.u,
      wrong: wrong.map(({ value, why }) => (why ? { value, why } : value)),
      solution: [
        s.hyp ? `The two given distances are at right angles, so they are the legs of a right triangle. The distance asked for is the hypotenuse.` : `The ${b}-${s.u} length is the hypotenuse, because it is opposite the right angle at the ground.`,
        s.hyp ? R`\(x^2 = ${a}^2 + ${b}^2 = ${n}\).` : R`\(x^2 = ${b}^2 - ${a}^2 = ${n}\).`,
        R`\(x = \sqrt{${n}} \approx ${num(Math.sqrt(n), { places: 3 })}\), which rounds to \(${num(ans)}\) ${s.u}.`,
      ],
      rule: 6,
      skill: 'right-triangle word problems',
      check: () => (Math.abs(s.hyp ? Math.hypot(a, b) - ans : Math.hypot(a, ans) - b) < 0.06 ? true : 'rounded answer does not fit the triangle'),
    });
  }
}

// ───────────── Challenge ─────────────

function challengeIsoscelesArea(rng) {
  const [h, half, leg] = legs(rng);
  const base = 2 * half;
  const area = half * h;
  const askArea = rng.bool(0.7);
  return q({
    prompt: R`An isosceles triangle has two sides of \(${leg}\) cm and a base of \(${base}\) cm. ${askArea ? 'What is its area?' : 'What is its height, measured from the base?'}`,
    visual: { type: 'polygon', points: [[0, 0], [base, 0], [half, h]], sides: [`${base}`, `${leg}`, `${leg}`], marks: [0, 1, 1], extra: [{ from: [half, h], to: [half, 0], label: 'h' }], alt: `An isosceles triangle with two sides of ${leg} cm and a base of ${base} cm. A dashed height h runs from the top vertex to the middle of the base.` },
    correct: askArea ? area : h,
    unit: askArea ? 'cm²' : 'cm',
    wrong: askArea
      ? [{ value: (base * leg) / 2, why: `The ${leg}-cm side is slanted, so it is not the height. Find the height with the Pythagorean theorem first.` }, { value: base * h, why: R`The area of a triangle is \(\frac{1}{2} \cdot \text{base} \cdot \text{height}\). Do not forget the \(\frac{1}{2}\).` }, h, area + half, 2 * leg + base]
      : [{ value: round(Math.sqrt(leg * leg - base * base > 0 ? leg * leg - base * base : leg * leg + half), 0), why: 'The height meets the base at its midpoint, so the leg of the right triangle is half the base.' }, { value: leg, why: 'The height is perpendicular to the base, so it is shorter than the slanted side.' }, h + 2, half, h > 2 ? h - 1 : h + 3],
    solution: [
      R`The height from the top vertex meets the base at its midpoint, making two right triangles with hypotenuse \(${leg}\) and one leg \(\frac{${base}}{2} = ${half}\).`,
      R`\(h^2 = ${leg}^2 - ${half}^2 = ${leg * leg} - ${half * half} = ${h * h}\), so \(h = ${h}\) cm.`,
      ...(askArea ? [R`Area \(= \frac{1}{2} \cdot ${base} \cdot ${h} = ${area}\) cm².`] : []),
    ],
    rule: 0,
    skill: 'multi-step right triangles',
    check: () => {
      const s = (2 * leg + base) / 2; // Heron's formula, as a second way to get the area
      return Math.abs(Math.sqrt(s * (s - leg) * (s - leg) * (s - base)) - area) < 1e-6 ? true : 'area does not match Heron’s formula';
    },
  });
}

function challengeBox(rng) {
  const [l, w, h] = rng.bool(0.5) ? rng.pick([[1, 2, 2], [2, 3, 6], [1, 4, 8], [4, 4, 7], [2, 6, 9], [3, 4, 12], [2, 5, 14], [6, 6, 7], [2, 10, 11], [8, 9, 12]]) : [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)];
  const n = l * l + w * w + h * h;
  const face = l * l + w * w;
  return q({
    prompt: R`A box is \(${l}\) cm long, \(${w}\) cm wide and \(${h}\) cm high. How long is the diagonal through the inside of the box, from one corner to the opposite corner? Give an exact answer.`,
    visual: { type: 'solid', kind: 'box', labels: { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` }, alt: `A box (rectangular prism) ${l} cm long, ${w} cm wide and ${h} cm high.` },
    correct: root(n, 'cm'),
    wrong: distinct(Math.sqrt(n), [
      { value: root(face, 'cm'), v: Math.sqrt(face), why: 'That is the diagonal of the base only. The diagonal through the box also climbs the height.' },
      { value: R`\(${l + w + h}\) cm`, v: l + w + h, why: 'Add the squares of the three dimensions, then take the square root.' },
      { value: R`\(${n}\) cm`, v: n, why: 'That is the square of the diagonal. Take the square root.' },
      { value: root(n + h, 'cm'), v: Math.sqrt(n + h) },
      { value: root(l * w * h, 'cm'), v: Math.sqrt(l * w * h) },
    ]).map(({ value, why }) => (why ? { value, why } : value)),
    solution: [
      R`First find the diagonal \(d\) of the base: \(d^2 = ${l}^2 + ${w}^2 = ${face}\).`,
      R`That diagonal and the height are the legs of a second right triangle whose hypotenuse is the diagonal \(D\) through the box: \(D^2 = d^2 + ${h}^2 = ${face} + ${h * h} = ${n}\).`,
      R`\(D = \sqrt{${n}}${isSquare(n) ? ` = ${Math.sqrt(n)}` : simplifySqrt(n).coef > 1 ? ` = ${sqrtTex(n)}` : ''}\) cm.`,
    ],
    rule: 6,
    skill: 'multi-step right triangles',
    check: () => (Math.abs(Math.hypot(Math.hypot(l, w), h) - Math.sqrt(n)) < 1e-9 ? true : 'not the distance between opposite corners'),
  });
}

function challengeLegs(rng) {
  const [a, b, c] = rng.pick(TRIPLES);
  const d = b - a;
  return q({
    prompt: R`One leg of a right triangle is \(${d}\) cm longer than the other leg. The hypotenuse is \(${c}\) cm long. How long is the **shorter** leg?`,
    visual: rt(b, a, [`x + ${d}`, `${c}`, 'x'], `A right triangle with legs x and x + ${d} and hypotenuse ${c}.`),
    correct: a,
    unit: 'cm',
    wrong: [
      { value: b, why: 'That is the longer leg. The question asks for the shorter one.' },
      (c - d) % 2 === 0 && (c - d) / 2 !== a ? { value: (c - d) / 2, why: R`The legs do not add up to the hypotenuse. Use \(x^2 + (x + ${d})^2 = ${c}^2\).` } : null,
      c - d,
      a + 2,
      a > 2 ? a - 1 : a + 4,
    ],
    solution: [
      R`Call the legs \(x\) and \(x + ${d}\). Pythagorean theorem: \(x^2 + (x + ${d})^2 = ${c}^2\).`,
      R`Expand: \(2x^2 + ${2 * d}x + ${d * d} = ${c * c}\), so \(2x^2 + ${2 * d}x - ${c * c - d * d} = 0\) and \(x^2 + ${d === 1 ? '' : d}x - ${(c * c - d * d) / 2} = 0\).`,
      R`Factor: \((x - ${a})(x + ${b}) = 0\). A length is positive, so \(x = ${a}\).`,
      R`The legs are \(${a}\) cm and \(${b}\) cm. Check: \(${a * a} + ${b * b} = ${c * c}\). ✓`,
    ],
    rule: 0,
    skill: 'multi-step right triangles',
    check: () => (a * a + (a + d) * (a + d) === c * c ? true : 'x does not satisfy the equation'),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'right-triangles',
  title: 'Right Triangles & the Pythagorean Theorem',
  summary: 'Find sides of right triangles, test whether a triangle is right, and use the 45-45-90 and 30-60-90 patterns.',
  standards: ['CCSS G-SRT.B.4', 'CCSS G-SRT.C.8', 'CCSS 8.G.B.7'],

  explain: {
    intro: R`In a right triangle the two sides that form the right angle are the **legs**, and the side opposite the right angle is the **hypotenuse**, the longest side. The Pythagorean theorem links the three lengths, so any two sides give you the third. It also works in reverse, as a test for right angles.`,
    rules: [
      {
        title: 'The Pythagorean theorem',
        text: R`If a right triangle has legs \(a\) and \(b\) and hypotenuse \(c\), then \(a^2 + b^2 = c^2\). To find the hypotenuse, add the squares of the legs and take the square root. To find a leg, subtract the square of the known leg from the square of the hypotenuse, then take the square root.`,
        example: R`Legs \(6\) and \(8\): \(c^2 = 36 + 64 = 100\), so \(c = 10\). Hypotenuse \(13\) and leg \(5\): \(a^2 = 169 - 25 = 144\), so \(a = 12\).`,
      },
      {
        title: 'Simplest radical form',
        text: R`When the number under the square root is not a perfect square, leave the answer as a radical and take out any perfect-square factor: \(\sqrt{p^2 \cdot r} = p\sqrt{r}\).`,
        example: R`\(\sqrt{72} = \sqrt{36 \cdot 2} = 6\sqrt{2}\).`,
      },
      {
        title: 'The converse: is it a right triangle?',
        text: R`Let \(c\) be the longest side. If \(c^2 = a^2 + b^2\), the triangle is right. If \(c^2 < a^2 + b^2\), it is acute. If \(c^2 > a^2 + b^2\), it is obtuse. (First make sure \(a + b > c\), or there is no triangle at all.)`,
        example: R`Sides \(7, 9, 12\): \(12^2 = 144\) and \(7^2 + 9^2 = 130\). Since \(144 > 130\), the triangle is obtuse.`,
      },
      {
        title: 'Pythagorean triples',
        text: R`Three whole numbers that satisfy \(a^2 + b^2 = c^2\) form a Pythagorean triple. The common ones are \(3\)-\(4\)-\(5\), \(5\)-\(12\)-\(13\), \(8\)-\(15\)-\(17\) and \(7\)-\(24\)-\(25\). Any multiple of a triple is also a triple.`,
        example: R`\(9\)-\(12\)-\(15\) is \(3\) times \(3\)-\(4\)-\(5\), so a right triangle with legs \(9\) and \(12\) has hypotenuse \(15\).`,
      },
      {
        title: R`The \(45^\circ\)-\(45^\circ\)-\(90^\circ\) triangle`,
        text: R`This is half of a square. The legs are equal, and the hypotenuse is \(\sqrt{2}\) times a leg: sides \(s\), \(s\), \(s\sqrt{2}\). To go from the hypotenuse to a leg, divide by \(\sqrt{2}\).`,
        example: R`Legs of \(5\): hypotenuse \(5\sqrt{2}\). Hypotenuse \(8\): each leg is \(\frac{8}{\sqrt{2}} = 4\sqrt{2}\).`,
      },
      {
        title: R`The \(30^\circ\)-\(60^\circ\)-\(90^\circ\) triangle`,
        text: R`This is half of an equilateral triangle. If the shorter leg (opposite \(30^\circ\)) is \(s\), the hypotenuse is \(2s\) and the longer leg (opposite \(60^\circ\)) is \(s\sqrt{3}\). Always find the shorter leg first.`,
        example: R`Hypotenuse \(10\): shorter leg \(5\), longer leg \(5\sqrt{3}\).`,
      },
      {
        title: 'Find the right triangle in the problem',
        text: R`Ladders against walls, diagonals of rectangles and trips made of two legs at right angles all hide a right triangle. Sketch it, decide which length is the hypotenuse (the one opposite the right angle), then apply the theorem.`,
        example: R`A \(13\)-ft ladder with its foot \(5\) ft from a wall reaches \(\sqrt{169 - 25} = 12\) ft up the wall.`,
      },
    ],
    vocab: [
      { term: 'hypotenuse', def: 'The side of a right triangle opposite the right angle. It is always the longest side.' },
      { term: 'legs', def: 'The two sides of a right triangle that form the right angle.' },
      { term: 'Pythagorean triple', def: R`Three whole numbers \(a\), \(b\), \(c\) with \(a^2 + b^2 = c^2\).` },
      { term: 'simplest radical form', def: 'A square root with no perfect-square factor left under the root sign and no root in a denominator.' },
    ],
    mistakes: [
      R`Adding the sides instead of their squares: \(3 + 4 = 7\), but the hypotenuse is \(5\).`,
      R`Adding the squares when the unknown side is a leg. If you know the hypotenuse, subtract.`,
      R`Stopping at \(c^2\). Remember the final square root.`,
      R`Mixing up the special triangles: \(\sqrt{2}\) goes with \(45^\circ\)-\(45^\circ\)-\(90^\circ\), while \(\sqrt{3}\) and \(2\) go with \(30^\circ\)-\(60^\circ\)-\(90^\circ\).`,
    ],
    visual: [
      { type: 'polygon', points: [[0, 0], [4, 0], [0, 4]], right: [0], sides: ['s', 's√2', 's'], angles: ['', '45°', '45°'], alt: 'A 45-45-90 triangle with legs s and hypotenuse s times the square root of 2.' },
      { type: 'polygon', points: [[0, 0], [5.196, 0], [0, 3]], right: [0], sides: ['s√3', '2s', 's'], angles: ['', '30°', '60°'], fill: 'b', alt: 'A 30-60-90 triangle with shorter leg s opposite the 30 degree angle, longer leg s times the square root of 3, and hypotenuse 2s.' },
    ],
  },

  examples: [
    {
      title: 'A hypotenuse in simplest radical form',
      problem: R`A right triangle has legs of \(6\) cm and \(9\) cm. Find the hypotenuse.`,
      steps: [
        R`\(c^2 = 6^2 + 9^2 = 36 + 81 = 117\).`,
        R`\(c = \sqrt{117}\). Look for a perfect-square factor: \(117 = 9 \cdot 13\).`,
        R`\(c = \sqrt{9 \cdot 13} = 3\sqrt{13}\) cm, which is about \(10.82\) cm.`,
      ],
      answer: R`\(3\sqrt{13}\) cm`,
      visual: rt(9, 6, ['9', 'c', '6'], 'A right triangle with legs 9 cm and 6 cm. The hypotenuse is marked c.'),
    },
    {
      title: 'Acute, right or obtuse?',
      problem: R`A triangle has sides \(8\), \(11\) and \(13\). Classify it by its angles.`,
      steps: [
        R`The longest side is \(c = 13\). (A triangle exists, because \(8 + 11 > 13\).)`,
        R`\(c^2 = 169\) and \(a^2 + b^2 = 64 + 121 = 185\).`,
        R`\(169 < 185\): the longest side is shorter than a hypotenuse would be, so the largest angle is less than \(90^\circ\).`,
      ],
      answer: 'The triangle is acute.',
    },
    {
      title: R`A 30-60-90 triangle`,
      problem: R`The hypotenuse of a \(30^\circ\)-\(60^\circ\)-\(90^\circ\) triangle is \(14\) cm. Find both legs.`,
      steps: [
        R`Find the shorter leg first. The hypotenuse is twice the shorter leg: \(2s = 14\), so \(s = 7\) cm.`,
        R`The longer leg is \(s\sqrt{3} = 7\sqrt{3}\) cm.`,
        R`Check: \(7^2 + (7\sqrt{3})^2 = 49 + 147 = 196 = 14^2\). ✓`,
      ],
      answer: R`\(7\) cm and \(7\sqrt{3}\) cm`,
      visual: { type: 'polygon', points: [[0, 0], [5.196, 0], [0, 3]], right: [0], sides: ['7√3', '14', '7'], angles: ['', '30°', '60°'], alt: 'A 30-60-90 triangle with hypotenuse 14 cm, shorter leg 7 cm opposite the 30 degree angle, and longer leg 7 times the square root of 3 cm.' },
    },
    {
      title: 'Word problem: how high does the ladder reach?',
      word: true,
      problem: R`A \(10\)-ft ladder leans against a wall. Its foot is \(4\) ft from the wall. How high up the wall does the ladder reach, to the nearest tenth of a foot?`,
      steps: [
        R`The wall meets the ground at a right angle. The ladder is opposite that angle, so it is the hypotenuse: \(c = 10\).`,
        R`The unknown height is a leg: \(h^2 + 4^2 = 10^2\), so \(h^2 = 100 - 16 = 84\).`,
        R`\(h = \sqrt{84} = 2\sqrt{21} \approx 9.165\), which rounds to \(9.2\) ft.`,
      ],
      answer: 'About 9.2 ft',
      visual: rt(4, Math.sqrt(84), ['4', '10', 'h'], 'A right triangle: the ground distance is 4 ft, the ladder (hypotenuse) is 10 ft, and the height on the wall is marked h.'),
    },
  ],

  models: [
    {
      id: 'missing-side',
      title: 'Find the third side',
      intro: 'Choose which side is missing and type the two sides you know.',
      inputs: [
        { name: 'find', label: 'Find', type: 'select', value: 'hyp', options: [{ value: 'hyp', label: 'the hypotenuse (from two legs)' }, { value: 'leg', label: 'a leg (from the hypotenuse and a leg)' }] },
        { name: 'p', label: 'A leg', type: 'int', min: 1, max: 60, value: 6 },
        { name: 'r', label: 'The other leg, or the hypotenuse', type: 'int', min: 1, max: 80, value: 9 },
      ],
      compute({ find, p, r }) {
        if (find === 'leg' && r <= p) return { error: 'The hypotenuse is the longest side of a right triangle. Make it longer than the leg.' };
        const n = find === 'hyp' ? p * p + r * r : r * r - p * p;
        const exact = sqrtTex(n);
        const simple = simplifySqrt(n);
        const shown = isSquare(n) ? `${Math.sqrt(n)}` : `${sqrtT(n)}`;
        return {
          problem: find === 'hyp' ? R`A right triangle has legs \(${p}\) and \(${r}\). Find the hypotenuse.` : R`A right triangle has hypotenuse \(${r}\) and one leg \(${p}\). Find the other leg.`,
          steps: [
            find === 'hyp' ? R`The unknown side is the hypotenuse, so add the squares of the legs: \(c^2 = ${p}^2 + ${r}^2 = ${p * p} + ${r * r} = ${n}\).` : R`The unknown side is a leg, so subtract: \(a^2 = ${r}^2 - ${p}^2 = ${r * r} - ${p * p} = ${n}\).`,
            isSquare(n) ? R`\(\sqrt{${n}} = ${Math.sqrt(n)}\), a whole number, so these three sides form a Pythagorean triple.` : simple.coef > 1 ? R`\(\sqrt{${n}} = \sqrt{${simple.coef * simple.coef} \cdot ${simple.rad}} = ${exact}\).` : R`\(${n}\) has no perfect-square factor, so \(\sqrt{${n}}\) is already in simplest radical form.`,
            ...(isSquare(n) ? [] : [R`As a decimal, \(${exact} \approx ${num(Math.sqrt(n), { places: 2 })}\).`]),
          ],
          answer: isSquare(n) ? R`\(${exact}\)` : R`\(${exact} \approx ${num(Math.sqrt(n), { places: 2 })}\)`,
          visual: find === 'hyp' ? rt(p, r, [`${p}`, shown, `${r}`], `A right triangle with legs ${p} and ${r} and hypotenuse ${shown}.`) : rt(p, Math.sqrt(n), [`${p}`, `${r}`, shown], `A right triangle with hypotenuse ${r} and legs ${p} and ${shown}.`),
        };
      },
    },
    {
      id: 'ladder',
      title: 'Word problem: a ladder against a wall',
      word: true,
      intro: 'Change the length of the ladder and how far its foot is from the wall.',
      inputs: [
        { name: 'L', label: 'Length of the ladder (ft)', type: 'number', min: 2, max: 40, step: 0.5, value: 13 },
        { name: 'd', label: 'Distance of its foot from the wall (ft)', type: 'number', min: 0.5, max: 30, step: 0.5, value: 5 },
      ],
      compute({ L, d }) {
        if (d >= L) return { error: 'The foot of the ladder cannot be as far from the wall as the ladder is long, or the ladder would lie flat. Make the distance smaller than the ladder.' };
        const n = L * L - d * d;
        const h = Math.sqrt(n);
        const whole = Number.isInteger(round(h, 6));
        return {
          problem: R`A ladder \(${num(L)}\) ft long leans against a wall with its foot \(${num(d)}\) ft from the wall. How high up the wall does it reach?`,
          steps: [
            R`The wall and the ground meet at a right angle. The ladder is opposite that angle, so it is the hypotenuse.`,
            R`The height \(h\) is a leg: \(h^2 + ${num(d)}^2 = ${num(L)}^2\), so \(h^2 = ${num(L * L)} - ${num(d * d)} = ${num(n)}\).`,
            whole ? R`\(h = \sqrt{${num(n)}} = ${num(round(h, 6))}\) ft.` : R`\(h = \sqrt{${num(n)}} \approx ${num(h, { places: 2 })}\) ft.`,
          ],
          answer: whole ? R`\(${num(round(h, 6))}\) ft` : R`About \(${num(h, { places: 2 })}\) ft`,
          visual: rt(d, h, [T(d), T(L), whole ? T(round(h, 6)) : `≈ ${T(h)}`], `A right triangle: ground distance ${T(d)} ft, ladder ${T(L)} ft, and height on the wall about ${T(h)} ft.`),
        };
      },
    },
  ],

  quiz: {
    easy: [easyHypotenuse, easyLeg, easyWhichRight],
    medium: [mediumRadical, mediumClassify, mediumStory],
    hard: [hardSpecial45, hardSpecial30, hardNearestTenth],
    challenge: [challengeIsoscelesArea, challengeBox, challengeLegs],
  },
};
