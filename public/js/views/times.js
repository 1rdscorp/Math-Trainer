// Multiplication table: explore the 1–12 grid, practise facts (untimed or timed), take a quiz.

import { h, clear, announce, focusOn } from '../ui/dom.js';
import { visual } from '../ui/math.js';
import { chip, guestNotice } from '../ui/components.js';
import { keypad, answerInput, countdown, clock } from '../ui/keypad.js';
import { makeRng } from '../core/rng.js';
import { TIMES_LEVELS, MAX_TIMES_LEVEL, factKey, pickFact, describeFact, strategy, wrongAnswers, recordFact, levelChange, mastery } from '../core/times.js';

const MODES = [
  ['explore', 'Explore the table'],
  ['practice', 'Practise'],
  ['quiz', 'Quiz'],
];
const RELAXED_QUESTIONS = 20;
const QUIZ_QUESTIONS = 10;
const TIMED_SECONDS = 60;

export default function timesView(ctx) {
  const mode = ctx.params[0] ?? 'explore';
  ctx.title = `Multiplication table: ${MODES.find((m) => m[0] === mode)[1]}`;
  const tabs = h(
    'nav',
    { 'aria-label': 'Multiplication table sections' },
    h('ol', { class: 'stepper' }, MODES.map(([id, label]) => h('li', null, h('a', { href: `#/times-table/${id}`, 'aria-current': id === mode ? 'page' : null }, label)))),
  );
  const body = mode === 'practice' ? practice(ctx) : mode === 'quiz' ? quiz(ctx) : explore(ctx);
  return h('div', { class: 'stack-lg' }, h('header', { class: 'stack' }, h('h1', null, 'Multiplication table'), h('p', null, 'Knowing these facts by heart makes almost everything else in math easier. Start by exploring, then practise a little each day.')), tabs, body);
}

// ───────── Explore ─────────

function explore(ctx) {
  const { app } = ctx;
  const stats = app.store.progress.times.facts;
  let picked = [7, 8];
  let multiple = 0;
  let squares = false;
  let hidden = false;
  let heat = false;
  const revealed = new Set();
  const cells = new Map();
  const detail = h('div', { class: 'card stack', 'aria-live': 'polite' });

  const table = h('table', { class: 'tt-grid' }, h('caption', { class: 'sr-only' }, 'Multiplication table from 1 × 1 to 12 × 12. Use the arrow keys to move between cells.'));
  table.append(h('thead', null, h('tr', null, h('th', { scope: 'col' }, '×'), Array.from({ length: 12 }, (_, i) => h('th', { scope: 'col' }, String(i + 1))))));
  const tbody = h('tbody');
  for (let a = 1; a <= 12; a++) {
    const tr = h('tr', null, h('th', { scope: 'row' }, String(a)));
    for (let b = 1; b <= 12; b++) {
      const btn = h('button', { type: 'button', tabindex: a === picked[0] && b === picked[1] ? '0' : '-1', dataset: { a: String(a), b: String(b) } });
      btn.addEventListener('click', () => select(a, b, true));
      cells.set(`${a},${b}`, btn);
      tr.append(h('td', null, btn));
    }
    tbody.append(tr);
  }
  table.append(tbody);
  table.addEventListener('keydown', (e) => {
    const btn = e.target.closest?.('button[data-a]');
    if (!btn) return;
    let a = Number(btn.dataset.a);
    let b = Number(btn.dataset.b);
    if (e.key === 'ArrowRight') b = Math.min(12, b + 1);
    else if (e.key === 'ArrowLeft') b = Math.max(1, b - 1);
    else if (e.key === 'ArrowDown') a = Math.min(12, a + 1);
    else if (e.key === 'ArrowUp') a = Math.max(1, a - 1);
    else if (e.key === 'Home') b = 1;
    else if (e.key === 'End') b = 12;
    else return;
    e.preventDefault();
    select(a, b, true);
    cells.get(`${a},${b}`).focus();
  });

  function paint() {
    for (const [key, btn] of cells) {
      const [a, b] = key.split(',').map(Number);
      const p = a * b;
      const isPicked = a === picked[0] && b === picked[1];
      const show = !hidden || revealed.has(factKey(a, b)) || isPicked;
      btn.textContent = show ? String(p) : '?';
      btn.setAttribute('aria-label', show ? `${a} times ${b} equals ${p}` : `${a} times ${b}. Answer hidden. Press to show it.`);
      btn.tabIndex = isPicked ? 0 : -1;
      const cls = [];
      if (isPicked) cls.push('picked');
      else if (a === picked[0] || b === picked[1]) cls.push('in-line');
      if (multiple && p % multiple === 0 && !isPicked) cls.push('multiple');
      if (squares && a === b) cls.push('square');
      if (heat && !isPicked) {
        const m = mastery(stats, a, b);
        if (m !== 'none') cls.push(`m-${m}`);
      }
      btn.className = cls.join(' ');
    }
  }

  function select(a, b, user) {
    picked = [a, b];
    if (hidden && user) revealed.add(factKey(a, b));
    paint();
    const p = a * b;
    clear(detail).append(
      h('p', { class: 'big-fact' }, `${a} × ${b} = ${p}`),
      visual({ type: 'array', rows: a, cols: b, alt: `An array with ${a} rows of ${b}, which is ${p} in all.` }),
      h('p', null, h('strong', null, 'One way to work it out: '), strategy(a, b)),
      h('p', { class: 'muted' }, a === b ? `${p} is a square number: ${a} rows of ${a} make a square. ` : `It works both ways: ${b} × ${a} = ${p}. `, `Division facts from the same family: ${p} ÷ ${a} = ${b}${a === b ? '' : ` and ${p} ÷ ${b} = ${a}`}.`),
    );
  }

  const multipleSelect = h(
    'select',
    { id: 'tt-multiple', onchange: (e) => { multiple = Number(e.target.value); paint(); announce(multiple ? `Showing multiples of ${multiple}.` : 'Multiples are no longer highlighted.'); } },
    h('option', { value: '0' }, 'None'),
    Array.from({ length: 12 }, (_, i) => h('option', { value: String(i + 1) }, String(i + 1))),
  );
  const toggle = (label, get, set) => {
    const btn = h('button', { type: 'button', class: 'btn btn-small', 'aria-pressed': String(get()), onclick: () => { set(!get()); btn.setAttribute('aria-pressed', String(get())); paint(); } }, label);
    return btn;
  };
  const hasStats = Object.keys(stats).length > 0;
  const controls = h(
    'div',
    { class: 'row' },
    h('span', { class: 'row' }, h('label', { for: 'tt-multiple' }, 'Highlight multiples of'), multipleSelect),
    toggle('Show square numbers', () => squares, (v) => { squares = v; }),
    toggle('Hide the answers (test myself)', () => hidden, (v) => { hidden = v; revealed.clear(); }),
    hasStats ? toggle('Colour by what I know', () => heat, (v) => { heat = v; }) : null,
  );
  multipleSelect.style.width = 'auto';

  select(7, 8, false);
  return h(
    'section',
    { class: 'stack', 'aria-labelledby': 'explore-title' },
    h('h2', { id: 'explore-title' }, 'Explore the table'),
    h('p', { class: 'muted' }, 'Tap any number to see where it comes from. Find the row and the column: where they cross is the answer.'),
    controls,
    hasStats ? h('p', { class: 'small muted' }, 'With "Colour by what I know" on: green means you usually get it right, yellow means getting there, red means worth practising.') : null,
    h('div', { class: 'grid-2' }, h('div', { class: 'tt-scroll', role: 'region', 'aria-label': 'Multiplication table', tabindex: '-1' }, table), detail),
    h('p', null, h('a', { class: 'btn btn-primary', href: '#/times-table/practice' }, 'Practise these facts →')),
  );
}

// ───────── shared round set-up ─────────

function levelCard(doc) {
  const level = Math.min(doc.times.level, MAX_TIMES_LEVEL);
  const info = TIMES_LEVELS[level];
  return h(
    'div',
    { class: 'notice notice-info' },
    h('p', null, h('strong', null, `Your level: ${level + 1} of ${TIMES_LEVELS.length}. ${info.name}`), ` (${info.blurb}).`),
    h('p', { class: 'small' }, 'Levels follow the order that works best: easy anchor facts first (×1, ×2, ×10, ×5), then the facts you can build from them. Score 90% or better in a round to move up.'),
  );
}

function tablePicker(state, redraw) {
  const boxes = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const id = `tt-table-${n}`;
    return h('span', { class: 'row', style: 'gap:0.25rem' }, h('input', { type: 'checkbox', id, checked: state.tables.includes(n), onchange: (e) => { state.tables = e.target.checked ? [...state.tables, n] : state.tables.filter((t) => t !== n); } }), h('label', { for: id, style: 'font-weight:400' }, `×${n}`));
  });
  const radio = (value, label) => {
    const id = `tt-what-${value}`;
    return h('div', { class: 'row' }, h('input', { type: 'radio', name: 'tt-what', id, checked: state.what === value, onchange: () => { state.what = value; redraw(); } }), h('label', { for: id, style: 'font-weight:400' }, label));
  };
  return h('fieldset', { class: 'stack' }, h('legend', null, 'What to practise'), radio('level', 'My level (recommended)'), radio('tables', 'Let me choose the tables'), state.what === 'tables' ? h('div', { class: 'row', role: 'group', 'aria-label': 'Tables to include' }, boxes) : null);
}

// ───────── Practise ─────────

function practice(ctx) {
  const { app } = ctx;
  const { store, settings } = app;
  const rng = makeRng();
  const root = h('section', { class: 'stack', 'aria-labelledby': 'practice-title' }, h('h2', { id: 'practice-title' }, 'Practise'));
  const stage = h('div', { class: 'stack' });
  root.append(stage);
  const setup = { what: 'level', tables: [2, 5, 10], timed: false };
  let timer = null;
  ctx.onLeave(() => timer?.stop());

  function showSetup() {
    timer?.stop();
    const factor = settings.timeFactor();
    const seconds = TIMED_SECONDS * (factor || 1);
    if (!factor) setup.timed = false;
    const timing = (value, label) => {
      const id = `tt-timing-${value}`;
      return h('div', { class: 'row' }, h('input', { type: 'radio', name: 'tt-timing', id, checked: setup.timed === value, onchange: () => { setup.timed = value; } }), h('label', { for: id, style: 'font-weight:400' }, label));
    };
    const comfort = h(
      'select',
      { id: 'tt-comfort', onchange: (e) => { settings.set('timing', e.target.value); showSetup(); } },
      [['normal', 'Normal'], ['relaxed', 'Double time'], ['off', 'No timers at all']].map(([v, l]) => h('option', { value: v, selected: settings.get('timing') === v }, l)),
    );
    comfort.style.width = 'auto';
    clear(stage).append(
      levelCard(store.progress),
      h(
        'form',
        {
          class: 'card stack',
          onsubmit: (e) => {
            e.preventDefault();
            if (setup.what === 'tables' && !setup.tables.length) {
              announce('Choose at least one table.', { assertive: true });
              return;
            }
            run({ seconds: setup.timed ? seconds : 0 });
          },
        },
        tablePicker(setup, showSetup),
        h(
          'fieldset',
          { class: 'stack' },
          h('legend', null, 'Timer'),
          timing(false, `No timer: ${RELAXED_QUESTIONS} questions, take the time you need`),
          factor ? timing(true, `Timed round: as many as you can in ${seconds} seconds (the clock stops while you read an explanation)`) : h('p', { class: 'small muted' }, 'Timed rounds are switched off in your timer settings.'),
          h('div', { class: 'row' }, h('label', { for: 'tt-comfort', style: 'font-weight:400' }, 'Timer settings for this device:'), comfort),
        ),
        h('p', { class: 'small muted' }, 'Timed rounds are for facts you already understand. They are practice, not a test: the only score to beat is your own.'),
        h('div', null, h('button', { type: 'submit', class: 'btn btn-primary btn-big' }, 'Start')),
      ),
    );
  }

  function run({ seconds }) {
    const timed = seconds > 0;
    const level = store.progress.times.level;
    const tables = setup.what === 'tables' ? setup.tables : null;
    const recent = [];
    const missed = new Map();
    const retry = [];
    let answered = 0;
    let correct = 0;
    let current = null;
    let shownAt = 0;
    let waiting = false;

    const timeBox = h('span', { class: 'timer chip' });
    const scoreBox = h('span', { class: 'chip chip-good' });
    const factBox = h('p', { class: 'big-fact', id: 'tt-fact', 'aria-live': 'polite' });
    const input = answerInput({ label: 'Your answer', maxlength: 4 });
    const feedback = h('div', { class: 'stack', role: 'status' });
    const pauseBtn = timed
      ? h('button', { type: 'button', class: 'btn btn-small', 'aria-pressed': 'false', onclick: () => {
          const paused = !timer.paused;
          if (paused) timer.pause();
          else timer.resume();
          pauseBtn.setAttribute('aria-pressed', String(paused));
          pauseBtn.textContent = paused ? 'Resume' : 'Pause';
          input.disabled = paused;
          factBox.textContent = paused ? 'Paused' : describeFact(current).text;
          if (!paused) input.focus();
        } }, 'Pause')
      : null;

    const updateBars = (nextQuestion = false) => {
      scoreBox.textContent = `${correct} correct`;
      if (!timed && nextQuestion) timeBox.textContent = `Question ${Math.min(answered + 1, RELAXED_QUESTIONS)} of ${RELAXED_QUESTIONS}`;
    };

    const next = () => {
      waiting = false;
      clear(feedback);
      if (!timed && answered >= RELAXED_QUESTIONS) return finish();
      // A missed fact comes back three questions later.
      const due = retry.find((r) => r.at <= answered);
      if (due) {
        retry.splice(retry.indexOf(due), 1);
        current = due.fact;
      } else {
        current = pickFact({ level, tables, stats: store.progress.times.facts, recent, rng });
      }
      recent.push(factKey(current.a, current.b));
      if (recent.length > 4) recent.shift();
      factBox.textContent = describeFact(current).text;
      input.value = '';
      input.disabled = false;
      input.focus({ preventScroll: true });
      shownAt = performance.now();
      updateBars(true);
    };

    const check = () => {
      if (waiting || input.disabled) return;
      const text = input.value.trim();
      if (!/^\d+$/.test(text)) {
        feedback.replaceChildren(h('p', { class: 'error-text' }, 'Type a number, then press ✓ or Enter.'));
        return;
      }
      const info = describeFact(current);
      const ok = Number(text) === info.answer;
      const ms = performance.now() - shownAt;
      answered += 1;
      if (ok) correct += 1;
      store.change((doc) => recordFact(doc, current.a, current.b, ok, ms));
      updateBars();
      if (ok) {
        feedback.replaceChildren(h('p', { class: 'answer-line' }, '✓ Correct!'));
        waiting = true;
        setTimeout(() => { if (waiting) next(); }, 450);
        return;
      }
      // Wrong: stop the clock, show the answer and a way to work it out.
      waiting = true;
      timer?.pause();
      input.disabled = true;
      const key = factKey(current.a, current.b);
      missed.set(key, current);
      retry.push({ fact: current, at: answered + 3 });
      const p = current.a * current.b;
      const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { timer?.resume(); next(); } }, 'Got it, next question');
      feedback.replaceChildren(
        h(
          'div',
          { class: 'notice notice-info stack' },
          h('p', null, h('strong', null, 'Not yet. '), `${current.a} × ${current.b} = ${p}.`),
          h('p', null, strategy(current.a, current.b)),
          timed ? h('p', { class: 'small muted' }, 'The clock is stopped while you read this.') : null,
          h('p', null, nextBtn),
        ),
      );
      nextBtn.focus();
    };

    function finish() {
      timer?.stop();
      timer = null;
      const before = store.progress.times.level;
      const change = tables ? 0 : levelChange(before, answered, correct);
      const bestKey = timed ? `timed${seconds}` : 'relaxed';
      const previousBest = store.progress.times.best[bestKey] ?? 0;
      store.change((doc) => {
        doc.times.rounds += 1;
        doc.times.level = Math.max(0, Math.min(MAX_TIMES_LEVEL, doc.times.level + change));
        if (correct > previousBest) doc.times.best[bestKey] = correct;
      });
      const pct = answered ? Math.round((100 * correct) / answered) : 0;
      const heading = h('h3', { tabindex: '-1' }, answered ? `Round finished: ${correct} of ${answered} correct` : 'Round finished');
      clear(stage).append(
        h(
          'div',
          { class: 'card stack' },
          heading,
          h(
            'div',
            { class: 'stat-grid' },
            h('div', { class: 'stat' }, h('b', null, String(correct)), h('span', null, 'correct')),
            h('div', { class: 'stat' }, h('b', null, `${pct}%`), h('span', null, 'accuracy')),
            h('div', { class: 'stat' }, h('b', null, String(Math.max(previousBest, correct))), h('span', null, timed ? `your best in ${seconds} s` : 'your best round')),
          ),
          correct > previousBest && previousBest > 0 ? h('p', { class: 'notice notice-good' }, `A new personal best! You beat your old score of ${previousBest}.`) : null,
          change > 0 ? h('p', { class: 'notice notice-good' }, `You moved up to level ${before + 2}: ${TIMES_LEVELS[before + 1].name} (${TIMES_LEVELS[before + 1].blurb}).`) : null,
          change < 0 ? h('p', { class: 'notice notice-info' }, `Next round goes back to level ${before}: ${TIMES_LEVELS[before - 1].name}, to make those facts solid first.`) : null,
          missed.size
            ? h('div', { class: 'stack' }, h('h4', null, 'Facts to look at again'), h('ul', null, [...missed.values()].map((f) => h('li', null, h('strong', null, `${f.a} × ${f.b} = ${f.a * f.b}. `), strategy(f.a, f.b)))))
            : answered ? h('p', null, 'No misses this round. Steady, careful work.') : null,
          guestNotice(app, { compact: true }),
          h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => run({ seconds }) }, 'Another round'), h('button', { type: 'button', class: 'btn', onclick: showSetup }, 'Change the settings'), h('a', { class: 'btn btn-ghost', href: '#/times-table/explore' }, 'See the table')),
        ),
      );
      announce(`Round finished. ${correct} of ${answered} correct.`);
      focusOn(heading);
    }

    const form = h('form', { class: 'card stack center', onsubmit: (e) => { e.preventDefault(); check(); } },
      h('div', { class: 'row row-between' }, timeBox, scoreBox),
      factBox,
      input,
      h('div', null, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Check')),
      keypad(input, { onEnter: check }),
      feedback,
      h('div', { class: 'row', style: 'justify-content:center' }, pauseBtn, h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: finish }, 'Finish now')),
    );
    input.setAttribute('aria-describedby', 'tt-fact');
    clear(stage).append(form);

    if (timed) {
      timer = countdown(seconds, {
        onTick: (left) => { timeBox.textContent = `${clock(left)} left`; },
        onDone: () => { announce('Time is up.'); finish(); },
      });
    }
    next();
  }

  showSetup();
  return root;
}

// ───────── Quiz ─────────

function quiz(ctx) {
  const { app } = ctx;
  const { store } = app;
  const rng = makeRng();
  const root = h('section', { class: 'stack', 'aria-labelledby': 'ttquiz-title' }, h('h2', { id: 'ttquiz-title' }, 'Quiz'));
  const stage = h('div', { class: 'stack' });
  root.append(stage);
  const setup = { what: 'level', tables: [2, 5, 10] };
  let onKey = null;
  ctx.onLeave(() => onKey && document.removeEventListener('keydown', onKey));

  function showSetup() {
    clear(stage).append(
      levelCard(store.progress),
      h(
        'form',
        { class: 'card stack', onsubmit: (e) => { e.preventDefault(); if (setup.what === 'tables' && !setup.tables.length) return announce('Choose at least one table.', { assertive: true }); run(); } },
        h('p', null, `${QUIZ_QUESTIONS} multiple-choice questions, no timer. Get 9 or 10 right to move up a level.`),
        tablePicker(setup, showSetup),
        h('div', null, h('button', { type: 'submit', class: 'btn btn-primary btn-big' }, 'Start the quiz')),
      ),
    );
  }

  function run() {
    const level = store.progress.times.level;
    const tables = setup.what === 'tables' ? setup.tables : null;
    const recent = [];
    const missed = [];
    let n = 0;
    let correct = 0;
    let locked = false;
    let buttons = [];

    const ask = () => {
      if (n >= QUIZ_QUESTIONS) return finish();
      locked = false;
      const fact = pickFact({ level, tables, stats: store.progress.times.facts, recent, rng });
      recent.push(factKey(fact.a, fact.b));
      if (recent.length > 4) recent.shift();
      const info = describeFact(fact);
      const options = rng.shuffle([info.answer, ...wrongAnswers(fact, rng)]);
      const shownAt = performance.now();
      const feedback = h('div', { class: 'stack', role: 'status' });
      buttons = options.map((value, i) =>
        h('button', { type: 'button', class: 'btn btn-big', 'aria-label': `Answer ${i + 1}: ${value}`, onclick: () => {
          if (locked) return;
          locked = true;
          const ok = value === info.answer;
          n += 1;
          if (ok) correct += 1;
          else missed.push(fact);
          store.change((doc) => recordFact(doc, fact.a, fact.b, ok, performance.now() - shownAt));
          buttons.forEach((b, j) => {
            b.disabled = true;
            if (options[j] === info.answer) b.classList.add('btn-primary');
          });
          const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: ask }, n >= QUIZ_QUESTIONS ? 'See my score' : 'Next question');
          feedback.replaceChildren(
            ok
              ? h('p', { class: 'answer-line' }, '✓ Correct! ', `${fact.a} × ${fact.b} = ${fact.a * fact.b}`)
              : h('div', { class: 'notice notice-info stack' }, h('p', null, h('strong', null, 'Not yet. '), `${fact.a} × ${fact.b} = ${fact.a * fact.b}.`), h('p', null, strategy(fact.a, fact.b))),
            h('p', null, nextBtn),
          );
          nextBtn.focus();
        } }, String(value)),
      );
      const heading = h('h3', { tabindex: '-1' }, `Question ${n + 1} of ${QUIZ_QUESTIONS}`);
      clear(stage).append(
        h('div', { class: 'card stack center' }, h('div', { class: 'row row-between' }, heading, chip(`${correct} correct`, 'good')), h('p', { class: 'big-fact' }, info.text), h('div', { class: 'grid-2', role: 'group', 'aria-label': 'Choose the answer' }, buttons), h('p', { class: 'small muted' }, 'Tip: press 1, 2, 3 or 4 to choose.'), feedback),
      );
      if (n > 0) focusOn(heading);
    };

    function finish() {
      const before = store.progress.times.level;
      const change = tables ? 0 : correct >= 9 && before < MAX_TIMES_LEVEL ? 1 : correct <= 5 && before > 0 ? -1 : 0;
      store.change((doc) => {
        doc.times.rounds += 1;
        doc.times.level = Math.max(0, Math.min(MAX_TIMES_LEVEL, doc.times.level + change));
        doc.times.best.quiz = Math.max(doc.times.best.quiz ?? 0, correct);
      });
      const heading = h('h3', { tabindex: '-1' }, `You got ${correct} out of ${QUIZ_QUESTIONS}`);
      clear(stage).append(
        h(
          'div',
          { class: 'card stack' },
          heading,
          change > 0 ? h('p', { class: 'notice notice-good' }, `You moved up to level ${before + 2}: ${TIMES_LEVELS[before + 1].name} (${TIMES_LEVELS[before + 1].blurb}).`) : null,
          change < 0 ? h('p', { class: 'notice notice-info' }, `The next quiz goes back to level ${before}: ${TIMES_LEVELS[before - 1].name}, to make those facts solid first.`) : null,
          change === 0 && !tables && correct < 9 ? h('p', null, 'Get 9 or 10 right to move up a level. A little practice each day gets you there.') : null,
          missed.length ? h('div', { class: 'stack' }, h('h4', null, 'Facts to look at again'), h('ul', null, missed.map((f) => h('li', null, h('strong', null, `${f.a} × ${f.b} = ${f.a * f.b}. `), strategy(f.a, f.b))))) : h('p', null, 'Every answer was right. Careful work.'),
          guestNotice(app, { compact: true }),
          h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: run }, 'Another quiz'), h('a', { class: 'btn', href: '#/times-table/practice' }, 'Practise instead'), h('button', { type: 'button', class: 'btn btn-ghost', onclick: showSetup }, 'Change the settings')),
        ),
      );
      announce(`Quiz finished. ${correct} out of ${QUIZ_QUESTIONS}.`);
      focusOn(heading);
    }

    if (onKey) document.removeEventListener('keydown', onKey);
    onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || locked) return;
      const i = '1234'.indexOf(e.key);
      if (i >= 0 && e.key.length === 1 && buttons[i] && stage.contains(buttons[i])) {
        e.preventDefault();
        buttons[i].click();
      }
    };
    document.addEventListener('keydown', onKey);
    ask();
  }

  showSetup();
  return root;
}
