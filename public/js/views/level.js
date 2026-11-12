// The list of topics in one level.

import { h } from '../ui/dom.js';
import { breadcrumb, guestNotice, tierBadge, chip } from '../ui/components.js';
import { findLevel, topicList, topicKey } from '../content/index.js';

export default function levelView(ctx) {
  const { app } = ctx;
  const level = findLevel(ctx.params[0]);
  if (!level) {
    ctx.title = 'Level not found';
    return h('div', { class: 'narrow stack' }, h('h1', null, 'We could not find that level'), h('p', null, h('a', { class: 'btn btn-primary', href: '#/' }, 'Choose a level')));
  }
  ctx.title = level.title;
  const doc = app.store.progress;
  const topics = topicList(level.id);

  const items = topics.map((t, i) => {
    const key = topicKey(level.id, t.id);
    const entry = doc.topics[key];
    const done = (entry?.done ?? 0) > 0;
    const run = entry?.run && entry.run.answered > 0 ? entry.run : null;
    let status;
    if (run) status = h('span', null, chip(`${run.score} / 100 points`, 'info'), ' ', tierBadge(run.tier));
    else if (done) status = chip('✓ Completed', 'good');
    else if (entry?.att) status = chip('Started');
    else status = h('span', { class: 'muted' }, 'Not started');
    return h(
      'li',
      null,
      h(
        'a',
        { class: 'card card-link topic-item', href: `#/topic/${key}/${run ? 'quiz' : 'learn'}` },
        h('span', { class: `topic-num${done ? ' done' : ''}`, 'aria-hidden': 'true' }, done ? '✓' : String(i + 1)),
        h('span', null, h('h2', null, t.title), h('p', { class: 'muted' }, t.summary), t.grade ? h('p', { class: 'small muted' }, t.grade) : null),
        h('span', { class: 'topic-status' }, status),
      ),
    );
  });

  return h(
    'div',
    { class: 'stack-lg' },
    breadcrumb([
      ['Learn', '#/'],
      [level.title, null],
    ]),
    h('header', { class: 'stack' }, h('h1', null, level.title), h('p', null, level.blurb), h('p', { class: 'small muted' }, `Aligned to: ${level.standards}. Topics are in the usual teaching order, but you can start anywhere.`)),
    topics.length
      ? h('ol', { class: 'topic-list', 'aria-label': `Topics in ${level.title}` }, items)
      : h('p', { class: 'notice notice-info' }, 'Topics for this level are on their way.'),
    guestNotice(app, { compact: true }),
    h('p', null, h('a', { class: 'btn btn-ghost', href: '#/' }, '← All levels'), ' ', h('a', { class: 'btn btn-ghost', href: '#/placement' }, 'Not sure this is your level? Take the placement quiz')),
  );
}
