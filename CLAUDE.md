# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A markdown dashboard for ChadFarrow's GitHub work: what needs attention now, and what is open for each project — including work opened in the other repos a project uses. The only code is the generator in `scripts/` and its tests; everything else is markdown.

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
- **`scripts/`** — The generator: `sync.mjs` (the command, all I/O), `lib/github.mjs` (`gh` calls, token choice), `lib/notes.mjs` (note header parsing, AUTO-block splice), `lib/model.mjs` (pure data), `lib/render.mjs` (pure markdown). The Obsidian vault sync: `vault-sync.mjs` (I/O and git), `lib/vault.mjs` (pure planning), and the launchd template `com.chadfarrow.project-notes-vault.plist`. Zero npm dependencies; there is no `package.json`.
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

The iCloud vault `project-notes` (`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/project-notes`) is a two-way copy of this repo, so Chad can read the dashboard and write notes on the phone. The launchd agent `com.chadfarrow.project-notes-vault` runs `scripts/vault-sync.mjs` when the vault's `projects/` or `notes/` folder changes (after a 30 s pause) and every 15 minutes. Log: `~/Library/Logs/project-notes-vault.log`. The phone reaches GitHub through this Mac, so the Mac must be on.

**A save in the vault reaches GitHub with no review** — usually within a minute for a new note, at most about 15 minutes for an edit the folder watch misses — and the repo is public.

The rule: **hand-written files sync both ways; generated files flow repo → vault only.**

- *Generated*, repo → vault: `LATEST.md`, `INDEX.md`, `audits/`, `references/starred.md`, and the AUTO block of each note. An edit to these in the vault is overwritten.
- *Notes*, `projects/<repo>.md`: the text outside the AUTO block syncs both ways; the vault's version gets the repo's AUTO block. The repo decides which notes exist — a note deleted in the vault comes back, and a new file made in the vault's `projects/` stays in the vault only.
- *Free files*, whole file both ways, including new and deleted files: `README.md`, `PC2.0-SPECS.md`, `references/` (except `starred.md`), `notes/`, `projects/archived/`.
- Not synced: `CLAUDE.md`, `scripts/`, `test/`, `.github/`, dotfiles, the vault's `.obsidian/` and `conflicts/`. The first run writes `.obsidian/app.json` so new notes land in `notes/` — Obsidian's default, the vault root, does not sync.

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

One GitHub Actions workflow, **`sync-all.yml`**, runs every 6 hours (and on manual dispatch): `node --test`, then `node scripts/sync.mjs`, then auto-commit. It writes only files whose content changed.

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
```

Locally there is no `AUDIT_TOKEN`, so `gh` uses its keychain login and the run is never degraded. Set `AUDIT_TOKEN=bogus FALLBACK_TOKEN="$(gh auth token)"` to exercise the "rejected" path.

`node --test` runs every `.mjs` file under `test/`, so keep helpers out of that directory and keep fixtures as `.json`. Fixtures are hand-written: never record them from the live account — the repo is public and some repos are private.

### Pushing and conflicts

The workflow pushes to `main` under `concurrency: sync-main` with a pull-rebase retry loop. A manual push can still collide with a scheduled run — if you hit a conflict in `LATEST.md`, `INDEX.md` or `audits/<date>.md`, take either side and re-run the workflow, since those files are regenerated wholesale. The same goes for a conflict inside a note's AUTO block. A conflict *outside* the AUTO block is your own edit and needs a real merge.

## Editing Guidelines

- `INDEX.md`, `LATEST.md`, `audits/*.md` (including `audits/README.md`), `references/starred.md` and the AUTO blocks in `projects/*.md` are **auto-generated** — do not edit them by hand (the next sync overwrites them). To change what they contain, edit `scripts/lib/render.mjs` and its tests.
- Everything else in `projects/*.md`, and all other `.md` files, are manually maintained and safe to edit. Edits made in the Obsidian vault arrive as `Sync N files from the Obsidian vault` commits.
- The GitHub user is `ChadFarrow`.
- `.gitignore` ignores `.DS_Store`. It was tracked in git until 2026-09-27.
