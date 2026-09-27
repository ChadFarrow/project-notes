// Pure text handling for the per-project notes in projects/<repo>.md.
//
// A note has a hand-written part and one generated block between the AUTO markers.
// The sync must never change a byte outside that block, so every function here is
// conservative: when the markers are not in a clean START…END pair, the note is
// left alone and the caller reports a problem instead of guessing.
//
// The web dashboard loads this file in the browser as is (site/ gets a copy), so it
// must stay free of imports and of Node APIs.

export const AUTO_START = '<!-- AUTO:START -->';
export const AUTO_END = '<!-- AUTO:END -->';

const MARKER = /^\s*<!--\s*AUTO:(START|END)\s*-->\s*$/;
const HEADER_KEY = /^\*\*(Category|Uses|Track):\*\*\s*(.*?)\s*$/i;
const TRACK_VALUES = new Set(['yes', 'no', 'upstream']);

// The header lines the sync reads: only lines above the first `## ` heading (or the
// AUTO block) count, so a `**Track:**` inside Notes is just prose.
function headerEntries(lines) {
  const entries = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith('## ') || MARKER.test(line)) break;
    const m = HEADER_KEY.exec(line);
    if (m) entries.push({ index, key: m[1], value: m[2] });
  }
  return entries;
}

// `**Uses:**` entries as written (`raw`) and as a repo name (`name`).
const usesEntries = (value) => value
  .split(/[,\s]+/)
  .map((raw) => ({ raw, name: raw.replace(/`/g, '').replace(/^(https:\/\/github\.com\/)?ChadFarrow\//i, '') }))
  .filter((u) => u.name);

export function parseHeader(text) {
  const header = { category: 'Uncategorized', uses: [], track: 'yes', problems: [] };
  for (const { key: rawKey, value } of headerEntries(text.replace(/\r\n/g, '\n').split('\n'))) {
    const key = rawKey.toLowerCase();
    if (key === 'category') {
      if (value) header.category = value;
    } else if (key === 'uses') {
      header.uses = usesEntries(value).map((u) => u.name);
    } else if (value) {
      const track = value.toLowerCase();
      if (TRACK_VALUES.has(track)) header.track = track;
      else header.problems.push(`\`**Track:** ${value}\` is not yes, no or upstream; treated as yes`);
    }
  }
  return header;
}

// Replaces the lines between AUTO:START and AUTO:END with `body`, or appends a new
// block when the file has none. Returns { text } or { error }.
export function spliceAutoBlock(original, body) {
  const crlf = original.includes('\r\n');
  const text = original.replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const { markers, error } = findMarkers(lines);
  if (error) return { error };
  const block = body.replace(/\n+$/, '');

  let out;
  if (markers.length === 0) {
    const base = text.replace(/\n+$/, '');
    out = `${base ? `${base}\n\n` : ''}${AUTO_START}\n${block}\n${AUTO_END}\n`;
  } else {
    const [start, end] = markers;
    out = [...lines.slice(0, start.i + 1), block, ...lines.slice(end.i)].join('\n');
  }
  return { text: crlf ? out.replace(/\n/g, '\r\n') : out };
}

// The AUTO markers in `lines` (strings): none, or one START followed by one END.
function findMarkers(lines) {
  const markers = [];
  lines.forEach((line, i) => {
    const m = MARKER.exec(line);
    if (m) markers.push({ kind: m[1], i });
  });
  if (markers.length === 0 || (markers.length === 2 && markers[0].kind === 'START' && markers[1].kind === 'END')) {
    return { markers };
  }
  const found = markers.map((m) => `${m.kind} on line ${m.i + 1}`).join(', ');
  return { error: `AUTO markers are not one START followed by one END (${found}); file left unchanged` };
}

// Two trailing spaces make a markdown line break, so each header line renders on its
// own row. Spelled out because editors strip trailing whitespace from a literal.
const BR = '  ';

// The note the sync creates for a repo that has none. `description` is already
// escaped markdown (or empty).
export function stubNote({ name, description }) {
  return `# ${name}

**Category:** Uncategorized${BR}
**Uses:**${BR}
**Track:** yes${BR}
**Repo:** https://github.com/ChadFarrow/${name}

<!-- The sync reads: Category (grouping), Uses (comma-separated repo names), Track (yes | no | upstream). -->

## Description
${description || '<!-- Add a description -->'}

## Notes
<!-- Add your notes here -->

## TODOs
- [ ]

${AUTO_START}
${AUTO_END}
`;
}

// Maps lower-case repo name → note file name, so the lookup behaves the same on
// the case-insensitive Mac file system and on the case-sensitive runner.
export function indexNoteFiles(filenames) {
  const map = new Map();
  for (const f of filenames) {
    if (!f.endsWith('.md')) continue;
    const key = f.slice(0, -3).toLowerCase();
    if (!map.has(key)) map.set(key, f);
  }
  return map;
}

// ---------- the note form (the web dashboard's editor) ----------
//
// readNoteForm turns the hand-written part of a note into form values; applyNoteForm
// writes changed values back. Every byte that was not edited stays as it was: each
// line keeps its own line ending, and only the lines of a changed value are rewritten.
// Plain regexes only (no lookbehind), so older phone browsers can load this file.

const FENCE = /^\s*(```|~~~)/;
const TASK = /^([-*]) \[([ xX])\](?:[ \t]+(.*?))?[ \t]*$/;
const TODO_HEADING = /^to-?dos?$/i;
const COMMENT_ONLY = /^<!--([\s\S]*?)-->$/;
const BOLD_LINE = /^\*\*[^*]+:\*\*/;
const HEADER_ORDER = ['category', 'uses', 'track'];
const HEADER_NAME = { category: 'Category', uses: 'Uses', track: 'Track' };

const REPO_NAME = /^[A-Za-z0-9._-]+$/;

const isBlank = (line) => line.text.trim() === '';

// What counts as the same text or the same checklist, on both sides of a comparison:
// blank lines around the text and the line break at its end do not.
const cleanText = (text) => String(text).replace(/\r\n?/g, '\n').replace(/^\s*\n/, '').replace(/\s+$/, '');
const cleanTodos = (todos) => todos
  .map((t) => ({ done: Boolean(t.done), text: String(t.text == null ? '' : t.text).replace(/\s*[\r\n]+\s*/g, ' ').trim() }))
  .filter((t) => t.text);
const sameSet = (a, b) => {
  const key = (list) => [...new Set(list.map((s) => s.toLowerCase()))].sort().join(',');
  return key(a) === key(b);
};

// Lines as { text, eol }, so each keeps its own ending. A byte-order mark is kept apart.
function splitNote(source) {
  const bom = source.startsWith('﻿') ? '﻿' : '';
  const lines = (source.slice(bom.length).match(/[^\n]*\n|[^\n]+$/g) || []).map((s) => {
    const text = s.replace(/\r?\n$/, '');
    return { text, eol: s.slice(text.length) };
  });
  return { bom, lines };
}

// The `## ` sections above the AUTO block. Each has its heading line (`start`), its
// text (`from`…`to`, without the blank lines around it) and its end (`stop`).
function parseNote(source) {
  const { bom, lines } = splitNote(source);
  const { markers, error } = findMarkers(lines.map((l) => l.text));
  if (error) return { error };
  const end = markers.length ? markers[0].i : lines.length;
  const sections = [];
  const seen = new Map();
  let fence = false;
  for (let i = 0; i < end; i++) {
    const text = lines[i].text;
    if (!fence && text.startsWith('## ')) {
      const heading = text.slice(3).trim();
      const n = seen.get(heading) || 0;
      seen.set(heading, n + 1);
      sections.push({ id: `${heading}#${n}`, heading, start: i });
    } else if (FENCE.test(text)) {
      fence = !fence;
    }
  }
  sections.forEach((s, k) => {
    s.stop = k + 1 < sections.length ? sections[k + 1].start : end;
    let from = s.start + 1;
    let to = s.stop;
    while (to > from && isBlank(lines[to - 1])) to--;
    if (to > from) while (isBlank(lines[from])) from++;
    s.from = from;
    s.to = to;
  });
  return { bom, lines, sections };
}

function sectionForm(lines, s) {
  const middle = lines.slice(s.from, s.to).map((l) => l.text);
  let text = middle.join('\n');
  let placeholder = '';
  const comment = COMMENT_ONLY.exec(text.trim());
  if (comment && !comment[1].includes('-->')) {
    placeholder = comment[1].trim();
    text = '';
  }
  let todos = null;
  if (TODO_HEADING.test(s.heading) && (text === '' || middle.every((t) => t.trim() === '' || TASK.test(t)))) {
    todos = middle.map((t) => TASK.exec(t)).filter((m) => m && m[3]).map((m) => ({ done: m[2] !== ' ', text: m[3] }));
  }
  return { id: s.id, heading: s.heading, text, placeholder, todos };
}

// { category, uses, track, readOnly, sections: [{ id, heading, text, placeholder, todos }] },
// or { error }. `todos` is null unless the section is a plain checklist. `readOnly`
// names the header keys that appear more than once.
export function readNoteForm(source) {
  const note = parseNote(source);
  if (note.error) return { error: note.error };
  const header = parseHeader(source);
  const counts = {};
  for (const e of headerEntries(note.lines.map((l) => l.text))) {
    const key = e.key.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  }
  return {
    category: header.category,
    uses: header.uses,
    track: header.track,
    readOnly: HEADER_ORDER.filter((key) => counts[key] > 1),
    sections: note.sections.map((s) => sectionForm(note.lines, s)),
  };
}

const headerLine = (key, value) => (value ? `**${key}:** ${value}${BR}` : `**${key}:**${BR}`);

// A new line at `index`. The bold line above it gets its line break, and a blank line
// keeps it apart from a heading or prose below.
function insertLine(lines, index, text, eol) {
  const prev = lines[index - 1];
  if (prev && BOLD_LINE.test(prev.text) && !/( {2}|\\)$/.test(prev.text)) prev.text += BR;
  const line = { text, eol };
  if (index === lines.length && prev && prev.eol === '') {
    prev.eol = eol;
    line.eol = '';
  }
  lines.splice(index, 0, line);
  const next = lines[index + 1];
  if (next && !isBlank(next) && !next.text.startsWith('**')) lines.splice(index + 1, 0, { text: '', eol });
}

function setHeader(lines, key, value, eol) {
  const texts = lines.map((l) => l.text);
  const entries = headerEntries(texts);
  const at = (k) => entries.find((e) => e.key.toLowerCase() === k);
  const entry = at(key);
  let written = value;
  if (key === 'uses') {
    const raw = new Map(entry ? usesEntries(entry.value).map((u) => [u.name.toLowerCase(), u.raw]) : []);
    written = value.map((name) => raw.get(name.toLowerCase()) || name).join(', ');
  }
  if (entry) {
    lines[entry.index].text = headerLine(entry.key, written);
    return;
  }
  // A missing line goes next to the closest one in Category → Uses → Track order,
  // else before **Repo:**, else below the title.
  const pos = HEADER_ORDER.indexOf(key);
  const before = HEADER_ORDER.slice(0, pos).reverse().map(at).find(Boolean);
  const after = HEADER_ORDER.slice(pos + 1).map(at).find(Boolean);
  let index;
  if (before) index = before.index + 1;
  else if (after) index = after.index;
  else {
    let zone = 0;
    while (zone < texts.length && !texts[zone].startsWith('## ') && !MARKER.test(texts[zone])) zone++;
    const head = texts.slice(0, zone);
    const repo = head.findIndex((t) => /^\*\*Repo:\*\*/i.test(t));
    const title = head.findIndex((t) => t.startsWith('# '));
    if (repo >= 0) index = repo;
    else if (title >= 0) index = title + 1 + (lines[title + 1] && isBlank(lines[title + 1]) ? 1 : 0);
    else index = 0;
  }
  insertLine(lines, index, headerLine(HEADER_NAME[key], written), eol);
}

// { texts } to rewrite the section's text, {} to leave it, or { error }. A change of
// ticks only is written in place, one character per line.
function sectionEdit(lines, s, current, change) {
  if (change.todos) {
    if (!current.todos) return { error: `The ${s.heading} section is no longer a checklist; reload the note` };
    const items = cleanTodos(change.todos);
    if (items.some((t) => MARKER.test(t.text))) return { error: 'A TODO may not be an AUTO marker line' };
    const sameItems = items.length === current.todos.length
      && items.every((t, k) => t.text === current.todos[k].text);
    if (!sameItems) {
      return { texts: items.length ? items.map((t) => `- [${t.done ? 'x' : ' '}] ${t.text}`) : ['- [ ]'] };
    }
    let k = 0;
    for (let i = s.from; i < s.to; i++) {
      const m = TASK.exec(lines[i].text);
      if (!m || !m[3]) continue;
      const done = items[k++].done;
      if (done !== (m[2] !== ' ')) lines[i].text = lines[i].text.replace(/^([-*]) \[[ xX]\]/, `$1 [${done ? 'x' : ' '}]`);
    }
    return {};
  }
  if (typeof change.text !== 'string') return {};
  const text = cleanText(change.text);
  if (text === cleanText(current.text)) return {};
  const texts = text === '' ? [] : text.split('\n');
  if (texts.some((t) => MARKER.test(t))) return { error: 'The text may not contain an AUTO marker line' };
  // An open fence would hide every heading below it, TODOs included.
  if (texts.filter((t) => FENCE.test(t)).length % 2) {
    return { error: `The code block (\`\`\`) in ${s.heading} is not closed` };
  }
  return { texts };
}

function replaceText(lines, s, texts, eol) {
  const fresh = texts.map((text) => ({ text, eol }));
  const last = lines[lines.length - 1];
  if (s.to === lines.length && last && last.eol === '') {
    // The section ends the file with no final newline; keep it that way.
    if (fresh.length) {
      fresh[fresh.length - 1].eol = '';
      if (s.to === s.from) lines[s.from - 1].eol = eol;
    } else if (s.to > s.from) {
      lines[s.from - 1].eol = '';
    }
  }
  lines.splice(s.from, s.to - s.from, ...fresh);
}

// changes: { category?, uses?, track?, sections?: { [id]: { text } | { todos } } }.
// A value equal to the current one changes nothing. Returns { text } or { error }.
export function applyNoteForm(source, changes = {}) {
  const note = parseNote(source);
  if (note.error) return { error: note.error };
  const form = readNoteForm(source);
  const { lines } = note;
  const eol = (lines.find((l) => l.eol) || { eol: '\n' }).eol;

  // Sections first and bottom up, so the line numbers above stay valid.
  const rewrites = [];
  for (const [id, change] of Object.entries(changes.sections || {})) {
    const s = note.sections.find((x) => x.id === id);
    if (!s) return { error: `The section “${id.replace(/#\d+$/, '')}” is no longer in the note; reload it` };
    const result = sectionEdit(lines, s, form.sections.find((x) => x.id === id), change);
    if (result.error) return result;
    if (result.texts) rewrites.push({ s, texts: result.texts });
  }
  rewrites.sort((a, b) => b.s.start - a.s.start);
  for (const { s, texts } of rewrites) replaceText(lines, s, texts, eol);

  for (const key of HEADER_ORDER) {
    if (changes[key] === undefined) continue;
    let value = changes[key];
    if (key === 'category') value = String(value).trim().replace(/\s+/g, ' ') || 'Uncategorized';
    if (key === 'uses') {
      const names = [...new Set(value.map((n) => String(n).trim()).filter(Boolean))];
      const bad = names.find((n) => !REPO_NAME.test(n));
      if (bad !== undefined) return { error: `**Uses:** can only name repos, and “${bad}” is not a repo name` };
      // The names already in the note keep their order; new names go at the end.
      const lower = new Set(names.map((n) => n.toLowerCase()));
      const kept = form.uses.filter((n) => lower.has(n.toLowerCase()));
      const keptLower = new Set(kept.map((n) => n.toLowerCase()));
      value = [...kept, ...names.filter((n) => !keptLower.has(n.toLowerCase()))];
    }
    if (key === 'track') {
      value = String(value).trim().toLowerCase();
      if (!TRACK_VALUES.has(value)) return { error: `Track must be yes, no or upstream, not “${changes.track}”` };
    }
    const same = key === 'uses' ? sameSet(value, form.uses) : value === form[key];
    if (same) continue;
    if (form.readOnly.includes(key)) {
      return { error: `The note has more than one **${HEADER_NAME[key]}:** line; fix it in the file first` };
    }
    setHeader(lines, key, value, eol);
  }
  return { text: note.bom + lines.map((l) => l.text + l.eol).join('') };
}

// The changes between a form as read and the values an editor hands back, in the shape
// applyNoteForm takes. Uses is a set here: the order of the checkboxes is not a change.
export function diffNoteForm(form, values) {
  const changes = {};
  const open = (key) => !form.readOnly.includes(key) && values[key] !== undefined;
  if (open('category') && values.category !== form.category) changes.category = values.category;
  if (open('uses') && !sameSet(values.uses, form.uses)) changes.uses = values.uses;
  if (open('track') && values.track !== form.track) changes.track = values.track;
  const sections = {};
  for (const s of form.sections) {
    const v = (values.sections || {})[s.id];
    if (!v) continue;
    if (v.todos && s.todos) {
      if (JSON.stringify(cleanTodos(v.todos)) !== JSON.stringify(s.todos)) sections[s.id] = { todos: v.todos };
    } else if (typeof v.text === 'string' && cleanText(v.text) !== cleanText(s.text)) {
      sections[s.id] = { text: v.text };
    }
  }
  if (Object.keys(sections).length) changes.sections = sections;
  return changes;
}

// The fields in `changes` that also changed in the note between `opened` (the form
// the editor started from) and `fresh` (the note as it is now). Saving over them
// would drop someone else's edit, so the editor stops and says so.
export function conflictingFields(opened, fresh, changes) {
  const fields = [];
  if (changes.category !== undefined && fresh.category !== opened.category) fields.push('Category');
  if (changes.uses !== undefined && !sameSet(fresh.uses, opened.uses)) fields.push('Uses');
  if (changes.track !== undefined && fresh.track !== opened.track) fields.push('Track');
  for (const id of Object.keys(changes.sections || {})) {
    const a = opened.sections.find((s) => s.id === id);
    const b = fresh.sections.find((s) => s.id === id);
    if (!a || !b || cleanText(a.text) !== cleanText(b.text) || JSON.stringify(a.todos) !== JSON.stringify(b.todos)) {
      fields.push(id.replace(/#\d+$/, ''));
    }
  }
  return fields;
}

// The existing spelling when the input differs from a known category only in case or
// spaces, so the dashboard never shows "nostr" next to "Nostr".
export function matchCategory(input, known) {
  const clean = String(input == null ? '' : input).trim().replace(/\s+/g, ' ');
  const key = (s) => s.toLowerCase().replace(/\s+/g, '');
  return known.find((k) => key(k) === key(clean)) || clean;
}
