// Rich text → plain words. Used for read-aloud, for screen-reader labels on answer choices
// (an accessible name is a flat string, so math needs a spoken form), and for live announcements.
// Pure string work; no DOM.

const PIECES = { 2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['fourth', 'fourths'], 5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'], 7: ['seventh', 'sevenths'], 8: ['eighth', 'eighths'], 9: ['ninth', 'ninths'], 10: ['tenth', 'tenths'], 12: ['twelfth', 'twelfths'], 100: ['hundredth', 'hundredths'] };

const WORDS = {
  times: 'times', cdot: 'times', div: 'divided by', pm: 'plus or minus', mp: 'minus or plus',
  le: 'is less than or equal to', leq: 'is less than or equal to', ge: 'is greater than or equal to', geq: 'is greater than or equal to',
  ne: 'is not equal to', neq: 'is not equal to', approx: 'is about', equiv: 'is equivalent to', cong: 'is congruent to', sim: 'is similar to',
  to: 'approaches', rightarrow: 'goes to', Rightarrow: 'so', implies: 'so', iff: 'if and only if', infty: 'infinity',
  sin: 'sine', cos: 'cosine', tan: 'tangent', sec: 'secant', csc: 'cosecant', cot: 'cotangent',
  arcsin: 'inverse sine', arccos: 'inverse cosine', arctan: 'inverse tangent', sinh: 'hyperbolic sine', cosh: 'hyperbolic cosine',
  ln: 'natural log', log: 'log', exp: 'e to the', lim: 'the limit of', max: 'max', min: 'min', det: 'determinant of', gcd: 'g c d',
  int: 'the integral of', iint: 'the double integral of', iiint: 'the triple integral of', oint: 'the closed line integral of', sum: 'the sum of', prod: 'the product of',
  partial: 'partial', nabla: 'del', angle: 'angle', triangle: 'triangle', perp: 'is perpendicular to', parallel: 'is parallel to',
  in: 'in', notin: 'not in', cup: 'union', cap: 'intersection', subset: 'is a subset of', emptyset: 'the empty set', varnothing: 'the empty set',
  ldots: 'and so on', cdots: 'and so on', dots: 'and so on', square: 'blank', Box: 'blank', circ: 'degrees', degree: 'degrees', prime: 'prime',
  alpha: 'alpha', beta: 'beta', gamma: 'gamma', delta: 'delta', epsilon: 'epsilon', varepsilon: 'epsilon', theta: 'theta', lambda: 'lambda', mu: 'mu',
  pi: 'pi', rho: 'rho', sigma: 'sigma', tau: 'tau', phi: 'phi', varphi: 'phi', omega: 'omega', Delta: 'delta', Sigma: 'sigma', Omega: 'omega', Theta: 'theta', Phi: 'phi',
  langle: 'the vector', rangle: '', mid: 'given', vert: '', lvert: '', rvert: '', lbrace: '', rbrace: '', ell: 'l', hbar: 'h bar',
  quad: '', qquad: '', left: '', right: '', big: '', Big: '', bigg: '', displaystyle: '', textstyle: '', limits: '', nolimits: '', mathstrut: '', dfrac: '', tfrac: '',
};

function sayFraction(n, d) {
  const names = PIECES[Number(d)];
  if (names && Number(n) <= 20) return `${n} ${Number(n) === 1 ? names[0] : names[1]}`;
  return `${n} over ${d}`;
}

const simple = (s) => !/\s\S/.test(s.trim()) || /^[\w.\s]{1,6}$/.test(s.trim());

/** One LaTeX expression → words. Best effort: always returns readable text, never throws. */
export function mathToWords(tex) {
  let t = ` ${tex} `;

  // Layouts.
  t = t.replace(/\\begin\{array\}\{[^}]*\}|\\end\{array\}/g, ' ').replace(/\\hline/g, ' equals ').replace(/\\phantom\{[^{}]*\}/g, ' blank ');
  t = t.replace(/\\begin\{[pbvBV]?matrix\}(.*?)\\end\{[pbvBV]?matrix\}/gs, (_, body) => ` the matrix with rows ${body.split('\\\\').map((row) => row.split('&').join(' , ')).join(' ; ')} , end matrix `);
  t = t.replace(/\\begin\{cases\}(.*?)\\end\{cases\}/gs, (_, body) => ` ${body.split('\\\\').map((row) => row.split('&').join(' , ')).join(' ; or ')} `);
  t = t.replace(/\\begin\{[a-z*]+\}|\\end\{[a-z*]+\}/g, ' ').replace(/\\\\/g, ' ; ').replace(/&/g, ' ');

  // Text and decorations that only wrap their content.
  t = t.replace(/\\vec\{([^{}]*)\}/g, ' vector $1 ').replace(/\\hat\{([^{}]*)\}/g, ' $1 hat ').replace(/\\(?:overline|bar)\{([^{}]*)\}/g, ' $1 bar ');
  for (let i = 0; i < 4; i++) t = t.replace(/\\(?:text|textbf|textit|mathrm|mathbf|mathit|mathbb|mathcal|boldsymbol|operatorname|boxed|underline|cancel)\{([^{}]*)\}/g, ' $1 ');

  // Calculus notation that reads badly piece by piece.
  t = t.replace(/\\[dt]?frac\{d\}\{d([a-zA-Z])\}/g, ' the derivative with respect to $1 of ');
  t = t.replace(/\\[dt]?frac\{d\^\{?2\}?\s*([a-zA-Z]?)\}\{d([a-zA-Z])\^\{?2\}?\}/g, ' the second derivative of $1 with respect to $2 ');
  t = t.replace(/\\[dt]?frac\{d([a-zA-Z])\}\{d([a-zA-Z])\}/g, ' the derivative of $1 with respect to $2 ');
  t = t.replace(/\\[dt]?frac\{\\partial\s*([a-zA-Z]?)\}\{\\partial\s*([a-zA-Z])\}/g, ' the partial derivative of $1 with respect to $2 ');
  t = t.replace(/\\lim_\{([^{}]*)\}/g, ' the limit as $1 of ');
  const big = { int: 'the integral', sum: 'the sum', prod: 'the product' };
  t = t.replace(/\\(int|sum|prod)_\{([^{}]*)\}\^\{([^{}]*)\}/g, (_, op, a, b) => ` ${big[op]} from ${a} to ${b} of `).replace(/\\(int|sum|prod)_(\w)\^(\w)/g, (_, op, a, b) => ` ${big[op]} from ${a} to ${b} of `);
  t = t.replace(/([a-zA-Z])'''/g, '$1 triple prime ').replace(/([a-zA-Z])''/g, '$1 double prime ').replace(/([a-zA-Z])'/g, '$1 prime ');

  // Work from the innermost braces outwards, so nesting is handled.
  let before;
  let guard = 0;
  do {
    before = t;
    t = t.replace(/(\d+)\s*\\[dt]?frac\{(\d+)\}\{(\d+)\}/g, (_, w, n, d) => ` ${w} and ${sayFraction(n, d)} `);
    t = t.replace(/\\[dt]?frac\{(\d+)\}\{(\d+)\}/g, (_, n, d) => ` ${sayFraction(n, d)} `);
    t = t.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => (simple(a) && simple(b) ? ` ${a} over ${b} ` : ` the fraction ${a} , over ${b} , end fraction `));
    t = t.replace(/\\sqrt\[([^\]]*)\]\{([^{}]*)\}/g, (_, n, a) => ` the ${n === '3' ? 'cube' : `${n}th`} root of ${a} ${simple(a) ? '' : ', end root '}`);
    t = t.replace(/\\sqrt\{([^{}]*)\}/g, (_, a) => ` the square root of ${a} ${simple(a) ? '' : ', end root '}`);
    t = t.replace(/\^\{?\\circ\}?/g, ' degrees ');
    t = t.replace(/\^\{2\}|\^2(?!\d)/g, ' squared ').replace(/\^\{3\}|\^3(?!\d)/g, ' cubed ');
    t = t.replace(/\^\{([^{}]*)\}/g, (_, a) => ` to the power ${a} ${simple(a) ? '' : ', end power '}`).replace(/\^(-?\w)/g, ' to the power $1 ');
    t = t.replace(/_\{([^{}]*)\}/g, ' sub $1 ').replace(/_(\w)/g, ' sub $1 ');
  } while (t !== before && guard++ < 12);

  // Symbols.
  t = t.replace(/\\%/g, ' percent ').replace(/\\\$/g, ' dollars ').replace(/\{,\}/g, '').replace(/\\[,;:! ]/g, ' ').replace(/\\[{}]/g, ' ');
  t = t.replace(/\\([a-zA-Z]+)/g, (_, name) => ` ${WORDS[name] ?? name} `);
  t = t.replace(/\|([^|]+)\|/g, ' the absolute value of $1 , ');
  t = t.replace(/</g, ' is less than ').replace(/>/g, ' is greater than ').replace(/=/g, ' equals ');
  t = t.replace(/\b([fghFGHPpsvr])\s*\(/g, '$1 of (').replace(/prime\s*\(/g, 'prime of (');
  // A minus sign at the start, or straight after an operator or bracket, is a negative sign.
  t = t.replace(/(^|[(,[]|equals|times|plus|minus|by|than|to|is|of|over|approaches|from|about|power)\s*-\s*(?=[\d.a-zA-Z(])/g, '$1 negative ');
  t = t.replace(/\+/g, ' plus ').replace(/-/g, ' minus ').replace(/−/g, ' minus ').replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/·/g, ' times ');
  t = t.replace(/[{}\\]/g, ' ').replace(/_/g, ' blank ');
  return t.replace(/\s+([,;])/g, '$1').replace(/([,;])(\s*[,;])+/g, '$1').replace(/\s+/g, ' ').trim().replace(/^[,;]\s*/, '').replace(/[,;]$/, '');
}

/** Turn a rich-text string (plain text with \( … \) math and **bold**) into plain words. */
export function toSpeech(rich) {
  return String(rich ?? '')
    .replace(/\\\((.+?)\\\)|\\\[(.+?)\\\]/gs, (_, a, b) => ` ${mathToWords(a ?? b)} `)
    .replace(/\*\*/g, '')
    .replace(/−(?=\d)/g, 'negative ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
