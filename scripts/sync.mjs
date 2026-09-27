#!/usr/bin/env node
// Regenerates the dashboard (LATEST.md + audits/), INDEX.md, references/starred.md and
// the AUTO block of every note in projects/. Same command in the workflow and locally:
//
//   node scripts/sync.mjs              write the changed files
//   node scripts/sync.mjs --dry-run    only list what would change
//   ... --site <dir>                   also build the web dashboard into <dir>
//                                      (site/ + data.json + lib/notes.js); --dry-run
//                                      does not stop this, it only guards the repo

import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fetchRepos, fetchStars, pickToken, probeToken } from './lib/github.mjs';
import { normalizeRepos } from './lib/model.mjs';
import { buildOutputs } from './lib/render.mjs';
import { siteDirProblem } from './lib/site.mjs';

const OWNER = 'ChadFarrow';
const root = path.resolve(import.meta.dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const siteFlag = process.argv.indexOf('--site');
const siteDir = siteFlag >= 0 ? path.resolve(process.argv[siteFlag + 1] || '') : null;
if (siteDir) {
  const problem = siteFlag + 1 >= process.argv.length ? '--site needs a folder' : siteDirProblem(root, siteDir);
  if (problem) {
    console.error(problem);
    process.exit(2);
  }
}

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

const { files, problems, siteData } = buildOutputs({
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
// The site is built after the repo files, from the same fetch. Existing files in the
// folder are overwritten, never deleted.
if (siteDir) {
  cpSync(path.join(root, 'site'), siteDir, { recursive: true });
  writeFileSync(path.join(siteDir, 'data.json'), siteData);
  mkdirSync(path.join(siteDir, 'lib'), { recursive: true });
  // .js, not .mjs: a module script needs a JavaScript MIME type from the server.
  copyFileSync(path.join(root, 'scripts/lib/notes.mjs'), path.join(siteDir, 'lib/notes.js'));
  console.log(`built the site in ${siteDir}`);
}
for (const p of problems) console.log(`::warning::${p}`);
console.log(`${repos.length} repos · ${changed} files ${dryRun ? 'would change' : 'changed'} · ${problems.length} note problems`);
