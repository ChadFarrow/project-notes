# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A markdown dashboard for ChadFarrow's GitHub work: what needs attention now, and what is open for each project — including work opened in the other repos a project uses. The same data also feeds a web dashboard at **https://notes.podtards.com** (see *The web dashboard* below), where Chad reads the status and edits notes without markdown. The code is the generator in `scripts/`, the web page in `site/`, and their tests; everything else is markdown.

The projects tracked here focus on three domains: **Podcasting 2.0** (RSS feeds, V4V payments, musicL playlists), **Lightning Network** (LNURL, Lightning Address, streaming sats), and **Nostr** (social protocol, relay bots, event publishing).

## Repo Structure

- **`README.md`** — Hand-written front page: the dashboard link and a short guide to the note header lines and the `For:` marker. Not generated; keep it in step with *Project notes* below.
- **`LATEST.md`** — Auto-generated dashboard and the entry point. *Needs you now* (ready-but-idle PRs, then every open issue, with issues that share a title across repos folded into one line), then *Projects* grouped by category (PRs with CI/conflict/draft state, items opened elsewhere for the project, branches with no PR), *Quiet* projects, *Stale* repos (no push in 180+ days) and *Note problems*. Scope is every non-archived repo ChadFarrow owns, forks included, minus notes marked `**Track:** no`.
- **`audits/`** — Auto-generated daily snapshots of the dashboard (`audits/<YYYY-MM-DD>.md`); same-day runs overwrite in place. The snapshot is rendered with `../` links, so it is **not** a byte copy of `LATEST.md`. `audits/README.md` is the auto-generated newest-first index. Files before 2026-09-27 use the old flat audit format.
- **`INDEX.md`** — Auto-generated directory of every project, grouped by category, with fork / private / not-tracked flags.
- **`projects/<repo>.md`** — One note per non-archived repo. The hand-written part is yours; the sync only rewrites the block between `<!-- AUTO:START -->` and `<!-- AUTO:END -->`. See *Project notes* below. `projects/archived/` holds notes for archived repos; the sync does not read it.
- **`PC2.0-SPECS.md`** — Reference doc mapping Podcasting 2.0 namespace tags (`<podcast:value>`, `<podcast:medium>`, etc.) to which projects use them.
- **`references/`** — Curated bookmark collections by topic (podcasting-2.0, lightning, nostr, dev-tools, misc). `starred.md` is auto-synced.
- **`notes/`** — Free-form notes, usually written on the phone in the Obsidian vault and pushed by the vault sync. Anything goes; the dashboard does not read them.
- **`scripts/`** — The generator: `sync.mjs` (the command, all I/O), `lib/github.mjs` (`gh` calls, token choice), `lib/notes.mjs` (note header parsing, AUTO-block splice, and the web editor's `readNoteForm`/`applyNoteForm`), `lib/model.mjs` (pure data, plus the ordering rules the markdown and the web page share), `lib/render.mjs` (pure markdown), `lib/site.mjs` (pure `data.json` for the web page). `check-site.mjs` drives the web page in a real browser. The Obsidian vault sync: `vault-sync.mjs` (I/O and git), `lib/vault.mjs` (pure planning), and the launchd template `com.chadfarrow.project-notes-vault.plist`. Zero npm dependencies; there is no `package.json`.
- **`site/`** — The web dashboard: `index.html`, `app.js`, `style.css`, `icon.svg`, hand-written, no dependencies, no build step. `sync.mjs --site <dir>` adds `data.json` and a copy of `scripts/lib/notes.mjs` as `lib/notes.js`.
- **`test/`** — `node --test` unit tests with hand-written fixtures in `test/fixtures/`.

## Project notes

A note's header lines are read by the sync — only the lines above the first `## ` heading:

- `**Category:** Music/Podcasting` — dashboard and index grouping. Missing or empty → `Uncategorized`.
- `**Uses:** msp-podping-service, boostbox` — the repos this project depends on. The note's AUTO block and its dashboard section show their open-work counts, and each used repo gets a computed `Used by` line.
- `**Track:** yes | no | upstream` — `no` hides the project from the dashboard (its AUTO block says so; archive the repo instead if it is dead). `upstream` hides its branches and stale warning, for forks you contribute upstream from (`castr.me`, `web-ui`) — their branches never get a PR in the fork. Default `yes`.

End each header line with two spaces, or GitHub runs them into one line.

The sync creates a stub note for any non-archived repo that has none. Deleting a stub only makes it come back; use `**Track:** no`.

**Linking work across repos.** When a PR or issue in repo B is opened for work in repo A, put a line `For: ChadFarrow/A` in its body. The sync lists that item under A as *Opened elsewhere for this project*. The line must start with `For:` (list, quote and emphasis markers before it are fine) and must name the repo as `ChadFarrow/<repo>` or its URL — bare repo names in prose are ignored on purpose, because they are far too noisy. A marker that names an unknown or archived repo shows under *Note problems*.

**The AUTO block.** Never edit inside it. It holds only data that comes from GitHub — no timestamps, no relative times — so a run with nothing new leaves every note byte-identical. If the markers are not exactly one START followed by one END (a duplicate, a missing END, one inside a code fence), the sync leaves that note untouched and lists it under *Note problems*; fix the markers by hand.

## The Obsidian vault

The iCloud vault `project-notes` (`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/project-notes`) is a two-way copy of this repo, so Chad can read the dashboard and write notes on the phone. The launchd agent `com.chadfarrow.project-notes-vault` runs `scripts/vault-sync.mjs` when the vault's `projects/` or `notes/` folder changes (after a 30 s pause) and every 15 minutes. Log: `~/Library/Logs/project-notes-vault.log`. A run with nothing to do writes no log line, so hours of silence are normal; `launchctl list | grep project-notes-vault` shows whether the agent is loaded. A commit made on GitHub (the web dashboard, the workflow) reaches the vault on the next 15-minute run, because the folder watch only sees vault changes. The phone reaches GitHub through this Mac, so the Mac must be on.

**A save in the vault reaches GitHub with no review** — usually within a minute for a new note, at most about 15 minutes for an edit the folder watch misses — and the repo is public.

The rule: **hand-written files sync both ways; generated files flow repo → vault only.**

- *Generated*, repo → vault: `LATEST.md`, `INDEX.md`, `audits/`, `references/starred.md`, and the AUTO block of each note. An edit to these in the vault is overwritten.
- *Notes*, `projects/<repo>.md`: the text outside the AUTO block syncs both ways; the vault's version gets the repo's AUTO block. The repo decides which notes exist — a note deleted in the vault comes back, and a new file made in the vault's `projects/` stays in the vault only.
- *Free files*, whole file both ways, including new and deleted files: `README.md`, `PC2.0-SPECS.md`, `references/` (except `starred.md`), `notes/`, `projects/archived/`.
- Not synced: `CLAUDE.md`, `scripts/`, `site/`, `test/`, `.github/`, dotfiles, the vault's `.obsidian/` and `conflicts/`. The first run writes `.obsidian/app.json` so new notes land in `notes/` — Obsidian's default, the vault root, does not sync.

A three-way compare against the last sync (`.git/vault-sync-state.json`, never committed) picks the direction. When a file changed on both sides, **the repo wins** and the vault's version is saved to the vault's `conflicts/` folder, with a Mac notification. A vault note with broken AUTO markers is treated the same way.

**The sync pauses itself while this checkout is in use.** It skips the run (and logs why) unless the checkout is on `main`, has no uncommitted changes, and has no unpushed commits other than its own `Sync N files from the Obsidian vault` commits. So work on a branch, and switch back to a clean `main` when done — the vault catches up on the next run.

Other stops, each logged with a notification: a missing vault folder after the first run (iCloud off must never read as "everything was deleted"), a run that would delete more than 5 files from the repo (`--allow-deletes` overrides), and a failed pull. An iCloud placeholder (`.name.icloud`) is skipped, not read as a deletion. When a note's `Category`, `Uses` or `Track` line changes in the vault, the sync starts the `sync-all.yml` workflow so the dashboard updates in minutes.

Install or reload the agent:

```bash
cp scripts/com.chadfarrow.project-notes-vault.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.chadfarrow.project-notes-vault.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.chadfarrow.project-notes-vault.plist
```

`test/vault-sync.test.mjs` runs the script end to end against a temporary remote, checkout and vault; `PN_REPO`, `PN_VAULT`, `PN_STATE`, `PN_LOCK`, `PN_NO_NOTIFY` and `PN_NO_WORKFLOW` exist for it.

## Automation

One GitHub Actions workflow, **`sync-all.yml`**, runs every 6 hours (at minute 23, because GitHub delays and sometimes drops scheduled runs, most of all at minute 0; one missed run is normal, and the web page warns after 13 hours), on manual dispatch, and on a push to `main` that touches `site/`, `scripts/` or the workflow: `node --test`, then `node scripts/sync.mjs --site "$RUNNER_TEMP/site"`, then auto-commit, then upload of the web dashboard. It writes only files whose content changed. A second job, `deploy`, publishes the upload to GitHub Pages (see *The web dashboard*). Do not add `projects/**` to the push paths: every Obsidian save would start a run.

The sync makes one paginated GraphQL query (`REPOS_QUERY` in `scripts/lib/github.mjs`) over `user.repositories(ownerAffiliations: [OWNER], isArchived: false)`, 25 repos per page — a page of 100 took 9.1 s against GitHub's 10 s limit. Nested lists (50 PRs, 50 issues, 100 branches per repo) are not paginated; if a repo has more, the list is marked truncated under *Note problems*. PR and issue bodies are read for `For:` markers and then dropped — they are never written to the repo.

**A fetch failure stops the run, and the run writes nothing.** There are no partial outputs.

The sync needs the **`AUDIT_TOKEN`** secret (a classic PAT with `repo` scope — it has to read private repos). `pickToken` in `scripts/lib/github.mjs` probes it with `gh api rate_limit` before doing anything and falls back to `GITHUB_TOKEN` if it is empty *or rejected*. The probe matters because PATs expire: a YAML-level `secrets.AUDIT_TOKEN || secrets.GITHUB_TOKEN` default only covers an unset secret, so an expired one used to fail the whole sync on the first `gh` call with `HTTP 401: Bad credentials`.

**The fallback does not empty the dashboard — that is the trap.** `GITHUB_TOKEN` can still read every *public* repo, so `LATEST.md` comes out looking complete and the run stays green while **private repos vanish from it entirely**. The only signals are the `::warning::` in the run log and the `> [!WARNING]` banner written into `LATEST.md` and `audits/<date>.md` when the run is degraded. If the banner is there, the file is public-only — rotate the secret and re-run. (This happened for real between 2026-09-09 and 2026-09-12: six private repos, and eight open items, were silently absent for three days.) In a degraded run, notes for the missing private repos are left untouched rather than reported as orphans.

To rotate, **use the web UI** (Settings → Secrets and variables → Actions → `AUDIT_TOKEN`), or run `gh secret set` in a real terminal and confirm you see the `✓ Set Actions secret` line. Do **not** run `gh secret set` anywhere it cannot prompt for the value — with no TTY it reads EOF, stores an **empty** secret, prints nothing, and exits 0. An empty secret is indistinguishable from an unset one at runtime, so the symptom flips from the "rejected" warning to the "is empty or unset" one while looking just as broken.

### Running and testing locally

The same command runs on the Mac (Node 22+, `gh` logged in):

```bash
node --test                      # bare, as the workflow runs it
node scripts/sync.mjs --dry-run  # lists what would change, writes nothing
node scripts/sync.mjs            # writes the changed files
node scripts/sync.mjs --dry-run --site _site   # also builds the web page into _site/ (gitignored)
node scripts/check-site.mjs      # the web page in headless Chrome, against the fixture
```

`--dry-run` guards only the repo files; `--site` always writes its folder, and refuses the checkout, a folder above it, and `site/` itself. To look at the page, run `python3 -m http.server -d _site 8765`.

Locally there is no `AUDIT_TOKEN`, so `gh` uses its keychain login and the run is never degraded. Set `AUDIT_TOKEN=bogus FALLBACK_TOKEN="$(gh auth token)"` to exercise the "rejected" path.

`node --test` runs every `.mjs` file under `test/`, so keep helpers out of that directory and keep fixtures as `.json`. Fixtures are hand-written: never record them from the live account — the repo is public and some repos are private.

### Pushing and conflicts

The workflow pushes to `main` under `concurrency: sync-main` with a pull-rebase retry loop. A manual push can still collide with a scheduled run — if you hit a conflict in `LATEST.md`, `INDEX.md` or `audits/<date>.md`, take either side and re-run the workflow, since those files are regenerated wholesale. The same goes for a conflict inside a note's AUTO block. A conflict *outside* the AUTO block is your own edit and needs a real merge.

## The web dashboard

**https://notes.podtards.com** shows the same data as `LATEST.md`, with a status lamp for each open PR: red for a merge conflict or failing checks, amber while checks run, hollow for a draft, green when ready. It also has a form editor for each project: Category (picked from the categories in use, so the names match), Uses, Track, one text box for each `## ` section of the note, and the TODOs as a checklist. Filters and open rows live in the browser's localStorage (`pn:*` keys) and never reach the repo.

**Data.** `sync.mjs --site <dir>` writes `data.json` from the same fetch and model as the markdown; `data.json` is never committed. `renderSiteData` in `scripts/lib/site.mjs` publishes only what `LATEST.md`, `INDEX.md` and the AUTO blocks already publish. A `**Track:** no` project carries only its `INDEX.md` facts; it stays listed so its Track can be switched back on. `test/site.test.mjs` checks that every URL in `data.json` also appears in the markdown. Keep that test passing when you add a field.

**Hosting.** The `deploy` job in `sync-all.yml` publishes the upload with `actions/deploy-pages`. It is a separate job, so the job that holds `AUDIT_TOKEN` never gets an OIDC token. GitHub Pages is set to build from Actions, with the custom domain `notes.podtards.com`, and HTTPS enforced. Only `main` may deploy (the `github-pages` environment's branch rule).

**DNS is at Cloudflare, not Squarespace.** `podtards.com` is registered at Squarespace, but its name servers are Cloudflare's (`bella`/`hans.ns.cloudflare.com`), so records go in the Cloudflare dashboard. The Squarespace DNS page shows an old copy under "You're using custom nameservers"; it is inactive and out of date, so never switch the name servers back to it (the root and `itdv` records would break). The record is `CNAME notes → chadfarrow.github.io`, **DNS only** (grey cloud): a proxied record hides GitHub's IPs and blocks the certificate. Check it with `dig +short CNAME notes.podtards.com @bella.ns.cloudflare.com`.

The one-time setup, done on 2026-09-27:

```bash
gh api -X POST repos/ChadFarrow/project-notes/pages -f build_type=workflow
gh api -X PUT repos/ChadFarrow/project-notes/pages -f cname=notes.podtards.com   # before the DNS record, so no one else can claim the name
gh api -X PUT repos/ChadFarrow/project-notes/pages -F https_enforced=true        # once the certificate is "approved"
```

GitHub issues and renews the certificate itself (`gh api repos/ChadFarrow/project-notes/pages --jq .https_certificate`; the first one expires 2026-12-26). If the certificate stays `null` after the DNS record resolves and `pages/health` reports `is_valid: true`, saving the same domain again does nothing. Remove the domain (`gh api -X PUT …/pages --input` a file holding `{"cname": null}`) and add it again; the certificate then went `authorized` → `approved` within minutes.

**Never serve the page from `chadfarrow.github.io/project-notes`.** Three other repos publish Pages on that origin (`chadf-musicl-playlists`, `libre-listener-wallet-monorepo`, `pc20-archive`). localStorage and the CSP `'self'` are per origin, so a script on any of those sites could read the edit token. The custom domain gives the page an origin of its own.

**Editing and the token.** Saving uses the GitHub Contents API with a fine-grained PAT that Chad pastes once on each device. The PAT has access to `ChadFarrow/project-notes` only, with **Contents: Read and write** and **Actions: Read and write** (to start the sync), and nothing else. The page keeps it in localStorage as `pn:token`, and "Editing token → Forget the token" removes it. The setup link pre-fills the name, a 90-day life and both permissions (GitHub has no parameter for the repository, so that one is picked by hand). To rotate, make a new PAT and paste it through the same button; the editor also offers "Paste a new token" when a save is refused, without losing the edit. The repo is public, so reading it proves nothing about a token: at setup the page sends two requests that GitHub refuses either way and that change nothing — a PUT of `README.md` with an all-zero sha (409 with write access, 403 without) and a dispatch to a branch that does not exist (422 with Actions access, 403 without). A token that cannot write is refused; one without Actions is kept with a warning.

Each save is one commit on `main` by Chad: `Edit the <repo> note from the web dashboard`. The form compares Uses as a set, so the order of the checkboxes is never a change, and a saved Uses line keeps the note's order. On a conflict (the note changed since it was opened), the page reads the note again. If none of the fields it is saving changed on GitHub (`conflictingFields` in `notes.mjs`), it applies them once more; if one did, it saves nothing and says which field, rather than overwrite someone else's edit. After a change to Category, Uses or Track it dispatches `sync-all.yml`, so the dashboard updates in a few minutes. The vault sync pulls these commits like any other push, and its rule still applies: when a note changed on both sides, the repo wins.

**`scripts/lib/notes.mjs` runs in the browser too.** The site serves a copy of it. Keep it free of imports and Node APIs; `test/notes-form.test.mjs` checks the imports. Also avoid newer syntax such as regex lookbehind, which older iOS Safari cannot parse. `applyNoteForm` must leave every byte it did not edit as it was: each line keeps its own ending, and only the lines of a changed value are rewritten.

**Security.** The CSP is a `<meta>` tag in `site/index.html`: scripts, styles and fonts come from the page's own origin only, and the page connects only to itself and to `api.github.com`. PR and issue titles are written by other people, so `app.js` puts every GitHub string into the page with `textContent` or a Text node, never as HTML. The page refuses to run inside a frame, and it will not take a token over plain http (`window.isSecureContext`), which matters for the minutes before a new certificate exists. `site/index.html` and `app.js` carry `?v=__BUILD__`, which `buildSiteFiles` replaces with a hash of the code, so a browser never pairs a cached `app.js` with a newer `lib/notes.js`.

**The edit token can reach `AUDIT_TOKEN`.** Contents write on this repo is enough to change `scripts/`, and the workflow runs `scripts/sync.mjs` with `AUDIT_TOKEN`, a classic `repo` PAT that can write to every repo Chad owns. So a leaked edit token (a bad browser extension is the likely way) is worth more than one repo. Keep the edit token short-lived and on devices Chad controls. A read-only fine-grained `AUDIT_TOKEN` (Metadata, Contents, Issues, Pull requests and Commit statuses: read, on all repositories) would close the gap, but fine-grained PATs have no Checks permission, and the check state from GitHub Actions may then drop out of `statusCheckRollup`. A GraphQL error stops the sync loudly, but a quietly missing state would not. Before you switch, save `LATEST.md`, run the sync with the new token, and compare the "checks passing" and "checks failing" tags. Switch only if they match.

**Verify.** `node scripts/check-site.mjs` drives the page in headless Chrome over CDP, with no dependencies. It stands in for `api.github.com`, so the editor is checked end to end: the saved bytes, UTF-8, the conflict retry and the refusal of a same-field conflict, the dispatch, the token probes, a revoked token mid-save, the CSP, stray `null` text, and the phone layout (`Emulation.setDeviceMetricsOverride` with `mobile: true`, no sideways scroll, controls of at least 24 by 24 px). **Every** check must pass. The number grows as checks are added, so read the total that the run prints. Add `--data _site/data.json` to check the board with real data, `--shots <dir>` to save screenshots, and `--host https://notes.podtards.com` for read-only checks of the live site.

The whole chain was checked with a real edit on 2026-09-27: HPM-Lightning set to "Hide from the dashboard". The page committed one added line (`**Track:** no`), dispatched `sync-all.yml` 3 seconds later, and the next data showed the project hidden and the totals lowered. The vault got the new line 15 minutes after the save, on the next vault-sync run. To check a save like that, read the note's commits (`gh api "repos/ChadFarrow/project-notes/commits?path=projects/<file>"`), the run list of `sync-all.yml`, and `https://notes.podtards.com/data.json`.

## Editing Guidelines

- `INDEX.md`, `LATEST.md`, `audits/*.md` (including `audits/README.md`), `references/starred.md` and the AUTO blocks in `projects/*.md` are **auto-generated** — do not edit them by hand (the next sync overwrites them). To change what they contain, edit `scripts/lib/render.mjs` and its tests. The web page's data comes from `scripts/lib/site.mjs`; its layout is `site/`.
- Everything else in `projects/*.md`, and all other `.md` files, are manually maintained and safe to edit. Edits made in the Obsidian vault arrive as `Sync N files from the Obsidian vault` commits.
- The GitHub user is `ChadFarrow`.
- `.gitignore` ignores `.DS_Store`. It was tracked in git until 2026-09-27.
