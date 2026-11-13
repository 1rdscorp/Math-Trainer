// Visual models (number lines, fraction bars, graphs, shapes …) as plain data.
//
// renderVisual(spec) turns a declarative spec such as { type: 'fractionBars', bars: [{ n: 3, d: 4 }] }
// into a small virtual-node tree. The UI mounts that tree as real SVG; tests render it to a string.
// Nothing here touches the DOM, so content can be validated in Node, and labels are only ever
// inserted as text, never as markup.
//
// Every spec may carry `alt`: a sentence describing the picture for screen-reader users.
// Labels inside pictures are plain text (use Unicode such as ×, ÷, √, π, °, ², ½), not LaTeX.

let uid = 0;

/** Coordinate guard: every number that reaches the SVG must be finite. */
function n(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`visual: non-finite number (${v})`);
  return Math.round(v * 100) / 100;
}

function el(tag, attrs, ...kids) {
  return { tag, attrs: attrs ?? {}, children: kids.flat(Infinity).filter((k) => k != null && k !== false && k !== '') };
}

function text(x, y, s, cls = '', attrs = {}) {
  return el('text', { x: n(x), y: n(y), class: `viz-text ${cls}`.trim(), 'text-anchor': 'middle', 'dominant-baseline': 'central', ...attrs }, String(s));
}

function line(x1, y1, x2, y2, cls = 'viz-stroke') {
  return el('line', { x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2), class: cls });
}

function rect(x, y, w, h, cls, attrs = {}) {
  return el('rect', { x: n(x), y: n(y), width: n(Math.max(0, w)), height: n(Math.max(0, h)), class: cls, ...attrs });
}

function circle(cx, cy, r, cls) {
  return el('circle', { cx: n(cx), cy: n(cy), r: n(r), class: cls });
}

function path(d, cls) {
  return el('path', { d, class: cls });
}

function pts(list) {
  return list.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
}

function polygonEl(list, cls) {
  return el('polygon', { points: pts(list), class: cls });
}

/** Small filled arrowhead with its tip at (x, y), pointing along angle `a` (radians, screen coords). */
function arrowHead(x, y, a, cls = 'viz-ink-fill', size = 8) {
  const p = (da, len) => [x - len * Math.cos(a + da), y - len * Math.sin(a + da)];
  return polygonEl([[x, y], p(0.4, size), p(-0.4, size)], cls);
}

function svg(w, h, alt, ...kids) {
  return {
    kind: 'svg',
    width: w,
    height: h,
    alt,
    vnode: el('svg', { viewBox: `0 0 ${n(w)} ${n(h)}`, role: 'img', 'aria-label': alt, class: 'viz', style: `width:${n(w / 16)}rem`, xmlns: 'http://www.w3.org/2000/svg' }, kids),
  };
}

function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

function fmt(v) {
  const r = Math.round(v * 1e6) / 1e6;
  return String(r === 0 ? 0 : r).replace('-', '−');
}

const FILLS = ['viz-fill-a', 'viz-fill-b', 'viz-fill-c', 'viz-fill-d'];
const LINES = ['viz-line-a', 'viz-line-b', 'viz-line-c', 'viz-line-d'];
const colorIndex = (c, fallback = 0) => {
  if (c == null || c === '') return fallback;
  const i = typeof c === 'number' ? c : 'abcd'.indexOf(c);
  return i >= 0 && i < 4 ? i : fallback;
};

// ───────────────────────────── number line ─────────────────────────────

function numberLine(s) {
  const { min, max } = s;
  if (!(max > min)) throw new Error('numberLine: max must be greater than min');
  let step = s.step ?? niceStep((max - min) / 10);
  if ((max - min) / step > 60) step = niceStep((max - min) / 20);
  const count = Math.round((max - min) / step);
  const jumps = s.jumps ?? [];
  const points = s.points ?? [];
  const W = 360;
  const x0 = 30;
  const x1 = 330;
  const labelsBelow = jumps.length > 0;
  const X = (v) => x0 + ((v - min) / (max - min)) * (x1 - x0);
  const textWidth = (str, per = 7.4) => String(str).length * per + 4;

  // Lay out the jump labels first: a label that would touch its neighbour is lifted a row.
  const jumpLayout = jumps.map((j) => {
    const xa = X(j.from);
    const xb = X(j.to);
    return { xa, xb, xm: (xa + xb) / 2, lift: Math.min(40, 16 + Math.abs(xb - xa) * 0.3), row: 0 };
  });
  let rows = 1;
  jumpLayout.forEach((j, i) => {
    if (jumps[i].label == null) return;
    const half = textWidth(jumps[i].label) / 2;
    const clash = (row) => jumpLayout.slice(0, i).some((o, k) => jumps[k].label != null && o.row === row && Math.abs(o.xm - j.xm) < half + textWidth(jumps[k].label) / 2);
    while (clash(j.row) && j.row < 3) j.row += 1;
    rows = Math.max(rows, j.row + 1);
  });
  const yLine = jumps.length ? 62 + (rows - 1) * 15 : points.some((p) => p.label != null) ? 40 : 24;
  const H = yLine + (labelsBelow && points.some((p) => p.label != null) ? 56 : 38);
  const out = [];

  out.push(line(12, yLine, 348, yLine, 'viz-axis'), arrowHead(8, yLine, Math.PI), arrowHead(352, yLine, 0));

  const custom = s.labels;
  const every = Math.max(1, Math.ceil((count + 1) / 13));
  for (let i = 0; i <= count; i++) {
    const v = min + i * step;
    out.push(line(X(v), yLine - 6, X(v), yLine + 6, 'viz-axis'));
    if (!custom && i % every === 0) out.push(text(X(v), yLine + 20, fmt(v), 'viz-text-sm'));
  }
  // Custom tick labels: skip any that would run into the one before it.
  let lastRight = -Infinity;
  for (const l of [...(custom ?? [])].sort((a, b) => a.value - b.value)) {
    const half = textWidth(l.text, 6.6) / 2;
    if (X(l.value) - half < lastRight + 3) continue;
    lastRight = X(l.value) + half;
    out.push(text(X(l.value), yLine + 20, l.text, 'viz-text-sm'));
  }

  if (s.segment) {
    const { from, to, openFrom, openTo } = s.segment;
    // An end that lies beyond the visible range runs off the line as an arrow.
    const offLeft = from < min;
    const offRight = to > max;
    const xa = offLeft ? 14 : X(from);
    const xb = offRight ? 346 : X(to);
    out.push(line(xa, yLine, xb, yLine, 'viz-line-a viz-thick'));
    out.push(offLeft ? arrowHead(6, yLine, Math.PI, 'viz-dot-a', 11) : circle(xa, yLine, 6, openFrom ? 'viz-open-a' : 'viz-dot-a'));
    out.push(offRight ? arrowHead(354, yLine, 0, 'viz-dot-a', 11) : circle(xb, yLine, 6, openTo ? 'viz-open-a' : 'viz-dot-a'));
  }
  // `ray` may be one ray or a list of rays (for "x < a or x > b").
  for (const { from, dir, open } of [].concat(s.ray ?? [], s.rays ?? [])) {
    const right = dir !== 'left';
    const end = right ? 346 : 14;
    out.push(line(X(from), yLine, end, yLine, 'viz-line-a viz-thick'), arrowHead(right ? 354 : 6, yLine, right ? 0 : Math.PI, 'viz-dot-a', 11));
    out.push(circle(X(from), yLine, 6, open ? 'viz-open-a' : 'viz-dot-a'));
  }

  jumps.forEach((j, i) => {
    const { xa, xb, xm, lift, row } = jumpLayout[i];
    const yBase = yLine - 9;
    const yc = yBase - lift;
    out.push(path(`M ${n(xa)} ${n(yBase)} Q ${n(xm)} ${n(yc)} ${n(xb)} ${n(yBase)}`, `${LINES[i % 2 ? 1 : 0]} viz-thin`));
    out.push(arrowHead(xb, yBase, Math.atan2(yBase - yc, xb - xm), i % 2 ? 'viz-dot-b' : 'viz-dot-a', 7));
    if (j.label != null) out.push(text(xm, yBase - lift / 2 - 12 - row * 15, j.label, 'viz-text-sm viz-text-b'));
  });

  for (const p of points) {
    out.push(circle(X(p.value), yLine, 6, p.open ? 'viz-open-a' : `viz-dot-${'abcd'[colorIndex(p.color)]}`));
    if (p.label != null) out.push(text(X(p.value), labelsBelow ? yLine + 40 : yLine - 18, p.label, 'viz-text-b'));
  }

  // Default description: the range, any marked points, and any shaded part.
  const shaded = [];
  if (s.segment) {
    const { from, to, openFrom, openTo } = s.segment;
    const end = (v, open) => `${fmt(v)} (${open ? 'an open' : 'a closed'} circle)`;
    if (from < min && to > max) shaded.push('the whole line is shaded');
    else if (from < min) shaded.push(`shaded to the left of ${end(to, openTo)}`);
    else if (to > max) shaded.push(`shaded to the right of ${end(from, openFrom)}`);
    else shaded.push(`shaded between ${end(from, openFrom)} and ${end(to, openTo)}`);
  }
  for (const r of [].concat(s.ray ?? [], s.rays ?? [])) shaded.push(`shaded to the ${r.dir !== 'left' ? 'right' : 'left'} of ${fmt(r.from)} (${r.open ? 'an open' : 'a closed'} circle)`);
  const alt =
    s.alt ??
    `Number line from ${fmt(min)} to ${fmt(max)}${points.length ? ` with ${points.map((p) => p.label ?? fmt(p.value)).join(', ')} marked` : ''}${shaded.length ? `, ${shaded.join(' and ')}` : ''}.`;
  return svg(W, H, alt, out);
}

// ───────────────────────────── counters / ten frames ─────────────────────────────

function counters(s) {
  const groups = (s.groups ?? []).map((g) => (typeof g === 'number' ? { count: g } : g));
  const total = groups.reduce((a, g) => a + g.count, 0);
  if (total > 120) throw new Error('counters: too many to draw');
  const crossed = s.crossed ?? 0;
  const frame = !!s.frame;
  const cell = 26;
  const out = [];
  const colorOf = [];
  groups.forEach((g, gi) => {
    for (let k = 0; k < g.count; k++) colorOf.push(colorIndex(g.color, gi % 4));
  });

  let W;
  let H;
  if (frame) {
    // Ten-frames: 5 across, 2 down, two frames per row.
    const frames = Math.max(1, Math.ceil(total / 10));
    const perRow = 2;
    const fw = 5 * cell;
    const fh = 2 * cell;
    const gap = 18;
    W = 10 + Math.min(frames, perRow) * (fw + gap) - gap + 10;
    H = 10 + Math.ceil(frames / perRow) * (fh + gap) - gap + 10;
    for (let f = 0; f < frames; f++) {
      const fx = 10 + (f % perRow) * (fw + gap);
      const fy = 10 + Math.floor(f / perRow) * (fh + gap);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) out.push(rect(fx + c * cell, fy + r * cell, cell, cell, 'viz-cell'));
      for (let k = 0; k < 10; k++) {
        const idx = f * 10 + k;
        if (idx >= total) break;
        const cx = fx + (k % 5) * cell + cell / 2;
        const cy = fy + Math.floor(k / 5) * cell + cell / 2;
        out.push(counter(cx, cy, colorOf[idx], idx >= total - crossed));
      }
    }
  } else {
    const perRow = s.perRow ?? 10;
    const rows = Math.max(1, Math.ceil(total / perRow));
    const gapAt = perRow === 10 ? 5 : 0;
    W = 14 + perRow * cell + (gapAt ? 10 : 0) + 6;
    H = 12 + rows * cell + 6;
    for (let idx = 0; idx < total; idx++) {
      const c = idx % perRow;
      const r = Math.floor(idx / perRow);
      const cx = 14 + c * cell + cell / 2 + (gapAt && c >= gapAt ? 10 : 0);
      const cy = 12 + r * cell + cell / 2;
      out.push(counter(cx, cy, colorOf[idx], idx >= total - crossed));
    }
  }
  const alt = s.alt ?? `${groups.map((g) => g.count).join(' and ')} counters${crossed ? `, with ${crossed} crossed out` : ''}.`;
  return svg(W, H, alt, out);
}

function counter(cx, cy, color, isCrossed) {
  const dot = circle(cx, cy, 10, `${FILLS[color]} viz-outline${isCrossed ? ' viz-faded' : ''}`);
  if (!isCrossed) return dot;
  return [dot, line(cx - 8, cy - 8, cx + 8, cy + 8, 'viz-cross'), line(cx - 8, cy + 8, cx + 8, cy - 8, 'viz-cross')];
}

// ───────────────────────────── base-ten blocks ─────────────────────────────

function baseTen(s) {
  const value = s.value;
  if (!Number.isInteger(value) || value < 0 || value > 9999) throw new Error('baseTen: value must be a whole number from 0 to 9999');
  const th = Math.floor(value / 1000);
  const hu = Math.floor(value / 100) % 10;
  const te = Math.floor(value / 10) % 10;
  const on = value % 10;
  const u = 5;
  const out = [];
  let x = 10;
  const top = 26;
  const colLabel = (cx, label) => out.push(text(cx, 12, label, 'viz-text-sm'));

  if (th) {
    const startX = x;
    for (let i = 0; i < th; i++) {
      const bx = x + (i % 3) * 58;
      const by = top + Math.floor(i / 3) * 58;
      out.push(rect(bx, by, 52, 52, 'viz-fill-d viz-outline'), text(bx + 26, by + 26, '1,000', 'viz-text-sm'));
    }
    const w = Math.min(th, 3) * 58 - 6;
    colLabel(startX + w / 2, `${th} thousand${th === 1 ? '' : 's'}`);
    x += w + 18;
  }
  if (hu) {
    const startX = x;
    const perRow = 5;
    for (let i = 0; i < hu; i++) {
      const bx = x + (i % perRow) * 56;
      const by = top + Math.floor(i / perRow) * 56;
      out.push(rect(bx, by, 50, 50, 'viz-fill-a viz-outline'));
      for (let k = 1; k < 10; k++) {
        out.push(line(bx + k * u, by, bx + k * u, by + 50, 'viz-hair'), line(bx, by + k * u, bx + 50, by + k * u, 'viz-hair'));
      }
    }
    const w = Math.min(hu, perRow) * 56 - 6;
    colLabel(startX + w / 2, `${hu} hundred${hu === 1 ? '' : 's'}`);
    x += w + 18;
  }
  if (te) {
    const startX = x;
    for (let i = 0; i < te; i++) {
      const bx = x + i * 11;
      out.push(rect(bx, top, 7, 50, 'viz-fill-b viz-outline'));
      for (let k = 1; k < 10; k++) out.push(line(bx, top + k * u, bx + 7, top + k * u, 'viz-hair'));
    }
    const w = te * 11 - 4;
    colLabel(startX + Math.max(w, 34) / 2, `${te} ten${te === 1 ? '' : 's'}`);
    x += Math.max(w, 34) + 18;
  }
  if (on || value === 0) {
    const startX = x;
    for (let i = 0; i < on; i++) {
      out.push(rect(x + (i % 3) * 12, top + Math.floor(i / 3) * 12, 8, 8, 'viz-fill-c viz-outline'));
    }
    colLabel(startX + 20, `${on} one${on === 1 ? '' : 's'}`);
    x += 44;
  }
  const rows = Math.max(th > 3 ? Math.ceil(th / 3) * 58 : th ? 58 : 0, hu > 5 ? 112 : hu ? 56 : 0, 56);
  const alt = s.alt ?? `Base-ten blocks showing ${value}: ${[th && `${th} thousands`, hu && `${hu} hundreds`, `${te} tens`, `${on} ones`].filter(Boolean).join(', ')}.`;
  return svg(Math.max(x, 120), top + rows + 6, alt, out);
}

// ───────────────────────────── array (rows × columns) ─────────────────────────────

function arrayModel(s) {
  const { rows, cols } = s;
  if (!(rows >= 1 && cols >= 1 && rows <= 12 && cols <= 12)) throw new Error('array: rows and cols must be 1–12');
  const cell = 22;
  const left = 40;
  const top = 30;
  const squares = s.style === 'squares';
  const splitCol = s.split?.cols;
  const splitRow = s.split?.rows;
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const second = (splitCol != null && c >= splitCol) || (splitRow != null && r >= splitRow);
      const cls = `${second ? 'viz-fill-b' : 'viz-fill-a'} viz-outline`;
      out.push(squares ? rect(left + c * cell, top + r * cell, cell, cell, cls) : circle(left + c * cell + cell / 2, top + r * cell + cell / 2, 8, cls));
    }
  }
  if (splitCol != null && splitCol > 0 && splitCol < cols) out.push(line(left + splitCol * cell, top - 6, left + splitCol * cell, top + rows * cell + 6, 'viz-stroke viz-dash'));
  if (splitRow != null && splitRow > 0 && splitRow < rows) out.push(line(left - 6, top + splitRow * cell, left + cols * cell + 6, top + splitRow * cell, 'viz-stroke viz-dash'));
  if (s.labels !== false) {
    out.push(text(left + (cols * cell) / 2, 13, `${cols} in each row`, 'viz-text-sm'));
    out.push(text(18, top + (rows * cell) / 2, `${rows}`, 'viz-text-b'), text(18, top + (rows * cell) / 2 + 15, rows === 1 ? 'row' : 'rows', 'viz-text-sm'));
  }
  const alt = s.alt ?? `An array with ${rows} rows and ${cols} in each row, ${rows * cols} in all.`;
  return svg(Math.max(left + cols * cell + 14, 150), top + rows * cell + (rows === 1 ? 22 : 12), alt, out);
}

// ───────────────────────────── fraction bars ─────────────────────────────

function fractionBars(s) {
  const bars = s.bars ?? [];
  if (!bars.length) throw new Error('fractionBars: no bars');
  for (const b of bars) if (!(b.d >= 1) || !Number.isInteger(b.d) || b.n < 0 || !Number.isInteger(b.n)) throw new Error('fractionBars: n and d must be whole numbers with d ≥ 1');
  const wholes = Math.max(1, ...bars.map((b) => Math.ceil(b.n / b.d)));
  if (wholes > 6) throw new Error('fractionBars: fraction too large to draw');
  const full = 300;
  const gap = wholes > 1 ? 8 : 0;
  const wholeW = (full - gap * (wholes - 1)) / wholes;
  const barH = 30;
  const rowH = 58;
  const out = [];
  bars.forEach((b, i) => {
    const y = 22 + i * rowH;
    const need = Math.max(1, Math.ceil(b.n / b.d));
    const fill = FILLS[colorIndex(b.color, i % 4)];
    out.push(text(12, y - 11, b.label ?? `${b.n}/${b.d}`, 'viz-text-sm viz-text-b', { 'text-anchor': 'start' }));
    for (let w = 0; w < need; w++) {
      const x = 12 + w * (wholeW + gap);
      const shadedHere = Math.min(b.d, Math.max(0, b.n - w * b.d));
      const partW = wholeW / b.d;
      out.push(rect(x, y, wholeW, barH, 'viz-fill-bg'));
      if (shadedHere) out.push(rect(x, y, partW * shadedHere, barH, fill));
      if (b.d <= 48) for (let k = 1; k < b.d; k++) out.push(line(x + k * partW, y, x + k * partW, y + barH, 'viz-hairline'));
      out.push(rect(x, y, wholeW, barH, 'viz-outline viz-fill-none'));
    }
  });
  const alt = s.alt ?? `Fraction bars showing ${bars.map((b) => b.label ?? `${b.n}/${b.d}`).join(', ')}.`;
  return svg(324, 22 + bars.length * rowH - 16, alt, out);
}

// ───────────────────────────── bar model (tape diagram) ─────────────────────────────

function barModel(s) {
  const rows = s.rows ?? [];
  if (!rows.length) throw new Error('barModel: no rows');
  const totals = rows.map((r) => r.parts.reduce((a, p) => a + (p.value > 0 ? p.value : 0), 0));
  const maxTotal = Math.max(...totals);
  if (!(maxTotal > 0)) throw new Error('barModel: parts need positive values');
  const hasLabels = rows.some((r) => r.label);
  const left = hasLabels ? 78 : 10;
  const full = 340 - left;
  const barH = 34;
  const out = [];
  let y = 10;
  rows.forEach((r, ri) => {
    if (r.label) out.push(text(left - 8, y + barH / 2, r.label, 'viz-text-sm', { 'text-anchor': 'end' }));
    let x = left;
    r.parts.forEach((p, pi) => {
      const w = (Math.max(p.value, 0) / maxTotal) * full;
      const shade = p.shade === 'none' ? 'viz-fill-bg' : FILLS[colorIndex(p.shade, (ri + pi) % 4)];
      out.push(rect(x, y, w, barH, `${shade} viz-outline`));
      if (p.label != null && w > 14) out.push(text(x + w / 2, y + barH / 2, p.label, 'viz-text-sm viz-text-b'));
      x += w;
    });
    y += barH;
    if (r.total != null) {
      const x2 = left + (totals[ri] / maxTotal) * full;
      out.push(path(`M ${n(left)} ${n(y + 5)} v 6 H ${n(x2)} v -6`, 'viz-stroke viz-thin'));
      out.push(text((left + x2) / 2, y + 23, r.total, 'viz-text-sm viz-text-b'));
      y += 30;
    }
    y += 12;
  });
  const alt = s.alt ?? `Bar model: ${rows.map((r) => `${r.label ? r.label + ': ' : ''}${r.parts.map((p) => p.label ?? p.value).join(' + ')}${r.total != null ? ` (total ${r.total})` : ''}`).join('; ')}.`;
  return svg(350, y, alt, out);
}

// ───────────────────────────── area model ─────────────────────────────

function areaModel(s) {
  const rows = s.rows ?? [];
  const cols = s.cols ?? [];
  if (!rows.length || !cols.length) throw new Error('areaModel: rows and cols are required');
  const cw = Math.min(110, Math.floor(290 / cols.length));
  const ch = 46;
  const left = 54;
  const top = 30;
  const out = [];
  cols.forEach((c, j) => out.push(text(left + j * cw + cw / 2, 14, c, 'viz-text-b')));
  rows.forEach((r, i) => {
    out.push(text(left - 10, top + i * ch + ch / 2, r, 'viz-text-b', { 'text-anchor': 'end' }));
    cols.forEach((c, j) => {
      out.push(rect(left + j * cw, top + i * ch, cw, ch, `${FILLS[(i + j) % 4]} viz-outline`));
      const cell = s.cells?.[i]?.[j];
      if (cell != null) out.push(text(left + j * cw + cw / 2, top + i * ch + ch / 2, cell, 'viz-text-sm viz-text-b'));
    });
  });
  const alt = s.alt ?? `Area model with rows ${rows.join(', ')} and columns ${cols.join(', ')}${s.cells ? `; the parts are ${s.cells.flat().join(', ')}` : ''}.`;
  return svg(left + cols.length * cw + 12, top + rows.length * ch + 10, alt, out);
}

// ───────────────────────────── coordinate plot ─────────────────────────────

function piLabel(v) {
  const k = v / Math.PI;
  for (const d of [1, 2, 3, 4, 6]) {
    const num = k * d;
    if (Math.abs(num - Math.round(num)) < 1e-9) {
      const a = Math.round(num);
      if (a === 0) return '0';
      const sign = a < 0 ? '−' : '';
      const top = Math.abs(a) === 1 ? 'π' : `${Math.abs(a)}π`;
      return d === 1 ? `${sign}${top}` : `${sign}${top}/${d}`;
    }
  }
  return fmt(v);
}

function plot(s) {
  const [xMin, xMax] = s.x ?? [-10, 10];
  const [yMin, yMax] = s.y ?? [-10, 10];
  if (!(xMax > xMin) || !(yMax > yMin)) throw new Error('plot: bad axis range');
  const W = s.size?.[0] ?? 360;
  const H = s.size?.[1] ?? (s.square ? 360 : 280);
  const m = { l: 34, r: 16, t: 14, b: 26 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const X = (x) => m.l + ((x - xMin) / (xMax - xMin)) * pw;
  const Y = (y) => m.t + ph - ((y - yMin) / (yMax - yMin)) * ph;
  const xStep = s.step?.[0] ?? (s.piTicks ? Math.PI / 2 : niceStep((xMax - xMin) / 8));
  const yStep = s.step?.[1] ?? niceStep((yMax - yMin) / 7);
  const id = `viz-clip-${++uid}`;
  const out = [];
  const inside = [];
  // Boxes that labels must keep clear of: the numbers on the axes, the marked points, other labels.
  const taken = [];
  const tickBox = (cx, cy, str, anchor) => {
    const w = String(str).length * 6.4 + 2;
    const left = anchor === 'end' ? cx - w : cx - w / 2;
    taken.push([left, cy - 6, left + w, cy + 6]);
  };

  // Grid and tick labels.
  const axisY = yMin <= 0 && yMax >= 0 ? Y(0) : Y(yMin);
  const axisX = xMin <= 0 && xMax >= 0 ? X(0) : X(xMin);
  const first = (lo, step) => Math.ceil(lo / step - 1e-9) * step;
  const xLabelEvery = Math.max(1, Math.ceil(((xMax - xMin) / xStep + 1) / 11));
  let i = 0;
  for (let x = first(xMin, xStep); x <= xMax + 1e-9; x += xStep, i++) {
    if (s.grid !== false) out.push(line(X(x), m.t, X(x), m.t + ph, 'viz-grid'));
    const k = Math.round(x / xStep);
    if (Math.abs(x) > 1e-9 && k % xLabelEvery === 0) {
      const str = s.piTicks ? piLabel(x) : fmt(x);
      out.push(text(X(x), Math.min(axisY + 13, H - 9), str, 'viz-text-xs'));
      tickBox(X(x), Math.min(axisY + 13, H - 9), str, 'middle');
    }
  }
  const yLabelEvery = Math.max(1, Math.ceil(((yMax - yMin) / yStep + 1) / 11));
  for (let y = first(yMin, yStep); y <= yMax + 1e-9; y += yStep) {
    if (s.grid !== false) out.push(line(m.l, Y(y), m.l + pw, Y(y), 'viz-grid'));
    const k = Math.round(y / yStep);
    if (Math.abs(y) > 1e-9 && k % yLabelEvery === 0) {
      out.push(text(Math.max(axisX - 6, 16), Y(y), fmt(y), 'viz-text-xs', { 'text-anchor': 'end' }));
      tickBox(Math.max(axisX - 6, 16), Y(y), fmt(y), 'end');
    }
  }
  out.push(line(m.l, axisY, m.l + pw, axisY, 'viz-axis'), line(axisX, m.t, axisX, m.t + ph, 'viz-axis'));
  if (s.axisLabels?.[0]) out.push(text(m.l + pw - 4, Math.max(axisY - 10, m.t + 8), s.axisLabels[0], 'viz-text-sm viz-text-i', { 'text-anchor': 'end' }));
  if (s.axisLabels?.[1]) out.push(text(Math.min(axisX + 8, W - 20), m.t + 7, s.axisLabels[1], 'viz-text-sm viz-text-i', { 'text-anchor': 'start' }));

  const span = yMax - yMin;
  const clampY = (y) => Math.max(yMin - 3 * span, Math.min(yMax + 3 * span, y));

  // Shaded regions between curves.
  for (const sh of s.shade ?? []) {
    const g = sh.g ?? (() => 0);
    const N = 120;
    const p = [];
    for (let k = 0; k <= N; k++) {
      const x = sh.from + ((sh.to - sh.from) * k) / N;
      const y = sh.f(x);
      if (Number.isFinite(y)) p.push([X(x), Y(clampY(y))]);
    }
    for (let k = N; k >= 0; k--) {
      const x = sh.from + ((sh.to - sh.from) * k) / N;
      const y = g(x);
      if (Number.isFinite(y)) p.push([X(x), Y(clampY(y))]);
    }
    if (p.length >= 3) inside.push(polygonEl(p, `${FILLS[colorIndex(sh.color)]} viz-shade`));
  }
  for (const pg of s.polygons ?? []) {
    inside.push(polygonEl(pg.points.map(([x, y]) => [X(x), Y(y)]), `${FILLS[colorIndex(pg.color)]} viz-shade viz-outline`));
  }
  for (const r of s.rects ?? []) {
    const y0 = r.y ?? 0;
    const yTop = Math.max(y0, y0 + r.h);
    const yBot = Math.min(y0, y0 + r.h);
    inside.push(rect(X(r.x), Y(yTop), X(r.x + r.w) - X(r.x), Y(yBot) - Y(yTop), `${FILLS[colorIndex(r.color, 1)]} viz-shade viz-outline`));
  }

  // Labels are placed so that they do not sit on top of each other, on a marked point or on an axis number.
  const labels = [];
  for (const pt of s.points ?? []) taken.push([X(pt.x) - 5, Y(pt.y) - 5, X(pt.x) + 5, Y(pt.y) + 5]);
  const placeLabel = (x, y, str, cls, options) => {
    const w = String(str).length * 7 + 6;
    const hgt = 16;
    for (const [dx, dy, anchor] of options) {
      const left = anchor === 'end' ? x + dx - w : anchor === 'middle' ? x + dx - w / 2 : x + dx;
      const box = [left, y + dy - hgt / 2, left + w, y + dy + hgt / 2];
      const inside = box[0] >= 2 && box[2] <= W - 2 && box[1] >= 2 && box[3] <= H - 2;
      const clash = taken.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
      if (inside && !clash) {
        taken.push(box);
        labels.push(text(x + dx, y + dy, str, `${cls} viz-halo`, { 'text-anchor': anchor }));
        return;
      }
    }
    const [dx, dy, anchor] = options[0];
    labels.push(text(x + dx, y + dy, str, `${cls} viz-halo`, { 'text-anchor': anchor }));
  };
  // Curves.
  const curve = (xy, t0, t1, cls) => {
    const N = 320;
    let d = '';
    let pen = false;
    let prevY = null;
    for (let k = 0; k <= N; k++) {
      const [x, y] = xy(t0 + ((t1 - t0) * k) / N);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        pen = false;
        prevY = null;
        continue;
      }
      if (prevY != null && Math.abs(y - prevY) > 2.5 * span) pen = false; // jumped across an asymptote
      d += `${pen ? 'L' : 'M'} ${n(X(x))} ${n(Y(clampY(y)))} `;
      pen = true;
      prevY = y;
    }
    if (d) inside.push(path(d.trim(), cls));
  };
  (s.fns ?? []).forEach((fn, k) => {
    const [a, b] = fn.domain ?? [xMin, xMax];
    const cls = `${LINES[colorIndex(fn.color, k % 4)]}${fn.dashed ? ' viz-dash' : ''}`;
    curve((x) => [x, fn.f(x)], Math.max(a, xMin), Math.min(b, xMax), cls);
    if (fn.label) {
      const tries = fn.labelAt != null ? [fn.labelAt] : [0.82, 0.7, 0.58, 0.9, 0.46, 0.34, 0.22].map((t) => xMin + t * (xMax - xMin));
      for (const lx of tries) {
        const ly = fn.f(lx);
        if (Number.isFinite(ly) && ly < yMax - 0.12 * span && ly > yMin + 0.05 * span) {
          placeLabel(X(lx), Y(ly), fn.label, 'viz-text-sm viz-text-b', [[0, -13, 'middle'], [0, 15, 'middle']]);
          break;
        }
      }
    }
  });
  (s.param ?? []).forEach((pc, k) => {
    const cls = `${LINES[colorIndex(pc.color, k % 4)]}${pc.dashed ? ' viz-dash' : ''}`;
    curve((t) => [pc.x(t), pc.y(t)], pc.t[0], pc.t[1], cls);
  });

  for (const v of s.vlines ?? []) inside.push(line(X(v.x), m.t, X(v.x), m.t + ph, `${LINES[colorIndex(v.color, 2)]} viz-thin${v.dashed === false ? '' : ' viz-dash'}`));
  for (const hl of s.hlines ?? []) inside.push(line(m.l, Y(hl.y), m.l + pw, Y(hl.y), `${LINES[colorIndex(hl.color, 2)]} viz-thin${hl.dashed === false ? '' : ' viz-dash'}`));

  for (const sg of s.segments ?? []) {
    const [ax, ay] = [X(sg.from[0]), Y(sg.from[1])];
    const [bx, by] = [X(sg.to[0]), Y(sg.to[1])];
    const ci = colorIndex(sg.color, 1);
    inside.push(line(ax, ay, bx, by, `${LINES[ci]}${sg.dashed ? ' viz-dash viz-thin' : ''}`));
    if (sg.arrow) inside.push(arrowHead(bx, by, Math.atan2(by - ay, bx - ax), `viz-dot-${'abcd'[ci]}`, 10));
    if (sg.label != null) {
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const off = 11 + String(sg.label).length * 2.2;
      const nx = -((by - ay) / len) * off;
      const ny = ((bx - ax) / len) * off;
      placeLabel((ax + bx) / 2, (ay + by) / 2, sg.label, 'viz-text-sm viz-text-b', [[nx, ny, 'middle'], [-nx, -ny, 'middle']]);
    }
  }
  for (const p of s.points ?? []) {
    inside.push(circle(X(p.x), Y(p.y), 4.5, p.open ? `viz-open-${'abcd'[colorIndex(p.color)]}` : `viz-dot-${'abcd'[colorIndex(p.color)]}`));
    if (p.label != null) {
      placeLabel(X(p.x), Y(p.y), p.label, 'viz-text-sm viz-text-b', [[8, -13, 'start'], [8, 15, 'start'], [-8, -13, 'end'], [-8, 15, 'end'], [0, -24, 'middle'], [0, 26, 'middle'], [14, -22, 'start'], [-14, -22, 'end'], [14, 24, 'start'], [-14, 24, 'end']]);
    }
  }

  const alt = s.alt ?? 'Coordinate graph.';
  return svg(
    W,
    H,
    alt,
    el('defs', {}, el('clipPath', { id }, rect(m.l, m.t, pw, ph, ''))),
    out,
    el('g', { 'clip-path': `url(#${id})` }, inside),
    labels,
  );
}

// ───────────────────────────── polygon / triangle ─────────────────────────────

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};

function polygon(s) {
  const raw = s.points ?? [];
  if (raw.length < 3) throw new Error('polygon: need at least 3 points');
  const extra = s.extra ?? [];
  const all = raw.concat(extra.flatMap((e) => [e.from, e.to]));
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const bx0 = Math.min(...xs);
  const bx1 = Math.max(...xs);
  const by0 = Math.min(...ys);
  const by1 = Math.max(...ys);
  const W = 340;
  const pad = 44;
  const bw = bx1 - bx0 || 1;
  const bh = by1 - by0 || 1;
  const scale = Math.min((W - 2 * pad) / bw, 200 / bh);
  const H = bh * scale + 2 * pad;
  const ox = (W - bw * scale) / 2;
  const P = ([x, y]) => [ox + (x - bx0) * scale, pad + (by1 - y) * scale];
  const p = raw.map(P);
  const cnt = p.length;
  const centroid = mul(p.reduce(add, [0, 0]), 1 / cnt);
  const out = [];
  // Rough boxes of the labels drawn so far, so that a side label can step aside instead of landing on another label.
  const boxes = [];
  const boxOf = (x, y, label) => ({ x, y, w: String(label).length * 7.2 + 4, h: 15 });
  const clash = (b) => boxes.some((o) => Math.abs(o.x - b.x) < (o.w + b.w) / 2 + 1 && Math.abs(o.y - b.y) < (o.h + b.h) / 2);
  const sideLabels = [];

  const fill = s.fill === 'none' ? 'viz-fill-none' : FILLS[colorIndex(s.fill)] + ' viz-shade';
  out.push(polygonEl(p, fill));
  if (s.grid) {
    for (let x = Math.ceil(bx0); x <= Math.floor(bx1); x++) out.push(line(P([x, by0])[0], P([x, by0])[1], P([x, by1])[0], P([x, by1])[1], 'viz-gridline'));
    for (let y = Math.ceil(by0); y <= Math.floor(by1); y++) out.push(line(P([bx0, y])[0], P([bx0, y])[1], P([bx1, y])[0], P([bx1, y])[1], 'viz-gridline'));
  }
  out.push(polygonEl(p, 'viz-fill-none viz-outline'));

  for (const e of extra) {
    const a = P(e.from);
    const b = P(e.to);
    out.push(line(a[0], a[1], b[0], b[1], `viz-stroke${e.dashed === false ? '' : ' viz-dash'}`));
    if (e.label != null) {
      const mid = mul(add(a, b), 0.5);
      const d = unit(sub(b, a));
      const side = e.labelSide === 'left' ? -1 : 1;
      out.push(text(mid[0] + -d[1] * 13 * side, mid[1] + d[0] * 13 * side, e.label, 'viz-text-sm viz-text-b'));
      boxes.push(boxOf(mid[0] + -d[1] * 13 * side, mid[1] + d[0] * 13 * side, e.label));
    }
  }

  for (let i = 0; i < cnt; i++) {
    const a = p[i];
    const b = p[(i + 1) % cnt];
    const prev = p[(i - 1 + cnt) % cnt];
    const mid = mul(add(a, b), 0.5);
    const d = unit(sub(b, a));
    let nrm = [-d[1], d[0]];
    if (nrm[0] * (mid[0] - centroid[0]) + nrm[1] * (mid[1] - centroid[1]) < 0) nrm = mul(nrm, -1);

    const sideLabel = s.sides?.[i];
    if (sideLabel != null && sideLabel !== '') sideLabels.push({ mid, d, nrm, label: sideLabel, half: len(sub(b, a)) / 2 });
    const marks = s.marks?.[i];
    if (marks) {
      for (let k = 0; k < marks; k++) {
        const c = add(mid, mul(d, (k - (marks - 1) / 2) * 5));
        out.push(line(c[0] - nrm[0] * 5, c[1] - nrm[1] * 5, c[0] + nrm[0] * 5, c[1] + nrm[1] * 5, 'viz-stroke'));
      }
    }

    // Vertex i: angle label, right-angle marker, vertex name.
    const u1 = unit(sub(prev, a));
    const u2 = unit(sub(b, a));
    let bis = add(u1, u2);
    if (len(bis) < 1e-6) bis = unit(sub(centroid, a));
    else bis = unit(bis);
    const cos = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]));
    const half = Math.acos(cos) / 2;
    if (s.right?.includes(i)) {
      const k = 11;
      const q1 = add(a, mul(u1, k));
      const q2 = add(q1, mul(u2, k));
      const q3 = add(a, mul(u2, k));
      out.push(path(`M ${n(q1[0])} ${n(q1[1])} L ${n(q2[0])} ${n(q2[1])} L ${n(q3[0])} ${n(q3[1])}`, 'viz-stroke viz-thin'));
    }
    const angleLabel = s.angles?.[i];
    if (angleLabel != null && angleLabel !== '') {
      const r = 17;
      const s1 = add(a, mul(u1, r));
      const s2 = add(a, mul(u2, r));
      const sweep = u1[0] * u2[1] - u1[1] * u2[0] > 0 ? 1 : 0;
      if (!s.right?.includes(i)) out.push(path(`M ${n(s1[0])} ${n(s1[1])} A ${r} ${r} 0 0 ${sweep} ${n(s2[0])} ${n(s2[1])}`, 'viz-stroke viz-thin'));
      const dist = Math.max(30, Math.min(58, 15 / Math.max(0.2, Math.sin(half)) + String(angleLabel).length * 2.2));
      out.push(text(a[0] + bis[0] * dist, a[1] + bis[1] * dist, angleLabel, 'viz-text-sm'));
      boxes.push(boxOf(a[0] + bis[0] * dist, a[1] + bis[1] * dist, angleLabel));
    }
    const vLabel = s.vertices?.[i];
    if (vLabel != null && vLabel !== '') {
      out.push(text(a[0] - bis[0] * 14, a[1] - bis[1] * 14, vLabel, 'viz-text-b viz-text-i'));
      boxes.push(boxOf(a[0] - bis[0] * 14, a[1] - bis[1] * 14, vLabel));
    }
  }

  // Side labels go on last, longest sides first. Each sits beside the middle of its side; if that
  // spot is taken (the two short sides of an L-shaped notch want the same corner), it slides along
  // its side, and only then moves further out.
  for (const { mid, d, nrm, label, half } of sideLabels.sort((u, v) => v.half - u.half)) {
    const off = 13 + Math.abs(nrm[0]) * Math.min(22, String(label).length * 3.4);
    let spot = null;
    for (const [slide, extra] of [[0, 0], [0.35, 0], [-0.35, 0], [0.65, 0], [-0.65, 0], [0, 11], [0.35, 11], [-0.35, 11], [0, 22]]) {
      const x = mid[0] + d[0] * slide * half + nrm[0] * (off + extra);
      const y = mid[1] + d[1] * slide * half + nrm[1] * (off + extra);
      if (!clash(boxOf(x, y, label))) {
        spot = [x, y];
        break;
      }
    }
    spot ??= [mid[0] + nrm[0] * off, mid[1] + nrm[1] * off];
    out.push(text(spot[0], spot[1], label, 'viz-text-sm viz-text-b'));
    boxes.push(boxOf(spot[0], spot[1], label));
  }

  const described = [s.sides?.filter((x) => x != null && x !== '').length ? `sides labelled ${s.sides.filter((x) => x != null && x !== '').join(', ')}` : '', s.angles?.filter((x) => x != null && x !== '').length ? `angles labelled ${s.angles.filter((x) => x != null && x !== '').join(', ')}` : ''].filter(Boolean).join('; ');
  const alt = s.alt ?? `A ${cnt === 3 ? 'triangle' : cnt === 4 ? 'four-sided shape' : `${cnt}-sided shape`}${described ? ` with ${described}` : ''}.`;
  return svg(W, H, alt, out);
}

// ───────────────────────────── circle ─────────────────────────────

function circleFigure(s) {
  const W = 300;
  const H = 240;
  const cx = 150;
  const cy = 120;
  const R = 84;
  const at = (deg, r = R) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];
  const out = [];
  const arcPath = (start, end, r, close) => {
    const a = at(start, r);
    const b = at(end, r);
    const large = ((end - start) % 360 + 360) % 360 > 180 ? 1 : 0;
    const arc = `A ${r} ${r} 0 ${large} 0 ${n(b[0])} ${n(b[1])}`;
    return close ? `M ${cx} ${cy} L ${n(a[0])} ${n(a[1])} ${arc} Z` : `M ${n(a[0])} ${n(a[1])} ${arc}`;
  };
  const wedge = (w, shaded) => {
    const mid = w.start + ((((w.end - w.start) % 360) + 360) % 360) / 2;
    if (shaded) out.push(path(arcPath(w.start, w.end, R, true), 'viz-fill-b viz-shade'));
    const a = at(w.start);
    const b = at(w.end);
    out.push(line(cx, cy, a[0], a[1], 'viz-stroke'), line(cx, cy, b[0], b[1], 'viz-stroke'));
    if (w.label != null) {
      out.push(path(arcPath(w.start, w.end, 18, false), 'viz-stroke viz-thin'));
      const l = at(mid, 36);
      out.push(text(l[0], l[1], w.label, 'viz-text-sm viz-text-b'));
    }
    if (w.arcLabel != null) {
      const l = at(mid, R + 18);
      out.push(text(l[0], l[1], w.arcLabel, 'viz-text-sm viz-text-b'));
    }
  };

  if (s.sector) wedge(s.sector, true);
  out.push(circle(cx, cy, R, 'viz-outline viz-fill-none'));
  if (s.central) wedge(s.central, false);
  if (s.inscribed) {
    const v = at(s.inscribed.vertex);
    const a = at(s.inscribed.start);
    const b = at(s.inscribed.end);
    out.push(line(v[0], v[1], a[0], a[1], 'viz-line-a viz-thin'), line(v[0], v[1], b[0], b[1], 'viz-line-a viz-thin'));
    if (s.inscribed.label != null) {
      const dir = unit(add(unit(sub(a, v)), unit(sub(b, v))));
      out.push(text(v[0] + dir[0] * 30, v[1] + dir[1] * 30, s.inscribed.label, 'viz-text-sm viz-text-b'));
    }
  }
  if (s.diameter != null) {
    out.push(line(cx - R, cy, cx + R, cy, 'viz-stroke'));
    if (s.diameter !== true) out.push(text(cx - R / 2, cy + 13, s.diameter, 'viz-text-sm viz-text-b'));
  }
  if (s.radius != null) {
    const deg = s.diameter != null ? 55 : 0;
    const e = at(deg);
    out.push(line(cx, cy, e[0], e[1], 'viz-stroke'));
    if (s.radius !== true) {
      const mid = at(deg, R / 2);
      out.push(text(mid[0] + (deg ? -14 : 0), mid[1] - 12, s.radius, 'viz-text-sm viz-text-b'));
    }
  }
  for (const p of s.points ?? []) {
    const a = at(p.deg);
    const l = at(p.deg, R + 14);
    out.push(circle(a[0], a[1], 3.5, 'viz-ink-fill'));
    if (p.label != null) out.push(text(l[0], l[1], p.label, 'viz-text-sm viz-text-b'));
  }
  out.push(circle(cx, cy, 3, 'viz-ink-fill'));
  if (s.center) out.push(text(cx - 10, cy + 12, s.center, 'viz-text-sm viz-text-i'));
  const alt = s.alt ?? `A circle${s.radius != null && s.radius !== true ? ` with radius ${s.radius}` : ''}${s.diameter != null && s.diameter !== true ? ` with diameter ${s.diameter}` : ''}${s.sector ? ' with a shaded sector' : ''}.`;
  return svg(W, H, alt, out);
}

// ───────────────────────────── angles ─────────────────────────────

function angleFigure(s) {
  const W = 320;
  const H = 230;
  const cx = s.center?.[0] ?? 160;
  const cy = s.center?.[1] ?? 125;
  const L = 96;
  const at = (deg, r) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];
  const out = [];
  for (const ray of s.rays ?? []) {
    const deg = typeof ray === 'number' ? ray : ray.deg;
    const e = at(deg, L);
    const start = s.lines ? at(deg + 180, L) : [cx, cy];
    out.push(line(start[0], start[1], e[0], e[1], 'viz-stroke'));
    out.push(arrowHead(e[0], e[1], Math.atan2(e[1] - cy, e[0] - cx), 'viz-ink-fill', 7));
    if (s.lines) out.push(arrowHead(start[0], start[1], Math.atan2(start[1] - cy, start[0] - cx), 'viz-ink-fill', 7));
    if (typeof ray === 'object' && ray.label != null) {
      const l = at(deg, L + 13);
      out.push(text(l[0], l[1], ray.label, 'viz-text-sm viz-text-i'));
    }
  }
  (s.arcs ?? []).forEach((arc, i) => {
    const sweepDeg = (((arc.to - arc.from) % 360) + 360) % 360;
    const r = arc.r ?? 26 + (i % 2) * 7;
    if (arc.square || Math.abs(sweepDeg - 90) < 1e-9) {
      const k = 13;
      const a = at(arc.from, k);
      const b = at(arc.to, k);
      const c = [a[0] + b[0] - cx, a[1] + b[1] - cy];
      out.push(path(`M ${n(a[0])} ${n(a[1])} L ${n(c[0])} ${n(c[1])} L ${n(b[0])} ${n(b[1])}`, 'viz-stroke viz-thin'));
    } else {
      const a = at(arc.from, r);
      const b = at(arc.to, r);
      out.push(path(`M ${n(a[0])} ${n(a[1])} A ${r} ${r} 0 ${sweepDeg > 180 ? 1 : 0} 0 ${n(b[0])} ${n(b[1])}`, `${LINES[i % 4]} viz-thin`));
    }
    if (arc.label != null) {
      const l = at(arc.from + sweepDeg / 2, r + 17 + String(arc.label).length * 1.6);
      out.push(text(l[0], l[1], arc.label, 'viz-text-sm viz-text-b'));
    }
  });
  out.push(circle(cx, cy, 3, 'viz-ink-fill'));
  const alt = s.alt ?? `Angle diagram${(s.arcs ?? []).length ? ` with angles labelled ${s.arcs.map((a) => a.label).filter((l) => l != null).join(', ')}` : ''}.`;
  return svg(W, H, alt, out);
}

/**
 * Two parallel lines cut by a transversal. Angles are numbered:
 *   top crossing:     1 upper-left, 2 upper-right, 3 lower-left, 4 lower-right
 *   bottom crossing:  5 upper-left, 6 upper-right, 7 lower-left, 8 lower-right
 * labels: { 1: '65°', 6: 'x' } puts text in those positions.
 */
function transversal(s) {
  const W = 330;
  const H = 240;
  const slant = ((s.slant ?? 62) * Math.PI) / 180;
  const y1 = 80;
  const y2 = 170;
  const xMid = 165;
  const dx = (yy) => xMid + (125 - yy) / Math.tan(slant);
  const out = [];
  for (const y of [y1, y2]) {
    out.push(line(24, y, 306, y, 'viz-stroke'), arrowHead(20, y, Math.PI, 'viz-ink-fill', 7), arrowHead(310, y, 0, 'viz-ink-fill', 7));
    if (s.parallelMarks !== false) out.push(path(`M 268 ${y - 5} l 7 5 l -7 5`, 'viz-stroke viz-thin'));
  }
  const top = [dx(22), 22];
  const bot = [dx(226), 226];
  out.push(line(top[0], top[1], bot[0], bot[1], 'viz-stroke'));
  out.push(arrowHead(top[0], top[1], Math.atan2(top[1] - bot[1], top[0] - bot[0]), 'viz-ink-fill', 7), arrowHead(bot[0], bot[1], Math.atan2(bot[1] - top[1], bot[0] - top[0]), 'viz-ink-fill', 7));
  const acute = s.slant ?? 62;
  // Bisector directions (degrees, counter-clockwise from +x) of the four regions at a crossing.
  const dirs = { ul: 90 + acute / 2, ur: acute / 2, ll: 180 + acute / 2, lr: 270 + acute / 2 };
  const where = { 1: ['ul', y1], 2: ['ur', y1], 3: ['ll', y1], 4: ['lr', y1], 5: ['ul', y2], 6: ['ur', y2], 7: ['ll', y2], 8: ['lr', y2] };
  for (const [k, label] of Object.entries(s.labels ?? {})) {
    if (label == null || label === '' || !where[k]) continue;
    const [region, y] = where[k];
    const deg = dirs[region];
    const wide = region === 'ul' || region === 'lr';
    const r = (wide ? 22 : 30) + String(label).length * 2;
    out.push(text(dx(y) + r * Math.cos((deg * Math.PI) / 180), y - r * Math.sin((deg * Math.PI) / 180), label, 'viz-text-sm viz-text-b'));
  }
  const alt = s.alt ?? `Two parallel lines cut by a transversal; angle positions ${Object.entries(s.labels ?? {}).map(([k, v]) => `${k} is ${v}`).join(', ')}.`;
  return svg(W, H, alt, out);
}

// ───────────────────────────── 3-D solids (schematic) ─────────────────────────────

function solid(s) {
  const L = s.labels ?? {};
  const out = [];
  let W = 300;
  let H = 220;
  const lab = (x, y, t) => t != null && t !== '' && out.push(text(x, y, t, 'viz-text-sm viz-text-b'));
  // A label beside an edge starts (or ends) at x, so a long label such as "12 cm" cannot run back
  // over the edge. A long label on the right widens the picture instead of being cut off.
  const labR = (x, y, t) => {
    if (t == null || t === '') return;
    out.push(text(x, y, t, 'viz-text-sm viz-text-b', { 'text-anchor': 'start' }));
    W = Math.max(W, Math.ceil(x + String(t).length * 7.4 + 8));
  };
  const labL = (x, y, t) => t != null && t !== '' && out.push(text(x, y, t, 'viz-text-sm viz-text-b viz-halo', { 'text-anchor': 'end' }));
  const kind = s.kind;
  if (kind === 'box' || kind === 'cube') {
    const x = 60;
    const y = 70;
    const w = kind === 'cube' ? 110 : 150;
    const h = kind === 'cube' ? 110 : 90;
    const ox = 46;
    const oy = -34;
    out.push(polygonEl([[x, y], [x + ox, y + oy], [x + w + ox, y + oy], [x + w, y]], 'viz-fill-b viz-shade viz-outline'));
    out.push(polygonEl([[x + w, y], [x + w + ox, y + oy], [x + w + ox, y + h + oy], [x + w, y + h]], 'viz-fill-c viz-shade viz-outline'));
    out.push(rect(x, y, w, h, 'viz-fill-a viz-shade viz-outline'));
    out.push(line(x, y + h, x + ox, y + h + oy, 'viz-stroke viz-dash viz-thin'), line(x + ox, y + h + oy, x + w + ox, y + h + oy, 'viz-stroke viz-dash viz-thin'), line(x + ox, y + oy, x + ox, y + h + oy, 'viz-stroke viz-dash viz-thin'));
    lab(x + w / 2, y + h + 14, L.l ?? L.s);
    labR(x + w + ox / 2 + 9, y + h + oy / 2 + 11, L.w ?? (kind === 'cube' ? null : undefined));
    labR(x + w + ox + 7, y + h / 2 + oy, L.h);
    H = y + h + 30;
  } else if (kind === 'cylinder') {
    const cx = 150;
    const rx = 70;
    const ry = 20;
    const top = 50;
    const bottom = 170;
    out.push(path(`M ${cx - rx} ${top} V ${bottom} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bottom} V ${top}`, 'viz-fill-a viz-shade viz-outline'));
    out.push(el('ellipse', { cx, cy: top, rx, ry, class: 'viz-fill-b viz-shade viz-outline' }));
    out.push(path(`M ${cx - rx} ${bottom} A ${rx} ${ry} 0 0 1 ${cx + rx} ${bottom}`, 'viz-stroke viz-dash viz-thin'));
    out.push(line(cx, top, cx + rx, top, 'viz-stroke'), circle(cx, top, 2.5, 'viz-ink-fill'));
    lab(cx + rx / 2, top - 10, L.r);
    labR(cx + rx + 8, (top + bottom) / 2, L.h);
    if (L.d != null) lab(cx, top + 12, L.d);
    H = bottom + ry + 16;
  } else if (kind === 'cone') {
    const cx = 150;
    const rx = 72;
    const ry = 20;
    const apex = 28;
    const base = 170;
    out.push(path(`M ${cx - rx} ${base} L ${cx} ${apex} L ${cx + rx} ${base} A ${rx} ${ry} 0 0 1 ${cx - rx} ${base}`, 'viz-fill-a viz-shade viz-outline'));
    out.push(path(`M ${cx - rx} ${base} A ${rx} ${ry} 0 0 1 ${cx + rx} ${base}`, 'viz-stroke viz-dash viz-thin'));
    out.push(line(cx, apex, cx, base, 'viz-stroke viz-dash viz-thin'), line(cx, base, cx + rx, base, 'viz-stroke'), circle(cx, base, 2.5, 'viz-ink-fill'));
    lab(cx + rx / 2 - 4, base - 10, L.r);
    labL(cx - 6, base - 38, L.h); // low down, where the cone is wide enough for the label
    labR(cx + rx / 2 + 10, (apex + base) / 2 - 8, L.s ?? L.l);
    H = base + ry + 16;
  } else if (kind === 'sphere') {
    const cx = 150;
    const cy = 110;
    const r = 84;
    out.push(circle(cx, cy, r, 'viz-fill-a viz-shade viz-outline'));
    out.push(path(`M ${cx - r} ${cy} A ${r} 24 0 0 0 ${cx + r} ${cy}`, 'viz-stroke viz-thin'), path(`M ${cx - r} ${cy} A ${r} 24 0 0 1 ${cx + r} ${cy}`, 'viz-stroke viz-dash viz-thin'));
    out.push(line(cx, cy, cx + r, cy, 'viz-stroke'), circle(cx, cy, 2.5, 'viz-ink-fill'));
    lab(cx + r / 2, cy - 11, L.r);
    if (L.d != null) lab(cx - r / 2, cy - 11, L.d);
    H = cy + r + 14;
  } else if (kind === 'pyramid') {
    const a = [60, 170];
    const b = [200, 170];
    const c = [246, 132];
    const d = [106, 132];
    const apex = [153, 30];
    const centre = [153, 151];
    out.push(polygonEl([a, b, apex], 'viz-fill-a viz-shade viz-outline'), polygonEl([b, c, apex], 'viz-fill-c viz-shade viz-outline'));
    out.push(line(a[0], a[1], d[0], d[1], 'viz-stroke viz-dash viz-thin'), line(d[0], d[1], c[0], c[1], 'viz-stroke viz-dash viz-thin'), line(d[0], d[1], apex[0], apex[1], 'viz-stroke viz-dash viz-thin'));
    out.push(line(apex[0], apex[1], centre[0], centre[1], 'viz-stroke viz-dash viz-thin'));
    lab((a[0] + b[0]) / 2, a[1] + 14, L.s ?? L.l);
    labR((b[0] + c[0]) / 2 + 10, (b[1] + c[1]) / 2 + 10, L.w);
    labL(centre[0] - 6, 106, L.h);
    labR(204, (b[1] + apex[1]) / 2 - 22, L.slant);
    H = 200;
  } else if (kind === 'triPrism') {
    const a = [50, 170];
    const b = [150, 170];
    const c = [50, 80];
    const o = [110, -36];
    const sh = (p) => [p[0] + o[0], p[1] + o[1]];
    out.push(polygonEl([c, b, sh(b), sh(c)], 'viz-fill-b viz-shade viz-outline'));
    out.push(polygonEl([a, b, c], 'viz-fill-a viz-shade viz-outline'));
    out.push(line(a[0], a[1], sh(a)[0], sh(a)[1], 'viz-stroke viz-dash viz-thin'), line(sh(a)[0], sh(a)[1], sh(b)[0], sh(b)[1], 'viz-stroke viz-dash viz-thin'), line(sh(a)[0], sh(a)[1], sh(c)[0], sh(c)[1], 'viz-stroke viz-dash viz-thin'));
    out.push(path(`M ${a[0] + 10} ${a[1]} v -10 h -10`, 'viz-stroke viz-thin'));
    lab((a[0] + b[0]) / 2, a[1] + 14, L.b);
    labL(a[0] - 6, (a[1] + c[1]) / 2, L.h);
    labR((b[0] + sh(b)[0]) / 2 + 8, (b[1] + sh(b)[1]) / 2 + 13, L.l);
    H = 200;
  } else {
    throw new Error(`solid: unknown kind "${kind}"`);
  }
  const names = { box: 'rectangular prism', cube: 'cube', cylinder: 'cylinder', cone: 'cone', sphere: 'sphere', pyramid: 'square pyramid', triPrism: 'triangular prism' };
  const dims = Object.entries(L).filter(([, v]) => v != null && v !== '').map(([, v]) => v).join(', ');
  const alt = s.alt ?? `A ${names[kind]}${dims ? ` labelled ${dims}` : ''}.`;
  return svg(W, H, alt, out);
}

// ───────────────────────────── clock ─────────────────────────────

function clock(s) {
  const hour = s.hour;
  const minute = s.minute ?? 0;
  if (!(hour >= 0 && hour <= 23) || !(minute >= 0 && minute < 60)) throw new Error('clock: bad time');
  const cx = 110;
  const cy = 110;
  const R = 92;
  const at = (deg, r) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
  const out = [circle(cx, cy, R, 'viz-fill-bg viz-outline')];
  for (let k = 0; k < 60; k++) {
    const a = at(k * 6, R - 2);
    const b = at(k * 6, R - (k % 5 === 0 ? 10 : 5));
    out.push(line(a[0], a[1], b[0], b[1], k % 5 === 0 ? 'viz-stroke' : 'viz-hairline'));
  }
  for (let k = 1; k <= 12; k++) {
    const p = at(k * 30, R - 23);
    out.push(text(p[0], p[1], k, 'viz-text-b'));
  }
  const h = at((hour % 12) * 30 + minute * 0.5, 46);
  const mnt = at(minute * 6, 70);
  out.push(line(cx, cy, h[0], h[1], 'viz-hand-hour'), line(cx, cy, mnt[0], mnt[1], 'viz-hand-minute'), circle(cx, cy, 5, 'viz-ink-fill'));
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const alt = s.alt ?? `A clock showing ${h12}:${String(minute).padStart(2, '0')}.`;
  return svg(220, 220, alt, out);
}

// ───────────────────────────── charts ─────────────────────────────

function barChart(s) {
  const bars = s.bars ?? [];
  if (!bars.length) throw new Error('barChart: no bars');
  const maxV = Math.max(...bars.map((b) => b.value), 0);
  const step = s.step ?? niceStep((maxV || 1) / 5);
  const top = Math.max(step, Math.ceil(maxV / step) * step);
  const W = 360;
  const H = 240;
  const m = { l: 40, r: 10, t: 16, b: 42 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const Y = (v) => m.t + ph - (v / top) * ph;
  const out = [];
  for (let v = 0; v <= top + 1e-9; v += step) {
    out.push(line(m.l, Y(v), m.l + pw, Y(v), 'viz-grid'), text(m.l - 6, Y(v), fmt(v), 'viz-text-xs', { 'text-anchor': 'end' }));
  }
  const bw = pw / bars.length;
  bars.forEach((b, i) => {
    const x = m.l + i * bw + bw * 0.18;
    out.push(rect(x, Y(b.value), bw * 0.64, Y(0) - Y(b.value), `${FILLS[i % 4]} viz-outline`));
    out.push(text(x + bw * 0.32, Y(0) + 13, b.label, 'viz-text-xs'));
    if (s.showValues !== false) out.push(text(x + bw * 0.32, Y(b.value) - 9, fmt(b.value), 'viz-text-xs viz-text-b'));
  });
  out.push(line(m.l, m.t, m.l, Y(0), 'viz-axis'), line(m.l, Y(0), m.l + pw, Y(0), 'viz-axis'));
  if (s.yLabel) out.push(text(12, m.t + ph / 2, s.yLabel, 'viz-text-xs', { transform: `rotate(-90 12 ${n(m.t + ph / 2)})` }));
  if (s.xLabel) out.push(text(m.l + pw / 2, H - 9, s.xLabel, 'viz-text-xs'));
  const alt = s.alt ?? `Bar chart: ${bars.map((b) => `${b.label} ${fmt(b.value)}`).join(', ')}.`;
  return svg(W, H, alt, out);
}

function dotPlot(s) {
  const values = s.values ?? [];
  if (!values.length) throw new Error('dotPlot: no values');
  const min = s.min ?? Math.min(...values);
  const max = s.max ?? Math.max(...values);
  const span = Math.max(1, max - min);
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const tallest = Math.max(...counts.values());
  const W = 360;
  const x0 = 28;
  const x1 = 332;
  const X = (v) => x0 + ((v - min) / span) * (x1 - x0);
  const yLine = 20 + tallest * 16;
  const out = [line(14, yLine, 346, yLine, 'viz-axis')];
  const every = Math.max(1, Math.ceil((span + 1) / 14));
  for (let v = min; v <= max; v++) {
    out.push(line(X(v), yLine - 4, X(v), yLine + 4, 'viz-axis'));
    if ((v - min) % every === 0) out.push(text(X(v), yLine + 16, fmt(v), 'viz-text-xs'));
  }
  for (const [v, c] of counts) for (let k = 0; k < c; k++) out.push(circle(X(v), yLine - 10 - k * 16, 6, 'viz-dot-a'));
  if (s.label) out.push(text(W / 2, yLine + 34, s.label, 'viz-text-xs'));
  const alt = s.alt ?? `Dot plot of the values ${[...values].sort((a, b) => a - b).join(', ')}.`;
  return svg(W, yLine + (s.label ? 46 : 28), alt, out);
}

// ───────────────────────────── table ─────────────────────────────

function table(s) {
  if (!Array.isArray(s.rows) || !s.rows.length) throw new Error('table: rows are required');
  return {
    kind: 'table',
    caption: s.caption ?? null,
    headers: s.headers ?? null,
    rowHeaders: !!s.rowHeaders,
    rows: s.rows.map((r) => r.map((c) => (typeof c === 'number' ? fmt(c) : String(c)))),
    alt: s.alt ?? s.caption ?? 'Table',
  };
}

// ───────────────────────────── registry ─────────────────────────────

const RENDERERS = {
  numberLine,
  counters,
  baseTen,
  array: arrayModel,
  fractionBars,
  barModel,
  areaModel,
  plot,
  polygon,
  circle: circleFigure,
  angle: angleFigure,
  transversal,
  solid,
  clock,
  barChart,
  dotPlot,
  table,
};

export const VISUAL_TYPES = Object.freeze(Object.keys(RENDERERS));

/** Turn a visual spec into { kind: 'svg', vnode, alt, width, height } or { kind: 'table', … }. Throws on a bad spec. */
export function renderVisual(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('visual: spec must be an object');
  const fn = RENDERERS[spec.type];
  if (!fn) throw new Error(`visual: unknown type "${spec.type}"`);
  return fn(spec);
}

/** Serialise a vnode tree to an SVG string (used by tests and tooling; the app builds real DOM nodes). */
export function vnodeToString(v) {
  if (typeof v === 'string' || typeof v === 'number') return escapeXml(String(v));
  const attrs = Object.entries(v.attrs)
    .filter(([, val]) => val != null && val !== false)
    .map(([k, val]) => ` ${k}="${escapeXml(String(val))}"`)
    .join('');
  return `<${v.tag}${attrs}>${v.children.map(vnodeToString).join('')}</${v.tag}>`;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
