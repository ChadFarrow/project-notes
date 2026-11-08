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

- [ ] Open `/boosts` and check the listener names on the cards. PR #66 is merged. Tell Claude the result.
- [ ] Find out why the boost you told Claude about on 2026-11-05 was not on `/boosts`. Ask Claude for the command that searches Helipad for that listener, run it in the console on your signed-in Helipad page, and paste the output. Also say where you saw the boost and about when.

## Command-Center

- [ ] Set up the audio route on the Mac mini (steps in the Command-Center README, "Audio into the show") and make a short Riverside test recording. Then tell Claude how the music sounds.

## MSP-2.0

- [ ] Test PR #178, which holds a hosted feed's podping for about 100 s after a save. It is live, and the wait passed through `/api/pubnotify`, but no real save has run it. Then tell Claude the save time and the result.
  - [ ] Save a real change to one hosted feed, such as a new song. The ping lands on Hive about 2 minutes later, not about 15 s later.
  - [ ] Check that the change shows on v4vmusic.com within about 5 minutes of the save.
- [ ] When the v4vmusic dev answers your note, tell Claude. Live At Rockpile and The EP (Amnesia) stay out of date there until the dev changes their feed URLs.
- [ ] Ask the v4vmusic dev how v4vmusic.com picks up podpings, because MSP users say podping.me works better there. Then tell Claude the answers.
  - [ ] Does v4vmusic accept podpings signed by `chadf` with id `pp_music_update`? podping.me sends through podping.cloud, so its podpings are signed by `podping.aaa` to `podping.eee`, always as `pp_podcast_update`, and they are also on gossip.
  - [ ] Podcast Index stores feed URLs with spaces as raw spaces, but every podping carries `%20` (issue #179). Does v4vmusic match on the stored URL?
- [ ] Decide issue #179: should MSP offer to send a feed URL with spaces as `%20` (B), or keep refusing it with a better message (A)? Tell Claude A or B.

## msp-podping-service

- [ ] Finish the gossip setup from PR #8. It is live and tested: MSP podpings reach Hive and the podping gossip network, and a deploy keeps the same key.
  - [ ] Ask the musicindex.org gossip-watcher operator whether their watcher saw the test podping: 2026-11-05 23:59 UTC, `TFT-music-playlist.xml`, sender `0f9516b8`. If their watcher filters on trusted publishers, ask them to add the pubkey `0f9516b8034bf448ec1f15e705fcd072e05ca5c405357d5e4a92b171c1af5d24`. Then tell Claude the answer.
  - [ ] Copy `GOSSIP_SIGNING_KEY` from the Railway variables of the `podping` project into your password manager. Railway holds the only copy, and a new key needs trust again.
  - [ ] When the podping.cloud team answers your question, tell Claude. Their answer decides between trusting MSP's gossip key, a podping.cloud token for MSP, or no change.

## small-group-scoop

- [ ] Test the quiz demo on your iPhone (branch `vercel-demo`), then tell Claude the result. Claude then moves the demo changes into quiz PR #1: the fun questions, the tie-break question, the steady layout and the hover fix. None of them are in that PR yet.
  - [ ] Every run has 10 questions, and Next stays in one spot from question to question.
  - [ ] No answer looks picked when a new question opens. Chrome could not reproduce this, so only a real phone can confirm the fix.
- [ ] Tell Claude to prepare the iPhone layout PR for Spencer. The demo tests passed on `/after/` on 2026-11-03, on your phone and on a spare iPhone 11.
- [ ] PR #25 (The Board) waits for Spencer. When he decides what to do with it, tell Claude.

## square-my-art

- [ ] Test PR #2, the fixes for Save, window screenshots and Copy, in your desktop browser before you merge it, then tell Claude the result. Open https://square-my-art-git-worktree-fix-save-alpha-copy-chadfs-projects.vercel.app/ and sign in to Vercel, because the preview is behind its login. Headless Chrome passed every test.
  - [ ] Take a real window screenshot (⌘⇧4, then Space, then click a window) and drop it on the page. With JPEG, in Blur and in Crop, the space around the window is not black. Turn on the drop shadow: no black box shows behind the window.
  - [ ] Only if your browser is Safari: set JPEG and turn on "Keep JPEG at 500 KB or less". Move a slider, then click Save image at once. The file saves, and it is 500 KB or less.

## thelounge-candr

- [ ] PR #67 is deployed: the next time Accidentally Interesting goes live, check that LIT_Bot's notice shows in #OffTopic.


Five older items are in [the thelounge-candr note](../projects/thelounge-candr.md).

## Mac mini

## Laptop

## project-notes
