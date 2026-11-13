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

- [ ] Community playlists are on beta since 2026-11-12 (#537 is merged; #538–#540 are open). Beta and the main site share one real database, so a playlist made on beta keeps its address on boostmebuddy.com at launch. Test them, then tell Claude what does not work.
  - [ ] Make a playlist with 10 or more songs from search and from favorites, then publish, edit and delete it. The first publish also proves the sign-in check works behind Vercel.
  - [ ] Publish with a playlist art link that is not square or has a transparent background: it is accepted, and the feed's `itunes:image` is your own link.
  - [ ] In the maker and in Add songs, tap a song's cover: only that song plays, from the start, and it stops at its end.
  - [ ] Favorite a community playlist and one of its songs.
  - [ ] On `/admin`, delete a playlist, then ban and unban a test account.
  - [ ] Boost a song from one of your playlists and from a community playlist: the note names the song's album and says "Heard on" the playlist.
- [ ] Decide before PR #540 merges, and tell Claude: the "Heard on" line and the album header also change notes for the playlists that exist now (yes or no); should UNBAN ask first; may the `CLAUDE.md` word limit go up so its Names line can be fixed.
- [ ] Test PR #541, ⤮ SHUFFLE for the favorite singles, on your iPhone. Its browser tests passed in Chrome, but Chrome cannot test the iOS press. Then tell Claude what does not work, or mark the PR ready and merge it.
  - [ ] On beta.boostmebitch.com: open `/favorites`, press SINGLES, then ⤮ SHUFFLE. The first track plays at once, with no second ▶.
  - [ ] Lock the screen: when a track ends, the next shuffled track starts.
  - [ ] Open BOOST on a shuffled track: the splits name that track's artist, not another album.
  - [ ] After the merge, press SHUFFLE in the Home Screen app: the first track plays at once.
- [ ] Test PR #544 on your iPhone, on beta.boostmebitch.com: the art must not flash. Its tests passed in Chrome and in WebKit (Safari's engine). Then tell Claude what does not work, or mark the PR ready and merge it.
  - [ ] Open the full-screen player and press ⏭ several times: the cover changes once per track and is never empty.
  - [ ] Close the player and press ⏭ in the mini bar several times: the small picture is never empty.
- [ ] Test PR #545 on your iPhone, on beta.boostmebitch.com: a dead track does not stop the music. Its browser tests passed in Chrome and on beta, but not on a phone. Then tell Claude what does not work, or mark the PR ready and merge it.
  - [ ] With the screen locked, let a shuffle reach a dead track, such as "Winds of Change" by Herbivore: the next track plays without opening the app.
  - [ ] Tap a dead track in an album: the next track plays.
- [ ] Test PR #547 on your iPhone, on beta.boostmebitch.com: ⏮/⏭ on the lock screen for music. Its browser tests passed in Chrome, but no browser here draws a lock screen. Then tell Claude what does not work, or mark the PR ready and merge it.
  - [ ] Play music and lock the screen: it shows ⏮ and ⏭, and they go to the previous and next track.
  - [ ] Play a podcast episode and lock the screen: it still shows the skip buttons.
- [ ] Test PR #549 on your iPhone, on beta.boostmebitch.com: your avatar on the now-playing screen opens the account menu. Its browser tests passed in Chrome. Then tell Claude what does not work, or mark the PR ready and merge it.
  - [ ] Press the avatar on the now-playing screen: the menu opens, the same as on the home screen but with no theme link.
  - [ ] Press "my boosts": the player closes and your boosts page opens.
- [ ] Test PR #550 on your iPhone, on beta.boostmebitch.com: the background stall of bug #546. It is an experiment, and only a phone can show if it helps. About 30 s before a track ends, beta downloads the whole next file, so it costs extra data. Then tell Claude the result. If it does not help, Claude removes it.
  - [ ] In the Home Screen app, start a favorites shuffle, then lock the screen or go to another app. Listen through five or more track changes.
  - [ ] If a track does not start, open the app and send a bug report at once. If all tracks play, send a bug report too. The report carries the playback log, which shows if each early download finished.
- [ ] PR #543 is merged (2026-11-13): "N s behind" and ⏭ GO LIVE under a live show. Test it on your iPhone during the next live show. Its browser tests passed in Chrome against a test stream, but not in Safari, on the lock screen or on a real broadcast. Then tell Claude what does not work.
  - [ ] In Safari or the Home Screen app, on boostmebitch.com, play a live show. While it plays on time, the row says `● LIVE` and shows no button.
  - [ ] When the audio stops to buffer for more than 5 s, the second line then says "N s behind live" and ⏭ GO LIVE shows. Press it: the audio jumps ahead, and the line goes back to the show name.
  - [ ] Lock the screen for a few minutes, then open the player: the number is right, and GO LIVE still works.

## chadf-musicl-playlists

- [ ] PR #7 is merged (2026-11-09): the 30-day OnlyBoosts top songs playlist, and only a clear answer now takes a song off a list. Two checks are left.
  - [ ] Open the new playlist in an app and check that its cover shows. The cover file answers HTTP 200 since the merge.
  - [ ] After the run on Monday 2026-11-16, ask Claude to read its log: both lists written, and how many rows are `KEPT`.

## Command-Center

- [ ] Episode 014 (recorded 2026-11-11) is the first show with the final Audio Hijack levels (set on 2026-11-08). Its files are on the candr share in `episodes/014/`. Audio Hijack's folder has no recording of that show, so keep its Recorder on at the next show: it records what goes into Riverside.
  - [ ] Listen to episode 014: the clips and the music sit at about the level of your voice, with no cuts and no pumping. If not, tell Claude which file you heard.
  - [ ] Ask Reed whether the clips are clear and at a good level against your voice on his side of the call.

- [ ] Send the Podhome developer the follow-up request (written by Claude on 2026-11-09): create a live episode through the API, with its live status and times; show the live times in the episode list; and does a new show from the API get its own key. When Podhome answers, tell Claude: then a test episode or a test show can test the board's Podhome controls without the real feed.

- [ ] Command-Center PR #28, ISO trim, is live on the board since 2026-11-11. Its tests passed in Chrome and WebKit, but not in your own Safari, on air or with the real ISO folder. Tell Claude what does not work.
  - [ ] Trim a song in ISO Edit: Play part, then Done, then press the ISO. It plays only the part, and it starts at once.
  - [ ] Listen on air (your headphones and the Audio Hijack recording): the part starts and ends with no click, at about the level of the other ISOs.
  - [ ] The ISO folder on the NAS has "<name> part.mp3" next to the whole file. Trim the same ISO again: there is still one part file, and no "<name> part 2.mp3".
  - [ ] Trim a song longer than 4 minutes: its part plays at once.

- [ ] Command-Center PR #29, ISO pages, is live on the board since 2026-11-11. Its tests passed in Chrome and WebKit, but not with your real board or your number pad. Tell Claude what does not work.
  - [ ] At the first load, the top row says the ISOs are on pages now. Your first nine ISOs keep their keys on page 1; key 0 shows page 2.
  - [ ] Keys 1–9 and 0 on your number pad play and flip, as on the top row.
  - [ ] Name a page in ISO Edit (the field next to the page number): the name shows in the page bar.
  - [ ] Play a long ISO, then press 0: it plays on, the page bar shows "♪ Page 1", and Space stops it.
  - [ ] Move an ISO to another page with the page menu on its card, and drag a card to a new place. At half screen, the bottom row (keys 1–3) of ISO Edit needs a scroll.

- [ ] Command-Center PR #30, more show pads, is live on the board since 2026-11-11. Its tests passed in Chrome and WebKit, but not on air. Tell Claude what does not work.
  - [ ] In Show Edit, "+ Add pad" a song: it plays on R, at about the loudness of the Music pad. Remove it with two presses.
  - [ ] With 6 pads at half screen, the whole ISO page still shows, and in Show Edit the Show panel scrolls inside itself.

## MSP-2.0

- [ ] The v4vmusic dev: tell Claude each answer.
  - [ ] Your note about Live At Rockpile and The EP (Amnesia): both stay out of date on v4vmusic.com until the dev changes their feed URLs.
  - [ ] Ask how v4vmusic.com picks up podpings, because MSP users say podping.me works better there. Does v4vmusic accept podpings signed by `chadf` with id `pp_music_update`? podping.me sends through podping.cloud, so its podpings are signed by `podping.aaa` to `podping.eee`, always as `pp_podcast_update`, and they are also on gossip.
  - [ ] Podcast Index stores feed URLs with spaces as raw spaces, but every podping carries `%20` (issue #179). Does v4vmusic match on the stored URL?
- [ ] Decide issue #179: should MSP offer to send a feed URL with spaces as `%20` (B), or keep refusing it with a better message (A)? Tell Claude A or B.

## msp-podping-service

- [ ] Finish the gossip setup from PR #8. It is live and tested: MSP podpings reach Hive and the podping gossip network, and a deploy keeps the same key.
  - [ ] Ask the musicindex.org gossip-watcher operator whether their watcher saw the test podping: 2026-11-05 23:59 UTC, `TFT-music-playlist.xml`, sender `0f9516b8`. If their watcher filters on trusted publishers, ask them to add the pubkey `0f9516b8034bf448ec1f15e705fcd072e05ca5c405357d5e4a92b171c1af5d24`. Then tell Claude the answer.
  - [ ] When the podping.cloud team answers your question, tell Claude. Their answer decides between trusting MSP's gossip key, a podping.cloud token for MSP, or no change.

## small-group-scoop

- [ ] Test the quiz demo (branch `vercel-demo` of your fork) on your iPhone, then tell Claude the result. Claude then moves the demo changes into PR #1 of your fork.
  - [ ] Every run has 10 questions, and Next stays in one spot from question to question.
  - [ ] No answer looks picked when a new question opens. Chrome could not reproduce this, so only a real phone can confirm the fix.
- [ ] Tell Claude to prepare the iPhone layout PR for Spencer. Its demo tests passed on 2026-11-03, on your phone and on a spare iPhone 11.
- [ ] PR #25 waits for Spencer. When he decides what to do with it, tell Claude.

## thelounge-candr

- [ ] PR #67 is deployed: the next time Accidentally Interesting goes live, check that LIT_Bot's notice shows in #OffTopic.
- [ ] PR #79 is deployed, and Pod Around went live after it, on 2026-11-09 at 22:10 UTC (17:10 EST). Check that #BowlAfterBowl has no LIT_Bot line at that time.
- [ ] PR #81 is deployed, and Boomer Bunker Live went live after it, on 2026-11-10 at 21:39 UTC (16:39 EST). Check that #BowlAfterBowl has no LIT_Bot line at that time.
- [ ] Push-gap test: close the iPhone app, send DMs at 10, 40 and 90 s, check which push arrives; build plan Task 7 only if one is missing.
- [ ] End of the IRCCloud trial: The Lounge takes `ChadF` with NickServ, channel order, cancel IRCCloud.

## project-notes

- [ ] Before merge: PR #24, To do groups, place marks, filters, PR links and titles. Read its body, merge it, then tell Claude. Claude then adds the group and place words to this list (you see the full file first) and the phone rule to vibe-kit.
- [ ] After merge: Make the read token with the link in the token sheet (choose All repositories), and paste it on the live page. Then tell Claude whether the sheet accepted it and whether titles show under a Command-Center item.
