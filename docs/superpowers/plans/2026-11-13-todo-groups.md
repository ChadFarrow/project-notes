# To do list groups, places, PR links and titles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The To do list on notes.podtards.com shows items in three groups with a place mark on each test, filters by project and place, links every `#N`, and — in Chad's browser only — shows each PR's title, state and an out-of-date mark.

**Architecture:** `parseTodoList` (sync time, pure) reads the group and place words and the references into `data.json` (no titles, no new URLs). Pure helpers in `scripts/lib/notes.mjs` (shipped to the page as `lib/notes.js`, so `node --test` covers them) group and filter the list, build the GraphQL query, read its answer, and decide the marks. `site/app.js` renders it, keeps the filters, and fetches titles with a second, read-only token.

**Tech Stack:** Plain ES modules, no dependencies, no build step; `node --test`; headless Chrome over CDP (`scripts/check-site.mjs`); GitHub GraphQL API.

**Spec:** `docs/superpowers/specs/2026-11-13-todo-groups-design.md`

## Global Constraints

- No npm dependencies, no build step, no `package.json`.
- Every string from GitHub reaches the page through `textContent` or a Text node (`h()`), never as HTML.
- `data.json` gets no title, state, date or URL that the repo's markdown does not already contain (`test/site.test.mjs`, "every URL in the site data is already public").
- The CSP in `site/index.html` stays as it is (`connect-src 'self' https://api.github.com`).
- An item's `lines` stay exactly as in the file; `removeTodoItem` is not changed.
- Group words: `Before merge:`, `After merge:`, `In development:`. Place words: `Phone:`, `Computer:`, `On air:`. Case does not matter. No other word counts.
- Data values: `group` ∈ `before | after | dev`; `place` ∈ `phone | computer | air`. A key with no value is left out of the entry, as `under` is today.
- Range expansion: at most 10 numbers; above 10, only the two ends.
- After merge warning: more than 14 days since the newest merge.
- `localStorage` keys: `pn:todoView` (filters), `pn:readToken` (read token), always through `store`.
- `node --test` must be run bare (never `node --test test/`).
- Every check of `node scripts/check-site.mjs` must pass; read the total the run prints.
- Copy follows the page's plain style: short sentences, active voice.

## Review Focus

1. A heading whose case differs from the repo (`## command-center`) — references still resolve, to the repo's real name. (Task 1)
2. A group or place word on a wrapped second line of an item — it is text, not a word that counts. (Task 1)
3. The same PR named twice on one line (`PR #540 … before #540 merges`) — one title line, not two. (Task 1)
4. A GraphQL answer where one repo is out of the token's reach (`data.rN: null` plus `errors`) — the other titles still show. (Task 5)
5. Deleting a top item while the Where filter hides some of its tests — the sheet still counts and deletes every test under it. (Task 3)

---

### Task 1: Parse groups, places and references

**Files:**
- Modify: `scripts/lib/site.mjs` (`todoParts`, `parseTodoList`, `renderSiteData`)
- Test: `test/site.test.mjs`

**Interfaces:**
- Produces: `parseTodoList(text: string, opts?: { owner?: string, repos?: string[] }) → Array<{ title, entries }>`. Each entry may now also carry `group`, `place`, `repo: 'Owner/name'`, `refs: Array<{ repo, number }>` (every number the line names, ranges expanded, no duplicates, in file order). A part may carry `ref: { repo, number }`. Without `opts`, bare `#N` stays text; `owner/repo#N` always resolves.
- Produces: `renderSiteData` calls `parseTodoList(todoText, { owner: model.owner, repos: model.projects.map((p) => p.name) })`.

- [ ] **Step 1: Write the failing tests** in `test/site.test.mjs`, with `const OPTS = { owner: 'ChadFarrow', repos: ['app-one', 'Command-Center'] }`:
  - `'the to-do list reads the group and the place words, and drops them from the text'`: `'## app-one\n- [ ] Before merge: Phone: Test it\n- [ ] after merge: Later\n- [ ] In development: Ask\n- [ ] No word\n'` → groups `before, after, dev, (none)`; first entry `place: 'phone'`; `parts[0].text === 'Test it'`; `lines[0] === '- [ ] Before merge: Phone: Test it'`.
  - `'a sub-item takes the group and the place of its item, and its own place wins'`: `'## app-one\n- [ ] Before merge: Phone: Top\n  - [ ] One\n  - [ ] Computer: Two\n  - [ ] After merge: Three\n'` → subs: `{group:'before', place:'phone'}`, `{group:'before', place:'computer'}`, `{group:'before', place:'phone'}` with text `Three`.
  - `'only the six words count, at the start of the item'`: `'Phone without a colon'`, `'Before merging: x'`, and `'- [ ] Start\n  Phone: wrapped'` → no `place`, no `group`.
  - `'a bare #N points to the repo of the heading'`: `'## app-one\n- [ ] Test PR #541 (#505)\n'` → `refs` `[{repo:'ChadFarrow/app-one', number:541}, {…505}]`; parts contain `{ text: '#541', ref: { repo: 'ChadFarrow/app-one', number: 541 } }`.
  - `'a heading matches its repo in any case'`: `'## command-center\n- [ ] PR #28\n'` → `repo: 'ChadFarrow/Command-Center'`, ref repo the same.
  - `'owner/repo#N points to that repo under any heading'`: `'## Laptop\n- [ ] SpencerPearson/small-group-scoop#25 waits\n'` → one ref `{ repo: 'SpencerPearson/small-group-scoop', number: 25 }`, part text `SpencerPearson/small-group-scoop#25`; no `repo` on the entry.
  - `'a range names every number, and only the ends above 10'`: `'#537–#540'` → refs 537, 538, 539, 540, parts `#537` (ref), `–`, `#540` (ref); `'#1-#20'` → refs 1, 20.
  - `'the same number twice on a line is one reference'`: `'PR #540 … before #540 merges'` → `refs.length === 1`.
  - `'no reference inside code, inside a link, in a channel name, or under an unknown heading'`: `` '## app-one\n- [ ] `#12` [PR #7](https://x/7) #BowlAfterBowl\n## Laptop\n- [ ] #9\n' `` → no `refs` on either entry.
  - Update `'site data carries the to-do list'` to compare with `parseTodoList(TODO_TEXT, { owner: 'ChadFarrow', repos: data.repos })`, and add `'- [ ] Before merge: Test PR #8'` to `TODO_TEXT`; assert that entry has `refs: [{ repo: 'ChadFarrow/app-one', number: 8 }]` and that the privacy test still passes.
- [ ] **Step 2: Run `node --test`.** Expected: the new tests FAIL; the old ones pass.
- [ ] **Step 3: Implement in `scripts/lib/site.mjs`.** Read the prefixes from the joined words of a top item (group, then place) and of a sub-item (an ignored group word is dropped, then place); give a sub-item its top item's group and, when it has none, its place. In `todoParts`, scan only the text outside `` `…` `` spans and outside links, in this order per piece: range `#A[–-]#B`, `owner/repo#N`, bare `(^|[^\w/])#(\d+)\b`. Keep the existing link split. Leave keys out when empty.
- [ ] **Step 4: Run `node --test`.** Expected: all pass, 0 fail.
- [ ] **Step 5: Commit** — `git commit -m "To do: read group and place words and PR references"`.

### Task 2: Show the groups, the repo labels, the place marks and the links

**Files:**
- Modify: `scripts/lib/notes.mjs` (new pure helpers), `site/app.js` (`todoSection`, `todoRow`, `todoParts`), `site/style.css`
- Test: `test/notes.test.mjs`, `scripts/check-site.mjs` (fixture `TODO_TEXT` and checks)

**Interfaces:**
- Consumes: the entry fields of Task 1.
- Produces (in `notes.mjs`): `TODO_GROUPS = [['before', 'Before merge'], ['after', 'After merge'], ['dev', 'In development'], [null, 'Not sorted']]`; `TODO_PLACES = { phone: ['📱', 'Phone'], computer: ['💻', 'Computer'], air: ['🎙', 'On air'] }`; `groupTodo(sections, view = { project: 'all', place: 'all' }) → Array<{ key, title, items: Array<{ top, subs, section }> }>`. The first three groups always come back (maybe empty); Not sorted only when it has items. A text entry is an item of Not sorted with no subs. `todoRefUrl(ref) → 'https://github.com/<repo>/issues/<number>'`.

- [ ] **Step 1: Write the failing tests** in `test/notes.test.mjs`: `'groupTodo puts items in the three groups in order, and Not sorted last'`; `'groupTodo keeps the file order inside a group'`; `'groupTodo puts a text line under Not sorted'`; `'groupTodo leaves Not sorted out when it is empty'`; `'todoRefUrl links the issue path'` (`todoRefUrl({ repo: 'A/b', number: 3 }) === 'https://github.com/A/b/issues/3'`).
- [ ] **Step 2: Run `node --test`.** Expected: FAIL.
- [ ] **Step 3: Implement the helpers in `scripts/lib/notes.mjs`.**
- [ ] **Step 4: Run `node --test`.** Expected: all pass.
- [ ] **Step 5: Render in `site/app.js`.** `todoSection` draws one block per group with a `.group-title` of `` `${title} (${items.length})` `` (`None.` under an empty group). `todoRow` adds a `.todo-repo` label (the section title) to a top item, and a `.todo-place` mark (`TODO_PLACES` icon, word as visible text) before the words of any item with a place. `todoParts` renders a part with `ref` as `h('a', { href: todoRefUrl(part.ref) }, part.text)`. Style the label, the mark and the empty line in `site/style.css` with the existing tokens.
- [ ] **Step 6: Update the fixture `TODO_TEXT` in `scripts/check-site.mjs`.** Keep every existing line and its words; add group words (`Before merge:` on `Test PR #8`, `After merge:` on `Test PR #9`, `In development:` on `Delete a folder.`), place words on the three subs of `Test PR #8` (`Phone:`, `Phone:`, `Computer:`), and one new line `- [ ] Before merge: PRs #11–#13 and Upstream/thing#4`. Leave the other items without a group word (they land in Not sorted).
- [ ] **Step 7: Update and add checks in `scripts/check-site.mjs`.** Replace `'the to-do list shows the sections in order'` with `'the to-do list shows the groups in order'` (exact titles with counts, Not sorted last). Add: `'each top item names its repo'`; `'a test shows where to do it'` (📱 Phone on both iPhone/Pixel subs, 💻 Computer on the long one); `'#N links to the issue path of the heading repo'` (`a[href="https://github.com/ChadFarrow/app-one/issues/8"]`); `'a range links both ends'` (#11 and #13); `'owner/repo#N links that repo'`. Where an existing check depends on the old order (for example "the first box"), change only how it finds its item, never what it checks.
- [ ] **Step 8: Run `node --test` and `node scripts/check-site.mjs`.** Expected: `N of N checks passed`.
- [ ] **Step 9: Commit** — `git commit -m "To do: show the groups, repo labels, place marks and PR links"`.

### Task 3: Filter by project and by place

**Files:**
- Modify: `scripts/lib/notes.mjs` (`groupTodo` filters, `todoProjects`), `site/app.js` (state, controls in `todoSection`), `site/style.css`
- Test: `test/notes.test.mjs`, `scripts/check-site.mjs`

**Interfaces:**
- Produces: `groupTodo(sections, { project, place })` filters: `project` = a section title or `'all'`; `place` = `'phone' | 'computer' | 'air' | 'all'`. A top item stays when it or one of its subs has the place; only subs with that place stay. Text entries hide under a place filter. `todoProjects(sections) → Array<{ title, count }>` (count of top items).
- Produces (in `app.js`): `const todoView = { project: 'all', place: 'all', ...store.get('todoView', {}) }`; `saveTodoView()`; two selects `#todo-project` and `#todo-place` in the To do header.

- [ ] **Step 1: Write the failing tests:** `'groupTodo shows one project only'`; `'groupTodo with a place keeps an item whose test has it, and hides the other tests'`; `'groupTodo with a place keeps an item whose own place matches, with its tests of that place'`; `'groupTodo hides text lines under a place filter'`; `'todoProjects counts the top items of each section'`.
- [ ] **Step 2: Run `node --test`.** Expected: FAIL.
- [ ] **Step 3: Implement the filters and `todoProjects`.**
- [ ] **Step 4: Run `node --test`.** Expected: all pass.
- [ ] **Step 5: Add the controls in `site/app.js`.** Project options: `All projects`, then `` `${title} (${count})` ``. Place options: `All places`, `📱 Phone`, `💻 Computer`, `🎙 On air`. On change: save and redraw only `#todo-list`. On start, a stored project that is no longer a section falls back to `all`. The `.todo-repo` label hides when one project is chosen.
- [ ] **Step 6: Add checks:** `'the project filter shows one project, without repo labels'`; `'the place filter shows only phone tests'`; `'the to-do filters are remembered after a reload'`; `'a stored project that is gone falls back to all'` (set `pn:todoView` to `{"project":"gone"}`, reload); `'deleting an item under a place filter still counts every test under it'` (Where = Phone, press the box of `Test PR #8`: the sheet names 3 sub-items). The existing phone check "every control on the board is at least 24 by 24 px" covers the selects.
- [ ] **Step 7: Run `node --test` and `node scripts/check-site.mjs`.** Expected: all pass.
- [ ] **Step 8: Commit** — `git commit -m "To do: filter by project and by place"`.

### Task 4: The read token

**Files:**
- Modify: `site/app.js` (`openTokenDialog`, new `checkReadToken`), `scripts/check-site.mjs` (stand-in API, checks)

**Interfaces:**
- Produces: `let readToken = store.get('readToken', '')`; `checkReadToken(value: string) → Promise<string|null>` (null = accepted, else the reason to show); `NEW_READ_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new?name=project-notes+titles&description=Reads+PR+and+issue+titles+for+notes.podtards.com&target_name=ChadFarrow&expires_in=90&issues=read&pull_requests=read'`.

- [ ] **Step 1: Confirm the probe answers on real GitHub** (the push guard asks Chad for each `gh api` write; each request is refused either way and changes nothing). Run, with the `gh` CLI token, which can write:
  - `gh api -X POST repos/ChadFarrow/project-notes/issues --input - <<< '{}'` → expect HTTP 422 (or 410 if issues are off: then probe another of Chad's public repos with issues on, and note which).
  - `gh api -X POST repos/ChadFarrow/project-notes/pulls --input - <<< '{}'` → expect 422.
  - `gh api graphql -f query='{ viewer { repositories(privacy: PRIVATE, first: 1) { totalCount } } }'` → expect `totalCount > 0`.
  Write the observed codes into a comment above `checkReadToken`. If a code differs, use what GitHub answers; if a probe gives no clear split, leave it out and say so in the PR.
- [ ] **Step 2: Extend the stand-in API.** Add flags `issues`, `pulls`, `private` to every entry of `TOKENS` (the existing three: all `false`, `private: true`), and three tokens: `'read-token'` (read only, `private: true`), `'read-public-token'` (`private: false`), `'read-write-token'` (`write: true, issues: true, pulls: true, private: true`). Answer `POST /repos/${REPO}/issues` and `/pulls` with 422 when the flag is set, else 403; answer `POST /graphql` for a `viewer` query with `totalCount` 3 or 0.
- [ ] **Step 3: Write the failing checks:** `'the token sheet has a part for the read token'`; `'a read token that can write is refused'` (`read-write-token`, `pn:readToken` stays empty); `'a read token without All repositories is refused'` (`read-public-token`, message names "All repositories"); `'a good read token is kept'` (`read-token`, `pn:readToken` set); `'the read token can be forgotten'`; `'the editing token is untouched by the read token'`.
- [ ] **Step 4: Run `node scripts/check-site.mjs`.** Expected: the new checks FAIL.
- [ ] **Step 5: Implement.** A second part of the token sheet titled "Titles of PRs and issues": one paragraph on why it is a separate token, steps that name "All repositories" and the two read permissions, field `#t-read-token`, its own Check and save and Forget buttons. `checkReadToken` runs, in order: the `viewer` count (0 → "Pick All repositories."), the README PUT probe (409 → "This token can change files. Make a read-only one."), the issues and pulls probes (validation status → "This token can change issues or PRs. Make a read-only one."). A 401 at any step → "GitHub refused this token."
- [ ] **Step 6: Run `node --test` and `node scripts/check-site.mjs`.** Expected: all pass.
- [ ] **Step 7: Commit** — `git commit -m "To do: a second, read-only token for titles"`.

### Task 5: Titles and out-of-date marks

**Files:**
- Modify: `scripts/lib/notes.mjs` (query, reader, marks), `site/app.js` (fetch, render), `site/style.css`
- Test: `test/notes.test.mjs`, `scripts/check-site.mjs`

**Interfaces:**
- Consumes: `entry.refs`, `entry.group`, `readToken`, `gh(path, init, auth)`.
- Produces (in `notes.mjs`): `todoTitleQuery(refs) → { query: string, aliases: Array<{ repoAlias, numberAlias, repo, number }> }` (one `repository(owner, name)` per repo, one `issueOrPullRequest(number)` per number, asking `__typename`, `title`, `state`, and for a PR `isDraft`, `mergedAt`); `readTodoTitles(json, aliases) → Map<'owner/name#N', { kind: 'pr'|'issue', title, state: 'open'|'draft'|'merged'|'closed', mergedAt }>` (a null repo or number is left out); `todoMark(entry, titles, nowMs) → null | { tone: 'quiet'|'wait', text }`. It counts only the line's refs that `titles` has as a PR; a ref the token cannot see, or an issue, is ignored, and a line with no such PR gets `null`.
- Mark copy: one PR — `` `PR #${n} is merged: is this still needed?` `` (or `closed`); several — `` `PRs ${list} are merged or closed: is this still needed?` `` with `list` like `#537, #538 and #540`; after merge — `merged today`, `merged 1 day ago`, `` `merged ${d} days ago` ``, tone `wait` when `d > 14`, else `quiet`.

- [ ] **Step 1: Write the failing tests:** `'todoTitleQuery asks once per repo and once per number'`; `'readTodoTitles reads PRs and issues, and skips a repo the token cannot see'` (`data.r1: null` plus `errors`); `'readTodoTitles calls an open draft PR draft'`; `'todoMark marks a before-merge line when every PR on it is merged or closed'`; `'todoMark leaves a before-merge line alone when only some PRs are merged'`; `'todoMark ignores issues'`; `'todoMark gives an after-merge line its age, and the warning after 14 days'` (`nowMs` fixed; 14 days → `quiet`, 15 → `wait`); `'todoMark gives nothing to a line with no PR'`.
- [ ] **Step 2: Run `node --test`.** Expected: FAIL.
- [ ] **Step 3: Implement the three helpers.**
- [ ] **Step 4: Run `node --test`.** Expected: all pass.
- [ ] **Step 5: Fetch and render in `site/app.js`.** After the first render, when `readToken` is set and the list has refs: one `POST /graphql` (split into requests of at most 100 numbers), store the map in `todoTitles`, redraw `#todo-list`. Under each line with refs, one `.todo-ref` line per ref the map has: `#N`, the title, ` · ` and the state word. The mark (`.todo-mark.quiet|.wait`) sits after the words of its line. A 401 → one `.todo-note` line above the list, "GitHub refused the read token.", with a button that opens the token sheet; any other failure → "Titles did not load (…)." Neither blocks the list or a box. A sub-item hidden by the place filter draws nothing.
- [ ] **Step 6: Extend the stand-in API** with `api.titles`, keyed `ChadFarrow/app-one#8` (open draft PR), `#9` (merged 20 days before the run), `#11`–`#13` (merged, merged, closed), and no entry for `Upstream/thing` (answer `null` with an `errors` item); it answers the alias query for `read-token`.
- [ ] **Step 7: Add checks:** `'with a read token, each PR shows its title and state'`; `'without a read token there are no title lines'`; `'a PR the token cannot see keeps its link and gets no title'`; `'a before-merge line whose PRs all merged or closed is marked'` (#11–#13 line); `'an after-merge line shows its age with the warning colour after 14 days'` (#9); `'a refused read token shows one line and the list still works'` (`api.revoked`); `'no title reaches data.json'` (the fixture titles are absent from the served `data.json`).
- [ ] **Step 8: Run `node --test` and `node scripts/check-site.mjs`.** Expected: all pass.
- [ ] **Step 9: Commit** — `git commit -m "To do: titles, states and out-of-date marks with the read token"`.

### Task 6: Docs, full test run, and the PR

**Files:**
- Modify: `CLAUDE.md` (the To do paragraph and the token paragraphs under "The web dashboard"; the `notes/TODO.md` bullet in the file list), `README.md` (one sentence on the groups and the read token, if its To do text no longer fits)

- [ ] **Step 1: Update `CLAUDE.md`**: the group and place words, the reference forms, the new data fields, the filters and `pn:todoView`, the read token (why it is separate, `pn:readToken`, the probes and the codes found in Task 4), and the rule that no title goes into `data.json`.
- [ ] **Step 2: Run `node --test` and `node scripts/check-site.mjs --shots "$CLAUDE_JOB_DIR/tmp/shots"`.** Expected: all pass. Look at the desktop and phone shots of the To do list.
- [ ] **Step 3: Commit, then push the branch and open the PR** (`gh pr create`; the push guard asks Chad). The body lists what the browser checks verified, and what they did not, with the reason: titles with a real token, Chad's iPhone in Safari, and the live page. Chad merges.

### Task 7 (after the merge and the deploy): Move the list to the new format

**Files:**
- Modify: `notes/TODO.md` (header and every item) — straight to `main`, in a worktree, pull first.

- [ ] **Step 1: Confirm the deploy**: the live `app.js` contains `todoView` (`curl -s https://notes.podtards.com/app.js | grep -c todoView` ≥ 1).
- [ ] **Step 2: Rewrite the header** with these paragraphs after the existing first one (keep the first and the "Give one PR one line" paragraph as they are):

```
Put each item under the heading of its repo. Start each item with its group: `Before merge:` (a
PR needs it before Chad merges), `After merge:` (a follow-up check on merged or deployed work), or
`In development:` (work in progress, a decision, a question to someone). Start each test with where
Chad does it: `Phone:`, `Computer:` or `On air:`. A test without one takes the place of its item.

Write a PR or an issue of the heading's repo as `#N`, and one of another repo as `owner/repo#N`.
The web page links each one and shows its title.

Add a `Phone:` test only for what Chrome with phone emulation cannot test: iOS audio, the lock
screen, the Home Screen app, a real touch on iOS, the Zapstore app, or an Android signer such as
Amber. Name that gap in the line. For boostmebitch, put the phone tests of open PRs under one
`Before merge: Phone pass on beta` item, one test for each PR.
```

- [ ] **Step 3: Add the words to every item** — only words (Chad's choice): a group word on each top item, a place word where the line clearly has one. Drop, merge or reword nothing. Change a bare `#N` of another account's repo to `owner/repo#N` (small-group-scoop PR #25 → `SpencerPearson/small-group-scoop#25`; the fork's PR #1 → `ChadFarrow/small-group-scoop#1`).
- [ ] **Step 4: Check the result**: run the parser on the new file and print each item's group, place and refs; no top item is Not sorted.
- [ ] **Step 5: Show Chad the full new file and wait for his yes.** Then commit, pull again, and push to `main` (the guard asks him).

### Task 8: The workspace rule (vibe-kit, a second repo)

**Files:**
- Modify: `~/Vibe/vibe-kit/workspace.md` (rules 10 and 11)

- [ ] **Step 1: Read `~/Vibe/vibe-kit/CLAUDE.md`, fetch, and follow its way of changing a rule.**
- [ ] **Step 2: Add to rule 11:** "Follow the format in the header of that file: a group word on each item, a place word on each test, `#N` for a PR." Add to rule 10: "A real-phone test goes on the To do list only for what phone emulation cannot test (see the header of `notes/TODO.md`)."
- [ ] **Step 3: Commit and push** (the guard asks Chad). Tell him to `git pull` vibe-kit on the laptop.

### Task 9: The live check with Chad's read token

- [ ] **Step 1: Ask Chad to make the read token** with the sheet's link, choosing "All repositories", and to paste it on the live page.
- [ ] **Step 2: Ask him what he sees**: titles under a Command-Center or thelounge-candr item (private repos), and no warning line.
- [ ] **Step 3: Confirm that the live `data.json` has no title**: `curl -s https://notes.podtards.com/data.json | grep -c "Trim an ISO"` → `0`.
- [ ] **Step 4: Add a line to `notes/TODO.md` for any test only Chad can do** (his iPhone in Safari), in the new format.
