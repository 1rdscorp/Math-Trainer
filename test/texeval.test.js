import test from 'node:test';
import assert from 'node:assert/strict';
import { compileChoice, equivalent } from '../scripts/lib/texeval.mjs';
import { validateTopic } from '../scripts/lib/validate.mjs';
import { q, frac, terms, fractionWord } from '../public/js/content/lib/index.js';

const R = String.raw;
const same = (a, b) => equivalent(compileChoice(a), compileChoice(b));

test('choices that are equal in value are recognised', () => {
  const pairs = [
    [R`\(2x + 3\)`, R`\(3 + 2x\)`],
    [R`\(2(x + 3)\)`, R`\(2x + 6\)`],
    [R`\(x(x + 1)\)`, R`\(x^{2} + x\)`],
    [R`\(\frac{1}{2}\)`, R`\(\frac{2}{4}\)`],
    [R`\(1\frac{1}{2}\)`, R`\(\frac{3}{2}\)`],
    [R`\(2\sqrt{3}\)`, R`\(\sqrt{12}\)`],
    [R`\(\frac{\sqrt{2}}{2}\)`, R`\(\frac{1}{\sqrt{2}}\)`],
    [R`\(x = 2 \text{ or } x = 3\)`, R`\(x = 3 \text{ or } x = 2\)`],
    [R`\((2, 3)\)`, R`\((2, \frac{6}{2})\)`],
    [R`\(\sin^{2} x + \cos^{2} x\)`, R`\(1\)`],
    [R`\(\sin 2x\)`, R`\(2\sin x\cos x\)`],
    [R`\(\ln|x - 3| + C\)`, R`\(\ln|3 - x| + C\)`],
    [R`\(e^{2x}\)`, R`\((e^{x})^{2}\)`],
    [R`\(x^{\frac{1}{2}}\)`, R`\(\sqrt{x}\)`],
    [R`\(5\) cm`, R`\(\frac{10}{2}\) cm`],
    [R`\(30^\circ\)`, R`\(\frac{\pi}{6}\)`],
    [R`\(\log_{2} 8\)`, R`\(3\)`],
    [R`\(\sqrt[3]{-8}\)`, R`\(-2\)`],
    [R`\(3 + 4i\)`, R`\(4i + 3\)`],
    [R`\(y = 2x + 1\)`, R`\(y = 1 + 2x\)`],
    [R`\(f'(x) = 6x\)`, R`\(f'(x) = 3 \cdot 2x\)`],
    [R`\(f(2) + 1\)`, R`\(1 + f(2)\)`],
    [R`\(\tan^{-1} x\)`, R`\(\arctan x\)`],
    [R`\(4!\)`, R`\(24\)`],
    [R`\(50\%\)`, R`\(0.5\)`],
    [R`\(1{,}000\)`, R`\(10^{3}\)`],
    [R`\(2e^{x} + 2xe^{x}\)`, R`\(2xe^{x} + 2e^{x}\)`],
    [R`\(2^{4}\)`, R`\(4^{2}\)`],
    [R`\(\langle 1, 2, 3 \rangle\)`, R`\(\langle 1, \frac{4}{2}, 3 \rangle\)`],
  ];
  for (const [a, b] of pairs) assert.equal(same(a, b), true, `${a}  should equal  ${b}`);
});

test('choices that differ are not confused, and nothing is guessed', () => {
  const pairs = [
    [R`\(2x + 3\)`, R`\(3x + 2\)`],
    [R`\(x = 2 \text{ or } x = 3\)`, R`\(x = 3 \text{ or } x = 4\)`],
    [R`\((2, 3)\)`, R`\((3, 2)\)`],
    [R`\(\ln|x - 3| + C\)`, R`\(\ln|x + 3| + C\)`],
    [R`\(\dfrac{A}{x + 6} + \dfrac{B}{x - 6}\)`, R`\(\dfrac{A}{x - 6} + \dfrac{B}{x + 6}\)`],
    [R`\(5\) cm`, R`\(5\) m`],
    [R`\(x \ge 2\)`, R`\(x > 2\)`],
    [R`\((-\infty, 2]\)`, R`\((-\infty, 2)\)`],
    [R`\(-x^{2}\)`, R`\((-x)^{2}\)`],
    [R`\(f'(0) = 0\)`, R`\(f(0) = 0\)`],
    [R`\(f(2)\)`, R`\(f(3)\)`],
    // A statement between constants is a fact to recognise, not an expression to compare by value.
    [R`\(7 \times 3 = 21\)`, R`\(7 + 14 = 21\)`],
    // A list separated by commas is ordered.
    [R`\(-1,\; -0.75,\; \frac{1}{2},\; 3\)`, R`\(-0.75,\; -1,\; \frac{1}{2},\; 3\)`],
  ];
  for (const [a, b] of pairs) assert.equal(same(a, b), false, `${a}  should differ from  ${b}`);
  for (const odd of [R`\(\int x\,dx\)`, R`\(\overline{AB}\)`, 'Converges absolutely', R`\(\lim_{x \to 2} f(x)\)`, R`\(1.2.3\)`]) assert.equal(compileChoice(odd), null, odd);
});

test('the validator rejects an equal-valued wrong choice unless it is declared as a wrong form and explained', () => {
  const topic = (wrongFirst) => ({
    id: 'demo',
    title: 'Demo',
    summary: 'A demo topic.',
    standards: ['TEST 1'],
    explain: { intro: 'Intro.', rules: ['Rule one.', 'Rule two.'] },
    examples: [
      { title: 'One', problem: 'P', steps: ['a', 'b'], answer: 'x', word: true },
      { title: 'Two', problem: 'P', steps: ['a', 'b'], answer: 'x' },
    ],
    models: [{ id: 'm', title: 'M', word: true, inputs: [{ name: 'a', label: 'a', type: 'int', min: 1, max: 9, value: 2 }], compute: ({ a }) => ({ steps: [`${a}`], answer: `${a}` }) }],
    quiz: Object.fromEntries(
      ['easy', 'medium', 'hard', 'challenge'].map((tier) => [
        tier,
        [1, 2].map((k) => (rng) => {
          const a = rng.int(2, 60);
          const b = rng.int(2, 60) + k;
          return q({
            prompt: R`${tier} ${k}: factor completely \(${a}x + ${a * b}\).`,
            correct: R`\(${a}(x + ${b})\)`,
            wrong: [wrongFirst(a, b), R`\(${a}(x + ${b + 1})\)`, R`\(${a + 1}(x + ${b})\)`, R`\(${a}(x - ${b})\)`],
            solution: ['Take out the common factor.'],
            rule: 0,
          });
        }),
      ]),
    ),
  });
  const bad = validateTopic(topic((a, b) => R`\(${a}x + ${a * b}\)`), 'demo-level', { seeds: 12 });
  assert.ok(bad.errors.some((e) => e.includes('equal in value to the right answer')), 'unexplained equal-valued choice is an error');
  // A note alone is not enough: a slip's formula can land on the right answer by accident and still carry its note.
  const noted = validateTopic(topic((a, b) => ({ value: R`\(${a}x + ${a * b}\)`, why: 'That is the expression you started with.' })), 'demo-level', { seeds: 12 });
  assert.ok(noted.errors.some((e) => e.includes('equal in value to the right answer')));
  const good = validateTopic(topic((a, b) => ({ value: R`\(${a}x + ${a * b}\)`, why: 'That is the expression you started with. Nothing has been factored out.', form: true })), 'demo-level', { seeds: 12 });
  assert.deepEqual(good.errors.filter((e) => e.includes('equal in value')), []);
});

test('q(): a numeric wrong answer equal to the right one is dropped unless declared with form: true and a why', () => {
  const base = { prompt: 'Write the fraction in simplest form.', correct: frac(2, 3), solution: ['Divide top and bottom by 3.'] };
  const others = [frac(3, 2), frac(1, 3), frac(2, 9)];
  const sixNinths = R`\(\frac{6}{9}\)`;
  const dropped = q({ ...base, wrong: [{ value: sixNinths, why: 'Equal, but not simplest.' }, ...others] });
  assert.ok(!dropped.choices.includes(sixNinths));
  assert.equal(dropped.forms, undefined);
  const kept = q({ ...base, wrong: [{ value: sixNinths, why: 'Equal to the right answer, but 6 and 9 still share the factor 3.', form: true }, ...others] });
  assert.equal(kept.choices[1], sixNinths);
  assert.deepEqual(kept.forms, [false, true, false, false]);
  // The flag needs its explanation.
  const noWhy = q({ ...base, wrong: [{ value: sixNinths, form: true }, ...others] });
  assert.ok(!noWhy.choices.includes(sixNinths));
  // Automatic top-up keeps decimals well away from the right answer (they are often rounded answers).
  const dec = q({ prompt: 'A rounded answer', correct: 3.14, wrong: [], solution: ['s'] });
  for (const c of dec.choices.slice(1)) assert.ok(Math.abs(Number(c.replace(/[^0-9.]/g, '')) - 3.14) >= 0.03 - 1e-9, c);
  const whole = q({ prompt: 'A whole answer', correct: 7, wrong: [], solution: ['s'] });
  assert.deepEqual(whole.choices, [R`\(7\)`, R`\(8\)`, R`\(6\)`, R`\(9\)`]);
  // A whole-number answer that was rounded gets the same treatment as a decimal.
  const deg = q({ prompt: 'Find the angle to the nearest degree.', correct: 37, wrong: [], solution: ['s'] });
  assert.deepEqual(deg.choices, [R`\(37\)`, R`\(47\)`, R`\(27\)`, R`\(42\)`]);
  const hundreds = q({ prompt: 'Round 1,249 to the nearest hundred.', correct: 1200, wrong: [], solution: ['s'] });
  assert.deepEqual(hundreds.choices.map((c) => Number(c.replace(/[^0-9]/g, ''))), [1200, 1300, 1100, 1400]);
});

test('the validator catches lost backslashes, unfilled placeholders and TeX outside the math delimiters', async () => {
  const { checkRich } = await import('../scripts/lib/validate.mjs');
  const problems = (text) => {
    const errors = [];
    checkRich(text, 'here', errors, []);
    return errors.join(' ');
  };
  assert.equal(problems(R`The area is \(3 \cdot \frac{1}{2}\) square units, about \(\$4.50\).`), '');
  assert.match(problems('The area is \\(3 cdot 4\\).'), /without its backslash/);
  assert.match(problems('Use \\(xsin y\\) here.'), /without its backslash/);
  assert.match(problems(`Multiply: \\(3 \times 4\\).`), /control character/);
  assert.match(problems(R`The line is \(y = \${m}x\).`), /placeholder/);
  assert.match(problems('The line is y = ${m}x.'), /placeholder/);
  assert.match(problems('The power is x^{2} here.'), /TeX outside/);
  assert.equal(problems(R`In \(\triangle ABC\) (angle \(A\) is the vertex angle), \(\text{sin}\) is fine in text.`), '');
});

test('terms() separates a coefficient from a symbol that starts with a digit; fraction words cover every denominator', () => {
  assert.equal(terms([[3, '2^{x}']]), R`3 \cdot 2^{x}`);
  assert.equal(terms([[1, '2^{x}'], [-4, '3^{x}'], [5, '']]), R`2^{x} - 4 \cdot 3^{x} + 5`);
  assert.equal(terms([[3, 'x'], [-2, 'y']]), '3x - 2y');
  assert.deepEqual([2, 4, 13, 24, 30, 40, 64, 100, 300].map((d) => fractionWord(d)), ['halves', 'fourths', 'thirteenths', 'twenty-fourths', 'thirtieths', 'fortieths', 'sixty-fourths', 'hundredths', '300ths']);
  assert.equal(fractionWord(30, 1), 'thirtieth');
});
