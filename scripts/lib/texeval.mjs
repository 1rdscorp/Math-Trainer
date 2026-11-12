// A small evaluator for the TeX that appears in answer choices. The content validator uses it to
// find a "wrong" choice that is equal in value to the right one: 2x + 3 offered against 3 + 2x,
// 4² offered against 2⁴, x = 3 or x = 2 against x = 2 or x = 3.
//
//   compileChoice(text)  → a compiled choice, or null when the text is not understood. The parser
//                          never guesses: an unknown command, an integral, a sentence all give null.
//   equivalent(a, b)     → true when two compiled choices have the same words and separators and
//                          their expressions agree at a dozen random points.
//
// Conventions: single letters are variables; e and π are constants; a whole number followed by a
// numeric fraction is a mixed number; f(…), g(…), h(…) and primed names are unknown functions;
// degrees and percent are converted (30° = π/6, 50% = 0.5); lists joined by commas are ordered,
// lists joined by "or" / "and" are compared as sets.

const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
  ln: Math.log, log: Math.log10, exp: Math.exp,
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
};
const INV = { sin: 'arcsin', cos: 'arccos', tan: 'arctan' };
const GREEK = ['theta', 'alpha', 'beta', 'gamma', 'phi', 'varphi', 'rho', 'lambda', 'mu', 'sigma', 'omega', 'Delta', 'delta', 'epsilon', 'tau'];
const RELS = { '=': '=', '<': '<', '>': '>', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', to: '→', in: '∈', cup: '∪', cap: '∩', pm: '±', mp: '∓', rightarrow: '→', Rightarrow: '⇒', mid: '|', colon: ':' };
const SKIP = new Set(['left', 'right', 'displaystyle', 'textstyle', ',', ';', ':', '!', ' ', 'quad', 'qquad', 'limits', 'big', 'Big', 'bigl', 'bigr', 'Bigl', 'Bigr', '$']);

function tokenize(src) {
  const t = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c) || c === '~') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      let s = '';
      while (j < n) {
        if (/[0-9.]/.test(src[j])) { s += src[j]; j++; } else if (src.startsWith('{,}', j) && /[0-9]/.test(src[j + 3] ?? '')) { j += 3; } else break;
      }
      if (s === '.' || (s.match(/\./g) ?? []).length > 1) return null;
      t.push({ k: 'num', v: Number(s) });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) { t.push({ k: 'var', v: c }); i++; continue; }
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(src.slice(i));
      const name = m[1];
      i += m[0].length;
      if (SKIP.has(name)) continue;
      if (name === 'text' || name === 'mathrm' || name === 'textbf' || name === 'operatorname' || name === 'mathbf' || name === 'mathit' || name === 'textit') {
        while (src[i] === ' ') i++;
        if (src[i] !== '{') return null;
        let d = 0;
        let j = i;
        for (; j < n; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) break; } }
        const body = src.slice(i + 1, j);
        i = j + 1;
        if (name === 'mathbf' && /^[a-zA-Z]$/.test(body)) t.push({ k: 'var', v: `bold_${body}` });
        else t.push({ k: 'text', v: body.replace(/\s+/g, ' ').trim() });
        continue;
      }
      if (name === 'dfrac' || name === 'tfrac' || name === 'frac') { t.push({ k: 'frac' }); continue; }
      if (name === 'sqrt') { t.push({ k: 'sqrt' }); continue; }
      if (name === 'binom') { t.push({ k: 'binom' }); continue; }
      if (name === 'cdot' || name === 'times') { t.push({ k: 'op', v: '*' }); continue; }
      if (name === 'div') { t.push({ k: 'op', v: '/' }); continue; }
      if (name === 'pi') { t.push({ k: 'num', v: Math.PI }); continue; }
      if (name === 'infty') { t.push({ k: 'num', v: Infinity }); continue; }
      if (name === 'circ') { t.push({ k: 'deg' }); continue; }
      if (name === '%') { t.push({ k: 'pct' }); continue; }
      if (name === 'langle') { t.push({ k: 'open', v: '⟨' }); continue; }
      if (name === 'rangle') { t.push({ k: 'close', v: '⟩' }); continue; }
      if (name === '{') { t.push({ k: 'open', v: '{' }); continue; }
      if (name === '}') { t.push({ k: 'close', v: '}' }); continue; }
      if (name === '|') { t.push({ k: 'text', v: '‖' }); continue; }
      if (name in FUNCS) { t.push({ k: 'fn', v: name }); continue; }
      if (GREEK.includes(name)) { t.push({ k: 'var', v: name }); continue; }
      if (name in RELS) { t.push({ k: 'rel', v: RELS[name] }); continue; }
      return null; // unknown command: do not guess
    }
    if (c === '{') { t.push({ k: '{' }); i++; continue; }
    if (c === '}') { t.push({ k: '}' }); i++; continue; }
    if (c === '(' || c === '[') { t.push({ k: 'open', v: c }); i++; continue; }
    if (c === ')' || c === ']') { t.push({ k: 'close', v: c }); i++; continue; }
    if (c === '+' || c === '-' || c === '−') { t.push({ k: 'op', v: c === '+' ? '+' : '-' }); i++; continue; }
    if (c === '*' || c === '/') { t.push({ k: 'op', v: c }); i++; continue; }
    if (c === '^') { t.push({ k: '^' }); i++; continue; }
    if (c === '_') { t.push({ k: '_' }); i++; continue; }
    if (c === '|') { t.push({ k: 'bar' }); i++; continue; }
    if (c === '!') { t.push({ k: 'fact' }); i++; continue; }
    if (c === "'") { t.push({ k: 'prime' }); i++; continue; }
    if (c === '=' || c === '<' || c === '>') { t.push({ k: 'rel', v: c }); i++; continue; }
    if (c === ',' || c === ';' || c === ':') { t.push({ k: 'sep', v: c }); i++; continue; }
    if (c === '%') { t.push({ k: 'pct' }); i++; continue; }
    if (c === '°') { t.push({ k: 'deg' }); i++; continue; }
    if (c === '$') { continue; }
    return null;
  }
  return t;
}

class Fail extends Error {}

function parser(tokens) {
  let p = 0;
  const peek = () => tokens[p];
  const next = () => tokens[p++];
  const vars = new Set();
  const isClose = (tk) => !tk || tk.k === 'close' || tk.k === '}' || tk.k === 'sep' || tk.k === 'rel' || tk.k === 'text';

  function group() {
    // {expr} or a single token
    const tk = peek();
    if (!tk) throw new Fail('eof');
    if (tk.k === '{') {
      next();
      if (peek()?.k === '}') { next(); return () => 1; }
      const e = expr();
      if (next()?.k !== '}') throw new Fail('}');
      return e;
    }
    if (tk.k === 'num') { next(); return () => tk.v; }
    if (tk.k === 'var') { next(); return variable(tk.v); }
    throw new Fail('group');
  }
  function variable(name) {
    if (name === 'e') return () => Math.E;
    // subscript and primes become part of the name
    let full = name;
    for (;;) {
      const tk = peek();
      if (tk?.k === '_') {
        next();
        const s = peek();
        if (s?.k === '{') { let txt = ''; next(); while (peek() && peek().k !== '}') { const q = next(); txt += q.v ?? q.k; } next(); full += `_${txt}`; } else { next(); full += `_${s?.v}`; }
      } else if (tk?.k === 'prime') { next(); full += "'"; } else break;
    }
    vars.add(full);
    return (env) => env[full];
  }
  function postfix(base) {
    for (;;) {
      const tk = peek();
      if (tk?.k === '^') {
        next();
        if (peek()?.k === 'deg') { next(); const b = base; base = (env) => b(env) * (Math.PI / 180); continue; }
        if (peek()?.k === '{' && tokens[p + 1]?.k === 'deg' && tokens[p + 2]?.k === '}') { p += 3; const b = base; base = (env) => b(env) * (Math.PI / 180); continue; }
        const ex = group();
        const b = base;
        base = (env) => pow(b(env), ex(env));
      } else if (tk?.k === 'fact') {
        next();
        const b = base;
        base = (env) => fact(b(env));
      } else if (tk?.k === 'pct') {
        next();
        const b = base;
        base = (env) => b(env) / 100;
      } else if (tk?.k === 'deg') {
        next();
        const b = base;
        base = (env) => b(env) * (Math.PI / 180);
      } else break;
    }
    return base;
  }
  function bracketed(open) {
    // after an opening bracket: expr or a tuple
    const parts = [expr()];
    while (peek()?.k === 'sep') { next(); parts.push(expr()); }
    const cl = next();
    if (!cl || cl.k !== 'close') throw new Fail('close');
    if (parts.length === 1 && ((open === '(' && cl.v === ')') || (open === '[' && cl.v === ']') || (open === '{' && cl.v === '}'))) return parts[0];
    return (env) => ({ tuple: parts.map((f) => f(env)), kind: open + cl.v });
  }
  function atom(inFn = false) {
    const tk = peek();
    if (!tk) throw new Fail('eof');
    if (tk.k === 'num') {
      next();
      // mixed number: 2\frac{1}{3}
      if (peek()?.k === 'frac' && Number.isInteger(tk.v) && tokens[p + 1]?.k === '{' && tokens[p + 2]?.k === 'num' && tokens[p + 3]?.k === '}' && tokens[p + 4]?.k === '{' && tokens[p + 5]?.k === 'num' && tokens[p + 6]?.k === '}') {
        const a = tokens[p + 2].v;
        const b = tokens[p + 5].v;
        p += 7;
        return postfix(() => tk.v + a / b);
      }
      return postfix(() => tk.v);
    }
    if (tk.k === 'var') {
      next();
      const v = variable(tk.v);
      const name = [...vars].pop();
      if (peek()?.k === 'open' && peek().v === '(' && (/^[fghFGHP]/.test(tk.v) || name?.includes("'")) && tk.v !== 'e') {
        next();
        const arg = bracketed('(');
        vars.delete(name);
        const key = `fn:${name}`;
        vars.add(key);
        // an unknown function: a fixed but arbitrary smooth function of its argument
        return postfix((env) => { const a = arg(env); const t = isT(a) ? a.tuple.reduce((x, y, i) => x + (i + 1.37) * y, 0) : a; return Math.sin(env[key] * 1.7 + t * 0.91) + 0.31 * t * env[key]; });
      }
      return postfix(v);
    }
    if (tk.k === 'frac') { next(); const a = group(); const b = group(); return postfix((env) => div(a(env), b(env))); }
    if (tk.k === 'binom') { next(); const a = group(); const b = group(); return postfix((env) => fact(a(env)) / (fact(b(env)) * fact(a(env) - b(env)))); }
    if (tk.k === 'sqrt') {
      next();
      let idx = null;
      if (peek()?.k === 'open' && peek().v === '[') { next(); idx = expr(); if (next()?.v !== ']') throw new Fail(']'); }
      const a = group();
      return postfix((env) => root(a(env), idx ? idx(env) : 2));
    }
    if (tk.k === '{') { next(); const e = expr(); if (next()?.k !== '}') throw new Fail('}'); return postfix(e); }
    if (tk.k === 'open') { next(); return postfix(bracketed(tk.v)); }
    if (tk.k === 'bar') {
      next();
      const e = expr(true);
      if (next()?.k !== 'bar') throw new Fail('bar');
      return postfix((env) => Math.abs(e(env)));
    }
    if (tk.k === 'fn') {
      if (inFn) throw new Fail('nested fn without brackets');
      next();
      let name = tk.v;
      let power = null;
      let base = null;
      for (;;) {
        if (peek()?.k === '^') { next(); power = group(); } else if (peek()?.k === '_') { next(); base = group(); } else break;
      }
      let arg;
      const a = peek();
      if (a?.k === 'open' || a?.k === 'bar' || a?.k === '{') arg = atom(true);
      else {
        // implicit product of simple atoms: \sin 2x, \ln x^{2}, \cos\frac{\pi}{3}
        const fs = [];
        let neg = false;
        if (peek()?.k === 'op' && peek().v === '-') { next(); neg = true; }
        while (peek() && ['num', 'var', 'frac', 'sqrt'].includes(peek().k)) fs.push(atom(true));
        if (!fs.length) throw new Fail('fn arg');
        arg = (env) => fs.reduce((acc, f) => acc * f(env), neg ? -1 : 1);
      }
      let f = FUNCS[name];
      let pw = power;
      if (power && INV[name]) {
        // \sin^{-1} is the inverse function
        const probe = power({});
        if (probe === -1) { f = FUNCS[INV[name]]; pw = null; }
      }
      const b = base;
      return postfix((env) => {
        let v = f(arg(env));
        if (b) v = Math.log(arg(env)) / Math.log(b(env));
        return pw ? pow(v, pw(env)) : v;
      });
    }
    throw new Fail(`atom ${tk.k}`);
  }
  function unary(inBar) {
    const tk = peek();
    if (tk?.k === 'op' && (tk.v === '-' || tk.v === '+')) { next(); const f = unary(inBar); return tk.v === '-' ? (env) => neg(f(env)) : f; }
    return atom();
  }
  function term(inBar) {
    let f = unary(inBar);
    for (;;) {
      const tk = peek();
      if (!tk) break;
      if (tk.k === 'op' && (tk.v === '*' || tk.v === '/')) {
        next();
        const g = unary(inBar);
        const a = f;
        f = tk.v === '*' ? (env) => mul(a(env), g(env)) : (env) => div(a(env), g(env));
      } else if (['num', 'var', 'frac', 'sqrt', 'open', 'fn', '{', 'binom'].includes(tk.k) || (tk.k === 'bar' && !inBar)) {
        const g = atom();
        const a = f;
        f = (env) => mul(a(env), g(env));
      } else break;
    }
    return f;
  }
  function expr(inBar = false) {
    let f = term(inBar);
    for (;;) {
      const tk = peek();
      if (tk?.k === 'op' && (tk.v === '+' || tk.v === '-')) {
        next();
        const g = term(inBar);
        const a = f;
        f = tk.v === '+' ? (env) => add(a(env), g(env)) : (env) => add(a(env), neg(g(env)));
      } else break;
    }
    return f;
  }
  return { expr, peek, next, vars, done: () => p >= tokens.length, isClose };
}

const isT = (v) => v && typeof v === 'object';
const lift = (op) => (a, b) => {
  if (isT(a) || isT(b)) {
    if (isT(a) && isT(b) && a.tuple.length === b.tuple.length) return { tuple: a.tuple.map((x, i) => lift(op)(x, b.tuple[i])), kind: a.kind };
    if (isT(a) && !isT(b)) return { tuple: a.tuple.map((x) => lift(op)(x, b)), kind: a.kind };
    if (!isT(a) && isT(b)) return { tuple: b.tuple.map((x) => lift(op)(a, x)), kind: b.kind };
    throw new Fail('tuple op');
  }
  return op(a, b);
};
const add = lift((a, b) => a + b);
const mul = lift((a, b) => a * b);
const div = lift((a, b) => a / b);
const neg = (a) => (isT(a) ? { tuple: a.tuple.map(neg), kind: a.kind } : -a);
function pow(a, b) {
  if (isT(a) || isT(b)) throw new Fail('tuple pow');
  if (a < 0 && !Number.isInteger(b)) {
    // real odd roots of negatives
    const inv = 1 / b;
    if (Math.abs(inv - Math.round(inv)) < 1e-9 && Math.round(inv) % 2) return -Math.pow(-a, b);
    return NaN;
  }
  return Math.pow(a, b);
}
function root(a, n) {
  if (isT(a)) throw new Fail('tuple root');
  if (a < 0) return n % 2 ? -Math.pow(-a, 1 / n) : NaN;
  return Math.pow(a, 1 / n);
}
function fact(a) {
  if (isT(a) || !Number.isInteger(a) || a < 0 || a > 170) return NaN;
  let r = 1;
  for (let i = 2; i <= a; i++) r *= i;
  return r;
}

/** Split a choice into text parts and math parts, then math parts into expressions and separators. */
export function compileChoice(choice) {
  const items = [];
  const vars = new Set();
  const re = /\\\((.+?)\\\)|\\\[(.+?)\\\]/gs;
  let last = 0;
  let m;
  const pushText = (s) => { const v = s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(); if (v) items.push({ str: v.toLowerCase() }); };
  while ((m = re.exec(choice))) {
    pushText(choice.slice(last, m.index));
    last = m.index + m[0].length;
    const tokens = tokenize(m[1] ?? m[2]);
    if (!tokens) return null;
    const ps = parser(tokens);
    try {
      while (!ps.done()) {
        const tk = ps.peek();
        if (tk.k === 'rel' || tk.k === 'sep') { ps.next(); items.push({ str: tk.v }); continue; }
        if (tk.k === 'text') { ps.next(); if (tk.v) items.push({ str: tk.v.toLowerCase() }); continue; }
        const f = ps.expr();
        items.push({ f });
        const after = ps.peek();
        if (after && !(after.k === 'rel' || after.k === 'sep' || after.k === 'text')) return null;
      }
    } catch (e) {
      if (e instanceof Fail) return null;
      throw e;
    }
    for (const v of ps.vars) vars.add(v);
  }
  pushText(choice.slice(last));
  if (!items.some((it) => it.f)) return null;
  const relation = items.some((it) => !it.f && ['=', '<', '>', '≤', '≥', '≠', '≈'].includes(it.str));
  if (relation && vars.size === 0) return null;
  return { items, vars };
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const closeNum = (a, b) => {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
};
function sameValue(a, b) {
  if (isT(a) || isT(b)) {
    if (!(isT(a) && isT(b)) || a.kind !== b.kind || a.tuple.length !== b.tuple.length) return false;
    return a.tuple.every((x, i) => sameValue(x, b.tuple[i]));
  }
  return closeNum(a, b);
}
const finite = (v) => (isT(v) ? v.tuple.every(finite) : Number.isFinite(v) || v === Infinity || v === -Infinity);

/** True when two compiled choices are equal in value (and identical in their text parts). */
export function equivalent(a, b) {
  if (!a || !b) return false;
  const tryOrder = (ia, ib) => {
    if (ia.length !== ib.length) return false;
    for (let i = 0; i < ia.length; i++) if (!!ia[i].f !== !!ib[i].f || (!ia[i].f && ia[i].str !== ib[i].str)) return false;
    const names = [...new Set([...a.vars, ...b.vars])];
    const rnd = mulberry(12345);
    let good = 0;
    for (let k = 0; k < 12; k++) {
      const env = {};
      for (const nme of names) env[nme] = k < 4 ? 0.4 + rnd() * 1.9 : k < 8 ? -(0.4 + rnd() * 1.9) : 3 + rnd() * 6;
      let ok = true;
      let usable = true;
      for (let i = 0; i < ia.length && ok; i++) {
        if (!ia[i].f) continue;
        let va;
        let vb;
        try { va = ia[i].f(env); vb = ib[i].f(env); } catch { return false; }
        if (!finite(va) || !finite(vb)) { usable = false; break; }
        if (!sameValue(va, vb)) ok = false;
      }
      if (!usable) continue;
      if (!ok) return false;
      good++;
    }
    return good >= (names.length ? 2 : 1);
  };
  if (tryOrder(a.items, b.items)) return true;
  // "x = 2 or x = 3" against "x = 3 or x = 2": compare the parts joined by or / and / commas as sets
  const splitSet = (items) => {
    const groups = [[]];
    for (const it of items) { if (!it.f && (it.str === 'or' || it.str === 'and')) groups.push([]); else groups[groups.length - 1].push(it); }
    return groups;
  };
  const ga = splitSet(a.items);
  const gb = splitSet(b.items);
  if (ga.length > 1 && ga.length === gb.length && ga.length <= 5) {
    const joiner = (items) => items.filter((it) => !it.f && (it.str === 'or' || it.str === 'and')).map((it) => it.str).join('|');
    if (joiner(a.items) !== joiner(b.items)) return false;
    const used = new Set();
    for (const g of ga) {
      const j = gb.findIndex((h, idx) => !used.has(idx) && tryOrder(g, h));
      if (j < 0) return false;
      used.add(j);
    }
    return true;
  }
  return false;
}
