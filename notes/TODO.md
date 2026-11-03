# To do

#todo

Things Chad started and must finish himself later, by running something or by testing further. Add a
line when a task stops for that reason, and delete the line when it is done. Bugs, ideas and findings
do not go here. This repo is public, so write nothing private here: no addresses, no keys, and no
detail from a private repo.

Give one PR one line, and put each test on its own indented line under it, so each test has its own
box. The box on a line deletes that line. The box on the PR line deletes it and the lines under it. A
blank line ends the group.

## boostmebitch

- [ ] Test [PR #512](https://github.com/ChadFarrow/boostmebitch/pull/512) (music plays at 1×) on [beta](https://beta.boostmebitch.com), then tell Claude to merge it. Android with the screen locked passed on 2026-11-02.
  - [ ] iPhone Home Screen app: add beta to the Home Screen first, because an icon from `www` does not have this PR. With the screen locked, on Homegrown Hits at 2×, the speed drops to 1× in a song and returns after it.
  - [ ] iPhone: listen for a click when the speed changes.
- [ ] Test [PR #507](https://github.com/ChadFarrow/boostmebitch/pull/507) (a track's own funding link) on [beta](https://beta.boostmebitch.com), then tell Claude to merge it. It needs no sign-in, wallet or boost. Android passed on a show-level tag only, on 2026-11-02.
  - [ ] iPhone: on [Jam with Nate](https://beta.boostmebitch.com/?podcast=dbfd9254-6f92-5b76-9b1a-25d86299f988), press SUPPORT on the show page. The link opens in a new tab.
  - [ ] iPhone: on [Into The Doerfel-Verse](https://beta.boostmebitch.com/?podcast=41aace28-8679-5ef1-9958-75cf76c2b5f0), open an episode, and press SUPPORT there. The link opens in a new tab.
- [ ] Beta site, optional setup. Beta works without these.
  - [ ] If beta must read like production: in Vercel, add `NOSTR_INDEX_URL`, `NOSTR_INDEX_KEY`, `PLAYLIST_DB_URL` and `PLAYLIST_DB_CA` for Preview, branch `beta` only, then redeploy. Without them it reads through the direct Podcast Index path.
  - [ ] If Google sign-in must work there: add `https://beta.boostmebitch.com` to the OAuth client's authorized JavaScript origins in the Google console.
- [ ] The next time the listen queue stops on a locked screen in the Zapstore app, unlock the phone and press Report a bug right away. The report now carries the playback log (#505).

## thelounge-candr

Five older items are in [the thelounge-candr note](../projects/thelounge-candr.md).

## Mac mini

- [ ] Run `git -C ~/Vibe/vibe-kit pull`. It brings in the rule change that was merged on 2026-11-02.

## Laptop

## project-notes

