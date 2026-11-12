import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server/server.js';
import { emptyProgress, recordAnswer } from '../public/js/core/progress.js';

let app;
let base;
let dataDir;

before(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'mt-server-'));
  app = createApp({ dataDir, scryptCost: 1024, loginLimit: 4 });
  await app.init();
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.server.address().port}`;
});

after(async () => {
  await app.close();
  await rm(dataDir, { recursive: true, force: true });
});

/** A tiny client that keeps the session cookie, like a browser. */
function client() {
  let cookie = '';
  return async (method, url, body, extra = {}) => {
    const headers = { 'X-Requested-With': 'MathTrainer', ...extra };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* no JSON body */
    }
    return { status: res.status, json, headers: res.headers };
  };
}

const sample = () => {
  const doc = emptyProgress();
  recordAnswer(doc, 'g1-5/add-sub-20', { tier: 0, correct: true, skill: 'make ten', delta: 5, now: 1 });
  return doc;
};

test('health check reports that accounts are available', async () => {
  const r = await client()('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true, accounts: true });
});

test('sign up, save progress, sign in elsewhere, sign out', async () => {
  const a = client();
  let r = await a('POST', '/api/signup', { name: 'Maya 7', password: 'purple-tiger', progress: sample() });
  assert.equal(r.status, 201);
  assert.equal(r.json.name, 'Maya 7');
  const cookie = r.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);

  r = await a('GET', '/api/me');
  assert.deepEqual(r.json, { name: 'Maya 7' });
  r = await a('GET', '/api/progress');
  assert.equal(r.json.progress.points, 5, 'the guest progress sent at sign-up was kept');

  const doc = r.json.progress;
  doc.points = 40;
  r = await a('PUT', '/api/progress', { progress: doc });
  assert.equal(r.status, 200);

  // Another device: the name is not case-sensitive.
  const b = client();
  r = await b('POST', '/api/login', { name: 'maya 7', password: 'purple-tiger' });
  assert.equal(r.status, 200);
  assert.equal(r.json.name, 'Maya 7');
  r = await b('GET', '/api/progress');
  assert.equal(r.json.progress.points, 40);

  r = await b('POST', '/api/logout', {});
  assert.equal(r.status, 200);
  r = await b('GET', '/api/me');
  assert.equal(r.status, 401);
  r = await a('GET', '/api/me');
  assert.equal(r.status, 200, 'signing out on one device does not sign out the other');
});

test('the secret word is never stored in readable form', async () => {
  await client()('POST', '/api/signup', { name: 'Hashed', password: 'do-not-store-me' });
  const files = await readdir(path.join(dataDir, 'users'));
  let found = false;
  for (const f of files) {
    const text = await readFile(path.join(dataDir, 'users', f), 'utf8');
    assert.ok(!text.includes('do-not-store-me'));
    if (text.includes('"Hashed"')) found = true;
  }
  assert.ok(found);
  assert.ok(!(await readFile(path.join(dataDir, 'sessions.json'), 'utf8')).includes('do-not-store-me'));
});

test('names and secret words are validated; duplicates are refused', async () => {
  const c = client();
  for (const name of ['ab', '', 'x'.repeat(21), '<script>', 'a@b.com', '../etc']) {
    const r = await c('POST', '/api/signup', { name, password: 'long-enough' });
    assert.equal(r.status, 400, `name "${name}"`);
    assert.equal(r.json.error, 'invalid-name');
  }
  let r = await c('POST', '/api/signup', { name: 'Shorty', password: '12345' });
  assert.equal(r.json.error, 'weak-password');
  r = await c('POST', '/api/signup', { name: 'Twin', password: 'secret-one' });
  assert.equal(r.status, 201);
  r = await client()('POST', '/api/signup', { name: 'TWIN', password: 'secret-two' });
  assert.equal(r.status, 409);
  assert.equal(r.json.error, 'name-taken');
});

test('wrong secret words are refused, then rate-limited; unknown names look the same', async () => {
  await client()('POST', '/api/signup', { name: 'Limited', password: 'right-word' });
  const c = client();
  for (let i = 0; i < 4; i++) {
    const r = await c('POST', '/api/login', { name: 'Limited', password: `wrong-${i}` });
    assert.equal(r.status, 401);
    assert.equal(r.json.error, 'bad-credentials');
  }
  let r = await c('POST', '/api/login', { name: 'Limited', password: 'right-word' });
  assert.equal(r.status, 429, 'locked for a while after repeated failures, even with the right word');
  r = await client()('POST', '/api/login', { name: 'Nobody Here', password: 'whatever' });
  assert.equal(r.status, 401);
  assert.equal(r.json.error, 'bad-credentials');
});

test('progress needs a session', async () => {
  const c = client();
  assert.equal((await c('GET', '/api/progress')).status, 401);
  assert.equal((await c('PUT', '/api/progress', { progress: emptyProgress() })).status, 401);
  assert.equal((await c('DELETE', '/api/account', { password: 'x' })).status, 401);
});

test('changes are refused without the app header, from another origin, or with the wrong content type', async () => {
  const c = client();
  let r = await c('POST', '/api/signup', { name: 'Csrf One', password: 'long-enough' }, { 'X-Requested-With': 'SomethingElse' });
  assert.equal(r.status, 403);
  r = await c('POST', '/api/signup', { name: 'Csrf Two', password: 'long-enough' }, { Origin: 'https://evil.example' });
  assert.equal(r.status, 403);
  const res = await fetch(`${base}/api/signup`, { method: 'POST', headers: { 'X-Requested-With': 'MathTrainer', 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(res.status, 415);
  r = await c('POST', '/api/signup', '{not json');
  assert.equal(r.status, 400);
});

test('saved progress is repaired and size-limited', async () => {
  const c = client();
  await c('POST', '/api/signup', { name: 'Junk Sender', password: 'long-enough' });
  let r = await c('PUT', '/api/progress', { progress: { points: -50, topics: 'nope', history: [{ bad: true }], extra: '<script>' } });
  assert.equal(r.status, 200);
  r = await c('GET', '/api/progress');
  assert.equal(r.json.progress.points, 0);
  assert.deepEqual(r.json.progress.topics, {});
  assert.equal(r.json.progress.extra, undefined);
  r = await c('PUT', '/api/progress', { progress: { blob: 'x'.repeat(600 * 1024) } });
  assert.equal(r.status, 413);
});

test('deleting an account needs the secret word and removes everything', async () => {
  const c = client();
  await c('POST', '/api/signup', { name: 'Leaver', password: 'bye-bye-bye' });
  let r = await c('DELETE', '/api/account', { password: 'wrong' });
  assert.equal(r.status, 401);
  r = await c('DELETE', '/api/account', { password: 'bye-bye-bye' });
  assert.equal(r.status, 200);
  assert.equal((await c('GET', '/api/me')).status, 401);
  assert.equal((await client()('POST', '/api/login', { name: 'Leaver', password: 'bye-bye-bye' })).status, 401);
  for (const f of await readdir(path.join(dataDir, 'users'))) {
    assert.ok(!(await readFile(path.join(dataDir, 'users', f), 'utf8')).includes('"Leaver"'));
  }
});

test('accounts that have not been used for a long time are deleted', async () => {
  const c = client();
  await c('POST', '/api/signup', { name: 'Dormant', password: 'long-enough' });
  const dir = path.join(dataDir, 'users');
  for (const f of await readdir(dir)) {
    const file = path.join(dir, f);
    const user = JSON.parse(await readFile(file, 'utf8'));
    if (user.name === 'Dormant') await writeFile(file, JSON.stringify({ ...user, lastSeen: Date.now() - 401 * 86400000 }));
  }
  await app.purge();
  assert.equal((await client()('POST', '/api/login', { name: 'Dormant', password: 'long-enough' })).status, 401);
  assert.equal((await c('GET', '/api/me')).status, 401, 'its sessions are gone too');
});

test('static files: served with security headers, cached with ETags, no escaping the public folder', async () => {
  let res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(await res.text(), /Math Trainer/);

  res = await fetch(`${base}/js/app.js`);
  assert.match(res.headers.get('content-type'), /javascript/);
  const etag = res.headers.get('etag');
  await res.arrayBuffer();
  res = await fetch(`${base}/js/app.js`, { headers: { 'If-None-Match': etag } });
  assert.equal(res.status, 304);

  res = await fetch(`${base}/vendor/katex/katex.min.css`);
  assert.match(res.headers.get('cache-control'), /max-age/);
  await res.arrayBuffer();

  // Text is compressed when the browser accepts it, and still correct after decompression.
  res = await fetch(`${base}/css/styles.css`, { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(res.headers.get('content-encoding'), 'gzip');
  assert.match(await res.text(), /Math Trainer — styles/);
  res = await fetch(`${base}/vendor/katex/fonts/KaTeX_Main-Regular.woff2`, { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(res.headers.get('content-encoding'), null, 'fonts are already compressed');
  await res.arrayBuffer();

  for (const bad of ['/..%2fpackage.json', '/%2e%2e/%2e%2e/etc/passwd', '/js/../../server/server.js', '/nope.html']) {
    res = await fetch(base + bad);
    assert.ok([403, 404].includes(res.status), `${bad} → ${res.status}`);
    assert.ok(!(await res.text()).includes('"name": "math-trainer"'));
  }
  res = await fetch(`${base}/css/styles.css`, { method: 'HEAD' });
  assert.equal(res.status, 200);
  res = await fetch(`${base}/`, { method: 'POST' });
  assert.equal(res.status, 405);
});

test('with accounts switched off the app is still served and says so', async () => {
  const off = createApp({ accounts: false });
  await new Promise((resolve) => off.server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${off.server.address().port}`;
  try {
    let res = await fetch(`${url}/api/health`);
    assert.deepEqual(await res.json(), { ok: true, accounts: false });
    res = await fetch(`${url}/api/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'MathTrainer' }, body: JSON.stringify({ name: 'Nope', password: 'long-enough' }) });
    assert.equal(res.status, 404);
    res = await fetch(`${url}/`);
    assert.equal(res.status, 200);
    await res.text();
  } finally {
    await off.close();
  }
});
