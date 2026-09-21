#!/usr/bin/env bash
#
# Staging/production deploy — the body of deploy.yml's "Deploy via SSH" step.
#
# ⚠️ THIS LIVES IN A FILE BECAUSE THE INLINE `script:` INPUT HAS A SIZE
# CEILING. `appleboy/ssh-action` hands the whole script to the remote shell as
# one command string, and past roughly 42 KB the remote `/bin/bash` refuses it
# with "Argument list too long" (E2BIG) before a single line runs. Deploy run
# #102 (2026-09-21) died that way in ONE SECOND at 43,731 bytes; run #100, at
# 42,245 bytes, was the last one small enough to execute. SSH itself was fine.
# DO NOT MOVE THIS BODY BACK INLINE, and keep the inline step small.
#
# ⚠️ `script_stop: true` DOES NOT REACH THIS FILE. That option makes the action
# inject an exit-code check after every line of the INLINE script; a file run
# as `bash scripts/deploy.sh` gets no such treatment. Abort-on-failure here is
# `set -e` below and nothing else. Two consequences:
#   * NEVER remove `set -e`, and never add `|| true` to a step that must gate
#     the deploy.
#   * Keep the Brief 150 §8 shape rule anyway — condition fallbacks on ONE
#     line, no multi-line `else` reached via a failed test. Under `set -e` that
#     shape is still correct, and the inline step it came from is still
#     `script_stop: true`.
#
# `set -e` is STRICTLY SAFER than the injected check it replaces, not weaker:
# it fires on any failing command, and it does NOT fire on a failing test in a
# condition context (`if`, `while`, `&&`, `||`) — which is exactly the false
# abort that took seven consecutive deploys red in Brief 150 §8.
#
# Invoked from deploy.yml AFTER `cd /var/www/jblanton` and
# `git reset --hard origin/main`, so the working directory is the repo root and
# this file is already at the revision being deployed.

set -e
npm ci
# Zero-downtime build (2026-07-28): the old `rm -rf .next && npm run
# build` wiped the live build out from under the running `next start`,
# so EVERY deploy served completely unstyled pages (all /_next/static
# assets 404'd) for the full multi-minute build - seen as "CSS totally
# broke" after each push. It also meant a failed build left the site
# dead. Instead, build into a side directory (next.config.mjs reads
# NEXT_DIST_DIR - set inline for this one command only, NEVER exported,
# so the pm2 app started below with --update-env can't inherit it and
# look for its build in the wrong place) while the live `.next` keeps
# serving untouched. If the build fails, `set -e` aborts here and the
# old version just keeps running.
# Marketing / conversion tracking IDs (2026-08-08).
#
# These MUST be exported into the shell that runs `next build`:
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD
# time, so setting one at runtime (or restarting pm2) does nothing.
#
# They live here, in version control, rather than in the box's env
# file because that file is untracked and invisible from anywhere but
# the box - which is exactly how the site went live with EVERY one of
# these blank. GA4, Google Ads, Meta Pixel, Bing UET and WhatConverts
# were all dark on production, verified against
# https://jblantonplumbing.com on 2026-08-08, long after Brief 128
# shipped the code that expects them. Nothing warned anyone, because
# blank is a deliberate no-op in that code.
#
# Safe to commit: every value below is a PUBLIC client-side ID that
# ships inside the browser bundle and was readable in the old
# WordPress page source. Real secrets stay in GitHub Secrets.
#
# These are the same IDs the live WordPress site used, so GA4
# history, Ads conversion actions and Meta/Bing audiences reconnect
# rather than starting over.
#
# ⚠️ This workflow deploys to exactly ONE host. If a second (staging)
# target is ever added it must NOT inherit these - give it its own
# workflow with them left blank, or staging traffic lands in the
# production analytics accounts and burns numbers out of the live
# WhatConverts pool.
export NEXT_PUBLIC_GA4_ID=G-SQZLV0V58J
# Google Ads: swapped from AW-661617195 to AW-16486409650 on
# 2026-09-07 (Brief 174, Track A) at the instruction of Google's Lead
# Generation team - Tag Assistant could not detect AW-16486409650, so
# its "Schedule Service Form Submit" conversion action (manager
# account 117-076-6031) had counted zero. A REPLACEMENT, not an
# addition: exactly one Ads config call site-wide. Rolling back means
# this line plus the fallback in src/lib/analytics.ts.
export NEXT_PUBLIC_GOOGLE_ADS_ID=AW-16486409650
export NEXT_PUBLIC_META_PIXEL_ID=1674876326613103
export NEXT_PUBLIC_BING_UET_ID=97007877
export NEXT_PUBLIC_WHATCONVERTS_PROFILE_ID=102905
# ── NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_THANK_YOU is DELIBERATELY ────
#    ABSENT from this block. Do not "fix" it by adding it.
#
# Brief 174 Track B (the /thank-you "Schedule Service Form Submit"
# conversion) is built and tested, and is shipping INERT on Marketing's
# instruction (2026-09-08). Unlike the four IDs above, that value has NO
# fallback in src/lib/analytics.ts: blank means ThankYouConversion.tsx
# is never rendered, no conversion code reaches the page, and no request
# is made. That is the intended state right now, not an oversight.
#
# Track A (the account swap above) IS live - the site serves
# AW-16486409650 sitewide and no longer serves AW-661617195.
#
# TO ARM THE CONVERSION LATER: add one line here and redeploy.
#   export NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_THANK_YOU=AW-16486409650/svF0COfht-scELLLqrU9
# The production value is also recorded in .env.local.example.
#
# ⚠️ AND DO NOT SET IT IN THE BOX'S ENV FILE INSTEAD - not because it
# would be ignored, but because it would WORK, silently. Measured
# 2026-09-08: Next only inlines a NEXT_PUBLIC_* that has a value at
# BUILD time. With this one absent (the state today) the compiled
# server chunk keeps a live `process.env` read, so dropping the value
# into the box's .env.local and restarting ARMS a live-account
# conversion with no rebuild, no deploy, and nothing in version
# control to show for it. Once the export below exists, the value is
# inlined instead and the box's file stops mattering - so which of the
# two wins flips depending on build state. Keep it in this block,
# where it is deterministic and reviewable.
# Brief 174 (Track C): pinned rather than left to the code default in
# src/lib/schedule/tracking.ts, because whatever value is in effect is
# also the ONLY origin the scheduling modal accepts a postMessage
# from. Left unset, a stray value in the box's untracked env file
# would silently kill both the form-step analytics and the pending
# /thank-you handoff, with no error anywhere. Same value as the
# default - behaviour is unchanged, it is just no longer implicit.
export NEXT_PUBLIC_MAINLINE_ORIGIN=https://mainline.jblantonplumbing.com
# -- Brief 171 (C2): store-locator search index drift guard ----------
# `src/lib/content/locator-index.generated.ts` is a GENERATED file that
# is committed, so it goes stale the day someone registers city 387 or
# moves a city between dispatch offices — silently, on the homepage.
# This regenerates it in memory from CITY_REGISTRY and exits non-zero if
# it differs from what is committed. No DB, no network.
#
# Deliberately BEFORE the build, not chained onto `prebuild` (that slot
# is validate-sitemap.ts, and one failure must not look like the other),
# and deliberately a single command with no `if`: this step runs with
# `script_stop: true`, so a non-zero exit aborts the deploy on its own
# and a multi-line shell construct here is the shape that has broken
# this file before (Brief 151).
echo 'Checking the store-locator search index for drift (Brief 171 C2)...'
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/check-locator-index.ts
# ⚠️ `.next/types` IS LOAD-BEARING IN THIS LINE — DO NOT TIDY IT AWAY.
#
# `.next` is the LIVE build serving traffic and this deploy never
# deletes it (that is the whole zero-downtime design above). But
# `tsconfig.json` type-checks `.next/types/**/*.ts`, and `next build`
# regenerates one type file per route into the dist dir. So the LIVE
# `.next/types` still holds a file for every route the PREVIOUS deploy
# built — including any route the repo has since DELETED. That orphan
# does `import * as entry from '../../../../src/app/<route>/page.js'`,
# the module is gone, and the next `next build` dies in "Linting and
# checking validity of types" with TS2307. The build is fine; the
# leftover is not.
#
# That is exactly what killed deploy run #101 (2026-09-18): Brief 181
# deleted `src/app/hanover-park-test/`, and run #100's
# `.next/types/app/hanover-park-test/page.ts` was still on the box. It
# failed 166s in, against a commit that builds clean anywhere else, and
# `set -e` left the old build serving — so the site never noticed.
#
# Deleting `.next/types` is safe: it is a build-time artifact for tsc
# and the editor. `next start` serves from `.next/server`,
# `.next/static` and `.next/BUILD_ID` and never reads it — verified by
# deleting it under a running server, which kept answering 200.
#
# The alternative — excluding `.next` in tsconfig.json — was rejected:
# it would drop Next's route type-checking across every route to dodge
# one stale file.
rm -rf .next-build .next-prev .next/types
NEXT_DIST_DIR=.next-build npm run build
# Apply idempotent DB schema migrations BEFORE restarting, so the
# running app never references a column that doesn't exist yet.
# This step was missing entirely: the pipeline only built + restarted,
# so every schema change had to be run by hand on the box. Brief 102's
# `offices` JSONB column was never applied to staging, so every Global
# Settings save 500'd ("column \"offices\" ... does not exist"). The
# migration is idempotent (ADD COLUMN IF NOT EXISTS / ON CONFLICT DO
# NOTHING), so running it on every deploy is a safe no-op once applied.
# Load DATABASE_URL the same way Next.js does - from the env file on the box.
for envfile in .env .env.production .env.local; do
  if [ -f "$envfile" ]; then set -a; . "./$envfile"; set +a; fi
done
# Brief 147 (Track A): tell every DB script it is running in a pipeline,
# not at somebody's terminal. All of them are dry-run by DEFAULT - the
# right default for a human, a trap here: drop the `commit` argument from
# a step below and the script logs what it WOULD do, exits 0, and this
# deploy reports success having written nothing. That silent no-op is
# indistinguishable from a clean apply from the outside, and it is how
# the Brief 146 gas-lines content port shipped an empty page.
# With JBP_PIPELINE set, scripts/lib/run-mode.ts REFUSES to guess: a step
# with no explicit `commit` or `--dry-run` exits non-zero and `set -e`
# fails the deploy here, before the build swap, with the old build still
# serving. Never remove this export to "fix" a failing step - add the
# missing flag to the step instead.
export JBP_PIPELINE=1
# Every script writes one greppable `PIPELINE VERDICT:` line here, printed
# as a block at the end of this step so APPLIED / ALREADY-APPLIED /
# NOT-APPLIED is readable at a glance instead of buried in the log.
export JBP_DEPLOY_VERDICTS="$PWD/.deploy-verdicts.log"
rm -f "$JBP_DEPLOY_VERDICTS"
# NOTE (Brief 158, Track C): scripts/verify-sitemap-queries.ts used to run
# HERE. It now runs further down, AFTER the seed/backfill scripts, because
# it also asserts that every registered city has a `city_pages` row - run
# it above the seeds and the very deploy that creates a missing row aborts
# before creating it. It is still well before the build swap, so a hard
# failure there still leaves the previous build serving.
# ensure-schema reconciles EVERY CMS table's columns (idempotent
# ADD COLUMN IF NOT EXISTS across all tables), so no editor can hit a
# missing-column 500 again. Then migrate-global-settings seeds the
# offices data. Both are safe no-ops once the DB is in sync.
npx ts-node --project tsconfig.scripts.json scripts/ensure-schema.ts
npx ts-node --project tsconfig.scripts.json scripts/migrate-global-settings.ts
# Brief 154 (Track C): append the Columbus, OH office to the EXISTING
# `global_settings.offices` JSONB. The seed step above only reaches a
# brand-new row (`WHERE offices IS NULL`), which is a no-op on this box
# since offices was seeded long ago - this is the fill-gaps path for an
# existing database. Selects by slug (never index/serial), backs the
# prior value up to brief154_row_backup, appends without reordering or
# touching any of the other 14 offices, and reports ALREADY-APPLIED
# once Columbus exists - a safe no-op on every deploy after the first.
npx ts-node --project tsconfig.scripts.json scripts/add-columbus-office.ts commit
# Brief 158 (Track A): create the ONE missing `city_pages` row - columbus -
# pre-filled verbatim from src/lib/content/cities/columbus.ts, so
# /admin/city/columbus opens a POPULATED editor instead of the "No CMS
# content found" card. Columbus is the first city born after the WordPress
# migration and every automated row-creating path is driven off the WP
# export, so nothing in this pipeline would ever have created it
# (Brief 157, Q6). The live page does not move: the coverage-area merge is
# `db.X || staticFile.X` per field and every seeded value equals what the
# file already supplies, with `hero_heading_line1` seeded EMPTY so the H1
# stays "Columbus Plumber". Fill-gaps only (a non-empty column is never
# overwritten), backed up to brief158_row_backup, ALREADY-APPLIED once the
# row is populated - a safe no-op on every deploy after the first.
# `-r tsconfig-paths/register` is REQUIRED - it imports the content file
# and the shared sanitizer from src/, which resolve `@/...` path aliases.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-columbus-city-page.ts commit
# -- Columbus Brief 02 tail: city_pages rows for the Ohio areas -------
# Brief 02 registered 138 Ohio area pages and nothing in this pipeline
# creates a `city_pages` row for a city that never existed in WordPress,
# so they all shipped rowless and the coverage assertion below refused
# the deploy: "137 of 386 registered cities are missing a row".
#
# That gate is right and is being SATISFIED, not worked around: a
# registered city with no row is a page Marketing can see on the live
# site and cannot edit, because the city editor needs a row to load and
# its save path is UPDATE-only.
#
# Every column is seeded EMPTY, and the coverage-area merge in
# src/app/[city]/page.tsx is `db.X || base.X` per field, so every `||`
# still resolves to the checked-in Ohio template content and no live
# page moves. Verified: /dublin, /westerville, /columbus-short-north and
# /columbus all still render exactly one <h1>{City} Plumber</h1> after
# seeding. `hero_heading_line1` is '' deliberately - a non-empty value
# there rewrites the H1 of every one of those indexed pages at once.
#
# MUST stay ABOVE verify-sitemap-queries.ts. Fill-gaps
# (ON CONFLICT DO NOTHING) and one transaction, so it is a clean no-op
# on every deploy after the first.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-ohio-area-city-pages.ts commit
# Brief 112: create the cms_media catalog table and backfill a row for
# every file already in public/uploads/cms/. Idempotent - CREATE TABLE
# IF NOT EXISTS + INSERT ... ON CONFLICT (url) DO NOTHING, so re-running
# never duplicates rows or clobbers editor-added alt text/captions.
npx ts-node --project tsconfig.scripts.json scripts/migrate-brief-112-media.ts
# Brief 150 (Track D): delete the `.gitkeep` placeholder row(s) the
# step above used to backfill into cms_media (row #398 on the live
# box) — the backfill now skips dotfiles, and this removes what it
# already created. Backup-first (brief150_row_backup), selects by
# filename not id, refuses if a row was ever human-curated, reports
# ALREADY-APPLIED once none remain — a safe no-op on every deploy.
# Runs AFTER the backfill so any row an older build re-inserted in
# the same pipeline is swept too.
npx ts-node --project tsconfig.scripts.json scripts/fix-brief-150-delete-gitkeep-media-row.ts commit
# -- Brief 171: the two data fixes the code alone cannot deliver -------
#
# Both live in the DATABASE, and on this site the DB beats the static
# file for every field it holds. So deploying the code without these
# leaves the homepage rendering the OLD heading ("FIND US") over the
# OLD Chicagoland-only intro, and lists Joliet in the store locator
# with RAVENSWOOD'S street address. That is what happened on the first
# attempt at shipping this; the scripts had only ever been run against
# a developer's localhost Postgres.
#
# `commit` is what makes them deploy-safe: with it, a guard trip
# (a field holding copy the script does not recognise, i.e. someone
# edited it in /admin) prints loudly and exits 0 instead of 3. Without
# it the first Marketing edit to this copy would abort every future
# deploy of the whole site, because this step runs `script_stop: true`.
# Same convention and same reasoning as the Brief 145 fix scripts above.
#
# Both are idempotent read-modify-write patches, guarded per field, so
# re-running on every deploy is a no-op once applied and can never
# overwrite a value a human has since changed.
npx ts-node --project tsconfig.scripts.json scripts/fix-brief-171-office-data.ts commit
npx ts-node --project tsconfig.scripts.json scripts/fix-brief-171-home-copy.ts commit
# Brief 109: seed the "Join Our Team" (/j-blanton-is-hiring) main_pages
# row so its CMS editor loads/saves. Idempotent INSERT ... ON CONFLICT
# DO NOTHING - a safe no-op once the row exists, never clobbers edits.
npx ts-node --project tsconfig.scripts.json scripts/seed-hiring-page.ts
# Brief 110: seed the "Terms of Use & Privacy Policy" (/privacy-policy)
# main_pages row so its CMS editor loads/saves. Idempotent INSERT ...
# ON CONFLICT DO NOTHING - a safe no-op once the row exists, never
# clobbers edits.
npx ts-node --project tsconfig.scripts.json scripts/seed-privacy-policy-page.ts
# Brief 176: seed the "Home Repair: Know Your Consumer Rights"
# (/consumer-rights) main_pages row so its CMS editor loads/saves.
# Idempotent INSERT ... ON CONFLICT DO NOTHING - a safe no-op once the
# row exists, never clobbers edits. Only the editable prose is seeded;
# the verbatim statutory blocks and tables live in code.
npx ts-node --project tsconfig.scripts.json scripts/seed-consumer-rights-page.ts
# Brief 119: invite-based user creation - adds cms_users.status +
# audit columns, makes password_hash nullable, and creates the
# cms_user_invites token table. Idempotent (ADD COLUMN / CREATE
# TABLE IF NOT EXISTS), safe no-op once applied.
npx ts-node --project tsconfig.scripts.json scripts/migrate-invite-users.ts
# Brief 122: stamp imported articles with their original WordPress
# post ID (from the checked-in scripts/data/wp-article-ids.json) so
# the public Knowledge Hub feed can reproduce the live site's
# ordering - all 812 WP articles share a ~33s post_date window, so
# created_at alone can't order them. Idempotent UPDATE by slug of a
# single nullable column; safe no-op re-run on every deploy.
npx ts-node --project tsconfig.scripts.json scripts/backfill-article-wp-ids.ts
# Brief 123: fill blank article hero images from the checked-in
# scripts/data/article-hero-images.json (generated on the dev
# machine from the WP export + live-site fallback). Only rows whose
# image is NULL/'' are updated - editor-set images are never
# overwritten, so re-running on every deploy is a safe no-op.
npx ts-node --project tsconfig.scripts.json scripts/backfill-article-hero-images.ts
# Brief 126: clear dead WordPress image URLs (the 404ing
# Plumbing-Rough-In-800x600.jpg) out of city_pages.hero_image and
# city_service_pages.service_intro_image so those pages use the
# hero_image.webp code fallback like the working pages. Backs up
# affected values to brief126_wp_image_backup first; the LIKE
# predicate matches nothing after the first run, so re-running on
# every deploy is a safe no-op.
npx ts-node --project tsconfig.scripts.json scripts/migrate-brief-126-clear-wp-image-refs.ts
# Brief 140: give the 21 Brief-131 coverage-area cities their legacy
# "We've Got You Covered" body copy from the checked-in
# scripts/data/brief140-city-content.json (generated on the dev machine
# from the WP export - the box has no 146 MB export, same split as
# Briefs 122/123). Those 21 slugs were registered by Brief 131 but never
# got a city_pages row, so the section rendered as a heading + image with
# an empty text column. Allow-listed to exactly those 21 slugs; a city
# whose content_body is already non-empty is skipped, so re-running on
# every deploy is a safe no-op and never clobbers a CMS edit.
# `-r tsconfig-paths/register` is REQUIRED - this script imports the
# shared sanitizer from src/, which resolves `@/...` path aliases. Do not
# drop it when copying this line.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/backfill-brief131-city-content.ts --commit
# Brief 141 (Track A): fill the three No Drip Club membership prices -
# ndc_price "$29.97" (classic/monthly, pre-existing), ndc_price_1yr
# "$149" and ndc_price_2yr "$229" (the annual offer). ensure-schema
# above creates the two new columns. Only NULL/'' values are filled, so
# an editor's price change is never clobbered and re-running on every
# deploy is a safe no-op. Must run BEFORE the comparison seed: the
# price cards store TOKENS, so unseeded prices render blank cards.
npx ts-node --project tsconfig.scripts.json scripts/seed-brief-141-ndc-prices.ts commit
# Brief 141 (Track F): seed the No Drip Club page's membershipComparison
# block (approved sell-sheet content) and switch content.template_variant
# to 'comparison' - the new template goes live on STAGING, confirmed with
# the marketing lead. The classic variant's content.benefits_card is not
# touched and switching back is one selection in the admin. Each key is
# written only when absent, and an existing template_variant is never
# re-flipped, so a deliberate switch back to 'classic' survives every
# later deploy. `-r tsconfig-paths/register` is REQUIRED (imports src/).
#
# ⚠️ PRODUCTION: do NOT assume this belongs on production. Flipping the
# variant there without the $29.97 → annual price sweep would advertise
# two prices at once - see production-migration-checklist.md.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-141-ndc-comparison.ts commit
# Brief 143: apply the APPROVED No Drip Club offer copy - 6 service
# headlines, 6 service paragraphs, both stored copies of the Elgin and
# Algonquin city text, and 4 Knowledge Hub article sentences. Backs the
# old value up to brief143_ndc_content_backup first. Every write is
# gated on an EXACT match against the expected old string, so a row an
# editor has since changed is skipped and logged rather than clobbered,
# and a re-run reports "already-applied" and writes nothing - safe on
# every deploy. Staging and dev legitimately hold different data
# (Brief 142 §1.2), so skips are logged, NOT fatal: read the step's
# output after the first deploy to see which rows staging actually had.
npx ts-node --project tsconfig.scripts.json scripts/seed-brief-143-ndc-offer-content.ts commit
# Brief 143 follow-up: the ONE sentence the migration above stopped on
# - article id 464's closing paragraph, which still promised "service
# within 24 hours". Its Brief 143 fragment could not be substituted
# grammatically, so Track E's rule left the row alone and reported it;
# the marketing lead approved a full replacement sentence on
# 2026-08-07 (drops the 24-hour guarantee and the orphaned footnote
# asterisk). Must run AFTER the migration above: both write
# cms_articles.body.html and share brief143_ndc_content_backup, and
# this row is the one that migration deliberately skips. Same exact-
# match gate and the same "already-applied" no-op on re-run, so it is
# safe on every deploy and safe on dev and staging alike.
npx ts-node --project tsconfig.scripts.json scripts/seed-brief-143-article-464-sentence.ts commit
# Brief 145 (Track B): rename the `venetian-cillage` city slug to
# `venetian-village` on the 45 city_service_pages rows carrying it.
# Brief 131 dropped `venetian-cillage` from CITY_REGISTRY as a typo
# duplicate, so all 45 URLs 404 and their content can never render.
# The script backs every row up to brief145_row_backup first, refuses
# to run if a `venetian-village` row already exists for any of those
# services (it never overwrites), and reports "already-applied" once
# no old-slug rows remain - a safe no-op on every deploy after the
# first. `-r tsconfig-paths/register` is REQUIRED: it imports
# CITY_REGISTRY and the city-service registry from src/ to verify the
# rename lands on a route that actually serves. Do not drop it.
#
# If a guard trips it prints a loud banner and exits 0 ON PURPOSE -
# `script_stop: true` means a non-zero exit here would abort the build
# swap and pm2 reload below, turning a data question into an outage.
# Read the step output after a deploy; do not assume silence = applied.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/fix-brief-145-venetian-cillage-slug.ts commit
# Brief 145 (Track D): collapse `emergency_plumbing_page` back to the
# single row it is supposed to hold (7 on dev, flagged at 4 back in
# Brief 78) and install a UNIQUE INDEX on `(true)` so a second row
# becomes impossible. The duplicates came from seed-cms.ts's
# `ON CONFLICT DO NOTHING`, which is a no-op on the one CMS page table
# with no unique key - that insert is now `INSERT ... WHERE NOT EXISTS`.
# Backs all rows up to brief145_row_backup and REFUSES to delete if the
# rows differ on any content column (which would mean de-duplicating
# could change what /emergency-plumbing renders). Same exit-0 banner
# convention as the Track B step above.
npx ts-node --project tsconfig.scripts.json scripts/fix-brief-145-emergency-plumbing-dedupe.ts commit
# Brief 146 (Track A): port the APPROVED Gas Lines copy into the
# `gas-lines` sub_service_pages row. MUST run before the swap below,
# because that build repoints /gas-lines at SubServicePageView - onto
# this row. Brief 145 (D-4) found the row unfit to render (scraped
# WordPress nav-menu text in intro_body, empty problems/CTA fields), so
# shipping the route change without this would visibly degrade the page.
# TEXT ONLY - it never writes hero_image/f_image/f3_image, because
# marketing's CMS image uploads on that row are the whole point of the
# brief. It patches the `blocks` JSONB in place when the row has one
# (staging may; dev does not), first instance per type, images untouched.
# ONE-TIME: the backup row in brief146_row_backup is the applied-marker,
# so a later CMS edit to this copy is never re-clobbered by a deploy.
# `-r tsconfig-paths/register` is REQUIRED - it imports the shared
# sanitizer from src/. Same exit-0 banner convention as the steps above.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-146-gas-lines-content.ts commit
# Brief 146 (Track D) + Brief 148 (Track B): delete the phantom
# `gas-lines-chicago` sub_service_pages row (Brief 145 D-5; its URL 301s
# to /gas-lines so nothing on it can ever render) plus any orphan drafts
# for that slug.
#
# `--approved-id=48` is marketing's 2026-08-08 approval, carried as an
# argument rather than baked into the script. The content-divergence
# guard is BLOCKING again (Brief 147 had made it report-only for every
# future run to unstick this one delete); the flag answers it for this
# row only, and only because the row is unreachable behind the 301.
# Id 48 is the dev/Brief-145 serial - staging's may differ, and the
# script says so loudly and continues, because the selector is the slug.
# The delete can never touch id 26 (`gas-lines`, marketing's live copy
# and images): different slug, and the transaction rolls back unless
# exactly one row goes. Reports "already-applied" once the row is gone.
npx ts-node --project tsconfig.scripts.json scripts/fix-brief-146-delete-gas-lines-chicago.ts commit --approved-id=48
# Brief 147 (Track A): the Brief 146 content port did NOT reach staging -
# /gas-lines went live with no copy on it and marketing re-typed the
# approved text by hand on 2026-08-08. Their text is now the source of
# truth, but the page is still not whole: staging renders an EMPTY Final
# CTA heading and the fallback CTA photo, i.e. cta_heading/cta_body are
# blank (the section Brief 146 mapped into the Final CTA block).
#
# This step FILLS THE GAPS ONLY. A field is written when it is empty or
# still holds the identifiable pre-146 scraped-nav junk; anything an
# editor has typed - even a reworded version of the brief's copy - is
# reported and left alone. The three image columns are NEVER written and
# are asserted unchanged afterwards. If the row's `blocks` array has no
# instance for a section, one is inserted, because approved copy sitting
# in a column nothing reads is the exact failure this brief closes.
# Deliberately has NO applied-marker: it is a fill-the-gaps pass, not a
# one-time port, so it stays correct on every deploy and reports
# `ALREADY-APPLIED` once nothing is empty.
# `-r tsconfig-paths/register` is REQUIRED - it imports from src/.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/fix-brief-147-gas-lines-content-verify.ts commit
# Brief 147 (Track C): strip the duplicated "| J. Blanton Plumbing" out of
# stored CMS meta-titles. Brief 146 §6.1 already stops the DOUBLED <title>
# from rendering (pageTitle() normalizes at the boundary, and that stays) -
# this cleans the stored values so an editor opening the meta-title field
# no longer sees a redundant suffix and assume it is required.
# Trailing suffix only: a brand name mid-string is marketing copy and is
# left alone, and cms_articles.title (the visible H1) is reported, never
# rewritten. Does NOT bump version/updated_at - it changes no rendered
# output, so it must not move 200+ sitemap lastmods or invalidate the
# optimistic-lock token of an editor who has a page open. Idempotent:
# reports `ALREADY-APPLIED` once nothing ends in the suffix.
# `-r tsconfig-paths/register` is REQUIRED - it imports @/lib/seo.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/fix-brief-147-meta-title-suffix.ts commit
# Brief 149 (Tracks A + B): make `sub_service_pages` fit to render for
# /sewer-rodding (id 2) and /hydro-jetting (id 23) BEFORE the swap below
# repoints those routes at SubServicePageView. This ordering is the whole
# Brief 146 lesson - that release flipped /gas-lines onto a row nothing had
# filled and shipped a page with no copy on it.
#
# FILL-THE-GAPS, not a copy-over: a field already holding real content is
# kept. That matters here - staging's rows carry human-written copy that has
# never rendered (the Brief 145 D-1 "edits go into the void" symptom), and
# this brief exists to make it render, not to bulldoze it. Only empty fields
# and the four specifically identified junk values (problems_heading
# "aaaaaa", a paragraph pasted into problems_items, scraped WordPress nav
# text in intro_body, raw &#039; entities in meta_description) are written.
# It also INSERTS the three sections that had no block type until this brief
# (relatedServices + two textSection instances) at their historical
# positions - without them the flip would silently drop three sections.
# No applied-marker: a fill-the-gaps pass stays correct on every deploy and
# reports ALREADY-APPLIED once nothing is empty.
# `-r tsconfig-paths/register` is REQUIRED - it imports from src/.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-149-subservice-consolidation.ts commit
# Brief 149 (Tracks A + B, step 3): retire the now-unread
# `service_category_pages` rows 25 (sewer-rodding) and 24 (hydro-jetting),
# plus the 4 `service_subcategories` rows FK'd to them (the DB mirror of the
# "More ... Solutions" cards, which now live in the relatedServices block).
# Two editable records for one page is the confusion this brief ends.
# REFUSES unless the route is already repointed AND the sub_service_pages row
# is published, has a hero_heading, and carries every required block - i.e.
# it will not delete the old source until the new one demonstrably works.
# Must run AFTER the seed above. Same exit-0 banner convention.
npx ts-node --project tsconfig.scripts.json scripts/retire-brief-149-legacy-sources.ts commit
# Brief 149 (Track C): fill blank `city_pages` / `main_pages` meta_title and
# meta_description with the value each page renders today. The build above
# wires those fields into generateMetadata (they were editable and read by
# nothing); without this backfill an editor would open a city page and see an
# EMPTY SEO Title field with no way to know the page has a title at all.
# Only blank fields are written - never an editor's SEO copy - and the write
# is re-guarded on still-blank, so a concurrent save is not clobbered.
# Deliberately does NOT bump version/updated_at: the value written is the
# value already rendering, so it must not move 248 sitemap lastmods.
# Idempotent - reports ALREADY-APPLIED once nothing is blank.
# `-r tsconfig-paths/register` is REQUIRED - it imports from src/.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/backfill-brief-149-page-meta.ts commit
# Brief 155: strip a leaked content-outline label ("H1: ", "H2: ") off the
# FRONT of four CMS heading columns (city_pages.hero_heading_line1/2,
# city_service_pages.service_intro_heading/secondary_heading). A batch of
# south-suburbs copy was authored from a labelled outline and the label was
# pasted into the CMS field along with the copy, so the literal string
# "H1:" was rendering inside the visible <h1> on money pages like
# /tinley-park and /joliet/water-heater-repair.
# Schema-driven (information_schema), not a hard-coded id list, so it also
# catches anything that ships between the July scoping pass and this
# deploy. Every write is guarded on the exact old value (WHERE id = $1 AND
# col = $2), so a concurrent editor save is skipped, never clobbered - and
# version/updated_at are deliberately left untouched (see the Brief 155
# report for what was verified to support that). Idempotent: a field that
# no longer matches the leading-label pattern is never touched again, so
# this is a safe no-op on every deploy after the first.
npx ts-node --project tsconfig.scripts.json scripts/strip-leaked-heading-labels.ts commit
# -- Brief 159: the version-status model -------------------------------
# ORDER MATTERS and the two are a pair:
#   1. the MIGRATION adds `page_drafts.is_published` + its partial unique
#      index, and the derived `status` column on every live content table.
#      It asserts that ZERO rows land in 'draft' and fails if any do —
#      "nothing gets unpublished by this brief" is a hard rule, so it is
#      checked rather than assumed.
#   2. the SEED then answers, for every existing page, WHICH version is
#      live: it marks the most recently published version where there is
#      one, and otherwise snapshots the live row as "Version 1 — live".
#      Without it, every page would have a live row and no published
#      version — the exact drift the Track D invariant check reports.
# Both are idempotent and fill-gaps-only; on every deploy after the first
# they print ALREADY-APPLIED and touch nothing.
#
# `commit` is explicit per the Brief 147 rule: a pipeline step that omits
# it now EXITS NON-ZERO rather than silently dry-running.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
  scripts/migrate-brief-159-version-status.ts commit
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
  scripts/seed-brief-159-baseline-versions.ts commit
# -- Brief 100: septic language cleanup (Knowledge Hub) ---------------
# A prospect called sales to say the site "states that we pump out septic
# systems". We do not. Six published articles (ids 67, 111, 116, 124, 131,
# 168) carried copy that read as a septic OFFER rather than background -
# one hyperlinked "pumping" into our own ejector-pump guide, another said
# "a plumber can still retrieve it" about an item in a septic tank - on
# pages carrying booking CTAs.
#
# Content only: it rewrites `cms_articles.body.html` on exactly those six
# ids and nothing else. Every write is gated on the EXACT expected old
# string appearing exactly once and on the id AND slug both matching (ids
# are not portable between databases), backs the old value up to
# `brief100_septic_backup` first, and re-runs as a no-op reporting
# ALREADY-APPLIED - safe on every deploy.
#
# ORDER MATTERS: it runs AFTER the Brief 159 pair above. Under Brief 159
# an article's content lives in `cms_articles` AND in the `page_drafts`
# row with is_published = true; fixing only the first leaves the septic
# wording one "publish Version 1" click away from coming back. Running
# here means the version rows exist, so the script syncs both halves in
# one transaction.
#
# THE COPY CARRIES NO LICENSING OR REFERRAL CLAIM, deliberately (brief
# revision 2026-09-21). "Requires a licensed septic contractor, not a
# plumber" is false as an exclusivity claim - Illinois licenses septic
# pumping separately (225 ILCS 225) but a plumbing company may hold that
# licence too. The copy states only what we service.
#
# HARD RULE, and the reason a red step here is a CONTENT question and not
# a code one: the brief allows exactly 6 rows or none. If any row does not
# match (dev, staging and production legitimately hold different content),
# the whole transaction ROLLS BACK and the script prints a loud banner and
# exits 0 ON PURPOSE - a non-zero exit would trip `set -e` and abort the
# build swap and the pm2 reload below, turning a content question into an
# outage (the Brief 145 rule). Read the step output; the PIPELINE VERDICT
# line says APPLIED, ALREADY-APPLIED or NOT-APPLIED (guard tripped). Do
# not assume silence means applied.
#
# `-r tsconfig-paths/register` is REQUIRED: the script imports the shared
# sanitizer and changelog helper from src/. Do not drop it.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
  scripts/fix-brief-100-septic-language.ts commit
# -- Brief 160: city "We've got you covered" heading + section image ---
# ORDER MATTERS and the two are a pair, same shape as Brief 159 above:
#   1. the MIGRATION adds `city_pages.covered_heading` and
#      `covered_image`. Both are additive with a '' default and are
#      also in ensure-schema.ts, so this is normally a no-op that
#      reports ALREADY-APPLIED; it stays here so the column is
#      guaranteed present before the seed runs against it.
#   2. the SEED writes, into each coverage-area row, the exact
#      heading that row already renders ("WE'VE GOT YOU COVERED,
#      {City}", rebuilt from CITY_REGISTRY — not hand-typed). It is
#      fill-gaps-only and guarded on the value still being empty, so
#      it never overwrites a heading Marketing has edited and is a
#      no-op on every deploy after the first.
# Nothing on any page changes wording: an empty field renders the
# template literal, and the seed writes that same literal.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
  scripts/migrate-brief-160-city-covered-fields.ts commit
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
  scripts/seed-brief-160-covered-headings.ts commit
# -- Brief 179: city_pages.hero_video_url ----------------------------
# Additive, '' default, also in ensure-schema.ts, so this normally
# reports ALREADY-APPLIED. It ships AHEAD of the code that reads the
# column (Brief 179 hard rule 7 / the Brief 171 precedent): a failed
# deploy then leaves the DATABASE ahead of the app, not the app
# querying a column that does not exist. No seed — blank is the
# correct value on every row and means "render the hero image as a
# still", so no page changes on the strength of this migration.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
  scripts/migrate-brief-179-city-hero-video.ts commit
# Brief 147 (Track D) + Brief 158 (Track C): validate the database against
# what the checked-in code assumes, BEFORE the swap below.
#  - every sitemap <lastmod> source query runs against the real schema.
#    `safeQuery` swallows these at runtime by design, so a wrong column
#    name (city_pages.slug -> city_slug) shipped 248 city URLs with no
#    freshness signal for weeks with nothing but one server log line.
#  - every CITY_REGISTRY slug has a `city_pages` row. Without one, the
#    page is live and indexed and Marketing cannot edit a word of it -
#    the editor shows "No CMS content found" and its save path is
#    UPDATE-only, so it cannot create the row itself. That is how
#    Columbus shipped (Brief 157).
# Exits non-zero on either - a condition no deploy should carry - and
# exits 0 with a banner if the DB is simply unreachable.
# ORDER MATTERS: this runs AFTER the seed/backfill scripts above so the
# coverage assertion sees the state this deploy actually produced. Move it
# back above them and the deploy that creates a missing row aborts before
# creating it. It is still pre-swap, so a failure here leaves the previous
# build serving - nothing goes down.
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/verify-sitemap-queries.ts
# Brief 147 (Track A): print every DB script's verdict together. A
# `NOT-APPLIED` line here is the signal the Brief 146 release had no way
# to show - those scripts exit 0 when a guard trips ON PURPOSE (a non-zero
# exit would abort the swap below and take the site down over a content
# question), so silence never meant success. Read this block after a deploy.
echo ''
echo '===================== DB SCRIPT VERDICTS ====================='
if [ -f "$JBP_DEPLOY_VERDICTS" ]; then
  cat "$JBP_DEPLOY_VERDICTS"
  if grep -q 'NOT-APPLIED' "$JBP_DEPLOY_VERDICTS"; then
    echo ''
    echo 'NOTE: at least one script did NOT apply (see the lines above and'
    echo 'its own !!!! banner earlier in this log). This does not fail the'
    echo 'deploy - but it means a data change you expected did not happen.'
  fi
else
  echo '(no verdict file - no retrofitted script ran)'
fi
echo '=============================================================='
echo ''
# Swap the finished build into place - two renames, milliseconds of
# exposure instead of minutes. Then union the OLD build's static chunks
# into the new dir: filenames are content-hashed (never collide), and
# browsers holding pages rendered by the old process keep resolving
# their CSS/JS during the pm2 restart window instead of 404ing.
if [ -d .next ]; then mv .next .next-prev; fi
mv .next-build .next
if [ -d .next-prev/static ]; then cp -an .next-prev/static/. .next/static/ || true; fi
# `pm2 restart jblanton` silently no-ops if pm2 has never registered an
# app under that name - discovered 2026-07-28 when `pm2 list` on staging
# returned zero processes despite the site being up (it was running as a
# bare `next start`, started outside pm2, with nothing supervising it or
# restarting it on deploy). `startOrReload` against the checked-in
# ecosystem file registers the app the first time and reloads it on every
# deploy after that, so this step can never again quietly fail to apply
# new code. See ecosystem.config.js for the process definition.
# Brief 151: `startOrReload --update-env` provably did NOT push a
# changed .env.local into the running process — after the Brief 150
# secret rotation the live app kept validating sessions with the
# OLD CMS_SESSION_SECRET straight through a deploy (Brief 150 §7).
# pm2 re-injects its saved env snapshot at exec time and Next's env
# loader never overrides an already-set process var, so a stale
# snapshot silently defeats every .env.local change. The pattern
# proven on the live box is a hard restart with --update-env from a
# shell that has the new env loaded. Downtime is unchanged: the app
# runs in fork mode (ecosystem.config.js), where pm2's "reload" was
# a stop-then-start anyway. startOrRestart still registers the app
# on a first-ever deploy, same as startOrReload did.
#
# Re-source the env files IMMEDIATELY before the restart so this
# shell provably holds what .env.local holds right now — never rely
# on the sourcing further up this script surviving future edits.
for envfile in .env .env.production .env.local; do
  if [ -f "$envfile" ]; then set -a; . "./$envfile"; set +a; fi
done
pm2 startOrRestart ecosystem.config.js --update-env
# Refresh pm2's saved snapshot so a box reboot resurrects the
# process with the env it is running NOW — without this, the stale
# pre-rotation snapshot comes back on the next reboot.
pm2 save
rm -rf .next-prev
# Brief 151: prove the restart delivered .env.local to the process.
# Reads the live process environ and compares each sensitive var
# against the file. ⚠️ This repo is PUBLIC and these logs are
# world-readable: print var NAMES and MATCH/MISMATCH only, NEVER a
# value (same rule as the Brief 150 verify-secret phase this is
# lifted from). The sleep gives npm time to spawn the actual
# next-server child whose environ we read.
#
# ⚠️ SHAPE WARNING: this step runs with script_stop: true, which
# makes the transport insert an exit-code check AFTER EVERY LINE
# (drone-ssh scriptCommands). A multi-line `else` branch reached
# via a failed test is fatal: the injected check is the first
# statement of the branch and sees the test's $? of 1 — the exact
# mechanism that killed the health-check step for seven deploys
# (Brief 150 §8). So everything below keeps condition fallbacks on
# ONE line (atomic to the transport) and uses no multi-line `else`.
sleep 8
APP_PID=$(pgrep -f 'next-server' | head -1)
if [ -z "$APP_PID" ]; then APP_PID=$(pgrep -fo 'next start' | head -1); fi
echo ''
echo '================== PM2 ENV VERIFICATION =================='
ENV_MISMATCH=0
if [ -z "$APP_PID" ]; then echo 'ENV-VERIFY: SKIPPED - could not locate the next-server process. Not failing the deploy on a pgrep pattern - the health-check step below still gates on the site serving; if it is green, fix the pgrep patterns here.'; fi
if [ -n "$APP_PID" ]; then
  for var in CMS_SESSION_SECRET DATABASE_URL; do
    FILE_VAL=$(grep -E "^${var}=" .env.local | head -1 | cut -d= -f2-)
    PROC_VAL=$(sudo cat "/proc/${APP_PID}/environ" | tr '\0' '\n' | grep -E "^${var}=" | head -1 | cut -d= -f2-)
    # "Not in the exec env at all" counts as MATCH: it means the pm2
    # snapshot no longer carries the var, so Next reads it from
    # .env.local at boot - which is by definition the current value.
    VERDICT=''
    if [ -z "$FILE_VAL" ]; then VERDICT='not set in .env.local, skipped'; elif [ -z "$PROC_VAL" ]; then VERDICT='MATCH (not in exec env; process loads it from .env.local directly)'; elif [ "$FILE_VAL" = "$PROC_VAL" ]; then VERDICT='MATCH'; fi
    if [ -z "$VERDICT" ]; then VERDICT='MISMATCH (process is running a STALE value)'; ENV_MISMATCH=1; fi
    echo "ENV-VERIFY: ${var} - ${VERDICT}"
  done
fi
if [ "$ENV_MISMATCH" -eq 1 ]; then
  echo ''
  echo 'pm2 env verification FAILED: the restart did not deliver .env.local'
  echo 'to the process. The new BUILD is already serving - this red step'
  echo 'means at least one var named above is stale in the live process.'
  echo 'Fix on-box: load .env.local into a shell (set -a; . ./.env.local;'
  echo 'set +a) then: pm2 restart jblanton --update-env && pm2 save'
  exit 1
fi
echo '=========================================================='
