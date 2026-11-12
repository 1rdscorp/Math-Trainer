# Writing a topic

Every lesson in Math Trainer is one JavaScript file that exports a topic object. This guide is the
contract for that file. Three finished topics show it in practice; read the one nearest your level
before you start:

| Band | Exemplar |
| --- | --- |
| Elementary | `public/js/content/levels/g1-5/fractions-add-sub.js` |
| High school | `public/js/content/levels/algebra-1/linear-equations.js` |
| College | `public/js/content/levels/calculus-1/derivative-rules.js` |

## Where things go

- One file per topic: `public/js/content/levels/<level>/<topic-id>.js`.
- List it, in teaching order, in `public/js/content/levels/<level>/index.js`.
- Shared helpers for one level may live in `levels/<level>/_shared.js`.
- Topic files are pure data and functions. They never touch the DOM, storage, the network,
  `Math.random` or `Date`. All randomness comes from the `rng` passed to a generator.
- After adding or renaming topics, run `npm run catalog` (regenerates the menu data).

## The shape of a topic

```js
import { R, q, frac, linear /* … */ } from '../../lib/index.js';

export default {
  id: 'fractions-add-sub',                  // kebab-case, unique in the level, same as the file name
  title: 'Adding & Subtracting Fractions',  // 64 characters at most
  summary: 'One sentence saying what the student will be able to do.', // 140 characters at most
  grade: 'Grades 4–5',                      // optional; used in Grades 1–5 and 6–8
  standards: ['CCSS 4.NF.B.3', 'CCSS 5.NF.A.1'],

  // 1. The rules, in plain language
  explain: {
    intro: '…the big idea in two or three sentences…',
    rules: [{ title: '…', text: '…', example: '…' }],   // at least 2; quiz questions point at these by index
    vocab: [{ term: '…', def: '…' }],                    // optional
    mistakes: ['…'],                                     // optional: common slips, stated kindly
    visual: { type: 'fractionBars', /* … */ },           // optional
  },

  // 2. Worked examples — at least 2, at least one with word: true
  examples: [{ title: '…', problem: '…', steps: ['…', '…'], answer: '…', word: true, visual: {/* optional */} }],

  // 3. Interactive models — at least 1; include a word-problem model (word: true) when the topic has one
  models: [{
    id: 'two-fractions', title: '…', intro: '…', word: false,
    inputs: [
      { name: 'a', label: 'First top number', type: 'int', min: 0, max: 30, value: 1 },
      { name: 't', label: 'Time (seconds)', type: 'number', min: 0, max: 6, step: 0.5, value: 1 },
      { name: 'op', label: 'Add or subtract', type: 'select', value: '+',
        options: [{ value: '+', label: 'add (+)' }, { value: '-', label: 'subtract (−)' }] },
    ],
    compute({ a, t, op }) {
      // return { problem?, steps: [...], answer, visual?, note? }   or   { error: 'A friendly sentence.' }
    },
  }],

  // 4. The quiz: at least 2 generators per tier (3 or more is better)
  quiz: { easy: [fn, fn], medium: [fn, fn], hard: [fn, fn], challenge: [fn, fn] },
};
```

## Rich text

Every string a student reads is "rich text":

- Inline math goes between `\(` and `\)`. Display math goes between `\[` and `\]`.
- `**bold**` marks emphasis. A newline is a line break. There is no other markup and no HTML.
- Write strings with the `R` tag so backslashes survive: ``R`Solve \(2x + ${b} = ${c}\).` ``.
  Plain quotes are fine for strings with no backslashes.
- Money is plain text: `$5`, or `money(3.5)` → `$3.50`. Never put `$` around math.
- Math is rendered by KaTeX. Stick to standard LaTeX; `\dfrac`, `\text{}`, `\begin{array}`,
  `\begin{pmatrix}`, `\begin{cases}`, `\langle \rangle`, `\vec{}`, `\mathbf{}`, `\partial`, `\nabla`,
  `\iint`, `\oint` all work. `\require`, `\enclose` and `\label` do not.
- Put every number that is part of an expression inside math mode. Numbers in a sentence
  ("3 apples", "after 5 seconds") may stay as plain text.

## The helper library (`lib/index.js`)

| Area | Helpers |
| --- | --- |
| Random (methods of `rng`) | `int(lo, hi)` inclusive · `nonzero(lo, hi)` · `intExcept(lo, hi, [..])` · `pick(list)` · `shuffle(list)` · `sample(list, k)` · `bool(p)` · `sign()` · `float(lo, hi)` |
| Numbers | `gcd` `lcm` `isPrime` `primeFactors` `divisors` `round(x, places)` `approx(a, b)` `clamp` `sum` `factorial` `choose` `permutations` `range(lo, hi)` |
| Number → LaTeX | `num(x)` (also takes a `Frac`; options `{ places, fixed, commas }`) · `paren(x)` → `(-3)` · `signed(x)` → `+ 3` / `- 3` · `product(4, -6)` → `(4)(-6)` · `dot(4, -3)` → `4 \cdot (-3)` |
| Number → text | `txt(1250)` → `1,250` · `money(3.5)` → `$3.50` · `ordinal(3)` → `3rd` · `plural(3, 'apple')` · `fractionWord(4)` → `fourths` · `joinList([...])` |
| Fractions | `frac(n, d)` → exact `Frac` in lowest terms with `.add .sub .mul .div .neg .inv .pow .eq .lt .gt .value .isInt() .tex() .mixedTex() .text()` · `tryFrac(n, d)` (null instead of throwing) · `fracTex(n, d)` (not reduced) · `mixedTex(w, n, d)` |
| Algebra → LaTeX | `terms([[3,'x^2'],[-1,'x'],[5,'']])` → `3x^2 - x + 5` · `linear(a, b)` · `poly([a, b, c])` (highest power first) · `power('x', n)` · `factor(r)` → `(x - r)` · `over(n, 'den')` · `texFrac('num', 'den')` · `rootsTex([..])` · `point(x, y)` · `vec(a, b, c)` · `sqrtTex(72)` → `6\sqrt{2}` · `simplifySqrt` · `isSquare` |
| Polynomial arithmetic | `polyEval` `polyAdd` `polySub` `polyMul` `polyScale` `polyDeriv` (number coefficients, highest power first) |
| Layout | `vertical('+', 47, 38)` column arithmetic · `longDiv(52, 4)` · `m(tex)` wraps in `\( \)` |
| Stories | `person(rng)` · `people(rng, k)` · `thing(rng)` → `{ one, many }` · `NAMES` · `THINGS` |
| Questions | `q({...})` (below) |
| Checks | `checkDeriv(f, df)` `checkAntideriv(F, f)` `checkIntegral(f, a, b, value)` `checkLimit(f, a, L)` `checkRoots(f, xs)` `checkSame(f, g)` `checkEqual(a, b)` `checkAll(...)` · numeric tools `numDeriv` `numPartial` `integrate` `integrate2` `integrate3` `close` |

Formatting rules that the helpers exist to enforce:

- Never build `ax + b` by hand. `terms`, `linear` and `poly` hide coefficients of 1, drop zero terms
  and get signs right (`3x - 2`, never `3x + -2` or `1x`).
- Never let two numbers sit side by side: `${a}${b}` prints 4 and 6 as 46. Use `product(a, b)`,
  `dot(a, b)` or write the parentheses yourself: `${a}(${x})`. Beware `${a}${paren(x)}`: `paren` only
  wraps negative numbers, so it prints 7 and 8 as 78.
- A negative number after an operator needs parentheses: `paren(x)`.
- Leave out steps that do nothing ("multiply top and bottom by 1"); say the number already fits.
- A minus sign belongs in front of a fraction, not in its numerator: `over(-7, 'x^{2}')`.
- Round anything computed with decimals: `num(x, { places: 2 })`.
- Guard against impossible cases. `tryFrac` returns `null` for a zero denominator, and `q()` skips `null` choices.

## Quiz questions

A generator is a named function `(rng) => q({...})`. Name it for what it asks (`easyAddLike`,
`hardTangentLine`): the name appears in validator output.

```js
function mediumBothSides(rng) {
  const a = rng.nonzero(-9, 9);
  /* … choose numbers so the answer is clean … */
  return q({
    prompt: R`Solve for \(x\): \(\;${linear(a, b)} = ${linear(c, d)}\)`,
    correct: x,                                  // a number, a Frac, or a rich-text string
    fmt: (v) => R`\(x = ${num(v)}\)`,            // optional: how to show numeric choices
    unit: 'cm',                                  // optional: text after numeric choices
    wrong: [                                     // most instructive first; first 3 usable ones are used
      { value: tryFrac(d - b, a + c), why: 'When a term crosses the equals sign its sign changes.' },
      -x,
      frac(d - b, a),
    ],
    solution: ['Step one…', 'Step two…', R`So \(x = ${x}\).`],
    rule: 3,                                     // index of the rule in explain.rules to show again
    skill: 'variables on both sides',            // short tag, used to report weak areas
    visual: { /* optional picture shown with the question */ },
    check: () => checkRoots((t) => a * t + b - (c * t + d), [x]),
  });
}
```

What `q()` does for you: puts the correct answer first (the engine shuffles later), drops wrong
answers that repeat or that have the **same value** as another choice (2/6 and 1/3), and tops up
numeric answers with nearby numbers if fewer than three wrong answers survive. For answers that are
strings it cannot top up, so supply four or five candidates. It throws if it cannot reach four
distinct choices, and the validator reports that.

### Wrong answers

- Each wrong answer should be what a real mistake produces: adding denominators, forgetting to
  distribute, dropping a sign, stopping a step early, using the wrong formula. Put those first.
- Give the one or two most telling ones a note: `{ value, why: 'one kind sentence about the slip' }`.
  The note is shown only to a student who picks that answer.
- No wrong answer may equal the right one in another form (`2x + 4` vs `2(x + 2)`, `0.5` vs `1/2`).
  The validator catches numeric duplicates; you must catch symbolic ones.
- Do not use "all of the above", "none of the above" or joke answers. Keep all four choices in the
  same form and of similar length.

### Solutions

`solution` is the worked answer for **this** question: 2–5 short steps, each one saying what was
done and showing the result, ending with the answer. After a wrong answer the student sees the rule
named by `rule`, then these steps. Write them so a student who got it wrong can follow.

### The four tiers

| Tier | What it asks for |
| --- | --- |
| Easy | One idea, one or two steps, friendly numbers. Recognising or applying a rule directly. |
| Medium | The standard procedure with ordinary numbers; two or three steps; simple word problems. |
| Hard | Several steps or two rules together; awkward numbers (negatives, fractions); word problems that need setting up. |
| Challenge | Non-routine: work backwards, find a missing value, compare methods, spot the error, combine with an earlier idea, multi-step applications. |

A student moves up after three correct answers in a row, so each tier should feel like a step, not a cliff.
Mix question types inside a tier and include word problems in at least two tiers.

### Enough variety

A quiz never repeats a question, and a student may answer many questions in one tier. The validator
requires at least 30 different questions per tier and warns below 80. Generators built on random
numbers reach hundreds easily; a small bank of fixed conceptual questions is fine alongside them.

### Checks

`check` is an independent test of the answer, run only by the validator (hundreds of random
questions per generator). Attach one wherever the answer can be confirmed a second way:

- equations: substitute the solution, `checkRoots(f, [x])`
- derivatives, antiderivatives, integrals, limits: `checkDeriv`, `checkAntideriv`, `checkIntegral`, `checkLimit`
- simplifications and identities: `checkSame(original, simplified)`
- anything else: `() => (condition ? true : 'what went wrong')`

Do not "check" an answer by repeating the same formula that produced it; test it against the definition.

## Interactive models

The student types numbers and the steps, the answer and the picture update as they type.

- `inputs`: 1–6 of them. `type` is `int`, `number` (give a `step`) or `select`. `min`, `max` and a
  default `value` are required; the default must produce a real answer.
- `compute(values)` receives numbers already checked against `min`/`max` (whole numbers for `int`).
  It returns `{ problem, steps, answer, visual, note }` (only `steps` and `answer` are required), or
  `{ error }` with a friendly sentence that says what to change ("The bottom number cannot be 0…").
- It must never throw, for any allowed input. The validator tries the defaults, all minimums, all
  maximums and 80 random combinations.
- Show the same reasoning the lesson teaches, with the student's numbers in every step.
- A word-problem model (`word: true`) returns the story, with their numbers, as `problem`.

## Pictures

A visual is a plain object. Labels inside pictures are plain text with Unicode symbols
(`x²`, `√2`, `π`, `60°`, `½`), not LaTeX. Every visual accepts `alt`, a sentence for screen-reader
users; `plot` requires it. Colours are `'a'` blue, `'b'` orange, `'c'` green, `'d'` purple.

| type | fields |
| --- | --- |
| `numberLine` | `min`, `max`, `step?`, `labels?: [{ value, text }]`, `points?: [{ value, label?, open?, color? }]`, `jumps?: [{ from, to, label? }]`, `ray?: { from, dir: 'left'/'right', open? }`, `segment?: { from, to, openFrom?, openTo? }` |
| `counters` | `groups: [n or { count, color? }]`, `crossed?` (how many of the last ones are crossed out), `frame?: true` for ten-frames. At most 120. |
| `baseTen` | `value` (0–9999): thousands, hundreds, tens and ones blocks |
| `array` | `rows`, `cols` (1–12), `style?: 'squares'`, `split?: { cols: k }` or `{ rows: k }`, `labels?: false` |
| `fractionBars` | `bars: [{ n, d, label?, color? }]` (up to 6 wholes) |
| `barModel` | tape diagram: `rows: [{ label?, parts: [{ value, label?, shade? }], total? }]` (`shade: 'none'` for an empty part) |
| `areaModel` | `rows: ['20', '3']`, `cols: ['10', '4']`, `cells?: [['200', '80'], ['30', '12']]` |
| `plot` | `x: [min, max]`, `y: [min, max]`, `alt` (required), `step?: [sx, sy]`, `square?`, `piTicks?`, `axisLabels?: ['t', 'h']`, `fns?: [{ f, color?, dashed?, domain?, label?, labelAt? }]`, `param?: [{ x, y, t: [a, b] }]`, `points?: [{ x, y, label?, open?, color? }]`, `segments?: [{ from, to, arrow?, dashed?, label?, color? }]`, `vlines?: [{ x }]`, `hlines?: [{ y }]`, `shade?: [{ f, g?, from, to, color? }]`, `rects?: [{ x, w, h, y? }]`, `polygons?: [{ points, color? }]` |
| `polygon` | `points: [[x, y], …]` (y up; scaled to fit), `sides?` (label for edge i → i+1), `angles?`, `vertices?`, `right?: [vertex indexes]`, `marks?` (tick marks per edge), `extra?: [{ from, to, label?, dashed? }]` (heights, diagonals), `grid?: true`, `fill?` |
| `circle` | `radius?`, `diameter?` (a label, or `true` to just draw it), `sector?` / `central?: { start, end, label?, arcLabel? }` (degrees, counter-clockwise from 3 o'clock), `inscribed?: { vertex, start, end, label? }`, `points?: [{ deg, label }]`, `center?: 'O'` |
| `angle` | `rays: [deg or { deg, label }]`, `lines?: true` (rays extend both ways), `arcs: [{ from, to, label? }]` (a 90° arc is drawn as a square), `center?: [x, y]` |
| `transversal` | two parallel lines and a transversal; `labels: { 1: '65°', 6: 'x' }`. Positions: top crossing 1 upper-left, 2 upper-right, 3 lower-left, 4 lower-right; bottom crossing 5, 6, 7, 8 in the same pattern. |
| `solid` | `kind: 'box'/'cube'/'cylinder'/'cone'/'sphere'/'pyramid'/'triPrism'`, `labels: { l, w, h, s, r, d, slant, b }` (whichever apply; drawn schematically, not to scale) |
| `clock` | `hour`, `minute` |
| `barChart` | `bars: [{ label, value }]`, `yLabel?`, `xLabel?`, `step?` |
| `dotPlot` | `values: [whole numbers]`, `label?` |
| `table` | `headers?`, `rows: [[…]]`, `caption?`, `rowHeaders?`. Cells are rich text, so LaTeX is allowed here. |

A visual may also be an array of visuals. Use pictures where they carry the idea (ten-frames for
making ten, number lines for negatives, tape diagrams for ratios, graphs for functions); skip them
where they would only decorate.

## Teaching guidelines

These come from the research summarised in `docs/pedagogy-and-standards.md`.

- **Explain first, in plain language.** State each rule as something to do, then show it once.
  Use the correct mathematical words and define them in `vocab`.
- **Examples before practice.** Each example is fully worked, one decision per step. Cover the
  variations the quiz will ask for.
- **Word problems by structure, never by keyword.** Say what is happening in the story (two parts put
  together, an amount compared with another, equal groups, a rate over time) and let that choose the
  operation. Do not teach "altogether means add". Draw the matching tape diagram, number line or array
  when it helps.
- **Concrete, then pictures, then symbols.** In the early grades start from objects and pictures;
  in later courses start from a graph or a numeric case before the general formula.
- **Name common mistakes kindly** in `mistakes` and in `why` notes: describe the slip and the fix,
  never the student.
- **No praise or scolding in content.** The app adds encouragement itself. Content states maths.
- **Match the reader.**
  - Grades 1–5: short sentences (aim for 12 words or fewer; 10 for grade 1–2 material), everyday
    words, one idea per sentence. These lessons can be read aloud by the app.
  - Grades 6–8: plain and direct.
  - Algebra 1 to Precalculus: matter-of-fact; do not talk down.
  - Calculus: concise and precise.
- **Stories for everyone.** Use `person(rng)` for names and never use pronouns for a named person
  (repeat the name or rephrase). Vary the settings; keep them ordinary and kind.

## Checking your work

```bash
npm run validate -- <level>/<topic>          # must end with 0 errors; read every warning
npm run sample -- <level>/<topic> --models   # print real questions; read them
```

The validator renders every string with the real math renderer, runs each generator 150 times,
runs every `check`, draws every picture and fuzzes every model. It cannot tell whether a formula is
the right one, whether two symbolic choices are secretly equal, or whether a sentence reads well.
So read the sample output for every generator and, for a few questions in each, work the answer out
independently. Look for: a right answer that is wrong, numbers run together, `+ -`, unsimplified
answers, a "wrong" choice that is also right, steps that skip the hard part, and anything a student
of that age could not read.

Checklist before a topic is done:

- [ ] `npm run validate` reports 0 errors for it, and each warning is fixed or understood
- [ ] every generator's sample output read; answers spot-checked by hand or with a second method
- [ ] rules, examples, a model with typed-in numbers, and four tiers are all present
- [ ] at least one worked example and (where it fits) one model is a word problem
- [ ] `standards` lists the codes the topic really covers
- [ ] the topic is listed in the level's `index.js`
