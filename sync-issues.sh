#!/bin/bash

# Repos to sync
REPOS=(
  "MSP-2.0"
  "MSP-2.0-Desktop-App"
  "castr.me"
  "TRM-Lightning"
  "ITDV-Lightning"
  "HPM-Lightning"
  "stablekraft-app"
  "lnaddress-music"
  "musicL-playlist-updater"
  "chadf-musicl-playlists"
  "Auto-musicL-Maker"
  "RSS-music-site-template"
  "Helipad-to-Nostr-BoostBot"
  "LIT_Bot"
  "LibreRelayBot"
  "BoostAfterBoost"
  "chadf-landing-page"
  "HGH-checker"
  "lnurl-test-feed"
)

USERNAME="ChadFarrow"
OUTPUT="ISSUES.md"

echo "# GitHub Issues" > $OUTPUT
echo "" >> $OUTPUT
echo "*Run \`./sync-issues.sh\` to update*" >> $OUTPUT
echo "" >> $OUTPUT

for repo in "${REPOS[@]}"; do
  echo "Fetching $repo..."
  echo "## $repo" >> $OUTPUT
  
  issues=$(gh issue list --repo $USERNAME/$repo --state open --json number,title,url --jq '.[] | "- [#\(.number) \(.title)](\(.url))"' 2>/dev/null)
  
  if [ -z "$issues" ]; then
    echo "*No open issues*" >> $OUTPUT
  else
    echo "$issues" >> $OUTPUT
  fi
  echo "" >> $OUTPUT
done

echo "---" >> $OUTPUT
echo "*Last synced: $(date)*" >> $OUTPUT

echo "Done! Issues synced to $OUTPUT"
