# Podcasting 2.0 Specs Reference

## Value-for-Value / Payments

### `<podcast:value>`
Enables streaming sats payments to content creators  
**Docs:** [podcasting2.org](https://podcasting2.org/docs/podcast-namespace/tags/value) · [spec on GitHub](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/value.md)  
**Used by:** MSP-2.0, ITDV-Lightning, TRM-Lightning, HPM-Lightning, lnaddress-music

### `<podcast:valueRecipient>`
Defines payment split recipients and percentages  
**Docs:** [podcasting2.org](https://podcasting2.org/docs/podcast-namespace/tags/value-recipient) · [spec on GitHub](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/value-recipient.md)  
**Used by:** MSP-2.0, ITDV-Lightning, TRM-Lightning, HPM-Lightning

---

## Live Streaming

### `<podcast:liveItem>`
Enables live streaming episode support  
**Docs:** [podcasting2.org](https://podcasting2.org/docs/podcast-namespace/tags/live-item) · [spec on GitHub](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/live-item.md)  
**Used by:** LIT_Bot (archived)

### PodPing
Real-time feed update notification system  
**Docs:** https://podping.org/  
**Used by:** LIT_Bot (archived)

---

## Content Type

### `<podcast:medium>`
Identifies content type (podcast, music, audiobook, etc.)  
**Docs:** [podcasting2.org](https://podcasting2.org/docs/podcast-namespace/tags/medium) · [spec on GitHub](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/medium.md)  
**Used by:** MSP-2.0, Auto-musicL-Maker, musicL-playlist-updater, chadf-musicl-playlists

---

## Playlists

### `<podcast:remoteItem>`
References items from other feeds for playlists  
**Docs:** [podcasting2.org](https://podcasting2.org/docs/podcast-namespace/tags/remote-item) · [spec on GitHub](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/remote-item.md)  
**Used by:** Auto-musicL-Maker, musicL-playlist-updater

---

## Social / Identity

### `<podcast:socialInteract>`
Links to social/comments platforms like Nostr  
**Docs:** [podcasting2.org](https://podcasting2.org/docs/podcast-namespace/tags/social-interact) · [spec on GitHub](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/social-interact.md)  
**Used by:** castr.me, Helipad-to-Nostr-BoostBot

### `<podcast:guid>`
Globally unique podcast identifier  
**Docs:** [podcasting2.org](https://podcasting2.org/docs/podcast-namespace/tags/guid) · [spec on GitHub](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/guid.md)  
**Used by:** MSP-2.0, castr.me, RSS-music-site-template

---

## Lightning Protocols

### LNURL-pay
Lightning URL protocol for payments  
**Docs:** https://github.com/lnurl/luds/blob/luds/06.md  
**Used by:** lnurl-test-feed, lnaddress-music

### Lightning Address
Email-like addresses for Lightning payments  
**Docs:** https://lightningaddress.com/  
**Used by:** lnaddress-music
