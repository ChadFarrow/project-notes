# project-notes

One place to see the open work across every ChadFarrow repo.

### [→ Open the web dashboard](https://notes.podtards.com)

The web dashboard shows the status of every open PR as a coloured lamp, lets you filter the list, and lets you edit a project's category, the repos it uses, and your notes and TODOs without markdown. To edit, you set up a GitHub token once on each device; the page tells you how.

[The same dashboard as markdown](LATEST.md) shows what needs attention now, then the open PRs, issues and branches for each project. Both update every 4 hours.

- [Project index](INDEX.md) — every repo, grouped by category, with a link to its note
- [Dashboard history](audits/README.md) — one snapshot per day
- [PC2.0 specs](PC2.0-SPECS.md) — which projects use which Podcasting 2.0 tags
- [References](references/README.md) — bookmarks by topic and starred repos

## Project notes

Each repo has a note at `projects/<repo>.md`. Write your notes and TODOs anywhere outside the `<!-- AUTO:START -->` … `<!-- AUTO:END -->` block. The sync rewrites only that block.

These lines at the top of a note control the dashboard:

| Line | Effect |
|---|---|
| `**Category:** Nostr` | Groups the project on the dashboard and in the index. |
| `**Uses:** boostbox, msp-podping-service` | Shows the open work in those repos, and adds a "Used by" line to each of them. |
| `**Track:** no` | Leaves the project out of the dashboard. `**Track:** upstream` hides only its branches and its stale warning. |

To show a PR or an issue under the project it was opened for, add this line to its body:

```
For: ChadFarrow/<project-repo>
```

## Obsidian

The iCloud vault `project-notes` holds a copy of this repo for Obsidian on the Mac and the phone. Notes that you write there reach GitHub within minutes: new notes go in `notes/`, and your text in a project note goes to its file in `projects/`. The dashboard and the live blocks flow the other way only. The Mac mini does the sync, so it must be on.

## How it updates

A GitHub Action runs `scripts/sync.mjs` every 4 hours and commits the result. To preview a run locally, use `node scripts/sync.mjs --dry-run`. [CLAUDE.md](CLAUDE.md) has the details.
