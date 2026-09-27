// End to end: a bare repo stands in for GitHub, a clone for ~/Vibe/project-notes,
// and a plain directory for the iCloud vault. No network, no notifications.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AUTO_START, AUTO_END } from '../scripts/lib/notes.mjs';

const SCRIPT = path.resolve(import.meta.dirname, '../scripts/vault-sync.mjs');
const note = (mine, block) => `# a\n\n${mine}\n\n${AUTO_START}\n${block}\n${AUTO_END}\n`;

let tmp, origin, seed, repo, vault, env;

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const write = (root, rel, content) => {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), content);
};
const read = (root, rel) => readFileSync(path.join(root, rel), 'utf8');
const originLog = () => {
  git(seed, 'fetch', '-q', 'origin');
  return git(seed, 'log', '--format=%s', 'origin/main');
};

function run(extraEnv = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, '--now'], { env: { ...process.env, ...env, ...extraEnv }, encoding: 'utf8' });
  return { status: r.status, out: r.stdout + r.stderr };
}
function pushFromSeed(files, message) {
  git(seed, 'pull', '-q', '--rebase', 'origin', 'main');
  for (const [rel, content] of Object.entries(files)) write(seed, rel, content);
  git(seed, 'add', '-A');
  git(seed, 'commit', '-q', '-m', message);
  git(seed, 'push', '-q', 'origin', 'main');
}

before(() => {
  tmp = mkdtempSync(path.join(tmpdir(), 'vault-sync-'));
  origin = path.join(tmp, 'origin.git');
  seed = path.join(tmp, 'seed');
  repo = path.join(tmp, 'repo');
  vault = path.join(tmp, 'vault');
  git(tmp, 'init', '-q', '--bare', '-b', 'main', origin);
  git(tmp, 'clone', '-q', origin, seed);
  for (const dir of [seed]) {
    git(dir, 'config', 'user.name', 'seed');
    git(dir, 'config', 'user.email', 'seed@example.com');
  }
  git(seed, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  write(seed, 'LATEST.md', 'dashboard v1\n');
  write(seed, 'README.md', 'readme\n');
  write(seed, 'CLAUDE.md', 'not for the vault\n');
  write(seed, 'projects/a.md', note('mine', 'block v1'));
  git(seed, 'add', '-A');
  git(seed, 'commit', '-q', '-m', 'seed');
  git(seed, 'push', '-q', '-u', 'origin', 'main');
  git(tmp, 'clone', '-q', origin, repo);
  git(repo, 'config', 'user.name', 'repo');
  git(repo, 'config', 'user.email', 'repo@example.com');
  env = {
    PN_REPO: repo, PN_VAULT: vault, PN_STATE: path.join(tmp, 'state.json'), PN_LOCK: path.join(tmp, 'lock'),
    PN_NO_NOTIFY: '1', PN_NO_WORKFLOW: '1',
  };
});

after(() => rmSync(tmp, { recursive: true, force: true }));

test('the first run fills a new vault and sets Obsidian to put new notes in notes/', () => {
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.equal(read(vault, 'LATEST.md'), 'dashboard v1\n');
  assert.equal(read(vault, 'projects/a.md'), note('mine', 'block v1'));
  assert.equal(existsSync(path.join(vault, 'CLAUDE.md')), false);
  assert.ok(existsSync(path.join(vault, 'notes')));
  assert.equal(JSON.parse(read(vault, '.obsidian/app.json')).newFileFolderPath, 'notes');
  assert.deepEqual(originLog().split('\n'), ['seed']);
});

test('a new note and a note edit from the vault reach the remote', () => {
  write(vault, 'notes/idea.md', 'written on the phone\n');
  write(vault, 'projects/a.md', note('mine, plus a TODO', 'block v1'));
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.equal(originLog().split('\n')[0], 'Sync 2 files from the Obsidian vault');
  git(seed, 'pull', '-q', '--rebase', 'origin', 'main');
  assert.equal(read(seed, 'notes/idea.md'), 'written on the phone\n');
  assert.equal(read(seed, 'projects/a.md'), note('mine, plus a TODO', 'block v1'));
});

test('a new AUTO block and dashboard from the remote reach the vault and keep the vault text', () => {
  pushFromSeed({ 'projects/a.md': note('mine, plus a TODO', 'block v2'), 'LATEST.md': 'dashboard v2\n' }, 'Auto-sync');
  const commits = originLog();
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.equal(read(vault, 'projects/a.md'), note('mine, plus a TODO', 'block v2'));
  assert.equal(read(vault, 'LATEST.md'), 'dashboard v2\n');
  assert.equal(originLog(), commits);
});

test('a second run with nothing new changes nothing', () => {
  const commits = originLog();
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.equal(originLog(), commits);
  assert.equal(r.out.trim(), '');
});

test('an edit on both sides keeps the remote version and a conflict copy in the vault', () => {
  pushFromSeed({ 'projects/a.md': note('edited by Claude', 'block v2') }, 'Edit note');
  write(vault, 'projects/a.md', note('edited on the phone', 'block v2'));
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.equal(read(vault, 'projects/a.md'), note('edited by Claude', 'block v2'));
  const copies = readdirSync(path.join(vault, 'conflicts'));
  assert.equal(copies.length, 1);
  assert.equal(read(vault, `conflicts/${copies[0]}`), note('edited on the phone', 'block v2'));
  assert.match(r.out, /conflict|saved the vault version/);
});

test('an iCloud placeholder is not read as a deletion', () => {
  const commits = originLog();
  rmSync(path.join(vault, 'notes/idea.md'));
  write(vault, 'notes/.idea.md.icloud', 'placeholder');
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.equal(originLog(), commits);
  rmSync(path.join(vault, 'notes/.idea.md.icloud'));
  write(vault, 'notes/idea.md', 'written on the phone\n');
});

test('a run that would delete many repo files stops and deletes nothing', () => {
  pushFromSeed(Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`notes/n${n}.md`, `${n}\n`])), 'Six notes');
  assert.equal(run().status, 0);
  for (const n of [1, 2, 3, 4, 5, 6]) rmSync(path.join(vault, `notes/n${n}.md`));
  const commits = originLog();
  const r = run();
  assert.notEqual(r.status, 0);
  assert.match(r.out, /would delete 6 files/);
  assert.equal(originLog(), commits);
  assert.ok(existsSync(path.join(repo, 'notes/n1.md')));
});

test('a missing vault stops the run once the vault has synced before', () => {
  const moved = `${vault}-away`;
  execFileSync('mv', [vault, moved]);
  const r = run();
  assert.notEqual(r.status, 0);
  assert.match(r.out, /vault folder is missing/);
  assert.equal(existsSync(vault), false);
  execFileSync('mv', [moved, vault]);
});

test('a repo with uncommitted changes or on another branch is skipped', () => {
  write(repo, 'scratch.txt', 'work in progress');
  assert.match(run().out, /skipped: .*uncommitted/);
  rmSync(path.join(repo, 'scratch.txt'));
  git(repo, 'switch', '-q', '-c', 'feature');
  assert.match(run().out, /skipped: .*branch feature/);
  git(repo, 'switch', '-q', 'main');
});
