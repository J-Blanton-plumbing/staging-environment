/**
 * setup-db.ts — Brief 101: one-command database setup.
 *
 * Builds the entire CMS database (schema + seed content) against the Postgres
 * instance identified by DATABASE_URL, by running every scripts/migrate-*.ts and
 * scripts/seed-*.ts script, once each, in the dependency order documented below.
 *
 * Every step is a fresh `ts-node` child process (matching how each script is
 * already documented/invoked individually) so a script's own `pool.end()` /
 * `process.exit()` calls can't affect the orchestrator, and a mid-run crash in
 * one script can't leave a dangling Postgres connection held by this process.
 *
 * Run:
 *   npm run db:setup
 *
 * Requires DATABASE_URL to be set (in the environment, or in .env.local — see
 * below). Every migrate- / seed- script falls back to a hardcoded local default
 * (postgres:jbp@localhost:5432/jbp_cms) if DATABASE_URL is unset, but this
 * orchestrator requires it explicitly so a misconfigured environment fails
 * loudly instead of silently touching the wrong database.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPENDENCY ORDER (why each step comes where it does)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Group A — Base CMS tables + users (must come first; everything else adds
 * columns to, or has an FK into, these tables):
 *   1.  seed-cms.ts                  creates+seeds global_content,
 *                                     service_category_pages, service_subcategories,
 *                                     emergency_plumbing_page, city_pages,
 *                                     city_service_pages
 *   2.  migrate-city-service-cms.ts   re-creates city_service_pages (IF NOT EXISTS —
 *                                     harmless no-op after step 1; included per the
 *                                     brief's "reference every migrate- / seed-
 *                                     script" requirement)
 *   3.  migrate-cms-users.ts          creates cms_users, page_changelog; ALTERs
 *                                     city_pages/emergency_plumbing_page/
 *                                     service_category_pages (needs step 1); seeds
 *                                     the default admin user
 *   4.  migrate-main-pages.ts         creates main_pages
 *   5.  seed-main-pages.ts            creates main_pages IF NOT EXISTS + seeds rows
 *   6.  migrate-brief-45.ts           creates cms_articles + sub_service_pages
 *                                     (FK → cms_users, needs step 3); ALTERs
 *                                     service_category_pages/city_pages/
 *                                     city_service_pages (needs step 1)
 *   7.  migrate-drafts.ts             creates page_drafts (FK → cms_users, step 3)
 *   8.  migrate-global-settings.ts    creates+seeds global_settings
 *   9.  migrate-city-v2.ts            ALTERs city_pages/page_drafts/global_settings
 *                                     (needs steps 1, 7, 8)
 *   10. migrate-template-switching.ts ALTERs city_pages, creates
 *                                     template_switch_archive (FK → cms_users)
 *   11. migrate-meta-fields.ts        ALTERs city_pages/service_category_pages/
 *                                     city_service_pages/emergency_plumbing_page,
 *                                     creates page_archives
 *   12. migrate-articles-fields.ts    ALTERs cms_articles (needs step 6; FK → cms_users)
 *   13. migrate-page-types.ts         stamps main_pages.page_type for the 4 utility
 *                                     pages (needs step 5's rows)
 *   14. migrate-page-types-brief66.ts stamps the remaining main_pages rows (needs
 *                                     step 5; run after step 13 per its own docstring)
 *
 * Group B — sub_service_pages / city_service_pages structural columns (need the
 * tables from Group A, but not yet any imported content):
 *   15. migrate-sub-service-parent.ts        adds parent_slug (FK → service_category_pages)
 *   16. migrate-sub-service-images.ts        adds hero_image
 *   17. migrate-sub-service-ndc.ts            adds ndc_title/ndc_body
 *   18. migrate-sub-service-section-images.ts adds f_image/f3_image
 *   19. migrate-sub-service-status.ts         adds status
 *   20. migrate-city-service-parent.ts        adds parent_slug (FK → service_category_pages)
 *
 * Group C — WordPress content import. ⚠ Requires the WP XML export file at the
 * hardcoded path baked into these 5 scripts (see XML_PATH below) — a local-machine
 * path, not something a fresh staging/production box will have. If the file isn't
 * present this whole group is SKIPPED with a warning (not a fatal error) so the
 * rest of the schema still gets built; see the report for what to do about it.
 *   21. migrate-wp-cities.ts         city_pages coverage-area rows (needs step 1's table)
 *   22. migrate-wp-city-registry.ts  reads step 21's rows; also runs `npm run build`
 *                                    as part of its own verification step
 *   23. migrate-wp-city-services.ts  city_service_pages rows (cross-references city
 *                                     slugs from step 21/22)
 *   24. migrate-wp-sub-services.ts   sub_service_pages rows (reads service_subcategories
 *                                    from step 1 to find target slugs)
 *   25. migrate-wp-articles.ts       cms_articles rows (needs step 6's table)
 *
 * Group D — derived parent/category backfills (most useful once Group C has
 * loaded real city-service/sub-service rows, but idempotent either way):
 *   26. migrate-city-service-parent-slugs.ts   Brief 63 category backfill (superseded
 *                                              by 27 but kept for history/idempotency)
 *   27. migrate-city-service-parent-to-hub.ts  Brief 64 re-parent to hub slug + drop FK
 *   28. seed-sub-service-parents.ts            best-effort parent_slug for known slugs
 *   29. seed-city-service-parents.ts           safety-net backfill via deriveCategory
 *
 * Group E — JSONB "blocks" model migrations (fold named columns into blocks; must
 * run after Groups B/C so there's real content to fold):
 *   30. migrate-brief-89-blocks.ts              sub_service_pages.blocks (backfill)
 *   31. migrate-brief-90-block-content.ts       reshape blocks to {id,type,data}
 *   32. migrate-brief-98-subcategories-to-blocks.ts  service_category_pages.blocks
 *                                                     (needs `commit` arg — see below)
 *   33. seed-city-v2.ts                         algonquin/elgin → local-office-v2 rows
 *                                                (needs step 9's V2 columns)
 *   34. migrate-brief-99-city-v2-blocks.ts      city_pages.blocks for V2 rows (needs
 *                                                step 33's rows; needs `commit` arg)
 *
 * Group F — final snapshots / safety columns (need everything above to exist):
 *   35. seed-subservice-version-1.ts    snapshots sub_service_pages into page_drafts
 *                                       (needs steps 3, 7, 24)
 *   36. migrate-draft-publish-safety.ts version columns on every content table +
 *                                       main_pages/sub_service_pages (needs all of
 *                                       the above); reclassifies drafts created by
 *                                       step 35, so it must run last
 *
 * migrate-brief-98-subcategories-to-blocks.ts and migrate-brief-99-city-v2-blocks.ts
 * are dry-run-by-default (they preview + back up before writing); this script passes
 * `commit` explicitly so db:setup actually writes on a fresh database.
 *
 * ── Known non-idempotency in four inherited scripts (steps 30–32, 34) ────────
 * All four JSONB "blocks" migrations — migrate-brief-89-blocks.ts,
 * migrate-brief-90-block-content.ts, migrate-brief-98-subcategories-to-blocks.ts,
 * and migrate-brief-99-city-v2-blocks.ts — finish with an unconditional parity
 * check across EVERY row (or, for 98, every service-category page): it re-derives
 * what `blocks` "should" contain from the current named/relational columns and
 * exits non-zero if any row has since diverged — e.g. an editor changed that
 * page's copy, or added a subcategory, through the CMS after `blocks` was first
 * populated. This check runs even when the migration itself made no changes (all
 * rows already migrated, correctly skipped). Confirmed by two live runs against
 * this project's dev database: migrate-brief-89/90 failed on sub-service pages
 * edited after their original migration, and migrate-brief-98 failed because the
 * "plumbing" category page has 5 live subcategories vs. 4 baked into `blocks`.
 * On a brand-new database this can't fire on the first run, but it WILL fire on
 * a later re-run of db:setup once the CMS has been used — which is exactly the
 * "idempotent — safe to run twice" case Brief 101 requires. The public read path
 * already tolerates a NULL/absent `blocks` value by assembling it live from the
 * source columns (see src/lib/cms/sub-service-pages.ts:175-180), so this parity
 * check is a content-drift audit, not a signal that the schema/data build failed.
 * This script treats all four steps as SOFT — a non-zero exit is logged as a
 * warning and the run continues — while every other step still fails loudly and
 * stops the run.
 */

import { existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import * as path from 'path';

// ── env bootstrap: load .env.local if DATABASE_URL isn't already set ─────────
if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    '\n✗ DATABASE_URL is not set (checked process.env and .env.local).\n' +
      '  Set it before running db:setup, e.g.:\n' +
      '    DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/jbp_cms npm run db:setup\n'
  );
  process.exit(1);
}

// Same literal path the 5 WP-import scripts hardcode — used here only to decide
// whether Group C can run, never to alter those scripts.
const WP_XML_PATH =
  'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration/jblantonplumbing.WordPress.2026-06-26.xml';
const WP_XML_AVAILABLE = existsSync(WP_XML_PATH);

interface Step {
  label: string;
  file: string;
  args?: string[];
  group: string;
  requiresWpXml?: boolean;
  /** Non-zero exit is logged as a warning and the run continues (see header comment). */
  soft?: boolean;
}

const STEPS: Step[] = [
  // Group A
  { group: 'A', label: 'seed-cms', file: 'seed-cms.ts' },
  { group: 'A', label: 'migrate-city-service-cms', file: 'migrate-city-service-cms.ts' },
  { group: 'A', label: 'migrate-cms-users', file: 'migrate-cms-users.ts' },
  { group: 'A', label: 'migrate-main-pages', file: 'migrate-main-pages.ts' },
  { group: 'A', label: 'seed-main-pages', file: 'seed-main-pages.ts' },
  { group: 'A', label: 'migrate-brief-45', file: 'migrate-brief-45.ts' },
  { group: 'A', label: 'migrate-drafts', file: 'migrate-drafts.ts' },
  { group: 'A', label: 'migrate-global-settings', file: 'migrate-global-settings.ts' },
  { group: 'A', label: 'migrate-city-v2', file: 'migrate-city-v2.ts' },
  { group: 'A', label: 'migrate-template-switching', file: 'migrate-template-switching.ts' },
  { group: 'A', label: 'migrate-meta-fields', file: 'migrate-meta-fields.ts' },
  { group: 'A', label: 'migrate-articles-fields', file: 'migrate-articles-fields.ts' },
  { group: 'A', label: 'migrate-page-types', file: 'migrate-page-types.ts' },
  { group: 'A', label: 'migrate-page-types-brief66', file: 'migrate-page-types-brief66.ts' },

  // Group B
  { group: 'B', label: 'migrate-sub-service-parent', file: 'migrate-sub-service-parent.ts' },
  { group: 'B', label: 'migrate-sub-service-images', file: 'migrate-sub-service-images.ts' },
  { group: 'B', label: 'migrate-sub-service-ndc', file: 'migrate-sub-service-ndc.ts' },
  { group: 'B', label: 'migrate-sub-service-section-images', file: 'migrate-sub-service-section-images.ts' },
  { group: 'B', label: 'migrate-sub-service-status', file: 'migrate-sub-service-status.ts' },
  { group: 'B', label: 'migrate-city-service-parent', file: 'migrate-city-service-parent.ts' },

  // Group C — WordPress import (needs WP_XML_PATH on disk)
  { group: 'C', label: 'migrate-wp-cities', file: 'migrate-wp-cities.ts', requiresWpXml: true },
  { group: 'C', label: 'migrate-wp-city-registry', file: 'migrate-wp-city-registry.ts', requiresWpXml: true },
  { group: 'C', label: 'migrate-wp-city-services', file: 'migrate-wp-city-services.ts', requiresWpXml: true },
  { group: 'C', label: 'migrate-wp-sub-services', file: 'migrate-wp-sub-services.ts', requiresWpXml: true },
  { group: 'C', label: 'migrate-wp-articles', file: 'migrate-wp-articles.ts', requiresWpXml: true },

  // Group D
  { group: 'D', label: 'migrate-city-service-parent-slugs', file: 'migrate-city-service-parent-slugs.ts' },
  { group: 'D', label: 'migrate-city-service-parent-to-hub', file: 'migrate-city-service-parent-to-hub.ts' },
  { group: 'D', label: 'seed-sub-service-parents', file: 'seed-sub-service-parents.ts' },
  { group: 'D', label: 'seed-city-service-parents', file: 'seed-city-service-parents.ts' },

  // Group E
  { group: 'E', label: 'migrate-brief-89-blocks', file: 'migrate-brief-89-blocks.ts', soft: true },
  { group: 'E', label: 'migrate-brief-90-block-content', file: 'migrate-brief-90-block-content.ts', soft: true },
  {
    group: 'E',
    label: 'migrate-brief-98-subcategories-to-blocks',
    file: 'migrate-brief-98-subcategories-to-blocks.ts',
    args: ['commit'],
    soft: true,
  },
  { group: 'E', label: 'seed-city-v2', file: 'seed-city-v2.ts' },
  {
    group: 'E',
    soft: true,
    label: 'migrate-brief-99-city-v2-blocks',
    file: 'migrate-brief-99-city-v2-blocks.ts',
    args: ['commit'],
  },

  // Group F
  { group: 'F', label: 'seed-subservice-version-1', file: 'seed-subservice-version-1.ts' },
  { group: 'F', label: 'migrate-draft-publish-safety', file: 'migrate-draft-publish-safety.ts' },
  // Brief 119 — invite-based user creation (needs cms_users from step 3)
  { group: 'F', label: 'migrate-invite-users', file: 'migrate-invite-users.ts' },
  // Brief 126 — clear dead WordPress image URLs from city_pages.hero_image and
  // city_service_pages.service_intro_image so the code fallback applies. Must
  // run after Group C's WP import (the source of those values). Idempotent.
  { group: 'F', label: 'migrate-brief-126-clear-wp-image-refs', file: 'migrate-brief-126-clear-wp-image-refs.ts' },
];

/** Returns true if the step's own script reported success (exit code 0). */
function runStep(step: Step): boolean {
  const scriptPath = path.join('scripts', step.file);
  console.log(`\n▶ [${step.group}] ${step.label}`);
  const result = spawnSync(
    'npx',
    ['ts-node', '--project', 'tsconfig.scripts.json', '-r', 'tsconfig-paths/register', scriptPath, ...(step.args ?? [])],
    { stdio: 'inherit', env: process.env, shell: true }
  );

  const failed = Boolean(result.error) || (result.status ?? 1) !== 0;
  if (!failed) return true;

  if (step.soft) {
    console.warn(
      `\n⚠ [${step.group}] ${step.label} reported a non-zero exit — treated as a warning, not fatal ` +
        '(see the "Known non-idempotency" note at the top of this file). Continuing.'
    );
    if (result.error) console.warn(result.error);
    return false;
  }

  console.error(`\n✗ db:setup failed at step "${step.label}" (${scriptPath}).`);
  if (result.error) console.error(result.error);
  process.exit(result.status ?? 1);
}

async function main() {
  console.log('db:setup — building CMS database from migrations + seeds\n');
  console.log(`Target: ${process.env.DATABASE_URL!.replace(/:[^:@]*@/, ':***@')}`);

  if (!WP_XML_AVAILABLE) {
    console.warn(
      `\n⚠ WordPress XML export not found at:\n  ${WP_XML_PATH}\n` +
        '  Skipping Group C (WordPress content import — 5 steps). Schema and all\n' +
        '  non-WP seed content will still be built. See the implementation report\n' +
        '  for how to bring the imported content over to this database.\n'
    );
  }

  let ran = 0;
  let skipped = 0;
  let warned = 0;

  for (const step of STEPS) {
    if (step.requiresWpXml && !WP_XML_AVAILABLE) {
      console.log(`\n⏭  [${step.group}] ${step.label} — skipped (no WP XML export on disk)`);
      skipped++;
      continue;
    }
    const ok = runStep(step);
    ran++;
    if (!ok) warned++;
  }

  console.log(`\n✓ db:setup complete. ${ran} step(s) ran (${warned} warned), ${skipped} skipped.\n`);
}

main();
