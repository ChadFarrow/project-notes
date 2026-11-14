# To do folder (one note per repo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The sync and the web page read the To do list from `notes/todo/<repo>.md` files (plus the old `notes/TODO.md`), so Chad can work through it in Obsidian, one note per repo, and tick boxes as he goes.

**Architecture:** Pure helpers in `scripts/lib/notes.mjs` (shipped to the page) name and encode the files and hide finished lines; `parseTodoList` in `scripts/lib/site.mjs` gains a folder-file mode, and `parseTodoFiles` turns `[{ path, text }]` into sections whose entries carry `file`; the page deletes from the entry's own file. Stacked on PR #24 (`feat/todo-groups`).

**Tech Stack:** Plain ES modules, no dependencies, no build step; `node --test`; headless Chrome over CDP (`scripts/check-site.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-14-todo-folder-design.md`

## Global Constraints

- No npm dependencies, no build step, no `package.json`. CSP unchanged.
- `scripts/lib/notes.mjs` runs in the browser: no imports, no regex lookbehind.
- `data.json` gets no title, state, date or URL that the repo's markdown does not already contain; `file` holds a repo path only.
- An item's `lines` stay byte-exact as in its file; `removeTodoItem` is not changed.
- Every string from a file or GitHub reaches the DOM through `textContent` or a Text node (`h()`).
- Folder: `notes/todo/`; only files directly in it, ending `.md`, not starting with `.`. `notes/TODO.md` is still read, exactly as today, and comes first.
- Group words `Before merge:`, `After merge:`, `In development:`; place words `Phone:`, `Computer:`, `On air:` (PR #24).
- `node --test` bare (never `node --test test/`); every check of `node scripts/check-site.mjs` must pass — read the total it prints.

## Review Focus

1. A folder file named in another case than the repo (`command-center.md`) — `#N` still resolves to `ChadFarrow/Command-Center`. (Task 2)
2. The same line text in two files (`- [ ] Same words twice`) — deleting one leaves the other on the page, also after a reload. (Task 3)
3. A file name with spaces (`boostmebitch - playlist tests.md`) — the delete PUT goes to `notes/todo/boostmebitch%20-%20playlist%20tests.md` and nowhere else. (Task 3)
4. An item written into `notes/TODO.md` after the move — it still shows and deletes from that file. (Tasks 2, 3)
5. A heading with HTML in it (`<img onerror>`) — shown as text. (Task 3)

---

### Task 1: File helpers and hidden ticks (`scripts/lib/notes.mjs`)

**Files:** Modify `scripts/lib/notes.mjs`; Test `test/notes.test.mjs`

**Interfaces — Produces:**
- `export const TODO_FILE = 'notes/TODO.md'`
- `export function todoNoteName(path) → string | null` — the name without `.md` for `notes/todo/<name>.md` directly in the folder, not a dotfile; else `null`.
- `export function todoFileUrlPath(path) → string | null` — `path.split('/').map(encodeURIComponent).join('/')` for `TODO_FILE` or a valid note path; else `null`.
- `groupTodo(sections, view)` and `todoProjects(sections)` keep their signatures and return shapes, and now leave out finished lines: a ticked (`done`) item with no open sub-item is left out; a ticked sub-item is left out; a ticked item with an open sub-item stays with its open sub-items. Move the existing top/sub grouping loop (with its orphan rule) into a private helper `todoTops(entries) → [{ top, subs }]` that does this, and use it in both.
- `todoProjects` merges sections with the same `title`, counts the shown top items, and leaves out titles whose count is 0.

- [ ] **Step 1: Write the failing tests** in `test/notes.test.mjs`: `'todoNoteName names a note directly in notes/todo'` (`'notes/todo/boostmebitch - playlist tests.md'` → `'boostmebitch - playlist tests'`; `null` for `'notes/TODO.md'`, `'notes/other.md'`, `'notes/todo/sub/x.md'`, `'notes/todo/.x.md'`, `'notes/todo/x.txt'`, `'projects/a.md'`, `'../x'`); `'todoFileUrlPath encodes each segment and refuses other paths'` (`→ 'notes/todo/boostmebitch%20-%20playlist%20tests.md'`; `'notes/TODO.md'` unchanged; `null` for the same refused paths); `'groupTodo hides a ticked item with nothing open, and ticked sub-items'`; `'groupTodo keeps a ticked item that still has an open sub-item'`; `'todoProjects merges sections with one title and drops a count of 0'`.
- [ ] **Step 2: Run `node --test`.** Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the helpers and `todoTops` in `scripts/lib/notes.mjs`.
- [ ] **Step 4: Run `node --test`.** Expected: all pass. Existing `groupTodo`/`todoProjects` tests that use ticked items may need their expectation changed only where the spec now hides a finished line; say which in the report.
- [ ] **Step 5: Run `node scripts/check-site.mjs`.** Existing checks about a ticked item ("a ticked item … looks done") may now fail because the line is hidden: note them for Task 3; do not change check-site in this task.
- [ ] **Step 6: Commit** — `To do: name and encode folder notes; hide finished lines`.

### Task 2: Parse the folder (`scripts/lib/site.mjs`, sync wiring)

**Files:** Modify `scripts/lib/site.mjs`, `scripts/lib/render.mjs`, `scripts/sync.mjs`, `.github/workflows/sync-all.yml`; Test `test/site.test.mjs`

**Interfaces:**
- Consumes: `TODO_FILE`, `todoNoteName` (Task 1); existing `todoPrefix`, `repoOf`, `todoParts`, `TODO_ITEM`.
- Produces: `parseTodoList(text, { owner, repos = [], title } = {})` — without `title`, behaviour unchanged (every existing test passes untouched); with `title`, folder-file mode per spec decisions 6–12: repo from `title.split(' ')[0]` (any case); first section `{ title, entries }`; nothing dropped above the first heading; heading regex `/^#{1,6}\s+(.*)$/`; a heading starts a new section `{ title, heading, entries }` (keep `heading` only when not empty) with the same repo, resets the open item and top, and its group/place words (read with `todoPrefix`) become defaults for items below that have none; only a line with a box (`- [ ]`/`- [x]`) is an item; a left-margin plain bullet is a text entry; an indented plain bullet under an open item is a continuation (joins `lines` and the text); text and continuation lines are shown with `/^>\s?(?:\[![\w-]+\][+-]?\s*)?/` removed.
- Produces: `export function parseTodoFiles(files, { owner, repos = [] } = {}) → sections` — keeps `TODO_FILE` and paths where `todoNoteName(path) !== null`; order `TODO_FILE` first, then by lower-case path; `parseTodoList(text, { owner, repos, title: todoNoteName(path) ?? undefined })` (no `title` for `TODO_FILE`); every entry gets `file: path`; `undefined`/`[]` → `[]`.
- Produces: `renderSiteData(model, { …, todoFiles })` uses `parseTodoFiles`; `buildOutputs({ …, todoFiles })` (renamed from `todoText`); `scripts/sync.mjs` builds `todoFiles` from `notes/TODO.md` (if present) plus `notes/todo/*.md` (not recursive; skip if the folder is missing); `sync-all.yml` push paths add `'notes/todo/**'` next to `'notes/TODO.md'`.

- [ ] **Step 1: Write the failing tests** in `test/site.test.mjs` (add a fixture `TODO_FILES`, pass it to `run()`, and widen the privacy test's corpus to include every fixture file's text):
  - `'a folder file is one section named after the file, and its #N points to its repo'`
  - `'a second file for one repo takes the repo before the first space'` (`'app-one - playlist tests'` → repo `ChadFarrow/app-one`, title the full name)
  - `'a folder file named in another case still finds its repo'` (`'App-One.md'`)
  - `'a folder file whose name is no repo still shows, and its #N stays text'`
  - `'headings inside a folder file keep the title, repo and file, and end a group'` (an indented item right after a heading is not under the item above the heading)
  - `'heading words give their group and place to the items below that have none'` (an item's own word wins; a sub-item takes its item's; the words leave `heading`)
  - `'a folder file keeps the lines above its first heading'`
  - `'in a folder file a plain bullet is text, and an indented plain bullet continues its item'` (and `lines` include it)
  - `'callout markers are hidden and the lines stay raw'`
  - `'a BMB-shaped file parses, and every item deletes cleanly with removeTodoItem'` (H1, intro, link bullets, `> [!warning]` callout, `## …` sections, tab-indented tests, `## Already works` with `- [x]`; delete each item and sub-item from the source, check the rest stays)
  - `'notes/TODO.md still reads as before inside parseTodoFiles, with its file'`
  - `'parseTodoFiles orders notes/TODO.md first, then by lower-case path, and ignores other paths'` (input order shuffled; subfolder, dotfile, `notes/other.md` ignored; `undefined` and `[]` → `[]`)
  - Update `'site data carries the to-do list'` to compare with `parseTodoFiles(TODO_FILES, { owner: 'ChadFarrow', repos: data.repos })`, and `'the to-do list stays out of the generated markdown'` to cover the folder text.
- [ ] **Step 2: Run `node --test`.** Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the parser mode, `parseTodoFiles`, and the wiring.
- [ ] **Step 4: Run `node --test`.** Expected: all pass, the privacy test included.
- [ ] **Step 5: Commit** — `To do: read the folder notes/todo/, one note per repo`.

### Task 3: The page deletes from the right file, and shows headings

**Files:** Modify `site/app.js`, `site/style.css`; Test `scripts/check-site.mjs`

**Interfaces — Consumes:** `entry.file`, `section.heading` (Task 2); `TODO_FILE`, `todoFileUrlPath`, `groupTodo` hiding ticks (Task 1).

- [ ] **Step 1: Change the stand-in API and fixture in `scripts/check-site.mjs`.** Replace `api.todo` with a `Map` `api.todoFiles` (path → `{ text, sha }`), keeping `api.todo` as an alias of the `notes/TODO.md` entry so existing checks read the same; route `^/repos/ChadFarrow/project-notes/contents/(notes/(?:TODO\.md|todo/[^/]+))$` through `decodeURIComponent` (anything else → 404); record `path` in `todoPuts`. Keep `TODO_TEXT` as `notes/TODO.md`, and add three folder files to what `buildOutputs` gets as `todoFiles`: `notes/todo/svc-core.md` (a `- [ ] Before merge: Test #5` item with a `Phone:` sub-item, a line `- [ ] Same words twice`, a relative link `[note](../../projects/app-one.md)`); `notes/todo/app-one - playlist tests.md` (H1, an intro line, a plain link bullet, a `> [!warning] Beta is real` callout, `## Before merge: Phone: 1. The maker (#8), a long heading …` with items, a tab-indented sub-item with a ticked sibling, `- [ ] Same words twice`, `## Already works` with `- [x] It publishes`, and a heading containing `<img src=x onerror="window.__xss=1">`); `notes/todo/Mac mini.md` (one item containing `#3`).
- [ ] **Step 2: Adjust existing checks** only where the spec changed what shows: `todoItems` counts what `groupTodo(data.todo)` shows (import it from `./lib/notes.mjs`), so it also holds with `--host`/`--data`; "a ticked item looks done" becomes "a finished line is hidden" plus "a ticked item with an open test stays, struck through"; a check that tapped `A finished item` taps another fixture line. Change how checks find items, never what they check otherwise.
- [ ] **Step 3: Write the new checks** (they fail first): `'each folder note is a project in the filter, named after the file'`; `'#N in a folder note links that note’s repo, and #3 in Mac mini stays text'`; `'a heading shows once, without its words, and its items are in Before merge with the phone mark'`; `'a plain bullet shows as text with no box'`; `'a callout shows without its markers'`; `'a tab-indented test sits under its item'`; `'a ticked test and the Already works line are hidden'`; `'HTML in a heading stays text'`; `'a relative link in a folder note resolves against that note'`; `'deleting in a folder note PUTs only that file, without that line, and names the file'` (path `notes/todo/app-one%20-%20playlist%20tests.md`; `notes/TODO.md` keeps its sha); `'a test is deleted only from under its own item'`; `'the same words in two notes: deleting one leaves the other, also after a reload'`; on the phone: `'a long heading and a long note label wrap within 390 px'`.
- [ ] **Step 4: Run `node scripts/check-site.mjs`.** Expected: the new checks FAIL.
- [ ] **Step 5: Implement in `site/app.js`:** `todoLink(part, file)` with base `` `${REPO_URL}/blob/main/${todoFileUrlPath(file) ?? TODO_FILE}` ``; `todoParts(parts, file)` (pass `entry.file` from `todoRow` and from text lines in `todoPanel`); `todoKey = (entry) => [entry.file ?? TODO_FILE, ...(entry.under || []), ...(entry.lines || [])].join('\n')`; `todoTopOf` also requires the same `file`; `deleteTodoItem` uses `` `/repos/${REPO}/contents/${todoFileUrlPath(entry.file ?? TODO_FILE)}` `` for GET (`?ref=main`) and PUT, throws a `UserError` when the path is `null`, keeps the message and the 409/422 retry; remove `TODO_PATH`; `askRemoveTodo` names the file as text; `todoPanel` shows `h('p', { class: 'todo-heading', text: section.heading })` once when the section changes and has a heading. In `site/style.css`: `.todo-heading { margin: 8px 0 2px; color: var(--muted); font-weight: 600; overflow-wrap: anywhere; }`; let `.todo-repo` wrap (`white-space: normal; overflow-wrap: anywhere`).
- [ ] **Step 6: Run `node --test` and `node scripts/check-site.mjs`.** Expected: all pass; confirm no check-site Chrome is left.
- [ ] **Step 7: Commit** — `To do: delete from the note's own file; show headings`.

### Task 4: The vault watches the folder

**Files:** Modify `scripts/com.chadfarrow.project-notes-vault.plist`; Test `test/vault.test.mjs`, `test/vault-sync.test.mjs`

- [ ] **Step 1: Write the failing/added tests:** in `test/vault.test.mjs`, `zoneOf('notes/todo/boostmebitch - playlist tests.md') === 'free'` (it may already pass — then it guards the rule); in `test/vault-sync.test.mjs`, following its existing end-to-end pattern: `'a note made in notes/todo/ in the vault reaches the remote, and so does a tick in it'` (`notes/todo/app one.md` with `- [ ] Test it`, then `- [x] Test it`).
- [ ] **Step 2: Run `node --test`.**
- [ ] **Step 3: Add** `<string>…/project-notes/notes/todo</string>` to `WatchPaths` (same base path as the existing `notes` entry), and update the plist comment that lists the watched folders.
- [ ] **Step 4: Run `node --test`.** Expected: all pass. Do not install or reload the launchd agent (that happens after the migration).
- [ ] **Step 5: Commit** — `Vault: watch notes/todo/ so a tick syncs in about a minute`.

### Task 5: Docs and full run

**Files:** Modify `CLAUDE.md`, `README.md`

- [ ] **Step 1: Update `CLAUDE.md`:** the `notes/` bullets (the folder, the file-name rule, `notes/TODO.md` as the rules page that is still read, ticked lines hidden); Automation (push paths add `notes/todo/**`); the To do paragraphs (file = section, repo from the file name, headings and heading words, only boxed lines are items in a folder file, callouts, nothing dropped above the first heading in a folder file, `file` on entries, `todoKey` with the file, the sheet names the file); Data (the privacy test covers the folder); the vault section (`notes/todo` in `WatchPaths`; check `conflicts/` after a clash). Keep the rest as it is.
- [ ] **Step 2: `README.md`:** one sentence in the Obsidian part: the To do list is the folder `notes/todo/`, one note per repo; tick a box when it is done.
- [ ] **Step 3: Run `node --test` and `node scripts/check-site.mjs --shots <job tmp>/shots`.** Expected: all pass. Look at the desktop and phone shots of the To do list with the playlist note.
- [ ] **Step 4: Commit** — `Document the To do folder`.

Push, PR (base `feat/todo-groups`), the migration of the live list and the vibe-kit rule are the controller's, after the final review and Chad's merges (see the approved plan, Parts B and C).
