import { R, q, frac, Frac, person, people, money, num } from '../../lib/index.js';
import { M, N } from './_shared.js';

// ───────────── Units and facts ─────────────

const U = {
  in: ['inch', 'inches'], ft: ['foot', 'feet'], yd: ['yard', 'yards'], mi: ['mile', 'miles'],
  cm: ['centimeter', 'centimeters'], m: ['meter', 'meters'], km: ['kilometer', 'kilometers'],
  g: ['gram', 'grams'], kg: ['kilogram', 'kilograms'], oz: ['ounce', 'ounces'], lb: ['pound', 'pounds'],
  mL: ['milliliter', 'milliliters'], L: ['liter', 'liters'],
  cup: ['cup', 'cups'], pt: ['pint', 'pints'], qt: ['quart', 'quarts'], gal: ['gallon', 'gallons'],
  s: ['second', 'seconds'], min: ['minute', 'minutes'], h: ['hour', 'hours'], day: ['day', 'days'],
};
// The unit word for an amount: "1 foot", "3/4 foot", "2 feet", "2.5 meters".
const word = (u, v = 2) => {
  const x = v instanceof Frac ? v.value : v;
  return x === 1 || (v instanceof Frac && x < 1) ? U[u][0] : U[u][1];
};
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const amt = (v, u) => `${M(v)} ${word(u, v)}`;
const famt = (f, u) => (f.d === 1 ? amt(f.n, u) : R`\(${f.mixedTex()}\) ${word(u, f)}`);
const an = (u) => (/^[aeiou]/.test(U[u][0]) || u === 'h' ? `an ${U[u][0]}` : `a ${U[u][0]}`);

// One big unit = f small units. `known` facts are taught in rule 3; the others are stated in each question.
const FACTS = [
  { big: 'ft', small: 'in', f: 12, known: true },
  { big: 'yd', small: 'ft', f: 3, known: true },
  { big: 'm', small: 'cm', f: 100, known: true },
  { big: 'km', small: 'm', f: 1000, known: true },
  { big: 'kg', small: 'g', f: 1000, known: true },
  { big: 'L', small: 'mL', f: 1000, known: true },
  { big: 'lb', small: 'oz', f: 16, known: true },
  { big: 'min', small: 's', f: 60, known: true },
  { big: 'h', small: 'min', f: 60, known: true },
  { big: 'day', small: 'h', f: 24, known: false },
  { big: 'gal', small: 'qt', f: 4, known: false },
  { big: 'qt', small: 'pt', f: 2, known: false },
  { big: 'pt', small: 'cup', f: 2, known: false },
  { big: 'qt', small: 'cup', f: 4, known: false },
  { big: 'yd', small: 'in', f: 36, known: false },
];
const factText = (F) => `1 ${U[F.big][0]} = ${F.f.toLocaleString('en-US')} ${U[F.small][1]}`;
const factMath = (F) => R`1 ${U[F.big][0]} is \(${N(F.f)}\) ${U[F.small][1]}.`;
const stated = (F) => (F.known ? '' : ` (${factText(F)}.)`);

// A ruler is drawn as a number line from 0 to 12; the object is a thick segment along it.
const ruler = (from, to, u, obj) => ({
  type: 'numberLine',
  min: 0,
  max: 12,
  step: 1,
  segment: { from, to },
  alt: `A ruler marked in ${U[u][1]} from 0 to 12. The ${obj} lies along it. It starts at ${from} and ends at ${to}.`,
});
// Things to measure, with a sensible length range in inches. Centimeter ranges are worked out from it.
const OBJECTS = [['crayon', 3, 4], ['pencil', 4, 7], ['eraser', 2, 3], ['toy car', 2, 4], ['ribbon', 3, 11], ['leaf', 2, 5], ['key', 2, 3], ['spoon', 5, 7], ['feather', 3, 8], ['paintbrush', 6, 9], ['twig', 3, 10], ['piece of yarn', 4, 11]];
/** A length in whole units that suits the object and fits on the 12-unit ruler (at most `most`). */
function lengthRange([, lo, hi], u, most) {
  const a = u === 'cm' ? Math.ceil(lo * 2.5) : lo;
  const b = Math.min(most, u === 'cm' ? Math.floor(hi * 2.5) : hi);
  return a <= b ? [a, b] : null;
}
function pickObject(rng, u, most) {
  const fits = OBJECTS.filter((o) => lengthRange(o, u, most));
  const o = rng.pick(fits);
  const [a, b] = lengthRange(o, u, most);
  return [o[0], rng.int(a, b), o];
}

// ───────────── Easy: rulers, sensible units, comparing ─────────────

function easyRuler(rng) {
  const u = rng.pick(['in', 'cm']);
  const [obj, L] = pickObject(rng, u, 11);
  const pic = ruler(0, L, u, obj);
  return q({
    prompt: `The ${obj} lies along a ruler marked in ${U[u][1]}. How long is the ${obj}?`,
    visual: pic,
    correct: L,
    fmt: (v) => `${M(v)} ${word(u, v)}`,
    wrong: [{ value: L + 1, why: 'That counts the marks. Count the spaces, or read the number at the end.' }, { value: 12, why: 'That is the end of the ruler. Read where the object ends.' }, L - 1, L + 2],
    solution: [`The ${obj} starts at 0.`, `It ends at ${L}.`, `So it is ${L} ${U[u][1]} long.`],
    rule: 0,
    skill: 'measuring with a ruler',
    check: () => {
      let spaces = 0;
      for (let x = pic.segment.from; x < pic.segment.to; x++) spaces += 1;
      return spaces === L ? true : 'spaces do not match';
    },
  });
}

// What a unit is good for, with real-life examples.
const CUSTOMARY = [
  ['a pencil', 'in'], ['a crayon', 'in'], ['a book', 'in'], ['a spoon', 'in'], ['a shoe', 'in'], ['a leaf', 'in'],
  ['a door', 'ft'], ['a bed', 'ft'], ['a grown-up person', 'ft'], ['a couch', 'ft'],
  ['a football field', 'yd'], ['a long hallway', 'yd'],
  ['the road to the next town', 'mi'], ['a long bike trip', 'mi'],
];
const METRIC = [
  ['a pencil', 15, 'cm'], ['a crayon', 9, 'cm'], ['a book', 25, 'cm'], ['a paper clip', 3, 'cm'], ['a cell phone', 14, 'cm'], ['a shoe', 20, 'cm'],
  ['a door', 2, 'm'], ['a school bus', 12, 'm'], ['a swimming pool', 25, 'm'], ['a bed', 2, 'm'], ['a car', 4, 'm'], ['a classroom', 9, 'm'],
  ['a walk to school', 2, 'km'], ['a drive to the next town', 20, 'km'], ['a long bike ride', 15, 'km'],
];

function easyUnits(rng) {
  if (rng.bool()) {
    const [thing, u] = rng.pick(CUSTOMARY);
    const choices = ['in', 'ft', 'yd', 'mi'];
    return q({
      prompt: `Which unit is best for measuring the length of ${thing}?`,
      correct: U[u][1],
      wrong: choices.filter((c) => c !== u).map((c) => U[c][1]),
      solution: ['Inches are for small things. Feet and yards are for bigger things.', 'Miles are for long trips.', `${cap(thing)} is best measured in ${U[u][1]}.`],
      rule: 1,
      skill: 'choosing a unit',
      check: () => (choices.includes(u) ? true : 'unit missing'),
    });
  }
  const [thing, v, u] = rng.pick(METRIC);
  const ORDER = ['cm', 'm', 'km'];
  const others = ORDER.filter((c) => c !== u);
  return q({
    prompt: `About how long is ${thing}?`,
    correct: `${v} ${U[u][1]}`,
    wrong: [...others.map((c) => ({ value: `${v} ${U[c][1]}`, why: `That is far too ${ORDER.indexOf(c) > ORDER.indexOf(u) ? 'long' : 'short'} for ${thing}.` })), `${v * 10} ${U[u === 'cm' ? 'm' : u === 'm' ? 'cm' : 'm'][1]}`],
    solution: ['A centimeter is about the width of a fingertip.', 'A meter is about one big step. A kilometer is a long walk.', `${cap(thing)} is about ${v} ${U[u][1]}.`],
    rule: 1,
    skill: 'estimating length',
    check: () => (['cm', 'm', 'km'].includes(u) ? true : 'unit missing'),
  });
}

function easyCompare(rng) {
  const u = rng.pick(['in', 'cm']);
  let o1, o2, a, b;
  do [[o1, a], [o2, b]] = [pickObject(rng, u, 12), pickObject(rng, u, 12)];
  while (o1 === o2 || a <= b);
  const pics = [ruler(0, a, u, o1), ruler(0, b, u, o2)];
  return q({
    prompt: `The ${o1} is on the first ruler. The ${o2} is on the second. How much longer is the ${o1} than the ${o2}?`,
    visual: pics,
    correct: a - b,
    fmt: (v) => `${M(v)} ${word(u, v)}`,
    wrong: [{ value: a + b, why: 'Adding puts the two lengths together. To compare, subtract.' }, { value: a, why: `That is the ${o1} alone. Take away the length of the ${o2}.` }, b, a - b + 1],
    solution: [`The ${o1} is ${a} ${U[u][1]} long.`, `The ${o2} is ${b} ${U[u][1]} long.`, R`Compare by subtracting: \(${a} - ${b} = ${a - b}\).`],
    rule: 2,
    skill: 'comparing lengths',
    check: () => (pics[1].segment.to + (a - b) === pics[0].segment.to ? true : 'lengths do not match'),
  });
}

// ───────────── Medium ─────────────

function mediumRulerOffset(rng) {
  const u = rng.pick(['in', 'cm']);
  const [obj, len] = pickObject(rng, u, 9);
  const s = rng.int(1, 12 - len);
  const e = s + len;
  const pic = ruler(s, e, u, obj);
  return q({
    prompt: `The ${obj} does not start at 0. How long is it?`,
    visual: pic,
    correct: e - s,
    fmt: (v) => `${M(v)} ${word(u, v)}`,
    wrong: [{ value: e, why: `The ${obj} starts at ${s}, not 0. Subtract the start from the end.` }, { value: e - s + 1, why: 'That counts the marks. Count the spaces between them.' }, { value: e + s, why: 'Find the distance from start to end. Subtract, do not add.' }, e - s - 1],
    solution: [`The ${obj} starts at ${s} and ends at ${e}.`, R`Length is end minus start: \(${e} - ${s} = ${e - s}\).`, `It is ${e - s} ${U[u][1]} long.`],
    rule: 0,
    skill: 'measuring with a ruler',
    check: () => {
      let spaces = 0;
      for (let x = pic.segment.from; x < pic.segment.to; x++) spaces += 1;
      return spaces === e - s ? true : 'spaces do not match';
    },
  });
}

function mediumLengthStory(rng) {
  const [p1, p2] = people(rng, 2);
  const kind = rng.pick(['cut', 'join', 'compare', 'taller', 'piece']);
  const u = rng.pick(kind === 'cut' ? ['in', 'cm', 'ft', 'm'] : kind === 'join' || kind === 'piece' ? ['in', 'cm', 'ft'] : ['in', 'cm']);
  const w = U[u][1];
  if (kind === 'cut' || kind === 'piece') {
    const A = rng.int(40, 99);
    const B = rng.int(11, A - 11);
    const C = A - B;
    const cut = kind === 'cut';
    return q({
      prompt: cut ? `A rope is ${A} ${w} long. ${p1} cuts off ${B} ${w}. How long is the rope now?` : `A ribbon was ${A} ${w} long. ${p1} cut a piece off. Now the ribbon is ${C} ${w} long. How long was the piece?`,
      visual: { type: 'barModel', rows: [{ parts: [{ value: C, label: cut ? '?' : `${C}`, shade: cut ? 'none' : undefined }, { value: B, label: cut ? `${B}` : '?', shade: cut ? undefined : 'none' }], total: `${A} ${w}` }], alt: cut ? `A bar for the whole rope, ${A} ${w}. One part is ${B} ${w}. The other part is a question mark.` : `A bar for the whole ribbon, ${A} ${w}. One part is ${C} ${w}. The other part is a question mark.` },
      correct: cut ? C : B,
      unit: w,
      wrong: [{ value: A + (cut ? B : C), why: 'A part was taken away. The whole is known, so subtract.' }, (cut ? C : B) + 10, (cut ? C : B) - 10, (cut ? C : B) + 1],
      solution: [`The whole is ${A} ${w}. One part is ${cut ? B : C} ${w}.`, R`Find the other part: \(${A} - ${cut ? B : C} = ${cut ? C : B}\).`, `The answer is ${cut ? C : B} ${w}.`],
      rule: 2,
      skill: 'length word problems',
      check: () => (B + C === A ? true : 'parts do not make the whole'),
    });
  }
  if (kind === 'join') {
    const A = rng.int(12, 60);
    const B = rng.int(11, 99 - A);
    const what = rng.pick(['paper chain', 'train of blocks', 'line of string']);
    return q({
      prompt: `${p1}'s ${what} is ${A} ${w} long. ${p2} adds ${B} ${w} more to it. How long is it now?`,
      visual: { type: 'barModel', rows: [{ parts: [{ value: A, label: `${A}` }, { value: B, label: `${B}` }], total: `? ${w}` }], alt: `A bar with two parts, ${A} ${w} and ${B} ${w}. The total is a question mark.` },
      correct: A + B,
      unit: w,
      wrong: [{ value: Math.abs(A - B), why: 'The two lengths are put together, so add.' }, A + B + 10, A + B - 10, A + B + 1],
      solution: ['Two lengths are put together.', R`Add: \(${A} + ${B} = ${A + B}\).`, `It is ${A + B} ${w} long.`],
      rule: 2,
      skill: 'length word problems',
      check: () => (A + B - B === A ? true : 'sum does not undo'),
    });
  }
  if (kind === 'compare') {
    const [a, b] = rng.sample(Array.from({ length: 80 }, (_, i) => i + 15), 2).sort((x, y) => y - x);
    return q({
      prompt: `${p1} jumps ${a} ${w}. ${p2} jumps ${b} ${w}. How much farther does ${p1} jump?`,
      visual: { type: 'barModel', rows: [{ label: p1, parts: [{ value: a, label: `${a}` }] }, { label: p2, parts: [{ value: b, label: `${b}` }, { value: a - b, label: '?', shade: 'none' }] }], alt: `Two bars. ${p1}'s bar shows ${a} ${w}. ${p2}'s bar shows ${b} ${w} and a gap marked with a question mark.` },
      correct: a - b,
      unit: w,
      wrong: [{ value: a + b, why: 'This compares two jumps. Subtract to find the difference.' }, { value: a, why: `That is ${p1}'s whole jump. Subtract ${p2}'s jump.` }, a - b + 10, a - b + 1],
      solution: ['Two lengths are compared.', R`Subtract: \(${a} - ${b} = ${a - b}\).`, `${p1} jumps ${a - b} ${w} farther.`],
      rule: 2,
      skill: 'length word problems',
      check: () => (b + (a - b) === a ? true : 'difference does not add back'),
    });
  }
  const A = rng.int(20, 70);
  const B = rng.int(5, 99 - A);
  return q({
    prompt: `${p1}'s block tower is ${A} ${w} tall. ${p2}'s tower is ${B} ${w} taller. How tall is ${p2}'s tower?`,
    visual: { type: 'barModel', rows: [{ label: p1, parts: [{ value: A, label: `${A}` }] }, { label: p2, parts: [{ value: A, label: `${A}` }, { value: B, label: `${B}` }], total: '?' }], alt: `Two bars. ${p1}'s bar shows ${A} ${w}. ${p2}'s bar is the same plus ${B} ${w} more.` },
    correct: A + B,
    unit: w,
    wrong: [{ value: A - B, why: `${p2}'s tower is taller, so its height is more than ${A}. Add.` }, { value: B, why: `${B} ${w} is only the extra part. Add it to ${A}.` }, A + B + 10, A + B - 1],
    solution: [`${p2}'s tower is ${p1}'s height plus ${B} more.`, R`\(${A} + ${B} = ${A + B}\).`, `${p2}'s tower is ${A + B} ${w} tall.`],
    rule: 2,
    skill: 'length word problems',
    check: () => (A + B - A === B ? true : 'heights do not match'),
  });
}

function convTable(F, rows, blank) {
  return {
    type: 'table',
    headers: [cap(U[F.big][1]), cap(U[F.small][1])],
    rows: rows.map((n, i) => [`${n}`, i === blank ? '?' : N(n * F.f).replace('{,}', ',')]),
    alt: `A table that changes ${U[F.big][1]} to ${U[F.small][1]}. ${rows.map((n, i) => `${n} ${word(F.big, n)}: ${i === blank ? 'a question mark' : `${(n * F.f).toLocaleString('en-US')} ${U[F.small][1]}`}.`).join(' ')}`,
  };
}

function mediumConvertTable(rng) {
  const F = rng.pick(FACTS);
  const start = rng.int(1, 3);
  const rows = [start, start + 1, start + 2, start + 3, start + 4];
  const blank = rng.int(1, 4);
  const n = rows[blank];
  const ans = n * F.f;
  const pic = convTable(F, rows, blank);
  return q({
    prompt: `The table changes ${U[F.big][1]} to ${U[F.small][1]}.${stated(F)} What number goes where the question mark is?`,
    visual: pic,
    correct: ans,
    fmt: (v) => `${M(v)} ${U[F.small][1]}`,
    wrong: [{ value: n + F.f, why: `Each ${U[F.big][0]} is ${N(F.f).replace('{,}', ',')} ${U[F.small][1]}. Multiply, do not add.` }, { value: (n - 1) * F.f, why: 'That is the row above. Use the number in this row.' }, (n + 1) * F.f, F.f === 10 ? null : n * 10, ans + 1],
    solution: [factMath(F), R`Multiply: \(${n} \times ${N(F.f)} = ${N(ans)}\).`, `${n} ${word(F.big, n)} is ${amt(ans, F.small)}.`],
    rule: 4,
    skill: 'conversion tables',
    check: () => {
      let s = 0;
      for (let k = 0; k < n; k++) s += F.f;
      return s === ans ? true : 'repeated addition differs';
    },
  });
}

// ───────────── Hard ─────────────

function hardConvert(rng) {
  const F = rng.pick(FACTS.filter((x) => x.f >= 3));
  const n = rng.int(2, 9);
  const mixed = rng.bool(0.6);
  const m = mixed ? rng.int(1, F.f - 1) : 0;
  const ans = n * F.f + m;
  const glued = Number(`${n}${m}`);
  const what = mixed ? `${n} ${word(F.big, n)} ${m} ${word(F.small, m)}` : `${n} ${U[F.big][1]}`;
  return q({
    prompt: `How many ${U[F.small][1]} are in ${what}?${stated(F)}`,
    correct: ans,
    fmt: (v) => `${M(v)} ${U[F.small][1]}`,
    wrong: [
      mixed && glued !== ans ? { value: glued, why: `The numbers cannot just be written side by side. ${cap(factText(F))}.` } : null,
      mixed ? { value: n * F.f, why: `That changes the ${U[F.big][1]} but leaves out the ${m} ${word(F.small, m)}. Add them.` } : { value: n + F.f, why: 'Each big unit is many small units. Multiply, do not add.' },
      F.f === 1000 ? n * 100 + m : F.f === 100 ? n * 10 + m : n * 10 + m,
      ans + F.f,
      ans - F.f,
      mixed ? null : n * F.f * 10,
    ],
    solution: [factMath(F), R`${cap(U[F.big][1])} to ${U[F.small][1]}: \(${n} \times ${N(F.f)} = ${N(n * F.f)}\).`, ...(mixed ? [R`Add the ${word(F.small, m)}: \(${N(n * F.f)} + ${m} = ${N(ans)}\).`] : []), `${cap(what)} is ${amt(ans, F.small)}.`],
    rule: 4,
    skill: mixed ? 'mixed units' : 'bigger to smaller units',
    check: () => (Math.floor(ans / F.f) === n && ans % F.f === m ? true : 'does not convert back'),
  });
}

function hardStory(rng) {
  const name = person(rng);
  const kind = rng.pick(['pour', 'practice', 'rope', 'walk', 'melon']);
  if (kind === 'pour') {
    const A = rng.int(2, 5);
    const B = rng.int(2, 18) * 50;
    const ans = A * 1000 - B;
    return q({
      prompt: `A jug holds ${A} liters of juice. ${name} pours out ${N(B)} milliliters. How many milliliters are left?`,
      visual: { type: 'barModel', rows: [{ parts: [{ value: B, label: `${N(B)} mL` }, { value: ans, label: '?', shade: 'none' }], total: `${A} L = ${(A * 1000).toLocaleString('en-US')} mL` }], alt: `A bar for ${A} liters, which is ${(A * 1000).toLocaleString('en-US')} milliliters. One part is ${B} milliliters poured out. The rest is a question mark.` },
      correct: ans,
      fmt: (v) => `${M(v)} mL`,
      wrong: [{ value: A * 100 - B > 0 ? A * 100 - B : A * 1000 + B, why: '1 liter is 1,000 milliliters, not 100.' }, { value: A * 1000 + B, why: 'Juice was poured out, so subtract.' }, ans + 100, ans - 100],
      solution: [R`Change liters to milliliters: \(${A} \times 1{,}000 = ${N(A * 1000)}\) mL.`, R`Subtract what was poured out: \(${N(A * 1000)} - ${N(B)} = ${N(ans)}\).`, `${amt(ans, 'mL')} are left.`],
      rule: 4,
      skill: 'volume word problems',
      check: () => (ans + B === A * 1000 ? true : 'parts do not make the whole'),
    });
  }
  if (kind === 'practice') {
    const [fr, mins] = rng.pick([[frac(1, 2), 30], [frac(1, 4), 15], [frac(3, 4), 45]]);
    const D = rng.int(2, 7);
    const act = rng.pick(['piano', 'soccer', 'reading', 'drawing']);
    const ans = D * mins;
    return q({
      prompt: R`${name} practices ${act} for \(${fr.tex()}\) hour each day. How many minutes is that in ${D} days?`,
      correct: ans,
      unit: 'minutes',
      wrong: [{ value: D * Math.round(fr.value * 100), why: 'An hour is 60 minutes, not 100.' }, { value: mins, why: `That is one day. Practice happens on ${D} days.` }, D * 60, ans + mins],
      solution: [R`\(${fr.tex()}\) of an hour: \(60 \div ${fr.d}${fr.n > 1 ? R` \times ${fr.n}` : ''} = ${mins}\) minutes.`, R`For ${D} days: \(${D} \times ${mins} = ${ans}\).`, `That is ${ans} minutes.`],
      rule: 4,
      skill: 'time word problems',
      check: () => (frac(ans, 60).eq(fr.mul(frac(D, 1))) ? true : 'hours do not match'),
    });
  }
  if (kind === 'rope') {
    const P = rng.pick([0.25, 0.5, 0.75, 1.25, 1.5, 2]);
    const Y = rng.int(2, 6);
    const ans = P * 3 * Y;
    return q({
      prompt: `Rope costs ${money(P)} for each foot. ${name} buys ${Y} yards of rope. How much does it cost? (Remember: 1 yard is 3 feet.)`,
      correct: money(ans),
      wrong: [{ value: money(P * Y), why: 'The price is for each foot. Change yards to feet first.' }, { value: money(P * 12 * Y), why: 'A yard is 3 feet. 12 is the number of inches in a foot.' }, money(ans + P), money(P * (3 + Y))],
      solution: [R`Change yards to feet: \(${Y} \times 3 = ${3 * Y}\) feet.`, R`Each foot costs ${money(P)}: \(${3 * Y} \times ${num(P, { fixed: 2 })} = ${num(ans, { fixed: 2 })}\).`, `The rope costs ${money(ans)}.`],
      rule: 4,
      skill: 'money word problems',
      check: () => (Math.abs(ans / (3 * Y) - P) < 1e-9 ? true : 'price does not match'),
    });
  }
  if (kind === 'walk') {
    const fr = rng.pick([frac(1, 2), frac(1, 4), frac(3, 4), frac(2, 3), frac(3, 8)]);
    const D = rng.int(2, 5);
    const ans = fr.mul(frac(2 * D, 1));
    return q({
      prompt: R`${name} walks \(${fr.tex()}\) mile to school. ${name} walks the same way home. How far does ${name} walk in ${D} school days?`,
      correct: ans,
      fmt: (v) => famt(v, 'mi'),
      wrong: [{ value: fr.mul(frac(D, 1)), why: 'Each day has two walks: to school and back home.' }, { value: fr.add(frac(2 * D, 1)), why: 'That adds the number of walks. Multiply the distance by the number of walks.' }, ans.add(fr), ans.sub(fr)],
      solution: [`Each day has 2 walks, so there are ${2 * D} walks.`, R`\(${2 * D} \times ${fr.tex()} = \frac{${2 * D * fr.n}}{${fr.d}} = ${ans.mixedTex()}\).`, `${name} walks ${famt(ans, 'mi')}.`],
      rule: 4,
      skill: 'distance word problems',
      check: () => (Math.abs(ans.value - 2 * D * fr.value) < 1e-9 ? true : 'distance differs'),
    });
  }
  const g = rng.pick([100, 125, 200, 250, 500]);
  const kg = rng.int(1, 3);
  const ans = (kg * 1000) / g;
  return q({
    prompt: `A melon weighs ${kg} ${word('kg', kg)}. One apple weighs ${g} grams. How many apples weigh the same as the melon?`,
    correct: ans,
    fmt: (v) => `${M(v)} apples`,
    wrong: [{ value: (kg * 100) / g >= 1 && Number.isInteger((kg * 100) / g) ? (kg * 100) / g : ans * 10, why: '1 kilogram is 1,000 grams.' }, { value: kg * 1000, why: `That is the melon in grams. Now share it into apples of ${g} grams.` }, ans + 1, ans - 1, ans * 2],
    solution: [R`Change to grams: \(${kg} \times 1{,}000 = ${N(kg * 1000)}\) grams.`, R`How many ${g}s make \(${N(kg * 1000)}\)? \(${N(kg * 1000)} \div ${g} = ${ans}\).`, `${ans} apples weigh the same as the melon.`],
    rule: 5,
    skill: 'mass word problems',
    check: () => (ans * g === kg * 1000 ? true : 'apples do not balance the melon'),
  });
}

const PAIRS = [
  { F: FACTS[0], text: (p1, p2, a, b) => `${p1}'s ribbon is ${a} ${word('ft', a)} long. ${p2}'s ribbon is ${b} inches long. Whose ribbon is longer, and by how many inches?`, who: ['longer', 'inches'] },
  { F: FACTS[2], text: (p1, p2, a, b) => `${p1} jumps ${a} ${word('m', a)}. ${p2} jumps ${b} centimeters. Who jumps farther, and by how many centimeters?`, who: ['farther', 'centimeters'] },
  { F: FACTS[4], text: (p1, p2, a, b) => `${p1}'s bag of flour weighs ${a} ${word('kg', a)}. ${p2}'s bag of rice weighs ${N(b).replace('{,}', ',')} grams. Whose bag is heavier, and by how many grams?`, who: ['heavier', 'grams'] },
  { F: FACTS[8], text: (p1, p2, a, b) => `${p1} reads for ${a} ${word('h', a)}. ${p2} reads for ${b} minutes. Who reads longer, and by how many minutes?`, who: ['longer', 'minutes'] },
  { F: FACTS[6], text: (p1, p2, a, b) => `${p1}'s puppy weighs ${a} ${word('lb', a)}. ${p2}'s kitten weighs ${b} ounces. Which pet is heavier, and by how many ounces?`, who: ['heavier', 'ounces'] },
];

function hardCompareUnits(rng) {
  const P = rng.pick(PAIRS);
  const F = P.F;
  const [p1, p2] = people(rng, 2);
  const a = rng.int(1, F.f >= 100 ? 5 : 4);
  const big = a * F.f;
  // b is in the small unit, a bit more or less than a whole number of big units
  const step = F.f >= 1000 ? 50 : F.f === 100 ? 5 : 1;
  let b;
  do b = big + rng.int(-Math.floor((F.f * 0.8) / step), Math.floor((F.f * 0.8) / step)) * step;
  while (b === big || b <= 0);
  const firstWins = big > b;
  const d = Math.abs(big - b);
  const pet = P.F === FACTS[6];
  const side1 = pet ? `${p1}'s puppy` : p1;
  const side2 = pet ? `${p2}'s kitten` : p2;
  const winner = firstWins ? side1 : side2;
  const loser = firstWins ? side2 : side1;
  const slipWinner = b > a ? side2 : side1;
  const show = (v) => `${M(v)} ${P.who[1]}`;
  return q({
    prompt: P.text(p1, p2, a, b),
    correct: `${winner}, by ${show(d)}`,
    wrong: [
      { value: `${slipWinner}, by ${show(Math.abs(b - a))}`, why: `Change ${a} ${word(F.big, a)} to ${P.who[1]} before you compare.` },
      `${loser}, by ${show(d)}`,
      `${winner}, by ${show(big + b)}`,
      `${winner}, by ${show(d + step * 2)}`,
    ],
    solution: [factMath(F), R`Change ${p1}'s amount: \(${a} \times ${N(F.f)} = ${N(big)}\) ${P.who[1]}.`, R`Compare: \(${N(Math.max(big, b))} - ${N(Math.min(big, b))} = ${N(d)}\).`, `${cap(P.who[0])}: ${winner}, by ${show(d)}.`],
    rule: 4,
    skill: 'comparing in one unit',
    check: () => (big - b === (firstWins ? d : -d) ? true : 'comparison differs'),
  });
}

// ───────────── Challenge ─────────────

function challengeToBigger(rng) {
  if (rng.bool()) {
    // Metric: the answer is a decimal.
    const F = rng.pick([FACTS[2], FACTS[3], FACTS[4], FACTS[5]]);
    const whole = rng.int(1, 6);
    const part = F.f === 100 ? rng.pick([10, 20, 25, 50, 75, 5]) : rng.pick([100, 250, 500, 750, 300, 50]);
    const small = whole * F.f + part;
    const ans = small / F.f;
    return q({
      prompt: `Write ${amt(small, F.small)} in ${U[F.big][1]}.`,
      correct: ans,
      fmt: (v) => `${M(v)} ${U[F.big][1]}`,
      wrong: [{ value: small * F.f, why: `Going to a bigger unit gives a smaller number. Divide by ${N(F.f).replace('{,}', ',')}.` }, { value: small / (F.f / 10), why: `${cap(factText(F))}. Divide by ${N(F.f).replace('{,}', ',')}.` }, { value: whole + part / 1000 === ans ? whole + part / 10000 : whole + part / 1000, why: `Each ${U[F.small][0]} is ${F.f === 100 ? 'one hundredth' : 'one thousandth'} of ${an(F.big)}. Check the place value.` }, whole],
      solution: [factMath(F), R`Bigger unit, so divide: \(${N(small)} \div ${N(F.f)} = ${num(ans)}\).`, `${amt(small, F.small)} is ${amt(ans, F.big)}.`],
      rule: 5,
      skill: 'smaller to bigger units',
      check: () => (Math.abs(ans * F.f - small) < 1e-9 ? true : 'does not convert back'),
    });
  }
  const F = rng.pick([FACTS[0], FACTS[1], FACTS[6], FACTS[7], FACTS[8], FACTS[10]]);
  const parts = F.f % 4 === 0 ? [1, 2, 3].map((k) => (k * F.f) / 4) : F.f === 3 ? [1, 2] : [F.f / 2];
  const whole = rng.int(1, 5);
  const r = rng.pick(parts);
  const small = whole * F.f + r;
  const ans = frac(small, F.f);
  const asTenths = frac(whole * 10 + r, 10);
  return q({
    prompt: `Write ${amt(small, F.small)} in ${U[F.big][1]}.${stated(F)} Use a mixed number.`,
    correct: ans,
    fmt: (v) => famt(v, F.big),
    wrong: [r < 10 && !asTenths.eq(ans) ? { value: asTenths, why: `${r} left over means ${r} out of ${F.f}, not ${r} tenths.` } : null, { value: frac(whole, 1), why: `${r} ${word(F.small, r)} ${r === 1 ? 'is' : 'are'} left over. Write ${r === 1 ? 'it' : 'them'} as a fraction of ${an(F.big)}.` }, { value: frac(small * F.f, 1), why: 'Going to a bigger unit gives a smaller number. Divide.' }, ans.add(frac(1, 2)), ans.sub(frac(1, 4))],
    solution: [factText(F) + '.', R`\(${small} \div ${F.f} = ${whole}\) with ${r} left over.`, R`The ${r} left over is \(\frac{${r}}{${F.f}}${frac(r, F.f).d !== F.f ? ` = ${frac(r, F.f).tex()}` : ''}\) of ${an(F.big)}.`, `So ${amt(small, F.small)} is ${famt(ans, F.big)}.`],
    rule: 5,
    skill: 'smaller to bigger units',
    check: () => (ans.mul(frac(F.f, 1)).eq(frac(small, 1)) ? true : 'does not convert back'),
  });
}

function challengeMultiStep(rng) {
  const name = person(rng);
  const kind = rng.pick(['cut', 'batch', 'pour', 'laps']);
  if (kind === 'cut') {
    const P = rng.pick([10, 20, 25, 50]);
    const A = rng.int(1, 5);
    const ans = (A * 100) / P;
    return q({
      prompt: `A ribbon is ${A} ${word('m', A)} long. ${name} cuts it into pieces that are each ${P} centimeters long. How many pieces does ${name} get?`,
      correct: ans,
      fmt: (v) => `${M(v)} pieces`,
      wrong: [{ value: (A * 1000) / P, why: '1 meter is 100 centimeters, not 1,000.' }, { value: A * 100, why: `That is the ribbon in centimeters. Now see how many ${P}s fit in it.` }, ans + 1, ans - 1, ans * 2],
      solution: [R`Change meters to centimeters: \(${A} \times 100 = ${A * 100}\).`, R`How many ${P}s make ${A * 100}? \(${A * 100} \div ${P} = ${ans}\).`, `${name} gets ${ans} pieces.`],
      rule: 5,
      skill: 'multi-step conversions',
      check: () => (ans * P === A * 100 ? true : 'pieces do not make the ribbon'),
    });
  }
  if (kind === 'batch') {
    let C;
    let B;
    do {
      C = rng.int(2, 6);
      B = rng.int(2, 6);
    } while ((C * B) % 4);
    const cups = C * B;
    return q({
      prompt: `A batch of pancakes uses ${C} cups of milk. ${name} makes ${B} batches. How many quarts of milk is that? (1 quart = 4 cups.)`,
      correct: cups / 4,
      fmt: (v) => `${M(v)} ${word('qt', v)}`,
      wrong: [{ value: cups, why: 'That is the milk in cups. Change cups to quarts: divide by 4.' }, { value: cups * 4, why: 'A quart is bigger than a cup, so there are fewer quarts. Divide.' }, { value: cups / 2, why: 'That divides by 2. There are 4 cups in a quart.' }, cups / 4 + 1],
      solution: [R`Milk in cups: \(${C} \times ${B} = ${cups}\) cups.`, R`4 cups make 1 quart: \(${cups} \div 4 = ${cups / 4}\).`, `That is ${cups / 4} ${word('qt', cups / 4)}.`],
      rule: 5,
      skill: 'multi-step conversions',
      check: () => ((cups / 4) * 4 === C * B ? true : 'quarts do not match'),
    });
  }
  if (kind === 'pour') {
    const P = rng.pick([200, 250, 500]);
    const A = rng.int(1, 4);
    const ans = (A * 1000) / P;
    return q({
      prompt: `A jug holds ${A} ${word('L', A)} of water. ${name} fills cups that hold ${P} milliliters each. How many cups can ${name} fill?`,
      correct: ans,
      fmt: (v) => `${M(v)} cups`,
      wrong: [{ value: A * 1000, why: `That is the water in milliliters. See how many ${P}s fit in it.` }, { value: Number.isInteger((A * 100) / P) ? (A * 100) / P : ans * 10, why: '1 liter is 1,000 milliliters, not 100.' }, ans + 1, ans - 1, ans * 2],
      solution: [R`Change liters to milliliters: \(${A} \times 1{,}000 = ${N(A * 1000)}\).`, R`\(${N(A * 1000)} \div ${P} = ${ans}\).`, `${name} can fill ${ans} cups.`],
      rule: 5,
      skill: 'multi-step conversions',
      check: () => (ans * P === A * 1000 ? true : 'cups do not hold the jug'),
    });
  }
  const S = rng.pick([30, 40, 45, 75, 90]);
  let L;
  do L = rng.int(2, 12);
  while ((S * L) % 60);
  const secs = S * L;
  return q({
    prompt: `${name} runs one lap in ${S} seconds. How many minutes does it take to run ${L} laps?`,
    correct: secs / 60,
    fmt: (v) => `${M(v)} ${word('min', v)}`,
    wrong: [{ value: secs, why: 'That is the time in seconds. Divide by 60 to get minutes.' }, Number.isInteger(secs / 100) ? { value: secs / 100, why: 'A minute is 60 seconds, not 100.' } : null, secs / 60 + 1, secs / 60 + 2],
    solution: [R`Time in seconds: \(${S} \times ${L} = ${secs}\).`, R`60 seconds make 1 minute: \(${secs} \div 60 = ${secs / 60}\).`, `It takes ${secs / 60} ${word('min', secs / 60)}.`],
    rule: 5,
    skill: 'multi-step conversions',
    check: () => ((secs / 60) * 60 === S * L ? true : 'minutes do not match'),
  });
}

const MIXED = [
  { F: FACTS[0], add: (n, x, y) => `${n} has two boards. One is ${x}. The other is ${y}. Laid end to end, how long are they?`, sub: (n, x, y) => `A rope is ${x} long. ${n} cuts off ${y}. How long is the rope now?` },
  { F: FACTS[8], add: (n, x, y) => `${n} spends ${x} at the park and ${y} at the library. How long is that in all?`, sub: (n, x, y) => `A movie is ${x} long. ${n} has watched ${y}. How much of the movie is left?` },
  { F: FACTS[6], add: (n, x, y) => `${n}'s backpack weighs ${x}. A lunch box weighs ${y}. How much do they weigh together?`, sub: (n, x, y) => `A bag of flour weighs ${x}. ${n} uses ${y} of it. How much flour is left?` },
  { F: FACTS[10], add: (n, x, y) => `${n} pours ${x} of water into a tank. Then ${y} more. How much water is in the tank? (1 gallon = 4 quarts.)`, sub: (n, x, y) => `A tank holds ${x} of water. ${n} uses ${y}. How much is left? (1 gallon = 4 quarts.)` },
];
const both = (F, a, b) => [a ? `${a} ${word(F.big, a)}` : null, b || !a ? `${b} ${word(F.small, b)}` : null].filter(Boolean).join(' ');

function challengeMixed(rng) {
  const P = rng.pick(MIXED);
  const F = P.F;
  const name = person(rng);
  const add = rng.bool();
  let a1, b1, a2, b2;
  if (add) {
    [a1, a2] = [rng.int(1, 5), rng.int(1, 4)];
    b1 = rng.int(1, F.f - 1);
    b2 = rng.int(F.f - b1, F.f - 1); // the small units add to a whole big unit or more
    if (b2 < 1) b2 = 1;
  } else {
    a1 = rng.int(2, 6);
    a2 = rng.int(1, a1 - 1);
    b1 = rng.int(0, F.f - 2);
    b2 = rng.int(b1 + 1, F.f - 1); // too few small units: regroup
  }
  const t1 = a1 * F.f + b1;
  const t2 = a2 * F.f + b2;
  const res = add ? t1 + t2 : t1 - t2;
  const A = Math.floor(res / F.f);
  const B = res % F.f;
  const right = both(F, A, B);
  const wrong = add
    ? [
        { value: `${a1 + a2} ${word(F.big, a1 + a2)} ${b1 + b2} ${word(F.small, b1 + b2)}`, why: `That is the right amount, but ${b1 + b2} ${U[F.small][1]} is more than 1 ${U[F.big][0]}. Regroup ${F.f} ${U[F.small][1]} as 1 ${U[F.big][0]}.`, form: true },
        { value: both(F, a1 + a2, B), why: `The ${F.f} ${U[F.small][1]} you regrouped make 1 more ${U[F.big][0]}. Add it on.` },
        { value: both(F, A, (B + 2) % F.f || 1), why: null },
        both(F, A + 1, B),
      ]
    : [
        { value: both(F, a1 - a2, b2 - b1), why: `You cannot take ${b2} from ${b1}. Regroup 1 ${U[F.big][0]} as ${F.f} ${U[F.small][1]}.` },
        F.f === 60 ? { value: both(F, a1 - a2 - 1, b1 + 100 - b2), why: `1 ${U[F.big][0]} is ${F.f} ${U[F.small][1]}, not 100.` } : null,
        both(F, a1 - a2, B),
        A + B > 0 && (A > 0 || (B + 1) % F.f > 0) ? both(F, A, (B + 1) % F.f) : null,
        both(F, A + 1, (B + 2) % F.f),
        both(F, A + 1, (B + 1) % F.f),
        both(F, A + 2, B),
      ];
  const x = both(F, a1, b1);
  const y = both(F, a2, b2);
  return q({
    prompt: add ? P.add(name, x, y) : P.sub(name, x, y),
    correct: right,
    wrong: wrong.filter(Boolean).map((w) => (typeof w === 'object' && w.why == null ? w.value : w)).filter((w) => (typeof w === 'string' ? w !== right : w.form || w.value !== right)),
    solution: add
      ? [R`Add the ${U[F.big][1]}: \(${a1} + ${a2} = ${a1 + a2}\). Add the ${U[F.small][1]}: \(${b1} + ${b2} = ${b1 + b2}\).`, R`${factText(F)}. So \(${b1 + b2}\) ${U[F.small][1]} is 1 ${U[F.big][0]}${B ? ` and ${B} ${word(F.small, B)}` : ''}.`, `The answer is ${right}.`]
      : [R`You cannot take ${b2} from ${b1}. Regroup 1 ${U[F.big][0]}: \(${b1} + ${F.f} = ${b1 + F.f}\) ${U[F.small][1]}.`, R`${cap(U[F.small][1])}: \(${b1 + F.f} - ${b2} = ${B}\). ${cap(U[F.big][1])}: \(${a1 - 1} - ${a2} = ${A}\).`, `The answer is ${right}.`],
    rule: 5,
    skill: 'adding and subtracting mixed units',
    check: () => (A * F.f + B === res && (add ? res === t1 + t2 : res + t2 === t1) && B < F.f ? true : 'regrouping differs'),
  });
}

// ───────────── Topic ─────────────

const LENGTH_FACTS = [FACTS[0], FACTS[1], FACTS[2], FACTS[3]];

export default {
  id: 'measurement',
  title: 'Measuring & Converting Units',
  summary: 'Measure lengths, pick sensible units, and change between bigger and smaller units to solve problems.',
  grade: 'Grades 2–5',
  standards: ['CCSS 2.MD.A.1', 'CCSS 2.MD.A.3', 'CCSS 2.MD.A.4', 'CCSS 2.MD.B.5', 'CCSS 4.MD.A.1', 'CCSS 4.MD.A.2', 'CCSS 5.MD.A.1'],

  explain: {
    intro: 'We measure to find how long, how heavy or how much. Every measurement has a number and a unit. A bigger unit is made of many smaller units.',
    rules: [
      {
        title: 'Measure with a ruler',
        text: 'Line up one end of the object with 0. Read the number at the other end. If it starts at another number, subtract the start from the end.',
        example: R`A pencil from 2 to 9 on a ruler: \(9 - 2 = 7\) cm long.`,
      },
      {
        title: 'Choose a sensible unit and estimate',
        text: 'Use small units for small things and big units for long distances. A centimeter is about a fingertip wide. An inch is about a paper clip long. A meter is about one big step.',
        example: 'A crayon is about 9 cm. A door is about 2 m tall. A walk to school might be 2 km.',
      },
      {
        title: 'Compare and combine lengths',
        text: 'To compare two lengths, find the difference. Subtract. To join lengths end to end, add. The units must match.',
        example: R`A 45 cm jump and a 38 cm jump: \(45 - 38 = 7\) cm farther.`,
      },
      {
        title: 'Facts to know',
        text: '1 foot is 12 inches. 1 yard is 3 feet. 1 meter is 100 centimeters. 1 kilometer is 1,000 meters. 1 kilogram is 1,000 grams. 1 liter is 1,000 milliliters. 1 pound is 16 ounces. 1 minute is 60 seconds. 1 hour is 60 minutes.',
        example: 'A yard is longer than a foot. A kilogram is heavier than a gram.',
      },
      {
        title: 'Bigger unit to smaller unit: multiply',
        text: 'Each big unit is many small units. So multiply by how many small units are in one big unit. A table helps you see the pattern.',
        example: R`4 feet: \(4 \times 12 = 48\) inches.`,
      },
      {
        title: 'Smaller unit to bigger unit: divide',
        text: 'Divide by how many small units make one big unit. Anything left over is a fraction or decimal of a big unit. In longer problems, change to one unit first.',
        example: R`30 inches: \(30 \div 12 = 2\) with 6 left over, so \(2\frac{1}{2}\) feet. 250 cm is 2.5 m.`,
      },
    ],
    vocab: [
      { term: 'unit', def: 'An amount we measure with, like an inch, a gram or a minute.' },
      { term: 'estimate', def: 'A careful guess of a measurement.' },
      { term: 'convert', def: 'To change a measurement to a different unit without changing its size.' },
      { term: 'customary units', def: 'Units such as inches, feet, pounds and gallons.' },
      { term: 'metric units', def: 'Units such as centimeters, meters, grams and liters.' },
    ],
    mistakes: [
      'Starting to read a ruler at 1 instead of 0. Count the spaces, not the marks.',
      'Writing 4 feet 7 inches as 47 inches. Change the feet to inches first: 48 + 7 = 55.',
      'Multiplying when changing to a bigger unit. Bigger units mean a smaller number, so divide.',
      'Using 100 for every fact. An hour is 60 minutes and a foot is 12 inches.',
    ],
    visual: ruler(2, 9, 'cm', 'pencil'),
  },

  examples: [
    {
      title: 'Measuring from a number other than 0',
      problem: 'A pencil lies along a ruler from 2 to 9 centimeters. How long is it?',
      steps: ['The pencil starts at 2 and ends at 9.', R`Subtract the start from the end: \(9 - 2 = 7\).`],
      answer: '7 centimeters',
      visual: ruler(2, 9, 'cm', 'pencil'),
    },
    {
      title: 'A conversion table',
      problem: 'Make a table that changes yards to feet. How many feet are in 4 yards?',
      steps: ['1 yard is 3 feet.', 'Each row adds another 3 feet: 3, 6, 9, 12, 15.', R`\(4 \times 3 = 12\).`],
      answer: '12 feet',
      visual: convTable(LENGTH_FACTS[1], [1, 2, 3, 4, 5], -1),
    },
    {
      title: 'Word problem: juice in a jug',
      word: true,
      problem: 'A jug holds 2 liters of juice. Mateo pours out 750 milliliters. How much juice is left?',
      steps: [R`Change to one unit: \(2 \times 1{,}000 = 2{,}000\) milliliters.`, R`Subtract what was poured out: \(2{,}000 - 750 = 1{,}250\).`],
      answer: R`\(1{,}250\) milliliters`,
      visual: { type: 'barModel', rows: [{ parts: [{ value: 750, label: '750 mL' }, { value: 1250, label: '?', shade: 'none' }], total: '2 L = 2,000 mL' }], alt: 'A bar for 2 liters, which is 2,000 milliliters. One part is 750 milliliters. The rest is a question mark.' },
    },
    {
      title: 'Word problem: smaller unit to bigger unit',
      word: true,
      problem: 'A ribbon is 45 inches long. How many feet is that?',
      steps: ['1 foot is 12 inches. A bigger unit means divide.', R`\(45 \div 12 = 3\) with 9 left over.`, R`9 inches is \(\frac{9}{12} = \frac{3}{4}\) of a foot.`],
      answer: R`\(3\frac{3}{4}\) feet`,
    },
  ],

  models: [
    {
      id: 'ruler',
      title: 'Measure with a ruler',
      intro: 'Type where the object starts and ends on the ruler.',
      inputs: [
        { name: 'from', label: 'Starts at', type: 'int', min: 0, max: 11, value: 2 },
        { name: 'to', label: 'Ends at', type: 'int', min: 1, max: 12, value: 9 },
        { name: 'u', label: 'Units', type: 'select', value: 'cm', options: [{ value: 'cm', label: 'centimeters' }, { value: 'in', label: 'inches' }] },
      ],
      compute({ from, to, u }) {
        if (to <= from) return { error: 'The end must be to the right of the start. Make "Ends at" bigger.' };
        const L = to - from;
        return {
          problem: `A crayon lies along a ruler from ${from} to ${to}. How long is it?`,
          steps: [from === 0 ? 'The crayon starts at 0, so read the number at its end.' : `The crayon starts at ${from}, not 0.`, R`Length is end minus start: \(${to} - ${from} = ${L}\).`],
          answer: `${L} ${word(u, L)}`,
          visual: ruler(from, to, u, 'crayon'),
        };
      },
    },
    {
      id: 'convert',
      title: 'Word problem: change to a smaller unit',
      word: true,
      intro: 'Pick the units and type an amount. The table and steps show the change.',
      inputs: [
        { name: 'n', label: 'Amount in the bigger unit', type: 'int', min: 1, max: 20, value: 4 },
        { name: 'pair', label: 'Units', type: 'select', value: '0', options: FACTS.slice(0, 11).map((F, i) => ({ value: String(i), label: `${U[F.big][1]} to ${U[F.small][1]}` })) },
      ],
      compute({ n, pair }) {
        const F = FACTS[Number(pair)];
        const ans = n * F.f;
        const rows = Array.from({ length: Math.min(n, 5) }, (_, i) => (n <= 5 ? i + 1 : n - 4 + i));
        return {
          problem: `Ana has ${n} ${word(F.big, n)} of ${['ft', 'yd', 'm', 'km'].includes(F.big) ? 'string' : ['kg', 'lb'].includes(F.big) ? 'clay' : F.big === 'L' || F.big === 'gal' ? 'water' : 'free time'}. How many ${U[F.small][1]} is that?`,
          steps: [factMath(F), R`Bigger to smaller, so multiply: \(${n} \times ${N(F.f)} = ${N(ans)}\).`],
          answer: `${amt(ans, F.small)}`,
          visual: convTable(F, rows, -1),
        };
      },
    },
  ],

  quiz: {
    easy: [easyRuler, easyUnits, easyCompare],
    medium: [mediumRulerOffset, mediumLengthStory, mediumConvertTable],
    hard: [hardConvert, hardStory, hardCompareUnits],
    challenge: [challengeToBigger, challengeMultiStep, challengeMixed],
  },
};
