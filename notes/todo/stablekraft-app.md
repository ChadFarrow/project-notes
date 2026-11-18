# stablekraft-app

## After merge: Phone: NIP-46 signers (#315)
#315 is live on https://stablekraft.app since 2026-11-18 16:25 UTC. These hearts are your real favorites, so take each one back after the test. A heart tap writes only favorites events: no boost and no note. A desktop browser cannot test Amber or Primal, so these tests need the phone. The bunker test (`npm run e2e:signers`) already passed, in Public and in Private mode, on a local relay only.

- [ ] #315: a heart tap with Amber or Primal updates the shared favorites list at once
	- [ ] Phone: Amber on Android. Sign in at https://stablekraft.app with the Amber card. Open an album. Heart the album and one track, and approve in Amber. Do not reload. Note the time. To check, ask a Claude session to run `npx tsx lib/nostr/favorites.relay-probe.ts` with your npub (it only reads, and needs no key), or open https://www.boostmebitch.com/favorites on the computer after 15 seconds: the album and the track are there
	- [ ] Phone: Primal on iPhone. Do the same steps with the Primal card
