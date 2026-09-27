import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickToken, REPOS_QUERY } from '../scripts/lib/github.mjs';

const never = () => { throw new Error('probe must not run'); };

test('pickToken uses the gh login in local mode', () => {
  assert.deepEqual(pickToken({}, never), { token: null, degradedReason: null, warning: null });
});

test('pickToken falls back when AUDIT_TOKEN is empty', () => {
  const r = pickToken({ GITHUB_ACTIONS: 'true', AUDIT_TOKEN: '', FALLBACK_TOKEN: 'fb' }, never);
  assert.equal(r.token, 'fb');
  assert.equal(r.degradedReason, '`AUDIT_TOKEN` is not set (or is set to an empty value)');
  assert.match(r.warning, /^AUDIT_TOKEN is empty or unset/);
});

test('pickToken treats a defined AUDIT_TOKEN as CI mode even outside Actions', () => {
  const r = pickToken({ AUDIT_TOKEN: 'bogus', FALLBACK_TOKEN: 'fb' }, () => false);
  assert.equal(r.token, 'fb');
  assert.equal(r.degradedReason, '`AUDIT_TOKEN` was rejected by GitHub (expired or revoked)');
  assert.match(r.warning, /^AUDIT_TOKEN was rejected by GitHub/);
});

test('pickToken uses AUDIT_TOKEN when the probe accepts it', () => {
  const seen = [];
  const r = pickToken({ GITHUB_ACTIONS: 'true', AUDIT_TOKEN: 'good', FALLBACK_TOKEN: 'fb' }, (t) => { seen.push(t); return true; });
  assert.deepEqual(r, { token: 'good', degradedReason: null, warning: null });
  assert.deepEqual(seen, ['good']);
});

test('the repos query pages with $endCursor and keeps pageInfo first', () => {
  assert.match(REPOS_QUERY, /\$endCursor: String/);
  assert.match(REPOS_QUERY, /after: \$endCursor/);
  assert.match(REPOS_QUERY, /ownerAffiliations: \[OWNER\]/);
  assert.match(REPOS_QUERY, /isArchived: false/);
  assert.equal(REPOS_QUERY.match(/pageInfo/g).length, 1);
  assert.ok(REPOS_QUERY.indexOf('pageInfo') < REPOS_QUERY.indexOf('nodes'));
});
