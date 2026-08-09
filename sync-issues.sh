#!/bin/bash

# Local convenience script — regenerates ISSUES.md, PULL_REQUESTS.md and BRANCHES.md
# only. It does NOT regenerate INDEX.md, LATEST.md, audits/ or references/starred.md;
# run the "Sync All Project Data" workflow for those.
#
# Output must stay byte-identical to .github/workflows/sync-all.yml, otherwise running
# this locally produces a diff that the next scheduled sync immediately reverts.

# Keep in sync with CATEGORIES in .github/workflows/sync-all.yml — same repos AND same
# order, since the workflow emits sections in category order and the output must match.
REPOS=(
  # Music/Podcasting
  "MSP-2.0"
  "MSP-2.0-Desktop-App"
  "musicL-playlist-updater"
  "chadf-musicl-playlists"
  "Auto-musicL-Maker"
  "lnaddress-music"
  "castr.me"
  "RSS-music-site-template"
  "msp-podping-service"
  # Lightning
  "ITDV-Lightning"
  "TRM-Lightning"
  "HPM-Lightning"
  "lnurl-test-feed"
  "libre-listener-wallet-monorepo"
  # Nostr
  "Helipad-to-Nostr-BoostBot"
  "LIT_Bot"
  "LibreRelayBot"
  "BoostAfterBoost"
  # Web/Apps
  "stablekraft-app"
  "chadf-landing-page"
  "boostmebitch"
  "web-ui"
  "localbitcoiners"
  "candr.space"
  # Tools
  "HGH-checker"
)

USERNAME="ChadFarrow"
SCOPE_NOTE="*Scope: curated projects only. For all repos see [LATEST.md](LATEST.md).*"
STAMP=$(date -u '+%Y-%m-%d %H:%M UTC')

OUTPUT="ISSUES.md"

echo "# GitHub Issues" > $OUTPUT
echo "" >> $OUTPUT
echo "*Auto-synced every 6 hours via GitHub Actions*" >> $OUTPUT
echo "" >> $OUTPUT
echo "$SCOPE_NOTE" >> $OUTPUT
echo "" >> $OUTPUT

for repo in "${REPOS[@]}"; do
  echo "Fetching $repo..."
  echo "## $repo" >> $OUTPUT
  echo "" >> $OUTPUT

  issues=$(gh issue list --repo $USERNAME/$repo --state open --json number,title,url --jq '.[] | "- [#\(.number) \(.title)](\(.url))"' 2>/dev/null)

  if [ -z "$issues" ]; then
    echo "*No open issues*" >> $OUTPUT
    echo "" >> $OUTPUT
  else
    echo "### Open" >> $OUTPUT
    echo "$issues" >> $OUTPUT
    echo "" >> $OUTPUT
  fi
done

echo "---" >> $OUTPUT
echo "*Last synced: $STAMP*" >> $OUTPUT

echo "Done! Issues synced to $OUTPUT"

# ========== SYNC PULL REQUESTS ==========
PR_OUTPUT="PULL_REQUESTS.md"

echo "# Pull Requests" > $PR_OUTPUT
echo "" >> $PR_OUTPUT
echo "*Auto-synced every 6 hours via GitHub Actions*" >> $PR_OUTPUT
echo "" >> $PR_OUTPUT
echo "$SCOPE_NOTE" >> $PR_OUTPUT
echo "" >> $PR_OUTPUT

for repo in "${REPOS[@]}"; do
  echo "Fetching PRs for $repo..."
  echo "## $repo" >> $PR_OUTPUT
  echo "" >> $PR_OUTPUT

  prs=$(gh pr list --repo $USERNAME/$repo --state open --json number,title,url --jq '.[] | "- [#\(.number) \(.title)](\(.url))"' 2>/dev/null)

  if [ -z "$prs" ]; then
    echo "*No open pull requests*" >> $PR_OUTPUT
    echo "" >> $PR_OUTPUT
  else
    echo "$prs" >> $PR_OUTPUT
    echo "" >> $PR_OUTPUT
  fi
done

echo "---" >> $PR_OUTPUT
echo "*Last synced: $STAMP*" >> $PR_OUTPUT

echo "Done! Pull requests synced to $PR_OUTPUT"

# ========== SYNC BRANCHES ==========
BR_OUTPUT="BRANCHES.md"

echo "# Branches" > $BR_OUTPUT
echo "" >> $BR_OUTPUT
echo "*Auto-synced every 6 hours via GitHub Actions*" >> $BR_OUTPUT
echo "" >> $BR_OUTPUT
echo "$SCOPE_NOTE" >> $BR_OUTPUT
echo "" >> $BR_OUTPUT

for repo in "${REPOS[@]}"; do
  echo "Fetching branches for $repo..."
  echo "## $repo" >> $BR_OUTPUT
  echo "" >> $BR_OUTPUT

  branches=$(gh api repos/$USERNAME/$repo/branches --paginate --jq '.[] | "- `\(.name)`\(if .protected then " 🔒" else "" end)"' 2>/dev/null || echo "")

  if [ -z "$branches" ]; then
    echo "*No branches found*" >> $BR_OUTPUT
  else
    echo "$branches" >> $BR_OUTPUT
  fi
  echo "" >> $BR_OUTPUT
done

echo "---" >> $BR_OUTPUT
echo "*Last synced: $STAMP*" >> $BR_OUTPUT

echo "Done! Branches synced to $BR_OUTPUT"
echo "Note: INDEX.md, LATEST.md, audits/ and references/starred.md were NOT updated."
