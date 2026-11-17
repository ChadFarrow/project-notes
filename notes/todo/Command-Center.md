- [ ] In development: Computer: In Herdr, open the command-center workspace and select "Yes, I trust this folder". The dispatcher then sends the waiting task by itself: the IRC show notes, the !note links and the !title ideas go into the episode packet for `/candr-post`. Do it before the post-production of 015 on Thursday 2026-11-19.

- [ ] In development: Send the Podhome developer the follow-up request (written by Claude on 2026-11-09): create a live episode through the API, with its live status and times; show the live times in the episode list; and does a new show from the API get its own key. When Podhome answers, tell Claude: then a test episode or a test show can test the board's Podhome controls without the real feed.

- [ ] In development: Send the Podhome developer the post-show request (written by Claude on 2026-11-15): "Can `POST /api/modify_v4v` time splits (and `GET /api/v4v`) carry a remote item, the feed GUID and item GUID of a song, so a script can add a song's value time split by itself? And can chapters take `toc` (false = an image-only chapter, not in the table of contents) and `endTime`, as in the Podcasting 2.0 JSON chapters spec?" When Podhome answers, tell Claude: the post-show agent then sets the song split and the screenshot chapters by itself.

- [ ] In development: Computer: Post-show agent, later: the NAS ↔ Proton copy job. Compare the candr folder on the NAS (`/Volumes/candr`) with the candr folder in your Proton Drive (shared with Reed), and decide: a full sync, or only defined folders in defined directions (new files from Reed → NAS; your art and transcripts → Proton; no deletes). The watcher for `candr/episodes/Final Audio` comes first (#44).

- [ ] Before merge: Computer: #47, the full screen layout from your mockup, waits for your merge. Merge it after the 015 show, not before. Then pull `main` in `~/Vibe/Command-Center` (or ask Claude), reload the board in Safari, make the window full size (1600 × 860 or more), and tell Claude what differs from the mockup.
  - [ ] Computer: The places: show pads, the meter and Ears on the left; the show notes with Chapter under them in the middle; the ISOs on the right, with the space under them empty.
  - [ ] Computer: A message (for example after a Chapter press) shows over the bottom of the show notes for a few seconds. Is that a good place for it?
  - [ ] Computer: Reset is hidden while the show is live and shows after End Show, as in the mockup. Keep it so?
  - [ ] Computer: "+ Add pad" shows in the live view, as in the mockup. Keep it so?

- [ ] After merge: Computer: Command-Center PR #40, the show file for the after-show step, is merged, and the board server runs it since 2026-11-15 (`/api/post` says "available"). Reload the board in Safari before the 015 show on Wednesday 2026-11-18.
  - [ ] Computer: After the 015 show, `~/Library/Application Support/candr-post/shows/` holds one show file, and `pads/` holds the Intro, Outro and song. Tell Claude what is missing.

- [ ] After merge: On air: The 015 show on Wednesday 2026-11-18, so `/candr-post` has what it needs (PR #41).
  - [ ] On air: Press Go Live and pick "Board + Podhome" (the show file then names the episode).
  - [ ] On air: Load the song on a show pad, and tick `- [x] Track - <title> by <artist>` in the episode note.
  - [ ] On air: Press Chapter when the topic changes, and take screenshots as usual.
- [ ] After merge: Computer: Post-production of 015 on Thursday 2026-11-19 with PR #41.
  - [ ] Computer: Upload the MP3 with Podhome AI as usual, and check that the episode number is 15. Add the song's split in Podhome (pick the song; any start time).
  - [ ] Phone: Run `/candr-post 15 --dry-run` in a Claude session and read the list; then run `/candr-post 15` and answer with the numbers to keep.
  - [ ] Computer: After the split write, open the episode in the Podhome website: the split must still point to the song. Tell Claude "the split is fine" or "the split lost the song". Then publish or schedule the episode yourself.

- [ ] After merge: Computer: Start the watcher (#44) only after 015 is Published. Then tell Claude: Claude writes the folder path, runs the dry run, and installs the agent; you get one DM with the first-start count. The first real run is 016: Reed (or you) puts `candr-016.mp3` in `candr/episodes/Final Audio`.

- [ ] After merge: Command-Center PR #28, ISO trim, is live on the board since 2026-11-11. Its tests passed in Chrome and WebKit, but not in your own Safari, on air or with the real ISO folder. Tell Claude what does not work.
  - [ ] Computer: Trim a song in ISO Edit: Play part, then Done, then press the ISO. It plays only the part, and it starts at once.
  - [ ] On air: Listen on air (your headphones and the Audio Hijack recording): the part starts and ends with no click, at about the level of the other ISOs.
  - [ ] Computer: The ISO folder on the NAS has "<name> part.mp3" next to the whole file. Trim the same ISO again: there is still one part file, and no "<name> part 2.mp3".
  - [ ] Computer: Trim a song longer than 4 minutes: its part plays at once.

- [ ] After merge: Computer: Command-Center PR #29, ISO pages, is live on the board since 2026-11-11. Its tests passed in Chrome and WebKit, but not with your real board or your number pad. Tell Claude what does not work.
  - [ ] At the first load, the top row says the ISOs are on pages now. Your first nine ISOs keep their keys on page 1; key 0 shows page 2.
  - [ ] Keys 1–9 and 0 on your number pad play and flip, as on the top row.
  - [ ] Name a page in ISO Edit (the field next to the page number): the name shows in the page bar.
  - [ ] Play a long ISO, then press 0: it plays on, the page bar shows "♪ Page 1", and Space stops it.
  - [ ] Move an ISO to another page with the page menu on its card, and drag a card to a new place. At half screen, the bottom row (keys 1–3) of ISO Edit needs a scroll.

- [ ] After merge: Computer: Command-Center PR #30, more show pads, is live on the board since 2026-11-11. Its tests passed in Chrome and WebKit, but not on air. Tell Claude what does not work.
  - [ ] In Show Edit, "+ Add pad" a song: it plays on R, at about the loudness of the Music pad. Remove it with two presses.
  - [ ] With 6 pads at half screen, the whole ISO page still shows, and in Show Edit the Show panel scrolls inside itself.

- [ ] After merge: Computer: Command-Center PR #33, the Music pad levelled on its mono mix and a loudness meter next to Edit on the Show panel, is live on the board since 2026-11-14. Its tests passed in Chrome and WebKit, but not in your own Safari. Reload the board in Safari, then tell Claude what does not work.
  - [ ] Off air, play the Intro, an ISO and the song: the meter shows each one near the white line (−16 LUFS), and "— LUFS" a few seconds after Stop.
  - [ ] In Show Edit, the song's line says "levelled" about −3.6 dB (it was −4.8 dB): the song now plays about 1.2 dB louder.

- [ ] After merge: Computer: Command-Center PR #35, every clip on the board levelled on its mono mix (the Intro and Outro too), is live on the board since 2026-11-14. Its tests passed in Chrome and WebKit, but not in your own Safari or in a Riverside export. Reload the board in Safari, then tell Claude what does not work.
  - [ ] Computer: In Show Edit, the Intro's line says "levelled +1.1 dB" and the Outro's "levelled +0.3 dB". In ISO Edit, "POKEMON THEME" says about "levelled -8.9 dB" (it was about -10.9 dB).
  - [ ] Computer: Record a short Riverside test with the Audio Hijack Recorder on: talk, then the Intro, the song, an ISO and the Outro. Before it, ask Reed to raise his clips by about 8 dB, and look at two Riverside settings: echo cancellation for you, and noise reduction (Studio settings → Recording). Use the new headphone mix (Brave → "Reed" in Audio Hijack, eqMac quit): the Reed slider changes only Reed, and Reed does not hear himself. Export WAV HD with Normalize audio levels off, and give Claude the path and the two settings. Each clip should be within 1 dB of the others.

- [ ] After merge: On air: Command-Center PR #36, the Rec control that records the live stream as a WAV file in the livestream folder on the NAS, is live on the board since 2026-11-14. Its tests passed in Chrome and WebKit with a fake stream, but not with the real stream or in your own Safari. Tell Claude what does not work.
  - [ ] On air: Start a test stream and press Rec: it shows "○ Rec: waiting", then the time in red. Stop it with two presses, and play the WAV file from the livestream folder.
  - [ ] On air: During a test recording, disconnect the NAS share once: Rec stops, and the status line says it could not write to the NAS.

- [ ] After merge: Computer: Command-Center PR #42, Ears: Reed and the board in your headphones, set from the board, is live on the board since 2026-11-15 (board server restarted; the Shortcut ran from it with no popup). Its tests passed in Chrome and WebKit, but not in your own Safari or in a show. Tell Claude what does not work.
  - [ ] On air: In a show, change Reed with − and + (or the keys [ and ]). Only Reed changes in your headphones, and Reed hears no change.

- [ ] After merge: Computer: Command-Center PR #45 (the song starts cleanly after Stop and Play) and PR #46 (Ears: 6 dB a press, +6 to −36) are live on the board since 2026-11-15 (board server restarted; Ears reads Reed 0 and Board 0 from the −6/−12/−24 blocks). Their tests passed in Chrome and WebKit, but not in your own Safari or with a real voice. Tell Claude what does not work.
  - [ ] Computer: Reload the board in Safari. Play the Music song, Stop it, and Play it again, two times: each Play starts at 0:00 with no old sound under it (#45).
  - [ ] Computer: Ears shows Reed 0 and Board 0 (#46). Play a talk podcast in Brave and the song on the board, talk into your mic, and set Reed and Board with Ears to the level of your voice. Tell Claude the two numbers.
