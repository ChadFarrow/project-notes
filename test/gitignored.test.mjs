import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gitIgnored } from '../scripts/lib/gitignored.mjs';

let repo;

before(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'gitignored-'));
  execFileSync('git', ['init', '-q', repo]);
  mkdirSync(path.join(repo, 'notes/todo'), { recursive: true });
  writeFileSync(path.join(repo, '.gitignore'), 'notes/todo/secret.md\nnotes/todo/secret *.md\n');
  for (const name of ['secret.md', 'secret - phone tests.md', 'open.md']) {
    writeFileSync(path.join(repo, 'notes/todo', name), '- [ ] x\n');
  }
});

after(() => rmSync(repo, { recursive: true, force: true }));

test('gitIgnored returns only the paths that git ignores, names with spaces too', () => {
  const got = gitIgnored(repo, ['notes/todo/open.md', 'notes/todo/secret.md', 'notes/todo/secret - phone tests.md']);
  assert.deepEqual([...got].sort(), ['notes/todo/secret - phone tests.md', 'notes/todo/secret.md']);
});

test('gitIgnored returns an empty set when no path is ignored, or no path is given', () => {
  assert.equal(gitIgnored(repo, ['notes/todo/open.md']).size, 0);
  assert.equal(gitIgnored(repo, []).size, 0);
});

test('gitIgnored still knows a deleted path is ignored, so its deletion is never staged', () => {
  assert.deepEqual([...gitIgnored(repo, ['notes/todo/gone.md', 'notes/todo/secret.md'])], ['notes/todo/secret.md']);
  rmSync(path.join(repo, 'notes/todo/secret.md'));
  assert.deepEqual([...gitIgnored(repo, ['notes/todo/secret.md'])], ['notes/todo/secret.md']);
});

test('gitIgnored throws outside a git repo rather than call every path tracked', () => {
  const plain = mkdtempSync(path.join(tmpdir(), 'not-git-'));
  try {
    assert.throws(() => gitIgnored(plain, ['a.md']));
  } finally {
    rmSync(plain, { recursive: true, force: true });
  }
});
