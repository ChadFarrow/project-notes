// Pure data work: raw GraphQL pages → normalized repos → the model the renderers use.
// Nothing here reads the clock, the disk or the network; `now` is passed in.

import { parseHeader } from './notes.mjs';

const DAY = 24 * 60 * 60 * 1000;
export const IDLE_DAYS = 7;
export const STALE_DAYS = 180;

// A marker must start its line (after list, quote or emphasis characters) and name
// the repo as ChadFarrow/<repo>, optionally as a full URL. A loose `For:` match
// catches ordinary prose, so the owner prefix is required.
const FOR_MARKER =
  /^[\s>*_`-]*For:[*_`\s]*(?:https:\/\/github\.com\/)?ChadFarrow\/([A-Za-z0-9._-]+)/gim;

export function parseForMarkers(body) {
  const names = [];
  for (const m of (body || '').matchAll(FOR_MARKER)) {
    const name = m[1].replace(/\.+$/, '');
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

// Flattens the paginated response. Bodies are read for markers and then dropped:
// the repo is public and some of these repos are private.
export function normalizeRepos(pages) {
  return pages.flatMap((page) => page.data.user.repositories.nodes).map((r) => ({
    name: r.name,
    url: r.url,
    description: r.description || '',
    isFork: r.isFork,
    isPrivate: r.isPrivate,
    pushedAt: r.pushedAt,
    language: r.primaryLanguage?.name ?? null,
    parent: r.parent?.nameWithOwner ?? null,
    defaultBranch: r.defaultBranchRef?.name ?? null,
    prsTotal: r.pullRequests.totalCount,
    prs: r.pullRequests.nodes.map((p) => ({
      number: p.number,
      title: p.title,
      url: p.url,
      isDraft: p.isDraft,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      headRefName: p.headRefName,
      mergeable: p.mergeable,
      checks: p.statusCheckRollup?.state ?? null,
      author: p.author?.login ?? 'ghost',
      forTargets: parseForMarkers(p.body),
    })),
    issuesTotal: r.issues.totalCount,
    issues: r.issues.nodes.map((i) => ({
      number: i.number,
      title: i.title,
      url: i.url,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      author: i.author?.login ?? 'ghost',
      comments: i.comments.totalCount,
      forTargets: parseForMarkers(i.body),
    })),
    branchesTotal: r.refs.totalCount,
    branches: r.refs.nodes.map((b) => ({ name: b.name, committedDate: b.target?.committedDate ?? null })),
  }));
}

const byName = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
const newest = (a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);

// notes: [{ file: 'repo.md', header }]. `degraded` means private repos are missing
// from `repos`, so their notes must not be reported as orphans.
export function buildModel({ repos, notes, now, owner, degraded = false }) {
  const problems = [];
  const lookup = new Map(repos.map((r) => [r.name.toLowerCase(), r.name]));
  const noteFor = new Map();
  for (const note of notes) {
    const key = note.file.replace(/\.md$/, '').toLowerCase();
    if (lookup.has(key)) {
      noteFor.set(lookup.get(key), note);
    } else if (!degraded) {
      problems.push(`\`projects/${note.file}\` matches no non-archived repo: archive or delete the note`);
    }
    for (const p of note.header.problems) problems.push(`\`projects/${note.file}\`: ${p}`);
  }

  const projects = [...repos].sort(byName).map((repo) => {
    const note = noteFor.get(repo.name);
    const header = note ? note.header : parseHeader('');
    const uses = [];
    for (const raw of header.uses) {
      const name = lookup.get(raw.toLowerCase());
      if (!name) problems.push(`\`projects/${note.file}\`: \`**Uses:**\` names \`${raw}\`, which is not a non-archived repo`);
      else if (name === repo.name) problems.push(`\`projects/${note.file}\`: \`**Uses:**\` names ${repo.name} itself`);
      else if (!uses.includes(name)) uses.push(name);
    }
    const prHeads = new Set(repo.prs.map((p) => p.headRefName));
    const orphanBranches = header.track === 'upstream' ? [] : repo.branches
      .filter((b) => b.name !== repo.defaultBranch && !prHeads.has(b.name))
      .sort((a, b) => (b.committedDate || '').localeCompare(a.committedDate || '') || a.name.localeCompare(b.name));
    const lastActivity = [repo.pushedAt, ...repo.prs.map((p) => p.updatedAt), ...repo.issues.map((i) => i.updatedAt)]
      .filter(Boolean).sort().at(-1);

    for (const [kind, total, shown] of [
      ['PRs', repo.prsTotal, repo.prs.length],
      ['issues', repo.issuesTotal, repo.issues.length],
      ['branches', repo.branchesTotal, repo.branches.length],
    ]) {
      if (total > shown) problems.push(`\`${repo.name}\`: shows ${shown} of ${total} open ${kind} (list is truncated)`);
    }

    return {
      ...repo,
      prs: repo.prs.map((pr) => ({ ...pr, for: [] })),
      issues: repo.issues.map((issue) => ({ ...issue, for: [] })),
      noteFile: note ? note.file : null,
      category: header.category,
      track: header.track,
      uses,
      usedBy: [],
      orphanBranches,
      openedElsewhere: [],
      stale: header.track === 'yes' && now - new Date(repo.pushedAt) > STALE_DAYS * DAY,
      lastActivity,
    };
  });

  const index = new Map(projects.map((p) => [p.name, p]));
  for (const p of projects) {
    for (const used of p.uses) index.get(used).usedBy.push(p.name);
  }

  for (const source of projects) {
    const items = [
      ...source.prs.map((item) => ({ kind: 'PR', item })),
      ...source.issues.map((item) => ({ kind: 'issue', item })),
    ];
    for (const { kind, item } of items) {
      for (const raw of item.forTargets) {
        const name = lookup.get(raw.toLowerCase());
        if (name === source.name) continue;
        if (!name) {
          problems.push(`\`${source.name} #${item.number}\`: \`For: ChadFarrow/${raw}\` names no non-archived repo`);
          continue;
        }
        if (!item.for.includes(name)) item.for.push(name);
        index.get(name).openedElsewhere.push({
          repo: source.name, kind, number: item.number, title: item.title, url: item.url,
          createdAt: item.createdAt, updatedAt: item.updatedAt,
        });
      }
    }
  }
  for (const p of projects) p.openedElsewhere.sort(newest);

  const tracked = projects.filter((p) => p.track !== 'no');
  const readyIdle = tracked
    .flatMap((project) => project.prs.map((pr) => ({ project, pr })))
    .filter(({ pr }) => pr.author === owner && !pr.isDraft && pr.mergeable !== 'CONFLICTING'
      && (pr.checks === null || pr.checks === 'SUCCESS')
      && now - new Date(pr.updatedAt) >= IDLE_DAYS * DAY)
    .map((r) => ({ ...r, idleDays: Math.floor((now - new Date(r.pr.updatedAt)) / DAY) }))
    .sort((a, b) => a.pr.updatedAt.localeCompare(b.pr.updatedAt));

  const stale = projects.filter((p) => p.stale).sort((a, b) => a.pushedAt.localeCompare(b.pushedAt));

  return { owner, now, projects, index, readyIdle, stale, problems };
}

// ---------- shared by the dashboard and the site data ----------

export const hasWork = (p) => p.prsTotal || p.issuesTotal || p.orphanBranches.length || p.openedElsewhere.length;

export const branchUrl = (p, name) => `${p.url}/tree/${name.split('/').map(encodeURIComponent).join('/')}`;

// Category order: alphabetical, Uncategorized last.
export const compareCategories = (a, b) =>
  (a === 'Uncategorized') - (b === 'Uncategorized') || a.localeCompare(b, 'en', { sensitivity: 'base' });

export function groupByCategory(projects) {
  const groups = new Map();
  for (const p of projects) {
    if (!groups.has(p.category)) groups.set(p.category, []);
    groups.get(p.category).push(p);
  }
  return [...groups.entries()].sort(([a], [b]) => compareCategories(a, b));
}

// Tracked projects with open work, most recent activity first.
export const activeProjects = (tracked) =>
  tracked.filter(hasWork).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));

const newestFirst = (a, b) => b.updatedAt.localeCompare(a.updatedAt);

// The open issues of the tracked projects: issues whose title is open in several repos
// (one group each, most recent activity first, items by repo), then the rest by
// project (newest issue first, projects by their newest issue).
export function issueGroups(tracked) {
  const issues = tracked.flatMap((p) => p.issues.map((i) => ({ ...i, repo: p.name })));
  const byTitle = new Map();
  for (const i of issues) {
    const key = i.title.trim().toLowerCase();
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(i);
  }
  const groups = [...byTitle.values()].filter((g) => new Set(g.map((i) => i.repo)).size > 1);
  const sharedUrls = new Set(groups.flat().map((i) => i.url));
  const latest = (g) => g.map((i) => i.updatedAt).sort().at(-1);
  const shared = groups
    .sort((a, b) => latest(b).localeCompare(latest(a)))
    .map((g) => ({ title: g[0].title.trim(), issues: [...g].sort((a, b) => a.repo.localeCompare(b.repo)) }));
  const byProject = tracked
    .map((project) => ({ project, issues: project.issues.filter((i) => !sharedUrls.has(i.url)).sort(newestFirst) }))
    .filter((g) => g.issues.length)
    .sort((a, b) => newestFirst(a.issues[0], b.issues[0]));
  return { total: issues.length, shared, byProject };
}
