// Which of these paths does git ignore? A git-ignored to-do note (the list of a private
// repo) lives in the checkout and the Obsidian vault only: the vault sync must not stage
// it, and the dashboard must not read it. Node only; not for the browser.

import { execFileSync } from 'node:child_process';

// root: the checkout. paths: relative to root, existing or deleted. Returns the Set of
// the ignored ones. Throws when git fails (not a repo, a bad path): a caller must never
// read "git could not tell" as "nothing is ignored".
export function gitIgnored(root, paths) {
  if (!paths.length) return new Set();
  try {
    // NUL-separated both ways, so a name with spaces or accents comes back as it went in.
    const out = execFileSync('git', ['check-ignore', '--stdin', '-z'], {
      cwd: root, encoding: 'utf8', input: `${paths.join('\0')}\0`, stdio: ['pipe', 'pipe', 'pipe'],
    });
    return new Set(out.split('\0').filter(Boolean));
  } catch (err) {
    if (err.status === 1) return new Set(); // git's answer for "none of them"
    throw err;
  }
}
