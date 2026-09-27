// Pure planning for the two-way sync between the repo and the Obsidian vault.
//
// The rule: what is written by hand syncs both ways; what is generated flows from
// the repo to the vault only. A three-way compare against the state of the last
// sync decides the direction, and when both sides changed the repo wins and the
// vault's version is kept as a conflict copy — nothing written by hand is dropped.

import { createHash } from 'node:crypto';
import { parseHeader, spliceAutoBlock } from './notes.mjs';

const MARKER = /^\s*<!--\s*AUTO:(START|END)\s*-->\s*$/;

// 'generated': repo → vault only. 'note': a projects/<repo>.md note, whose text
// outside the AUTO block syncs both ways. 'free': any other hand-written file, whole
// file both ways, including new and deleted files. null: not synced.
export function zoneOf(path) {
  if (path.split('/').some((s) => s.startsWith('.'))) return null;
  if (path === 'LATEST.md' || path === 'INDEX.md' || path.startsWith('audits/')
    || path === 'references/starred.md') return 'generated';
  if (/^projects\/[^/]+\.md$/.test(path)) return 'note';
  if (path === 'README.md' || path === 'PC2.0-SPECS.md'
    || /^(references|notes|projects\/archived)\//.test(path)) return 'free';
  return null;
}

export const hashOf = (content) => createHash('sha256').update(content).digest('hex');

// The note with an empty AUTO block: what the user wrote. null when the markers are
// not one clean START…END pair.
export function handPart(text) {
  const result = spliceAutoBlock(text, '');
  return result.error ? null : result.text;
}

// The lines between the markers, or null when there is no clean block.
export function autoBody(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const marks = lines.map((l, i) => [MARKER.exec(l)?.[1], i]).filter(([k]) => k);
  if (marks.length !== 2 || marks[0][0] !== 'START' || marks[1][0] !== 'END') return null;
  return lines.slice(marks[0][1] + 1, marks[1][1]).join('\n');
}

export function conflictPath(path, stamp) {
  return `conflicts/${path.replace(/\//g, ' - ').replace(/(\.[^.]*)?$/, (ext) => ` ${stamp}${ext}`)}`;
}

// Three-way decision on content hashes (null = the file does not exist).
function decide(repo, vault, base) {
  if (repo === vault) return 'same';
  if (vault === base) return 'repo';
  if (repo === base) return 'vault';
  return 'conflict';
}

const noteKey = (text) => hashOf(handPart(text) ?? `RAW\n${text}`);
const headerOf = (text) => {
  const { category, uses, track } = parseHeader(text);
  return JSON.stringify({ category, uses, track });
};

// repo, vault: Map<path, Buffer>. state: the previous result's `state`, or null.
// skip: paths to leave alone this run (an iCloud placeholder: present, but unread).
// Returns the writes for each side (Buffer, or null to delete), the conflict copies
// to add to the vault, the new state, log lines, and whether a note header changed.
export function planSync({ repo, vault, state, stamp, skip = new Set() }) {
  const base = { ...(state?.base ?? {}) };
  const mirrored = { ...(state?.mirrored ?? {}) };
  const toRepo = new Map();
  const toVault = new Map();
  const conflicts = new Map();
  const log = [];
  let headerChanged = false;

  const setBase = (path, hash) => {
    if (hash === null) delete base[path];
    else base[path] = hash;
  };
  const conflict = (path, content, why) => {
    const copy = conflictPath(path, stamp);
    conflicts.set(copy, content);
    log.push(`${path}: ${why}; kept the repo version and saved the vault version as ${copy}`);
  };

  const paths = new Set([...repo.keys(), ...vault.keys(), ...Object.keys(base), ...Object.keys(mirrored)]);
  for (const path of [...paths].sort()) {
    if (skip.has(path)) continue;
    const zone = zoneOf(path);
    const R = repo.get(path) ?? null;
    const V = vault.get(path) ?? null;

    if (zone === 'generated') {
      if (R) {
        if (!V || !V.equals(R)) toVault.set(path, R);
        mirrored[path] = true;
      } else if (mirrored[path]) {
        if (V) toVault.set(path, null);
        delete mirrored[path];
      }
    } else if (zone === 'free') {
      const r = R && hashOf(R);
      const v = V && hashOf(V);
      switch (decide(r, v, base[path] ?? null)) {
        case 'same': setBase(path, r); break;
        case 'repo': toVault.set(path, R); setBase(path, r); break;
        case 'vault': toRepo.set(path, V); setBase(path, v); break;
        default:
          toVault.set(path, R);
          if (V) conflict(path, V, 'changed in the vault and in the repo');
          setBase(path, r);
      }
    } else if (zone === 'note') {
      // The repo decides which notes exist: the sync makes one per repo.
      const b = base[path] ?? null;
      if (!R && !V) {
        delete base[path];
      } else if (R && !V) {
        toVault.set(path, R);
        base[path] = noteKey(R.toString('utf8'));
      } else if (!R) {
        if (b === null) {
          log.push(`${path}: made in the vault and not a repo note; left in the vault only`);
          continue;
        }
        toVault.set(path, null);
        if (noteKey(V.toString('utf8')) !== b) conflict(path, V, 'edited in the vault but removed from the repo');
        delete base[path];
      } else {
        const r = R.toString('utf8');
        const v = V.toString('utf8');
        const vaultBroken = handPart(v) === null && handPart(r) !== null;
        const kR = noteKey(r);
        const d = vaultBroken ? 'conflict' : decide(kR, noteKey(v), b);
        if (d === 'vault') {
          const body = autoBody(r);
          const merged = body === null ? v : spliceAutoBlock(v, body).text;
          if (merged !== r) toRepo.set(path, Buffer.from(merged));
          if (merged !== v) toVault.set(path, Buffer.from(merged));
          if (headerOf(merged) !== headerOf(r)) headerChanged = true;
          base[path] = noteKey(merged);
        } else if (d === 'conflict') {
          toVault.set(path, R);
          conflict(path, V, vaultBroken ? 'the AUTO markers are broken in the vault' : 'changed in the vault and in the repo');
          base[path] = kR;
        } else {
          if (!V.equals(R)) toVault.set(path, R);
          base[path] = kR;
        }
      }
    }
  }
  return { toRepo, toVault, conflicts, state: { version: 1, base, mirrored }, log, headerChanged };
}

