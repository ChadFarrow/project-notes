- [ ] After merge: Phone: PR #543 is merged (2026-11-13): "N s behind" and ⏭ GO LIVE under a live show. Test it on your iPhone during the next live show. Its browser tests passed in Chrome against a test stream, but not in Safari, on the lock screen or on a real broadcast. Then tell Claude what does not work.
  - [ ] In Safari or the Home Screen app, on boostmebitch.com, play a live show. While it plays on time, the row says `● LIVE` and shows no button.
  - [ ] When the audio stops to buffer for more than 5 s, the second line then says "N s behind live" and ⏭ GO LIVE shows. Press it: the audio jumps ahead, and the line goes back to the show name.
  - [ ] Lock the screen for a few minutes, then open the player: the number is right, and GO LIVE still works.

- [ ] In development: #538 and #540 (community playlists) are off beta.boostmebitch.com since 2026-11-14, because #538 no longer merges with main (a conflict in `lib/storage.ts`). Fix #538 first, then run `npm run beta -- add 538 540` and push beta.

## Already works

- #567 GIF picker (2026-11-14, iPhone, Safari, beta): the GIFs play after Play anyway (Reduce Motion is on); ten searches in a row with scrolling, no freeze; the lock-screen ⏮/⏭ stay with the picker open over a playing track; search and scroll feel faster.
- #567 GIPHY grid on the boostmebuddy preview plays (2026-11-14).
- #564 and #567 are merged and live (2026-11-14).
