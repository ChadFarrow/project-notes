- [ ] In development: Send the Podhome developer the follow-up request (written by Claude on 2026-11-09): create a live episode through the API, with its live status and times; show the live times in the episode list; and does a new show from the API get its own key. When Podhome answers, tell Claude: then a test episode or a test show can test the board's Podhome controls without the real feed.

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

- [ ] After merge: Computer: Audio Hijack has a new chain since 2026-11-13: AUPeakLimiter (Pre-Gain +10 dB), then Volume 75 %. Its test recording met the level targets, but no Riverside export confirms them yet. Do one Riverside test with this setup, with Reed if he can join.
  - [ ] Click Run in Audio Hijack and keep its Recorder on for the whole test, so Claude gets both files of the same audio.
  - [ ] In Riverside, talk normally for about 30 s, then laugh or talk loudly once. Play an ISO, the intro (let it fade), about 30 s of a song and the outro, with silence between. Reed talks for about 30 s.
  - [ ] Export as WAV HD with Normalize audio levels off, noise removal off and Magic Audio off on your track. Give Claude the export's path and the time of the test.

- [ ] Before merge: Computer: Command-Center PR #33: the Music pad is levelled on its mono mix, and a loudness meter sits next to Edit on the Show panel. Its tests passed in Chrome and WebKit, but not in your own Safari. Merge it, reload the board in Safari, then tell Claude what does not work.
  - [ ] Off air, play the Intro, an ISO and the song: the meter shows each one near the white line (−16 LUFS), and "— LUFS" a few seconds after Stop.
  - [ ] In Show Edit, the song's line says "levelled" about −3.6 dB (it was −4.8 dB): the song now plays about 1.2 dB louder.
