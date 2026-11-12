// What the app says after an answer. Wording follows the research summarised in
// docs/pedagogy-and-standards.md: name the action, not the person; never shame a wrong
// answer; keep it short and concrete for young children and matter-of-fact for older students.

const RIGHT = {
  elementary: ['Yes! That is right.', 'You got it. Nice careful work.', 'Correct! You worked it out.', 'That is right. Good thinking.', 'Yes! Your steps worked.'],
  middle: ['Correct. Nice work.', 'That is right.', 'Yes, you worked that out well.', 'Correct. Good reasoning.'],
  high: ['Correct.', 'That is right.', 'Correct. Solid work.'],
  college: ['Correct.', 'Right.', 'Correct. Well reasoned.'],
};

const NOT_YET = {
  elementary: ['Not yet. Let us look at it together.', 'Not quite. Mistakes help your brain grow.', 'Not this time. Here is how it works.', 'Close look needed. Let us go through the steps.'],
  middle: ['Not quite. Here is how it works.', 'Not yet. Take a look at the steps.', 'Not this time. Compare your work with the solution.'],
  high: ['Not quite. Here is the worked solution.', 'Not this time. Check the steps below.'],
  college: ['Not quite. See the solution below.', 'Incorrect. The worked solution follows.'],
};

const UP = {
  elementary: (tier) => `Level up! Three in a row. Now try ${tier} questions.`,
  middle: (tier) => `Three in a row! You are moving up to ${tier}.`,
  high: (tier) => `Three in a row. Moving up to ${tier}.`,
  college: (tier) => `Three in a row. Moving up to ${tier}.`,
};

const DOWN = {
  elementary: (tier) => `Let us practise some ${tier} questions next. You can climb back up.`,
  middle: (tier) => `Next come some ${tier} questions to rebuild. Three in a row moves you back up.`,
  high: (tier) => `Dropping to ${tier} for now. Three in a row moves you back up.`,
  college: (tier) => `Dropping to ${tier} for now. Three in a row moves you back up.`,
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const tone = {
  right: (band) => pick(RIGHT[band] ?? RIGHT.middle),
  notYet: (band) => pick(NOT_YET[band] ?? NOT_YET.middle),
  tierUp: (band, tierName) => (UP[band] ?? UP.middle)(tierName),
  tierDown: (band, tierName) => (DOWN[band] ?? DOWN.middle)(tierName),
};
