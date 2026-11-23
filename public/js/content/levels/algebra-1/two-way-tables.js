import { R, q, num, txt, frac, round, sum, people, joinList, checkEqual, checkAll } from '../../lib/index.js';

// ───────────── Survey contexts ─────────────
// Each row and column carries the words needed to ask about it: `noun` names the group ("Of the …"),
// `is` / `pred` finish a sentence about it ("… are in Grade 9", "… bring a packed lunch").
// `trim`: the rows are groups that were surveyed (grades, music groups), so a question may use just two of them.
// `named`: the people can be listed by first name in a raw-data table.
const CTX = [
  {
    intro: 'Students were asked what they usually do for lunch.', who: 'students', rowHead: 'Grade', colHead: 'Lunch', trim: true, named: true,
    rows: [9, 10, 11].map((g) => ({ label: `Grade ${g}`, noun: `Grade ${g} students`, is: `are in Grade ${g}` })),
    cols: [{ label: 'School lunch', noun: 'students who buy school lunch', pred: 'buy school lunch' }, { label: 'Packed lunch', noun: 'students who bring a packed lunch', pred: 'bring a packed lunch' }],
  },
  {
    intro: 'Adults were asked where they get most of their news.', who: 'adults', rowHead: 'Age', colHead: 'News source', named: true,
    rows: [{ label: 'Under 30', noun: 'adults under 30', is: 'are under 30' }, { label: '30 and over', noun: 'adults aged 30 and over', is: 'are aged 30 or over' }],
    cols: [{ label: 'Online', noun: 'adults who get most of their news online', pred: 'get most of their news online' }, { label: 'TV', noun: 'adults who get most of their news from TV', pred: 'get most of their news from TV' }, { label: 'Newspapers', noun: 'adults who get most of their news from newspapers', pred: 'get most of their news from newspapers' }],
  },
  {
    intro: 'Students were asked whether they have a part-time job and how they usually get to school.', who: 'students', rowHead: 'Job', colHead: 'Travel', named: true,
    rows: [{ label: 'Has a job', noun: 'students with a part-time job', is: 'have a part-time job' }, { label: 'No job', noun: 'students without a part-time job', is: 'do not have a part-time job' }],
    cols: [{ label: 'Bus', noun: 'students who take the bus', pred: 'take the bus' }, { label: 'Car', noun: 'students who come by car', pred: 'come by car' }, { label: 'Walk or bike', noun: 'students who walk or bike', pred: 'walk or bike' }],
  },
  {
    intro: 'Residents of a town were asked about a plan for a new skate park.', who: 'residents', rowHead: 'Area', colHead: 'Opinion', named: true,
    rows: [{ label: 'North side', noun: 'north-side residents', is: 'live on the north side' }, { label: 'South side', noun: 'south-side residents', is: 'live on the south side' }],
    cols: [{ label: 'For', noun: 'residents who support the plan', pred: 'support the plan' }, { label: 'Against', noun: 'residents who oppose the plan', pred: 'oppose the plan' }, { label: 'Undecided', noun: 'residents who are undecided', pred: 'are undecided' }],
  },
  {
    intro: 'Members of a gym were asked what kind of plan they have and when they usually visit.', who: 'members', rowHead: 'Plan', colHead: 'Visits', named: true,
    rows: [{ label: 'Monthly', noun: 'members with a monthly plan', is: 'have a monthly plan' }, { label: 'Annual', noun: 'members with an annual plan', is: 'have an annual plan' }],
    cols: [{ label: 'Mornings', noun: 'members who usually visit in the morning', pred: 'usually visit in the morning' }, { label: 'Evenings', noun: 'members who usually visit in the evening', pred: 'usually visit in the evening' }],
  },
  {
    intro: 'Students in the school music groups were asked whether they practise every day. Each student is in one group.', who: 'students', rowHead: 'Group', colHead: 'Practice', trim: true, named: true,
    rows: [{ label: 'Choir', noun: 'choir students', is: 'sing in the choir' }, { label: 'Band', noun: 'band students', is: 'play in the band' }, { label: 'Orchestra', noun: 'orchestra students', is: 'play in the orchestra' }],
    cols: [{ label: 'Every day', noun: 'students who practise every day', pred: 'practise every day' }, { label: 'Not every day', noun: 'students who do not practise every day', pred: 'do not practise every day' }],
  },
  {
    intro: 'Households in one neighbourhood were asked about their home and whether they have a pet.', who: 'households', rowHead: 'Home', colHead: 'Pet',
    rows: [{ label: 'Apartment', noun: 'households in apartments', is: 'live in an apartment' }, { label: 'House', noun: 'households in houses', is: 'live in a house' }],
    cols: [{ label: 'Pet', noun: 'households with a pet', pred: 'have a pet' }, { label: 'No pet', noun: 'households without a pet', pred: 'do not have a pet' }],
  },
  {
    intro: 'Students were asked how long they usually sleep on a school night and how they feel in the morning.', who: 'students', rowHead: 'Sleep', colHead: 'Morning', named: true,
    rows: [{ label: 'Under 7 hours', noun: 'students who sleep under 7 hours', is: 'sleep under 7 hours' }, { label: '7 to 9 hours', noun: 'students who sleep 7 to 9 hours', is: 'sleep 7 to 9 hours' }, { label: 'Over 9 hours', noun: 'students who sleep over 9 hours', is: 'sleep over 9 hours' }],
    cols: [{ label: 'Rested', noun: 'students who feel rested', pred: 'feel rested' }, { label: 'Tired', noun: 'students who feel tired', pred: 'feel tired' }],
  },
];

/** A context with two rows (trimming a list of surveyed groups if allowed), or null if it has three fixed rows. */
function twoRows(rng, c) {
  if (c.rows.length === 2) return c;
  if (!c.trim) return null;
  const [i, j] = rng.sample([0, 1, 2], 2).sort();
  const rows = [c.rows[i], c.rows[j]];
  return { ...c, rows, intro: c.intro };
}
/** For a trimmed context, a sentence naming the two groups surveyed (with a leading space); otherwise ''. */
const groups = (c) => (c.trim ? ` Each of them is in one of two groups: ${c.rows[0].label} or ${c.rows[1].label}.` : '');
/** A random context with two rows and (if cols2) two columns. */
function pick2(rng, cols2 = false) {
  for (;;) {
    const c = twoRows(rng, rng.pick(CTX));
    if (c && (!cols2 || c.cols.length === 2)) return c;
  }
}

// ───────────── Tables ─────────────

const totals = (t) => {
  const RT = t.map((r) => sum(r));
  const CT = t[0].map((_, j) => sum(t.map((r) => r[j])));
  return { RT, CT, N: sum(RT) };
};
/** The counts with a total column and a total row added. */
const withTotals = (t) => {
  const { RT, CT, N } = totals(t);
  return [...t.map((r, i) => [...r, RT[i]]), [...CT, N]];
};
const corner = (c) => `${c.rowHead} / ${c.colHead}`;
const rowName = (c, i) => (i === c.rows.length ? 'Total' : c.rows[i].label);
const colName = (c, j) => (j === c.cols.length ? 'Total' : c.cols[j].label);

/** A two-way table picture from a grid with totals; null cells are blank. */
function gridVisual(c, g, caption) {
  const said = (v) => (v == null ? 'blank' : typeof v === 'number' ? txt(v) : v);
  const cell = (v) => (v == null ? '' : v);
  return {
    type: 'table',
    headers: [corner(c), ...c.cols.map((x) => x.label), 'Total'],
    rowHeaders: true,
    rows: g.map((r, i) => [rowName(c, i), ...r.map(cell)]),
    caption,
    alt: `A two-way table of ${c.rowHead.toLowerCase()} by ${c.colHead.toLowerCase()}${caption ? ` (${caption.toLowerCase()})` : ''}. ` + g.map((r, i) => `${rowName(c, i)}: ` + r.map((v, j) => `${colName(c, j).toLowerCase() === 'total' ? (i === c.rows.length ? 'grand total' : 'total') : colName(c, j)} ${said(v)}`).join(', ')).join('. ') + '.',
  };
}
/** The counts table, with the listed [row, col] places (in the grid with totals) left blank. */
const countTable = (c, t, hide = []) => gridVisual(c, withTotals(t).map((r, i) => r.map((v, j) => (hide.some(([a, b]) => a === i && b === j) ? null : v))));
/** Read the numbers back from a table picture (blank → null), for checks. */
const readGrid = (v) => v.rows.map((r) => r.slice(1).map((x) => (x === '' ? null : Number(String(x).replace(/[,%]/g, '')))));

/** Fill blanks one at a time: any row or column with exactly one blank gives it. Returns the grid and the steps. */
function solveGrid(G) {
  const g = G.map((r) => r.slice());
  const [R0, C0] = [g.length - 1, g[0].length - 1];
  const lines = [];
  for (let i = 0; i <= R0; i++) lines.push({ kind: 'row', idx: i, parts: [...Array(C0).keys()].map((j) => [i, j]), total: [i, C0] });
  for (let j = 0; j <= C0; j++) lines.push({ kind: 'col', idx: j, parts: [...Array(R0).keys()].map((i) => [i, j]), total: [R0, j] });
  const steps = [];
  for (let moved = true; moved;) {
    moved = false;
    for (const L of lines) {
      const all = [...L.parts, L.total];
      const blank = all.filter(([i, j]) => g[i][j] == null);
      if (blank.length !== 1) continue;
      const [bi, bj] = blank[0];
      const isTotal = bi === L.total[0] && bj === L.total[1];
      const known = L.parts.filter(([i, j]) => g[i][j] != null).map(([i, j]) => g[i][j]);
      const value = isTotal ? sum(known) : g[L.total[0]][L.total[1]] - sum(known);
      g[bi][bj] = value;
      steps.push({ ...L, at: [bi, bj], value, known, isTotal, whole: isTotal ? null : g[L.total[0]][L.total[1]] });
      moved = true;
    }
  }
  return { g, steps, done: g.every((r) => r.every((v) => v != null)) };
}
function stepText(c, s) {
  const name = s.kind === 'row' ? (s.idx === c.rows.length ? 'the Total row' : `the row "${c.rows[s.idx].label}"`) : s.idx === c.cols.length ? 'the Total column' : `the column "${c.cols[s.idx].label}"`;
  return s.isTotal ? R`In ${name}, add: \(${s.known.join(' + ')} = ${s.value}\).` : R`In ${name}, subtract from the total: \(${s.whole} - ${s.known.join(' - ')} = ${s.value}\).`;
}

// ───────────── Percents ─────────────

const pc = (k, n) => Math.round((100 * k) / n);
/** True when k/n, scaled by s, ends in exactly .5 (so "to the nearest" would be ambiguous). */
const tie = (k, n, s = 100) => (2 * s * k) % n === 0 && ((2 * s * k) / n) % 2 === 1;
const exact = (k, n) => (100 * k) % n === 0;
const P = (v) => R`\(${v}\%\)`;
const eq = (k, n) => (exact(k, n) ? '=' : R`\approx`);
/** k/n worked out as a decimal and a percent, to the nearest whole percent. */
const divTex = (k, n) => (exact(k, n) ? R`\frac{${k}}{${n}} = ${num(k / n)} = ${pc(k, n)}\%` : R`\frac{${k}}{${n}} \approx ${num(round(k / n, 4))} \approx ${pc(k, n)}\%`);
/** A percent in a sentence: "30%" or "about 31%". */
const pcSay = (k, n) => (exact(k, n) ? P(pc(k, n)) : R`about \(${pc(k, n)}\%\)`);
const NEAREST = 'Round to the nearest whole percent.';

/**
 * Wrong numeric answers kept well apart: each must be at least `gap` from the correct answer and from
 * the ones already kept, and inside [lo, hi]. Fill-ins at ±10, ±20, … are added at the end.
 */
function apart(correct, cands, gap = 3, lo = 0, hi = 100) {
  const vals = [correct];
  const out = [];
  const tryAdd = (cand) => {
    if (cand == null) return;
    const v = typeof cand === 'object' ? cand.value : cand;
    if (v == null || !Number.isFinite(v) || v < lo || v > hi) return;
    if (vals.some((u) => Math.abs(u - v) < gap - 1e-9)) return;
    vals.push(v);
    out.push(cand);
  };
  cands.forEach(tryAdd);
  [10, -10, 20, -20, 15, -15, 30, -30].forEach((d) => tryAdd(round(correct + (d * gap) / 3, 2)));
  return out;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const points = (u, v) => (Math.abs(u - v) === 1 ? '1 percentage point' : `${Math.abs(u - v)} percentage points`);

/** A random R × C table of counts from lo to hi. */
const randTable = (rng, R0, C0, lo, hi) => Array.from({ length: R0 }, () => Array.from({ length: C0 }, () => rng.int(lo, hi)));

// ───────────── Easy ─────────────

function easyTally(rng) {
  const c = rng.pick(CTX.filter((x) => x.named));
  const n = rng.int(12, 15);
  const recs = people(rng, n).map((nm) => ({ nm, i: rng.int(0, c.rows.length - 1), j: rng.int(0, c.cols.length - 1) }));
  const t = c.rows.map((_, i) => c.cols.map((_, j) => recs.filter((r) => r.i === i && r.j === j).length));
  const [i, j] = [rng.int(0, c.rows.length - 1), rng.int(0, c.cols.length - 1)];
  const { RT, CT } = totals(t);
  if (t[i][j] < 1 || t[i][j] === RT[i] || t[i][j] === CT[j]) return easyTally(rng);
  const [row, col] = [c.rows[i], c.cols[j]];
  const raw = { type: 'table', headers: ['Name', c.rowHead, c.colHead], rows: recs.map((r) => [r.nm, c.rows[r.i].label, c.cols[r.j].label]), caption: 'Survey answers', alt: `A list of ${n} ${c.who} and their answers. ` + recs.map((r) => `${r.nm}: ${c.rows[r.i].label}, ${c.cols[r.j].label}`).join('; ') + '.' };
  const blank = gridVisual(c, withTotals(t).map((r) => r.map(() => null)), 'Two-way table to fill in');
  const match = recs.filter((r) => r.i === i && r.j === j).map((r) => r.nm);
  const summary = c.rows.map((rw, a) => `${rw.label}: ` + c.cols.map((cl, b) => `${t[a][b]} ${cl.label}`).join(', ')).join('; ');
  return q({
    prompt: `${c.intro} The first table lists ${n} answers. Summarise them in the two-way table. How many of these ${c.who} ${row.is} and ${col.pred}?`,
    visual: [raw, blank],
    correct: t[i][j],
    wrong: [
      { value: RT[i], why: `That counts every one of the ${row.noun}, whatever their answer about ${c.colHead.toLowerCase()}. Count only those who also ${col.pred}.` },
      { value: CT[j], why: `That counts everyone in the column "${col.label}". Count only the ${row.noun} in it.` },
      ...t[i].filter((_, b) => b !== j),
      ...t.map((r) => r[j]).filter((_, a) => a !== i),
    ],
    solution: [
      `Look for the people with "${row.label}" in the ${c.rowHead} column and "${col.label}" in the ${c.colHead} column: ${joinList(match)}.`,
      `That is ${t[i][j]}. This number goes in the cell where the row "${row.label}" meets the column "${col.label}".`,
      `The whole table: ${summary}.`,
    ],
    rule: 0,
    skill: 'summarising data in a two-way table',
    check: () => checkEqual(raw.rows.filter((r) => r[1] === row.label && r[2] === col.label).length, t[i][j]),
  });
}

function easyJointMarginal(rng) {
  const c = rng.pick(CTX);
  const t = randTable(rng, c.rows.length, c.cols.length, 6, 45);
  const { RT, CT, N } = totals(t);
  const [i, j] = [rng.int(0, c.rows.length - 1), rng.int(0, c.cols.length - 1)];
  const [row, col] = [c.rows[i], c.cols[j]];
  const kind = rng.pick(['joint', 'joint', 'row', 'col']);
  const form = rng.pick(['frac', 'dec', 'pct', 'pct']);
  const all = `all the ${c.who} surveyed`;
  const spec = {
    joint: {
      k: t[i][j], what: `${row.is} and ${col.pred}`, find: `the cell where the row "${row.label}" meets the column "${col.label}"`,
      wrong: [[t[i][j], RT[i], `That divides by the row total, ${RT[i]}: it is a share of the ${row.noun}. "Of all" means divide by the grand total, ${N}.`], [t[i][j], CT[j], `That divides by the column total, ${CT[j]}: it is a share of the ${col.noun}. "Of all" means divide by the grand total, ${N}.`], [RT[i], N, `That is the whole row "${row.label}". The question asks only about those of them who ${col.pred}.`]],
    },
    row: {
      k: RT[i], what: row.is, find: `the total of the row "${row.label}"`,
      wrong: [[RT[i], N - RT[i], `That compares the ${row.noun} with everyone else. A relative frequency compares a part with the whole: divide by the grand total, ${N}.`], [t[i][j], N, `That is only one cell of the row "${row.label}". Use the row total.`], [N - RT[i], N, `That is everyone who is not in the row "${row.label}".`]],
    },
    col: {
      k: CT[j], what: col.pred, find: `the total of the column "${col.label}"`,
      wrong: [[CT[j], N - CT[j], `That compares the ${col.noun} with everyone else. A relative frequency compares a part with the whole: divide by the grand total, ${N}.`], [t[i][j], N, `That is only one cell of the column "${col.label}". Use the column total.`], [N - CT[j], N, `That is everyone who is not in the column "${col.label}".`]],
    },
  }[kind];
  const { k } = spec;
  if ((form === 'pct' && tie(k, N)) || (form === 'dec' && tie(k, N))) return easyJointMarginal(rng);
  const asNum = form === 'frac' ? (a, b) => frac(a, b) : form === 'dec' ? (a, b) => round(a / b, 2) : (a, b) => pc(a, b);
  const correct = asNum(k, N);
  const cands = spec.wrong.map(([a, b, why]) => ({ value: asNum(a, b), why }));
  const ask = { frac: `What fraction of ${all} ${spec.what}? Give the fraction in lowest terms.`, dec: `What proportion of ${all} ${spec.what}? Give it as a decimal to the nearest hundredth.`, pct: `What percent of ${all} ${spec.what}? ${NEAREST}` }[form];
  const fracTex = frac(k, N).tex();
  const last = { frac: R`\(\frac{${k}}{${N}}${frac(k, N).d === N ? '' : R` = ${fracTex}`}\) in lowest terms.`, dec: R`\(\frac{${k}}{${N}} ${(10000 * k) % N === 0 ? '=' : R`\approx`} ${num(round(k / N, 4))}\), which is \(${num(correct, { fixed: 2 })}\) to the nearest hundredth.`, pct: R`\(${divTex(k, N)}\) to the nearest whole percent.` }[form];
  const visual = countTable(c, t);
  return q({
    prompt: `${c.intro} ${ask}`,
    visual,
    correct,
    fmt: form === 'pct' ? P : form === 'dec' ? (v) => R`\(${num(v, { fixed: 2 })}\)` : undefined,
    wrong: form === 'frac' ? cands : apart(correct, cands, form === 'dec' ? 0.03 : 3, 0, form === 'dec' ? 1 : 100),
    solution: [
      `"Of ${all}" means divide by the grand total, ${N}. ${kind === 'joint' ? 'This is a joint relative frequency.' : 'This is a marginal relative frequency.'}`,
      `The count is ${spec.find}: ${k}.`,
      last,
    ],
    rule: 1,
    skill: kind === 'joint' ? 'joint relative frequency' : 'marginal relative frequency',
    check: () => {
      const g = readGrid(visual);
      const R0 = c.rows.length;
      const C0 = c.cols.length;
      const kk = kind === 'joint' ? g[i][j] : kind === 'row' ? sum(g[i].slice(0, C0)) : sum(g.slice(0, R0).map((r) => r[j]));
      const want = kk / sum(g.slice(0, R0).map((r) => sum(r.slice(0, C0))));
      return checkEqual(form === 'frac' ? correct.value : form === 'dec' ? correct : correct / 100, form === 'frac' ? want : form === 'dec' ? round(want, 2) : Math.round(want * 100) / 100);
    },
  });
}

const KINDS = {
  joint: 'Joint: a cell divided by the grand total',
  marginal: 'Marginal: a row or column total divided by the grand total',
  row: 'Conditional: a cell divided by its row total',
  col: 'Conditional: a cell divided by its column total',
};

function easyKind(rng) {
  const c = rng.pick(CTX);
  const t = randTable(rng, c.rows.length, c.cols.length, 5, 40);
  const { RT, CT, N } = totals(t);
  const [i, j] = [rng.int(0, c.rows.length - 1), rng.int(0, c.cols.length - 1)];
  const [row, col] = [c.rows[i], c.cols[j]];
  const kind = rng.pick(['joint', 'marginal', 'row', 'col']);
  const useRow = rng.bool();
  const [k, n, said] = {
    joint: [t[i][j], N, `of all the ${c.who} surveyed ${row.is} and ${col.pred}`],
    marginal: useRow ? [RT[i], N, `of all the ${c.who} surveyed ${row.is}`] : [CT[j], N, `of all the ${c.who} surveyed ${col.pred}`],
    row: [t[i][j], RT[i], `of the ${row.noun} ${col.pred}`],
    col: [t[i][j], CT[j], `of the ${col.noun} ${row.is}`],
  }[kind];
  if (tie(k, n)) return easyKind(rng);
  const denomWord = { joint: `the grand total, ${N}`, marginal: `the grand total, ${N}`, row: `the total of the row "${row.label}", ${RT[i]}`, col: `the total of the column "${col.label}", ${CT[j]}` }[kind];
  const numWord = kind === 'marginal' ? 'a total' : 'one cell';
  const whyNot = {
    joint: `A joint relative frequency is one cell divided by the grand total. Here the statement divides ${numWord} by ${denomWord}.`,
    marginal: `A marginal relative frequency is a row or column total divided by the grand total. Here the statement divides ${numWord} by ${denomWord}.`,
    row: `A conditional relative frequency "of the row" divides a cell by its row total. Here the statement divides ${numWord} by ${denomWord}.`,
    col: `A conditional relative frequency "of the column" divides a cell by its column total. Here the statement divides ${numWord} by ${denomWord}.`,
  };
  const visual = countTable(c, t);
  return q({
    prompt: R`${c.intro} A report says: "${k} out of ${n}, or ${pcSay(k, n)}, ${said}." What kind of relative frequency is this?`,
    visual,
    correct: KINDS[kind],
    wrong: Object.keys(KINDS).filter((x) => x !== kind).map((x) => ({ value: KINDS[x], why: whyNot[x] })),
    solution: [
      `Look at what the ${n} counts. ${kind === 'joint' || kind === 'marginal' ? `The words "of all the ${c.who} surveyed" point to ${denomWord}.` : `The words "of the ${kind === 'row' ? row.noun : col.noun}" point to ${denomWord}.`}`,
      `The ${k} is ${kind === 'marginal' ? 'a total from the edge of the table' : `the cell where "${row.label}" meets "${col.label}"`}.`,
      `${kind === 'joint' ? 'A cell over the grand total is a joint relative frequency.' : kind === 'marginal' ? 'A total over the grand total is a marginal relative frequency.' : `A cell over its ${kind === 'row' ? 'row' : 'column'} total is a conditional relative frequency.`}`,
    ],
    rule: kind === 'joint' || kind === 'marginal' ? 1 : 2,
    skill: 'kinds of relative frequency',
    check: () => {
      const g = readGrid(visual);
      const [R0, C0] = [c.rows.length, c.cols.length];
      const want = { joint: [g[i][j], g[R0][C0]], marginal: useRow ? [g[i][C0], g[R0][C0]] : [g[R0][j], g[R0][C0]], row: [g[i][j], g[i][C0]], col: [g[i][j], g[R0][j]] }[kind];
      return checkAll(checkEqual(want[0], k), checkEqual(want[1], n));
    },
  });
}

// ───────────── Medium ─────────────

function mediumConditional(rng) {
  const c = rng.pick(CTX);
  const t = randTable(rng, c.rows.length, c.cols.length, 5, 50);
  const { RT, CT, N } = totals(t);
  const [i, j] = [rng.int(0, c.rows.length - 1), rng.int(0, c.cols.length - 1)];
  const [row, col] = [c.rows[i], c.cols[j]];
  const byRow = rng.bool();
  const k = t[i][j];
  const [den, other] = byRow ? [RT[i], CT[j]] : [CT[j], RT[i]];
  if (tie(k, den)) return mediumConditional(rng);
  const correct = pc(k, den);
  const rest = den - k;
  const visual = countTable(c, t);
  return q({
    prompt: byRow ? `${c.intro} Of the ${row.noun}, what percent ${col.pred}? ${NEAREST}` : `${c.intro} Of the ${col.noun}, what percent ${row.is}? ${NEAREST}`,
    visual,
    correct,
    fmt: P,
    wrong: apart(correct, [
      { value: pc(k, other), why: byRow ? `That divides by the column total, ${CT[j]}. "Of the ${row.noun}" means divide by the row total, ${RT[i]}.` : `That divides by the row total, ${RT[i]}. "Of the ${col.noun}" means divide by the column total, ${CT[j]}.` },
      { value: pc(k, N), why: `That divides by the grand total, ${N}, which gives a share of all the ${c.who}. Divide by the ${byRow ? 'row' : 'column'} total, ${den}.` },
      { value: pc(rest, den), why: byRow ? `That is the rest of the row "${row.label}": those not in the column "${col.label}".` : `That is the rest of the column "${col.label}": those not in the row "${row.label}".` },
      pc(k, den + other),
    ]),
    solution: [
      byRow ? `"Of the ${row.noun}" means the whole is the row "${row.label}": ${den} ${c.who}. This is a share of the row.` : `"Of the ${col.noun}" means the whole is the column "${col.label}": ${den} ${c.who}. This is a share of the column.`,
      `The part is the cell where "${row.label}" meets "${col.label}": ${k}.`,
      R`\(${divTex(k, den)}\) to the nearest whole percent.`,
    ],
    rule: 2,
    skill: byRow ? 'conditional relative frequency (row)' : 'conditional relative frequency (column)',
    check: () => {
      const g = readGrid(visual);
      const [R0, C0] = [c.rows.length, c.cols.length];
      return checkEqual(Math.round((100 * g[i][j]) / (byRow ? g[i][C0] : g[R0][j])), correct);
    },
  });
}

function mediumStory(rng) {
  const c = pick2(rng, true);
  const [R1, R2] = [rng.int(4, 16) * 5, rng.int(4, 16) * 5];
  const a = rng.int(5, R1 - 5);
  const d = rng.int(5, R2 - 5);
  const t = [[a, R1 - a], [R2 - d, d]];
  const { CT, N } = totals(t);
  const [b, cc] = [t[0][1], t[1][0]];
  const [r0, r1, c0, c1] = [c.rows[0], c.rows[1], c.cols[0], c.cols[1]];
  const target = rng.pick(['b', 'c', 'C0', 'C1']);
  const spec = {
    b: { ask: `How many ${r0.noun} ${c1.pred}?`, ans: b, wrong: [{ value: N - a, why: `That subtracts from the grand total. The ${a} belong to the row "${r0.label}", so subtract from that row's total, ${R1}.` }, d, R1 - d] },
    c: { ask: `How many ${r1.noun} ${c0.pred}?`, ans: cc, wrong: [{ value: N - d, why: `${N} counts both rows. First find how many ${r1.noun} there are: ${N} − ${R1} = ${R2}.` }, { value: R2, why: `${R2} is all the ${r1.noun}. Take away the ${d} who ${c1.pred}.` }, a] },
    C0: { ask: `How many of the ${c.who} ${c0.pred}?`, ans: CT[0], wrong: [{ value: a + d, why: `The ${d} ${r1.noun} ${c1.pred}, so they belong in the other column.` }, { value: a, why: `${a} is only the ${r0.noun}. Add the ${r1.noun} who ${c0.pred}.` }, N - a - d] },
    C1: { ask: `How many of the ${c.who} ${c1.pred}?`, ans: CT[1], wrong: [{ value: d, why: `${d} is only the ${r1.noun}. Add the ${r0.noun} who ${c1.pred}.` }, { value: a + d, why: `The ${a} ${r0.noun} ${c0.pred}, so they belong in the other column.` }, b] },
  }[target];
  const hide = [[0, 1], [1, 0], [1, 2], [2, 0], [2, 1]];
  const visual = countTable(c, t, hide);
  const want = { b: [0, 1], c: [1, 0], C0: [2, 0], C1: [2, 1] }[target];
  const sol = solveGrid(readGrid(visual));
  const sb = R`In the row "${r0.label}", subtract: \(${R1} - ${a} = ${b}\).`;
  const sR2 = R`In the Total column, subtract: \(${N} - ${R1} = ${R2}\) ${r1.noun}.`;
  const sc = R`In the row "${r1.label}", subtract: \(${R2} - ${d} = ${cc}\).`;
  const useful = { b: [sb], c: [sR2, sc], C0: [sR2, sc, R`In the column "${c0.label}", add: \(${a} + ${cc} = ${CT[0]}\).`], C1: [sb, R`In the column "${c1.label}", add: \(${b} + ${d} = ${CT[1]}\).`] }[target];
  return q({
    prompt: `${N} ${c.who} were surveyed.${groups(c)} ${R1} of them ${r0.is}, and ${a} of those ${c0.pred}. Of the ${r1.noun}, ${d} ${c1.pred}. ${spec.ask}`,
    visual,
    correct: spec.ans,
    wrong: spec.wrong,
    solution: [
      `Put the given numbers in the table: the grand total ${N}, the row total ${R1} and the cells ${a} and ${d}.`,
      ...useful,
      `So the answer is ${spec.ans}.`,
    ],
    rule: 0,
    skill: 'building a table from a story',
    check: () => {
      return sol.done ? checkEqual(sol.g[want[0]][want[1]], spec.ans) : 'the table cannot be completed';
    },
  });
}

/** Whole-number percents that add to 100, each from lo to hi. */
function parts100(rng, k, lo) {
  for (;;) {
    const p = Array.from({ length: k - 1 }, () => rng.int(lo, Math.floor(100 / k) + 25));
    const last = 100 - sum(p);
    if (last >= lo) return [...p, last];
  }
}

function mediumRelTable(rng) {
  const c = rng.pick(CTX);
  const [R0, C0] = [c.rows.length, c.cols.length];
  const mode = rng.pick(['rows', 'cols', 'total']);
  let Pm;
  if (mode === 'rows') Pm = c.rows.map(() => parts100(rng, C0, 6));
  else if (mode === 'cols') {
    const cols = c.cols.map(() => parts100(rng, R0, 6));
    Pm = c.rows.map((_, i) => cols.map((col) => col[i]));
  } else {
    const flat = parts100(rng, R0 * C0, 4);
    Pm = c.rows.map((_, i) => flat.slice(i * C0, i * C0 + C0));
  }
  const rowsAdd = Pm.every((r) => sum(r) === 100);
  const colsAdd = c.cols.every((_, j) => sum(Pm.map((r) => r[j])) === 100);
  if ((mode !== 'rows' && rowsAdd) || (mode !== 'cols' && colsAdd)) return mediumRelTable(rng);
  const [i, j] = [rng.int(0, R0 - 1), rng.int(0, C0 - 1)];
  const [row, col] = [c.rows[i], c.cols[j]];
  const p = Pm[i][j];
  const pctCell = (v) => `${v}%`;
  const RTp = Pm.map((r) => sum(r));
  const CTp = c.cols.map((_, j2) => sum(Pm.map((r) => r[j2])));
  const visual = {
    type: 'table',
    headers: [corner(c), ...c.cols.map((x) => x.label), ...(mode === 'cols' ? [] : ['Total'])],
    rowHeaders: true,
    rows: [
      ...Pm.map((r, a) => [c.rows[a].label, ...r.map(pctCell), ...(mode === 'cols' ? [] : [pctCell(RTp[a])])]),
      ...(mode === 'rows' ? [] : [['Total', ...CTp.map(pctCell), ...(mode === 'cols' ? [] : ['100%'])]]),
    ],
    caption: 'Relative frequencies',
    alt: `A relative-frequency table of ${c.rowHead.toLowerCase()} by ${c.colHead.toLowerCase()}, in percents. ` + Pm.map((r, a) => `${c.rows[a].label}: ` + r.map((v, b) => `${c.cols[b].label} ${v}%`).join(', ') + (mode === 'cols' ? '' : `, total ${RTp[a]}%`)).join('. ') + (mode === 'rows' ? '.' : `. Total: ${CTp.map((v, b) => `${c.cols[b].label} ${v}%`).join(', ')}${mode === 'cols' ? '' : ', grand total 100%'}.`),
  };
  const S = {
    rows: R`\(${p}\%\) of the ${row.noun} ${col.pred}.`,
    cols: R`\(${p}\%\) of the ${col.noun} ${row.is}.`,
    total: R`\(${p}\%\) of all the ${c.who} surveyed ${row.is} and ${col.pred}.`,
  };
  const others = [];
  for (let a = 0; a < R0; a++) for (let b = 0; b < C0; b++) if (Math.abs(Pm[a][b] - p) >= 3) others.push(Pm[a][b]);
  const p2 = rng.pick(others);
  const wrongNum = { rows: R`\(${p2}\%\) of the ${row.noun} ${col.pred}.`, cols: R`\(${p2}\%\) of the ${col.noun} ${row.is}.`, total: R`\(${p2}\%\) of all the ${c.who} surveyed ${row.is} and ${col.pred}.` }[mode];
  const how = { rows: 'Each row adds to 100%, so the table was made by rows: every percent is a share of its row.', cols: 'Each column adds to 100%, so the table was made by columns: every percent is a share of its column.', total: 'Only the grand total is 100%, so every percent is a share of all the people surveyed.' }[mode];
  const whyKind = (m) => `${how} A statement about ${m === 'rows' ? `"the ${row.noun}" needs a table made by rows` : m === 'cols' ? `"the ${col.noun}" needs a table made by columns` : '"all the people surveyed" needs a table made from the grand total'}.`;
  return q({
    prompt: `${c.intro} The table shows the results as percents. Which statement can be read from this table?`,
    visual,
    correct: S[mode],
    wrong: [...['rows', 'cols', 'total'].filter((m) => m !== mode).map((m) => ({ value: S[m], why: whyKind(m) })), { value: wrongNum, why: `The cell where "${row.label}" meets "${col.label}" shows ${p}%, not ${p2}%.` }],
    solution: [
      `Check which percents add to 100%. ${how}`,
      `The cell where "${row.label}" meets "${col.label}" shows ${p}%.`,
      `So: ${mode === 'rows' ? `${p}% of the ${row.noun} ${col.pred}` : mode === 'cols' ? `${p}% of the ${col.noun} ${row.is}` : `${p}% of all the ${c.who} surveyed ${row.is} and ${col.pred}`}.`,
    ],
    rule: 3,
    skill: 'reading a relative-frequency table',
    check: () => {
      const g = readGrid(visual);
      const cells = g.slice(0, R0).map((r) => r.slice(0, C0));
      const rowsOk = cells.every((r) => sum(r) === 100);
      const colsOk = c.cols.every((_, b) => sum(cells.map((r) => r[b])) === 100);
      const totalOk = sum(cells.flat()) === 100;
      const ok = mode === 'rows' ? rowsOk && !colsOk : mode === 'cols' ? colsOk && !rowsOk : totalOk && !rowsOk && !colsOk;
      return ok && cells[i][j] === p ? true : 'the table does not match the statement';
    },
  });
}

// Two groups of values for comparing distributions.
const GROUPS = [
  { what: 'the minutes that students in two classes spent on homework last night', a: 'Class A', b: 'Class B', label: 'minutes of homework', unit: 'minutes', lo: 25 },
  { what: 'the travel times, in minutes, of passengers on two bus routes', a: 'Route A', b: 'Route B', label: 'travel time (minutes)', unit: 'minutes', lo: 22 },
  { what: 'the number of push-ups each student did in one minute, in two gym classes', a: 'Class A', b: 'Class B', label: 'push-ups', unit: 'push-ups', lo: 24 },
  { what: 'the number of points each player scored in a tournament, for two basketball teams', a: 'Team A', b: 'Team B', label: 'points', unit: 'points', lo: 30 },
];
const sorted = (xs) => [...xs].sort((u, v) => u - v);
const median = (xs) => {
  const s = sorted(xs);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
const mean = (xs) => sum(xs) / xs.length;
/** Outlier fences under two quartile rules (median left out of, or kept in, both halves): [lowest lower fence, highest upper fence] and the reverse. */
function fences(xs) {
  const s = sorted(xs);
  const n = s.length;
  const out = [];
  for (const keep of [false, true]) {
    const h = keep ? Math.ceil(n / 2) : Math.floor(n / 2);
    const [q1, q3] = [median(s.slice(0, h)), median(s.slice(n - h))];
    const iqr = q3 - q1;
    out.push([q1 - 1.5 * iqr, q3 + 1.5 * iqr]);
  }
  return { loose: [Math.min(...out.map((f) => f[0])), Math.max(...out.map((f) => f[1]))], tight: [Math.max(...out.map((f) => f[0])), Math.min(...out.map((f) => f[1]))] };
}
const outliersOf = (xs) => {
  const { loose, tight } = fences(xs);
  return { sure: xs.filter((x) => x < loose[0] - 2 || x > loose[1] + 2), maybe: xs.filter((x) => x < tight[0] + 2 || x > tight[1] - 2) };
};
/** `xs` has exactly one outlier, v, by every common quartile rule (with room to spare), and `other` has none. */
function clearOutlier(xs, v, other) {
  const o = outliersOf(xs);
  return o.sure.length === 1 && o.sure[0] === v && o.maybe.length === 1 && outliersOf(other).maybe.length === 0;
}
/** A second test, by gaps alone: v is further from its nearest neighbour than the rest of its group is wide,
 *  and the other group has no gap wider than half its range. */
function looksOutlying(xs, v, other) {
  const rest = sorted(xs.filter((x, i) => i !== xs.indexOf(v)));
  const gapV = Math.min(...rest.map((x) => Math.abs(x - v)));
  const o = sorted(other);
  const widest = Math.max(...o.slice(1).map((x, i) => x - o[i]));
  return gapV > rest[rest.length - 1] - rest[0] && widest <= (o[o.length - 1] - o[0]) / 2 ? true : 'the outlier is not clear-cut';
}
/** n values spread around m with no outlier. */
function cluster(rng, m, n) {
  for (;;) {
    const xs = sorted(rng.sample([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], n).map((d) => m + d));
    if (xs.slice(1).every((x, i) => x - xs[i] <= 3)) return xs;
  }
}
const dots = (xs, label, lo, hi) => ({ type: 'dotPlot', values: xs, min: lo, max: hi, label, alt: `Dot plot of ${label}: ${sorted(xs).join(', ')}.` });

function mediumWhichMeasures(rng) {
  const G = rng.pick(GROUPS);
  const n = 9;
  const mA = G.lo + rng.int(0, 8);
  const mB = mA + rng.pick([-4, -3, -2, 2, 3, 4]);
  const A = cluster(rng, mA, n);
  const B = cluster(rng, mB, n);
  const inA = rng.bool();
  const high = rng.bool(0.7);
  const X = inA ? A : B;
  const iqr = 8;
  const far = high ? Math.max(...X) + 1.5 * iqr + rng.int(6, 10) : Math.min(...X) - 1.5 * iqr - rng.int(6, 10);
  const V = Math.round(far);
  X[high ? n - 1 : 0] = V;
  const [lo, hi] = [Math.min(...A, ...B) - 1, Math.max(...A, ...B) + 1];
  if (hi - lo > 40 || lo < 1 || !clearOutlier(X, V, inA ? B : A)) return mediumWhichMeasures(rng);
  const [out, clean] = inA ? [G.a, G.b] : [G.b, G.a];
  const correct = `Medians and interquartile ranges, because ${out} has an outlier`;
  return q({
    prompt: `The dot plots show ${G.what}. Which measures give the fairest comparison of the two groups?`,
    visual: [dots(A, `${G.a}: ${G.label}`, lo, hi), dots(B, `${G.b}: ${G.label}`, lo, hi)],
    correct,
    wrong: [
      { value: `Means and standard deviations, because they use every value, including the ${V}`, why: `The ${V} is far from the rest of ${out}. It would pull the mean of ${out} toward it and make its standard deviation large, so those measures would not describe a typical value.` },
      { value: `Medians and interquartile ranges, because ${clean} has an outlier`, why: `The values of ${clean} are bunched together. The value far from the rest, ${V}, belongs to ${out}.` },
      { value: 'Means and standard deviations, because neither group has an outlier', why: `${out} has a value of ${V}, far from the rest of its data. That is an outlier.` },
    ],
    solution: [
      `${out} has one value, ${V}, far ${high ? 'above' : 'below'} the rest of its data: an outlier. ${clean} has no value far from the others.`,
      `An outlier pulls the mean toward it and makes the standard deviation larger, but it hardly moves the median or the interquartile range.`,
      `So compare the groups with their medians and interquartile ranges, and use the same measures for both groups.`,
    ],
    rule: 5,
    skill: 'choosing measures to compare groups',
    check: () => looksOutlying(X, V, inA ? B : A),
  });
}

// ───────────── Hard ─────────────

function hardAssociation(rng) {
  const c = pick2(rng);
  const C0 = c.cols.length;
  const big = rng.bool();
  const j = rng.int(0, C0 - 1);
  let t;
  for (let tries = 0; ; tries++) {
    const [R1, R2] = [rng.int(30, 120), rng.int(30, 120)];
    const [k1, k2] = [rng.int(6, R1 - 6), rng.int(6, R2 - 6)];
    const [p1, p2] = [(100 * k1) / R1, (100 * k2) / R2];
    const gap = Math.abs(pc(k1, R1) - pc(k2, R2));
    const countGap = Math.abs(k1 - k2) / Math.max(k1, k2);
    if (tie(k1, R1) || tie(k2, R2)) continue;
    const ok = big ? gap >= 20 && countGap <= 0.1 : gap <= 3 && countGap >= 0.35 && Math.abs(p1 - p2) < 4 && Math.min(p1, p2) >= 25 && Math.max(p1, p2) <= 75;
    if (!ok) continue;
    const fill = (k, Rt) => {
      if (C0 === 2) return j === 0 ? [k, Rt - k] : [Rt - k, k];
      const rest = Rt - k;
      const u = rng.int(Math.ceil(rest * 0.3), Math.floor(rest * 0.7));
      const others = [u, rest - u];
      return [0, 1, 2].map((b) => (b === j ? k : others.shift()));
    };
    t = [fill(k1, R1), fill(k2, R2)];
    if (t.flat().every((v) => v >= 2)) break;
  }
  const { RT, CT, N } = totals(t);
  const [r0, r1, col] = [c.rows[0], c.rows[1], c.cols[j]];
  const [k1, k2] = [t[0][j], t[1][j]];
  const [q1, q2] = [pc(k1, RT[0]), pc(k2, RT[1])];
  const yes = (u, v, what) => R`Yes. ${what(u, v)} That is a big difference.`;
  const no = (u, v, what) => R`No. ${what(u, v)} Those are about the same.`;
  const rowWay = (u, v) => R`\(${u}\%\) of the ${r0.noun} ${col.pred}, compared with \(${v}\%\) of the ${r1.noun}.`;
  const countWay = (u, v) => R`${cap(txt(u))} ${r0.noun} ${col.pred}, compared with ${txt(v)} ${r1.noun}.`;
  const allWay = (u, v) => R`\(${u}\%\) of all the ${c.who} surveyed are ${r0.noun} who ${col.pred}, compared with \(${v}\%\) who are ${r1.noun}.`;
  const [right, wrongV] = big ? [yes, no] : [no, yes];
  const [a1, a2] = [pc(k1, N), pc(k2, N)];
  const visual = countTable(c, t);
  return q({
    prompt: `${c.intro} Is there an association between the two variables? Compare the ${r0.noun} with the ${r1.noun}, looking at those who ${col.pred}. Percents are to the nearest whole percent.`,
    visual,
    correct: right(q1, q2, rowWay),
    wrong: [
      { value: wrongV(q1, q2, rowWay), why: `The percents of each row are ${q1}% and ${q2}%: a difference of ${points(q1, q2)}, which is ${big ? 'large' : 'small'}.` },
      { value: wrongV(k1, k2, countWay), why: `The rows have different totals (${RT[0]} and ${RT[1]}), so their counts cannot be compared directly. Divide each count by its own row total.` },
      { value: wrongV(a1, a2, allWay), why: `Those percents divide by the grand total, ${N}, so they are joint relative frequencies and still depend on the row sizes. Divide by each row total.` },
    ],
    solution: [
      `The rows have different totals (${RT[0]} and ${RT[1]}), so compare percents of each row, not counts.`,
      R`${cap(r0.noun)}: \(${divTex(k1, RT[0])}\). ${cap(r1.noun)}: \(${divTex(k2, RT[1])}\).`,
      big ? `The percents differ by ${points(q1, q2)}, so the variables appear to be associated.` : q1 === q2 ? `The percents are the same, so there is no association, even though the counts (${k1} and ${k2}) are very different.` : `The percents differ by only ${points(q1, q2)}, so there is little or no association, even though the counts (${k1} and ${k2}) are very different.`,
    ],
    rule: 4,
    skill: 'association in a two-way table',
    check: () => {
      const g = readGrid(visual);
      const gap = Math.abs(g[0][j] / g[0][C0] - g[1][j] / g[1][C0]);
      return (big ? gap >= 0.19 : gap < 0.05) && CT.length === C0 ? true : 'the gap does not match the answer';
    },
  });
}

function hardJointToConditional(rng) {
  const c = rng.pick(CTX);
  const [R0, C0] = [c.rows.length, c.cols.length];
  const flat = parts100(rng, R0 * C0, 4);
  const cells = c.rows.map((_, i) => flat.slice(i * C0, i * C0 + C0));
  const g = withTotals(cells);
  const [i, j] = [rng.int(0, R0 - 1), rng.int(0, C0 - 1)];
  const [row, col] = [c.rows[i], c.cols[j]];
  const byRow = rng.bool();
  const k = cells[i][j];
  const [den, other] = byRow ? [g[i][C0], g[R0][j]] : [g[R0][j], g[i][C0]];
  if (tie(k, den)) return hardJointToConditional(rng);
  const correct = pc(k, den);
  const d2 = (v) => num(v / 100, { fixed: 2 });
  const visual = gridVisual(c, g.map((r) => r.map(d2)), 'Proportions of all surveyed');
  const denName = byRow ? `the row "${row.label}"` : `the column "${col.label}"`;
  return q({
    prompt: `${c.intro} The table gives each result as a proportion of all the ${c.who} surveyed. ${byRow ? `Of the ${row.noun}, what percent ${col.pred}?` : `Of the ${col.noun}, what percent ${row.is}?`} ${NEAREST}`,
    visual,
    correct,
    fmt: P,
    wrong: apart(correct, [
      { value: k, why: `${d2(k)} is a joint relative frequency: a share of all the ${c.who}. The question asks for a share of ${denName}, so divide by its total, ${d2(den)}.` },
      { value: pc(k, other), why: `That divides by the total of ${byRow ? `the column "${col.label}"` : `the row "${row.label}"`}, ${d2(other)}. Divide by the total of ${denName}, ${d2(den)}.` },
      { value: den, why: `${d2(den)} is the total of ${denName} as a share of everyone. It is the whole for this question, not the answer.` },
    ]),
    solution: [
      `The question is about ${byRow ? `the ${row.noun}` : `the ${col.noun}`}, so the whole is ${denName}. Its total is ${d2(den)} of everyone.`,
      `The part is the cell where "${row.label}" meets "${col.label}": ${d2(k)} of everyone.`,
      R`Divide the part by the whole: \(\frac{${d2(k)}}{${d2(den)}} ${exact(k, den) ? '=' : R`\approx`} ${num(round(k / den, 4))}\), which is \(${correct}\%\) to the nearest whole percent.`,
    ],
    rule: 3,
    skill: 'conditional from joint frequencies',
    check: () => {
      const back = readGrid(visual);
      const whole = byRow ? sum(back[i].slice(0, C0)) : sum(back.slice(0, R0).map((r) => r[j]));
      return checkAll(checkEqual(back[R0][C0], 1), checkEqual(Math.round((100 * back[i][j]) / whole), correct));
    },
  });
}

function hardCompleteThenPercent(rng) {
  const c = rng.pick(CTX);
  const [R0, C0] = [c.rows.length, c.cols.length];
  const t = randTable(rng, R0, C0, 8, 60);
  const full = withTotals(t);
  const [i, j] = [rng.int(0, R0 - 1), rng.int(0, C0 - 1)];
  const byRow = rng.bool();
  const places = [];
  for (let a = 0; a <= R0; a++) for (let b = 0; b <= C0; b++) if (!(a === R0 && b === C0) && !(a === i && b === j)) places.push([a, b]);
  const hide = [[i, j], ...rng.sample(places, rng.int(2, 3))];
  const G = full.map((r, a) => r.map((v, b) => (hide.some(([x, y]) => x === a && y === b) ? null : v)));
  const sol = solveGrid(G);
  const order = sol.steps.findIndex((s) => s.at[0] === i && s.at[1] === j);
  const den = byRow ? full[i][C0] : full[R0][j];
  if (!sol.done || order < 1 || tie(t[i][j], den)) return hardCompleteThenPercent(rng);
  const [row, col] = [c.rows[i], c.cols[j]];
  const k = t[i][j];
  const other = byRow ? full[R0][j] : full[i][C0];
  const correct = pc(k, den);
  const visual = gridVisual(c, G);
  const upTo = sol.steps.slice(0, order + 1);
  const denStep = sol.steps.find((s) => s.at[0] === (byRow ? i : R0) && s.at[1] === (byRow ? C0 : j));
  const steps = denStep && !upTo.includes(denStep) ? [...upTo, denStep] : upTo;
  return q({
    prompt: `${c.intro} Some cells of the table are blank. ${byRow ? `Of the ${row.noun}, what percent ${col.pred}?` : `Of the ${col.noun}, what percent ${row.is}?`} ${NEAREST}`,
    visual,
    correct,
    fmt: P,
    wrong: apart(correct, [
      { value: pc(k, other), why: byRow ? `That divides by the column total, ${other}. "Of the ${row.noun}" means divide by the row total, ${den}.` : `That divides by the row total, ${other}. "Of the ${col.noun}" means divide by the column total, ${den}.` },
      { value: pc(k, full[R0][C0]), why: `That divides by the grand total, ${full[R0][C0]}. Divide by the ${byRow ? 'row' : 'column'} total, ${den}.` },
      pc(den - k, den),
      pc(k, den + 10),
    ]),
    solution: [
      `Fill in blanks one at a time, using any row or column with only one blank.`,
      ...steps.map((s) => stepText(c, s)),
      R`The cell for "${row.label}, ${col.label}" is ${k}, and the ${byRow ? 'row' : 'column'} total is ${den}: \(${divTex(k, den)}\) to the nearest whole percent.`,
    ],
    rule: 0,
    skill: 'completing a table, then a percent',
    check: () => {
      const s = solveGrid(readGrid(visual));
      return s.done ? checkEqual(Math.round((100 * s.g[i][j]) / (byRow ? s.g[i][C0] : s.g[R0][j])), correct) : 'the table cannot be completed';
    },
  });
}

function hardOutlierCompare(rng) {
  const G = rng.pick(GROUPS);
  const n = 7;
  let A;
  let B;
  for (;;) {
    const mA = G.lo + rng.int(4, 10);
    const mB = mA - rng.int(3, 6);
    A = cluster(rng, mA, n);
    B = cluster(rng, mB, n);
    B[n - 1] = Math.max(...B) + rng.int(18, 26);
    const [lo, hi] = [Math.min(...A, ...B) - 1, Math.max(...A, ...B) + 1];
    if (hi - lo <= 40 && mean(B) - mean(A) >= 1 && median(A) - median(B) >= 2 && clearOutlier(B, Math.max(...B), A)) break;
  }
  const [lo, hi] = [Math.min(...A, ...B) - 1, Math.max(...A, ...B) + 1];
  const V = Math.max(...B);
  const [medA, medB] = [median(A), median(B)];
  const [mnA, mnB] = [round(mean(A), 1), round(mean(B), 1)];
  const [sA, sB] = [rng.shuffle([...A]), rng.shuffle([...B])];
  const [uA, uB] = [sA[3], sB[3]];
  const f = (v) => num(v);
  const unsorted = uA === uB ? null : uA > uB ? R`Use the medians: ${G.a} is typically higher (median \(${f(uA)}\) against \(${f(uB)}\)).` : R`Use the medians: ${G.b} is typically higher (median \(${f(uB)}\) against \(${f(uA)}\)).`;
  return q({
    prompt: `The data are ${G.what}. ${G.a}: ${sA.join(', ')}. ${G.b}: ${sB.join(', ')}. Which statement gives the fairer comparison of a typical value for the two groups?`,
    visual: [dots(A, `${G.a}: ${G.label}`, lo, hi), dots(B, `${G.b}: ${G.label}`, lo, hi)],
    correct: R`Use the medians: ${G.a} is typically higher (median \(${f(medA)}\) against \(${f(medB)}\)). The ${V} in ${G.b} is an outlier.`,
    wrong: [
      { value: R`Use the means: ${G.b} is typically higher (mean \(${f(mnB)}\) against \(${f(mnA)}\)).`, why: `The mean of ${G.b} is higher only because of the outlier ${V}, which pulls it up. One extreme value hardly moves the median, so the medians describe a typical value better.` },
      { value: unsorted, why: `Those are the middle numbers of the lists as written. Put each list in order first: then the middle values are ${f(medA)} for ${G.a} and ${f(medB)} for ${G.b}.` },
      { value: R`Use the medians: ${G.b} is typically higher (median \(${f(medB)}\) against \(${f(medA)}\)).`, why: `The middle value of ${G.a} in order is ${f(medA)}, and of ${G.b} is ${f(medB)}, so ${G.a} has the higher median.` },
      { value: R`Use the means: ${G.a} is typically higher (mean \(${f(mnA)}\) against \(${f(mnB)}\)).`, why: R`Work the means out: \(${sum(A)} \div ${n} \approx ${f(mnA)}\) for ${G.a} and \(${sum(B)} \div ${n} \approx ${f(mnB)}\) for ${G.b}. Because of the outlier, the mean of ${G.b} is the higher one, and that is why the mean is the wrong tool here.` },
    ],
    solution: [
      `${G.b} has one value, ${V}, far above the rest of its data: an outlier. So use the median, which an outlier hardly moves.`,
      `In order, ${G.a}: ${sorted(A).join(', ')}. The middle value is ${f(medA)}. ${G.b}: ${sorted(B).join(', ')}. The middle value is ${f(medB)}.`,
      R`The means would tell the opposite story: \(${f(mnA)}\) for ${G.a} and \(${f(mnB)}\) for ${G.b}, only because the ${V} pulls the mean of ${G.b} up.`,
      `So ${G.a} is typically higher.`,
    ],
    rule: 5,
    skill: 'comparing groups with an outlier',
    check: () => checkAll(looksOutlying(B, V, A), median(A) > median(B) && mean(B) > mean(A) ? true : 'the means and medians do not disagree'),
  });
}

// ───────────── Challenge ─────────────

// Surveys where the association is easy to read as cause. `cause` finishes "cannot show that …";
// `act` is a claim about what would happen if people changed; `other` gives another explanation.
const CAUSE = [
  {
    intro: 'A survey asked students whether they play a musical instrument and whether they are on the honour roll.', who: 'students', rowHead: 'Instrument', colHead: 'Honour roll',
    rows: [{ label: 'Plays', noun: 'students who play an instrument', is: 'play an instrument' }, { label: 'Does not play', noun: 'students who do not play an instrument', is: 'do not play an instrument' }],
    cols: [{ label: 'Honour roll', noun: 'students on the honour roll', pred: 'are on the honour roll' }, { label: 'Not on it', noun: 'students not on the honour roll', pred: 'are not on the honour roll' }],
    cause: 'playing an instrument raises grades', act: 'If the students who do not play took up an instrument, more of them would make the honour roll', other: 'Students with more free time or support at home may be more likely both to take lessons and to get high grades.',
  },
  {
    intro: 'A survey asked adults whether they drink coffee and how long they usually sleep.', who: 'adults', rowHead: 'Coffee', colHead: 'Sleep',
    rows: [{ label: 'Drinks coffee', noun: 'adults who drink coffee', is: 'drink coffee' }, { label: 'No coffee', noun: 'adults who do not drink coffee', is: 'do not drink coffee' }],
    cols: [{ label: 'Under 7 hours', noun: 'adults who sleep under 7 hours', pred: 'sleep under 7 hours' }, { label: '7 hours or more', noun: 'adults who sleep 7 hours or more', pred: 'sleep 7 hours or more' }],
    cause: 'drinking coffee makes people sleep less', act: 'If the coffee drinkers gave up coffee, fewer of them would sleep under 7 hours', other: 'The cause could run the other way: people who sleep less may drink coffee to stay awake.',
  },
  {
    intro: 'A survey asked adults whether they have a library card and whether they read for fun each week.', who: 'adults', rowHead: 'Library card', colHead: 'Reading',
    rows: [{ label: 'Has a card', noun: 'adults with a library card', is: 'have a library card' }, { label: 'No card', noun: 'adults without a library card', is: 'do not have a library card' }],
    cols: [{ label: 'Reads weekly', noun: 'adults who read for fun each week', pred: 'read for fun each week' }, { label: 'Does not', noun: 'adults who do not read for fun each week', pred: 'do not read for fun each week' }],
    cause: 'getting a library card makes people read more', act: 'If the adults without a card got one, more of them would read for fun each week', other: 'The cause could run the other way: people who already enjoy reading are more likely to get a library card.',
  },
  {
    intro: 'A survey asked adults whether they own a dog and whether they walk for at least 30 minutes a day.', who: 'adults', rowHead: 'Dog', colHead: 'Walking',
    rows: [{ label: 'Owns a dog', noun: 'adults who own a dog', is: 'own a dog' }, { label: 'No dog', noun: 'adults who do not own a dog', is: 'do not own a dog' }],
    cols: [{ label: 'Walks 30 min', noun: 'adults who walk at least 30 minutes a day', pred: 'walk at least 30 minutes a day' }, { label: 'Walks less', noun: 'adults who walk less', pred: 'walk less than 30 minutes a day' }],
    cause: 'owning a dog makes people walk more', act: 'If the adults without a dog got one, more of them would walk at least 30 minutes a day', other: 'People who already like walking may be more likely to get a dog.',
  },
  {
    intro: 'A survey asked students whether they eat breakfast on school days and whether they were on time all week.', who: 'students', rowHead: 'Breakfast', colHead: 'Arrival',
    rows: [{ label: 'Eats breakfast', noun: 'students who eat breakfast', is: 'eat breakfast' }, { label: 'Skips breakfast', noun: 'students who skip breakfast', is: 'skip breakfast' }],
    cols: [{ label: 'On time all week', noun: 'students who were on time all week', pred: 'were on time all week' }, { label: 'Late at least once', noun: 'students who were late at least once', pred: 'were late at least once' }],
    cause: 'eating breakfast makes students arrive on time', act: 'If the students who skip breakfast started eating it, more of them would be on time all week', other: 'Students who get up earlier may be more likely both to eat breakfast and to arrive on time.',
  },
];

function challengeCausation(rng) {
  const c = rng.pick(CAUSE);
  let t;
  for (;;) {
    const R1 = rng.int(4, 12) * 5;
    const R2 = rng.int(Math.ceil(R1 * 1.8 / 5), 30) * 5;
    const k1 = rng.int(Math.ceil(R1 * 0.45), Math.floor(R1 * 0.8));
    const k2 = rng.int(Math.ceil(R2 * 0.15), Math.floor(R2 * 0.4));
    if (tie(k1, R1) || tie(k2, R2) || pc(k1, R1) - pc(k2, R2) < 20 || k2 <= k1) continue;
    t = [[k1, R1 - k1], [k2, R2 - k2]];
    break;
  }
  const { RT, N } = totals(t);
  const [r0, r1, c0] = [c.rows[0], c.rows[1], c.cols[0]];
  const [k1, k2] = [t[0][0], t[1][0]];
  const [p1, p2] = [pc(k1, RT[0]), pc(k2, RT[1])];
  const ev = R`\(${p1}\%\) of the ${r0.noun} ${c0.pred}, compared with \(${p2}\%\) of the ${r1.noun}`;
  const noCause = `A survey shows how the variables go together, not why. ${c.other} Only an experiment that assigns people to groups could test cause.`;
  const visual = countTable(c, t);
  return q({
    prompt: `${c.intro} Percents are to the nearest whole percent. Which conclusion does the table support?`,
    visual,
    correct: R`There is an association: ${ev}. The survey cannot show that ${c.cause}.`,
    wrong: [
      { value: R`The survey shows that ${c.cause}: ${ev}.`, why: noCause },
      { value: `There is no association: more ${r1.noun} (${k2}) than ${r0.noun} (${k1}) ${c0.pred}.`, why: `The groups have different sizes (${RT[0]} and ${RT[1]}), so compare percents of each row, not counts: ${p1}% against ${p2}%.` },
      { value: R`${c.act}, because ${ev}.`, why: `That is a claim about cause: what would happen if people changed. ${noCause}` },
    ],
    solution: [
      `The rows have different totals (${RT[0]} and ${RT[1]}, ${N} in all), so compare percents of each row.`,
      R`${cap(r0.noun)}: \(${divTex(k1, RT[0])}\). ${cap(r1.noun)}: \(${divTex(k2, RT[1])}\). The big difference shows an association.`,
      `It does not show cause. ${c.other}`,
    ],
    rule: 4,
    skill: 'association is not causation',
    check: () => {
      const g = readGrid(visual);
      return g[0][0] / g[0][2] - g[1][0] / g[1][2] >= 0.19 && g[1][0] > g[0][0] ? true : 'the table does not show the intended pattern';
    },
  });
}

function challengeWorkBack(rng) {
  const c = pick2(rng, true);
  let v;
  for (;;) {
    const N = rng.int(6, 20) * 20;
    const R1 = rng.int(Math.ceil(N * 0.25 / 20), Math.floor(N * 0.6 / 20)) * 20;
    const p = rng.int(3, 17) * 5;
    const Pc = rng.int(3, 17) * 5;
    const a = (p * R1) / 100;
    const colT = (Pc * N) / 100;
    const cc = colT - a;
    if (!Number.isInteger(a) || !Number.isInteger(colT) || cc < 3 || cc > N - R1 - 3 || a < 2 || p === Pc) continue;
    v = { N, R1, p, Pc, a, colT, cc };
    break;
  }
  const { N, R1, p, Pc, a, colT, cc } = v;
  const R2 = N - R1;
  const t = [[a, R1 - a], [cc, R2 - cc]];
  const [r0, r1, c0] = [c.rows[0], c.rows[1], c.cols[0]];
  const visual = countTable(c, t, [[0, 0], [0, 1], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1]]);
  const pDiff = ((Pc - p) * R2) / 100;
  return q({
    prompt: `${N} ${c.who} were surveyed.${groups(c)} ${R1} of them ${r0.is}. Of those ${R1}, ${p}% ${c0.pred}. Of all ${N} ${c.who}, ${Pc}% ${c0.pred}. How many ${r1.noun} ${c0.pred}?`,
    visual,
    correct: cc,
    wrong: [
      { value: Number.isInteger(pDiff) && pDiff > 0 ? pDiff : null, why: `The ${Pc}% is a share of all ${N}, and the ${p}% is a share of only ${R1}. Percents of different wholes cannot be subtracted. Turn each into a count first.` },
      { value: colT - p, why: `${p}% is a percent, not a count. ${p}% of ${R1} is ${a}.` },
      { value: colT, why: `${colT} is all the ${c.who} who ${c0.pred}, in both rows. Take away the ${a} ${r0.noun}.` },
      a,
    ],
    solution: [
      R`The ${r0.noun} who ${c0.pred}: ${p}% of ${R1} is \(${num(p / 100)} \times ${R1} = ${a}\).`,
      R`All the ${c.who} who ${c0.pred}: ${Pc}% of ${N} is \(${num(Pc / 100)} \times ${N} = ${colT}\). That is the total of the column "${c0.label}".`,
      R`In that column, subtract: \(${colT} - ${a} = ${cc}\).`,
      R`Check: \(\frac{${a}}{${R1}} = ${p}\%\) and \(\frac{${colT}}{${N}} = ${Pc}\%\). So ${cc} ${r1.noun} ${c0.pred}.`,
    ],
    rule: 2,
    skill: 'working backwards from percents',
    check: () => checkAll(checkEqual((100 * t[0][0]) / (t[0][0] + t[0][1]), p), checkEqual((100 * (t[0][0] + t[1][0])) / sum(t.flat()), Pc), checkEqual(sum(t.flat()), N)),
  });
}

function challengeNoAssociation(rng) {
  const c = pick2(rng, true);
  let v;
  for (;;) {
    const u = rng.int(1, 6);
    const w = rng.int(1, 6);
    if (u === w || frac(u, w).d !== w) continue;
    const [nA, mB] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 12], 2);
    const [a, b, cc, x] = [u * nA, w * nA, u * mB, w * mB];
    if (a < 4 || cc < 4 || tie(a, a + b)) continue;
    v = { a, b, cc, x };
    break;
  }
  const { a, b, cc, x } = v;
  const t = [[a, b], [cc, x]];
  const [r0, r1, c0, c1] = [c.rows[0], c.rows[1], c.cols[0], c.cols[1]];
  const visual = countTable(c, t, [[1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]);
  const inv = (a * cc) % b === 0 ? (a * cc) / b : null;
  return q({
    prompt: `${c.intro} One count is missing. What number in the blank cell for ${r1.noun} who ${c1.pred} would mean there is no association between the two variables?`,
    visual,
    correct: x,
    wrong: [
      { value: cc + (b - a), why: `That keeps the same difference between the two cells. No association needs the same percent in each row, so the two rows must be in the same ratio.` },
      { value: inv, why: R`That turns the ratio upside down. The ${r0.noun} split \(${a} : ${b}\), so the ${r1.noun} must split \(${cc} : x\) in the same order.` },
      { value: b, why: `Copying the cell above does not keep the percents equal, because the ${r1.noun} have ${cc}, not ${a}, in the first column.` },
      x + cc,
    ],
    solution: [
      R`No association means the same percent of each row ${c0.pred}. For the ${r0.noun} it is \(${divTex(a, a + b)}\).`,
      R`So the ${r1.noun} must split in the same ratio: \(\frac{${cc}}{x} = \frac{${a}}{${b}}\).`,
      R`Then \(x = \frac{${cc} \times ${b}}{${a}} = ${x}\).`,
      R`Check: \(\frac{${cc}}{${cc + x}} = ${num(round(cc / (cc + x), 4))}\), the same as for the first row.`,
    ],
    rule: 4,
    skill: 'working backwards to no association',
    check: () => checkEqual(cc / (cc + x), a / (a + b)),
  });
}

function challengeDirection(rng) {
  const c = pick2(rng);
  const C0 = c.cols.length;
  const j = rng.int(0, C0 - 1);
  let t;
  for (;;) {
    t = randTable(rng, 2, C0, 4, 30);
    t[0] = t[0].map((v, b) => (b === j ? v : v + rng.int(30, 60)));
    t[1][j] = rng.int(3, Math.max(3, Math.floor(t[0][j] / 2)));
    const { RT, CT } = totals(t);
    const [pA, pB] = [pc(t[0][j], CT[j]), pc(t[0][j], RT[0])];
    if (tie(t[0][j], CT[j]) || tie(t[0][j], RT[0]) || pA < 60 || pB > 40 || pA - pB < 25) continue;
    break;
  }
  const { RT, CT } = totals(t);
  const [r0, r1, col] = [c.rows[0], c.rows[1], c.cols[j]];
  const k = t[0][j];
  const [pA, pB] = [pc(k, CT[j]), pc(k, RT[0])];
  const visual = countTable(c, t);
  return q({
    prompt: `${c.intro} A report says: "Most of the ${col.noun} ${r0.is}, so most ${r0.noun} ${col.pred}." Does the table support the second part of the claim? Percents are to the nearest whole percent.`,
    visual,
    correct: R`No. \(${pA}\%\) of the ${col.noun} ${r0.is}, but only \(${pB}\%\) of the ${r0.noun} ${col.pred}.`,
    wrong: [
      { value: R`Yes. \(${pA}\%\) of the ${col.noun} ${r0.is}, so \(${pA}\%\) of the ${r0.noun} ${col.pred}.`, why: `Those are different wholes. ${pA}% is a share of the column "${col.label}" (${CT[j]}). The second part is about a share of the row "${r0.label}" (${RT[0]}).` },
      { value: `Yes. More ${r0.noun} than ${r1.noun} ${col.pred} (${k} compared with ${t[1][j]}).`, why: `"Most ${r0.noun}" means more than half of the row "${r0.label}": compare ${k} with the row total, ${RT[0]}.` },
      { value: `Yes. Both parts are about the same ${k} ${c.who}, so the two percents must be equal.`, why: `The ${k} are the same ${c.who}, but the wholes are different: ${CT[j]} in the column "${col.label}" and ${RT[0]} in the row "${r0.label}".` },
    ],
    solution: [
      R`First part, a share of the column "${col.label}": \(${divTex(k, CT[j])}\). That is true: most of them ${r0.is}.`,
      R`Second part, a share of the row "${r0.label}": \(${divTex(k, RT[0])}\). That is less than half.`,
      `The two conditional relative frequencies have the same top number but different wholes, so one can be large while the other is small. The claim does not follow.`,
    ],
    rule: 2,
    skill: 'row versus column conditionals',
    check: () => {
      const g = readGrid(visual);
      return g[0][j] / g[2][j] > 0.5 && g[0][j] / g[0][C0] < 0.5 ? true : 'the claim is not clearly false';
    },
  });
}

// ───────────── Interactive models ─────────────

const JOB = {
  intro: 'Students in Grade 9 and Grade 12 were asked whether they have a part-time job.', who: 'students', rowHead: 'Grade', colHead: 'Job',
  rows: [{ label: 'Grade 9', noun: 'Grade 9 students' }, { label: 'Grade 12', noun: 'Grade 12 students' }],
  cols: [{ label: 'Has a job', noun: 'students with a job' }, { label: 'No job', noun: 'students without a job' }],
};

function associationModel({ a, b, c: cc, d }) {
  const t = [[a, b], [cc, d]];
  const { RT, CT, N } = totals(t);
  if (RT[0] === 0 || RT[1] === 0) return { error: 'Each grade needs at least one student. Make the two numbers in each row add to more than 0.' };
  if (CT[0] === 0 || CT[1] === 0) return { error: 'Each column needs at least one student: someone must have a job, and someone must not.' };
  const [p1, p2] = [pc(a, RT[0]), pc(cc, RT[1])];
  const gap = Math.abs(p1 - p2);
  const verdict = gap < 5 ? 'The row percents are about the same, so there is little or no association.' : gap < 15 ? 'The row percents differ somewhat: there may be a weak association.' : 'The row percents are clearly different, so the variables appear to be associated.';
  const rowPct = { type: 'table', headers: [corner(JOB), 'Has a job', 'No job', 'Total'], rowHeaders: true, caption: 'Relative frequencies by rows', rows: [['Grade 9', `${p1}%`, `${100 - p1}%`, '100%'], ['Grade 12', `${p2}%`, `${100 - p2}%`, '100%']], alt: `Row percents. Grade 9: ${p1}% have a job, ${100 - p1}% do not. Grade 12: ${p2}% have a job, ${100 - p2}% do not.` };
  return {
    problem: `${JOB.intro} ${a} Grade 9 students have a job and ${b} do not; ${cc} Grade 12 students have a job and ${d} do not. Is there an association between grade and having a job?`,
    steps: [
      `Totals: Grade 9 has ${RT[0]} students, Grade 12 has ${RT[1]}, and ${N} were surveyed in all.`,
      R`Joint relative frequency (of all): \(\frac{${a}}{${N}} ${eq(a, N)} ${pc(a, N)}\%\) of all the students are in Grade 9 and have a job.`,
      R`Marginal relative frequency (of all): \(\frac{${CT[0]}}{${N}} ${eq(CT[0], N)} ${pc(CT[0], N)}\%\) of all the students have a job.`,
      R`Conditional, of each row: Grade 9 \(\frac{${a}}{${RT[0]}} ${eq(a, RT[0])} ${p1}\%\) have a job; Grade 12 \(\frac{${cc}}{${RT[1]}} ${eq(cc, RT[1])} ${p2}\%\).`,
      `The difference is ${points(p1, p2)}. ${verdict} (There is no fixed cut-off; this is a rough guide.)`,
      'Even a clear association would not show that being in one grade causes having a job. A survey shows how variables go together, not why.',
    ],
    answer: gap < 5 ? `Little or no association (${p1}% compared with ${p2}%)` : gap < 15 ? `Possibly a weak association (${p1}% compared with ${p2}%)` : `An association (${p1}% compared with ${p2}%)`,
    visual: [countTable(JOB, t), rowPct],
    note: 'Percents are rounded to the nearest whole percent.',
  };
}

const HOMES = CTX[6];

function completeModel({ N, R1, C1, a }) {
  const [b, cc] = [R1 - a, C1 - a];
  const d = N - R1 - cc;
  if (R1 > N || C1 > N) return { error: 'A row or column total cannot be bigger than the grand total.' };
  if (a > R1 || a > C1) return { error: `The ${a} households in apartments with a pet are part of both totals, so it cannot be bigger than either of them.` };
  if (d < 0) return { error: `These numbers do not fit: the last cell would be ${d}, and a count cannot be negative. Try a larger grand total.` };
  const t = [[a, b], [cc, d]];
  const rowPart = R1 === 0 ? 'There are no households in apartments, so that row percent cannot be found.' : R`Of the households in apartments, \(\frac{${a}}{${R1}} ${eq(a, R1)} ${pc(a, R1)}\%\) have a pet (a share of the row).`;
  const colPart = C1 === 0 ? 'No household has a pet, so that column percent cannot be found.' : R`Of the households with a pet, \(\frac{${a}}{${C1}} ${eq(a, C1)} ${pc(a, C1)}\%\) live in an apartment (a share of the column).`;
  return {
    problem: `${N} households were surveyed. ${R1} live in an apartment and ${C1} have a pet. ${a} live in an apartment and have a pet. Complete the table.`,
    steps: [
      R`Apartment, no pet: \(${R1} - ${a} = ${b}\) (the row "Apartment").`,
      R`House, pet: \(${C1} - ${a} = ${cc}\) (the column "Pet").`,
      R`Households in houses: \(${N} - ${R1} = ${N - R1}\). House, no pet: \(${N - R1} - ${cc} = ${d}\).`,
      R`Check with the column "No pet": \(${b} + ${d} = ${b + d} = ${N} - ${C1}\). ✓`,
      rowPart,
      colPart,
    ],
    answer: `Apartment: ${a} pet, ${b} no pet. House: ${cc} pet, ${d} no pet.`,
    visual: countTable(HOMES, t),
  };
}

// ───────────── The topic ─────────────

const LUNCH = { ...CTX[0], rows: CTX[0].rows.slice(0, 2) };

export default {
  id: 'two-way-tables',
  title: 'Two-Way Tables & Relative Frequency',
  summary: 'Summarise two categorical variables in a table, find joint, marginal and conditional relative frequencies, and judge association.',
  standards: ['CCSS S-ID.B.5', 'CCSS S-ID.A.3', 'CCSS S-ID.C.9'],

  explain: {
    intro: 'A two-way table counts data that are sorted by two categorical variables at once, such as grade and type of lunch. Dividing a count by a total turns it into a relative frequency, and the total you divide by decides what the number means: a share of everyone, of one row, or of one column. Comparing those shares is how you tell whether the two variables are associated.',
    rules: [
      {
        title: 'Build and complete the table',
        text: 'Put one variable down the side and the other across the top; name both in the corner cell. Count each pair of answers into its cell. Each row adds up to its row total, each column to its column total, and both sets of totals add up to the grand total. So any row or column with one blank gives that blank by subtraction.',
        example: R`If the row "Grade 9" has total 40 and one cell is 24, the other cell is \(40 - 24 = 16\).`,
      },
      {
        title: 'Joint and marginal relative frequencies: "of all"',
        text: 'Divide by the grand total. One cell over the grand total is a joint relative frequency; a row or column total over the grand total is a marginal relative frequency. The answer can be written as a fraction, a decimal or a percent.',
        example: R`With 35 of 90 students in Grade 10 with a packed lunch: \(\frac{35}{90} \approx 0.389 \approx 39\%\) of all the students.`,
      },
      {
        title: 'Conditional relative frequencies: "of the row" or "of the column"',
        text: 'Divide a cell by its row total or its column total. The words after "of the …" tell you which: they name the group that is the whole.',
        example: R`"Of the 50 Grade 10 students, 35 bring a packed lunch": \(\frac{35}{50} = 70\%\) of the row. "Of the 51 students with a packed lunch, 35 are in Grade 10": \(\frac{35}{51} \approx 69\%\) of the column.`,
      },
      {
        title: 'Relative-frequency tables by rows, by columns or of all',
        text: 'Turn every count into a percent using the same kind of whole. In a table made by rows each row adds to 100%; by columns, each column adds to 100%; of the grand total, all the cells together add to 100%. Look for the 100% to see how a table was made.',
        example: 'By rows: Grade 9 60% school lunch, 40% packed lunch (100%); Grade 10 30% and 70% (100%).',
      },
      {
        title: 'Association, but not cause',
        text: 'To see whether two variables are associated, compare conditional relative frequencies across the groups, not counts, because the groups can have different sizes. Very different percents suggest an association; about the same percents suggest none. A survey can show that two variables go together, but not that one causes the other: something else may affect both, or the cause may run the other way. Only an experiment can test cause.',
        example: '60% of Grade 9 students buy school lunch, compared with 30% of Grade 10 students: an association between grade and lunch.',
      },
      {
        title: 'Comparing groups when one has an outlier',
        text: 'An outlier pulls the mean toward it and makes the standard deviation larger, but it hardly moves the median or the interquartile range. When either group has an outlier, compare the medians and the IQRs, using the same measures for both groups.',
        example: 'Class A: median 36 minutes. Class B: median 31 minutes, but one value of 68 lifts its mean above Class A’s. Class A typically does more homework.',
      },
    ],
    vocab: [
      { term: 'categorical variable', def: 'A variable whose values are categories, such as grade or yes / no, not measurements.' },
      { term: 'two-way frequency table', def: 'A table of counts for every pair of categories of two variables, with row and column totals.' },
      { term: 'joint relative frequency', def: 'One cell divided by the grand total.' },
      { term: 'marginal relative frequency', def: 'A row or column total divided by the grand total.' },
      { term: 'conditional relative frequency', def: 'One cell divided by its row total or its column total.' },
      { term: 'association', def: 'A link between two variables: knowing one changes what you expect for the other.' },
    ],
    mistakes: [
      'Dividing by the wrong total. Read the words after "of the …": they name the whole.',
      'Comparing counts between groups of different sizes. Compare percents of each group.',
      'Reading "of the column" percents as if they were "of the row" percents. 70% of the people who oppose a plan may live north, while only 35% of the people who live north oppose it.',
      'Treating an association in a survey as proof of cause.',
      'Comparing means when one group has an outlier. Use medians and IQRs.',
    ],
    visual: [
      countTable(LUNCH, [[24, 16], [15, 35]]),
      { type: 'table', headers: [corner(LUNCH), 'School lunch', 'Packed lunch', 'Total'], rowHeaders: true, caption: 'Relative frequencies by rows', rows: [['Grade 9', '60%', '40%', '100%'], ['Grade 10', '30%', '70%', '100%']], alt: 'The same data by rows. Grade 9: 60% school lunch, 40% packed lunch, total 100%. Grade 10: 30% school lunch, 70% packed lunch, total 100%.' },
    ],
  },

  examples: [
    {
      title: 'Joint, marginal and conditional from one table',
      problem: 'Use the table of 90 students. Find the percent of all students who are in Grade 10 and bring a packed lunch, the percent of all students who bring a packed lunch, the percent of Grade 10 students who bring a packed lunch, and the percent of packed-lunch students who are in Grade 10. Round to the nearest whole percent.',
      steps: [
        R`Joint, of all: \(\frac{35}{90} \approx 0.389 \approx 39\%\).`,
        R`Marginal, of all: the column "Packed lunch" totals 51, so \(\frac{51}{90} \approx 0.567 \approx 57\%\).`,
        R`Conditional, of the row "Grade 10": \(\frac{35}{50} = 0.7 = 70\%\).`,
        R`Conditional, of the column "Packed lunch": \(\frac{35}{51} \approx 0.686 \approx 69\%\).`,
      ],
      answer: R`\(39\%\), \(57\%\), \(70\%\) and \(69\%\)`,
      visual: countTable(LUNCH, [[24, 16], [15, 35]]),
    },
    {
      title: 'Word problem: complete the table, then a row percent',
      word: true,
      problem: '160 gym members were surveyed. 70 have a monthly plan, and 45 of those usually visit in the morning. Of the annual members, 50 usually visit in the evening. What percent of the annual members usually visit in the morning?',
      steps: [
        R`Monthly, evenings: \(70 - 45 = 25\).`,
        R`Annual members: \(160 - 70 = 90\). Annual, mornings: \(90 - 50 = 40\).`,
        R`Of the row "Annual": \(\frac{40}{90} \approx 0.444 \approx 44\%\).`,
      ],
      answer: R`About \(44\%\)`,
      visual: countTable(CTX[4], [[45, 25], [40, 50]]),
    },
    {
      title: 'Word problem: association is not causation',
      word: true,
      problem: 'A survey of 200 adults found that 33 of the 60 coffee drinkers and 35 of the 140 others sleep under 7 hours. Is there an association? Does coffee cause short sleep?',
      steps: [
        R`The groups are different sizes, so compare row percents: \(\frac{33}{60} = 55\%\) and \(\frac{35}{140} = 25\%\).`,
        'More of the non-drinkers sleep under 7 hours (35 compared with 33), but that is only because there are more of them. The percents show a clear association.',
        'The survey cannot show cause. People who sleep less may drink coffee to stay awake, so the cause could run the other way.',
      ],
      answer: 'There is an association (55% compared with 25%), but the survey does not show that coffee causes short sleep.',
      visual: countTable(CAUSE[1], [[33, 27], [35, 105]]),
    },
    {
      title: 'Word problem: comparing two groups with an outlier',
      word: true,
      problem: 'Minutes of homework last night. Class A: 31, 32, 34, 36, 37, 38, 39. Class B: 28, 29, 30, 31, 32, 33, 68. Which class typically did more homework?',
      steps: [
        R`Class B has an outlier: 68 is far above the rest of its values. Its mean, \(251 \div 7 \approx 35.9\), is above Class A’s mean, \(247 \div 7 \approx 35.3\), only because of that one value.`,
        'Use the medians, which the outlier hardly moves: 36 minutes for Class A and 31 minutes for Class B.',
        'For spread, use the IQRs: 38 − 32 = 6 for Class A and 33 − 29 = 4 for Class B.',
      ],
      answer: 'Class A typically did more homework (median 36 minutes compared with 31).',
      visual: [dots([31, 32, 34, 36, 37, 38, 39], 'Class A: minutes of homework', 28, 68), dots([28, 29, 30, 31, 32, 33, 68], 'Class B: minutes of homework', 28, 68)],
    },
  ],

  models: [
    {
      id: 'association-2x2',
      title: 'Word problem: is grade associated with having a job?',
      word: true,
      intro: 'Type the four counts. The steps find a joint, a marginal and the conditional relative frequencies, and compare the rows.',
      inputs: [
        { name: 'a', label: 'Grade 9 with a job', type: 'int', min: 0, max: 300, value: 12 },
        { name: 'b', label: 'Grade 9 without a job', type: 'int', min: 0, max: 300, value: 48 },
        { name: 'c', label: 'Grade 12 with a job', type: 'int', min: 0, max: 300, value: 45 },
        { name: 'd', label: 'Grade 12 without a job', type: 'int', min: 0, max: 300, value: 30 },
      ],
      compute: associationModel,
    },
    {
      id: 'complete-table',
      title: 'Word problem: complete a table from its totals',
      word: true,
      intro: 'Type the grand total, two totals and one cell. The steps fill in the rest of the table.',
      inputs: [
        { name: 'N', label: 'Households surveyed', type: 'int', min: 1, max: 500, value: 120 },
        { name: 'R1', label: 'Live in an apartment', type: 'int', min: 0, max: 500, value: 50 },
        { name: 'C1', label: 'Have a pet', type: 'int', min: 0, max: 500, value: 66 },
        { name: 'a', label: 'Apartment and a pet', type: 'int', min: 0, max: 500, value: 18 },
      ],
      compute: completeModel,
    },
  ],

  quiz: {
    easy: [easyTally, easyJointMarginal, easyKind],
    medium: [mediumConditional, mediumStory, mediumRelTable, mediumWhichMeasures],
    hard: [hardAssociation, hardJointToConditional, hardCompleteThenPercent, hardOutlierCompare],
    challenge: [challengeCausation, challengeWorkBack, challengeNoAssociation, challengeDirection],
  },
};
