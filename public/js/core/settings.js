// Display and comfort settings. These are preferences for this device, not progress,
// so they are kept in localStorage for guests too.

const KEY = 'mt.settings';
const DEFAULTS = Object.freeze({
  theme: 'auto', // 'auto' | 'light' | 'dark'
  text: 'normal', // 'normal' | 'large' | 'xlarge'
  timing: 'normal', // 'normal' | 'relaxed' (double time) | 'off' (no timers anywhere)
});
const ALLOWED = { theme: ['auto', 'light', 'dark'], text: ['normal', 'large', 'xlarge'], timing: ['normal', 'relaxed', 'off'] };

function read() {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '{}');
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) if (ALLOWED[k].includes(raw?.[k])) out[k] = raw[k];
    return out;
  } catch {
    return { ...DEFAULTS };
  }
}

let current = read();
const listeners = new Set();

function systemDark() {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function apply() {
  const root = globalThis.document?.documentElement;
  if (!root) return;
  const dark = current.theme === 'dark' || (current.theme === 'auto' && systemDark());
  root.dataset.theme = dark ? 'dark' : 'light';
  if (current.text === 'normal') delete root.dataset.text;
  else root.dataset.text = current.text;
}

export const settings = {
  get: (key) => current[key],
  set(key, value) {
    if (!ALLOWED[key]?.includes(value)) return;
    current = { ...current, [key]: value };
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(current));
    } catch {
      /* private mode: the setting still applies for this visit */
    }
    apply();
    listeners.forEach((fn) => fn());
  },
  /** Step to the next allowed value (used by the header buttons). Returns the new value. */
  cycle(key) {
    const list = ALLOWED[key];
    const next = list[(list.indexOf(current[key]) + 1) % list.length];
    settings.set(key, next);
    return next;
  },
  isDark: () => globalThis.document?.documentElement.dataset.theme === 'dark',
  /** Multiplier for every countdown: 1 normal, 2 relaxed, 0 when timers are switched off. */
  timeFactor: () => (current.timing === 'off' ? 0 : current.timing === 'relaxed' ? 2 : 1),
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', apply);
