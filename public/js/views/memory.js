// Memory training hub. Each activity lives in ./memory/.

import { h } from '../ui/dom.js';
import { guestNotice } from '../ui/components.js';
import { DECKS } from '../core/decks.js';

const GAMES = [
  { id: 'flashcards', icon: '🗂️', title: 'Fact flashcards', text: 'Math facts on cards that come back just before you would forget them. A few minutes a day works best.' },
  { id: 'speed', icon: '⚡', title: 'Mental math rounds', text: 'Quick questions in your head. They get harder as you get them right.' },
  { id: 'pairs', icon: '🃏', title: 'Matching pairs', text: 'Turn over cards to match each sum with its answer, such as 6 × 7 and 42.' },
  { id: 'sequence', icon: '🔢', title: 'Number recall', text: 'Watch a row of digits, then type them back. The row grows as you improve.' },
  { id: 'pattern', icon: '🟦', title: 'Pattern memory', text: 'Squares light up on a grid. Remember where they were and tap them.' },
];

const LOADERS = {
  flashcards: () => import('./memory/flashcards.js'),
  speed: () => import('./memory/speed.js'),
  pairs: () => import('./memory/pairs.js'),
  sequence: () => import('./memory/sequence.js'),
  pattern: () => import('./memory/pattern.js'),
};

export default async function memoryView(ctx) {
  const game = ctx.params[0];
  if (game && LOADERS[game]) {
    const mod = await LOADERS[game]();
    return mod.default(ctx);
  }
  ctx.title = 'Memory training';
  const doc = ctx.app.store.progress;
  const started = Object.values(doc.srs).reduce((a, d) => a + Object.keys(d).length, 0);
  return h(
    'div',
    { class: 'stack-lg' },
    h(
      'header',
      { class: 'stack' },
      h('h1', null, 'Memory training'),
      h('p', null, 'When number facts come to mind quickly, your brain has more room for the harder parts of a problem. These activities help you practise remembering.'),
    ),
    h(
      'div',
      { class: 'grid' },
      GAMES.map((g) => {
        const saved = doc.memory[g.id];
        const status = g.id === 'flashcards' ? (started ? `${started} cards started in ${DECKS.length} decks` : `${DECKS.length} decks`) : saved ? `Level ${saved.level + 1} · best ${saved.best}` : 'Not played yet';
        return h('a', { class: 'card card-link stack', href: `#/memory/${g.id}` }, h('div', { class: 'card-icon', 'aria-hidden': 'true' }, g.icon), h('h2', { style: 'font-size:1.12rem' }, g.title), h('p', null, g.text), h('p', { class: 'small muted' }, status));
      }),
    ),
    guestNotice(ctx.app, { compact: true }),
    h(
      'details',
      { class: 'card' },
      h('summary', null, h('strong', null, 'What these activities can and cannot do (for parents and teachers)')),
      h(
        'div',
        { class: 'stack', style: 'margin-top:0.75rem' },
        h('p', null, 'The flashcards and mental-math rounds practise recalling math facts. Recalling something from memory, spaced out over days, is one of the best-supported ways to make it stick.'),
        h('p', null, 'Number recall, pattern memory and matching pairs are games. Practice makes people better at the games themselves, but studies have not found that this kind of training raises general memory, attention, intelligence or school grades, so we make no such promise. They are here because they are fun and they keep numbers in play.'),
        h('p', null, 'Every timer can be slowed down or switched off, and nothing here compares a student with anyone else.'),
      ),
    ),
  );
}

export function gameHeader(title, intro) {
  return h('header', { class: 'stack' }, h('nav', { class: 'breadcrumb', 'aria-label': 'Breadcrumb' }, h('ol', null, h('li', null, h('a', { href: '#/memory' }, 'Memory training')), h('li', null, h('span', { 'aria-current': 'page' }, title)))), h('h1', null, title), h('p', null, intro));
}

/** A select for the device-wide timer comfort setting, shown wherever something is timed. */
export function timingControl(settings, onChange) {
  const select = h(
    'select',
    { id: 'timing-comfort', onchange: (e) => { settings.set('timing', e.target.value); onChange?.(); } },
    [['normal', 'Normal'], ['relaxed', 'Slower (double time)'], ['off', 'No time limits']].map(([v, l]) => h('option', { value: v, selected: settings.get('timing') === v }, l)),
  );
  select.style.width = 'auto';
  return h('div', { class: 'row' }, h('label', { for: 'timing-comfort', style: 'font-weight:400' }, 'Timing:'), select);
}
