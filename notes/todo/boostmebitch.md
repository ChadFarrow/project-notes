- [ ] In development: Phone: on iOS, the music does not continue after an interruption (dictation, a call, a Bluetooth speaker turned off) until BMB is in front again. The lock-screen ▶ then goes to Apple Music. Seen on beta, 2026-11-15, with a community playlist and with dictation in another app. An iOS limit for web apps: iOS stops the JavaScript of a background page that plays nothing, so no web code can answer the lock screen. Only a native wrapper can fix it fully. A possible partial try: `navigator.audioSession` `statechange`, for an interruption that ends while the page still runs
- [x] After merge: Phone: PR #543 is merged (2026-11-13): "N s behind" and ⏭ GO LIVE under a live show. Test it on your iPhone during the next live show. Its browser tests passed in Chrome against a test stream, but not in Safari, on the lock screen or on a real broadcast. Then tell Claude what does not work.
  - [ ] In Safari or the Home Screen app, on boostmebitch.com, play a live show. While it plays on time, the row says `● LIVE` and shows no button.
  - [ ] When the audio stops to buffer for more than 5 s, the second line then says "N s behind live" and ⏭ GO LIVE shows. Press it: the audio jumps ahead, and the line goes back to the show name.
  - [ ] Lock the screen for a few minutes, then open the player: the number is right, and GO LIVE still works.

## Already works

- #538 and #540 (community playlists) merge with main again and are back on beta.boostmebitch.com (2026-11-14).
- #567 GIF picker (2026-11-14, iPhone, Safari, beta): the GIFs play after Play anyway (Reduce Motion is on); ten searches in a row with scrolling, no freeze; the lock-screen ⏮/⏭ stay with the picker open over a playing track; search and scroll feel faster.
- #567 GIPHY grid on the boostmebuddy preview plays (2026-11-14).
- #564 and #567 are merged and live (2026-11-14).
