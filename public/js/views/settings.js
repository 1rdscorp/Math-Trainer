// Display settings: text size, colours and timers. Saved on this device for everyone, guests included.

import { h, announce } from '../ui/dom.js';

const GROUPS = [
  {
    key: 'text',
    legend: 'Text size',
    options: [['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']],
    said: (v) => `Text size: ${v}`,
  },
  {
    key: 'theme',
    legend: 'Colours',
    options: [['auto', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']],
    said: (v) => `Colours: ${v}`,
  },
  {
    key: 'timing',
    legend: 'Timers in practice and games',
    hint: 'Timers are always optional. Slower doubles every time limit. Off removes them completely.',
    options: [['normal', 'Normal'], ['relaxed', 'Slower'], ['off', 'Off']],
    said: (v) => `Timers: ${v}`,
  },
];

export function openSettingsDialog(app) {
  document.getElementById('settings-dialog')?.remove();
  const { settings } = app;
  const dialog = h('dialog', { id: 'settings-dialog', 'aria-labelledby': 'settings-title' });
  const close = () => dialog.close();

  const groups = GROUPS.map((g) =>
    h(
      'fieldset',
      { class: 'stack' },
      h('legend', null, g.legend),
      g.hint ? h('p', { class: 'small muted', style: 'margin:0' }, g.hint) : null,
      h(
        'div',
        { class: 'option-row' },
        g.options.map(([value, label]) => {
          const id = `set-${g.key}-${value}`;
          return h(
            'span',
            { class: 'opt' },
            h('input', { type: 'radio', name: `set-${g.key}`, id, checked: settings.get(g.key) === value, onchange: () => { settings.set(g.key, value); announce(g.said(label)); } }),
            h('label', { for: id }, label),
          );
        }),
      ),
    ),
  );

  dialog.append(
    h('div', { class: 'dialog-head' }, h('h2', { id: 'settings-title' }, 'Display settings'), h('button', { type: 'button', class: 'btn btn-ghost btn-small', 'aria-label': 'Close', onclick: close }, '✕')),
    h('div', { class: 'stack-lg' }, groups, h('p', { class: 'small muted' }, 'These settings are remembered on this device.'), h('div', null, h('button', { type: 'button', class: 'btn btn-primary', onclick: close }, 'Done'))),
  );
  dialog.addEventListener('close', () => {
    dialog.remove();
    app.rerender();
  });
  document.body.append(dialog);
  dialog.showModal();
}
