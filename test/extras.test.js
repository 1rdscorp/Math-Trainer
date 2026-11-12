import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../public/js/core/rng.js';
import { TIMES_LEVELS, MAX_TIMES_LEVEL, factKey, inLevel, newAtLevel, factsFor, pickFact, describeFact, strategy, wrongAnswers, recordFact, levelChange, mastery } from '../public/js/core/times.js';
import { BOX_DAYS, MAX_BOX, DAY, grade, judge, plan, boxCounts, requeue } from '../public/js/core/srs.js';
import { DECKS } from '../public/js/core/decks.js';
import { MENTAL_LEVELS, mentalProblem, PAIR_LEVELS, pairDeck, staircase } from '../public/js/core/mental.js';
import { emptyProgress } from '../public/js/core/progress.js';

test('times-table levels build up to the whole table in the research-based order', () => {
  assert.deepEqual(TIMES_LEVELS[0].tables, [1, 2, 10]);
  assert.ok(inLevel(2, 7, 0) && inLevel(7, 2, 0));
  assert.ok(!inLevel(7, 8, 3) && inLevel(7, 8, 4));
  assert.ok(inLevel(6, 6, 2), 'squares arrive at level 3');
  assert.ok(newAtLevel(7, 8, 4) && !newAtLevel(2, 7, 4));
  assert.equal(factsFor(MAX_TIMES_LEVEL).length, 78, 'every fact from 1×1 to 12×12 once');
  assert.equal(factsFor(5).length, 78);
  assert.ok(factsFor(0).length < factsFor(1).length);
  assert.equal(factKey(8, 7), '7x8');
});

test('pickFact stays inside the level, avoids recent facts and favours missed ones', () => {
  const rng = makeRng(4);
  const counts = {};
  for (let i = 0; i < 3000; i++) {
    const f = pickFact({ level: 1, stats: { '5x7': [4, 0, 9000] }, recent: ['2x2'], rng });
    assert.ok(inLevel(f.a, f.b, 1));
    assert.equal(f.form, 'product');
    const k = factKey(f.a, f.b);
    assert.notEqual(k, '2x2');
    counts[k] = (counts[k] ?? 0) + 1;
  }
  assert.ok(counts['5x7'] > counts['5x8'], 'a missed fact comes up more often');
  const forms = new Set();
  for (let i = 0; i < 200; i++) forms.add(pickFact({ level: MAX_TIMES_LEVEL, rng }).form);
  assert.deepEqual([...forms].sort(), ['division', 'missing', 'product']);
  for (let i = 0; i < 200; i++) {
    const f = pickFact({ level: 6, tables: [7], rng });
    assert.ok(f.a === 7 || f.b === 7);
    assert.equal(f.form, 'product');
  }
});

test('every fact has a correct question, strategy and wrong answers', () => {
  const rng = makeRng(8);
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      assert.ok(strategy(a, b).includes(String(a * b)), `strategy for ${a}×${b} reaches the product`);
      for (const form of ['product', 'missing', 'division']) {
        const d = describeFact({ a, b, form });
        assert.equal(d.answer, form === 'product' ? a * b : b);
        const wrong = wrongAnswers({ a, b, form }, rng);
        assert.equal(wrong.length, 3);
        assert.equal(new Set([d.answer, ...wrong]).size, 4);
        assert.ok(wrong.every((w) => w > 0));
      }
    }
  }
  assert.match(strategy(7, 8), /14.*28.*56/);
  assert.match(strategy(9, 6), /60 − 6 = 54/);
});

test('fact records, level changes and mastery colours', () => {
  const doc = emptyProgress();
  recordFact(doc, 8, 7, true, 2500);
  recordFact(doc, 7, 8, false, 4000);
  assert.deepEqual(doc.times.facts['7x8'], [2, 1, 6500]);
  assert.equal(mastery(doc.times.facts, 7, 8), 'weak');
  assert.equal(mastery(doc.times.facts, 2, 2), 'none');
  assert.equal(levelChange(2, 12, 11), 1);
  assert.equal(levelChange(2, 9, 9), 0, 'too few answers to move up');
  assert.equal(levelChange(2, 10, 5), -1);
  assert.equal(levelChange(0, 10, 2), 0);
  assert.equal(levelChange(MAX_TIMES_LEVEL, 20, 20), 0);
});

test('Leitner scheduling: gaps grow, a miss returns to box 1, slow answers do not advance', () => {
  const now = 1_000_000;
  let card;
  const boxes = [];
  for (let i = 0; i < 8; i++) {
    card = grade(card, 'fast', now);
    boxes.push(card[0]);
    assert.equal(card[1], now + BOX_DAYS[card[0] - 1] * DAY);
  }
  assert.deepEqual(boxes, [1, 2, 3, 4, 5, 6, 6, 6]);
  assert.deepEqual(BOX_DAYS, [1, 2, 4, 8, 16, 30]);
  assert.deepEqual(grade([4, 0], 'wrong', now), [1, now]);
  assert.deepEqual(grade([3, 0], 'slow', now), [3, now + 4 * DAY]);
  assert.deepEqual(grade(undefined, 'slow', now), [1, now + DAY]);
  assert.equal(judge(true, 3000), 'fast');
  assert.equal(judge(true, 9000), 'slow');
  assert.equal(judge(true, 9000, 0), 'fast', 'speed grading can be switched off');
  assert.equal(judge(false, 100), 'wrong');
  assert.equal(MAX_BOX, 6);
});

test('a session takes due cards first, then a limited number of new ones in deck order', () => {
  const deck = { cards: Array.from({ length: 30 }, (_, i) => ({ id: `c${i}` })) };
  const now = 10 * DAY;
  const state = { c5: [2, now - DAY], c6: [1, now - 3 * DAY], c7: [3, now + 5 * DAY] };
  const p = plan(deck, state, now);
  assert.deepEqual(p.queue.slice(0, 2), ['c6', 'c5'], 'most overdue first');
  assert.deepEqual(p.queue.slice(2), ['c0', 'c1', 'c2', 'c3', 'c4', 'c8', 'c9', 'c10'], '8 new cards, easiest first');
  assert.equal(p.due, 2);
  assert.equal(p.fresh, 27);
  assert.equal(p.learned, 3);
  assert.equal(p.nextDue, now + 5 * DAY);
  assert.deepEqual(boxCounts(deck, state), [27, 1, 1, 1, 0, 0, 0]);
  assert.deepEqual(requeue(['a', 'b', 'c', 'd'], 'x'), ['a', 'b', 'c', 'x', 'd']);
  assert.deepEqual(requeue(['a'], 'x'), ['a', 'x']);
});

test('flashcard decks: unique ids, correct answers, easy cards first', () => {
  assert.equal(DECKS.length, 7);
  for (const deck of DECKS) {
    assert.equal(new Set(deck.cards.map((c) => c.id)).size, deck.cards.length, `${deck.id} ids are unique`);
    assert.ok(deck.cards.length >= 20, `${deck.id} has enough cards`);
    for (const c of deck.cards) assert.ok(Number.isFinite(c.answer) && typeof c.front === 'string');
  }
  const by = (id) => DECKS.find((d) => d.id === id);
  for (const c of by('add').cards) { const [a, b] = c.id.split('+').map(Number); assert.equal(c.answer, a + b); }
  for (const c of by('sub').cards) { const [a, b] = c.id.split('-').map(Number); assert.equal(c.answer, a - b); assert.ok(c.answer >= 1 && c.answer <= 10); }
  for (const c of by('mul').cards) { const [a, b] = c.id.split('x').map(Number); assert.equal(c.answer, a * b); }
  for (const c of by('div').cards) { const [p, a] = c.id.split('d').map(Number); assert.equal(c.answer * a, p); }
  assert.equal(by('mul').cards.length, 78);
  assert.ok(by('mul').cards.slice(0, 20).every((c) => /^(1|2)x|x(10)$|^10x/.test(c.id) || c.id.includes('x10') || c.id.startsWith('1x') || c.id.startsWith('2x')), 'the multiplication deck starts with ×1, ×2 and ×10');
  const half = by('fractions').cards.find((c) => c.id === 'p1/2');
  assert.equal(half.answer, 50);
  assert.equal(by('fractions').cards.find((c) => c.id === 'd3/8').answer, 0.375);
  assert.equal(by('fractions').cards.find((c) => c.id === 'p1/8').answer, 12.5);
});

test('mental-math problems are correct whole-number problems at every level', () => {
  const rng = makeRng(21);
  for (let level = 0; level < MENTAL_LEVELS.length; level++) {
    for (let i = 0; i < 300; i++) {
      const p = mentalProblem(level, rng);
      assert.ok(Number.isInteger(p.answer) && p.answer >= 0, `${p.text} = ${p.answer}`);
      const m = p.text.match(/^(\d+) ([+−×÷]) (\d+)$/);
      if (m) {
        const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
        const want = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
        assert.equal(p.answer, want, p.text);
      }
    }
  }
});

test('matching-pair decks have the right size and no ambiguous matches', () => {
  const rng = makeRng(3);
  for (let level = 0; level < PAIR_LEVELS.length; level++) {
    for (let i = 0; i < 40; i++) {
      const cards = pairDeck(level, rng);
      assert.equal(cards.length, PAIR_LEVELS[level].pairs * 2);
      assert.equal(new Set(cards.map((c) => c.text)).size, cards.length, 'no two cards show the same text');
      const perPair = {};
      for (const c of cards) perPair[c.pair] = (perPair[c.pair] ?? 0) + 1;
      assert.ok(Object.values(perPair).every((n) => n === 2));
    }
  }
});

test('staircase: two successes move up, two failures move down, within bounds', () => {
  let s = { level: 0, up: 0, down: 0 };
  s = staircase(s, true, 5);
  assert.equal(s.change, 0);
  s = staircase(s, true, 5);
  assert.deepEqual([s.level, s.change, s.up], [1, 1, 0]);
  s = staircase(s, false, 5);
  s = staircase(s, false, 5);
  assert.deepEqual([s.level, s.change], [0, -1]);
  s = staircase(s, false, 5);
  s = staircase(s, false, 5);
  assert.equal(s.level, 0);
  s = { level: 5, up: 1, down: 0 };
  assert.equal(staircase(s, true, 5).level, 5);
});
