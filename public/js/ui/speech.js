// Read-aloud for early readers, using the browser's built-in speech (no network, no recording).
// Offered on Grades 1–5 and 6–8 lessons, where the notation is simple enough to say out loud.

import { h } from './dom.js';
import { toSpeech } from '../core/speech-text.js';

export { toSpeech };

export function canSpeak() {
  return typeof globalThis.speechSynthesis !== 'undefined' && typeof globalThis.SpeechSynthesisUtterance === 'function';
}

export function stopSpeaking() {
  if (canSpeak()) globalThis.speechSynthesis.cancel();
}

/**
 * A "Read aloud" toggle button. `getText` returns the rich text (or array of rich texts) to read.
 * Returns null when the browser has no speech support, so callers can simply skip it.
 */
export function speakButton(getText, label = 'Read aloud') {
  if (!canSpeak()) return null;
  const btn = h('button', { type: 'button', class: 'btn btn-small btn-ghost speak-btn', 'aria-pressed': 'false' }, h('span', { 'aria-hidden': 'true' }, '🔊'), ' ', label);
  const setOn = (on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.lastChild.textContent = on ? 'Stop reading' : label;
  };
  btn.addEventListener('click', () => {
    const synth = globalThis.speechSynthesis;
    if (btn.getAttribute('aria-pressed') === 'true') {
      synth.cancel();
      setOn(false);
      return;
    }
    synth.cancel();
    const parts = [].concat(getText()).map(toSpeech).filter(Boolean);
    if (!parts.length) return;
    setOn(true);
    parts.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      if (i === parts.length - 1) u.onend = u.onerror = () => setOn(false);
      synth.speak(u);
    });
  });
  return btn;
}
