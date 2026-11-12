// The adaptive topic quiz: one question at a time, immediate explanatory feedback,
// a visible tier ladder and a points bar that fills to 100.

import { h, clear, announce, focusOn, confetti, duration } from '../ui/dom.js';
import { rich, richEl, visual, stepsList } from '../ui/math.js';
import { ruleCard, guestNotice } from '../ui/components.js';
import { speakButton, toSpeech } from '../ui/speech.js';
import { tone } from '../ui/tone.js';
import { TIERS, TARGET_SCORE, UP_STREAK, newQuizState, applyAnswer, nextQuestion, toNextTier, accuracy } from '../core/engine.js';
import { makeRng } from '../core/rng.js';
import { recordAnswer, saveRun, completeRun, abandonRun } from '../core/progress.js';
import { topicList, topicKey } from '../content/index.js';

const LETTERS = ['A', 'B', 'C', 'D'];

export function quizSection(ctx, { topic, level }) {
  const { app } = ctx;
  const key = topicKey(level.id, topic.id);
  const band = level.band;
  const canSpeak = band === 'elementary' || band === 'middle';
  // "#/topic/…/quiz?seed=123" makes the questions reproducible (used by the end-to-end tests).
  const seed = Number(new URLSearchParams(location.hash.split('?')[1] ?? '').get('seed'));
  const rng = Number.isInteger(seed) && seed > 0 ? makeRng(seed) : makeRng();

  const saved = app.store.progress.topics[key]?.run;
  const resumed = !!(saved && saved.answered > 0 && saved.score < TARGET_SCORE);
  let state = resumed ? { ...saved, asked: [...saved.asked] } : newQuizState();
  let question = null;
  let answered = false;
  let demotions = 0;
  let sinceTierUp = 0;

  const status = h('div', { class: 'card quiz-status' });
  const stage = h('div');
  const root = h('section', { class: 'stack', 'aria-labelledby': 'quiz-title' }, h('h2', { id: 'quiz-title' }, 'Quiz'));

  if (resumed) {
    root.append(h('p', { class: 'notice notice-info' }, `Welcome back. You are picking up where you left off: ${state.score} points, ${TIERS[state.tier].name} level.`));
  } else {
    root.append(
      h('p', { class: 'muted' }, 'Reach 100 points to finish. Harder questions are worth more. Three right in a row moves you up a level; two wrong in a row moves you down one. A wrong answer costs a few points and shows you how to solve it.'),
    );
  }
  root.append(status, stage);

  // ── status: points, tier ladder, streak ──
  function renderStatus() {
    const tier = TIERS[state.tier];
    const score = Math.min(state.score, TARGET_SCORE);
    const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(TARGET_SCORE), 'aria-valuenow': String(score), 'aria-label': `Points: ${state.score} of ${TARGET_SCORE}` }, h('span'));
    bar.firstChild.style.width = `${score}%`;

    const ladder = h(
      'ol',
      { class: 'tier-ladder', 'aria-label': 'Difficulty levels' },
      TIERS.map((t, i) =>
        h(
          'li',
          { class: `tier-${t.id}${i === state.tier ? ' current' : ''}${i < state.tier ? ' passed' : ''}`, 'aria-current': i === state.tier ? 'step' : null },
          i < state.tier ? h('span', { 'aria-hidden': 'true' }, '✓ ') : null,
          t.name,
          i === state.tier ? h('span', { class: 'sr-only' }, ' (your level now)') : null,
          h('span', { class: 'pts' }, `+${t.right} / −${t.wrong}`),
        ),
      ),
    );

    const need = toNextTier(state);
    const atTop = state.tier === TIERS.length - 1;
    const dots = h('span', { class: 'streak-dots', 'aria-hidden': 'true' }, [0, 1, 2].map((i) => h('span', { class: i < Math.min(state.up, UP_STREAK) ? 'on' : '' })));
    const streakText = atTop
      ? `Top level! ${state.up} right in a row. Each right answer is worth ${tier.right} points.`
      : `${state.up} right in a row. ${need} more to move up to ${TIERS[state.tier + 1].name}.`;

    clear(status).append(
      h('div', { class: 'score-row' }, h('span', { class: 'score-num' }, `${state.score} `, h('span', { class: 'small muted' }, `/ ${TARGET_SCORE} points`)), h('span', { class: 'small muted' }, `Question ${state.answered + (answered ? 0 : 1)} · ${state.correct} right so far`)),
      bar,
      ladder,
      h('div', { class: 'streak' }, dots, h('span', null, streakText)),
    );
  }

  // ── a new question ──
  function showQuestion() {
    let next;
    try {
      next = nextQuestion(topic, state, rng);
    } catch (err) {
      console.error(err);
      clear(stage).append(h('div', { class: 'notice notice-bad', role: 'alert' }, h('p', null, 'We could not make a question just now.'), h('button', { type: 'button', class: 'btn', onclick: showQuestion }, 'Try again')));
      return;
    }
    question = next.question;
    state = next.state;
    answered = false;
    app.store.change((doc) => saveRun(doc, key, state));
    renderStatus();

    const promptId = 'quiz-prompt';
    const hint = h('p', { class: 'error-text', role: 'alert' });
    const group = h(
      'div',
      { class: 'choices', role: 'radiogroup', 'aria-labelledby': promptId },
      question.choices.map((choice, i) =>
        h(
          'div',
          { class: 'choice' },
          // The spoken label gives screen readers the letter and the math in words.
          h('input', { type: 'radio', name: 'answer', id: `choice-${i}`, value: String(i), 'aria-label': `${LETTERS[i]}: ${toSpeech(choice)}` }),
          h('label', { for: `choice-${i}` }, h('span', { class: 'letter', 'aria-hidden': 'true' }, LETTERS[i]), h('span', { class: 'choice-text' }, rich(choice)), h('span', { class: 'mark' })),
        ),
      ),
    );
    const check = h('button', { type: 'submit', class: 'btn btn-primary btn-big' }, 'Check my answer');
    const feedback = h('div', { class: 'feedback' });
    const speak = canSpeak ? speakButton(() => [question.prompt, ...question.choices.map((c, i) => `${LETTERS[i]}. ${c}`)], 'Read the question aloud') : null;

    const form = h(
      'form',
      {
        class: 'card question-card stack',
        novalidate: true,
        onsubmit: (e) => {
          e.preventDefault();
          if (answered) return;
          const picked = form.querySelector('input[name="answer"]:checked');
          if (!picked) {
            hint.textContent = 'Choose an answer first.';
            form.querySelector('input[name="answer"]')?.focus();
            return;
          }
          hint.textContent = '';
          submit(Number(picked.value), { form, group, check, feedback });
        },
      },
      h('div', { class: 'row row-between' }, h('h3', { id: 'quiz-question-title', tabindex: '-1' }, `Question ${state.answered + 1} `, h('span', { class: `tier-badge tier-${question.tier}` }, TIERS[state.tier].name)), speak),
      h('div', { class: 'question-prompt', id: promptId }, rich(question.prompt)),
      visual(question.visual),
      group,
      hint,
      h('div', { class: 'row' }, check, h('span', { class: 'small muted' }, 'Tip: press 1–4 or A–D to choose, then Enter.')),
      feedback,
    );
    clear(stage).append(form, controls());
  }

  // ── after an answer ──
  function submit(choiceIndex, { form, group, check, feedback }) {
    answered = true;
    const isCorrect = choiceIndex === question.correctIndex;
    const tierBefore = state.tier;
    const result = applyAnswer(state, isCorrect);
    state = result.state;
    if (result.tierChange > 0) sinceTierUp = 0;
    else sinceTierUp += 1;
    if (result.tierChange < 0) demotions += 1;

    app.store.change((doc) => {
      recordAnswer(doc, key, { tier: tierBefore, correct: isCorrect, skill: question.skill, delta: result.delta });
      if (result.done) completeRun(doc, key, state);
      else saveRun(doc, key, state);
    });

    // Mark the choices with words and symbols, not colour alone.
    group.querySelectorAll('.choice').forEach((node, i) => {
      const input = node.querySelector('input');
      input.disabled = true;
      const mark = node.querySelector('.mark');
      if (i === question.correctIndex) {
        node.classList.add('is-correct');
        mark.textContent = isCorrect ? '✓ Correct' : '✓ Correct answer';
      } else if (i === choiceIndex) {
        node.classList.add('is-wrong');
        mark.textContent = '✗ Your answer';
      }
    });
    check.hidden = true;
    check.nextSibling?.remove();
    renderStatus();

    const deltaText = result.delta > 0 ? `+${result.delta} points` : result.delta < 0 ? `−${Math.abs(result.delta)} points` : 'no points lost';
    const deltaClass = result.delta > 0 ? 'delta-up' : result.delta < 0 ? 'delta-down' : 'delta-zero';
    const headline = isCorrect ? tone.right(band) : tone.notYet(band);
    const heading = h('h3', { tabindex: '-1' }, h('span', { 'aria-hidden': 'true' }, isCorrect ? '✅ ' : '💡 '), headline, ' ', h('span', { class: `delta ${deltaClass}` }, deltaText));
    const parts = [heading];

    if (result.tierChange > 0) parts.push(h('p', null, h('strong', null, tone.tierUp(band, TIERS[state.tier].name))));
    if (result.tierChange < 0) parts.push(h('p', null, tone.tierDown(band, TIERS[state.tier].name)));

    if (isCorrect) {
      if (question.solution.length) parts.push(h('details', null, h('summary', null, 'See the worked solution'), stepsList(question.solution)));
    } else {
      const note = question.notes?.[choiceIndex];
      if (note) parts.push(h('p', null, h('strong', null, 'About your answer: '), rich(note)));
      parts.push(h('p', { class: 'answer-line' }, h('span', { class: 'label' }, 'Correct answer:'), rich(question.choices[question.correctIndex])));
      const rule = Number.isInteger(question.rule) ? topic.explain.rules[question.rule] : null;
      parts.push(h('h4', null, rule ? 'The rule to remember' : 'The big idea'));
      parts.push(rule ? ruleCard(rule) : h('div', { class: 'card rule' }, richEl('p', null, topic.explain.intro)));
      parts.push(h('h4', null, 'How to solve this one'), stepsList(question.solution));
      if (!result.done && (demotions >= 2 || sinceTierUp >= 10)) {
        parts.push(
          h(
            'p',
            { class: 'notice notice-info' },
            'These are tricky. It can help to look at the worked examples again, or try the interactive model with your own numbers. Your points are kept. ',
            h('a', { href: `#/topic/${key}/examples` }, 'See the examples'),
            ' · ',
            h('a', { href: `#/topic/${key}/try` }, 'Try the model'),
          ),
        );
      }
    }

    const nextBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-primary btn-big',
        onclick: () => {
          if (result.done) showComplete();
          else {
            showQuestion();
            focusOn(document.getElementById('quiz-question-title'));
          }
        },
      },
      result.done ? 'See my results' : isCorrect ? 'Next question' : 'Try a new question',
    );
    parts.push(h('p', null, nextBtn));

    feedback.className = `feedback notice ${isCorrect ? 'notice-good' : 'notice-info'}`;
    clear(feedback).append(...parts);
    announce(
      `${isCorrect ? 'Correct' : 'Not yet'}. ${deltaText}. ${isCorrect ? '' : `The correct answer is ${LETTERS[question.correctIndex]}: ${toSpeech(question.choices[question.correctIndex])}. `}You have ${state.score} points.${result.tierChange > 0 ? ` Moving up to ${TIERS[state.tier].name}.` : result.tierChange < 0 ? ` Moving down to ${TIERS[state.tier].name}.` : ''}`,
    );
    focusOn(heading);
  }

  // ── restart / review links under the question ──
  function controls() {
    let armed = false;
    const restart = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost btn-small',
        onclick: () => {
          if (state.answered > 0 && !armed) {
            armed = true;
            restart.textContent = `Tap again to start over (this clears the ${state.score} points in this quiz)`;
            return;
          }
          app.store.change((doc) => abandonRun(doc, key));
          state = newQuizState();
          demotions = 0;
          sinceTierUp = 0;
          showQuestion();
          announce('Quiz started again from Easy with 0 points.');
          focusOn(document.getElementById('quiz-question-title'));
        },
      },
      'Start this quiz over',
    );
    return h('div', { class: 'row' }, h('a', { class: 'btn btn-ghost btn-small', href: `#/topic/${key}/learn` }, 'Review the rules'), h('a', { class: 'btn btn-ghost btn-small', href: `#/topic/${key}/examples` }, 'See the examples'), restart);
  }

  // ── 100 points ──
  function showComplete() {
    renderStatus();
    const topics = topicList(level.id);
    const idx = topics.findIndex((t) => t.id === topic.id);
    const next = topics[idx + 1];
    const secs = Math.round((Date.now() - (state.startedAt || Date.now())) / 1000);
    const heading = h('h3', { tabindex: '-1' }, 'You reached 100 points!');
    clear(stage).append(
      h(
        'div',
        { class: 'card complete stack pop' },
        h('div', { class: 'big', 'aria-hidden': 'true' }, '🎉'),
        heading,
        h('p', null, 'You finished ', h('strong', null, topic.title), '. You kept going, and it paid off.'),
        h(
          'div',
          { class: 'stat-grid' },
          h('div', { class: 'stat' }, h('b', null, String(state.answered)), h('span', null, 'questions answered')),
          h('div', { class: 'stat' }, h('b', null, `${accuracy(state.correct, state.answered)}%`), h('span', null, 'correct')),
          h('div', { class: 'stat' }, h('b', null, TIERS[state.maxTier].name), h('span', null, 'highest level reached')),
          h('div', { class: 'stat' }, h('b', null, duration(secs)), h('span', null, 'time')),
        ),
        h('p', { class: 'muted' }, 'Finishing a quiz means you can do this today. To make it stick, come back in a few days and try a mixed review.'),
        guestNotice(app, { compact: true }),
        h(
          'div',
          { class: 'row', style: 'justify-content:center' },
          next ? h('a', { class: 'btn btn-primary btn-big', href: `#/topic/${level.id}/${next.id}/learn` }, `Next topic: ${next.title}`) : h('a', { class: 'btn btn-primary btn-big', href: '#/' }, 'Choose another level'),
          h('a', { class: 'btn', href: `#/level/${level.id}` }, `All ${level.title} topics`),
          h('button', { type: 'button', class: 'btn', onclick: () => { state = newQuizState(); demotions = 0; sinceTierUp = 0; showQuestion(); focusOn(document.getElementById('quiz-question-title')); } }, 'Practise this topic again'),
        ),
      ),
    );
    confetti();
    announce(`You reached 100 points and finished ${topic.title}.`);
    focusOn(heading);
  }

  // ── keyboard: 1–4 or A–D pick a choice ──
  const onKey = (e) => {
    if (answered || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target?.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT' || (tag === 'INPUT' && e.target.type !== 'radio')) return;
    if (document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase();
    const i = '1234'.includes(k) && k.length === 1 ? Number(k) - 1 : 'abcd'.includes(k) && k.length === 1 ? 'abcd'.indexOf(k) : -1;
    if (i < 0) return;
    const input = stage.querySelector(`#choice-${i}`);
    if (!input || input.disabled) return;
    input.checked = true;
    input.focus();
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);
  ctx.onLeave(() => document.removeEventListener('keydown', onKey));

  showQuestion();
  return root;
}
