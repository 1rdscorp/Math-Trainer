// LaTeX layouts for written (column) arithmetic. Use inside display math: R`\[${vertical('+', 47, 38)}\]`.

import { num } from './text.js';

const OPS = { '+': '+', '-': '-', x: '\\times', '*': '\\times', '×': '\\times' };

/**
 * Column arithmetic. vertical('+', 47, 38) shows the sum set up with an empty answer line;
 * vertical('+', 47, 38, 85) shows the answer under the line.
 */
export function vertical(op, a, b, result) {
  const sym = OPS[op] ?? op;
  const plain = { commas: false };
  const answer = result == null ? '\\phantom{0}' : num(result, plain);
  return `\\begin{array}{r} ${num(a, plain)} \\\\ ${sym}\\ ${num(b, plain)} \\\\ \\hline ${answer} \\end{array}`;
}

/**
 * Long-division bracket. longDiv(52, 4) shows 4)52; longDiv(52, 4, 13) puts the quotient on top.
 */
export function longDiv(dividend, divisor, quotient) {
  const plain = { commas: false };
  const bracket = `${num(divisor, plain)}\\,\\overline{\\smash{)}\\,${num(dividend, plain)}}`;
  if (quotient == null) return bracket;
  return `\\begin{array}{r} ${typeof quotient === 'string' ? quotient : num(quotient, plain)} \\\\ ${bracket} \\end{array}`;
}
