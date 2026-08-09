# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

This is a **documentation-only** repo that serves as a centralized dashboard for ChadFarrow's GitHub projects. It contains no application code — only markdown notes, reference links, and automation scripts for syncing project data.

The projects tracked here focus on three domains: **Podcasting 2.0** (RSS feeds, V4V payments, musicL playlists), **Lightning Network** (LNURL, Lightning Address, streaming sats), and **Nostr** (social protocol, relay bots, event publishing).

## Repo Structure

- **`LATEST.md`** — Auto-generated cross-repo audit and the intended entry point: open PRs, open issues, branches with no open PR, and repos with no push in 180+ days. Scope is **owner-wide** (every non-archived repo), unlike the curated files below. A verbatim copy of the newest `audits/` entry.
- **`audits/`** — Auto-generated dated snapshots of the above (`audits/<YYYY-MM-DD>.md`), one per day; same-day runs overwrite in place, so each file is that day's final state. `audits/README.md` is the auto-generated newest-first index.
- **`INDEX.md`** — Auto-generated project listing grouped by category (Music/Podcasting, Lightning, Nostr, Web/Apps, Tools). Links to per-project note files.
- **`ISSUES.md`** — Auto-generated aggregate of open GitHub issues. Scope is the **curated** repo list only, not owner-wide.
- **`PULL_REQUESTS.md`** — Auto-generated aggregate of **open** pull requests across the curated repos. Merged PRs are not listed.
- **`BRANCHES.md`** — Auto-generated listing of branches across the curated repos. Protected branches are marked with a lock icon.
- **`PC2.0-SPECS.md`** — Reference doc mapping Podcasting 2.0 namespace tags (`<podcast:value>`, `<podcast:medium>`, etc.) to which projects use them.
- **Per-project `.md` files** (e.g., `MSP-2.0.md`) — Notes, issues, and TODOs for individual projects. Follow a consistent template: Category, Language, Repo link, Description, PC2.0 Specs Used, Notes, Resources, Issues, TODOs.
- **`references/`** — Curated bookmark collections by topic (podcasting-2.0, lightning, nostr, dev-tools, misc). `starred.md` is auto-synced.

## Automation

One GitHub Actions workflow runs every 6 hours (and on manual dispatch):

- **`sync-all.yml`** — The main (and only) workflow. Fetches repo metadata via `gh`, regenerates `INDEX.md`, `ISSUES.md`, `PULL_REQUESTS.md`, `BRANCHES.md`, `references/starred.md`, `LATEST.md`, and `audits/`, then auto-commits. New repos not yet categorized appear under "Uncategorized" in INDEX.md. Issues and pull requests are synced **open only** (closed issues and merged PRs are not listed).

  It generates data at **two scopes**, both in the same run so they can never disagree:
  - *Curated* — `ISSUES.md`, `PULL_REQUESTS.md`, `BRANCHES.md`, driven by the `CATEGORIES` map.
  - *Owner-wide* — the audit section (`LATEST.md`, `audits/`), driven by `gh search --owner ChadFarrow` and `gh repo list`, covering every non-archived repo including untracked ones.

  The audit's **branch** and **stale repo** sections skip forks that aren't listed in `CATEGORIES` — their PRs are opened against the parent repo, so every branch would look orphaned and every quiet period would look like neglect. Forks that *are* curated still get audited. `AUDIT_SKIP` in `sync-all.yml` is the manual exception list for curated repos you contribute upstream from anyway (currently `castr.me` and `web-ui`); add a repo there to silence it. The open-PR and open-issue sections are unfiltered — they only ever show real work.

  The audit section needs the **`AUDIT_TOKEN`** secret (a PAT with cross-repo read); the step falls back to `GITHUB_TOKEN`, which generates everything else fine but returns empty audit results.
- **`sync-issues.sh`** — Local script for manually syncing issues, PRs, and branches only. Its output is deliberately byte-identical to `sync-all.yml`'s — if you change the format in one, change it in the other, or local runs will produce diffs the next scheduled sync reverts.

`CATEGORIES` in `sync-all.yml` is the **single source of truth** for which repos are tracked; the `REPOS` array and `known_repos` list are derived from it at runtime. When adding a new project to be tracked, add it to `CATEGORIES` in `sync-all.yml`, add it to the `REPOS` array in `sync-issues.sh`, and create a new per-project `.md` file following the existing template.

## Editing Guidelines

- `INDEX.md`, `ISSUES.md`, `PULL_REQUESTS.md`, `BRANCHES.md`, `LATEST.md`, `audits/*.md`, and `references/starred.md` are **auto-generated** — do not edit manually (changes will be overwritten by the next sync).
- All other `.md` files are manually maintained and safe to edit.
- The GitHub user is `ChadFarrow`.
