// Pure JSON output for the web dashboard: model → the data.json that site/app.js reads.
// It carries only what LATEST.md, INDEX.md, the note AUTO blocks and the to-do files
// (notes/TODO.md and notes/todo/) already publish: the site is public, and some of these repos
// are private. Item bodies never get here.

import { createHash } from 'node:crypto';
import {
  activeProjects, branchUrl, compareCategories, hasWork, IDLE_DAYS, issueGroups, STALE_DAYS,
} from './model.mjs';
import { TODO_FILE, todoNoteName } from './notes.mjs';

export const SITE_DATA_VERSION = 1;

// The files of the published site. `sources`: site/ as name → text. Every __BUILD__ in
// them becomes one id derived from the code, so a browser never pairs a cached app.js
// with a newer lib/notes.js (Pages caches each file for 10 minutes).
export function buildSiteFiles({ sources, notesSource, siteData }) {
  const hash = createHash('sha256');
  for (const [name, text] of [...sources].sort(([a], [b]) => a.localeCompare(b))) hash.update(`${name}\n${text}\n`);
  hash.update(notesSource);
  const id = hash.digest('hex').slice(0, 12);
  const files = new Map();
  for (const [name, text] of sources) files.set(name, text.replaceAll('__BUILD__', id));
  // .js, not .mjs: a module script needs a JavaScript MIME type from the server.
  files.set('lib/notes.js', notesSource);
  files.set('data.json', siteData);
  return files;
}

// `sync.mjs --site <dir>` writes into <dir>. Inside the checkout only the gitignored
// _site/ is allowed, because the workflow commits with `git add -A`; a folder above
// the checkout is refused too. Absolute paths.
export function siteDirProblem(root, dir) {
  const inside = (outer, inner) => inner === outer || inner.startsWith(outer.endsWith('/') ? outer : `${outer}/`);
  if (inside(dir, root)) return `--site ${dir} is the repo or a folder above it`;
  if (inside(root, dir) && !inside(`${root}/_site`, dir)) return `--site ${dir} is inside the repo; use _site or a folder outside it`;
  return null;
}

const TODO_HEADING = /^##+\s+(.*)$/;
const FOLDER_HEADING = /^#{1,6}\s+(.*)$/;
const CALLOUT = /^>\s?(?:\[![\w-]+\][+-]?\s*)?/;
// Folder files: a margin line right below an item that starts a new Markdown block (quote, numbered
// line, table row) is a line of text, not a continuation of the item.
const NEW_BLOCK = /^(?:>|\||\d+[.)]\s)/;
const TODO_ITEM = /^[-*+](?:\s+(?:\[([ xX])\](?:\s+|$))?(.*))?$/;
const TODO_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

// The words at the start of an item. Group: `Before merge:`, `After merge:`, `In development:`.
// Place: `Phone:`, `Computer:`, `On air:`. Any case; nothing else counts.
const TODO_GROUP = /^(before merge|after merge|in development):\s*/i;
const TODO_PLACE = /^(phone|computer|on air):\s*/i;
const GROUP_OF = { 'before merge': 'before', 'after merge': 'after', 'in development': 'dev' };
const PLACE_OF = { phone: 'phone', computer: 'computer', 'on air': 'air' };

// Group, then place, from the start of an item's text → { group, place, text } (keys left out when absent).
function todoPrefix(text) {
  const out = {};
  const g = TODO_GROUP.exec(text);
  if (g) {
    out.group = GROUP_OF[g[1].toLowerCase()];
    text = text.slice(g[0].length);
  }
  const p = TODO_PLACE.exec(text);
  if (p) {
    out.place = PLACE_OF[p[1].toLowerCase()];
    text = text.slice(p[0].length);
  }
  return { ...out, text };
}

// What counts as a reference in plain text (not in `code`, not in a link), first match at a
// position wins: a range `#537–#540` (en dash or hyphen), `owner/repo#N`, a bare `#N` that is
// not part of a word or path (so `#BowlAfterBowl` and `a/b#1` are not bare).
const TODO_REF = /(?<![\w/])#(\d+)[–-]#(\d+)\b|(?<![\w/.-])([\w.-]+\/[\w.-]+)#(\d+)[–-]#(\d+)\b|(?<![\w/.-])([\w.-]+\/[\w.-]+)#(\d+)\b|(?<![\w/])#(\d+)\b/g;
const TODO_CODE = /`[^`]*`/g;
const MAX_NUMBER = 2147483647; // Above this a number is not a reference: GitHub's GraphQL Int ends here.
const RANGE_MAX = 10; // A range of more numbers than this names only its two ends.

// Split plain text into parts; a reference becomes { text, ref: { repo, number } }, with no href.
// A bare #N needs `repo`; `owner/repo#N` always resolves. Pushes each ref into `refs`.
function refParts(text, repo, owner, refs) {
  const parts = [];
  let at = 0;
  const add = (r, number) => {
    if (!refs.some((x) => x.repo === r && x.number === number)) refs.push({ repo: r, number });
  };
  // The ends of a range: every number in it, or only the two ends when it holds more than RANGE_MAX.
  const rangeOf = (repoName, from, to, whole) => {
    const [a, b] = [Number(from), Number(to)];
    const numbers = b >= a && b - a < RANGE_MAX ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a, b];
    numbers.forEach((n) => add(repoName, n));
    const start = whole.indexOf('#'); // A slug sits before it; a bare range starts here.
    const end = whole.lastIndexOf('#');
    return [
      ...(start ? [{ text: whole.slice(0, start) }] : []),
      { text: whole.slice(start, start + from.length + 1), ref: { repo: repoName, number: a } },
      { text: whole.slice(start + from.length + 1, end) },
      { text: whole.slice(end), ref: { repo: repoName, number: b } },
    ];
  };
  const big = (...ns) => ns.some((n) => Number(n) > MAX_NUMBER);
  for (const m of text.matchAll(TODO_REF)) {
    const [whole, from, to, rangeSlug, slugFrom, slugTo, slug, slugNumber, bare] = m;
    let made;
    if (from !== undefined) {
      if (repo && owner && !big(from, to)) made = rangeOf(repo, from, to, whole);
    } else if (rangeSlug !== undefined) {
      if (!big(slugFrom, slugTo)) made = rangeOf(rangeSlug, slugFrom, slugTo, whole);
    } else if (slug !== undefined) {
      if (!big(slugNumber)) {
        add(slug, Number(slugNumber));
        made = [{ text: whole, ref: { repo: slug, number: Number(slugNumber) } }];
      }
    } else if (bare !== undefined && repo && owner && !big(bare)) {
      add(repo, Number(bare));
      made = [{ text: whole, ref: { repo, number: Number(bare) } }];
    }
    if (!made) continue;
    if (m.index > at) parts.push({ text: text.slice(at, m.index) });
    parts.push(...made);
    at = m.index + whole.length;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts;
}

// The text of an item → parts: links split out (kept as before), then in the rest, outside
// `code`, the references. `repo` is the Owner/name of the heading, or null.
function todoParts(text, repo, owner) {
  const raw = [];
  const refs = [];
  let at = 0;
  const plain = (chunk) => {
    let c = 0;
    for (const m of chunk.matchAll(TODO_CODE)) {
      raw.push(...refParts(chunk.slice(c, m.index), repo, owner, refs), { text: m[0] });
      c = m.index + m[0].length;
    }
    raw.push(...refParts(chunk.slice(c), repo, owner, refs));
  };
  for (const m of text.matchAll(TODO_LINK)) {
    if (m.index > at) plain(text.slice(at, m.index));
    raw.push({ text: m[1], href: m[2] });
    at = m.index + m[0].length;
  }
  if (at < text.length) plain(text.slice(at));
  // Neighbouring plain pieces are one part again.
  const parts = [];
  for (const p of raw) {
    const last = parts[parts.length - 1];
    if (last && !last.ref && !last.href && !p.ref && !p.href) last.text += p.text;
    else parts.push({ ...p });
  }
  return { parts, refs };
}

// notes/TODO.md → the To do list on the web page. A small reader, not a Markdown parser:
// `## ` headings, list items, lines of text and [links](url). Everything else stays plain
// text, and the page never reads it as HTML. The words above the first heading are for
// whoever edits the file, so only list items are kept from there: an item added in the
// wrong place must still show. A link stays as written; the page resolves a relative one
// against the file on GitHub and shows any link that is not http(s) as plain text. An
// item keeps its source `lines`, trimmed, so the page can find it and delete it from the
// file (`removeTodoItem` in notes.mjs). An item indented under another item gets `under`, the
// lines of that item. There is one level: deeper items sit under the same top item. A blank
// line, a heading or a line at the left margin ends the group.
//
// With `title` the text is one file of notes/todo/ (a note in Obsidian), named `title`. The repo
// is the part of the title before the first space, in any case. Nothing is dropped above the
// first heading. A heading of any level starts a section with the same title and repo, and
// its own `heading`; the group and place words in it are the defaults for the items below it.
// Only a line with a box is an item. A plain bullet at the left margin is a line of text, and
// an indented plain bullet under an item goes on with that item. A `> ` quote mark and a
// `[!callout]` marker are hidden in the text; the `lines` stay as written.
export function parseTodoList(text, { owner, repos = [], title } = {}) {
  const folder = title !== undefined;
  const repoOf = (name) => {
    const found = owner && repos.find((r) => r.toLowerCase() === name.trim().toLowerCase());
    return found ? `${owner}/${found}` : null;
  };
  const fileRepo = folder ? repoOf(title.split(' ')[0]) : null;
  let section = { title: folder ? title : '', entries: [], repo: fileRepo };
  const sections = [section];
  let aboveFirstHeading = !folder;
  let defaults = {}; // Group and place from the heading (folder files).
  let open = null; // The entry that a wrapped line continues.
  let top = null; // The item that an indented item sits under, and its indent.
  const shown = (line) => (folder ? line.replace(CALLOUT, '') : line);
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    const indent = raw.length - raw.trimStart().length;
    const heading = (folder ? FOLDER_HEADING : TODO_HEADING).exec(line);
    const item = TODO_ITEM.exec(line);
    const boxed = !folder || (item && item[1] !== undefined);
    if (!line) {
      open = null;
      top = null;
    } else if (heading) {
      if (folder) {
        const { text: rest, ...words } = todoPrefix(heading[1]);
        section = { title, entries: [], repo: fileRepo, headingLine: line };
        if (rest.trim()) section.heading = rest.trim();
        defaults = words;
      } else {
        section = { title: heading[1], entries: [], repo: repoOf(heading[1]), headingLine: line };
      }
      sections.push(section);
      aboveFirstHeading = false;
      open = null;
      top = null;
    } else if (item && boxed) {
      const { text: words, ...own } = todoPrefix(item[2] ?? '');
      const prefix = { ...defaults, ...own };
      // A line of only group or place words keeps them as its text, so it keeps its box.
      open = { type: 'item', done: /x/i.test(item[1] ?? ''), lines: [line], text: words.trim() ? words : (item[2] ?? '') };
      if (top && indent > top.indent) {
        // A sub-item has the group of its item, and its own place or else the item's.
        open.under = top.lines;
        if (top.group) open.group = top.group;
        if (own.place ?? top.place) open.place = own.place ?? top.place;
      } else {
        Object.assign(open, prefix);
        top = (item[2] ?? '').trim() ? { lines: open.lines, indent, group: prefix.group, place: prefix.place } : null;
      }
      section.entries.push(open);
    } else if (item && !(open && indent > 0)) {
      // Folder files: a plain bullet at the left margin is text.
      open = { type: 'text', text: shown(item[2] ?? '') };
      top = null;
      section.entries.push(open);
    } else if (open && !(folder && open.type === 'item' && !indent && NEW_BLOCK.test(line))) {
      const more = shown(item ? (item[2] ?? '') : line);
      if (more.trim()) open.text += ` ${more}`;
      open.lines?.push(line);
      if (!indent) top = null;
    } else if (!aboveFirstHeading) {
      open = { type: 'text', text: shown(line) };
      top = null;
      section.entries.push(open);
    }
  }
  return sections
    .map(({ title: name, heading, entries, repo, headingLine }) => ({
      title: name,
      ...(heading && { heading }),
      entries: entries
        .filter((e) => e.text.trim())
        .map(({ text: words, ...entry }) => {
          const { parts, refs } = todoParts(words.trim(), repo, owner);
          return { ...entry, ...(repo && { repo }), ...(headingLine && { headingLine }), ...(refs.length && { refs }), parts };
        }),
    }))
    .filter((s) => s.entries.length);
}

// The to-do files → sections: notes/TODO.md first (read as before), then each note of
// notes/todo/ by lower-case path. Any other path is ignored. Every entry carries its `file`.
export function parseTodoFiles(files, { owner, repos = [] } = {}) {
  const rank = (path) => (path === TODO_FILE ? '' : path.toLowerCase());
  return (files ?? [])
    .filter((f) => f.path === TODO_FILE || todoNoteName(f.path) !== null)
    .sort((a, b) => (rank(a.path) < rank(b.path) ? -1 : rank(a.path) > rank(b.path) ? 1 : 0))
    .flatMap(({ path, text }) => parseTodoList(text, { owner, repos, title: todoNoteName(path) ?? undefined })
      .map((s) => ({ ...s, entries: s.entries.map((e) => ({ ...e, file: path })) })));
}

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

// What INDEX.md shows for every repo, tracked or not.
const INDEX_FACTS = ['name', 'url', 'description', 'language', 'isFork', 'parent', 'isPrivate', 'category', 'track'];
const PR_FIELDS = ['number', 'title', 'url', 'isDraft', 'createdAt', 'mergeable', 'checks', 'author', 'for'];
const ISSUE_FIELDS = ['number', 'title', 'url', 'createdAt', 'author', 'comments', 'for'];
const ELSEWHERE_FIELDS = ['repo', 'kind', 'number', 'title', 'url', 'createdAt'];
const WATCH_FIELDS = ['repo', 'url', 'isPrivate', 'prsTotal', 'issuesTotal', 'issuesMine'];

const noteFileOf = (p) => p.noteFile ?? `${p.name}.md`;

function projectData(p, model) {
  const facts = { ...pick(p, INDEX_FACTS), noteFile: noteFileOf(p) };
  // An untracked project is listed so its Track can be switched back on, but its
  // work stays out, as it does on the dashboard.
  if (p.track === 'no') return facts;
  return {
    ...facts,
    stale: p.stale,
    prsTotal: p.prsTotal,
    issuesTotal: p.issuesTotal,
    prs: p.prs.map((pr) => pick(pr, PR_FIELDS)),
    issues: p.issues.map((i) => pick(i, ISSUE_FIELDS)),
    openedElsewhere: p.openedElsewhere.map((e) => pick(e, ELSEWHERE_FIELDS)),
    orphanBranches: p.orphanBranches.map((b) => ({ name: b.name, url: branchUrl(p, b.name) })),
    uses: p.uses.map((name) => {
      const used = model.index.get(name);
      return { name, prsTotal: used.prsTotal, issuesTotal: used.issuesTotal };
    }),
    usedBy: p.usedBy,
    watch: p.watch.map((w) => pick(w, WATCH_FIELDS)),
  };
}

export function renderSiteData(model, { generatedAt, generatedAtIso, degradedReason, problems, todoFiles }) {
  const tracked = model.projects.filter((p) => p.track !== 'no');
  const active = activeProjects(tracked);
  const rest = model.projects.filter((p) => !active.includes(p));
  const sum = (f) => tracked.reduce((n, p) => n + f(p), 0);
  const issues = issueGroups(tracked);

  const data = {
    version: SITE_DATA_VERSION,
    owner: model.owner,
    generatedAt,
    generatedAtIso,
    degradedReason: degradedReason || null,
    thresholds: { idleDays: IDLE_DAYS, staleDays: STALE_DAYS },
    todo: parseTodoFiles(todoFiles, { owner: model.owner, repos: model.projects.map((p) => p.name) }),
    totals: {
      prs: sum((p) => p.prsTotal),
      issues: sum((p) => p.issuesTotal),
      orphanBranches: sum((p) => p.orphanBranches.length),
      tracked: tracked.length,
      untracked: model.projects.length - tracked.length,
      active: tracked.filter(hasWork).length,
    },
    categories: [...new Set(model.projects.map((p) => p.category))].sort(compareCategories),
    repos: model.projects.map((p) => p.name),
    // Projects with open work in dashboard order, then the rest by name.
    projects: [...active, ...rest].map((p) => projectData(p, model)),
    readyIdle: model.readyIdle.map(({ project, pr, idleDays }) => ({ repo: project.name, number: pr.number, idleDays })),
    issues: {
      total: issues.total,
      shared: issues.shared.map((g) => ({
        title: g.title,
        items: g.issues.map((i) => ({ repo: i.repo, number: i.number, url: i.url })),
      })),
      byProject: issues.byProject.map((g) => ({ repo: g.project.name, numbers: g.issues.map((i) => i.number) })),
    },
    stale: model.stale.map((p) => ({ repo: p.name, pushedAt: p.pushedAt })),
    problems,
  };
  return `${JSON.stringify(data, null, 1)}\n`;
}
