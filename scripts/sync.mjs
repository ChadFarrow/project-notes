#!/usr/bin/env node
// Regenerates the dashboard (LATEST.md + audits/), INDEX.md, references/starred.md and
// the AUTO block of every note in projects/. Same command in the workflow and locally:
//
//   node scripts/sync.mjs            write the changed files
//   node scripts/sync.mjs --dry-run  only list what would change

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fetchRepos, fetchStars, pickToken, probeToken } from './lib/github.mjs';
import { normalizeRepos } from './lib/model.mjs';
import { buildOutputs } from './lib/render.mjs';

const OWNER = 'ChadFarrow';
const root = path.resolve(import.meta.dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const { token, degradedReason, warning } = pickToken(process.env, probeToken);
if (warning) console.log(`::warning::${warning}`);

// Fetch everything before writing anything: a failed fetch must leave the repo untouched.
const repos = normalizeRepos(await fetchRepos(token, OWNER));
const stars = await fetchStars(token, OWNER);

const listMd = (dir) => (existsSync(dir)
  ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile() && d.name.endsWith('.md')).map((d) => d.name)
  : []);
const projectsDir = path.join(root, 'projects');
const notes = listMd(projectsDir).map((file) => ({ file, text: readFileSync(path.join(projectsDir, file), 'utf8') }));

const { files, problems } = buildOutputs({
  owner: OWNER,
  now: new Date(),
  repos,
  stars,
  notes,
  auditFiles: listMd(path.join(root, 'audits')),
  degradedReason,
});

let changed = 0;
for (const [rel, content] of files) {
  const abs = path.join(root, rel);
  const old = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  if (old === content) continue;
  changed++;
  console.log(`${dryRun ? 'would write' : 'wrote'} ${rel}${old === null ? ' (new)' : ''}`);
  if (!dryRun) {
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
}
for (const p of problems) console.log(`::warning::${p}`);
console.log(`${repos.length} repos · ${changed} files ${dryRun ? 'would change' : 'changed'} · ${problems.length} note problems`);
