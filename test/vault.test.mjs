import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zoneOf, handPart, autoBody, hashOf, conflictPath, planSync } from '../scripts/lib/vault.mjs';
import { AUTO_START, AUTO_END } from '../scripts/lib/notes.mjs';

const STAMP = '2026-09-27 2105';
const note = (mine, block = 'live data') => `# x\n\n${mine}\n\n${AUTO_START}\n${block}\n${AUTO_END}\n`;
const m = (obj) => new Map(Object.entries(obj).map(([k, v]) => [k, Buffer.from(v)]));
const text = (map) => Object.fromEntries([...map].map(([k, v]) => [k, v === null ? null : v.toString()]));

function plan({ repo = {}, vault = {}, state = null }) {
  const p = planSync({ repo: m(repo), vault: m(vault), state, stamp: STAMP });
  return { ...p, toRepo: text(p.toRepo), toVault: text(p.toVault), conflicts: text(p.conflicts) };
}
// The state a previous run would have left for these repo files.
const synced = (repo) => planSync({ repo: m(repo), vault: m(repo), state: null, stamp: STAMP }).state;

// ---------- zones ----------

test('zoneOf sorts generated, note and free files, and ignores the rest', () => {
  for (const p of ['LATEST.md', 'INDEX.md', 'audits/2026-09-27.md', 'audits/README.md', 'references/starred.md']) {
    assert.equal(zoneOf(p), 'generated', p);
  }
  assert.equal(zoneOf('projects/MSP-2.0.md'), 'note');
  for (const p of ['README.md', 'PC2.0-SPECS.md', 'references/nostr.md', 'notes/idea.md', 'notes/img/a.png', 'projects/archived/LIT_Bot.md']) {
    assert.equal(zoneOf(p), 'free', p);
  }
  for (const p of ['CLAUDE.md', 'Untitled.md', 'conflicts/x.md', 'scripts/sync.mjs', '.obsidian/app.json', 'notes/.DS_Store', '.gitignore']) {
    assert.equal(zoneOf(p), null, p);
  }
});

// ---------- hand part ----------

test('handPart ignores the AUTO block content, and is null for broken markers', () => {
  assert.equal(handPart(note('mine', 'one')), handPart(note('mine', 'two')));
  assert.notEqual(handPart(note('mine')), handPart(note('changed')));
  assert.equal(handPart(`${AUTO_START}\n${AUTO_START}\n`), null);
  assert.equal(autoBody(note('mine', 'a\nb')), 'a\nb');
  assert.equal(autoBody('# no block\n'), null);
  assert.equal(hashOf('a'), hashOf(Buffer.from('a')));
});

test('conflictPath flattens the path and adds the stamp before the extension', () => {
  assert.equal(conflictPath('projects/MSP-2.0.md', STAMP), 'conflicts/projects - MSP-2.0 2026-09-27 2105.md');
  assert.equal(conflictPath('notes/a/b.png', STAMP), 'conflicts/notes - a - b 2026-09-27 2105.png');
});

// ---------- generated files: one way ----------

test('generated files go from the repo to the vault only', () => {
  const p = plan({ repo: { 'LATEST.md': 'new' }, vault: { 'LATEST.md': 'edited on the phone' } });
  assert.deepEqual(p.toVault, { 'LATEST.md': 'new' });
  assert.deepEqual(p.toRepo, {});
});

test('a generated file that left the repo is deleted from the vault, once mirrored', () => {
  const state = synced({ 'audits/old.md': 'x' });
  assert.deepEqual(plan({ vault: { 'audits/old.md': 'x' }, state }).toVault, { 'audits/old.md': null });
  assert.deepEqual(plan({ vault: { 'audits/mine.md': 'x' } }).toVault, {});
});

// ---------- project notes: hand part both ways, AUTO block one way ----------

test('a new AUTO block reaches the vault and keeps the vault text', () => {
  const state = synced({ 'projects/a.md': note('mine', 'old') });
  const p = plan({ repo: { 'projects/a.md': note('mine', 'new') }, vault: { 'projects/a.md': note('mine', 'old') }, state });
  assert.deepEqual(p.toVault, { 'projects/a.md': note('mine', 'new') });
  assert.deepEqual(p.toRepo, {});
});

test('a vault edit goes to the repo with the repo AUTO block', () => {
  const state = synced({ 'projects/a.md': note('mine', 'old') });
  const p = plan({ repo: { 'projects/a.md': note('mine', 'new') }, vault: { 'projects/a.md': note('edited', 'old') }, state });
  assert.deepEqual(p.toRepo, { 'projects/a.md': note('edited', 'new') });
  assert.deepEqual(p.toVault, { 'projects/a.md': note('edited', 'new') });
  assert.equal(p.state.base['projects/a.md'], hashOf(handPart(note('edited'))));
  assert.equal(p.headerChanged, false);
});

test('a repo edit reaches an unchanged vault note', () => {
  const state = synced({ 'projects/a.md': note('mine') });
  const p = plan({ repo: { 'projects/a.md': note('claude edit') }, vault: { 'projects/a.md': note('mine') }, state });
  assert.deepEqual(p.toVault, { 'projects/a.md': note('claude edit') });
  assert.deepEqual(p.toRepo, {});
});

test('edits on both sides keep the repo and save the vault text as a conflict copy', () => {
  const state = synced({ 'projects/a.md': note('mine') });
  const p = plan({ repo: { 'projects/a.md': note('repo edit') }, vault: { 'projects/a.md': note('phone edit') }, state });
  assert.deepEqual(p.toRepo, {});
  assert.deepEqual(p.toVault, { 'projects/a.md': note('repo edit') });
  assert.deepEqual(p.conflicts, { 'conflicts/projects - a 2026-09-27 2105.md': note('phone edit') });
});

test('a vault note with broken AUTO markers never reaches the repo', () => {
  const state = synced({ 'projects/a.md': note('mine') });
  const broken = `# x\nedited\n${AUTO_START}\n`;
  const p = plan({ repo: { 'projects/a.md': note('mine') }, vault: { 'projects/a.md': broken }, state });
  assert.deepEqual(p.toRepo, {});
  assert.deepEqual(p.toVault, { 'projects/a.md': note('mine') });
  assert.deepEqual(Object.values(p.conflicts), [broken]);
});

test('a vault note with its AUTO block removed gets the block back', () => {
  const state = synced({ 'projects/a.md': note('mine', 'live') });
  const p = plan({ repo: { 'projects/a.md': note('mine', 'live') }, vault: { 'projects/a.md': '# x\n\nedited\n' }, state });
  assert.deepEqual(p.toRepo, { 'projects/a.md': note('edited', 'live') });
});

test('a header edit in the vault sets headerChanged', () => {
  const before = note('**Category:** Tools  ');
  const state = synced({ 'projects/a.md': before });
  const p = plan({ repo: { 'projects/a.md': before }, vault: { 'projects/a.md': note('**Category:** Nostr  ') }, state });
  assert.equal(p.headerChanged, true);
});

test('a note deleted in the vault comes back from the repo', () => {
  const state = synced({ 'projects/a.md': note('mine') });
  const p = plan({ repo: { 'projects/a.md': note('mine') }, vault: {}, state });
  assert.deepEqual(p.toVault, { 'projects/a.md': note('mine') });
  assert.deepEqual(p.toRepo, {});
});

test('a new project note made in the vault stays in the vault only', () => {
  const p = plan({ vault: { 'projects/new-idea.md': 'text' } });
  assert.deepEqual(p.toRepo, {});
  assert.deepEqual(p.toVault, {});
  assert.ok(p.log.some((l) => l.includes('projects/new-idea.md')));
});

test('a note that left the repo leaves the vault, or becomes a conflict copy if edited', () => {
  const state = synced({ 'projects/a.md': note('mine') });
  assert.deepEqual(plan({ vault: { 'projects/a.md': note('mine') }, state }).toVault, { 'projects/a.md': null });
  const edited = plan({ vault: { 'projects/a.md': note('edited') }, state });
  assert.deepEqual(edited.toVault, { 'projects/a.md': null });
  assert.equal(Object.keys(edited.conflicts).length, 1);
});

// ---------- free files: whole file both ways ----------

test('a new note from the phone goes to the repo', () => {
  const p = plan({ vault: { 'notes/idea.md': 'from the phone' } });
  assert.deepEqual(p.toRepo, { 'notes/idea.md': 'from the phone' });
  assert.equal(p.state.base['notes/idea.md'], hashOf('from the phone'));
});

test('a free file edited in the vault goes to the repo, and a repo edit comes back', () => {
  const state = synced({ 'references/nostr.md': 'v1' });
  assert.deepEqual(plan({ repo: { 'references/nostr.md': 'v1' }, vault: { 'references/nostr.md': 'v2' }, state }).toRepo,
    { 'references/nostr.md': 'v2' });
  assert.deepEqual(plan({ repo: { 'references/nostr.md': 'v2' }, vault: { 'references/nostr.md': 'v1' }, state }).toVault,
    { 'references/nostr.md': 'v2' });
});

test('a free file deleted on one side is deleted on the other', () => {
  const state = synced({ 'notes/old.md': 'x' });
  assert.deepEqual(plan({ repo: { 'notes/old.md': 'x' }, state }).toRepo, { 'notes/old.md': null });
  assert.deepEqual(plan({ vault: { 'notes/old.md': 'x' }, state }).toVault, { 'notes/old.md': null });
});

test('a free file edited in the vault but deleted in the repo is kept as a conflict copy', () => {
  const state = synced({ 'notes/old.md': 'x' });
  const p = plan({ vault: { 'notes/old.md': 'edited' }, state });
  assert.deepEqual(p.toVault, { 'notes/old.md': null });
  assert.deepEqual(p.conflicts, { 'conflicts/notes - old 2026-09-27 2105.md': 'edited' });
});

test('without state, different files on both sides are a conflict, equal files are in sync', () => {
  const p = plan({ repo: { 'notes/a.md': 'repo' }, vault: { 'notes/a.md': 'vault' } });
  assert.deepEqual(p.toVault, { 'notes/a.md': 'repo' });
  assert.equal(Object.keys(p.conflicts).length, 1);
  const same = plan({ repo: { 'notes/a.md': 'x' }, vault: { 'notes/a.md': 'x' } });
  assert.deepEqual([same.toRepo, same.toVault, same.conflicts], [{}, {}, {}]);
});

test('binary files pass through unchanged', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
  const p = planSync({ repo: new Map(), vault: new Map([['notes/a.png', png]]), state: null, stamp: STAMP });
  assert.ok(p.toRepo.get('notes/a.png').equals(png));
});

test('a second plan over the result of the first changes nothing', () => {
  const repo = { 'LATEST.md': 'dash', 'projects/a.md': note('mine', 'new'), 'notes/r.md': 'r' };
  const vault = { 'projects/a.md': note('edited', 'old'), 'notes/v.md': 'v' };
  const first = planSync({ repo: m(repo), vault: m(vault), state: synced({ 'projects/a.md': note('mine', 'old') }), stamp: STAMP });
  const apply = (base, changes) => {
    const out = new Map(base);
    for (const [k, v] of changes) (v === null ? out.delete(k) : out.set(k, v));
    return out;
  };
  const second = planSync({
    repo: apply(m(repo), first.toRepo), vault: apply(m(vault), first.toVault), state: first.state, stamp: STAMP,
  });
  assert.deepEqual([second.toRepo.size, second.toVault.size, second.conflicts.size], [0, 0, 0]);
});

test('a skipped path is left alone and keeps its state', () => {
  const state = synced({ 'notes/a.md': 'x' });
  const p = planSync({ repo: m({ 'notes/a.md': 'x' }), vault: new Map(), state, stamp: STAMP, skip: new Set(['notes/a.md']) });
  assert.deepEqual([p.toRepo.size, p.toVault.size], [0, 0]);
  assert.equal(p.state.base['notes/a.md'], hashOf('x'));
});
