// "Save my progress": the optional account dialog. Nothing in the app requires it.

import { h, announce, fill } from '../ui/dom.js';
import { NAME_MIN, NAME_MAX, PASSWORD_MIN } from '../core/store.js';
import { summarize } from '../core/progress.js';

const ADJECTIVES = ['Brave', 'Clever', 'Curious', 'Swift', 'Mighty', 'Sunny', 'Lucky', 'Calm', 'Bright', 'Jolly', 'Bold', 'Quick', 'Kind', 'Happy', 'Cosmic', 'Nimble', 'Gentle', 'Daring'];
const ANIMALS = ['Otter', 'Falcon', 'Panda', 'Tiger', 'Dolphin', 'Fox', 'Owl', 'Koala', 'Lynx', 'Heron', 'Gecko', 'Bison', 'Robin', 'Whale', 'Moose', 'Puffin', 'Badger', 'Turtle'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** A made-up nickname such as "BraveOtter42", so nobody needs to use a real name. */
export function suggestNickname() {
  return `${pick(ADJECTIVES)}${pick(ANIMALS)}${10 + Math.floor(Math.random() * 90)}`;
}

function field(id, label, input, hint) {
  if (hint) input.setAttribute('aria-describedby', `${id}-hint`);
  return h('div', { class: 'field' }, h('label', { for: id }, label), input, hint ? h('span', { class: 'hint', id: `${id}-hint` }, hint) : null);
}

function passwordField(id, label, autocomplete, hint) {
  const input = h('input', { id, type: 'password', autocomplete, required: true, minlength: String(PASSWORD_MIN), maxlength: '72' });
  const toggle = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-small',
      'aria-pressed': 'false',
      onclick: () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggle.setAttribute('aria-pressed', String(show));
        toggle.textContent = show ? 'Hide' : 'Show';
      },
    },
    'Show',
  );
  toggle.setAttribute('aria-label', 'Show or hide the secret word');
  const row = h('div', { class: 'row' }, input, toggle);
  row.style.flexWrap = 'nowrap';
  input.setAttribute('aria-describedby', `${id}-hint`);
  return { input, node: h('div', { class: 'field' }, h('label', { for: id }, label), row, h('span', { class: 'hint', id: `${id}-hint` }, hint)) };
}

export async function openAccountDialog(app, { tab = 'new' } = {}) {
  document.getElementById('account-dialog')?.remove();
  const dialog = h('dialog', { id: 'account-dialog', 'aria-labelledby': 'account-title' });
  const body = h('div', { class: 'stack' });
  const close = () => dialog.close();
  dialog.append(
    h('div', { class: 'dialog-head' }, h('h2', { id: 'account-title' }, app.store.isGuest ? 'Save my progress' : 'Your account'), h('button', { type: 'button', class: 'btn btn-ghost btn-small', 'aria-label': 'Close', onclick: close }, '✕')),
    body,
  );
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();

  if (app.store.isGuest) await renderGuest(app, body, close, tab);
  else renderSignedIn(app, body, close);
}

async function renderGuest(app, body, close, startTab) {
  fill(body, h('p', { class: 'muted' }, 'One moment…'));
  const hasServer = await app.store.probeServer();
  let tab = startTab;
  const error = h('p', { class: 'error-text', role: 'alert' });
  const where = hasServer
    ? 'Your progress is saved to your account, so you can sign in on another phone or computer.'
    : 'Your progress is saved in this browser on this device. It does not travel to other devices.';

  const draw = () => {
    error.textContent = '';
    const isNew = tab === 'new';
    const tabs = h(
      'div',
      { class: 'tabs', role: 'tablist', 'aria-label': 'New or returning' },
      ...[
        ['new', 'I am new'],
        ['returning', 'I have an account'],
      ].map(([id, label]) =>
        h('button', { type: 'button', class: 'btn', role: 'tab', id: `acct-tab-${id}`, 'aria-selected': String(tab === id), 'aria-controls': 'acct-panel', tabindex: tab === id ? '0' : '-1', onclick: () => { tab = id; draw(); document.getElementById(`acct-tab-${id}`)?.focus(); } }, label),
      ),
    );
    tabs.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      tab = tab === 'new' ? 'returning' : 'new';
      draw();
      document.getElementById(`acct-tab-${tab}`)?.focus();
    });

    const name = h('input', { id: 'acct-name', type: 'text', autocomplete: 'username', autocapitalize: 'off', spellcheck: 'false', required: true, minlength: String(NAME_MIN), maxlength: String(NAME_MAX) });
    const pass = passwordField('acct-pass', 'Secret word', isNew ? 'new-password' : 'current-password', isNew ? `At least ${PASSWORD_MIN} letters or numbers. Write it down: we have no way to send it to you.` : 'The secret word you chose for this nickname.');
    const submit = h('button', { type: 'submit', class: 'btn btn-primary btn-big' }, isNew ? 'Save my progress' : 'Sign in');

    const form = h(
      'form',
      {
        class: 'stack',
        novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          error.textContent = '';
          submit.disabled = true;
          try {
            const result = isNew ? await app.store.signUp(name.value, pass.input.value) : await app.store.signIn(name.value, pass.input.value);
            close();
            announce(
              `You are signed in as ${result.name}. ${result.merged ? 'The progress from this visit was added to your account. ' : ''}Your progress is now saved.`,
            );
          } catch (err) {
            error.textContent = friendly(err);
            (err.code === 'weak-password' || err.code === 'bad-credentials' ? pass.input : name).focus();
          } finally {
            submit.disabled = false;
          }
        },
      },
      field(
        'acct-name',
        'Nickname',
        isNew
          ? h('div', { class: 'row' }, name, h('button', { type: 'button', class: 'btn btn-small', onclick: () => { name.value = suggestNickname(); name.focus(); } }, 'Suggest one'))
          : name,
        isNew ? `${NAME_MIN} to ${NAME_MAX} letters or numbers. Please do not use your real name.` : null,
      ),
      pass.node,
      error,
      h('div', { class: 'row' }, submit, h('button', { type: 'button', class: 'btn btn-ghost', onclick: close }, 'Not now')),
    );
    if (isNew) {
      name.parentElement.style.flexWrap = 'nowrap';
      name.value = suggestNickname();
    }

    const s = summarize(app.store.progress);
    fill(body, 
      h('p', null, isNew ? 'Make a free account to keep your points, finished topics and quiz history. ' : 'Welcome back. ', h('strong', null, 'You never need an account to learn or take quizzes.')),
      s.points > 0 || s.answered > 0 ? h('p', { class: 'notice notice-good' }, `The ${s.points} points and ${s.answered} answers from this visit will be ${isNew ? 'saved to your new account' : 'added to your account'}.`) : null,
      tabs,
      h('div', { id: 'acct-panel', role: 'tabpanel', 'aria-labelledby': `acct-tab-${tab}` }, form),
      h(
        'div',
        { class: 'small muted stack' },
        h('p', null, where),
        h('p', null, 'We keep only a nickname and your math progress. No email, no real name, no adverts, no tracking. If you are under 13, ask a parent or teacher before making an account.'),
      ),
    );
    name.focus();
  };
  draw();
}

function renderSignedIn(app, body, close) {
  const { store } = app;
  const error = h('p', { class: 'error-text', role: 'alert' });
  const s = summarize(store.progress);
  const where = store.user.where === 'server' ? 'Saved to your account. You can sign in from another device.' : 'Saved in this browser on this device.';

  const signOut = h('button', { type: 'button', class: 'btn btn-primary', onclick: async () => {
    signOut.disabled = true;
    await store.signOut();
    close();
    announce('You are signed out. You are now practising as a guest.');
  } }, 'Sign out');

  const download = h('button', { type: 'button', class: 'btn', onclick: () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `math-trainer-${store.user.name}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } }, 'Download my data');

  const delPass = passwordField('acct-del-pass', 'Secret word', 'current-password', 'Type your secret word to confirm. This cannot be undone.');
  const delForm = h(
    'form',
    {
      class: 'stack',
      hidden: true,
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        error.textContent = '';
        try {
          await store.deleteAccount(delPass.input.value);
          close();
          announce('Your account and its saved progress were deleted.');
        } catch (err) {
          error.textContent = friendly(err);
          delPass.input.focus();
        }
      },
    },
    delPass.node,
    error,
    h('button', { type: 'submit', class: 'btn btn-danger' }, 'Delete my account and all its progress'),
  );
  const showDelete = h('button', { type: 'button', class: 'btn btn-ghost btn-small', 'aria-expanded': 'false', onclick: () => {
    delForm.hidden = !delForm.hidden;
    showDelete.setAttribute('aria-expanded', String(!delForm.hidden));
    if (!delForm.hidden) delPass.input.focus();
  } }, 'Delete my account…');

  fill(body, 
    h('p', null, 'Signed in as ', h('strong', null, store.user.name), '.'),
    h('p', { class: 'notice notice-good' }, `${s.points} points · ${s.completed} topic${s.completed === 1 ? '' : 's'} completed. ${where}`),
    h('div', { class: 'row' }, signOut, h('a', { class: 'btn', href: '#/progress', onclick: close }, 'See my progress'), download),
    h('p', { class: 'small muted' }, 'On a shared computer, sign out when you finish so the next person starts fresh.'),
    showDelete,
    delForm,
  );
  signOut.focus();
}

function friendly(err) {
  switch (err?.code) {
    case 'invalid-name':
      return `Pick a nickname with ${NAME_MIN} to ${NAME_MAX} letters or numbers (spaces, dashes and underscores are fine in the middle).`;
    case 'weak-password':
      return `Your secret word needs at least ${PASSWORD_MIN} characters.`;
    case 'name-taken':
      return 'That nickname is already taken. Try another one, or sign in if it is yours.';
    case 'bad-credentials':
    case 'unauthorized':
      return 'That nickname and secret word do not match. Check them and try again.';
    case 'rate-limited':
      return 'Too many tries. Wait a minute, then try again.';
    case 'network':
      return 'We could not reach the server. Check your connection and try again.';
    case 'storage':
      return 'This browser would not let us save. Private browsing can block saving.';
    default:
      return err?.message || 'Something went wrong. Please try again.';
  }
}
