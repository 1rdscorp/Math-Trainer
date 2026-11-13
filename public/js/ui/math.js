// Rich text → DOM. Content strings are plain text with math between \( … \) or \[ … \]
// and **bold**. Text is always inserted as text nodes, so content can never inject markup.

import { h, svgFromVnode } from './dom.js';
import { tidy } from '../core/tidy.js';
import { toSpeech } from '../core/speech-text.js';
import { renderVisual } from '../core/visuals.js';

const MATH = /\\\((.+?)\\\)|\\\[(.+?)\\\]/gs;

function katexNode(tex, display) {
  const span = h('span', { class: display ? 'math-display' : 'math-inline' });
  const katex = globalThis.katex;
  if (!katex) {
    span.textContent = tex;
    return span;
  }
  try {
    katex.render(tex, span, { displayMode: display, throwOnError: true, output: 'htmlAndMathml', strict: 'ignore' });
  } catch (err) {
    span.className = 'math-error';
    span.textContent = tex;
    console.warn('Math did not render:', tex, err.message);
  }
  return span;
}

function textNodes(text) {
  // **bold** → <strong>; newlines → <br>.
  const out = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part === '\n') out.push(h('br'));
    else if (part.startsWith('**') && part.endsWith('**') && part.length > 4) out.push(h('strong', null, part.slice(2, -2)));
    else out.push(document.createTextNode(part));
  }
  return out;
}

/** Turn a rich-text string into a DocumentFragment. */
export function rich(text) {
  const frag = document.createDocumentFragment();
  if (text == null) return frag;
  const str = tidy(String(text));
  let last = 0;
  for (const m of str.matchAll(MATH)) {
    if (m.index > last) frag.append(...textNodes(str.slice(last, m.index)));
    frag.append(katexNode(m[1] ?? m[2], m[2] != null));
    last = m.index + m[0].length;
  }
  if (last < str.length) frag.append(...textNodes(str.slice(last)));
  return frag;
}

/** An element whose content is rich text: richEl('p', { class: 'x' }, text). */
export function richEl(tag, props, text) {
  const node = h(tag, props);
  node.append(rich(text));
  return node;
}

/** Render one visual spec (or an array of them) into a wrapper element. Bad specs are skipped, never thrown. */
export function visual(spec) {
  const wrap = h('div', { class: 'viz-wrap' });
  for (const s of [].concat(spec ?? [])) {
    if (!s) continue;
    try {
      const r = renderVisual(s);
      if (r.kind === 'svg') {
        wrap.append(svgFromVnode(r.vnode));
      } else if (r.kind === 'table') {
        const table = h('table', { class: 'data viz-table' });
        if (r.caption) table.append(richEl('caption', null, r.caption));
        // A header with a formula in it carries its words as hidden text, and the typeset copy is
        // hidden from screen readers: it is read once, and is never an "empty" header. An empty
        // corner cell is an ordinary cell, not a header.
        const head = (c, scope) => {
          if (c === '') return h('td');
          if (!c.includes('\\(')) return richEl('th', { scope }, c);
          return h('th', { scope }, h('span', { class: 'sr-only' }, toSpeech(c)), richEl('span', { 'aria-hidden': 'true' }, c));
        };
        if (r.headers) table.append(h('thead', null, h('tr', null, r.headers.map((c) => head(c, 'col')))));
        table.append(h('tbody', null, r.rows.map((row) => h('tr', null, row.map((c, i) => (r.rowHeaders && i === 0 ? head(c, 'row') : richEl('td', null, c)))))));
        wrap.append(h('div', { class: 'table-wrap' }, table));
      }
    } catch (err) {
      console.warn('Visual could not be drawn:', err.message);
    }
  }
  return wrap.childNodes.length ? wrap : null;
}

/** An ordered list of solution steps. */
export function stepsList(steps) {
  return h('ol', { class: 'steps' }, (steps ?? []).map((s) => richEl('li', null, s)));
}

/**
 * Shrink the text of any answer choice whose formula is too wide for its box, so the whole
 * formula can be seen without scrolling sideways (what tells two choices apart is often at the
 * far end). The text never goes below 58% of its size; past that the choice scrolls instead.
 * Fits again whenever the box changes width (rotation, window resize, a new text size).
 */
export function fitChoices(group) {
  const fit = () => {
    for (const el of group.querySelectorAll('.choice-text')) {
      el.style.fontSize = '';
      const room = el.clientWidth;
      const need = el.scrollWidth;
      if (room > 0 && need > room + 1) el.style.fontSize = `${Math.round(Math.max(0.58, (room / need) * 0.97) * 1000) / 10}%`;
    }
  };
  if (typeof ResizeObserver === 'function') {
    let last = -1;
    new ResizeObserver(() => {
      const w = group.clientWidth;
      if (w === last) return;
      last = w;
      fit();
    }).observe(group);
  } else if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fit);
  // The math fonts may arrive after the first measurement and change the widths: measure again then.
  const fonts = typeof document !== 'undefined' ? document.fonts : null;
  if (fonts?.addEventListener) {
    const onFonts = () => {
      if (group.isConnected) fit();
      else fonts.removeEventListener('loadingdone', onFonts);
    };
    fonts.addEventListener('loadingdone', onFonts);
  }
  return group;
}

// Places where a formula too wide for the screen scrolls inside its own box (see styles.css).
const TEXT_BOXES = '.question-prompt, .steps li, .answer-line, .problem, .rule p, .rule-example p, .notice p, .vocab dd, .card > p';

/**
 * Keep wide content usable on a narrow screen. A formula that is wider than its line is shrunk
 * to fit (never below 60% of its size). Whatever still has to scroll sideways (a wide table, a
 * very long formula) is made reachable from the keyboard, as a scrolling region must be.
 * Safe to call again at any time: after new content appears, a resize, or the fonts arriving.
 */
export function fitWide(root) {
  if (!root) return;
  const floor = 0.6;
  const scale = (room, need) => `${Math.round(Math.max(floor, (room / need) * 0.97) * 1000) / 10}%`;
  for (const box of root.querySelectorAll(TEXT_BOXES)) {
    const inline = box.querySelectorAll('.math-inline');
    for (const m of inline) m.style.fontSize = '';
    const room = box.clientWidth;
    if (room > 0 && box.scrollWidth > room + 1) {
      for (const m of inline) {
        const need = m.getBoundingClientRect().width;
        if (need > room) m.style.fontSize = scale(room, need);
      }
    }
  }
  for (const d of root.querySelectorAll('.katex-display')) {
    const holder = d.parentElement;
    holder.style.fontSize = '';
    if (d.clientWidth > 0 && d.scrollWidth > d.clientWidth + 1) holder.style.fontSize = scale(d.clientWidth, d.scrollWidth);
  }
  for (const box of root.querySelectorAll(`${TEXT_BOXES}, .katex-display, .table-wrap`)) {
    const scrolls = box.scrollWidth > box.clientWidth + 1;
    if (scrolls && !box.hasAttribute('tabindex')) {
      box.tabIndex = 0;
      box.dataset.scroller = '1';
      if (box.classList.contains('table-wrap')) {
        box.setAttribute('role', 'group');
        box.setAttribute('aria-label', 'Table. Scroll sideways to see all of it.');
      }
    } else if (!scrolls && box.dataset.scroller) {
      box.removeAttribute('tabindex');
      box.removeAttribute('role');
      box.removeAttribute('aria-label');
      delete box.dataset.scroller;
    }
  }
}
