# To do

#todo

Things Chad started and must finish himself later, by running something or by testing further. Add a
line when a task stops for that reason, and delete the line when it is done. Bugs, ideas and findings
do not go here. This repo is public, so write nothing private here: no addresses, no keys, and no
detail from a private repo.

## boostmebitch

- [ ] Test [PR #512](https://github.com/ChadFarrow/boostmebitch/pull/512) (music plays at 1×) on an Android phone with the screen locked, then merge it. The preview link is on the PR. Also test the iPhone Home Screen app, and listen for a click at the switch.
- [ ] Beta site: in [Vercel](https://vercel.com/chadfs-projects/boostmebitch/settings/environment-variables), add `GITHUB_BUG_TOKEN` for Preview, branch `beta`. Bug reports on beta need it. Vercel cannot show the Production value, so use your saved copy or make a new token. Then redeploy `beta`, because a variable change does not redeploy it.
- [ ] Beta site, optional: add `NOSTR_INDEX_URL`, `NOSTR_INDEX_KEY`, `PLAYLIST_DB_URL` and `PLAYLIST_DB_CA` the same way, if beta must read like production. Without them it reads through the direct Podcast Index path, and it still works.
- [ ] Test #512, #507 and #505 together on your phones at https://beta.boostmebitch.com. Sign in and connect the wallet again there, because browser storage is per site. Use small boosts: beta spends real sats, and it writes to your real favorites and backups.
- [ ] Beta site, only if Google sign-in must work there: add `https://beta.boostmebitch.com` to the OAuth client's authorized JavaScript origins in the Google console.

## thelounge-candr

Five older items are in [the thelounge-candr note](../projects/thelounge-candr.md).

## Laptop

## project-notes

- [ ] Tap this box on [the dashboard](https://notes.podtards.com), then delete this line. This tests a real save and the page update. The device needs the editing token.
