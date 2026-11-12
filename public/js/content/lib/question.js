// q(): builds one multiple-choice question in the shape the quiz engine expects.

import { Frac } from './frac.js';
import { num } from './text.js';
import { decimalPlaces, round } from './numbers.js';

/** Normalise a choice so that two spellings of the same text count as duplicates. */
export function normalizeChoice(s) {
  return String(s)
    .replace(/\\[dt]frac/g, '\\frac')
    .replace(/\\left|\\right/g, '')
    .replace(/\\[,;:! ]/g, '')
    .replace(/\s+/g, '');
}

/**
 * The numeric value of a simple choice such as "\(3\)", "\(\frac{1}{2}\) cup", "\(2\frac{1}{3}\)" or
 * "\(25\%\)", as { v, unit } — or null when the choice is not a plain number. Used to stop two
 * choices that look different but are equal (2/6 and 1/3) from appearing together.
 */
export function choiceValue(choice) {
  const m = String(choice).match(/^\\\((.*)\\\)\s*(.*)$/s);
  if (!m) return null;
  const tex = m[1].replace(/\{,\}/g, '').replace(/\s+/g, '').replace(/\\[dt]frac/g, '\\frac');
  const unit = m[2].trim().replace(/s$/, '');
  let v = null;
  let r;
  if ((r = tex.match(/^(-?)(\d+(?:\.\d+)?)$/))) v = (r[1] ? -1 : 1) * Number(r[2]);
  else if ((r = tex.match(/^(-?)\\frac\{(\d+)\}\{(\d+)\}$/))) v = ((r[1] ? -1 : 1) * Number(r[2])) / Number(r[3]);
  else if ((r = tex.match(/^(-?)(\d+)\\frac\{(\d+)\}\{(\d+)\}$/))) v = (r[1] ? -1 : 1) * (Number(r[2]) + Number(r[3]) / Number(r[4]));
  else if ((r = tex.match(/^(-?)(\d+(?:\.\d+)?)\\%$/))) v = (r[1] ? -1 : 1) * Number(r[2]);
  if (v == null || !Number.isFinite(v)) return null;
  return { v, unit: unit + (/\\%$/.test(tex) ? '%' : '') };
}

function formatValue(v, unit, fmt) {
  if (fmt) return fmt(v);
  if (typeof v === 'number' || v instanceof Frac) {
    const s = `\\(${num(v)}\\)`;
    return unit ? `${s} ${unit}` : s;
  }
  if (typeof v === 'string') return v;
  throw new TypeError(`q(): a choice must be a number, a Frac or a string, got ${typeof v}`);
}

function* nearbyNumbers(c) {
  const places = decimalPlaces(c);
  const step = 10 ** -places;
  const offsets = [1, -1, 2, -2, 10, -10, 3, -3, 5, -5, 4, -4, 20, -20, 6, 7, 8, 9, 11, 12, 15, 25, 50, 100];
  for (const k of offsets) {
    const v = round(c + k * step, places);
    if (c >= 0 && v < 0) continue;
    yield v;
  }
}

function* nearbyFracs(f) {
  const tries = [
    [f.n + 1, f.d], [f.n - 1, f.d], [f.n, f.d + 1], [f.d, f.n], [f.n + 2, f.d], [f.n, f.d + 2],
    [f.n + f.d, f.d], [f.n * 2, f.d], [f.n, f.d * 2], [f.n + 3, f.d], [f.n, f.d + 3], [f.n + 1, f.d + 1],
  ];
  for (const [n, d] of tries) {
    if (d === 0) continue;
    const g = new Frac(n, d);
    if (f.n >= 0 && g.n < 0) continue;
    yield g;
  }
}

/**
 * Build a multiple-choice question.
 *
 * @param {object} spec
 * @param {string} spec.prompt     Rich text of the question.
 * @param {number|Frac|string} spec.correct   The right answer.
 * @param {Array<number|Frac|string|{value:number|Frac|string, why:string}>} spec.wrong   Wrong answers, most
 *        instructive first (the mistakes a student is likely to make). The first three that are distinct
 *        from each other and from the correct answer are used. Numeric answers are topped up automatically
 *        if fewer than three remain. Write a wrong answer as { value, why } to explain the slip behind it
 *        ("That adds the denominators too."); the note is shown if the student picks that answer.
 * @param {string[]} spec.solution Worked solution for THIS question, one step per string; the last step states the answer.
 * @param {number} [spec.rule]     Index into the topic's explain.rules to re-show after a wrong answer.
 * @param {string} [spec.skill]    Short tag for the sub-skill ("regrouping"), used to report weak areas.
 * @param {string} [spec.unit]     Text appended to numeric choices ("cm", "apples").
 * @param {(v:any)=>string} [spec.fmt]  Custom formatter for numeric/Frac choices.
 * @param {object|object[]} [spec.visual]  Visual spec(s) shown with the question.
 * @param {string} [spec.key]      Identity used to avoid repeats (defaults to prompt + answer + visual).
 * @param {()=>true|string} [spec.check]  Independent numeric check, run by the content validator only.
 */
export function q(spec) {
  const { prompt, correct, wrong = [], solution = [], rule, skill, unit, fmt, visual, key, check } = spec;
  if (typeof prompt !== 'string' || !prompt.trim()) throw new TypeError('q(): prompt is required');
  if (correct == null) throw new TypeError(`q(): correct answer missing for: ${prompt}`);

  const correctStr = formatValue(correct, unit, fmt);
  const seen = new Set([normalizeChoice(correctStr)]);
  const values = [choiceValue(correctStr)];
  const sameValue = (a) => a && values.some((b) => b && b.unit === a.unit && Math.abs(b.v - a.v) < 1e-9);
  const choices = [correctStr];
  const notes = [null];
  const add = (item) => {
    if (item == null || choices.length >= 4) return;
    const isNoted = typeof item === 'object' && !(item instanceof Frac) && 'value' in item;
    const v = isNoted ? item.value : item;
    if (v == null) return;
    if (typeof v === 'number' && !Number.isFinite(v)) return;
    const s = formatValue(v, unit, fmt);
    const k = normalizeChoice(s);
    if (seen.has(k)) return;
    const val = choiceValue(s);
    if (sameValue(val)) return; // looks different but is the same number as an earlier choice
    seen.add(k);
    values.push(val);
    choices.push(s);
    notes.push(isNoted && typeof item.why === 'string' && item.why ? item.why : null);
  };

  for (const w of wrong) add(w);
  if (choices.length < 4) {
    if (typeof correct === 'number') for (const v of nearbyNumbers(correct)) add(v);
    else if (correct instanceof Frac) for (const v of nearbyFracs(correct)) add(v);
  }
  if (choices.length < 4) {
    throw new Error(`q(): need 3 distinct wrong answers (got ${choices.length - 1}) for: ${prompt}`);
  }

  const visualKey = visual ? JSON.stringify(visual) : '';
  return {
    prompt,
    choices,
    notes: notes.some(Boolean) ? notes : undefined,
    answer: 0,
    solution,
    rule,
    skill,
    visual,
    check,
    key: key ?? `${normalizeChoice(prompt)}=>${normalizeChoice(correctStr)}${visualKey}`,
  };
}
