#!/usr/bin/env bash
# Brief 221 (B3): the DAILY Mainline -> office_ratings sync, run by cron on the
# box. deploy.sh installs the crontab line (idempotent) and runs the same sync
# once at the end of every deploy. Output is appended to
# ~/gbp-ratings-sync.log (outside the repo, so `git reset --hard` / a clean
# never touches it).
#
# Never fails loudly on a data state: Mainline down, a wrong token or a rejected
# number keeps the last good numbers (scripts/sync-gbp-ratings.ts exits 0).
set -u
cd "$(dirname "$0")/.." || exit 1
for envfile in .env .env.production .env.local; do
  if [ -f "$envfile" ]; then set -a; . "./$envfile"; set +a; fi
done
{
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) gbp-ratings sync"
  npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/sync-gbp-ratings.ts
} >> "$HOME/gbp-ratings-sync.log" 2>&1
