/**
 * Brief 190 — Article V2 schema: `cms_articles.template` + `cms_articles.v2`.
 *
 *   template TEXT  NOT NULL DEFAULT 'article'  — 'article' (V1) | 'article-v2'
 *   v2       JSONB NOT NULL DEFAULT '{}'       — the V2-only fields (article-v2.ts)
 *
 * ── SHIPPING ORDER ──────────────────────────────────────────────────────────
 * Runs from scripts/deploy.sh BEFORE the build swap, so it lands while the OLD
 * code is serving: ADDITIVE ONLY. Two columns with defaults; nothing renamed,
 * dropped or retyped. The old code never selects them, and every existing row
 * gets `template = 'article'`, which is exactly what it renders today.
 *
 * ── NO CONTENT WRITES (Brief 190 hard rule 2) ───────────────────────────────
 * This script never UPDATEs a row. No body, status, tag or template of any
 * existing article is touched; a row "gets" 'article' only through the column
 * DEFAULT that ADD COLUMN applies.
 *
 * ── CONTENT STATE NEVER FAILS A DEPLOY (Brief 186) ──────────────────────────
 * Draft articles, unpublished versions, articles already switched to V2 (on a
 * re-run) and odd template values are all REPORTED as information and exit 0.
 * Non-zero ONLY for a schema/SQL fault: an ALTER that errors (e.g. no rights),
 * or either column missing / of the wrong type afterwards.
 *
 * Applies by default; `commit` is accepted (deploy.sh passes it); `--dry-run`
 * runs the DDL in a transaction and rolls it back.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-190-article-v2.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { verdict } from './lib/run-mode';

const SCRIPT = 'migrate-brief-190-article-v2';
const DRY = process.argv.slice(2).some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const COLUMNS: { name: string; type: string; ddl: string }[] = [
  {
    name: 'template',
    type: 'text',
    ddl: `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'article'::text`,
  },
  {
    name: 'v2',
    type: 'jsonb',
    ddl: `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS v2 JSONB NOT NULL DEFAULT '{}'::jsonb`,
  },
];

async function columnTypes(c: { query: Pool['query'] }): Promise<Map<string, string>> {
  const r = await c.query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'cms_articles' AND column_name = ANY($1)`,
    [COLUMNS.map((col) => col.name)]
  );
  return new Map(r.rows.map((row) => [row.column_name, row.data_type]));
}

async function main() {
  console.log(`MODE: ${DRY ? 'DRY RUN (transaction rolled back at the end)' : 'APPLY'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    await c.query('BEGIN');
    const before = await columnTypes(c);
    for (const col of COLUMNS) await c.query(col.ddl);
    const after = await columnTypes(c);

    console.log('── Schema ──');
    const added: string[] = [];
    for (const col of COLUMNS) {
      const type = after.get(col.name);
      // A schema fault is the ONLY failure this script has.
      if (type !== col.type) {
        throw new Error(`cms_articles.${col.name} is ${type ? `"${type}"` : 'missing'} after the migration (expected ${col.type})`);
      }
      if (!before.has(col.name)) added.push(col.name);
      console.log(`  ${before.has(col.name) ? '=' : '+'} cms_articles.${col.name} (${type})`);
    }

    // ── Editor state: INFORMATION ONLY (never an assertion — Brief 186) ──────
    const stats = await c.query<{ template: string; status: string; n: string }>(
      `SELECT template, status, count(*)::text AS n FROM cms_articles GROUP BY 1, 2 ORDER BY 1, 2`
    );
    const drafts = await c.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM page_drafts WHERE page_type = 'article' AND NOT is_published`
    );
    console.log('\n── Editor state (information only) ──');
    for (const r of stats.rows) console.log(`  i ${r.template.padEnd(12)} ${r.status.padEnd(10)} ${r.n}`);
    console.log(`  i unpublished article versions: ${drafts.rows[0].n}`);
    const odd = stats.rows.filter((r) => r.template !== 'article' && r.template !== 'article-v2');
    if (odd.length) {
      console.log(`  i ${odd.length} template value(s) not recognised — those articles render as V1 (never a 500).`);
    }

    if (DRY) {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', added.length ? `would add ${added.join(', ')}` : 'nothing to do');
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, added.length ? 'APPLIED' : 'ALREADY-APPLIED',
      added.length ? `added cms_articles.${added.join(', cms_articles.')}` : 'both columns already present');
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
