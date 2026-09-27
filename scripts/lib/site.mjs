// Pure JSON output for the web dashboard: model → the data.json that site/app.js reads.
// It carries only what LATEST.md, INDEX.md and the note AUTO blocks already publish:
// the site is public, and some of these repos are private. Item bodies never get here.

import { createHash } from 'node:crypto';
import {
  activeProjects, branchUrl, compareCategories, hasWork, IDLE_DAYS, issueGroups, STALE_DAYS,
} from './model.mjs';

export const SITE_DATA_VERSION = 1;

// The files of the published site. `sources`: site/ as name → text. Every __BUILD__ in
// them becomes one id derived from the code, so a browser never pairs a cached app.js
// with a newer lib/notes.js (Pages caches each file for 10 minutes).
export function buildSiteFiles({ sources, notesSource, siteData }) {
  const hash = createHash('sha256');
  for (const [name, text] of [...sources].sort(([a], [b]) => a.localeCompare(b))) hash.update(`${name}\n${text}\n`);
  hash.update(notesSource);
  const id = hash.digest('hex').slice(0, 12);
  const files = new Map();
  for (const [name, text] of sources) files.set(name, text.replaceAll('__BUILD__', id));
  // .js, not .mjs: a module script needs a JavaScript MIME type from the server.
  files.set('lib/notes.js', notesSource);
  files.set('data.json', siteData);
  return files;
}

// `sync.mjs --site <dir>` writes into <dir>. Inside the checkout only the gitignored
// _site/ is allowed, because the workflow commits with `git add -A`; a folder above
// the checkout is refused too. Absolute paths.
export function siteDirProblem(root, dir) {
  const inside = (outer, inner) => inner === outer || inner.startsWith(outer.endsWith('/') ? outer : `${outer}/`);
  if (inside(dir, root)) return `--site ${dir} is the repo or a folder above it`;
  if (inside(root, dir) && !inside(`${root}/_site`, dir)) return `--site ${dir} is inside the repo; use _site or a folder outside it`;
  return null;
}

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

// What INDEX.md shows for every repo, tracked or not.
const INDEX_FACTS = ['name', 'url', 'description', 'language', 'isFork', 'parent', 'isPrivate', 'category', 'track'];
const PR_FIELDS = ['number', 'title', 'url', 'isDraft', 'createdAt', 'mergeable', 'checks', 'author', 'for'];
const ISSUE_FIELDS = ['number', 'title', 'url', 'createdAt', 'author', 'comments', 'for'];
const ELSEWHERE_FIELDS = ['repo', 'kind', 'number', 'title', 'url', 'createdAt'];

const noteFileOf = (p) => p.noteFile ?? `${p.name}.md`;

function projectData(p, model) {
  const facts = { ...pick(p, INDEX_FACTS), noteFile: noteFileOf(p) };
  // An untracked project is listed so its Track can be switched back on, but its
  // work stays out, as it does on the dashboard.
  if (p.track === 'no') return facts;
  return {
    ...facts,
    stale: p.stale,
    prsTotal: p.prsTotal,
    issuesTotal: p.issuesTotal,
    prs: p.prs.map((pr) => pick(pr, PR_FIELDS)),
    issues: p.issues.map((i) => pick(i, ISSUE_FIELDS)),
    openedElsewhere: p.openedElsewhere.map((e) => pick(e, ELSEWHERE_FIELDS)),
    orphanBranches: p.orphanBranches.map((b) => ({ name: b.name, url: branchUrl(p, b.name) })),
    uses: p.uses.map((name) => {
      const used = model.index.get(name);
      return { name, prsTotal: used.prsTotal, issuesTotal: used.issuesTotal };
    }),
    usedBy: p.usedBy,
  };
}

export function renderSiteData(model, { generatedAt, generatedAtIso, degradedReason, problems }) {
  const tracked = model.projects.filter((p) => p.track !== 'no');
  const active = activeProjects(tracked);
  const rest = model.projects.filter((p) => !active.includes(p));
  const sum = (f) => tracked.reduce((n, p) => n + f(p), 0);
  const issues = issueGroups(tracked);

  const data = {
    version: SITE_DATA_VERSION,
    owner: model.owner,
    generatedAt,
    generatedAtIso,
    degradedReason: degradedReason || null,
    thresholds: { idleDays: IDLE_DAYS, staleDays: STALE_DAYS },
    totals: {
      prs: sum((p) => p.prsTotal),
      issues: sum((p) => p.issuesTotal),
      orphanBranches: sum((p) => p.orphanBranches.length),
      tracked: tracked.length,
      untracked: model.projects.length - tracked.length,
      active: tracked.filter(hasWork).length,
    },
    categories: [...new Set(model.projects.map((p) => p.category))].sort(compareCategories),
    repos: model.projects.map((p) => p.name),
    // Projects with open work in dashboard order, then the rest by name.
    projects: [...active, ...rest].map((p) => projectData(p, model)),
    readyIdle: model.readyIdle.map(({ project, pr, idleDays }) => ({ repo: project.name, number: pr.number, idleDays })),
    issues: {
      total: issues.total,
      shared: issues.shared.map((g) => ({
        title: g.title,
        items: g.issues.map((i) => ({ repo: i.repo, number: i.number, url: i.url })),
      })),
      byProject: issues.byProject.map((g) => ({ repo: g.project.name, numbers: g.issues.map((i) => i.number) })),
    },
    stale: model.stale.map((p) => ({ repo: p.name, pushedAt: p.pushedAt })),
    problems,
  };
  return `${JSON.stringify(data, null, 1)}\n`;
}
