import test from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, TARGET_SCORE, newQuizState, applyAnswer, nextQuestion, toNextTier, accuracy } from '../public/js/core/engine.js';
import { makeRng } from '../public/js/core/rng.js';

const play = (state, answers) => answers.reduce((s, a) => applyAnswer(s, a).state, state);

test('scoring table matches the spec', () => {
  assert.deepEqual(TIERS.map((t) => [t.name, t.right, t.wrong]), [
    ['Easy', 5, 2], ['Medium', 10, 4], ['Hard', 15, 6], ['Challenge', 20, 8],
  ]);
  assert.equal(TARGET_SCORE, 100);
});

test('quiz starts at Easy with 0 points', () => {
  const s = newQuizState();
  assert.equal(s.tier, 0);
  assert.equal(s.score, 0);
  assert.equal(toNextTier(s), 3);
});

test('3 correct in a row moves up exactly one tier and resets the streak', () => {
  let s = newQuizState();
  let r = applyAnswer(s, true);
  assert.equal(r.delta, 5);
  assert.equal(r.tierChange, 0);
  r = applyAnswer(r.state, true);
  assert.equal(r.tierChange, 0);
  assert.equal(toNextTier(r.state), 1);
  r = applyAnswer(r.state, true);
  assert.equal(r.tierChange, 1);
  assert.equal(r.state.tier, 1);
  assert.equal(r.state.up, 0);
  assert.equal(r.state.score, 15);
  // The next correct answer is worth Medium points and does not move up again yet.
  r = applyAnswer(r.state, true);
  assert.equal(r.delta, 10);
  assert.equal(r.state.tier, 1);
});

test('a wrong answer breaks the correct streak', () => {
  const s = play(newQuizState(), [true, true, false, true, true]);
  assert.equal(s.tier, 0);
  assert.equal(s.up, 2);
  assert.equal(applyAnswer(s, true).state.tier, 1);
});

test('2 wrong in a row moves down exactly one tier', () => {
  let s = play(newQuizState(), [true, true, true, true, true, true]); // now Hard, 45 points
  assert.equal(s.tier, 2);
  assert.equal(s.score, 45);
  let r = applyAnswer(s, false);
  assert.equal(r.delta, -6);
  assert.equal(r.tierChange, 0);
  r = applyAnswer(r.state, false);
  assert.equal(r.delta, -6);
  assert.equal(r.tierChange, -1);
  assert.equal(r.state.tier, 1);
  assert.equal(r.state.down, 0);
  assert.equal(r.state.score, 33);
  // One more wrong answer is not enough to drop again.
  r = applyAnswer(r.state, false);
  assert.equal(r.delta, -4);
  assert.equal(r.state.tier, 1);
});

test('a correct answer breaks the wrong streak', () => {
  const s = play(newQuizState(), [true, true, true, false, true, false]);
  assert.equal(s.tier, 1);
  assert.equal(s.down, 1);
});

test('score never drops below 0 and delta reports what was really removed', () => {
  let r = applyAnswer(newQuizState(), false);
  assert.equal(r.state.score, 0);
  assert.equal(r.delta, 0);
  const s = play(newQuizState(), [true]); // 5 points at Easy... then drop from a higher tier
  const high = { ...s, tier: 3, score: 5 };
  r = applyAnswer(high, false);
  assert.equal(r.state.score, 0);
  assert.equal(r.delta, -5);
});

test('cannot go below Easy or above Challenge', () => {
  let s = play(newQuizState(), [false, false, false, false]);
  assert.equal(s.tier, 0);
  s = play(newQuizState(), Array(9).fill(true)); // 15 + 30 + 45 = 90, now Challenge
  assert.equal(s.tier, 3);
  assert.equal(s.score, 90);
  assert.equal(toNextTier(s), 0);
  const r = applyAnswer(s, true);
  assert.equal(r.state.tier, 3);
  assert.equal(r.state.score, 110);
  assert.equal(r.done, true);
});

test('fastest possible finish is 10 questions; quiz is done at 100 points and then frozen', () => {
  let s = newQuizState();
  let n = 0;
  while (!s.done) {
    s = applyAnswer(s, true).state;
    n++;
  }
  assert.equal(n, 10);
  assert.ok(s.score >= 100);
  const after = applyAnswer(s, false);
  assert.equal(after.state.score, s.score);
  assert.equal(after.delta, 0);
});

test('counts answered/correct and tracks the highest tier reached', () => {
  const s = play(newQuizState(), [true, true, true, false, false]);
  assert.equal(s.answered, 5);
  assert.equal(s.correct, 3);
  assert.equal(s.maxTier, 1);
  assert.equal(s.tier, 0);
  assert.equal(accuracy(s.correct, s.answered), 60);
  assert.equal(accuracy(0, 0), null);
});

const fakeTopic = (poolSize) => {
  const gen = (rng) => {
    const n = rng.int(1, poolSize);
    return { prompt: `What is ${n} + 1?`, choices: [`${n + 1}`, `${n}`, `${n + 2}`, `${n + 3}`], answer: 0, solution: ['add one'] };
  };
  return { id: 'fake', quiz: { easy: [gen, gen], medium: [gen], hard: [gen], challenge: [gen] } };
};

test('questions do not repeat within a run', () => {
  const topic = fakeTopic(40);
  const rng = makeRng(7);
  let state = newQuizState();
  const prompts = new Set();
  for (let i = 0; i < 40; i++) {
    const r = nextQuestion(topic, state, rng);
    state = r.state;
    assert.ok(!prompts.has(r.question.prompt), `repeat at draw ${i}: ${r.question.prompt}`);
    prompts.add(r.question.prompt);
  }
  assert.equal(state.asked.length, 40);
});

test('an exhausted pool reuses a question instead of stalling', () => {
  const topic = fakeTopic(3);
  const rng = makeRng(3);
  let state = newQuizState();
  for (let i = 0; i < 8; i++) state = nextQuestion(topic, state, rng).state;
  assert.equal(state.asked.length, 3);
});

test('choices are shuffled and correctIndex points at the right answer', () => {
  const topic = fakeTopic(500);
  const rng = makeRng(99);
  let state = newQuizState();
  const positions = new Set();
  for (let i = 0; i < 60; i++) {
    const r = nextQuestion(topic, state, rng);
    state = r.state;
    const n = Number(r.question.prompt.match(/\d+/)[0]);
    assert.equal(r.question.choices[r.question.correctIndex], String(n + 1));
    assert.equal(new Set(r.question.choices).size, 4);
    assert.equal(r.question.tier, 'easy');
    positions.add(r.question.correctIndex);
  }
  assert.equal(positions.size, 4, 'correct answer should appear in every position over time');
});

test('a generator that throws or returns junk is skipped', () => {
  const good = () => ({ prompt: 'ok?', choices: ['a', 'b', 'c', 'd'], answer: 2, solution: [] });
  const bad = () => { throw new Error('boom'); };
  const junk = () => ({ prompt: 'x', choices: ['a'], answer: 0 });
  const topic = { id: 't', quiz: { easy: [bad, junk, good] } };
  const warn = console.warn;
  console.warn = () => {};
  try {
    const r = nextQuestion(topic, newQuizState(), makeRng(1));
    assert.equal(r.question.prompt, 'ok?');
    assert.equal(r.question.choices[r.question.correctIndex], 'c');
  } finally {
    console.warn = warn;
  }
});

test('after a miss, the same kind of question comes back two questions later with new numbers', () => {
  const mk = (tag) => (rng) => {
    const n = rng.int(1, 100000);
    return { prompt: `${tag} ${n}`, choices: ['a', 'b', 'c', 'd'], answer: 0, solution: [] };
  };
  const topic = { id: 'rv', quiz: { easy: [mk('A'), mk('B'), mk('C'), mk('D')] } };
  for (let seed = 1; seed <= 40; seed++) {
    const rng = makeRng(seed);
    let state = newQuizState();
    let r = nextQuestion(topic, state, rng);
    const missedKind = r.question.prompt[0];
    const missedPrompt = r.question.prompt;
    state = applyAnswer(r.state, false).state; // miss question 1
    r = nextQuestion(topic, state, rng); // question 2: something else
    assert.notEqual(r.question.prompt[0], missedKind, 'the very next question is a different kind');
    state = applyAnswer(r.state, true).state;
    r = nextQuestion(topic, state, rng); // question 3: the missed kind returns
    assert.equal(r.question.prompt[0], missedKind);
    assert.notEqual(r.question.prompt, missedPrompt, 'with new numbers, not the same question');
    assert.equal(r.state.review, null);
  }
});

test('per-choice notes follow their choices through the shuffle', () => {
  const gen = () => ({ prompt: 'p', choices: ['right', 'w1', 'w2', 'w3'], notes: [null, 'note1', null, 'note3'], answer: 0, solution: [] });
  const topic = { id: 'n', quiz: { easy: [gen] } };
  const { question } = nextQuestion(topic, newQuizState(), makeRng(5));
  question.choices.forEach((c, i) => {
    const want = c === 'w1' ? 'note1' : c === 'w3' ? 'note3' : null;
    assert.equal(question.notes[i], want);
  });
});
