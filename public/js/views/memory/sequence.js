// Number recall: watch a row of digits, then type it back. The row grows as you improve.

import { h, announce, focusOn, fill } from '../../ui/dom.js';
import { guestNotice } from '../../ui/components.js';
import { keypad, answerInput } from '../../ui/keypad.js';
import { makeRng } from '../../core/rng.js';
import { staircase } from '../../core/mental.js';
import { gameHeader, timingControl } from '../memory.js';

const START_LENGTH = 3;
const MAX_LEVEL = 9; // up to 12 digits
const DIGIT_MS = 1000;

export default function sequenceView(ctx) {
  const { app } = ctx;
  const { store, settings } = app;
  ctx.title = 'Number recall';
  const rng = makeRng();
  const saved = store.progress.memory.sequence ?? { level: 0, best: 0 };
  let stair = { level: saved.level, up: 0, down: 0 };
  let best = saved.best;
  let backwards = false;
  let timers = [];
  const stage = h('div', { class: 'stack' });
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  ctx.onLeave(clearTimers);

  const lengthNow = () => START_LENGTH + stair.level;

  function intro() {
    clearTimers();
    const id = 'seq-backwards';
    const start = h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: round }, 'Show me the digits');
    fill(stage, 
      h(
        'div',
        { class: 'card stack center' },
        h('p', null, h('strong', null, `Next row: ${lengthNow()} digits.`), best ? ` Your longest so far: ${best} digits.` : ''),
        h('p', { class: 'muted' }, 'Tip: say the digits to yourself in groups of three, like a phone number.'),
        h('div', { class: 'row', style: 'justify-content:center' }, h('input', { type: 'checkbox', id, checked: backwards, onchange: (e) => { backwards = e.target.checked; } }), h('label', { for: id, style: 'font-weight:400' }, 'Harder: type them back in reverse order')),
        h('div', null, start),
      ),
    );
    return start;
  }

  function round() {
    clearTimers();
    const digits = Array.from({ length: lengthNow() }, () => rng.int(0, 9));
    const factor = settings.timeFactor();
    const display = h('p', { class: 'digits', 'aria-live': 'assertive', 'aria-atomic': 'true' });
    const note = h('p', { class: 'muted center' });
    fill(stage, h('div', { class: 'card stack center' }, note, display));

    if (!factor) {
      // No time limits: show the whole row until the student is ready.
      display.textContent = digits.join(' ');
      note.textContent = 'Take as long as you like. Press the button when you are ready to type it back.';
      const ready = h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: () => answer(digits) }, 'Hide the digits');
      stage.firstChild.append(h('div', null, ready));
      ready.focus();
      return;
    }
    note.textContent = 'Watch the digits…';
    const each = DIGIT_MS * factor;
    digits.forEach((d, i) => {
      timers.push(setTimeout(() => { display.textContent = String(d); }, 600 + i * each));
      timers.push(setTimeout(() => { display.textContent = ''; }, 600 + i * each + each * 0.8));
    });
    timers.push(setTimeout(() => answer(digits), 600 + digits.length * each + 200));
  }

  function answer(digits) {
    clearTimers();
    const want = (backwards ? [...digits].reverse() : digits).join('');
    const input = answerInput({ label: backwards ? 'Type the digits in reverse order' : 'Type the digits in order', maxlength: digits.length + 2 });
    input.style.maxWidth = '100%';
    input.style.letterSpacing = '0.15em';
    const feedback = h('div', { class: 'stack', role: 'status' });
    const submit = () => {
      const got = input.value.replace(/\D/g, '');
      if (!got) {
        fill(feedback, h('p', { class: 'error-text' }, 'Type the digits you remember.'));
        return;
      }
      result(digits, want, got);
    };
    fill(stage, 
      h('form', { class: 'card stack center', onsubmit: (e) => { e.preventDefault(); submit(); } }, h('p', null, h('strong', null, backwards ? `Type the ${digits.length} digits backwards.` : `Type the ${digits.length} digits in order.`)), input, h('div', null, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Check')), keypad(input, { onEnter: submit }), feedback),
    );
    input.focus();
  }

  function result(digits, want, got) {
    const ok = got === want;
    const before = stair.level;
    stair = staircase(stair, ok, MAX_LEVEL);
    if (ok) best = Math.max(best, digits.length);
    store.change((doc) => { doc.memory.sequence = { level: stair.level, best }; });
    const heading = h('h2', { tabindex: '-1' }, ok ? `Yes! All ${digits.length} digits.` : 'Not quite this time.');
    const again = h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: round }, 'Next row');
    fill(stage, 
      h(
        'div',
        { class: `card stack center ${ok ? '' : ''}` },
        heading,
        h('p', null, 'The digits were ', h('strong', { class: 'timer' }, digits.join(' ')), ok ? '.' : `. You typed ${got.split('').join(' ')}.`),
        stair.change > 0 ? h('p', { class: 'notice notice-good' }, `Two in a row! The next row has ${lengthNow()} digits.`) : null,
        stair.change < 0 ? h('p', { class: 'notice notice-info' }, `The next row is a little shorter: ${lengthNow()} digits. You can build back up.`) : null,
        stair.change === 0 && before === stair.level ? h('p', { class: 'muted' }, ok ? `One more like that and the row gets longer. Next: ${lengthNow()} digits.` : `Next row: ${lengthNow()} digits again.`) : null,
        h('p', { class: 'small muted' }, `Longest row so far: ${best || '–'} digits.`),
        h('div', { class: 'row', style: 'justify-content:center' }, again, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => intro().focus() }, 'Change settings')),
        guestNotice(app, { compact: true }),
      ),
    );
    announce(ok ? `Correct. Next row: ${lengthNow()} digits.` : `Not quite. The digits were ${digits.join(' ')}.`);
    focusOn(heading);
  }

  intro();
  return h('div', { class: 'stack-lg' }, gameHeader('Number recall', 'A row of digits appears one at a time. When it is gone, type it back. Get two rows right and the next one is longer.'), timingControl(settings), stage);
}
