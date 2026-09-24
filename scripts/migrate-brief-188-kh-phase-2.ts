/**
 * Brief 188 — Knowledge Hub Phase 2 schema + one-time data remaps.
 *
 *   1. `cms_article_related` — hand-picked related articles (Track B2), up to 3
 *      per article, ordered by `position`.
 *   2. `kh_terms.service_href` + `kh_terms.service_cta_text` — the per-topic
 *      "Need help with this?" link (Track E), seeded for the 9 topics.
 *   3. The Brief 92 Related Articles block's "category" mode moves onto topics
 *      (Track C): every saved block config's `categories` values are remapped
 *      from legacy category/service slugs to topic slugs.
 *
 * ── SHIPPING ORDER ──────────────────────────────────────────────────────────
 * Runs from scripts/deploy.sh BEFORE the build swap, so it lands while the OLD
 * code is serving: ADDITIVE ONLY. A new table and two nullable columns; nothing
 * is renamed, dropped or retyped. The old code ignores all three.
 *
 * ── APPLY-ONCE (Brief 187 Stop 2 pattern) ───────────────────────────────────
 * Data writes are recorded in `brief188_applied` (key → detail) and never
 * repeated, so a later editor change is never undone by a deploy:
 *   • `service-link-seed:{topic}` — the default link/text for a topic is written
 *     once. If Marketing later CLEARS a topic's link to hide it, it stays
 *     cleared. (A plain fill-gaps seed would silently refill it every deploy.)
 *     The seed also never overwrites a non-NULL value.
 *   • `related-block-category-remap` — the whole remap runs once.
 *
 * ── CONTENT STATE NEVER FAILS A DEPLOY (Brief 186) ──────────────────────────
 * Unmappable block values are reported and LEFT AS THEY ARE; exit 0. Non-zero
 * only for a schema/SQL fault.
 *
 * Applies by default; `commit` is accepted (deploy.sh passes it); `--dry-run`
 * runs everything in one transaction and rolls it back.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-188-kh-phase-2.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool, PoolClient } from 'pg';
import { verdict } from './lib/run-mode';
import { CATEGORY_KEYS, deriveCategory } from '../src/lib/content/service-taxonomy';
import { KH_TOPIC_SEED } from '../src/lib/cms/kh-taxonomy-types';
import { slugifyCategory } from '../src/lib/cms/related-articles';

const SCRIPT = 'migrate-brief-188-kh-phase-2';
const DRY = process.argv.slice(2).some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const DDL = [
  `CREATE TABLE IF NOT EXISTS cms_article_related (
     article_id         INTEGER  NOT NULL REFERENCES cms_articles(id) ON DELETE CASCADE,
     related_article_id INTEGER  NOT NULL REFERENCES cms_articles(id) ON DELETE CASCADE,
     position           SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 3),
     PRIMARY KEY (article_id, position),
     CONSTRAINT cms_article_related_unique UNIQUE (article_id, related_article_id),
     CONSTRAINT cms_article_related_not_self CHECK (article_id <> related_article_id)
   )`,
  `ALTER TABLE kh_terms ADD COLUMN IF NOT EXISTS service_href TEXT NULL`,
  `ALTER TABLE kh_terms ADD COLUMN IF NOT EXISTS service_cta_text TEXT NULL`,
  `CREATE TABLE IF NOT EXISTS brief188_applied (
     key        TEXT PRIMARY KEY,
     applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     detail     JSONB NOT NULL DEFAULT '{}'::jsonb
   )`,
];

/**
 * Track E defaults. Every href was confirmed 200 on jblantonplumbing.com
 * (Brief 188 Track 0 item 5). Gas Lines is the /gas-lines hub (the four gas
 * services fold into it — service-taxonomy.ts CITY_SLUG_TO_HUB_ALIAS).
 * Company News gets no link.
 */
const SERVICE_LINK_SEED: Record<string, { href: string; text: string } | null> = {
  sewers: { href: '/services/sewer', text: 'Sewer trouble? See our sewer services' },
  drains: { href: '/services/drain', text: 'Stubborn clog? See our drain services' },
  'water-heaters': { href: '/services/water-heater', text: 'Water heater acting up? See our water heater services' },
  'gas-lines': { href: '/gas-lines', text: 'Gas line work? See our gas line services' },
  'water-quality': { href: '/services/water-quality', text: 'Worried about your water? See our water quality services' },
  emergency: { href: '/emergency-plumbing', text: "Plumbing emergency? We're available 24/7" },
  commercial: { href: '/services/commercial', text: 'Running a business? See our commercial services' },
  'plumbing-tips': { href: '/services/plumbing', text: 'Need a pro? See our plumbing services' },
  'company-news': null,
};

/** Service category key → topic slug (Brief 188 Track C table). */
const CATEGORY_TO_TOPIC: Record<string, string> = {
  plumbing: 'plumbing-tips',
  sewer: 'sewers',
  drain: 'drains',
  'water-heater': 'water-heaters',
  'water-quality': 'water-quality',
  commercial: 'commercial',
};
const TOPIC_SLUGS = new Set<string>(KH_TOPIC_SEED.map((t) => t.slug));

/**
 * Map one saved `categories` value to a topic slug, or null when it cannot be
 * mapped. Values are service/hub SLUGS in practice (the picker offered
 * /api/cms/service-categories), but display names from the old article editor
 * ("Sewer Rodding") are slugified first so both forms map.
 *   • already a topic slug          → itself
 *   • emergency-plumbing            → emergency
 *   • gas-lines / gas-line-* / gas-fireplace → gas-lines (the table's "Gas Lines";
 *     the service taxonomy files the gas services under Plumbing)
 *   • a category key or any sub-service of it (service-taxonomy.ts) → its topic
 */
function remapCategoryValue(raw: string): string | null {
  const s = slugifyCategory(raw);
  if (TOPIC_SLUGS.has(s)) return s;
  if (s === 'emergency-plumbing' || s === 'emergency') return 'emergency';
  if (s === 'gas-lines' || s.startsWith('gas-line') || s === 'gas-fireplace') return 'gas-lines';
  const cat = CATEGORY_KEYS.includes(s) ? s : deriveCategory(s);
  return cat ? CATEGORY_TO_TOPIC[cat] ?? null : null;
}

async function ledgerHas(c: PoolClient, key: string): Promise<boolean> {
  return ((await c.query(`SELECT 1 FROM brief188_applied WHERE key = $1`, [key])).rowCount ?? 0) > 0;
}
async function ledgerPut(c: PoolClient, key: string, detail: unknown): Promise<void> {
  await c.query(`INSERT INTO brief188_applied (key, detail) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [key, JSON.stringify(detail)]);
}

type BlockHit = { where: string; before: string[]; after: string[]; unmapped: string[] };

/** Remap every relatedArticles block with mode 'category' in one blocks array. Mutates; returns hits. */
function remapBlocks(blocks: unknown, where: string): BlockHit[] {
  const hits: BlockHit[] = [];
  if (!Array.isArray(blocks)) return hits;
  blocks.forEach((b, i) => {
    if (!b || typeof b !== 'object') return;
    const blk = b as { type?: string; id?: string; data?: Record<string, unknown> };
    if (blk.type !== 'relatedArticles' || !blk.data || blk.data.mode !== 'category') return;
    const before = Array.isArray(blk.data.categories) ? (blk.data.categories as unknown[]).filter((v): v is string => typeof v === 'string') : [];
    const after: string[] = [];
    const unmapped: string[] = [];
    for (const v of before) {
      const t = remapCategoryValue(v);
      if (t) { if (!after.includes(t)) after.push(t); } else { unmapped.push(v); if (!after.includes(v)) after.push(v); }
    }
    hits.push({ where: `${where} block[${i}]${blk.id ? ` id=${blk.id}` : ''}`, before, after, unmapped });
    blk.data.categories = after;
  });
  return hits;
}

async function main() {
  console.log(`MODE: ${DRY ? 'DRY RUN (transaction rolled back at the end)' : 'APPLY'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    await c.query('BEGIN');
    const had = (await c.query(`SELECT to_regclass('cms_article_related') AS t`)).rows[0].t !== null;
    for (const sql of DDL) await c.query(sql);
    console.log(`── Schema ──\n  ${had ? '=' : '+'} cms_article_related\n  ✓ kh_terms.service_href / service_cta_text present\n  ✓ brief188_applied ledger present`);

    // ── Track E: service-link seed (apply-once per topic, never overwrites) ──
    let seeded = 0;
    const seedReport: string[] = [];
    for (const [slug, link] of Object.entries(SERVICE_LINK_SEED)) {
      const key = `service-link-seed:${slug}`;
      if (await ledgerHas(c, key)) continue;
      if (link) {
        const r = await c.query(
          `UPDATE kh_terms
              SET service_href = COALESCE(service_href, $2),
                  service_cta_text = COALESCE(service_cta_text, $3)
            WHERE type = 'topic' AND slug = $1
            RETURNING service_href, service_cta_text`,
          [slug, link.href, link.text]
        );
        if (!r.rows[0]) { seedReport.push(`  ! topic "${slug}" not found — skipped (not recorded)`); continue; }
        seedReport.push(`  + ${slug}: ${r.rows[0].service_href} — "${r.rows[0].service_cta_text}"`);
      } else {
        seedReport.push(`  = ${slug}: no link (by design)`);
      }
      await ledgerPut(c, key, link ?? { none: true });
      seeded++;
    }
    console.log(`\n── Track E service links ──\n${seedReport.join('\n') || '  (all topics already seeded on an earlier run)'}`);

    // ── Track C: Related Articles block category → topic (apply-once) ────────
    const REMAP_KEY = 'related-block-category-remap';
    const hits: BlockHit[] = [];
    let remapRan = false;
    if (!(await ledgerHas(c, REMAP_KEY))) {
      remapRan = true;
      // Every table with a `blocks` JSONB column (live rows), plus every version
      // row's content.blocks (so a republish can't bring an old value back).
      // page_changelog is history and is left untouched.
      const tables = (await c.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.columns
          WHERE table_schema = 'public' AND column_name = 'blocks' AND data_type = 'jsonb'`
      )).rows.map((r) => r.table_name);
      for (const t of tables) {
        // Resolve the key / label columns first — a failing probe query would
        // abort this transaction.
        const tcols = new Set((await c.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [t]
        )).rows.map((r) => r.column_name));
        if (!tcols.has('id')) { console.log(`  ! ${t} has a blocks column but no id — skipped`); continue; }
        const label = ['slug', 'city_slug', 'page_slug'].find((col) => tcols.has(col));
        const rows = await c.query<{ id: number; slug: string | null; blocks: unknown }>(
          `SELECT id, ${label ? `${label}::text` : 'NULL::text'} AS slug, blocks FROM ${t}
            WHERE blocks::text LIKE '%relatedArticles%'`
        );
        for (const r of rows.rows) {
          const h = remapBlocks(r.blocks, `${t} id=${r.id}${r.slug ? ` (${r.slug})` : ''}`);
          if (h.length) {
            hits.push(...h);
            await c.query(`UPDATE ${t} SET blocks = $1 WHERE id = $2`, [JSON.stringify(r.blocks), r.id]);
          }
        }
      }
      const drafts = await c.query<{ id: number; page_type: string; page_slug: string; is_published: boolean; content: { blocks?: unknown } }>(
        `SELECT id, page_type, page_slug, is_published, content FROM page_drafts
          WHERE content->'blocks' IS NOT NULL AND (content->'blocks')::text LIKE '%relatedArticles%'`
      );
      for (const r of drafts.rows) {
        const h = remapBlocks(r.content.blocks, `page_drafts id=${r.id} (${r.page_type}/${r.page_slug}${r.is_published ? ', published' : ''})`);
        if (h.length) {
          hits.push(...h);
          await c.query(`UPDATE page_drafts SET content = $1 WHERE id = $2`, [JSON.stringify(r.content), r.id]);
        }
      }
      await ledgerPut(c, REMAP_KEY, { instances: hits.length, hits });
    }
    console.log(`\n── Track C block remap ──`);
    if (!remapRan) console.log('  already applied on an earlier run — nothing to do');
    else if (hits.length === 0) console.log('  0 relatedArticles blocks in "category" mode — nothing to remap');
    for (const h of hits) {
      console.log(`  ${h.where}: [${h.before.join(', ')}] → [${h.after.join(', ')}]${h.unmapped.length ? `  ! LEFT AS IS (no topic): ${h.unmapped.join(', ')}` : ''}`);
    }

    // ── Post-state: schema only ──────────────────────────────────────────────
    const cols = await c.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'kh_terms' AND column_name IN ('service_href','service_cta_text')`
    );
    if ((cols.rowCount ?? 0) !== 2 || (await c.query(`SELECT to_regclass('cms_article_related') AS t`)).rows[0].t === null) {
      throw new Error('schema missing after migration');
    }

    const changed = !had || seeded > 0 || remapRan;
    if (DRY) {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', changed ? 'changes previewed' : 'nothing to do');
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, changed ? 'APPLIED' : 'ALREADY-APPLIED',
      `${had ? '' : 'created cms_article_related; '}service links seeded ${seeded}; block remap ${remapRan ? `${hits.length} instance(s)` : 'already done'}`);
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
