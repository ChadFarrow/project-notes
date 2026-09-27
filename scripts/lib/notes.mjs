// Pure text handling for the per-project notes in projects/<repo>.md.
//
// A note has a hand-written part and one generated block between the AUTO markers.
// The sync must never change a byte outside that block, so every function here is
// conservative: when the markers are not in a clean START…END pair, the note is
// left alone and the caller reports a problem instead of guessing.

export const AUTO_START = '<!-- AUTO:START -->';
export const AUTO_END = '<!-- AUTO:END -->';

const MARKER = /^\s*<!--\s*AUTO:(START|END)\s*-->\s*$/;
const HEADER_KEY = /^\*\*(Category|Uses|Track):\*\*\s*(.*?)\s*$/i;
const TRACK_VALUES = new Set(['yes', 'no', 'upstream']);

// Reads the header lines the sync understands. Only lines above the first `## `
// heading (or the AUTO block) count, so a `**Track:**` inside Notes is just prose.
export function parseHeader(text) {
  const header = { category: 'Uncategorized', uses: [], track: 'yes', problems: [] };
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('## ') || MARKER.test(line)) break;
    const m = HEADER_KEY.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2];
    if (key === 'category') {
      if (value) header.category = value;
    } else if (key === 'uses') {
      header.uses = value
        .split(/[,\s]+/)
        .map((s) => s.replace(/`/g, '').replace(/^(https:\/\/github\.com\/)?ChadFarrow\//i, ''))
        .filter(Boolean);
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
  const markers = [];
  lines.forEach((line, i) => {
    const m = MARKER.exec(line);
    if (m) markers.push({ kind: m[1], i });
  });
  const block = body.replace(/\n+$/, '');

  let out;
  if (markers.length === 0) {
    const base = text.replace(/\n+$/, '');
    out = `${base ? `${base}\n\n` : ''}${AUTO_START}\n${block}\n${AUTO_END}\n`;
  } else if (
    markers.length === 2 && markers[0].kind === 'START' && markers[1].kind === 'END'
  ) {
    const [start, end] = markers;
    out = [...lines.slice(0, start.i + 1), block, ...lines.slice(end.i)].join('\n');
  } else {
    const found = markers.map((m) => `${m.kind} on line ${m.i + 1}`).join(', ');
    return { error: `AUTO markers are not one START followed by one END (${found}); file left unchanged` };
  }
  return { text: crlf ? out.replace(/\n/g, '\r\n') : out };
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
