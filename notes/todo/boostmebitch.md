- [ ] In development: Decisions from the triage of all open PRs on 2026-11-17 (agent boostmebitch-3). Tell Claude each answer
  - [ ] After your real-wallet test of #584 (below): merge #584 first, and then an agent fixes the one line of `components/player.tsx` in #585? The two conflict in that line, and the fix is tested

- [ ] After merge: #538. Tell Claude to delete the branch `home-playlists-section` (you approved it on 2026-11-17). Its only commit is in #538

- [ ] Before merge: #592 search finds a misspelled name. It is on beta since 2026-11-17
  - [ ] Phone: on beta, search `muton` and then `homegrown hitz`. The Mutton, Mead & Music playlist and the ChadF Homegrown Hits playlist show. A misspelled artist or album name (`ainsley costelo`, `tindrebox`) still finds nothing: #592 now covers playlist names only, as you chose on 2026-11-17

- [ ] In development: #592 is on beta through the beta-only branch `beta-typo-search` (#592 plus the #576 chain and `beta-demu-page`, import conflicts resolved). When #592 changes, merge `claude/elegant-fermi-2n35nu` into `beta-typo-search` and run `npm run beta -- rebuild`. Delete the branch and drop it from beta when #592 merges

- [ ] In development: the fix PR for #595 (boostmebitch-3 makes it). Your real-wallet test at 21:49 UTC on 2026-11-17 failed: `value_msat_total` was 3000 on a 100-sat boost during a song. When that PR is ready, Computer: with a real wallet, boost 100 sats while a song plays in an episode whose show split pays your node. Helipad shows 100 sats on that row, with your share under it

- [ ] Before merge: #579 NEW MUSIC on /favorites (new albums from favorited artists). #579 is not on beta: test on the Vercel preview of the PR
  - [ ] Computer: signed in, ♡ an artist's publisher feed (a search hit with ▸ ALBUMS), then open /favorites. NEW MUSIC shows that artist's newest album if it is less than 90 days old
  - [ ] Computer: open a NEW MUSIC row, and check that the album page opens
  - [ ] Computer: open a Wavlake album (for example Tinderbox by Nate Johnivan) and press ♡ ARTIST under the artist name. NEW MUSIC on Favorites then lists the artist under "Followed on this device", and the artist is not added to your favorites list

- [ ] Before merge: #580 DEMU search type and #583 /demu page. Merge #580 first, then change the base of #583 to `main`

- [ ] In development: #583 /demu is on beta through the beta-only branch `beta-demu-page` (#583 plus the five beta branches, conflicts resolved). When #583 changes, merge `feat/demu-page` into `beta-demu-page` and run `npm run beta -- rebuild`. Delete the branch and drop it from beta when #583 merges

- [ ] In development: #583 check which v4vmusic.com tags mark spam (it already hides feeds like The Board Game Design Lab), so /demu can use those tags to hide feeds as well as its own hide list in `lib/demu-hide-list.ts`

- [ ] Before merge: Phone pass on beta
  - [ ] Phone: #585 in Chrome on Android, open the fullscreen player from /favorites, then use the Android back gesture. The first back closes the player and stays on /favorites, and each later back goes to the page before. The browser test cannot copy a real Android back, which can skip entries that a page added without a tap. #585 is on beta since 2026-11-17, without #584: test it on beta.boostmebitch.com

- [ ] Before merge: #584 the boost screen stays on its track when the track changes. #584 is not on beta: test on the Vercel preview of the PR
  - [ ] Computer: with a real NWC wallet, boost a song of a musicL playlist from the player when about 5 s are left. The boost screen stays on that song and shows ✓ or ✗ for each split until you close it. The browser test used a stub wallet, so no sats moved

- [ ] Before merge: #540 the boost note for a song from a playlist, now in the shared wording (#588) with the stamp (#590). It is on beta
  - [ ] Phone: on beta, boost a song of a community playlist with "My feed". The note reads "… boosted N sats to <song> by <artist> from <playlist> via BoostMeBuddy", then "🎧 Heard on <playlist> by <maker>" and the playlist link. It says BoostMeBuddy because beta's playlists are on the Buddy feed origin (decision 17), while the payment still says BoostMeBitch
  - [ ] Phone: decide if the "Heard on" line stays. The sentence names the playlist too now, so the line says it twice. The line also gives the maker and the link

- [ ] After merge: #590 the note stamp in production
  - [ ] Computer: signed in with a Spark wallet, send one Anonymous boost. The note shows the site's name, and no line says "Posted from a one-time key … could not confirm". Spark was not tested
  - [ ] Computer: when you have the Lightning address for the stamps only, put it in `SITE_STAMP_LNADDRESS` on both Vercel projects (Production and Preview), then redeploy both. It is your main Alby address for now (2026-11-17). The new address must have the LUD-21 `verify` link on its own domain

- [ ] In development: Phone: on iOS, the music does not continue after an interruption (dictation, a call, a Bluetooth speaker turned off) until BMB is in front again. The lock-screen ▶ then goes to Apple Music. Seen on beta, 2026-11-15, with a community playlist and with dictation in another app. An iOS limit for web apps: iOS stops the JavaScript of a background page that plays nothing, so no web code can answer the lock screen. Only a native wrapper can fix it fully. A possible partial try: `navigator.audioSession` `statechange`, for an interruption that ends while the page still runs

## Already works

- #591 the old test address is gone everywhere (2026-11-17): production on both brands answers 404, and the DNS record `pay` of boostmebitch.com is deleted (Namecheap's own name servers give no answer since about 16:45 EST)
- #590 stamp, real signed-out 1000-sat boost on both sites (2026-11-17, computer): each note is signed by its own site key, ends "via BoostMeBitch" or "via BoostMeBuddy", and quotes the site's 1000-sat receipt; both sites refuse a note with no stamp (402)
- #540, #572, #573, #574 and #576 merge main again (#588 wording, #590 stamp), and beta is rebuilt with its 7 branches (2026-11-17): beta answers 404 for `/.well-known/lnurlp/chadf` and asks a note stamp (402). #573's RSS tile copies the playlist's feed URL (computer, phone size).
- #583 cover overlay (2026-11-17, iPhone, beta): no cover shows a ▶ or a round badge; a tap plays the album and shows ❚❚ on a dark layer with a yellow border; a second tap shows ▶ and keeps the border; a tap on another cover returns the first to plain art.
- #580 and #583 (2026-11-16, computer, preview): /demu loads with week headings and a date on each row; the DEMU search for Longy shows 14 albums, none from Wavlake, and "browse all DeMu →" opens /demu with Longy in the box. (iPhone, beta): a press on a cover plays the album, and a press on the rest of the row opens it.
- #538 and #540 (community playlists) merge with main again and are on beta.boostmebitch.com (2026-11-16). #540's boost modals keep main's signer check and RETRY NOTE plus the note's brand and sender name: `e2e:boostnote` 47/47 with a stub signer and wallet.
- The stack #538, clever-clarke, #574 and #576 merges main's #578 (`PlaylistDraft.ownerName`): #538 builds again with #576's own name lines, without the MADE BY box (2026-11-16).
- #567 GIF picker (2026-11-14, iPhone, Safari, beta): the GIFs play after Play anyway (Reduce Motion is on); ten searches in a row with scrolling, no freeze; the lock-screen ⏮/⏭ stay with the picker open over a playing track; search and scroll feel faster.
- #567 GIPHY grid on the boostmebuddy preview plays (2026-11-14).
- #564 and #567 are merged and live (2026-11-14).
