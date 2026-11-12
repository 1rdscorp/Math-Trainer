// Rich text → DOM. Content strings are plain text with math between \( … \) or \[ … \]
// and **bold**. Text is always inserted as text nodes, so content can never inject markup.

import { h, svgFromVnode } from './dom.js';
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
  const str = String(text);
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
        if (r.headers) table.append(h('thead', null, h('tr', null, r.headers.map((c) => richEl('th', { scope: 'col' }, c)))));
        table.append(
          h('tbody', null, r.rows.map((row) => h('tr', null, row.map((c, i) => (r.rowHeaders && i === 0 ? richEl('th', { scope: 'row' }, c) : richEl('td', null, c)))))),
        );
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
