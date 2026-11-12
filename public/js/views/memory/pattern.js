// Pattern memory: squares light up on a grid; remember them and tap them.

import { h, announce, focusOn, fill } from '../../ui/dom.js';
import { guestNotice } from '../../ui/components.js';
import { makeRng } from '../../core/rng.js';
import { staircase } from '../../core/mental.js';
import { gameHeader, timingControl } from '../memory.js';

const MAX_LEVEL = 9;
const SHOW_MS = 2500;

/** Grid size and number of lit squares for a level. */
export function patternSpec(level) {
  const size = Math.min(6, 3 + Math.floor((level + 1) / 2));
  const lit = Math.min(size * size - 2, 3 + level);
  return { size, lit };
}

export default function patternView(ctx) {
  const { app } = ctx;
  const { store, settings } = app;
  ctx.title = 'Pattern memory';
  const rng = makeRng();
  const saved = store.progress.memory.pattern ?? { level: 0, best: 0 };
  let stair = { level: saved.level, up: 0, down: 0 };
  let best = saved.best;
  let timer = null;
  const stage = h('div', { class: 'stack' });
  ctx.onLeave(() => clearTimeout(timer));

  function grid(size, { lit = new Set(), interactive = false, marks = null } = {}) {
    const chosen = new Set();
    const buttons = [];
    const wrap = h('div', { class: 'pattern-grid', role: 'group', 'aria-label': `${size} by ${size} grid` });
    wrap.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    for (let i = 0; i < size * size; i++) {
      const r = Math.floor(i / size) + 1;
      const c = (i % size) + 1;
      const btn = h('button', { type: 'button', 'aria-label': `Row ${r}, column ${c}` });
      if (lit.has(i)) btn.classList.add('lit');
      if (marks) {
        const m = marks(i);
        if (m) {
          btn.classList.add(m.cls);
          btn.setAttribute('aria-label', `Row ${r}, column ${c}: ${m.text}`);
        }
      }
      if (interactive) {
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', () => {
          if (chosen.has(i)) chosen.delete(i);
          else chosen.add(i);
          btn.setAttribute('aria-pressed', String(chosen.has(i)));
        });
      } else {
        btn.disabled = true;
        btn.tabIndex = -1;
      }
      buttons.push(btn);
      wrap.append(btn);
    }
    if (interactive) {
      wrap.addEventListener('keydown', (e) => {
        const i = buttons.indexOf(e.target);
        if (i < 0) return;
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: size, ArrowUp: -size }[e.key];
        if (!step) return;
        const j = i + step;
        if (j < 0 || j >= size * size) return;
        if ((e.key === 'ArrowRight' && j % size === 0) || (e.key === 'ArrowLeft' && i % size === 0)) return;
        e.preventDefault();
        buttons[j].focus();
      });
    }
    return { wrap, chosen, buttons };
  }

  function intro() {
    clearTimeout(timer);
    const { size, lit } = patternSpec(stair.level);
    const start = h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: round }, 'Show me the pattern');
    fill(stage, h('div', { class: 'card stack center' }, h('p', null, h('strong', null, `Next: ${lit} squares on a ${size} × ${size} grid.`), best ? ` Your biggest pattern so far: ${best} squares.` : ''), h('div', null, start)));
    return start;
  }

  function round() {
    clearTimeout(timer);
    const { size, lit } = patternSpec(stair.level);
    const cells = new Set(rng.sample(Array.from({ length: size * size }, (_, i) => i), lit));
    const g = grid(size, { lit: cells });
    const factor = settings.timeFactor();
    const where = [...cells].sort((a, b) => a - b).map((i) => `row ${Math.floor(i / size) + 1} column ${(i % size) + 1}`).join('; ');
    const note = h('p', { class: 'muted center' }, factor ? 'Remember where the squares are…' : 'Take as long as you like, then press the button.');
    const card = h('div', { class: 'card stack center' }, note, g.wrap, h('p', { class: 'sr-only', 'aria-live': 'assertive' }, `Lit squares: ${where}.`));
    fill(stage, card);
    if (!factor) {
      const ready = h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: () => answer(size, cells) }, 'Hide the pattern');
      card.append(h('div', null, ready));
      ready.focus();
      return;
    }
    timer = setTimeout(() => answer(size, cells), (SHOW_MS + lit * 250) * factor);
  }

  function answer(size, cells) {
    clearTimeout(timer);
    const g = grid(size, { interactive: true });
    const check = h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: () => result(size, cells, g.chosen) }, 'Check my pattern');
    fill(stage, h('div', { class: 'card stack center' }, h('p', null, h('strong', null, `Tap the ${cells.size} squares that were lit.`), ' Tap a square again to undo it.'), g.wrap, h('div', null, check)));
    g.buttons[0].focus();
  }

  function result(size, cells, chosen) {
    const hits = [...chosen].filter((i) => cells.has(i)).length;
    const ok = hits === cells.size && chosen.size === cells.size;
    stair = staircase(stair, ok, MAX_LEVEL);
    if (ok) best = Math.max(best, cells.size);
    store.change((doc) => { doc.memory.pattern = { level: stair.level, best }; });
    const g = grid(size, {
      marks: (i) => (cells.has(i) && chosen.has(i) ? { cls: 'right', text: 'correct' } : cells.has(i) ? { cls: 'missed', text: 'was lit, but you missed it' } : chosen.has(i) ? { cls: 'wrong', text: 'you tapped it, but it was not lit' } : null),
    });
    const next = patternSpec(stair.level);
    const heading = h('h2', { tabindex: '-1' }, ok ? 'Yes! You remembered the whole pattern.' : `You found ${hits} of ${cells.size}.`);
    fill(stage, 
      h(
        'div',
        { class: 'card stack center' },
        heading,
        g.wrap,
        ok ? null : h('p', { class: 'small muted' }, 'Solid squares were right. Dashed squares were lit but missed. Dark squares were tapped by mistake.'),
        stair.change > 0 ? h('p', { class: 'notice notice-good' }, `Two in a row! Next: ${next.lit} squares on a ${next.size} × ${next.size} grid.`) : null,
        stair.change < 0 ? h('p', { class: 'notice notice-info' }, `The next pattern is a little smaller: ${next.lit} squares. You can build back up.`) : null,
        h('p', { class: 'small muted' }, `Biggest pattern so far: ${best || '–'} squares.`),
        h('div', null, h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: round }, 'Next pattern')),
        guestNotice(app, { compact: true }),
      ),
    );
    announce(ok ? 'Correct. You remembered the whole pattern.' : `You found ${hits} of ${cells.size} squares.`);
    focusOn(heading);
  }

  intro();
  return h('div', { class: 'stack-lg' }, gameHeader('Pattern memory', 'Some squares light up for a moment. When they go dark, tap the ones that were lit. Two right in a row makes the next pattern bigger.'), timingControl(settings), stage);
}
