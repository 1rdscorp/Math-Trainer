// Mental-math rounds: quick questions answered in your head, getting harder as you go.

import { h, clear, announce, focusOn } from '../../ui/dom.js';
import { guestNotice } from '../../ui/components.js';
import { keypad, answerInput, countdown, clock } from '../../ui/keypad.js';
import { makeRng } from '../../core/rng.js';
import { MENTAL_LEVELS, MAX_MENTAL_LEVEL, mentalProblem, staircase } from '../../core/mental.js';
import { gameHeader, timingControl } from '../memory.js';

const ROUND_SECONDS = 60;
const UNTIMED_QUESTIONS = 15;

export default function speedView(ctx) {
  const { app } = ctx;
  const { store, settings } = app;
  ctx.title = 'Mental math rounds';
  const rng = makeRng();
  const stage = h('div', { class: 'stack' });
  let timer = null;
  ctx.onLeave(() => timer?.stop());

  function intro() {
    timer?.stop();
    const saved = store.progress.memory.speed ?? { level: 0, best: 0 };
    const factor = settings.timeFactor();
    const select = h('select', { id: 'speed-level' }, MENTAL_LEVELS.map((name, i) => h('option', { value: String(i), selected: i === saved.level }, `Step ${i + 1}: ${name}`)));
    select.style.width = 'auto';
    const start = h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: () => run(Number(select.value)) }, 'Start a round');
    clear(stage).append(
      h(
        'div',
        { class: 'card stack center' },
        h('p', null, factor ? `Answer as many as you can in ${ROUND_SECONDS * factor} seconds. The clock stops while you read a correction.` : `${UNTIMED_QUESTIONS} questions with no time limit.`, saved.best ? ` Your best round: ${saved.best} correct.` : ''),
        h('p', { class: 'muted' }, 'Four right in a row makes the questions a step harder. Two misses in a row makes them a step easier.'),
        h('div', { class: 'row', style: 'justify-content:center' }, h('label', { for: 'speed-level', style: 'font-weight:400' }, 'Start at:'), select),
        h('div', null, start),
      ),
    );
    return start;
  }

  function run(startLevel) {
    timer?.stop();
    const factor = settings.timeFactor();
    const seconds = ROUND_SECONDS * factor;
    let stair = { level: startLevel, up: 0, down: 0 };
    let topLevel = startLevel;
    let answered = 0;
    let correct = 0;
    let current = null;
    let waiting = false;
    const recent = [];

    const timeBox = h('span', { class: 'timer chip' });
    const scoreBox = h('span', { class: 'chip chip-good' });
    const levelBox = h('span', { class: 'chip chip-info' });
    const fact = h('p', { class: 'big-fact', id: 'speed-fact', 'aria-live': 'polite' });
    const input = answerInput({ label: 'Your answer', maxlength: 6 });
    input.setAttribute('aria-describedby', 'speed-fact');
    const feedback = h('div', { class: 'stack', role: 'status' });

    const bars = (nextQuestion = false) => {
      scoreBox.textContent = `${correct} correct`;
      levelBox.textContent = `Step ${stair.level + 1}`;
      if (!factor && nextQuestion) timeBox.textContent = `Question ${Math.min(answered + 1, UNTIMED_QUESTIONS)} of ${UNTIMED_QUESTIONS}`;
    };

    const next = () => {
      waiting = false;
      clear(feedback);
      if (!factor && answered >= UNTIMED_QUESTIONS) return finish();
      for (let tries = 0; tries < 20; tries++) {
        current = mentalProblem(stair.level, rng);
        if (!recent.includes(current.text)) break;
      }
      recent.push(current.text);
      if (recent.length > 6) recent.shift();
      fact.textContent = `${current.text} = ?`;
      input.value = '';
      input.disabled = false;
      input.focus({ preventScroll: true });
      bars(true);
    };

    const check = () => {
      if (waiting || input.disabled) return;
      const text = input.value.trim();
      if (!/^\d+$/.test(text)) {
        feedback.replaceChildren(h('p', { class: 'error-text' }, 'Type a number, then press ✓ or Enter.'));
        return;
      }
      const ok = Number(text) === current.answer;
      answered += 1;
      if (ok) correct += 1;
      stair = staircase(stair, ok, MAX_MENTAL_LEVEL, { upAfter: 4, downAfter: 2 });
      topLevel = Math.max(topLevel, stair.level);
      bars();
      waiting = true;
      if (ok) {
        feedback.replaceChildren(h('p', { class: 'answer-line' }, stair.change > 0 ? `✓ Correct! Stepping up: ${MENTAL_LEVELS[stair.level]}.` : '✓ Correct!'));
        setTimeout(() => { if (waiting) next(); }, stair.change > 0 ? 1100 : 400);
        return;
      }
      timer?.pause();
      input.disabled = true;
      const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { timer?.resume(); next(); } }, 'Got it, next question');
      feedback.replaceChildren(h('div', { class: 'notice notice-info stack' }, h('p', null, h('strong', null, 'Not yet. '), `${current.text} = ${current.answer}.`), stair.change < 0 ? h('p', null, `Stepping down for now: ${MENTAL_LEVELS[stair.level]}.`) : null, h('p', null, nextBtn)));
      nextBtn.focus();
    };

    function finish() {
      timer?.stop();
      timer = null;
      const saved = store.progress.memory.speed ?? { level: 0, best: 0 };
      const newBest = correct > saved.best;
      store.change((doc) => { doc.memory.speed = { level: stair.level, best: Math.max(saved.best, correct) }; });
      const heading = h('h2', { tabindex: '-1' }, `Round finished: ${correct} correct`);
      clear(stage).append(
        h(
          'div',
          { class: 'card stack center' },
          heading,
          h('div', { class: 'stat-grid' }, h('div', { class: 'stat' }, h('b', null, String(correct)), h('span', null, 'correct')), h('div', { class: 'stat' }, h('b', null, answered ? `${Math.round((100 * correct) / answered)}%` : '–'), h('span', null, 'accuracy')), h('div', { class: 'stat' }, h('b', null, String(topLevel + 1)), h('span', null, 'highest step'))),
          newBest && saved.best > 0 ? h('p', { class: 'notice notice-good' }, `A new personal best! Your old best was ${saved.best}.`) : null,
          h('p', { class: 'muted' }, `Next time you start at step ${stair.level + 1}: ${MENTAL_LEVELS[stair.level]}.`),
          h('div', { class: 'row', style: 'justify-content:center' }, h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: () => run(stair.level) }, 'Another round'), h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => intro().focus() }, 'Change settings')),
          guestNotice(app, { compact: true }),
        ),
      );
      announce(`Round finished. ${correct} correct.`);
      focusOn(heading);
    }

    clear(stage).append(
      h(
        'form',
        { class: 'card stack center', onsubmit: (e) => { e.preventDefault(); check(); } },
        h('div', { class: 'row row-between' }, timeBox, levelBox, scoreBox),
        fact,
        input,
        h('div', null, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Check')),
        keypad(input, { onEnter: check }),
        feedback,
        h('div', { class: 'row', style: 'justify-content:center' }, h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: finish }, 'Finish now')),
      ),
    );
    if (factor) {
      timer = countdown(seconds, { onTick: (left) => { timeBox.textContent = `${clock(left)} left`; }, onDone: () => { announce('Time is up.'); finish(); } });
    }
    next();
  }

  intro();
  return h('div', { class: 'stack-lg' }, gameHeader('Mental math rounds', 'Work each one out in your head and type the answer. The only score to beat is your own.'), timingControl(settings, () => intro()), stage);
}
