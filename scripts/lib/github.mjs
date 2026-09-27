// Everything that talks to GitHub goes through the `gh` CLI, so the workflow and the
// Mac authenticate the same way: GH_TOKEN in CI, the keychain login locally.

import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// Nested connections are never paginated (`gh --paginate` follows only the first
// pageInfo), so they carry a totalCount and the model reports truncation. 25 repos per
// page keeps each request well under GitHub's 10 s GraphQL limit; 100 took 9.1 s.
export const REPOS_QUERY = `query($owner: String!, $endCursor: String) {
  user(login: $owner) {
    repositories(first: 25, after: $endCursor, ownerAffiliations: [OWNER], isArchived: false,
                 orderBy: {field: NAME, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name url description isFork isPrivate pushedAt
        primaryLanguage { name }  parent { nameWithOwner }  defaultBranchRef { name }
        pullRequests(states: OPEN, first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
          totalCount
          nodes { number title url isDraft createdAt updatedAt headRefName mergeable body
                  author { login } statusCheckRollup { state } } }
        issues(states: OPEN, first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
          totalCount
          nodes { number title url createdAt updatedAt body author { login } comments { totalCount } } }
        refs(refPrefix: "refs/heads/", first: 100) {
          totalCount nodes { name target { ... on Commit { committedDate } } } }
      }
    }
  }
}`;

// Picks a token that actually works. AUDIT_TOKEN is a PAT, and PATs expire; a YAML
// `||` default only covers an *unset* secret, so an expired one used to take the whole
// sync down with "HTTP 401: Bad credentials". Probe it once and fall back.
//
// Falling back does NOT empty the dashboard, which is the trap: GITHUB_TOKEN can still
// read every *public* repo, so the output looks complete while silently dropping
// private ones. degradedReason carries the cause into the banner in LATEST.md.
export function pickToken(env, probe) {
  const ci = env.GITHUB_ACTIONS === 'true' || env.AUDIT_TOKEN !== undefined;
  if (!ci) return { token: null, degradedReason: null, warning: null };
  if (!env.AUDIT_TOKEN) {
    return {
      token: env.FALLBACK_TOKEN,
      degradedReason: '`AUDIT_TOKEN` is not set (or is set to an empty value)',
      warning: 'AUDIT_TOKEN is empty or unset — private repos will be silently omitted from the '
        + 'dashboard; public repos still resolve via GITHUB_TOKEN. Note that `gh secret set` stores '
        + 'an empty value when it cannot prompt for one (no TTY), which is indistinguishable from an '
        + 'unset secret here.',
    };
  }
  if (!probe(env.AUDIT_TOKEN)) {
    return {
      token: env.FALLBACK_TOKEN,
      degradedReason: '`AUDIT_TOKEN` was rejected by GitHub (expired or revoked)',
      warning: 'AUDIT_TOKEN was rejected by GitHub (expired or revoked). Falling back to '
        + 'GITHUB_TOKEN — private repos will be silently omitted from the dashboard until the '
        + 'secret is rotated.',
    };
  }
  return { token: env.AUDIT_TOKEN, degradedReason: null, warning: null };
}

const ghEnv = (token) => (token ? { ...process.env, GH_TOKEN: token } : process.env);

export function probeToken(token) {
  try {
    execFileSync('gh', ['api', 'rate_limit'], { env: ghEnv(token), stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Runs gh and parses its JSON output, retrying once after 10 s for a transient error.
export async function ghJson(args, token) {
  for (let attempt = 1; ; attempt++) {
    try {
      const out = execFileSync('gh', args, {
        env: ghEnv(token), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
      });
      return JSON.parse(out);
    } catch (err) {
      if (attempt >= 2) throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${err.stderr || err.message}`);
      await sleep(10_000);
    }
  }
}

export async function fetchRepos(token, owner) {
  const pages = await ghJson(
    ['api', 'graphql', '--paginate', '--slurp', '-f', `query=${REPOS_QUERY}`, '-f', `owner=${owner}`], token,
  );
  const errors = pages.flatMap((p) => p.errors ?? []);
  if (errors.length) throw new Error(`GraphQL errors: ${errors.map((e) => e.message).join('; ')}`);
  return pages;
}

export async function fetchStars(token, owner) {
  return (await ghJson(['api', `users/${owner}/starred`, '--paginate', '--slurp'], token)).flat();
}
