- [ ] After merge: #579 NEW MUSIC on /favorites (new albums from favorited artists). It is live on both production sites (merged 2026-11-19 with no test by you)
  - [ ] Computer: signed in, ♡ an artist's publisher feed (a search hit with ▸ ALBUMS), then open /favorites. NEW MUSIC shows that artist's newest album if it is less than 90 days old
  - [ ] Computer: open a NEW MUSIC row, and check that the album page opens
  - [ ] Computer: open a Wavlake album (for example Tinderbox by Nate Johnivan) and press ♡ ARTIST under the artist name. NEW MUSIC on Favorites then lists the artist under "Followed on this device", and the artist is not added to your favorites list

- [ ] In development: #583 check which v4vmusic.com tags mark spam (it already hides feeds like The Board Game Design Lab), so /demu can use those tags to hide feeds as well as its own hide list in `lib/demu-hide-list.ts`



- [ ] After merge: #610 the turkey from 1 Nov through Thanksgiving Day, then the Santa hat from Black Friday through 26 Dec. The turkey is live on both production sites (merged 2026-11-19)
  - [ ] Computer: on Fri 27 Nov, open /demu with no ?holiday=. The emu wears the Santa hat. A faked clock tested this; the real date was not

- [ ] After merge: #611 the emu in the /demu title wears a look every day of the year: the nine new looks you picked, New Year's through Halloween. It is live on both production sites (merged 2026-11-19)
  - [ ] Phone: on the iPhone, open https://boostmebitch.com/demu?holiday=newyear, then change the end to valentines, stpatricks, easter, pizzaday, july4, summer, podcastday and halloween. Each look shows, and the word DeMu does not move. Chrome and phone emulation were tested; iOS Safari was not

- [ ] After merge: #540 the boost note for a song from a playlist, now in the shared wording (#588) with the stamp (#590). It shipped to main in #633 (2026-11-20). The playlists show on beta only, so test on beta
  - [ ] Computer: decide the words of a note for a playlist song. Now it is the shared wording (#588): "… to <song> by <artist> from <playlist> via <app>", and the links name the song's own album. Tell Claude: keep it, or give the words you want
  - [ ] Computer: decide the app name in a note for a playlist song. On beta the note says "via BoostMeBuddy", because the playlist feeds are on boostmebuddy.com, while the payment says BoostMeBitch. Tell Claude: keep it, or name BoostMeBitch as the payment does
  - [ ] Phone: decide if the "Heard on" line stays. The sentence names the playlist too now, so the line says it twice. The line also gives the maker. Its playlist link was removed on 2026-11-19
  - [ ] Phone: on beta, boost one song of a playlist with "My feed". The note shows a blank line before "🎧 Heard on …", no playlist link under it, and no podcastindex.org link (#608 is on beta too). Tell Claude how the note looks in your Nostr app
  - [ ] Computer: decide who signs an Anonymous note for a song on a Buddy playlist. Now Buddy's site takes the stamp and signs the note, and a one-time key posts it when Buddy's site does not answer. Tell Claude: keep it, or let the site you boosted on sign it
  - [ ] Computer: decide if a note may quote a receipt from this site's own server with no check of its key. Now it may; only a receipt from the other brand's site must have that brand's key. Tell Claude: keep it, or check this site's key too (Claude then changes the stamp test, which uses a test key)

- [ ] Before merge: #608 a boost note has one listen link: no Podcast Index page beside the Boost Me link. It changes every new boost note. It is on beta since 2026-11-19, and the #540 phone test above tests it too

- [ ] After merge: #617 back button: origin links step back, modals are history entries, tab keys. It is live on both production sites (merged 2026-11-19)
  - [ ] Phone: Android app: open BOOST on a show, then press back. The modal closes and the show stays. Emulation cannot press the system back.
  - [ ] Computer: in Chrome, click the Boosts tab on an episode, then press ⌘← (Alt+← on Windows). The page goes back.

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

- [ ] After merge: #605 each publish copies the feed to GitHub and sends it to Podcast Index, test playlists too. It shipped to main in #633 (2026-11-20), and it is on beta
  - [ ] Computer: check that the Podcast Index key that beta uses (`PODCAST_INDEX_KEY`) has write permission. Without it, Podcast Index refuses each playlist
  - [ ] Computer: optional: make `GITHUB_ARCHIVE_TOKEN` (docs/ops.md, "The GitHub copy of the playlists") and add it in Vercel to the `boostmebitch` Preview environment, branch `beta`. Without it, a copy can take 15 minutes
  - [ ] Computer: add `COMMUNITY_PI_NOTIFY=on` in Vercel to the `boostmebitch` Preview environment, branch `beta`, then redeploy beta. Nothing goes to Podcast Index yet
  - [ ] Computer: on beta, open the playlist that goes to Podcast Index first and press SAVE. The `[community-pi]` line in the Vercel log of that request says "added", or "refused: 401" when the key has no write permission. Podcast Index keeps the playlist for good

- [ ] After merge: #622 each time a playlist goes to Podcast Index (publish, SAVE, delete), the site also sends a podping (medium musicL) through your msp-podping-service. It shipped to main in #633 (2026-11-20), and it is on beta. Nothing is sent until you add the two values
  - [ ] Computer: in Vercel, add `PODPING_ENDPOINT_URL` and `PODPING_BEARER_TOKEN` to the `boostmebitch` Preview environment, branch `beta`: the values `musicL-playlist-updater` uses (the token is the Railway `PODPING_SHARED_SECRET`; mark it sensitive and type it into Vercel yourself). `COMMUNITY_PI_NOTIFY=on` must be set there too. Then redeploy beta
  - [ ] Computer: this test sends a real podping. It is public and permanent, and with `COMMUNITY_PI_NOTIFY=on` a Podcast Index notice goes out too. Do it only when you want that (#625 shipped in #633, so the feed read after the SAVE is the new one). On beta, press SAVE on a test playlist. The `[community-podping]` line in the Vercel log of that request says "enqueued" (or "duplicate"). "pusher answered 401" means the token is wrong. Tell Claude what the line says

- [ ] After merge: #624 the GitHub copy keeps a playlist that is removed from the site. Its last copy moves to `playlists/removed/`, and `playlists/index.json` lists it under `removed` with the date. Merged 2026-11-20. The DELETE button on beta's /admin was already there (each playlist row, beside BAN MAKER)
  - [ ] Computer: after the merge, on beta's /admin, delete a test playlist that is already on the `playlists` branch (not "test"). Then on GitHub open Actions, "Playlist archive", and press Run workflow. When the run is green, the `playlists` branch has the playlist in `playlists/removed/`, and `index.json` lists it under `removed`. Tell Claude what you see

- [ ] After merge: #613 Amber's clipboard answers (NIP-55: Amber on the same phone, not a bunker link). The review fixed two faults in it on 2026-11-19: a repeat of one request waited 60 s, and a seed on the clipboard could answer an encrypt after a reload. It is live on both production sites (merged 2026-11-19 with no test by you)
  - [ ] Phone: on the Pixel 6 BMB app, signed in with Amber on the same phone, with no Spark wallet connected and a Spark backup on Nostr. Caution: Amber's approval screen shows your OLD seed when you press CREATE NEW (main does this too). Press CREATE NEW, approve in Amber, then press Cancel on "Overwrite your Spark wallet backup?". Then press RESTORE FROM NOSTR and approve. The wallet comes back in a few seconds, not after 60 s. Emulation cannot run Amber. About 10 min, no sats
  - [ ] Phone: in the same session, with NWC connected, press ↻ Back up again and approve in Amber. The page says the backup is saved. This is the encrypt check: the browser test used real ciphertexts, but no Amber

- [ ] After merge: #616 the boost screen keeps the wallet you pick when another wallet sends an event. It is live on both production sites (merged 2026-11-19 with no test by you)
  - [ ] Computer: in Chrome with the Alby extension and your NWC wallet both connected, open BOOST on a show with several splits, pick WebLN, and send 100 sats. The Alby extension pays every split, and no split shows in the NWC wallet. A stub wallet tested this; on main the screen went back to NWC after the first payment. About 5 min, 100 sats

- [ ] In development: check the Goal draft and answer the questions under "To plan" in the boostmebitch roadmap (`roadmaps/boostmebitch.md`, in the `roadmaps` folder of the vault). Write the answers in the roadmap, or tell Claude

## Already works

- The playlist stack shipped in #633 (2026-11-20): its nine PRs (#538, #540, #572, #573, #574, #576, #607, #622, #625) are closed and their branches deleted, beta is rebuilt as main plus #608 (0ace72d), and #575 is closed. On beta, /playlists shows both test playlists with ChadF under each title, and your npub page lists both (headless Chrome)
- #625 (2026-11-20): both test feeds on www.boostmebuddy.com answer `cache-control: no-cache` and `x-vercel-cache: MISS` on two reads in a row (curl). The feed the old line named (d59b546e) is deleted and answers 410
- `home-playlists-section` is deleted on GitHub and on the Mac mini (2026-11-20, as you approved on 2026-11-17): its one commit, dd59dcd, is in #633
- #630 (2026-11-20, computer, beta): a deleted test playlist is not in the ♫ BROWSE PLAYLISTS list. Chad: "that playlist is gone"
- #632 and #631 (2026-11-20, phone): an old boost note's link to an album passed Chad's test. Chad: "the links are fixed"
- #540 merges main (#628, #630, #631), and beta is rebuilt with its 8 branches (2026-11-20, beta 257781b; #630 left the list as merged). The conflicts were #631's `showShareUrl` lines; a receipt's own-brand hints stay `?podcast=`. `e2e:communitynote` 41/41 (test origin) and 90/90 (Buddy), `e2e:notewording` 38/38, the beta tree's typecheck and 57 checks. On beta, an old `?podcast=` link to It's A Mood opens it and the bar says `?playlist=`
- #617 merged 2026-11-19 (86378af): `e2e:history` passes 159/159 against both production sites, so the origin links, the modal entries and the tab keys are live. The branch and its worktree are deleted
- #540 on beta (2026-11-19, phone, "My feed"): the note reads "… boosted 100 sats to Dusty Old Man by $2 Holla from Test playlist from my phone. via BoostMeBuddy", then "🎧 Heard on … by" the maker and the playlist link; its links name the song's own album. It quotes a summary receipt that Buddy's site key signed from your signed request: 99 of 100 sats settled (the 1-sat leg to ThunderRoad's node did not; StevenB 4 and Malachi 95 did)
- Beta rebuilt with 7 branches (2026-11-19, beta e623bc7): main (#579, #584, #606) is merged into #538, then carried #572 → #574 → #576; #540's Heard-on line is now one line with no playlist link; #608 is added. Each step passed typecheck, the checks and the build; `e2e:communitynote` 90/90 and 40/40, `e2e:notewording` 44/44
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

- [ ] After merge: #623 make, edit and delete a playlist with no Nostr account. The maker first asks "Do you have Nostr?": SIGN IN WITH NOSTR first, then I DON'T HAVE NOSTR under "No Nostr account?" (the browser then makes a key and keeps it). Only that press makes a key. It shipped to main in #633 (2026-11-20), but the maker shows on beta only until `NEXT_PUBLIC_COMMUNITY_PLAYLISTS` is on for Production, so test on beta. Only headless Chrome tested it. Your own browser on beta already has a key, so it does not show you the pop-up: use a private window or another browser
  - [ ] Phone: on beta in iPhone Safari, signed out, tap + MAKE PLAYLIST. The pop-up shows, below the notch, and the × closes it. Open the maker again and tap I DON'T HAVE NOSTR. The pop-up closes. Make a playlist and press PUBLISH. The page says you can edit it again in this browser. Close Safari, then open the PLAYLISTS page. EDIT shows on that playlist, SAVE works, and the pop-up does not show again. Tell Claude what iOS does
  - [ ] Phone: on beta in a private iPhone Safari tab, open the maker, close the pop-up with the ×, then tap UPLOAD PICTURE. The pop-up shows again. Tap I DON'T HAVE NOSTR. The photo picker opens. Chrome allows this, and Safari can block a picker that opens after a pop-up
  - [ ] Phone: on beta on the Pixel 6, signed out (a private tab, or a browser with no key), open the maker and tap SIGN IN WITH NOSTR. The sign-in shows over the pop-up. Sign in with Amber. When you come back, the pop-up is gone and the footer names your account. Tell Claude if the pop-up or the sign-in closes by itself
  - [ ] Phone: do the same in the iPhone Home Screen app. Safari deletes site data after 7 days of Safari use without a tap on the site. WebKit says a Home Screen app is counted apart, and no test showed it
  - [ ] Computer: in Firefox, signed out, open the maker and press I DON'T HAVE NOSTR in the pop-up. Make a playlist, PUBLISH, reload, then SAVE. Firefox was not tested

- [ ] After merge: #641 sign-in links pair over offchain.pub and relay.powr.build; the old relay.nostrconnect.com refused most connections. It is live on both production sites (merged 2026-11-20)
  - [ ] Phone: in the iOS app, sign in with Clave on a weak cell signal. It signs in after you approve. The browser test used a stand-in signer; emulation cannot run Clave

- [ ] After merge: #639 "Paste your nsec" in the iOS app only. It is live (merged 2026-11-20)
  - [ ] Phone: in the iOS app, sign out, then sign in with "Paste your nsec" and a burner nsec. A like or a boost note signs at once, with no signer request. Then sign out: the warning names the nsec. Emulation cannot run the iOS app

- [ ] After merge: #640 the iOS app's wallet button opens the NWC form with no picker. It is live (merged 2026-11-20)
  - [ ] Phone: in the iOS app, with no wallet connected, press the wallet button. The NWC form opens, with no picker and no Back button. A Capacitor stub tested it in Chrome, not the real app

- [ ] In development: #629 the iOS app. It stays a draft. It loads the live site, so a merge reaches it at the next fresh start. Xcode stays on the NAS until more native work is queued (docs/ios.md on the #629 branch, "Waiting for the next Xcode build")
  - [ ] Phone: in the iOS app, send a small boost signed with your own key (Clave or the pasted nsec), not the site's key
  - [ ] Phone: in the iOS app, play an episode for 2 minutes, close the app fully, open it again and press ▶. It starts at the saved place. #636 passed in Safari only
  - [ ] Phone: in the iOS app, turn on streaming sats with a small budget, play, and lock the phone for 30 minutes. The wallet history shows payments in that time. If not, tell Claude: the native player may be needed after all
  - [ ] Phone: watch the lock screen after a pause. Castamatic on an iPhone 17 also lost its card, so this is iOS. Tell Claude if the Control Center ▶ ever fails too
