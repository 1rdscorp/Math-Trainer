import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../public/js/content/index.js';
import { CATALOG } from '../public/js/content/catalog.js';
import { buildCatalog } from '../scripts/build-catalog.mjs';
import { validateTopic } from '../scripts/lib/validate.mjs';
import { RUNGS } from '../public/js/core/placement.js';
import { TIERS } from '../public/js/core/engine.js';
import { makeRng } from '../public/js/core/rng.js';
import { toSpeech } from '../public/js/core/speech-text.js';

const loaded = new Map();
for (const level of LEVELS) loaded.set(level.id, (await level.load()).default);

test('every level has topics, with unique ids', () => {
  for (const level of LEVELS) {
    const topics = loaded.get(level.id);
    assert.ok(Array.isArray(topics) && topics.length >= 8, `${level.id} has ${topics?.length} topics`);
    assert.equal(new Set(topics.map((t) => t.id)).size, topics.length, `${level.id} topic ids are unique`);
  }
});

test('the catalogue matches the topic files (run `npm run catalog` after changing topics)', async () => {
  assert.deepEqual(CATALOG, await buildCatalog());
});

test('every placement rung can draw questions from topics that exist', () => {
  for (const rung of RUNGS) {
    const topics = loaded.get(rung.level);
    for (const [topicId, tier] of rung.sources) {
      const topic = topics.find((t) => t.id === topicId);
      assert.ok(topic, `${rung.level}/${topicId} exists`);
      assert.ok(topic.quiz[tier]?.length, `${rung.level}/${topicId} has ${tier} questions`);
    }
  }
});

for (const level of LEVELS) {
  test(`${level.title}: every topic passes content validation`, () => {
    const problems = [];
    for (const topic of loaded.get(level.id)) {
      const { errors } = validateTopic(topic, level.id, { seeds: 30, fuzz: 25 });
      problems.push(...errors);
    }
    assert.deepEqual(problems.slice(0, 20), [], `${problems.length} content error(s) in ${level.id}`);
  });
}

test('every question can be read out: prompts and choices turn into plain words', () => {
  const leftovers = [];
  for (const level of LEVELS) {
    for (const topic of loaded.get(level.id)) {
      for (const tier of TIERS) {
        (topic.quiz[tier.id] ?? []).forEach((gen, gi) => {
          const rng = makeRng(1000 + gi);
          for (let i = 0; i < 4; i++) {
            let question;
            try {
              question = gen(rng);
            } catch {
              continue; // reported by the validation test above
            }
            for (const text of [question.prompt, ...question.choices]) {
              const words = toSpeech(text);
              if (!words || /[\\{}]/.test(words)) leftovers.push(`${level.id}/${topic.id} ${tier.id}: "${text}" → "${words}"`);
            }
          }
        });
      }
    }
  }
  assert.deepEqual(leftovers.slice(0, 10), [], `${leftovers.length} text(s) could not be turned into words`);
});
