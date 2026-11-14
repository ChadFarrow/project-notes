# To do list: one Obsidian note per repo

Design, 2026-11-14. Approved by Chad in plan form the same day. It builds on
`2026-11-13-todo-groups-design.md` (PR #24) and replaces Tasks 7–8 of that plan.

## Why

Chad finds the web dashboard's To do list "a lot to digest". He wants to work through it in
Obsidian: a folder with one note per repo, with boxes he ticks as he goes, like his note
`Boost Me Bitch - Playlist Tests.md` (candr vault). He uses Obsidian on the Mac mini, the iPhone
and the Linux laptop (which has iCloud), and Claude Code on both machines must read the same list.
He still wants the website.

## Decided by Chad

- The folder lives in the **project-notes vault** and **replaces `notes/TODO.md` as the one list**.
  The vault syncs both ways with this repo (`scripts/vault-sync.mjs`), so his ticks reach every
  Claude session on both machines.
- His BMB playlist note **moves into the folder** (it becomes public; he confirms at the move).
- No new sync job for the laptop: Obsidian there sees the iCloud vault, and Claude Code there reads
  the repo after a pull.

## Facts that shape the design

- Every path under `notes/` already syncs both ways as a free file, new and deleted files included
  (`zoneOf` in `scripts/lib/vault.mjs`; `listFiles` in `scripts/vault-sync.mjs` walks folders).
- The launchd `WatchPaths` (`scripts/com.chadfarrow.project-notes-vault.plist`) is not recursive: a
  tick in a subfolder waits for the 15-minute run unless the subfolder is listed.
- `notes/TODO.md` changes ~15 times a day. When a tick in the vault and a session edit clash, the
  repo wins and the tick goes to the vault's `conflicts/`. One file per repo makes clashes rarer.
- The current parser reads a plain `- text` bullet as an open item; drops everything above the first
  `##`; ignores `#` (H1) as a heading; and a `##` heading sets the repo. The BMB note uses H1, `##`
  section headings, plain link bullets, a `> [!warning]` callout, tab-indented tests and an
  `## Already works` record of `- [x]` lines.

## Design

### Files

1. **Folder `notes/todo/`.** One file per repo: `notes/todo/<repo>.md`, named exactly as on GitHub.
2. **A second file for the same repo** is `<repo> <anything>.md`; the repo is the part of the name
   before the first space, matched in any case (GitHub repo names contain no space). The BMB note
   becomes `notes/todo/boostmebitch - playlist tests.md`.
3. **A file whose name is no repo** (for example `Mac mini.md`) is still read: a section named after
   the file, with no repo; a bare `#N` in it stays text.
4. **Only files directly in `notes/todo/`** are read: no subfolder (a place to keep old notes off the
   page), no dotfile.
5. **`notes/TODO.md` stays** as the rules page. It is parsed exactly as today, so an item a session
   still writes there keeps showing.

### Parsing a folder file (`parseTodoList` with a `title`)

6. The section title is the file name without `.md`; the repo comes from the file name (decision 2).
7. **Nothing is dropped above the first heading** (that rule exists only for the rules header of
   `notes/TODO.md`).
8. **Headings** `#` to `######` inside a file keep the file's title, repo and file; each starts a new
   section object with a `heading` text (same `title`), and ends a group, as a heading does today.
9. **Heading words.** A heading may start with a group word and then a place word
   (`## Before merge: Phone: 1. The playlist maker (#538)`). Items under it that have no word of
   their own take them; an item's own word wins; sub-items inherit from their item as today. The
   words are removed from the `heading` text.
10. **Only a line with a box is an item.** A plain bullet at the left margin is a text line; an
    indented plain bullet under an open item continues that item (its line joins `lines`, so a
    delete removes it too).
11. **Callouts.** In text and continuation lines, a leading `>` and a `[!type]` marker are removed
    from the text shown; `lines` stay raw.
12. Tabs count as indentation (as today).

### Data

13. `parseTodoFiles(files, { owner, repos })` takes `[{ path, text }]`, keeps `notes/TODO.md` and
    valid folder files, orders `notes/TODO.md` first then folder files by lower-case path (the same
    order on macOS and Linux), and puts `file: <path>` on every entry. `undefined` or `[]` → `[]`.
14. No title, state, date or new URL enters `data.json`; the privacy test covers the folder text.

### Website

15. Each entry's `file` drives the delete: the Contents API path is the file's path with each
    segment `encodeURIComponent`-ed (a space becomes `%20`); only `notes/TODO.md` or a valid
    `notes/todo/<file>.md` is accepted. The commit message stays `To do, done: <item>`.
16. `todoKey` starts with the file, so equal lines in two files never collide in `pn:todoRemoved`;
    `todoTopOf` matches only within the same file; relative links resolve against the entry's file;
    the delete sheet names the file. Data without `file` (an old cached `data.json`) means
    `notes/TODO.md`.
17. A heading shows once, as a line above its items, inside its group.
18. **Ticks.** A ticked item with nothing open under it is hidden; a ticked sub-item is hidden; a
    ticked item that still has open tests stays, struck through, with those tests. The delete sheet
    still counts every sub-item, ticked ones too, because the delete removes them all.
19. The project filter lists one entry per file title, merges sections with the same title, counts
    only what shows, and drops titles with nothing to show.

### Sync and automation

20. `scripts/sync.mjs` reads `notes/TODO.md` plus `notes/todo/*.md` (not recursive).
21. `sync-all.yml` push paths add `notes/todo/**`.
22. The plist `WatchPaths` adds the vault's `notes/todo` folder (the agent is reinstalled after the
    migration).

### What a tick means (rule for sessions)

23. A tick in Obsidian is Chad's report that the line is done. The session that comes next acts on
    it (for example merges, or tells Claude's other work) and deletes the line. Sessions never tick
    a box for Chad; a session that finishes an item itself deletes the line. Lines under a record
    heading such as `Already works` are kept. A note with no open line and no record is deleted.

### Migration and rules (after this PR and PR #24 are merged and deployed)

24. Split each `## <repo>` section of `notes/TODO.md` byte for byte into `notes/todo/<repo>.md`
    (the `##` line is dropped; no H1), add only the group and place words, write the other account's
    `#25` as `SpencerPearson/small-group-scoop#25`, move the BMB note byte for byte (words on its
    `##` headings only), rewrite `notes/TODO.md` as the rules page, prove no item is lost, show Chad
    every file, push straight to `main`, then move the candr original to the Trash after his yes.
25. `vibe-kit/workspace.md` rule 11 points to the folder and the tick rule; rule 10 gets the phone
    rule. The laptop pulls vibe-kit.

## Anti-goals

- An item disappears (from the page or the file) during or after the move.
- A delete on the website changes another file, or the wrong line.
- A private detail or a title reaches the public repo or `data.json`.
- The BMB note gets hard to read in Obsidian.

## Known limits

- Obsidian frontmatter shows as text; `- [ ]` inside a code fence reads as an item (as today).
- A mistaken tick hides the line on the web; it is still in the file and in Obsidian.
- Two notes named `boostmebitch.md` exist in the vault (`projects/` and `notes/todo/`).
