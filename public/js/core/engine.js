// The adaptive quiz engine. Pure logic: no DOM, no storage.
//
// Rules (from the product spec):
//   • Four tiers. The quiz starts at Easy.
//   • 3 correct answers in a row  → move up one tier.
//   • 2 wrong answers in a row    → move down one tier.
//   • Points: Easy +5/−2, Medium +10/−4, Hard +15/−6, Challenge +20/−8.
//   • The score never drops below 0. The quiz is complete at 100 points.
//   • Questions do not repeat within a quiz run.
//
// One research-based addition: after a wrong answer, a fresh question of the same kind (same
// generator, new numbers) comes back two questions later, so the student gets to try the idea again.

import { hashString } from './rng.js';

export const TIERS = Object.freeze([
  Object.freeze({ id: 'easy', name: 'Easy', right: 5, wrong: 2 }),
  Object.freeze({ id: 'medium', name: 'Medium', right: 10, wrong: 4 }),
  Object.freeze({ id: 'hard', name: 'Hard', right: 15, wrong: 6 }),
  Object.freeze({ id: 'challenge', name: 'Challenge', right: 20, wrong: 8 }),
]);

export const TARGET_SCORE = 100;
export const UP_STREAK = 3;
export const DOWN_STREAK = 2;

/** A fresh quiz run. */
export function newQuizState(now = Date.now()) {
  return {
    score: 0,
    tier: 0, // index into TIERS
    up: 0, // correct answers in a row since the last tier change
    down: 0, // wrong answers in a row since the last tier change
    answered: 0,
    correct: 0,
    maxTier: 0,
    asked: [], // hashed keys of questions already shown in this run
    lastGen: -1, // index of the generator used for the previous question
    review: null, // { tier, gen, due }: a missed question type to bring back with new numbers
    startedAt: now,
    done: false,
  };
}

/**
 * Apply one answer. Returns a NEW state plus what changed:
 *   delta      points actually added or removed (a wrong answer at 0 points removes nothing)
 *   tierChange +1 moved up, −1 moved down, 0 stayed
 *   done       true once the score reaches TARGET_SCORE
 */
export function applyAnswer(state, isCorrect) {
  if (state.done) return { state, delta: 0, tierChange: 0, done: true };
  const t = TIERS[state.tier];
  let { score, tier, up, down } = state;
  let review = state.review ?? null;
  let tierChange = 0;
  let delta;

  if (isCorrect) {
    delta = t.right;
    score += delta;
    up += 1;
    down = 0;
    if (up >= UP_STREAK && tier < TIERS.length - 1) {
      tier += 1;
      tierChange = 1;
      up = 0;
    }
  } else {
    const next = Math.max(0, score - t.wrong);
    delta = next - score;
    score = next;
    down += 1;
    up = 0;
    if (state.lastGen >= 0) review = { tier: state.tier, gen: state.lastGen, due: state.answered + 2 };
    if (down >= DOWN_STREAK && tier > 0) {
      tier -= 1;
      tierChange = -1;
      down = 0;
    }
  }

  const done = score >= TARGET_SCORE;
  return {
    state: {
      ...state,
      score,
      tier,
      up,
      down,
      answered: state.answered + 1,
      correct: state.correct + (isCorrect ? 1 : 0),
      maxTier: Math.max(state.maxTier, tier),
      review,
      done,
    },
    delta,
    tierChange,
    done,
  };
}

/** How many more correct answers in a row are needed to move up (0 at the top tier). */
export function toNextTier(state) {
  if (state.tier >= TIERS.length - 1) return 0;
  return Math.max(0, UP_STREAK - state.up);
}

const MAX_TRIES = 60;

/**
 * Produce the next question for the current tier.
 * Picks a generator (avoiding the one used last time when there is a choice), re-draws until the
 * question has not been asked in this run, then shuffles the choices.
 *
 * Returns { question, state } where question = { prompt, choices, correctIndex, solution, rule,
 * skill, visual, tier, key } and state has the question recorded as asked.
 */
export function nextQuestion(topic, state, rng) {
  const tier = TIERS[state.tier];
  const gens = topic.quiz?.[tier.id];
  if (!gens?.length) throw new Error(`Topic "${topic.id}" has no ${tier.id} questions`);

  const asked = new Set(state.asked);
  let fallback = null;
  let fallbackGen = -1;

  // Is it time to bring back a question type that was missed earlier?
  const rv = state.review;
  const reviewDue = rv && rv.tier === state.tier && state.answered >= rv.due && rv.gen < gens.length;
  const reviewExpired = rv && state.answered > rv.due + 6;
  if (reviewDue || reviewExpired) state = { ...state, review: null };

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    let gi = Math.floor(rng.next() * gens.length);
    if (reviewDue && attempt < 12) gi = rv.gen;
    // Otherwise vary the question type from one question to the next when we can (interleaving).
    else if (gens.length > 1 && gi === state.lastGen && attempt < MAX_TRIES / 2) gi = (gi + 1) % gens.length;

    let raw;
    try {
      raw = gens[gi](rng);
    } catch (err) {
      if (globalThis.console) console.warn(`Question generator failed in ${topic.id}/${tier.id}[${gi}]:`, err);
      continue;
    }
    if (!isUsable(raw)) continue;

    const key = hashString(raw.key ?? raw.prompt);
    if (!asked.has(key)) return finish(raw, key, gi, tier, state, rng);
    if (!fallback) {
      fallback = raw;
      fallbackGen = gi;
    }
  }

  // Every draw was a repeat (the tier's pool is exhausted): reuse one rather than stall.
  if (!fallback) throw new Error(`Could not generate a ${tier.id} question for "${topic.id}"`);
  return finish(fallback, hashString(fallback.key ?? fallback.prompt), fallbackGen, tier, state, rng);
}

function isUsable(raw) {
  return (
    raw &&
    typeof raw.prompt === 'string' &&
    Array.isArray(raw.choices) &&
    raw.choices.length === 4 &&
    Number.isInteger(raw.answer) &&
    raw.answer >= 0 &&
    raw.answer < 4
  );
}

function finish(raw, key, genIndex, tier, state, rng) {
  const order = rng.shuffle([0, 1, 2, 3]);
  const question = {
    prompt: raw.prompt,
    choices: order.map((i) => raw.choices[i]),
    correctIndex: order.indexOf(raw.answer),
    notes: Array.isArray(raw.notes) ? order.map((i) => raw.notes[i] ?? null) : null,
    solution: raw.solution ?? [],
    rule: raw.rule,
    skill: raw.skill,
    visual: raw.visual,
    tier: tier.id,
    key,
  };
  const asked = state.asked.includes(key) ? state.asked : [...state.asked, key];
  return { question, state: { ...state, asked, lastGen: genIndex } };
}

/** Accuracy as a whole percentage, or null before any answers. */
export function accuracy(correct, answered) {
  return answered ? Math.round((100 * correct) / answered) : null;
}
