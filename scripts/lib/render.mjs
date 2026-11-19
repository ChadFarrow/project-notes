// Pure markdown output: model → LATEST.md, audits, INDEX.md, the note blocks and
// references/starred.md. `buildOutputs` ties it together and returns every file the
// sync should write, keyed by path relative to the repo root.

import {
  activeProjects, branchUrl, buildModel, groupByCategory, hasWork, IDLE_DAYS, issueGroups, STALE_DAYS,
} from './model.mjs';
import { parseHeader, spliceAutoBlock, stubNote } from './notes.mjs';
import { publicTodo, renderSiteData } from './site.mjs';

const MD_SPECIAL = /[\\[\]<>*_`]/g;

export function escapeMd(s) {
  return String(s ?? '').replace(/\s*\n\s*/g, ' ').replace(MD_SPECIAL, (c) => `\\${c}`);
}

const plural = (n, word, words = `${word}s`) => `${n} ${n === 1 ? word : words}`;
const day = (iso) => iso.slice(0, 10);

function ago(iso, now) {
  const mins = Math.floor((now - new Date(iso)) / 60000);
  const unit = (n, word) => `${plural(n, word)} ago`;
  if (mins < 1) return 'just now';
  if (mins < 60) return unit(mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return unit(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 60) return unit(days, 'day');
  if (days < 730) return unit(Math.floor(days / 30), 'month');
  return unit(Math.floor(days / 365), 'year');
}

const noteFile = (model, name) => model.index.get(name).noteFile ?? `${name}.md`;
const noteLink = (model, name, prefix) => `[${name}](${prefix}${noteFile(model, name)})`;

function workCounts(p) {
  const parts = [];
  if (p.prsTotal) parts.push(plural(p.prsTotal, 'PR'));
  if (p.issuesTotal) parts.push(plural(p.issuesTotal, 'issue'));
  return parts.length ? parts.join(', ') : 'no open work';
}

// A watched repo: a link and its counts, never a title (see `watchQuery`).
const watchText = (w) => `[${w.repo}](${w.url}) (${[
  ...(w.isPrivate ? ['private'] : []), workCounts(w), ...(w.issuesMine ? [`${w.issuesMine} opened by you`] : []),
].join(' · ')})`;

// The state words of a PR, in this order, and how a private repo counts them.
const PR_STATES = [
  ['draft', (pr) => pr.isDraft, (n) => plural(n, 'draft')],
  ['merge conflict', (pr) => pr.mergeable === 'CONFLICTING', (n) => plural(n, 'merge conflict')],
  ['checks failing', (pr) => pr.checks === 'FAILURE' || pr.checks === 'ERROR', (n) => `${n} with checks failing`],
  ['checks pending', (pr) => pr.checks === 'PENDING' || pr.checks === 'EXPECTED', (n) => `${n} with checks pending`],
];

function prTags(pr, owner) {
  const tags = PR_STATES.filter(([, has]) => has(pr)).map(([word]) => word);
  if (pr.author !== owner) tags.push(`by ${pr.author}`);
  return tags;
}

// ---------- private repos: counts only ----------

const COUNTS_ONLY = 'private repo, counts only';

// A private project's open work: each count links to its list on GitHub, and the PR count
// says how many PRs are in each state. No title, no branch name. '' when there is none.
function countsOnlyText(p) {
  const parts = [];
  if (p.prsTotal) {
    const states = PR_STATES.map(([, has, count]) => [p.prStates.filter(has).length, count])
      .filter(([n]) => n).map(([n, count]) => count(n));
    parts.push(`[${plural(p.prsTotal, 'PR')}](${p.url}/pulls)${states.length ? ` (${states.join(', ')})` : ''}`);
  }
  if (p.issuesTotal) parts.push(`[${plural(p.issuesTotal, 'issue')}](${p.url}/issues)`);
  if (p.orphanBranchesTotal) {
    parts.push(`[${plural(p.orphanBranchesTotal, 'branch', 'branches')} with no PR](${p.url}/branches)`);
  }
  return parts.join(' · ');
}

// Items a private repo opened for this project: one line per repo, with counts, by name.
function countedElsewhere(entries, model, prefix) {
  const byRepo = new Map();
  for (const e of entries.filter((x) => x.countsOnly)) {
    if (!byRepo.has(e.repo)) byRepo.set(e.repo, { PR: 0, issue: 0 });
    byRepo.get(e.repo)[e.kind]++;
  }
  return [...byRepo].sort(([a], [b]) => a.localeCompare(b)).map(([repo, n]) => `${noteLink(model, repo, prefix)} — ${
    [n.PR ? plural(n.PR, 'PR') : '', n.issue ? plural(n.issue, 'issue') : ''].filter(Boolean).join(', ')} · ${COUNTS_ONLY}`);
}

const idleText = (r) => (r.count > 1 && r.minIdleDays !== r.idleDays
  ? `idle ${r.minIdleDays} to ${plural(r.idleDays, 'day')}` : `idle ${plural(r.idleDays, 'day')}`);

const forText = (item, model, prefix) =>
  item.for.length ? [`for ${item.for.map((n) => noteLink(model, n, prefix)).join(', ')}`] : [];

const line = (link, details) => `- ${link}${details.length ? ` — ${details.join(' · ')}` : ''}`;
const itemLink = (item, label = `#${item.number}`) => `[${label} ${escapeMd(item.title)}](${item.url})`;

function repoFacts(p) {
  const facts = [`[ChadFarrow/${p.name}](${p.url})`];
  if (p.language) facts.push(p.language);
  if (p.isFork) facts.push(p.parent ? `fork of ${p.parent}` : 'fork');
  if (p.isPrivate) facts.push('private');
  return facts.join(' · ');
}

// ---------- the note block ----------

// Everything in here must depend only on GitHub data, never on the clock: a run
// that changes nothing must leave every hand-edited note byte-identical.
export function renderAutoBlock(p, model) {
  const out = [
    '<!-- Generated by scripts/sync.mjs. Do not edit between the AUTO markers. -->',
    '## Live status',
    '',
    `- **Repo:** ${repoFacts(p)}`,
  ];
  if (p.track === 'no') {
    out.push('', '_Not tracked: this note has `**Track:** no`, so the dashboard leaves the project out._');
    return out.join('\n');
  }
  if (p.uses.length) {
    out.push(`- **Uses:** ${p.uses.map((n) => `${noteLink(model, n, '')} (${workCounts(model.index.get(n))})`).join(', ')}`);
  }
  if (p.usedBy.length) out.push(`- **Used by:** ${p.usedBy.map((n) => noteLink(model, n, '')).join(', ')}`);
  if (p.watch.length) out.push(`- **Watch:** ${p.watch.map(watchText).join(', ')}`);
  const counts = p.countsOnly ? countsOnlyText(p) : '';
  if (counts) {
    out.push(`- **Open work:** ${counts}`, '',
      '_A private repo: this public note shows counts only, never a title or a branch name._');
  }

  const byNumber = (a, b) => b.number - a.number;
  const more = (shown, total, path) =>
    total > shown ? [`- [${total - shown} more on GitHub](${model.index.get(p.name).url}/${path})`] : [];

  const sections = [];
  if (p.prsTotal && !p.countsOnly) {
    sections.push([`### Pull requests (${p.prsTotal})`, '',
      ...[...p.prs].sort(byNumber).map((pr) =>
        line(itemLink(pr), [`opened ${day(pr.createdAt)}`, ...prTags(pr, model.owner), ...forText(pr, model, '')])),
      ...more(p.prs.length, p.prsTotal, 'pulls')]);
  }
  if (p.issuesTotal && !p.countsOnly) {
    sections.push([`### Issues (${p.issuesTotal})`, '',
      ...[...p.issues].sort(byNumber).map((i) =>
        line(itemLink(i), [`opened ${day(i.createdAt)}`, ...(i.author !== model.owner ? [`by ${i.author}`] : []),
          ...forText(i, model, '')])),
      ...more(p.issues.length, p.issuesTotal, 'issues')]);
  }
  if (p.openedElsewhere.length) {
    sections.push([`### Opened elsewhere for this project (${p.openedElsewhere.length})`, '',
      ...p.openedElsewhere.filter((e) => !e.countsOnly).sort((a, b) => a.repo.localeCompare(b.repo) || b.number - a.number)
        .map((e) => line(itemLink(e, `${e.repo} #${e.number}`), [e.kind, `opened ${day(e.createdAt)}`])),
      ...countedElsewhere(p.openedElsewhere, model, '').map((text) => `- ${text}`)]);
  }
  if (p.orphanBranches.length) {
    sections.push([`### Branches with no open PR (${p.orphanBranches.length})`, '',
      ...[...p.orphanBranches].sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => `- [\`${b.name}\`](${branchUrl(p, b.name)})`)]);
  }
  if (!sections.length && !counts) out.push('', '_No open work._');
  for (const s of sections) out.push('', ...s);
  return out.join('\n');
}

// ---------- the dashboard ----------

export function renderDashboard(model, { generatedAt, degradedReason, base, problems }) {
  const { now, owner } = model;
  const notes = `${base}projects/`;
  const tracked = model.projects.filter((p) => p.track !== 'no');
  const untracked = model.projects.length - tracked.length;
  const sum = (f) => tracked.reduce((n, p) => n + f(p), 0);
  const out = [`# Dashboard — ${generatedAt}`, ''];

  if (degradedReason) {
    out.push(
      '> [!WARNING]',
      '> **This dashboard is incomplete — private repositories are missing.**',
      '>',
      `> ${degradedReason}, so this ran with the default \`GITHUB_TOKEN\`, which`,
      '> only sees public repos. Every section below is public-only; open PRs,',
      '> issues and branches in private repos are absent, not resolved.',
      '>',
      '> Fix: rotate the secret (repo Settings → Secrets and variables → Actions →',
      '> `AUDIT_TOKEN`) with a PAT carrying `repo` scope, then re-run the workflow.',
      '',
    );
  }

  out.push(
    `${plural(sum((p) => p.prsTotal), 'open PR')} · ${plural(sum((p) => p.issuesTotal), 'open issue')} · `
      + `${plural(sum((p) => p.orphanBranchesTotal), 'branch', 'branches')} with no PR · `
      + `${plural(tracked.length, 'tracked repo')}${untracked ? ` (${untracked} not tracked)` : ''}`,
    '',
    `[Project index](${base}INDEX.md) · [Dashboard history](${base}audits/README.md)`,
    '',
    '## Needs you now',
    '',
    `### Ready to merge — idle ${IDLE_DAYS}+ days (${model.readyIdle.reduce((n, r) => n + (r.pr ? 1 : r.count), 0)})`,
    '',
  );
  if (model.readyIdle.length) {
    for (const r of model.readyIdle) {
      const { project, pr } = r;
      out.push(pr
        ? `- **${project.name}** ${itemLink(pr)} — ${idleText(r)} · ${pr.checks === 'SUCCESS' ? 'checks passing' : 'no checks'}`
        : `- **${project.name}** [${plural(r.count, 'PR')}](${project.url}/pulls) — ${idleText(r)} · ${COUNTS_ONLY}`);
    }
  } else {
    out.push('_None._');
  }

  // Issues: one line for titles open in several repos, then the rest by project.
  const issues = issueGroups(tracked);
  out.push('', `### Open issues (${issues.total})`);
  if (issues.shared.length) {
    out.push('', '**Same title in several repos**', '');
    for (const g of issues.shared) {
      const links = g.issues.map((i) => `[${i.repo} #${i.number}](${i.url})`);
      out.push(`- ${escapeMd(g.title)} — ${links.join(' · ')}`);
    }
  }
  for (const { project: p, issues: list } of issues.byProject) {
    out.push('', `**${noteLink(model, p.name, notes)}**`, '');
    for (const i of list) {
      const details = [`opened ${ago(i.createdAt, now)}`];
      if (i.author !== owner) details.push(`by ${i.author}`);
      if (i.comments) details.push(plural(i.comments, 'comment'));
      out.push(line(itemLink(i), [...details, ...forText(i, model, notes)]));
    }
  }
  for (const { project: p, count } of issues.counted) {
    out.push('', `**${noteLink(model, p.name, notes)}**`, '', `- [${plural(count, 'open issue')}](${p.url}/issues) — ${COUNTS_ONLY}`);
  }
  if (!issues.total) out.push('', '_None._');

  // Projects with open work, by category.
  out.push('', '## Projects');
  const active = activeProjects(tracked);
  for (const [category, projects] of groupByCategory(active)) {
    out.push('', `### ${category}`);
    for (const p of projects) {
      const facts = [];
      const counts = p.countsOnly ? countsOnlyText(p) : '';
      if (counts) facts.push(counts, COUNTS_ONLY);
      if (p.prsTotal && !p.countsOnly) facts.push(plural(p.prsTotal, 'PR'));
      if (p.issuesTotal && !p.countsOnly) facts.push(plural(p.issuesTotal, 'issue'));
      if (p.orphanBranchesTotal && !p.countsOnly) facts.push(`${plural(p.orphanBranchesTotal, 'branch', 'branches')} with no PR`);
      if (p.uses.length) {
        facts.push(`uses ${p.uses.map((n) => `${noteLink(model, n, notes)} (${workCounts(model.index.get(n))})`).join(', ')}`);
      }
      if (p.usedBy.length) facts.push(`used by ${p.usedBy.map((n) => noteLink(model, n, notes)).join(', ')}`);
      if (p.watch.length) facts.push(`watches ${p.watch.map(watchText).join(', ')}`);
      out.push('', `#### ${noteLink(model, p.name, notes)}`, '', facts.join(' · '));

      const items = [];
      for (const pr of p.prs) {
        items.push(line(`PR ${itemLink(pr)}`, [`opened ${ago(pr.createdAt, now)}`, ...prTags(pr, owner), ...forText(pr, model, notes)]));
      }
      for (const e of p.openedElsewhere.filter((x) => !x.countsOnly)) {
        items.push(line(`Opened elsewhere: ${itemLink(e, `${e.repo} #${e.number}`)}`, [e.kind, `opened ${ago(e.createdAt, now)}`]));
      }
      for (const text of countedElsewhere(p.openedElsewhere, model, notes)) items.push(`- Opened elsewhere: ${text}`);
      for (const b of p.orphanBranches.slice(0, 10)) items.push(`- Branch [\`${b.name}\`](${branchUrl(p, b.name)}) — no PR`);
      if (p.orphanBranches.length > 10) {
        items.push(`- [${p.orphanBranches.length - 10} more branches with no PR](${notes}${noteFile(model, p.name)})`);
      }
      if (items.length) out.push('', ...items);
    }
  }
  const quiet = tracked.filter((p) => !hasWork(p));
  if (quiet.length) {
    out.push('', '### Quiet — no open work', '', quiet.map((p) => noteLink(model, p.name, notes)).join(' · '));
  }

  out.push('', `## Stale — no push in ${STALE_DAYS}+ days`, '');
  if (model.stale.length) {
    for (const p of model.stale) {
      const flags = [...(p.isFork ? ['fork'] : []), ...(p.isPrivate ? ['private'] : [])];
      out.push(line(noteLink(model, p.name, notes), [`last push ${day(p.pushedAt)}`, ...flags]));
    }
  } else {
    out.push('_None._');
  }

  if (problems.length) out.push('', '## Note problems', '', ...problems.map((p) => `- ${p}`));
  return `${out.join('\n')}\n`;
}

// ---------- the other generated files ----------

export function renderIndex(model) {
  const out = [
    '# Projects',
    '',
    'One note per repository in [`projects/`](projects/). The [dashboard](LATEST.md) lists the open work.',
  ];
  for (const [category, projects] of groupByCategory(model.projects)) {
    out.push('', `## ${category}`, '');
    for (const p of projects) {
      const flags = [];
      if (p.isFork) flags.push('fork');
      if (p.isPrivate) flags.push('private');
      if (p.track === 'no') flags.push('not tracked');
      // A private repo has no description or language here (normalizeRepos): its line is the name and the flags.
      const desc = p.isPrivate ? '' : ` - ${p.description ? escapeMd(p.description) : 'No description'}`;
      out.push(`- ${noteLink(model, p.name, 'projects/')}${desc}${p.language ? ` (\`${p.language}\`)` : ''}`
        + flags.map((f) => ` · ${f}`).join(''));
    }
  }
  out.push(
    '',
    '---',
    '',
    '## Reference',
    '- [PC2.0 Specs Reference](PC2.0-SPECS.md)',
    '- [References](references/README.md) - General bookmarks & links',
    '- [GitHub Profile](https://github.com/ChadFarrow)',
  );
  return `${out.join('\n')}\n`;
}

// A straight port of the old jq: the sections overlap on purpose, "Other" is what
// matches none, and an empty description stays empty (jq's `//` only replaces null).
const STAR_SECTIONS = [
  ['Nostr', 'nostr|nip|amber|aegis|blossom|bloom|relay|jumble|vnak'],
  ['Lightning', 'lightning|lnurl|bolt|alby|coinos|breez|spark'],
  ['Podcasting', 'podcast|rss|feed|boost|v4v|podping'],
];

export function renderStarred(stars, generatedAt) {
  const item = (s) => `- [${s.name}](${s.html_url}) - ${s.description ?? 'No description'}`;
  const out = ['# Starred Repos', '', '*Auto-synced every 4 hours*', ''];
  for (const [title, pattern] of STAR_SECTIONS) {
    const re = new RegExp(pattern, 'i');
    out.push(`## ${title}`, ...stars.filter((s) => re.test(s.name)).map(item), '');
  }
  const any = new RegExp(STAR_SECTIONS.map(([, p]) => p).join('|'), 'i');
  out.push('## Other', ...stars.filter((s) => !any.test(s.name)).map(item), '');
  out.push('---', `*Last synced: ${generatedAt}*`, '');
  return out.join('\n');
}

export function renderAuditsReadme(files) {
  const dated = files.filter((f) => f.endsWith('.md') && !f.includes('README')).sort().reverse();
  return [
    '# Audit History',
    '',
    'Point-in-time cross-repo sweeps. [LATEST.md](../LATEST.md) is the newest entry.',
    '',
    ...dated.map((f) => `- [${f.slice(0, -3)}](${f})`),
    '',
  ].join('\n');
}

// notes: [{ file, text }] from projects/. auditFiles: names already in audits/.
// watched: the `normalizeWatched` map for the notes' `**Watch:**` entries.
// todoFiles: [{ path, text }] of notes/TODO.md and notes/todo/*.md. Only the web page shows it; no markdown file here repeats it.
// listedPrivate: the repos whose To do note the .gitignore lists; they show counts only, as a private repo does.
// roadmapFiles: the paths of the roadmaps/ notes that git does not ignore. No output shows them.
export function buildOutputs({
  owner, now, repos, stars, notes, auditFiles, degradedReason, watched, todoFiles, listedPrivate, roadmapFiles = [],
}) {
  const parsed = notes.map((n) => ({ ...n, header: parseHeader(n.text) }));
  const model = buildModel({ repos, notes: parsed, now, owner, degraded: Boolean(degradedReason), watched, listedPrivate });
  const problems = [...model.problems];
  const files = new Map();

  for (const p of model.projects) {
    const block = renderAutoBlock(p, model);
    if (p.noteFile) {
      const result = spliceAutoBlock(parsed.find((n) => n.file === p.noteFile).text, block);
      if (result.error) problems.push(`\`projects/${p.noteFile}\`: ${result.error}`);
      else files.set(`projects/${p.noteFile}`, result.text);
    } else {
      const stub = stubNote({ name: p.name, description: escapeMd(p.description) });
      files.set(`projects/${p.name}.md`, spliceAutoBlock(stub, block).text);
    }
  }

  for (const file of publicTodo(todoFiles, model).privateFiles) {
    problems.push(`\`${file}\` holds To do lines of a private repo, and this repo is public. The web page leaves them out. `
      + 'Move them to that repo\'s git-ignored note in `notes/todo/` (CLAUDE.md, *Private To do notes*).');
  }

  // The roadmap of a private repo must be git-ignored, as its To do note is (CLAUDE.md, *Roadmaps*).
  // A tracked one is named by its file, never by its text. The repo is the name before the first space.
  const secret = new Set(model.projects.filter((p) => p.countsOnly).map((p) => p.name.toLowerCase()));
  for (const file of roadmapFiles) {
    if (!secret.has(file.replace(/^roadmaps\//, '').replace(/\.md$/, '').split(' ')[0].toLowerCase())) continue;
    problems.push(`\`${file}\` is the roadmap of a private repo, and this repo is public. `
      + 'Add the repo to the roadmap lines of `.gitignore`, and `git rm --cached` the note (CLAUDE.md, *Roadmaps*).');
  }

  const generatedAt = `${now.toISOString().slice(0, 10)} ${now.toISOString().slice(11, 16)} UTC`;
  const date = now.toISOString().slice(0, 10);
  const opts = { generatedAt, degradedReason, problems };
  files.set('LATEST.md', renderDashboard(model, { ...opts, base: '' }));
  files.set(`audits/${date}.md`, renderDashboard(model, { ...opts, base: '../' }));
  files.set('audits/README.md', renderAuditsReadme([...new Set([...auditFiles, `${date}.md`])]));
  files.set('INDEX.md', renderIndex(model));
  files.set('references/starred.md', renderStarred(stars, generatedAt));
  // The web dashboard's data: published with the site, never committed.
  const siteData = renderSiteData(model, { ...opts, generatedAtIso: now.toISOString(), todoFiles });
  return { files, problems, siteData };
}
