# How the sync job in this repo runs

This file tells you what runs automatically in this repo, what the job needs, and how to run it on a different machine. Use it if you move the job off GitHub Actions.

## Summary

| Item | Value |
|---|---|
| Workflow file | `.github/workflows/sync-all.yml` |
| Starts when | Every 4 hours. Also by hand, from the web dashboard, and from the vault sync. Also on a push to `main` that changes `site/`, `scripts/`, `notes/TODO.md`, `notes/todo/` or the workflow file. |
| Runs | `node --test`, then `node scripts/sync.mjs --site "$RUNNER_TEMP/site"` |
| Runtime | Node 22 (same as the Mac; change both together) |
| Writes | `LATEST.md`, `audits/`, `INDEX.md`, `references/starred.md`, and the AUTO block of each note in `projects/`. Commit message: `Auto-sync <date>`. |
| Publishes | The web dashboard at https://notes.podtards.com, with GitHub Pages (the `deploy` job) |

`scripts/sync.mjs` is the same command in the workflow and on your own machine. The comment at the top of the file explains the flags (`--dry-run`, `--site <dir>`).

The vault sync (`scripts/vault-sync.mjs`, started by `scripts/com.chadfarrow.project-notes-vault.plist` on the Mac) already runs locally. It does not use GitHub Actions.

## Secrets

These secrets are in **Settings → Secrets and variables → Actions** on GitHub. GitHub does not show the values again, so keep a copy in your password manager.

| Secret | Environment variable in the job | What it is |
|---|---|---|
| `AUDIT_TOKEN` | `AUDIT_TOKEN` | Classic personal access token with `repo` scope. It must read your private repos. |
| (automatic) `GITHUB_TOKEN` | `FALLBACK_TOKEN` | GitHub supplies it. It sees public repos only. If `AUDIT_TOKEN` fails, the script uses this token and gives a warning. |

## Hosting: the web dashboard

The web dashboard is on GitHub Pages, with the custom domain `notes.podtards.com`. The repo does not record these settings:
- **Settings → Pages:** source is "GitHub Actions", custom domain is `notes.podtards.com`.
- **Settings → Environments → github-pages:** only `main` can deploy.
- **DNS (at Cloudflare):** `CNAME notes → chadfarrow.github.io`, **DNS only** (not proxied).

`CLAUDE.md` ("The web dashboard" → "Hosting") has the commands to set up Pages and the domain again.

If you move the job off GitHub, the Pages deploy stops. Then you must serve the `--site` folder from a different host and change the DNS record.

## Run the job locally

These steps are for a Linux server, for example your Ubuntu server.

### 1. Install
```bash
git clone https://github.com/ChadFarrow/project-notes.git
cd project-notes          # no npm install: the scripts use only Node built-ins
```
`scripts/sync.mjs` also needs the GitHub CLI (`gh`), and the `gh` version must have `gh api --slurp`. The Ubuntu package (`gh` 2.45.0) does not have it. Install `gh` from GitHub's own apt repository (https://cli.github.com).

### 2. Put the token in an env file
```bash
# /etc/project-notes.env   (chmod 600, owned by the job user)
AUDIT_TOKEN=ghp_...
```

### 3. Run it
```bash
set -a; . /etc/project-notes.env; set +a
git pull --rebase origin main
node --test
node scripts/sync.mjs --site /srv/notes-site

git add -A
git diff --staged --quiet || git commit -m "Auto-sync $(date -u '+%Y-%m-%d %H:%M UTC')"
git push
```
To push, the clone needs git credentials. Then serve `/srv/notes-site` with your web server, if the dashboard moves off GitHub Pages.

### 4. Schedule
Use a systemd timer or cron: `0 */4 * * *`.

If you run the job locally, disable the `schedule:` trigger in the workflow file. If you do not, GitHub and your server make two `Auto-sync` commits for the same data, and you can get push conflicts.
