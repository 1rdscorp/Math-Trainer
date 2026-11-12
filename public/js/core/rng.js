// Small seeded random number generator (mulberry32).
// Seeding makes quizzes reproducible in tests; in the app each quiz gets a fresh seed.

export function randomSeed() {
  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return (Math.floor(Math.random() * 2 ** 32) ^ Date.now()) >>> 0;
}

export function makeRng(seed = randomSeed()) {
  let s = seed >>> 0;

  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng = {
    seed: seed >>> 0,

    /** A float in [0, 1). */
    next,

    /** A float in [lo, hi). */
    float(lo = 0, hi = 1) {
      return lo + (hi - lo) * next();
    },

    /** An integer in [lo, hi], both ends included. */
    int(lo, hi) {
      if (!Number.isInteger(lo) || !Number.isInteger(hi)) throw new TypeError(`rng.int needs integers, got ${lo}, ${hi}`);
      if (hi < lo) [lo, hi] = [hi, lo];
      return lo + Math.floor(next() * (hi - lo + 1));
    },

    /** An integer in [lo, hi] that is not 0. */
    nonzero(lo, hi) {
      return rng.intExcept(lo, hi, [0]);
    },

    /** An integer in [lo, hi] that is not in `exclude`. */
    intExcept(lo, hi, exclude = []) {
      if (hi < lo) [lo, hi] = [hi, lo];
      const banned = new Set(exclude);
      const allowed = [];
      for (let v = lo; v <= hi; v++) if (!banned.has(v)) allowed.push(v);
      if (!allowed.length) throw new RangeError(`rng.intExcept: nothing left in [${lo}, ${hi}]`);
      return allowed[Math.floor(next() * allowed.length)];
    },

    /** True with probability p. */
    bool(p = 0.5) {
      return next() < p;
    },

    /** +1 or −1. */
    sign() {
      return next() < 0.5 ? -1 : 1;
    },

    /** One element of a non-empty array. */
    pick(list) {
      if (!list?.length) throw new RangeError('rng.pick: empty list');
      return list[Math.floor(next() * list.length)];
    },

    /** A shuffled copy (the input is not changed). */
    shuffle(list) {
      const a = list.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },

    /** k distinct elements, in random order. */
    sample(list, k) {
      if (k > list.length) throw new RangeError(`rng.sample: asked for ${k} of ${list.length}`);
      return rng.shuffle(list).slice(0, k);
    },
  };

  return rng;
}

/** Stable short hash of a string (cyrb53), used to remember which questions were asked. */
export function hashString(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
