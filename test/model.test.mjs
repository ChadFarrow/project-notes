import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeRepos, parseForMarkers, buildModel } from '../scripts/lib/model.mjs';
import { parseHeader } from '../scripts/lib/notes.mjs';

const pages = JSON.parse(readFileSync(new URL('./fixtures/repos-pages.json', import.meta.url)));
const NOW = new Date('2026-09-27T12:00:00Z');

function notes() {
  return [
    { file: 'app-one.md', header: parseHeader('**Category:** Apps\n**Uses:** SVC-core, Missing-Lib, app-one\n') },
    { file: 'svc-core.md', header: parseHeader('**Category:** Libraries\n') },
    { file: 'hidden-repo.md', header: parseHeader('**Track:** no\n') },
    { file: 'upstream-fork.md', header: parseHeader('**Track:** upstream\n') },
    { file: 'gone-repo.md', header: parseHeader('') },
  ];
}

function model(extra = {}) {
  return buildModel({ repos: normalizeRepos(pages), notes: notes(), now: NOW, owner: 'ChadFarrow', ...extra });
}

const project = (m, name) => m.projects.find((p) => p.name === name);

// ---------- normalizeRepos ----------

test('normalizeRepos flattens the pages and keeps every repo', () => {
  const repos = normalizeRepos(pages);
  assert.deepEqual(repos.map((r) => r.name),
    ['app-one', 'fork-thing', 'hidden-repo', 'secret-repo', 'svc-core', 'upstream-fork']);
});

test('normalizeRepos drops bodies and keeps the For: targets', () => {
  const svc = normalizeRepos(pages).find((r) => r.name === 'svc-core');
  const issue = svc.issues.find((i) => i.number === 7);
  assert.equal(issue.body, undefined);
  assert.deepEqual(issue.forTargets, ['App-One']);
  assert.ok(!JSON.stringify(normalizeRepos(pages)).includes('Adds the helper'));
});

test('normalizeRepos flattens author, checks, language, parent and branch data', () => {
  const [app] = normalizeRepos(pages);
  const pr = app.prs.find((p) => p.number === 1);
  assert.equal(pr.author, 'ChadFarrow');
  assert.equal(pr.checks, 'SUCCESS');
  assert.equal(app.prs.find((p) => p.number === 5).checks, null);
  assert.equal(app.language, 'TypeScript');
  assert.equal(app.defaultBranch, 'main');
  assert.equal(app.branches.length, 4);
  const fork = normalizeRepos(pages).find((r) => r.name === 'fork-thing');
  assert.equal(fork.parent, 'upstream/fork-thing');
  assert.equal(fork.language, null);
});

// ---------- parseForMarkers ----------

test('parseForMarkers reads the plain, bold, URL and multiple forms', () => {
  assert.deepEqual(parseForMarkers('text\nFor: ChadFarrow/app-one\n'), ['app-one']);
  assert.deepEqual(parseForMarkers('**For:** https://github.com/ChadFarrow/App-One.'), ['App-One']);
  assert.deepEqual(parseForMarkers('> For: `ChadFarrow/a`\n- For: ChadFarrow/b\nFor: ChadFarrow/a'), ['a', 'b']);
});

test('parseForMarkers ignores prose that is not a marker', () => {
  assert.deepEqual(parseForMarkers('Two models.\nFor: rule 2 both are fine, see ChadFarrow/app-one'), []);
  assert.deepEqual(parseForMarkers('This work is For: ChadFarrow/app-one'), []);
  assert.deepEqual(parseForMarkers(null), []);
});

// ---------- ready but idle ----------

test('readyIdle keeps own, non-draft, green, non-conflicting PRs idle 7+ days', () => {
  const m = model();
  assert.deepEqual(m.readyIdle.map((r) => `${r.project.name}#${r.pr.number}`), ['app-one#6', 'app-one#1']);
  assert.equal(m.readyIdle[1].idleDays, 7);
  // #2 draft, #3 conflict, #5 only 6.9 days, #9 failing, #10 pending, #11 bot: all out.
});

test('readyIdle ignores PRs in untracked repos', () => {
  const m = buildModel({
    repos: normalizeRepos(pages),
    notes: [{ file: 'app-one.md', header: parseHeader('**Track:** no\n') }],
    now: NOW, owner: 'ChadFarrow',
  });
  assert.deepEqual(m.readyIdle, []);
});

// ---------- Uses, Used by, For ----------

test('uses resolves names without case and reports unknown and self names', () => {
  const m = model();
  assert.deepEqual(project(m, 'app-one').uses, ['svc-core']);
  assert.deepEqual(project(m, 'svc-core').usedBy, ['app-one']);
  assert.ok(m.problems.some((p) => p.includes('Missing-Lib')));
  assert.ok(m.problems.some((p) => p.includes('app-one.md') && p.includes('itself')));
});

test('openedElsewhere collects marked items from other repos, newest first', () => {
  const m = model();
  const items = project(m, 'app-one').openedElsewhere;
  assert.deepEqual(items.map((i) => `${i.repo} ${i.kind} #${i.number}`),
    ['secret-repo PR #3', 'svc-core issue #7']);
});

test('a For: marker naming its own repo is ignored, an unknown one is a problem', () => {
  const m = model();
  assert.deepEqual(project(m, 'svc-core').openedElsewhere, []);
  assert.ok(m.problems.some((p) => p.includes('svc-core #8') && p.includes('nope')));
  assert.equal(m.problems.filter((p) => p.includes('svc-core #8')).length, 1);
});

// ---------- branches, tracking, stale ----------

test('orphan branches skip the default branch and PR heads, newest first', () => {
  const m = model();
  assert.deepEqual(project(m, 'app-one').orphanBranches.map((b) => b.name), ['newer-branch', 'old-branch']);
  assert.deepEqual(project(m, 'secret-repo').orphanBranches, []);
  assert.deepEqual(project(m, 'fork-thing').orphanBranches.map((b) => b.name), ['patch-1']);
});

test('Track: upstream hides branches and the stale flag', () => {
  const p = project(model(), 'upstream-fork');
  assert.equal(p.track, 'upstream');
  assert.deepEqual(p.orphanBranches, []);
  assert.equal(p.stale, false);
});

test('stale lists tracked repos with no push for more than 180 days, oldest first', () => {
  const m = model();
  assert.deepEqual(m.stale.map((p) => p.name), ['fork-thing']);
  assert.equal(project(m, 'app-one').stale, false);
});

test('a repo with no note gets the default header and a null note file', () => {
  const p = project(model(), 'secret-repo');
  assert.equal(p.noteFile, null);
  assert.equal(p.category, 'Uncategorized');
  assert.equal(p.track, 'yes');
});

test('categories come from the notes', () => {
  const m = model();
  assert.equal(project(m, 'app-one').category, 'Apps');
  assert.equal(project(m, 'app-one').noteFile, 'app-one.md');
});

// ---------- problems ----------

test('an orphan note is a problem, except when the run is degraded', () => {
  assert.ok(model().problems.some((p) => p.includes('gone-repo.md')));
  assert.ok(!model({ degraded: true }).problems.some((p) => p.includes('gone-repo.md')));
});

test('a truncated list is a problem', () => {
  assert.ok(model().problems.some((p) => p.includes('svc-core') && p.includes('3 of 5')));
});

test('note header problems are passed through with the file name', () => {
  const m = buildModel({
    repos: normalizeRepos(pages),
    notes: [{ file: 'app-one.md', header: parseHeader('**Track:** maybe\n') }],
    now: NOW, owner: 'ChadFarrow',
  });
  assert.ok(m.problems.some((p) => p.includes('app-one.md') && p.includes('maybe')));
});

test('lastActivity is the later of the push and the newest item update', () => {
  const m = model();
  assert.equal(project(m, 'app-one').lastActivity, '2026-09-27T11:00:00Z');
  assert.equal(project(m, 'fork-thing').lastActivity, '2026-01-01T00:00:00Z');
});
