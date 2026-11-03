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

- [ ] Send one real boost and stream sats for one minute with your wallet, on a podcast episode and on a playlist track. PR #516 and PR #517 changed where payees come from, and no real payment tested them. Then tell Claude the result.
- [ ] Test [PR #512](https://github.com/ChadFarrow/boostmebitch/pull/512) (music plays at 1×) on [beta](https://beta.boostmebitch.com), then tell Claude to merge it. Android with the screen locked passed on 2026-11-02.
  - [ ] iPhone Home Screen app: add beta to the Home Screen first, because an icon from `www` does not have this PR. With the screen locked, on Homegrown Hits at 2×, the speed drops to 1× in a song and returns after it.
  - [ ] iPhone: listen for a click when the speed changes.
- [ ] Beta site, optional setup. Beta works without these.
  - [ ] If beta must read like production: in Vercel, add `NOSTR_INDEX_URL`, `NOSTR_INDEX_KEY`, `PLAYLIST_DB_URL` and `PLAYLIST_DB_CA` for Preview, branch `beta` only, then redeploy. Without them it reads through the direct Podcast Index path.
  - [ ] If Google sign-in must work there: add `https://beta.boostmebitch.com` to the OAuth client's authorized JavaScript origins in the Google console.
- [ ] Test [PR #518](https://github.com/ChadFarrow/boostmebitch/pull/518) (paste an OPML link, no photo options) on Android on [its preview](https://boostmebitch-git-feat-opml-link-chadfs-projects.vercel.app/favorites), then tell Claude to merge it. iPhone passed on 2026-11-03. It is not on beta.
  - [ ] Android: press CHOOSE A FILE. An `.opml` file is not grey, and you can pick it.
- [ ] The next time the listen queue stops on a locked screen in the Zapstore app, unlock the phone and press Report a bug right away. The report now carries the playback log (#505).

## small-group-scoop

- [ ] Tell Claude to prepare the iPhone layout PR for Spencer. The demo tests passed on `/after/` on 2026-11-03, on your phone and on a spare iPhone 11.

## thelounge-candr

Five older items are in [the thelounge-candr note](../projects/thelounge-candr.md).

## Mac mini

## Laptop

## project-notes

