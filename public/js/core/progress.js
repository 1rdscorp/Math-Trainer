// The progress document: everything the app remembers about one student.
// Pure functions only — storage and accounts live in store.js.
//
// {
//   v: 1,
//   points: 0,                       lifetime quiz points (never below 0)
//   topics: { 'g1-5/add-sub-20': {
//       run: {…quiz state…} | null,  the unfinished quiz, including the current tier
//       done: 0, doneAt: 0,          times completed, last completion time
//       att: 0, cor: 0,              questions answered / answered correctly (all time)
//       tiers: [[att, cor] × 4],     the same, per difficulty tier
//       skills: { tag: [att, cor] }, the same, per sub-skill (used for weak areas)
//       last: 0 } },                 last activity time
//   history: [{ t, k, s, a, c, m, d, secs }],   finished or abandoned quiz runs
//   times: { facts: { '7x8': [att, cor, ms] }, level, best, rounds },
//   srs: { deckId: { cardId: [box, due] } },
//   memory: { game: { level, best } },
//   placement: { level, topic, at } | null,
//   updatedAt: 0
// }

export const SCHEMA_VERSION = 1;
export const HISTORY_LIMIT = 300;
export const ASKED_LIMIT = 400;

export function emptyProgress() {
  return {
    v: SCHEMA_VERSION,
    points: 0,
    topics: {},
    history: [],
    times: { facts: {}, level: 0, best: {}, rounds: 0 },
    srs: {},
    memory: {},
    placement: null,
    updatedAt: 0,
  };
}

const isObject = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const count = (x) => (Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);
const pair = (p) => (Array.isArray(p) ? [count(p[0]), Math.min(count(p[0]), count(p[1]))] : [0, 0]);

function emptyTopic() {
  return { run: null, done: 0, doneAt: 0, att: 0, cor: 0, tiers: [[0, 0], [0, 0], [0, 0], [0, 0]], skills: {}, last: 0 };
}

function normalizeRun(run) {
  if (!isObject(run)) return null;
  const tier = Math.min(3, count(run.tier));
  const answered = count(run.answered);
  return {
    score: count(run.score),
    tier,
    up: count(run.up),
    down: count(run.down),
    answered,
    correct: Math.min(answered, count(run.correct)),
    maxTier: Math.max(tier, Math.min(3, count(run.maxTier))),
    asked: Array.isArray(run.asked) ? run.asked.filter((k) => typeof k === 'string').slice(-ASKED_LIMIT) : [],
    lastGen: Number.isInteger(run.lastGen) ? run.lastGen : -1,
    review: null,
    startedAt: count(run.startedAt),
    done: false,
  };
}

function normalizeTopic(t) {
  if (!isObject(t)) return emptyTopic();
  const out = emptyTopic();
  out.run = normalizeRun(t.run);
  out.done = count(t.done);
  out.doneAt = count(t.doneAt);
  out.att = count(t.att);
  out.cor = Math.min(out.att, count(t.cor));
  if (Array.isArray(t.tiers)) out.tiers = [0, 1, 2, 3].map((i) => pair(t.tiers[i]));
  if (isObject(t.skills)) for (const [k, v] of Object.entries(t.skills)) out.skills[k] = pair(v);
  out.last = count(t.last);
  return out;
}

/** Repair anything read from storage or the network into a well-formed progress document. */
export function normalizeProgress(doc) {
  const out = emptyProgress();
  if (!isObject(doc)) return out;
  out.points = count(doc.points);
  if (isObject(doc.topics)) {
    for (const [key, t] of Object.entries(doc.topics)) {
      if (typeof key === 'string' && key.length < 120) out.topics[key] = normalizeTopic(t);
    }
  }
  if (Array.isArray(doc.history)) {
    out.history = doc.history
      .filter((e) => isObject(e) && typeof e.k === 'string')
      .map((e) => ({ t: count(e.t), k: e.k, s: count(e.s), a: count(e.a), c: count(e.c), m: Math.min(3, count(e.m)), d: e.d ? 1 : 0, secs: count(e.secs) }))
      .slice(-HISTORY_LIMIT);
  }
  if (isObject(doc.times)) {
    if (isObject(doc.times.facts)) {
      for (const [k, v] of Object.entries(doc.times.facts)) {
        if (/^\d{1,2}x\d{1,2}$/.test(k) && Array.isArray(v)) out.times.facts[k] = [count(v[0]), Math.min(count(v[0]), count(v[1])), count(v[2])];
      }
    }
    out.times.level = count(doc.times.level);
    out.times.rounds = count(doc.times.rounds);
    if (isObject(doc.times.best)) for (const [k, v] of Object.entries(doc.times.best)) out.times.best[k] = count(v);
  }
  if (isObject(doc.srs)) {
    for (const [deck, cards] of Object.entries(doc.srs)) {
      if (!isObject(cards)) continue;
      out.srs[deck] = {};
      for (const [id, c] of Object.entries(cards)) if (Array.isArray(c)) out.srs[deck][id] = [Math.min(6, count(c[0])), count(c[1])];
    }
  }
  if (isObject(doc.memory)) {
    for (const [game, g] of Object.entries(doc.memory)) {
      if (isObject(g)) out.memory[game] = { level: count(g.level), best: count(g.best) };
    }
  }
  if (isObject(doc.placement) && typeof doc.placement.level === 'string') {
    out.placement = { level: doc.placement.level, topic: typeof doc.placement.topic === 'string' ? doc.placement.topic : null, at: count(doc.placement.at) };
  }
  out.updatedAt = count(doc.updatedAt);
  return out;
}

/** The entry for a topic, created on first use. */
export function topicEntry(doc, key) {
  if (!doc.topics[key]) doc.topics[key] = emptyTopic();
  return doc.topics[key];
}

/** Record one answered quiz question. `delta` is the points actually added or removed. */
export function recordAnswer(doc, key, { tier, correct, skill, delta, now = Date.now() }) {
  const t = topicEntry(doc, key);
  t.att += 1;
  if (correct) t.cor += 1;
  t.tiers[tier][0] += 1;
  if (correct) t.tiers[tier][1] += 1;
  if (skill) {
    const s = t.skills[skill] ?? (t.skills[skill] = [0, 0]);
    s[0] += 1;
    if (correct) s[1] += 1;
  }
  t.last = now;
  doc.points = Math.max(0, doc.points + delta);
}

/** Keep the unfinished quiz (score, tier, streaks) so it can be resumed. */
export function saveRun(doc, key, state, now = Date.now()) {
  const t = topicEntry(doc, key);
  t.run = { ...state, asked: state.asked.slice(-ASKED_LIMIT) };
  t.last = now;
}

function historyEntry(key, state, done, now) {
  return {
    t: now,
    k: key,
    s: state.score,
    a: state.answered,
    c: state.correct,
    m: state.maxTier,
    d: done ? 1 : 0,
    secs: Math.max(0, Math.round((now - (state.startedAt || now)) / 1000)),
  };
}

function pushHistory(doc, entry) {
  doc.history.push(entry);
  if (doc.history.length > HISTORY_LIMIT) doc.history.splice(0, doc.history.length - HISTORY_LIMIT);
}

/** The quiz reached 100 points. */
export function completeRun(doc, key, state, now = Date.now()) {
  const t = topicEntry(doc, key);
  t.done += 1;
  t.doneAt = now;
  t.run = null;
  t.last = now;
  pushHistory(doc, historyEntry(key, state, true, now));
}

/** The student chose to start over before finishing; keep a record if anything was answered. */
export function abandonRun(doc, key, now = Date.now()) {
  const t = topicEntry(doc, key);
  if (t.run && t.run.answered > 0) pushHistory(doc, historyEntry(key, t.run, false, now));
  t.run = null;
}

export function isCompleted(doc, key) {
  return (doc.topics[key]?.done ?? 0) > 0;
}

/** Totals for the dashboard. */
export function summarize(doc) {
  let answered = 0;
  let correct = 0;
  let completed = 0;
  let inProgress = 0;
  for (const t of Object.values(doc.topics)) {
    answered += t.att;
    correct += t.cor;
    if (t.done > 0) completed += 1;
    if (t.run && t.run.answered > 0) inProgress += 1;
  }
  return { points: doc.points, completed, inProgress, answered, correct, accuracy: answered ? Math.round((100 * correct) / answered) : null };
}

/** Has this document recorded any activity at all? */
export function hasActivity(doc) {
  return (
    doc.points > 0 ||
    Object.values(doc.topics).some((t) => t.att > 0 || t.run) ||
    Object.keys(doc.times.facts).length > 0 ||
    Object.keys(doc.srs).length > 0 ||
    Object.keys(doc.memory).length > 0 ||
    doc.placement != null
  );
}

export const WEAK_TOPIC_MIN_ATTEMPTS = 5;
export const WEAK_TOPIC_ACCURACY = 70;
export const WEAK_SKILL_MIN_ATTEMPTS = 3;
export const WEAK_SKILL_ACCURACY = 60;

/**
 * Weak areas: topics answered at least 5 times with accuracy under 70%, weakest first.
 * Each comes with the sub-skills (answered 3+ times, under 60%) that caused the most trouble.
 */
export function weakAreas(doc) {
  const out = [];
  for (const [key, t] of Object.entries(doc.topics)) {
    const skills = Object.entries(t.skills)
      .filter(([, [a, c]]) => a >= WEAK_SKILL_MIN_ATTEMPTS && (100 * c) / a < WEAK_SKILL_ACCURACY)
      .map(([tag, [a, c]]) => ({ tag, attempts: a, accuracy: Math.round((100 * c) / a) }))
      .sort((x, y) => x.accuracy - y.accuracy);
    const acc = t.att ? (100 * t.cor) / t.att : 100;
    const weakTopic = t.att >= WEAK_TOPIC_MIN_ATTEMPTS && acc < WEAK_TOPIC_ACCURACY;
    if (weakTopic || skills.length) out.push({ key, attempts: t.att, accuracy: Math.round(acc), skills, weakTopic });
  }
  return out.sort((x, y) => x.accuracy - y.accuracy || y.attempts - x.attempts);
}

/** Multiplication facts that need practice: tried at least twice with accuracy under 75%. */
export function weakFacts(doc) {
  return Object.entries(doc.times.facts)
    .filter(([, [a, c]]) => a >= 2 && c / a < 0.75)
    .map(([fact, [a, c]]) => ({ fact, attempts: a, accuracy: Math.round((100 * c) / a) }))
    .sort((x, y) => x.accuracy - y.accuracy);
}

/**
 * Combine an account's saved progress with progress made as a guest in this session
 * (used when a guest signs in to an existing account). Counts add up; nothing is lost.
 */
export function mergeProgress(base, extra) {
  const a = normalizeProgress(base);
  const b = normalizeProgress(extra);
  const out = normalizeProgress(a);
  out.points = a.points + b.points;

  for (const [key, tb] of Object.entries(b.topics)) {
    const ta = out.topics[key];
    if (!ta) {
      out.topics[key] = tb;
      continue;
    }
    ta.done += tb.done;
    ta.doneAt = Math.max(ta.doneAt, tb.doneAt);
    ta.att += tb.att;
    ta.cor += tb.cor;
    ta.tiers = ta.tiers.map(([x, y], i) => [x + tb.tiers[i][0], y + tb.tiers[i][1]]);
    for (const [tag, [x, y]] of Object.entries(tb.skills)) {
      const s = ta.skills[tag] ?? [0, 0];
      ta.skills[tag] = [s[0] + x, s[1] + y];
    }
    ta.last = Math.max(ta.last, tb.last);
    // Keep whichever unfinished quiz is further along.
    if (tb.run && (!ta.run || tb.run.score > ta.run.score)) ta.run = tb.run;
  }

  out.history = a.history.concat(b.history).sort((x, y) => x.t - y.t).slice(-HISTORY_LIMIT);

  for (const [fact, [x, y, ms]] of Object.entries(b.times.facts)) {
    const f = out.times.facts[fact] ?? [0, 0, 0];
    out.times.facts[fact] = [f[0] + x, f[1] + y, f[2] + ms];
  }
  out.times.level = Math.max(a.times.level, b.times.level);
  out.times.rounds = a.times.rounds + b.times.rounds;
  for (const [k, v] of Object.entries(b.times.best)) out.times.best[k] = Math.max(out.times.best[k] ?? 0, v);

  for (const [deck, cards] of Object.entries(b.srs)) {
    const target = out.srs[deck] ?? (out.srs[deck] = {});
    for (const [id, c] of Object.entries(cards)) {
      // The account's own schedule wins; cards only the guest has seen are added.
      if (!target[id]) target[id] = c;
    }
  }
  for (const [game, g] of Object.entries(b.memory)) {
    const cur = out.memory[game] ?? { level: 0, best: 0 };
    out.memory[game] = { level: Math.max(cur.level, g.level), best: Math.max(cur.best, g.best) };
  }
  if (b.placement && (!a.placement || b.placement.at >= a.placement.at)) out.placement = b.placement;
  out.updatedAt = Math.max(a.updatedAt, b.updatedAt);
  return out;
}
