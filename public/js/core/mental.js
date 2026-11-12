// Quick mental-math problems at ten difficulty steps, and expression/value pairs for the
// matching game. Pure logic.

export const MENTAL_LEVELS = Object.freeze([
  'Adding within 10',
  'Adding and subtracting within 20',
  'Two-digit plus or minus one-digit',
  'Multiplication facts',
  'Two-digit plus or minus two-digit',
  'Division facts and multiplying by 10 or 100',
  'Two-digit times one-digit',
  'Halves, quarters and tenths of a number',
  'Squares and two-step sums',
  'Bigger multiplications',
]);
export const MAX_MENTAL_LEVEL = MENTAL_LEVELS.length - 1;

/** One problem: { text: '7 × 8', answer: 56 }. */
export function mentalProblem(level, rng) {
  const L = Math.max(0, Math.min(MAX_MENTAL_LEVEL, level));
  switch (L) {
    case 0: {
      const a = rng.int(1, 9);
      const b = rng.int(1, 10 - a);
      return { text: `${a} + ${b}`, answer: a + b };
    }
    case 1: {
      if (rng.bool()) {
        const a = rng.int(2, 10);
        const b = rng.int(2, 10);
        return { text: `${a} + ${b}`, answer: a + b };
      }
      const total = rng.int(6, 20);
      const take = rng.int(1, Math.min(10, total - 1));
      return { text: `${total} − ${take}`, answer: total - take };
    }
    case 2: {
      const a = rng.int(11, 89);
      const b = rng.int(2, 9);
      return rng.bool() ? { text: `${a} + ${b}`, answer: a + b } : { text: `${a} − ${b}`, answer: a - b };
    }
    case 3: {
      const a = rng.int(2, 12);
      const b = rng.int(2, 12);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    case 4: {
      const a = rng.int(12, 79);
      const b = rng.int(11, 69);
      if (rng.bool()) return { text: `${a} + ${b}`, answer: a + b };
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      return hi === lo ? { text: `${a} + ${b}`, answer: a + b } : { text: `${hi} − ${lo}`, answer: hi - lo };
    }
    case 5: {
      if (rng.bool()) {
        const a = rng.int(2, 12);
        const b = rng.int(2, 12);
        return { text: `${a * b} ÷ ${a}`, answer: b };
      }
      const a = rng.int(3, 99);
      const k = rng.pick([10, 100]);
      return { text: `${a} × ${k}`, answer: a * k };
    }
    case 6: {
      const a = rng.int(12, 49);
      const b = rng.int(2, 9);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    case 7: {
      const kind = rng.pick(['half', 'quarter', 'tenth', 'p50', 'p25', 'p10']);
      if (kind === 'half' || kind === 'p50') {
        const n = rng.int(6, 120) * 2;
        return { text: kind === 'half' ? `Half of ${n}` : `50% of ${n}`, answer: n / 2 };
      }
      if (kind === 'quarter' || kind === 'p25') {
        const n = rng.int(3, 50) * 4;
        return { text: kind === 'quarter' ? `A quarter of ${n}` : `25% of ${n}`, answer: n / 4 };
      }
      const n = rng.int(2, 90) * 10;
      return { text: kind === 'tenth' ? `A tenth of ${n}` : `10% of ${n}`, answer: n / 10 };
    }
    case 8: {
      if (rng.bool(0.4)) {
        const n = rng.int(11, 20);
        return { text: `${n}²`, answer: n * n };
      }
      const a = rng.int(3, 9);
      const b = rng.int(3, 9);
      const c = rng.int(2, Math.min(20, a * b - 1));
      return rng.bool() ? { text: `${a} × ${b} + ${c}`, answer: a * b + c } : { text: `${a} × ${b} − ${c}`, answer: a * b - c };
    }
    default: {
      const a = rng.int(12, 40);
      const b = rng.pick([11, 12, 15, 20, 25]);
      return { text: `${a} × ${b}`, answer: a * b };
    }
  }
}

export const PAIR_LEVELS = Object.freeze([
  { pairs: 4, name: 'Adding within 10' },
  { pairs: 6, name: 'Adding and subtracting within 20' },
  { pairs: 6, name: 'Multiplication facts' },
  { pairs: 8, name: 'Multiplying and dividing' },
  { pairs: 8, name: 'Fractions, decimals and percents' },
  { pairs: 10, name: 'Squares, roots and powers' },
  { pairs: 10, name: 'A mix of everything' },
]);
export const MAX_PAIR_LEVEL = PAIR_LEVELS.length - 1;

const EQUIVALENTS = [['1/2', '0.5'], ['1/4', '0.25'], ['3/4', '0.75'], ['1/5', '0.2'], ['2/5', '0.4'], ['1/10', '0.1'], ['3/10', '0.3'], ['1/8', '0.125'], ['50%', '1/2 '], ['25%', '1/4 '], ['75%', '3/4 '], ['10%', '1/10 '], ['20%', '1/5 '], ['3/5', '0.6'], ['4/5', '0.8'], ['7/10', '0.7']];
const POWERS = [['2²', '4'], ['3²', '9'], ['4²', '16'], ['5²', '25'], ['6²', '36'], ['7²', '49'], ['8²', '64'], ['9²', '81'], ['√100', '10'], ['√144', '12'], ['2³', '8'], ['3³', '27'], ['2⁵', '32'], ['10³', '1000'], ['√121', '11'], ['2⁶ ', '64 '], ['5³', '125'], ['√169', '13']];

function arithmeticPair(kind, rng) {
  if (kind === 'add10') {
    const a = rng.int(1, 8);
    const b = rng.int(1, 9 - a);
    return [`${a} + ${b}`, String(a + b)];
  }
  if (kind === 'addsub20') {
    if (rng.bool()) {
      const a = rng.int(3, 10);
      const b = rng.int(3, 10);
      return [`${a} + ${b}`, String(a + b)];
    }
    const total = rng.int(8, 20);
    const take = rng.int(2, Math.min(9, total - 2));
    return [`${total} − ${take}`, String(total - take)];
  }
  if (kind === 'mul') {
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    return [`${a} × ${b}`, String(a * b)];
  }
  const a = rng.int(2, 12);
  const b = rng.int(2, 12);
  return rng.bool() ? [`${a} × ${b}`, String(a * b)] : [`${a * b} ÷ ${a}`, String(b)];
}

/**
 * The cards for one matching game: `pairs` expression/value pairs with all values different,
 * so every expression has exactly one partner. Returns [{ id, pair, text }] already shuffled.
 */
export function pairDeck(level, rng) {
  const L = Math.max(0, Math.min(MAX_PAIR_LEVEL, level));
  const want = PAIR_LEVELS[L].pairs;
  const kinds = [['add10'], ['addsub20'], ['mul'], ['muldiv'], ['equiv'], ['powers'], ['muldiv', 'equiv', 'powers', 'addsub20']][L];
  const chosen = [];
  const usedValues = new Set();
  const usedFronts = new Set();
  let guard = 0;
  while (chosen.length < want && guard++ < 2000) {
    const kind = rng.pick(kinds);
    let pair;
    if (kind === 'equiv') pair = rng.pick(EQUIVALENTS).map((s) => s.trim());
    else if (kind === 'powers') pair = rng.pick(POWERS).map((s) => s.trim());
    else pair = arithmeticPair(kind, rng);
    const [front, value] = pair;
    // A value must not appear twice, and an expression must not look like another card's value.
    if (usedValues.has(value) || usedFronts.has(front) || usedValues.has(front) || usedFronts.has(value)) continue;
    usedValues.add(value);
    usedFronts.add(front);
    chosen.push(pair);
  }
  const cards = [];
  chosen.forEach(([front, value], i) => {
    cards.push({ id: `${i}a`, pair: i, text: front });
    cards.push({ id: `${i}b`, pair: i, text: value });
  });
  return rng.shuffle(cards);
}

/**
 * A two-up / two-down staircase used by the memory games.
 * Returns the new { level, up, down } and change (−1, 0, +1).
 */
export function staircase(state, success, max, { upAfter = 2, downAfter = 2 } = {}) {
  let { level = 0, up = 0, down = 0 } = state ?? {};
  let change = 0;
  if (success) {
    up += 1;
    down = 0;
    if (up >= upAfter && level < max) {
      level += 1;
      up = 0;
      change = 1;
    }
  } else {
    down += 1;
    up = 0;
    if (down >= downAfter && level > 0) {
      level -= 1;
      down = 0;
      change = -1;
    }
  }
  return { level, up, down, change };
}
