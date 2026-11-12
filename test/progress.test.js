import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyProgress, normalizeProgress, recordAnswer, saveRun, completeRun, abandonRun, isCompleted, summarize,
  weakAreas, weakFacts, mergeProgress, hasActivity, HISTORY_LIMIT,
} from '../public/js/core/progress.js';
import { newQuizState, applyAnswer } from '../public/js/core/engine.js';
import { createStore, StoreError, validateName, validatePassword } from '../public/js/core/store.js';

const KEY = 'g1-5/add-sub-20';

test('recordAnswer tracks totals, tiers, skills and lifetime points (never below 0)', () => {
  const doc = emptyProgress();
  recordAnswer(doc, KEY, { tier: 0, correct: true, skill: 'make-ten', delta: 5, now: 10 });
  recordAnswer(doc, KEY, { tier: 0, correct: false, skill: 'make-ten', delta: -2, now: 20 });
  recordAnswer(doc, KEY, { tier: 1, correct: false, delta: -4, now: 30 });
  const t = doc.topics[KEY];
  assert.equal(t.att, 3);
  assert.equal(t.cor, 1);
  assert.deepEqual(t.tiers[0], [2, 1]);
  assert.deepEqual(t.tiers[1], [1, 0]);
  assert.deepEqual(t.skills['make-ten'], [2, 1]);
  assert.equal(doc.points, 0); // 5 − 2 − 4 would be −1; floor at 0
  assert.equal(t.last, 30);
});

test('a run is saved with its tier, then completion clears it and writes history', () => {
  const doc = emptyProgress();
  let s = newQuizState(1000);
  for (let i = 0; i < 4; i++) s = applyAnswer(s, true).state;
  saveRun(doc, KEY, s, 2000);
  assert.equal(doc.topics[KEY].run.tier, 1);
  assert.equal(doc.topics[KEY].run.score, 25);
  assert.equal(isCompleted(doc, KEY), false);
  while (!s.done) s = applyAnswer(s, true).state;
  completeRun(doc, KEY, s, 61000);
  assert.equal(doc.topics[KEY].run, null);
  assert.equal(doc.topics[KEY].done, 1);
  assert.equal(isCompleted(doc, KEY), true);
  assert.deepEqual(doc.history[0], { t: 61000, k: KEY, s: s.score, a: 10, c: 10, m: 3, d: 1, secs: 60 });
});

test('abandoning a run records it as unfinished only if something was answered', () => {
  const doc = emptyProgress();
  saveRun(doc, KEY, newQuizState(0), 5);
  abandonRun(doc, KEY, 10);
  assert.equal(doc.history.length, 0);
  saveRun(doc, KEY, applyAnswer(newQuizState(0), true).state, 5);
  abandonRun(doc, KEY, 10);
  assert.equal(doc.history.length, 1);
  assert.equal(doc.history[0].d, 0);
  assert.equal(doc.topics[KEY].run, null);
});

test('history is capped', () => {
  const doc = emptyProgress();
  for (let i = 0; i < HISTORY_LIMIT + 20; i++) completeRun(doc, KEY, { ...newQuizState(0), score: 100, answered: 10, correct: 10, maxTier: 3 }, i);
  assert.equal(doc.history.length, HISTORY_LIMIT);
  assert.equal(doc.history.at(-1).t, HISTORY_LIMIT + 19);
});

test('summary and weak areas', () => {
  const doc = emptyProgress();
  for (let i = 0; i < 6; i++) recordAnswer(doc, 'a/weak', { tier: 0, correct: i < 2, skill: 'regroup', delta: 0 });
  for (let i = 0; i < 6; i++) recordAnswer(doc, 'a/strong', { tier: 0, correct: true, skill: 'x', delta: 5 });
  for (let i = 0; i < 3; i++) recordAnswer(doc, 'a/few', { tier: 0, correct: false, delta: 0 });
  // A strong topic with one weak sub-skill is still reported, for that skill.
  for (let i = 0; i < 4; i++) recordAnswer(doc, 'a/strong', { tier: 1, correct: i === 0, skill: 'borrow', delta: 0 });
  completeRun(doc, 'a/strong', { ...newQuizState(0), score: 100 }, 5);
  const s = summarize(doc);
  assert.equal(s.answered, 19);
  assert.equal(s.correct, 9);
  assert.equal(s.completed, 1);
  assert.equal(s.accuracy, 47);
  const weak = weakAreas(doc);
  assert.deepEqual(weak.map((w) => w.key), ['a/weak', 'a/strong']);
  assert.equal(weak[0].accuracy, 33);
  assert.equal(weak[0].weakTopic, true);
  assert.equal(weak[0].skills[0].tag, 'regroup');
  assert.equal(weak[1].weakTopic, false);
  assert.deepEqual(weak[1].skills.map((k) => k.tag), ['borrow']);
});

test('weak multiplication facts', () => {
  const doc = emptyProgress();
  doc.times.facts['7x8'] = [4, 1, 9000];
  doc.times.facts['2x3'] = [4, 4, 4000];
  doc.times.facts['6x9'] = [1, 0, 3000];
  assert.deepEqual(weakFacts(doc).map((f) => f.fact), ['7x8']);
});

test('normalizeProgress repairs junk without throwing', () => {
  for (const junk of [null, 5, 'x', [], { points: -3, topics: 7, history: 'no' }, { topics: { a: { att: 2, cor: 9, tiers: 'x', run: { tier: 99, asked: [1, 'k'] } } } }]) {
    const d = normalizeProgress(junk);
    assert.equal(d.v, 1);
    assert.ok(d.points >= 0);
    assert.ok(Array.isArray(d.history));
  }
  const d = normalizeProgress({ topics: { a: { att: 2, cor: 9, run: { tier: 99, score: 30, asked: [1, 'k'] } } } });
  assert.equal(d.topics.a.cor, 2);
  assert.equal(d.topics.a.run.tier, 3);
  assert.deepEqual(d.topics.a.run.asked, ['k']);
  assert.equal(hasActivity(emptyProgress()), false);
  assert.equal(hasActivity(d), true);
});

test('mergeProgress adds counts and keeps the further-along unfinished quiz', () => {
  const acct = emptyProgress();
  const guest = emptyProgress();
  recordAnswer(acct, KEY, { tier: 0, correct: true, skill: 's', delta: 5, now: 1 });
  saveRun(acct, KEY, { ...newQuizState(0), score: 40, tier: 2 }, 1);
  completeRun(acct, 'x/y', { ...newQuizState(0), score: 100 }, 2);
  recordAnswer(guest, KEY, { tier: 0, correct: false, skill: 's', delta: 0, now: 3 });
  recordAnswer(guest, 'new/topic', { tier: 0, correct: true, delta: 5, now: 4 });
  saveRun(guest, KEY, { ...newQuizState(0), score: 10, tier: 0 }, 3);
  guest.times.facts['7x8'] = [2, 1, 5000];
  guest.memory.sequence = { level: 4, best: 6 };
  acct.memory.sequence = { level: 2, best: 7 };
  const m = mergeProgress(acct, guest);
  assert.equal(m.points, 10);
  assert.equal(m.topics[KEY].att, 2);
  assert.deepEqual(m.topics[KEY].skills.s, [2, 1]);
  assert.equal(m.topics[KEY].run.score, 40);
  assert.ok(m.topics['new/topic']);
  assert.equal(m.topics['x/y'].done, 1);
  assert.deepEqual(m.times.facts['7x8'], [2, 1, 5000]);
  assert.deepEqual(m.memory.sequence, { level: 4, best: 7 });
  // Inputs are not modified.
  assert.equal(acct.points, 5);
});

// ───────── store ─────────
function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _map: m };
}
const noServer = async () => { throw new Error('offline'); };

test('guest progress lives only in session storage', async () => {
  const local = fakeStorage();
  const session = fakeStorage();
  const store = createStore({ local, session, fetch: noServer });
  await store.init();
  assert.equal(store.isGuest, true);
  store.change((d) => recordAnswer(d, KEY, { tier: 0, correct: true, delta: 5 }));
  assert.equal(local._map.size, 0, 'nothing is written to permanent storage for a guest');
  assert.ok(session._map.has('mt.guest'));
  // Same tab, page refreshed: progress is still there.
  const again = createStore({ local, session, fetch: noServer });
  await again.init();
  assert.equal(again.progress.points, 5);
  // App closed (session storage gone): progress is gone.
  const fresh = createStore({ local, session: fakeStorage(), fetch: noServer });
  await fresh.init();
  assert.equal(fresh.progress.points, 0);
});

test('device account: sign up keeps the guest progress, survives restart, sign out returns to an empty guest', async () => {
  const local = fakeStorage();
  const session = fakeStorage();
  const store = createStore({ local, session, fetch: noServer });
  await store.init();
  store.change((d) => recordAnswer(d, KEY, { tier: 0, correct: true, delta: 5 }));
  const r = await store.signUp('Maya 7', 'purple-tiger');
  assert.deepEqual(r, { name: 'Maya 7', where: 'device' });
  assert.equal(store.progress.points, 5);
  assert.equal(session._map.has('mt.guest'), false);
  assert.ok(!JSON.stringify([...local._map.values()]).includes('purple-tiger'), 'the secret word is never stored in readable form');
  store.change((d) => recordAnswer(d, KEY, { tier: 0, correct: true, delta: 5 }));

  const restarted = createStore({ local, session: fakeStorage(), fetch: noServer });
  await restarted.init();
  assert.equal(restarted.user.name, 'Maya 7');
  assert.equal(restarted.progress.points, 10);

  await restarted.signOut();
  assert.equal(restarted.isGuest, true);
  assert.equal(restarted.progress.points, 0);
  await assert.rejects(restarted.signIn('maya 7', 'wrong-word'), (e) => e instanceof StoreError && e.code === 'bad-credentials');
  const back = await restarted.signIn('MAYA 7', 'purple-tiger');
  assert.equal(back.merged, false);
  assert.equal(restarted.progress.points, 10);
});

test('device account: duplicate names are refused, guest work is merged on sign-in, delete needs the secret word', async () => {
  const local = fakeStorage();
  const a = createStore({ local, session: fakeStorage(), fetch: noServer });
  await a.init();
  await a.signUp('Sam', 'secret1');
  a.change((d) => recordAnswer(d, KEY, { tier: 0, correct: true, delta: 5 }));
  await a.signOut();
  await assert.rejects(a.signUp('sam', 'another1'), (e) => e.code === 'name-taken');
  a.change((d) => recordAnswer(d, 'x/y', { tier: 1, correct: true, delta: 10 }));
  const r = await a.signIn('Sam', 'secret1');
  assert.equal(r.merged, true);
  assert.equal(a.progress.points, 15);
  await assert.rejects(a.deleteAccount('nope'), (e) => e.code === 'bad-credentials');
  await a.deleteAccount('secret1');
  assert.equal(a.isGuest, true);
  await assert.rejects(a.signIn('Sam', 'secret1'), (e) => e.code === 'bad-credentials');
});

test('name and secret-word rules', () => {
  assert.equal(validateName('  Maya   7 '), 'Maya 7');
  for (const bad of ['', 'ab', 'x'.repeat(21), '<b>hi</b>', 'a@b.com', '-abc', '  ']) assert.throws(() => validateName(bad), (e) => e.code === 'invalid-name');
  assert.throws(() => validatePassword('12345'), (e) => e.code === 'weak-password');
  assert.equal(validatePassword('123456'), '123456');
});

test('server account: signs up through the API, debounces saves, and pushes unsaved work', async () => {
  const calls = [];
  let remoteDoc = null;
  let fail = false;
  const fetch = async (url, init) => {
    const path = new URL(url).pathname;
    calls.push(`${init.method} ${path}`);
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
    if (fail) throw new Error('network down');
    if (path === '/api/health') return json(200, { ok: true, accounts: true });
    if (path === '/api/signup') { remoteDoc = JSON.parse(init.body).progress; return json(201, { name: 'Kai' }); }
    if (path === '/api/me') return json(200, { name: 'Kai' });
    if (path === '/api/progress' && init.method === 'GET') return json(200, { progress: remoteDoc });
    if (path === '/api/progress' && init.method === 'PUT') { remoteDoc = JSON.parse(init.body).progress; return json(200, { ok: true }); }
    if (path === '/api/logout') return json(200, {});
    return json(404, { error: 'not-found' });
  };
  const timers = [];
  const env = { local: fakeStorage(), session: fakeStorage(), fetch, base: 'http://x.test/', setTimeout: (fn) => timers.push(fn), saveDelay: 1 };
  const store = createStore(env);
  await store.init();
  const r = await store.signUp('Kai', 'secret-word');
  assert.equal(r.where, 'server');
  store.change((d) => recordAnswer(d, KEY, { tier: 0, correct: true, delta: 5 }));
  store.change((d) => recordAnswer(d, KEY, { tier: 0, correct: true, delta: 5 }));
  assert.equal(timers.length, 1, 'two quick changes make one scheduled save');
  assert.equal(store.status, 'saving');
  timers.shift()();
  await new Promise((r2) => setImmediate(r2));
  await new Promise((r2) => setImmediate(r2));
  assert.equal(remoteDoc.points, 10);
  assert.equal(store.status, 'saved');

  // Server unreachable: the change is kept on this device and flagged as pending.
  fail = true;
  store.change((d) => recordAnswer(d, KEY, { tier: 0, correct: true, delta: 5 }));
  timers.shift()();
  await new Promise((r2) => setImmediate(r2));
  await new Promise((r2) => setImmediate(r2));
  assert.equal(store.status, 'offline');
  assert.equal(remoteDoc.points, 10);

  // Next start-up with the server back: the pending copy is pushed.
  fail = false;
  const next = createStore(env);
  await next.init();
  await new Promise((r2) => setTimeout(r2, 20));
  assert.equal(next.user.name, 'Kai');
  assert.equal(remoteDoc.points, 15);
  assert.equal(next.status, 'saved');
});
