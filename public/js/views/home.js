// Start page: pick a level, or take the placement quiz.

import { h, emoji, count } from '../ui/dom.js';
import { guestNotice, chip } from '../ui/components.js';
import { LEVELS, topicList, describeTopic } from '../content/index.js';
import { summarize, isCompleted, weakAreas } from '../core/progress.js';
import { TIERS } from '../core/engine.js';

export function levelProgress(doc, levelId) {
  const topics = topicList(levelId);
  const done = topics.filter((t) => isCompleted(doc, `${levelId}/${t.id}`)).length;
  return { done, total: topics.length };
}

/** The most recent unfinished quiz, if there is one. */
function latestRun(doc) {
  let best = null;
  for (const [key, t] of Object.entries(doc.topics)) {
    if (t.run && t.run.answered > 0 && (!best || t.last > best.t.last)) best = { key, t };
  }
  return best && describeTopic(best.key) ? { ...describeTopic(best.key), run: best.t.run } : null;
}

export default function homeView(ctx) {
  const { app } = ctx;
  const doc = app.store.progress;
  const s = summarize(doc);
  ctx.title = 'Learn';

  const hero = h(
    'section',
    { class: 'hero stack' },
    h('h1', null, app.store.isGuest ? 'Learn it. Try it. Master it.' : `Welcome back, ${app.store.user.name}!`),
    h('p', null, 'Math from 1st grade through Calculus 3. Every topic explains the rules in plain words, shows worked examples, lets you try your own numbers, and finishes with a quiz that grows with you.'),
    h(
      'div',
      { class: 'row' },
      h('a', { class: 'btn btn-primary btn-big', href: '#levels', onclick: (e) => { e.preventDefault(); document.getElementById('levels')?.scrollIntoView({ block: 'start' }); document.getElementById('levels-title')?.focus(); } }, 'Choose my level'),
      h('a', { class: 'btn btn-big', href: '#/placement' }, 'Find my level (short quiz)'),
    ),
  );

  const sections = [hero];

  if (s.answered > 0 || s.completed > 0) {
    const run = latestRun(doc);
    const weak = weakAreas(doc).map((w) => ({ ...w, info: describeTopic(w.key) })).filter((w) => w.info).slice(0, 1)[0];
    sections.push(
      h(
        'section',
        { class: 'card stack', 'aria-labelledby': 'so-far' },
        h('h2', { id: 'so-far' }, 'Your progress so far'),
        h(
          'div',
          { class: 'stat-grid' },
          h('div', { class: 'stat' }, h('b', null, String(s.points)), h('span', null, 'points')),
          h('div', { class: 'stat' }, h('b', null, String(s.completed)), h('span', null, s.completed === 1 ? 'topic completed' : 'topics completed')),
          h('div', { class: 'stat' }, h('b', null, s.accuracy == null ? '–' : `${s.accuracy}%`), h('span', null, 'answers correct')),
        ),
        h(
          'div',
          { class: 'row' },
          run ? h('a', { class: 'btn btn-primary', href: `#/topic/${run.key}/quiz` }, `Continue: ${run.meta.title} (${count(run.run.score, 'point')}, ${TIERS[run.run.tier].name})`) : null,
          weak ? h('a', { class: 'btn', href: `#/topic/${weak.key}/learn` }, `Review: ${weak.info.meta.title}`) : null,
          h('a', { class: 'btn btn-ghost', href: '#/progress' }, 'See all my progress'),
        ),
      ),
    );
  }

  const notice = guestNotice(app);
  if (notice) sections.push(notice);

  sections.push(
    h(
      'section',
      { id: 'levels', 'aria-labelledby': 'levels-title', class: 'stack' },
      h('h2', { id: 'levels-title', tabindex: '-1' }, 'Choose a level'),
      doc.placement && LEVELS.some((l) => l.id === doc.placement.level)
        ? h('p', { class: 'notice notice-good' }, 'Your placement quiz suggested ', h('a', { href: `#/level/${doc.placement.level}` }, LEVELS.find((l) => l.id === doc.placement.level).title), '. You can still pick any level you like.')
        : null,
      h(
        'div',
        { class: 'grid' },
        LEVELS.map((level) => {
          const p = levelProgress(doc, level.id);
          const bar = h('div', { class: 'progress-mini', role: 'presentation' }, h('span'));
          bar.firstChild.style.width = `${p.total ? (100 * p.done) / p.total : 0}%`;
          return h(
            'a',
            { class: 'card card-link stack', href: `#/level/${level.id}` },
            h('div', { class: 'card-icon', 'aria-hidden': 'true' }, level.icon),
            h('h3', null, level.title),
            h('p', null, level.blurb),
            h('p', { class: 'small muted' }, p.total ? `${p.done} of ${p.total} topics completed` : 'Topics coming soon'),
            bar,
          );
        }),
      ),
    ),
  );

  sections.push(
    h(
      'section',
      { class: 'stack', 'aria-labelledby': 'extras-title' },
      h('h2', { id: 'extras-title' }, 'Extra practice'),
      h(
        'div',
        { class: 'grid-2' },
        h('a', { class: 'card card-link', href: '#/times-table' }, h('div', { class: 'card-icon', 'aria-hidden': 'true' }, '✖️'), h('h3', null, 'Multiplication table'), h('p', null, 'Explore the 1–12 table, then practise your facts. The practice gets harder as you get faster.')),
        h('a', { class: 'card card-link', href: '#/memory' }, h('div', { class: 'card-icon', 'aria-hidden': 'true' }, '🧠'), h('h3', null, 'Memory training'), h('p', null, 'Flashcards that come back just before you forget, number recall, pattern memory, matching pairs and quick mental math.')),
      ),
    ),
  );

  sections.push(h('p', { class: 'small muted center' }, chip('Free'), ' ', chip('No adverts'), ' ', chip('No account needed'), ' ', emoji('·'), ' ', h('a', { href: '#/about' }, 'For parents and teachers')));

  return h('div', { class: 'stack-lg' }, sections);
}
