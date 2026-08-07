import { cache } from 'react';
import pool from '@/lib/db';
import { normalizePath } from '@/lib/seo';

/**
 * Per-page canonical override lookup (Brief 127, Track A.3; fixed in Brief 144).
 *
 * Every CMS page table carries an optional `canonical_url` column (provisioned
 * by scripts/ensure-schema.ts). When a row has a non-blank value, that URL is
 * rendered as the page's <link rel="canonical"> instead of the self-referencing
 * default built in the root layout. The field is an edge-case escape hatch and
 * is expected to be blank everywhere in normal operation, so this query
 * typically returns zero rows.
 *
 * Resolution is centralized here (keyed by normalized route path) rather than
 * threaded through every page's generateMetadata, so the root layout can apply
 * overrides for all page types in one place. `cache()` dedupes to one lookup
 * per request; a DB error degrades to "no overrides" — the site never breaks
 * over this feature.
 *
 * BRIEF 144 — why this is structured as one query plus a per-table retry:
 * the original implementation was a single seven-arm UNION in which the
 * `city_pages` arm selected a `slug` column that does not exist (the column is
 * `city_slug`). Postgres rejects the whole statement when any arm is invalid,
 * so ONE bad arm silently killed overrides for all seven tables and the feature
 * never worked in any environment. The fast path is still a single round trip;
 * when it fails, each table is retried on its own so a broken arm costs only
 * that table's overrides and logs a line that names the table and the
 * underlying database error.
 */

/**
 * One arm per CMS page table. `sql` must return (path, canonical_url) rows and
 * must be valid standalone — it is executed both inside the combined UNION and
 * by itself on the retry path.
 *
 * The path expressions mirror the routes the app actually serves (verified
 * against src/app in Brief 144):
 *   main_pages              → '/' for slug 'home', else '/{slug}'
 *   service_category_pages  → '/services/{slug}'
 *   sub_service_pages       → '/{slug}'            (top-level static routes)
 *   city_pages              → '/{city_slug}'       (the [city] route)
 *   city_service_pages      → '/{city_slug}/{service_slug}'
 *   cms_articles            → '/knowledge-hub/{slug}'
 *   emergency_plumbing_page → '/emergency-plumbing' (singleton page)
 */
const ARMS: ReadonlyArray<{ table: string; sql: string }> = [
  {
    table: 'main_pages',
    sql: `SELECT CASE WHEN slug = 'home' THEN '/' ELSE '/' || slug END AS path, canonical_url
            FROM main_pages
           WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''`,
  },
  {
    table: 'service_category_pages',
    sql: `SELECT '/services/' || slug AS path, canonical_url
            FROM service_category_pages
           WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''`,
  },
  {
    table: 'sub_service_pages',
    sql: `SELECT '/' || slug AS path, canonical_url
            FROM sub_service_pages
           WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''`,
  },
  {
    // The column is `city_slug`, not `slug` — this is the arm that was broken.
    table: 'city_pages',
    sql: `SELECT '/' || city_slug AS path, canonical_url
            FROM city_pages
           WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''`,
  },
  {
    table: 'city_service_pages',
    sql: `SELECT '/' || city_slug || '/' || service_slug AS path, canonical_url
            FROM city_service_pages
           WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''`,
  },
  {
    table: 'cms_articles',
    sql: `SELECT '/knowledge-hub/' || slug AS path, canonical_url
            FROM cms_articles
           WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''`,
  },
  {
    // Singleton page whose table holds several near-identical rows (7 on
    // staging today). Its writer UPDATEs every row and its reader takes an
    // unordered `LIMIT 1`, so any row is as authoritative as any other —
    // `ORDER BY id` just makes the choice here deterministic. Parenthesized so
    // the ORDER BY/LIMIT binds to this arm and not to the whole UNION.
    table: 'emergency_plumbing_page',
    sql: `(SELECT '/emergency-plumbing' AS path, canonical_url
             FROM emergency_plumbing_page
            WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''
            ORDER BY id
            LIMIT 1)`,
  },
];

const COMBINED_SQL = ARMS.map(a => a.sql).join('\nUNION ALL\n');

type OverrideRow = { path: string; canonical_url: string };

/** Postgres errors carry the useful detail on `.message`; keep it short. */
function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Fold rows into the map. First arm to claim a path wins, so a duplicate
 * path across tables resolves deterministically (arm order above) instead of
 * depending on row order; a conflicting duplicate is logged because it means
 * two CMS rows are fighting over one route.
 */
function collect(map: Map<string, string>, rows: OverrideRow[], table: string): void {
  for (const row of rows) {
    const path = normalizePath(row.path);
    const value = row.canonical_url.trim();
    const existing = map.get(path);
    if (existing !== undefined) {
      if (existing !== value) {
        console.warn(
          `[canonical-overrides] duplicate override for "${path}": keeping "${existing}", ` +
            `ignoring "${value}" from ${table}.`
        );
      }
      continue;
    }
    map.set(path, value);
  }
}

export const getCanonicalOverridesCached = cache(
  async (): Promise<Map<string, string>> => {
    const map = new Map<string, string>();

    // Fast path — one round trip for all seven tables.
    try {
      const res = await pool.query<OverrideRow>(COMBINED_SQL);
      collect(map, res.rows, 'combined');
      return map;
    } catch (err) {
      console.error(
        `[canonical-overrides] combined lookup failed (${describe(err)}); ` +
          `retrying each table separately so healthy tables still apply.`
      );
    }

    // Degraded path — isolate the failure so one bad table costs only its own
    // overrides. Runs at most once per request thanks to cache().
    const results = await Promise.all(
      ARMS.map(async arm => {
        try {
          const res = await pool.query<OverrideRow>(arm.sql);
          return { table: arm.table, rows: res.rows };
        } catch (err) {
          console.error(
            `[canonical-overrides] table "${arm.table}" FAILED — its canonical ` +
              `overrides will NOT be applied on this request: ${describe(err)}`
          );
          return null;
        }
      })
    );

    let ok = 0;
    for (const result of results) {
      if (!result) continue;
      ok++;
      collect(map, result.rows, result.table);
    }
    if (ok === 0) {
      console.error(
        '[canonical-overrides] every table failed — no overrides applied. ' +
          'Pages fall back to their self-referencing canonicals.'
      );
    }
    return map;
  }
);
