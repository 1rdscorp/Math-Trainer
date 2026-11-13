import { R, q, frac, num, txt, paren, plural, product, dot, terms, linear, poly, factor, point, rootsTex, range, ordinal, round, checkEqual, checkAll } from '../../lib/index.js';
import { M, pmat, toRad } from './_shared.js';

// Small matrix tools. A matrix is an array of rows.
const mul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((acc, v, k) => acc + v * B[k][j], 0)));
const det2 = (A) => A[0][0] * A[1][1] - A[0][1] * A[1][0];
const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
const scale = (A, k) => A.map((row) => row.map((v) => k * v));
const sameM = (A, B) => A.length === B.length && A.every((row, i) => row.length === B[i].length && row.every((v, j) => Math.abs(v - B[i][j]) < 1e-9));
const PM = (rows) => M(pmat(rows));
// Dimensions as an answer choice. The × is plain text between the numbers, so that "3 × 4" and "4 × 3" are
// compared as different pairs of numbers and not as the same product.
const size = (r, c) => R`\(${r}\) × \(${c}\)`;
const col = (...v) => v.map((e) => [e]);
const rand2 = (rng, lo, hi) => [[rng.nonzero(lo, hi), rng.nonzero(lo, hi)], [rng.nonzero(lo, hi), rng.nonzero(lo, hi)]];
// A copy with its top-left entry changed: last-resort wrong answers that can never equal the right one.
const nudged = (A) => [1, -1, 2].map((k) => PM(A.map((row, i) => row.map((v, j) => (i === 0 && j === 0 ? v + k : v)))));
// 1/D written in front of a matrix: "" for 1, "-" for −1, "\dfrac{1}{3}", "-\dfrac{1}{2}".
const oneOver = (D) => (D === 1 ? '' : D === -1 ? '-' : R`${D < 0 ? '-' : ''}\dfrac{1}{${Math.abs(D)}}`);
// Area of a polygon from its corners (shoelace formula); positive when the corners run counterclockwise.
const shoelace = (pts) => pts.reduce((acc, [x, y], i) => acc + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y, 0) / 2;

// Rotation through `deg` degrees, done with polar coordinates so that it does not rely on the matrix formula.
const turn = (deg) => ([x, y]) => {
  const ang = Math.atan2(y, x) + toRad(deg);
  return [Math.hypot(x, y) * Math.cos(ang), Math.hypot(x, y) * Math.sin(ang)];
};
// The rotations and reflections that have matrices with entries 0, 1 and −1.
const MOVES = [
  { name: R`a rotation of \(90^{\circ}\) counterclockwise about the origin`, done: R`rotated \(90^{\circ}\) counterclockwise about the origin`, m: [[0, -1], [1, 0]], f: turn(90) },
  { name: R`a rotation of \(90^{\circ}\) clockwise about the origin`, done: R`rotated \(90^{\circ}\) clockwise about the origin`, m: [[0, 1], [-1, 0]], f: turn(-90) },
  { name: R`a rotation of \(180^{\circ}\) about the origin`, done: R`rotated \(180^{\circ}\) about the origin`, m: [[-1, 0], [0, -1]], f: turn(180) },
  { name: R`a reflection in the \(x\)-axis`, done: R`reflected in the \(x\)-axis`, m: [[1, 0], [0, -1]], f: ([x, y]) => [x, -y] },
  { name: R`a reflection in the \(y\)-axis`, done: R`reflected in the \(y\)-axis`, m: [[-1, 0], [0, 1]], f: ([x, y]) => [-x, y] },
  { name: R`a reflection in the line \(y = x\)`, done: R`reflected in the line \(y = x\)`, m: [[0, 1], [1, 0]], f: ([x, y]) => [y, x] },
  { name: R`a reflection in the line \(y = -x\)`, done: R`reflected in the line \(y = -x\)`, m: [[0, -1], [-1, 0]], f: ([x, y]) => [-y, -x] },
];
const image = (m, [x, y]) => [m[0][0] * x + m[0][1] * y, m[1][0] * x + m[1][1] * y];
const agrees = (m, f) => [[1, 0], [0, 1], [2, -3]].every((p) => f(p).every((v, i) => Math.abs(v - image(m, p)[i]) < 1e-9));

// ───────────── Easy ─────────────

function easyEntryDimension(rng) {
  const [m, n] = rng.pick([[2, 3], [3, 2], [2, 4], [4, 2], [3, 4], [4, 3], [3, 3]]);
  const vals = rng.sample(range(-9, 15), m * n);
  const A = Array.from({ length: m }, (_, i) => vals.slice(i * n, (i + 1) * n));
  if (m !== n && rng.bool(0.4)) {
    return q({
      prompt: R`What are the dimensions of the matrix \(${pmat(A)}\)?`,
      correct: size(m, n),
      wrong: [{ value: size(n, m), why: 'Rows are counted first, then columns. Rows run across and columns run down.' }, size(m, m), size(n, n)],
      solution: [`The matrix has ${m} rows (running across) and ${n} columns (running down).`, R`Dimensions are written rows × columns: \(${m} \times ${n}\).`],
      rule: 0,
      skill: 'dimensions',
      check: () => (A.length === m && A.every((row) => row.length === n) ? true : 'the matrix has a different shape'),
    });
  }
  const i = rng.int(1, m);
  const j = rng.intExcept(1, n, [i]);
  const ij = `${i}${j}`;
  const ans = A[i - 1][j - 1];
  return q({
    prompt: R`In the matrix \(A = ${pmat(A)}\), what is the entry \(a_{${ij}}\)?`,
    correct: ans,
    wrong: [
      A[j - 1]?.[i - 1] == null ? null : { value: A[j - 1][i - 1], why: R`\(a_{${ij}}\) is in row ${i} and column ${j}. The row number is written first.` },
      A[i - 1][j % n],
      A[i % m][j - 1],
      A[i % m][j % n],
    ],
    solution: [R`\(a_{${ij}}\) is the entry in row ${i}, column ${j}.`, R`Row ${i} is \(${A[i - 1].join(R`,\ `)}\). Its ${ordinal(j)} entry is \(${ans}\).`],
    rule: 0,
    skill: 'entries',
    check: () => (transpose(A)[j - 1][i - 1] === ans ? true : 'that entry is somewhere else'),
  });
}

function easyAddScalar(rng) {
  const [A, B] = [rand2(rng, -6, 6), rand2(rng, -6, 6)];
  const p = rng.pick([1, 1, 2, 3]);
  const s = rng.pick([1, -1, -1, 2, -2]);
  const comb = (f) => A.map((row, i) => row.map((v, j) => f(v, B[i][j], i, j)));
  const P = comb((a, b) => p * a + s * b);
  const parts = [p === 1 ? null : R`\(${p}A = ${pmat(scale(A, p))}\)`, Math.abs(s) === 1 ? null : R`\(${Math.abs(s)}B = ${pmat(scale(B, Math.abs(s)))}\)`].filter(Boolean);
  return q({
    prompt: R`Let \(A = ${pmat(A)}\) and \(B = ${pmat(B)}\). Find \(${terms([[p, 'A'], [s, 'B']])}\).`,
    correct: PM(P),
    wrong: [
      { value: PM(comb((a, b) => p * a - s * b)), why: s > 0 ? R`That subtracts \(B\). The expression adds it.` : R`That adds \(B\). The expression subtracts it.` },
      p === 1 ? null : { value: PM(comb((a, b, i) => (i === 0 ? p : 1) * a + s * b)), why: R`A scalar multiplies every entry of the matrix: \(${p}A = ${pmat(scale(A, p))}\).` },
      PM(comb((a, b, i, j) => p * a + (j === 0 ? s : -s) * b)),
      PM(comb((a, b, i) => p * a + (i === 0 ? s : -s) * b)),
    ],
    solution: [
      ...(parts.length ? [`Multiply by the scalars first: ${parts.join(' and ')}.`] : []),
      R`${s > 0 ? 'Add' : 'Subtract'} matching entries: \(${pmat(scale(A, p))} ${s > 0 ? '+' : '-'} ${pmat(scale(B, Math.abs(s)))} = ${pmat(P)}\).`,
    ],
    rule: 1,
    skill: 'adding and scalar multiples',
    check: () => {
      const v = col(1, 2);
      const [Pv, Av, Bv] = [mul(P, v), mul(A, v), mul(B, v)];
      return Pv.every((row, i) => row[0] === p * Av[i][0] + s * Bv[i][0]) ? true : 'the combination acts differently on a test vector';
    },
  });
}

function easyProductDefined(rng) {
  const [m, n, qq] = [rng.int(1, 4), rng.int(1, 4), rng.int(1, 4)];
  if (m === n && n === qq) return easyProductDefined(rng);
  const defined = rng.bool(0.55);
  const p = defined ? n : rng.intExcept(1, 4, [n]);
  const none = R`\(AB\) is not defined`;
  const prompt = R`\(A\) is a \(${m} \times ${n}\) matrix and \(B\) is a \(${p} \times ${qq}\) matrix. What are the dimensions of the product \(AB\)?`;
  const zeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));
  const check = () => {
    const [A, B] = [zeros(m, n), zeros(p, qq)];
    if (A[0].length !== B.length) return defined ? 'the product does not exist' : true;
    const P = mul(A, B);
    return defined && P.length === m && P[0].length === qq ? true : 'the product has a different shape';
  };
  if (defined) {
    return q({
      prompt,
      correct: size(m, qq),
      wrong: [
        { value: none, why: R`\(AB\) is defined when the number of columns of \(A\) equals the number of rows of \(B\). Here both are \(${n}\).` },
        { value: size(n, n), why: 'The two inner numbers have to match. The two outer numbers give the size of the product.' },
        { value: size(qq, m), why: R`The product has as many rows as \(A\) and as many columns as \(B\).` },
        size(m, n),
        size(n, qq),
      ],
      solution: [
        R`Write the sizes side by side: \((${m} \times ${n})(${n} \times ${qq})\). The inner numbers match (\(${n}\) and \(${n}\)), so \(AB\) is defined.`,
        R`The outer numbers give its size: \(${m} \times ${qq}\).`,
      ],
      rule: 2,
      skill: 'when a product is defined',
      check,
    });
  }
  return q({
    prompt,
    correct: none,
    wrong: [
      { value: size(m, qq), why: R`That would be the size if the product existed, but \(A\) has ${plural(n, 'column')} and \(B\) has ${plural(p, 'row')}.` },
      { value: size(n, p), why: R`Those are the inner numbers. They would have to be equal for \(AB\) to exist.` },
      size(p, n),
      size(n, n),
      size(m, m),
    ],
    solution: [
      R`Write the sizes side by side: \((${m} \times ${n})(${p} \times ${qq})\). The inner numbers are \(${n}\) and \(${p}\).`,
      R`\(A\) has ${plural(n, 'column')} but \(B\) has ${plural(p, 'row')}, so a row of \(A\) cannot be multiplied by a column of \(B\): \(AB\) is not defined.`,
    ],
    rule: 2,
    skill: 'when a product is defined',
    check,
  });
}

function easyDet2(rng) {
  const A = rand2(rng, -7, 7);
  const [[a, b], [c, d]] = A;
  const D = det2(A);
  return q({
    prompt: R`Find the determinant of \(${pmat(A)}\).`,
    correct: D,
    wrong: [
      { value: a * d + b * c, why: R`The determinant is \(ad - bc\): subtract the product of the other diagonal.` },
      { value: b * c - a * d, why: R`Start with the main diagonal (top left to bottom right): \(ad - bc\).` },
      { value: a * b - c * d, why: 'Multiply along the diagonals, not along the rows.' },
      a * c - b * d,
      a + d - b - c,
    ],
    solution: [R`For \(\begin{pmatrix} a & b \\ c & d \end{pmatrix}\), the determinant is \(ad - bc\).`, R`\(${product(a, d)} - ${product(b, c)} = ${a * d} - ${paren(b * c)} = ${D}\).`],
    rule: 3,
    skill: '2×2 determinants',
    // The determinant is the signed area of the parallelogram spanned by the columns.
    check: () => checkEqual(shoelace([[0, 0], [a, c], [a + b, c + d], [b, d]]), D),
  });
}

// ───────────── Medium ─────────────

function mediumMultiply(rng) {
  const [A, B] = [rand2(rng, -4, 5), rand2(rng, -4, 5)];
  if (det2(A) === 0 || det2(B) === 0) return mediumMultiply(rng);
  const P = mul(A, B);
  const [[a, b], [c, d]] = A;
  const [[e, f], [g, h]] = B;
  return q({
    prompt: R`Let \(A = ${pmat(A)}\) and \(B = ${pmat(B)}\). Find the product \(AB\).`,
    correct: PM(P),
    wrong: [
      { value: PM(mul(B, A)), why: R`That is \(BA\). Matrix multiplication is not commutative, so the order matters.` },
      { value: PM([[a * e, b * f], [c * g, d * h]]), why: R`Each entry of \(AB\) is a row of \(A\) times a column of \(B\), not a product of matching entries.` },
      { value: PM(mul(A, transpose(B))), why: R`Pair each row of \(A\) with a column of \(B\), not with a row of \(B\).` },
      PM([[a * e, a * f], [c * e, c * f]]),
      ...nudged(P),
    ],
    solution: [
      R`Each entry of \(AB\) is a row of \(A\) times a column of \(B\).`,
      R`Row 1: \(${product(a, e)} + ${product(b, g)} = ${P[0][0]}\) and \(${product(a, f)} + ${product(b, h)} = ${P[0][1]}\).`,
      R`Row 2: \(${product(c, e)} + ${product(d, g)} = ${P[1][0]}\) and \(${product(c, f)} + ${product(d, h)} = ${P[1][1]}\).`,
      R`\(AB = ${pmat(P)}\).`,
    ],
    rule: 2,
    skill: 'matrix multiplication',
    // (AB)v must equal A(Bv) for any vector v.
    check: () => ([col(1, -2), col(3, 1)].every((v) => sameM(mul(P, v), mul(A, mul(B, v)))) ? true : 'AB does not act like B followed by A'),
  });
}

function mediumInverse(rng) {
  const A = rand2(rng, -6, 6);
  const D = det2(A);
  if (D === 0 || Math.abs(D) > 5) return mediumInverse(rng);
  const [[a, b], [c, d]] = A;
  const show = (rows, k = D) => PM(rows.map((row) => row.map((v) => frac(v, k))));
  const inv = [[d, -b], [-c, a]].map((row) => row.map((v) => frac(v, D)));
  return q({
    prompt: R`Find the inverse of \(A = ${pmat(A)}\).`,
    correct: PM(inv),
    wrong: [
      Math.abs(D) === 1 ? null : { value: show([[d, -b], [-c, a]], 1), why: R`Each entry still has to be divided by the determinant, \(${D}\).` },
      { value: show([[a, -b], [-c, d]]), why: 'Swap the two entries on the main diagonal as well as changing the signs of the other two.' },
      { value: show([[d, b], [c, a]]), why: 'After swapping the main diagonal, change the signs of the other two entries.' },
      { value: PM([[frac(1, a), frac(1, b)], [frac(1, c), frac(1, d)]]), why: 'The inverse of a matrix is not built from the reciprocals of its entries.' },
      show([[-d, b], [c, -a]]),
    ],
    solution: [
      R`Determinant: \(${product(a, d)} - ${product(b, c)} = ${D}\). It is not 0, so the inverse exists.`,
      R`Swap the entries on the main diagonal and change the signs of the other two: \(${pmat([[d, -b], [-c, a]])}\).`,
      D === 1 ? R`The determinant is 1, so that matrix is \(A^{-1}\).` : R`Divide every entry by \(${D}\): \(A^{-1} = ${pmat(inv)}\).`,
    ],
    rule: 4,
    skill: 'inverse of a 2×2 matrix',
    check: () => (sameM(mul(A, inv.map((row) => row.map((v) => v.value))), [[1, 0], [0, 1]]) ? true : 'A times the answer is not the identity matrix'),
  });
}

function mediumSolveSystem(rng) {
  const A = rand2(rng, -5, 5);
  const D = det2(A);
  const x0 = rng.nonzero(-6, 6);
  const y0 = rng.intExcept(-6, 6, [0, x0]);
  if (D === 0 || Math.abs(D) > 12) return mediumSolveSystem(rng);
  const [[a, b], [c, d]] = A;
  const [e, f] = [a * x0 + b * y0, c * x0 + d * y0];
  const adj = [[d, -b], [-c, a]];
  const ans = (x, y) => R`\(x = ${x},\ y = ${y}\)`;
  return q({
    prompt: R`Solve the matrix equation \(${pmat(A)}${pmat(col('x', 'y'))} = ${pmat(col(e, f))}\).`,
    correct: ans(x0, y0),
    wrong: [
      { value: ans(a * e + b * f, c * e + d * f), why: R`Multiply by the inverse of the coefficient matrix: \(X = A^{-1}B\), not \(AB\).` },
      Math.abs(D) === 1 ? null : { value: ans(d * e - b * f, -c * e + a * f), why: R`The inverse includes the factor \(\dfrac{1}{\det A}\), and here \(\det A = ${D}\).` },
      ans(y0, x0),
      ans(-x0, y0),
      ans(x0, -y0),
    ],
    solution: [
      R`Write the equation as \(AX = B\). Multiplying both sides on the left by \(A^{-1}\) gives \(X = A^{-1}B\).`,
      R`\(\det A = ${product(a, d)} - ${product(b, c)} = ${D}\), so \(A^{-1} = ${oneOver(D)}${pmat(adj)}\).`,
      R`\(X = ${oneOver(D)}${pmat(adj)}${pmat(col(e, f))} = ${oneOver(D)}${pmat(mul(adj, col(e, f)))}${D === 1 ? '' : ` = ${pmat(col(x0, y0))}`}\).`,
      R`So \(x = ${x0}\) and \(y = ${y0}\). Check the first row: \(${dot(a, x0)} + ${dot(b, y0)} = ${e}\).`,
    ],
    rule: 5,
    skill: 'solving a system with an inverse',
    check: () => checkAll(checkEqual(a * x0 + b * y0, e), checkEqual(c * x0 + d * y0, f)),
  });
}

function mediumTransformMatrix(rng) {
  if (rng.bool(0.45)) {
    const A = rand2(rng, -4, 4);
    const [[a, b], [c, d]] = A;
    const [x, y] = [rng.nonzero(-5, 5), rng.nonzero(-5, 5)];
    const [u, v] = image(A, [x, y]);
    const pt = (s, t) => M(point(s, t));
    return q({
      prompt: R`The transformation with matrix \(${pmat(A)}\) is applied to the point \(${point(x, y)}\). What is the image of the point?`,
      correct: pt(u, v),
      wrong: [
        { value: pt(a * x + c * y, b * x + d * y), why: 'Each coordinate of the image is a row of the matrix times the point, not a column.' },
        { value: pt(a * x, d * y), why: 'Every row has two entries, so each coordinate of the image is a sum of two products.' },
        pt(v, u),
        pt(u + y, v - x),
        pt(u - y, v + x),
      ],
      solution: [
        R`Write the point as a column and multiply: \(${pmat(A)}${pmat(col(x, y))}\).`,
        R`First coordinate: \(${product(a, x)} + ${product(b, y)} = ${u}\). Second coordinate: \(${product(c, x)} + ${product(d, y)} = ${v}\).`,
        R`The image is \(${point(u, v)}\).`,
      ],
      rule: 6,
      skill: 'applying a transformation',
      // x·(first column) + y·(second column) must give the same image.
      check: () => checkAll(checkEqual(x * a + y * b, u), checkEqual(x * c + y * d, v)),
    });
  }
  const k = rng.int(2, 5);
  const stretches = [
    { name: R`a dilation centred at the origin with scale factor \(${k}\)`, m: [[k, 0], [0, k]], f: ([x, y]) => [k * x, k * y] },
    { name: R`a horizontal stretch by a factor of \(${k}\) (the \(y\)-axis stays fixed)`, m: [[k, 0], [0, 1]], f: ([x, y]) => [k * x, y] },
    { name: R`a vertical stretch by a factor of \(${k}\) (the \(x\)-axis stays fixed)`, m: [[1, 0], [0, k]], f: ([x, y]) => [x, k * y] },
  ];
  const rigid = rng.bool(0.6);
  const T = rng.pick(rigid ? MOVES : stretches);
  const others = rigid ? rng.shuffle(MOVES.filter((o) => o !== T).map((o) => o.m)) : [...stretches.filter((o) => o !== T).map((o) => o.m), [[0, k], [k, 0]], [[1, k], [0, 1]]];
  const note = (W) => {
    const e = [[1, 0], [0, 1]].find((p) => image(W, p).some((v, i) => v !== image(T.m, p)[i]));
    return R`The columns of a matrix are the images of \((1, 0)\) and \((0, 1)\). This matrix sends \(${point(...e)}\) to \(${point(...image(W, e))}\), but it should go to \(${point(...image(T.m, e))}\).`;
  };
  return q({
    prompt: `Which matrix represents ${T.name}?`,
    correct: PM(T.m),
    wrong: others.map((W) => ({ value: PM(W), why: note(W) })),
    solution: [
      R`The columns of the matrix are the images of \((1, 0)\) and \((0, 1)\).`,
      R`Under this transformation \((1, 0) \to ${point(...image(T.m, [1, 0]))}\) and \((0, 1) \to ${point(...image(T.m, [0, 1]))}\).`,
      R`Write those images as the columns: \(${pmat(T.m)}\).`,
    ],
    rule: 6,
    skill: 'matrix of a transformation',
    check: () => (agrees(T.m, T.f) && others.every((W) => !agrees(W, T.f)) ? true : 'the matrix does not match the transformation'),
  });
}

// ───────────── Hard ─────────────

function hardDet3(rng) {
  const A = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => rng.int(-3, 4)));
  const [[a, b, c], [d, e, f], [g, h, i]] = A;
  if (a === 0 || b === 0 || c === 0) return hardDet3(rng);
  const [m1, m2, m3] = [e * i - f * h, d * i - f * g, d * h - e * g];
  const D = a * m1 - b * m2 + c * m3;
  const minor = (rows) => R`\begin{vmatrix} ${rows.map((row) => row.join(' & ')).join(R` \\ `)} \end{vmatrix}`;
  return q({
    prompt: R`Find the determinant of \(${pmat(A)}\).`,
    correct: D,
    wrong: [
      { value: a * m1 + b * m2 + c * m3, why: 'The signs of the three terms alternate: plus, minus, plus.' },
      { value: a * e * i + b * f * g + c * d * h, why: 'Those are only the three products that run down to the right. The three products that run up to the right must be subtracted.' },
      { value: a * e * i, why: 'Multiplying down the main diagonal works only for triangular matrices. Expand along a row instead.' },
      -D,
      D + a,
    ],
    solution: [
      R`Expand along the first row, with signs \(+\), \(-\), \(+\): \(\det = ${paren(a)}${minor([[e, f], [h, i]])} - ${paren(b)}${minor([[d, f], [g, i]])} + ${paren(c)}${minor([[d, e], [g, h]])}\).`,
      R`The three \(2 \times 2\) determinants are \(${product(e, i)} - ${product(f, h)} = ${m1}\), \(${product(d, i)} - ${product(f, g)} = ${m2}\) and \(${product(d, h)} - ${product(e, g)} = ${m3}\).`,
      R`\(\det = ${product(a, m1)} - ${product(b, m2)} + ${product(c, m3)} = ${a * m1} - ${paren(b * m2)} + ${paren(c * m3)} = ${D}\).`,
    ],
    rule: 3,
    skill: '3×3 determinants',
    // Rule of Sarrus: three diagonal products down minus three diagonal products up.
    check: () => checkEqual(a * e * i + b * f * g + c * d * h - c * e * g - b * d * i - a * f * h, D),
  });
}

function hardProductEntry(rng) {
  const [m, qq] = [rng.int(2, 3), rng.int(2, 3)];
  const A = Array.from({ length: m }, () => Array.from({ length: 3 }, () => rng.int(-4, 5)));
  const B = Array.from({ length: 3 }, () => Array.from({ length: qq }, () => rng.int(-4, 5)));
  const i = rng.int(1, m);
  const j = rng.int(1, qq);
  const row = A[i - 1];
  const column = B.map((r) => r[j - 1]);
  if (row.some((v) => v === 0) || column.some((v) => v === 0)) return hardProductEntry(rng);
  const ans = row.reduce((acc, v, k) => acc + v * column[k], 0);
  const dotRow = (r, s) => r.reduce((acc, v, k) => acc + v * s[k], 0);
  return q({
    prompt: R`Let \(A = ${pmat(A)}\) and \(B = ${pmat(B)}\). Find the entry in row ${i}, column ${j} of the product \(AB\).`,
    correct: ans,
    wrong: [
      i !== j && j <= m && i <= qq ? { value: dotRow(A[j - 1], B.map((r) => r[i - 1])), why: R`That is the entry in row ${j}, column ${i}. Use row ${i} of \(A\) and column ${j} of \(B\).` } : null,
      qq === 3 ? { value: dotRow(row, B[j - 1]), why: R`Pair the row of \(A\) with a column of \(B\), not with a row of \(B\).` } : null,
      { value: row[0] * column[0] + row[1] * column[1], why: 'Three products are added, one for each entry of the row.' },
      { value: row[j - 1] * column[i - 1], why: R`An entry of \(AB\) is a whole row times a whole column, not one entry times one entry.` },
      row.reduce((acc, v) => acc + v, 0) + column.reduce((acc, v) => acc + v, 0),
    ],
    solution: [
      R`The entry in row ${i}, column ${j} of \(AB\) is row ${i} of \(A\) times column ${j} of \(B\).`,
      R`Row ${i} of \(A\) is \(${row.join(R`,\ `)}\). Column ${j} of \(B\) is \(${column.join(R`,\ `)}\).`,
      R`\(${product(row[0], column[0])} + ${product(row[1], column[1])} + ${product(row[2], column[2])} = ${ans}\).`,
    ],
    rule: 2,
    skill: 'matrix multiplication',
    check: () => checkEqual(mul(A, B)[i - 1][j - 1], ans),
  });
}

function hardAreaScale(rng) {
  const A = rand2(rng, -5, 5);
  const D = det2(A);
  const K = rng.int(2, 9);
  if (D === 0 || Math.abs(D) > 15 || Math.abs(D) === 1) return hardAreaScale(rng);
  const [[a, b], [c, d]] = A;
  const shape = rng.pick(['triangle', 'rectangle', 'parallelogram', 'pentagon']);
  return q({
    prompt: R`A ${shape} with area ${K} square units is transformed by the matrix \(${pmat(A)}\). What is the area of its image?`,
    correct: Math.abs(D) * K,
    unit: 'square units',
    wrong: [
      D < 0 ? { value: D * K, why: 'An area cannot be negative. Areas are multiplied by the absolute value of the determinant.' } : null,
      { value: Math.abs(a * d + b * c) * K, why: R`The determinant is \(ad - bc\), with a minus sign between the two products.` },
      { value: Math.abs(D), why: `That is the factor by which areas are multiplied. The image has ${K} times that area.` },
      { value: Math.abs(a + d) * K, why: 'The area factor is the determinant, not the sum of the diagonal entries.' },
      Math.abs(a * d) * K,
      K + Math.abs(D),
    ],
    solution: [
      R`A linear transformation multiplies every area by \(|\det|\).`,
      R`\(\det = ${product(a, d)} - ${product(b, c)} = ${D}\), so areas are multiplied by \(${Math.abs(D)}\)${D < 0 ? ' (the negative sign means the figure is also flipped over)' : ''}.`,
      R`Area of the image: \(${Math.abs(D)} \times ${K} = ${Math.abs(D) * K}\) square units.`,
    ],
    rule: 6,
    skill: 'area and determinants',
    // Transform a real triangle of area K and measure its image.
    check: () => checkEqual(Math.abs(shoelace([[0, 0], [2 * K, 0], [0, 1]].map((p) => image(A, p)))), Math.abs(D) * K),
  });
}

// Two places that exchange customers, bikes or members; used by the transition-matrix questions.
const SETTINGS = [
  { intro: 'Two coffee shops, A and B, share the same regular customers', place: 'shop', things: 'customers', period: 'month', move: 'switch to' },
  { intro: 'A bike-share scheme has two docking stations, A and B', place: 'station', things: 'bikes', period: 'day', move: 'end the day at' },
  { intro: 'Two gyms, A and B, compete for the same members', place: 'gym', things: 'members', period: 'year', move: 'move to' },
];
// One step of the model, in whole numbers: P and Q are the tenths that leave A and B.
const step = ([a, b], P, Q) => [((10 - P) * a + Q * b) / 10, (P * a + (10 - Q) * b) / 10];
const tMatrix = (P, Q) => [[num((10 - P) / 10), num(Q / 10)], [num(P / 10), num((10 - Q) / 10)]];
const tStory = (s, P, Q) => `${s.intro}. Each ${s.period}, ${10 * P}% of the ${s.things} at ${s.place} A ${s.move} ${s.place} B and ${10 * Q}% of the ${s.things} at ${s.place} B ${s.move} ${s.place} A. The rest stay where they are.`;
const tBuild = (P, Q) => R`Each group splits into a part that stays and a part that leaves, so give each starting place its own column (column 1: from A, column 2: from B; row 1: to A, row 2: to B): \(T = ${pmat(tMatrix(P, Q))}\).`;

function hardTransition(rng) {
  const s = rng.pick(SETTINGS);
  const P = rng.int(1, 4);
  const Q = rng.intExcept(1, 4, [P]);
  const start = [100 * rng.int(2, 9), 100 * rng.int(2, 9)];
  const steps = rng.pick([1, 1, 2]);
  const one = step(start, P, Q);
  const two = step(one, P, Q);
  const after = steps === 1 ? one : two;
  if (start[0] === start[1] || after[0] === start[0]) return hardTransition(rng);
  const opt = ([a, b]) => R`A: \(${num(a)}\), B: \(${num(b)}\)`;
  const product2 = ([a, b]) => pmat([[`${num((10 - P) / 10)}(${a}) + ${num(Q / 10)}(${b})`], [`${num(P / 10)}(${a}) + ${num((10 - Q) / 10)}(${b})`]]);
  const flipped = (v) => step(v, Q, P);
  const mixed = ([a, b]) => [((10 - P) * a + P * b) / 10, (Q * a + (10 - Q) * b) / 10];
  return q({
    prompt: `${tStory(s, P, Q)} At the moment ${s.place} A has ${start[0]} ${s.things} and ${s.place} B has ${start[1]}. How many will each have ${steps === 1 ? `one ${s.period} from now` : `two ${s.period}s from now`}?`,
    correct: opt(after),
    wrong: [
      steps === 2 ? { value: opt(one), why: R`That is the state after one ${s.period}. Multiply by \(T\) once more.` } : null,
      { value: opt(steps === 1 ? mixed(start) : mixed(mixed(start))), why: R`Each column of \(T\) belongs to one ${s.place}: its two entries (stay and leave) add up to 1. Here the entries were paired along the rows instead.` },
      { value: opt(steps === 1 ? flipped(start) : flipped(flipped(start))), why: `The ${10 * P}% describes the ${s.things} leaving A, and the ${10 * Q}% those leaving B. They have been exchanged here.` },
      { value: opt([((10 - P) * start[0]) / 10, ((10 - Q) * start[1]) / 10]), why: `The ${s.things} that leave one ${s.place} arrive at the other, so the total stays at ${start[0] + start[1]}.` },
      opt([after[1], after[0]]),
    ],
    solution: [
      tBuild(P, Q),
      R`After one ${s.period}: \(T${pmat(col(...start))} = ${product2(start)} = ${pmat(col(...one))}\).`,
      ...(steps === 2 ? [R`After two ${s.period}s, apply \(T\) again: \(T${pmat(col(...one))} = ${product2(one)} = ${pmat(col(...two))}\).`] : []),
      `So ${s.place} A will have ${after[0]} ${s.things} and ${s.place} B will have ${after[1]}. The total is still ${start[0] + start[1]}.`,
    ],
    rule: 7,
    skill: 'transition matrices',
    // Follow the flows directly: who leaves each place and who arrives.
    check: () => {
      let [a, b] = start;
      for (let k = 0; k < steps; k++) {
        const [leaveA, leaveB] = [(P * a) / 10, (Q * b) / 10];
        [a, b] = [a - leaveA + leaveB, b - leaveB + leaveA];
      }
      return a === after[0] && b === after[1] && a + b === start[0] + start[1] ? true : 'following the flows gives different numbers';
    },
  });
}

// ───────────── Challenge ─────────────

function challengeSingularK(rng) {
  const r1 = rng.nonzero(-6, 6);
  const r2 = rng.intExcept(-6, 6, [0, r1]);
  // det = k(k + m) − ab = (k − r1)(k − r2), so m = −(r1 + r2) and ab = −r1·r2.
  const m = -(r1 + r2);
  const a = rng.pick([1, -1, r1, -r1, r2, -r2]);
  const b = (-r1 * r2) / a;
  const det = (k) => k * (k + m) - a * b;
  const [lo, hi] = [Math.min(r1, r2), Math.max(r1, r2)];
  return q({
    prompt: R`For which values of \(k\) does the matrix \(${pmat([['k', a], [b, linear(1, m, 'k')]])}\) have no inverse?`,
    correct: M(rootsTex([r1, r2], 'k')),
    wrong: [
      { value: M(rootsTex([0, -m], 'k')), why: R`The determinant is \(${m === 0 ? 'k^{2}' : `k(${linear(1, m, 'k')})`} - ${product(a, b)}\). The product of the other diagonal has to be subtracted before solving.` },
      r1 + r2 === 0 ? null : { value: M(rootsTex([-r1, -r2], 'k')), why: R`\(${factor(lo, 'k')}${factor(hi, 'k')} = 0\) when \(k = ${lo}\) or \(k = ${hi}\). Check the signs of the solutions.` },
      { value: M(rootsTex([lo], 'k')), why: R`The determinant is a quadratic in \(k\), and it is zero for two values of \(k\).` },
      M(rootsTex([hi], 'k')),
    ],
    solution: [
      'A square matrix has no inverse exactly when its determinant is 0.',
      R`\(\det = ${m === 0 ? 'k \\cdot k' : `k(${linear(1, m, 'k')})`} - ${product(a, b)} = ${poly([1, m, -a * b], 'k')}\).`,
      R`Set it equal to 0 and factor: \(${factor(lo, 'k')}${factor(hi, 'k')} = 0\).`,
      R`So \(${rootsTex([r1, r2], 'k')}\).`,
    ],
    rule: 4,
    skill: 'when an inverse exists',
    check: () => (det(r1) === 0 && det(r2) === 0 && range(-12, 12).every((k) => k === r1 || k === r2 || det(k) !== 0) ? true : 'the determinant is not zero exactly at those values'),
  });
}

function challengeComposition(rng) {
  const [T1, T2] = rng.sample(MOVES, 2);
  const right = mul(T2.m, T1.m);
  const other = mul(T1.m, T2.m);
  if (sameM(right, other)) return challengeComposition(rng);
  const single = MOVES.find((o) => sameM(o.m, right));
  const both = (p) => T2.f(T1.f(p));
  return q({
    prompt: `Every point of the plane is first ${T1.done} and then ${T2.done}. Which single matrix carries out both steps?`,
    correct: PM(right),
    wrong: [
      { value: PM(other), why: R`The matrix of the transformation that acts first goes on the right: the product is \(M_{2}M_{1}\). This is \(M_{1}M_{2}\), which performs the steps in the other order.` },
      { value: PM(T1.m.map((row, i) => row.map((v, j) => v + T2.m[i][j]))), why: 'Doing one transformation after another corresponds to multiplying the matrices, not adding them.' },
      { value: PM(T2.m), why: 'That matrix carries out only the second step.' },
      PM(T1.m),
    ],
    solution: [
      R`The first step has matrix \(M_{1} = ${pmat(T1.m)}\) and the second has matrix \(M_{2} = ${pmat(T2.m)}\).`,
      R`A point \(P\) goes to \(M_{1}P\) and then to \(M_{2}(M_{1}P)\), so the single matrix is \(M_{2}M_{1}\), with the first step on the right.`,
      R`\(M_{2}M_{1} = ${pmat(T2.m)}${pmat(T1.m)} = ${pmat(right)}\)${single ? `, which is the matrix of ${single.name}` : ''}.`,
    ],
    rule: 6,
    skill: 'composing transformations',
    check: () => (agrees(right, both) && !agrees(other, both) ? true : 'the product does not match doing the two steps in order'),
  });
}

function challengePreviousState(rng) {
  const s = rng.pick(SETTINGS);
  const P = rng.int(1, 4);
  const Q = rng.intExcept(1, 4, [P]);
  const before = [100 * rng.int(2, 9), 100 * rng.int(2, 9)];
  const now = step(before, P, Q);
  if (before[0] === before[1] || now[0] === before[0] || P + Q === 5) return challengePreviousState(rng);
  const opt = ([a, b]) => R`A: \(${num(a)}\), B: \(${num(b)}\)`;
  const D = num((10 - P - Q) / 10);
  const adj = [[num((10 - Q) / 10), num(-Q / 10)], [num(-P / 10), num((10 - P) / 10)]];
  const adjNow = [((10 - Q) * now[0] - Q * now[1]) / 10, (-P * now[0] + (10 - P) * now[1]) / 10];
  return q({
    prompt: `${tStory(s, P, Q)} At the moment ${s.place} A has ${now[0]} ${s.things} and ${s.place} B has ${now[1]}. How many did each have one ${s.period} ago?`,
    correct: opt(before),
    wrong: [
      { value: opt(step(now, P, Q)), why: R`That multiplies by \(T\) again, which gives the numbers one ${s.period} from now. Going back one step needs \(T^{-1}\).` },
      { value: opt(adjNow), why: R`The inverse also needs the factor \(\dfrac{1}{\det T}\), and here \(\det T = ${D}\).` },
      { value: opt(step(now, Q, P)), why: `Reversing the percentages does not undo the step. Solve for the earlier state with the inverse matrix.` },
      opt([before[1], before[0]]),
      opt([before[0] + 50, before[1] - 50]),
      opt([before[0] - 50, before[1] + 50]),
    ],
    solution: [
      tBuild(P, Q),
      R`If \(X\) is the state one ${s.period} ago, then \(TX = ${pmat(col(...now))}\), so \(X = T^{-1}${pmat(col(...now))}\).`,
      R`\(\det T = ${product(num((10 - P) / 10), num((10 - Q) / 10))} - ${product(num(Q / 10), num(P / 10))} = ${D}\), so \(T^{-1} = \dfrac{1}{${D}}${pmat(adj)}\).`,
      R`\(X = \dfrac{1}{${D}}${pmat(adj)}${pmat(col(...now))} = \dfrac{1}{${D}}${pmat(col(...adjNow))} = ${pmat(col(...before))}\).`,
      `One ${s.period} ago ${s.place} A had ${before[0]} ${s.things} and ${s.place} B had ${before[1]}.`,
    ],
    rule: 7,
    skill: 'transition matrices',
    check: () => {
      const [leaveA, leaveB] = [(P * before[0]) / 10, (Q * before[1]) / 10];
      return before[0] - leaveA + leaveB === now[0] && before[1] - leaveB + leaveA === now[1] ? true : 'stepping forward from the answer does not give the present state';
    },
  });
}

export default {
  id: 'matrices',
  title: 'Matrices',
  summary: 'Add and multiply matrices, find determinants and inverses, solve systems, and use matrices for transformations and transitions.',
  standards: ['AP Precalculus 4.10', 'AP Precalculus 4.11', 'AP Precalculus 4.12', 'AP Precalculus 4.13', 'AP Precalculus 4.14', 'CCSS N-VM.C.6', 'CCSS N-VM.C.8', 'CCSS N-VM.C.10', 'CCSS A-REI.C.9'],

  explain: {
    intro: R`A matrix is a rectangular table of numbers that is handled as a single object. Matrices can be added and multiplied, and a square matrix may have an inverse. That is enough to solve systems of equations in one step, to describe rotations and reflections of the plane, and to follow how populations move between states from one time step to the next.`,
    rules: [
      {
        title: 'Dimensions and entries',
        text: R`A matrix with \(m\) rows and \(n\) columns has dimensions \(m \times n\): rows first, then columns. The entry \(a_{ij}\) is in row \(i\) and column \(j\).`,
        example: R`\(A = \begin{pmatrix} 4 & -1 & 0 \\ 2 & 7 & 5 \end{pmatrix}\) is \(2 \times 3\), and \(a_{21} = 2\).`,
      },
      {
        title: 'Adding and scalar multiples',
        text: R`Matrices with the same dimensions are added or subtracted entry by entry. A scalar multiple \(kA\) multiplies every entry of \(A\) by \(k\).`,
        example: R`\(2\begin{pmatrix} 1 & 3 \\ 0 & -2 \end{pmatrix} - \begin{pmatrix} 4 & 1 \\ 5 & 0 \end{pmatrix} = \begin{pmatrix} -2 & 5 \\ -5 & -4 \end{pmatrix}\).`,
      },
      {
        title: 'Matrix multiplication',
        text: R`\(AB\) is defined when the number of columns of \(A\) equals the number of rows of \(B\): an \(m \times n\) matrix times an \(n \times p\) matrix is \(m \times p\). The entry in row \(i\), column \(j\) of \(AB\) is row \(i\) of \(A\) times column \(j\) of \(B\): multiply matching entries and add. In general \(AB \ne BA\).`,
        example: R`\(\begin{pmatrix} 2 & -1 \\ 0 & 3 \end{pmatrix}\begin{pmatrix} 1 & 4 \\ -2 & 5 \end{pmatrix} = \begin{pmatrix} 2 + 2 & 8 - 5 \\ 0 - 6 & 0 + 15 \end{pmatrix} = \begin{pmatrix} 4 & 3 \\ -6 & 15 \end{pmatrix}\).`,
      },
      {
        title: 'Determinants',
        text: R`For a \(2 \times 2\) matrix, \(\det\begin{pmatrix} a & b \\ c & d \end{pmatrix} = ad - bc\). For a \(3 \times 3\) matrix, expand along the first row: each entry times the determinant of the \(2 \times 2\) matrix left when its row and column are deleted, with signs \(+\), \(-\), \(+\).`,
        example: R`\(\det\begin{pmatrix} 3 & 5 \\ -2 & 4 \end{pmatrix} = (3)(4) - (5)(-2) = 22\).`,
      },
      {
        title: 'The inverse of a 2 × 2 matrix',
        text: R`The identity matrix \(I = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}\) leaves every matrix unchanged. The inverse \(A^{-1}\) satisfies \(AA^{-1} = A^{-1}A = I\). It exists exactly when \(\det A \ne 0\), and then \(A^{-1} = \dfrac{1}{ad - bc}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}\): swap the main diagonal, change the signs of the other two entries, and divide by the determinant.`,
        example: R`\(A = \begin{pmatrix} 3 & 1 \\ 5 & 2 \end{pmatrix}\) has \(\det A = 1\), so \(A^{-1} = \begin{pmatrix} 2 & -1 \\ -5 & 3 \end{pmatrix}\).`,
      },
      {
        title: 'Solving a system with an inverse',
        text: R`A linear system can be written as one matrix equation \(AX = B\), where \(A\) holds the coefficients, \(X\) the unknowns and \(B\) the constants. If \(A\) has an inverse, multiply both sides on the left by it: \(X = A^{-1}B\).`,
        example: R`\(3x + y = 5\), \(5x + 2y = 7\): \(X = \begin{pmatrix} 2 & -1 \\ -5 & 3 \end{pmatrix}\begin{pmatrix} 5 \\ 7 \end{pmatrix} = \begin{pmatrix} 3 \\ -4 \end{pmatrix}\), so \(x = 3\) and \(y = -4\).`,
      },
      {
        title: 'Matrices as transformations of the plane',
        text: R`Multiplying by a \(2 \times 2\) matrix moves each point \((x, y)\) to a new point. The columns of the matrix are the images of \((1, 0)\) and \((0, 1)\). A rotation through \(\theta\) counterclockwise has matrix \(\begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}\). Every area is multiplied by \(|\det|\), and a negative determinant means the figure is flipped over. Doing one transformation and then another corresponds to the product, with the first one on the right.`,
        example: R`\(\begin{pmatrix} 0 & -1 \\ 1 & 0 \end{pmatrix}\) rotates \(90^{\circ}\) counterclockwise: \((1, 0) \to (0, 1)\) and \((0, 1) \to (-1, 0)\). \(\begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix}\) reflects in the \(x\)-axis.`,
      },
      {
        title: 'Transition matrices',
        text: R`When fixed fractions of each group move between states at every step, put the fractions in a matrix \(T\) with one column for each starting state; the entries of each column add up to 1. If \(S\) is the column of current amounts, the next state is \(TS\), the one after that is \(T(TS)\), and the previous state is \(T^{-1}S\).`,
        example: R`If 20% of A moves to B and 30% of B moves to A, \(T = \begin{pmatrix} 0.8 & 0.3 \\ 0.2 & 0.7 \end{pmatrix}\), and \(T\begin{pmatrix} 500 \\ 300 \end{pmatrix} = \begin{pmatrix} 490 \\ 310 \end{pmatrix}\).`,
      },
    ],
    vocab: [
      { term: 'dimensions', def: R`The size of a matrix, written rows × columns, such as \(2 \times 3\).` },
      { term: 'scalar', def: 'An ordinary number, as opposed to a matrix or a vector.' },
      { term: 'identity matrix', def: R`The square matrix \(I\) with 1s on the main diagonal and 0s elsewhere. \(AI = IA = A\).` },
      { term: 'determinant', def: R`A single number computed from a square matrix. For a \(2 \times 2\) matrix it is \(ad - bc\).` },
      { term: 'inverse matrix', def: R`The matrix \(A^{-1}\) with \(AA^{-1} = A^{-1}A = I\). It exists only when \(\det A \ne 0\).` },
      { term: 'linear transformation', def: 'A map of the plane given by multiplying each point, written as a column, by a fixed matrix.' },
      { term: 'transition matrix', def: 'A matrix whose columns give the fractions of each group that move to each state in one time step.' },
    ],
    mistakes: [
      R`Multiplying matching entries. Each entry of \(AB\) comes from a whole row of \(A\) and a whole column of \(B\).`,
      R`Assuming \(AB = BA\). Changing the order usually changes the product, and it may not even be defined.`,
      'Forgetting part of the inverse: the swap on the main diagonal, the two sign changes, or the division by the determinant.',
      R`Using a negative determinant as an area factor. Areas are multiplied by \(|\det|\).`,
      'Composing transformations in the wrong order. The matrix of the step that happens first goes on the right.',
    ],
    visual: {
      type: 'plot',
      x: [-1, 5],
      y: [-1, 5],
      square: true,
      step: [1, 1],
      polygons: [{ points: [[0, 0], [1, 0], [1, 1], [0, 1]], color: 'a' }, { points: [[0, 0], [2, 1], [3, 4], [1, 3]], color: 'b' }],
      segments: [{ from: [0, 0], to: [2, 1], arrow: true, color: 'b', label: '(1, 0) → (2, 1)' }, { from: [0, 0], to: [1, 3], arrow: true, color: 'b', label: '(0, 1) → (1, 3)' }],
      alt: 'The unit square with corners (0, 0), (1, 0), (1, 1), (0, 1) and its image under the matrix with columns (2, 1) and (1, 3): a parallelogram with corners (0, 0), (2, 1), (3, 4), (1, 3). The parallelogram has area 5, the determinant of the matrix.',
    },
  },

  examples: [
    {
      title: 'Multiplying in both orders',
      problem: R`Let \(A = \begin{pmatrix} 2 & -1 \\ 0 & 3 \end{pmatrix}\) and \(B = \begin{pmatrix} 1 & 4 \\ -2 & 5 \end{pmatrix}\). Find \(AB\) and \(BA\).`,
      steps: [
        R`Row 1 of \(A\) with each column of \(B\): \((2)(1) + (-1)(-2) = 4\) and \((2)(4) + (-1)(5) = 3\).`,
        R`Row 2 of \(A\) with each column of \(B\): \((0)(1) + (3)(-2) = -6\) and \((0)(4) + (3)(5) = 15\). So \(AB = \begin{pmatrix} 4 & 3 \\ -6 & 15 \end{pmatrix}\).`,
        R`For \(BA\) the rows come from \(B\) and the columns from \(A\): \(BA = \begin{pmatrix} (1)(2) + (4)(0) & (1)(-1) + (4)(3) \\ (-2)(2) + (5)(0) & (-2)(-1) + (5)(3) \end{pmatrix} = \begin{pmatrix} 2 & 11 \\ -4 & 17 \end{pmatrix}\).`,
      ],
      answer: R`\(AB = \begin{pmatrix} 4 & 3 \\ -6 & 15 \end{pmatrix}\) and \(BA = \begin{pmatrix} 2 & 11 \\ -4 & 17 \end{pmatrix}\). The two products are different.`,
    },
    {
      title: 'Solving a system with an inverse',
      problem: R`Solve \(3x + y = 5\), \(5x + 2y = 7\) with an inverse matrix.`,
      steps: [
        R`Write it as \(AX = B\): \(\begin{pmatrix} 3 & 1 \\ 5 & 2 \end{pmatrix}\begin{pmatrix} x \\ y \end{pmatrix} = \begin{pmatrix} 5 \\ 7 \end{pmatrix}\).`,
        R`\(\det A = (3)(2) - (1)(5) = 1\), so \(A^{-1} = \begin{pmatrix} 2 & -1 \\ -5 & 3 \end{pmatrix}\).`,
        R`\(X = A^{-1}B = \begin{pmatrix} (2)(5) + (-1)(7) \\ (-5)(5) + (3)(7) \end{pmatrix} = \begin{pmatrix} 3 \\ -4 \end{pmatrix}\).`,
        R`Check: \(3(3) + (-4) = 5\) and \(5(3) + 2(-4) = 7\).`,
      ],
      answer: R`\(x = 3,\ y = -4\)`,
    },
    {
      title: 'A 3 × 3 determinant',
      problem: R`Find \(\det\begin{pmatrix} 2 & 0 & 1 \\ 1 & 3 & -1 \\ 0 & 2 & 4 \end{pmatrix}\).`,
      steps: [
        R`Expand along the first row: \(2\begin{vmatrix} 3 & -1 \\ 2 & 4 \end{vmatrix} - 0\begin{vmatrix} 1 & -1 \\ 0 & 4 \end{vmatrix} + 1\begin{vmatrix} 1 & 3 \\ 0 & 2 \end{vmatrix}\).`,
        R`\(\begin{vmatrix} 3 & -1 \\ 2 & 4 \end{vmatrix} = 12 - (-2) = 14\) and \(\begin{vmatrix} 1 & 3 \\ 0 & 2 \end{vmatrix} = 2 - 0 = 2\). The middle term is 0.`,
        R`\(\det = 2(14) - 0 + 1(2) = 30\).`,
      ],
      answer: R`\(30\)`,
    },
    {
      title: 'A transformation and its effect on area',
      problem: R`The matrix \(M = \begin{pmatrix} 2 & 1 \\ 1 & 3 \end{pmatrix}\) transforms the unit square. Find the image and its area.`,
      steps: [
        R`The columns are the images of the unit vectors: \((1, 0) \to (2, 1)\) and \((0, 1) \to (1, 3)\).`,
        R`The corner \((1, 1)\) goes to \((2 + 1,\ 1 + 3) = (3, 4)\), so the image is the parallelogram with corners \((0, 0)\), \((2, 1)\), \((3, 4)\), \((1, 3)\).`,
        R`\(\det M = (2)(3) - (1)(1) = 5\). The unit square has area 1, so the parallelogram has area \(5\).`,
      ],
      answer: R`A parallelogram with corners \((0, 0)\), \((2, 1)\), \((3, 4)\), \((1, 3)\) and area \(5\)`,
    },
    {
      title: 'Word problem: bikes at two stations',
      word: true,
      problem: 'A bike-share scheme has two stations. Each day 20% of the bikes at station A end the day at station B, and 30% of the bikes at station B end the day at station A. Today A has 500 bikes and B has 300. How many bikes will each station have tomorrow, and the day after?',
      steps: [
        R`Each group of bikes splits into two parts, so use one column for each starting station: \(T = \begin{pmatrix} 0.8 & 0.3 \\ 0.2 & 0.7 \end{pmatrix}\). Column 1 says 80% of A's bikes stay and 20% go to B.`,
        R`Tomorrow: \(T\begin{pmatrix} 500 \\ 300 \end{pmatrix} = \begin{pmatrix} 0.8(500) + 0.3(300) \\ 0.2(500) + 0.7(300) \end{pmatrix} = \begin{pmatrix} 490 \\ 310 \end{pmatrix}\).`,
        R`The day after: \(T\begin{pmatrix} 490 \\ 310 \end{pmatrix} = \begin{pmatrix} 392 + 93 \\ 98 + 217 \end{pmatrix} = \begin{pmatrix} 485 \\ 315 \end{pmatrix}\).`,
        'The total stays at 800 bikes, because every bike that leaves one station arrives at the other.',
      ],
      answer: 'Tomorrow: 490 at A and 310 at B. The day after: 485 at A and 315 at B.',
    },
  ],

  models: [
    {
      id: 'transform-square',
      title: 'What a matrix does to the unit square',
      intro: 'Type the four entries of a 2 × 2 matrix. The picture shows the unit square and its image.',
      inputs: [
        { name: 'a', label: 'Top left', type: 'int', min: -4, max: 4, value: 2 },
        { name: 'b', label: 'Top right', type: 'int', min: -4, max: 4, value: 1 },
        { name: 'c', label: 'Bottom left', type: 'int', min: -4, max: 4, value: 1 },
        { name: 'd', label: 'Bottom right', type: 'int', min: -4, max: 4, value: 3 },
      ],
      compute({ a, b, c, d }) {
        const D = a * d - b * c;
        const corners = [[0, 0], [a, c], [a + b, c + d], [b, d]];
        const xs = [0, 1, ...corners.map((p) => p[0])];
        const ys = [0, 1, ...corners.map((p) => p[1])];
        const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 2;
        const mid = (list) => (Math.max(...list) + Math.min(...list)) / 2;
        return {
          problem: R`Describe what the matrix \(M = ${pmat([[a, b], [c, d]])}\) does to the unit square.`,
          steps: [
            R`The columns of \(M\) are the images of the unit vectors: \((1, 0) \to ${point(a, c)}\) and \((0, 1) \to ${point(b, d)}\).`,
            R`The corner \((1, 1)\) goes to the sum of the columns, \(${point(a + b, c + d)}\). So the unit square becomes the figure with corners \((0, 0)\), \(${point(a, c)}\), \(${point(a + b, c + d)}\), \(${point(b, d)}\).`,
            R`Determinant: \(${product(a, d)} - ${product(b, c)} = ${D}\).`,
            D === 0
              ? 'The determinant is 0, so the square is squashed onto a line or a single point. Its image has area 0, and the transformation cannot be undone: the matrix has no inverse.'
              : R`Areas are multiplied by \(|${D}| = ${Math.abs(D)}\), so the image has area \(${Math.abs(D)}\). The determinant is ${D > 0 ? 'positive, so the figure keeps its orientation' : 'negative, so the figure is also flipped over'}.`,
          ],
          answer: D === 0 ? R`The image has area 0: \(M\) flattens the plane and has no inverse.` : R`The image is a parallelogram with area \(${Math.abs(D)}\)${D < 0 ? ', flipped over' : ''}.`,
          visual: {
            type: 'plot',
            x: [mid(xs) - span / 2, mid(xs) + span / 2],
            y: [mid(ys) - span / 2, mid(ys) + span / 2],
            square: true,
            step: [1, 1],
            polygons: [{ points: [[0, 0], [1, 0], [1, 1], [0, 1]], color: 'a' }, { points: corners, color: 'b' }],
            segments: [{ from: [0, 0], to: [a, c], arrow: true, color: 'b' }, { from: [0, 0], to: [b, d], arrow: true, color: 'c' }],
            alt: `The unit square and its image, the figure with corners (0, 0), (${txt(a)}, ${txt(c)}), (${txt(a + b)}, ${txt(c + d)}) and (${txt(b)}, ${txt(d)}). Arrows from the origin show the two columns of the matrix. The image has area ${Math.abs(D)}.`,
          },
        };
      },
    },
    {
      id: 'system-inverse',
      title: 'Solving a system with an inverse matrix',
      intro: 'Type the coefficients of ax + by = e and cx + dy = f. The lines are drawn, and the system is solved as X = A⁻¹B.',
      inputs: [
        { name: 'a', label: 'a', type: 'int', min: -9, max: 9, value: 2 },
        { name: 'b', label: 'b', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'e', label: 'e', type: 'int', min: -20, max: 20, value: 7 },
        { name: 'c', label: 'c', type: 'int', min: -9, max: 9, value: 1 },
        { name: 'd', label: 'd', type: 'int', min: -9, max: 9, value: -3 },
        { name: 'f', label: 'f', type: 'int', min: -20, max: 20, value: -7 },
      ],
      compute({ a, b, c, d, e, f }) {
        const D = a * d - b * c;
        if (D === 0) return { error: 'The determinant ad − bc is 0, so the coefficient matrix has no inverse: the two lines are parallel or identical. Change one coefficient.' };
        const adj = [[d, -b], [-c, a]];
        const top = mul(adj, col(e, f));
        const [x, y] = [frac(top[0][0], D), frac(top[1][0], D)];
        const w = Math.max(6, Math.ceil(Math.abs(x.value)) + 3, Math.ceil(Math.abs(y.value)) + 3);
        return {
          problem: R`Solve \(${terms([[a, 'x'], [b, 'y']])} = ${e}\), \(${terms([[c, 'x'], [d, 'y']])} = ${f}\).`,
          steps: [
            R`Matrix form \(AX = B\): \(${pmat([[a, b], [c, d]])}${pmat(col('x', 'y'))} = ${pmat(col(e, f))}\).`,
            R`\(\det A = ${product(a, d)} - ${product(b, c)} = ${D}\). It is not 0, so \(A^{-1} = ${oneOver(D)}${pmat(adj)}\).`,
            R`\(X = A^{-1}B = ${oneOver(D)}${pmat(adj)}${pmat(col(e, f))} = ${oneOver(D)}${pmat(top)}${D === 1 ? '' : ` = ${pmat(col(x, y))}`}\).`,
            R`Check in the first equation: \(${product(a, x.tex())} + ${product(b, y.tex())} = ${e}\).`,
          ],
          answer: R`\(x = ${x.tex()},\ y = ${y.tex()}\)`,
          visual: {
            type: 'plot',
            x: [-w, w],
            y: [-w, w],
            square: true,
            fns: [b === 0 ? null : { f: (t) => (e - a * t) / b, color: 'a' }, d === 0 ? null : { f: (t) => (f - c * t) / d, color: 'b' }].filter(Boolean),
            vlines: [b === 0 ? { x: e / a, color: 'a', dashed: false } : null, d === 0 ? { x: f / c, color: 'b', dashed: false } : null].filter(Boolean),
            points: [{ x: x.value, y: y.value, label: `(${x.text()}, ${y.text()})`, color: 'c' }],
            alt: `The two lines of the system, crossing at the point (${x.text()}, ${y.text()}), which is the solution.`,
          },
        };
      },
    },
    {
      id: 'transition',
      title: 'Word problem: a two-state transition model',
      word: true,
      intro: 'Two shops share the same customers. Choose the percentage of each shop’s customers that switch every month, and the numbers each shop starts with.',
      inputs: [
        { name: 'p', label: 'A’s customers who switch to B (%)', type: 'int', min: 0, max: 100, value: 20 },
        { name: 'r', label: 'B’s customers who switch to A (%)', type: 'int', min: 0, max: 100, value: 30 },
        { name: 'a', label: 'Customers at A now', type: 'int', min: 0, max: 5000, value: 500 },
        { name: 'b', label: 'Customers at B now', type: 'int', min: 0, max: 5000, value: 300 },
      ],
      compute({ p, r, a, b }) {
        if (p === 0 && r === 0) return { error: 'With 0% switching in both directions nothing ever changes. Choose at least one percentage above 0.' };
        if (a + b === 0) return { error: 'There are no customers yet. Give at least one shop some customers.' };
        const T = [[(100 - p) / 100, r / 100], [p / 100, (100 - r) / 100]];
        const next = ([u, v]) => [T[0][0] * u + T[0][1] * v, T[1][0] * u + T[1][1] * v];
        const states = [[a, b]];
        for (let k = 0; k < 3; k++) states.push(next(states[k]));
        const n1 = (v) => num(v, { places: 1 });
        const steady = [((a + b) * r) / (p + r), ((a + b) * p) / (p + r)];
        const eq = states[1].every((v) => Number.isInteger(round(v, 6))) ? '=' : R`\approx`;
        const swap = p === 100 && r === 100;
        return {
          problem: `Each month ${p}% of shop A's customers switch to shop B and ${r}% of shop B's customers switch to shop A. Shop A has ${txt(a)} customers and shop B has ${txt(b)}. What happens over the next few months?`,
          steps: [
            R`Each shop's customers split into those who stay and those who leave, so use one column per shop: \(T = ${pmat(T.map((row) => row.map((v) => num(v))))}\) (column 1: from A, column 2: from B).`,
            R`After 1 month: \(T${pmat(col(a, b))} = ${pmat([[`${num(T[0][0])}(${a}) + ${num(T[0][1])}(${b})`], [`${num(T[1][0])}(${a}) + ${num(T[1][1])}(${b})`]])} ${eq} ${pmat(col(n1(states[1][0]), n1(states[1][1])))}\).`,
            R`Multiply by \(T\) again for each further month: after 2 months \(${pmat(col(n1(states[2][0]), n1(states[2][1])))}\), after 3 months \(${pmat(col(n1(states[3][0]), n1(states[3][1])))}\).`,
            swap
              ? R`The total stays at \(${num(a + b)}\). Because everybody switches every month, the two shops simply exchange their customers each time, so the numbers alternate and do not settle.`
              : R`The total stays at \(${num(a + b)}\). In the long run the numbers settle where as many customers leave A as arrive, that is, where \(${p}\%\) of A's customers equals \(${r}\%\) of B's: about \(${n1(steady[0])}\) at A and \(${n1(steady[1])}\) at B.`,
          ],
          answer: `After 1 month: about ${txt(states[1][0], { places: 1 })} at A and ${txt(states[1][1], { places: 1 })} at B. ${swap ? 'The two shops keep exchanging their customers.' : `Long-run balance: about ${txt(steady[0], { places: 1 })} at A and ${txt(steady[1], { places: 1 })} at B.`}`,
          visual: {
            type: 'table',
            headers: ['Month', 'Shop A', 'Shop B'],
            rows: states.map(([u, v], k) => [String(k), R`\(${n1(u)}\)`, R`\(${n1(v)}\)`]),
            caption: 'Customers at each shop, month by month',
            alt: `Table of the customers at each shop for months 0 to 3, starting from ${txt(a)} and ${txt(b)}.`,
          },
        };
      },
    },
  ],

  quiz: {
    easy: [easyEntryDimension, easyAddScalar, easyProductDefined, easyDet2],
    medium: [mediumMultiply, mediumInverse, mediumSolveSystem, mediumTransformMatrix],
    hard: [hardDet3, hardProductEntry, hardAreaScale, hardTransition],
    challenge: [challengeSingularK, challengeComposition, challengePreviousState],
  },
};
