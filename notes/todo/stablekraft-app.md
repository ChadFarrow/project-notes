# stablekraft-app

## After merge: Phone: NIP-46 signers (#315)
Start when https://stablekraft.app/api/version shows the merge commit of #315. These hearts are your real favorites, so take each one back after the test. A desktop browser cannot test Amber or Primal, so these tests need the phone. The bunker test (`npm run e2e:signers`) already passed.

- [ ] #315: a heart tap with Amber or Primal updates the shared favorites list at once
	- [ ] Phone: Amber on Android. Sign in at https://stablekraft.app with the Amber card. Open an album. Heart the album and one track, and approve in Amber. Do not reload. After 15 seconds, open https://www.boostmebitch.com/favorites on the computer: the album and the track are there
	- [ ] Phone: Primal on iPhone. Do the same steps with the Primal card
	- [ ] Phone: Private mode, with Amber or Primal. Settings shows "Favorites on Nostr" as Private (if it shows Public, skip this test). Open https://stablekraft.app/favorites: there is no yellow "Couldn't reach the relays" notice. Heart one track, wait 15 seconds, and look in Boost Me Bitch again: the track is there
