import { R, q, frac, terms, power, num, checkIntegral, checkEqual, integrate } from '../../lib/index.js';
import { M, K, N, exactChoices, fterms } from './_shared.js';

const piK = (c) => K([[c, '\\pi']]);
const PI = Math.PI;

// A plot of the region between two curves on [a, b], with an optional dashed axis of rotation.
function regionPlot(top, bottom, a, b, { alt, pad = 0.5, hline, vline }) {
  const ys = [hline ?? 0];
  for (let i = 0; i <= 40; i++) {
    const x = a + ((b - a) * i) / 40;
    ys.push(top(x), bottom(x));
  }
  const lo = Math.min(0, ...ys);
  const hi = Math.max(0, ...ys);
  const m = 0.1 * (hi - lo || 1);
  const xs = [a - pad, b + pad, vline ?? a];
  return {
    type: 'plot',
    x: [Math.min(...xs) - (vline != null ? 0.3 : 0), Math.max(...xs) + (vline != null ? 0.3 : 0)],
    y: [lo - m, hi + m],
    fns: [{ f: top, domain: [a, b] }, { f: bottom, color: 'b', domain: [a, b] }],
    shade: [{ f: top, g: bottom, from: a, to: b }],
    hlines: hline != null ? [{ y: hline }] : undefined,
    vlines: vline != null ? [{ x: vline }] : undefined,
    alt,
  };
}

// ───────────── Easy ─────────────

function easyDisc(rng) {
  const isRoot = rng.bool();
  const k = isRoot ? rng.int(1, 4) : rng.int(1, 3);
  const b = isRoot ? rng.int(1, 6) : rng.int(1, 4);
  const f = isRoot ? terms([[k, '\\sqrt{x}']]) : terms([[k, 'x']]);
  const fJs = isRoot ? (x) => k * Math.sqrt(x) : (x) => k * x;
  const sq = isRoot ? terms([[k * k, 'x']]) : terms([[k * k, 'x^{2}']]);
  const c = isRoot ? frac(k * k * b * b, 2) : frac(k * k * b ** 3, 3);
  const right = piK(c);
  return q({
    prompt: R`The region under \(y = ${f}\) from \(x = 0\) to \(x = ${b}\) is revolved about the \(x\)-axis. Find the volume of the solid.`,
    ...exactChoices(right, [
      { k: N(c), why: R`Each slice is a disc of area \(\pi r^{2}\). The factor \(\pi\) is missing.` },
      { k: piK(isRoot ? k * k * b : k * k * b * b), why: R`\(\pi r^{2}\) still has to be integrated from 0 to \(${b}\).` },
      k > 1 ? { k: piK(c.div(k)), why: R`Square the whole radius: \((${f})^{2} = ${sq}\).` } : null,
      piK(c.mul(2)),
      piK(isRoot ? frac(k * k * b ** 3, 3) : frac(k * k * b * b, 2)),
    ]),
    solution: [
      R`A slice perpendicular to the \(x\)-axis is a disc with radius \(r = ${f}\).`,
      R`\(V = \displaystyle\int_{0}^{${b}} \pi r^{2}\,dx = \pi\int_{0}^{${b}} ${sq}\,dx\).`,
      R`\(V = ${right.tex}\).`,
    ],
    rule: 1,
    skill: 'disc method',
    check: () => checkIntegral((x) => PI * fJs(x) ** 2, 0, b, right.value),
  });
}

function easyCrossSection(rng) {
  const k = rng.int(1, 4);
  const b = rng.int(1, 6);
  const shape = rng.pick(['square', 'semi', 'tri']);
  const I = frac(k * k * b * b, 2); // ∫ s² dx with s = k√x
  const s = terms([[k, '\\sqrt{x}']]);
  const s2 = terms([[k * k, 'x']]);
  const set = {
    square: {
      name: 'squares with side length', area: R`s^{2}`, right: N(I), factor: 1,
      wrongs: [{ k: piK(I), why: R`These cross-sections are squares, not discs. The area of a slice is \(s^{2}\), with no \(\pi\).` }, { k: N(I.mul(2)), why: R`\(\int_{0}^{${b}} x\,dx = \frac{${b * b}}{2}\). Keep the \(\frac{1}{2}\).` }, N(I.div(2)), N(frac(k * b * b, 2).add(k > 1 ? 0 : 1)), N(I.add(b))],
    },
    semi: {
      name: 'semicircles with diameter', area: R`\frac{1}{2}\pi\left(\frac{s}{2}\right)^{2} = \frac{\pi s^{2}}{8}`, right: piK(I.div(8)), factor: PI / 8,
      wrongs: [{ k: piK(I.div(2)), why: R`\(s\) is the diameter, so the radius is \(\frac{s}{2}\) and a semicircle has area \(\frac{1}{2}\pi\left(\frac{s}{2}\right)^{2}\).` }, { k: piK(I.div(4)), why: R`That uses full circles. A semicircle is half of a circle.` }, N(I.div(8)), piK(I), piK(I.div(16))],
    },
    tri: {
      name: 'equilateral triangles with side length', area: R`\frac{\sqrt{3}}{4}s^{2}`, right: K([[I.div(4), '\\sqrt{3}']]), factor: Math.sqrt(3) / 4,
      wrongs: [{ k: N(I.div(2)), why: R`\(\frac{1}{2}s\cdot s\) would be a right triangle. An equilateral triangle has height \(\frac{\sqrt{3}}{2}s\), so its area is \(\frac{\sqrt{3}}{4}s^{2}\).` }, { k: K([[I.div(2), '\\sqrt{3}']]), why: R`Area \(= \frac{1}{2}\cdot s\cdot\frac{\sqrt{3}}{2}s = \frac{\sqrt{3}}{4}s^{2}\).` }, K([[I, '\\sqrt{3}']]), N(I.div(4)), K([[I.div(8), '\\sqrt{3}']])],
    },
  }[shape];
  return q({
    prompt: R`A solid lies along the \(x\)-axis from \(x = 0\) to \(x = ${b}\). Its cross-sections perpendicular to the \(x\)-axis are ${set.name} \(s(x) = ${s}\). Find its volume.`,
    ...exactChoices(set.right, set.wrongs),
    solution: [
      R`Volume \(= \displaystyle\int_{0}^{${b}} A(x)\,dx\), where \(A(x)\) is the area of the cross-section at \(x\).`,
      R`Here \(A = ${set.area}\) with \(s^{2} = ${s2}\).`,
      R`\(\displaystyle\int_{0}^{${b}} ${s2}\,dx = ${I.tex()}\), so \(V = ${set.right.tex}\).`,
    ],
    rule: 0,
    skill: 'known cross-sections',
    check: () => checkIntegral((x) => set.factor * k * k * x, 0, b, set.right.value),
  });
}

function easyWasherSetup(rng) {
  const c = rng.int(2, 6);
  const top = rng.pick([{ tex: `x + ${c}`, sq: `(x + ${c})^{2}`, js: (x) => x + c, name: `y = x + ${c}` }, { tex: `${c}`, sq: `${c * c}`, js: () => c, name: `y = ${c}` }]);
  const bottom = rng.pick([{ tex: 'x^{2}', sq: 'x^{4}', js: (x) => x * x, name: 'y = x²' }, { tex: 'x^{3}', sq: 'x^{6}', js: (x) => x ** 3, name: 'y = x³' }, { tex: '\\sqrt{x}', sq: 'x', js: Math.sqrt, name: 'y = √x' }]);
  const I = (body, pi = true) => M(R`\displaystyle${pi ? '\\pi' : ''}\int_{0}^{1} ${body}\,dx`);
  const paren = (t) => (t.includes(' ') ? `(${t})` : t);
  return q({
    prompt: R`The region between \(y = ${top.tex}\) and \(y = ${bottom.tex}\) for \(0 \le x \le 1\) is revolved about the \(x\)-axis. Which integral gives the volume?`,
    visual: regionPlot(top.js, bottom.js, 0, 1, { alt: `The region between ${top.name} (upper curve) and ${bottom.name} (lower curve) from x = 0 to x = 1, shaded. It will be revolved about the x-axis.`, pad: 0.3 }),
    correct: I(R`\left[${top.sq} - ${bottom.sq}\right]`),
    wrong: [
      { value: I(R`\left[${paren(top.tex)} - ${bottom.tex}\right]^{2}`), why: R`A washer has area \(\pi R^{2} - \pi r^{2}\). That is not the same as \(\pi(R - r)^{2}\).` },
      { value: I(R`\left[${paren(top.tex)} - ${bottom.tex}\right]`, false), why: 'That is the area of the flat region. Revolving it sweeps out washers.' },
      { value: I(R`\left[${top.sq} + ${bottom.sq}\right]`), why: 'The hole is removed, so the inner disc is subtracted.' },
    ],
    solution: [
      R`A slice perpendicular to the \(x\)-axis is a washer. Outer radius \(R = ${top.tex}\) (the curve farther from the axis), inner radius \(r = ${bottom.tex}\).`,
      R`Area of the washer: \(\pi R^{2} - \pi r^{2} = \pi\left[${top.sq} - ${bottom.sq}\right]\).`,
      R`\(V = \displaystyle\pi\int_{0}^{1} \left[${top.sq} - ${bottom.sq}\right]dx\).`,
    ],
    rule: 2,
    skill: 'washer method',
    check: () => ([0.1, 0.5, 0.9].every((x) => top.js(x) > bottom.js(x) && bottom.js(x) >= 0) ? true : 'outer and inner radii are in the wrong order'),
  });
}

// ───────────── Medium ─────────────

function mediumWasher(rng) {
  const a = rng.int(1, 4);
  if (rng.bool(0.7)) {
    const b = rng.int(1, 2);
    const L = frac(a, b);
    const c = frac(2 * a ** 5, 15 * b ** 3);
    const right = piK(c);
    const line = terms([[a, 'x']]);
    const par = terms([[b, 'x^{2}']]);
    return q({
      prompt: R`The region enclosed by \(y = ${line}\) and \(y = ${par}\) is revolved about the \(x\)-axis. Find the volume of the solid.`,
      visual: regionPlot((x) => a * x, (x) => b * x * x, 0, L.value, { alt: `The line y = ${a}x and the parabola y = ${b}x² meet at x = 0 and x = ${L.text()}. The region between them is shaded, with the line on top.`, pad: 0.25 }),
      ...exactChoices(right, [
        { k: piK(frac(a ** 5, 30 * b ** 3)), why: R`A washer has area \(\pi(R^{2} - r^{2})\), not \(\pi(R - r)^{2}\).` },
        { k: N(frac(a ** 3, 6 * b * b)), why: 'That is the area of the flat region. The volume integrates the areas of washers.' },
        piK(frac(a ** 5, 3 * b ** 3)),
        piK(c.mul(2)),
        piK(frac(a ** 5, 15 * b ** 3)),
      ]),
      solution: [
        R`The curves meet where \(${line} = ${par}\): at \(x = 0\) and \(x = ${L.tex()}\). The line is on top.`,
        R`Washers: \(R = ${line}\), \(r = ${par}\). \(V = \pi\displaystyle\int_{0}^{${L.tex()}} \left(${terms([[a * a, 'x^{2}'], [-b * b, 'x^{4}']])}\right)dx\).`,
        R`\(V = \pi\Big[${terms([[frac(a * a, 3), 'x^{3}'], [frac(-b * b, 5), 'x^{5}']])}\Big]_{0}^{${L.tex()}} = ${right.tex}\).`,
      ],
      rule: 2,
      skill: 'washer method',
      check: () => checkIntegral((x) => PI * ((a * x) ** 2 - (b * x * x) ** 2), 0, L.value, right.value),
    });
  }
  const c = frac(a ** 4, 6);
  const right = piK(c);
  const line = a === 1 ? 'x' : R`\dfrac{x}{${a}}`;
  return q({
    prompt: R`The region enclosed by \(y = \sqrt{x}\) and \(y = ${line}\) is revolved about the \(x\)-axis. Find the volume of the solid.`,
    visual: regionPlot(Math.sqrt, (x) => x / a, 0, a * a, { alt: `The curve y = √x and the line y = x/${a} meet at x = 0 and x = ${a * a}. The region between them is shaded, with the square-root curve on top.`, pad: 0.4 }),
    ...exactChoices(right, [
      { k: piK(frac(a ** 4, 30)), why: R`A washer has area \(\pi(R^{2} - r^{2})\), not \(\pi(R - r)^{2}\).` },
      { k: N(frac(a ** 3, 6)), why: 'That is the area of the flat region. The volume integrates the areas of washers.' },
      piK(frac(a ** 4, 2)),
      piK(frac(a ** 4, 3)),
      piK(c.mul(5)),
    ]),
    solution: [
      R`The curves meet where \(\sqrt{x} = ${line}\): at \(x = 0\) and \(x = ${a * a}\). The square-root curve is on top.`,
      R`Washers: \(R = \sqrt{x}\), \(r = ${line}\). \(V = \pi\displaystyle\int_{0}^{${a * a}} \left(x - \frac{x^{2}}{${a * a}}\right)dx\).`,
      R`\(V = \pi\left(\frac{${a ** 4}}{2} - \frac{${a ** 4}}{3}\right) = ${right.tex}\).`,
    ],
    rule: 2,
    skill: 'washer method',
    check: () => checkIntegral((x) => PI * (x - (x / a) ** 2), 0, a * a, right.value),
  });
}

function mediumShells(rng) {
  const k = rng.int(1, 4);
  const b = rng.int(1, 3);
  if (rng.bool(0.7)) {
    const n = rng.int(1, 3);
    const f = terms([[k, power('x', n)]]);
    const c = frac(2 * k * b ** (n + 2), n + 2);
    const right = piK(c);
    return q({
      prompt: R`The region under \(y = ${f}\) from \(x = 0\) to \(x = ${b}\) is revolved about the \(y\)-axis. Use cylindrical shells to find the volume.`,
      ...exactChoices(right, [
        { k: piK(frac(k * k * b ** (2 * n + 1), 2 * n + 1)), why: R`That is the disc formula for revolving about the \(x\)-axis. About the \(y\)-axis, a vertical strip sweeps out a shell.` },
        { k: piK(frac(2 * k * b ** (n + 1), n + 1)), why: R`A shell has circumference \(2\pi x\). The radius \(x\) is missing from the integrand.` },
        { k: piK(c.div(2)), why: R`The circumference of a shell is \(2\pi r\), not \(\pi r\).` },
        piK(c.mul(2)),
        N(c),
      ]),
      solution: [
        R`A thin vertical strip at \(x\) has height \(${f}\). Revolved about the \(y\)-axis it becomes a shell of radius \(x\).`,
        R`\(V = \displaystyle\int_{0}^{${b}} 2\pi(\text{radius})(\text{height})\,dx = 2\pi\int_{0}^{${b}} x\cdot ${f}\,dx = 2\pi\int_{0}^{${b}} ${terms([[k, power('x', n + 1)]])}\,dx\).`,
        R`\(V = ${right.tex}\).`,
      ],
      rule: 4,
      skill: 'cylindrical shells',
      check: () => checkIntegral((x) => 2 * PI * x * k * x ** n, 0, b, right.value),
    });
  }
  const w = b + 1;
  const f = terms([[k * w, 'x'], [-k, 'x^{2}']]);
  const c = frac(k * w ** 4, 6);
  const right = piK(c);
  return q({
    prompt: R`The region between \(y = ${f}\) and the \(x\)-axis is revolved about the \(y\)-axis. Use cylindrical shells to find the volume.`,
    ...exactChoices(right, [
      { k: piK(frac(k * w ** 3, 3)), why: R`A shell has circumference \(2\pi x\). The radius \(x\) is missing from the integrand.` },
      { k: piK(c.div(2)), why: R`The circumference of a shell is \(2\pi r\), not \(\pi r\).` },
      piK(frac(k * k * w ** 5, 30)),
      piK(c.mul(2)),
      N(c),
    ]),
    solution: [
      R`The curve meets the \(x\)-axis where \(${terms([[k, 'x']])}(${w} - x) = 0\): at \(x = 0\) and \(x = ${w}\).`,
      R`Shells: radius \(x\), height \(${f}\). \(V = 2\pi\displaystyle\int_{0}^{${w}} x\left(${f}\right)dx = 2\pi\int_{0}^{${w}} \left(${terms([[k * w, 'x^{2}'], [-k, 'x^{3}']])}\right)dx\).`,
      R`\(V = 2\pi\left(${frac(k * w ** 4, 3).tex()} - ${frac(k * w ** 4, 4).tex()}\right) = ${right.tex}\).`,
    ],
    rule: 4,
    skill: 'cylindrical shells',
    check: () => checkIntegral((x) => 2 * PI * x * (k * w * x - k * x * x), 0, w, right.value),
  });
}

function mediumWordVase(rng) {
  const k = rng.int(1, 4);
  const h = rng.int(2, 10);
  const c = frac(k * k * h * h, 2);
  const right = piK(c);
  const cm3 = (tex) => R`\(${tex}\) cm³`;
  const f = terms([[k, '\\sqrt{x}']]);
  return q({
    prompt: R`A potter models the inside of a vase by revolving the curve \(y = ${f}\), for \(0 \le x \le ${h}\) (in centimeters), about the \(x\)-axis. How much water can the vase hold?`,
    ...exactChoices(
      right,
      [
        { k: N(c), why: R`Each slice of water is a disc of area \(\pi r^{2}\). The factor \(\pi\) is missing.` },
        { k: piK(k * k * h), why: R`That is the area of the widest disc, \(\pi r^{2}\) at \(x = ${h}\). Integrate the disc areas from 0 to \(${h}\).` },
        k > 1 ? { k: piK(frac(k * h * h, 2)), why: R`Square the whole radius: \((${f})^{2} = ${terms([[k * k, 'x']])}\).` } : null,
        piK(c.mul(2)),
        piK(frac(k * k * h ** 3, 3)),
      ],
      cm3,
    ),
    solution: [
      R`The water fills the solid of revolution. A slice at \(x\) is a disc of radius \(${f}\) cm.`,
      R`\(V = \pi\displaystyle\int_{0}^{${h}} (${f})^{2}\,dx = \pi\int_{0}^{${h}} ${terms([[k * k, 'x']])}\,dx = \pi\Big[${terms([[frac(k * k, 2), 'x^{2}']])}\Big]_{0}^{${h}}\).`,
      R`\(V = ${right.tex}\) cm³, about \(${num(right.value, { places: 0 })}\) milliliters.`,
    ],
    rule: 1,
    skill: 'disc method',
    check: () => checkIntegral((x) => PI * k * k * x, 0, h, right.value),
  });
}

// ───────────── Hard ─────────────

function hardOtherAxis(rng) {
  const b = rng.int(1, 3);
  const k = rng.int(1, 4);
  const region = R`The region under \(y = x^{2}\) from \(x = 0\) to \(x = ${b}\)`;
  const sq = (x) => x * x;
  if (rng.bool()) {
    const c = frac(b ** 5, 5).add(frac(2 * k * b ** 3, 3));
    const right = piK(c);
    return q({
      prompt: R`${region} is revolved about the line \(y = ${-k}\). Find the volume of the solid.`,
      visual: regionPlot(sq, () => 0, 0, b, { hline: -k, alt: `The region under the parabola y = x² from x = 0 to x = ${b}, shaded, with the horizontal line y = ${-k} drawn below it as the axis of rotation.` }),
      ...exactChoices(right, [
        { k: piK(frac(b ** 5, 5)), why: R`That revolves the region about the \(x\)-axis. Here every radius is measured from the line \(y = ${-k}\).` },
        { k: piK(c.add(k * k * b)), why: R`The solid has a hole. Subtract the inner disc of radius \(${k}\).` },
        { k: piK(frac(b ** 5, 5).add(frac(k * b ** 3, 3))), why: R`\((x^{2} + ${k})^{2} = x^{4} + ${2 * k}x^{2} + ${k * k}\). The middle term has a factor 2.` },
        piK(c.mul(2)),
        piK(frac(2 * k * b ** 3, 3)),
      ]),
      solution: [
        R`Measure radii from the axis \(y = ${-k}\). Outer radius: \(R = x^{2} + ${k}\). Inner radius: \(r = ${k}\) (from the axis up to the \(x\)-axis).`,
        R`\(V = \pi\displaystyle\int_{0}^{${b}} \left[(x^{2} + ${k})^{2} - ${k * k}\right]dx = \pi\int_{0}^{${b}} \left(x^{4} + ${2 * k}x^{2}\right)dx\).`,
        R`\(V = \pi\left(${frac(b ** 5, 5).tex()} + ${frac(2 * k * b ** 3, 3).tex()}\right) = ${right.tex}\).`,
      ],
      rule: 3,
      skill: 'revolving about another line',
      check: () => checkIntegral((x) => PI * ((x * x + k) ** 2 - k * k), 0, b, right.value),
    });
  }
  const ax = b + k;
  const c = frac(2 * ax * b ** 3, 3).sub(frac(b ** 4, 2));
  const right = piK(c);
  return q({
    prompt: R`${region} is revolved about the line \(x = ${ax}\). Find the volume of the solid.`,
    visual: regionPlot(sq, () => 0, 0, b, { vline: ax, alt: `The region under the parabola y = x² from x = 0 to x = ${b}, shaded, with the vertical line x = ${ax} drawn to its right as the axis of rotation.` }),
    ...exactChoices(right, [
      { k: piK(frac(b ** 4, 2)), why: R`That revolves the region about the \(y\)-axis. Here the shell radius is the distance to the line \(x = ${ax}\), which is \(${ax} - x\).` },
      { k: piK(frac(2 * ax * b ** 3, 3).add(frac(b ** 4, 2))), why: R`The strip at \(x\) is \(${ax} - x\) away from the axis, not \(${ax} + x\).` },
      { k: piK(c.div(2)), why: R`The circumference of a shell is \(2\pi r\), not \(\pi r\).` },
      piK(frac(b ** 5, 5)),
      piK(frac(2 * ax * b ** 3, 3)),
    ]),
    solution: [
      R`The axis is vertical, so use shells with vertical strips. A strip at \(x\) has height \(x^{2}\) and is \(${ax} - x\) from the axis.`,
      R`\(V = 2\pi\displaystyle\int_{0}^{${b}} (${ax} - x)\,x^{2}\,dx = 2\pi\int_{0}^{${b}} \left(${ax}x^{2} - x^{3}\right)dx\).`,
      R`\(V = 2\pi\left(${frac(ax * b ** 3, 3).tex()} - ${frac(b ** 4, 4).tex()}\right) = ${right.tex}\).`,
    ],
    rule: 3,
    skill: 'revolving about another line',
    check: () => checkIntegral((x) => 2 * PI * (ax - x) * x * x, 0, b, right.value),
  });
}

function hardArcLength(rng) {
  const HEIGHT = 'That is only the change in height. Arc length adds up the lengths of tiny slanted pieces.';
  const RUN = R`That is only the horizontal distance. A curve from \(x = a\) to \(x = b\) is longer than \(b - a\) unless it is flat.`;
  const fam = rng.pick(['a1', 'a2', 'a3', 'a4', 'line']);
  let it;
  if (fam === 'a1' || fam === 'a4') {
    const four = fam === 'a4';
    const b = rng.pick(four ? [2, 6, 12] : [3, 8, 15]);
    const B = four ? 1 + 4 * b : 1 + b;
    const root = Math.round(Math.sqrt(B));
    const value = four ? frac(root ** 3 - 1, 6) : frac(2 * (root ** 3 - 1), 3);
    const inner = four ? '1 + 4x' : '1 + x';
    it = {
      curve: four ? R`y = \frac{4}{3}x^{3/2}` : R`y = \frac{2}{3}x^{3/2}`, a: 0, b, d: four ? (x) => 2 * Math.sqrt(x) : Math.sqrt, right: N(value),
      wrongs: [
        { k: N(four ? frac(root ** 3, 6) : frac(2 * root ** 3, 3)), why: R`At \(x = 0\) the antiderivative is not 0: \((${inner})^{3/2} = 1\) there.` },
        { k: N(four ? b + 2 * b * b : frac(2 * b + b * b, 2)), why: R`The square root is missing: the integrand is \(\sqrt{${inner}}\), not \(${inner}\).` },
        { k: N(b), why: RUN },
        N(four ? frac(2 * (root ** 3 - 1), 3) : frac(root ** 3 - 1, 1)),
        N(value.add(1)),
      ],
      steps: [
        R`\(\dfrac{dy}{dx} = ${four ? '2' : ''}x^{1/2}\), so \(1 + \left(\dfrac{dy}{dx}\right)^{2} = ${inner}\).`,
        R`\(L = \displaystyle\int_{0}^{${b}} \sqrt{${inner}}\,dx = \Big[${four ? R`\tfrac{1}{6}` : R`\tfrac{2}{3}`}(${inner})^{3/2}\Big]_{0}^{${b}} = ${four ? R`\tfrac{1}{6}` : R`\tfrac{2}{3}`}\left(${root ** 3} - 1\right)\).`,
      ],
    };
  } else if (fam === 'a2') {
    const b = rng.int(2, 4);
    const value = frac(b ** 3, 6).sub(frac(1, 2 * b)).add(frac(1, 3));
    const rise = frac(b ** 3, 6).add(frac(1, 2 * b)).sub(frac(2, 3));
    it = {
      curve: R`y = \frac{x^{3}}{6} + \frac{1}{2x}`, a: 1, b, d: (x) => (x * x) / 2 - 1 / (2 * x * x), right: N(value),
      wrongs: [{ k: N(rise), why: HEIGHT }, { k: N(b - 1), why: RUN }, N(value.add(frac(1, 2))), N(value.mul(2)), N(frac(b ** 3, 6))],
      steps: [
        R`\(\dfrac{dy}{dx} = \dfrac{x^{2}}{2} - \dfrac{1}{2x^{2}}\), so \(1 + \left(\dfrac{dy}{dx}\right)^{2} = \dfrac{x^{4}}{4} + \dfrac{1}{2} + \dfrac{1}{4x^{4}} = \left(\dfrac{x^{2}}{2} + \dfrac{1}{2x^{2}}\right)^{2}\).`,
        R`\(L = \displaystyle\int_{1}^{${b}} \left(\frac{x^{2}}{2} + \frac{1}{2x^{2}}\right)dx = \Big[\frac{x^{3}}{6} - \frac{1}{2x}\Big]_{1}^{${b}}\).`,
      ],
    };
  } else if (fam === 'a3') {
    const b = rng.pick([2, 3, 5, 6, 7]);
    const c0 = frac(b * b - 1, 4);
    const ln = `\\ln ${b}`;
    const right = K([[c0, ''], [frac(1, 2), ln]]);
    it = {
      curve: R`y = \frac{x^{2}}{4} - \frac{\ln x}{2}`, a: 1, b, d: (x) => x / 2 - 1 / (2 * x), right,
      wrongs: [
        { k: K([[c0, ''], [frac(-1, 2), ln]]), why: R`After adding 1, the middle term changes sign: \(1 + \left(\frac{x}{2} - \frac{1}{2x}\right)^{2} = \left(\frac{x}{2} + \frac{1}{2x}\right)^{2}\). So the integrand is \(\frac{x}{2} + \frac{1}{2x}\).` },
        { k: N(b - 1), why: RUN },
        N(c0),
        K([[c0.mul(2), ''], [1, ln]]),
        K([[c0, ''], [1, ln]]),
      ],
      steps: [
        R`\(\dfrac{dy}{dx} = \dfrac{x}{2} - \dfrac{1}{2x}\), so \(1 + \left(\dfrac{dy}{dx}\right)^{2} = \dfrac{x^{2}}{4} + \dfrac{1}{2} + \dfrac{1}{4x^{2}} = \left(\dfrac{x}{2} + \dfrac{1}{2x}\right)^{2}\).`,
        R`\(L = \displaystyle\int_{1}^{${b}} \left(\frac{x}{2} + \frac{1}{2x}\right)dx = \Big[\frac{x^{2}}{4} + \frac{\ln x}{2}\Big]_{1}^{${b}}\).`,
      ],
    };
  } else {
    const [p, qq, hyp] = rng.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17]]);
    const w = rng.int(1, 3);
    const a = rng.int(0, 4);
    const c = rng.int(-5, 5);
    const b = a + qq * w;
    const slope = frac(p, qq);
    it = {
      curve: `y = ${terms([[slope, 'x'], [c, '']])}`, a, b, d: () => p / qq, right: N(hyp * w),
      wrongs: [{ k: N(qq * w), why: RUN }, { k: N(p * w), why: HEIGHT }, N((p + qq) * w), N(hyp * w + 1), N(hyp * w * 2)],
      steps: [
        R`\(\dfrac{dy}{dx} = ${slope.tex()}\), so \(\sqrt{1 + \left(\dfrac{dy}{dx}\right)^{2}} = \sqrt{${frac(p * p + qq * qq, qq * qq).tex()}} = ${frac(hyp, qq).tex()}\).`,
        R`\(L = \displaystyle\int_{${a}}^{${b}} ${frac(hyp, qq).tex()}\,dx = ${frac(hyp, qq).tex()}\cdot ${b - a}\). (This matches the distance formula for a line segment.)`,
      ],
    };
  }
  return q({
    prompt: R`Find the length of the curve \(${it.curve}\) from \(x = ${it.a}\) to \(x = ${it.b}\).`,
    ...exactChoices(it.right, it.wrongs),
    solution: [R`Arc length: \(L = \displaystyle\int_{a}^{b} \sqrt{1 + \left(\frac{dy}{dx}\right)^{2}}\,dx\).`, ...it.steps, R`\(L = ${it.right.tex}\).`],
    rule: 5,
    skill: 'arc length',
    check: () => checkIntegral((x) => Math.sqrt(1 + it.d(x) ** 2), it.a, it.b, it.right.value, 1e-4),
  });
}

function hardWordSculpture(rng) {
  const r = rng.int(1, 6);
  const J = frac(16 * r ** 3, 3); // ∫ s² dx over [−r, r], where s = 2√(r² − x²) is the chord
  const shape = rng.pick(['square', 'tri', 'semi', 'right']);
  const set = {
    square: { name: 'a square', area: R`s^{2}`, right: N(J), factor: 1, other: piK(J.div(8)), otherWhy: 'That uses semicircles. The cross-sections here are squares.' },
    tri: { name: 'an equilateral triangle', area: R`\frac{\sqrt{3}}{4}s^{2}`, right: K([[J.div(4), '\\sqrt{3}']]), factor: Math.sqrt(3) / 4, other: N(J.div(2)), otherWhy: R`An equilateral triangle with side \(s\) has height \(\frac{\sqrt{3}}{2}s\), so its area is \(\frac{\sqrt{3}}{4}s^{2}\), not \(\frac{1}{2}s^{2}\).` },
    semi: { name: 'a semicircle whose diameter lies in the base', area: R`\frac{1}{2}\pi\left(\frac{s}{2}\right)^{2} = \frac{\pi}{8}s^{2}`, right: piK(J.div(8)), factor: PI / 8, other: piK(J.div(2)), otherWhy: R`The chord is the diameter, so the radius is half of it.` },
    right: { name: 'an isosceles right triangle whose hypotenuse lies in the base', area: R`\frac{1}{4}s^{2}`, right: N(J.div(4)), factor: 1 / 4, other: N(J.div(2)), otherWhy: R`With hypotenuse \(s\), each leg is \(\frac{s}{\sqrt{2}}\), so the area is \(\frac{1}{2}\cdot\frac{s^{2}}{2} = \frac{s^{2}}{4}\).` },
  }[shape];
  const m3 = (tex) => R`\(${tex}\) m³`;
  const times = (c, f) => (shape === 'square' || shape === 'right' ? N((shape === 'square' ? J : J.div(4)).mul(f)) : shape === 'tri' ? K([[J.div(4).mul(f), '\\sqrt{3}']]) : piK(J.div(8).mul(f)));
  return q({
    prompt: R`A concrete sculpture has a circular base of radius ${r} m. Every cross-section perpendicular to one fixed diameter of the base is ${set.name}. How much concrete is needed?`,
    ...exactChoices(
      set.right,
      [
        { k: times(set.right, frac(1, 4)), why: R`The side \(s\) is the whole chord, \(2\sqrt{${r * r} - x^{2}}\), not half of it.` },
        { k: set.other, why: set.otherWhy },
        times(set.right, frac(1, 2)),
        times(set.right, 2),
        times(set.right, frac(3, 4)),
      ],
      m3,
    ),
    solution: [
      R`Put the diameter along the \(x\)-axis, so the base is \(x^{2} + y^{2} = ${r * r}\). At position \(x\) the chord across the base has length \(s = 2\sqrt{${r * r} - x^{2}}\).`,
      R`Each cross-section has area \(A = ${set.area}\), with \(s^{2} = 4(${r * r} - x^{2})\).`,
      R`\(\displaystyle\int_{${-r}}^{${r}} 4(${r * r} - x^{2})\,dx = ${J.tex()}\), so \(V = ${set.right.tex}\) m³, about \(${num(set.right.value, { places: 1 })}\) m³.`,
    ],
    rule: 0,
    skill: 'known cross-sections',
    check: () => checkIntegral((x) => set.factor * 4 * (r * r - x * x), -r, r, set.right.value),
  });
}

// ───────────── Challenge ─────────────

function challengeShellsShifted(rng) {
  const a = rng.int(1, 5);
  const m = rng.int(0, 2);
  const left = rng.bool();
  const axis = left ? -m : a + m;
  const radius = left ? (m === 0 ? 'x' : `x + ${m}`) : `${a + m} - x`;
  const c = frac(a ** 3 * (a + 2 * m), 6);
  const right = piK(c);
  const line = terms([[a, 'x']]);
  const axisName = axis === 0 ? R`the \(y\)-axis` : R`the line \(x = ${axis}\)`;
  return q({
    prompt: R`The region enclosed by \(y = ${line}\) and \(y = x^{2}\) is revolved about ${axisName}. Find the volume of the solid.`,
    visual: regionPlot((x) => a * x, (x) => x * x, 0, a, { vline: axis, alt: `The line y = ${a}x and the parabola y = x² meet at x = 0 and x = ${a}; the region between them is shaded. The vertical line x = ${axis} is the axis of rotation.`, pad: 0.3 }),
    ...exactChoices(right, [
      { k: piK(frac(2 * a ** 5, 15)), why: R`That is the volume when the region is revolved about the \(x\)-axis.` },
      { k: piK(frac(a ** 3, 3)), why: R`Each shell has circumference \(2\pi\cdot\text{radius}\). The radius factor is missing from the integrand.` },
      m > 0 ? { k: piK(frac(a ** 4, 6)), why: R`The radius of a shell is its distance from the axis: \(${radius}\), not \(${left ? 'x' : `${a} - x`}\).` } : null,
      piK(c.div(2)),
      piK(c.mul(2)),
      piK(frac(a ** 3 * (a + m), 6)),
    ]),
    solution: [
      R`The curves meet at \(x = 0\) and \(x = ${a}\), with the line on top. The axis is vertical, so use shells.`,
      R`A vertical strip at \(x\) has height \(${line} - x^{2}\) and is \(${radius}\) from the axis.`,
      R`\(V = 2\pi\displaystyle\int_{0}^{${a}} (${radius})(${line} - x^{2})\,dx = ${right.tex}\).`,
    ],
    rule: 4,
    skill: 'choosing a method',
    check: () => checkIntegral((x) => 2 * PI * Math.abs(x - axis) * (a * x - x * x), 0, a, right.value),
  });
}

function challengeFindLength(rng) {
  const k = rng.int(1, 4);
  const c = rng.int(2, 9);
  const V = piK(frac(k * k * c * c, 2));
  const f = terms([[k, '\\sqrt{x}']]);
  return q({
    prompt: R`The region under \(y = ${f}\) from \(x = 0\) to \(x = c\) is revolved about the \(x\)-axis. The solid has volume \(${V.tex}\). Find \(c\).`,
    correct: c,
    fmt: (v) => R`\(c = ${num(v)}\)`,
    wrong: [
      { value: c * c, why: R`That is \(c^{2}\). Take the square root.` },
      { value: frac(c * c, 2), why: R`The volume is \(${fterms([[frac(k * k, 2), '\\pi c^{2}']])}\). Solve for \(c^{2}\) first, then take the square root.` },
      2 * c,
      c + 1,
    ],
    solution: [
      R`Discs: \(V = \pi\displaystyle\int_{0}^{c} (${f})^{2}\,dx = \pi\int_{0}^{c} ${terms([[k * k, 'x']])}\,dx = ${fterms([[frac(k * k, 2), '\\pi c^{2}']])}\).`,
      R`Set \(${fterms([[frac(k * k, 2), '\\pi c^{2}']])} = ${V.tex}\): \(c^{2} = ${c * c}\).`,
      R`Since \(c > 0\), \(c = ${c}\).`,
    ],
    rule: 1,
    skill: 'working backwards',
    check: () => checkIntegral((x) => PI * k * k * x, 0, c, V.value),
  });
}

function challengeWordTorus(rng) {
  const Rr = rng.int(3, 9);
  const r = rng.int(1, Math.min(3, Rr - 1));
  const right = K([[2 * Rr * r * r, '\\pi^{2}']]);
  const cm3 = (tex) => R`\(${tex}\) cm³`;
  const root = `\\sqrt{${r * r} - y^{2}}`;
  return q({
    prompt: R`A solid rubber ring (a torus) is formed by revolving the disc \((x - ${Rr})^{2} + y^{2} \le ${r * r}\), measured in centimeters, about the \(y\)-axis. What is the volume of rubber?`,
    ...exactChoices(
      right,
      [
        { k: K([[4 * Rr * r * r, '\\pi^{2}']]), why: R`\(\displaystyle\int_{${-r}}^{${r}} \sqrt{${r * r} - y^{2}}\,dy\) is the area of a half disc, \(\frac{1}{2}\pi\cdot ${r * r}\), not of a whole disc.` },
        { k: K([[frac(4 * r ** 3, 3), '\\pi']]), why: 'That is the volume of a ball of the same radius. The ring is that disc swept around a large circle.' },
        K([[Rr * r * r, '\\pi^{2}']]),
        K([[2 * Rr * Rr * r, '\\pi^{2}']]),
        K([[2 * Rr * r * r, '\\pi']]),
      ],
      cm3,
    ),
    solution: [
      R`Slice horizontally. At height \(y\) the slice is a washer with outer radius \(R = ${Rr} + ${root}\) and inner radius \(r = ${Rr} - ${root}\).`,
      R`\(R^{2} - r^{2} = (R + r)(R - r) = ${2 * Rr}\cdot 2${root} = ${4 * Rr}${root}\).`,
      R`\(V = \pi\displaystyle\int_{${-r}}^{${r}} ${4 * Rr}${root}\,dy\). The integral of the root is the area of a half disc of radius ${r}: \(\frac{1}{2}\pi\cdot ${r * r}\).`,
      R`\(V = ${4 * Rr}\pi\cdot${frac(r * r, 2).tex()}\pi = ${right.tex}\) cm³, about \(${num(right.value, { places: 0 })}\) cm³.`,
    ],
    rule: 2,
    skill: 'choosing a method',
    check: () => checkIntegral((y) => PI * 4 * Rr * Math.sqrt(Math.max(0, r * r - y * y)), -r, r, right.value, 1e-3),
  });
}

// ───────────── Topic ─────────────

export default {
  id: 'volumes',
  title: 'Volumes & Arc Length',
  summary: 'Find volumes by slicing, discs, washers and cylindrical shells, and the length of a smooth curve.',
  standards: ['AP Calculus 8.7', 'AP Calculus 8.8', 'AP Calculus 8.9', 'AP Calculus 8.10', 'AP Calculus 8.11', 'AP Calculus 8.12', 'AP Calculus 8.13', 'OpenStax Calculus Vol. 2 §2.3'],

  explain: {
    intro: R`A volume is found the same way as an area: cut the solid into thin slices, write the volume of one slice, and integrate. For a solid of revolution the slices are discs, washers or cylindrical shells. The same slicing idea, applied to tiny straight pieces of a curve, gives its length.`,
    rules: [
      {
        title: 'Slicing: known cross-sections',
        text: R`If the cross-section perpendicular to the \(x\)-axis at \(x\) has area \(A(x)\), then \(V = \displaystyle\int_{a}^{b} A(x)\,dx\). Write the side \(s\) of the cross-section from the base, then its area: square \(s^{2}\); semicircle on diameter \(s\): \(\frac{\pi}{8}s^{2}\); equilateral triangle \(\frac{\sqrt{3}}{4}s^{2}\).`,
        example: R`Base under \(y = \sqrt{x}\), \(0 \le x \le 4\), with square cross-sections of side \(\sqrt{x}\): \(V = \displaystyle\int_{0}^{4} x\,dx = 8\).`,
      },
      {
        title: 'Discs',
        text: R`Revolving the region under \(y = f(x)\) about the \(x\)-axis gives slices that are discs of radius \(f(x)\): \(V = \pi\displaystyle\int_{a}^{b} [f(x)]^{2}\,dx\).`,
        example: R`\(y = \sqrt{x}\) on \([0, 4]\): \(V = \pi\displaystyle\int_{0}^{4} x\,dx = 8\pi\).`,
      },
      {
        title: 'Washers',
        text: R`If the region does not touch the axis, each slice is a washer: \(V = \pi\displaystyle\int_{a}^{b} \left(R^{2} - r^{2}\right)dx\), where \(R\) is the distance from the axis to the far curve and \(r\) the distance to the near curve. Square each radius separately.`,
        example: R`Between \(y = x\) and \(y = x^{2}\), about the \(x\)-axis: \(V = \pi\displaystyle\int_{0}^{1} (x^{2} - x^{4})\,dx = \frac{2\pi}{15}\).`,
      },
      {
        title: 'Revolving about other lines',
        text: R`Radii are always distances to the axis of rotation. About the horizontal line \(y = k\), a point at height \(y\) has radius \(|y - k|\). About the vertical line \(x = k\), a point at \(x\) has radius \(|x - k|\).`,
        example: R`The region under \(y = x^{2}\), \(0 \le x \le 1\), about \(y = -1\): \(R = x^{2} + 1\), \(r = 1\), so \(V = \pi\displaystyle\int_{0}^{1} \left[(x^{2} + 1)^{2} - 1\right]dx = \frac{13\pi}{15}\).`,
      },
      {
        title: 'Cylindrical shells',
        text: R`A thin strip parallel to the axis sweeps out a shell: \(V = \displaystyle\int_{a}^{b} 2\pi(\text{radius})(\text{height})\,dx\). About the \(y\)-axis the radius is \(x\). Choose shells when slices parallel to the axis are simpler than slices perpendicular to it.`,
        example: R`The region under \(y = x^{2}\), \(0 \le x \le 2\), about the \(y\)-axis: \(V = 2\pi\displaystyle\int_{0}^{2} x\cdot x^{2}\,dx = 8\pi\).`,
      },
      {
        title: 'Arc length',
        text: R`The length of the smooth curve \(y = f(x)\) from \(x = a\) to \(x = b\) is \(L = \displaystyle\int_{a}^{b} \sqrt{1 + \left(\frac{dy}{dx}\right)^{2}}\,dx\). Each tiny piece is the hypotenuse of a triangle with legs \(dx\) and \(dy\).`,
        example: R`\(y = \frac{2}{3}x^{3/2}\) on \([0, 3]\): \(\frac{dy}{dx} = \sqrt{x}\), so \(L = \displaystyle\int_{0}^{3} \sqrt{1 + x}\,dx = \frac{14}{3}\).`,
      },
    ],
    vocab: [
      { term: 'solid of revolution', def: 'The solid swept out when a flat region is revolved about a line (the axis of rotation).' },
      { term: 'cross-section', def: 'The flat shape you see when a solid is cut by a plane.' },
      { term: 'washer', def: R`A disc with a round hole: its area is \(\pi R^{2} - \pi r^{2}\).` },
      { term: 'cylindrical shell', def: R`A thin tube. Unrolled, it is a slab of length \(2\pi r\), height \(h\) and thickness \(dx\).` },
      { term: 'arc length', def: 'The length of a curve between two points.' },
    ],
    mistakes: [
      R`Writing \(\pi(R - r)^{2}\) for a washer. The area is \(\pi(R^{2} - r^{2})\).`,
      R`Measuring radii from the \(x\)-axis when the axis of rotation is another line.`,
      R`Leaving out the radius in a shell integral, or using \(\pi\) instead of \(2\pi\).`,
      R`Forgetting the square root, or the 1, in the arc length formula.`,
    ],
    visual: {
      type: 'plot',
      x: [-0.2, 1.4],
      y: [-0.2, 1.3],
      fns: [{ f: (x) => x, label: 'y = x', labelAt: 1.2 }, { f: (x) => x * x, color: 'b', label: 'y = x²', labelAt: 1.05 }],
      shade: [{ f: (x) => x, g: (x) => x * x, from: 0, to: 1 }],
      segments: [{ from: [0.6, 0], to: [0.6, 0.6], label: 'R' }, { from: [0.7, 0], to: [0.7, 0.49], label: 'r', color: 'c' }],
      alt: 'The region between y = x and y = x squared from 0 to 1, shaded. Two vertical segments from the x-axis show the outer radius R, reaching up to the line, and the inner radius r, reaching up to the parabola. Revolving the region about the x-axis gives washers.',
    },
  },

  examples: [
    {
      title: 'Washers',
      problem: R`The region enclosed by \(y = \sqrt{x}\) and \(y = x\) is revolved about the \(x\)-axis. Find the volume.`,
      steps: [
        R`The curves meet at \(x = 0\) and \(x = 1\). Between them \(\sqrt{x}\) is on top.`,
        R`A slice perpendicular to the axis is a washer with \(R = \sqrt{x}\) and \(r = x\).`,
        R`\(V = \pi\displaystyle\int_{0}^{1} \left[(\sqrt{x})^{2} - x^{2}\right]dx = \pi\Big[\tfrac{1}{2}x^{2} - \tfrac{1}{3}x^{3}\Big]_{0}^{1}\).`,
      ],
      answer: R`\(\dfrac{\pi}{6}\)`,
    },
    {
      title: 'Cylindrical shells',
      problem: R`The region between \(y = 2x - x^{2}\) and the \(x\)-axis is revolved about the \(y\)-axis. Find the volume.`,
      steps: [
        R`The curve meets the \(x\)-axis at \(x = 0\) and \(x = 2\). Washers would need \(x\) in terms of \(y\), which is awkward here, so use shells.`,
        R`A vertical strip at \(x\) has height \(2x - x^{2}\) and sweeps out a shell of radius \(x\).`,
        R`\(V = 2\pi\displaystyle\int_{0}^{2} x(2x - x^{2})\,dx = 2\pi\Big[\tfrac{2}{3}x^{3} - \tfrac{1}{4}x^{4}\Big]_{0}^{2} = 2\pi\left(\tfrac{16}{3} - 4\right)\).`,
      ],
      answer: R`\(\dfrac{8\pi}{3}\)`,
    },
    {
      title: 'Arc length',
      problem: R`Find the length of \(y = \frac{2}{3}x^{3/2}\) from \(x = 0\) to \(x = 8\).`,
      steps: [
        R`\(\dfrac{dy}{dx} = x^{1/2}\), so \(1 + \left(\dfrac{dy}{dx}\right)^{2} = 1 + x\).`,
        R`\(L = \displaystyle\int_{0}^{8} \sqrt{1 + x}\,dx = \Big[\tfrac{2}{3}(1 + x)^{3/2}\Big]_{0}^{8} = \tfrac{2}{3}(27 - 1)\).`,
      ],
      answer: R`\(\dfrac{52}{3} \approx 17.3\)`,
    },
    {
      title: 'Word problem: how much does the bowl hold?',
      word: true,
      problem: R`The inside of a bowl is formed by revolving \(y = \frac{1}{2}x^{2}\), for \(0 \le x \le 6\) (in centimeters), about the \(y\)-axis. How much soup fills it to the brim?`,
      steps: [
        R`The rim is at height \(y = \frac{1}{2}(6)^{2} = 18\) cm. Slice the soup horizontally: each slice is a disc.`,
        R`At height \(y\) the radius is \(x\), where \(x^{2} = 2y\). The disc has area \(\pi x^{2} = 2\pi y\).`,
        R`\(V = \displaystyle\int_{0}^{18} 2\pi y\,dy = \pi\Big[y^{2}\Big]_{0}^{18} = 324\pi\).`,
      ],
      answer: R`\(324\pi \approx 1018\) cm³, about 1 liter`,
      visual: {
        type: 'plot',
        x: [-7, 7],
        y: [-1, 20],
        fns: [{ f: (x) => 0.5 * x * x, domain: [-6, 6] }],
        shade: [{ f: () => 18, g: (x) => 0.5 * x * x, from: -6, to: 6 }],
        segments: [{ from: [0, 8], to: [4, 8], label: 'x', color: 'c' }],
        alt: 'Side view of the bowl: the parabola y = one half x squared from x = −6 to 6, filled up to the rim at height 18. A horizontal segment at height 8 from the axis to the parabola shows the radius of one disc-shaped slice.',
      },
    },
  ],

  models: [
    {
      id: 'revolve-power-curve',
      title: 'Revolve the region under y = k·xⁿ',
      intro: 'Choose the curve, the interval [0, b] and the axis. Discs are used about the x-axis and shells about the y-axis.',
      inputs: [
        { name: 'k', label: 'k', type: 'int', min: 1, max: 5, value: 1 },
        { name: 'n', label: 'Power n', type: 'int', min: 1, max: 4, value: 2 },
        { name: 'b', label: 'b (right end)', type: 'int', min: 1, max: 5, value: 2 },
        { name: 'axis', label: 'Axis of rotation', type: 'select', value: 'x', options: [{ value: 'x', label: 'x-axis (discs)' }, { value: 'y', label: 'y-axis (shells)' }] },
      ],
      compute({ k, n, b, axis }) {
        const f = terms([[k, power('x', n)]]);
        const fJs = (x) => k * x ** n;
        const visual = regionPlot(fJs, () => 0, 0, b, { alt: `The region under y = ${k}x to the power ${n} from x = 0 to x = ${b}, shaded. It is revolved about the ${axis}-axis.`, pad: 0.4 });
        const problem = R`The region under \(y = ${f}\) from \(x = 0\) to \(x = ${b}\) is revolved about the \(${axis}\)-axis. Find the volume.`;
        if (axis === 'x') {
          const c = frac(k * k * b ** (2 * n + 1), 2 * n + 1);
          return {
            problem,
            steps: [
              R`A slice perpendicular to the \(x\)-axis is a disc of radius \(${f}\).`,
              R`\(V = \pi\displaystyle\int_{0}^{${b}} (${f})^{2}\,dx = \pi\int_{0}^{${b}} ${terms([[k * k, power('x', 2 * n)]])}\,dx\).`,
              R`\(V = \pi\Big[${terms([[frac(k * k, 2 * n + 1), power('x', 2 * n + 1)]])}\Big]_{0}^{${b}} = ${fterms([[c, '\\pi']])}\).`,
            ],
            answer: R`\(${fterms([[c, '\\pi']])} \approx ${num(c.value * PI, { places: 2 })}\) cubic units`,
            visual,
          };
        }
        const c = frac(2 * k * b ** (n + 2), n + 2);
        return {
          problem,
          steps: [
            R`A vertical strip at \(x\) has height \(${f}\). About the \(y\)-axis it sweeps out a shell of radius \(x\).`,
            R`\(V = 2\pi\displaystyle\int_{0}^{${b}} x\cdot ${f}\,dx = 2\pi\int_{0}^{${b}} ${terms([[k, power('x', n + 1)]])}\,dx\).`,
            R`\(V = 2\pi\Big[${terms([[frac(k, n + 2), power('x', n + 2)]])}\Big]_{0}^{${b}} = ${fterms([[c, '\\pi']])}\).`,
          ],
          answer: R`\(${fterms([[c, '\\pi']])} \approx ${num(c.value * PI, { places: 2 })}\) cubic units`,
          visual,
        };
      },
    },
    {
      id: 'parabolic-bowl',
      title: 'Word problem: how much does the bowl hold?',
      word: true,
      intro: 'A bowl is shaped like a parabola spun around its axis. Choose the radius of the rim and the depth.',
      inputs: [
        { name: 'r', label: 'Radius of the rim (cm)', type: 'int', min: 2, max: 20, value: 6 },
        { name: 'h', label: 'Depth (cm)', type: 'int', min: 1, max: 30, value: 9 },
      ],
      compute({ r, h }) {
        const c = frac(h, r * r); // y = c·x²
        const vol = frac(r * r * h, 2);
        const curve = terms([[c, 'x^{2}']]);
        return {
          problem: R`A bowl is ${2 * r} cm across at the rim and ${h} cm deep. Its inside is the parabola \(y = ${curve}\) revolved about the \(y\)-axis. How much liquid fills it to the brim?`,
          steps: [
            R`The parabola passes through the rim point \((${r}, ${h})\): \(y = ${curve}\).`,
            R`Slice the liquid horizontally. At height \(y\) the slice is a disc of radius \(x\), where \(x^{2} = ${c.inv().tex()}\,y\).`,
            R`\(V = \displaystyle\int_{0}^{${h}} \pi x^{2}\,dy = \pi\int_{0}^{${h}} ${c.inv().tex()}\,y\,dy = \pi\cdot${c.inv().tex()}\cdot\frac{${h * h}}{2}\).`,
            R`\(V = ${fterms([[vol, '\\pi']])}\) cm³. That is exactly half the volume of the cylinder \(\pi r^{2}h\) that the bowl fits inside.`,
          ],
          answer: R`\(${fterms([[vol, '\\pi']])} \approx ${num(vol.value * PI, { places: 0 })}\) cm³ (milliliters)`,
          visual: {
            type: 'plot',
            x: [-r * 1.2, r * 1.2],
            y: [-0.08 * h, h * 1.15],
            fns: [{ f: (x) => c.value * x * x, domain: [-r, r] }],
            shade: [{ f: () => h, g: (x) => c.value * x * x, from: -r, to: r }],
            alt: `Side view of the bowl: a parabola ${2 * r} units wide at the top and ${h} units deep, filled to the brim.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyDisc, easyCrossSection, easyWasherSetup],
    medium: [mediumWasher, mediumShells, mediumWordVase],
    hard: [hardOtherAxis, hardArcLength, hardWordSculpture],
    challenge: [challengeShellsShifted, challengeFindLength, challengeWordTorus],
  },
};
