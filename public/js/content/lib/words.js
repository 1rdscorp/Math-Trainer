// Names and everyday objects for word problems.
// Stories use first names only and never pronouns, so every student can see themselves in them.

export const NAMES = [
  'Aiden', 'Amara', 'Andre', 'Anika', 'Ben', 'Carlos', 'Chloe', 'Daniel', 'Elena', 'Fatima',
  'Grace', 'Hana', 'Imani', 'Isaac', 'Jamal', 'Jada', 'Kai', 'Leah', 'Liam', 'Lucia',
  'Maya', 'Mei', 'Mateo', 'Nadia', 'Noah', 'Olivia', 'Omar', 'Priya', 'Quinn', 'Rosa',
  'Sam', 'Sofia', 'Tariq', 'Tessa', 'Uma', 'Victor', 'Wei', 'Yara', 'Zane', 'Zoe',
];

/** Countable things for early-grade stories: { one, many }. */
export const THINGS = [
  { one: 'apple', many: 'apples' },
  { one: 'sticker', many: 'stickers' },
  { one: 'marble', many: 'marbles' },
  { one: 'pencil', many: 'pencils' },
  { one: 'book', many: 'books' },
  { one: 'shell', many: 'shells' },
  { one: 'crayon', many: 'crayons' },
  { one: 'bead', many: 'beads' },
  { one: 'toy car', many: 'toy cars' },
  { one: 'cookie', many: 'cookies' },
  { one: 'balloon', many: 'balloons' },
  { one: 'flower', many: 'flowers' },
  { one: 'block', many: 'blocks' },
  { one: 'coin', many: 'coins' },
  { one: 'card', many: 'cards' },
  { one: 'button', many: 'buttons' },
];

/** A random first name. */
export function person(rng) {
  return rng.pick(NAMES);
}

/** k different first names. */
export function people(rng, k) {
  return rng.sample(NAMES, k);
}

/** A random countable thing: { one: 'apple', many: 'apples' }. */
export function thing(rng) {
  return rng.pick(THINGS);
}
