// Tiny DOM helpers. No framework: views build real elements with h() and return them.

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * h('button', { class: 'btn', onclick: fn, 'aria-label': 'Close' }, 'text', childNode, [more])
 * Props: `class`, `dataset`, `style` (string), on* handlers, boolean attributes, everything else → setAttribute.
 * Children: strings, numbers, nodes, arrays; null/false are skipped. Strings become text nodes (never HTML).
 */
export function h(tag, props, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'value') node.value = value;
    else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'hidden') node[key] = !!value;
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  for (const child of [].concat(children).flat(Infinity)) {
    if (child == null || child === false || child === '') continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  node.replaceChildren();
  return node;
}

/** Build real SVG elements from a visuals.js vnode tree. */
export function svgFromVnode(v) {
  if (typeof v === 'string' || typeof v === 'number') return document.createTextNode(String(v));
  const node = document.createElementNS(SVG_NS, v.tag);
  for (const [k, val] of Object.entries(v.attrs)) {
    if (val == null || val === false || k === 'xmlns') continue;
    node.setAttribute(k, String(val));
  }
  for (const c of v.children) node.append(svgFromVnode(c));
  return node;
}

/** Announce a message to screen-reader users without moving focus. */
export function announce(message, { assertive = false } = {}) {
  const region = document.getElementById(assertive ? 'live-assertive' : 'live-polite');
  if (!region) return;
  region.textContent = '';
  // Changing the text in a later frame makes sure repeated messages are announced again.
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/** Move keyboard focus to an element that is not normally focusable (a heading, a result panel). */
export function focusOn(node, { scroll = true } = {}) {
  if (!node) return;
  if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
  node.focus({ preventScroll: !scroll });
}

export function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Show a short burst of confetti (skipped entirely for people who prefer reduced motion). */
export function confetti() {
  if (prefersReducedMotion()) return;
  const colors = ['#3438c7', '#0a6334', '#93420a', '#5f2ca8', '#174f9c', '#e0a100'];
  const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < 70; i++) {
    const piece = h('i');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.7}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.append(piece);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 3600);
}

/** Decorative emoji that screen readers should skip. */
export function emoji(char) {
  return h('span', { 'aria-hidden': 'true' }, char);
}

/** Format a duration in seconds as "3 min 20 s" / "45 s". */
export function duration(secs) {
  secs = Math.max(0, Math.round(secs));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m ? `${m} min ${s} s` : `${s} s`;
}

/** Short date like "Nov 12" or "Nov 12, 2025" for other years. */
export function shortDate(ts) {
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}
