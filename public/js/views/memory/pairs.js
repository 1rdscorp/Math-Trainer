// Matching pairs: turn over cards to match each expression with its value.

import { h, announce, focusOn, duration, fill } from '../../ui/dom.js';
import { guestNotice } from '../../ui/components.js';
import { makeRng } from '../../core/rng.js';
import { PAIR_LEVELS, MAX_PAIR_LEVEL, pairDeck } from '../../core/mental.js';
import { gameHeader } from '../memory.js';

export default function pairsView(ctx) {
  const { app } = ctx;
  const { store } = app;
  ctx.title = 'Matching pairs';
  const rng = makeRng();
  const saved = store.progress.memory.pairs ?? { level: 0, best: 0 };
  let level = Math.min(saved.level, MAX_PAIR_LEVEL);
  let best = saved.best;
  let flipTimer = null;
  const stage = h('div', { class: 'stack' });
  ctx.onLeave(() => clearTimeout(flipTimer));

  function intro() {
    const spec = PAIR_LEVELS[level];
    const select = h('select', { id: 'pairs-level', onchange: (e) => { level = Number(e.target.value); intro(); } }, PAIR_LEVELS.map((p, i) => h('option', { value: String(i), selected: i === level }, `Level ${i + 1}: ${p.name} (${p.pairs} pairs)`)));
    select.style.width = 'auto';
    fill(stage, 
      h('div', { class: 'card stack center' }, h('p', null, h('strong', null, `Level ${level + 1}: ${spec.name}.`), ` ${spec.pairs} pairs to find.`, best ? ` Highest level finished: ${best}.` : ''), h('div', { class: 'row', style: 'justify-content:center' }, h('label', { for: 'pairs-level', style: 'font-weight:400' }, 'Level:'), select), h('div', null, h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: play }, 'Deal the cards'))),
    );
  }

  function play() {
    clearTimeout(flipTimer);
    const cards = pairDeck(level, rng);
    const pairs = cards.length / 2;
    const startedAt = Date.now();
    let open = [];
    let found = 0;
    let moves = 0;
    const status = h('p', { class: 'center', role: 'status' }, `0 of ${pairs} pairs found`);
    const buttons = cards.map((card, i) => {
      const btn = h('button', { type: 'button', 'aria-label': `Card ${i + 1}, face down` }, h('span', { 'aria-hidden': 'true' }, '?'));
      btn.addEventListener('click', () => flip(i));
      return btn;
    });

    const show = (i, up) => {
      const btn = buttons[i];
      btn.classList.toggle('up', up);
      btn.firstChild.textContent = up ? cards[i].text : '?';
      btn.setAttribute('aria-label', up ? `Card ${i + 1}: ${cards[i].text}` : `Card ${i + 1}, face down`);
    };
    const closeOpen = () => {
      clearTimeout(flipTimer);
      open.forEach((i) => show(i, false));
      open = [];
    };

    function flip(i) {
      if (buttons[i].classList.contains('matched') || open.includes(i)) return;
      if (open.length === 2) closeOpen();
      show(i, true);
      open.push(i);
      if (open.length < 2) {
        announce(cards[i].text);
        return;
      }
      moves += 1;
      const [a, b] = open;
      if (cards[a].pair === cards[b].pair) {
        for (const k of [a, b]) {
          buttons[k].classList.add('matched');
          buttons[k].setAttribute('aria-label', `Card ${k + 1}: ${cards[k].text}, matched`);
          buttons[k].setAttribute('aria-disabled', 'true');
        }
        open = [];
        found += 1;
        status.textContent = `${found} of ${pairs} pairs found`;
        announce(`${cards[b].text}. A match: ${cards[a].text} and ${cards[b].text}. ${found} of ${pairs} pairs found.`);
        if (found === pairs) setTimeout(finish, 500);
      } else {
        announce(`${cards[b].text}. Not a match.`);
        flipTimer = setTimeout(closeOpen, 1800);
      }
    }

    function finish() {
      const secs = Math.round((Date.now() - startedAt) / 1000);
      const neat = moves <= Math.ceil(pairs * 1.75);
      const finishedLevel = level + 1;
      best = Math.max(best, finishedLevel);
      const up = neat && level < MAX_PAIR_LEVEL;
      if (up) level += 1;
      store.change((doc) => { doc.memory.pairs = { level, best }; });
      const heading = h('h2', { tabindex: '-1' }, `All ${pairs} pairs found!`);
      fill(stage, 
        h(
          'div',
          { class: 'card stack center' },
          heading,
          h('div', { class: 'stat-grid' }, h('div', { class: 'stat' }, h('b', null, String(moves)), h('span', null, 'turns')), h('div', { class: 'stat' }, h('b', null, duration(secs)), h('span', null, 'time')), h('div', { class: 'stat' }, h('b', null, String(finishedLevel)), h('span', null, 'level finished'))),
          up ? h('p', { class: 'notice notice-good' }, `Tidy work: ${moves} turns for ${pairs} pairs. Next is level ${level + 1}: ${PAIR_LEVELS[level].name}.`) : h('p', { class: 'muted' }, neat ? 'You have finished the top level. Play again to beat your number of turns.' : `Finish in ${Math.ceil(pairs * 1.75)} turns or fewer to move up a level.`),
          h('div', { class: 'row', style: 'justify-content:center' }, h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: play }, 'Play again'), h('button', { type: 'button', class: 'btn btn-ghost', onclick: intro }, 'Choose a level')),
          guestNotice(app, { compact: true }),
        ),
      );
      announce(`All pairs found in ${moves} turns.`);
      focusOn(heading);
    }

    const board = h('div', { class: 'pairs-grid', role: 'group', 'aria-label': 'Cards' }, buttons);
    fill(stage, h('div', { class: 'card stack' }, h('p', { class: 'center muted' }, `Level ${level + 1}: ${PAIR_LEVELS[level].name}. Match each sum with its answer.`), status, board, h('div', { class: 'row', style: 'justify-content:center' }, h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: intro }, 'Stop this game'))));
    buttons[0].focus();
  }

  intro();
  return h('div', { class: 'stack-lg' }, gameHeader('Matching pairs', 'Turn over two cards. If one is a sum and the other is its answer, they stay face up. Find all the pairs in as few turns as you can. There is no timer.'), stage);
}
