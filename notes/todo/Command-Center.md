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

- [ ] After merge: Computer: Command-Center PR #33, the Music pad levelled on its mono mix and a loudness meter next to Edit on the Show panel, is live on the board since 2026-11-14. Its tests passed in Chrome and WebKit, but not in your own Safari. Reload the board in Safari, then tell Claude what does not work.
  - [ ] Off air, play the Intro, an ISO and the song: the meter shows each one near the white line (−16 LUFS), and "— LUFS" a few seconds after Stop.
  - [ ] In Show Edit, the song's line says "levelled" about −3.6 dB (it was −4.8 dB): the song now plays about 1.2 dB louder.

- [ ] After merge: Computer: Command-Center PR #35, every clip on the board levelled on its mono mix (the Intro and Outro too), is live on the board since 2026-11-14. Its tests passed in Chrome and WebKit, but not in your own Safari or in a Riverside export. Reload the board in Safari, then tell Claude what does not work.
  - [ ] Computer: In Show Edit, the Intro's line says "levelled +1.1 dB" and the Outro's "levelled +0.3 dB". In ISO Edit, "POKEMON THEME" says about "levelled -8.9 dB" (it was about -10.9 dB).
  - [ ] Computer: Record a short Riverside test with the Audio Hijack Recorder on: talk, then the Intro, the song, an ISO and the Outro. Before it, ask Reed to raise his clips by about 8 dB, and look at two Riverside settings: echo cancellation for you, and noise reduction (Studio settings → Recording). Use the new headphone mix (Brave → "Reed" in Audio Hijack, eqMac quit): the Reed slider changes only Reed, and Reed does not hear himself. Export WAV HD with Normalize audio levels off, and give Claude the path and the two settings. Each clip should be within 1 dB of the others.

- [ ] After merge: On air: Command-Center PR #36, the Rec control that records the live stream as a WAV file in the livestream folder on the NAS, is live on the board since 2026-11-14. Its tests passed in Chrome and WebKit with a fake stream, but not with the real stream or in your own Safari. Tell Claude what does not work.
  - [ ] On air: Start a test stream and press Rec: it shows "○ Rec: waiting", then the time in red. Stop it with two presses, and play the WAV file from the livestream folder.
  - [ ] On air: During a test recording, disconnect the NAS share once: Rec stops, and the status line says it could not write to the NAS.
