# podcast-index-notify

**Category:** Tools & self-hosting  
**Uses:** msp-podping-service  
**Repo:** https://github.com/ChadFarrow/podcast-index-notify

## Description
A small public npm library (MIT) that tells Podcast Index about a new or changed feed. It sends a keyless `hub/pubnotify`, so no Podcast Index write key is needed. It can also send a podping through msp-podping-service, look up a feed's Podcast Index id with a read key, and wait up to 15 minutes until the feed is in the index. Zero runtime dependencies; Node 18+ and edge runtimes.

The code comes from MSP-2.0 (`api/_utils/feedUtils.ts`, `api/pubnotify.ts`). Started 2026-11-23 (Chad: "can we make this a separate library to share with other's?").

## PC2.0 Specs Used
- Podcast Index API: `hub/pubnotify`, `podcasts/byguid`, `podcasts/byfeedurl`, `add/byfeedurl` (optional, write key)
- Podping (through a hivepinger pusher)
- `<podcast:block>` and `<podcast:medium>`

## Notes
- Not on npm yet: Chad publishes it from his npm account (see the To do note).
- Planned users, one PR per repo in later tasks: MSP-2.0, MSP-2.0-Desktop-App, boostmebitch (boostmebitch#666), sovereign-feeds, musicL-playlist-updater.

## Resources
- Podcast Index API docs: https://podcastindex-org.github.io/docs-api/
