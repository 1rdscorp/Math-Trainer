// Math Trainer server: serves the static app and the optional account API.
//
//   npm start                      → http://localhost:3000
//
// No dependencies. The app itself is plain static files in ../public and works on any static host
// without this server; in that case accounts are kept on the student's own device instead.
//
// Environment:
//   PORT            port to listen on (default 3000)
//   HOST            interface to bind (default 0.0.0.0)
//   DATA_DIR        where accounts are stored (default server/data)
//   ACCOUNTS        "off" to serve the app only, with no account API
//   RETENTION_DAYS  delete accounts not used for this many days (default 400; 0 keeps them forever)
//   TRUST_PROXY     "1" if behind a reverse proxy that sets X-Forwarded-For / X-Forwarded-Proto

import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, rename, unlink, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { normalizeProgress } from '../public/js/core/progress.js';

const scrypt = promisify(crypto.scrypt);
const HERE = path.dirname(fileURLToPath(import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

const NAME_RULE = /^[A-Za-z0-9](?:[A-Za-z0-9 _-]*[A-Za-z0-9])?$/;
const NAME_MIN = 3;
const NAME_MAX = 20;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;
const BODY_LIMIT = 512 * 1024;
const SESSION_DAYS = 60;
const COOKIE = 'mt_session';

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

function cleanName(name) {
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (clean.length < NAME_MIN || clean.length > NAME_MAX || !NAME_RULE.test(clean)) {
    throw new HttpError(400, 'invalid-name', `Pick a nickname with ${NAME_MIN} to ${NAME_MAX} letters or numbers.`);
  }
  return clean;
}

function cleanPassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    throw new HttpError(400, 'weak-password', `Your secret word needs at least ${PASSWORD_MIN} characters.`);
  }
  return password;
}

/** Simple in-memory limiter: a key is blocked after `max` recorded events inside `windowMs`. */
function createLimiter(max, windowMs) {
  const hits = new Map();
  const recent = (key) => (hits.get(key) ?? []).filter((t) => Date.now() - t < windowMs);
  return {
    blocked: (key) => recent(key).length >= max,
    record(key) {
      const list = recent(key);
      list.push(Date.now());
      hits.set(key, list);
    },
    sweep() {
      const now = Date.now();
      for (const [key, list] of hits) if (!list.some((t) => now - t < windowMs)) hits.delete(key);
    },
  };
}

export function createApp(options = {}) {
  const publicDir = path.resolve(options.publicDir ?? path.join(HERE, '..', 'public'));
  const dataDir = path.resolve(options.dataDir ?? process.env.DATA_DIR ?? path.join(HERE, 'data'));
  const usersDir = path.join(dataDir, 'users');
  const sessionsFile = path.join(dataDir, 'sessions.json');
  const accountsOn = options.accounts ?? process.env.ACCOUNTS !== 'off';
  const retentionDays = options.retentionDays ?? Number(process.env.RETENTION_DAYS ?? 400);
  const trustProxy = options.trustProxy ?? process.env.TRUST_PROXY === '1';
  const scryptCost = options.scryptCost ?? 16384;
  // Only failed sign-ins count, so a whole class behind one school address is not locked out.
  const nameFails = createLimiter(options.loginLimit ?? 8, 10 * 60 * 1000);
  const ipFails = createLimiter(options.ipLimit ?? 60, 10 * 60 * 1000);
  const signupLimiter = createLimiter(options.signupLimit ?? 40, 60 * 60 * 1000);

  let sessions = new Map(); // sha256(token) → { key, expires }
  let ready = null;
  const writeQueues = new Map();
  const timers = [];

  // ── storage ──
  const userFile = (key) => path.join(usersDir, `u_${sha256(key).slice(0, 40)}.json`);

  async function atomicWrite(file, data) {
    const tmp = `${file}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    await writeFile(tmp, data, { mode: 0o600 });
    await rename(tmp, file);
  }

  /** Run writes for the same file one after another. */
  function queued(file, task) {
    const prev = writeQueues.get(file) ?? Promise.resolve();
    const next = prev.catch(() => {}).then(task);
    writeQueues.set(file, next);
    next.finally(() => {
      if (writeQueues.get(file) === next) writeQueues.delete(file);
    }).catch(() => {});
    return next;
  }

  async function readUser(key) {
    try {
      return JSON.parse(await readFile(userFile(key), 'utf8'));
    } catch {
      return null;
    }
  }

  const saveUser = (user) => queued(userFile(user.key), () => atomicWrite(userFile(user.key), JSON.stringify(user)));

  async function saveSessions() {
    await queued(sessionsFile, () => atomicWrite(sessionsFile, JSON.stringify([...sessions])));
  }

  async function hashPassword(password, salt) {
    return (await scrypt(password, salt, 64, { N: scryptCost, r: 8, p: 1 })).toString('hex');
  }

  async function verifyPassword(user, password) {
    const salt = user?.salt ?? 'no-such-user-salt';
    const got = Buffer.from(await hashPassword(String(password ?? ''), salt), 'hex');
    if (!user) return false; // the hash above keeps timing the same for unknown names
    const want = Buffer.from(user.hash, 'hex');
    return got.length === want.length && crypto.timingSafeEqual(got, want);
  }

  async function purge() {
    const now = Date.now();
    let changed = false;
    for (const [id, s] of sessions) {
      if (s.expires < now) {
        sessions.delete(id);
        changed = true;
      }
    }
    if (retentionDays > 0) {
      const limit = now - retentionDays * 86400000;
      for (const name of await readdir(usersDir).catch(() => [])) {
        if (!name.endsWith('.json')) continue;
        const file = path.join(usersDir, name);
        try {
          const user = JSON.parse(await readFile(file, 'utf8'));
          if ((user.lastSeen ?? user.created ?? 0) < limit) {
            await unlink(file);
            for (const [id, s] of sessions) {
              if (s.key === user.key) {
                sessions.delete(id);
                changed = true;
              }
            }
          }
        } catch {
          /* unreadable file: leave it for a person to look at */
        }
      }
    }
    if (changed) await saveSessions();
    nameFails.sweep();
    ipFails.sweep();
    signupLimiter.sweep();
  }

  function init() {
    if (!ready) {
      ready = (async () => {
        if (!accountsOn) return;
        await mkdir(usersDir, { recursive: true });
        try {
          sessions = new Map(JSON.parse(await readFile(sessionsFile, 'utf8')));
        } catch {
          sessions = new Map();
        }
        await purge();
        const t = setInterval(() => purge().catch(() => {}), 24 * 60 * 60 * 1000);
        t.unref?.();
        timers.push(t);
      })();
    }
    return ready;
  }

  // ── request helpers ──
  function clientIp(req) {
    if (trustProxy) {
      const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
      if (fwd) return fwd;
    }
    return req.socket.remoteAddress ?? 'unknown';
  }

  function isSecure(req) {
    return !!req.socket.encrypted || (trustProxy && req.headers['x-forwarded-proto'] === 'https');
  }

  function sendJson(res, status, body, headers = {}) {
    const data = JSON.stringify(body);
    res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data), 'Cache-Control': 'no-store', ...headers });
    res.end(data);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > BODY_LIMIT) {
          reject(new HttpError(413, 'too-large', 'That is too much data.'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        if (!chunks.length) return resolve({});
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
          resolve(parsed);
        } catch {
          reject(new HttpError(400, 'bad-json', 'The request was not valid JSON.'));
        }
      });
      req.on('error', () => reject(new HttpError(400, 'bad-request', 'The request could not be read.')));
    });
  }

  function sessionToken(req) {
    const header = req.headers.cookie ?? '';
    for (const part of header.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === COOKIE) return v.join('=');
    }
    return null;
  }

  function cookieHeader(req, token, maxAgeSeconds) {
    return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isSecure(req) ? '; Secure' : ''}`;
  }

  async function startSession(req, key) {
    const token = crypto.randomBytes(32).toString('base64url');
    sessions.set(sha256(token), { key, expires: Date.now() + SESSION_DAYS * 86400000 });
    await saveSessions();
    return cookieHeader(req, token, SESSION_DAYS * 86400);
  }

  async function currentUser(req) {
    const token = sessionToken(req);
    if (!token) return null;
    const session = sessions.get(sha256(token));
    if (!session || session.expires < Date.now()) return null;
    return readUser(session.key);
  }

  async function requireUser(req) {
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, 'unauthorized', 'Please sign in again.');
    return user;
  }

  /** Changes must come from our own pages: a custom header plus a same-origin check. */
  function guardWrite(req) {
    if (req.headers['x-requested-with'] !== 'MathTrainer') throw new HttpError(403, 'forbidden', 'Request refused.');
    if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) throw new HttpError(415, 'bad-content-type', 'Send JSON.');
    const origin = req.headers.origin;
    if (origin) {
      let host = null;
      try {
        host = new URL(origin).host;
      } catch {
        /* malformed Origin */
      }
      if (host !== req.headers.host) throw new HttpError(403, 'forbidden', 'Request refused.');
    }
  }

  // ── API ──
  async function api(req, res, pathname) {
    const method = req.method;
    if (pathname === '/api/health' && method === 'GET') return sendJson(res, 200, { ok: true, accounts: accountsOn });
    if (!accountsOn) throw new HttpError(404, 'not-found', 'Accounts are switched off on this server.');
    await init();
    if (method !== 'GET') guardWrite(req);
    const ip = clientIp(req);

    if (pathname === '/api/signup' && method === 'POST') {
      if (signupLimiter.blocked(ip)) throw new HttpError(429, 'rate-limited', 'Too many new accounts from here. Try again later.');
      const body = await readBody(req);
      const name = cleanName(body.name);
      const password = cleanPassword(body.password);
      const key = name.toLowerCase();
      const now = Date.now();
      const created = await queued(`${userFile(key)}.create`, async () => {
        if (await readUser(key)) return false;
        const salt = crypto.randomBytes(16).toString('hex');
        const progress = normalizeProgress(body.progress);
        progress.updatedAt = now;
        await saveUser({ name, key, salt, hash: await hashPassword(password, salt), created: now, lastSeen: now, rev: 1, progress });
        return true;
      });
      if (!created) throw new HttpError(409, 'name-taken', 'That nickname is already taken. Try another one.');
      signupLimiter.record(ip);
      return sendJson(res, 201, { name }, { 'Set-Cookie': await startSession(req, key) });
    }

    if (pathname === '/api/login' && method === 'POST') {
      const body = await readBody(req);
      const key = String(body.name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (ipFails.blocked(ip) || nameFails.blocked(key)) throw new HttpError(429, 'rate-limited', 'Too many tries. Wait a few minutes, then try again.');
      const user = key.length <= NAME_MAX ? await readUser(key) : null;
      if (!(await verifyPassword(user, body.password))) {
        ipFails.record(ip);
        nameFails.record(key);
        throw new HttpError(401, 'bad-credentials', 'That nickname and secret word do not match.');
      }
      user.lastSeen = Date.now();
      await saveUser(user);
      return sendJson(res, 200, { name: user.name }, { 'Set-Cookie': await startSession(req, user.key) });
    }

    if (pathname === '/api/logout' && method === 'POST') {
      const token = sessionToken(req);
      if (token && sessions.delete(sha256(token))) await saveSessions();
      return sendJson(res, 200, {}, { 'Set-Cookie': cookieHeader(req, '', 0) });
    }

    if (pathname === '/api/me' && method === 'GET') {
      const user = await requireUser(req);
      return sendJson(res, 200, { name: user.name });
    }

    if (pathname === '/api/progress' && method === 'GET') {
      const user = await requireUser(req);
      return sendJson(res, 200, { progress: user.progress, rev: user.rev });
    }

    if (pathname === '/api/progress' && method === 'PUT') {
      const user = await requireUser(req);
      const body = await readBody(req);
      user.progress = normalizeProgress(body.progress);
      user.rev = (user.rev ?? 0) + 1;
      user.lastSeen = Date.now();
      await saveUser(user);
      return sendJson(res, 200, { ok: true, rev: user.rev });
    }

    if (pathname === '/api/account' && method === 'DELETE') {
      const user = await requireUser(req);
      const body = await readBody(req);
      if (nameFails.blocked(user.key)) throw new HttpError(429, 'rate-limited', 'Too many tries. Wait a few minutes, then try again.');
      if (!(await verifyPassword(user, body.password))) {
        nameFails.record(user.key);
        throw new HttpError(401, 'bad-credentials', 'That secret word is not right, so nothing was deleted.');
      }
      await queued(userFile(user.key), () => unlink(userFile(user.key)).catch(() => {}));
      for (const [id, s] of sessions) if (s.key === user.key) sessions.delete(id);
      await saveSessions();
      return sendJson(res, 200, {}, { 'Set-Cookie': cookieHeader(req, '', 0) });
    }

    throw new HttpError(404, 'not-found', 'No such address.');
  }

  // ── static files ──
  async function serveStatic(req, res, pathname) {
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method-not-allowed', 'Method not allowed.');
    let rel;
    try {
      rel = decodeURIComponent(pathname);
    } catch {
      throw new HttpError(400, 'bad-request', 'Bad address.');
    }
    if (rel.includes('\0')) throw new HttpError(400, 'bad-request', 'Bad address.');
    let file = path.join(publicDir, path.normalize(rel));
    if (file !== publicDir && !file.startsWith(publicDir + path.sep)) throw new HttpError(403, 'forbidden', 'Not allowed.');
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) {
      file = path.join(file, 'index.html');
      info = await stat(file).catch(() => null);
    }
    if (!info?.isFile()) throw new HttpError(404, 'not-found', 'Not found.');

    const etag = `"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
    const vendor = file.startsWith(path.join(publicDir, 'vendor') + path.sep);
    const headers = {
      ...SECURITY_HEADERS,
      'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': vendor ? 'public, max-age=604800' : 'no-cache',
      ETag: etag,
    };
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      return res.end();
    }
    headers['Content-Length'] = info.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
  }

  async function handle(req, res) {
    let pathname = '/';
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname.startsWith('/api/') || pathname === '/api') await api(req, res, pathname);
      else await serveStatic(req, res, pathname);
    } catch (err) {
      if (res.headersSent) return res.destroy();
      if (err instanceof HttpError) {
        if (pathname.startsWith('/api')) return sendJson(res, err.status, { error: err.code, message: err.message });
        res.writeHead(err.status, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(err.message);
      }
      console.error(err);
      if (pathname.startsWith('/api')) return sendJson(res, 500, { error: 'server', message: 'Something went wrong on the server.' });
      res.writeHead(500, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Something went wrong.');
    }
  }

  const server = http.createServer(handle);
  server.requestTimeout = 30000;

  return {
    server,
    init,
    purge,
    close: () =>
      new Promise((resolve) => {
        timers.forEach(clearInterval);
        server.close(() => resolve());
        server.closeAllConnections?.();
      }),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  const app = createApp();
  await app.init();
  app.server.listen(port, host, () => {
    console.log(`Math Trainer is running at http://localhost:${port}`);
    console.log(process.env.ACCOUNTS === 'off' ? 'Accounts are off: progress can be saved on each device only.' : 'Accounts are on: saved progress is stored on this server.');
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.close().then(() => process.exit(0)));
}
