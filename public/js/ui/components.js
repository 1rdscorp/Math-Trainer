// Small pieces of UI shared by several views.

import { h, emoji } from './dom.js';
import { rich, richEl, visual } from './math.js';
import { TIERS } from '../core/engine.js';

export function breadcrumb(items) {
  return h(
    'nav',
    { class: 'breadcrumb', 'aria-label': 'Breadcrumb' },
    h('ol', null, items.map(([label, href]) => h('li', null, href ? h('a', { href }, label) : h('span', { 'aria-current': 'page' }, label)))),
  );
}

export function tierBadge(tierIndex) {
  const t = TIERS[tierIndex];
  return h('span', { class: `tier-badge tier-${t.id}` }, t.name);
}

/** A thin progress bar with an accessible value. */
export function progressBar(value, max, label) {
  const pct = Math.max(0, Math.min(100, (100 * value) / (max || 1)));
  const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(Math.min(value, max)), 'aria-label': label }, h('span'));
  bar.firstChild.style.width = `${pct}%`;
  return bar;
}

/** The standing notice for guests: clear about what happens to progress, with the way to keep it. */
export function guestNotice(app, { compact = false } = {}) {
  if (!app.store.isGuest) return null;
  return h(
    'div',
    { class: 'notice notice-info guest-notice' },
    h(
      'p',
      null,
      h('strong', null, 'You are practising as a guest. '),
      compact
        ? 'Your progress will be gone when you close this page.'
        : 'Everything works without an account, but your points and progress are not kept after you close this page.',
    ),
    h('p', null, h('button', { type: 'button', class: 'btn btn-primary btn-small', onclick: () => app.openAccount() }, 'Save my progress')),
  );
}

/** A worked list of steps followed by the answer. */
export function solutionBlock(steps, answer) {
  const wrap = h('div', { class: 'solution' });
  if (steps?.length) wrap.append(h('ol', { class: 'steps' }, steps.map((s) => richEl('li', null, s))));
  if (answer != null) wrap.append(h('p', { class: 'answer-line' }, h('span', { class: 'label' }, 'Answer:'), rich(answer)));
  return wrap;
}

/** One rule from a topic's explanation. */
export function ruleCard(rule, number) {
  return h(
    'div',
    { class: 'card rule' },
    h('h3', null, number != null ? `${number}. ` : '', rich(rule.title)),
    richEl('p', null, rule.text),
    rule.example ? h('div', { class: 'rule-example' }, h('p', null, h('strong', null, 'Example: '), rich(rule.example))) : null,
  );
}

export function chip(text, kind = '') {
  return h('span', { class: `chip ${kind ? `chip-${kind}` : ''}`.trim() }, text);
}

export function loading(text = 'Loading…') {
  return h('p', { class: 'muted', role: 'status' }, text);
}

export function errorBox(title, detail, action) {
  return h('div', { class: 'notice notice-bad', role: 'alert' }, h('p', null, h('strong', null, title)), detail ? h('p', null, detail) : null, action ?? null);
}

/** Label + number input with − / + buttons big enough for small fingers. */
export function numberField({ id, label, value, min, max, step = 1, integer = true, onInput }) {
  const input = h('input', {
    id,
    type: 'text',
    inputmode: integer && min >= 0 ? 'numeric' : 'decimal',
    autocomplete: 'off',
    value: String(value),
    'aria-describedby': `${id}-hint`,
  });
  const bump = (dir) => {
    const cur = Number(input.value);
    const base = Number.isFinite(cur) ? cur : value;
    const next = Math.min(max, Math.max(min, Math.round((base + dir * step) * 1e6) / 1e6));
    input.value = String(next);
    onInput();
  };
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); bump(1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); bump(-1); }
  });
  const field = h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    h(
      'div',
      { class: 'number-field' },
      h('button', { type: 'button', class: 'btn', 'aria-label': `Decrease ${label}`, onclick: () => bump(-1) }, '−'),
      input,
      h('button', { type: 'button', class: 'btn', 'aria-label': `Increase ${label}`, onclick: () => bump(1) }, '+'),
    ),
    h('span', { class: 'hint', id: `${id}-hint` }, `${integer ? 'Whole number' : 'Number'} from ${min} to ${max}`),
  );
  return { field, input };
}

export { emoji, rich, richEl, visual };
