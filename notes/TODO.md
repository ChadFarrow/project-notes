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

## candr.space


## chadf-landing-page


## chadf-musicl-playlists

- [ ] Review and merge PR #7 before Monday 2026-11-09 at 05:00 UTC (midnight Eastern). It is a draft, and its checks pass. It adds the 30-day OnlyBoosts top songs playlist, and it fixes a defect on `main`: a feed that times out takes its song off the all-time list. Without the merge, the Monday run uses the old rule.
  - [ ] After the merge, check that the new playlist's cover shows in an app. The cover returns HTTP 404 until the merge.
  - [ ] After the Monday run, ask Claude to read its log: both lists written, and how many rows are `KEPT`.

## Command-Center

- [ ] First real recording with the final Audio Hijack levels (set on 2026-11-08). The Riverside trial cannot export, so this is the first Riverside check. Keep Audio Hijack's Recorder on during the show: it records what goes into Riverside.
  - [ ] Listen to your Riverside track: the clips and the music sit at about the level of your voice, with no cuts and no pumping. If not, give Claude the Riverside track and the Audio Hijack recording.
  - [ ] Ask Reed whether the clips are clear and at a good level against your voice on his side of the call.

- [ ] First show with the board's Podhome controls (Command-Center PR #26, live on the board since 2026-11-09). Every test passed against a fake Podhome; only the real show can test the real go live and end live. Reload the board in Safari once before the show.
  - [ ] Before the show, the light next to On Air says "Podhome: pending".
  - [ ] Press Go Live, then "Board + Podhome". Within a few seconds the light says "Podhome: live", and the top row says "Podhome is live: 014.". If not, the top row says why: use the button on the Podhome website, and give Claude the message.
  - [ ] At the end, press End Show two times ("End show + Podhome?"). The light says "Podhome: ended".

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
  - [ ] When the podping.cloud team answers your question, tell Claude. Their answer decides between trusting MSP's gossip key, a podping.cloud token for MSP, or no change.

## small-group-scoop

- [ ] Test the quiz demo on your iPhone (branch `vercel-demo`), then tell Claude the result. Claude then moves the demo changes into quiz PR #1: the fun questions, the tie-break question, the steady layout and the hover fix. None of them are in that PR yet.
  - [ ] Every run has 10 questions, and Next stays in one spot from question to question.
  - [ ] No answer looks picked when a new question opens. Chrome could not reproduce this, so only a real phone can confirm the fix.
- [ ] Tell Claude to prepare the iPhone layout PR for Spencer. The demo tests passed on `/after/` on 2026-11-03, on your phone and on a spare iPhone 11.
- [ ] PR #25 (The Board) waits for Spencer. When he decides what to do with it, tell Claude.

## square-my-art

- [ ] Try the zoom (PR #3) and the fixes of PR #2 with your own screenshots on the live site, https://square-my-art.vercel.app, then tell Claude the result. Both PRs are merged and live, and headless Chrome passed every test. Tick a test that you already did.
  - [ ] Drop a full-screen screenshot and move Screenshot size to the right of Fit. The image zooms in, its sides are cut off, and the blurred bands get smaller. At Fill they are gone.
  - [ ] With a zoom, move Crop position to the left and to the right. The cut moves with it.
  - [ ] Drop a real window screenshot (⌘⇧4, then Space, then click a window). With JPEG, in Blur and in Crop, the space around the window is not black. Turn on the drop shadow: no black box shows behind the window.
  - [ ] Only if your browser is Safari: set JPEG and turn on "Keep JPEG at 500 KB or less". Move a slider, then click Save image at once. The file saves, and it is 500 KB or less.

## thelounge-candr

- [ ] PR #67 is deployed: the next time Accidentally Interesting goes live, check that LIT_Bot's notice shows in #OffTopic.
- [ ] Deploy PR #79 (Pod Around off #BowlAfterBowl). It is merged, but auto mode blocks Claude's SSH to the box.
  - [ ] In the Mac Terminal, run `cd ~/Vibe/thelounge-candr && ./deploy-bots.sh 104.237.150.197`. Then `ssh root@104.237.150.197 'cat /opt/bots/src/DEPLOYED_FROM'` must print `48f75200…`. Tell Claude, so the deploy goes into the repo's CLAUDE.md.
  - [ ] The next time Pod Around goes live, check that no LIT_Bot line shows in #BowlAfterBowl.


Five older items are in [the thelounge-candr note](../projects/thelounge-candr.md).

## Mac mini

## Laptop

## project-notes
