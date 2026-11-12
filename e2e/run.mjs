#!/usr/bin/env node
// End-to-end checks in a real browser (Chromium via Playwright).
//
//   npm run e2e
//
// Starts two copies of the server on spare ports (one with the account API, one without, which is
// how the app behaves on static hosting) and drives the app the way a student would: lessons,
// a whole quiz to 100 points, wrong answers, the extras, guest and signed-in progress, keyboard use,
// phone and desktop sizes, and an automated accessibility audit (axe-core) in light and dark.
//
// Playwright is not a dependency of this project. Install it once with `npm i -D playwright`
// (and `npx playwright install chromium`), or run where it is already available.

import { createRequire } from 'node:module';
import { mkdtemp, rm, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/server.js';
import { makeRng } from '../public/js/core/rng.js';
import { newQuizState, applyAnswer, nextQuestion, TIERS } from '../public/js/core/engine.js';
import { LEVELS } from '../public/js/content/index.js';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is not installed. Run `npm i -D playwright && npx playwright install chromium` first.');
  process.exit(2);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const shots = process.argv.includes('--shots');
await mkdir(OUT, { recursive: true });

const dataDir = await mkdtemp(path.join(tmpdir(), 'mt-e2e-'));
const withApi = createApp({ dataDir, scryptCost: 1024 });
const staticOnly = createApp({ accounts: false });
await withApi.init();
const listen = (app) => new Promise((resolve) => app.server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${app.server.address().port}/`)));
const BASE = await listen(withApi);
const STATIC = await listen(staticOnly);

const browser = await chromium.launch();
const failures = [];
let checks = 0;
const ok = (cond, message) => {
  checks += 1;
  if (!cond) {
    failures.push(message);
    console.log(`  ✗ ${message}`);
  }
};

const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 375, height: 760 };

async function open(base, viewport = DESKTOP, { theme } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: theme ?? 'light' });
  const page = await context.newPage();
  page.on('console', (m) => {
    // A refused sign-in is reported by the browser as a failed request; the tests cause some on purpose.
    if (/status of (400|401)/.test(m.text())) return;
    if (m.type() === 'error' || m.type() === 'warning') failures.push(`console ${m.type()} on ${page.url()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => failures.push(`page error on ${page.url()}: ${e.message}`));
  const go = async (hash) => {
    await page.goto(`${base}#${hash}`);
    await page.waitForSelector(`main[data-route="${hash.split('?')[0]}"] h1`);
  };
  return { context, page, go };
}

async function audit(page, label) {
  await page.evaluate(axeSource);
  const result = await page.evaluate(() => globalThis.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
  for (const v of result.violations) {
    const where = v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ');
    ok(false, `a11y [${label}] ${v.id} (${v.impact}): ${v.help} → ${where}`);
  }
  checks += 1;
}

async function noSidewaysScroll(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 1, `[${label}] page is ${overflow}px wider than the screen`);
}

/** Mirror the quiz in Node (same seed, same engine) so the test knows the right answer. */
async function quizOracle(levelId, topicId, seed) {
  const topics = (await LEVELS.find((l) => l.id === levelId).load()).default;
  const topic = topics.find((t) => t.id === topicId);
  const rng = makeRng(seed);
  let state = newQuizState();
  let question = null;
  return {
    next() {
      const r = nextQuestion(topic, state, rng);
      question = r.question;
      state = r.state;
      return question;
    },
    answer(correct) {
      const r = applyAnswer(state, correct);
      state = r.state;
      return r;
    },
    get state() {
      return state;
    },
  };
}

async function answer(page, index) {
  await page.locator(`label[for="choice-${index}"]`).click();
  await page.click('button[type=submit]');
  await page.waitForSelector('.feedback h3');
}

console.log('1. Lessons, pictures and interactive models');
{
  const { context, page, go } = await open(BASE);
  await go('/');
  ok((await page.locator('.hero h1').innerText()).length > 0, 'home page shows a heading');
  ok(await page.locator('text=You are practising as a guest').first().isVisible(), 'guests are told their progress is not kept');
  ok((await page.locator('#levels .card-link').count()) === 9, 'nine levels are listed');
  await audit(page, 'home');

  await go('/level/g1-5');
  ok((await page.locator('.topic-list li').count()) >= 1, 'level page lists topics');
  await audit(page, 'level');

  await go('/topic/g1-5/fractions-add-sub/learn');
  ok((await page.locator('.rule').count()) >= 3, 'rules are shown');
  ok((await page.locator('.katex').count()) > 5, 'math is typeset');
  ok((await page.locator('svg.viz').count()) >= 1, 'the explanation has a picture');
  await audit(page, 'learn');

  await go('/topic/g1-5/fractions-add-sub/examples');
  const first = page.locator('section.card').first();
  ok((await first.locator('.steps li').count()) === 0, 'example steps start hidden');
  await first.locator('button:has-text("Show the first step")').click();
  ok((await first.locator('.steps li').count()) === 1, 'one step is revealed at a time');
  await first.locator('button:has-text("Show all steps")').click();
  ok(await first.locator('.answer-line').isVisible(), 'the answer appears after the last step');
  ok((await page.locator('text=Word problem').count()) >= 1, 'a word problem is marked');
  await audit(page, 'examples');

  await go('/topic/g1-5/fractions-add-sub/try');
  const model = page.locator('section.card').first();
  const before = await model.locator('.answer-line').innerText();
  await model.locator('input').nth(0).fill('2');
  await model.locator('input').nth(1).fill('5');
  await page.waitForTimeout(50);
  const after = await model.locator('.answer-line').innerText();
  ok(before !== after, 'typing new numbers updates the answer live');
  ok((await model.locator('.steps li').count()) >= 2, 'the model shows steps');
  ok((await model.locator('svg.viz').count()) >= 1, 'the model shows a picture');
  await model.locator('input').nth(1).fill('0');
  ok(await model.locator('.notice-warn').isVisible(), 'an impossible number gets a friendly message');
  await model.locator('input').nth(1).fill('abc');
  ok(await model.locator('.notice-warn').isVisible(), 'text in a number box gets a friendly message');
  await audit(page, 'try it');
  await context.close();
}

console.log('2. A whole quiz: tiers, scoring, no repeats, completion');
{
  const { context, page, go } = await open(BASE);
  const seed = 4242;
  const oracle = await quizOracle('algebra-1', 'linear-equations', seed);
  await go(`/topic/algebra-1/linear-equations/quiz?seed=${seed}`);
  await page.waitForSelector('.choices');
  ok((await page.locator('.tier-ladder li.current').innerText()).startsWith('Easy'), 'the quiz starts at Easy');
  ok((await page.locator('.score-num').innerText()).startsWith('0'), 'the quiz starts at 0 points');
  await audit(page, 'quiz question');

  const prompts = new Set();
  let n = 0;
  while (true) {
    const q = oracle.next();
    const shown = await page.locator('#quiz-prompt').innerText();
    ok(!prompts.has(shown), `question ${n + 1} repeats an earlier one`);
    prompts.add(shown);
    await answer(page, q.correctIndex);
    const r = oracle.answer(true);
    n += 1;
    ok((await page.locator('.feedback .delta').innerText()).includes(`+${r.delta}`), `question ${n} awards +${r.delta}`);
    ok((await page.locator('.score-num').innerText()).startsWith(String(oracle.state.score)), `score is ${oracle.state.score} after question ${n}`);
    if (n === 1) await audit(page, 'quiz feedback (correct)');
    if (r.tierChange === 1) ok((await page.locator('.tier-ladder li.current').innerText()).includes(TIERS[oracle.state.tier].name), `moved up to ${TIERS[oracle.state.tier].name} after 3 in a row`);
    await page.locator('.feedback .btn-primary').click();
    if (r.done) break;
    await page.waitForSelector('#quiz-prompt');
  }
  ok(n === 10, `a perfect run finishes in 10 questions (took ${n})`);
  ok(await page.locator('text=You reached 100 points!').isVisible(), 'the completion screen appears at 100 points');
  await audit(page, 'quiz complete');
  if (shots) await page.screenshot({ path: path.join(OUT, 'complete-desktop.png'), fullPage: true });

  await go('/progress');
  ok(await page.locator('text=✓ Completed').first().isVisible(), 'the finished quiz is in the history');
  ok((await page.locator('.stat b').first().innerText()) === '110', 'total points are shown');
  await audit(page, 'progress');
  await go('/level/algebra-1');
  ok(await page.locator('.topic-num.done').first().isVisible(), 'the topic is marked completed');
  await context.close();
}

console.log('3. Wrong answers: explanation, penalty, floor at 0, tier down');
{
  const { context, page, go } = await open(BASE, PHONE);
  const seed = 99;
  const oracle = await quizOracle('g1-5', 'fractions-add-sub', seed);
  await go(`/topic/g1-5/fractions-add-sub/quiz?seed=${seed}`);
  await page.waitForSelector('.choices');
  const wrong = (q) => (q.correctIndex + 1) % 4;

  let q = oracle.next();
  await answer(page, wrong(q));
  let r = oracle.answer(false);
  ok(r.delta === 0 && (await page.locator('.score-num').innerText()).startsWith('0'), 'the score does not drop below 0');
  ok(await page.locator('.feedback .answer-line').isVisible(), 'the correct answer is shown after a miss');
  ok((await page.locator('.feedback .rule').count()) === 1, 'the rule is explained again after a miss');
  ok((await page.locator('.feedback .steps li').count()) >= 1, 'a worked solution is shown after a miss');
  ok(await page.locator('.choice.is-wrong .mark').isVisible(), 'the chosen wrong answer is labelled in words');
  await audit(page, 'quiz feedback (wrong, phone)');
  await noSidewaysScroll(page, 'quiz feedback phone');
  if (shots) await page.screenshot({ path: path.join(OUT, 'quiz-wrong-phone.png'), fullPage: true });
  await page.locator('.feedback .btn-primary').click();

  // Three right → Medium, then two wrong → back to Easy with the Medium penalty applied.
  for (let i = 0; i < 3; i++) {
    q = oracle.next();
    await answer(page, q.correctIndex);
    r = oracle.answer(true);
    await page.locator('.feedback .btn-primary').click();
  }
  ok(oracle.state.tier === 1 && (await page.locator('.tier-ladder li.current').innerText()).startsWith('Medium'), 'three in a row moves up to Medium');
  for (let i = 0; i < 2; i++) {
    q = oracle.next();
    await answer(page, wrong(q));
    r = oracle.answer(false);
    ok((await page.locator('.feedback .delta').innerText()).includes('4'), 'a Medium miss costs 4 points');
    if (i === 0) await page.locator('.feedback .btn-primary').click();
  }
  ok(r.tierChange === -1 && (await page.locator('.tier-ladder li.current').innerText()).startsWith('Easy'), 'two wrong in a row moves down to Easy');
  ok((await page.locator('.score-num').innerText()).startsWith('7'), 'score is 15 − 4 − 4 = 7');

  // Guest progress survives a refresh in the same tab…
  await page.reload();
  await page.waitForSelector('.choices');
  ok((await page.locator('.score-num').innerText()).startsWith('7'), 'a refresh keeps the guest quiz (same tab)');
  ok(await page.locator('text=picking up where you left off').isVisible(), 'the student is told the quiz resumed');
  await context.close();

  // …but not closing the app.
  const fresh = await open(BASE, PHONE);
  await fresh.go('/progress');
  ok((await fresh.page.locator('.stat b').first().innerText()) === '0', 'a new visit starts with no guest progress');
  await fresh.context.close();
}

console.log('4. Keyboard only');
{
  const { context, page, go } = await open(BASE);
  await go('/topic/calculus-1/derivative-rules/quiz?seed=7');
  await page.waitForSelector('.choices');
  await page.keyboard.press('b');
  ok(await page.locator('#choice-1').isChecked(), 'pressing B selects the second answer');
  await page.keyboard.press('3');
  ok(await page.locator('#choice-2').isChecked(), 'pressing 3 selects the third answer');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.feedback h3');
  ok(await page.evaluate(() => document.activeElement?.closest('.feedback') != null), 'focus moves to the feedback');
  await page.keyboard.press('Tab');
  for (let i = 0; i < 6 && !(await page.evaluate(() => document.activeElement?.classList.contains('btn-primary'))); i++) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#quiz-prompt');
  ok(await page.evaluate(() => document.activeElement?.id === 'quiz-question-title'), 'focus moves to the next question');
  // Skip link: the first stop on a freshly loaded page.
  await go('/');
  await page.reload();
  await page.waitForSelector('main[data-route="/"] h1');
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => document.activeElement?.id === 'skip-link'), 'the first Tab stop is the skip link');
  await context.close();
}

console.log('5. Placement quiz, times table, memory training');
{
  const { context, page, go } = await open(BASE, PHONE);
  await go('/placement');
  await audit(page, 'placement intro');
  await page.click('button:has-text("Grades 3–5")');
  await page.waitForSelector('.choices');
  await audit(page, 'placement question');
  for (let i = 0; i < 16; i++) {
    await page.locator('.place-actions:visible, button:has-text("Take the placement quiz again")').first().waitFor();
    if (await page.locator('button:has-text("Take the placement quiz again")').count()) break;
    await page.click('button:has-text("I have not learned this yet")');
    await page.locator('[role=status] .btn-primary').click();
  }
  ok(await page.locator('text=Take the placement quiz again').isVisible(), 'the placement quiz ends with a suggestion');
  ok((await page.locator('main h2').first().innerText()).includes('Grades 1–5'), 'saying "not learned yet" places the student at the first level');
  await audit(page, 'placement result');
  await noSidewaysScroll(page, 'placement result');

  await go('/times-table');
  await page.click('button[data-a="7"][data-b="8"]');
  ok((await page.locator('.big-fact').first().innerText()).includes('7 × 8 = 56'), 'tapping a cell shows the fact');
  await page.locator('button[data-a="7"][data-b="8"]').focus();
  await page.keyboard.press('ArrowRight');
  ok((await page.locator('.big-fact').first().innerText()).includes('7 × 9 = 63'), 'arrow keys move around the table');
  await audit(page, 'times table');
  await noSidewaysScroll(page, 'times table');

  await go('/times-table/practice');
  await audit(page, 'times practice set-up');
  await page.click('form button[type=submit]');
  for (let i = 0; i < 3; i++) {
    const t = await page.locator('#tt-fact').innerText();
    const m = t.match(/^(\d+) × (\d+)/);
    await page.fill('.answer-input', String(m[1] * m[2]));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(550);
  }
  await page.fill('.answer-input', '1');
  await page.keyboard.press('Enter');
  ok(await page.locator('text=Not yet.').isVisible(), 'a missed fact shows the answer and a strategy');
  await audit(page, 'times practice');
  await page.click('button:has-text("Got it")');
  await page.click('button:has-text("Finish now")');
  ok((await page.locator('.card h3').first().innerText()).includes('3 of 4'), 'the round summary counts correctly');

  await go('/times-table/quiz');
  await page.click('form button[type=submit]');
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('1');
    await page.locator('[role=status] .btn-primary').click();
  }
  ok((await page.locator('.card h3').first().innerText()).includes('out of 10'), 'the times-table quiz finishes after 10 questions');

  await go('/memory');
  await audit(page, 'memory hub');
  await go('/memory/flashcards');
  await audit(page, 'flashcards decks');
  await page.locator('button:has-text("Study")').first().click();
  const front = (await page.locator('#flash-front').innerText()).replace(/\s+/g, '');
  const fm = front.match(/(\d+)\+(\d+)/);
  await page.fill('.answer-input', String(Number(fm[1]) + Number(fm[2])));
  await page.keyboard.press('Enter');
  ok(await page.locator('text=Correct').first().isVisible(), 'a right flashcard answer is confirmed');
  await audit(page, 'flashcards session');

  for (const game of ['sequence', 'pattern', 'pairs', 'speed']) {
    await go(`/memory/${game}`);
    await audit(page, `memory ${game}`);
    await noSidewaysScroll(page, `memory ${game}`);
  }
  await go('/memory/sequence');
  await page.selectOption('#timing-comfort', 'off');
  await page.click('button:has-text("Show me the digits")');
  const digits = (await page.locator('.digits').innerText()).replace(/\s/g, '');
  await page.click('button:has-text("Hide the digits")');
  await page.fill('.answer-input', digits);
  await page.keyboard.press('Enter');
  ok((await page.locator('.card h2').first().innerText()).startsWith('Yes'), 'number recall accepts the right digits');
  await go('/about');
  await audit(page, 'about');
  await context.close();
}

console.log('6. Saving progress with a server account');
{
  const a = await open(BASE);
  await a.go('/topic/algebra-1/linear-equations/quiz?seed=11');
  await a.page.waitForSelector('.choices');
  const oracle = await quizOracle('algebra-1', 'linear-equations', 11);
  for (let i = 0; i < 4; i++) {
    const q = oracle.next();
    await answer(a.page, q.correctIndex);
    oracle.answer(true);
    await a.page.locator('.feedback .btn-primary').click();
  }
  await a.page.click('#account-button');
  await a.page.waitForSelector('#account-dialog[open] form');
  await audit(a.page, 'account dialog');
  await a.page.fill('#acct-name', 'E2E Otter 7');
  await a.page.fill('#acct-pass', 'short');
  await a.page.click('#account-dialog button[type=submit]');
  await a.page.waitForFunction(() => document.querySelector('#account-dialog [role=alert]')?.textContent.trim().length > 0);
  ok(await a.page.locator('#account-dialog [role=alert]').innerText().then((t) => t.includes('at least')), 'a short secret word is refused with a clear message');
  await a.page.fill('#acct-pass', 'purple-tiger-9');
  await a.page.click('#account-dialog button[type=submit]');
  await a.page.waitForSelector('#account-dialog', { state: 'detached' });
  ok((await a.page.locator('#account-button').innerText()).includes('E2E Otter 7'), 'the header shows who is signed in');
  ok((await a.page.locator('#footer-status').innerText()).includes('Signed in as E2E Otter 7'), 'the footer says progress is saved');
  await a.page.waitForFunction(() => document.getElementById('footer-status').textContent.includes('All progress saved'), null, { timeout: 8000 });
  await a.context.close();

  // Another device: sign in and find the points, the tier and the unfinished quiz.
  const b = await open(BASE, PHONE);
  await b.go('/');
  await b.page.click('#account-button');
  await b.page.click('#acct-tab-returning');
  await b.page.fill('#acct-name', 'e2e otter 7');
  await b.page.fill('#acct-pass', 'wrong-word');
  await b.page.click('#account-dialog button[type=submit]');
  await b.page.waitForFunction(() => document.querySelector('#account-dialog [role=alert]')?.textContent.trim().length > 0);
  ok(await b.page.locator('#account-dialog [role=alert]').innerText().then((t) => t.includes('do not match')), 'a wrong secret word is refused');
  await b.page.fill('#acct-pass', 'purple-tiger-9');
  await b.page.click('#account-dialog button[type=submit]');
  await b.page.waitForSelector('#account-dialog', { state: 'detached' });
  await b.go('/progress');
  ok((await b.page.locator('.stat b').first().innerText()) === '25', 'saved points come back on another device');
  ok(await b.page.locator('text=25 / 100 points').first().isVisible(), 'the unfinished quiz and its score come back');
  ok(await b.page.locator('.tier-badge.tier-medium').first().isVisible(), 'the current tier comes back');
  await audit(b.page, 'progress (signed in, phone)');
  await noSidewaysScroll(b.page, 'progress phone');

  // Sign out → guest again; then delete the account.
  await b.page.click('#account-button');
  await b.page.click('#account-dialog button:has-text("Sign out")');
  await b.page.waitForSelector('#account-dialog', { state: 'detached' });
  ok((await b.page.locator('#account-button').innerText()).includes('Save my progress'), 'signing out returns to guest mode');
  await b.go('/progress');
  ok((await b.page.locator('.stat b').first().innerText()) === '0', 'a guest does not see the account\'s progress');
  await b.context.close();
}

console.log('7. Saving progress on the device (static hosting, no server)');
{
  const a = await open(STATIC);
  await a.go('/topic/g1-5/fractions-add-sub/quiz?seed=5');
  await a.page.waitForSelector('.choices');
  const oracle = await quizOracle('g1-5', 'fractions-add-sub', 5);
  const q = oracle.next();
  await answer(a.page, q.correctIndex);
  await a.page.click('#account-button');
  await a.page.waitForSelector('#account-dialog[open] form');
  ok(await a.page.locator('#account-dialog').innerText().then((t) => t.includes('in this browser on this device')), 'the dialog says progress will be saved on this device');
  await a.page.fill('#acct-name', 'Device Kid');
  await a.page.fill('#acct-pass', 'banana-boat');
  await a.page.click('#account-dialog button[type=submit]');
  await a.page.waitForSelector('#account-dialog', { state: 'detached' });
  // Same browser, new tab (the app was closed and reopened): still signed in, progress kept.
  const tab = await a.context.newPage();
  await tab.goto(`${STATIC}#/progress`);
  await tab.waitForSelector('main[data-route="/progress"] h1');
  ok((await tab.locator('#account-button').innerText()).includes('Device Kid'), 'the device account stays signed in after reopening');
  ok((await tab.locator('.stat b').first().innerText()) === '5', 'device-saved points are kept after reopening');
  await a.context.close();
}

console.log('8. Dark theme and large text');
{
  const { context, page, go } = await open(BASE, DESKTOP, { theme: 'dark' });
  await go('/');
  ok((await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark', 'dark colours follow the device setting');
  await audit(page, 'home (dark)');
  await go('/topic/g1-5/fractions-add-sub/learn');
  await audit(page, 'learn (dark)');
  await go('/topic/algebra-1/linear-equations/quiz?seed=3');
  await page.waitForSelector('.choices');
  await answer(page, 0);
  await audit(page, 'quiz feedback (dark)');
  await page.click('#settings-button');
  await page.waitForSelector('#settings-dialog[open]');
  await audit(page, 'settings dialog (dark)');
  await page.locator('label[for="set-text-xlarge"]').click();
  await page.locator('#settings-dialog button:has-text("Done")').click();
  ok((await page.evaluate(() => document.documentElement.dataset.text)) === 'xlarge', 'text size can be made extra large');
  await context.close();
  const phone = await open(BASE, PHONE);
  await phone.go('/');
  await phone.page.evaluate(() => { localStorage.setItem('mt.settings', JSON.stringify({ text: 'xlarge' })); });
  for (const hash of ['/', '/level/g1-5', '/topic/g1-5/fractions-add-sub/learn', '/topic/g1-5/fractions-add-sub/try', '/topic/calculus-1/derivative-rules/quiz', '/progress', '/about']) {
    await phone.page.goto(`${BASE}#${hash}`);
    await phone.page.reload();
    await phone.page.waitForSelector(`main[data-route="${hash}"] h1`);
    await noSidewaysScroll(phone.page, `${hash} (phone, extra-large text)`);
  }
  await phone.context.close();
}

await browser.close();
await withApi.close();
await staticOnly.close();
await rm(dataDir, { recursive: true, force: true });

console.log(`\n${checks} checks, ${failures.length} failed.`);
for (const f of failures) console.log(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
