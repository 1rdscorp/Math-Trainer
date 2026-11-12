import test from 'node:test';
import assert from 'node:assert/strict';
import { RUNGS, STARTS, MAX_PLACEMENT_QUESTIONS, startPlacement, advance, placementResult } from '../public/js/core/placement.js';
import { LEVELS } from '../public/js/content/index.js';

const ALL = RUNGS.map((_, i) => i);

/** Run the search for a student who truly knows every rung below `ability`. */
function simulate(ability, startRung, usable = ALL) {
  let s = startPlacement(startRung, usable);
  let guard = 0;
  while (!s.done && guard++ < 50) {
    const rung = s.usable[s.pos];
    const passed = rung < ability;
    s = advance(s, passed, passed ? 2 : 1);
  }
  assert.ok(s.done, 'search finishes');
  return { ...placementResult(s), asked: s.asked };
}

test('every rung points at a real level, and the ladder climbs through the levels in order', () => {
  const order = LEVELS.map((l) => l.id);
  let last = 0;
  for (const rung of RUNGS) {
    const i = order.indexOf(rung.level);
    assert.ok(i >= 0, `${rung.level} exists`);
    assert.ok(i >= last, 'levels never go backwards');
    last = i;
    assert.ok(rung.sources.length >= 1);
  }
  assert.deepEqual([...new Set(RUNGS.map((r) => r.level))], order, 'every level has at least one rung');
  for (const s of STARTS) assert.ok(s.rung >= 0 && s.rung < RUNGS.length);
});

test('the search finds the first rung a student has not mastered, from any starting point', () => {
  for (let ability = 0; ability <= RUNGS.length; ability++) {
    for (const start of STARTS) {
      const r = simulate(ability, start.rung);
      if (ability === RUNGS.length) {
        assert.equal(r.toppedOut, true);
        assert.equal(r.rung, RUNGS.length - 1);
      } else {
        assert.equal(r.toppedOut, false, `ability ${ability} from ${start.id}`);
        assert.equal(r.rung, ability, `ability ${ability} from ${start.id} placed at ${r.rung}`);
      }
      assert.equal(r.passed, ability > 0 ? ability - 1 : null);
      assert.ok(r.asked <= MAX_PLACEMENT_QUESTIONS + 1, `short: ${r.asked} questions`);
    }
  }
});

test('the quiz stays short', () => {
  let worst = 0;
  let total = 0;
  let n = 0;
  for (let ability = 0; ability <= RUNGS.length; ability++) {
    for (const start of STARTS) {
      const { asked } = simulate(ability, start.rung);
      worst = Math.max(worst, asked);
      total += asked;
      n += 1;
    }
  }
  assert.ok(worst <= 15, `worst case ${worst} questions`);
  assert.ok(total / n <= 9, `average ${total / n} questions`);
});

test('missing rungs are skipped cleanly', () => {
  const usable = [0, 4, 8, 12];
  for (const ability of [0, 3, 5, 9, 13, 15]) {
    const r = simulate(ability, 6, usable);
    const expected = usable.find((u) => u >= ability);
    if (expected == null) assert.equal(r.toppedOut, true);
    else assert.equal(r.rung, expected);
  }
  assert.throws(() => startPlacement(3, []));
});

test('stopping early never claims the top level', () => {
  let s = startPlacement(5, ALL);
  let r = placementResult(s);
  assert.equal(r.toppedOut, false);
  assert.equal(r.rung, 5, 'with no answers yet, suggest the rung the student chose');
  assert.equal(r.certain, false);
  s = advance(s, true, 2); // passed rung 5, then stopped
  r = placementResult(s);
  assert.equal(r.toppedOut, false);
  assert.equal(r.rung, 6);
  assert.equal(r.passed, 5);
  assert.equal(r.certain, false);
});
