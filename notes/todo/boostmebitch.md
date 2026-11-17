- [ ] In development: Decisions from the triage of all open PRs on 2026-11-17 (agent boostmebitch-3). Tell Claude each answer
  - [ ] After your real-wallet test of #584 (below): merge #584 first, and then an agent fixes the one line of `components/player.tsx` in #585? The two conflict in that line, and the fix is tested
  - [ ] Branch `claude/value-msat-total-spec`: the typed amount on every leg (bLIP-10), or the current amount for each group of legs (#403)?

- [ ] After merge: #538. Tell Claude to delete the branch `home-playlists-section` (you approved it on 2026-11-17). Its only commit is in #538

- [ ] Before merge: #592 search finds a misspelled name (the branch `claude/elegant-fermi-2n35nu`, now up to date with #587). Its tests pass in a real browser, and it needs no test from you

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
  - [ ] Computer: on boostmebitch.com and on boostmebuddy.com, send one real signed-out boost of 1000 sats. The status shows "Paying the 10-sat stamp (1%)…", 10 sats more leave the wallet, and the note shows the site's name. The browser test used a fake Lightning address, so no real stamp was paid
  - [ ] Computer: signed in with a Spark wallet, send one Anonymous boost. The note shows the site's name, and no line says "Posted from a one-time key … could not confirm". Spark was not tested
  - [ ] Computer: when you have the Lightning address for the stamps only, put it in `SITE_STAMP_LNADDRESS` on both Vercel projects (Production and Preview), then redeploy both. It is your main Alby address for now (2026-11-17). The new address must have the LUD-21 `verify` link on its own domain

- [ ] After merge: #591 the old test address is gone everywhere. Production on both brands answers 404 (2026-11-17)
  - [ ] Computer: at Namecheap, delete the DNS record `pay` of boostmebitch.com (the old LNbits subdomain). Nothing answers on that name now (TLS "unrecognized name", 2026-11-17), and the Start9 node announces its IP, not that name

- [ ] In development: Phone: on iOS, the music does not continue after an interruption (dictation, a call, a Bluetooth speaker turned off) until BMB is in front again. The lock-screen ▶ then goes to Apple Music. Seen on beta, 2026-11-15, with a community playlist and with dictation in another app. An iOS limit for web apps: iOS stops the JavaScript of a background page that plays nothing, so no web code can answer the lock screen. Only a native wrapper can fix it fully. A possible partial try: `navigator.audioSession` `statechange`, for an interruption that ends while the page still runs

## Already works

- #540, #572, #573, #574 and #576 merge main again (#588 wording, #590 stamp), and beta is rebuilt with its 7 branches (2026-11-17): beta answers 404 for `/.well-known/lnurlp/chadf` and asks a note stamp (402). #573's RSS tile copies the playlist's feed URL (computer, phone size).
- #583 cover overlay (2026-11-17, iPhone, beta): no cover shows a ▶ or a round badge; a tap plays the album and shows ❚❚ on a dark layer with a yellow border; a second tap shows ▶ and keeps the border; a tap on another cover returns the first to plain art.
- #580 and #583 (2026-11-16, computer, preview): /demu loads with week headings and a date on each row; the DEMU search for Longy shows 14 albums, none from Wavlake, and "browse all DeMu →" opens /demu with Longy in the box. (iPhone, beta): a press on a cover plays the album, and a press on the rest of the row opens it.
- #538 and #540 (community playlists) merge with main again and are on beta.boostmebitch.com (2026-11-16). #540's boost modals keep main's signer check and RETRY NOTE plus the note's brand and sender name: `e2e:boostnote` 47/47 with a stub signer and wallet.
- The stack #538, clever-clarke, #574 and #576 merges main's #578 (`PlaylistDraft.ownerName`): #538 builds again with #576's own name lines, without the MADE BY box (2026-11-16).
- #567 GIF picker (2026-11-14, iPhone, Safari, beta): the GIFs play after Play anyway (Reduce Motion is on); ten searches in a row with scrolling, no freeze; the lock-screen ⏮/⏭ stay with the picker open over a playing track; search and scroll feel faster.
- #567 GIPHY grid on the boostmebuddy preview plays (2026-11-14).
- #564 and #567 are merged and live (2026-11-14).
