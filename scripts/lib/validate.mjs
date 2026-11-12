// Content validation shared by `npm run validate` and the test suite.
// It exercises every topic the way the app will: every generator hundreds of times, every
// interactive model with random inputs, every string through the real math renderer.

import katex from 'katex';
import { makeRng, hashString } from '../../public/js/core/rng.js';
import { renderVisual, vnodeToString } from '../../public/js/core/visuals.js';
import { TIERS } from '../../public/js/core/engine.js';
import { normalizeChoice, choiceValue } from '../../public/js/content/lib/question.js';

const MATH = /\\\((.+?)\\\)|\\\[(.+?)\\\]/gs;
const texCache = new Map();

function texError(tex, display) {
  const key = (display ? 'D' : 'I') + tex;
  if (!texCache.has(key)) {
    let msg = null;
    try {
      katex.renderToString(tex, { throwOnError: true, displayMode: display, strict: 'ignore' });
    } catch (e) {
      msg = e.message.replace(/^KaTeX parse error: /, '');
    }
    texCache.set(key, msg);
  }
  return texCache.get(key);
}

const count = (text, re) => (text.match(re) ?? []).length;

/** Check one rich-text string. Pushes problems into errors/warnings (each prefixed with `where`). */
export function checkRich(text, where, errors, warnings) {
  if (typeof text !== 'string' || !text.trim()) {
    errors.push(`${where}: missing text`);
    return;
  }
  const bad = text.match(/undefined|NaN|\[object Object\]|Infinity|\bnull\b/);
  if (bad) errors.push(`${where}: contains "${bad[0]}" → ${text.slice(0, 160)}`);
  if (count(text, /\\\(/g) !== count(text, /\\\)/g) || count(text, /\\\[/g) !== count(text, /\\\]/g)) {
    errors.push(`${where}: unbalanced math delimiters → ${text.slice(0, 160)}`);
    return;
  }
  for (const m of text.matchAll(MATH)) {
    const tex = m[1] ?? m[2];
    const err = texError(tex, m[2] != null);
    if (err) errors.push(`${where}: math will not render (${err}) → ${tex}`);
    if (/\d\.\d{7,}/.test(tex)) errors.push(`${where}: unrounded decimal → ${tex}`);
    if (/\+\s*-|-\s*-|\+\s*\+|-\s*\+/.test(tex.replace(/\^\{?-/g, '^').replace(/\(\s*-/g, '(').replace(/[=,<>{]\s*-/g, '=').replace(/\\(?:to|rightarrow|le|ge|leq|geq|approx|ne|neq|cdot|times|div|pm)\s*-/g, '=').replace(/\d\s*-\s*-/g, 'X'))) {
      warnings.push(`${where}: doubled sign (use terms()/signed()/paren()) → ${tex}`);
    }
    if (/(^|[^\d.}\w])[01][a-zA-Z]\b(?!\w)/.test(tex.replace(/\\[a-zA-Z]+/g, ' ')) && !/\\text|\\log|\\ln/.test(tex)) {
      warnings.push(`${where}: coefficient 0 or 1 written out (use terms()) → ${tex}`);
    }
  }
  const outside = text.replace(MATH, ' M ');
  if (/[^.]\.\.(?!\.)/.test(outside)) warnings.push(`${where}: doubled full stop → ${text.slice(0, 160)}`);
  if (/\s[,.;:!?]/.test(outside.replace(/ M /g, 'M'))) warnings.push(`${where}: space before punctuation → ${text.slice(0, 160)}`);
  const cmd = outside.match(/\\[a-zA-Z]+/);
  if (cmd) errors.push(`${where}: LaTeX command outside \\( \\) → ${cmd[0]} in: ${text.slice(0, 160)}`);
  if (/\d\.\d{7,}/.test(outside)) errors.push(`${where}: unrounded decimal → ${text.slice(0, 160)}`);
  if (/\*\*\s*\*\*|\*\*[^*]*$/.test(outside.replace(/\*\*[^*]+\*\*/g, ''))) warnings.push(`${where}: unbalanced ** bold marker → ${text.slice(0, 120)}`);
}

function checkVisual(spec, where, errors) {
  for (const v of [].concat(spec ?? [])) {
    try {
      const r = renderVisual(v);
      if (r.kind === 'svg') {
        const s = vnodeToString(r.vnode);
        if (/NaN|undefined|Infinity/.test(s)) errors.push(`${where}: visual "${v.type}" produced a bad value`);
      } else if (r.kind === 'table') {
        const sink = [];
        for (const cell of [...(r.headers ?? []), ...r.rows.flat()]) checkRich(cell, `${where} table cell`, errors, sink);
      }
      if (typeof r.alt !== 'string' || !r.alt.trim()) errors.push(`${where}: visual "${v.type}" has no alt text`);
      if (v.type === 'plot' && !v.alt) errors.push(`${where}: plot needs an "alt" sentence describing the graph`);
    } catch (e) {
      errors.push(`${where}: visual failed (${e.message})`);
    }
  }
}

function checkQuestion(question, ctx, errors, warnings) {
  const { where, ruleCount } = ctx;
  if (!question || typeof question !== 'object') {
    errors.push(`${where}: generator did not return a question`);
    return null;
  }
  checkRich(question.prompt, `${where} prompt`, errors, warnings);
  if (!Array.isArray(question.choices) || question.choices.length !== 4) {
    errors.push(`${where}: needs exactly 4 choices`);
    return null;
  }
  question.choices.forEach((c, i) => {
    checkRich(c, `${where} choice ${i + 1}`, errors, warnings);
    if (typeof c !== 'string') return;
    if (/\\d?frac\{-[^{}+-]*\}/.test(c)) warnings.push(`${where} choice: minus sign inside a fraction; write it in front → ${c}`);
    if (/[a-zA-Z})]\s*[+-]\s*\d+(?:\.\d+)?\s*[+-]\s*\d+(?:\.\d+)?\s*(?:\)|\\\)|$)/.test(c)) warnings.push(`${where} choice: constants not combined → ${c}`);
  });
  const norm = question.choices.map((c) => normalizeChoice(String(c)));
  if (new Set(norm).size !== 4) errors.push(`${where}: duplicate choices → ${question.choices.join(' | ')}`);
  const values = question.choices.map((c) => (typeof c === 'string' ? choiceValue(c) : null));
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const a = values[i];
      const b = values[j];
      if (a && b && a.unit === b.unit && Math.abs(a.v - b.v) < 1e-9) errors.push(`${where}: two choices have the same value → ${question.choices[i]} and ${question.choices[j]}`);
    }
  }
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) errors.push(`${where}: bad answer index`);
  if (!Array.isArray(question.solution) || question.solution.length < 1) errors.push(`${where}: needs a worked solution`);
  else question.solution.forEach((s, i) => checkRich(s, `${where} solution step ${i + 1}`, errors, warnings));
  if (question.rule != null && (!Number.isInteger(question.rule) || question.rule < 0 || question.rule >= ruleCount)) {
    errors.push(`${where}: rule ${question.rule} does not exist (topic has ${ruleCount} rules)`);
  }
  if (question.skill != null && (typeof question.skill !== 'string' || !question.skill.trim() || question.skill.length > 40)) errors.push(`${where}: skill must be a short string`);
  for (const note of question.notes ?? []) if (note != null) checkRich(note, `${where} note`, errors, warnings);
  if (question.visual) checkVisual(question.visual, where, errors);
  if (typeof question.check === 'function') {
    let result;
    try {
      result = question.check();
    } catch (e) {
      result = `check threw: ${e.message}`;
    }
    if (result !== true) errors.push(`${where}: CHECK FAILED → ${result} | ${question.prompt} | answer ${question.choices[question.answer]}`);
  }
  if (typeof question.prompt === 'string' && question.prompt.length > 520) warnings.push(`${where}: long prompt (${question.prompt.length} characters)`);
  return question.key ?? question.prompt;
}

function randomInputs(inputs, rng, mode) {
  const out = {};
  for (const inp of inputs) {
    if (inp.type === 'select') {
      out[inp.name] = mode === 'default' ? inp.value : rng.pick(inp.options).value;
    } else if (mode === 'default') {
      out[inp.name] = inp.value;
    } else if (mode === 'min') {
      out[inp.name] = inp.min;
    } else if (mode === 'max') {
      out[inp.name] = inp.max;
    } else if (inp.type === 'int') {
      out[inp.name] = rng.int(Math.ceil(inp.min), Math.floor(inp.max));
    } else {
      const step = inp.step ?? 0.1;
      const steps = Math.floor((inp.max - inp.min) / step);
      out[inp.name] = Math.round((inp.min + rng.int(0, steps) * step) * 1e6) / 1e6;
    }
  }
  return out;
}

function checkModel(model, where, errors, warnings, fuzz) {
  if (!model || typeof model !== 'object') return errors.push(`${where}: not an object`);
  if (typeof model.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(model.id)) errors.push(`${where}: id must be kebab-case`);
  checkRich(model.title, `${where} title`, errors, warnings);
  if (model.intro != null) checkRich(model.intro, `${where} intro`, errors, warnings);
  if (!Array.isArray(model.inputs) || !model.inputs.length) return errors.push(`${where}: needs at least one input`);
  if (typeof model.compute !== 'function') return errors.push(`${where}: compute(values) is required`);
  const names = new Set();
  for (const inp of model.inputs) {
    const w = `${where} input "${inp?.name}"`;
    if (!inp || typeof inp.name !== 'string' || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(inp.name)) { errors.push(`${w}: bad name`); continue; }
    if (names.has(inp.name)) errors.push(`${w}: duplicate name`);
    names.add(inp.name);
    if (typeof inp.label !== 'string' || !inp.label.trim()) errors.push(`${w}: needs a label`);
    if (inp.type === 'select') {
      if (!Array.isArray(inp.options) || inp.options.length < 2 || inp.options.some((o) => o?.value == null || typeof o.label !== 'string')) errors.push(`${w}: select needs options [{ value, label }]`);
      else if (!inp.options.some((o) => o.value === inp.value)) errors.push(`${w}: default value is not one of the options`);
    } else if (inp.type === 'int' || inp.type === 'number') {
      if (![inp.min, inp.max, inp.value].every(Number.isFinite)) errors.push(`${w}: needs finite min, max and value`);
      else if (inp.value < inp.min || inp.value > inp.max) errors.push(`${w}: default value is outside min–max`);
      else if (inp.type === 'int' && ![inp.min, inp.max, inp.value].every(Number.isInteger)) errors.push(`${w}: int inputs need whole-number min, max and value`);
    } else {
      errors.push(`${w}: type must be "int", "number" or "select"`);
    }
  }
  if (errors.some((e) => e.startsWith(where))) return;

  const run = (values, label, mustSucceed) => {
    let r;
    try {
      r = model.compute(values);
    } catch (e) {
      errors.push(`${where}: compute threw for ${label} ${JSON.stringify(values)} (${e.message})`);
      return;
    }
    if (!r || typeof r !== 'object') return errors.push(`${where}: compute returned nothing for ${label} ${JSON.stringify(values)}`);
    if (r.error != null) {
      if (typeof r.error !== 'string' || !r.error.trim()) errors.push(`${where}: error must be a friendly sentence`);
      else if (mustSucceed) errors.push(`${where}: the default inputs must work, but gave: ${r.error}`);
      else checkRich(r.error, `${where} error text`, errors, warnings);
      return;
    }
    const at = `${where} ${JSON.stringify(values)}`;
    if (r.problem != null) checkRich(r.problem, `${at} problem`, errors, warnings);
    if (!Array.isArray(r.steps) || !r.steps.length) errors.push(`${at}: needs steps`);
    else r.steps.forEach((s, i) => checkRich(s, `${at} step ${i + 1}`, errors, warnings));
    checkRich(r.answer, `${at} answer`, errors, warnings);
    if (r.note != null) checkRich(r.note, `${at} note`, errors, warnings);
    if (r.visual) checkVisual(r.visual, at, errors);
  };

  const rng = makeRng(parseInt(hashString(where).slice(0, 6), 36));
  run(randomInputs(model.inputs, rng, 'default'), 'defaults', true);
  run(randomInputs(model.inputs, rng, 'min'), 'all minimums', false);
  run(randomInputs(model.inputs, rng, 'max'), 'all maximums', false);
  for (let i = 0; i < fuzz; i++) run(randomInputs(model.inputs, rng, 'random'), 'random inputs', false);
}

/**
 * Validate one topic. Returns { errors, warnings, stats } — errors must be fixed; warnings deserve a look.
 * options: seeds (runs per generator, default 150), fuzz (random model inputs, default 80).
 */
export function validateTopic(topic, levelId, { seeds = 150, fuzz = 80 } = {}) {
  const errors = [];
  const warnings = [];
  const stats = { generators: 0, questions: 0, distinct: {} };
  const id = topic?.id ?? '(no id)';
  const at = `${levelId}/${id}`;

  if (!topic || typeof topic !== 'object') return { errors: [`${at}: topic is not an object`], warnings, stats };
  if (typeof topic.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(topic.id)) errors.push(`${at}: id must be kebab-case`);
  if (typeof topic.title !== 'string' || !topic.title.trim() || topic.title.length > 64) errors.push(`${at}: title is required (64 characters at most)`);
  if (typeof topic.summary !== 'string' || !topic.summary.trim() || topic.summary.length > 140) errors.push(`${at}: summary is required (140 characters at most)`);
  if (!Array.isArray(topic.standards) || !topic.standards.length || topic.standards.some((s) => typeof s !== 'string' || !s.trim())) errors.push(`${at}: standards must list at least one code`);
  if (topic.grade != null && typeof topic.grade !== 'string') errors.push(`${at}: grade must be a string`);

  // 1. Explanation
  const ex = topic.explain;
  if (!ex || typeof ex !== 'object') errors.push(`${at}: explain is required`);
  else {
    checkRich(ex.intro, `${at} explain.intro`, errors, warnings);
    if (!Array.isArray(ex.rules) || ex.rules.length < 2) errors.push(`${at}: explain.rules needs at least 2 rules`);
    else {
      ex.rules.forEach((r, i) => {
        checkRich(r?.title, `${at} rule ${i} title`, errors, warnings);
        checkRich(r?.text, `${at} rule ${i} text`, errors, warnings);
        if (r?.example != null) checkRich(r.example, `${at} rule ${i} example`, errors, warnings);
      });
    }
    for (const v of ex.vocab ?? []) {
      checkRich(v?.term, `${at} vocab term`, errors, warnings);
      checkRich(v?.def, `${at} vocab "${v?.term}"`, errors, warnings);
    }
    (ex.mistakes ?? []).forEach((mk, i) => checkRich(mk, `${at} mistake ${i}`, errors, warnings));
    if (ex.visual) checkVisual(ex.visual, `${at} explain.visual`, errors);
  }
  const ruleCount = ex?.rules?.length ?? 0;

  // 2. Worked examples
  if (!Array.isArray(topic.examples) || topic.examples.length < 2) errors.push(`${at}: needs at least 2 worked examples`);
  else {
    if (!topic.examples.some((e) => e?.word === true)) errors.push(`${at}: at least one worked example must be a word problem (word: true)`);
    topic.examples.forEach((e, i) => {
      const w = `${at} example ${i}`;
      checkRich(e?.title, `${w} title`, errors, warnings);
      checkRich(e?.problem, `${w} problem`, errors, warnings);
      if (!Array.isArray(e?.steps) || e.steps.length < 2) errors.push(`${w}: needs at least 2 steps`);
      else e.steps.forEach((s, j) => checkRich(s, `${w} step ${j + 1}`, errors, warnings));
      checkRich(e?.answer, `${w} answer`, errors, warnings);
      if (e?.visual) checkVisual(e.visual, w, errors);
    });
  }

  // 3. Interactive models
  if (!Array.isArray(topic.models) || topic.models.length < 1) errors.push(`${at}: needs at least 1 interactive model`);
  else {
    const ids = new Set();
    topic.models.forEach((m, i) => {
      if (ids.has(m?.id)) errors.push(`${at}: duplicate model id "${m?.id}"`);
      ids.add(m?.id);
      checkModel(m, `${at} model ${i} (${m?.id})`, errors, warnings, fuzz);
    });
    if (!topic.models.some((m) => m?.word === true)) warnings.push(`${at}: no interactive word-problem model (word: true) — add one if the topic has natural word problems`);
  }

  // 4. Quiz generators
  if (!topic.quiz || typeof topic.quiz !== 'object') errors.push(`${at}: quiz is required`);
  else {
    for (const tier of TIERS) {
      const gens = topic.quiz[tier.id];
      if (!Array.isArray(gens) || gens.length < 2) {
        errors.push(`${at}: ${tier.id} tier needs at least 2 question generators`);
        continue;
      }
      const tierKeys = new Set();
      gens.forEach((gen, gi) => {
        const name = gen?.name || `#${gi}`;
        const w = `${at} ${tier.id} ${name}`;
        stats.generators += 1;
        if (typeof gen !== 'function') return errors.push(`${w}: generator must be a function`);
        const before = errors.length;
        const genKeys = new Set();
        for (let s = 1; s <= seeds; s++) {
          const rng = makeRng(parseInt(hashString(`${w}:${s}`).slice(0, 6), 36));
          let question;
          try {
            question = gen(rng);
          } catch (e) {
            errors.push(`${w}: threw with seed ${s} (${e.message})`);
            if (errors.length - before > 3) break;
            continue;
          }
          stats.questions += 1;
          const key = checkQuestion(question, { where: w, ruleCount }, errors, warnings);
          if (key != null) {
            genKeys.add(key);
            tierKeys.add(key);
          }
          if (errors.length - before > 6) {
            errors.push(`${w}: more problems hidden`);
            break;
          }
        }
        if (genKeys.size < Math.min(6, seeds)) warnings.push(`${w}: only ${genKeys.size} different questions — widen its number ranges if you can`);
      });
      stats.distinct[tier.id] = tierKeys.size;
      if (seeds >= 100 && tierKeys.size < 30) errors.push(`${at}: ${tier.id} tier produced only ${tierKeys.size} different questions; at least 30 are needed so a quiz does not repeat`);
      else if (seeds >= 100 && tierKeys.size < 80) warnings.push(`${at}: ${tier.id} tier has ${tierKeys.size} different questions (aim for 80+)`);
    }
  }

  const dedupe = (list) => [...new Set(list)];
  return { errors: dedupe(errors), warnings: dedupe(warnings), stats };
}
