# Boost Me Bitch - Playlist Tests

Community playlists, beta test list. Written 2026-11-14.

- Test on: https://beta.boostmebitch.com
- [#538 Community playlists 2/4: make, list, edit and favorite](https://github.com/ChadFarrow/boostmebitch/pull/538) (the admin page, #539, is inside it)
- [#540 Community playlists 4/4: boost notes name the playlist (Heard on)](https://github.com/ChadFarrow/boostmebitch/pull/540)
- Merge #538 first. Then #540 targets `main`.
- Test playlist: "BMB test playlist", 10 songs. Feed: https://www.boostmebuddy.com/feeds/playlists/ed79e282-3d6e-4764-adb5-8702eaf77086.xml

> [!warning] Beta is real
> Beta uses the real relays, your real npub and real sats. A heart on beta changes your real favorites list (kind:10333). A boost on beta pays real sats and publishes a public note.

## In development: #575 MADE BY on beta, in this order
Step 2 before step 1 breaks every community playlist read on beta and production. Step 1 is safe at any time. Branch `claude/dazzling-allen-hj91e4` passed typecheck, lint, all 51 `check:*` and `next build` on 2026-11-15.
- [ ] #575: the `owner_name` column, then beta (#576), then the two test playlists
	- [ ] Computer: in the Neon SQL Editor (the database in `COMMUNITY_DB_URL`), run `alter table community_playlists add column if not exists owner_name text;`. The check query in #575 must return `owner_name`
	- [ ] Computer: add the branch to beta (`npm run beta -- add claude/dazzling-allen-hj91e4`) and push `beta` with the command it prints. A Claude session can do this after step 1
	- [ ] Computer: open "BMB test playlist" and "Test playlist from my phone." in the maker, type your name in MADE BY, and press SAVE. Each feed must then carry `<itunes:author>` and `<pubDate>`, and `/playlists` must show the name

## Before merge: Phone: 1. The playlist maker (#538), on a real phone
- [ ] Publish with Amber on Android. Amber can come back in a new tab, and the draft must stay

## Before merge: Phone: 6. Playback (#538), on a real phone
Use "Test playlist from my phone." on beta. All 10 songs resolve, their audio hosts answer, and each has its own value block (checked 2026-11-15). Songs 6 and 7 (disco girl, Pimped to the Grave) are WAV files: large, so they can start slowly on mobile data.
- [ ] Shuffle the playlist. Every song plays once before any song plays again

## Before merge: 2. The list and the hearts (#538)
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
- [ ] Boost the same song as Anonymous. Buddy's site key must sign the note, in Buddy's words
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
- [x] Phone, beta (2026-11-15), the maker (#538): a whole album's songs added from SEARCH one after another; a preview in the maker, then a shuffle and Up Next, all play; ↑ ↓ move songs; 9 songs and an `nsec` in the title are refused with the reason; a reload brings the draft back
- [x] Phone, beta (2026-11-15), the maker art (#538): a square PNG or JPEG art link (1400–3000 px) shows on the cover; a link under 300 px or not PNG or JPEG is refused with the reason
- [x] Phone, beta (2026-11-15), the maker (#538): EDIT on two devices, the second save says "changed elsewhere"; SHARE and the copy buttons reach the clipboard; a deleted test playlist's feed answers 410
- [x] Phone, beta (2026-11-15), playback (#538): ⏮ and ⏭ in the app play the right song; ⏮ on the lock screen works, with the right song and art; a locked phone plays several songs with no stop; WAV songs 6 and 7 start on mobile data with no long buffer
- [x] Phone, beta (2026-11-15), playback (#538): a song hearted while it plays shows under its own album in favorites; the boost split preview names the song's own artists, not the maker
- [x] Beta (2026-11-15), the list (#538): `/playlists` shows community playlists first, newest first; EDIT shows only on your own playlists
- [x] Android and iPhone, beta (2026-11-15), #574: signed out, build a playlist, PUBLISH, then SIGN IN from the popup (Amber on Android, your iPhone signer): the playlist stays on the form, and PUBLISH publishes it
- [x] Beta (2026-11-15), boost notes (#540): a boost as yourself from "BMB test playlist" names the song's own album as the show, has the `🎧 Heard on <playlist> by <maker>` line and the playlist link, and tags the maker; a boost from a ChadF playlist has the Heard-on line in BoostMeBitch words

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
