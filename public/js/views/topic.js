// One topic: Learn (rules) → Examples (worked) → Try it (interactive models) → Quiz.

import { h, clear, announce, focusOn } from '../ui/dom.js';
import { rich, richEl, visual } from '../ui/math.js';
import { breadcrumb, ruleCard, chip, numberField, errorBox } from '../ui/components.js';
import { speakButton, toSpeech } from '../ui/speech.js';
import { findLevel, loadTopic, topicList, topicKey } from '../content/index.js';
import { quizSection } from './quiz.js';

const PARTS = [
  { id: 'learn', label: 'Learn', sub: 'the rules' },
  { id: 'examples', label: 'Examples', sub: 'worked out' },
  { id: 'try', label: 'Try it', sub: 'your numbers' },
  { id: 'quiz', label: 'Quiz', sub: 'to 100 points' },
];

export default async function topicView(ctx) {
  const [levelId, topicId, partId = 'learn'] = ctx.params;
  const level = findLevel(levelId);
  let topic = null;
  if (level) topic = await loadTopic(levelId, topicId);
  if (!level || !topic) {
    ctx.title = 'Topic not found';
    return h('div', { class: 'narrow stack' }, h('h1', null, 'We could not find that topic'), h('p', null, h('a', { class: 'btn btn-primary', href: level ? `#/level/${level.id}` : '#/' }, level ? `See ${level.title} topics` : 'Choose a level')));
  }
  const key = topicKey(level.id, topic.id);
  const part = PARTS.find((p) => p.id === partId) ?? PARTS[0];
  ctx.title = `${topic.title}: ${part.label}`;
  const speakable = level.band === 'elementary' || level.band === 'middle';

  const stepper = h(
    'nav',
    { 'aria-label': 'Lesson steps' },
    h(
      'ol',
      { class: 'stepper' },
      PARTS.map((p, i) =>
        h(
          'li',
          null,
          h('a', { href: `#/topic/${key}/${p.id}`, 'aria-current': p.id === part.id ? 'step' : null }, h('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'step-label' }, h('span', { class: 'sr-only' }, `Step ${i + 1}: `), p.label), h('span', { class: 'step-n' }, p.sub)),
        ),
      ),
    ),
  );

  let body;
  if (part.id === 'learn') body = learnPart(topic, speakable);
  else if (part.id === 'examples') body = examplesPart(topic, speakable);
  else if (part.id === 'try') body = tryPart(topic);
  else body = quizSection(ctx, { topic, level });

  const i = PARTS.indexOf(part);
  const prev = PARTS[i - 1];
  const next = PARTS[i + 1];
  const nav = h(
    'div',
    { class: 'lesson-nav' },
    prev ? h('a', { class: 'btn', href: `#/topic/${key}/${prev.id}` }, `← ${prev.label}`) : h('a', { class: 'btn btn-ghost', href: `#/level/${level.id}` }, `← ${level.title} topics`),
    next ? h('a', { class: 'btn btn-primary btn-big', href: `#/topic/${key}/${next.id}` }, `Next: ${next.label} →`) : null,
  );

  return h(
    'article',
    { class: `stack-lg band-${level.band}` },
    breadcrumb([
      ['Learn', '#/'],
      [level.title, `#/level/${level.id}`],
      [topic.title, null],
    ]),
    h(
      'header',
      { class: 'stack' },
      h('h1', null, topic.title),
      h('p', null, topic.summary),
      h('p', { class: 'small muted' }, topic.grade ? chip(topic.grade) : null, topic.grade ? ' ' : '', `Standards: ${topic.standards.join(' · ')}`),
    ),
    stepper,
    body,
    part.id === 'quiz' ? null : nav,
  );
}

// ───────── 1. Learn ─────────

function learnPart(topic, speakable) {
  const ex = topic.explain;
  const speak = speakable
    ? speakButton(() => [ex.intro, ...ex.rules.flatMap((r, i) => [`Rule ${i + 1}. ${r.title}.`, r.text, r.example ? `Example. ${r.example}` : null]).filter(Boolean)], 'Read this page aloud')
    : null;
  return h(
    'section',
    { class: 'stack', 'aria-labelledby': 'learn-title' },
    h('div', { class: 'row row-between' }, h('h2', { id: 'learn-title' }, 'The big idea'), speak),
    h('div', { class: 'card' }, richEl('p', { class: 'problem' }, ex.intro), visual(ex.visual)),
    h('h2', null, 'The rules'),
    h('div', { class: 'stack' }, ex.rules.map((r, i) => ruleCard(r, i + 1))),
    ex.vocab?.length ? h('section', { class: 'card', 'aria-labelledby': 'vocab-title' }, h('h2', { id: 'vocab-title' }, 'Words to know'), h('dl', { class: 'vocab' }, ex.vocab.flatMap((v) => [richEl('dt', null, v.term), richEl('dd', null, v.def)]))) : null,
    ex.mistakes?.length ? h('section', { class: 'notice notice-warn', 'aria-labelledby': 'mistakes-title' }, h('h2', { id: 'mistakes-title' }, 'Watch out for'), h('ul', null, ex.mistakes.map((m) => richEl('li', null, m)))) : null,
  );
}

// ───────── 2. Examples ─────────

function exampleCard(ex, index, speakable) {
  let shown = 0;
  const total = ex.steps.length;
  const list = h('ol', { class: 'steps', 'aria-label': 'Steps' });
  const answer = h('p', { class: 'answer-line', hidden: true }, h('span', { class: 'label' }, 'Answer:'), rich(ex.answer));
  const nextBtn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Show the first step');
  const allBtn = h('button', { type: 'button', class: 'btn btn-ghost' }, 'Show all steps');
  const buttons = h('div', { class: 'row' }, nextBtn, allBtn);

  const reveal = (upTo, speakIt) => {
    while (shown < upTo) {
      list.append(richEl('li', null, ex.steps[shown]));
      shown += 1;
    }
    if (shown >= total) {
      answer.hidden = false;
      buttons.hidden = true;
      if (speakIt) announce(`Step ${total}: ${toSpeech(ex.steps[total - 1])}. Answer: ${toSpeech(ex.answer)}`);
    } else {
      nextBtn.textContent = `Show step ${shown + 1} of ${total}`;
      if (speakIt) announce(`Step ${shown}: ${toSpeech(ex.steps[shown - 1])}`);
    }
  };
  nextBtn.addEventListener('click', () => reveal(shown + 1, true));
  allBtn.addEventListener('click', () => {
    reveal(total, false);
    announce(`All ${total} steps are shown. Answer: ${toSpeech(ex.answer)}`);
  });

  const speak = speakable ? speakButton(() => [ex.problem, ...ex.steps.slice(0, shown), shown >= total ? `Answer. ${ex.answer}` : null].filter(Boolean), 'Read aloud') : null;
  return h(
    'section',
    { class: 'card stack', 'aria-labelledby': `example-${index}` },
    h('div', { class: 'row row-between' }, h('h3', { id: `example-${index}` }, `Example ${index + 1}: `, rich(ex.title)), h('span', { class: 'row' }, ex.word ? chip('Word problem', 'info') : null, speak)),
    richEl('p', { class: 'problem' }, ex.problem),
    visual(ex.visual),
    list,
    buttons,
    answer,
  );
}

function examplesPart(topic, speakable) {
  return h(
    'section',
    { class: 'stack', 'aria-labelledby': 'examples-title' },
    h('h2', { id: 'examples-title' }, 'Worked examples'),
    h('p', { class: 'muted' }, 'Open one step at a time. Before each step, think about what you would do next.'),
    topic.examples.map((ex, i) => exampleCard(ex, i, speakable)),
  );
}

// ───────── 3. Try it ─────────

function parseNumber(text) {
  const cleaned = String(text).trim().replace(/−/g, '-').replace(/,/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
  return Number(cleaned);
}

function modelCard(model, index) {
  const controls = new Map();
  const out = h('div', { class: 'model-output stack' });
  let announceTimer = null;

  const readValues = () => {
    const values = {};
    let problem = null;
    for (const inp of model.inputs) {
      const node = controls.get(inp.name);
      if (inp.type === 'select') {
        const opt = inp.options[node.selectedIndex] ?? inp.options[0];
        values[inp.name] = opt.value;
        continue;
      }
      const v = parseNumber(node.value);
      let msg = null;
      if (!Number.isFinite(v)) msg = `Type a number for "${inp.label}".`;
      else if (inp.type === 'int' && !Number.isInteger(v)) msg = `"${inp.label}" needs a whole number.`;
      else if (v < inp.min || v > inp.max) msg = `"${inp.label}" needs a number from ${inp.min} to ${inp.max}.`;
      node.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg && !problem) problem = msg;
      values[inp.name] = v;
    }
    return problem ? { problem } : { values };
  };

  const update = () => {
    clearTimeout(announceTimer);
    const r = readValues();
    clear(out);
    if (r.problem) {
      out.append(h('p', { class: 'notice notice-warn' }, r.problem));
      return;
    }
    let result;
    try {
      result = model.compute(r.values);
    } catch (err) {
      console.error(err);
      result = { error: 'Those numbers did not work here. Try different ones.' };
    }
    if (!result || result.error) {
      out.append(richEl('p', { class: 'notice notice-warn' }, result?.error ?? 'Those numbers did not work here. Try different ones.'));
      return;
    }
    if (result.problem) out.append(h('p', { class: 'problem' }, h('strong', null, model.word ? 'The story: ' : 'Problem: '), rich(result.problem)));
    const pic = visual(result.visual);
    if (pic) out.append(pic);
    out.append(h('ol', { class: 'steps', 'aria-label': 'Steps' }, result.steps.map((s) => richEl('li', null, s))));
    out.append(h('p', { class: 'answer-line' }, h('span', { class: 'label' }, 'Answer:'), rich(result.answer)));
    if (result.note) out.append(richEl('p', { class: 'muted' }, result.note));
    announceTimer = setTimeout(() => announce(`Answer: ${toSpeech(result.answer)}`), 900);
  };

  const fields = model.inputs.map((inp) => {
    const id = `model-${index}-${inp.name}`;
    if (inp.type === 'select') {
      const select = h('select', { id, onchange: update }, inp.options.map((o) => h('option', { selected: o.value === inp.value }, o.label)));
      controls.set(inp.name, select);
      return h('div', { class: 'field' }, h('label', { for: id }, inp.label), select);
    }
    const { field, input } = numberField({ id, label: inp.label, value: inp.value, min: inp.min, max: inp.max, step: inp.step ?? 1, integer: inp.type === 'int', onInput: update });
    controls.set(inp.name, input);
    return field;
  });

  const reset = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost btn-small',
      onclick: () => {
        for (const inp of model.inputs) {
          const node = controls.get(inp.name);
          if (inp.type === 'select') node.selectedIndex = Math.max(0, inp.options.findIndex((o) => o.value === inp.value));
          else node.value = String(inp.value);
        }
        update();
        announce('Numbers reset.');
      },
    },
    'Reset the numbers',
  );

  update();
  return h(
    'section',
    { class: 'card stack', 'aria-labelledby': `model-title-${index}` },
    h('div', { class: 'row row-between' }, h('h3', { id: `model-title-${index}` }, rich(model.title)), model.word ? chip('Word problem', 'info') : null),
    model.intro ? richEl('p', { class: 'muted' }, model.intro) : null,
    h('form', { class: 'model-inputs', onsubmit: (e) => e.preventDefault(), 'aria-labelledby': `model-title-${index}` }, fields),
    h('div', null, reset),
    out,
  );
}

function tryPart(topic) {
  return h(
    'section',
    { class: 'stack', 'aria-labelledby': 'try-title' },
    h('h2', { id: 'try-title' }, 'Try it with your own numbers'),
    h('p', { class: 'muted' }, 'Change any number. The steps and the answer update as you type.'),
    topic.models.map((m, i) => {
      try {
        return modelCard(m, i);
      } catch (err) {
        console.error(err);
        return errorBox('This model could not be shown.', 'The other parts of the lesson still work.');
      }
    }),
  );
}

export { focusOn };
