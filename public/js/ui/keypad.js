// An on-screen number pad and a pausable countdown, shared by the times-table and memory activities.

import { h } from './dom.js';

/**
 * A number pad that types into `input`. Tapping it never opens the phone keyboard.
 * Options: onEnter (called by the ✓ key), decimal (adds a "." key), negative (adds a "−" key).
 */
export function keypad(input, { onEnter, decimal = false, negative = false } = {}) {
  const type = (ch) => {
    if (input.disabled) return;
    if (ch === 'back') input.value = input.value.slice(0, -1);
    else if (ch === '-') input.value = input.value.startsWith('-') ? input.value.slice(1) : `-${input.value}`;
    else if (ch === '.') {
      if (!input.value.includes('.')) input.value += '.';
    } else if (input.value.length < (Number(input.getAttribute('maxlength')) || 12)) input.value += ch;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const key = (label, ch, aria) => h('button', { type: 'button', class: 'btn', 'aria-label': aria ?? label, onclick: () => type(ch) }, label);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => key(d, d));
  keys.push(key('⌫', 'back', 'Delete the last digit'), key('0', '0'));
  keys.push(h('button', { type: 'button', class: 'btn btn-primary', 'aria-label': 'Check my answer', onclick: () => onEnter?.() }, '✓'));
  const pad = h('div', { class: 'keypad', role: 'group', 'aria-label': 'Number pad' }, keys);
  if (decimal || negative) {
    pad.append(...(negative ? [key('±', '-', 'Make it negative or positive')] : []), ...(decimal ? [key('.', '.', 'Decimal point')] : []));
  }
  return pad;
}

/** A plain numeric answer box. */
export function answerInput({ label = 'Your answer', maxlength = 6, decimal = false } = {}) {
  return h('input', { type: 'text', class: 'answer-input', inputmode: decimal ? 'decimal' : 'numeric', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: String(maxlength), 'aria-label': label });
}

/**
 * A countdown that can be paused. Calls onTick(secondsLeft) about four times a second and
 * onDone() once when time runs out. Returns { pause, resume, stop, left() }.
 */
export function countdown(seconds, { onTick, onDone }) {
  let remaining = seconds * 1000;
  let last = performance.now();
  let running = true;
  let finished = false;
  const tick = () => {
    if (!running || finished) return;
    const now = performance.now();
    remaining -= now - last;
    last = now;
    if (remaining <= 0) {
      remaining = 0;
      finished = true;
      clearInterval(timer);
      onTick?.(0);
      onDone?.();
      return;
    }
    onTick?.(Math.ceil(remaining / 1000));
  };
  const timer = setInterval(tick, 250);
  onTick?.(seconds);
  return {
    pause() {
      tick();
      running = false;
    },
    resume() {
      if (finished) return;
      last = performance.now();
      running = true;
    },
    stop() {
      finished = true;
      clearInterval(timer);
    },
    left: () => Math.ceil(remaining / 1000),
    get paused() {
      return !running;
    },
  };
}

/** "1:05" */
export function clock(secs) {
  const m = Math.floor(secs / 60);
  return `${m}:${String(secs % 60).padStart(2, '0')}`;
}
