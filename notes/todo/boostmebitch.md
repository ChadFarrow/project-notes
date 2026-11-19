- [ ] After merge: #538. Tell Claude to delete the branch `home-playlists-section` (you approved it on 2026-11-17). Its only commit is in #538

- [ ] After merge: #579 NEW MUSIC on /favorites (new albums from favorited artists). It is live on both production sites (merged 2026-11-19 with no test by you)
  - [ ] Computer: signed in, ♡ an artist's publisher feed (a search hit with ▸ ALBUMS), then open /favorites. NEW MUSIC shows that artist's newest album if it is less than 90 days old
  - [ ] Computer: open a NEW MUSIC row, and check that the album page opens
  - [ ] Computer: open a Wavlake album (for example Tinderbox by Nate Johnivan) and press ♡ ARTIST under the artist name. NEW MUSIC on Favorites then lists the artist under "Followed on this device", and the artist is not added to your favorites list

- [ ] In development: #583 check which v4vmusic.com tags mark spam (it already hides feeds like The Board Game Design Lab), so /demu can use those tags to hide feeds as well as its own hide list in `lib/demu-hide-list.ts`

- [ ] After merge: #584 the boost screen stays on its track when the track changes. It is live on both production sites (merged 2026-11-19 with no test by you)
  - [ ] Computer: with a real NWC wallet, boost a song of a musicL playlist from the player when about 5 s are left. The boost screen stays on that song and shows ✓ or ✗ for each split until you close it. The browser test used a stub wallet, so no sats moved

- [ ] Before merge: #540 the boost note for a song from a playlist, now in the shared wording (#588) with the stamp (#590). It is on beta
  - [ ] Computer: decide the words of a note for a playlist song. Now it is the shared wording (#588): "… to <song> by <artist> from <playlist> via <app>", and the links name the song's own album. Tell Claude: keep it, or give the words you want
  - [ ] Computer: decide the app name in a note for a playlist song. On beta the note says "via BoostMeBuddy", because the playlist feeds are on boostmebuddy.com, while the payment says BoostMeBitch. Tell Claude: keep it, or name BoostMeBitch as the payment does
  - [ ] Phone: decide if the "Heard on" line stays. The sentence names the playlist too now, so the line says it twice. The line also gives the maker and the link
  - [ ] Computer: decide who signs an Anonymous note for a song on a Buddy playlist. Now Buddy's site takes the stamp and signs the note, and a one-time key posts it when Buddy's site does not answer. Tell Claude: keep it, or let the site you boosted on sign it
  - [ ] Computer: decide if a note may quote a receipt from this site's own server with no check of its key. Now it may; only a receipt from the other brand's site must have that brand's key. Tell Claude: keep it, or check this site's key too (Claude then changes the stamp test, which uses a test key)

- [ ] After merge: #590 the note stamp in production
  - [ ] Computer: signed in with a Spark wallet, send one Anonymous boost. The note shows the site's name, and no line says "Posted from a one-time key … could not confirm". Spark was not tested
  - [ ] Computer: when you have the Lightning address for the stamps only, put it in `SITE_STAMP_LNADDRESS` on both Vercel projects (Production and Preview), then redeploy both. It is your main Alby address for now (2026-11-17). The new address must have the LUD-21 `verify` link on its own domain

- [ ] After merge: #599 a slow split no longer holds the boost, a ? split is checked with your wallet and has RETRY, and STOP WAITING skips a silent signer's note. It is live on both production sites (merged 2026-11-18)
  - [ ] Computer: with your Alby Hub NWC connection, the next time a split shows ?, read the line under it. It says what your wallet answered: ✓ when paid, RETRY when failed, or "Look in your wallet's history". The browser test used a stub wallet, so it is not known if Alby Hub finds a keysend by the app's payment hash
  - [ ] Phone: on the iPhone Home Screen app with NWC, send a boost and go to another app at once. Come back after one minute. The panel is still open, the other splits are paid, and each ? split is checked. iOS was not tested
  - [ ] Phone: with Clave or Amber, send a boost and do not approve the note. After 10 s STOP WAITING shows. Press it, then RETRY NOTE, and approve. One note posts. The browser test used a stand-in signer

- [ ] In development: Phone: on iOS, the music does not continue after an interruption (dictation, a call, a Bluetooth speaker turned off) until BMB is in front again. The lock-screen ▶ then goes to Apple Music. Seen on beta, 2026-11-15, with a community playlist and with dictation in another app. An iOS limit for web apps: iOS stops the JavaScript of a background page that plays nothing, so no web code can answer the lock screen. Only a native wrapper can fix it fully. A possible partial try: `navigator.audioSession` `statechange`, for an interruption that ends while the page still runs

- [ ] After merge: #604 the copy job must also run by itself every 15 minutes. GitHub started no run from the schedule in the 73 minutes after the merge (2026-11-19). A run by hand worked
  - [ ] Computer: on GitHub, open Actions, then "Playlist archive". Runs with the event "schedule" show there. If none show by 2026-11-20, tell Claude

- [ ] After merge: #605 each publish copies the feed to GitHub and sends it to Podcast Index, test playlists too. It is in the #576 branch, and it is on beta since 2026-11-19
  - [ ] Computer: check that the Podcast Index key that beta uses (`PODCAST_INDEX_KEY`) has write permission. Without it, Podcast Index refuses each playlist
  - [ ] Computer: optional: make `GITHUB_ARCHIVE_TOKEN` (docs/ops.md, "The GitHub copy of the playlists") and add it in Vercel to the `boostmebitch` Preview environment, branch `beta`. Without it, a copy can take 15 minutes
  - [ ] Computer: add `COMMUNITY_PI_NOTIFY=on` in Vercel to the `boostmebitch` Preview environment, branch `beta`, then redeploy beta. Nothing goes to Podcast Index yet
  - [ ] Computer: on beta, open the playlist that goes to Podcast Index first and press SAVE. The `[community-pi]` line in the Vercel log of that request says "added", or "refused: 401" when the key has no write permission. Podcast Index keeps the playlist for good

## Already works

- #540 on beta (2026-11-19, phone, "My feed"): the note reads "… boosted 100 sats to Dusty Old Man by $2 Holla from Test playlist from my phone. via BoostMeBuddy", then "🎧 Heard on … by" the maker and the playlist link; its links name the song's own album. It quotes a summary receipt that Buddy's site key signed from your signed request: 99 of 100 sats settled (the 1-sat leg to ThunderRoad's node did not; StevenB 4 and Malachi 95 did)
- Beta rebuilt with 6 branches, without `beta-demu-page` (2026-11-19, beta feca7d8; the branch is deleted, its commits are in #580 and #583). #538 (main through #604) is merged into #572 and #540, #572 into #574, #574 into #576, and #540 moves three lines so it merges with #576. Checks and builds pass on each branch: `e2e:deadtrack` 63/63 on #572, `e2e:boostnote` 47/47 and `e2e:communitynote` 88/88 and 39/39 on #540
- #604 merged 2026-11-19 (7c5fa78): the copy job, run by hand, put both playlists and `index.json` on the branch `playlists` (9c81301). The copies are the same bytes as the live feeds, and Vercel made no deployment for that branch
- #592 merged 2026-11-17 (96b0cf9): your beta phone test passed, and on both production sites `muton` finds the Mutton, Mead & Music playlist and `homegrown hitz` finds the ChadF Homegrown Hits playlist
- #585 merged 2026-11-17 (bacfe81): on the Pixel 6 over adb (Vanadium, Chromium 157, 5 runs, the back key and the edge swipe), the first back closes the full-screen player and stays on /favorites, and each later back goes to the page before. `e2e:history` passes on both production sites (94 checks). Not tested on the phone: /live/<npub> and /stream/<naddr>
- #584 merges main with #585 (2026-11-17): the one `components/player.tsx` line keeps #585's `closePlayer` and #584's `openBoost`, and `e2e:boosttrack` (90 checks) and `e2e:history` (94 checks) pass on it
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
