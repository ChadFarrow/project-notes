- [ ] Before merge: #579 NEW MUSIC on /favorites (new albums from favorited artists)
  - [ ] Computer: signed in, ♡ an artist's publisher feed (a search hit with ▸ ALBUMS), then open /favorites. NEW MUSIC shows that artist's newest album if it is less than 90 days old
  - [ ] Computer: open a NEW MUSIC row, and check that the album page opens
  - [ ] Computer: open a Wavlake album (for example Tinderbox by Nate Johnivan) and press ♡ ARTIST under the artist name. NEW MUSIC on Favorites then lists the artist under "Followed on this device", and the artist is not added to your favorites list

- [ ] Before merge: #580 DEMU search type and #583 /demu page. Merge #580 first, then change the base of #583 to `main`

- [ ] In development: #583 /demu is on beta through the beta-only branch `beta-demu-page` (#583 plus the five beta branches, conflicts resolved). When #583 changes, merge `feat/demu-page` into `beta-demu-page` and run `npm run beta -- rebuild`. Delete the branch and drop it from beta when #583 merges

- [ ] In development: #583 check which v4vmusic.com tags mark spam (it already hides feeds like The Board Game Design Lab), so /demu can use those tags to hide feeds as well as its own hide list in `lib/demu-hide-list.ts`

- [ ] Before merge: Phone pass on beta
  - [ ] Phone: #585 in Chrome on Android, open the fullscreen player from /favorites, then use the Android back gesture. The first back closes the player and stays on /favorites, and each later back goes to the page before. The browser test cannot copy a real Android back, which can skip entries that a page added without a tap

- [ ] Before merge: #584 the boost screen stays on its track when the track changes
  - [ ] Computer: with a real NWC wallet, boost a song of a musicL playlist from the player when about 5 s are left. The boost screen stays on that song and shows ✓ or ✗ for each split until you close it. The browser test used a stub wallet, so no sats moved

- [ ] Before merge: #590 the site signs only a boost note somebody paid a 1-sat stamp for. It is stacked on #588: merge #588 first
  - [ ] Computer: on both Vercel projects, set `SITE_STAMP_LNADDRESS` to a Lightning address that receives the stamps, and on Preview too if beta runs there. Its provider must support the LUD-21 `verify` link on its own domain (an Alby address does; `chadf@boostmebitch.com` does not). Without it, every signed-out and Anonymous note posts from a one-time key, not from the site

- [ ] After merge: #590 the note stamp in production
  - [ ] Computer: on boostmebitch.com and on boostmebuddy.com, send one real signed-out boost. The status shows "Paying the 1-sat stamp…", 1 sat leaves the wallet, and the note shows the site's name. The browser test used a fake Lightning address, so no real stamp was paid
  - [ ] Computer: signed in with a Spark wallet, send one Anonymous boost. The note shows the site's name, and no line says "Posted from a one-time key … could not confirm". Spark was not tested
  - [ ] Computer: when production on both brands and beta carry #590, set `SITE_SIGN_REQUIRE_STAMP=on` on both Vercel projects. A note with no stamp is then refused

- [ ] In development: Phone: on iOS, the music does not continue after an interruption (dictation, a call, a Bluetooth speaker turned off) until BMB is in front again. The lock-screen ▶ then goes to Apple Music. Seen on beta, 2026-11-15, with a community playlist and with dictation in another app. An iOS limit for web apps: iOS stops the JavaScript of a background page that plays nothing, so no web code can answer the lock screen. Only a native wrapper can fix it fully. A possible partial try: `navigator.audioSession` `statechange`, for an interruption that ends while the page still runs

## Already works

- #583 cover overlay (2026-11-17, iPhone, beta): no cover shows a ▶ or a round badge; a tap plays the album and shows ❚❚ on a dark layer with a yellow border; a second tap shows ▶ and keeps the border; a tap on another cover returns the first to plain art.
- #580 and #583 (2026-11-16, computer, preview): /demu loads with week headings and a date on each row; the DEMU search for Longy shows 14 albums, none from Wavlake, and "browse all DeMu →" opens /demu with Longy in the box. (iPhone, beta): a press on a cover plays the album, and a press on the rest of the row opens it.
- #538 and #540 (community playlists) merge with main again and are on beta.boostmebitch.com (2026-11-16). #540's boost modals keep main's signer check and RETRY NOTE plus the note's brand and sender name: `e2e:boostnote` 47/47 with a stub signer and wallet.
- The stack #538, clever-clarke, #574 and #576 merges main's #578 (`PlaylistDraft.ownerName`): #538 builds again with #576's own name lines, without the MADE BY box (2026-11-16).
- #567 GIF picker (2026-11-14, iPhone, Safari, beta): the GIFs play after Play anyway (Reduce Motion is on); ten searches in a row with scrolling, no freeze; the lock-screen ⏮/⏭ stay with the picker open over a playing track; search and scroll feel faster.
- #567 GIPHY grid on the boostmebuddy preview plays (2026-11-14).
- #564 and #567 are merged and live (2026-11-14).
