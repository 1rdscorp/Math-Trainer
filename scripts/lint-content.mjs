#!/usr/bin/env node
// Lists places in topic files where two template interpolations sit side by side, e.g. `${a}${b}`.
// Most are fine (a sign followed by a number, a coefficient followed by a variable), but this is
// also how two numbers end up printed as one ("7" and "8" as "78"), which no automatic check can
// see in the output. Use it as a reading list:  npm run lint:content -- [level]
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/js/content/levels');
const only = process.argv[2];
// An interpolation that looks like it could print a bare number: a plain name or sum of names,
// or a call to one of the number formatters.
const NUMERIC = String.raw`\$\{\s*(?:(?:num|paren|txt|Math\.abs|Math\.round)\([^{}]*\)|[A-Za-z_][\w.]*(?:\s*[-+*/]\s*[\w.]+)*)\s*\}`;
const PAIR = new RegExp(`${NUMERIC}(?=${NUMERIC})`, 'g');
// Names that are known to hold text, not numbers.
const TEXTY = /\$\{\s*(?:\w*(?:sign|Sign|op|Op|sym|Sym|lead|Lead|unit|Unit|name|Name|label|Label|word|Word|tex|Tex|str|Str|text|Text|prefix|suffix|letter|Letter|var|Var|fn|Fn|trig|Trig)\w*|[A-Z]|x|y|z|t|u|v|w|R|M)\s*\}/;
let total = 0;
for (const level of (await readdir(root)).sort()) {
  if (only && level !== only) continue;
  for (const file of (await readdir(path.join(root, level))).sort()) {
    if (!file.endsWith('.js') || file === 'index.js') continue;
    const lines = (await readFile(path.join(root, level, file), 'utf8')).split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(PAIR)) {
        const rest = line.slice(m.index + m[0].length);
        const right = rest.match(new RegExp(`^${NUMERIC}`))?.[0] ?? '';
        if (TEXTY.test(m[0]) || TEXTY.test(right)) continue;
        total += 1;
        const at = Math.max(0, m.index - 30);
        console.log(`${level}/${file}:${i + 1}  …${line.slice(at, m.index + m[0].length + 40).trim()}…`);
      }
    });
  }
}
console.log(`\n${total} adjacent interpolation(s) to read.`);
