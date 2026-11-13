// Math Trainer — start-up, routing and the page header.

import { createStore } from './core/store.js';
import { settings, apply as applySettings } from './core/settings.js';
import { h, focusOn, fill } from './ui/dom.js';
import { errorBox, loading } from './ui/components.js';
import { stopSpeaking } from './ui/speech.js';
import { fitWide } from './ui/math.js';
import { openAccountDialog } from './views/account.js';
import { openSettingsDialog } from './views/settings.js';

const ROUTES = [
  { re: /^\/$/, nav: 'learn', load: () => import('./views/home.js') },
  { re: /^\/level\/([a-z0-9-]+)$/, nav: 'learn', load: () => import('./views/level.js') },
  { re: /^\/topic\/([a-z0-9-]+)\/([a-z0-9-]+)(?:\/(learn|examples|try|quiz))?$/, nav: 'learn', load: () => import('./views/topic.js') },
  { re: /^\/placement$/, nav: 'learn', load: () => import('./views/placement.js') },
  { re: /^\/review$/, nav: 'progress', load: () => import('./views/review.js') },
  { re: /^\/times-table(?:\/(explore|practice|quiz))?$/, nav: 'times', load: () => import('./views/times.js') },
  { re: /^\/memory(?:\/(flashcards|sequence|pattern|pairs|speed))?$/, nav: 'memory', load: () => import('./views/memory.js') },
  { re: /^\/progress$/, nav: 'progress', load: () => import('./views/progress.js') },
  { re: /^\/about$/, nav: null, load: () => import('./views/about.js') },
];

const store = createStore();
const app = {
  store,
  settings,
  navigate(path) {
    location.hash = `#${path}`;
  },
  openAccount: (opts) => openAccountDialog(app, opts),
  rerender: () => render(),
};

// ───────── header ─────────

function renderHeaderTools() {
  const tools = document.getElementById('header-tools');
  if (!tools) return;
  const settingsBtn = h(
    'button',
    { type: 'button', class: 'btn btn-ghost btn-small icon-btn', id: 'settings-button', 'aria-label': 'Display settings: text size, colours and timers', title: 'Display settings', onclick: () => openSettingsDialog(app) },
    h('span', { 'aria-hidden': 'true' }, 'Aa'),
  );
  const account = store.isGuest
    ? h('button', { type: 'button', class: 'btn btn-primary btn-small', id: 'account-button', onclick: () => app.openAccount() }, 'Save my progress')
    : h('button', { type: 'button', class: 'btn btn-small', id: 'account-button', 'aria-label': `Account: signed in as ${store.user.name}`, onclick: () => app.openAccount() }, h('span', { 'aria-hidden': 'true' }, '👤 '), store.user.name);
  fill(tools, settingsBtn, account);

  const footer = document.getElementById('footer-status');
  if (footer) {
    if (store.isGuest) {
      footer.textContent = 'Guest mode: your progress is not kept after you close this page.';
    } else if (store.user.where === 'device') {
      footer.textContent = `Signed in as ${store.user.name}. Progress is saved in this browser on this device.`;
    } else {
      const state = { saved: 'All progress saved.', saving: 'Saving…', offline: 'Offline: changes are kept here and will be saved when the connection returns.', local: '' }[store.status];
      footer.textContent = `Signed in as ${store.user.name}. ${state}`;
    }
  }
}

// ───────── router ─────────

let started = false; // true once the first page has been asked for
let cleanups = [];
let renderToken = 0;
let firstRender = true;

function currentPath() {
  const hash = location.hash;
  if (!hash.startsWith('#/')) return '/';
  return hash.slice(1).split('?')[0] || '/';
}

function markNav(nav) {
  for (const a of document.querySelectorAll('.site-nav a')) {
    if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

async function render() {
  const main = document.getElementById('main');
  const path = currentPath();
  const token = ++renderToken;

  for (const fn of cleanups.splice(0)) {
    try {
      fn();
    } catch (err) {
      console.error(err);
    }
  }
  stopSpeaking();

  let match = null;
  const route = ROUTES.find((r) => (match = path.match(r.re)));
  markNav(route?.nav ?? null);

  const myCleanups = [];
  const ctx = { app, params: match ? match.slice(1) : [], title: '', onLeave: (fn) => myCleanups.push(fn) };
  const slow = setTimeout(() => {
    if (token === renderToken) fill(main, loading());
  }, 250);

  let node;
  try {
    if (!route) {
      ctx.title = 'Page not found';
      node = h('div', { class: 'narrow stack' }, h('h1', null, 'We could not find that page'), h('p', null, 'The link may be old or mistyped.'), h('p', null, h('a', { class: 'btn btn-primary', href: '#/' }, 'Go to the start page')));
    } else {
      const mod = await route.load();
      node = await mod.default(ctx);
    }
  } catch (err) {
    console.error(err);
    ctx.title = 'Something went wrong';
    node = h(
      'div',
      { class: 'narrow stack' },
      h('h1', null, 'Something went wrong'),
      errorBox('This page could not be shown.', 'Check your connection and try again. Your progress is safe.', h('p', null, h('button', { type: 'button', class: 'btn', onclick: () => render() }, 'Try again'), ' ', h('a', { class: 'btn btn-ghost', href: '#/' }, 'Go to the start page'))),
    );
  }
  clearTimeout(slow);

  if (token !== renderToken) {
    // The student moved on while this page was loading.
    myCleanups.forEach((fn) => fn());
    return;
  }
  cleanups = myCleanups;
  fill(main, node);
  main.dataset.route = path;
  document.title = ctx.title ? `${ctx.title} · Math Trainer` : 'Math Trainer';
  window.scrollTo(0, 0);
  if (!firstRender) focusOn(main.querySelector('h1') ?? main, { scroll: false });
  firstRender = false;
}

// ───────── start ─────────

applySettings();
settings.subscribe(renderHeaderTools);
store.subscribe((reason) => {
  renderHeaderTools();
  // Signing in or out, or progress arriving from the server, changes what every page shows.
  if (started && (reason === 'auth' || reason === 'replaced')) render();
});

document.getElementById('skip-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  const main = document.getElementById('main');
  focusOn(main.querySelector('h1') ?? main);
});

// Wide formulas and tables: shrink them to the screen, and make whatever still scrolls sideways
// reachable from the keyboard. Runs after any change to the page, a resize, or the fonts arriving.
{
  const main = document.getElementById('main');
  let queued = false;
  const refit = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fitWide(main);
    });
  };
  if (typeof MutationObserver === 'function') new MutationObserver(refit).observe(main, { childList: true, subtree: true });
  window.addEventListener('resize', refit);
  document.fonts?.addEventListener?.('loadingdone', refit);
}

window.addEventListener('hashchange', render);
window.addEventListener('pagehide', () => store.flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.flush();
});

await store.init();
renderHeaderTools();
started = true;
render();
