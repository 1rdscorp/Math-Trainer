// Mixed review: a few questions from different topics the student has already worked on.
// Coming back to older material, mixed together, is how practice turns into lasting memory.

import { h, announce, focusOn, fill } from '../ui/dom.js';
import { rich, visual, stepsList } from '../ui/math.js';
import { toSpeech } from '../ui/speech.js';
import { loading, guestNotice } from '../ui/components.js';
import { describeTopic, loadTopic } from '../content/index.js';
import { TIERS, nextQuestion } from '../core/engine.js';
import { makeRng } from '../core/rng.js';
import { recordAnswer } from '../core/progress.js';

const LENGTH = 8;
const LETTERS = ['A', 'B', 'C', 'D'];

/** Topics to review: least recently practised first, with the tier the student has handled. */
export function reviewPlan(doc, length = LENGTH) {
  const candidates = Object.entries(doc.topics)
    .filter(([key, t]) => t.att >= 3 && describeTopic(key))
    .map(([key, t]) => {
      let tier = 0;
      t.tiers.forEach(([, correct], i) => { if (correct > 0) tier = i; });
      return { key, last: t.last, tier: Math.min(2, tier) };
    })
    .sort((a, b) => a.last - b.last);
  if (!candidates.length) return [];
  const plan = [];
  for (let i = 0; plan.length < length; i++) plan.push(candidates[i % candidates.length]);
  // Interleave: avoid the same topic twice in a row where possible.
  for (let i = 1; i < plan.length; i++) {
    if (plan[i].key === plan[i - 1].key) {
      const j = plan.findIndex((p, k) => k > i && p.key !== plan[i].key);
      if (j > 0) [plan[i], plan[j]] = [plan[j], plan[i]];
    }
  }
  return plan;
}

export default function reviewView(ctx) {
  const { app } = ctx;
  ctx.title = 'Mixed review';
  const rng = makeRng();
  const stage = h('div', { class: 'stack' });
  const plan = reviewPlan(app.store.progress);
  const results = [];
  let onKey = null;
  ctx.onLeave(() => onKey && document.removeEventListener('keydown', onKey));

  async function ask(index) {
    if (index >= plan.length) return finish();
    const item = plan[index];
    const info = describeTopic(item.key);
    fill(stage, loading('Getting the next question…'));
    let question = null;
    let topic = null;
    try {
      topic = await loadTopic(info.level.id, info.meta.id);
      ({ question } = nextQuestion(topic, { tier: item.tier, asked: [], lastGen: -1, answered: 0, review: null }, rng));
    } catch (err) {
      console.warn(err);
    }
    if (!question) return ask(index + 1);
    let locked = false;
    const hint = h('p', { class: 'error-text', role: 'alert' });
    const feedback = h('div', { class: 'feedback' });
    const group = h(
      'div',
      { class: 'choices', role: 'radiogroup', 'aria-labelledby': 'review-prompt' },
      question.choices.map((choice, i) => h('div', { class: 'choice' }, h('input', { type: 'radio', name: 'answer', id: `choice-${i}`, value: String(i), 'aria-label': `${LETTERS[i]}: ${toSpeech(choice)}` }), h('label', { for: `choice-${i}` }, h('span', { class: 'letter', 'aria-hidden': 'true' }, LETTERS[i]), h('span', null, rich(choice)), h('span', { class: 'mark' })))),
    );
    const check = h('button', { type: 'submit', class: 'btn btn-primary btn-big' }, 'Check my answer');
    const heading = h('h2', { tabindex: '-1' }, `Question ${index + 1} of ${plan.length}`);
    const form = h(
      'form',
      {
        class: `card question-card stack band-${info.level.band}`,
        novalidate: true,
        onsubmit: (e) => {
          e.preventDefault();
          if (locked) return;
          const picked = form.querySelector('input[name="answer"]:checked');
          if (!picked) {
            hint.textContent = 'Choose an answer first.';
            return;
          }
          hint.textContent = '';
          locked = true;
          const choice = Number(picked.value);
          const ok = choice === question.correctIndex;
          results.push({ key: item.key, title: info.meta.title, ok });
          app.store.change((doc) => recordAnswer(doc, item.key, { tier: item.tier, correct: ok, skill: question.skill, delta: 0 }));
          group.querySelectorAll('.choice').forEach((node, i) => {
            node.querySelector('input').disabled = true;
            if (i === question.correctIndex) { node.classList.add('is-correct'); node.querySelector('.mark').textContent = ok ? '✓ Correct' : '✓ Correct answer'; }
            else if (i === choice) { node.classList.add('is-wrong'); node.querySelector('.mark').textContent = '✗ Your answer'; }
          });
          check.hidden = true;
          const next = h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: () => ask(index + 1) }, index + 1 >= plan.length ? 'See how I did' : 'Next question');
          const title = h('h3', { tabindex: '-1' }, ok ? '✅ You remembered it.' : '💡 Not yet. Here is how it goes.');
          feedback.className = `feedback notice ${ok ? 'notice-good' : 'notice-info'}`;
          fill(feedback, 
            title,
            ok ? h('details', null, h('summary', null, 'See the worked solution'), stepsList(question.solution)) : h('div', null, h('p', { class: 'answer-line' }, h('span', { class: 'label' }, 'Correct answer:'), rich(question.choices[question.correctIndex])), stepsList(question.solution), h('p', null, h('a', { href: `#/topic/${item.key}/learn` }, `Review the rules for ${info.meta.title}`))),
            h('p', null, next),
          );
          announce(ok ? 'Correct.' : `Not yet. The correct answer is ${LETTERS[question.correctIndex]}: ${toSpeech(question.choices[question.correctIndex])}.`);
          focusOn(title);
        },
      },
      h('div', { class: 'row row-between' }, heading, h('span', { class: `tier-badge tier-${TIERS[item.tier].id}` }, TIERS[item.tier].name)),
      h('p', { class: 'small muted' }, `From: ${info.meta.title} · ${info.level.title}`),
      h('div', { class: 'question-prompt', id: 'review-prompt' }, rich(question.prompt)),
      visual(question.visual),
      group,
      hint,
      h('div', null, check),
      feedback,
    );
    fill(stage, form);
    if (index > 0) focusOn(heading);

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

  function finish() {
    if (onKey) document.removeEventListener('keydown', onKey);
    const right = results.filter((r) => r.ok).length;
    const missed = [...new Map(results.filter((r) => !r.ok).map((r) => [r.key, r])).values()];
    const heading = h('h2', { tabindex: '-1' }, `You remembered ${right} of ${results.length}`);
    fill(stage, 
      h(
        'div',
        { class: 'card stack' },
        heading,
        missed.length
          ? h('div', { class: 'stack' }, h('p', null, 'Worth another look:'), h('ul', null, missed.map((m) => h('li', null, h('a', { href: `#/topic/${m.key}/learn` }, m.title)))))
          : h('p', null, 'Everything came back. Spacing your practice like this is what makes it last.'),
        h('p', { class: 'muted' }, 'Mixed reviews do not change your points. They are for remembering.'),
        guestNotice(app, { compact: true }),
        h('div', { class: 'row' }, h('a', { class: 'btn btn-primary', href: '#/' }, 'Back to learning'), h('a', { class: 'btn', href: '#/progress' }, 'See my progress')),
      ),
    );
    announce(`Review finished. ${right} of ${results.length} remembered.`);
    focusOn(heading);
  }

  if (!plan.length) {
    fill(stage, h('div', { class: 'card stack' }, h('p', null, 'A mixed review uses topics you have already practised. Answer a few quiz questions in any topic first, then come back.'), h('p', null, h('a', { class: 'btn btn-primary', href: '#/' }, 'Choose a topic'))));
  } else {
    ask(0);
  }
  return h('div', { class: 'narrow stack-lg' }, h('header', { class: 'stack' }, h('h1', null, 'Mixed review'), h('p', null, `${LENGTH} questions from topics you have worked on, mixed together. No points, no timer.`)), stage);
}
