// Spaced-repetition flashcards for math facts (Leitner boxes).

import { h, clear, announce, focusOn, shortDate } from '../../ui/dom.js';
import { rich } from '../../ui/math.js';
import { toSpeech } from '../../ui/speech.js';
import { chip, guestNotice } from '../../ui/components.js';
import { keypad, answerInput } from '../../ui/keypad.js';
import { DECKS, findDeck } from '../../core/decks.js';
import { plan, grade, judge, boxCounts, requeue, FAST_MS, MAX_BOX, BOX_DAYS } from '../../core/srs.js';
import { gameHeader, timingControl } from '../memory.js';

export default function flashcardsView(ctx) {
  const { app } = ctx;
  const { store, settings } = app;
  ctx.title = 'Fact flashcards';
  const stage = h('div', { class: 'stack' });

  function boxesRow(deck) {
    const counts = boxCounts(deck, store.progress.srs[deck.id]);
    return h(
      'div',
      { class: 'boxes', role: 'group', 'aria-label': 'How many cards are in each box' },
      counts.map((n, i) => h('div', { class: 'box' }, h('b', null, String(n)), i === 0 ? 'New' : `Box ${i}`)),
    );
  }

  function showDecks() {
    clear(stage).append(
      h('p', { class: 'muted' }, `How it works: answer a card correctly and it moves up a box, so you see it again after a longer gap (${BOX_DAYS.join(', ')} days). Miss it and it goes back to box 1. Only a handful of new cards are added each time.`),
      store.isGuest ? h('p', { class: 'notice notice-info' }, 'As a guest, your boxes last until you close this page. Save your progress and the cards will come back on the right day.') : null,
      h(
        'div',
        { class: 'grid-2' },
        DECKS.map((deck) => {
          const p = plan(deck, store.progress.srs[deck.id]);
          const ready = p.queue.length;
          return h(
            'section',
            { class: 'card stack', 'aria-labelledby': `deck-${deck.id}` },
            h('h2', { id: `deck-${deck.id}`, style: 'font-size:1.12rem' }, h('span', { 'aria-hidden': 'true' }, `${deck.icon} `), deck.title),
            h('p', { class: 'muted' }, `${deck.blurb} · ${deck.cards.length} cards`),
            h('p', { class: 'row' }, p.due ? chip(`${p.due} to review`, 'warn') : null, p.fresh ? chip(`${p.fresh} new`) : null, p.learned ? chip(`${p.learned} started`, 'good') : null),
            boxesRow(deck),
            h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => study(deck, false), 'aria-label': `${ready ? `Study ${ready} card${ready === 1 ? '' : 's'}` : 'All caught up'}: ${deck.title}` }, ready ? `Study ${ready} card${ready === 1 ? '' : 's'}` : 'All caught up'), !ready && p.nextDue ? h('span', { class: 'small muted' }, `Next review ${shortDate(p.nextDue)}`) : null),
          );
        }),
      ),
    );
  }

  function study(deck, early) {
    const state = () => store.progress.srs[deck.id] ?? {};
    let queue = plan(deck, state()).queue;
    if (!queue.length) {
      if (!early) {
        const p = plan(deck, state());
        const heading = h('h2', { tabindex: '-1' }, 'All caught up');
        clear(stage).append(
          h('div', { class: 'card stack' }, heading, h('p', null, `Nothing in "${deck.title}" is due right now${p.nextDue ? `. The next cards come back on ${shortDate(p.nextDue)}` : ''}. Waiting is part of how this works: remembering after a gap is what makes facts stick.`), h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => study(deck, true) }, 'Practise early anyway'), h('button', { type: 'button', class: 'btn btn-primary', onclick: showDecks }, 'Choose another deck'))),
        );
        focusOn(heading);
        return;
      }
      // Practise early: the ten cards that are due soonest.
      queue = deck.cards.filter((c) => state()[c.id]).sort((a, b) => state()[a.id][1] - state()[b.id][1]).slice(0, 10).map((c) => c.id);
    }
    const total = queue.length;
    const byId = new Map(deck.cards.map((c) => [c.id, c]));
    const firstTry = new Set();
    const missedOnce = new Set();
    let done = 0;
    let waiting = false;
    let shownAt = 0;
    let card = null;

    const counter = h('span', { class: 'chip' });
    const front = h('div', { class: 'flashcard card', id: 'flash-front', 'aria-live': 'polite' });
    const input = answerInput({ label: 'Your answer', maxlength: 8, decimal: true });
    const unit = h('span', { class: 'muted' });
    const feedback = h('div', { class: 'stack', role: 'status' });
    input.setAttribute('aria-describedby', 'flash-front');

    const next = () => {
      waiting = false;
      clear(feedback);
      if (!queue.length) return finish();
      card = byId.get(queue[0]);
      queue = queue.slice(1);
      counter.textContent = `Card ${Math.min(done + 1, total)} of ${total}`;
      clear(front).append(h('div', null, rich(card.front)));
      unit.textContent = card.unit ?? '';
      input.value = '';
      input.disabled = false;
      input.focus({ preventScroll: true });
      shownAt = performance.now();
    };

    const check = () => {
      if (waiting || input.disabled) return;
      const text = input.value.trim().replace(',', '.');
      const value = Number(text);
      if (text === '' || !Number.isFinite(value)) {
        feedback.replaceChildren(h('p', { class: 'error-text' }, 'Type a number, then press ✓ or Enter.'));
        return;
      }
      const ok = Math.abs(value - card.answer) < 1e-9;
      const factor = settings.timeFactor();
      const result = judge(ok, performance.now() - shownAt, FAST_MS * factor);
      const prev = state()[card.id];
      const after = grade(prev, result, Date.now());
      store.change((doc) => {
        (doc.srs[deck.id] ?? (doc.srs[deck.id] = {}))[card.id] = after;
      });
      waiting = true;
      if (ok) {
        if (!missedOnce.has(card.id)) firstTry.add(card.id);
        done += 1;
        feedback.replaceChildren(h('p', { class: 'answer-line' }, result === 'fast' ? `✓ Correct! This card is now in box ${after[0]}.` : '✓ Correct. That one took a little while, so it will come back sooner.'));
        setTimeout(() => { if (waiting) next(); }, result === 'fast' ? 650 : 1400);
        return;
      }
      missedOnce.add(card.id);
      queue = requeue(queue, card.id);
      input.disabled = true;
      const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: next }, 'Got it, next card');
      feedback.replaceChildren(
        h('div', { class: 'notice notice-info stack' }, h('p', null, h('strong', null, 'Not yet. '), rich(card.front), ` is ${card.answer}${card.unit ?? ''}.`), card.hint ? h('p', null, card.hint) : null, h('p', { class: 'small muted' }, 'You will see this card again in a moment.'), h('p', null, nextBtn)),
      );
      nextBtn.focus();
    };

    function finish() {
      const heading = h('h2', { tabindex: '-1' }, 'Session finished');
      const p = plan(deck, state());
      clear(stage).append(
        h(
          'div',
          { class: 'card stack' },
          heading,
          h('div', { class: 'stat-grid' }, h('div', { class: 'stat' }, h('b', null, String(total)), h('span', null, 'cards studied')), h('div', { class: 'stat' }, h('b', null, String(firstTry.size)), h('span', null, 'right first time')), h('div', { class: 'stat' }, h('b', null, String(missedOnce.size)), h('span', null, 'to see again soon'))),
          boxesRow(deck),
          h('p', null, p.queue.length ? `${p.queue.length} more card${p.queue.length === 1 ? ' is' : 's are'} ready if you want to keep going.` : `That is everything for now${p.nextDue ? `. Cards come back from ${shortDate(p.nextDue)}` : ''}. A short session every day beats one long one.`),
          guestNotice(app, { compact: true }),
          h('div', { class: 'row' }, p.queue.length ? h('button', { type: 'button', class: 'btn btn-primary', onclick: () => study(deck, false) }, 'Keep going') : null, h('button', { type: 'button', class: p.queue.length ? 'btn' : 'btn btn-primary', onclick: showDecks }, 'Choose another deck')),
        ),
      );
      announce(`Session finished. ${firstTry.size} of ${total} right first time.`);
      focusOn(heading);
    }

    clear(stage).append(
      h(
        'form',
        { class: 'card stack center', onsubmit: (e) => { e.preventDefault(); check(); } },
        h('div', { class: 'row row-between' }, h('strong', null, deck.title), counter),
        front,
        h('div', { class: 'row', style: 'justify-content:center' }, input, unit),
        h('div', null, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Check')),
        keypad(input, { onEnter: check, decimal: deck.cards.some((c) => c.decimal) }),
        feedback,
        h('div', { class: 'row', style: 'justify-content:center' }, h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: finish }, 'Stop for now')),
      ),
    );
    input.style.margin = '0';
    announce(`Studying ${deck.title}. ${total} cards. First card: ${toSpeech(byId.get(queue[0]).front)}`);
    next();
  }

  const wanted = findDeck(new URLSearchParams(location.hash.split('?')[1] ?? '').get('deck'));
  if (wanted) study(wanted, false);
  else showDecks();
  return h('div', { class: 'stack-lg' }, gameHeader('Fact flashcards', 'Type the answer to each card. Cards you know well come back less often; cards you miss come back soon.'), timingControl(settings), h('p', { class: 'small muted' }, `With timing on, a correct answer counts as "quick" within ${FAST_MS / 1000} seconds (${(FAST_MS * 2) / 1000} on the slower setting). Slow but correct answers are never marked wrong. There are ${MAX_BOX} boxes.`), stage);
}
