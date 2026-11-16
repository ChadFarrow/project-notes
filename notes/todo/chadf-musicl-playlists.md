- [ ] After merge: PR #7 is merged (2026-11-09): the 30-day OnlyBoosts top songs playlist, and only a clear answer now takes a song off a list. Two checks are left.
  - [ ] Open the new playlist in an app and check that its cover shows. The cover file answers HTTP 200 since the merge.
  - [ ] After the run on Monday 2026-11-16, ask Claude to read its log: both lists written, and how many rows are `KEPT`.

- [ ] Before merge: #9 the master publisher feed lists all 12 musicL playlists (each links back to it) and your 2 Boost Me Buddy playlists (one way). Merge it together with ChadFarrow/musicL-playlist-updater#16, so the daily update keeps the back-links

- [ ] After merge: #9 add the publisher feed to Podcast Index. It is not in the index, so apps cannot find it yet. Ask Claude to add it, or use podcastindex.org/add
  - [ ] Computer: in boostmebitch, open ChadF's playlists and check that Lightning Thrashes, Two for Tunestr and your 2 Boost Me Buddy playlists show
