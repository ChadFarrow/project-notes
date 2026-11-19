// Removes, from one old daily copy in audits/, each line about a PR, an issue or a
// branch of a private repo (Chad, 2026-11-19). Every other line stays byte for byte.
// Pure: no imports, no I/O. `scripts/clean-audits.mjs` runs it over the folder.

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The private repos are the ones whose To do note .gitignore lists (CLAUDE.md,
// *Private To do notes*): `notes/todo/<repo>.md`.
export function privateReposFromGitignore(text) {
  return text.split(/\r?\n/).map((l) => l.match(/^notes\/todo\/([^\s*/]+)\.md$/)).filter(Boolean).map((m) => m[1]);
}

// A line goes when it links one item of a private repo (a PR, an issue, a branch, a
// compare or a commit; a list page such as /pulls stays), or when it is an item of
// the old flat format (before 2026-09-27), which had no links: `**repo #N**` or
// `` `repo` — `branch` ``. Repo names match in any case, as GitHub's do.
// A blank line that a removal leaves next to another blank line goes too.
export function cleanAudit(text, { owner, repos }) {
  if (!repos.length) return { text, removed: 0 };
  const names = repos.map(escapeRe).join('|');
  const link = new RegExp(`github\\.com/${escapeRe(owner)}/(?:${names})/(?:pull|issues|tree|compare|commits?)/[^\\s)]`, 'i');
  const flat = new RegExp(`^\\s*- (?:\\[[ xX]\\] )?(?:\\*\\*(?:${names}) #\\d+\\*\\*|\`(?:${names})\` — )`, 'i');
  const hit = (line) => link.test(line) || flat.test(line);

  const lines = text.split('\n');
  const out = [];
  let removed = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (!hit(lines[i])) { out.push(lines[i]); continue; }
    let end = i;
    while (end + 1 < lines.length && hit(lines[end + 1])) end += 1;
    removed += end - i + 1;
    const blankAbove = out.length === 0 || out[out.length - 1].trim() === '';
    // The last element is what follows the final newline; it is never dropped.
    if (blankAbove && end + 1 < lines.length - 1 && lines[end + 1].trim() === '') end += 1;
    i = end;
  }
  return removed ? { text: out.join('\n'), removed } : { text, removed: 0 };
}
