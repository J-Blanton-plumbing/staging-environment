/**
 * Brief 147 (Track D) — run every one of the sitemap's `<lastmod>` source queries
 * against the real database and FAIL LOUDLY on a wrong column or table name.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * `src/app/sitemap.ts` wraps each source in `safeQuery`, which swallows errors on
 * purpose so a DB hiccup degrades to "no lastmod" instead of a 500. That is the
 * right runtime behaviour and the wrong build-time behaviour: the city source
 * selected `slug` from `city_pages`, a column that does not exist (it is
 * `city_slug`), so it threw on EVERY request and all 248 city URLs shipped with no
 * freshness signal at all — for weeks — visible only as one line in a server log
 * nobody was reading (Brief 146 §6.2 found it by accident).
 *
 * This script closes that hole from the other side: it imports the queries from
 * `sitemap.ts` itself (so a query can never drift out of coverage) and runs each
 * one with `LIMIT 0`, which validates the identifiers without reading rows.
 *
 * ── EXIT CODES — deliberately NOT the Brief 145 "always exit 0" convention ───
 * The other deploy scripts exit 0 when a guard trips because they answer DATA
 * questions, and aborting the pipeline over data would turn a content question
 * into a site-wide outage. This one answers a CODE question: a 42703 (undefined
 * column), 42P01 (undefined table) or 42601 (syntax error) means the checked-in
 * SQL is wrong and no deploy should carry it. So:
 *
 *   exit 1 — a query has a bad column/table/syntax. Run BEFORE the build swap in
 *            deploy.yml, so `set -e` aborts with the previous build still serving.
 *            No outage; the deploy simply does not happen.
 *   exit 0 — all queries valid, OR the database was unreachable / permission-denied
 *            (a transient infrastructure condition must never block a deploy). That
 *            case prints an unmissable banner instead.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/verify-sitemap-queries.ts
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';

import { SITEMAP_LASTMOD_SOURCES } from '@/app/sitemap';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

/** Postgres error codes that mean "the SQL in the repo is wrong". */
const CODE_DEFECTS = new Set(['42703', '42P01', '42601', '42883', '42P10']);

function banner(lines: string[]) {
  console.log('');
  console.log('!'.repeat(72));
  for (const l of lines) console.log(l);
  console.log('!'.repeat(72));
  console.log('');
}

async function main() {
  const entries = Object.entries(SITEMAP_LASTMOD_SOURCES);
  console.log(`checking ${entries.length} sitemap lastmod source quer${entries.length === 1 ? 'y' : 'ies'}…\n`);

  const defects: Array<{ name: string; code: string; message: string; sql: string }> = [];
  let unreachable: string | null = null;

  for (const [name, sql] of entries) {
    // LIMIT 0 validates every identifier without transferring rows. Wrapping in a
    // subselect keeps it correct for queries that already carry their own LIMIT.
    const probe = `SELECT * FROM (${sql}) AS sitemap_probe LIMIT 0`;
    try {
      await pool.query(probe);
      console.log(`  ok   ${name}`);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const code = e.code ?? '(no code)';
      if (CODE_DEFECTS.has(code)) {
        console.log(`  FAIL ${name} — postgres ${code}: ${e.message}`);
        defects.push({ name, code, message: e.message ?? String(err), sql });
      } else {
        console.log(`  skip ${name} — postgres ${code}: ${e.message} (not a SQL defect)`);
        unreachable = `${code}: ${e.message ?? String(err)}`;
      }
    }
  }

  if (defects.length > 0) {
    banner([
      'SITEMAP QUERY DEFECT — the checked-in SQL references something that does',
      'not exist in this database. Every URL from the affected source(s) would ship',
      'with NO <lastmod>, and sitemap.ts swallows the error at runtime so nothing',
      'else would surface it. Fix the query in src/app/sitemap.ts.',
      '',
      ...defects.flatMap((d) => [
        `  ${d.name}: postgres ${d.code}: ${d.message}`,
        `    sql: ${d.sql.replace(/\s+/g, ' ').trim()}`,
      ]),
      '',
      'Exiting NON-ZERO on purpose: this runs before the build swap, so the deploy',
      'aborts with the previous build still serving. This is a code bug, not data.',
    ]);
    process.exitCode = 1;
    return;
  }

  if (unreachable) {
    banner([
      'SITEMAP QUERY CHECK COULD NOT RUN — the database was not reachable (or denied',
      `access): ${unreachable}`,
      'Exiting 0: a transient infrastructure condition must not block a deploy. But',
      'this check proved NOTHING on this run — do not read it as a pass.',
    ]);
    return;
  }

  console.log(`\nall ${entries.length} sitemap lastmod queries are valid against this database.`);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
