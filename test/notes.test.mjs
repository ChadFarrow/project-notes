import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHeader, spliceAutoBlock, stubNote, indexNoteFiles, AUTO_START, AUTO_END, groupTodo, todoRefUrl, todoProjects, todoNoteName, todoFileUrlPath, TODO_FILE,
  todoTitleQuery, readTodoTitles, todoMark,
} from '../scripts/lib/notes.mjs';

// ---------- parseHeader ----------

test('parseHeader reads Category, Uses and Track with trailing spaces', () => {
  const text = [
    '# app-one',
    '',
    '**Category:** Music/Podcasting  ',
    '**Uses:** svc-core, `other-lib`  ',
    '**Track:** upstream  ',
    '**Repo:** https://github.com/ChadFarrow/app-one',
    '',
    '## Description',
  ].join('\n');
  assert.deepEqual(parseHeader(text), {
    category: 'Music/Podcasting',
    uses: ['svc-core', 'other-lib'],
    track: 'upstream',
    watch: [],
    problems: [],
  });
});

test('parseHeader gives defaults when the lines are missing or empty', () => {
  assert.deepEqual(parseHeader('# x\n\n**Category:**  \n**Uses:**  \n## Notes\n'), {
    category: 'Uncategorized', uses: [], track: 'yes', watch: [], problems: [],
  });
  assert.deepEqual(parseHeader(''), {
    category: 'Uncategorized', uses: [], track: 'yes', watch: [], problems: [],
  });
});

test('parseHeader reads Watch as owner/repo, from a name, a URL or code', () => {
  const h = parseHeader([
    '# fork',
    '',
    '**Watch:** SpencerPearson/small-group-scoop, `other/thing`  ',
    '**Track:** yes  ',
    '',
  ].join('\n'));
  assert.deepEqual(h.watch, ['SpencerPearson/small-group-scoop', 'other/thing']);
  assert.equal(h.track, 'yes');
  assert.deepEqual(h.problems, []);
  assert.deepEqual(parseHeader('**Watch:** https://github.com/a/b.git https://github.com/c/d/\n').watch, ['a/b', 'c/d']);
});

test('parseHeader drops a Watch entry twice over and reports one that is not owner/repo', () => {
  const h = parseHeader('**Watch:** a/b, A/B, just-a-name, a/b/c\n');
  assert.deepEqual(h.watch, ['a/b']);
  assert.deepEqual(h.problems, [
    '`**Watch:**` entry `just-a-name` is not owner/repo; ignored',
    '`**Watch:**` entry `a/b/c` is not owner/repo; ignored',
  ]);
});

test('parseHeader does not read a Watch line as Track', () => {
  assert.equal(parseHeader('**Track:** no\n**Watch:** a/b\n').track, 'no');
  assert.deepEqual(parseHeader('**Watch:**  \n').watch, []);
});

test('parseHeader matches keys without case', () => {
  const h = parseHeader('**category:** Nostr\n**TRACK:** No\n');
  assert.equal(h.category, 'Nostr');
  assert.equal(h.track, 'no');
});

test('parseHeader ignores keys after the first ## heading', () => {
  const h = parseHeader('# x\n**Category:** Tools\n## Notes\n**Category:** Wrong\n**Track:** no\n');
  assert.equal(h.category, 'Tools');
  assert.equal(h.track, 'yes');
});

test('parseHeader ignores keys after the AUTO:START marker', () => {
  const h = parseHeader(`# x\n${AUTO_START}\n**Track:** no\n${AUTO_END}\n`);
  assert.equal(h.track, 'yes');
});

test('parseHeader cleans Uses: separators, backticks, owner prefix and URL', () => {
  const h = parseHeader('**Uses:** `a`,b  ChadFarrow/c, https://github.com/ChadFarrow/d,,\n');
  assert.deepEqual(h.uses, ['a', 'b', 'c', 'd']);
});

test('parseHeader reports a bad Track value and treats it as yes', () => {
  const h = parseHeader('**Track:** maybe\n');
  assert.equal(h.track, 'yes');
  assert.equal(h.problems.length, 1);
  assert.match(h.problems[0], /maybe/);
});

// ---------- spliceAutoBlock ----------

const BODY = 'line one\nline two';

test('spliceAutoBlock appends a block when the file has no markers', () => {
  const { text } = spliceAutoBlock('# x\n\n## Notes\nmine  \n\n\n', BODY);
  assert.equal(text, `# x\n\n## Notes\nmine  \n\n${AUTO_START}\n${BODY}\n${AUTO_END}\n`);
});

test('spliceAutoBlock replaces only the lines between the markers', () => {
  const before = `# x\nmine\n\n${AUTO_START}\nold\nstuff\n${AUTO_END}\nafter the block\n`;
  const { text } = spliceAutoBlock(before, BODY);
  assert.equal(text, `# x\nmine\n\n${AUTO_START}\n${BODY}\n${AUTO_END}\nafter the block\n`);
});

test('spliceAutoBlock gives the same result when run two times', () => {
  const once = spliceAutoBlock('# x\nmine\n', BODY).text;
  const twice = spliceAutoBlock(once, BODY).text;
  assert.equal(twice, once);
});

test('spliceAutoBlock keeps CRLF line endings', () => {
  const before = `# x\r\nmine\r\n\r\n${AUTO_START}\r\nold\r\n${AUTO_END}\r\n`;
  const { text } = spliceAutoBlock(before, BODY);
  assert.equal(text, `# x\r\nmine\r\n\r\n${AUTO_START}\r\nline one\r\nline two\r\n${AUTO_END}\r\n`);
});

test('spliceAutoBlock accepts markers with extra spaces', () => {
  const before = `# x\n  <!--  AUTO:START  -->\nold\n<!-- AUTO:END -->  \n`;
  const { text } = spliceAutoBlock(before, BODY);
  assert.equal(text, `# x\n  <!--  AUTO:START  -->\n${BODY}\n<!-- AUTO:END -->  \n`);
});

test('spliceAutoBlock ignores marker text inside a line', () => {
  const before = `# x\nWrite ${AUTO_START} to start a block.\n`;
  const { text } = spliceAutoBlock(before, BODY);
  assert.ok(text.startsWith(before.trimEnd()));
  assert.ok(text.endsWith(`${AUTO_START}\n${BODY}\n${AUTO_END}\n`));
});

for (const [name, before] of [
  ['a duplicate START', `${AUTO_START}\n${AUTO_START}\n${AUTO_END}\n`],
  ['a duplicate END', `${AUTO_START}\n${AUTO_END}\n${AUTO_END}\n`],
  ['END before START', `${AUTO_END}\nx\n${AUTO_START}\n`],
  ['START alone', `# x\n${AUTO_START}\nmy notes after it\n`],
  ['END alone', `# x\n${AUTO_END}\n`],
]) {
  test(`spliceAutoBlock refuses ${name}`, () => {
    const result = spliceAutoBlock(before, BODY);
    assert.equal(result.text, undefined);
    assert.equal(typeof result.error, 'string');
  });
}

// ---------- stubNote ----------

test('stubNote parses back to the defaults and has an empty block', () => {
  const stub = stubNote({ name: 'new-repo', description: 'A thing' });
  assert.deepEqual(parseHeader(stub), {
    category: 'Uncategorized', uses: [], track: 'yes', watch: [], problems: [],
  });
  assert.match(stub, /^# new-repo\n/);
  assert.match(stub, /https:\/\/github\.com\/ChadFarrow\/new-repo/);
  assert.match(stub, /## Description\nA thing\n/);
  assert.ok(stub.endsWith(`${AUTO_START}\n${AUTO_END}\n`));
  // A splice into a fresh stub fills the existing block, not a second one.
  const { text } = spliceAutoBlock(stub, BODY);
  assert.equal(text.split(AUTO_START).length, 2);
});

test('stubNote ends each header line with two spaces so GitHub breaks the lines', () => {
  const stub = stubNote({ name: 'x', description: '' });
  assert.ok(stub.includes('**Category:** Uncategorized  \n**Uses:**  \n**Track:** yes  \n**Repo:** '));
});

test('stubNote writes a placeholder when there is no description', () => {
  assert.match(stubNote({ name: 'x', description: '' }), /## Description\n<!-- Add a description -->\n/);
});

// ---------- indexNoteFiles ----------

test('indexNoteFiles maps lower-case repo names to file names', () => {
  const map = indexNoteFiles(['MSP-2.0.md', 'castr.me.md', 'readme.txt']);
  assert.equal(map.get('msp-2.0'), 'MSP-2.0.md');
  assert.equal(map.get('castr.me'), 'castr.me.md');
  assert.equal(map.size, 2);
});

// ---------- groupTodo, todoRefUrl ----------

const todoItem = (name, extra = {}) => ({ type: 'item', parts: [{ text: name }], lines: [`- [ ] ${name}`], ...extra });
const todoSections = [
  { title: 'app-one', entries: [
    todoItem('a1', { group: 'after' }),
    todoItem('b1', { group: 'before', place: 'phone' }),
    todoItem('b1 sub', { group: 'before', place: 'phone', under: ['- [ ] b1'] }),
    todoItem('d1', { group: 'dev' }),
    todoItem('b2', { group: 'before' }),
  ] },
  { title: 'Laptop', entries: [
    { type: 'text', parts: [{ text: 'a note' }] },
    todoItem('u1'),
  ] },
];
const names = (g) => g.items.map((i) => i.top.parts[0].text);

test('groupTodo puts items in the three groups in order, and Not sorted last', () => {
  const groups = groupTodo(todoSections);
  assert.deepEqual(groups.map((g) => g.title), ['Before merge', 'After merge', 'In development', 'Not sorted']);
  assert.deepEqual(groups.map((g) => g.key), ['before', 'after', 'dev', null]);
  assert.deepEqual(names(groups[1]), ['a1']);
  assert.deepEqual(names(groups[2]), ['d1']);
  assert.equal(groups[0].items[0].subs.length, 1);
  assert.equal(groups[0].items[0].section, todoSections[0]);
});

test('groupTodo keeps the file order inside a group', () => {
  assert.deepEqual(names(groupTodo(todoSections)[0]), ['b1', 'b2']);
});

test('groupTodo puts a text line under Not sorted', () => {
  const g = groupTodo(todoSections)[3];
  assert.deepEqual(g.items.map((i) => i.top.type), ['text', 'item']);
  assert.deepEqual(g.items[0].subs, []);
});

test('groupTodo leaves Not sorted out when it is empty', () => {
  const groups = groupTodo([{ title: 'x', entries: [todoItem('a', { group: 'dev' })] }]);
  assert.equal(groups.length, 3);
  assert.deepEqual(names(groups[0]), []);
  assert.equal(groupTodo([]).length, 3);
});

test('todoRefUrl links the issue path', () => {
  assert.equal(todoRefUrl({ repo: 'A/b', number: 3 }), 'https://github.com/A/b/issues/3');
});

const mixed = [{ title: 'p', entries: [
  todoItem('t8', { group: 'before' }),
  todoItem('s1', { group: 'before', place: 'phone', under: ['- [ ] t8'] }),
  todoItem('s2', { group: 'before', place: 'computer', under: ['- [ ] t8'] }),
  todoItem('s3', { group: 'before', place: 'phone', under: ['- [ ] t8'] }),
  todoItem('own', { group: 'after', place: 'computer' }),
  todoItem('own sub', { group: 'after', place: 'computer', under: ['- [ ] own'] }),
  { type: 'text', parts: [{ text: 'a note' }] },
] }];

test('groupTodo shows one project only', () => {
  const groups = groupTodo(todoSections, { project: 'Laptop', place: 'all' });
  assert.deepEqual(groups.map((g) => names(g)), [[], [], [], ['a note', 'u1']]);
  assert.deepEqual(groupTodo(todoSections, { project: 'gone', place: 'all' }).length, 3);
});

test('groupTodo with a place keeps an item whose test has it, and hides the other tests', () => {
  const groups = groupTodo(mixed, { project: 'all', place: 'phone' });
  assert.deepEqual(names(groups[0]), ['t8']);
  assert.deepEqual(groups[0].items[0].subs.map((s) => s.parts[0].text), ['s1', 's3']);
  assert.deepEqual(names(groups[1]), []);
});

test('groupTodo with a place keeps an item whose own place matches, with its tests of that place', () => {
  const groups = groupTodo(mixed, { project: 'all', place: 'computer' });
  assert.deepEqual(names(groups[1]), ['own']);
  assert.deepEqual(groups[1].items[0].subs.map((s) => s.parts[0].text), ['own sub']);
  assert.deepEqual(groups[0].items[0].subs.map((s) => s.parts[0].text), ['s2']);
});

test('groupTodo hides text lines under a place filter', () => {
  const groups = groupTodo(mixed, { project: 'all', place: 'air' });
  assert.equal(groups.length, 3);
  assert.ok(groups.every((g) => g.items.length === 0));
  assert.equal(groupTodo(mixed)[3].items.length, 1);
});

test('todoProjects counts the top items of each section', () => {
  assert.deepEqual(todoProjects(todoSections), [{ title: 'app-one', count: 4 }, { title: 'Laptop', count: 2 }]);
  assert.deepEqual(todoProjects(undefined), []);
});

// ---------- to-do folder helpers, hidden ticks ----------

const refused = ['notes/other.md', 'notes/todo/sub/x.md', 'notes/todo/.x.md', 'notes/todo/x.txt', 'projects/a.md', '../x'];

test('todoNoteName names a note directly in notes/todo', () => {
  assert.equal(todoNoteName('notes/todo/boostmebitch - playlist tests.md'), 'boostmebitch - playlist tests');
  for (const p of ['notes/TODO.md', ...refused]) assert.equal(todoNoteName(p), null, p);
});

test('todoFileUrlPath encodes each segment and refuses other paths', () => {
  assert.equal(todoFileUrlPath('notes/todo/boostmebitch - playlist tests.md'), 'notes/todo/boostmebitch%20-%20playlist%20tests.md');
  assert.equal(todoFileUrlPath('notes/TODO.md'), 'notes/TODO.md');
  assert.equal(TODO_FILE, 'notes/TODO.md');
  for (const p of refused) assert.equal(todoFileUrlPath(p), null, p);
});

test('groupTodo hides a ticked item with nothing open, and ticked sub-items', () => {
  const sections = [{ title: 'p', entries: [
    todoItem('done top', { group: 'dev', done: true }),
    todoItem('open top', { group: 'dev' }),
    todoItem('done sub', { group: 'dev', done: true, under: ['- [ ] open top'] }),
    todoItem('open sub', { group: 'dev', under: ['- [ ] open top'] }),
  ] }];
  const groups = groupTodo(sections);
  assert.deepEqual(names(groups[2]), ['open top']);
  assert.deepEqual(groups[2].items[0].subs.map((s) => s.parts[0].text), ['open sub']);
});

test('groupTodo keeps a ticked item that still has an open sub-item', () => {
  const sections = [{ title: 'p', entries: [
    todoItem('done top', { group: 'dev', done: true }),
    todoItem('open sub', { group: 'dev', under: ['- [x] done top'] }),
    todoItem('done sub', { group: 'dev', done: true, under: ['- [x] done top'] }),
  ] }];
  const groups = groupTodo(sections);
  assert.deepEqual(names(groups[2]), ['done top']);
  assert.deepEqual(groups[2].items[0].subs.map((s) => s.parts[0].text), ['open sub']);
});

test('todoProjects merges sections with one title and drops a count of 0', () => {
  const sections = [
    { title: 'a', entries: [todoItem('x1'), todoItem('x2', { done: true })] },
    { title: 'b', entries: [todoItem('y', { done: true })] },
    { title: 'a', entries: [todoItem('x3')] },
  ];
  assert.deepEqual(todoProjects(sections), [{ title: 'a', count: 2 }]);
});

// ---------- titles and out-of-date marks ----------

const R = 'ChadFarrow/app-one';
const DAY = 86400000;
const NOW = Date.parse('2026-11-13T12:00:00Z');
const ago = (days) => new Date(NOW - days * DAY).toISOString();
const titles = (entries) => new Map(Object.entries(entries));
const pr = (state, mergedAt = null) => ({ kind: 'pr', title: 'T', state, mergedAt });

test('todoTitleQuery asks once per repo and once per number', () => {
  const { query, aliases } = todoTitleQuery([
    { repo: R, number: 8 }, { repo: R, number: 9 }, { repo: R, number: 8 }, { repo: 'Upstream/thing', number: 4 },
  ]);
  assert.equal(query.match(/repository\(/g).length, 2);
  assert.equal(query.match(/issueOrPullRequest\(/g).length, 3);
  assert.match(query, /repository\(owner: "ChadFarrow", name: "app-one"\)/);
  assert.match(query, /__typename/);
  assert.match(query, /isDraft/);
  assert.match(query, /mergedAt/);
  assert.equal(aliases.length, 3);
  assert.deepEqual(aliases.map((a) => [a.repo, a.number]), [[R, 8], [R, 9], ['Upstream/thing', 4]]);
  assert.equal(aliases[0].repoAlias, aliases[1].repoAlias);
  assert.notEqual(aliases[0].repoAlias, aliases[2].repoAlias);
});

test('readTodoTitles reads PRs and issues, and skips a repo the token cannot see', () => {
  const { aliases } = todoTitleQuery([{ repo: R, number: 8 }, { repo: R, number: 5 }, { repo: 'Upstream/thing', number: 4 }]);
  const [a8, a5, a4] = aliases;
  const json = {
    data: {
      [a8.repoAlias]: {
        [a8.numberAlias]: { __typename: 'PullRequest', title: 'A PR', state: 'MERGED', isDraft: false, mergedAt: '2026-11-01T00:00:00Z' },
        [a5.numberAlias]: { __typename: 'Issue', title: 'An issue', state: 'CLOSED' },
      },
      [a4.repoAlias]: null,
    },
    errors: [{ type: 'NOT_FOUND' }],
  };
  const map = readTodoTitles(json, aliases);
  assert.deepEqual(map.get(`${R}#8`), { kind: 'pr', title: 'A PR', state: 'merged', mergedAt: '2026-11-01T00:00:00Z' });
  assert.deepEqual(map.get(`${R}#5`), { kind: 'issue', title: 'An issue', state: 'closed', mergedAt: null });
  assert.equal(map.has('Upstream/thing#4'), false);
  assert.equal(map.size, 2);
});

test('readTodoTitles calls an open draft PR draft', () => {
  const { aliases } = todoTitleQuery([{ repo: R, number: 1 }, { repo: R, number: 2 }]);
  const json = { data: { [aliases[0].repoAlias]: {
    [aliases[0].numberAlias]: { __typename: 'PullRequest', title: 'D', state: 'OPEN', isDraft: true, mergedAt: null },
    [aliases[1].numberAlias]: { __typename: 'PullRequest', title: 'O', state: 'OPEN', isDraft: false, mergedAt: null },
  } } };
  const map = readTodoTitles(json, aliases);
  assert.equal(map.get(`${R}#1`).state, 'draft');
  assert.equal(map.get(`${R}#2`).state, 'open');
});

const line = (group, numbers, repo = R) => ({ type: 'item', group, repo, refs: numbers.map((number) => ({ repo, number })) });

test('todoMark marks a before-merge line when every PR on it is merged or closed', () => {
  const t = titles({ [`${R}#537`]: pr('merged', ago(1)), [`${R}#538`]: pr('closed'), [`${R}#540`]: pr('merged', ago(2)) });
  assert.deepEqual(todoMark(line('before', [537]), t, NOW), { tone: 'wait', text: 'PR #537 is merged: is this still needed?' });
  assert.equal(todoMark(line('before', [538]), t, NOW).text, 'PR #538 is closed: is this still needed?');
  assert.equal(todoMark(line('before', [537, 538, 540]), t, NOW).text, 'PRs #537, #538 and #540 are merged or closed: is this still needed?');
  assert.equal(todoMark(line('before', [537, 538]), t, NOW).text, 'PRs #537 and #538 are merged or closed: is this still needed?');
});

test('todoMark leaves a before-merge line alone when only some PRs are merged', () => {
  const t = titles({ [`${R}#1`]: pr('merged', ago(1)), [`${R}#2`]: pr('open'), [`${R}#3`]: pr('draft') });
  assert.equal(todoMark(line('before', [1, 2]), t, NOW), null);
  assert.equal(todoMark(line('before', [3]), t, NOW), null);
});

test('todoMark ignores issues', () => {
  const t = titles({ [`${R}#1`]: pr('merged', ago(1)), [`${R}#5`]: { kind: 'issue', title: 'I', state: 'closed', mergedAt: null } });
  assert.equal(todoMark(line('before', [5]), t, NOW), null);
  assert.equal(todoMark(line('before', [1, 5]), t, NOW).text, 'PR #1 is merged: is this still needed?');
  assert.equal(todoMark(line('before', [1, 99]), t, NOW).text, 'PR #1 is merged: is this still needed?');
});

test('todoMark gives an after-merge line its age, and the warning after 14 days', () => {
  const at = (days) => titles({ [`${R}#9`]: pr('merged', ago(days)) });
  assert.deepEqual(todoMark(line('after', [9]), at(0), NOW), { tone: 'quiet', text: 'merged today' });
  assert.deepEqual(todoMark(line('after', [9]), at(1), NOW), { tone: 'quiet', text: 'merged 1 day ago' });
  assert.deepEqual(todoMark(line('after', [9]), at(14), NOW), { tone: 'quiet', text: 'merged 14 days ago' });
  assert.deepEqual(todoMark(line('after', [9]), at(15), NOW), { tone: 'wait', text: 'merged 15 days ago' });
  const two = titles({ [`${R}#9`]: pr('merged', ago(30)), [`${R}#10`]: pr('merged', ago(3)) });
  assert.equal(todoMark(line('after', [9, 10]), two, NOW).text, 'merged 3 days ago');
  assert.equal(todoMark(line('after', [9]), titles({ [`${R}#9`]: pr('open') }), NOW), null);
});

test('todoMark gives nothing to a line with no PR', () => {
  assert.equal(todoMark({ type: 'item', group: 'before' }, titles({}), NOW), null);
  assert.equal(todoMark(line('before', [1]), titles({}), NOW), null);
  assert.equal(todoMark(line('dev', [1]), titles({ [`${R}#1`]: pr('merged', ago(1)) }), NOW), null);
  assert.equal(todoMark(line(null, [1]), titles({ [`${R}#1`]: pr('merged', ago(1)) }), NOW), null);
  assert.equal(todoMark(line('before', [1]), null, NOW), null);
});

test('groupTodo shows a sub-item whose top item is gone as its own item', () => {
  const groups = groupTodo([{ title: 'x', entries: [todoItem('orphan', { under: ['- [ ] gone'], group: 'dev' })] }]);
  assert.deepEqual(names(groups[2]), ['orphan']);
  const after = groupTodo([{ title: 'x', entries: [{ type: 'text', parts: [{ text: 'note' }] }, todoItem('orphan2', { under: ['- [ ] gone'] })] }]);
  assert.deepEqual(names(after[3]), ['note', 'orphan2']);
});
