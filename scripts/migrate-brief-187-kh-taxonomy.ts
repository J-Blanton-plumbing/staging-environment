/**
 * Brief 187 (Track A) — the Knowledge Hub taxonomy: `kh_terms` + `cms_article_terms`.
 *
 * Two groups of terms, one table:
 *   • topic     — the 9 editorial topics (Sewers … Company News). An article has
 *                 at most ONE primary topic and up to 2 secondary ones.
 *   • location  — the two service regions plus every city in `CITY_REGISTRY`,
 *                 each city parented to its region. A city tag implies its
 *                 region AT QUERY TIME (src/lib/cms/kh-taxonomy.ts); the region
 *                 is never stored redundantly on the article.
 *
 * ── SHIPPING ORDER ──────────────────────────────────────────────────────────
 * deploy.sh runs DB migrations BEFORE the build swap, so this lands while the
 * OLD code is still serving. It is therefore ADDITIVE ONLY: two new tables,
 * their indexes, and seed rows. Nothing is renamed, dropped or rewritten, and no
 * existing table is touched — `cms_articles.category` (the legacy text[]) is
 * deliberately left exactly as it is (Brief 187 hard rule).
 *
 * ── SEED RULE: FILL GAPS, NEVER OVERWRITE ───────────────────────────────────
 * Rows are keyed on (type, slug) and inserted `ON CONFLICT DO NOTHING`, so an
 * existing row's name, intro, meta fields and "Show in Google" switch are never
 * touched — those belong to Marketing from the moment the row exists. The only
 * UPDATEs fill a NULL `parent_id` / `registry_slug` on a location row (a gap,
 * never an edited value).
 *
 * The location list is DERIVED, never typed: regions from `REGIONS` in
 * `src/lib/content/locations-regions.ts`, cities from `CHICAGOLAND_CITIES` /
 * `OHIO_CITIES` (which are themselves `CITY_REGISTRY` filtered by state). A city
 * registered later appears here on the next deploy.
 *
 * ── CONTENT STATE NEVER FAILS A DEPLOY (Brief 186) ──────────────────────────
 * Exit non-zero ONLY for a code/schema fault: a table/index missing after the
 * run, or an SQL error. Nothing an editor can do from /admin (renaming a term,
 * flipping a switch, tagging or untagging) can make this script fail.
 *
 * ── MODES ───────────────────────────────────────────────────────────────────
 * Applies BY DEFAULT (Brief 187: "applies by default, not dry-run"). `commit` is
 * accepted and is what deploy.sh passes, for symmetry with every other step.
 * `--dry-run` runs the whole thing inside a transaction and ROLLS BACK, so the
 * preview counts are the real ones.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-187-kh-taxonomy.ts commit
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-187-kh-taxonomy.ts --dry-run
 *
 * `-r tsconfig-paths/register` is REQUIRED: the city list is imported from src/.
 */
import { existsSync, readFileSync } from 'fs';
import { Pool, PoolClient } from 'pg';
import { verdict } from './lib/run-mode';
import { CHICAGOLAND_CITIES, OHIO_CITIES, REGIONS } from '../src/lib/content/locations-regions';
import { KH_TOPIC_SEED } from '../src/lib/cms/kh-taxonomy-types';

const SCRIPT = 'migrate-brief-187-kh-taxonomy';
const argv = process.argv.slice(2);
const DRY = argv.some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const DDL = [
  `CREATE TABLE IF NOT EXISTS kh_terms (
     id               SERIAL PRIMARY KEY,
     type             TEXT NOT NULL CHECK (type IN ('topic', 'location')),
     slug             TEXT NOT NULL,
     name             TEXT NOT NULL,
     parent_id        INTEGER NULL REFERENCES kh_terms(id) ON DELETE SET NULL,
     registry_slug    TEXT NULL,
     intro_html       TEXT NOT NULL DEFAULT '',
     meta_title       TEXT NULL,
     meta_description TEXT NULL,
     indexable        BOOLEAN NOT NULL,
     sort_order       INTEGER NOT NULL DEFAULT 0,
     created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     CONSTRAINT kh_terms_type_slug_key UNIQUE (type, slug)
   )`,
  `CREATE INDEX IF NOT EXISTS kh_terms_parent_idx ON kh_terms (parent_id)`,
  `CREATE INDEX IF NOT EXISTS kh_terms_registry_slug_idx ON kh_terms (registry_slug)`,
  `CREATE TABLE IF NOT EXISTS cms_article_terms (
     article_id INTEGER NOT NULL REFERENCES cms_articles(id) ON DELETE CASCADE,
     term_id    INTEGER NOT NULL REFERENCES kh_terms(id) ON DELETE CASCADE,
     is_primary BOOLEAN NOT NULL DEFAULT FALSE,
     PRIMARY KEY (article_id, term_id)
   )`,
  // "At most one primary topic per article." Only topic rows are ever written
  // with is_primary = true (the article writer and the Stop 2 apply script both
  // enforce it), so one primary row per article IS one primary topic per article.
  `CREATE UNIQUE INDEX IF NOT EXISTS cms_article_terms_one_primary
     ON cms_article_terms (article_id) WHERE is_primary`,
  `CREATE INDEX IF NOT EXISTS cms_article_terms_term_idx ON cms_article_terms (term_id)`,
];

async function tableExists(c: PoolClient, name: string): Promise<boolean> {
  const r = await c.query(`SELECT to_regclass($1) AS t`, [name]);
  return r.rows[0].t !== null;
}
async function indexExists(c: PoolClient, name: string): Promise<boolean> {
  const r = await c.query(`SELECT 1 FROM pg_indexes WHERE indexname = $1`, [name]);
  return (r.rowCount ?? 0) > 0;
}

async function insertTerm(
  c: PoolClient,
  t: { type: 'topic' | 'location'; slug: string; name: string; parentId: number | null; registrySlug: string | null; indexable: boolean; sortOrder: number }
): Promise<boolean> {
  const r = await c.query(
    `INSERT INTO kh_terms (type, slug, name, parent_id, registry_slug, indexable, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (type, slug) DO NOTHING`,
    [t.type, t.slug, t.name, t.parentId, t.registrySlug, t.indexable, t.sortOrder]
  );
  return (r.rowCount ?? 0) > 0;
}

async function main() {
  console.log(`MODE: ${DRY ? 'DRY RUN (transaction rolled back at the end)' : 'APPLY'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    await c.query('BEGIN');

    // ── Schema ────────────────────────────────────────────────────────────────
    const hadTerms = await tableExists(c, 'kh_terms');
    const hadJoin = await tableExists(c, 'cms_article_terms');
    for (const sql of DDL) await c.query(sql);
    console.log(`── Schema ──`);
    console.log(`  ${hadTerms ? '=' : '+'} kh_terms`);
    console.log(`  ${hadJoin ? '=' : '+'} cms_article_terms`);

    // ── Topics ────────────────────────────────────────────────────────────────
    let topicsAdded = 0;
    for (const [i, t] of KH_TOPIC_SEED.entries()) {
      if (await insertTerm(c, { type: 'topic', slug: t.slug, name: t.name, parentId: null, registrySlug: null, indexable: true, sortOrder: i + 1 })) topicsAdded++;
    }

    // ── Regions ───────────────────────────────────────────────────────────────
    // The region slug is the last segment of its /locations/{slug} page, so the
    // area page's "services" link is `/locations/{registry_slug}`.
    let regionsAdded = 0;
    const regionIds = new Map<string, number>();
    for (const [i, r] of REGIONS.entries()) {
      const slug = r.href.split('/').filter(Boolean).pop()!;
      if (await insertTerm(c, { type: 'location', slug, name: r.label, parentId: null, registrySlug: slug, indexable: false, sortOrder: i + 1 })) regionsAdded++;
      const row = await c.query(`SELECT id FROM kh_terms WHERE type = 'location' AND slug = $1`, [slug]);
      regionIds.set(r.key, row.rows[0].id);
    }

    // ── Cities ────────────────────────────────────────────────────────────────
    let citiesAdded = 0;
    let gapsFilled = 0;
    const groups: Array<[string, readonly { slug: string; name: string }[]]> = [
      ['chicagoland', CHICAGOLAND_CITIES],
      ['columbus', OHIO_CITIES],
    ];
    const regionSlugs = new Set(REGIONS.map((r) => r.href.split('/').filter(Boolean).pop()!));
    const collisions: string[] = [];
    for (const [key, cities] of groups) {
      const parentId = regionIds.get(key)!;
      for (const [i, city] of cities.entries()) {
        if (regionSlugs.has(city.slug)) { collisions.push(city.slug); continue; }
        if (await insertTerm(c, { type: 'location', slug: city.slug, name: city.name, parentId, registrySlug: city.slug, indexable: false, sortOrder: i + 1 })) {
          citiesAdded++;
        } else {
          // Fill-gaps only: a NULL parent / registry link is a gap, never an edit.
          const u = await c.query(
            `UPDATE kh_terms
                SET parent_id = COALESCE(parent_id, $2),
                    registry_slug = COALESCE(registry_slug, $1),
                    updated_at = NOW()
              WHERE type = 'location' AND slug = $1 AND (parent_id IS NULL OR registry_slug IS NULL)`,
            [city.slug, parentId]
          );
          gapsFilled += u.rowCount ?? 0;
        }
      }
    }

    // ── Post-state (schema assertions only) ───────────────────────────────────
    const missing: string[] = [];
    if (!(await tableExists(c, 'kh_terms'))) missing.push('kh_terms');
    if (!(await tableExists(c, 'cms_article_terms'))) missing.push('cms_article_terms');
    if (!(await indexExists(c, 'cms_article_terms_one_primary'))) missing.push('cms_article_terms_one_primary');
    if (missing.length) {
      throw new Error(`schema missing after migration: ${missing.join(', ')}`);
    }

    const counts = await c.query(
      `SELECT
         count(*) FILTER (WHERE type = 'topic')                             AS topics,
         count(*) FILTER (WHERE type = 'location' AND parent_id IS NULL)    AS regions,
         count(*) FILTER (WHERE type = 'location' AND parent_id IS NOT NULL) AS cities,
         (SELECT count(*) FROM cms_article_terms)                           AS links
       FROM kh_terms`
    );
    const k = counts.rows[0];
    const expectedCities = CHICAGOLAND_CITIES.length + OHIO_CITIES.length - collisions.length;

    console.log(`\n── Seed (fill-gaps; existing rows untouched) ──`);
    console.log(`  topics   +${topicsAdded}  (table now holds ${k.topics}; expected ${KH_TOPIC_SEED.length})`);
    console.log(`  regions  +${regionsAdded}  (table now holds ${k.regions}; expected ${REGIONS.length})`);
    console.log(`  cities   +${citiesAdded}  (table now holds ${k.cities}; registry has ${expectedCities}: ` +
      `${CHICAGOLAND_CITIES.length} Chicagoland + ${OHIO_CITIES.length} Central Ohio)`);
    if (gapsFilled) console.log(`  filled a NULL parent/registry link on ${gapsFilled} existing city row(s)`);
    if (collisions.length) {
      console.log(`  ! skipped ${collisions.length} city slug(s) equal to a region slug: ${collisions.join(', ')}`);
    }
    console.log(`  article↔term links: ${k.links} (this migration writes none — Brief 187 hard rule)`);
    // Reported, never asserted: an editor can legitimately rename / re-tag.
    if (Number(k.cities) < expectedCities) {
      console.log(`  NOTE: fewer city rows than registry cities — reported only, not a failure.`);
    }

    const changed = topicsAdded + regionsAdded + citiesAdded + gapsFilled > 0 || !hadTerms || !hadJoin;
    if (DRY) {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back, nothing written)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', changed ? 'changes previewed' : 'nothing to do');
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(
      SCRIPT,
      changed ? 'APPLIED' : 'ALREADY-APPLIED',
      `topics +${topicsAdded}, regions +${regionsAdded}, cities +${citiesAdded}` + (gapsFilled ? `, gaps filled ${gapsFilled}` : '')
    );
  } catch (err) {
    if (!committed) await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

main()
  .catch((err) => {
    console.error(err);
    verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
