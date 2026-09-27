#!/usr/bin/env node
// Two-way sync between this repo and the Obsidian vault in iCloud, so notes can be
// read and written on the phone. Run by the launchd agent
// com.chadfarrow.project-notes-vault (see scripts/com.chadfarrow.project-notes-vault.plist):
// when the vault's projects/ or notes/ folder changes, and every 15 minutes.
//
//   node scripts/vault-sync.mjs         wait 30 s for a burst of saves to end, then sync
//   node scripts/vault-sync.mjs --now   sync at once
//
// What is written by hand syncs both ways; what is generated flows repo → vault only.
// The rules are in scripts/lib/vault.mjs. This file does the I/O and the git work, and
// it stops rather than guesses: a repo with local work, a missing vault, or a run that
// would delete many files from the repo does nothing and says why.
//
// The env overrides (PN_*) exist for test/vault-sync.test.mjs.

import { execFileSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { planSync, zoneOf } from './lib/vault.mjs';

const env = process.env;
const REPO = env.PN_REPO ?? path.resolve(import.meta.dirname, '..');
const VAULT = env.PN_VAULT
  ?? path.join(homedir(), 'Library/Mobile Documents/iCloud~md~obsidian/Documents/project-notes');
const STATE = env.PN_STATE ?? path.join(REPO, '.git', 'vault-sync-state.json');
const LOCK = env.PN_LOCK ?? path.join(tmpdir(), 'project-notes-vault-sync.lock');
const MAX_DELETES = 5;
const SYNC_COMMIT = / from the Obsidian vault$/;

const log = (msg) => console.log(`${new Date().toLocaleString('sv-SE')}  ${msg}`);
function notify(msg) {
  if (env.PN_NO_NOTIFY) return;
  try {
    execFileSync('/usr/bin/osascript', ['-e', `display notification ${JSON.stringify(msg)} with title "project-notes vault"`]);
  } catch { /* a missing notification is not worth failing the run */ }
}
function fail(msg) {
  log(msg);
  notify(msg);
  process.exitCode = 1;
}

const git = (...args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function tryGit(...args) {
  try {
    return { ok: true, out: git(...args) };
  } catch (err) {
    return { ok: false, out: `${err.stderr || err.message}`.trim() };
  }
}

// Every synced file under root, as Map<relative path, Buffer>. An iCloud placeholder
// (.name.icloud) marks a file that exists but is not downloaded: it goes into `skip`,
// because reading it as missing would turn it into a deletion.
function listFiles(root) {
  const files = new Map();
  const skip = new Set();
  const walk = (rel) => {
    for (const entry of readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      const placeholder = /^\.(.+)\.icloud$/.exec(entry.name);
      if (placeholder) skip.add(rel ? `${rel}/${placeholder[1]}` : placeholder[1]);
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && zoneOf(child)) files.set(child, readFileSync(path.join(root, child)));
    }
  };
  walk('');
  return { files, skip };
}

function applyWrites(root, writes) {
  for (const [rel, content] of writes) {
    const abs = path.join(root, rel);
    if (content === null) {
      rmSync(abs, { force: true });
    } else {
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, content);
    }
  }
}

const stamp = () => new Date().toLocaleString('sv-SE').slice(0, 16).replace(':', '');

function takeLock() {
  try {
    mkdirSync(LOCK);
    return true;
  } catch {
    // A lock older than 10 minutes belongs to a run that died; take it over.
    if (Date.now() - statSync(LOCK).mtimeMs < 10 * 60 * 1000) return false;
    rmSync(LOCK, { recursive: true, force: true });
    mkdirSync(LOCK);
    return true;
  }
}

async function main() {
  if (!takeLock()) return;
  try {
    if (!process.argv.includes('--now')) await sleep(30_000);
    await sync();
  } finally {
    rmSync(LOCK, { recursive: true, force: true });
  }
}

async function sync() {
  const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : null;

  // An empty or missing vault must never read as "the user deleted everything".
  if (!existsSync(VAULT)) {
    if (state) return fail(`vault folder is missing (${VAULT}); nothing synced`);
    mkdirSync(VAULT, { recursive: true });
    log(`created the vault at ${VAULT}`);
  }
  mkdirSync(path.join(VAULT, 'notes'), { recursive: true });
  if (!existsSync(path.join(VAULT, '.obsidian'))) {
    // Obsidian puts new notes in the vault root by default, which does not sync.
    applyWrites(VAULT, new Map([['.obsidian/app.json', `${JSON.stringify({
      newFileLocation: 'folder', newFileFolderPath: 'notes', attachmentFolderPath: 'notes/attachments',
    }, null, 2)}\n`]]));
  }

  // The repo must hold nothing but what GitHub has, plus this job's own commits.
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== 'main') return log(`skipped: the repo is on branch ${branch}, not main`);
  if (git('status', '--porcelain')) return log('skipped: the repo has uncommitted changes');
  const fetched = tryGit('fetch', '-q', 'origin');
  if (!fetched.ok) log(`fetch failed, syncing with the local copy: ${fetched.out}`);
  const ahead = git('log', 'origin/main..HEAD', '--format=%s').split('\n').filter(Boolean);
  if (ahead.some((s) => !SYNC_COMMIT.test(s))) return log('skipped: the repo has unpushed commits that are not vault syncs');
  if (fetched.ok) {
    const pulled = tryGit('pull', '-q', '--rebase', 'origin', 'main');
    if (!pulled.ok) {
      tryGit('rebase', '--abort');
      return fail(`git pull failed; nothing synced: ${pulled.out}`);
    }
  }

  const repoSide = listFiles(REPO);
  const vaultSide = listFiles(VAULT);
  const plan = planSync({
    repo: repoSide.files, vault: vaultSide.files, state, stamp: stamp(),
    skip: new Set([...repoSide.skip, ...vaultSide.skip]),
  });

  const deletes = [...plan.toRepo.values()].filter((c) => c === null).length;
  if (deletes > MAX_DELETES && !process.argv.includes('--allow-deletes')) {
    return fail(`the vault would delete ${deletes} files from the repo; nothing synced. `
      + 'If that is right, run: node scripts/vault-sync.mjs --now --allow-deletes');
  }

  // Vault first: it is the side most likely to refuse a write (iCloud, permissions),
  // and a failure here leaves the repo clean for the next run.
  applyWrites(VAULT, plan.toVault);
  for (const [rel, content] of plan.conflicts) {
    let target = rel;
    for (let n = 2; existsSync(path.join(VAULT, target)); n++) target = rel.replace(/(\.[^.]*)?$/, (ext) => ` (${n})${ext}`);
    applyWrites(VAULT, new Map([[target, content]]));
  }
  for (const line of plan.log) log(line);
  if (plan.toVault.size) log(`vault: updated ${plan.toVault.size} file(s) from the repo`);

  if (plan.toRepo.size) {
    applyWrites(REPO, plan.toRepo);
    const paths = [...plan.toRepo.keys()];
    git('add', '-A', '--', ...paths);
    const n = paths.length;
    git('commit', '-q', '-m', `Sync ${n} file${n === 1 ? '' : 's'} from the Obsidian vault`);
    log(`committed: ${paths.join(', ')}`);
  }
  writeFileSync(`${STATE}.tmp`, `${JSON.stringify(plan.state, null, 1)}\n`);
  renameSync(`${STATE}.tmp`, STATE);

  if (git('log', 'origin/main..HEAD', '--format=%h')) push(plan.headerChanged);
  if (plan.conflicts.size) notify(`${plan.conflicts.size} note(s) changed in two places. Your version is in the vault's conflicts folder.`);
}

// The workflow's own auto-sync can land between our pull and our push; rebase and retry.
function push(headerChanged) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (tryGit('push', '-q', 'origin', 'main').ok) {
      log('pushed to origin/main');
      // A new Category, Uses or Track line only shows on the dashboard after a sync run.
      if (headerChanged && !env.PN_NO_WORKFLOW) {
        try {
          execFileSync('gh', ['workflow', 'run', 'sync-all.yml', '-R', 'ChadFarrow/project-notes'], { stdio: 'ignore' });
          log('started the dashboard sync, because a note header changed');
        } catch {
          log('could not start the dashboard sync; the next scheduled run picks up the change');
        }
      }
      return;
    }
    const pulled = tryGit('pull', '-q', '--rebase', 'origin', 'main');
    if (!pulled.ok) {
      tryGit('rebase', '--abort');
      break;
    }
  }
  fail('push failed; the commit is local, and the next run tries again');
}

await main();
