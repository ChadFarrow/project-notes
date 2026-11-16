- [ ] Before merge: #579 NEW MUSIC on /favorites (new albums from favorited artists)
  - [ ] Computer: signed in, ♡ an artist's publisher feed (a search hit with ▸ ALBUMS), then open /favorites. NEW MUSIC shows that artist's newest album if it is less than 90 days old
  - [ ] Computer: open a NEW MUSIC row, and check that the album page opens
  - [ ] Computer: open a Wavlake album (for example Tinderbox by Nate Johnivan) and press ♡ ARTIST under the artist name. NEW MUSIC on Favorites then lists the artist under "Followed on this device", and the artist is not added to your favorites list

- [ ] Before merge: #580 DEMU search type and #583 /demu page. Merge #580 first, then change the base of #583 to `main`
  - [ ] Computer: on the Vercel preview of #583, open /demu. The list loads with week headings and a date on each row (the browser test used a saved answer, because Podcast Index rate-limited the test laptop)
  - [ ] Computer: on the same preview, pick DEMU in the search menu and search Longy. 14 albums show and none is from Wavlake. Then press "browse all DeMu →" and check that /demu opens with Longy in the box

- [ ] In development: Phone: on iOS, the music does not continue after an interruption (dictation, a call, a Bluetooth speaker turned off) until BMB is in front again. The lock-screen ▶ then goes to Apple Music. Seen on beta, 2026-11-15, with a community playlist and with dictation in another app. An iOS limit for web apps: iOS stops the JavaScript of a background page that plays nothing, so no web code can answer the lock screen. Only a native wrapper can fix it fully. A possible partial try: `navigator.audioSession` `statechange`, for an interruption that ends while the page still runs

## Already works

- #538 and #540 (community playlists) merge with main again and are back on beta.boostmebitch.com (2026-11-14).
- #567 GIF picker (2026-11-14, iPhone, Safari, beta): the GIFs play after Play anyway (Reduce Motion is on); ten searches in a row with scrolling, no freeze; the lock-screen ⏮/⏭ stay with the picker open over a playing track; search and scroll feel faster.
- #567 GIPHY grid on the boostmebuddy preview plays (2026-11-14).
- #564 and #567 are merged and live (2026-11-14).
