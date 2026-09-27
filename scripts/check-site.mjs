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
import { normalizeRepos } from './lib/model.mjs';
import { applyNoteForm } from './lib/notes.mjs';
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
  { file: 'upstream-fork.md', text: '# upstream-fork\n\n**Track:** upstream  \n' },
];

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
      auditFiles: [], degradedReason: null,
    }));
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
};

// The tokens the stand-in knows, and what each may do. Any other token is refused.
const TOKENS = {
  'good-token': { write: true, sync: true },
  'readonly-token': { write: false, sync: false },
  'nosync-token': { write: true, sync: false },
};
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
  const note = /^\/repos\/ChadFarrow\/project-notes\/contents\/projects\/(.+)$/.exec(u.pathname);
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
    const active = tracked.filter((p) => p.prsTotal || p.issuesTotal || p.orphanBranches.length || p.openedElsewhere.length);

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

    if (!HOST && !DATA_FILE) {
      check('a conflicting PR lights a red lamp', await evaluate(`[...document.querySelectorAll('[data-project="app-one"] .disclose .lamp.bad')].some((l) => l.title.startsWith('#3:'))`));
      check('a running check lights an amber lamp', await evaluate(`!!document.querySelector('[data-project="app-one"] .disclose .lamp.wait[title^="#10:"]')`));
      check('a draft shows a hollow lamp', await evaluate(`!!document.querySelector('[data-project="app-one"] .disclose .lamp.draft[title^="#2:"]')`));
      check('the shared issue title is listed once', (await text('#content'))?.includes('Same title in several repos'));
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
    await go();
    check('the chosen filter is remembered after a reload', await evaluate('document.querySelector(\'#status-filter input[value="conflict"]\').checked'));
    await click('#status-filter input[value="all"]');

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
      await click('article.project[data-project="app-one"] .edit-button');
      check('Edit without a token asks for one', await waitFor('document.querySelector("#token-dialog").open'));
      await fill('#t-token', 'wrong-token');
      await click('#token-dialog .primary');
      check('a refused token gets a clear message', await waitFor('document.querySelector("#token-dialog .status").textContent.includes("refused")'));
      await shoot('token', { full: false });
      await fill('#t-token', 'readonly-token');
      await click('#token-dialog .primary');
      check('a token that cannot write is refused at setup',
        await waitFor('document.querySelector("#token-dialog .status").textContent.includes("cannot save notes")'));
      check('a refused token is not kept', (await evaluate('localStorage.getItem("pn:token")')) === null);
      await fill('#t-token', api.goodToken);
      await click('#token-dialog .primary');
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
      await click('#token-dialog .primary');
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
      await click('#token-dialog .primary');
      check('a token without Actions is kept, with a warning',
        await waitFor('document.querySelector("#token-dialog .status").textContent.includes("cannot start the sync")')
        && (await text('#token-dialog .primary')) === 'Continue'
        && (await evaluate('localStorage.getItem("pn:token")')) === js('nosync-token'));
      await click('#token-dialog .primary');
      await evaluate(`localStorage.setItem('pn:token', ${js(js(api.goodToken))})`);
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
    const overflow = () => evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    check('the phone layout has no sideways scroll', (await overflow()) <= 0, `${await overflow()}px`);
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
    }
    await send('Emulation.clearDeviceMetricsOverride');

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
