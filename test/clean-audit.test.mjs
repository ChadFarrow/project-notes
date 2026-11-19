import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanAudit, privateReposFromGitignore } from '../scripts/lib/clean-audit.mjs';

// Made-up names only: this repo is public.
const opts = { owner: 'ChadFarrow', repos: ['secret-repo', 'Hush.Box'] };
const GH = 'https://github.com/ChadFarrow';

test('cleanAudit removes the PR, issue and branch lines of a private repo in the dashboard format', () => {
  const text = [
    '## Needs you now',
    '',
    `- **app-one** [#1 Public change](${GH}/app-one/pull/1) — idle 3 days`,
    `- **secret-repo** [#4 Secret ready change](${GH}/secret-repo/pull/4) — idle 2 days`,
    `- [#6 Secret issue words](${GH}/secret-repo/issues/6) — opened 3 days ago`,
    '',
    '#### [secret-repo](../projects/secret-repo.md)',
    '',
    `[2 PRs](${GH}/secret-repo/pulls) · [1 issue](${GH}/secret-repo/issues)`,
    '',
    `- PR [#5 Secret draft change](${GH}/secret-repo/pull/5) — opened 1 day ago · draft`,
    `- Branch [\`secret-branch\`](${GH}/secret-repo/tree/secret-branch) — 4 days`,
    `- [Compare](${GH}/hush.box/compare/main...secret-two)`,
    '',
    '### Quiet — no open work',
    '',
    '[app-one](../projects/app-one.md) · [secret-repo](../projects/secret-repo.md)',
    '',
    '- [secret-repo](../projects/secret-repo.md) — last push 2026-04-07',
    '',
  ].join('\n');
  const { text: out, removed } = cleanAudit(text, opts);
  assert.equal(removed, 5);
  assert.equal(out, [
    '## Needs you now',
    '',
    `- **app-one** [#1 Public change](${GH}/app-one/pull/1) — idle 3 days`,
    '',
    '#### [secret-repo](../projects/secret-repo.md)',
    '',
    `[2 PRs](${GH}/secret-repo/pulls) · [1 issue](${GH}/secret-repo/issues)`,
    '',
    '### Quiet — no open work',
    '',
    '[app-one](../projects/app-one.md) · [secret-repo](../projects/secret-repo.md)',
    '',
    '- [secret-repo](../projects/secret-repo.md) — last push 2026-04-07',
    '',
  ].join('\n'));
  assert.doesNotMatch(out, /Secret|secret-branch|secret-two/);
});

test('cleanAudit removes the PR, issue and branch lines of a private repo in the old flat format', () => {
  const text = [
    '## Open PRs',
    '',
    '- [ ] **app-one #2** — Public words · opened 3 days ago by ChadFarrow',
    '- [ ] **Secret-Repo #3** — Secret words · opened 12 days ago by someone',
    '- [ ] **Hush.Box #9** — More secret words _(draft)_',
    '- [ ] **secret-repo-public #1** — Kept: another repo',
    '- [ ] **HushXBox #1** — Kept: the dot is not a wildcard',
    '',
    '## Branches with no PR',
    '',
    '- [ ] `secret-repo` — `secret-branch`',
    '- [ ] `app-one` — `public-branch`',
    '',
  ].join('\n');
  const { text: out, removed } = cleanAudit(text, opts);
  assert.equal(removed, 3);
  assert.doesNotMatch(out, /Secret words|More secret|secret-branch/);
  for (const kept of ['Public words', 'Kept: another repo', 'Kept: the dot', 'public-branch']) assert.ok(out.includes(kept), kept);
});

test('cleanAudit leaves a copy with no private item byte for byte, and a second run changes nothing', () => {
  const plain = `# Dashboard\r\n\r\n- **app-one** [#1 A](${GH}/app-one/pull/1)\r\n- [secret-repo](../projects/secret-repo.md)\r\n`;
  assert.deepEqual(cleanAudit(plain, opts), { text: plain, removed: 0 });
  const once = cleanAudit(`a\n\n- [#6 X](${GH}/secret-repo/issues/6)\n\nb\n`, opts);
  assert.equal(once.text, 'a\n\nb\n');
  assert.deepEqual(cleanAudit(once.text, opts), { text: once.text, removed: 0 });
});

test('cleanAudit keeps the blank line above a removed run at the top or the end of a file', () => {
  assert.equal(cleanAudit(`- [#6 X](${GH}/secret-repo/issues/6)\n\nb\n`, opts).text, 'b\n');
  assert.equal(cleanAudit(`a\n\n- [#6 X](${GH}/secret-repo/issues/6)\n`, opts).text, 'a\n\n');
});

test('privateReposFromGitignore reads the To do lines of .gitignore', () => {
  const text = '.DS_Store\n# The To do notes of private repos\nnotes/todo/secret-repo.md\nnotes/todo/secret-repo *.md\n'
    + 'notes/todo/Hush.Box.md\nroadmaps/secret-repo.md\n_site/\n';
  assert.deepEqual(privateReposFromGitignore(text), ['secret-repo', 'Hush.Box']);
});
