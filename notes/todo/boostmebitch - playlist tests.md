# Boost Me Bitch - Playlist Tests

Community playlists, beta test list. Written 2026-11-14.

- Test on: https://beta.boostmebitch.com
- [#538 Community playlists 2/4: make, list, edit and favorite](https://github.com/ChadFarrow/boostmebitch/pull/538) (the admin page, #539, is inside it)
- [#540 Community playlists 4/4: boost notes name the playlist (Heard on)](https://github.com/ChadFarrow/boostmebitch/pull/540)
- Merge #538 first. Then #540 targets `main`.
- Test playlist: "BMB test playlist", 10 songs. Feed: https://www.boostmebuddy.com/feeds/playlists/ed79e282-3d6e-4764-adb5-8702eaf77086.xml

> [!warning] Beta is real
> Beta uses the real relays, your real npub and real sats. A heart on beta changes your real favorites list (kind:10333). A boost on beta pays real sats and publishes a public note.

## Before merge: Phone: 1. The playlist maker (#538), on a real phone
- [ ] Tap `+ MAKE PLAYLIST` on Home
- [ ] Add songs from SEARCH (an album, then single songs)
- [ ] Add songs from FAVORITES
- [ ] Preview a song in the maker, then start a shuffle and Up Next. Both must still play
- [ ] Move songs with ↑ ↓, and remove one with ×
- [ ] Try to publish 9 songs. The site must refuse and give the reason
- [ ] Paste an `nsec` into the title. The site must show a refusal
- [ ] Publish with Amber on Android. Amber can come back in a new tab, and the draft must stay
- [ ] Reload the page while you build a playlist. The draft must come back
- [ ] Set an art link: a square PNG or JPEG, 1400–3000 px. The cover must show that art
- [ ] Set a small or non-square art link. The site must refuse it
- [ ] Open one playlist in EDIT on two devices. Save on the first, then on the second. The second must say "changed elsewhere"
- [ ] Tap SHARE and the copy buttons. The link must reach the clipboard
- [ ] Delete a test playlist. Its feed must then answer 410

## Before merge: 2. The list and the hearts (#538)
- [ ] `/playlists` shows community playlists first, newest first
- [ ] EDIT shows only on your own playlists
- [ ] Heart a playlist, and heart one song in it
- [ ] Open your favorites in OnlyBoosts. The song must show under its own album, not under the playlist

## Before merge: 3. The admin page (#539, inside #538)
- [ ] Open `/admin` with your account. You see every playlist, newest first
- [ ] DELETE asks first
- [ ] BAN MAKER asks first (BAN AND DELETE ALL / BAN ONLY / CANCEL)
- [ ] UNBAN does not ask (your decision, 2026-11-14)
- [ ] Make a throwaway key with two playlists. Test BAN ONLY: both playlists stay
- [ ] Test BAN AND DELETE ALL on the throwaway key: both playlists go, and its next publish is refused
- [ ] UNBAN the throwaway key: it can publish again
- [ ] Do not ban a real listener
- [ ] Open `/admin` with a second account. It must say "This account is not an admin."

## Before merge: 4. Boost notes (#540), with a real wallet
- [ ] Play a song from "BMB test playlist" and boost it as yourself. The note must:
	- [ ] name the song's own album as the show
	- [ ] have the `🎧 Heard on <playlist> by <maker>` line
	- [ ] have the playlist link
	- [ ] tag the maker
- [ ] Boost the same song as Anonymous. Buddy's site key must sign the note, in Buddy's words
- [ ] Boost a song from one of your ChadF playlists. The note must have the Heard-on line in BoostMeBitch words
- [ ] Look at Helipad on the receiving side. The boostagram must not change: `app_name` BoostMeBitch, and the song's `remote_item_guid`
- [ ] Open the note in Fountain. Fountain must show the quoted receipt

## Before merge: 5. A podcast app
- [ ] Subscribe to the test playlist's feed address in a podcast app (for example Fountain). The app must list the 10 songs and play them

## Already works (checked on the live sites, 2026-11-14)
- [x] Publish through Vercel (NIP-98): the test playlist exists
- [x] The feed on boostmebuddy.com: 200, `musicL`, the `<generator>` line, 10 songs, no `podcast:value`
- [x] Beta and www.boostmebitch.com send the feed address to Buddy (301)
- [x] The cover with no art link (a grid of 4 song covers): 200
- [x] Buddy lets beta and www call `site-sign` and `zap-receipt-sign` (CORS)
- [x] Robot tests: `e2e:communityui` 202/202, `e2e:communitynote` 84/84 and 36/36, `e2e:communityapi` 96/96

## Before merge: Fix before #540 merges
- [ ] Two docs say a beta playlist keeps BoostMeBitch words: `docs/ops.md` ("The beta site") and the `noteBrandFor` paragraph in `docs/nostr.md`. Since #542, the feed origin on beta is boostmebuddy.com, so a beta playlist boost uses Buddy's words and Buddy's key. Correct the two paragraphs.

## In development: Before launch (not a beta test)
- [ ] Find which method (GET or POST) Podcast Index `add/byfeedurl` uses, and confirm that the key can add feeds
- [ ] BAN AND DELETE ALL sends no Podcast Index notification. Fix this before `COMMUNITY_PI_NOTIFY=on`
