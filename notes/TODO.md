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
- [ ] Beta site, optional setup. Beta works without these.
  - [ ] If beta must read like production: in Vercel, add `NOSTR_INDEX_URL`, `NOSTR_INDEX_KEY`, `PLAYLIST_DB_URL` and `PLAYLIST_DB_CA` for Preview, branch `beta` only, then redeploy. Without them it reads through the direct Podcast Index path.
  - [ ] If Google sign-in must work there: add `https://beta.boostmebitch.com` to the OAuth client's authorized JavaScript origins in the Google console.
- [ ] The next time the listen queue stops on a locked screen in the Zapstore app, unlock the phone and press Report a bug right away. The report now carries the playback log (#505).
- [ ] Test PR #520, the fix for NWC failing until you paste it again, in the Zapstore app: leave the app in the background overnight, return, and send one boost. Do not paste the connection again first.
- [ ] Test PR #522, the quick buttons on Favorites, on your iPhone before you merge it, then tell Claude the result. Open https://boostmebitch-git-feat-favorites-quick-buttons-chadfs-projects.vercel.app/favorites and sign in, because a preview starts with an empty list. The buttons do not write to your list.
  - [ ] Press ALBUMS, SINGLES, SHOWS and EPISODES in turn. Each shows only its own section, and its button turns yellow.
  - [ ] Scroll far down a long list and press SHOWS. The row stays under the header, and the list opens at its top.
  - [ ] Press the yellow button again. All sections come back.
  - [ ] Tell Claude if you want TRACKS and PODCASTS in place of SINGLES and SHOWS. One word changes the buttons, the menu and the headings.
- [ ] Test PR #521, the heart and queue on more home feed notes, on your iPhone before you merge it, then tell Claude the result. Open https://boostmebitch-git-fix-feed-note-buttons-chadfs-projects.vercel.app/ and sign in only for the heart test.
  - [ ] Find a bot's boost note, such as Boostr_Bot. It shows FAVORITE and QUEUE under the label. Press QUEUE, and check Listen shows the episode.
  - [ ] Find a track boost with a 🎵 line. Its card names the episode. Press its heart, and check Favorites shows the episode and not the track. Signed in, this changes your real favorites list, so press the heart again after the test.
  - [ ] Tell Claude if you want a show heart on a note that tags only a show. PR #521 leaves it out, and such a note can never have a queue button.

## candr.space

- [ ] Merge PR #66, then open `/boosts` and check the listener names on the cards. Tell Claude the result.

## MSP-2.0

- [ ] Test PR #178, which holds a hosted feed's podping for about 100 s after a save. It is live, and the wait passed through `/api/pubnotify`, but no real save has run it. Then tell Claude the save time and the result.
  - [ ] Save a real change to one hosted feed, such as a new song. The ping lands on Hive about 2 minutes later, not about 15 s later.
  - [ ] Check that the change shows on v4vmusic.com within about 5 minutes of the save.
- [ ] When the v4vmusic dev answers your note, tell Claude. Live At Rockpile and The EP (Amnesia) stay out of date there until the dev changes their feed URLs.

## msp-podping-service

- [ ] Finish PR #7, which keeps the podping viewer up when a Postgres connection drops. Do these in order, then tell Claude.
  - [ ] In Railway, project `pp.musicsideproject.com`, service `msp-podping-service`: Settings, Deploy, set Restart Policy to Always. The Railway CLI has no command for this.
  - [ ] Add `.github/workflows/viewer-health.yml` to branch `viewer-survive-db-drops`, with the YAML from the PR. Claude's GitHub connection has no workflow permission. To let Claude try `gh api` instead, tell Claude so; that needs your yes because it is outside the push rule.
  - [ ] Merge the PR, or tell Claude to. The merge redeploys the viewer and restarts the podping pusher.

## small-group-scoop

- [ ] Tell Claude to prepare the iPhone layout PR for Spencer. The demo tests passed on `/after/` on 2026-11-03, on your phone and on a spare iPhone 11.
- [ ] Test branch `live-podping` on your fork (podping live status), then tell Claude the result. Claude then prepares the PR for Spencer.
  - [ ] Run the site and `watch_live`. When a show goes live before its scheduled start, it shows as LIVE within about a minute.
- [ ] Test draft PR #3 on your fork (every show on The Board), then tell Claude the result. Do not merge it into `live-podping`: that adds it to the PR for Spencer. The PR has the commands.
  - [ ] Open `/board/` and check each show's starting day and time. Change a wrong one in the admin, or tell Claude.
  - [ ] When a dashed show gets a pending live, check that its line turns solid.

## thelounge-candr

Five older items are in [the thelounge-candr note](../projects/thelounge-candr.md).

## Mac mini

## Laptop

## project-notes
