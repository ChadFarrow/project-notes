import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHeader, spliceAutoBlock, stubNote, indexNoteFiles, AUTO_START, AUTO_END,
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
    problems: [],
  });
});

test('parseHeader gives defaults when the lines are missing or empty', () => {
  assert.deepEqual(parseHeader('# x\n\n**Category:**  \n**Uses:**  \n## Notes\n'), {
    category: 'Uncategorized', uses: [], track: 'yes', problems: [],
  });
  assert.deepEqual(parseHeader(''), {
    category: 'Uncategorized', uses: [], track: 'yes', problems: [],
  });
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
    category: 'Uncategorized', uses: [], track: 'yes', problems: [],
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
