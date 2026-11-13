#!/usr/bin/env node
// Open every page of every topic in a real browser at phone width and look for trouble.
//
//   npm run e2e:sweep                          every level at 360 px
//   npm run e2e:sweep -- geometry calculus-1   only these levels
//   npm run e2e:sweep -- --width 320 --axe     another width; also run the accessibility audit
//
// For each topic it opens Learn, Examples (all steps shown), Try it and the Quiz, answers a few
// questions (right or wrong, as it happens) and reads the feedback. On every page state it checks:
//   - no JavaScript error, no console error, no question generator that failed
//   - no formula that KaTeX could not typeset, no raw TeX or unfilled placeholder left in the text
//   - the page does not scroll sideways, and nothing sticks out of the screen
// With --axe it also runs axe-core (WCAG 2.2 A/AA and best practices) on each topic's lesson and quiz.
//
// It starts its own server on a spare port. Playwright is needed (see e2e/run.mjs).

import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createApp } from '../server/server.js';
import { CATALOG } from '../public/js/content/catalog.js';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is not installed. Run `npm i -D playwright && npx playwright install chromium` first.');
  process.exit(2);
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const wAt = args.indexOf('--width');
const width = wAt >= 0 ? Number(args[wAt + 1]) : 360;
const qAt = args.indexOf('--questions');
const questions = qAt >= 0 ? Number(args[qAt + 1]) : 3;
const only = args.filter((a, i) => !a.startsWith('--') && !(wAt >= 0 && i === wAt + 1) && !(qAt >= 0 && i === qAt + 1));
const withAxe = flag('axe');
const axeSource = withAxe ? await readFile(require.resolve('axe-core/axe.min.js'), 'utf8') : '';

const app = createApp({ accounts: false });
const base = await new Promise((resolve) => app.server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${app.server.address().port}/`)));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height: 760 }, deviceScaleFactor: 1 });
const page = await context.newPage();

let where = '';
const problems = [];
const note = (kind, detail) => problems.push(`${where}  ${kind}: ${detail}`);
page.on('pageerror', (e) => note('page error', e.message.slice(0, 200)));
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon/.test(m.text())) note('console error', m.text().slice(0, 200));
  if (m.type() === 'warning' && /generator failed/i.test(m.text())) note('generator failed', m.text().slice(0, 200));
});

async function inspect(label) {
  const found = await page.evaluate(() => {
    const out = [];
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw + 1) out.push(`the page scrolls sideways (${document.documentElement.scrollWidth}px wide on a ${vw}px screen)`);
    for (const el of document.querySelectorAll('main *')) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0 || (b.right <= vw + 1.5 && b.left >= -1.5)) continue;
      // Fine if an ancestor scrolls sideways or clips: the wide thing stays inside its own box.
      let a = el.parentElement;
      let contained = false;
      while (a && a !== document.body) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) {
          contained = true;
          break;
        }
        a = a.parentElement;
      }
      if (!contained) {
        out.push(`<${el.tagName.toLowerCase()} class="${String(el.className?.baseVal ?? el.className).slice(0, 40)}"> sticks out of the screen: "${(el.textContent || '').trim().slice(0, 50)}"`);
        break;
      }
    }
    const bad = document.querySelectorAll('main .katex-error, main .math-error');
    if (bad.length) out.push(`${bad.length} formula(s) could not be typeset: ${bad[0].textContent.slice(0, 80)}`);
    const raw = [...document.querySelectorAll('main p, main li, main label, main td, main th, main h1, main h2, main h3, main dd')].find((e) => {
      const copy = e.cloneNode(true);
      copy.querySelectorAll('.katex, .math-inline, .math-display').forEach((k) => k.remove());
      return /\\\(|\\\[|\$\{|\\frac|\bundefined\b|\bNaN\b|\[object/.test(copy.textContent);
    });
    if (raw) out.push(`raw text on the page: ${raw.textContent.trim().slice(0, 90)}`);
    return out;
  });
  for (const f of found) note(label, f);
}

async function audit(label) {
  if (!withAxe) return;
  await page.evaluate(axeSource);
  const result = await page.evaluate(() => globalThis.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
  for (const v of result.violations) note(`accessibility (${label})`, `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
}

const go = async (hash, route = hash) => {
  await page.goto(`${base}#${hash}`);
  await page.waitForSelector(`main[data-route="${route}"] h1`, { timeout: 15000 });
};

let states = 0;
let topics = 0;
for (const [level, list] of Object.entries(CATALOG)) {
  if (only.length && !only.includes(level)) continue;
  for (const t of list) {
    const id = `${level}/${t.id}`;
    topics += 1;
    try {
      where = `${id} learn`;
      await go(`/topic/${id}/learn`);
      await inspect('learn');
      await audit('learn');
      where = `${id} examples`;
      await go(`/topic/${id}/examples`);
      for (const b of await page.locator('button:has-text("Show all steps")').all()) await b.click();
      await inspect('examples');
      where = `${id} try`;
      await go(`/topic/${id}/try`);
      await inspect('try it');
      where = `${id} quiz`;
      await go(`/topic/${id}/quiz?seed=${3 + topics}`, `/topic/${id}/quiz`);
      await page.waitForSelector('.choices label', { timeout: 15000 });
      states += 4;
      for (let k = 0; k < questions; k++) {
        await inspect(`question ${k + 1}`);
        if (k === 0) await audit('question');
        await page.locator('.choices label').nth(k % 4).click();
        await page.locator('button:has-text("Check my answer")').click();
        await page.waitForSelector('.feedback.notice', { timeout: 10000 });
        const solution = page.locator('.feedback summary');
        if (await solution.count()) await solution.first().click();
        await inspect(`feedback ${k + 1}`);
        if (k === 1) await audit('feedback');
        states += 2;
        const next = page.locator('.feedback button').filter({ hasText: /Next question|Try a new question/ });
        if (!(await next.count())) break;
        await next.first().click();
        await page.waitForSelector('.choices input:not(:disabled)', { timeout: 10000 });
      }
    } catch (e) {
      note('could not finish', e.message.split('\n')[0].slice(0, 160));
    }
  }
}

await browser.close();
await app.close();
if (problems.length) console.log(problems.join('\n'));
console.log(`\n${topics} topics, ${states} page states at ${width}px${withAxe ? ', with accessibility audit' : ''}: ${problems.length} problem(s).`);
process.exit(problems.length ? 1 : 0);
