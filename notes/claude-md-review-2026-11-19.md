# CLAUDE.md review plan (2026-11-19)

Chad asked for a review of the CLAUDE.md files of the repos he keeps on his Mac mini. This note is the plan. It holds no rewrite. Chad picks what to do. Each change then goes to that repo's own agent as its own task.

**Status (2026-11-19): Chad approved the suggested order. No rewrite has started.** Each rewrite goes to that repo's own agent as its own task. Still open for Chad: the Task Master question, the Auto-musicL-Maker CLAUDE.md, and the `.env` check in musicL-playlist-updater (see the end of this note).

This note lists the **public** repos only. The rows of the private repos are in a git-ignored note on the Mac mini (`notes/private-claude-md-review-2026-11-19.md`).

## How it was checked

- Scope: the ChadFarrow clones in `~/Vibe` that have a CLAUDE.md. 27 files were reviewed (19 public, 8 private). `boostmebitch` was not reviewed again (see below). Spencer's repo and its two preview folders, `agent-dispatcher` and `onyx` were left out.
- Ten read-only agents (Sonnet 5.5, medium effort) read each file in full. They checked 10 to 95 claims per file with `git grep` against the default branch (`origin/HEAD`), not the local checkout. Several local checkouts are behind or on another branch. No checkout, branch or file was changed.
- **Age** is the date of the last commit that touched CLAUDE.md. **Tokens** are words × 1.5.
- **Grades.** OK: nothing worth doing. SMALL FIXES: accurate, fix a few lines. REWRITE: restructure and move text to docs/ (the facts are mostly right, the shape is wrong).

## Results (public repos)

| Repo | Last change | Words (~tokens) | Grade | Main reasons | Fix size |
|---|---|---|---|---|---|
| boostbox | 2026-11-09 | 10,779 (~16.2k) | **REWRITE** | Facts accurate (~60 checked). Half of it is a journal: "Key Patterns" 6.2k words and "Deployment" 2.9k words, with the msp-bot history and dated counts. Line 78 names one test file; there are 14. `scripts update` and the ci, m2, kaocha scripts are not listed. (The agent graded it SMALL FIXES; the size makes it a restructure.) | L, 2-3 h. Target 3-4k words. |
| stablekraft-app | 2026-11-17 | 7,445 (~11.2k) | **REWRITE** | Facts accurate (45 checked). About 5,000 words are incident stories and detail that skills already own (Railway egress, favorites block, service worker, Data Saver). STE block says 25 words; global says 20. No android/, prisma/, scripts/ (298 files) or docs/ map. About 60 Task Master and agent-config files in the root (`.rules` says it is CLAUDE.md). | L, ~90 min |
| MSP-2.0-Desktop-App | 2026-11-17 | 6,908 (~10.4k) | **REWRITE** | A sync, port and reconcile journal (~3.7k words); the web repo already did this shortening (#183) into `docs/claude/`. Wrong: `isSupportRecipient()` is `isCommunitySupport()` (CLAUDE.md:252); App.css cite :365 is now :1026+. Lists Primal as a signer (:288); Chad does not use it. The api/ list omits account, auth, boosts, op3check and more. Never links `docs/claude/`. | L, 2-3 h |
| HPM-Lightning | 2025-09-30 | 269 (~400) | **REWRITE** | Generic boilerplate. Calls the project "HPM-Site". No commands. Says nothing of Lightning, NWC or Nostr, which are the product. Imports the stock Task Master guide (`.taskmaster/CLAUDE.md`, ~1.7k words) at :38. | M, 30-45 min |
| ITDV-Lightning | 2026-11-17 | 4,068 (~6.1k) + 1,697 imported | SMALL FIXES | Wrong: lines 267-273 say the exhaustive-deps disables are gone, but 7 remain (`app/page.tsx:507`, `:960` and more); cite `app/page.tsx:289-293` is now `:298`; "32 checks" in security-smoke (only 19 found; not confirmed); "ITDV-Site". Generic lists at :26-40 and :313-326. The Task Master import (`.taskmaster/` last touched 2025-09-06) costs ~2.5k tokens a session. | S, ~30 min |
| musicL-playlist-updater | 2026-11-16 | 2,584 (~3.9k) | SMALL FIXES | Wrong: Node ">= 18" (`package.json:50` says ^24.22.1); "PlaylistUpdater no longer used" (`Scheduler.js:6,16` imports it); env vars `CHECK_INTERVAL_MINUTES` and `GITHUB_REPO_*` are read by no code. About 25 legacy root scripts and 15 root .md guides are not marked as legacy. **`.env` is tracked in git at origin, although `.gitignore` lists it. Check it for a real token first.** | S-M, ~40 min |
| msp-podping-service | 2026-11-05 | 3,160 (~4.7k) | SMALL FIXES | Filter text says `pp_music_` only (:10, :215); the code also accepts `pp_podcast_` (`consumer/src/index.ts:208`). ":208 single file" is wrong: `consumer/src` has 4 files. Stale "Co-Authored-By: Claude Opus 4.7" (:270). `RUNNING.md` and `viewer-health.yml` not named. | S, 15 min |
| chadf-musicl-playlists | 2026-11-16 | 1,344 (~2.0k) | SMALL FIXES | "No application code" (:7, :127) is wrong: two Python generators and two workflows. "10 playlists" (:17, :87) but `docs/` has 17 xml files. Does not say that musicL-playlist-updater writes into `docs/` every day. | S, 15 min |
| pc20-wiki | 2026-10-30 | 6,871 (~10.3k) | SMALL FIXES (M) | Rules are accurate (28 checked). Stale numbers: "~3,100 lines" (now ~5,400); "E1–E272, 513,474 cues" (now 278 episodes, 521,954 cues in `data/transcripts/index.json`); "291 tests" (~298); "60 notes" (61). About 3,800 words (matching rules and measurements, transcript search internals, "Transcripts are a source now") could move to docs/. About 280 words repeat global.md (the mirror rule, the NAS rule, bare `node --test`). | M, 60-90 min |
| PC20-Nostr | 2026-11-16 | 5,064 (~7.6k) | SMALL FIXES (M) | The "Where they are" section (~600 words) describes a machine layout that is gone (repos in `~`); all repos are now in `~/Vibe`. "There is no .gitignore" is wrong (:513). Dated 2026-08-25 claim about kinds 3369/33369 is out of date. Branch names and SHAs that no longer exist. STE block repeats global. The favorites history (~900 words) could go to `notes/`. | M, 45-60 min |
| pc20-archive | 2026-10-29 | 1,768 (~2.7k) | SMALL FIXES | Calls the repo `pc20-feed` (:7; `package.json:2` still says so). "~470 lines" is 549. `npm run build` (MAX_EP=67) would change the committed 1–100 feed; the file does not warn of that. About 240 words repeat the NAS text of global.md. | S, 10 min |
| localbitcoiners | 2026-06-17 | 553 (~0.8k) | SMALL FIXES | Describes 1 of 6 bot dirs. The rest lives in `bots/CLAUDE.md`, which is git-ignored, so a fresh clone or the laptop does not see it. Website and `functions/` deploy not described. A "Verified 2026-06-17" log paragraph. | S, 20 min |
| square-my-art | 2026-11-08 | 1,563 (~2.3k) | SMALL FIXES | Accurate (22 checked). Many dated "Chad's choice" stories. Line 60 repeats the global CDP rule. Check the service-worker precache list. | S, 15 min |
| project-notes | 2026-11-19 | 7,719 (~11.6k) | SMALL FIXES | Accurate (symbols, scripts, plist paths, `SITE_DATA_VERSION = 2`, the 4-hour cron checked). Line 48 says INDEX.md "still shows" the description and language of a private repo; the Repo Structure section says it no longer does (PR #28). The "web dashboard" section is 3,121 words and could move to `docs/`. | S-M, ~45 min |
| MSP-2.0 | 2026-11-17 | 2,392 (~3.6k) | OK | Short, current, indexes `docs/claude/`. Optional: drop the STE block (~110 words) and line 75. | S, 10 min |
| na-archive | 2026-10-30 | 571 (~0.9k) | OK | States that the show ended and the agent is shelved. Optional: add "Do not reinstall"; mark the kickstart and log lines as shelved only. | S, 5 min |
| chadf-landing-page | 2026-08-14 | 537 (~0.8k) | OK | Accurate. "~530 lines" is 513. The 4 uncommitted local lines belong with the pending code change. | S, 2 min |
| Auto-musicL-Maker | untracked | 480 (~0.7k) | OK | Origin deleted its CLAUDE.md on 2025-09-05 (commit fbb5e7b, "remove unneeded AI assistant documentation files"); the local copy is untracked. It is accurate (18 checked). Chad decides: commit it or not. Add "Node ^24.22.1". | S, 5 min |
| helipad-startos | 2026-11-08 (AGENTS.md) | 1-word stub + 420 | OK | `CLAUDE.md` is `@AGENTS.md`; AGENTS.md is the real file and is accurate. `origin/master` (2024) has neither file; `community-master` has both. Decide which branch is the default. The local commit `7360e00` is on no remote and probably duplicates upstream's v0.2.2_11. | S, 10 min |
| boostmebitch | 2026-11-19 | ~15,100 | *not re-reviewed* | Its own agent reviewed it today: accurate, but at its word limit. It proposes 3 drift fixes and a diet pass. | — |

## Counts

All 27 reviewed files (19 public, 8 private): **5 OK, 15 SMALL FIXES, 7 REWRITE.**
The 19 public files in the table: 5 OK, 10 SMALL FIXES, 4 REWRITE. The 8 private files: 0 OK, 5 SMALL FIXES, 3 REWRITE.

The facts are mostly right. More than 800 claims were checked, and the wrong ones are few and small (a renamed function, a stale count, a path). The real problem is size and shape: **old files are journals**. They keep dated stories, counts and "Chad's choice" notes that a rule file does not need. The six largest files hold about 63% of the 150,000 words in all 27 files, and each session loads the whole file of the repo it works in.

## Folders with no CLAUDE.md

- `helipad`: a Rust fork of Podcastindex-org/helipad. README has 1,125 words. **Not needed.**
- `HGH-checker`: 8 files, static site. README covers local run and deploy. **Not needed.**
- `web-ui`: a fork of Podcastindex-org/web-ui, 358 files. README covers setup. **Not needed.** If one is ever added: `NODE_OPTIONS=--openssl-legacy-provider`, `yarn` not npm, tests by `react-scripts test` and `yarn test:server`, do not push to Podcastindex-org.

## Patterns to fix in every repo

1. **Dated journals.** "(Chad's choice, 2026-11-08)", PR numbers, measured counts, "not yet observed". Keep the rule. Delete the story, or move it to `docs/`. Put open items in the To do note.
2. **The STE block is copied** (~110 words) into MSP-2.0, MSP-2.0-Desktop-App, stablekraft-app and PC20-Nostr. `global.md` already applies it everywhere. The copies drift: stablekraft-app says 25 words, global says 20. Delete each copy.
3. **Global rules repeated:** the CDP mobile test, the browser test before a PR, the NAS text, "node --test must be bare", commit style and Co-Authored-By lines (the attribution reminder owns those). Cut each to a pointer.
4. **Task Master leftovers.** `.taskmaster/CLAUDE.md` (1,697 words) is imported by HPM-Lightning and ITDV-Lightning. About 60 agent-config files sit in stablekraft-app. They cost tokens and hold no project fact. **Chad decides** if he still uses Task Master.
5. **Big sections to docs/.** Leave a one-line pointer and the rule. MSP-2.0 did this in #183; copy that pattern.
6. **Machine paths that went stale** when the repos moved to `~/Vibe` (PC20-Nostr).

## Suggested order (public repos; the private repos are in the private note)

Do one repo per task. Each task keeps the rules, moves the narrative and changes no meaning.

1. **boostbox** (about 11k tokens saved each session)
2. **stablekraft-app** (about 8k)
3. **MSP-2.0-Desktop-App** (about 7k)
4. **HPM-Lightning** and **ITDV-Lightning** (HPM gets its first real file; the Task Master import saves 2.5k tokens)
   - HPM-Lightning is dropped: the repo was archived on GitHub on 2026-11-23, so it takes no rewrite. ITDV-Lightning stays.
5. **pc20-wiki**, **PC20-Nostr**
6. Small fixes, 10-40 minutes each: musicL-playlist-updater (**start with the `.env` check**), msp-podping-service, chadf-musicl-playlists, pc20-archive, localbitcoiners, square-my-art, project-notes
7. Optional: na-archive, MSP-2.0, chadf-landing-page, Auto-musicL-Maker, helipad-startos

Before step 1, Chad answers three questions: (a) keep the Task Master files? (b) commit the Auto-musicL-Maker CLAUDE.md? (c) which branch is the default of helipad-startos? **Chad answered (c) on 2026-11-19: the default branch is `community-master`.**
