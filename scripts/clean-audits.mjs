#!/usr/bin/env node
// Removes the lines about a private repo's PRs, issues and branches from the old
// daily copies in audits/ (see scripts/lib/clean-audit.mjs). A one-off tool: the
// sync never rewrites an old copy, and the git history keeps the old lines.
//
//   node scripts/clean-audits.mjs --before 2026-11-19 [--dry-run]
//
// --before (required): only copies dated before this day (YYYY-MM-DD) change.
// The private repos are the ones whose To do note .gitignore lists.
// It prints counts only, never a removed line.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanAudit, privateReposFromGitignore } from './lib/clean-audit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const before = args[args.indexOf('--before') + 1];
if (!args.includes('--before') || !/^\d{4}-\d{2}-\d{2}$/.test(before ?? '')) {
  console.error('usage: node scripts/clean-audits.mjs --before YYYY-MM-DD [--dry-run]');
  process.exit(2);
}

const repos = privateReposFromGitignore(readFileSync(path.join(root, '.gitignore'), 'utf8'));
if (!repos.length) {
  console.error('.gitignore lists no private repo (notes/todo/<repo>.md); nothing to do');
  process.exit(1);
}

const dir = path.join(root, 'audits');
const copies = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f) && f.slice(0, 10) < before).sort();
let files = 0;
let lines = 0;
for (const file of copies) {
  const text = readFileSync(path.join(dir, file), 'utf8');
  const result = cleanAudit(text, { owner: 'ChadFarrow', repos });
  if (!result.removed) continue;
  files += 1;
  lines += result.removed;
  if (!dryRun) writeFileSync(path.join(dir, file), result.text);
  console.log(`${dryRun ? 'would clean' : 'cleaned'} audits/${file}: ${result.removed} line(s)`);
}
console.log(`${repos.length} private repos · ${copies.length} copies before ${before} · ${files} changed · ${lines} lines removed`);
