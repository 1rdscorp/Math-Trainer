#!/usr/bin/env node
// Print sample questions so a person can read them and check the math.
//   npm run sample -- g1-5/fractions-add-sub            3 questions from every generator
//   npm run sample -- g1-5/fractions-add-sub --n 5 --tier hard --seed 9
//   npm run sample -- g1-5/fractions-add-sub --models   also show each interactive model's default output
import { LEVELS } from '../public/js/content/index.js';
import { makeRng } from '../public/js/core/rng.js';
import { TIERS } from '../public/js/core/engine.js';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const target = args.find((a) => a.includes('/') && !a.startsWith('--'));
if (!target) {
  console.error('Usage: npm run sample -- <level>/<topic> [--n 3] [--tier easy|medium|hard|challenge] [--seed 1] [--models]');
  process.exit(1);
}
const [levelId, topicId] = target.split('/');
const level = LEVELS.find((l) => l.id === levelId);
const topic = level && (await level.load()).default.find((t) => t.id === topicId);
if (!topic) {
  console.error(`No topic "${target}".`);
  process.exit(1);
}
const n = Number(opt('n', 3));
const seed = Number(opt('seed', 1));
const onlyTier = opt('tier', null);

console.log(`# ${topic.title}  (${target})\n`);
for (const tier of TIERS) {
  if (onlyTier && onlyTier !== tier.id) continue;
  console.log(`\n══════ ${tier.name.toUpperCase()} ══════`);
  (topic.quiz[tier.id] ?? []).forEach((gen, gi) => {
    console.log(`\n── ${gen.name || `generator ${gi}`} ──`);
    const rng = makeRng(seed * 1000 + gi * 17 + tier.id.length);
    for (let i = 0; i < n; i++) {
      let question;
      try {
        question = gen(rng);
      } catch (e) {
        console.log(`  !! threw: ${e.message}`);
        continue;
      }
      console.log(`  Q: ${question.prompt}`);
      if (question.visual) console.log(`     [visual: ${[].concat(question.visual).map((v) => v.type).join(', ')}]`);
      question.choices.forEach((c, ci) => {
        const note = question.notes?.[ci] ? `   ← ${question.notes[ci]}` : '';
        console.log(`     ${ci === question.answer ? '✓' : '·'} ${c}${note}`);
      });
      console.log(`     solution: ${question.solution.join('  ▸  ')}`);
      if (question.check) console.log(`     check: ${question.check()}`);
      console.log('');
    }
  });
}
if (args.includes('--models')) {
  console.log('\n══════ MODELS (default inputs) ══════');
  for (const model of topic.models ?? []) {
    const values = Object.fromEntries(model.inputs.map((i) => [i.name, i.value]));
    const r = model.compute(values);
    console.log(`\n── ${model.title} ${JSON.stringify(values)} ──`);
    if (r.error) console.log(`  error: ${r.error}`);
    else {
      if (r.problem) console.log(`  problem: ${r.problem}`);
      r.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
      console.log(`  answer: ${r.answer}`);
      if (r.visual) console.log(`  [visual: ${[].concat(r.visual).map((v) => v.type).join(', ')}]`);
    }
  }
}
