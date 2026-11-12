#!/usr/bin/env node
// Validate lesson content.
//   npm run validate                         every level
//   npm run validate -- g1-5                 one level
//   npm run validate -- g1-5/fractions-intro one topic
//   npm run validate -- --file public/js/content/levels/g1-5/decimals.js   a topic file that is not in its level's index.js yet
//   add --quiet to hide warnings, --seeds 400 for a deeper run
import { LEVELS } from '../public/js/content/index.js';
import { validateTopic } from './lib/validate.mjs';

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const seedsAt = args.indexOf('--seeds');
const seeds = seedsAt >= 0 ? Number(args[seedsAt + 1]) : 150;
const targets = args.filter((a, i) => !a.startsWith('--') && !(seedsAt >= 0 && i === seedsAt + 1) && !(args[i - 1] === '--file'));
const wanted = targets.filter((t) => !/^\d+$/.test(t));

let errorCount = 0;
let warningCount = 0;
let topicCount = 0;

function report(levelId, topic) {
  topicCount += 1;
  const { errors, warnings, stats } = validateTopic(topic, levelId, { seeds });
  errorCount += errors.length;
  warningCount += warnings.length;
  const d = stats.distinct;
  const mark = errors.length ? '✗' : warnings.length ? '!' : '✓';
  console.log(`${mark} ${levelId}/${topic?.id}  ${stats.generators} generators, ${stats.questions} questions checked; distinct per tier: easy ${d.easy ?? 0}, medium ${d.medium ?? 0}, hard ${d.hard ?? 0}, challenge ${d.challenge ?? 0}`);
  for (const e of errors.slice(0, 40)) console.log(`    ERROR   ${e}`);
  if (errors.length > 40) console.log(`    … and ${errors.length - 40} more errors`);
  if (!quiet) {
    for (const w of warnings.slice(0, 15)) console.log(`    warning ${w}`);
    if (warnings.length > 15) console.log(`    … and ${warnings.length - 15} more warnings`);
  }
}

// --file <path>: validate one topic file directly.
const fileAt = args.indexOf('--file');
if (fileAt >= 0) {
  const { pathToFileURL } = await import('node:url');
  const pathMod = await import('node:path');
  const file = pathMod.resolve(args[fileAt + 1] ?? '');
  const levelId = pathMod.basename(pathMod.dirname(file));
  try {
    const topic = (await import(pathToFileURL(file).href)).default;
    if (topic?.id !== pathMod.basename(file, '.js')) {
      console.error(`✗ ${file}: the topic id "${topic?.id}" must match the file name`);
      errorCount += 1;
    }
    report(levelId, topic);
  } catch (e) {
    console.error(`✗ ${file}: could not load (${e.message})`);
    errorCount += 1;
  }
  console.log(`\n${topicCount} topic(s) checked: ${errorCount} error(s), ${warningCount} warning(s).`);
  process.exit(errorCount ? 1 : 0);
}

for (const level of LEVELS) {
  if (wanted.length && !wanted.some((t) => t === level.id || t.startsWith(level.id + '/'))) continue;
  let topics;
  try {
    topics = (await level.load()).default;
  } catch (e) {
    console.error(`✗ ${level.id}: could not load (${e.message})`);
    errorCount += 1;
    continue;
  }
  if (!Array.isArray(topics)) {
    console.error(`✗ ${level.id}: index.js must export an array of topics`);
    errorCount += 1;
    continue;
  }
  const ids = new Set();
  for (const topic of topics) {
    if (wanted.length && !wanted.some((t) => t === level.id || t === `${level.id}/${topic?.id}`)) continue;
    if (ids.has(topic?.id)) {
      console.error(`✗ ${level.id}: duplicate topic id "${topic?.id}"`);
      errorCount += 1;
    }
    ids.add(topic?.id);
    report(level.id, topic);
  }
}

console.log(`\n${topicCount} topic(s) checked: ${errorCount} error(s), ${warningCount} warning(s).`);
if (!topicCount) console.log('Nothing matched. Use a level id such as g1-5, or level/topic such as g1-5/fractions-add-sub.');
process.exit(errorCount ? 1 : 0);
