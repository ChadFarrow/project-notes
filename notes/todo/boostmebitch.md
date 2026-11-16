- [ ] Before merge: Phone pass on beta
  - [ ] Phone: #581 Clave on the iPhone, on its preview or on beta (the e2e stub cannot suspend an iOS socket or wake Clave). Leave BMB in the background for some minutes, come back, and boost with "My feed". The note posts with no RECONNECT. If Clave does not answer, the modal stays open with RETRY NOTE

- [ ] Before merge: #579 NEW MUSIC on /favorites (new albums from favorited artists)
  - [ ] Computer: signed in, ♡ an artist's publisher feed (a search hit with ▸ ALBUMS), then open /favorites. NEW MUSIC shows that artist's newest album if it is less than 90 days old
  - [ ] Computer: open a NEW MUSIC row, and check that the album page opens
  - [ ] Computer: open a Fountain album (for example Garden Of The Soul by Haleen). ♡ ARTIST shows under the artist name, and a press adds the artist to Favorites

- [ ] In development: Phone: on iOS, the music does not continue after an interruption (dictation, a call, a Bluetooth speaker turned off) until BMB is in front again. The lock-screen ▶ then goes to Apple Music. Seen on beta, 2026-11-15, with a community playlist and with dictation in another app. An iOS limit for web apps: iOS stops the JavaScript of a background page that plays nothing, so no web code can answer the lock screen. Only a native wrapper can fix it fully. A possible partial try: `navigator.audioSession` `statechange`, for an interruption that ends while the page still runs

## Already works

- #538 and #540 (community playlists) merge with main again and are back on beta.boostmebitch.com (2026-11-14).
- #567 GIF picker (2026-11-14, iPhone, Safari, beta): the GIFs play after Play anyway (Reduce Motion is on); ten searches in a row with scrolling, no freeze; the lock-screen ⏮/⏭ stay with the picker open over a playing track; search and scroll feel faster.
- #567 GIPHY grid on the boostmebuddy preview plays (2026-11-14).
- #564 and #567 are merged and live (2026-11-14).
