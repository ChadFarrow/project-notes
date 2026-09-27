import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AUTO_START, AUTO_END, stubNote, readNoteForm, applyNoteForm, matchCategory, diffNoteForm, conflictingFields,
} from '../scripts/lib/notes.mjs';

const md = (...lines) => lines.join('\n');

// Shaped like projects/boostmebitch.md: no trailing spaces on Category, no Track line.
const BOOST = md(
  '# boostmebitch',
  '',
  '**Category:** Web/Apps',
  '**Uses:** boostbox, chadf-musicl-playlists, stablekraft-app  ',
  '**Repo:** https://github.com/ChadFarrow/boostmebitch',
  '**Deployed:** https://boostmebitch.vercel.app',
  '',
  '## Description',
  'V4V podcast/music player.',
  '',
  '## Notes',
  '<!-- Add your notes here -->',
  '',
  '## TODOs',
  '- [ ]',
  '',
  AUTO_START,
  '## Live status',
  AUTO_END,
  '',
);

// Shaped like projects/web-ui.md: Category and Track but no Uses, and a fence in a list.
const WEBUI = md(
  '# web-ui',
  '',
  '**Category:** Web/Apps',
  '**Track:** upstream  ',
  '**Repo:** https://github.com/ChadFarrow/web-ui',
  '',
  '## Notes',
  '- Local validation:',
  '  ```',
  '## not a heading',
  '  ```',
  '',
  '## TODOs',
  '- [ ] ',
  '',
  AUTO_START,
  AUTO_END,
  '',
);

const STUB = stubNote({ name: 'svc', description: 'A service' });

const sectionOf = (form, id) => form.sections.find((s) => s.id === id);
const apply = (text, changes) => {
  const result = applyNoteForm(text, changes);
  assert.equal(result.error, undefined, result.error);
  return result.text;
};

// ---------- readNoteForm ----------

test('readNoteForm reads the header values, with defaults for missing lines', () => {
  const form = readNoteForm(BOOST);
  assert.equal(form.category, 'Web/Apps');
  assert.deepEqual(form.uses, ['boostbox', 'chadf-musicl-playlists', 'stablekraft-app']);
  assert.equal(form.track, 'yes');
  assert.deepEqual(form.readOnly, []);
});

test('readNoteForm lists the sections above the AUTO block, with ids by heading', () => {
  const form = readNoteForm(BOOST);
  assert.deepEqual(form.sections.map((s) => s.id), ['Description#0', 'Notes#0', 'TODOs#0']);
  assert.equal(sectionOf(form, 'Description#0').text, 'V4V podcast/music player.');
  assert.equal(sectionOf(form, 'Description#0').todos, null);
});

test('readNoteForm shows a comment-only section as empty, with the comment as placeholder', () => {
  const notes = sectionOf(readNoteForm(BOOST), 'Notes#0');
  assert.equal(notes.text, '');
  assert.equal(notes.placeholder, 'Add your notes here');
});

test('readNoteForm reads an empty `- [ ]` TODO list as no items', () => {
  assert.deepEqual(sectionOf(readNoteForm(BOOST), 'TODOs#0').todos, []);
  assert.deepEqual(sectionOf(readNoteForm(WEBUI), 'TODOs#0').todos, []);
  assert.deepEqual(sectionOf(readNoteForm(STUB), 'TODOs#0').todos, []);
});

test('readNoteForm reads TODO items with their state and marker', () => {
  const text = md('# x', '', '## TODOs', '- [ ] one', '* [x] two', '- [X] three', '');
  assert.deepEqual(sectionOf(readNoteForm(text), 'TODOs#0').todos, [
    { done: false, text: 'one' }, { done: true, text: 'two' }, { done: true, text: 'three' },
  ]);
});

test('readNoteForm treats a TODOs section with other lines as plain text', () => {
  for (const body of ['- [ ] a\nsome prose', '- [ ] a\n  - [ ] nested', '1. numbered']) {
    const s = sectionOf(readNoteForm(md('# x', '', '## TODOs', body, '')), 'TODOs#0');
    assert.equal(s.todos, null, body);
    assert.equal(s.text, body);
  }
});

test('readNoteForm does not split sections inside a code fence', () => {
  const form = readNoteForm(WEBUI);
  assert.deepEqual(form.sections.map((s) => s.id), ['Notes#0', 'TODOs#0']);
  assert.match(sectionOf(form, 'Notes#0').text, /## not a heading/);
});

test('readNoteForm numbers repeated headings', () => {
  const form = readNoteForm(md('# x', '', '## Notes', 'a', '', '## Notes', 'b', ''));
  assert.deepEqual(form.sections.map((s) => [s.id, s.text]), [['Notes#0', 'a'], ['Notes#1', 'b']]);
});

test('readNoteForm marks a duplicated header key read-only', () => {
  const form = readNoteForm(md('# x', '', '**Track:** no  ', '**track:** yes  ', '', '## Notes', ''));
  assert.deepEqual(form.readOnly, ['track']);
});

test('readNoteForm refuses a note with broken AUTO markers', () => {
  const form = readNoteForm(md('# x', AUTO_START, AUTO_START, AUTO_END, ''));
  assert.match(form.error, /AUTO markers are not one START followed by one END/);
});

// ---------- applyNoteForm: nothing changed ----------

test('applyNoteForm with no changes returns the same bytes', () => {
  const crlf = BOOST.replace(/\n/g, '\r\n');
  const bom = `﻿${STUB}`;
  const noNewline = md('# x', '', '## TODOs', '- [ ]');
  for (const text of [BOOST, WEBUI, STUB, crlf, bom, noNewline]) {
    assert.equal(apply(text, {}), text);
  }
});

test('applyNoteForm ignores a change that equals the current value', () => {
  assert.equal(apply(BOOST, {
    category: 'Web/Apps', track: 'yes', uses: ['boostbox', 'chadf-musicl-playlists', 'stablekraft-app'],
    sections: { 'Notes#0': { text: '' }, 'TODOs#0': { todos: [] }, 'Description#0': { text: 'V4V podcast/music player.\n' } },
  }), BOOST);
});

// ---------- applyNoteForm: header lines ----------

test('applyNoteForm replaces a header value in place and ends the line with two spaces', () => {
  assert.equal(apply(BOOST, { category: 'Music/Podcasting' }),
    BOOST.replace('**Category:** Web/Apps\n', '**Category:** Music/Podcasting  \n'));
});

test('applyNoteForm keeps the key spelling of the line it replaces', () => {
  const text = md('# x', '', '**category:** A  ', '');
  assert.equal(apply(text, { category: 'B' }), md('# x', '', '**category:** B  ', ''));
});

test('applyNoteForm writes an empty category as Uncategorized', () => {
  assert.equal(apply(BOOST, { category: '  ' }),
    BOOST.replace('**Category:** Web/Apps\n', '**Category:** Uncategorized  \n'));
});

test('applyNoteForm keeps the written form of Uses entries that were not removed', () => {
  const text = md('# x', '', '**Uses:** `svc-core`, https://github.com/ChadFarrow/boostbox  ', '');
  assert.equal(apply(text, { uses: ['svc-core', 'new-one'] }),
    md('# x', '', '**Uses:** `svc-core`, new-one  ', ''));
  assert.equal(apply(text, { uses: [] }), md('# x', '', '**Uses:**  ', ''));
});

test('applyNoteForm inserts a missing line after the closest earlier header line', () => {
  assert.equal(apply(BOOST, { track: 'no' }), BOOST.replace(
    '**Uses:** boostbox, chadf-musicl-playlists, stablekraft-app  \n',
    '**Uses:** boostbox, chadf-musicl-playlists, stablekraft-app  \n**Track:** no  \n',
  ));
});

test('applyNoteForm adds the line break to the bold line it inserts after', () => {
  assert.equal(apply(WEBUI, { uses: ['boostbox'] }), WEBUI.replace(
    '**Category:** Web/Apps\n',
    '**Category:** Web/Apps  \n**Uses:** boostbox  \n',
  ));
});

test('applyNoteForm inserts before the closest later header line when no earlier one exists', () => {
  const text = md('# x', '', '**Track:** no  ', '', '## Notes', '');
  assert.equal(apply(text, { category: 'Nostr' }),
    md('# x', '', '**Category:** Nostr  ', '**Track:** no  ', '', '## Notes', ''));
});

test('applyNoteForm inserts before **Repo:** when the note has no header lines', () => {
  const text = md('# x', '', '**Repo:** https://github.com/ChadFarrow/x', '', '## Notes', '');
  assert.equal(apply(text, { track: 'no' }),
    md('# x', '', '**Track:** no  ', '**Repo:** https://github.com/ChadFarrow/x', '', '## Notes', ''));
});

test('applyNoteForm inserts after the title when there is nothing else to anchor to', () => {
  assert.equal(apply(md('# x', '', '## Notes', 'hi', ''), { track: 'no' }),
    md('# x', '', '**Track:** no  ', '', '## Notes', 'hi', ''));
  assert.equal(apply(md('# x', '## Notes', ''), { track: 'no' }),
    md('# x', '**Track:** no  ', '', '## Notes', ''));
});

test('applyNoteForm refuses to change a duplicated header key', () => {
  const text = md('# x', '', '**Track:** no  ', '**Track:** yes  ', '');
  assert.match(applyNoteForm(text, { track: 'upstream' }).error, /Track/);
});

test('applyNoteForm refuses an unknown Track value', () => {
  assert.match(applyNoteForm(BOOST, { track: 'maybe' }).error, /Track/);
});

// ---------- applyNoteForm: sections ----------

test('applyNoteForm replaces a placeholder comment and keeps the blank line before the next heading', () => {
  assert.equal(apply(BOOST, { sections: { 'Notes#0': { text: 'Line one\nLine two\n\n' } } }),
    BOOST.replace('<!-- Add your notes here -->\n', 'Line one\nLine two\n'));
});

test('applyNoteForm writes text into an empty section right below its heading', () => {
  const text = md('# x', '', '## Notes', '', '## TODOs', '');
  assert.equal(apply(text, { sections: { 'Notes#0': { text: 'x' } } }),
    md('# x', '', '## Notes', 'x', '', '## TODOs', ''));
});

test('applyNoteForm keeps the blank lines around the text it replaces', () => {
  const text = md('# x', '', '## Notes', '', 'old', '', '', '## TODOs', '');
  assert.equal(apply(text, { sections: { 'Notes#0': { text: 'new' } } }),
    md('# x', '', '## Notes', '', 'new', '', '', '## TODOs', ''));
});

test('applyNoteForm can empty a section', () => {
  const text = md('# x', '', '## Notes', 'old', '', '## TODOs', '');
  assert.equal(apply(text, { sections: { 'Notes#0': { text: '' } } }),
    md('# x', '', '## Notes', '', '## TODOs', ''));
});

test('applyNoteForm uses the line ending of the note for new lines', () => {
  const crlf = BOOST.replace(/\n/g, '\r\n');
  assert.equal(apply(crlf, { sections: { 'Notes#0': { text: 'a\nb' } }, track: 'no' }),
    BOOST.replace('<!-- Add your notes here -->\n', 'a\nb\n')
      .replace('stablekraft-app  \n', 'stablekraft-app  \n**Track:** no  \n')
      .replace(/\n/g, '\r\n'));
});

test('applyNoteForm keeps a byte-order mark', () => {
  const text = `﻿${BOOST}`;
  assert.equal(apply(text, { category: 'Nostr' }),
    `﻿${BOOST.replace('**Category:** Web/Apps\n', '**Category:** Nostr  \n')}`);
});

test('applyNoteForm leaves the AUTO block and anything after it alone', () => {
  const text = `${BOOST}\n## After\ntail text\n`;
  const out = apply(text, { sections: { 'TODOs#0': { todos: [{ done: false, text: 'a' }] } } });
  assert.ok(out.endsWith(`${AUTO_START}\n## Live status\n${AUTO_END}\n\n## After\ntail text\n`));
});

test('applyNoteForm refuses text that contains an AUTO marker line', () => {
  assert.match(applyNoteForm(BOOST, { sections: { 'Notes#0': { text: `a\n${AUTO_END}` } } }).error, /AUTO/);
  assert.match(applyNoteForm(BOOST, { sections: { 'TODOs#0': { todos: [{ done: false, text: AUTO_START }] } } }).error, /AUTO/);
});

test('applyNoteForm refuses a section that is no longer in the note', () => {
  assert.match(applyNoteForm(BOOST, { sections: { 'Ideas#0': { text: 'x' } } }).error, /Ideas/);
});

test('applyNoteForm refuses a note with broken AUTO markers', () => {
  assert.match(applyNoteForm(md('# x', AUTO_END, AUTO_START, ''), { track: 'no' }).error, /AUTO markers/);
});

// ---------- applyNoteForm: TODO checklist ----------

test('applyNoteForm replaces the empty `- [ ]` with the new items', () => {
  assert.equal(apply(BOOST, { sections: { 'TODOs#0': { todos: [{ done: false, text: 'Ship it' }, { done: true, text: 'Plan it' }] } } }),
    BOOST.replace('## TODOs\n- [ ]\n', '## TODOs\n- [ ] Ship it\n- [x] Plan it\n'));
});

test('applyNoteForm ticks a box by changing only that one character', () => {
  const text = md('# x', '', '## TODOs', '- [ ] a', '* [ ] b  ', '');
  assert.equal(apply(text, { sections: { 'TODOs#0': { todos: [{ done: false, text: 'a' }, { done: true, text: 'b' }] } } }),
    md('# x', '', '## TODOs', '- [ ] a', '* [x] b  ', ''));
});

test('applyNoteForm writes `- [ ]` back when every item is removed', () => {
  const text = md('# x', '', '## TODOs', '- [ ] a', '- [x] b', '');
  assert.equal(apply(text, { sections: { 'TODOs#0': { todos: [] } } }), md('# x', '', '## TODOs', '- [ ]', ''));
});

test('applyNoteForm puts each item on one line and drops empty items', () => {
  assert.equal(apply(md('# x', '', '## TODOs', '- [ ]', ''), {
    sections: { 'TODOs#0': { todos: [{ done: false, text: ' two\nlines ' }, { done: false, text: '  ' }] } },
  }), md('# x', '', '## TODOs', '- [ ] two lines', ''));
});

test('applyNoteForm keeps a missing final newline', () => {
  assert.equal(apply(md('# x', '', '## TODOs', '- [ ]'), { sections: { 'TODOs#0': { todos: [{ done: false, text: 'a' }] } } }),
    md('# x', '', '## TODOs', '- [ ] a'));
  assert.equal(apply(md('# x', '', '## Notes'), { sections: { 'Notes#0': { text: 'a' } } }),
    md('# x', '', '## Notes', 'a'));
});

test('applyNoteForm round-trips every section of the stub note', () => {
  const form = readNoteForm(STUB);
  assert.deepEqual(form.sections.map((s) => s.id), ['Description#0', 'Notes#0', 'TODOs#0']);
  const out = apply(STUB, {
    category: 'Nostr',
    sections: { 'Notes#0': { text: 'hello' }, 'TODOs#0': { todos: [{ done: false, text: 'first' }] } },
  });
  const again = readNoteForm(out);
  assert.equal(again.category, 'Nostr');
  assert.equal(sectionOf(again, 'Notes#0').text, 'hello');
  assert.deepEqual(sectionOf(again, 'TODOs#0').todos, [{ done: false, text: 'first' }]);
  assert.ok(out.includes(`${AUTO_START}\n${AUTO_END}\n`));
});

// ---------- review fixes: Uses order, dirty checks, conflicts ----------

// Shaped like projects/stablekraft-app.md: Uses not in alphabetical order.
const STABLE = md(
  '# stablekraft-app',
  '',
  '**Category:** Web/Apps  ',
  '**Uses:** msp-podping-service, boostbox, chadf-musicl-playlists  ',
  '',
  '## Notes',
  'Line with a break  ',
  '',
  '## TODOs',
  '- [ ] a',
  '',
);

// The values an untouched editor hands back: Uses in alphabetical checkbox order.
const untouched = (form) => ({
  category: form.category,
  uses: [...form.uses].sort(),
  track: form.track,
  sections: Object.fromEntries(form.sections.map((s) => [s.id, s.todos ? { todos: s.todos } : { text: s.text }])),
});

test('diffNoteForm finds nothing when the editor hands back what it read', () => {
  for (const text of [BOOST, WEBUI, STUB, STABLE]) {
    assert.deepEqual(diffNoteForm(readNoteForm(text), untouched(readNoteForm(text))), {}, text.split('\n')[0]);
  }
});

test('diffNoteForm lists only the changed fields, with Uses compared as a set', () => {
  const form = readNoteForm(STABLE);
  const values = untouched(form);
  values.uses = ['boostbox', 'chadf-musicl-playlists'];
  values.sections['TODOs#0'] = { todos: [{ done: true, text: 'a' }] };
  assert.deepEqual(diffNoteForm(form, values), {
    uses: ['boostbox', 'chadf-musicl-playlists'],
    sections: { 'TODOs#0': { todos: [{ done: true, text: 'a' }] } },
  });
});

test('applyNoteForm leaves Uses alone when only the order differs', () => {
  assert.equal(apply(STABLE, { uses: ['boostbox', 'chadf-musicl-playlists', 'msp-podping-service'] }), STABLE);
});

test('applyNoteForm keeps the note order of Uses and appends new names', () => {
  assert.equal(apply(STABLE, { uses: ['msp-podping-service', 'boostbox', 'chadf-musicl-playlists', 'aaa-new'] }),
    STABLE.replace('chadf-musicl-playlists  \n', 'chadf-musicl-playlists, aaa-new  \n'));
});

test('applyNoteForm refuses a Uses name that is not a repo name', () => {
  assert.match(applyNoteForm(STABLE, { uses: ['boostbox', `x\n${AUTO_START}`] }).error, /Uses/);
  assert.match(applyNoteForm(STABLE, { uses: ['two words'] }).error, /Uses/);
});

test('a trailing line break at the end of a section is not a change', () => {
  const form = readNoteForm(STABLE);
  assert.equal(apply(STABLE, { sections: { 'Notes#0': { text: 'Line with a break' } } }), STABLE);
  assert.deepEqual(diffNoteForm(form, { ...untouched(form), sections: { 'Notes#0': { text: 'Line with a break' } } }), {});
});

test('applyNoteForm refuses a code fence that is not closed', () => {
  assert.match(applyNoteForm(BOOST, { sections: { 'Notes#0': { text: 'see:\n```\ncode' } } }).error, /code block/);
  assert.equal(applyNoteForm(BOOST, { sections: { 'Notes#0': { text: 'see:\n```\ncode\n```' } } }).error, undefined);
});

test('conflictingFields names the changed fields that also changed on GitHub', () => {
  const opened = readNoteForm(STABLE);
  const changes = { category: 'Nostr', sections: { 'Notes#0': { text: 'mine' }, 'TODOs#0': { todos: [] } } };
  assert.deepEqual(conflictingFields(opened, readNoteForm(STABLE), changes), []);
  const elsewhere = STABLE.replace('- [ ] a', '- [ ] a\n- [ ] added in Obsidian');
  assert.deepEqual(conflictingFields(opened, readNoteForm(elsewhere), changes), ['TODOs']);
  const recategorised = STABLE.replace('Web/Apps', 'Tools');
  assert.deepEqual(conflictingFields(opened, readNoteForm(recategorised), changes), ['Category']);
  const noNotes = STABLE.replace('## Notes', '## Ideas');
  assert.deepEqual(conflictingFields(opened, readNoteForm(noNotes), changes), ['Notes']);
});

// ---------- matchCategory ----------

test('matchCategory returns the existing spelling when only case or spaces differ', () => {
  const known = ['Music/Podcasting', 'Nostr', 'PC 2.0', 'Web/Apps'];
  assert.equal(matchCategory('nostr', known), 'Nostr');
  assert.equal(matchCategory(' web / apps ', known), 'Web/Apps');
  assert.equal(matchCategory('pc2.0', known), 'PC 2.0');
  assert.equal(matchCategory('  New   thing ', known), 'New thing');
});

// ---------- browser safety ----------

test('notes.mjs imports nothing, so the browser can load it as is', () => {
  const src = readFileSync(new URL('../scripts/lib/notes.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /^\s*import\b|\bimport\s*\(|\brequire\s*\(/m);
});
