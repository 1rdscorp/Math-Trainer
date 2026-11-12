// Placement quiz: a short set of questions that suggests where to start.

import { h, clear, announce, focusOn } from '../ui/dom.js';
import { rich, visual } from '../ui/math.js';
import { loading } from '../ui/components.js';
import { speakButton, toSpeech } from '../ui/speech.js';
import { LEVELS, findLevel, loadLevel, topicList } from '../content/index.js';
import { TIERS, nextQuestion } from '../core/engine.js';
import { makeRng } from '../core/rng.js';
import { RUNGS, STARTS, startPlacement, advance, placementResult } from '../core/placement.js';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function placementView(ctx) {
  const { app } = ctx;
  ctx.title = 'Find my level';
  const rng = makeRng();
  const stage = h('div', { class: 'stack' });
  let search = null;
  let rungQuestions = 0; // questions asked on the current rung
  let usedTopics = [];
  let totalAsked = 0;
  let onKey = null;
  ctx.onLeave(() => onKey && document.removeEventListener('keydown', onKey));

  // Rungs whose topics exist in the catalogue.
  const usable = RUNGS.map((r, i) => (r.sources.some(([topicId]) => topicList(r.level).some((t) => t.id === topicId)) ? i : -1)).filter((i) => i >= 0);

  function intro() {
    if (!usable.length) {
      clear(stage).append(h('p', { class: 'notice notice-info' }, 'The placement quiz is not ready yet. You can choose a level yourself.'), h('p', null, h('a', { class: 'btn btn-primary', href: '#/' }, 'Choose a level')));
      return;
    }
    clear(stage).append(
      h(
        'div',
        { class: 'card stack' },
        h('p', null, 'Answer a few questions and we will suggest a good place to start. It usually takes 5 to 12 questions.'),
        h('ul', null, h('li', null, 'There is no timer and no score.'), h('li', null, 'If a question is about something you have not learned yet, just say so. That is exactly what this quiz is trying to find out.'), h('li', null, 'Whatever it suggests, you can still pick any level you like.')),
        h('h2', null, 'First, where are you in school?'),
        h('div', { class: 'grid' }, STARTS.map((s) => h('button', { type: 'button', class: 'btn btn-big', onclick: () => begin(s.rung) }, s.label))),
      ),
    );
  }

  function begin(startRung) {
    search = startPlacement(startRung, usable);
    rungQuestions = 0;
    usedTopics = [];
    totalAsked = 0;
    ask();
  }

  async function makeQuestion(rung) {
    const topics = await loadLevel(rung.level);
    const sources = rung.sources.map(([topicId, tier]) => ({ topic: topics.find((t) => t.id === topicId), tier })).filter((s) => s.topic);
    // Prefer a topic not used yet on this rung, so the two questions test different skills.
    const fresh = sources.filter((s) => !usedTopics.includes(s.topic.id));
    const pool = fresh.length ? fresh : sources;
    for (let attempt = 0; attempt < 6; attempt++) {
      const src = pool[Math.floor(rng.next() * pool.length)];
      try {
        const state = { tier: TIERS.findIndex((t) => t.id === src.tier), asked: [], lastGen: -1, answered: 0, review: null };
        const { question } = nextQuestion(src.topic, state, rng);
        usedTopics.push(src.topic.id);
        return { question, topic: src.topic };
      } catch (err) {
        console.warn(err);
      }
    }
    return null;
  }

  async function ask() {
    const rungIndex = search.usable[search.pos];
    const rung = RUNGS[rungIndex];
    const level = findLevel(rung.level);
    clear(stage).append(loading('Getting the next question…'));
    const made = await makeQuestion(rung);
    if (!made) {
      // Could not build a question for this rung: treat it as not passed and move on.
      return rungDone(false);
    }
    const { question } = made;
    rungQuestions += 1;
    totalAsked += 1;
    let locked = false;

    const speak = level.band === 'elementary' || level.band === 'middle' ? speakButton(() => [question.prompt, ...question.choices.map((c, i) => `${LETTERS[i]}. ${c}`)], 'Read the question aloud') : null;
    const hint = h('p', { class: 'error-text', role: 'alert' });
    const feedback = h('div', { role: 'status' });
    const group = h(
      'div',
      { class: 'choices', role: 'radiogroup', 'aria-labelledby': 'place-prompt' },
      question.choices.map((choice, i) => h('div', { class: 'choice' }, h('input', { type: 'radio', name: 'answer', id: `choice-${i}`, value: String(i), 'aria-label': `${LETTERS[i]}: ${toSpeech(choice)}` }), h('label', { for: `choice-${i}` }, h('span', { class: 'letter', 'aria-hidden': 'true' }, LETTERS[i]), h('span', null, rich(choice)), h('span', { class: 'mark' })))),
    );

    const settle = (correct, skipped) => {
      locked = true;
      group.querySelectorAll('input').forEach((el) => { el.disabled = true; });
      const passedRung = correct && rungQuestions >= 2;
      const failedRung = !correct;
      const message = skipped ? 'No problem. That tells us where to start.' : correct ? 'Got it.' : 'Thanks. On to the next one.';
      const next = h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: () => {
        if (passedRung) rungDone(true);
        else if (failedRung) rungDone(false);
        else ask(); // first question right: one more on this rung
      } }, 'Next');
      clear(feedback).append(h('p', { class: `notice ${correct ? 'notice-good' : 'notice-info'}` }, message), h('p', null, next));
      announce(message);
      next.focus();
    };

    const heading = h('h2', { id: 'place-title', tabindex: '-1' }, `Question ${totalAsked}`);
    const form = h(
      'form',
      {
        class: `card question-card stack band-${level.band}`,
        novalidate: true,
        onsubmit: (e) => {
          e.preventDefault();
          if (locked) return;
          const picked = form.querySelector('input[name="answer"]:checked');
          if (!picked) {
            hint.textContent = 'Choose an answer, or say you have not learned this yet.';
            return;
          }
          hint.textContent = '';
          form.querySelector('.place-actions').hidden = true;
          settle(Number(picked.value) === question.correctIndex, false);
        },
      },
      h('div', { class: 'row row-between' }, heading, speak),
      h('p', { class: 'small muted' }, `About: ${rung.label}`),
      h('div', { class: 'question-prompt', id: 'place-prompt' }, rich(question.prompt)),
      visual(question.visual),
      group,
      hint,
      h('div', { class: 'row place-actions' }, h('button', { type: 'submit', class: 'btn btn-primary btn-big' }, 'Check'), h('button', { type: 'button', class: 'btn btn-big', onclick: () => { if (locked) return; form.querySelector('.place-actions').hidden = true; settle(false, true); } }, 'I have not learned this yet')),
      feedback,
    );
    clear(stage).append(form, h('p', null, h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: finish }, 'Stop and show my result so far')));
    if (totalAsked > 1) focusOn(heading);
    else announce(`Question 1. ${toSpeech(question.prompt)}`);

    if (onKey) document.removeEventListener('keydown', onKey);
    onKey = (e) => {
      if (locked || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const i = k.length === 1 && '1234'.includes(k) ? Number(k) - 1 : k.length === 1 && 'abcd'.includes(k) ? 'abcd'.indexOf(k) : -1;
      const input = i >= 0 ? stage.querySelector(`#choice-${i}`) : null;
      if (!input || input.disabled) return;
      input.checked = true;
      input.focus();
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
  }

  function rungDone(passed) {
    search = advance(search, passed, rungQuestions);
    rungQuestions = 0;
    usedTopics = [];
    if (search.done) finish();
    else ask();
  }

  function finish() {
    if (onKey) document.removeEventListener('keydown', onKey);
    const r = placementResult(search);
    const rung = RUNGS[r.rung];
    const level = findLevel(rung.level);
    const topics = topicList(level.id);
    // Start at the first topic of the rung that exists, or the first topic of the level.
    const startId = rung.sources.map(([id]) => id).find((id) => topics.some((t) => t.id === id)) ?? topics[0]?.id;
    const start = topics.find((t) => t.id === startId);
    app.store.change((doc) => { doc.placement = { level: level.id, topic: start?.id ?? null, at: Date.now() }; });

    const heading = h('h2', { tabindex: '-1' }, r.toppedOut ? `You are ready for ${level.title}, the top level here.` : `A good place to start: ${level.title}`);
    const below = LEVELS[LEVELS.findIndex((l) => l.id === level.id) - 1];
    clear(stage).append(
      h(
        'div',
        { class: 'card stack' },
        h('div', { class: 'card-icon', 'aria-hidden': 'true' }, level.icon),
        heading,
        r.toppedOut
          ? h('p', null, 'You answered every kind of question correctly. Pick any topic you would like to sharpen.')
          : h('p', null, r.passed != null ? `You were comfortable with ${RUNGS[r.passed].label}. ` : '', r.certain ? `The next thing to work on is ${rung.label}.` : `Going by the questions so far, a sensible next step is ${rung.label}.`),
        start ? h('p', null, h('a', { class: 'btn btn-primary btn-big', href: `#/topic/${level.id}/${start.id}/learn` }, `Start with: ${start.title}`)) : null,
        h('div', { class: 'row' }, h('a', { class: 'btn', href: `#/level/${level.id}` }, `See all ${level.title} topics`), below ? h('a', { class: 'btn btn-ghost', href: `#/level/${below.id}` }, `Review ${below.title} first`) : null, h('a', { class: 'btn btn-ghost', href: '#/' }, 'Choose a different level')),
        h('p', { class: 'small muted' }, 'This is only a starting point from a few questions. If the topics feel too easy or too hard, move up or down whenever you like.'),
        h('p', null, h('button', { type: 'button', class: 'btn btn-ghost btn-small', onclick: intro }, 'Take the placement quiz again')),
      ),
    );
    announce(`Placement finished. A good place to start is ${level.title}.`);
    focusOn(heading);
  }

  intro();
  return h('div', { class: 'narrow stack-lg' }, h('header', { class: 'stack' }, h('h1', null, 'Find my level'), h('p', null, 'Not sure where to begin? This short quiz finds a starting point for you.')), stage);
}
