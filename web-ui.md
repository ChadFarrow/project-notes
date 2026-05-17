# web-ui

**Category:** Web/Apps
**Repo:** https://github.com/ChadFarrow/web-ui (fork of [Podcastindex-org/web-ui](https://github.com/Podcastindex-org/web-ui))

## Description
Personal fork of the podcastindex.org web-ui repo. Used to contribute new apps to the public [podcastindex.org/apps](https://podcastindex.org/apps) directory by editing `server/data/apps.json` and dropping icons in `server/assets/`.

## PC2.0 Specs Used
Doesn't *use* PC2.0 specs — it catalogs which apps support which specs. Reference: the `supportedElements` enum in `server/data/apps-schema.json` is the canonical list of recognized `<podcast:*>` elements that apps can claim.

## Notes
- Add `"open source"` to `appType` for FLOSS projects (reviewer specifically asks).
- No `elementURL` fields unless the URL showcases that specific element.
- CI: `nhalstead/validate-json-action@0.1.3` against `server/data/apps-schema.json`.
- Local validation:
  ```
  node -e "const Ajv=require('ajv');const ajv=new Ajv({format:'full'});const v=ajv.compile(JSON.parse(require('fs').readFileSync('server/data/apps-schema.json')));console.log(v(JSON.parse(require('fs').readFileSync('server/data/apps.json')))?'VALID':v.errors)"
  ```
- Append new entries at the end of the `apps.json` array. Mind the trailing-comma situation when rebasing on master.

## Resources
- Upstream: https://github.com/Podcastindex-org/web-ui
- Public directory: https://podcastindex.org/apps
- Open PRs from this fork: track via GitHub UI (most activity is on upstream PRs, not the fork itself)

## My Apps in the Directory
- Doerfel-Verse App (legacy)
- LNBeats
- Music Side Project (legacy)
- Stablekraft (PR #557)
- Into The Doerfel-Verse (PR #557)
- MSP 2.0 (PR #557)
- Boost Me Bitch (PR #557)

## TODOs
- [ ]
