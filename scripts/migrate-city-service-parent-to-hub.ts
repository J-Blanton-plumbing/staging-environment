/**
 * Brief 64 — Re-parent city-service pages by SERVICE HUB.
 *
 * Changes the meaning of `city_service_pages.parent_slug` from the *broad category*
 * (Brief 63) to the *service hub slug* — the top-level `/{hub}` page for that service.
 * For a city-service page the hub is the top-level page of the SAME service slug
 * (`/algonquin/hydro-jetting` → hub `hydro-jetting`), so in almost all cases
 * `parent_slug = service_slug`. Three location-suffixed variants are the exception:
 * their live hub page lives at a `-chicago` / `-in-chicago` slug (see HUB_ALIAS),
 * so those map explicitly. `emergency-plumbing` is NO LONGER left NULL — it parents
 * to its own hub `emergency-plumbing`.
 *
 * The CATEGORY is now DERIVED (hub → sub_service_pages.parent_slug), not stored on
 * the city-service row. This script prints a derivation preview + final distribution
 * and flags any hub with no category in sub_service_pages.
 *
 * Idempotent: each UPDATE only touches rows where `parent_slug IS DISTINCT FROM $hub`,
 * so it is safe to re-run (a clean re-run reports 0 rows changed).
 *
 * This supersedes the DATA MODEL of scripts/migrate-city-service-parent-slugs.ts
 * (Brief 63), which is left in place for history.
 *
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/migrate-city-service-parent-to-hub.ts
 */
import * as fs from 'fs';

// --- env bootstrap: load .env.local if DATABASE_URL isn't already set ---------
if (!process.env.DATABASE_URL && fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
// db.ts builds its Pool from DATABASE_URL at import time — require it AFTER the env load.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pool = require('../src/lib/db').default as import('pg').Pool;

/**
 * city-service `service_slug` → live hub slug, for services whose top-level hub page
 * is a location-suffixed variant (there is no bare `/{service_slug}` hub). Mirrors
 * CITY_SLUG_TO_SUB_SLUG_ALIAS in scripts/copy-sub-service-parents-to-city.ts and
 * CITY_SLUG_TO_HUB_ALIAS in src/lib/content/service-taxonomy.ts.
 */
const HUB_ALIAS: Record<string, string> = {
  'bathroom-plumbing': 'bathroom-plumbing-chicago',
  'clogged-drains': 'clogged-drains-in-chicago',
  'drain-cleaning': 'drain-cleaning-services-in-chicago',
};

/** Fallback category map for hubs that have no row in sub_service_pages. */
const HUB_TO_CATEGORY_FALLBACK: Record<string, string> = {
  'emergency-plumbing': 'plumbing', // Brief 64 decision: Home › Plumbing › Emergency Plumbing
};

async function main() {
  const client = await pool.connect();
  try {
    // 0. Drop the Brief-63-era FK (parent_slug → service_category_pages.slug).
    //    Under Brief 64 parent_slug holds a SERVICE HUB slug, most of which have no
    //    row in service_category_pages (that table is the heavyweight content table
    //    for the 6 category landing pages, not a hub lookup). Referential integrity
    //    for parent_slug now lives in application code (the city-service PUT route
    //    validates against sub_service_pages ∪ the city-services registry). Idempotent.
    await client.query(
      `ALTER TABLE city_service_pages DROP CONSTRAINT IF EXISTS city_service_pages_parent_slug_fkey`
    );
    console.log('✓ Dropped FK city_service_pages_parent_slug_fkey (parent_slug is now a hub slug, app-validated).\n');

    // 1. Hub → category source of truth (sub_service_pages).
    const sub = await client.query<{ slug: string; parent_slug: string | null }>(
      `SELECT slug, parent_slug FROM sub_service_pages`
    );
    const subCategory = new Map<string, string | null>();
    for (const r of sub.rows) subCategory.set(r.slug, r.parent_slug);

    // 2. Distinct city-service slugs → their hub slug.
    const svc = await client.query<{ service_slug: string }>(
      `SELECT DISTINCT service_slug FROM city_service_pages ORDER BY service_slug`
    );
    const plan = svc.rows.map(({ service_slug }) => {
      const hub = HUB_ALIAS[service_slug] ?? service_slug;
      const category =
        subCategory.get(hub) ??
        subCategory.get(service_slug) ??
        HUB_TO_CATEGORY_FALLBACK[hub] ??
        null;
      const inSub = subCategory.has(hub) || subCategory.has(service_slug);
      return { service_slug, hub, category, aliased: hub !== service_slug, inSub };
    });

    // 3. Category-derivation preview.
    console.log('Category derivation preview (service_slug → hub → derived category):\n');
    for (const p of plan) {
      const via = p.aliased ? ` (alias)` : '';
      const cat = p.category ?? 'NO CATEGORY';
      console.log(`  ${p.service_slug.padEnd(40)}${p.hub.padEnd(40)}${via.padEnd(9)} ${cat}`);
    }

    const noCategory = plan.filter((p) => !p.category);
    const notInSub = plan.filter((p) => !p.inSub && !HUB_TO_CATEGORY_FALLBACK[p.hub]);
    if (noCategory.length) {
      console.warn('\n⚠ Hubs with NO derivable category (breadcrumb will fall back to keyword inference):');
      for (const p of noCategory) console.warn(`  ${p.service_slug} → ${p.hub}`);
    }
    if (notInSub.length) {
      console.warn(
        `\nℹ ${notInSub.length} hubs have no sub_service_pages row (category derived from the static taxonomy map instead — expected for un-authored hubs).`
      );
    }

    // 4. Apply — parent_slug = hub slug for every distinct service_slug.
    let totalRows = 0;
    console.log('\nApplying parent_slug = hub slug:\n');
    for (const p of plan) {
      const res = await client.query(
        `UPDATE city_service_pages
            SET parent_slug = $1
          WHERE service_slug = $2
            AND parent_slug IS DISTINCT FROM $1`,
        [p.hub, p.service_slug]
      );
      const n = res.rowCount ?? 0;
      totalRows += n;
      console.log(`  ${p.service_slug.padEnd(40)} → parent_slug=${p.hub.padEnd(40)} (${n} rows)`);
    }
    console.log(`\nDone. ${totalRows} city_service_pages rows updated across ${plan.length} service slugs.`);

    // 5. Verification — final distribution + any stale category-value left in parent_slug.
    const { rows: dist } = await client.query<{ parent_slug: string | null; n: string }>(
      `SELECT parent_slug, COUNT(*) AS n
         FROM city_service_pages
         GROUP BY parent_slug
         ORDER BY parent_slug NULLS FIRST`
    );
    console.log('\nFinal parent_slug distribution:');
    for (const r of dist) console.log(`  ${(r.parent_slug ?? 'NULL').padEnd(40)} ${r.n}`);

    // A parent_slug still equal to one of the 6 broad categories = a stale Brief 63 value.
    const CATEGORY_VALUES = ['plumbing', 'sewer', 'drain', 'water-heater', 'water-quality', 'commercial'];
    const stale = dist.filter((r) => r.parent_slug && CATEGORY_VALUES.includes(r.parent_slug));
    if (stale.length) {
      console.warn('\n⚠ Stale category values still in parent_slug (a service_slug may be unmapped):');
      for (const r of stale) console.warn(`  ${r.parent_slug} (${r.n})`);
    } else {
      console.log('\n✓ No stale category values remain — every row is parented by a hub slug.');
    }

    const { rows: nullRows } = await client.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM city_service_pages WHERE parent_slug IS NULL`
    );
    console.log(`\nNULL parent_slug rows: ${nullRows[0].n} (expected 0 — emergency now parents to emergency-plumbing).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
