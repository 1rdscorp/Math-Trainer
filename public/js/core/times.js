// Multiplication-fact practice: which facts to ask, in what order, and how to explain them.
// Pure logic, shared by the practice and quiz screens.
//
// The order follows what fact-fluency research recommends: start with the foundation facts
// (×1, ×2, ×10, then ×5), then build the rest from them with derived-fact strategies
// (double a double, ten groups minus one group, five groups plus one group …).

export const TIMES_LEVELS = Object.freeze([
  { name: 'Starters', tables: [1, 2, 10], blurb: '×1, ×2 and ×10' },
  { name: 'Fives and elevens', tables: [5, 11], blurb: 'adds ×5 and ×11' },
  { name: 'Threes, fours and squares', tables: [3, 4], squares: true, blurb: 'adds ×3, ×4 and the square numbers' },
  { name: 'Sixes and nines', tables: [6, 9], blurb: 'adds ×6 and ×9' },
  { name: 'Sevens and eights', tables: [7, 8], blurb: 'adds ×7 and ×8' },
  { name: 'Twelves', tables: [12], blurb: 'adds ×12: the whole table' },
  { name: 'Mixed challenge', tables: [], mixed: true, blurb: 'missing factors and division facts' },
]);

export const MAX_TIMES_LEVEL = TIMES_LEVELS.length - 1;

/** Key for a fact, the same for 7×8 and 8×7. */
export function factKey(a, b) {
  return a <= b ? `${a}x${b}` : `${b}x${a}`;
}

function tablesUpTo(level) {
  const set = new Set();
  for (let i = 0; i <= Math.min(level, MAX_TIMES_LEVEL); i++) TIMES_LEVELS[i].tables.forEach((t) => set.add(t));
  return set;
}

/** Is the fact a × b part of the given level (or an earlier one)? */
export function inLevel(a, b, level) {
  const tables = tablesUpTo(level);
  if (tables.has(a) || tables.has(b)) return true;
  return level >= 2 && a === b;
}

/** Is the fact new at exactly this level? */
export function newAtLevel(a, b, level) {
  return inLevel(a, b, level) && (level === 0 || !inLevel(a, b, level - 1));
}

/** Every fact (a ≤ b) available at a level, or for a chosen set of tables. */
export function factsFor(level, tables = null) {
  const out = [];
  for (let a = 1; a <= 12; a++) {
    for (let b = a; b <= 12; b++) {
      const ok = tables ? tables.includes(a) || tables.includes(b) : inLevel(a, b, level);
      if (ok) out.push([a, b]);
    }
  }
  return out;
}

/**
 * Choose the next fact. New facts for the level and facts the student has missed come up more
 * often; the last few facts asked are avoided. `stats` is progress.times.facts.
 * Returns { a, b, form } where form is 'product', 'missing' (a × ? = p) or 'division' (p ÷ a = ?).
 */
export function pickFact({ level, tables = null, stats = {}, recent = [], rng }) {
  const pool = factsFor(level, tables);
  const weights = pool.map(([a, b]) => {
    const key = factKey(a, b);
    if (recent.includes(key)) return 0;
    let w = 1;
    if (!tables && newAtLevel(a, b, level)) w *= 3;
    const s = stats[key];
    if (!s || s[0] === 0) w *= 1.5; // never tried
    else if (s[1] / s[0] < 0.75) w *= 3; // often missed
    else if (s[0] >= 3 && s[1] === s[0] && s[2] / s[0] < 3000) w *= 0.4; // fast and reliable
    if (a === 1 || b === 1) w *= 0.4;
    return w;
  });
  let total = weights.reduce((x, y) => x + y, 0);
  let index = 0;
  if (total <= 0) {
    index = Math.floor(rng.next() * pool.length);
  } else {
    let r = rng.next() * total;
    for (index = 0; index < pool.length - 1; index++) {
      r -= weights[index];
      if (r < 0) break;
    }
  }
  let [a, b] = pool[index];
  if (rng.bool()) [a, b] = [b, a];
  const mixed = !tables && TIMES_LEVELS[Math.min(level, MAX_TIMES_LEVEL)].mixed;
  const form = mixed ? rng.pick(['product', 'missing', 'division']) : 'product';
  return { a, b, form };
}

/** The text of a question and its answer. */
export function describeFact({ a, b, form }) {
  const p = a * b;
  if (form === 'missing') return { text: `${a} × ? = ${p}`, spoken: `${a} times what number equals ${p}?`, answer: b };
  if (form === 'division') return { text: `${p} ÷ ${a} = ?`, spoken: `${p} divided by ${a}`, answer: b };
  return { text: `${a} × ${b} = ?`, spoken: `${a} times ${b}`, answer: p };
}

const PRIORITY = [1, 10, 2, 5, 11, 4, 9, 3, 6, 8, 12, 7];

/** A derived-fact strategy for a × b, written with the actual numbers. */
export function strategy(a, b) {
  const t = PRIORITY.find((x) => x === a || x === b);
  const n = t === a ? b : a;
  const p = a * b;
  switch (t) {
    case 1:
      return `Any number times 1 stays the same, so the answer is ${p}.`;
    case 10:
      return `Ten groups of ${n}: write ${n} with a 0 after it. That makes ${p}.`;
    case 2:
      return `Times 2 means double. ${n} + ${n} = ${p}.`;
    case 5:
      return `Five is half of ten. 10 × ${n} = ${10 * n}, and half of ${10 * n} is ${p}.`;
    case 11:
      return n <= 9 ? `For 11 times a one-digit number, the digit repeats: ${p}.` : `Ten groups plus one group: ${10 * n} + ${n} = ${p}.`;
    case 4:
      return `Times 4 is double, then double again. ${n} → ${2 * n} → ${p}.`;
    case 9:
      return `Nine groups is ten groups minus one group: ${10 * n} − ${n} = ${p}.`;
    case 3:
      return `Three groups is double plus one more group: ${2 * n} + ${n} = ${p}.`;
    case 6:
      return `Six groups is five groups plus one more group: ${5 * n} + ${n} = ${p}.`;
    case 8:
      return `Times 8 is double three times. ${n} → ${2 * n} → ${4 * n} → ${p}.`;
    case 12:
      return `Twelve groups is ten groups plus two groups: ${10 * n} + ${2 * n} = ${p}.`;
    default:
      return `Seven groups is five groups plus two groups: ${5 * n} + ${2 * n} = ${p}.`;
  }
}

/** Three believable wrong answers for a multiple-choice fact question. */
export function wrongAnswers({ a, b, form }, rng) {
  const p = a * b;
  const correct = form === 'product' ? p : b;
  const raw =
    form === 'product'
      ? [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a + b, p + 1, p - 1, p + 10, p - 10, p + 2]
      : [b + 1, b - 1, a, b + 2, b - 2, p - a, Math.round(p / 10), b + 10];
  const seen = new Set([correct]);
  const out = [];
  for (const v of rng.shuffle(raw.slice(0, 6)).concat(raw.slice(6))) {
    if (v <= 0 || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length === 3) break;
  }
  for (let k = 3; out.length < 3; k++) {
    if (!seen.has(correct + k)) {
      seen.add(correct + k);
      out.push(correct + k);
    }
  }
  return out;
}

/** Record one answer in progress.times.facts. */
export function recordFact(doc, a, b, correct, ms) {
  const key = factKey(a, b);
  const s = doc.times.facts[key] ?? (doc.times.facts[key] = [0, 0, 0]);
  s[0] += 1;
  if (correct) s[1] += 1;
  s[2] += Math.max(0, Math.min(60000, Math.round(ms)));
}

/**
 * After a round, decide whether to move the level. Up: at least 10 answers with 90% correct.
 * Down: at least 8 answers with under 60% correct. Returns the change (−1, 0 or +1).
 */
export function levelChange(level, answered, correct) {
  if (answered >= 10 && correct / answered >= 0.9 && level < MAX_TIMES_LEVEL) return 1;
  if (answered >= 8 && correct / answered < 0.6 && level > 0) return -1;
  return 0;
}

/** How well a fact is known, for colouring the table: 'none' | 'weak' | 'some' | 'strong'. */
export function mastery(stats, a, b) {
  const s = stats[factKey(a, b)];
  if (!s || s[0] === 0) return 'none';
  const acc = s[1] / s[0];
  if (acc < 0.6) return 'weak';
  if (acc >= 0.85 && s[0] >= 2) return 'strong';
  return 'some';
}
