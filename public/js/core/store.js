// Where progress lives, and optional accounts.
//
//   Guest (default)     progress is kept in sessionStorage: it survives a page refresh but is gone
//                       when the tab or app is closed. Nothing is ever required of a guest.
//   Signed in, device   used when the app is served as plain static files (no server). The account and
//                       its progress are kept in this browser's localStorage.
//   Signed in, server   used when the app is served by server/server.js. Progress is saved to the
//                       account on the server, so the student can sign in from any device.
//
// The store is created with its environment passed in, so the same code runs in tests.

import { emptyProgress, normalizeProgress, mergeProgress, hasActivity } from './progress.js';
import { hashSecret, randomHex } from './sha256.js';

const KEY = {
  guest: 'mt.guest',
  session: 'mt.session',
  account: (k) => `mt.acct.${k}`,
  data: (k) => `mt.data.${k}`,
  pending: (k) => `mt.pending.${k}`,
};

export class StoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StoreError';
    this.code = code;
  }
}

export const NAME_MIN = 3;
export const NAME_MAX = 20;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;
const NAME_RULE = /^[A-Za-z0-9](?:[A-Za-z0-9 _-]*[A-Za-z0-9])?$/;

/** Returns the cleaned nickname or throws StoreError('invalid-name'). */
export function validateName(name) {
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (clean.length < NAME_MIN || clean.length > NAME_MAX || !NAME_RULE.test(clean)) {
    throw new StoreError('invalid-name', `Pick a nickname with ${NAME_MIN} to ${NAME_MAX} letters or numbers.`);
  }
  return clean;
}

export function validatePassword(password) {
  const p = String(password ?? '');
  if (p.length < PASSWORD_MIN || p.length > PASSWORD_MAX) {
    throw new StoreError('weak-password', `Your secret word needs at least ${PASSWORD_MIN} characters.`);
  }
  return p;
}

const nameKey = (name) => name.toLowerCase();

function readJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    /* storage unavailable: nothing to remove */
  }
}

export function createStore(env = {}) {
  const local = env.local ?? safeStorage('localStorage');
  const session = env.session ?? safeStorage('sessionStorage');
  const doFetch = env.fetch ?? globalThis.fetch?.bind(globalThis);
  const base = env.base ?? globalThis.document?.baseURI ?? 'http://localhost/';
  const now = env.now ?? (() => Date.now());
  const later = env.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
  const saveDelay = env.saveDelay ?? 1200;

  let doc = emptyProgress();
  let user = null; // { name, where: 'device' | 'server' }
  let status = 'local'; // 'local' | 'saved' | 'saving' | 'offline'
  let serverProbe = null;
  let saveTimer = null;
  let saving = null;
  const listeners = new Set();

  const notify = () => listeners.forEach((fn) => fn());

  // ── server calls ──
  async function api(method, path, body, { keepalive = false, timeout = 10000 } = {}) {
    if (!doFetch) throw new StoreError('network', 'No network available.');
    let res;
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
    try {
      res = await doFetch(new URL(path, base).href, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'MathTrainer' },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
        keepalive,
        signal: ctrl?.signal,
      });
    } catch {
      throw new StoreError('network', 'Could not reach the server. Check your connection and try again.');
    } finally {
      if (timer) clearTimeout(timer);
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* empty or non-JSON body */
    }
    if (!res.ok) {
      const code = data?.error ?? (res.status === 401 ? 'unauthorized' : res.status === 429 ? 'rate-limited' : 'server');
      throw new StoreError(code, data?.message ?? `The server said no (${res.status}).`);
    }
    return data;
  }

  /** Is the account server available? (Static hosting has none; then accounts live on this device.) */
  function probeServer() {
    if (!serverProbe) {
      serverProbe = api('GET', 'api/health', undefined, { timeout: 3000 })
        .then((d) => d?.ok === true && d?.accounts === true)
        .catch(() => false);
    }
    return serverProbe;
  }

  // ── persistence ──
  function persist() {
    if (!user) {
      writeJson(session, KEY.guest, doc);
      return;
    }
    const k = nameKey(user.name);
    const ok = writeJson(local, KEY.data(k), doc);
    if (user.where === 'device') {
      status = ok ? 'local' : 'offline';
      return;
    }
    writeJson(local, KEY.pending(k), 1);
    scheduleRemoteSave();
  }

  function scheduleRemoteSave(delay = saveDelay, retry = false) {
    if (!retry) status = 'saving';
    if (saveTimer != null) return;
    saveTimer = later(() => {
      saveTimer = null;
      pushNow().catch(() => {});
    }, delay);
  }

  async function pushNow({ keepalive = false } = {}) {
    if (!user || user.where !== 'server') return;
    if (saving) {
      await saving.catch(() => {});
    }
    const k = nameKey(user.name);
    const snapshotTime = doc.updatedAt;
    status = 'saving';
    saving = api('PUT', 'api/progress', { progress: doc }, { keepalive })
      .then(() => {
        if (doc.updatedAt === snapshotTime) {
          remove(local, KEY.pending(k));
          status = 'saved';
        } else {
          scheduleRemoteSave();
        }
      })
      .catch((err) => {
        if (err.code === 'unauthorized') {
          // The sign-in expired. Keep the unsaved copy on this device; it is pushed on the next sign-in.
          dropSession();
        } else {
          status = 'offline';
          scheduleRemoteSave(15000, true);
        }
        throw err;
      })
      .finally(() => {
        saving = null;
        notify();
      });
    notify();
    return saving;
  }

  function dropSession() {
    user = null;
    remove(local, KEY.session);
    remove(session, KEY.guest);
    doc = emptyProgress();
    status = 'local';
  }

  function becomeUser(name, where, progress) {
    user = { name, where };
    doc = normalizeProgress(progress);
    writeJson(local, KEY.session, { name, where });
    writeJson(local, KEY.data(nameKey(name)), doc);
    remove(session, KEY.guest);
    status = where === 'server' ? 'saved' : 'local';
  }

  // ── start-up ──
  /** Restore whoever was signed in (if anyone), otherwise this tab's guest progress. */
  async function init() {
    const sess = readJson(local, KEY.session);
    if (sess?.where === 'device' && typeof sess.name === 'string' && readJson(local, KEY.account(nameKey(sess.name)))) {
      user = { name: sess.name, where: 'device' };
      doc = normalizeProgress(readJson(local, KEY.data(nameKey(sess.name))));
      status = 'local';
    } else if (sess?.where === 'server' && typeof sess.name === 'string') {
      // Show the copy cached on this device straight away, then check with the server.
      user = { name: sess.name, where: 'server' };
      doc = normalizeProgress(readJson(local, KEY.data(nameKey(sess.name))));
      status = 'saving';
      refreshFromServer().catch(() => {});
    } else {
      doc = normalizeProgress(readJson(session, KEY.guest));
    }
    notify();
  }

  async function refreshFromServer() {
    const k = nameKey(user.name);
    try {
      await api('GET', 'api/me');
      if (readJson(local, KEY.pending(k))) {
        await pushNow(); // this device has changes the server has not seen yet
      } else {
        const remote = await api('GET', 'api/progress');
        doc = normalizeProgress(remote?.progress);
        writeJson(local, KEY.data(k), doc);
        status = 'saved';
      }
    } catch (err) {
      if (err.code === 'unauthorized') dropSession();
      else status = 'offline';
    }
    notify();
  }

  // ── accounts ──
  async function signUp(name, password) {
    const clean = validateName(name);
    const pw = validatePassword(password);
    const k = nameKey(clean);
    if (await probeServer()) {
      const res = await api('POST', 'api/signup', { name: clean, password: pw, progress: doc });
      becomeUser(res?.name ?? clean, 'server', doc);
    } else {
      if (readJson(local, KEY.account(k))) throw new StoreError('name-taken', 'That nickname is already used on this device. Try another one.');
      const salt = randomHex(16);
      const ok = writeJson(local, KEY.account(k), { name: clean, salt, hash: hashSecret(pw, salt), created: now() });
      if (!ok) throw new StoreError('storage', 'This browser would not let us save. Private browsing mode can block saving.');
      becomeUser(clean, 'device', doc);
    }
    notify();
    return { name: user.name, where: user.where };
  }

  async function signIn(name, password) {
    const clean = validateName(name);
    const pw = String(password ?? '');
    const k = nameKey(clean);
    const guestDoc = user ? emptyProgress() : doc;
    const bringGuest = hasActivity(guestDoc);
    let saved;
    let where;
    let displayName = clean;
    if (await probeServer()) {
      const res = await api('POST', 'api/login', { name: clean, password: pw });
      displayName = res?.name ?? clean;
      where = 'server';
      if (readJson(local, KEY.pending(k))) {
        saved = readJson(local, KEY.data(k)); // unsaved changes from an expired session on this device
      } else {
        saved = (await api('GET', 'api/progress'))?.progress;
      }
    } else {
      const acct = readJson(local, KEY.account(k));
      if (!acct || hashSecret(pw, acct.salt) !== acct.hash) {
        throw new StoreError('bad-credentials', 'That nickname and secret word do not match. Check them and try again.');
      }
      displayName = acct.name;
      where = 'device';
      saved = readJson(local, KEY.data(k));
    }
    const merged = bringGuest ? mergeProgress(saved, guestDoc) : normalizeProgress(saved);
    becomeUser(displayName, where, merged);
    if (where === 'server' && (bringGuest || readJson(local, KEY.pending(k)))) {
      doc.updatedAt = now();
      persist();
    }
    notify();
    return { name: user.name, where: user.where, merged: bringGuest };
  }

  async function signOut() {
    if (user?.where === 'server') {
      try {
        if (readJson(local, KEY.pending(nameKey(user.name)))) await pushNow();
      } catch {
        /* still sign out; the unsaved copy stays on this device for the next sign-in */
      }
      try {
        await api('POST', 'api/logout');
      } catch {
        /* the cookie is cleared on the next successful request */
      }
    }
    dropSession();
    notify();
  }

  async function deleteAccount(password) {
    if (!user) throw new StoreError('unauthorized', 'You are not signed in.');
    const k = nameKey(user.name);
    if (user.where === 'server') {
      await api('DELETE', 'api/account', { password: String(password ?? '') });
    } else {
      const acct = readJson(local, KEY.account(k));
      if (!acct || hashSecret(String(password ?? ''), acct.salt) !== acct.hash) {
        throw new StoreError('bad-credentials', 'That secret word is not right, so nothing was deleted.');
      }
      remove(local, KEY.account(k));
    }
    remove(local, KEY.data(k));
    remove(local, KEY.pending(k));
    dropSession();
    notify();
  }

  return {
    init,
    /** The live progress document. Change it only through change(). */
    get progress() {
      return doc;
    },
    get user() {
      return user;
    },
    get isGuest() {
      return user == null;
    },
    /** 'local' (saved here instantly) | 'saved' | 'saving' | 'offline'. */
    get status() {
      return status;
    },
    /** Apply a change to the progress document, save it, and tell the UI. */
    change(mutator) {
      mutator(doc);
      doc.updatedAt = now();
      persist();
      notify();
    },
    /** Erase all progress for the current guest or account (the account itself is kept). */
    reset() {
      doc = emptyProgress();
      doc.updatedAt = now();
      persist();
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Push any unsaved changes right now (called when the page is being hidden or closed). */
    flush() {
      if (user?.where === 'server' && readJson(local, KEY.pending(nameKey(user.name)))) {
        return pushNow({ keepalive: true }).catch(() => {});
      }
      return Promise.resolve();
    },
    probeServer,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    exportJson() {
      return JSON.stringify({ app: 'math-trainer', name: user?.name ?? null, exportedAt: new Date(now()).toISOString(), progress: doc }, null, 2);
    },
  };
}

function safeStorage(name) {
  try {
    const s = globalThis[name];
    if (!s) return null;
    const probe = '__mt_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
