// Spaced repetition with Leitner boxes. Pure logic.
//
// A card answered correctly and quickly moves up one box and comes back after a longer gap;
// a missed card goes back to box 1 and is asked again in the same session. Grading is by
// correctness and speed, not by self-rating. Gaps roughly double: 1, 2, 4, 8, 16 days, then monthly.

export const BOX_DAYS = Object.freeze([1, 2, 4, 8, 16, 30]); // boxes 1…6
export const MAX_BOX = BOX_DAYS.length;
export const DAY = 24 * 60 * 60 * 1000;
export const NEW_PER_SESSION = 8;
export const SESSION_SIZE = 20;
export const FAST_MS = 6000;

/** The state of a card after an answer. `card` is [box, due] or undefined for a new card. */
export function grade(card, result, now) {
  const box = card?.[0] ?? 0;
  if (result === 'wrong') return [1, now];
  if (result === 'slow') {
    const stay = Math.max(1, box);
    return [stay, now + BOX_DAYS[stay - 1] * DAY];
  }
  const next = Math.min(MAX_BOX, box + 1);
  return [next, now + BOX_DAYS[next - 1] * DAY];
}

/** 'fast' | 'slow' | 'wrong' from correctness and response time. A limit of 0 turns speed grading off. */
export function judge(correct, ms, limitMs = FAST_MS) {
  if (!correct) return 'wrong';
  return limitMs > 0 && ms > limitMs ? 'slow' : 'fast';
}

/**
 * Choose the cards for a session: everything that is due (most overdue first), then new cards in
 * deck order (easiest first), up to the session size.
 * Returns { queue: [cardId…], due, fresh, learned, nextDue } with counts for the deck screen.
 */
export function plan(deck, state = {}, now = Date.now(), { size = SESSION_SIZE, newLimit = NEW_PER_SESSION } = {}) {
  const dueCards = [];
  const freshCards = [];
  let nextDue = null;
  let learned = 0;
  for (const card of deck.cards) {
    const s = state[card.id];
    if (!s) freshCards.push(card.id);
    else {
      learned += 1;
      if (s[1] <= now) dueCards.push([card.id, s[1]]);
      else if (nextDue == null || s[1] < nextDue) nextDue = s[1];
    }
  }
  dueCards.sort((a, b) => a[1] - b[1]);
  const queue = dueCards.slice(0, size).map((d) => d[0]);
  const room = Math.max(0, size - queue.length);
  queue.push(...freshCards.slice(0, Math.min(newLimit, room)));
  return { queue, due: dueCards.length, fresh: freshCards.length, learned, nextDue };
}

/** How many cards sit in each box (index 0 = not started). */
export function boxCounts(deck, state = {}) {
  const counts = new Array(MAX_BOX + 1).fill(0);
  for (const card of deck.cards) counts[Math.min(MAX_BOX, state[card.id]?.[0] ?? 0)] += 1;
  return counts;
}

/** Where a missed card goes back into the session queue: three cards later. */
export function requeue(queue, cardId, gap = 3) {
  const at = Math.min(queue.length, gap);
  return [...queue.slice(0, at), cardId, ...queue.slice(at)];
}
