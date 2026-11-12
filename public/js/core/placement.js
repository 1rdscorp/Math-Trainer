// The placement quiz: a short adaptive search over a ladder of skills, from adding within 20
// up to multivariable calculus. Pure logic; the screen is views/placement.js.
//
// Each rung is tested with up to two questions. Both right → the rung is passed. A wrong answer or
// "I have not learned this yet" → the rung is not passed, and that is where the student should start.
// The search climbs in growing steps while rungs are passed, then closes in on the first rung not passed.

export const RUNGS = Object.freeze([
  { level: 'g1-5', label: 'adding and subtracting within 20', sources: [['add-sub-20', 'medium']] },
  { level: 'g1-5', label: 'place value and adding bigger numbers', sources: [['add-sub-multi', 'medium'], ['place-value', 'medium']] },
  { level: 'g1-5', label: 'multiplication and division facts', sources: [['multiplication', 'medium'], ['division', 'easy']] },
  { level: 'g1-5', label: 'fractions and multi-digit multiplication', sources: [['fractions-intro', 'medium'], ['multi-digit-mult-div', 'easy']] },
  { level: 'g1-5', label: 'adding fractions and working with decimals', sources: [['fractions-add-sub', 'hard'], ['decimals', 'medium']] },
  { level: 'g6-8', label: 'ratios, rates and dividing fractions', sources: [['ratios-rates', 'medium'], ['fraction-division-factors', 'medium']] },
  { level: 'g6-8', label: 'negative numbers, percents and equations', sources: [['integers-rationals', 'medium'], ['equations-inequalities', 'medium'], ['percent', 'medium']] },
  { level: 'g6-8', label: 'slope, exponents and the Pythagorean theorem', sources: [['linear-relationships', 'medium'], ['exponents-scientific', 'medium'], ['pythagorean-angles', 'medium']] },
  { level: 'algebra-1', label: 'systems, factoring and quadratic equations', sources: [['systems', 'medium'], ['quadratic-equations', 'medium'], ['factoring', 'medium']] },
  { level: 'geometry', label: 'similar triangles, trigonometry and circles', sources: [['similarity', 'medium'], ['trigonometry', 'medium'], ['circles', 'medium']] },
  { level: 'algebra-2', label: 'logarithms, complex numbers and rational expressions', sources: [['logarithms', 'medium'], ['complex-numbers', 'medium'], ['rational-expressions', 'medium']] },
  { level: 'precalculus', label: 'the unit circle, trig identities and rational functions', sources: [['unit-circle-trig', 'medium'], ['trig-identities-equations', 'medium'], ['polynomial-rational', 'medium']] },
  { level: 'calculus-1', label: 'limits and derivatives', sources: [['limits', 'medium'], ['derivative-rules', 'medium'], ['chain-rule-implicit', 'medium']] },
  { level: 'calculus-2', label: 'integration techniques and series', sources: [['integration-by-parts', 'medium'], ['improper-integrals', 'medium'], ['sequences-series-intro', 'medium']] },
  { level: 'calculus-3', label: 'partial derivatives and multiple integrals', sources: [['partial-derivatives', 'medium'], ['double-integrals', 'medium'], ['vectors-space', 'medium']] },
]);

/** Where to begin, from the student's own description of where they are in school. */
export const STARTS = Object.freeze([
  { id: 'g12', label: 'Grades 1–2', rung: 0 },
  { id: 'g35', label: 'Grades 3–5', rung: 2 },
  { id: 'g68', label: 'Grades 6–8', rung: 5 },
  { id: 'hs', label: 'High school', rung: 8 },
  { id: 'college', label: 'College or beyond', rung: 11 },
  { id: 'unsure', label: 'I am not sure', rung: 3 },
]);

export const MAX_PLACEMENT_QUESTIONS = 14;

/**
 * Search state. `usable` lists the rung indexes that can actually be asked (their topics exist).
 *   lo  position (in usable) of the highest rung passed, or −1
 *   hi  position of the lowest rung not passed, or usable.length
 */
export function startPlacement(startRung, usable) {
  if (!usable.length) throw new Error('No placement rungs are available');
  // Begin at the usable rung nearest to the requested one.
  let pos = 0;
  usable.forEach((r, i) => {
    if (Math.abs(r - startRung) < Math.abs(usable[pos] - startRung)) pos = i;
  });
  return { usable: [...usable], lo: -1, hi: usable.length, pos, step: 1, asked: 0, done: false };
}

/** Record whether the current rung was passed and move to the next rung to test (or finish). */
export function advance(state, passed, questionsUsed) {
  let { lo, hi, pos, step } = state;
  const asked = state.asked + questionsUsed;
  if (passed) lo = Math.max(lo, pos);
  else hi = Math.min(hi, pos);

  let done = hi - lo <= 1 || asked >= MAX_PLACEMENT_QUESTIONS;
  if (!done) {
    if (hi === state.usable.length) {
      // Nothing failed yet: climb, a little further each time.
      pos = Math.min(state.usable.length - 1, lo + step);
      step = Math.min(3, step + 1);
    } else {
      pos = Math.floor((lo + hi) / 2);
      if (pos === lo) pos = lo + 1;
    }
    if (pos <= lo || pos >= hi) done = true;
  }
  return { ...state, lo, hi, pos, step, asked, done };
}

/**
 * The outcome: the rung to start at.
 *   toppedOut  the top rung itself was passed
 *   passed     the highest rung passed, or null
 *   certain    false when the quiz was stopped before it found a rung that was not passed
 */
export function placementResult(state) {
  const { usable, lo, hi, pos } = state;
  const top = usable.length - 1;
  const passed = lo >= 0 ? usable[lo] : null;
  if (hi <= top) return { rung: usable[hi], toppedOut: false, passed, certain: hi - lo === 1 };
  if (lo >= top) return { rung: usable[top], toppedOut: true, passed, certain: true };
  // Nothing was missed before the quiz stopped: suggest the next rung up, not the very top.
  return { rung: usable[lo >= 0 ? lo + 1 : pos], toppedOut: false, passed, certain: false };
}
