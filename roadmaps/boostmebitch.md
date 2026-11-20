# boostmebitch roadmap

The long-term plan for [boostmebitch](https://github.com/ChadFarrow/boostmebitch): what is built now, and what builds on it later. Chad moves items between sections. The rules are in the `CLAUDE.md` of project-notes, under *Roadmaps*.

First draft: 2026-11-19, written by an agent from the repo's docs, its PRs and issues, and the To do notes. Chad has not checked it yet.

## Goal

> [!note] Draft: Chad decides
> Written from the README and the work of November 2026, not from Chad's words.

A year from now, boostmebitch.com and boostmebuddy.com are where a listener finds, plays and boosts Podcasting 2.0 music and shows over Lightning, with or without a Nostr account.

- Listeners make musicL playlists in the app, and each playlist is a real feed that any Podcasting 2.0 app and Podcast Index can use.
- A boost pays what the listener typed, or shows which split failed and lets the listener try it again.
- New music is easy to find: DeMu, new albums from favorited artists, and search.
- Favorites, follows and the listen queue work across apps through Nostr.

## Now

November 2026.

- Community playlists, the locked stack: on beta only, each PR has the `hold` label, and Chad releases each one. [Spec](https://github.com/ChadFarrow/boostmebitch/blob/main/docs/superpowers/specs/2026-11-12-community-playlists-design.md)
  - [#538](https://github.com/ChadFarrow/boostmebitch/pull/538) make, list, edit and favorite a playlist; the admin page ([#539](https://github.com/ChadFarrow/boostmebitch/pull/539)) is inside it
  - [#540](https://github.com/ChadFarrow/boostmebitch/pull/540) a boost note names the playlist the song was heard on
  - [#572](https://github.com/ChadFarrow/boostmebitch/pull/572) art upload to Blossom, dead-song checks, fallback covers and phone fixes
  - [#573](https://github.com/ChadFarrow/boostmebitch/pull/573) a copy-RSS button on a playlist
  - [#574](https://github.com/ChadFarrow/boostmebitch/pull/574) PUBLISH lists what is missing, and the maker works signed out
  - [#576](https://github.com/ChadFarrow/boostmebitch/pull/576) MADE BY name, pubDate, and SHUFFLE and REPEAT on a playlist; deploy steps in [#575](https://github.com/ChadFarrow/boostmebitch/issues/575)
  - [#605](https://github.com/ChadFarrow/boostmebitch/pull/605) after each publish, copy the feed to GitHub and send it to Podcast Index; merged into the #576 branch, so it ships with the stack
  - [#607](https://github.com/ChadFarrow/boostmebitch/pull/607) the npub page lists the playlists that the npub made; ships with the stack
- [#606](https://github.com/ChadFarrow/boostmebitch/pull/606) a glyph on every search type, and the words line up
- [#579](https://github.com/ChadFarrow/boostmebitch/pull/579) NEW MUSIC on /favorites: new albums from favorited artists; waits for Chad's test on the PR preview
- [#584](https://github.com/ChadFarrow/boostmebitch/pull/584) the boost screen stays on the track it was opened for (fixes [#551](https://github.com/ChadFarrow/boostmebitch/issues/551)); waits for Chad's test with a real NWC wallet

## Next

Builds on Now.

- Song-suggestion playlists: design accepted; no spec in `docs/` yet (see To plan)
- Community playlists in Podcast Index for real: turn on `COMMUNITY_PI_NOTIFY` in production after the stack ships; the Podcast Index key needs write permission ([#605](https://github.com/ChadFarrow/boostmebitch/pull/605))
- /demu hides spam feeds with the tags of v4vmusic.com, as well as its own hide list in `lib/demu-hide-list.ts` (after [#583](https://github.com/ChadFarrow/boostmebitch/pull/583))

## Later

- Sync the Up Next queue through Nostr, so another app (OnlyBoosts) can add to it ([#523](https://github.com/ChadFarrow/boostmebitch/issues/523))
- Sync ✓ PLAYED, and maybe resume positions, across devices through Nostr ([#471](https://github.com/ChadFarrow/boostmebitch/issues/471))
- The Libre wallet as an in-page rail (wallet-embed), experimental: "do not merge yet" ([#120](https://github.com/ChadFarrow/boostmebitch/pull/120))
- The Spark wallet in Firefox: flashnet's CORS answer does not cover `Authorization` ([#304](https://github.com/ChadFarrow/boostmebitch/issues/304))

## To plan

Questions for a design session with Chad.

- Goal: is the draft above right? What is boostmebitch for, a year from now?
- Song-suggestion playlists: where is the accepted design, and does the work start before or after the playlist stack leaves beta?
- The playlist stack: in what order do the locked PRs leave beta, and do the stack branches merge `main` now? (the open question in the To do note)
- Favorites with no medium: a song hearted from a playlist row, or from a track list whose feed has no medium, saves no medium, so it shows under MEDIUM UNKNOWN and SHUFFLE skips it. Show the album's medium from Podcast Index (display only, no list write)? Answer `fav-medium: fix` or `fav-medium: no`
- Add songs rows with no art: fall back to the album art? The code is on the locked playlist branches. Answer `fav-art: fix` or `fav-art: wait`
- iOS background play: the music does not continue after an interruption (a call, dictation) until BMB is in front again, and only a native wrapper fixes that fully. Make an iOS app, as there is an Android app ([#559](https://github.com/ChadFarrow/boostmebitch/pull/559))?
- The Libre wallet embed ([#120](https://github.com/ChadFarrow/boostmebitch/pull/120)): keep it as an experiment, plan it, or close it?
- Holiday logos, every year: a place on the site to design the emu's holiday looks and plan when each one changes (Chad, 2026-11-19: "there should be a part of the site set aside for designing and planning when these logos change, because I do want to have this be yearly"). Today the eleven looks and their dates are code in `lib/demu-holiday.ts` and `components/demu-costumes.tsx` ([#609](https://github.com/ChadFarrow/boostmebitch/pull/609), [#610](https://github.com/ChadFarrow/boostmebitch/pull/610), [#611](https://github.com/ChadFarrow/boostmebitch/pull/611)): each look leads up to its day and switches the day after, so the emu wears one every day. To plan with Chad: what "designing" on the site means, and who may change it
- IRC chat on RSS live streams, a future plan (Chad, 2026-11-19: "keep the Nostr chat on the Nostr stream and try to add an IRC chat … to the RSS-based streams"). Beside the player of a stream from a feed's `<podcast:liveItem>`, show that show's IRC chat. Nostr streams keep their Nostr chat. The shows Chad named: Homegrown Hits, Bowl After Bowl, Chad and Reeds, Behind the SchƎmƎs, Podcasting 2.0, Into The Doerfel-Verse, Lightning Thrashes, the v4vmusic Show and MMO. Facts, checked 2026-11-19:
  - A feed can name its chat: [`<podcast:chat>`](https://podcasting2.org/docs/podcast-namespace/tags/chat) (Phase 7, [spec](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/chat.md)) has `server`, `protocol` (`irc`, `xmpp`, `nostr`, `matrix`), `accountId` and `space`, on the channel, an item or a live item. boostmebitch does not read it yet.
  - The live item names an IRC channel on `irc.zeronode.net` in [Homegrown Hits](https://feed.homegrownhits.xyz/feed.xml) (`#HomegrownHits`), [Podcasting 2.0](https://feeds.podcastindex.org/pc20.xml) (`#Podcasting20`) and the [v4vmusic Show](https://cdn.kolomona.com/podcasts/v4vmusic/v4vmusic-rss.xml) (`SirLibre`, with no `#`). [Behind the SchƎmƎs](https://www.feed.behindthesch3m3s.com/feed.xml) (`#greenroom`) and [Lightning Thrashes](https://sirlibre.com/lightning-thrashes-rss.xml) (`SirLibre`) put a web page in `server`, not an IRC host. [Bowl After Bowl](https://feed.bowlafterbowl.com/feed.xml), [Chad and Reeds](https://serve.podhome.fm/rss/7c6f7875-2b73-491e-b32c-e2c8d6e91d53), [Into The Doerfel-Verse](https://www.doerfelverse.com/feeds/intothedoerfelverse.xml) and [MMO](https://mmo.show/wp-content/feed.xml) have no tag. So the feed alone gives the full answer for 3 of the 9 shows.
  - Kiwi IRC: no boostmebitch PR, issue or doc names it. The Homegrown Hits and Podcasting 2.0 live items still carry an `embedUrl` attribute (not in the spec) that opens kiwiirc.com.
  - Chad runs a public The Lounge webchat on ZeroNode for Chad and Reeds, [chat.candr.space](https://chat.candr.space/) (repo thelounge-candr). [candr.space](https://candr.space/) opens it in a new tab, not in a frame, because The Lounge is cramped on a phone. The Lounge takes the channel from the URL (`?join=`), also when its network is locked ([source](https://github.com/thelounge/thelounge/blob/master/client/components/Windows/Connect.vue)). In public mode a visitor's connection and scrollback end when the visitor leaves ([docs](https://thelounge.chat/docs/configuration)).
  - To plan with Chad: a read-only view of the channel (a bot on a server holds one IRC connection and passes the lines to the page), or a full client where the listener picks a nick and talks? A frame of a web client (chat.candr.space with `?join=`, or each show's own page), or a chat panel in BMB? What went wrong with Kiwi IRC, so the new way avoids it? When a feed has no tag, where does the channel come from: ask the show to add `<podcast:chat>` (Chad and Reeds is Chad's own feed), or a list in BMB?

## Done

Milestones, newest first. Older work is in the merged PRs.

- 2026-11-20 [#632](https://github.com/ChadFarrow/boostmebitch/pull/632) an album's link says `?album=<guid>`; old `?podcast=` links still open it
- 2026-11-20 [#630](https://github.com/ChadFarrow/boostmebitch/pull/630) a deleted community playlist leaves /playlists at once (the list is no longer cached), and [#631](https://github.com/ChadFarrow/boostmebitch/pull/631) a playlist's link says `?playlist=<guid>`, as its feed address does; old `?podcast=` links still open it
- 2026-11-19 [#618](https://github.com/ChadFarrow/boostmebitch/pull/618), [#619](https://github.com/ChadFarrow/boostmebitch/pull/619), [#620](https://github.com/ChadFarrow/boostmebitch/pull/620) and [#621](https://github.com/ChadFarrow/boostmebitch/pull/621) a shorter `CLAUDE.md` (15,099 to 12,209 words; the reasons moved to `docs/`), and `check:claudemd` now finds a check script or a doc that the file does not name
- 2026-11-19 [#612](https://github.com/ChadFarrow/boostmebitch/pull/612), [#613](https://github.com/ChadFarrow/boostmebitch/pull/613), [#614](https://github.com/ChadFarrow/boostmebitch/pull/614), [#615](https://github.com/ChadFarrow/boostmebitch/pull/615) and [#616](https://github.com/ChadFarrow/boostmebitch/pull/616) five fixes from the review of all the code: a quote-aware feed attribute reader, Amber's clipboard answers, no second payment when a wallet does not answer, no overwrite of the Spark backup after a read that could not tell, and the boost screen keeps the wallet you pick
- 2026-11-19 [#604](https://github.com/ChadFarrow/boostmebitch/pull/604) every community playlist feed is copied to the `playlists` branch on GitHub
- 2026-11-19 [#603](https://github.com/ChadFarrow/boostmebitch/pull/603) favorites: check a backup before RESTORE, and tick each repair
- 2026-11-19 [#580](https://github.com/ChadFarrow/boostmebitch/pull/580) and [#583](https://github.com/ChadFarrow/boostmebitch/pull/583) DeMu on the main sites: a DEMU search type and the /demu page of self-hosted albums
- 2026-11-18 [#599](https://github.com/ChadFarrow/boostmebitch/pull/599) the boost safety net: a slow split no longer holds the boost, and a ? split is checked with the wallet and has RETRY
- 2026-11-18 [#601](https://github.com/ChadFarrow/boostmebitch/pull/601) a sign-in never replaces the favorites list (fixes [#600](https://github.com/ChadFarrow/boostmebitch/issues/600))
- 2026-11-17 [#590](https://github.com/ChadFarrow/boostmebitch/pull/590) the site signs a boost note only after a stamp of 1% of the boost
- 2026-11-17 [#588](https://github.com/ChadFarrow/boostmebitch/pull/588) a boost note says what was boosted, then where it was found
- 2026-11-16 [#586](https://github.com/ChadFarrow/boostmebitch/pull/586) a publisher feed for each playlist maker
- 2026-11-14 [#567](https://github.com/ChadFarrow/boostmebitch/pull/567) a GIF grid that plays, in the boost GIF picker
- 2026-11-14 [#565](https://github.com/ChadFarrow/boostmebitch/pull/565) a default boost amount for each boost surface
- 2026-11-14 [#568](https://github.com/ChadFarrow/boostmebitch/pull/568) follow a favorite whose feed host closed
- 2026-11-14 [#541](https://github.com/ChadFarrow/boostmebitch/pull/541) and [#571](https://github.com/ChadFarrow/boostmebitch/pull/571) shuffle the favorite singles, and SHUFFLE on an album
- 2026-11-14 [#559](https://github.com/ChadFarrow/boostmebitch/pull/559) the Android app 0.1.1
- 2026-11-13 [#543](https://github.com/ChadFarrow/boostmebitch/pull/543) the live player says how far behind it is, and has GO LIVE
- 2026-11-13 [#537](https://github.com/ChadFarrow/boostmebitch/pull/537) community playlists 1/4: the store, the feeds and the API, with the feeds on boostmebuddy.com ([#542](https://github.com/ChadFarrow/boostmebitch/pull/542), [#548](https://github.com/ChadFarrow/boostmebitch/pull/548))
