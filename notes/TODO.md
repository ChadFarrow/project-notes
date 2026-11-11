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

- [ ] Send a Fountain test boost to Chad and Reeds, then check its amount on `/boosts` (fix merged 2026-11-11, PR #70).
  - [ ] Boost an amount that is not a round hundred, for example 180 or 421 sats. `/boosts` should read within 1 sat of it (180 reads 179). Before the fix it read the nearest hundred.
  - [ ] If the amount is more than 1 sat off, tell Claude the amount you sent, the time, and what `/boosts` shows.

## chadf-landing-page


## chadf-musicl-playlists

- [ ] PR #7 is merged (2026-11-09): the 30-day OnlyBoosts top songs playlist, and only a clear answer now takes a song off a list. Two checks are left.
  - [ ] Open the new playlist in an app and check that its cover shows. The cover file answers HTTP 200 since the merge.
  - [ ] After the run on Monday 2026-11-16, ask Claude to read its log: both lists written, and how many rows are `KEPT`.

## Command-Center

- [ ] First real recording with the final Audio Hijack levels (set on 2026-11-08). The Riverside trial cannot export, so this is the first Riverside check. Keep Audio Hijack's Recorder on during the show: it records what goes into Riverside.
  - [ ] Listen to your Riverside track: the clips and the music sit at about the level of your voice, with no cuts and no pumping. If not, give Claude the Riverside track and the Audio Hijack recording.
  - [ ] Ask Reed whether the clips are clear and at a good level against your voice on his side of the call.

- [ ] First show with the board's Podhome controls (Command-Center PR #26, live on the board since 2026-11-09). Every test passed against a fake Podhome; only the real show can test the real go live and end live. Reload the board in Safari once before the show.
  - [ ] Before the show, the light next to On Air says "Podhome: pending".
  - [ ] Press Go Live, then "Board + Podhome". Within a few seconds the light says "Podhome: live", and the top row says "Podhome is live: 014.". If not, the top row says why: use the button on the Podhome website, and give Claude the message.
  - [ ] At the end, press End Show two times ("End show + Podhome?"). The light says "Podhome: ended".

- [ ] Send the Podhome developer the follow-up request (written by Claude on 2026-11-09): create a live episode through the API, with its live status and times; show the live times in the episode list; and does a new show from the API get its own key. When Podhome answers, tell Claude: then a test episode or a test show can test the board's Podhome controls without the real feed.

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


## thelounge-candr

- [ ] PR #67 is deployed: the next time Accidentally Interesting goes live, check that LIT_Bot's notice shows in #OffTopic.
- [ ] PR #79 is deployed: the next time Pod Around goes live, check that no LIT_Bot line shows in #BowlAfterBowl.
- [ ] PR #81 is deployed: the next time Boomer Bunker Live goes live, check that no LIT_Bot line shows in #BowlAfterBowl.


Five older items are in [the thelounge-candr note](../projects/thelounge-candr.md).

## Mac mini

## Laptop

## project-notes
