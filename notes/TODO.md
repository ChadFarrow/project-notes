# To do

#todo

Things Chad started and must finish himself later, by running something or by testing further. Add a
line when a task stops for that reason, and delete the line when it is done. Bugs, ideas and findings
do not go here. This repo is public, so write nothing private here: no addresses, no keys, and no
detail from a private repo.

## boostmebitch

- [ ] Test [PR #512](https://github.com/ChadFarrow/boostmebitch/pull/512) (music plays at 1×) on an Android phone with the screen locked, then merge it. The preview link is on the PR. Also test the iPhone Home Screen app, and listen for a click at the switch.
- [ ] Beta site: at Namecheap, add a DNS record for `beta.boostmebitch.com`, with the same type and value as the `libre` record.
- [ ] Beta site: in [Vercel](https://vercel.com/chadfs-projects/boostmebitch/settings/environment-variables), add `GITHUB_BUG_TOKEN` for Preview, branch `beta`. Bug reports on beta need it. Vercel cannot show the Production value, so use your saved copy or make a new token. The branch exists after the first push to `beta`.
- [ ] Beta site, only if Google sign-in must work there: add `https://beta.boostmebitch.com` to the OAuth client's authorized JavaScript origins in the Google console.
- [ ] Take the Libre site offline, and do the first beta item above first, because it copies the `libre` record. Move any sats out of the Libre wallet. Then [remove `libre.boostmebitch.com`](https://vercel.com/chadfs-projects/boostmebitch/settings/domains), [delete its deployment](https://vercel.com/chadfs-projects/boostmebitch/6uPPAA6b52sboQmoTVgUS6EQiJju), and delete the `libre` record at Namecheap. Keep the branch and PR #120.

## thelounge-candr

- [ ] Confirm the lit-bot blacklist on a real post. When a blocked show next goes live, `#BowlAfterBowl` must stay quiet.

Five older items are in [the thelounge-candr note](../projects/thelounge-candr.md).

## Laptop

- [ ] Delete `~/Vibe/LIT_Bot`. It is a clean clone of an archived repo, made by mistake.

## project-notes

- [ ] Tap this box on [the dashboard](https://notes.podtards.com), then delete this line. This tests a real save and the page update. The device needs the editing token.
