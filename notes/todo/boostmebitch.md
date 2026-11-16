- [ ] Before merge: #579 NEW MUSIC on /favorites (new albums from favorited artists)
  - [ ] Computer: signed in, ♡ an artist's publisher feed (a search hit with ▸ ALBUMS), then open /favorites. NEW MUSIC shows that artist's newest album if it is less than 90 days old
  - [ ] Computer: open a NEW MUSIC row, and check that the album page opens
  - [ ] Computer: open a Wavlake album (for example Tinderbox by Nate Johnivan) and press ♡ ARTIST under the artist name. NEW MUSIC on Favorites then lists the artist under "Followed on this device", and the artist is not added to your favorites list

- [ ] Before merge: #580 DEMU search type and #583 /demu page. Merge #580 first, then change the base of #583 to `main`
  - [ ] Computer: on the Vercel preview of #583, open /demu. The list loads with week headings and a date on each row (the browser test used a saved answer, because Podcast Index rate-limited the test laptop)
  - [ ] Computer: on the same preview, pick DEMU in the search menu and search Longy. 14 albums show and none is from Wavlake. Then press "browse all DeMu →" and check that /demu opens with Longy in the box

- [ ] In development: #583 /demu is on beta through the beta-only branch `beta-demu-page` (#583 plus the five beta branches, conflicts resolved). When #583 changes, merge `feat/demu-page` into `beta-demu-page` and run `npm run beta -- rebuild`. Delete the branch and drop it from beta when #583 merges

- [ ] In development: #583 check which v4vmusic.com tags mark spam (it already hides feeds like The Board Game Design Lab), so /demu can use those tags to hide feeds as well as its own hide list in `lib/demu-hide-list.ts`

- [ ] Before merge: Phone pass on beta
  - [ ] Phone: #585 in Chrome on Android, open the fullscreen player from /favorites, then use the Android back gesture. The first back closes the player and stays on /favorites, and each later back goes to the page before. The browser test cannot copy a real Android back, which can skip entries that a page added without a tap

- [ ] Before merge: #584 the boost screen stays on its track when the track changes
  - [ ] Computer: with a real NWC wallet, boost a song of a musicL playlist from the player when about 5 s are left. The boost screen stays on that song and shows ✓ or ✗ for each split until you close it. The browser test used a stub wallet, so no sats moved

- [ ] In development: Phone: on iOS, the music does not continue after an interruption (dictation, a call, a Bluetooth speaker turned off) until BMB is in front again. The lock-screen ▶ then goes to Apple Music. Seen on beta, 2026-11-15, with a community playlist and with dictation in another app. An iOS limit for web apps: iOS stops the JavaScript of a background page that plays nothing, so no web code can answer the lock screen. Only a native wrapper can fix it fully. A possible partial try: `navigator.audioSession` `statechange`, for an interruption that ends while the page still runs

## Already works

- #538 and #540 (community playlists) merge with main again and are on beta.boostmebitch.com (2026-11-16). #540's boost modals keep main's signer check and RETRY NOTE plus the note's brand and sender name: `e2e:boostnote` 47/47 with a stub signer and wallet. Its own `e2e:communitynote` needs the community Postgres, which the laptop lacks.
- The stack #538, clever-clarke, #574 and #576 merges main's #578 (`PlaylistDraft.ownerName`): #538 builds again with #576's own name lines, without the MADE BY box (2026-11-16).
- #567 GIF picker (2026-11-14, iPhone, Safari, beta): the GIFs play after Play anyway (Reduce Motion is on); ten searches in a row with scrolling, no freeze; the lock-screen ⏮/⏭ stay with the picker open over a playing track; search and scroll feel faster.
- #567 GIPHY grid on the boostmebuddy preview plays (2026-11-14).
- #564 and #567 are merged and live (2026-11-14).
