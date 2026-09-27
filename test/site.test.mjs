import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeRepos } from '../scripts/lib/model.mjs';
import { buildOutputs } from '../scripts/lib/render.mjs';
import { siteDirProblem } from '../scripts/lib/site.mjs';

const pages = JSON.parse(readFileSync(new URL('./fixtures/repos-pages.json', import.meta.url)));
const NOW = new Date('2026-09-27T12:00:00Z');

const NOTES = [
  { file: 'app-one.md', text: '# app-one\n\n**Category:** Apps  \n**Uses:** svc-core  \n\n## Notes\nMine.\n' },
  { file: 'svc-core.md', text: '# svc-core\n\n**Category:** Libraries  \n\n## Notes\n' },
  { file: 'hidden-repo.md', text: '# hidden-repo\n\n**Track:** no  \n' },
  { file: 'upstream-fork.md', text: '# upstream-fork\n\n**Track:** upstream  \n' },
];

function run(degradedReason = null) {
  const out = buildOutputs({
    owner: 'ChadFarrow', now: NOW, repos: normalizeRepos(pages), stars: [], notes: NOTES,
    auditFiles: [], degradedReason,
  });
  return { ...out, data: JSON.parse(out.siteData) };
}
const project = (data, name) => data.projects.find((p) => p.name === name);
const hasWork = (p) => p.prsTotal || p.issuesTotal || p.orphanBranches.length || p.openedElsewhere.length;

test('site data carries the version, the times and the thresholds', () => {
  const { data } = run();
  assert.equal(data.version, 1);
  assert.equal(data.owner, 'ChadFarrow');
  assert.equal(data.generatedAt, '2026-09-27 12:00 UTC');
  assert.equal(data.generatedAtIso, '2026-09-27T12:00:00.000Z');
  assert.deepEqual(data.thresholds, { idleDays: 7, staleDays: 180 });
  assert.equal(data.degradedReason, null);
});

test('site data totals match the dashboard summary line', () => {
  const { data, files } = run();
  const summary = files.get('LATEST.md').split('\n')[2];
  const t = data.totals;
  assert.ok(summary.startsWith(`${t.prs} open PR`), summary);
  assert.ok(summary.includes(` · ${t.issues} open issue`), summary);
  assert.ok(summary.includes(` · ${t.orphanBranches} branch`), summary);
  assert.ok(summary.includes(` · ${t.tracked} tracked repo`), summary);
  assert.ok(summary.includes(`(${t.untracked} not tracked)`), summary);
});

test('site data lists the categories in use in index order, and every repo name', () => {
  const { data, files } = run();
  const headings = files.get('INDEX.md').split('\n').filter((l) => l.startsWith('## ') && l !== '## Reference');
  assert.deepEqual(data.categories, headings.map((h) => h.slice(3)));
  assert.deepEqual(data.repos, ['app-one', 'fork-thing', 'hidden-repo', 'secret-repo', 'svc-core', 'upstream-fork']);
});

test('site data orders projects with open work like the dashboard', () => {
  const { data, files } = run();
  const inDashboard = files.get('LATEST.md').split('\n')
    .filter((l) => l.startsWith('#### ')).map((l) => /\[([^\]]+)\]/.exec(l)[1]);
  const active = data.projects.filter((p) => p.track !== 'no' && hasWork(p));
  const grouped = data.categories.flatMap((c) => active.filter((p) => p.category === c).map((p) => p.name));
  assert.deepEqual(grouped, inDashboard);
});

test('site data keeps the PR state the badges need', () => {
  const { data } = run();
  const pr = project(data, 'app-one').prs[0];
  for (const key of ['number', 'title', 'url', 'isDraft', 'createdAt', 'updatedAt', 'mergeable', 'checks', 'author', 'for']) {
    assert.ok(key in pr, key);
  }
});

test('site data points to the note file, including a stub made in the same run', () => {
  const { data } = run();
  assert.equal(project(data, 'app-one').noteFile, 'app-one.md');
  assert.equal(project(data, 'secret-repo').noteFile, 'secret-repo.md');
});

test('site data lists ready-but-idle PRs, stale repos and shared issues in dashboard order', () => {
  const { data, files } = run();
  const latest = files.get('LATEST.md');
  for (const r of data.readyIdle) assert.ok(latest.includes(`**${r.repo}** [#${r.number} `), `${r.repo} #${r.number}`);
  assert.deepEqual(data.stale.map((s) => s.repo),
    [...latest.split('## Stale')[1].matchAll(/^- \[([^\]]+)\]/gm)].map((m) => m[1]));
  assert.equal(data.issues.shared[0].title, 'Bump nostr-tools');
  assert.deepEqual(data.issues.shared[0].items.map((i) => i.repo), ['app-one', 'svc-core']);
  assert.equal(data.issues.total, Number(/### Open issues \((\d+)\)/.exec(latest)[1]));
});

test('site data shows an untracked project with the index facts only', () => {
  const { data } = run();
  assert.deepEqual(Object.keys(project(data, 'hidden-repo')).sort(), [
    'category', 'description', 'isFork', 'isPrivate', 'language', 'name', 'noteFile', 'parent', 'track', 'url',
  ]);
});

test('site data never carries bodies, marker sources or untracked work', () => {
  const { siteData } = run();
  assert.doesNotMatch(siteData, /forTargets|"body"/);
  assert.doesNotMatch(siteData, /hidden-repo\/(issues|pull)/);
});

test('every URL in the site data is already public in the generated markdown', () => {
  const { siteData, files } = run();
  const markdown = [...files.values()].join('\n');
  const urls = [...siteData.matchAll(/"(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(urls.length > 10);
  for (const url of urls) assert.ok(markdown.includes(url), url);
});

test('site data carries the degraded reason and the problems', () => {
  const { data, problems } = run('AUDIT_TOKEN was rejected');
  assert.equal(data.degradedReason, 'AUDIT_TOKEN was rejected');
  assert.deepEqual(data.problems, problems);
});

test('buildOutputs does not put the site data in the repo', () => {
  const { files } = run();
  assert.ok(![...files.keys()].some((f) => f.endsWith('.json')));
});

test('siteDirProblem refuses the repo, a folder above it and the site sources', () => {
  const root = '/work/project-notes';
  for (const dir of ['/work/project-notes', '/work', '/', '/work/project-notes/site', '/work/project-notes/site/lib']) {
    assert.match(siteDirProblem(root, dir), /--site/, dir);
  }
  for (const dir of ['/work/project-notes/_site', '/tmp/runner/site', '/work/project-notes-site']) {
    assert.equal(siteDirProblem(root, dir), null, dir);
  }
});
