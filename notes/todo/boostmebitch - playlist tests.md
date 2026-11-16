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
- [x] Add a whole album's songs from SEARCH, one after another
- [x] Preview a song in the maker, then start a shuffle and Up Next. Both must still play
- [ ] Move songs with ↑ ↓
- [ ] Try to publish 9 songs. The site must refuse and give the reason
- [ ] Paste an `nsec` into the title. The site must show a refusal
- [ ] Publish with Amber on Android. Amber can come back in a new tab, and the draft must stay
- [ ] Reload the page while you build a playlist. The draft must come back
- [ ] Set an art link: a square PNG or JPEG, 1400–3000 px. The cover must show that art
- [ ] Set an art link whose shortest side is under 300 px, or one that is not a PNG or JPEG. The site must refuse it and give the reason
- [ ] Open one playlist in EDIT on two devices. Save on the first, then on the second. The second must say "changed elsewhere"
- [ ] Tap SHARE and the copy buttons. The link must reach the clipboard
- [ ] Delete a test playlist. Its feed must then answer 410

## Before merge: Phone: 6. Playback (#538), on a real phone
Use "Test playlist from my phone." on beta. All 10 songs resolve, their audio hosts answer, and each has its own value block (checked 2026-11-15). Songs 6 and 7 (disco girl, Pimped to the Grave) are WAV files: large, so they can start slowly on mobile data.
- [ ] ⏮ and ⏭ in the app work, and the right song plays
- [ ] ⏮ on the lock screen works, and the lock screen shows the right song and art
- [ ] Shuffle the playlist. Every song plays once before any song plays again
- [ ] Lock the phone and let it play several songs. The music does not stop
- [ ] Play songs 6 and 7 (WAV) on mobile data. They start, and they do not stop to buffer for long
- [ ] Heart one song while it plays. In favorites, it shows under its own album, not under the playlist
- [ ] Boost one song. The split preview names the song's own artists, not you as the maker

## Before merge: 7. The PUBLISH popup and the signed-out maker (#574)
- [ ] #574: PUBLISH with something missing opens a list of the three things a playlist needs (Nostr sign-in, a title, 10 songs), each with its fix button. A visitor who is not signed in can now build a playlist, and the draft moves to the account at sign-in. The robot test passed 305/305 in Chrome with phone emulation, with a fake extension signer
	- [ ] Phone: on Android, signed out on beta, build a playlist with a title and 10 songs, press PUBLISH, then SIGN IN with Amber from the popup. When Amber comes back (maybe in a new tab), the playlist must still be on the form, and PUBLISH must publish it. Amber was not tested: the robot only reloaded into a signed-in session
	- [ ] Phone: on iPhone, the same with your iPhone signer. Only the extension sign-in was tested

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
- [x] iPhone, beta (2026-11-15): `+ MAKE PLAYLIST` on Home opens the maker
- [x] iPhone, beta (2026-11-15): add songs from FAVORITES
- [x] iPhone, beta (2026-11-15): a non-square art link (1206 x 1371) is accepted, the feed's `itunes:image` is your own link, and the cover is 1400 x 1400 from it ("Test playlist from my phone.")
- [x] iPhone, beta (2026-11-15): the first playlist made, published and edited from a phone
- [x] iPhone, beta (2026-11-15): ↑ UPLOAD PICTURE from the camera roll put the art on your own Blossom server (podtards.com, from your kind:10063), and SAVE took it. The GPS data was removed. Branch `claude/clever-clarke-82rdrg`, on beta
- [x] iPhone, beta (2026-11-15): "BMB test playlist" played songs 1 to 9 on its own, with no taps
- [x] iPhone, beta (2026-11-15): song 10 ("Mr. Videoman", its RSS Blue feed and file answer 410) is passed over: ⏭ showed disabled during song 9, and the playlist stopped at the end of song 9
- [x] iPhone, beta (2026-11-15): EDIT marks a song that died after it went in ("Mr. Videoman": "⚠ Track not found. Remove it with ×." and the count above the list); × removed it, + ADD from SEARCH added a new song, and SAVE took both
- [x] iPhone, beta (2026-11-15): the mini-player names a dead song in plain words: "Track not found."
- [x] iPhone, beta (2026-11-15): a second ↑ UPLOAD PICTURE went to podtards.com
- [x] iPhone, beta (2026-11-15): ⏭ on the lock screen moves to the next song of the playlist

## Before merge: Fix before #540 merges
- [ ] Two docs say a beta playlist keeps BoostMeBitch words: `docs/ops.md` ("The beta site") and the `noteBrandFor` paragraph in `docs/nostr.md`. Since #542, the feed origin on beta is boostmebuddy.com, so a beta playlist boost uses Buddy's words and Buddy's key. Correct the two paragraphs.

## In development: Before launch (not a beta test)
- [ ] Find which method (GET or POST) Podcast Index `add/byfeedurl` uses, and confirm that the key can add feeds
- [ ] BAN AND DELETE ALL sends no Podcast Index notification. Fix this before `COMMUNITY_PI_NOTIFY=on`

## In development: Feed template suggestions (review: add or not)
Compared on 2026-11-15 with a v4vmusic.com playlist ("New Music Nudge Unit") and the ChadF Homegrown Hits playlist. The song lines (`podcast:remoteItem` with `feedGuid`, `itemGuid`, `feedUrl`, `medium`) already match v4vmusic. Every BMB feed is built from one template (`buildPlaylistFeedXml` in `lib/community/feed-doc.ts`), so one change updates every playlist; set `FEED_TEMPLATE_UPDATED_AT` with it.
- [ ] `<itunes:category text="Music"/>`: v4vmusic has it. Always true for a `musicL` playlist
- [ ] `<pubDate>`: v4vmusic and HGH have it. v4vmusic writes the same value as `lastBuildDate`
- [ ] `<itunes:author>`: v4vmusic writes the curator's name. BMB stores only the maker's npub, so this needs the Nostr display name saved at publish and at save
- [ ] `<itunes:explicit>`: v4vmusic writes `false` on every playlist. That is a claim about the songs, and a listener's playlist can hold explicit songs. Suggestion: leave it out, unless the aim is to copy v4vmusic exactly
- [ ] `<link>`: v4vmusic points to the playlist's web page. BMB points to the feed's own XML address, because there is no page per playlist yet
- [ ] Namespace address: v4vmusic uses the older GitHub address, BMB and HGH use `https://podcastindex.org/namespace/1.0`. Both are valid. No change suggested
