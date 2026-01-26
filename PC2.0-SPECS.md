# Podcasting 2.0 Specs Reference

## Value-for-Value / Payments

### `<podcast:value>`
Enables streaming sats payments to content creators  
**Docs:** https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md#value  
**Used by:** MSP-2.0, ITDV-Lightning, TRM-Lightning, HPM-Lightning, lnaddress-music

### `<podcast:valueRecipient>`
Defines payment split recipients and percentages  
**Docs:** https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md#value-recipient  
**Used by:** MSP-2.0, ITDV-Lightning, TRM-Lightning, HPM-Lightning

---

## Live Streaming

### `<podcast:liveItem>`
Enables live streaming episode support  
**Docs:** https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md#live-item  
**Used by:** LIT_Bot

### PodPing
Real-time feed update notification system  
**Docs:** https://podping.org/  
**Used by:** LIT_Bot

---

## Content Type

### `<podcast:medium>`
Identifies content type (podcast, music, audiobook, etc.)  
**Docs:** https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md#medium  
**Used by:** MSP-2.0, Auto-musicL-Maker, musicL-playlist-updater, chadf-musicl-playlists

---

## Playlists

### `<podcast:remoteItem>`
References items from other feeds for playlists  
**Docs:** https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md#remote-item  
**Used by:** Auto-musicL-Maker, musicL-playlist-updater

---

## Social / Identity

### `<podcast:socialInteract>`
Links to social/comments platforms like Nostr  
**Docs:** https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md#social-interact  
**Used by:** castr.me, Helipad-to-Nostr-BoostBot

### `<podcast:guid>`
Globally unique podcast identifier  
**Docs:** https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md#guid  
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
