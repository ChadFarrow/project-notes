#!/usr/bin/env node
// Drives the web dashboard in headless Chrome over the DevTools protocol, with no
// dependencies (modelled on pc20-wiki's scripts/browser-check.mjs).
//
// Locally it serves site/ with a data.json built from the test fixture, and it stands
// in for api.github.com, so the editor runs end to end with no real token and no
// real commit.
//
//   node scripts/check-site.mjs                 every check, against the fixture
//   node scripts/check-site.mjs --data FILE     the board checks with a real data.json
//   node scripts/check-site.mjs --shots DIR     also save screenshots into DIR
//   node scripts/check-site.mjs --host URL      read-only checks against a deployment
//
// Set CHROME to the browser binary when it is not in a usual place.

import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { normalizeRepos, normalizeWatched } from './lib/model.mjs';
import { applyNoteForm, groupTodo } from './lib/notes.mjs';
import { buildOutputs } from './lib/render.mjs';
import { buildSiteFiles } from './lib/site.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 8131;
const CDP_PORT = 9341;
const PROFILE = path.join(tmpdir(), 'project-notes-check-site');
const API = 'https://api.github.com';
const REPO = 'ChadFarrow/project-notes';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
};
const HOST = arg('--host')?.replace(/\/$/, '') ?? null;
const DATA_FILE = arg('--data');
const SHOTS = arg('--shots');
const ORIGIN = HOST ?? `http://localhost:${PORT}`;
const EDITOR_CHECKS = !HOST && !DATA_FILE;

const CHROME = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

// ---------- the fixture site ----------

// The note that the stand-in API serves for app-one. Its header matches the build.
const APP_ONE_NOTE = [
  '# app-one',
  '',
  '**Category:** Apps  ',
  '**Uses:** svc-core, fork-thing  ',
  '**Repo:** https://github.com/ChadFarrow/app-one',
  '',
  '## Description',
  'The main app.',
  '',
  '## Notes',
  '<!-- Add your notes here -->',
  '',
  '## Resources',
  '- Docs: https://example.com',
  '',
  '## TODOs',
  '- [ ] Ship the first release',
  '',
  '<!-- AUTO:START -->',
  '## Live status',
  '<!-- AUTO:END -->',
  '',
].join('\n');

const NOTES = [
  { file: 'app-one.md', text: APP_ONE_NOTE },
  { file: 'svc-core.md', text: '# svc-core\n\n**Category:** Libraries  \n\n## Notes\n' },
  { file: 'hidden-repo.md', text: '# hidden-repo\n\n**Track:** no  \n' },
  { file: 'upstream-fork.md', text: '# upstream-fork\n\n**Track:** upstream  \n**Watch:** upstream/thing  \n' },
];

// The to-do list: a real link, a relative one, a ticked item, and text that must stay text.
const TODO_TEXT = [
  '# To do',
  '',
  '#todo',
  '',
  'Words for whoever edits this file.',
  '',
  '## app-one',
  '',
  '- [ ] Test [PR #7](https://github.com/ChadFarrow/app-one/pull/7) on a phone, in `~/Vibe/app-one`.',
  '- [x] A finished item',
  '- [ ] <img src=x onerror="window.__xss=1"> stays text',
  '- [ ] A [bad link](javascript:window.__xss=1) stays text',
  `- [ ] A long path \`~/Vibe/${'a'.repeat(120)}\` wraps`,
  '- [ ] Before merge: Test PR #8',
  '  - [ ] Phone: On the iPhone',
  '  - [ ] Phone: On the Pixel',
  `  - [ ] Computer: A long sub-item path \`~/Vibe/${'b'.repeat(120)}\` wraps`,
  '- [ ] After merge: Test PR #9',
  '  - [ ] On the iPhone',
  '- [ ] Before merge: PRs #11–#13 and Upstream/thing#4',
  '- [x] Ticked PR #10',
  '  - [ ] Still open under it',
  '',
  'Two older items are in [the app-one note](../projects/app-one.md).',
  '',
  '## Laptop',
  '',
  '- [ ] In development: Delete a folder.',
  '',
].join('\n');

// The folder notes (notes/todo/): a note per repo, headings with group and place words, a plain
// bullet, a callout, a tab-indented test, a ticked test, and HTML in a heading.
const LONG_WORD = 'h'.repeat(90);
const SVC_NOTE = [
  '- [ ] Before merge: Test #5',
  '  - [ ] Phone: On the svc phone',
  '- [ ] Before merge: Test #6',
  '  - [ ] Phone: On the svc phone',
  '- [ ] Same words twice',
  '',
  'Notes are in [the svc note](../../projects/svc-core.md).',
  '',
].join('\n');
const PLAYLIST_NOTE = [
  '# app-one - playlist tests',
  '',
  'Intro for this note, and [the mac note](Mac%20mini.md).',
  '',
  '- A plain bullet with [a guide](https://example.com/guide)',
  '',
  '> [!warning] Beta is real',
  '',
  `## Before merge: Phone: 1. The maker (#8), ${LONG_WORD} a long heading`,
  '- [ ] Test the maker #8',
  '- [ ] Play the whole list',
  '\t- [ ] Tab-indented test',
  '\t- [x] Ticked sibling test',
  '- [ ] Same words twice',
  '- [ ] Same in two sections',
  '',
  '## Already works',
  '',
  '- [x] It publishes',
  '',
  '## Words <img src=x onerror="window.__xss=1"> in a heading',
  '- [ ] An item under the odd heading',
  '',
  '## Second section',
  '- [ ] Same in two sections',
  '',
].join('\n');
const PLAYLIST_TITLE = 'app-one - playlist tests';
const MAC_NOTE = '- [ ] Check the dock, see #3\n';
const TODO_FILES = [
  { path: 'notes/TODO.md', text: TODO_TEXT },
  { path: 'notes/todo/svc-core.md', text: SVC_NOTE },
  { path: 'notes/todo/app-one - playlist tests.md', text: PLAYLIST_NOTE },
  { path: 'notes/todo/Mac mini.md', text: MAC_NOTE },
];

// What fetchWatched would return for that Watch line: a private repo, counts only.
const WATCHED = normalizeWatched({ data: { r0: {
  nameWithOwner: 'Upstream/thing', url: 'https://github.com/Upstream/thing', isPrivate: true, isArchived: false,
  pushedAt: '2026-09-27T08:00:00Z', pullRequests: { totalCount: 0 }, issues: { totalCount: 4 }, mine: { totalCount: 1 },
} } }, ['upstream/thing']);

// The same files sync.mjs --site writes, built by the same function.
async function siteFiles() {
  const sources = new Map();
  for (const name of await readdir(path.join(ROOT, 'site'))) {
    if (!name.startsWith('.')) sources.set(name, await readFile(path.join(ROOT, 'site', name), 'utf8'));
  }
  let siteData;
  if (DATA_FILE) {
    siteData = await readFile(DATA_FILE, 'utf8');
  } else {
    const pages = JSON.parse(await readFile(path.join(ROOT, 'test/fixtures/repos-pages.json'), 'utf8'));
    ({ siteData } = buildOutputs({
      owner: 'ChadFarrow', now: new Date(), repos: normalizeRepos(pages), stars: [], notes: NOTES,
      auditFiles: [], degradedReason: null, watched: WATCHED, todoFiles: TODO_FILES,
    }));
    // A second private project, so that a token which sees only one private repo can be refused.
    const parsed = JSON.parse(siteData);
    parsed.projects.find((p) => p.name === 'svc-core').isPrivate = true;
    siteData = JSON.stringify(parsed);
  }
  const notesSource = await readFile(path.join(ROOT, 'scripts/lib/notes.mjs'), 'utf8');
  const files = new Map();
  for (const [rel, text] of buildSiteFiles({ sources, notesSource, siteData })) files.set(`/${rel}`, Buffer.from(text));
  return files;
}

function serve(files) {
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const body = files.get(pathname === '/' ? '/index.html' : pathname);
    if (!body) return res.writeHead(404).end('not found');
    res.writeHead(200, { 'content-type': TYPES[path.extname(pathname) || '.html'] || 'application/octet-stream' });
    res.end(body);
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

// ---------- the stand-in GitHub API ----------

const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');
const fromB64 = (data) => Buffer.from(data, 'base64').toString('utf8');

const api = {
  notes: new Map(NOTES.map((n, i) => [n.file, { text: n.text, sha: `sha-${i}` }])),
  puts: [],
  dispatches: 0,
  probes: 0,
  conflictOnce: false,
  conflictSameOnce: false,
  revoked: false,
  goodToken: 'good-token',
  nextSha: 100,
  readProbes: 0,
  // The titles the alias query answers, by 'owner/name#N'. `mergedDaysAgo` counts from the run.
  // A repo with no entry answers null plus an `errors` item, as a repo the token cannot see does.
  titles: {
    'ChadFarrow/app-one#8': { type: 'PullRequest', title: 'Fixture title eight', state: 'OPEN', isDraft: true },
    'ChadFarrow/app-one#9': { type: 'PullRequest', title: 'Fixture title nine', state: 'MERGED', mergedDaysAgo: 20 },
    'ChadFarrow/app-one#11': { type: 'PullRequest', title: 'Fixture title eleven', state: 'MERGED', mergedDaysAgo: 5 },
    'ChadFarrow/app-one#12': { type: 'PullRequest', title: `Fixture title twelve ${'w'.repeat(100)}`, state: 'MERGED', mergedDaysAgo: 3 },
    'ChadFarrow/app-one#13': { type: 'PullRequest', title: 'Fixture title thirteen', state: 'CLOSED' },
  },
  titleRequests: 0,
  // The to-do files by path. `api.todo` is notes/TODO.md.
  todoFiles: new Map(TODO_FILES.map((f, i) => [f.path, { text: f.text, sha: `todo-${i}` }])),
  get todo() { return this.todoFiles.get('notes/TODO.md'); },
  todoPuts: [],
  todoConflictOnce: false,
};

// The tokens the stand-in knows, and what each may do. Any other token is refused.
const TOKENS = {
  'good-token': { write: true, sync: true },
  'readonly-token': { write: false, sync: false },
  'nosync-token': { write: true, sync: false },
};
for (const may of Object.values(TOKENS)) Object.assign(may, { issues: false, pulls: false, private: true });
Object.assign(TOKENS, {
  'read-token': { write: false, sync: false, issues: false, pulls: false, private: true },
  'read-few-token': { write: false, sync: false, issues: false, pulls: false, private: true, privateCount: 1 },
  'read-error-token': { write: false, sync: false, issues: false, pulls: false, private: true, graphqlError: true },
  'read-public-token': { write: false, sync: false, issues: false, pulls: false, private: false },
  'read-write-token': { write: true, sync: false, issues: true, pulls: true, private: true },
});
const FORBIDDEN = [403, { message: 'Resource not accessible by personal access token' }];

// → [status, body object or null]
function answer(method, url, auth, body) {
  const u = new URL(url);
  const may = TOKENS[String(auth).replace(/^Bearer /, '')];
  if (!may || api.revoked) return [401, { message: 'Bad credentials' }];
  if (method === 'GET' && u.pathname === `/repos/${REPO}`) return [200, { full_name: REPO }];
  if (method === 'PUT' && u.pathname === `/repos/${REPO}/contents/README.md`) {
    // The page's access probe: a sha that never matches, so nothing is written.
    api.probes++;
    return may.write ? [409, { message: 'README.md does not match' }] : FORBIDDEN;
  }
  const todoPath = /^\/repos\/ChadFarrow\/project-notes\/contents\/(notes\/(?:TODO\.md|todo\/[^/]+))$/.exec(u.pathname);
  if (todoPath) {
    // `path` stays as the page wrote it, so a check can see that the page encoded it.
    const stored = api.todoFiles.get(decodeURIComponent(todoPath[1]));
    if (!stored) return [404, { message: 'Not Found' }];
    if (method === 'GET') return [200, { encoding: 'base64', content: b64(stored.text).replace(/(.{60})/g, '$1\n'), sha: stored.sha }];
    if (method === 'PUT') {
      if (!may.write) return FORBIDDEN;
      const put = JSON.parse(body);
      api.todoPuts.push({ ...put, path: todoPath[1], text: fromB64(put.content) });
      if (api.todoConflictOnce) {
        // Someone else saved the file first.
        api.todoConflictOnce = false;
        stored.text = `${stored.text}\n- [ ] Added in Obsidian\n`;
        stored.sha = `todo-${api.nextSha++}`;
        return [409, { message: 'is at a different sha' }];
      }
      if (put.sha !== stored.sha) return [409, { message: 'sha does not match' }];
      stored.text = fromB64(put.content);
      stored.sha = `todo-${api.nextSha++}`;
      return [200, { content: { sha: stored.sha } }];
    }
  }
  const note =/^\/repos\/ChadFarrow\/project-notes\/contents\/projects\/(.+)$/.exec(u.pathname);
  if (note) {
    const file = decodeURIComponent(note[1]);
    const stored = api.notes.get(file);
    if (!stored) return [404, { message: 'Not Found' }];
    if (method === 'GET') return [200, { encoding: 'base64', content: b64(stored.text).replace(/(.{60})/g, '$1\n'), sha: stored.sha }];
    if (method === 'PUT') {
      if (!may.write) return FORBIDDEN;
      const put = JSON.parse(body);
      api.puts.push({ file, ...put, text: fromB64(put.content) });
      if (api.conflictOnce) {
        // Someone else saved the note first, in another section.
        api.conflictOnce = false;
        stored.text = stored.text.replace('- Docs: https://example.com', '- Docs: https://example.com\n- Added elsewhere');
        stored.sha = `sha-${api.nextSha++}`;
        return [409, { message: 'is at a different sha' }];
      }
      if (api.conflictSameOnce) {
        // Someone else saved the note first, in the section being edited.
        api.conflictSameOnce = false;
        stored.text = stored.text.replace('## Notes\n', '## Notes\nWritten in Obsidian\n');
        stored.sha = `sha-${api.nextSha++}`;
        return [409, { message: 'is at a different sha' }];
      }
      if (put.sha !== stored.sha) return [409, { message: 'sha does not match' }];
      stored.text = fromB64(put.content);
      stored.sha = `sha-${api.nextSha++}`;
      return [200, { content: { sha: stored.sha } }];
    }
  }
  // The read-token probes. They count apart from api.probes: no write, no sync.
  if (method === 'POST' && (u.pathname === `/repos/${REPO}/issues` || u.pathname === `/repos/${REPO}/pulls`)) {
    api.readProbes++;
    const flag = u.pathname.endsWith('/issues') ? may.issues : may.pulls;
    return flag ? [422, { message: 'Validation Failed' }] : FORBIDDEN;
  }
  if (method === 'POST' && u.pathname === '/graphql' && !JSON.parse(body).query.includes('viewer')) {
    // The page's alias query for titles: `rN: repository(owner, name) { nM: issueOrPullRequest(number) … }`.
    api.titleRequests++;
    const data = {};
    const errors = [];
    for (const block of JSON.parse(body).query.split(/(?= r\d+: repository\()/).slice(1)) {
      const [, alias, owner, name] = /(r\d+): repository\(owner: "([^"]+)", name: "([^"]+)"\)/.exec(block);
      const numbers = [...block.matchAll(/(n\d+): issueOrPullRequest\(number: (\d+)\)/g)];
      if (!numbers.some(([, , n]) => api.titles[`${owner}/${name}#${n}`])) {
        data[alias] = null;
        errors.push({ type: 'NOT_FOUND', path: [alias], message: `Could not resolve to a Repository with the name '${owner}/${name}'.` });
        continue;
      }
      data[alias] = {};
      for (const [, numberAlias, n] of numbers) {
        const t = api.titles[`${owner}/${name}#${n}`];
        data[alias][numberAlias] = t && {
          __typename: t.type, title: t.title, state: t.state, isDraft: !!t.isDraft,
          mergedAt: t.mergedDaysAgo === undefined ? null : new Date(Date.now() - t.mergedDaysAgo * 86400000).toISOString(),
        };
      }
    }
    return [200, errors.length ? { data, errors } : { data }];
  }
  if (method === 'POST' && u.pathname === '/graphql') {
    api.readProbes++;
    if (may.graphqlError) return [200, { errors: [{ message: 'Resource limit <b>boom</b>' }] }];
    return [200, { data: { viewer: { repositories: { totalCount: may.private ? (may.privateCount ?? 3) : 0 } } } }];
  }
  if (method === 'POST' && u.pathname === `/repos/${REPO}/actions/workflows/sync-all.yml/dispatches`) {
    if (!may.sync) return FORBIDDEN;
    // The page's access probe names a branch that does not exist: no run starts.
    if (JSON.parse(body).ref !== 'main') {
      api.probes++;
      return [422, { message: 'No ref found' }];
    }
    api.dispatches++;
    return [204, null];
  }
  return [404, { message: 'Not Found' }];
}

const CORS = [
  { name: 'Access-Control-Allow-Origin', value: '*' },
  { name: 'Access-Control-Allow-Methods', value: 'GET, PUT, POST' },
  { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type, Accept, X-GitHub-Api-Version' },
];

async function onApiRequest(send, { requestId, request }) {
  if (request.method === 'OPTIONS') {
    return send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: CORS });
  }
  const header = (name) => Object.entries(request.headers).find(([k]) => k.toLowerCase() === name)?.[1];
  const body = request.postData
    ?? (request.postDataEntries || []).map((e) => Buffer.from(e.bytes || '', 'base64').toString('utf8')).join('');
  const [status, json] = answer(request.method, request.url, header('authorization'), body);
  return send('Fetch.fulfillRequest', {
    requestId,
    responseCode: status,
    responseHeaders: [...CORS, { name: 'Content-Type', value: 'application/json' }],
    body: json ? b64(JSON.stringify(json)) : '',
  });
}

// ---------- Chrome ----------

async function findChrome() {
  for (const candidate of CHROME) {
    try {
      await readFile(candidate);
      return candidate;
    } catch { /* keep looking */ }
  }
  throw new Error(`no Chrome found; looked in:\n  ${CHROME.join('\n  ')}`);
}

// A minimal CDP client: requests with replies, and event listeners.
async function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  const listeners = new Map();
  let id = 0;
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) || []) fn(msg.params);
    }
  });
  await new Promise((resolve) => ws.addEventListener('open', resolve));
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, (msg) => {
      const failure = msg.result?.exceptionDetails || msg.error;
      if (failure) reject(new Error(failure.exception?.description || failure.message || `${method} failed`));
      else resolve(msg.result);
    });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
  return {
    send,
    on: (method, fn) => listeners.set(method, [...(listeners.get(method) || []), fn]),
    close: () => ws.close(),
    evaluate: async (expression) =>
      (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))?.result?.value,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTarget() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const targets = await (await fetch(`http://localhost:${CDP_PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page;
    } catch { /* still starting */ }
    await sleep(250);
  }
  throw new Error('the browser never opened a page');
}

// ---------- the checks ----------

async function main() {
  const chrome = await findChrome();
  const files = HOST ? null : await siteFiles();
  const server = HOST ? null : await serve(files);
  const data = JSON.parse(HOST
    ? await (await fetch(`${HOST}/data.json`, { cache: 'no-store' })).text()
    : files.get('/data.json').toString('utf8'));
  await rm(PROFILE, { recursive: true, force: true });
  if (SHOTS) await mkdir(SHOTS, { recursive: true });

  const browser = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    // No 1.4 GB code-sign copy of Chrome under $TMPDIR/../X/ on macOS. Chrome makes one per
    // start and only CDP Browser.close removes it; the SIGTERM in `finally` leaves it
    // (measured 2026-11-11). Other platforms ignore the name. Chrome keeps only the LAST
    // --disable-features, so add any other feature to this list.
    '--disable-features=MacAppCodeSignClone',
    ...(process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(/\s+/) : []),
    '--window-size=1280,900',
    // notes.test is this machine over plain http: a page that is not a secure context.
    '--host-resolver-rules=MAP notes.test 127.0.0.1', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank',
  ], { stdio: 'ignore' });

  const results = [];
  const check = (name, pass, detail = '') => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  };

  let client;
  try {
    client = await connect((await waitForTarget()).webSocketDebuggerUrl);
    const { send, on } = client;
    // An expression that throws in the page fails its check instead of ending the run.
    const evaluate = (expression) => client.evaluate(expression).catch((err) => {
      console.log(`      (page error: ${err.message.split('\n')[0]})`);
      return undefined;
    });
    const logErrors = [];
    on('Runtime.exceptionThrown', (p) => logErrors.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text));
    on('Log.entryAdded', ({ entry }) => {
      // The stand-in API answers 401 and 409 on purpose; those network lines are expected.
      if (entry.level === 'error' && !(entry.source === 'network' && entry.url?.startsWith(API))) logErrors.push(entry.text);
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__csp = [];
        document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));`,
    });
    if (EDITOR_CHECKS) {
      on('Fetch.requestPaused', (p) => onApiRequest(send, p).catch((err) => console.log(`stand-in API: ${err.message}`)));
      await send('Fetch.enable', { patterns: [{ urlPattern: `${API}/*` }] });
    }

    const go = async (url = `${ORIGIN}/`) => {
      await send('Page.navigate', { url });
      await waitFor('document.readyState === "complete"');
      await waitFor('!!document.querySelector("#content h2") || !!document.querySelector("#content .banner")');
      await sleep(150);
    };
    const waitFor = async (expression, ms = 6000) => {
      for (let waited = 0; waited < ms; waited += 50) {
        if (await evaluate(`!!(${expression})`)) return true;
        await sleep(50);
      }
      return false;
    };
    const js = (value) => JSON.stringify(value);
    // A missing element must fail the checks that follow, not stop the run.
    const click = (selector) => evaluate(`document.querySelector(${js(selector)})?.click()`);
    const fill = (selector, value) => evaluate(`{
      const el = document.querySelector(${js(selector)});
      if (el) {
        el.value = ${js(value)};
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }`);
    const text = (selector) => evaluate(`document.querySelector(${js(selector)})?.textContent ?? null`);
    const count = (selector) => evaluate(`document.querySelectorAll(${js(selector)}).length`);
    // The whole page, or only the viewport (for an open dialog, which covers it).
    const shoot = async (name, { full = true } = {}) => {
      if (!SHOTS) return;
      const metrics = await send('Page.getLayoutMetrics');
      const { data: png } = await send('Page.captureScreenshot', full ? {
        format: 'png', captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: metrics.cssContentSize.width, height: Math.min(metrics.cssContentSize.height, 6000), scale: 1 },
      } : { format: 'png' });
      await writeFile(path.join(SHOTS, `${name}.png`), Buffer.from(png, 'base64'));
    };
    const clearStorage = () => evaluate('localStorage.clear()');
    // Text nodes that are only "null", "undefined" or "NaN": a value that leaked into the page.
    const strayText = async (scope = 'document.body') => (await evaluate(`(() => {
      const walk = document.createTreeWalker(${scope}, NodeFilter.SHOW_TEXT);
      const found = [];
      while (walk.nextNode()) {
        const t = walk.currentNode.textContent.trim();
        if (['null', 'undefined', 'NaN', '[object Object]'].includes(t)) found.push(t);
      }
      return found;
    })()`)) || ['(could not read the page)'];

    const tracked = data.projects.filter((p) => p.track !== 'no');
    // `watch || []`: the live site's data may predate the field (--host).
    const active = tracked.filter((p) => p.prsTotal || p.issuesTotal || p.orphanBranches.length || p.openedElsewhere.length
      || (p.watch || []).some((w) => w.prsTotal || w.issuesTotal));

    // ---- the board ----
    await go();
    await clearStorage();
    await go();
    check('the page loads with no errors', logErrors.length === 0, logErrors.join(' | '));
    check('the security policy blocks nothing', (await evaluate('window.__csp.length')) === 0, await evaluate('window.__csp.join(", ")'));
    check('the summary sentence shows the totals',
      (await text('#summary'))?.includes(`${data.totals.prs} open PR`) && (await text('#summary'))?.includes(`${data.totals.tracked} tracked repo`));
    check('every project with open work has a row', (await count('article.project')) === active.length, `${active.length} rows`);
    const lampsOk = await evaluate(`${js(active.map((p) => [p.name, Math.min(p.prs.length, 12)]))}
      .every(([name, n]) => document.querySelectorAll('article.project[data-project="' + name + '"] .disclose .lamp').length === n)`);
    check('each row has one lamp per PR', lampsOk);
    const strayOnLoad = await strayText();
    check('no stray null or undefined text on the board', strayOnLoad.length === 0, strayOnLoad.join(', '));
    await shoot('board-desktop');

    // `todo || []`: the live site's data may predate the field (--host).
    // What the page shows: a finished line is hidden, so count what `groupTodo` keeps.
    const shownGroups = groupTodo(data.todo || []);
    const todoItems = shownGroups.flatMap((g) => g.items).reduce((n, { top, subs }) => n + (top.type === 'item' ? 1 + subs.length : 0), 0);
    check('the to-do list comes first on the board', (await text('#content h2')) === 'To do');
    check('the to-do list shows every item', (await count('#todo-list .todo-item')) === todoItems, `${todoItems} items`);
    check('every to-do item has a box to mark it done', (await count('#todo-list .todo-item button.todo-box')) === todoItems);

    if (!HOST && !DATA_FILE) {
      check('the to-do list shows the groups in order', js(await evaluate('[...document.querySelectorAll("#todo-list .group-title")].map((t) => t.textContent)'))
        === js(shownGroups.map((g) => `${g.title} (${g.items.length})`))
        && js(shownGroups.slice(0, 3).map((g) => g.title)) === js(['Before merge', 'After merge', 'In development']));
      check('each top item names its repo', await evaluate(`(() => {
        const rows = [...document.querySelectorAll('#todo-list .todo-item')].filter((li) => !li.parentElement.classList.contains('todo-subs'));
        const label = (words) => rows.find((li) => li.querySelector(':scope > .item-title').textContent.includes(words))?.querySelector(':scope > .item-title > .todo-repo')?.textContent;
        return rows.length > 0 && rows.every((li) => li.querySelector(':scope > .item-title > .todo-repo')) && label('Test PR #8') === 'app-one' && label('Delete a folder.') === 'Laptop';
      })()`));
      check('a test shows where to do it', await evaluate(`(() => {
        const mark = (words) => [...document.querySelectorAll('#todo-list .todo-subs .todo-item')].find((li) => li.querySelector(':scope > .item-title').textContent.includes(words))?.querySelector('.todo-place')?.textContent;
        return mark('On the iPhone') === '📱 Phone' && mark('On the Pixel') === '📱 Phone' && mark('A long sub-item path') === '💻 Computer';
      })()`));
      check('#N links to the issue path of the heading repo', await evaluate(`[...document.querySelectorAll('#todo-list a[href="https://github.com/ChadFarrow/app-one/issues/8"]')].some((a) => a.textContent === '#8')`));
      check('a range links both ends', await evaluate(`['11', '13'].every((n) => document.querySelector('#todo-list a[href="https://github.com/ChadFarrow/app-one/issues/' + n + '"]'))`));
      check('owner/repo#N links that repo', await evaluate(`!!document.querySelector('#todo-list a[href="https://github.com/Upstream/thing/issues/4"]')`));
      check('the to-do list leaves out the words for editors', !(await text('#todo-list'))?.includes('Words for whoever edits'));
      check('a line of text in the to-do list shows', (await text('#todo-list'))?.includes('Two older items are in the app-one note.'));
      check('a link in the to-do list goes to its address', await evaluate(`!!document.querySelector('#todo-list a[href="https://github.com/ChadFarrow/app-one/pull/7"]')`));
      check('a relative link in the to-do list goes to the file on GitHub',
        await evaluate(`!!document.querySelector('#todo-list a[href="https://github.com/${REPO}/blob/main/projects/app-one.md"]')`));
      check('a link that is not http(s) stays plain text', await evaluate(`![...document.querySelectorAll('#todo-list a')].some((a) => !a.href.startsWith('https:'))`)
        && (await text('#todo-list'))?.includes('A bad link stays text'));
      check('HTML in the to-do list stays text', await evaluate(`!document.querySelector('#todo-list img') && window.__xss === undefined`)
        && (await text('#todo-list'))?.includes('<img src=x'));
      check('a code span in the to-do list is marked as code', await evaluate(`[...document.querySelectorAll('#todo-list code')].some((c) => c.textContent === '~/Vibe/app-one')`));
      check('a finished line in the to-do list is hidden', !(await text('#todo-list'))?.includes('A finished item'));
      check('a ticked item with an open test stays, struck through', (await text('#todo-list .todo-item.done'))?.includes('Ticked PR #10') && (await count('#todo-list .todo-item.done')) === 1);
      // ---- the folder notes ----
      const rowJs = (words) => `[...document.querySelectorAll('#todo-list .todo-item')].find((li) => li.querySelector(':scope > .item-title').textContent.includes(${js(words)}))`;
      const noteLineJs = (words) => `[...document.querySelectorAll('#todo-list .note-line')].find((p) => p.textContent.includes(${js(words)}))`;
      const PLAYLIST = 'app-one - playlist tests';
      const projectOptions = await evaluate(`[...document.querySelectorAll('#todo-project option')].map((o) => [o.value, o.textContent])`);
      check('each folder note is a project in the filter, named after the file',
        ['svc-core', PLAYLIST, 'Mac mini', 'app-one'].every((name) => projectOptions.some(([value, label]) => value === name && label.startsWith(`${name} (`))), js(projectOptions));
      check('#N in a folder note links that note’s repo, and #3 in Mac mini stays text', await evaluate(`(() => {
        const five = ${rowJs('Test #5')};
        const link = five?.querySelector('a[href="https://github.com/ChadFarrow/svc-core/issues/5"]');
        const mac = ${rowJs('Check the dock')};
        return link?.textContent === '#5' && !!mac && mac.textContent.includes('#3') && !mac.querySelector('a');
      })()`));
      check('a heading shows once, without its words, and its items are in Before merge with the phone mark', await evaluate(`(() => {
        const heads = [...document.querySelectorAll('#todo-list .todo-heading')].filter((p) => p.textContent.includes('The maker (#8)'));
        if (heads.length !== 1) return false;
        let before = heads[0].previousElementSibling;
        while (before && !before.classList.contains('group-title')) before = before.previousElementSibling;
        const list = heads[0].nextElementSibling;
        const maker = ${rowJs('Test the maker #8')};
        return before?.textContent.startsWith('Before merge') && list?.contains(maker) && maker.querySelector('.todo-place')?.dataset.place === 'phone'
          && !/Before merge|Phone:/.test(heads[0].textContent) && heads[0].textContent.startsWith('1. The maker (#8)') && heads[0].tagName === 'P';
      })()`));
      check('the heading above each row belongs to the row’s own file', await evaluate(`(() => {
        const rows = [...document.querySelectorAll('#todo-list .todo-item')].filter((li) => !li.parentElement.classList.contains('todo-subs'));
        let headed = 0;
        for (const li of rows) {
          if (!li.dataset.file) return false;
          let el = li.parentElement.previousElementSibling;
          while (el && !el.classList.contains('todo-heading') && !el.classList.contains('group-title')) el = el.previousElementSibling;
          if (el?.classList.contains('todo-heading')) {
            headed++;
            if (el.dataset.file !== li.dataset.file) return false;
          }
        }
        return rows.length > 0 && headed > 0;
      })()`));
      check('a plain bullet shows as text with no box', await evaluate(`(() => {
        const p = ${noteLineJs('A plain bullet')};
        return !!p && !p.querySelector('button') && !p.closest('.todo-item') && p.querySelector('a')?.getAttribute('href') === 'https://example.com/guide';
      })()`));
      check('a callout shows without its markers', await evaluate(`${noteLineJs('Beta is real')}?.textContent === 'Beta is real'`));
      check('a tab-indented test sits under its item', await evaluate(`(() => {
        const top = ${rowJs('Play the whole list')};
        return [...(top?.querySelectorAll(':scope > .todo-subs > .todo-item') || [])].map((li) => li.textContent.trim()).some((t) => t.includes('Tab-indented test'));
      })()`));
      const listText = (await text('#todo-list')) || '';
      check('a ticked test and the Already works line are hidden', !listText.includes('Ticked sibling test') && !listText.includes('It publishes') && !listText.includes('Already works'));
      check('HTML in a heading stays text', await evaluate(`!document.querySelector('#todo-list img') && window.__xss === undefined
        && [...document.querySelectorAll('#todo-list .todo-heading')].some((p) => p.textContent === 'Words <img src=x onerror="window.__xss=1"> in a heading')`));
      check('a relative link in a folder note resolves against that note', await evaluate(`(() => {
        const links = [...document.querySelectorAll('#todo-list a')].map((a) => a.getAttribute('href'));
        return links.includes('https://github.com/${REPO}/blob/main/projects/svc-core.md') && links.includes('https://github.com/${REPO}/blob/main/notes/todo/Mac%20mini.md');
      })()`));

      const subFacts = await evaluate(`(() => {
        const row = (words) => [...document.querySelectorAll('#todo-list .todo-item')].find((li) => li.querySelector(':scope > .item-title').textContent.includes(words));
        const top = row('Test PR #8');
        const subs = [...top.querySelectorAll(':scope > .todo-subs > .todo-item')];
        const open = row('Still open under it');
        return {
          subs: subs.length,
          boxes: subs.filter((li) => li.querySelector(':scope > button.todo-box')).length,
          indent: subs[0].querySelector('.todo-box').getBoundingClientRect().left - top.querySelector('.todo-box').getBoundingClientRect().left,
          openIsDone: open.classList.contains('done'),
          openLine: getComputedStyle(open.querySelector('.item-title')).textDecorationLine,
          doneLine: getComputedStyle(row('Ticked PR #10').querySelector(':scope > .item-title')).textDecorationLine,
        };
      })()`);
      check('an indented item shows under its item, with its own box', subFacts.subs === 3 && subFacts.boxes === 3, js(subFacts));
      check('a sub-item is indented to the words of its item', subFacts.indent >= 24, js(subFacts));
      check('a ticked top item does not mark its open sub-item done', !subFacts.openIsDone && subFacts.openLine === 'none' && subFacts.doneLine === 'line-through', js(subFacts));
      check('a conflicting PR lights a red lamp', await evaluate(`[...document.querySelectorAll('[data-project="app-one"] .disclose .lamp.bad')].some((l) => l.title.startsWith('#3:'))`));
      check('a running check lights an amber lamp', await evaluate(`!!document.querySelector('[data-project="app-one"] .disclose .lamp.wait[title^="#10:"]')`));
      check('a draft shows a hollow lamp', await evaluate(`!!document.querySelector('[data-project="app-one"] .disclose .lamp.draft[title^="#2:"]')`));
      check('the shared issue title is listed once', (await text('#content'))?.includes('Same title in several repos'));
      const fork = 'article.project[data-project="upstream-fork"]';
      check('a watched repo with open work puts a quiet fork on the board', await evaluate(`!!document.querySelector('${fork}')`));
      check('the row counts name the watched repo',
        (await evaluate(`document.querySelector('${fork} .counts')?.textContent`)) === '4 issues in Upstream/thing');
      await click(`${fork} .disclose`);
      const watchFact = await evaluate(`(() => {
        const span = document.querySelector('${fork} .project-body .watch');
        const link = span && span.querySelector('a');
        return span && { text: span.textContent, href: link && link.getAttribute('href') };
      })()`);
      check('an open row links the watched repo with its counts only',
        watchFact?.href === 'https://github.com/Upstream/thing'
          && watchFact.text === 'Watches Upstream/thing (private · 4 issues · 1 opened by you)', js(watchFact));
      await click(`${fork} .disclose`);
    }

    // ---- filters ----
    const conflicted = active.filter((p) => p.prs.some((pr) => pr.mergeable === 'CONFLICTING')).map((p) => p.name).sort();
    await click('#status-filter input[value="conflict"]');
    await sleep(100);
    const shownConflicts = (await evaluate('[...document.querySelectorAll("article.project")].map((a) => a.dataset.project)')).sort();
    check('the conflict filter shows only projects with a conflict', js(shownConflicts) === js(conflicted), shownConflicts.join(', '));
    check('the conflict filter opens the rows and lists only conflicted PRs',
      await evaluate(`[...document.querySelectorAll('article.project .project-body')].every((b) => !b.hidden
        && [...b.querySelectorAll('.item > .lamp')].every((l) => l.classList.contains('bad')))`));
    const strayFiltered = await strayText();
    check('no stray null or undefined text with a filter on', strayFiltered.length === 0, strayFiltered.join(', '));
    check('the to-do list stays while a filter is on', (await count('#todo-list .todo-item')) === todoItems);
    await go();
    check('the chosen filter is remembered after a reload', await evaluate('document.querySelector(\'#status-filter input[value="conflict"]\').checked'));
    await click('#status-filter input[value="all"]');

    if (!HOST && !DATA_FILE) {
      const repoLabels = () => count('#todo-list .todo-item > .item-title > .todo-repo');
      await fill('#todo-project', 'Laptop');
      check('the project filter shows one project, without repo labels', (await count('#todo-list .todo-item')) === 1
        && (await text('#todo-list'))?.includes('Delete a folder.') && (await repoLabels()) === 0
        && (await text('#todo-project'))?.includes('app-one (') && (await text('#todo-project'))?.includes('Laptop (1)'));
      check('a one-project view still shows the empty groups', js(await evaluate('[...document.querySelectorAll("#todo-list .group-title")].map((t) => t.textContent)'))
        === js(['Before merge (0)', 'After merge (0)', 'In development (1)', 'Not sorted (0)'].filter((t) => !t.startsWith('Not sorted')))
        && (await count('#todo-list .todo-empty')) === 2);
      await fill('#todo-project', 'all');
      await fill('#todo-place', 'phone');
      const phoneFacts = await evaluate(`(() => {
        const top = [...document.querySelectorAll('#todo-list .todo-item')].filter((li) => !li.parentElement.classList.contains('todo-subs'));
        const subs = [...document.querySelectorAll('#todo-list .todo-subs .todo-item')];
        return { top: top.length, subs: subs.length, allPhone: subs.every((li) => li.querySelector('.todo-place')?.dataset.place === 'phone'),
          text: document.querySelector('#todo-list .note-line') !== null };
      })()`);
      const phoneShown = groupTodo(data.todo, { project: 'all', place: 'phone' }).flatMap((g) => g.items);
      const phoneSubs = phoneShown.reduce((n, { subs }) => n + subs.length, 0);
      check('the place filter shows only phone tests', phoneFacts.top === phoneShown.length && phoneFacts.subs === phoneSubs && phoneSubs >= 2 && phoneFacts.allPhone && !phoneFacts.text
        && !(await text('#todo-list'))?.includes('A long sub-item path'), js(phoneFacts));
      await go();
      check('the to-do filters are remembered after a reload', (await evaluate('document.querySelector("#todo-place").value')) === 'phone'
        && (await count('#todo-list .todo-item')) === phoneShown.length + phoneSubs);
      await fill('#todo-place', 'all');
      await evaluate(`localStorage.setItem('pn:todoView', ${js(js({ project: 'gone' }))})`);
      await go();
      check('a stored project that is gone falls back to all', (await evaluate('document.querySelector("#todo-project").value')) === 'all'
        && (await count('#todo-list .todo-item')) === todoItems);
      await evaluate('localStorage.removeItem("pn:todoView")');
      await go();
    }

    const category = data.categories.find((c) => active.some((p) => p.category === c && c !== 'Uncategorized')) || data.categories[0];
    await fill('#category', category);
    await sleep(100);
    const rowsInCategory = active.filter((p) => p.category === category).length;
    check('the category filter shows only that category', (await count('article.project')) === rowsInCategory
      && (await evaluate(`[...document.querySelectorAll('#content h3')].filter((h) => !h.textContent.startsWith('Ready') && !h.textContent.startsWith('Open issues')).every((h) => h.textContent === ${js(category)})`)),
    category);
    await fill('#category', 'all');

    const sample = active.find((p) => p.prs.length) || active[0];
    if (sample) {
      const word = (sample.prs[0]?.title || sample.name).split(/\s+/).find((w) => w.length > 3) || sample.name;
      await fill('#q', word);
      await sleep(100);
      check('search finds a project by a word in a PR title', await evaluate(`!!document.querySelector('article.project[data-project=${js(sample.name)}]')`), word);
      await fill('#q', '');
      await sleep(100);

      const row = `article.project[data-project=${js(sample.name)}]`;
      await click(`${row} .disclose`);
      check('a row opens when you press it', await evaluate(`!document.querySelector('${row} .project-body').hidden`));
      await go();
      check('an open row stays open after a reload', await evaluate(`!document.querySelector('${row} .project-body').hidden`));
    }

    // ---- dark mode ----
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    await sleep(100);
    check('dark mode uses the dark background', (await evaluate('getComputedStyle(document.body).backgroundColor')) === 'rgb(21, 27, 39)');
    await shoot('board-dark');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

    // ---- the editor ----
    if (EDITOR_CHECKS) {
      await clearStorage();
      await go();
      await click('#todo-list .todo-box');
      check('a to-do box without a token asks for one', await waitFor('document.querySelector("#token-dialog").open'));
      check('the to-do sheet waits for the token', !(await evaluate('document.querySelector("#todo-dialog").open')));
      await evaluate('document.querySelector("#token-dialog").close()');
      await click('article.project[data-project="app-one"] .edit-button');
      check('Edit without a token asks for one', await waitFor('document.querySelector("#token-dialog").open'));
      await fill('#t-token', 'wrong-token');
      await click('#token-dialog .sheet-foot .primary');
      check('a refused token gets a clear message', await waitFor('document.querySelector("#token-dialog .sheet-foot .status").textContent.includes("refused")'));
      await shoot('token', { full: false });
      await fill('#t-token', 'readonly-token');
      await click('#token-dialog .sheet-foot .primary');
      check('a token that cannot write is refused at setup',
        await waitFor('document.querySelector("#token-dialog .sheet-foot .status").textContent.includes("cannot save notes")'));
      check('a refused token is not kept', (await evaluate('localStorage.getItem("pn:token")')) === null);
      await fill('#t-token', api.goodToken);
      await click('#token-dialog .sheet-foot .primary');
      check('a good token opens the editor', await waitFor('document.querySelector("#editor").open && document.querySelector("#f-category")'));
      check('the token is kept in this browser', (await evaluate('localStorage.getItem("pn:token")')) === js(api.goodToken));
      check('the access probes start no sync and write nothing', api.probes > 0 && api.dispatches === 0 && api.puts.length === 0);
      check('an untouched editor has no unsaved changes', (await evaluate('document.querySelector("#editor").isDirty()')) === false);

      const options = await evaluate('[...document.querySelectorAll("#f-category option")].map((o) => o.textContent)');
      check('Category offers the categories in use', js(options) === js([...data.categories, 'New category…']), options.join(', '));
      check('Category shows the current value', (await evaluate('document.querySelector("#f-category").value')) === 'Apps');
      check('Uses has the used repo ticked', await evaluate('document.querySelector(\'.uses-list input[value="svc-core"]\').checked'));
      check('Track shows the current choice', await evaluate('document.querySelector(\'input[name="f-track"][value="yes"]\').checked'));
      check('the TODOs section is a checklist', (await count('#editor .todo')) === 1);
      await shoot('editor-desktop', { full: false });

      // Notes text, a ticked TODO and a new one with non-ASCII text.
      await fill('#f-s1', 'First line\nSecond line');
      await click('#editor .todo input[type="checkbox"]');
      await fill('#editor .add-todo input', 'café — ✓');
      await click('#editor .add-todo button');
      await click('#editor .sheet-foot .primary');
      check('Save reports success', await waitFor('document.querySelector("#editor .status").textContent.startsWith("Saved")'));
      const expected = applyNoteForm(APP_ONE_NOTE, {
        sections: {
          'Notes#0': { text: 'First line\nSecond line' },
          'TODOs#0': { todos: [{ done: true, text: 'Ship the first release' }, { done: false, text: 'café — ✓' }] },
        },
      }).text;
      check('the saved bytes are exactly the edited note', api.puts.length === 1 && api.puts[0].text === expected);
      check('the commit message names the project', api.puts[0]?.message === 'Edit the app-one note from the web dashboard');
      check('a text-only edit does not start the sync', api.dispatches === 0);
      check('the form locks after a save', await evaluate('document.querySelector("#editor .editor-fields").disabled'));

      await click('#editor .cancel-button');
      await click('article.project[data-project="app-one"] .edit-button');
      await waitFor('document.querySelector("#editor .todo")');
      check('non-ASCII text survives the round trip', await evaluate('[...document.querySelectorAll("#editor .todo input[type=text]")].some((i) => i.value === "café — ✓")'));

      // A new category that matches an existing one apart from case.
      await fill('#f-category', '\u0000new');
      await fill('#f-new-category', 'libraries ');
      check('a typed category that exists is pointed out', await evaluate('!document.querySelector("#f-new-category + .hint").hidden'));
      await click('#editor .sheet-foot .primary');
      await waitFor('document.querySelector("#editor .status").textContent.startsWith("Saved")');
      check('the category is saved with the existing spelling', api.puts.at(-1)?.text.includes('**Category:** Libraries  \n'));
      check('a header edit keeps the Uses line as it was', api.puts.at(-1)?.text.includes('**Uses:** svc-core, fork-thing  \n'));
      check('a header edit starts the sync', api.dispatches === 1);
      check('the board moves the project at once',
        await evaluate(`(() => { const row = document.querySelector('article.project[data-project="app-one"]');
          let el = row; while (el && el.tagName !== 'H3') el = el.previousElementSibling; return el?.textContent === 'Libraries'; })()`));

      // Someone else saved the note while the editor was open.
      await click('#editor .cancel-button');
      await click('article.project[data-project="app-one"] .edit-button');
      await waitFor('document.querySelector("#f-s1")');
      api.conflictOnce = true;
      const before = api.puts.length;
      await fill('#f-s1', 'Edited after a conflict');
      await click('#editor .sheet-foot .primary');
      await waitFor('document.querySelector("#editor .status").textContent.startsWith("Saved")');
      const final = api.notes.get('app-one.md').text;
      check('a conflict is retried and keeps both edits',
        api.puts.length === before + 2 && final.includes('Edited after a conflict') && final.includes('- Added elsewhere'));

      // Someone else changed the same section: stop, and keep the typed text.
      await click('#editor .cancel-button');
      await click('article.project[data-project="app-one"] .edit-button');
      await waitFor('document.querySelector("#f-s1")');
      api.conflictSameOnce = true;
      const beforeSame = api.puts.length;
      await fill('#f-s1', 'My own notes');
      await click('#editor .sheet-foot .primary');
      check('a conflict in the same section is refused, not overwritten',
        await waitFor('document.querySelector("#editor .status").textContent.includes("changed on GitHub")')
        && api.puts.length === beforeSame + 1
        && api.notes.get('app-one.md').text.includes('Written in Obsidian')
        && !api.notes.get('app-one.md').text.includes('My own notes'));
      check('the refused text stays in the editor', (await evaluate('document.querySelector("#f-s1").value')) === 'My own notes');
      await evaluate('window.confirm = () => true');

      // The token stops working during a save: paste a new one without losing the edit.
      await click('#editor .cancel-button');
      await click('article.project[data-project="app-one"] .edit-button');
      await waitFor('document.querySelector("#f-s1")');
      await fill('#f-s1', 'Kept across a new token');
      api.revoked = true;
      await click('#editor .sheet-foot .primary');
      await waitFor('document.querySelector("#editor .status").textContent.includes("refused")');
      check('a refused save offers a new token in the editor', await evaluate(`[...document.querySelectorAll('#editor .sheet-foot button')]
        .some((b) => !b.hidden && b.textContent === 'Paste a new token')`));
      await evaluate(`[...document.querySelectorAll('#editor .sheet-foot button')].find((b) => b.textContent === 'Paste a new token').click()`);
      check('the token sheet opens over the editor', await waitFor('document.querySelector("#token-dialog").open && document.querySelector("#editor").open'));
      api.revoked = false;
      await fill('#t-token', api.goodToken);
      await click('#token-dialog .sheet-foot .primary');
      await waitFor('!document.querySelector("#token-dialog").open');
      check('the edit is still there after the new token', (await evaluate('document.querySelector("#f-s1").value')) === 'Kept across a new token');
      await click('#editor .sheet-foot .primary');
      check('the save then goes through', await waitFor('document.querySelector("#editor .status").textContent.startsWith("Saved")')
        && api.notes.get('app-one.md').text.includes('Kept across a new token'));

      // A project whose note is not in the repo yet.
      await click('#editor .cancel-button');
      await click('article.project[data-project="fork-thing"] .edit-button');
      check('a missing note says it is not in the repo yet',
        await waitFor('document.querySelector("#editor .hint.bad")?.textContent.includes("not in the repo yet")'));
      const strayEditor = await strayText('document.querySelector("#editor")');
      check('no stray null or undefined text in the editor', strayEditor.length === 0, strayEditor.join(', '));
      await evaluate('document.querySelector("#editor").close()');

      // The token stops working.
      api.revoked = true;
      await click('article.project[data-project="app-one"] .edit-button');
      check('a revoked token says what to do', await waitFor('document.querySelector("#editor .hint.bad")?.textContent.includes("token")'));
      await evaluate('document.querySelector("#editor").close()');
      api.revoked = false;

      // A token without Actions: kept, with a note that the sync waits.
      await click('#token-button');
      await waitFor('document.querySelector("#token-dialog").open');
      await fill('#t-token', 'nosync-token');
      await click('#token-dialog .sheet-foot .primary');
      check('a token without Actions is kept, with a warning',
        await waitFor('document.querySelector("#token-dialog .sheet-foot .status").textContent.includes("cannot start the sync")')
        && (await text('#token-dialog .sheet-foot .primary')) === 'Continue'
        && (await evaluate('localStorage.getItem("pn:token")')) === js('nosync-token'));
      await click('#token-dialog .sheet-foot .primary');
      await evaluate(`localStorage.setItem('pn:token', ${js(js(api.goodToken))})`);

      // ---- the read token ----
      const sideBefore = [api.dispatches, api.puts.length];
      const editingBefore = await evaluate('localStorage.getItem("pn:token")');
      await click('#token-button');
      await waitFor('document.querySelector("#token-dialog").open');
      check('the token sheet has a part for the read token', await evaluate('!!document.querySelector("#token-dialog #read-token-part #t-read-token")'
        + ' && document.querySelector("#read-token-part h3").textContent === "Titles of PRs and issues"'
        + ' && document.querySelector("#read-token-part").textContent.includes("All repositories")'));
      const readStatus = '#read-token-part .status';
      const readGo = '#read-token-part .primary';
      await fill('#t-read-token', 'read-write-token');
      await click(readGo);
      check('a read token that can write is refused',
        await waitFor(`document.querySelector("${readStatus}").textContent.includes("Make a read-only one")`)
        && (await evaluate('localStorage.getItem("pn:readToken")')) === null);
      await fill('#t-read-token', 'read-public-token');
      await click(readGo);
      check('a read token without All repositories is refused',
        await waitFor(`document.querySelector("${readStatus}").textContent.includes("All repositories")`)
        && (await evaluate('localStorage.getItem("pn:readToken")')) === null);
      if (!DATA_FILE) {
        await fill('#t-read-token', 'read-few-token');
        await click(readGo);
        check('a read token that sees fewer private repos than the dashboard has is refused',
          await waitFor(`document.querySelector("${readStatus}").textContent.includes("All repositories")`)
          && (await evaluate('localStorage.getItem("pn:readToken")')) === null);
      }
      await fill('#t-read-token', 'read-error-token');
      await click(readGo);
      check('a GraphQL answer with errors and no data says GitHub could not check, as text',
        await waitFor(`document.querySelector("${readStatus}").textContent === "GitHub could not check this token: Resource limit <b>boom</b>"`)
        && (await evaluate('localStorage.getItem("pn:readToken")')) === null);
      await fill('#t-read-token', 'wrong-token');
      await click(readGo);
      check('a wrong read token is refused by GitHub',
        await waitFor(`document.querySelector("${readStatus}").textContent.includes("GitHub refused this token")`));
      await fill('#t-read-token', 'read-token');
      await click(readGo);
      check('a good read token is kept',
        await waitFor(`document.querySelector("${readStatus}").textContent.includes("is saved")`)
        && (await evaluate('localStorage.getItem("pn:readToken")')) === js('read-token'));
      check('the editing token is untouched by the read token', (await evaluate('localStorage.getItem("pn:token")')) === editingBefore);
      check('the read-token probes start no sync and write nothing', api.readProbes > 0 && api.dispatches === sideBefore[0] && api.puts.length === sideBefore[1]);
      await click('#read-token-part .danger');
      check('the read token can be forgotten',
        await waitFor(`document.querySelector("${readStatus}").textContent.includes("removed")`)
        && (await evaluate('localStorage.getItem("pn:readToken")')) === null
        && (await evaluate('localStorage.getItem("pn:token")')) === editingBefore);
      await evaluate('document.querySelector("#token-dialog").close()');

      // ---- titles and out-of-date marks (the read token is set only for this part) ----
      const row = (words) => `[...document.querySelectorAll('#todo-list .todo-item')].find((li) => li.querySelector(':scope > .item-title').textContent.includes(${js(words)}))`;
      const refLines = (words) => evaluate(`[...(${row(words)}?.querySelectorAll(':scope > .todo-refs > .todo-ref') || [])].map((p) => p.textContent)`);
      const mark = (words) => evaluate(`(() => { const m = ${row(words)}?.querySelector(':scope > .item-title > .todo-mark'); return m ? [m.textContent, m.className] : null; })()`);
      await go();
      const requestsBefore = api.titleRequests;
      check('without a read token there are no title lines', (await count('#todo-list .todo-ref')) === 0 && (await count('#todo-list .todo-mark')) === 0
        && (await count('#todo-list .todo-note')) === 0 && (await count('#todo-list .todo-item')) > 0 && api.titleRequests === requestsBefore);
      await evaluate(`localStorage.setItem('pn:readToken', ${js(js('read-token'))})`);
      await go();
      check('with a read token, each PR shows its title and state', await waitFor(`document.querySelector('#todo-list .todo-ref')`)
        && js(await refLines('Test PR #8')) === js(['#8 Fixture title eight · draft'])
        && js(await refLines('Test PR #9')) === js(['#9 Fixture title nine · merged'])
        && js(await refLines('PRs #11')) === js(['#11 Fixture title eleven · merged', `#12 Fixture title twelve ${'w'.repeat(100)} · merged`, '#13 Fixture title thirteen · closed']),
      js([await refLines('Test PR #8'), await refLines('PRs #11')]));
      check('a PR the token cannot see keeps its link and gets no title',
        await evaluate(`!!document.querySelector('#todo-list a[href="https://github.com/Upstream/thing/issues/4"]')`)
        && !(await evaluate(`[...document.querySelectorAll('#todo-list .todo-ref')].some((p) => p.textContent.includes('Upstream'))`)));
      check('a before-merge line whose PRs all merged or closed is marked',
        js(await mark('PRs #11')) === js(['PRs #11, #12 and #13 are merged or closed: is this still needed?', 'todo-mark wait'])
        && (await mark('Test PR #8')) === null);
      check('an after-merge line shows its age with the warning colour after 14 days',
        js(await mark('Test PR #9')) === js(['merged 20 days ago', 'todo-mark wait']));
      check('a title is text, and the page asks GitHub once for all of them', (await count('#todo-list .todo-ref *')) === 0 && api.titleRequests === requestsBefore + 1);
      const served = await evaluate(`fetch('data.json', { cache: 'no-store' }).then((r) => r.text())`);
      check('no title reaches data.json', typeof served === 'string' && served.length > 0 && !served.includes('Fixture title'));
      api.revoked = true;
      await go();
      check('a refused read token shows one line and the list still works', await waitFor(`document.querySelector('#todo-list .todo-note')`)
        && (await count('#todo-list .todo-note')) === 1 && (await text('#todo-list .todo-note'))?.includes('GitHub refused the read token.')
        && (await count('#todo-list .todo-ref')) === 0 && (await count('#todo-list .todo-box')) > 0);
      await click('#todo-list .todo-note button');
      check('that line offers the token sheet', await waitFor('document.querySelector("#token-dialog").open'));
      await evaluate('document.querySelector("#token-dialog").close()');
      api.revoked = false;
      await evaluate('localStorage.removeItem("pn:readToken")');
      await go();

      // ---- deleting a to-do item ----
      const ownWords = `:scope > .item-title`;
      const tapBox = (words) => evaluate(`[...document.querySelectorAll('#todo-list .todo-item')]
        .find((li) => li.querySelector('${ownWords}').textContent.includes(${js(words)}))?.querySelector('.todo-box')?.click()`);
      const showsItem = (words) => evaluate(`[...document.querySelectorAll('#todo-list .todo-item')].some((li) => li.querySelector('${ownWords}').textContent.includes(${js(words)}))`);
      const subRows = (top) => `[...document.querySelectorAll('#todo-list .todo-item')]
        .find((li) => li.querySelector('${ownWords}').textContent.includes(${js(top)}))
        ?.querySelectorAll(':scope > .todo-subs > .todo-item')`;
      const showsSub = (top, words) => evaluate(`[...(${subRows(top)} || [])].some((li) => li.querySelector('${ownWords}').textContent.includes(${js(words)}))`);
      const tapSub = (top, words) => evaluate(`[...(${subRows(top)} || [])].find((li) => li.querySelector('${ownWords}').textContent.includes(${js(words)}))?.querySelector('.todo-box')?.click()`);
      const sheetOpen = 'document.querySelector("#todo-dialog").open';
      const FOLDER = 'Delete a folder.';
      const withoutFolder = TODO_TEXT.replace(`- [ ] In development: ${FOLDER}\n`, '');

      await go();
      await tapBox(FOLDER);
      check('a to-do box asks first and saves nothing', await waitFor(sheetOpen)
        && (await text('#todo-dialog'))?.includes(FOLDER) && api.todoPuts.length === 0);
      await click('#todo-dialog .cancel-button');
      check('Cancel keeps the item and saves nothing', await waitFor(`!${sheetOpen}`) && (await showsItem(FOLDER)) && api.todoPuts.length === 0);

      // R4: press the box under a place filter, read the count, and cancel. Nothing is deleted.
      await evaluate(`localStorage.setItem('pn:token', ${js(js(api.goodToken))})`);
      await go();
      await fill('#todo-place', 'phone');
      await tapBox('Test PR #8');
      await waitFor(sheetOpen);
      check('deleting an item under a place filter still counts every test under it', (await text('#todo-dialog'))?.includes('its 3 sub-items')
        && (await text('#todo-dialog .primary')) === 'Delete all 4' && api.todoPuts.length === 0);
      await click('#todo-dialog .cancel-button');
      await waitFor(`!${sheetOpen}`);
      await fill('#todo-place', 'all');
      await go();

      const dispatchesBefore = api.dispatches;
      await tapBox(FOLDER);
      await waitFor(sheetOpen);
      await shoot('todo-sheet', { full: false });
      await click('#todo-dialog .primary');
      check('Delete closes the sheet', await waitFor(`!${sheetOpen}`));
      check('the saved bytes are the file without that line', api.todoPuts.length === 1 && api.todoPuts[0].text === withoutFolder && api.todo.text === withoutFolder);
      check('the delete commits to main and names the item', api.todoPuts[0]?.branch === 'main' && api.todoPuts[0]?.message.includes(FOLDER));
      check('the page starts no sync: the push does that', api.dispatches === dispatchesBefore);
      check('the item leaves the page at once', !(await showsItem(FOLDER)));
      check('a group with nothing left stays, and says None.', (await evaluate('[...document.querySelectorAll("#todo-list .group-title")].some((t) => t.textContent === "In development (0)")'))
        && (await text('#todo-list .todo-empty')) === 'None.');
      await go();
      check('the item stays away after a reload, while the data is older than the delete', !(await showsItem(FOLDER)));

      // Data newer than the delete decides again. Here the data still has the line.
      await evaluate(`localStorage.setItem('pn:todoRemoved', JSON.stringify(JSON.parse(localStorage.getItem('pn:todoRemoved')).map((r) => ({ ...r, at: '2000-01-01T00:00:00.000Z' }))))`);
      await go();
      check('newer data ends the memory of a delete', await showsItem(FOLDER));
      check('the memory of an old delete is cleared', (await evaluate('localStorage.getItem("pn:todoRemoved")')) === '[]');

      // The page still shows the line, but the file on GitHub has lost it.
      const putsBefore = api.todoPuts.length;
      await tapBox(FOLDER);
      await waitFor(sheetOpen);
      await click('#todo-dialog .primary');
      check('an item that left the file is not saved again, and the sheet says so',
        await waitFor('document.querySelector("#todo-dialog .status").textContent.includes("not in the file")') && api.todoPuts.length === putsBefore);
      check('that item leaves the page too', !(await showsItem(FOLDER)));
      await click('#todo-dialog .cancel-button');

      // Someone else saved the file while the sheet was open.
      api.todoConflictOnce = true;
      await tapBox('A bad link');
      await waitFor(sheetOpen);
      await click('#todo-dialog .primary');
      check('a conflict is retried and keeps the other edit', await waitFor(`!${sheetOpen}`)
        && api.todo.text.includes('- [ ] Added in Obsidian') && !api.todo.text.includes('A [bad link]'));

      // ---- sub-items: the same words sit under PR #8 and PR #9 ----
      const IPHONE = 'On the iPhone';
      const under9 = '- [ ] After merge: Test PR #9\n  - [ ] On the iPhone\n';
      let puts = api.todoPuts.length;
      await tapSub('Test PR #9', IPHONE);
      await waitFor(sheetOpen);
      check('the sheet of a sub-item names the item it sits under', (await text('#todo-dialog .todo-top'))?.includes('Test PR #9')
        && (await text('#todo-dialog'))?.includes(IPHONE) && api.todoPuts.length === puts);
      await shoot('todo-sheet-sub', { full: false });
      await click('#todo-dialog .primary');
      await waitFor(`!${sheetOpen}`);
      check('a sub-item is deleted from under its own item only', api.todoPuts.length === puts + 1
        && !api.todo.text.includes(under9) && api.todo.text.includes('- [ ] After merge: Test PR #9\n')
        && api.todo.text.includes('- [ ] Before merge: Test PR #8\n  - [ ] Phone: On the iPhone\n'));
      check('the same words under another item stay on the page', (await showsSub('Test PR #8', IPHONE)) && !(await showsSub('Test PR #9', IPHONE)));
      check('the top item stays when its last sub-item goes', await showsItem('Test PR #9'));
      await go();
      check('the sub-item stays away after a reload, and only that one', (await showsSub('Test PR #8', IPHONE)) && !(await showsSub('Test PR #9', IPHONE)));

      puts = api.todoPuts.length;
      await tapBox('Test PR #8');
      await waitFor(sheetOpen);
      check('the sheet of a top item counts its sub-items', (await text('#todo-dialog'))?.includes('its 3 sub-items')
        && (await text('#todo-dialog .primary')) === 'Delete all 4' && api.todoPuts.length === puts);
      await click('#todo-dialog .cancel-button');
      await waitFor(`!${sheetOpen}`);
      check('Cancel keeps the top item and its sub-items', (await showsItem('Test PR #8')) && (await showsSub('Test PR #8', 'On the Pixel')) && api.todoPuts.length === puts);

      // Another machine added a line inside the group, so the group on the page is out of date.
      const beforeOther = api.todo.text;
      api.todo.text = beforeOther.replace('  - [ ] Phone: On the Pixel\n', '  - [ ] Phone: On the Pixel\n  - [ ] New on the other machine\n');
      await tapBox('Test PR #8');
      await waitFor(sheetOpen);
      await click('#todo-dialog .primary');
      check('a group that changed in the file is not deleted', await waitFor('document.querySelector("#todo-dialog .status").textContent.includes("not in the file")')
        && api.todoPuts.length === puts && api.todo.text.includes('New on the other machine'));
      await click('#todo-dialog .cancel-button');
      await waitFor(`!${sheetOpen}`);
      api.todo.text = beforeOther;
      await evaluate(`localStorage.setItem('pn:todoRemoved', JSON.stringify(JSON.parse(localStorage.getItem('pn:todoRemoved')).filter((r) => !r.key.includes('Test PR #8'))))`);
      await go();

      await tapBox('Test PR #8');
      await waitFor(sheetOpen);
      await click('#todo-dialog .primary');
      await waitFor(`!${sheetOpen}`);
      check('a top item is deleted with its sub-items, and the next item stays', api.todoPuts.length === puts + 1
        && !api.todo.text.includes('Test PR #8') && !api.todo.text.includes('On the Pixel') && !api.todo.text.includes('A long sub-item path')
        && api.todo.text.includes('- [ ] After merge: Test PR #9\n'));
      check('the group leaves the page at once', !(await showsItem('Test PR #8')) && !(await evaluate(`document.querySelector('#todo-list').textContent.includes('On the Pixel')`)));
      await go();
      check('the group stays away after a reload', !(await showsItem('Test PR #8')) && !(await evaluate(`document.querySelector('#todo-list').textContent.includes('On the Pixel')`)));

      // ---- the folder notes: each delete goes to its own file ----
      const NOTE = 'notes/todo/app-one - playlist tests.md';
      const SVC = 'notes/todo/svc-core.md';
      const noteText = (file) => api.todoFiles.get(file).text;
      const mainSha = api.todo.sha;
      const mainText = api.todo.text;
      const noteBefore = noteText(NOTE);
      puts = api.todoPuts.length;
      await tapBox('Test the maker #8');
      await waitFor(sheetOpen);
      check('the sheet of a folder note names its file', (await text('#todo-dialog'))?.includes(NOTE) && api.todoPuts.length === puts);
      await click('#todo-dialog .primary');
      await waitFor(`!${sheetOpen}`);
      check('deleting in a folder note PUTs only that file, without that line, and names the file', api.todoPuts.length === puts + 1
        && api.todoPuts[puts].path === 'notes/todo/app-one%20-%20playlist%20tests.md'
        && api.todoPuts[puts].text === noteBefore.replace('- [ ] Test the maker #8\n', '') && noteText(NOTE) === api.todoPuts[puts].text
        && api.todoPuts[puts].message.includes('Test the maker') && api.todoPuts[puts].branch === 'main'
        && api.todo.sha === mainSha && api.todo.text === mainText && noteText(SVC) === SVC_NOTE, `${api.todoPuts[puts]?.path}`);

      // The same sub-test under two items of one note: the second item's goes, the first's stays.
      puts = api.todoPuts.length;
      await tapSub('Test #6', 'On the svc phone');
      await waitFor(sheetOpen);
      await click('#todo-dialog .primary');
      await waitFor(`!${sheetOpen}`);
      const sub = '  - [ ] Phone: On the svc phone\n';
      const svcSecond = SVC_NOTE.lastIndexOf(sub);
      check('a test is deleted only from under its own item', api.todoPuts.length === puts + 1 && api.todoPuts[puts].path === SVC
        && noteText(SVC) === SVC_NOTE.slice(0, svcSecond) + SVC_NOTE.slice(svcSecond + sub.length)
        && (await showsSub('Test #5', 'On the svc phone')) && !(await showsSub('Test #6', 'On the svc phone')));

      // The same words in two notes: the one in svc-core goes, the one in the playlist note stays, also after a reload.
      const twice = () => evaluate(`[...document.querySelectorAll('#todo-list .todo-item')].filter((li) => li.querySelector(':scope > .item-title').textContent.includes('Same words twice'))
        .map((li) => li.querySelector(':scope > .item-title > .todo-repo')?.textContent).sort()`);
      puts = api.todoPuts.length;
      check('both lines of the same words show, one per note', js(await twice()) === js([PLAYLIST_TITLE, 'svc-core']));
      await fill('#todo-project', 'svc-core');
      await tapBox('Same words twice');
      await waitFor(sheetOpen);
      await click('#todo-dialog .primary');
      await waitFor(`!${sheetOpen}`);
      await fill('#todo-project', 'all');
      const leftAfterDelete = js(await twice());
      await go();
      check('the same words in two notes: deleting one leaves the other, also after a reload', api.todoPuts.length === puts + 1
        && !noteText(SVC).includes('Same words twice') && noteText(NOTE).includes('- [ ] Same words twice\n')
        && leftAfterDelete === js([PLAYLIST_TITLE]) && js(await twice()) === js([PLAYLIST_TITLE]));

      // The same words under two headings of one note: the second one goes.
      const SAME = '- [ ] Same in two sections\n';
      const sameRows = () => evaluate(`[...document.querySelectorAll('#todo-list .todo-item')].filter((li) => li.querySelector(':scope > .item-title').textContent.includes('Same in two sections')).length`);
      const noteNow = noteText(NOTE);
      const firstAt = noteNow.indexOf(SAME);
      const secondAt = noteNow.indexOf(SAME, firstAt + 1);
      puts = api.todoPuts.length;
      check('both lines under two headings show', (await sameRows()) === 2 && firstAt >= 0 && secondAt > firstAt);
      await evaluate(`[...document.querySelectorAll('#todo-list .todo-item')].filter((li) => li.querySelector(':scope > .item-title').textContent.includes('Same in two sections'))[1].querySelector('.todo-box').click()`);
      await waitFor(sheetOpen);
      await click('#todo-dialog .primary');
      await waitFor(`!${sheetOpen}`);
      const keptFirst = noteNow.slice(0, secondAt) + noteNow.slice(secondAt + SAME.length);
      check('the same words under two headings of one note: deleting the second leaves the first', api.todoPuts.length === puts + 1
        && api.todoPuts[puts].text === keptFirst && noteText(NOTE) === keptFirst && (await sameRows()) === 1);
      await go();
      check('the first of the two stays after a reload', (await sameRows()) === 1);

      // A note was deleted in Obsidian, and the page is older than that.
      const MAC_PATH = 'notes/todo/Mac mini.md';
      const macFile = api.todoFiles.get(MAC_PATH);
      api.todoFiles.delete(MAC_PATH);
      puts = api.todoPuts.length;
      await tapBox('Check the dock');
      await waitFor(sheetOpen);
      await click('#todo-dialog .primary');
      check('a note deleted in Obsidian says the line is not in the file, with no HTTP message',
        await waitFor('document.querySelector("#todo-dialog .status").textContent.includes("not in the file")')
        && !(await text('#todo-dialog .status'))?.includes('404') && api.todoPuts.length === puts && !(await showsItem('Check the dock')));
      await click('#todo-dialog .cancel-button');
      api.todoFiles.set(MAC_PATH, macFile);
      await evaluate(`localStorage.removeItem('pn:todoRemoved')`);
      await go();

      // The token stops working.
      api.revoked = true;
      await tapBox('PR #7');
      await waitFor(sheetOpen);
      await click('#todo-dialog .primary');
      check('a revoked token says what to do and offers a new one', await waitFor('document.querySelector("#todo-dialog .status").textContent.includes("token")')
        && await evaluate(`[...document.querySelectorAll('#todo-dialog .sheet-foot button')].some((b) => b.textContent === 'Paste a new token' && !b.hidden)`));
      check('the item stays when the save fails', await showsItem('PR #7'));
      api.revoked = false;
      await click('#todo-dialog .cancel-button');

      // A token that may read but not write.
      await evaluate(`localStorage.setItem('pn:token', ${js(js('readonly-token'))})`);
      await go();
      await tapBox('PR #7');
      await waitFor(sheetOpen);
      await click('#todo-dialog .primary');
      check('a token that cannot write says so', await waitFor('document.querySelector("#todo-dialog .status").textContent.includes("Contents")'));
      await click('#todo-dialog .cancel-button');
      await evaluate(`localStorage.setItem('pn:token', ${js(js(api.goodToken))})`);
      await go();

      await tapBox('<img src=x');
      await waitFor(sheetOpen);
      check('HTML in the to-do sheet stays text', await evaluate('!document.querySelector("#todo-dialog img") && window.__xss === undefined')
        && (await text('#todo-dialog'))?.includes('<img src=x'));
      const strayTodo = await strayText('document.querySelector("#todo-dialog")');
      check('no stray null or undefined text in the to-do sheet', strayTodo.length === 0, strayTodo.join(', '));
      await click('#todo-dialog .cancel-button');
    }

    // ---- plain http: no token is taken ----
    if (!HOST) {
      await go(`http://notes.test:${PORT}/`);
      await click('#token-button');
      check('over plain http the page refuses to take a token',
        await waitFor('document.querySelector("#token-dialog").open && !document.querySelector("#t-token")'
          + ' && document.querySelector("#token-dialog").textContent.includes("secure connection")'));
      await evaluate('document.querySelector("#token-dialog").close()');
    }

    // ---- the phone ----
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await go();
    // The delete checks hid items. Show the whole list, so the long sub-item is measured too.
    await evaluate(`localStorage.removeItem('pn:todoRemoved')`);
    // With a read token, so the title lines (one has a 100-letter word) are measured too.
    if (EDITOR_CHECKS) await evaluate(`localStorage.setItem('pn:readToken', ${js(js('read-token'))})`);
    await go();
    if (EDITOR_CHECKS) await waitFor(`document.querySelector('#todo-list .todo-ref')`);
    const overflow =() => evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    check('the phone layout has no sideways scroll', (await overflow()) <= 0, `${await overflow()}px`);
    const todoOverflow = await evaluate('(() => { const l = document.querySelector("#todo-list"); return l ? l.scrollWidth - l.clientWidth : 1; })()');
    check('the to-do list fits the phone width', todoOverflow <= 0, `${todoOverflow}px`);
    const subBox = await evaluate(`(() => { const b = document.querySelector('#todo-list .todo-subs .todo-box'); if (!b) return null; const r = b.getBoundingClientRect(); return [r.width, r.height]; })()`);
    if (!HOST && !DATA_FILE) {
      check('a sub-item box is at least 24 by 24 px on the phone', subBox && subBox[0] >= 24 && subBox[1] >= 24, js(subBox));
      const longSubRight = await evaluate(`(() => { const c = document.querySelector('#todo-list .todo-subs code'); return c ? c.closest('.todo-item').getBoundingClientRect().right : null; })()`);
      check('a long sub-item wraps inside the phone width', longSubRight !== null && longSubRight <= 390, js(longSubRight));
      const wide = await evaluate(`(() => {
        const heads = [...document.querySelectorAll('#todo-list .todo-heading')];
        const labels = [...document.querySelectorAll('#todo-list .todo-repo')].filter((el) => el.textContent.includes('playlist tests'));
        const right = (els) => Math.max(...els.map((el) => el.getBoundingClientRect().right));
        return { heads: heads.length, labels: labels.length, headRight: right(heads), labelRight: right(labels),
          longHead: heads.some((el) => el.textContent.includes(${js(LONG_WORD)})) };
      })()`);
      check('a long heading and a long note label wrap within 390 px', wide.heads > 0 && wide.longHead && wide.labels > 0 && wide.headRight <= 390 && wide.labelRight <= 390, js(wide));
    }
    if (EDITOR_CHECKS) {
      const refRight = await evaluate(`Math.max(...[...document.querySelectorAll('#todo-list .todo-ref, #todo-list .todo-mark')].map((p) => p.getBoundingClientRect().right))`);
      check('long title lines and marks wrap inside the phone width', (await count('#todo-list .todo-ref')) >= 4 && refRight <= 390, js(refRight));
    }
    await evaluate(`for (const b of document.querySelectorAll(".disclose[aria-expanded=false]")) b.click();
      for (const d of document.querySelectorAll("details")) d.open = true;`);
    await sleep(150);
    check('the phone layout has no sideways scroll with every row open', (await overflow()) <= 0, `${await overflow()}px`);
    const smallTargets = () => evaluate(`[...document.querySelectorAll('button, select, input[type=search], input[type=text], input[type=password], textarea, summary, .chip > span, label.check, label.radio')]
      .filter((el) => el.getClientRects().length && !el.closest('[hidden]'))
      .map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), (el.getAttribute('aria-label') || el.textContent || el.className).trim().slice(0, 30)]; })
      .filter(([w, hgt]) => w < 24 || hgt < 24)`);
    const small = await smallTargets();
    check('every control on the board is at least 24 by 24 px', small.length === 0, small.map((s) => s.join(' ')).join(' | '));
    await shoot('board-mobile');
    await evaluate('for (const b of document.querySelectorAll(".disclose[aria-expanded=true]")) b.click()');

    if (EDITOR_CHECKS) {
      await click('article.project[data-project="app-one"] .edit-button');
      await waitFor('document.querySelector("#f-category")');
      const dialogOverflow = await evaluate('(() => { const d = document.querySelector("#editor .sheet-body"); return d.scrollWidth - d.clientWidth; })()');
      check('the editor fits the phone width', dialogOverflow <= 0, `${dialogOverflow}px`);
      const smallInEditor = await smallTargets();
      check('every control in the editor is at least 24 by 24 px', smallInEditor.length === 0, smallInEditor.map((s) => s.join(' ')).join(' | '));
      await shoot('editor-mobile', { full: false });
      await evaluate('document.querySelector("#editor").close()');

      await click('#todo-list .todo-box');
      await waitFor('document.querySelector("#todo-dialog").open');
      const todoSheetOverflow = await evaluate('(() => { const d = document.querySelector("#todo-dialog .sheet-body"); return d.scrollWidth - d.clientWidth; })()');
      check('the to-do sheet fits the phone width', todoSheetOverflow <= 0, `${todoSheetOverflow}px`);
      const smallInTodo = await smallTargets();
      check('every control in the to-do sheet is at least 24 by 24 px', smallInTodo.length === 0, smallInTodo.map((s) => s.join(' ')).join(' | '));
      await shoot('todo-sheet-mobile', { full: false });
      await click('#todo-dialog .cancel-button');

      await click('#token-button');
      await waitFor('document.querySelector("#token-dialog").open');
      const tokenSheetOverflow = await evaluate('(() => { const d = document.querySelector("#token-dialog .sheet-body"); return d.scrollWidth - d.clientWidth; })()');
      check('the token sheet fits the phone width', tokenSheetOverflow <= 0, `${tokenSheetOverflow}px`);
      const smallInToken = await smallTargets();
      check('every control in the token sheet is at least 24 by 24 px', smallInToken.length === 0, smallInToken.map((s) => s.join(' ')).join(' | '));
      await shoot('token-sheet-mobile', { full: false });
      await evaluate('document.querySelector("#token-dialog").close()');
    }
    await send('Emulation.clearDeviceMetricsOverride');
    if (EDITOR_CHECKS) await evaluate('localStorage.removeItem("pn:readToken")');

    check('no errors during the whole run', logErrors.length === 0, logErrors.join(' | '));
    check('the security policy blocked nothing during the whole run', (await evaluate('window.__csp.length')) === 0);
  } finally {
    client?.close();
    browser.kill();
    server?.close();
  }

  const failed = results.filter((pass) => !pass).length;
  console.log(`\n${results.length - failed} of ${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
