# To do list: groups, places, PR links and titles

Design, 2026-11-13. Chad and Claude worked it out in one conversation; this file writes it down.

## Why

`notes/TODO.md` holds what Chad must finish himself, mostly tests. On 2026-11-12 it had 21 items
and 35 tests, and Chad found it hard to follow:

- He forgets what a PR on the list is for. The list says "PR #541" and nothing more.
- Three kinds of item are mixed under each repo: tests a PR needs **before** Chad merges it,
  follow-up checks **after** a merge, and work still **in development** (decisions, questions to
  other people). A test that holds up a merge looks the same as one that can wait a week.
- He cannot always test at once, and he must not miss an important test.
- He does not know which tests need the phone and which need the computer.
- Many items are phone checks. Not every small feature needs one.
- He wants to sit down with one project and do all of its tests, instead of jumping between
  projects.

In the same session, four items were already out of date: their PR had merged or the event had
happened, and nothing on the list showed it.

## Goals

1. Each `#N` on the list is a link to its PR or issue on GitHub.
2. In Chad's browser, each PR or issue on the list shows its title and its state.
3. The page shows the list in three groups: Before merge, After merge, In development.
4. Each test shows where Chad does it: Phone, Computer, or On air (the live show).
5. Chad can show one project only, and one place only. The page remembers the choice.
6. The page marks an item that has gone out of date: a before-merge item whose PR merged or
   closed, and an after-merge item that has waited more than 14 days since its merge.
7. A written rule decides when a session adds a phone check, so small features stop adding them.

## Non-goals

- No reminders or notifications.
- No change to the `## TODOs` sections of the project notes, or to their editor on the page.
- No titles in `data.json` or in any other public file.
- No guess of the group from the PR state. The group is written in the file.
- No titles for repos that another account owns (`SpencerPearson/small-group-scoop`). They get a
  link only.
- No new way to add or edit items on the page. Delete stays as it is.

## Anti-goals (failure, even if it works)

- A private repo's PR title reaches a public file or `data.json`. The page is public; Command-Center,
  thelounge-candr and both small-group-scoop repos are private.
- The token that reads titles can write anything.
- An item disappears from the page because it has no group word or an unknown one.
- The delete box stops working, or deletes the wrong lines.
- The file gets hard to read in Obsidian, where Chad also reads it.

## Constraints

- `site/` is hand-written: no dependencies, no build step. `scripts/` has zero npm dependencies.
- The CSP allows connections to the page itself and to `https://api.github.com` only. GraphQL at
  `https://api.github.com/graphql` is inside that.
- `notes/TODO.md` syncs both ways with the Obsidian vault, and many Claude sessions on two machines
  write to it, straight to `main` (rule 11 in `vibe-kit/workspace.md`).
- The delete flow finds an item by its source `lines` (`removeTodoItem` in `scripts/lib/notes.mjs`).
  Those lines must stay exactly as they are in the file.
- The sync runs in GitHub Actions with a shallow checkout (`actions/checkout@v5`, depth 1), so it
  cannot read when a line was added.
- `data.json` carries only what `LATEST.md`, `INDEX.md`, the AUTO blocks and `notes/TODO.md` already
  show (`renderSiteData`). Repo names and PR numbers are already public there; titles of private
  PRs are not.

## Approaches considered

**Where titles come from.**

- A. The sync fetches titles into `data.json`. No setup, but private repos get no titles, and 6 of
  the 8 merged PRs on the 2026-11-12 list are in private repos.
- **B. The page fetches titles in Chad's browser with a token (chosen).** All of Chad's repos get
  titles, and no title is ever public. Chad makes a second token once.
- C. Links only. Smallest, but Chad must open each link to remember.

Chad chose B.

**How the group and the place get into the file.**

- **A. A fixed word at the start of the line (chosen).** `Before merge:`, `Phone:` and so on. The
  file keeps one heading per repo, which suits Chad's one-project sittings in Obsidian too.
- B. `### Before merge` subheadings under each repo. Longer file, empty headings after deletes,
  and the place still needs a word.
- C. The page guesses the group from the PR state. Nothing to write, but often wrong ("PR #25 waits
  for Spencer" would read as before merge; the episode 014 check has no PR), and with no token
  there are no groups.

Chad chose A. One part of C stays as a check: goal 6.

**Which token reads titles.** A fine-grained token has one set of permissions for every repo it
reaches. Widening the editing token to all repos would give it Contents write on all of them. So
titles use a **second, read-only token** (Claude's call, told to Chad).

## Design

### The file format

`## <repo>` headings stay. The heading must equal a repo name on the dashboard for bare `#N` to
resolve. Any other heading (for example `## Mac mini`) is allowed; a bare `#N` under it stays text.

A **top item** starts with a group word and a colon:

| Word | Group |
|---|---|
| `Before merge:` | tests a PR needs before Chad merges it, and decisions that hold up a merge |
| `After merge:` | follow-up checks on merged or deployed work |
| `In development:` | work in progress, decisions, questions to other people |

Any **item** (a top item or a sub-item) may then start with a place word and a colon: `Phone:`,
`Computer:`, `On air:`. On a top item the place word comes after the group word. Sub-items take the
group of their top item; a group word on a sub-item is ignored. A sub-item with no place word takes
the place of its top item; its own place word wins.

The words match without regard to case. Only these six words count, so `#BowlAfterBowl` or an
ordinary sentence that starts with "Phone" followed by no colon is never read as one. A top item with
no group word, or an unknown one, goes to a **Not sorted** group.

References:

- `#N` (digits only) refers to issue or PR N in `ChadFarrow/<heading>`.
- `owner/repo#N` refers to that repo, under any heading.
- `#A–#B` or `#A-#B` refers to every number from A to B, at most 10 numbers. More than 10: only A
  and B.
- Text inside backticks and inside a `[text](url)` link is never a reference.
- `#` followed by a letter is never a reference (IRC channels).

The link goes to `https://github.com/<owner>/<repo>/issues/<N>`. GitHub redirects it to `/pull/N`
for a PR.

Example:

```
## boostmebitch
- [ ] Before merge: Test PR #541, ⤮ SHUFFLE for the favorite singles, on your iPhone. …
  - [ ] Phone: In Safari, on the PR's Vercel preview: open `/favorites`, press SINGLES, …
  - [ ] Phone: Lock the screen: when a track ends, the next shuffled track starts.
- [ ] After merge: Computer: PR #79 is deployed, and Pod Around went live after it …

## small-group-scoop
- [ ] In development: SpencerPearson/small-group-scoop#25 waits for Spencer. …
```

### The data (`data.json`, built by the sync)

`parseTodoList` stays pure. It takes the dashboard's repo names as a second argument (from the
model in `renderSiteData`) and gives each entry:

- `group`: `before`, `after`, `dev`, or `null` (Not sorted). Sub-items carry their top item's group.
- `place`: `phone`, `computer`, `air`, or `null`. A sub-item with no place word gets its top
  item's place.
- `repo`: `ChadFarrow/<heading>` when the heading is a known repo, else `null`.
- `parts`: as today, without the group and place words. A reference becomes a part with `text`
  (as written, for example `#541`) and `ref: { repo: 'owner/name', number }`. **No `href`**: the
  page builds the link from `ref`, because `test/site.test.mjs` requires every URL in `data.json`
  to appear already in the repo's markdown, and that privacy test stays as it is. A range gives one
  part for its text and a `refs` list on the entry with every number in it.

`lines` stay exactly as in the file. `todoWords` (used in the delete commit message and the
confirm sheet) then reads without the prefix words.

No title, state or date goes into `data.json`.

### The page

- **Groups.** The To do list shows Before merge, After merge, In development, then Not sorted
  (hidden when empty), each with its count. Inside a group, items keep the file's order.
- **Repo label.** Each top item shows its section heading as a small label. The label hides when
  the project filter shows one project.
- **Place mark.** Each item with a place shows it before the text: 📱 Phone, 💻 Computer,
  🎙 On air, with the word as visible or screen-reader text.
- **Filters**, above the list:
  - Project: All, then each section heading with its count of top items.
  - Where: All, Phone, Computer, On air. A top item shows when it or one of its sub-items has that
    place. Its sub-items with another place, or none, hide.
  - The choice is kept per device in `localStorage` (`pn:todoView`), through the existing `store`
    helper, so a blocked storage still renders.
  - The filters work with no token.
- **Links.** Each reference is a link, with no token needed.
- **Titles** (read token only). The page makes **one** GraphQL request to
  `https://api.github.com/graphql` for every reference on the list, top items and sub-items alike,
  with one alias per reference. Under each line that names a reference (a top item or a sub-item),
  one title line per reference: `#541 Shuffle the favorite singles · draft`. State words: open,
  draft, merged, closed. A sub-item that the Where filter hides takes its title lines with it. A
  reference the token cannot see (another account's repo, a wrong number) gets no title line; its
  link stays. A failed request shows the list without titles and one quiet line above it; it never
  blocks the list or the delete box.
- **Out-of-date marks** (read token only). A mark sits on the line that names the PRs, a top item
  or a sub-item, and counts only the PRs that line names:
  - In the Before merge group: when **every** PR the line names is merged or closed, "PR #N is
    merged: is this still needed?" (or "closed"; for several PRs, one mark that names them all).
    When only some are, no mark: the title lines already show each state, and a mark that is often
    wrong teaches Chad to ignore it.
  - In the After merge group: when the line names a merged PR, "merged N days ago", from the newest
    `mergedAt` of its merged PRs. After 14 days, the mark turns to a warning colour.
  - A line with no PR gets no mark and no age.
- **Delete** works as today.

### The read token

- Stored as `pn:readToken`. It lives in the same token sheet as the editing token, in a second part
  named for titles, with its own paste field, its own "Forget" button, and a link that pre-fills a
  new fine-grained token: name `project-notes titles`, owner `ChadFarrow`, 90 days, Issues read,
  Pull requests read (follow the `NEW_TOKEN_URL` pattern). The sheet tells Chad to pick "All
  repositories" by hand.
- On save, the page checks the token, and refuses it with a plain reason when a check fails:
  - **It reaches every repo:** it can see a private ChadFarrow repo (for example a GraphQL count of
    the viewer's private repositories is above 0). A public repo proves nothing here, because a
    token answers for a public repo even without access to it. If it fails: "Pick All
    repositories".
  - **It cannot write code:** the same refused PUT that `probeToken` sends (a sha that never
    matches). A 409 means it can write.
  - **It cannot write issues or PRs:** one request for each that GitHub refuses either way, so it
    changes nothing (for example a create with a missing required field: a validation error means
    the token has the permission, 403 means it does not). **The build must confirm these status
    codes against real tokens before the page relies on them**: the editing token (no issue or PR
    permission), the `gh` CLI token (can write), and Chad's read token after he makes it. If a probe
    cannot be confirmed, leave it out and say so in the PR; the pre-filled link still asks for read
    only.
  - The stand-in API in `scripts/check-site.mjs` answers these probes for each kind of token.
- If GitHub later refuses the token (401), the quiet line says so and offers the sheet.

### When a session adds a phone check (the rule)

A session adds a `Phone:` test only for what Chrome with phone emulation cannot test, and the line
names that gap:

- iOS audio, the lock screen, and the Home Screen app
- a real touch on iOS
- the Zapstore app, and Android signers such as Amber

A layout change or a small UI change gets no phone test; the PR body still lists what the session
tested in the browser (rule 10 in `vibe-kit/workspace.md`). For boostmebitch, phone tests of
several open PRs go under one item, `Before merge: Phone pass on beta`, with one sub-item per test
that names its PR, because `beta.boostmebitch.com` already holds the open PRs.

The rule goes into the header of `notes/TODO.md` and into rules 10 and 11 of
`vibe-kit/workspace.md`.

### Writing the format down

- `notes/TODO.md` header: the group words, the place words, the reference forms, and the phone rule,
  short.
- `CLAUDE.md` of project-notes: the To do paragraph of "The web dashboard", and the token paragraphs
  (the second token, why it is separate).
- `vibe-kit/workspace.md` rules 10 and 11: a pointer to the header, and the phone rule. This is a
  second repo: commit it after project-notes is done.

### Moving the current list over

After the code PR merges and the page deploys, rewrite the items of `notes/TODO.md` in the new
format, straight to `main` (pull first, as rule 11 says). Doing it in the code PR would conflict with
the sessions that write the file every day. Until then, the old lines show under Not sorted, which
is harmless.

**The move only adds words** (Chad's choice): each top item gets its group word, and each line
that clearly has a place gets its place word. No item or test is dropped, merged or reworded, and
the phone rule is not applied to old items. The one exception is a bare `#N` that points to another
account's repo: it becomes `owner/repo#N`, or it would link to the wrong repo. Show Chad the full
new file before the push; the push also asks him.

### Tests

- `node --test` (bare): the parser, for every group and place word, case, a missing and an unknown
  word, sub-items taking the group, references (bare, `owner/repo#N`, ranges with en dash and
  hyphen, the cap of 10, inside backticks, inside a link, `#Channel`), an unknown heading, and
  `lines` unchanged.
- `node scripts/check-site.mjs`: add a stand-in for `POST /graphql` to the stand-in API, then check
  in the browser: groups in order with counts; place marks; both filters, and that they survive a
  reload; link hrefs; titles with a read token and none without; a reference the token cannot see;
  the merged mark on a before-merge item; the age warning after 14 days; a refused read token; a
  read token that can write is refused in the sheet; the delete box still deletes the right lines.
  Every check must pass; read the total the run prints.
- A phone layout check with CDP `Emulation.setDeviceMetricsOverride` (`mobile: true`): no
  horizontal overflow, and the filter controls are at least 24 by 24 CSS pixels.
- One real check on the live page after the deploy, with Chad's read token: titles of a private
  repo show, and they do not appear in the published `data.json`.

## Left to the builder

- The look: colours, icons, spacing, and whether the filters are selects or button rows.
- The exact GraphQL query, and what to do above about 100 references (split into more requests).
- The wording of marks and of the quiet line, in the plain style of the page.
- Where `refs` of a range sit in the data, as long as the page can show one title line per number.

## Claude's calls (Chad can change them)

- 14 days before an After merge item gets the warning colour.
- The read token lives in the same sheet as the editing token.
- Ranges expand to at most 10 numbers.
- The boostmebitch "Phone pass on beta" item, for new phone tests.
- Title lines and marks sit on the line that names the PR, a top item or a sub-item.
- A sub-item with no place word takes its top item's place.
- The merged mark shows only when every PR the line names is merged or closed.
- The read token is refused if it can write code, issues or PRs, or cannot see a private repo.
- `data.json` gets no new URLs; the page builds each link from the repo and the number.
