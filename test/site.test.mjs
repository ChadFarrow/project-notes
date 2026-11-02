import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeRepos, normalizeWatched } from '../scripts/lib/model.mjs';
import { removeTodoItem } from '../scripts/lib/notes.mjs';
import { buildOutputs } from '../scripts/lib/render.mjs';
import { buildSiteFiles, parseTodoList, siteDirProblem } from '../scripts/lib/site.mjs';

const pages = JSON.parse(readFileSync(new URL('./fixtures/repos-pages.json', import.meta.url)));
const NOW = new Date('2026-09-27T12:00:00Z');

const NOTES = [
  { file: 'app-one.md', text: '# app-one\n\n**Category:** Apps  \n**Uses:** svc-core  \n\n## Notes\nMine.\n' },
  { file: 'svc-core.md', text: '# svc-core\n\n**Category:** Libraries  \n\n## Notes\n' },
  { file: 'hidden-repo.md', text: '# hidden-repo\n\n**Track:** no  \n' },
  { file: 'upstream-fork.md', text: '# upstream-fork\n\n**Track:** upstream  \n**Watch:** upstream/thing  \n' },
];
const WATCHED = normalizeWatched({ data: { r0: {
  nameWithOwner: 'Upstream/thing', url: 'https://github.com/Upstream/thing', isPrivate: true, isArchived: false,
  pushedAt: '2026-09-27T08:00:00Z', pullRequests: { totalCount: 0 }, issues: { totalCount: 4 }, mine: { totalCount: 1 },
} } }, ['upstream/thing']);

const TODO_TEXT = [
  '# To do',
  '',
  '#todo',
  '',
  'Words for whoever edits this file.',
  '',
  '## app-one',
  '',
  '- [ ] Test [PR #7](https://example.com/only-in-the-todo-file) on a phone.',
  '',
  'More in [the note](../projects/app-one.md).',
  '',
].join('\n');

function run(degradedReason = null) {
  const out = buildOutputs({
    owner: 'ChadFarrow', now: NOW, repos: normalizeRepos(pages), stars: [], notes: NOTES,
    auditFiles: [], degradedReason, watched: WATCHED, todoText: TODO_TEXT,
  });
  return { ...out, data: JSON.parse(out.siteData) };
}
const project = (data, name) => data.projects.find((p) => p.name === name);
const hasWork = (p) => p.prsTotal || p.issuesTotal || p.orphanBranches.length || p.openedElsewhere.length
  || p.watch.some((w) => w.prsTotal || w.issuesTotal);

test('site data carries the version, the times and the thresholds', () => {
  const { data } = run();
  assert.equal(data.version, 1);
  assert.equal(data.owner, 'ChadFarrow');
  assert.equal(data.generatedAt, '2026-09-27 12:00 UTC');
  assert.equal(data.generatedAtIso, '2026-09-27T12:00:00.000Z');
  assert.deepEqual(data.thresholds, { idleDays: 7, staleDays: 180 });
  assert.equal(data.degradedReason, null);
});

test('site data totals match the dashboard summary line', () => {
  const { data, files } = run();
  const summary = files.get('LATEST.md').split('\n')[2];
  const t = data.totals;
  assert.ok(summary.startsWith(`${t.prs} open PR`), summary);
  assert.ok(summary.includes(` · ${t.issues} open issue`), summary);
  assert.ok(summary.includes(` · ${t.orphanBranches} branch`), summary);
  assert.ok(summary.includes(` · ${t.tracked} tracked repo`), summary);
  assert.ok(summary.includes(`(${t.untracked} not tracked)`), summary);
});

test('site data lists the categories in use in index order, and every repo name', () => {
  const { data, files } = run();
  const headings = files.get('INDEX.md').split('\n').filter((l) => l.startsWith('## ') && l !== '## Reference');
  assert.deepEqual(data.categories, headings.map((h) => h.slice(3)));
  assert.deepEqual(data.repos, ['app-one', 'fork-thing', 'hidden-repo', 'secret-repo', 'svc-core', 'upstream-fork']);
});

test('site data orders projects with open work like the dashboard', () => {
  const { data, files } = run();
  const inDashboard = files.get('LATEST.md').split('\n')
    .filter((l) => l.startsWith('#### ')).map((l) => /\[([^\]]+)\]/.exec(l)[1]);
  const active = data.projects.filter((p) => p.track !== 'no' && hasWork(p));
  const grouped = data.categories.flatMap((c) => active.filter((p) => p.category === c).map((p) => p.name));
  assert.deepEqual(grouped, inDashboard);
});

test('site data keeps the PR state the badges need', () => {
  const { data } = run();
  const pr = project(data, 'app-one').prs[0];
  for (const key of ['number', 'title', 'url', 'isDraft', 'createdAt', 'mergeable', 'checks', 'author', 'for']) {
    assert.ok(key in pr, key);
  }
});

test('site data leaves out update times, which no markdown file publishes', () => {
  const { siteData } = run();
  assert.doesNotMatch(siteData, /updatedAt|lastActivity/);
});

test('site data points to the note file, including a stub made in the same run', () => {
  const { data } = run();
  assert.equal(project(data, 'app-one').noteFile, 'app-one.md');
  assert.equal(project(data, 'secret-repo').noteFile, 'secret-repo.md');
});

test('site data lists ready-but-idle PRs, stale repos and shared issues in dashboard order', () => {
  const { data, files } = run();
  const latest = files.get('LATEST.md');
  for (const r of data.readyIdle) assert.ok(latest.includes(`**${r.repo}** [#${r.number} `), `${r.repo} #${r.number}`);
  assert.deepEqual(data.stale.map((s) => s.repo),
    [...latest.split('## Stale')[1].matchAll(/^- \[([^\]]+)\]/gm)].map((m) => m[1]));
  assert.equal(data.issues.shared[0].title, 'Bump nostr-tools');
  assert.deepEqual(data.issues.shared[0].items.map((i) => i.repo), ['app-one', 'svc-core']);
  assert.equal(data.issues.total, Number(/### Open issues \((\d+)\)/.exec(latest)[1]));
});

test('site data carries a watched repo as its link and counts, nothing more', () => {
  const { data } = run();
  assert.deepEqual(project(data, 'upstream-fork').watch, [{
    repo: 'Upstream/thing', url: 'https://github.com/Upstream/thing', isPrivate: true,
    prsTotal: 0, issuesTotal: 4, issuesMine: 1,
  }]);
  assert.deepEqual(project(data, 'app-one').watch, []);
  assert.ok(hasWork(project(data, 'upstream-fork')));
});

test('site data shows an untracked project with the index facts only', () => {
  const { data } = run();
  assert.deepEqual(Object.keys(project(data, 'hidden-repo')).sort(), [
    'category', 'description', 'isFork', 'isPrivate', 'language', 'name', 'noteFile', 'parent', 'track', 'url',
  ]);
});

test('site data never carries bodies, marker sources or untracked work', () => {
  const { siteData } = run();
  assert.doesNotMatch(siteData, /forTargets|"body"/);
  assert.doesNotMatch(siteData, /hidden-repo\/(issues|pull)/);
});

test('every URL in the site data is already public in the markdown of the repo', () => {
  const { siteData, files } = run();
  const markdown = [...files.values(), TODO_TEXT].join('\n');
  const urls = [...siteData.matchAll(/"(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(urls.length > 10);
  for (const url of urls) assert.ok(markdown.includes(url), url);
});

test('site data carries the degraded reason and the problems', () => {
  const { data, problems } = run('AUDIT_TOKEN was rejected');
  assert.equal(data.degradedReason, 'AUDIT_TOKEN was rejected');
  assert.deepEqual(data.problems, problems);
});

test('buildOutputs does not put the site data in the repo', () => {
  const { files } = run();
  assert.ok(![...files.keys()].some((f) => f.endsWith('.json')));
});

test('buildSiteFiles stamps one build id into every file and adds the data and the note library', () => {
  const sources = new Map([
    ['index.html', '<script src="app.js?v=__BUILD__"></script>'],
    ['app.js', "import { x } from './lib/notes.js?v=__BUILD__';"],
    ['style.css', 'body {}'],
  ]);
  const files = buildSiteFiles({ sources, notesSource: 'export const x = 1;', siteData: '{}\n' });
  assert.deepEqual([...files.keys()].sort(), ['app.js', 'data.json', 'index.html', 'lib/notes.js', 'style.css']);
  const id = /v=([0-9a-f]{12})"/.exec(files.get('index.html'))?.[1];
  assert.ok(id, files.get('index.html'));
  assert.equal(files.get('app.js'), `import { x } from './lib/notes.js?v=${id}';`);
  assert.equal(files.get('lib/notes.js'), 'export const x = 1;');
  assert.equal(files.get('data.json'), '{}\n');
  const changed = buildSiteFiles({ sources, notesSource: 'export const x = 2;', siteData: '{}\n' });
  assert.notEqual(changed.get('index.html'), files.get('index.html'), 'a new note library gets a new build id');
});

test('siteDirProblem allows only _site inside the repo, and nothing above it', () => {
  const root = '/work/project-notes';
  for (const dir of ['/work/project-notes', '/work', '/', '/work/project-notes/site', '/work/project-notes/site/lib',
    '/work/project-notes/projects', '/work/project-notes/--dry-run']) {
    assert.match(siteDirProblem(root, dir), /--site/, dir);
  }
  for (const dir of ['/work/project-notes/_site', '/work/project-notes/_site/x', '/tmp/runner/site', '/work/project-notes-site']) {
    assert.equal(siteDirProblem(root, dir), null, dir);
  }
});

test('the to-do list keeps the sections and items, and leaves out the words above the first heading', () => {
  assert.deepEqual(parseTodoList('# To do\n\n#todo\n\nWords for editors.\n\n## One\n\n- [ ] First\n- [ ] Second\n\n## Two\n\n- [ ] Third\n'), [
    { title: 'One', entries: [
      { type: 'item', done: false, lines: ['- [ ] First'], parts: [{ text: 'First' }] },
      { type: 'item', done: false, lines: ['- [ ] Second'], parts: [{ text: 'Second' }] },
    ] },
    { title: 'Two', entries: [{ type: 'item', done: false, lines: ['- [ ] Third'], parts: [{ text: 'Third' }] }] },
  ]);
});

test('the to-do list keeps an item above the first heading, so it never goes missing', () => {
  assert.deepEqual(parseTodoList('# To do\n\nWords.\n\n- [ ] Added on the phone\n\n## One\n\n- [ ] First\n'), [
    { title: '', entries: [{ type: 'item', done: false, lines: ['- [ ] Added on the phone'], parts: [{ text: 'Added on the phone' }] }] },
    { title: 'One', entries: [{ type: 'item', done: false, lines: ['- [ ] First'], parts: [{ text: 'First' }] }] },
  ]);
});

test('the to-do list marks a ticked item as done and takes a plain bullet as an open item', () => {
  const [{ entries }] = parseTodoList('## One\n- [x] Ticked\n- [X] Also ticked\n- [ ] Open\n* Plain\n');
  assert.deepEqual(entries.map((e) => [e.done, e.parts[0].text]), [
    [true, 'Ticked'], [true, 'Also ticked'], [false, 'Open'], [false, 'Plain'],
  ]);
});

test('the to-do list splits links from the text and keeps a relative link as written', () => {
  const [{ entries }] = parseTodoList('## One\n- [ ] Test [PR #7](https://example.com/7) in `~/x`, see [note](../projects/a.md).\n');
  assert.deepEqual(entries[0].parts, [
    { text: 'Test ' },
    { text: 'PR #7', href: 'https://example.com/7' },
    { text: ' in `~/x`, see ' },
    { text: 'note', href: '../projects/a.md' },
    { text: '.' },
  ]);
});

test('the to-do list keeps a line of text in a section', () => {
  const [{ entries }] = parseTodoList('## One\n\nFive more in [the note](../a.md).\n');
  assert.deepEqual(entries, [{ type: 'text', parts: [{ text: 'Five more in ' }, { text: 'the note', href: '../a.md' }, { text: '.' }] }]);
});

test('the to-do list joins a wrapped line to the item or text above it', () => {
  const [{ entries }] = parseTodoList('## One\n- [ ] Starts here\n  and goes on\n\nA line\nof text\n');
  assert.deepEqual(entries.map((e) => e.parts[0].text), ['Starts here and goes on', 'A line of text']);
});

test('the to-do list reads Windows line endings, and takes an indented item as an item', () => {
  const [{ entries }] = parseTodoList('## One\r\n- [ ] First\r\n  - [ ] Inner\r\n');
  assert.deepEqual(entries.map((e) => [e.type, e.parts[0].text]), [['item', 'First'], ['item', 'Inner']]);
});

test('the to-do list drops an empty item and a heading with nothing under it', () => {
  assert.deepEqual(parseTodoList('## Empty\n\n## One\n- [ ]\n-\n- [ ] Real\n'), [
    { title: 'One', entries: [{ type: 'item', done: false, lines: ['- [ ] Real'], parts: [{ text: 'Real' }] }] },
  ]);
});

test('the to-do list is empty when the file is empty or missing', () => {
  assert.deepEqual(parseTodoList(''), []);
  assert.deepEqual(parseTodoList(null), []);
  assert.deepEqual(parseTodoList('# To do\n\nOnly words.\n'), []);
});

test('site data carries the to-do list', () => {
  const { data } = run();
  assert.deepEqual(data.todo, parseTodoList(TODO_TEXT));
  assert.equal(data.todo[0].title, 'app-one');
});

test('the to-do list stays out of the generated markdown', () => {
  const { files } = run();
  const markdown = [...files.values()].join('\n');
  assert.ok(!markdown.includes('only-in-the-todo-file'));
});

test('the to-do list keeps the source lines of an item, wrapped lines too, so the page can delete it', () => {
  const [{ entries }] = parseTodoList('## One\n- [ ] Starts here\n  and goes on\n\nA line of text\n');
  assert.deepEqual(entries[0].lines, ['- [ ] Starts here', 'and goes on']);
  assert.equal(entries[1].lines, undefined);
});

test('removeTodoItem deletes the line and leaves every other byte as it was', () => {
  const before = '# To do  \r\n\r\n## One\n\n- [ ] First\n- [ ] Second  \r\n\n## Two\n- [ ] Third';
  assert.equal(removeTodoItem(before, ['- [ ] First']), '# To do  \r\n\r\n## One\n\n- [ ] Second  \r\n\n## Two\n- [ ] Third');
  assert.equal(removeTodoItem(before, ['- [ ] Second']), '# To do  \r\n\r\n## One\n\n- [ ] First\n\n## Two\n- [ ] Third');
  assert.equal(removeTodoItem(before, ['- [ ] Third']), '# To do  \r\n\r\n## One\n\n- [ ] First\n- [ ] Second  \r\n\n## Two\n');
});

test('removeTodoItem deletes the wrapped lines of an item with it', () => {
  assert.equal(removeTodoItem('## One\n- [ ] Starts here\n  and goes on\n- [ ] Next\n', ['- [ ] Starts here', 'and goes on']), '## One\n- [ ] Next\n');
});

test('removeTodoItem returns null when the item is not in the file any more', () => {
  assert.equal(removeTodoItem('## One\n- [ ] Other\n', ['- [ ] Gone']), null);
  assert.equal(removeTodoItem('', ['- [ ] Gone']), null);
});

test('removeTodoItem compares whole lines, so a longer line with the same start stays', () => {
  assert.equal(removeTodoItem('- [ ] Test the app on a phone\n', ['- [ ] Test the app']), null);
  assert.equal(removeTodoItem('- [ ] Starts here\n  and went elsewhere\n', ['- [ ] Starts here', 'and goes on']), null);
});

test('removeTodoItem deletes only the first of two identical items', () => {
  assert.equal(removeTodoItem('- [ ] Same\n- [ ] Same\n', ['- [ ] Same']), '- [ ] Same\n');
});

test('an item parsed from the file can be deleted from it, and the rest of the list stays', () => {
  const text = '# To do\n\nWords.\n\n- [ ] Up here\n\n## One\n\n- [ ] Test [PR #7](https://example.com/7) on a phone\n  and goes on\n- [x] Ticked\n\nA line.\n\n## Two\n\n- Plain `code`\n';
  const items = parseTodoList(text).flatMap((s) => s.entries).filter((e) => e.type === 'item');
  assert.equal(items.length, 4);
  for (const item of items) {
    const after = parseTodoList(removeTodoItem(text, item.lines)).flatMap((s) => s.entries).filter((e) => e.type === 'item');
    assert.equal(after.length, items.length - 1, item.lines[0]);
    assert.ok(!after.some((e) => e.lines[0] === item.lines[0]), item.lines[0]);
  }
});
