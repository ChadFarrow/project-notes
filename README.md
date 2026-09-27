# project-notes

One place to see the open work across every ChadFarrow repo.

### [→ Open the dashboard](LATEST.md)

The dashboard shows what needs attention now, then the open PRs, issues and branches for each project. It updates every 6 hours.

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

## How it updates

A GitHub Action runs `scripts/sync.mjs` every 6 hours and commits the result. To preview a run locally, use `node scripts/sync.mjs --dry-run`. [CLAUDE.md](CLAUDE.md) has the details.
