# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

This is a **documentation-only** repo that serves as a centralized dashboard for ChadFarrow's GitHub projects. It contains no application code — only markdown notes, reference links, and automation scripts for syncing project data.

The projects tracked here focus on three domains: **Podcasting 2.0** (RSS feeds, V4V payments, musicL playlists), **Lightning Network** (LNURL, Lightning Address, streaming sats), and **Nostr** (social protocol, relay bots, event publishing).

## Repo Structure

- **`INDEX.md`** — Auto-generated project listing grouped by category (Music/Podcasting, Lightning, Nostr, Web/Apps, Tools). Links to per-project note files.
- **`ISSUES.md`** — Auto-generated aggregate of GitHub issues (open + closed) across all tracked repos.
- **`PULL_REQUESTS.md`** — Auto-generated aggregate of pull requests (open + merged) across all tracked repos.
- **`BRANCHES.md`** — Auto-generated listing of branches across all tracked repos. Protected branches are marked with a lock icon.
- **`PC2.0-SPECS.md`** — Reference doc mapping Podcasting 2.0 namespace tags (`<podcast:value>`, `<podcast:medium>`, etc.) to which projects use them.
- **Per-project `.md` files** (e.g., `MSP-2.0.md`) — Notes, issues, and TODOs for individual projects. Follow a consistent template: Category, Language, Repo link, Description, PC2.0 Specs Used, Notes, Resources, Issues, TODOs.
- **`references/`** — Curated bookmark collections by topic (podcasting-2.0, lightning, nostr, dev-tools, misc). `starred.md` is auto-synced.

## Automation

Two GitHub Actions workflows run every 6 hours (and on manual dispatch):

- **`sync-all.yml`** — The main workflow. Fetches repo metadata via `gh`, regenerates `INDEX.md`, `ISSUES.md`, `PULL_REQUESTS.md`, `BRANCHES.md`, and `references/starred.md`, then auto-commits. New repos not yet categorized appear under "Uncategorized" in INDEX.md.
- **`sync-issues.yml`** — Standalone issue, PR, and branch sync (subset of sync-all). Writes to `ISSUES.md`, `PULL_REQUESTS.md`, and `BRANCHES.md`.
- **`sync-issues.sh`** — Local script for manually syncing issues, PRs, and branches (simpler version, open only).

When adding a new project to be tracked, update the `REPOS` array and `CATEGORIES` map in `sync-all.yml`, the `REPOS` array in `sync-issues.yml` and `sync-issues.sh`, and create a new per-project `.md` file following the existing template.

## Editing Guidelines

- `INDEX.md`, `ISSUES.md`, `PULL_REQUESTS.md`, `BRANCHES.md`, and `references/starred.md` are **auto-generated** — do not edit manually (changes will be overwritten by the next sync).
- All other `.md` files are manually maintained and safe to edit.
- The GitHub user is `ChadFarrow`.
