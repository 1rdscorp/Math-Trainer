// My progress: points, completed topics, current tiers, weak areas and quiz history.

import { h, shortDate, duration, announce, fill, count } from '../ui/dom.js';
import { guestNotice, tierBadge, chip } from '../ui/components.js';
import { LEVELS, topicList, describeTopic } from '../content/index.js';
import { summarize, weakAreas, weakFacts, isCompleted } from '../core/progress.js';
import { TIERS } from '../core/engine.js';

const HISTORY_PAGE = 15;

export default function progressView(ctx) {
  const { app } = ctx;
  const { store } = app;
  const doc = store.progress;
  const s = summarize(doc);
  ctx.title = 'My progress';

  const parts = [h('h1', null, 'My progress')];

  // Where this progress lives.
  if (store.isGuest) {
    parts.push(guestNotice(app));
  } else {
    parts.push(
      h(
        'p',
        { class: 'notice notice-good' },
        'Signed in as ',
        h('strong', null, store.user.name),
        store.user.where === 'server' ? '. Your progress is saved to your account.' : '. Your progress is saved in this browser on this device.',
        ' ',
        h('button', { type: 'button', class: 'btn btn-small', onclick: () => app.openAccount() }, 'Account'),
      ),
    );
  }

  parts.push(
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'totals' },
      h('h2', { id: 'totals' }, 'Totals'),
      h(
        'div',
        { class: 'stat-grid' },
        h('div', { class: 'stat' }, h('b', null, String(s.points)), h('span', null, 'points')),
        h('div', { class: 'stat' }, h('b', null, String(s.completed)), h('span', null, s.completed === 1 ? 'topic completed' : 'topics completed')),
        h('div', { class: 'stat' }, h('b', null, String(s.answered)), h('span', null, 'questions answered')),
        h('div', { class: 'stat' }, h('b', null, s.accuracy == null ? '–' : `${s.accuracy}%`), h('span', null, 'answered correctly')),
      ),
    ),
  );

  if (!s.answered && !s.completed) {
    parts.push(h('div', { class: 'card stack' }, h('p', null, 'Nothing here yet. Pick a topic and take its quiz, and your points, levels and history will show up on this page.'), h('p', null, h('a', { class: 'btn btn-primary', href: '#/' }, 'Choose a level'), ' ', h('a', { class: 'btn', href: '#/placement' }, 'Find my level'))));
  }

  // Quizzes in progress, with the current tier.
  const running = Object.entries(doc.topics)
    .filter(([, t]) => t.run && t.run.answered > 0)
    .map(([key, t]) => ({ key, t, info: describeTopic(key) }))
    .filter((r) => r.info)
    .sort((a, b) => b.t.last - a.t.last);
  if (running.length) {
    parts.push(
      h(
        'section',
        { class: 'card stack', 'aria-labelledby': 'running' },
        h('h2', { id: 'running' }, 'Quizzes in progress'),
        h(
          'ul',
          { class: 'topic-list' },
          running.map((r) =>
            h(
              'li',
              null,
              h(
                'div',
                { class: 'row row-between' },
                h('span', null, h('strong', null, r.info.meta.title), h('span', { class: 'muted' }, ` · ${r.info.level.title}`)),
                h('span', { class: 'row' }, chip(`${r.t.run.score} / 100 points`, 'info'), tierBadge(r.t.run.tier), h('a', { class: 'btn btn-small btn-primary', href: `#/topic/${r.key}/quiz`, 'aria-label': `Continue ${r.info.meta.title}` }, 'Continue')),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Weak areas.
  const weak = weakAreas(doc)
    .map((w) => ({ ...w, info: describeTopic(w.key) }))
    .filter((w) => w.info)
    .slice(0, 8);
  const facts = weakFacts(doc).slice(0, 12);
  if (weak.length || facts.length) {
    parts.push(
      h(
        'section',
        { class: 'card stack', 'aria-labelledby': 'weak' },
        h('h2', { id: 'weak' }, 'Good places to practise next'),
        h('p', { class: 'muted' }, 'These are the topics and skills where the most answers were missed. A short review usually clears them up.'),
        weak.length
          ? h(
              'ul',
              { class: 'topic-list' },
              weak.map((w) =>
                h(
                  'li',
                  null,
                  h(
                    'div',
                    { class: 'row row-between' },
                    h(
                      'span',
                      null,
                      h('strong', null, w.info.meta.title),
                      h('span', { class: 'muted' }, ` · ${w.info.level.title} · ${w.accuracy}% correct over ${w.attempts} questions`),
                      w.skills.length ? h('span', { class: 'small' }, h('br'), 'Tricky parts: ', w.skills.map((k) => `${k.tag} (${k.accuracy}%)`).join(', ')) : null,
                    ),
                    h('span', { class: 'row' }, h('a', { class: 'btn btn-small', href: `#/topic/${w.key}/learn`, 'aria-label': `Review the rules for ${w.info.meta.title}` }, 'Review'), h('a', { class: 'btn btn-small btn-primary', href: `#/topic/${w.key}/quiz`, 'aria-label': `Practise ${w.info.meta.title}` }, 'Practise')),
                  ),
                ),
              ),
            )
          : null,
        facts.length
          ? h('p', null, h('strong', null, 'Multiplication facts to practise: '), facts.map((f) => f.fact.replace('x', ' × ')).join(', '), '. ', h('a', { href: '#/times-table/practice' }, 'Practise them'))
          : null,
      ),
    );
  }

  // Level by level.
  const levelRows = LEVELS.map((level) => {
    const topics = topicList(level.id);
    const done = topics.filter((t) => isCompleted(doc, `${level.id}/${t.id}`));
    const started = topics.filter((t) => doc.topics[`${level.id}/${t.id}`]?.att > 0).length;
    return { level, topics, done, started };
  }).filter((r) => r.started > 0 || r.done.length > 0);
  if (levelRows.length) {
    parts.push(
      h(
        'section',
        { class: 'card stack', 'aria-labelledby': 'levels' },
        h('h2', { id: 'levels' }, 'Completed topics'),
        levelRows.map((r) => {
          const bar = h('div', { class: 'progress-mini', role: 'presentation' }, h('span'));
          bar.firstChild.style.width = `${r.topics.length ? (100 * r.done.length) / r.topics.length : 0}%`;
          return h(
            'div',
            { class: 'stack' },
            h('h3', null, h('a', { href: `#/level/${r.level.id}` }, r.level.title), h('span', { class: 'muted small' }, ` · ${r.done.length} of ${r.topics.length} completed`)),
            bar,
            r.done.length ? h('p', { class: 'row' }, r.done.map((t) => chip(`✓ ${t.title}`, 'good'))) : h('p', { class: 'muted small' }, 'No topics completed here yet.'),
          );
        }),
      ),
    );
  }

  if (s.completed > 0 || s.answered >= 10) {
    parts.push(
      h(
        'section',
        { class: 'card stack', 'aria-labelledby': 'review' },
        h('h2', { id: 'review' }, 'Mixed review'),
        h('p', null, 'Eight questions drawn from topics you have worked on, mixed together. Coming back to older topics after a few days is one of the best ways to remember them.'),
        h('p', null, h('a', { class: 'btn btn-primary', href: '#/review' }, 'Start a mixed review')),
      ),
    );
  }

  // Quiz history.
  if (doc.history.length) {
    const rows = [...doc.history].reverse();
    let shown = HISTORY_PAGE;
    const tbody = h('tbody');
    const more = h('button', { type: 'button', class: 'btn btn-small' }, 'Show older quizzes');
    const draw = () => {
      fill(tbody, 
        ...rows.slice(0, shown).map((e) => {
          const info = describeTopic(e.k);
          return h(
            'tr',
            null,
            h('td', null, shortDate(e.t)),
            h('th', { scope: 'row' }, info ? h('a', { href: `#/topic/${e.k}/learn` }, info.meta.title) : e.k, info ? h('span', { class: 'muted small' }, h('br'), info.level.title) : null),
            h('td', null, e.d ? chip('✓ Completed', 'good') : `Stopped at ${count(e.s, 'point')}`),
            h('td', null, `${e.c} of ${e.a}`),
            h('td', null, TIERS[e.m].name),
            h('td', null, duration(e.secs)),
          );
        }),
      );
      more.hidden = shown >= rows.length;
    };
    more.addEventListener('click', () => {
      shown += HISTORY_PAGE;
      draw();
    });
    draw();
    parts.push(
      h(
        'section',
        { class: 'card stack', 'aria-labelledby': 'history' },
        h('h2', { id: 'history' }, 'Quiz history'),
        h(
          'div',
          { class: 'table-wrap', tabindex: '0', role: 'group', 'aria-label': 'Quiz history table. Scroll sideways to see every column.' },
          h('table', { class: 'data plain' }, h('thead', null, h('tr', null, ['Date', 'Topic', 'Result', 'Correct', 'Highest level', 'Time'].map((c) => h('th', { scope: 'col' }, c)))), tbody),
        ),
        more,
      ),
    );
  }

  // Extras.
  const extras = [];
  if (doc.times.rounds > 0 || Object.keys(doc.times.facts).length) {
    const known = Object.values(doc.times.facts).filter(([a, c]) => a >= 2 && c / a >= 0.75).length;
    extras.push(h('li', null, h('strong', null, 'Multiplication table: '), `level ${doc.times.level + 1}, ${count(known, 'fact')} answered reliably, ${count(doc.times.rounds, 'practice round')}. `, h('a', { href: '#/times-table' }, 'Open')));
  }
  const names = { sequence: 'Number recall', pattern: 'Pattern memory', pairs: 'Matching pairs', speed: 'Mental math' };
  for (const [game, g] of Object.entries(doc.memory)) {
    if (names[game]) extras.push(h('li', null, h('strong', null, `${names[game]}: `), `level ${g.level + 1}, best ${g.best}. `, h('a', { href: `#/memory/${game}` }, 'Play')));
  }
  const cards = Object.values(doc.srs).reduce((a, deck) => a + Object.keys(deck).length, 0);
  if (cards) extras.push(h('li', null, h('strong', null, 'Flashcards: '), `${count(cards, 'card')} started. `, h('a', { href: '#/memory/flashcards' }, 'Review')));
  if (extras.length) parts.push(h('section', { class: 'card', 'aria-labelledby': 'extras' }, h('h2', { id: 'extras' }, 'Extra practice'), h('ul', null, extras)));

  // Clear progress.
  if (s.answered || s.completed || extras.length) {
    let armed = false;
    const clearBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost btn-small',
        onclick: () => {
          if (!armed) {
            armed = true;
            clearBtn.textContent = 'Tap again to erase all points, history and levels (this cannot be undone)';
            return;
          }
          store.reset();
          announce('All progress was erased.');
        },
      },
      'Erase my progress and start fresh',
    );
    parts.push(h('p', null, clearBtn));
  }

  return h('div', { class: 'stack-lg' }, parts);
}
