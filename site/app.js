// The web dashboard: data.json → the status board, plus a form editor that saves a
// project note through the GitHub API with a token kept in this browser only.
//
// Every string from GitHub goes into the page through textContent or a Text node,
// never as HTML: PR and issue titles are written by other people.

import { applyNoteForm, conflictingFields, diffNoteForm, groupTodo, matchCategory, readNoteForm, readTodoTitles, removeTodoItem, TODO_FILE, TODO_PLACES, todoFileUrlPath, todoMark, todoProjects, todoRefUrl, todoTitleQuery } from './lib/notes.js?v=__BUILD__';

const REPO = 'ChadFarrow/project-notes';
const API = 'https://api.github.com';
const WORKFLOW = 'sync-all.yml';
const REPO_URL = `https://github.com/${REPO}`;
const ACTIONS_URL = `${REPO_URL}/actions/workflows/${WORKFLOW}`;
// Pre-fills the name, the owner, a 90-day life and the two permissions; the repository
// itself still has to be picked by hand (GitHub has no parameter for it).
const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new?name=project-notes+web+editor'
  + '&description=Edits+notes+from+notes.podtards.com&target_name=ChadFarrow&expires_in=90&contents=write&actions=write';
// The second token only reads: PR and issue titles of every repo, public and private.
const NEW_READ_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new?name=project-notes+titles'
  + '&description=Reads+PR+and+issue+titles+for+notes.podtards.com&target_name=ChadFarrow&expires_in=90&issues=read&pull_requests=read';
const DATA_VERSION = 1;
// GitHub drops a scheduled run now and then, so warn only after two missed runs.
const OLD_DATA_HOURS = 9;
const MAX_LAMPS = 12;
const MAX_BRANCHES = 10;
const NEW_CATEGORY = '\u0000new';

const STATUS_FILTERS = [
  ['all', 'All PRs', null],
  ['conflict', 'Merge conflict', 'bad'],
  ['failing', 'Checks failing', 'bad'],
  ['draft', 'Draft', 'draft'],
  ['ready', 'Ready', 'good'],
];
const LAMP_WORDS = { bad: 'needs a fix', wait: 'checks running', draft: 'draft', good: 'ready' };
const TRACK_CHOICES = [
  ['yes', 'Show on the dashboard', null],
  ['upstream', 'Show, without branches or the stale warning', 'For a fork that you contribute upstream from.'],
  ['no', 'Hide from the dashboard', 'The project stays in the “Hidden from the dashboard” list, so you can show it again.'],
];

// ---------- small helpers ----------

const $ = (selector) => document.querySelector(selector);

// h('a', { href, class, text, onclick }, ...children). Children that are strings become
// Text nodes, so nothing is ever parsed as HTML.
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (typeof value === 'boolean' || key === 'value') el[key] = value;
    else el.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child != null && child !== false) el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

// localStorage can be missing or throw (private mode, blocked storage): the page must
// work without it, so every access is guarded and keys carry the pn: prefix.
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`pn:${key}`);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(`pn:${key}`, JSON.stringify(value)); } catch { /* not stored */ }
  },
  remove(key) {
    try { localStorage.removeItem(`pn:${key}`); } catch { /* nothing to remove */ }
  },
};

const plural = (n, word, words = `${word}s`) => `${n} ${n === 1 ? word : words}`;

function ago(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  const unit = (n, word) => `${plural(n, word)} ago`;
  if (mins < 1) return 'just now';
  if (mins < 60) return unit(mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return unit(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 60) return unit(days, 'day');
  if (days < 730) return unit(Math.floor(days / 30), 'month');
  return unit(Math.floor(days / 365), 'year');
}

// `code` spans in a problem line become <code> elements.
const withCode = (text) => String(text).split('`').map((part, i) => (i % 2 ? h('code', { text: part }) : part));
const slug = (name) => `p-${name.replace(/[^A-Za-z0-9_-]/g, '-')}`;
const noteUrl = (p) => `${REPO_URL}/blob/main/projects/${encodeURIComponent(p.noteFile)}`;
const hasWork = (p) => p.track !== 'no'
  && (p.prsTotal || p.issuesTotal || p.orphanBranches.length || p.openedElsewhere.length
    || p.watch.some((w) => w.prsTotal || w.issuesTotal));
// "1 PR and 4 issues", or '' for none. A watched repo has counts only: no title reaches the page.
const workText = (o) => [o.prsTotal ? plural(o.prsTotal, 'PR') : '', o.issuesTotal ? plural(o.issuesTotal, 'issue') : '']
  .filter(Boolean).join(' and ');

class UserError extends Error {
  constructor(message, kind = 'user') {
    super(message);
    this.kind = kind;
  }
}
const messageFor = (err) => (err instanceof UserError ? err.message : `Something went wrong: ${err.message}`);

function setStatus(el, tone, text) {
  el.className = `status${tone ? ` ${tone}` : ''}`;
  el.textContent = text;
}

// ---------- PR status ----------

function prState(pr) {
  const conflict = pr.mergeable === 'CONFLICTING';
  const failing = pr.checks === 'FAILURE' || pr.checks === 'ERROR';
  const pending = pr.checks === 'PENDING' || pr.checks === 'EXPECTED';
  const badges = [];
  if (conflict) badges.push(['bad', 'Merge conflict']);
  if (failing) badges.push(['bad', 'Checks failing']);
  if (pending) badges.push(['wait', 'Checks running']);
  if (pr.isDraft) badges.push(['draft', 'Draft']);
  if (pr.checks === 'SUCCESS') badges.push(['good', 'Checks passing']);
  if (pr.author !== data.owner) badges.push(['other', `By ${pr.author}`]);
  const kinds = [];
  if (conflict) kinds.push('conflict');
  if (failing) kinds.push('failing');
  if (pr.isDraft) kinds.push('draft');
  if (!conflict && !failing && !pending && !pr.isDraft) kinds.push('ready');
  const lamp = conflict || failing ? 'bad' : pending ? 'wait' : pr.isDraft ? 'draft' : 'good';
  return { badges, kinds, lamp };
}

const lamp = (tone, title) => h('span', { class: `lamp ${tone}`, title, 'aria-hidden': 'true' });
const badgeList = (badges) => h('span', { class: 'badges' }, badges.map(([tone, text]) => h('span', { class: `badge ${tone}`, text })));

// ---------- state ----------

let data = null;
let token = store.get('token', '');
let readToken = store.get('readToken', '');
const view = { q: '', status: 'all', category: 'all', ...store.get('view', {}) };
const todoView = { project: 'all', place: 'all', ...store.get('todoView', {}) };
const opened = new Set(store.get('open', []));
// Titles and states of the PRs the to-do list names. They live in this page's memory only:
// a private repo's title must never reach a file. null = not loaded (no read token, or a failure).
let todoTitles = null;
let todoNote = null; // null, 'auth', or the reason the titles did not load
let titleRun = 0;

const saveView = () => store.set('view', { q: view.q, status: view.status, category: view.category });
const saveTodoView = () => store.set('todoView', { project: todoView.project, place: todoView.place });
const saveOpened = () => store.set('open', [...opened]);

// ---------- start ----------

if (window.top !== window.self) {
  // A framed copy could be used to trick clicks on the editor.
  document.body.replaceChildren(h('p', { class: 'page', text: 'This page does not run inside a frame.' }));
} else {
  start();
}

async function start() {
  $('#token-button').addEventListener('click', () => openTokenDialog());
  updateTokenButton();
  try {
    const res = await fetch('data.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    $('#content').replaceChildren(h('div', { class: 'banner bad' },
      h('p', {}, `The dashboard data did not load (${err.message}). Reload the page. If that does not help, read `,
        h('a', { href: `${REPO_URL}/blob/main/LATEST.md` }, 'LATEST.md on GitHub'), '.')));
    return;
  }
  hideRemovedTodos();
  renderHeader();
  setupControls();
  renderContent();
  loadTodoTitles();
}

function updateTokenButton() {
  $('#token-button').textContent = token ? 'Editing token' : 'Set up editing';
}

function renderHeader() {
  $('#updated').textContent = `Updated ${ago(data.generatedAtIso)} (${data.generatedAt})`;
  const banners = [];
  if (data.version !== DATA_VERSION) {
    banners.push(h('div', { class: 'banner' }, h('p', { text: 'This page and its data do not match. Reload the page.' })));
  }
  if (data.degradedReason) {
    banners.push(h('div', { class: 'banner bad' },
      h('p', {}, h('strong', { text: 'Private repositories are missing from this data.' })),
      h('p', { text: `${data.degradedReason}, so the sync ran with a token that sees public repos only. `
        + 'Every list below is public-only. Rotate the AUDIT_TOKEN secret, then run the sync again.' }),
      h('p', {}, h('a', { href: ACTIONS_URL }, 'Open the sync runs'))));
  }
  const hours = Math.floor((Date.now() - new Date(data.generatedAtIso)) / 3600000);
  if (hours >= OLD_DATA_HOURS) {
    banners.push(h('div', { class: 'banner' }, h('p', {},
      `This data is ${plural(hours, 'hour')} old, but the sync should run every 4 hours, so it has missed at least two runs. `,
      h('a', { href: ACTIONS_URL }, 'Check the sync runs'), '.')));
  }
  $('#banners').replaceChildren(...banners);
  const t = data.totals;
  $('#summary').replaceChildren(
    h('strong', { text: plural(t.prs, 'open PR') }), ', ',
    h('strong', { text: plural(t.issues, 'open issue') }), ' and ',
    h('strong', { text: `${plural(t.orphanBranches, 'branch', 'branches')} with no PR` }),
    ` across ${plural(t.tracked, 'tracked repo')}.`,
  );
}

function setupControls() {
  const form = $('#controls');
  form.hidden = false;
  form.addEventListener('submit', (e) => e.preventDefault());

  if (!STATUS_FILTERS.some(([v]) => v === view.status)) view.status = 'all';
  if (view.category !== 'all' && !data.categories.includes(view.category)) view.category = 'all';

  const q = $('#q');
  q.value = view.q;
  q.addEventListener('input', () => {
    view.q = q.value;
    saveView();
    renderContent();
  });

  $('#status-filter').append(...STATUS_FILTERS.map(([value, label, tone]) => h('label', { class: 'chip' },
    h('input', {
      type: 'radio', name: 'status', value, checked: view.status === value,
      onchange: () => { view.status = value; saveView(); renderContent(); },
    }),
    h('span', {}, tone ? lamp(tone) : null, label))));

  const category = $('#category');
  category.append(h('option', { value: 'all', text: 'All categories' }), ...data.categories.map((c) => h('option', { value: c, text: c })));
  category.value = view.category;
  category.addEventListener('change', () => {
    view.category = category.value;
    saveView();
    renderContent();
  });

  $('#toggle-all').addEventListener('click', () => {
    const names = visibleActive().map((p) => p.name);
    const anyClosed = names.some((n) => !opened.has(n));
    for (const n of names) {
      if (anyClosed) opened.add(n);
      else opened.delete(n);
    }
    saveOpened();
    renderContent();
  });
}

// ---------- filters ----------

const filtering = () => Boolean(view.q.trim()) || view.status !== 'all';

function matches(p) {
  if (view.category !== 'all' && p.category !== view.category) return false;
  const q = view.q.trim().toLowerCase();
  if (q) {
    const text = [p.name, p.description, ...(p.prs || []).map((x) => `#${x.number} ${x.title}`),
      ...(p.issues || []).map((x) => `#${x.number} ${x.title}`), ...(p.orphanBranches || []).map((b) => b.name)]
      .join('\n').toLowerCase();
    if (!text.includes(q)) return false;
  }
  if (view.status !== 'all') return (p.prs || []).some((pr) => prState(pr).kinds.includes(view.status));
  return true;
}

const visibleActive = () => data.projects.filter((p) => hasWork(p) && matches(p));

// ---------- the board ----------

function renderContent() {
  const byName = new Map(data.projects.map((p) => [p.name, p]));
  const visible = new Set(data.projects.filter((p) => p.track !== 'no' && matches(p)));
  const active = visibleActive();

  const out = [todoSection(), h('h2', { text: 'Needs you now' }), readySection(visible, byName)];
  if (view.status === 'all') out.push(issuesSection(visible, byName));
  else out.push(h('p', { class: 'note-line', text: 'Issues are hidden while a PR filter is on.' }));

  out.push(h('h2', { text: 'Projects' }));
  if (active.length) {
    for (const category of data.categories) {
      const rows = active.filter((p) => p.category === category);
      if (rows.length) out.push(h('h3', { text: category }), ...rows.map(projectRow));
    }
  } else {
    out.push(h('p', { class: 'empty', text: 'No project with open work matches the filters.' }));
  }

  const quiet = data.projects.filter((p) => p.track !== 'no' && !hasWork(p) && matches(p));
  if (quiet.length && view.status === 'all') out.push(nameListSection('quiet', 'Projects with no open work', quiet));
  const hidden = data.projects.filter((p) => p.track === 'no' && view.status === 'all' && matches(p));
  if (hidden.length) out.push(nameListSection('hidden', 'Hidden from the dashboard', hidden));

  out.push(staleSection(byName), problemsSection());
  $('#content').replaceChildren(...out.filter(Boolean));

  const allOpen = active.length && active.every((p) => opened.has(p.name));
  $('#toggle-all').textContent = allOpen ? 'Close all' : 'Open all';
  $('#toggle-all').hidden = filtering() || !active.length;
}

// The to-do list (notes/TODO.md and the notes of notes/todo/), the same under every filter. A relative
// link resolves against the file of its entry on GitHub. A link that is not http(s) stays plain text.
// The box of an item deletes its line from the file (`askRemoveTodo`), with its sub-items.
function todoLink(part, file) {
  let url;
  try {
    url = new URL(part.href, `${REPO_URL}/blob/main/${todoFileUrlPath(file) ?? TODO_FILE}`);
  } catch {
    return withCode(part.text);
  }
  return /^https?:$/.test(url.protocol) ? h('a', { href: url.href }, withCode(part.text)) : withCode(part.text);
}
// A ref part links to the issue path of its repo. The page builds the address, so it is always one of ours.
const todoParts = (parts, file) => parts.map((part) => (part.ref ? h('a', { href: todoRefUrl(part.ref) }, part.text) : part.href ? todoLink(part, file) : withCode(part.text)));
const todoWords = (entry) => entry.parts.map((part) => part.text).join('');
// The key names the file and the heading, and a sub-item's key names its top item, so the same words
// in another note, under another heading or under another item stay on the page.
const todoKey = (entry) => [entry.file ?? TODO_FILE, entry.headingLine ?? '', ...(entry.under || []), ...(entry.lines || [])].join('\n');
const sameSpot = (a, b) => (a.file ?? TODO_FILE) === (b.file ?? TODO_FILE) && (a.headingLine ?? '') === (b.headingLine ?? '');

function dropTodoItems(keys) {
  data.todo = (data.todo || [])
    .map((s) => ({ ...s, entries: s.entries.filter((e) => !keys.has(todoKey(e))) }))
    .filter((s) => s.entries.length);
}

// A deleted item stays in data.json until the next sync has run, so this browser remembers
// the delete until newer data arrives. Without storage the item only comes back for those
// minutes, and a second delete then finds nothing to do.
function hideRemovedTodos() {
  const removed = store.get('todoRemoved', []).filter((r) => r.at > data.generatedAtIso);
  store.set('todoRemoved', removed);
  dropTodoItems(new Set(removed.map((r) => r.key)));
}

function rememberRemovedTodo(entries) {
  const keys = entries.map(todoKey);
  const at = new Date().toISOString();
  store.set('todoRemoved', [...store.get('todoRemoved', []), ...keys.map((key) => ({ key, at }))]);
  dropTodoItems(new Set(keys));
}

// The sub-items of a top item: the entries right after it in its section that have `under`.
function todoSubItems(entry) {
  if (entry.under) return [];
  for (const section of data.todo || []) {
    const at = section.entries.indexOf(entry);
    if (at < 0) continue;
    const rest = section.entries.slice(at + 1);
    const end = rest.findIndex((e) => !e.under);
    return end < 0 ? rest : rest.slice(0, end);
  }
  return [];
}
const todoTopOf = (entry) => entry.under && (data.todo || []).flatMap((s) => s.entries)
  .find((e) => !e.under && sameSpot(e, entry) && (e.lines || []).join('\n') === entry.under.join('\n'));
// One line per ref that GitHub answered: #N, the title, and the state. The title is GitHub's
// text, written by other people, so it only ever goes in as text.
function todoRefLines(entry) {
  if (!todoTitles) return null;
  const lines = (entry.refs || []).map((ref) => {
    const info = todoTitles.get(`${ref.repo}#${ref.number}`);
    if (!info) return null;
    const name = ref.repo === entry.repo ? `#${ref.number}` : `${ref.repo}#${ref.number}`;
    return h('p', { class: 'todo-ref', text: `${name} ${info.title} · ${info.state}` });
  }).filter(Boolean);
  return lines.length ? h('div', { class: 'todo-refs' }, lines) : null;
}
function todoRow(entry, section) {
  const place = TODO_PLACES[entry.place];
  const mark = todoMark(entry, todoTitles, Date.now());
  return h('li', { class: `item todo-item${entry.done ? ' done' : ''}`, 'data-file': entry.file || '' },
    h('button', { type: 'button', class: 'todo-box', title: 'Mark done', 'aria-label': `Mark done: ${todoWords(entry)}`, onclick: () => askRemoveTodo(entry) }),
    h('div', { class: 'item-title' },
      entry.done ? h('span', { class: 'visually-hidden', text: 'Done: ' }) : null,
      section && section.title ? h('span', { class: 'todo-repo', text: section.title }) : null,
      place ? h('span', { class: 'todo-place', 'data-place': entry.place }, `${place[0]} ${place[1]}`) : null,
      todoParts(entry.parts, entry.file),
      mark ? h('span', { class: `todo-mark ${mark.tone}`, text: mark.text }) : null),
    todoRefLines(entry));
}
const redrawTodoPanel = () => $('#todo-panel')?.replaceWith(todoPanel());

// Fetches the titles with the read token, 100 numbers to a request. Without a token it asks for
// nothing. A failure leaves one line above the list and never blocks the list or a box.
async function loadTodoTitles() {
  const run = ++titleRun;
  todoTitles = null;
  todoNote = null;
  const refs = new Map();
  for (const section of data.todo || []) {
    for (const entry of section.entries) for (const ref of entry.refs || []) refs.set(`${ref.repo}#${ref.number}`, ref);
  }
  if (readToken && refs.size) {
    const all = [...refs.values()];
    try {
      const loaded = new Map();
      for (let i = 0; i < all.length; i += 100) {
        const { query, aliases } = todoTitleQuery(all.slice(i, i + 100));
        const res = await gh('/graphql', { method: 'POST', body: JSON.stringify({ query }) }, readToken);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.data) throw new Error(json.errors?.[0]?.message || 'no answer');
        for (const [key, info] of readTodoTitles(json, aliases)) loaded.set(key, info);
      }
      if (run === titleRun) todoTitles = loaded;
    } catch (err) {
      if (run === titleRun) todoNote = err.kind === 'auth' ? 'auth' : err instanceof UserError ? 'GitHub did not answer' : err.message;
    }
  }
  if (run === titleRun) redrawTodoPanel();
}
function todoNoteLine() {
  if (!todoNote) return null;
  if (todoNote === 'auth') {
    return h('p', { class: 'note-line todo-note' }, 'GitHub refused the read token. ',
      h('button', { type: 'button', class: 'quiet-button', onclick: () => openTokenDialog() }, 'Paste a new token'));
  }
  return h('p', { class: 'note-line todo-note', text: `Titles did not load (${todoNote}).` });
}
function todoPanel() {
  const panel = h('div', { class: 'panel', id: 'todo-panel' }, todoNoteLine());
  const groups = groupTodo(data.todo || [], todoView);
  if (!groups.some((g) => g.items.length)) panel.append(h('p', { class: 'empty', text: 'None.' }));
  for (const group of groups) {
    if (!group.items.length && todoView.place !== 'all') continue;
    panel.append(h('p', { class: 'group-title', text: `${group.title} (${group.items.length})` }));
    if (!group.items.length) {
      panel.append(h('p', { class: 'empty todo-empty', text: 'None.' }));
      continue;
    }
    let list = null;
    let last = null;
    let headed = false; // A heading showed above in this group.
    for (const { top, subs, section } of group.items) {
      // A heading shows once, above its items in this group. A new section ends the list, so its
      // rows never sit under the heading of the section before. After a heading showed in this
      // group, a section with no heading of its own shows its title instead.
      if (section !== last) {
        last = section;
        list = null;
        const words = section.heading || (headed ? section.title : '');
        if (words) {
          panel.append(h('p', { class: 'todo-heading', 'data-file': top.file || '', text: words }));
          headed = true;
        }
      }
      if (top.type !== 'item') {
        panel.append(h('p', { class: 'note-line' }, todoParts(top.parts, top.file)));
        list = null;
        continue;
      }
      if (!list) {
        list = h('ul', { class: 'list' });
        panel.append(list);
      }
      const row = todoRow(top, todoView.project === 'all' ? section : null);
      if (subs.length) row.append(h('ul', { class: 'list todo-subs' }, subs.map((sub) => todoRow(sub))));
      list.append(row);
    }
  }
  return panel;
}
function todoSection() {
  const heading = h('h2', { text: 'To do' });
  const sections = data.todo || [];
  if (!sections.length) return h('section', { id: 'todo-list' }, heading, h('p', { class: 'empty', text: 'None.' }));
  const projects = todoProjects(sections);
  if (todoView.project !== 'all' && !projects.some((p) => p.title === todoView.project)) todoView.project = 'all';
  if (todoView.place !== 'all' && !TODO_PLACES[todoView.place]) todoView.place = 'all';
  const redraw = () => {
    saveTodoView();
    $('#todo-panel').replaceWith(todoPanel());
  };
  const project = h('select', { id: 'todo-project', 'aria-label': 'Project' },
    h('option', { value: 'all', text: 'All projects' }),
    projects.map((p) => h('option', { value: p.title, text: `${p.title || 'No heading'} (${p.count})` })));
  project.value = todoView.project;
  project.addEventListener('change', () => { todoView.project = project.value; redraw(); });
  const place = h('select', { id: 'todo-place', 'aria-label': 'Where' },
    h('option', { value: 'all', text: 'All places' }),
    Object.entries(TODO_PLACES).map(([key, [mark, name]]) => h('option', { value: key, text: `${mark} ${name}` })));
  place.value = todoView.place;
  place.addEventListener('change', () => { todoView.place = place.value; redraw(); });
  return h('section', { id: 'todo-list' }, heading,
    h('div', { class: 'todo-filters' }, project, place), todoPanel());
}

function readySection(visible, byName) {
  const rows = data.readyIdle
    .map((r) => {
      const project = byName.get(r.repo);
      return { ...r, project, pr: project && (project.prs || []).find((x) => x.number === r.number) };
    })
    .filter((r) => r.pr && visible.has(r.project))
    .filter((r) => view.status === 'all' || prState(r.pr).kinds.includes(view.status));
  const title = h('h3', { text: `Ready to merge, idle ${data.thresholds.idleDays}+ days (${rows.length})` });
  if (!rows.length) return h('section', {}, title, h('p', { class: 'empty', text: 'None.' }));
  return h('section', {}, title, h('div', { class: 'panel' }, h('ul', { class: 'list' }, rows.map((r) => h('li', { class: 'item' },
    lamp('good', 'ready'),
    h('div', {},
      h('div', { class: 'item-title' }, h('span', { class: 'repo-tag', text: r.repo }), ' ',
        h('a', { href: r.pr.url }, `#${r.pr.number} ${r.pr.title}`)),
      h('div', { class: 'item-meta' },
        h('span', { text: `idle ${plural(r.idleDays, 'day')}` }),
        badgeList(r.pr.checks === 'SUCCESS' ? [['good', 'Checks passing']] : [['draft', 'No checks']]))))))));
}

function issueItem(issue, extra = []) {
  const meta = [h('span', { text: `opened ${ago(issue.createdAt)}` })];
  if (issue.author && issue.author !== data.owner) meta.push(h('span', { text: `by ${issue.author}` }));
  if (issue.comments) meta.push(h('span', { text: plural(issue.comments, 'comment') }));
  if (issue.for && issue.for.length) meta.push(h('span', { text: `for ${issue.for.join(', ')}` }));
  return h('li', { class: 'item' }, h('span', { class: 'dot', 'aria-hidden': 'true' }),
    h('div', {}, h('div', { class: 'item-title' }, ...extra, h('a', { href: issue.url }, `#${issue.number} ${issue.title}`)),
      h('div', { class: 'item-meta' }, meta)));
}

function issuesSection(visible, byName) {
  const shared = data.issues.shared.filter((g) => g.items.some((i) => visible.has(byName.get(i.repo))));
  const groups = data.issues.byProject
    .map((g) => ({ project: byName.get(g.repo), numbers: g.numbers }))
    .filter((g) => g.project && visible.has(g.project));
  const count = shared.reduce((n, g) => n + g.items.length, 0)
    + groups.reduce((n, g) => n + g.numbers.length, 0);
  const title = h('h3', { text: `Open issues (${count})` });
  if (!count) return h('section', {}, title, h('p', { class: 'empty', text: 'None.' }));

  const panel = h('div', { class: 'panel' });
  if (shared.length) {
    panel.append(h('p', { class: 'group-title', text: 'Same title in several repos' }), h('ul', { class: 'list' },
      shared.map((g) => h('li', { class: 'item' }, h('span', { class: 'dot', 'aria-hidden': 'true' }),
        h('div', {}, h('div', { class: 'item-title', text: g.title }),
          h('div', { class: 'item-meta' }, g.items.map((i) => h('a', { href: i.url }, `${i.repo} #${i.number}`))))))));
  }
  for (const g of groups) {
    const issues = g.numbers.map((n) => g.project.issues.find((i) => i.number === n)).filter(Boolean);
    panel.append(h('p', { class: 'group-title', text: g.project.name }), h('ul', { class: 'list' }, issues.map((i) => issueItem(i))));
  }
  return h('section', {}, title, panel);
}

function countsText(p) {
  const parts = [];
  if (p.prsTotal) parts.push(plural(p.prsTotal, 'PR'));
  if (p.issuesTotal) parts.push(plural(p.issuesTotal, 'issue'));
  if (p.orphanBranches.length) parts.push(`${plural(p.orphanBranches.length, 'branch', 'branches')} with no PR`);
  if (p.openedElsewhere.length) parts.push(`${p.openedElsewhere.length} opened elsewhere`);
  for (const w of p.watch) if (workText(w)) parts.push(`${workText(w)} in ${w.repo}`);
  return parts.join(', ');
}

function lampSummary(states) {
  const counts = {};
  for (const { s } of states) counts[s.lamp] = (counts[s.lamp] || 0) + 1;
  return Object.entries(counts).map(([tone, n]) => `${n} ${LAMP_WORDS[tone]}`).join(', ');
}

function projectRow(p) {
  const states = p.prs.map((pr) => ({ pr, s: prState(pr) }));
  const isOpen = opened.has(p.name) || filtering();
  const bodyId = slug(p.name);

  const lamps = states.length ? h('span', { class: 'lamps', 'aria-hidden': 'true' },
    states.slice(0, MAX_LAMPS).map(({ pr, s }) => lamp(s.lamp, `#${pr.number}: ${LAMP_WORDS[s.lamp]}`)),
    states.length > MAX_LAMPS ? h('span', { class: 'more', text: `+${states.length - MAX_LAMPS}` }) : null) : null;

  const body = h('div', { class: 'project-body', id: bodyId, hidden: !isOpen }, projectDetails(p, states));
  const toggle = h('button', {
    type: 'button', class: 'disclose', 'aria-expanded': String(isOpen), 'aria-controls': bodyId,
    onclick: () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      body.hidden = !open;
      if (open) opened.add(p.name);
      else opened.delete(p.name);
      saveOpened();
    },
  },
  h('span', { class: 'caret', 'aria-hidden': 'true' }),
  h('span', { class: 'project-name' }, h('strong', { text: p.name }), h('span', { class: 'counts', text: countsText(p) })),
  lamps,
  states.length ? h('span', { class: 'visually-hidden', text: `PRs: ${lampSummary(states)}` }) : null);

  return h('article', { class: 'project', 'data-project': p.name },
    h('div', { class: 'project-head' }, toggle,
      h('button', { type: 'button', class: 'quiet-button edit-button', 'aria-label': `Edit ${p.name}`, onclick: () => openEditor(p) }, 'Edit')),
    body);
}

function projectDetails(p, states) {
  const parts = [];
  const facts = [];
  if (p.uses.length) {
    facts.push(h('span', {}, h('strong', { text: 'Uses ' }), p.uses.map((u, i) => [i ? ', ' : '', u.name,
      ` (${[u.prsTotal ? plural(u.prsTotal, 'PR') : '', u.issuesTotal ? plural(u.issuesTotal, 'issue') : ''].filter(Boolean).join(', ') || 'no open work'})`])));
  }
  if (p.usedBy.length) facts.push(h('span', {}, h('strong', { text: 'Used by ' }), p.usedBy.join(', ')));
  if (p.watch.length) {
    facts.push(h('span', { class: 'watch' }, h('strong', { text: 'Watches ' }), p.watch.map((w, i) => [i ? ', ' : '',
      h('a', { href: w.url }, w.repo), ` (${[w.isPrivate ? 'private' : '', workText(w) || 'no open work',
        w.issuesMine ? `${w.issuesMine} opened by you` : ''].filter(Boolean).join(' · ')})`])));
  }
  if (facts.length) parts.push(h('p', { class: 'facts' }, facts.map((f, i) => [i ? '. ' : '', f]), '.'));

  const items = [];
  const shown = view.status === 'all' ? states : states.filter(({ s }) => s.kinds.includes(view.status));
  for (const { pr, s } of shown) {
    const meta = [badgeList(s.badges), h('span', { text: `opened ${ago(pr.createdAt)}` })];
    if (pr.for.length) meta.push(h('span', { text: `for ${pr.for.join(', ')}` }));
    items.push(h('li', { class: 'item' }, lamp(s.lamp, LAMP_WORDS[s.lamp]),
      h('div', {}, h('div', { class: 'item-title' }, h('a', { href: pr.url }, `#${pr.number} ${pr.title}`)),
        h('div', { class: 'item-meta' }, meta))));
  }
  if (view.status === 'all') {
    for (const issue of p.issues) items.push(issueItem(issue, [h('span', { class: 'badge', text: 'Issue' }), ' ']));
    for (const e of p.openedElsewhere) {
      items.push(h('li', { class: 'item' }, h('span', { class: 'dot', 'aria-hidden': 'true' }),
        h('div', {}, h('div', { class: 'item-title' }, h('a', { href: e.url }, `${e.repo} #${e.number} ${e.title}`)),
          h('div', { class: 'item-meta' }, h('span', { text: `${e.kind} opened in ${e.repo} for this project, ${ago(e.createdAt)}` })))));
    }
    for (const b of p.orphanBranches.slice(0, MAX_BRANCHES)) {
      items.push(h('li', { class: 'item' }, h('span', { class: 'dot', 'aria-hidden': 'true' }),
        h('div', {}, h('div', { class: 'item-title' }, 'Branch ', h('a', { href: b.url }, h('code', { text: b.name }))),
          h('div', { class: 'item-meta', text: 'No PR' }))));
    }
    if (p.orphanBranches.length > MAX_BRANCHES) {
      items.push(h('li', { class: 'item' }, h('span'), h('a', { href: noteUrl(p) },
        `${plural(p.orphanBranches.length - MAX_BRANCHES, 'more branch', 'more branches')} in the note`)));
    }
  }
  if (items.length) parts.push(h('ul', { class: 'list' }, items));
  return parts;
}

function nameListSection(key, title, projects) {
  const details = h('details', { class: 'more-section', open: store.get(`section:${key}`, false) || filtering() },
    h('summary', {}, `${title} (${projects.length})`),
    h('ul', { class: 'name-list' }, projects.map((p) => h('li', { 'data-project': p.name }, h('span', { text: p.name }),
      h('button', { type: 'button', 'aria-label': `Edit ${p.name}`, onclick: () => openEditor(p) }, 'Edit')))));
  details.addEventListener('toggle', () => store.set(`section:${key}`, details.open));
  return details;
}

function staleSection(byName) {
  const rows = data.stale.map((s) => ({ ...s, project: byName.get(s.repo) })).filter((s) => s.project && matches(s.project));
  if (!rows.length || view.status !== 'all') return null;
  return h('section', {}, h('h2', { text: `No push in ${data.thresholds.staleDays}+ days` }),
    h('div', { class: 'panel' }, h('ul', { class: 'list' }, rows.map((s) => h('li', { class: 'item' },
      h('span', { class: 'dot', 'aria-hidden': 'true' }),
      h('div', {}, h('div', { class: 'item-title' }, h('a', { href: s.project.url }, s.repo)),
        h('div', { class: 'item-meta' }, h('span', { text: `last push ${s.pushedAt.slice(0, 10)}` }),
          badgeList([...(s.project.isFork ? [['draft', 'Fork']] : []), ...(s.project.isPrivate ? [['draft', 'Private']] : [])]))))))));
}

function problemsSection() {
  if (!data.problems.length) return null;
  return h('section', {}, h('h2', { text: 'Note problems' }),
    h('div', { class: 'panel' }, h('ul', { class: 'list' }, data.problems.map((p) => h('li', { class: 'item' },
      lamp('wait', 'problem'), h('div', { class: 'item-title' }, withCode(p)))))));
}

// ---------- GitHub API ----------

async function gh(path, init = {}, auth = token) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${auth}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new UserError('GitHub did not answer. Check the network connection, then try again.');
  }
  if (res.status === 401) {
    throw new UserError('GitHub refused the token: it is wrong or expired. Paste a new token.', 'auth');
  }
  return res;
}

async function apiError(res, doing) {
  let detail = '';
  try { detail = (await res.json()).message || ''; } catch { /* no body */ }
  if (res.status === 403) {
    return new UserError(`The token may not ${doing}. It needs “Contents: Read and write” on ${REPO}. Paste a new token.${detail ? ` (${detail})` : ''}`, 'auth');
  }
  return new UserError(`GitHub could not ${doing} (HTTP ${res.status}${detail ? `: ${detail}` : ''}).`);
}

function decodeBase64(b64) {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new UserError('This note is not valid UTF-8 text, so it cannot be edited here. Edit it on GitHub.');
  }
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

const contentsPath = (file) => `/repos/${REPO}/contents/projects/${encodeURIComponent(file)}`;

async function getNote(file) {
  const res = await gh(`${contentsPath(file)}?ref=main`);
  if (res.status === 404) throw new UserError(`projects/${file} is not in the repo yet. The next sync makes it.`);
  if (!res.ok) throw await apiError(res, 'read the note');
  const json = await res.json();
  if (json.encoding !== 'base64') throw new UserError('This note is too large to edit here. Edit it on GitHub.');
  return { text: decodeBase64(json.content), sha: json.sha };
}

function putNote(file, text, sha, message) {
  return gh(contentsPath(file), {
    method: 'PUT',
    body: JSON.stringify({ message, content: encodeBase64(text), sha, branch: 'main' }),
  });
}

// Deletes an item from its own file on GitHub (`notes/TODO.md` or a note of `notes/todo/`), and
// returns false when the file does not have it any more. It reads the file first, because this
// page's data can be hours older, and again after a conflict. The item is looked for under its own
// heading. The push starts the sync (both paths are in the workflow's push paths), so this needs no
// dispatch and no Actions access.
async function deleteTodoItem(entry, group) {
  const lines = group.flatMap((e) => e.lines);
  const urlPath = todoFileUrlPath(entry.file ?? TODO_FILE);
  if (urlPath === null) throw new UserError('This line comes from a file that this page does not change.');
  const path = `/repos/${REPO}/contents/${urlPath}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await gh(`${path}?ref=main`);
    if (res.status === 404) return false; // The note was deleted in Obsidian.
    if (!res.ok) throw await apiError(res, 'read the to-do list');
    const file = await res.json();
    const text = removeTodoItem(decodeBase64(file.content), lines, entry.under, entry.headingLine);
    if (text === null) return false;
    const put = await gh(path, {
      method: 'PUT',
      body: JSON.stringify({ message: `To do, done: ${todoWords(entry).slice(0, 60)}`, content: encodeBase64(text), sha: file.sha, branch: 'main' }),
    });
    if (put.ok) return true;
    if (put.status !== 409 && put.status !== 422) throw await apiError(put, 'save the to-do list');
  }
  throw new UserError('The to-do list kept changing on GitHub, so nothing is saved. Try again.');
}

async function startSync() {
  const res = await gh(`/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main' }),
  });
  return res.status === 204;
}

// Whether the token can commit and start the sync. The repo is public, so reading it
// proves nothing. Each probe is a request GitHub refuses either way, so it changes
// nothing: a PUT with a sha that never matches (409 with write access, 403 without),
// and a dispatch to a branch that does not exist (422 with Actions access, 403 without).
async function probeToken(auth) {
  const write = await gh(`/repos/${REPO}/contents/README.md`, {
    method: 'PUT',
    body: JSON.stringify({ message: 'Access check from the web dashboard', content: '', sha: '0'.repeat(40), branch: 'main' }),
  }, auth);
  const dispatch = await gh(`/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'refs/heads/no-such-branch-access-check' }),
  }, auth);
  return {
    canWrite: write.status !== 403 && write.status !== 404,
    canSync: dispatch.status !== 403 && dispatch.status !== 404,
  };
}

// Whether a token may be the read token: it must read, and it must write nothing. The
// probes are requests GitHub refuses either way, so they change nothing. Observed on
// real GitHub on 2026-11-13 with a token that can write:
//   POST /repos/ChadFarrow/project-notes/issues with {}  -> 422 ("title" wasn't supplied)
//   POST /repos/ChadFarrow/project-notes/pulls with {}   -> 422 ("base", "head" weren't supplied)
//   GraphQL viewer.repositories(privacy: PRIVATE)        -> totalCount 13
// A fine-grained token without the permission gets 403 "Resource not accessible by
// personal access token" (GitHub's documented answer; not yet observed here).
// → null when the token is accepted, else the reason to show.
async function checkReadToken(value) {
  const refused = 'GitHub refused this token.';
  try {
    const count = await gh('/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: '{ viewer { repositories(privacy: PRIVATE, first: 1) { totalCount } } }' }),
    }, value);
    if (!count.ok) return `GitHub could not check this token (HTTP ${count.status}).`;
    const answer = await count.json();
    if (!answer?.data) return `GitHub could not check this token: ${String(answer?.errors?.[0]?.message ?? 'no answer')}`;
    // A count above 0 only proves the token sees some private repo. It must see every private
    // project of the dashboard, or the titles of the others go missing with no message.
    const total = answer.data.viewer?.repositories?.totalCount;
    const privateProjects = (data.projects || []).filter((p) => p.isPrivate).length;
    if (!total || total < privateProjects) return 'Pick All repositories.';
    const write = await gh(`/repos/${REPO}/contents/README.md`, {
      method: 'PUT',
      body: JSON.stringify({ message: 'Access check from the web dashboard', content: '', sha: '0'.repeat(40), branch: 'main' }),
    }, value);
    if (write.status !== 403 && write.status !== 404) return 'This token can change files. Make a read-only one.';
    for (const kind of ['issues', 'pulls']) {
      const res = await gh(`/repos/${REPO}/${kind}`, { method: 'POST', body: '{}' }, value);
      if (res.status !== 403 && res.status !== 404) return 'This token can change issues or PRs. Make a read-only one.';
    }
    return null;
  } catch (err) {
    return err.kind === 'auth' ? refused : messageFor(err);
  }
}

// ---------- the editor ----------

// The editor that is open, if any: guards unsaved edits against a page reload.
let openSession = null;
window.addEventListener('beforeunload', (e) => {
  const dlg = document.querySelector('#editor');
  if (dlg && dlg.open && dlg.isDirty && dlg.isDirty()) e.preventDefault();
});

function sheet(dlg, titleId, title, body, foot) {
  dlg.replaceChildren(h('div', { class: 'sheet-inner' },
    h('div', { class: 'sheet-head' }, h('h2', { id: titleId, text: title }),
      h('button', { type: 'button', class: 'quiet-button close-button', 'aria-label': 'Close', onclick: () => closeSheet(dlg) }, '×')),
    body, foot));
}

// Closing asks first when there are unsaved changes.
function closeSheet(dlg) {
  if (dlg.isDirty && dlg.isDirty() && !window.confirm('Close without saving your changes?')) return;
  dlg.close();
}

function setupSheet(dlg) {
  if (dlg.dataset.ready) return;
  dlg.dataset.ready = '1';
  dlg.addEventListener('cancel', (e) => {
    if (dlg.isDirty && dlg.isDirty() && !window.confirm('Close without saving your changes?')) e.preventDefault();
  });
  dlg.addEventListener('close', () => { dlg.isDirty = null; });
}

async function openEditor(p) {
  if (!token) {
    openTokenDialog(() => openEditor(p));
    return;
  }
  const dlg = $('#editor');
  setupSheet(dlg);
  dlg.isDirty = null;
  const session = {};
  openSession = session;
  const status = h('p', { class: 'status', role: 'status' });
  const body = h('div', { class: 'sheet-body' }, h('p', { class: 'empty', text: 'Loading the note…' }));
  const save = h('button', { type: 'button', class: 'primary', disabled: true }, 'Save changes');
  const cancel = h('button', { type: 'button', class: 'cancel-button', onclick: () => closeSheet(dlg) }, 'Cancel');
  // Opens the token sheet over the editor, so the edits stay.
  const newToken = h('button', { type: 'button', hidden: true, onclick: () => openTokenDialog() }, 'Paste a new token');
  sheet(dlg, 'editor-title', p.name, body, h('div', { class: 'sheet-foot' }, status, newToken, cancel, save));
  if (!dlg.open) dlg.showModal();

  let note;
  let form;
  try {
    note = await getNote(p.noteFile);
    form = readNoteForm(note.text);
    if (form.error) throw new UserError(`This note cannot be edited here: ${form.error}. Fix the note on GitHub.`);
  } catch (err) {
    if (openSession !== session) return;
    body.replaceChildren(h('div', {}, h('p', { class: 'hint bad', text: messageFor(err) }),
      err.kind === 'auth' ? h('p', {}, h('button', { type: 'button', onclick: () => { dlg.close(); openTokenDialog(() => openEditor(p)); } }, 'Paste a new token')) : null,
      h('p', {}, h('a', { href: noteUrl(p) }, 'Open the note on GitHub'))));
    return;
  }
  // The editor was closed, or another project opened, while this note loaded.
  if (openSession !== session || !dlg.open) return;

  const editor = editorForm(p, form);
  const fields = h('fieldset', { class: 'editor-fields' }, editor.element);
  body.replaceChildren(fields, h('p', { class: 'hint' }, h('a', { href: noteUrl(p) }, 'Open the note on GitHub')));
  dlg.isDirty = () => Object.keys(diffNoteForm(form, editor.values())).length > 0;
  save.disabled = false;
  save.addEventListener('click', async () => {
    const changes = diffNoteForm(form, editor.values());
    if (!Object.keys(changes).length) {
      setStatus(status, '', 'Nothing changed.');
      return;
    }
    save.disabled = true;
    newToken.hidden = true;
    setStatus(status, '', 'Saving…');
    try {
      const message = await saveChanges(p, note, form, changes);
      // The form now shows what is saved; open the note again to change more.
      dlg.isDirty = null;
      fields.disabled = true;
      setStatus(status, 'good', message);
      save.textContent = 'Saved';
      cancel.textContent = 'Close';
      renderContent();
    } catch (err) {
      setStatus(status, 'bad', messageFor(err));
      newToken.hidden = err.kind !== 'auth';
      save.disabled = false;
    }
  });
}

// Writes the changes to GitHub. On a conflict (the note changed since it was read),
// reads the note again and applies the same changes once more, but only when none of
// the changed fields changed on GitHub too; otherwise it stops rather than overwrite.
async function saveChanges(p, note, opened, changes) {
  let current = note;
  for (let attempt = 0; ; attempt++) {
    const result = applyNoteForm(current.text, changes);
    if (result.error) throw new UserError(`${result.error}.`);
    if (result.text === current.text) break;
    const res = await putNote(p.noteFile, result.text, current.sha, `Edit the ${p.name} note from the web dashboard`);
    if (res.ok) break;
    if ((res.status === 409 || res.status === 422) && attempt === 0) {
      current = await getNote(p.noteFile);
      const fresh = readNoteForm(current.text);
      if (fresh.error) throw new UserError(`The note changed on GitHub and cannot be edited here now: ${fresh.error}.`);
      const clash = conflictingFields(opened, fresh, changes);
      if (clash.length) {
        throw new UserError(`${clash.join(', ')} changed on GitHub while you edited, so nothing is saved. `
          + 'Copy your text, close the editor, and open it again.');
      }
      continue;
    }
    throw await apiError(res, 'save the note');
  }

  if (changes.category !== undefined || changes.uses !== undefined || changes.track !== undefined) {
    // Show the new grouping now; the sync refreshes the rest.
    if (changes.category !== undefined) {
      p.category = changes.category;
      if (!data.categories.includes(p.category)) data.categories.push(p.category);
    }
    // A hidden project has no work in the data, so it only reappears after the sync.
    if (changes.track !== undefined && p.prs) p.track = changes.track;
    let started = false;
    try { started = await startSync(); } catch { started = false; }
    return started
      ? 'Saved. The dashboard shows the change in a few minutes.'
      : 'Saved. The dashboard shows the change after the next sync (within about 5 hours), because this token cannot start the sync.';
  }
  return 'Saved.';
}

// A tap on a to-do box asks first, so a mistaken tap removes nothing.
function askRemoveTodo(entry) {
  if (!token) {
    openTokenDialog(() => askRemoveTodo(entry));
    return;
  }
  const dlg = $('#todo-dialog');
  setupSheet(dlg);
  const status = h('p', { class: 'status', role: 'status' });
  const subItems = todoSubItems(entry);
  const group = [entry, ...subItems];
  const top = todoTopOf(entry);
  const remove = h('button', { type: 'button', class: 'primary' }, subItems.length ? `Delete all ${group.length}` : 'Delete the line');
  const newToken = h('button', { type: 'button', hidden: true, onclick: () => openTokenDialog() }, 'Paste a new token');
  const cancel = h('button', { type: 'button', class: 'cancel-button', onclick: () => dlg.close() }, 'Cancel');
  sheet(dlg, 'todo-title', 'Mark this done?',
    h('div', { class: 'sheet-body' },
      top ? h('p', { class: 'note-line todo-top' }, withCode(todoWords(top))) : null,
      h('p', { class: 'item-title' }, withCode(todoWords(entry))),
      h('p', { class: 'note-line', text: subItems.length
        ? `This deletes the line and its ${plural(subItems.length, 'sub-item')} from ${entry.file ?? TODO_FILE} on GitHub.`
        : `This deletes the line from ${entry.file ?? TODO_FILE} on GitHub.` })),
    h('div', { class: 'sheet-foot' }, status, newToken, cancel, remove));
  remove.addEventListener('click', async () => {
    remove.disabled = true;
    newToken.hidden = true;
    setStatus(status, '', 'Saving…');
    try {
      const deleted = await deleteTodoItem(entry, group);
      rememberRemovedTodo(group);
      renderContent();
      if (deleted) {
        dlg.close();
        return;
      }
      setStatus(status, '', 'This line is not in the file on GitHub any more, so nothing changed. It may be deleted or reworded already.');
      remove.hidden = true;
      cancel.textContent = 'Close';
    } catch (err) {
      setStatus(status, 'bad', messageFor(err));
      newToken.hidden = err.kind !== 'auth';
      remove.disabled = false;
    }
  });
  if (!dlg.open) dlg.showModal();
}

function field(labelText, control, ...rest) {
  return h('div', { class: 'field' }, h('label', { class: 'label', for: control.id, text: labelText }), control, ...rest);
}

const lockedHint = (form, key, name) => (form.readOnly.includes(key)
  ? h('p', { class: 'hint bad', text: `This note has more than one ${name} line, so this field is locked. Fix the note on GitHub.` })
  : null);

function editorForm(p, form) {
  const parts = [];

  // Category: the categories already in use, so the names always match.
  const known = [...new Set([...data.categories, form.category])];
  const select = h('select', { id: 'f-category', disabled: form.readOnly.includes('category') },
    known.map((c) => h('option', { value: c, text: c })), h('option', { value: NEW_CATEGORY, text: 'New category…' }));
  select.value = form.category;
  const newName = h('input', { type: 'text', id: 'f-new-category', placeholder: 'Name of the new category', hidden: true, autocomplete: 'off' });
  const newHint = h('p', { class: 'hint', hidden: true });
  select.addEventListener('change', () => {
    newName.hidden = select.value !== NEW_CATEGORY;
    newHint.hidden = true;
    if (!newName.hidden) newName.focus();
  });
  newName.addEventListener('input', () => {
    const match = matchCategory(newName.value, data.categories);
    newHint.hidden = !(newName.value.trim() && data.categories.includes(match));
    newHint.textContent = `You already have “${match}”. The note gets that name.`;
  });
  parts.push(field('Category', select, newName, newHint, lockedHint(form, 'category', '**Category:**')));

  // Uses: pick from the repo names; the chosen ones first.
  const canonical = (name) => data.repos.find((r) => r.toLowerCase() === name.toLowerCase()) || name;
  const chosen = new Set(form.uses.map(canonical));
  const options = [...new Set([...chosen, ...data.repos])].filter((r) => r !== p.name)
    .sort((a, b) => (chosen.has(b) - chosen.has(a)) || a.localeCompare(b, 'en', { sensitivity: 'base' }));
  const usesLocked = form.readOnly.includes('uses');
  const boxes = options.map((name) => h('label', { class: 'check', 'data-name': name.toLowerCase() },
    h('input', { type: 'checkbox', value: name, checked: chosen.has(name), disabled: usesLocked }), h('span', { text: name })));
  const filter = h('input', { type: 'search', id: 'f-uses', placeholder: 'Filter the repos', autocomplete: 'off' });
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    for (const box of boxes) box.hidden = Boolean(q) && !box.dataset.name.includes(q);
  });
  // The label points at the filter box; each checkbox carries its own label.
  parts.push(h('div', { class: 'field' }, h('label', { class: 'label', for: 'f-uses', text: 'Uses' }),
    h('div', { class: 'uses-box' }, filter, h('div', { class: 'uses-list' }, boxes)),
    h('p', { class: 'hint', text: 'The repos this project depends on. Their open work shows on this project.' }),
    lockedHint(form, 'uses', '**Uses:**')));

  // Track.
  const trackLocked = form.readOnly.includes('track');
  const radios = TRACK_CHOICES.map(([value, label, hint]) => h('label', { class: 'radio' },
    h('input', { type: 'radio', name: 'f-track', value, checked: form.track === value, disabled: trackLocked }),
    h('span', {}, label, hint ? h('small', { text: hint }) : null)));
  parts.push(h('fieldset', { class: 'field' }, h('legend', { text: 'Dashboard' }), h('div', { class: 'stack' }, radios),
    lockedHint(form, 'track', '**Track:**')));

  // One box per note section; TODOs as a checklist.
  const sectionValues = {};
  form.sections.forEach((s, i) => {
    if (s.todos) {
      const list = todoEditor(s, i);
      sectionValues[s.id] = () => ({ todos: list.values() });
      parts.push(h('div', { class: 'field' }, h('span', { class: 'label', id: `f-s${i}-label`, text: s.heading }), list.element));
    } else {
      const area = h('textarea', {
        id: `f-s${i}`, rows: String(Math.min(14, Math.max(3, s.text.split('\n').length + 1))),
        placeholder: s.placeholder || `Write the ${s.heading.toLowerCase()} here`,
      });
      area.value = s.text;
      sectionValues[s.id] = () => ({ text: area.value });
      parts.push(field(s.heading, area));
    }
  });

  return {
    element: h('div', {}, parts),
    values() {
      const category = select.value === NEW_CATEGORY
        ? (matchCategory(newName.value, data.categories) || form.category)
        : select.value;
      const uses = boxes.filter((b) => b.querySelector('input').checked).map((b) => b.querySelector('input').value);
      const track = (radios.map((r) => r.querySelector('input')).find((r) => r.checked) || {}).value || form.track;
      const sections = Object.fromEntries(Object.entries(sectionValues).map(([id, get]) => [id, get()]));
      return { category, uses, track, sections };
    },
  };
}

function todoEditor(section, index) {
  const items = section.todos.map((t) => ({ ...t }));
  const list = h('ul', { class: 'todos', 'aria-labelledby': `f-s${index}-label` });
  const draw = () => list.replaceChildren(...items.map((t, i) => h('li', { class: 'todo' },
    h('input', { type: 'checkbox', checked: t.done, 'aria-label': `Done: ${t.text}`, onchange: (e) => { t.done = e.target.checked; } }),
    h('input', { type: 'text', value: t.text, 'aria-label': 'TODO', oninput: (e) => { t.text = e.target.value; } }),
    h('button', { type: 'button', class: 'remove', 'aria-label': `Remove ${t.text}`, onclick: () => { items.splice(i, 1); draw(); } }, '×'))));
  draw();
  const add = h('input', { type: 'text', placeholder: 'Add a TODO', 'aria-label': 'Add a TODO', autocomplete: 'off' });
  const addItem = () => {
    const text = add.value.trim();
    if (!text) return;
    items.push({ done: false, text });
    add.value = '';
    draw();
    add.focus();
  };
  add.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  });
  return {
    element: h('div', {}, list, h('div', { class: 'add-todo' }, add, h('button', { type: 'button', onclick: addItem }, 'Add'))),
    // Text typed in the add box but not added yet still counts.
    values: () => [...items, ...(add.value.trim() ? [{ done: false, text: add.value.trim() }] : [])],
  };
}

// ---------- the token ----------

// The second part of the token sheet: a token that reads titles and writes nothing.
function readTokenPart() {
  const status = h('p', { class: 'status', role: 'status' });
  const input = h('input', { type: 'password', id: 't-read-token', autocomplete: 'off', spellcheck: 'false', placeholder: 'github_pat_…' });
  const check = h('button', { type: 'button', class: 'primary' }, 'Check and save');
  const buttons = h('div', { class: 'token-buttons' }, check);
  const forget = h('button', {
    type: 'button', class: 'danger', onclick: () => {
      readToken = '';
      store.remove('readToken');
      loadTodoTitles();
      forget.remove();
      setStatus(status, 'good', 'The titles token is removed from this browser.');
    },
  }, 'Forget the titles token');
  if (readToken) buttons.append(forget);
  check.addEventListener('click', async () => {
    const value = input.value.trim();
    if (!value) {
      setStatus(status, 'bad', 'Paste the token first.');
      input.focus();
      return;
    }
    check.disabled = true;
    setStatus(status, '', 'Checking the token…');
    const reason = await checkReadToken(value);
    check.disabled = false;
    if (reason) {
      setStatus(status, 'bad', reason);
      return;
    }
    readToken = value;
    store.set('readToken', value);
    loadTodoTitles();
    input.value = '';
    buttons.append(forget);
    setStatus(status, 'good', 'The titles token is saved. It reads titles and writes nothing.');
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      check.click();
    }
  });
  return h('section', { class: 'token-part', id: 'read-token-part' },
    h('h3', { text: 'Titles of PRs and issues' }),
    h('p', { text: readToken
      ? 'Titles are set up in this browser. To use a different token, paste it below.'
      : 'To show PR and issue titles in the to-do list, give this page a second token. It is separate from the editing token, so the token that reads titles can write nothing.' }),
    h('ol', { class: 'steps' },
      h('li', {}, 'Open ', h('a', { href: NEW_READ_TOKEN_URL, target: '_blank', rel: 'noopener' }, 'a new read-only token on GitHub'),
        '. The link fills in the name, a 90-day life and the permissions.'),
      h('li', {}, 'For “Repository access”, choose ', h('strong', { text: 'All repositories' }), ', so that it can see the private ones.'),
      h('li', {}, 'Make sure that ', h('strong', { text: 'Issues' }), ' and ', h('strong', { text: 'Pull requests' }),
        ' are “Read-only”, and add nothing else.'),
      h('li', { text: 'Generate the token, copy it, and paste it here.' })),
    h('div', { class: 'field' }, h('label', { class: 'label', for: 't-read-token', text: 'Titles token' }), input),
    buttons, status);
}

function openTokenDialog(then) {
  const dlg = $('#token-dialog');
  setupSheet(dlg);
  // Over plain http (before the certificate is issued) the token could be read on the
  // way, so the page does not take one.
  if (!window.isSecureContext) {
    sheet(dlg, 'token-title', 'Set up editing',
      h('div', { class: 'sheet-body' }, h('p', { class: 'hint bad', text: 'Editing needs a secure connection. Open this page with https:// and try again.' })),
      h('div', { class: 'sheet-foot' }, h('button', { type: 'button', onclick: () => dlg.close() }, 'Close')));
    if (!dlg.open) dlg.showModal();
    return;
  }
  const status = h('p', { class: 'status', role: 'status' });
  const input = h('input', { type: 'password', id: 't-token', autocomplete: 'off', spellcheck: 'false', placeholder: 'github_pat_…' });
  const check = h('button', { type: 'button', class: 'primary' }, 'Check and save');
  const foot = [status, h('button', { type: 'button', onclick: () => dlg.close() }, 'Cancel'), check];
  if (token) {
    foot.splice(1, 0, h('button', {
      type: 'button', class: 'danger', onclick: (e) => {
        token = '';
        store.remove('token');
        updateTokenButton();
        e.currentTarget.remove();
        setStatus(status, 'good', 'The token is removed from this browser.');
      },
    }, 'Forget the token'));
  }

  let accepted = false;
  const finish = () => {
    dlg.close();
    if (then) then();
  };
  check.addEventListener('click', async () => {
    if (accepted) {
      finish();
      return;
    }
    const value = input.value.trim();
    if (!value) {
      setStatus(status, 'bad', 'Paste the token first.');
      input.focus();
      return;
    }
    check.disabled = true;
    setStatus(status, '', 'Checking the token…');
    try {
      const res = await gh(`/repos/${REPO}`, {}, value);
      if (res.status === 404) throw new UserError(`This token cannot see ${REPO}. Give it access to that repository.`);
      if (!res.ok) throw await apiError(res, 'read the repository');
      const access = await probeToken(value);
      if (!access.canWrite) {
        throw new UserError(`This token cannot save notes. It needs “Contents: Read and write” on ${REPO}. `
          + 'Change it on GitHub, or make a new one with the link above.');
      }
      token = value;
      store.set('token', value);
      updateTokenButton();
      if (access.canSync) {
        finish();
        return;
      }
      // Usable, but a Category, Uses or Track change then waits for the 6-hour sync.
      accepted = true;
      setStatus(status, '', 'The token is saved. It cannot start the sync (“Actions: Read and write” is missing), '
        + 'so a change to Category, Uses or Track shows after the next 6-hour sync.');
      check.textContent = 'Continue';
      check.disabled = false;
    } catch (err) {
      setStatus(status, 'bad', err.kind === 'auth' && !/Contents/.test(err.message)
        ? 'GitHub refused this token. Copy it again and paste it here.' : messageFor(err));
      check.disabled = false;
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      check.click();
    }
  });

  const body = h('div', { class: 'sheet-body' },
    h('p', { text: token
      ? 'Editing is set up in this browser. To use a different token, paste it below.'
      : 'To edit notes from this page, give it a GitHub token. The token stays in this browser only.' }),
    h('ol', { class: 'steps' },
      h('li', {}, 'Open ', h('a', { href: NEW_TOKEN_URL, target: '_blank', rel: 'noopener' }, 'a new fine-grained token on GitHub'),
        '. The link fills in the name, a 90-day life and the permissions.'),
      h('li', {}, 'For “Repository access”, choose “Only select repositories” and pick ', h('strong', { text: REPO }), '.'),
      h('li', {}, 'Make sure that ', h('strong', { text: 'Contents' }), ' and ', h('strong', { text: 'Actions' }),
        ' are “Read and write”, and add nothing else. Actions lets this page start the sync after you save.'),
      h('li', { text: 'Generate the token, copy it, and paste it here.' })),
    h('div', { class: 'field' }, h('label', { class: 'label', for: 't-token', text: 'Token' }), input),
    h('p', { class: 'hint', text: 'On an iPhone, add this page to the Home Screen. Safari clears the storage of a site that you do not visit for 7 days.' }),
    readTokenPart());

  sheet(dlg, 'token-title', token ? 'Editing token' : 'Set up editing', body, h('div', { class: 'sheet-foot' }, foot));
  if (!dlg.open) dlg.showModal();
  input.focus();
}
