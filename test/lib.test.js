import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../public/js/content/lib/index.js';
import { makeRng, hashString } from '../public/js/core/rng.js';

const { R, num, txt, money, paren, signed, frac, Frac, fracTex, mixedTex, terms, linear, poly, polyEval, polyMul, polyAdd,
  polySub, polyDeriv, factor, simplifySqrt, sqrtTex, rootsTex, q, gcd, lcm, isPrime, primeFactors, divisors, round,
  choose, factorial, checkDeriv, checkAntideriv, checkIntegral, checkLimit, checkRoots, checkAll, integrate2, numPartial } = L;

test('rng is deterministic for a seed and stays in range', () => {
  const a = makeRng(42);
  const b = makeRng(42);
  for (let i = 0; i < 50; i++) assert.equal(a.int(-5, 5), b.int(-5, 5));
  const r = makeRng(1);
  for (let i = 0; i < 500; i++) {
    const v = r.int(3, 7);
    assert.ok(v >= 3 && v <= 7);
    assert.notEqual(r.nonzero(-2, 2), 0);
    assert.notEqual(r.intExcept(1, 3, [2]), 2);
  }
  assert.deepEqual(r.shuffle([1, 2, 3, 4]).sort(), [1, 2, 3, 4]);
  assert.equal(new Set(r.sample([1, 2, 3, 4, 5], 3)).size, 3);
  assert.throws(() => r.intExcept(0, 0, [0]));
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
});

test('number theory helpers', () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(-12, 18), 6);
  assert.equal(gcd(0, 5), 5);
  assert.equal(lcm(4, 6), 12);
  assert.ok(isPrime(97) && !isPrime(91) && !isPrime(1));
  assert.deepEqual(primeFactors(360), [2, 2, 2, 3, 3, 5]);
  assert.deepEqual(divisors(36), [1, 2, 3, 4, 6, 9, 12, 18, 36]);
  assert.equal(round(0.1 + 0.2, 2), 0.3);
  assert.equal(round(2.675, 2), 2.68);
  assert.ok(Object.is(round(-0.001, 2), 0));
  assert.equal(choose(5, 2), 10);
  assert.equal(factorial(5), 120);
});

test('number formatting', () => {
  assert.equal(num(-2.5), '-2.5');
  assert.equal(num(12500), '12{,}500');
  assert.equal(num(1250), '1250');
  assert.equal(num(0.1 + 0.2), '0.3');
  assert.equal(num(3, { fixed: 2 }), '3.00');
  assert.equal(txt(1250), '1,250');
  assert.equal(txt(-3), '−3');
  assert.equal(money(3.5), '$3.50');
  assert.equal(money(12), '$12');
  assert.equal(paren(-3), '(-3)');
  assert.equal(signed(-3), '- 3');
  assert.equal(signed(3), '+ 3');
  assert.throws(() => num(NaN));
  assert.equal(R`\frac{1}{2}`, '\\frac{1}{2}');
});

test('fractions stay exact and reduced', () => {
  assert.equal(frac(6, 8).tex(), '\\frac{3}{4}');
  assert.equal(frac(1, -2).tex(), '-\\frac{1}{2}');
  assert.equal(frac(1, 2).add(frac(1, 3)).tex(), '\\frac{5}{6}');
  assert.equal(frac(3, 4).sub(frac(1, 4)).tex(), '\\frac{1}{2}');
  assert.equal(frac(2, 3).mul(frac(3, 4)).tex(), '\\frac{1}{2}');
  assert.equal(frac(3, 4).div(frac(3, 8)).tex(), '2');
  assert.equal(frac(7, 3).mixedTex(), '2\\frac{1}{3}');
  assert.equal(frac(2, 3).pow(-2).tex(), '\\frac{9}{4}');
  assert.ok(frac(1, 3).lt(frac(1, 2)));
  assert.ok(frac(2, 4).eq(frac(1, 2)));
  assert.equal(fracTex(6, 8), '\\frac{6}{8}');
  assert.equal(mixedTex(2, 1, 3), '2\\frac{1}{3}');
  assert.equal(Frac.fromDecimal(0.75).tex(), '\\frac{3}{4}');
  assert.throws(() => frac(1, 0));
  assert.throws(() => frac(0.5, 2));
});

test('algebra formatting handles signs, ones and zeros', () => {
  assert.equal(terms([[3, 'x^2'], [-1, 'x'], [5, '']]), '3x^2 - x + 5');
  assert.equal(terms([[0, 'x'], [0, '']]), '0');
  assert.equal(terms([[-1, '']]), '-1');
  assert.equal(linear(1, 1), 'x + 1');
  assert.equal(linear(-1, -1), '-x - 1');
  assert.equal(linear(0, 4), '4');
  assert.equal(poly([2, 0, -3, 1]), '2x^{3} - 3x + 1');
  assert.equal(poly([1, -5, 6], 't'), 't^{2} - 5t + 6');
  assert.equal(polyEval([1, -5, 6], 2), 0);
  assert.deepEqual(polyMul([1, 2], [1, 3]), [1, 5, 6]);
  assert.deepEqual(polyAdd([1, 0, 1], [-1, 0, 2]), [3]);
  assert.deepEqual(polyAdd([1, 2], [3, 0, 1]), [3, 1, 3]);
  assert.deepEqual(polySub([1, 2], [1, 2]), [0]);
  assert.deepEqual(polyDeriv([2, 0, -3, 1]), [6, 0, -3]);
  assert.equal(factor(3), '(x - 3)');
  assert.equal(factor(-2), '(x + 2)');
  assert.deepEqual(simplifySqrt(72), { coef: 6, rad: 2 });
  assert.equal(sqrtTex(72), '6\\sqrt{2}');
  assert.equal(sqrtTex(49), '7');
  assert.equal(rootsTex([2, -3, 2]), 'x = -3 \\text{ or } x = 2');
});

test('q() builds four distinct choices with the correct one first', () => {
  const a = q({ prompt: 'What is 3 + 4?', correct: 7, wrong: [7, 12, 12], solution: ['7'] });
  assert.equal(a.answer, 0);
  assert.equal(a.choices[0], '\\(7\\)');
  assert.equal(new Set(a.choices).size, 4);
  assert.ok(a.key);
  const b = q({ prompt: 'x', correct: frac(1, 2), wrong: [frac(2, 4), frac(1, 3)], solution: ['s'] });
  assert.equal(new Set(b.choices).size, 4);
  assert.ok(!b.choices.slice(1).includes('\\(\\frac{1}{2}\\)'));
  const c = q({ prompt: 'u', correct: 5, wrong: [6, 7, 8], unit: 'cm', solution: ['s'] });
  assert.deepEqual(c.choices, ['\\(5\\) cm', '\\(6\\) cm', '\\(7\\) cm', '\\(8\\) cm']);
  // Spacing differences do not make a string distinct.
  assert.throws(() => q({ prompt: 's', correct: 'x + 1', wrong: ['x+1', ' x +1 ', 'y'], solution: [] }));
  // Choices that look different but are the same number are never offered together.
  const f = q({ prompt: 'v', correct: frac(1, 3), wrong: ['\\(\\frac{2}{6}\\)', '\\(\\frac{2}{3}\\)', '\\(\\frac{4}{6}\\)', frac(1, 6), frac(1, 2)], solution: ['s'] });
  assert.deepEqual(f.choices, ['\\(\\frac{1}{3}\\)', '\\(\\frac{2}{3}\\)', '\\(\\frac{1}{6}\\)', '\\(\\frac{1}{2}\\)']);
  // Wrong answers can carry a note explaining the slip.
  const e = q({ prompt: 'n', correct: frac(5, 6), wrong: [{ value: frac(2, 5), why: 'added tops and bottoms' }, frac(1, 6), { value: frac(5, 6), why: 'dup' }, 1], solution: ['s'] });
  assert.deepEqual(e.notes, [null, 'added tops and bottoms', null, null]);
  assert.equal(a.notes, undefined);
  // Auto-filled numbers never go negative for a non-negative answer.
  const d = q({ prompt: 'z', correct: 0, wrong: [], solution: ['s'] });
  assert.ok(d.choices.every((s) => !s.includes('-')));
});

test('numeric checks accept right answers and reject wrong ones', () => {
  assert.equal(checkDeriv((x) => x ** 3, (x) => 3 * x ** 2), true);
  assert.notEqual(checkDeriv((x) => x ** 3, (x) => 3 * x), true);
  assert.equal(checkAntideriv((x) => Math.sin(x), (x) => Math.cos(x)), true);
  assert.equal(checkIntegral((x) => x ** 2, 0, 3, 9), true);
  assert.notEqual(checkIntegral((x) => x ** 2, 0, 3, 8), true);
  assert.equal(checkLimit((x) => Math.sin(x) / x, 0, 1), true);
  assert.equal(checkLimit((x) => (2 * x + 1) / (x - 3), Infinity, 2), true);
  assert.equal(checkRoots((x) => x * x - 5 * x + 6, [2, 3]), true);
  assert.notEqual(checkRoots((x) => x * x - 5 * x + 6, [2, 4]), true);
  assert.equal(checkAll(true, true), true);
  assert.equal(checkAll(true, 'bad'), 'bad');
  assert.ok(Math.abs(integrate2((x, y) => x * y, 0, 1, 0, (x) => x) - 1 / 8) < 1e-6);
  assert.ok(Math.abs(numPartial((x, y) => x * x * y, [2, 3], 0) - 12) < 1e-6);
});

test('number lines: several rays, off-range segments drawn as arrows, and a description of what is shaded', async () => {
  const { renderVisual, vnodeToString } = await import('../public/js/core/visuals.js');
  const count = (spec, re) => (vnodeToString(renderVisual(spec).vnode).match(re) ?? []).length;
  const circles = /<circle/g;
  // "x < 2 or x > 7" written as a segment that starts off the left edge plus a ray.
  const or1 = { type: 'numberLine', min: 0, max: 10, step: 1, segment: { from: -10, to: 2, openTo: true }, ray: { from: 7, dir: 'right', open: true } };
  assert.equal(count(or1, circles), 2, 'no end circle is drawn for the end that is off the line');
  assert.equal(renderVisual(or1).alt, 'Number line from 0 to 10, shaded to the left of 2 (an open circle) and shaded to the right of 7 (an open circle).');
  // The same thing written as two rays.
  const or2 = { type: 'numberLine', min: 0, max: 10, step: 1, ray: [{ from: 2, dir: 'left', open: true }, { from: 7, dir: 'right', open: true }] };
  assert.equal(count(or2, circles), 2);
  assert.equal(renderVisual(or2).alt, renderVisual(or1).alt);
  // An ordinary segment keeps both end circles.
  const seg = { type: 'numberLine', min: -5, max: 5, segment: { from: -3, to: 2, openFrom: true } };
  assert.equal(count(seg, circles), 2);
  assert.match(renderVisual(seg).alt, /shaded between −3 \(an open circle\) and 2 \(a closed circle\)/);
});

test('pictures: groups get different colours by default, and bad specs throw instead of drawing nonsense', async () => {
  const { renderVisual, vnodeToString, VISUAL_TYPES } = await import('../public/js/core/visuals.js');
  const svg = (spec) => vnodeToString(renderVisual(spec).vnode);
  const counters = svg({ type: 'counters', groups: [8, 5], frame: true });
  assert.equal((counters.match(/viz-fill-a/g) ?? []).length, 8);
  assert.equal((counters.match(/viz-fill-b/g) ?? []).length, 5);
  assert.match(svg({ type: 'counters', groups: [{ count: 3, color: 'c' }] }), /viz-fill-c/);
  const bars = svg({ type: 'fractionBars', bars: [{ n: 1, d: 2 }, { n: 2, d: 4 }] });
  assert.ok(bars.includes('viz-fill-a') && bars.includes('viz-fill-b'));
  const plot = svg({ type: 'plot', x: [-2, 2], y: [-2, 2], alt: 'two lines', fns: [{ f: (x) => x }, { f: (x) => -x }] });
  assert.ok(plot.includes('viz-line-a') && plot.includes('viz-line-b'));
  assert.ok(VISUAL_TYPES.length >= 17);
  for (const bad of [{ type: 'nope' }, { type: 'numberLine', min: 5, max: 5 }, { type: 'fractionBars', bars: [{ n: 1, d: 0 }] }, { type: 'array', rows: 0, cols: 3 }, { type: 'plot', x: [0, 0], y: [0, 1] }, { type: 'baseTen', value: -1 }, { type: 'polygon', points: [[0, 0], [1, NaN], [2, 2]] }, null]) {
    assert.throws(() => renderVisual(bad));
  }
  // Every picture carries a text alternative and never leaks a bad number into the markup.
  for (const spec of [{ type: 'clock', hour: 3, minute: 25 }, { type: 'solid', kind: 'cone', labels: { r: '3', h: '4' } }, { type: 'transversal', labels: { 1: '65°' } }, { type: 'circle', radius: 'r = 5' }, { type: 'barModel', rows: [{ parts: [{ value: 3 }, { value: 4 }] }] }]) {
    const r = renderVisual(spec);
    assert.ok(r.alt.length > 5);
    assert.ok(!/NaN|undefined|Infinity/.test(vnodeToString(r.vnode)));
  }
});
