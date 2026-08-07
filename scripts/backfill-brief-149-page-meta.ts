/**
 * Brief 149 (Track C, step 2) — make the admin's SEO fields show what the page
 * actually renders.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * Wiring `city_pages` / `main_pages` meta into `generateMetadata` (this brief's
 * Track C) fixes the read path, but leaves a subtler version of the same problem:
 * an editor opens a city page, sees an EMPTY SEO Title field, and has no way to
 * know the page has a title at all — let alone what it is. The static fallback is
 * invisible from the admin.
 *
 * So the fields are backfilled with the value each page renders today. After this,
 * what marketing sees in the field IS what renders, and the static fallback stays
 * only as a safety net for a field someone blanks later.
 *
 * ── POLICY ──────────────────────────────────────────────────────────────────
 * FILL THE GAPS. A field holding anything non-empty is left alone — this never
 * overwrites an editor's SEO copy. Blank (NULL or whitespace) is filled from the
 * page's static source:
 *   • cities → `staticCityMeta(slug)` — the SAME function `generateMetadata` now
 *     falls back to, so the stored value cannot disagree with the render.
 *   • main pages → the per-route literals, listed below. They live in route files
 *     (`src/app/**\/page.tsx`), which a script cannot import (Next only allows a
 *     page to export framework symbols), so they are mirrored here. MAIN_PAGE_META
 *     must be kept in step with those literals — but only until each field is
 *     filled once, after which this table is never read again for that row.
 *
 * The brand suffix is stripped before writing (`pageTitle()`): the root layout
 * appends it, and Brief 147 cleaned the stored values for exactly this reason.
 * Storing a suffixed value would show marketing a title the page does not render.
 *
 * ── DOES NOT BUMP `version` ─────────────────────────────────────────────────
 * Same call as Brief 147's suffix sweep: this changes no rendered output (the
 * value written is the value already rendering), so it must not move 248 sitemap
 * `lastmod`s or invalidate the optimistic-lock token of an editor who has a page
 * open. `updated_at` is left alone too.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * SAFE BY DEFAULT: dry run unless invoked with `commit`.
 * BACKUP-FIRST: every prior value into `brief149_meta_backup` (they are all
 *   blank by definition, but the row records that this script touched them).
 * IDEMPOTENT: reports `ALREADY-APPLIED` once no field is blank.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/backfill-brief-149-page-meta.ts
 *   # apply:
 *   ... scripts/backfill-brief-149-page-meta.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { staticCityMeta } from '@/lib/content/cities';
import { pageTitle } from '@/lib/seo';
import { PRIVACY_POLICY } from '@/lib/content/privacy-policy';
import { IS_HIRING } from '@/lib/content/is-hiring';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const SCRIPT = 'backfill-brief-149-page-meta';
const mode = resolveRunMode(SCRIPT);

/**
 * The static title/description each main page renders — mirrored from the
 * `STATIC_META` literal in its route file. Keep in step with those literals.
 * Two entries import their content module directly, because those pages already
 * kept their metadata there.
 */
const MAIN_PAGE_META: Record<string, { title: string; description: string }> = {
  home: {
    title: 'Chicago Plumbing Experts | Make a Good Call',
    description: 'J. Blanton Plumbing — Chicago and suburbs, over 30 years.',
  },
  'why-j-blanton': {
    title: 'Why J. Blanton',
    description:
      'For over 30 years J. Blanton Plumbing has served Chicagoland with 5-star plumbing service. Learn about our team, what to expect, and why we’re the right choice.',
  },
  'no-drip-club': {
    title: 'No Drip Club',
    description:
      'Join the No Drip Club for serious savings, VIP priority scheduling, and complimentary annual home maintenance from J. Blanton Plumbing.',
  },
  financing: {
    title: 'Financing',
    description:
      "Flexible financing options for your plumbing needs. Don't let budget concerns stop essential repairs — easy payment plans and quick approval with J. Blanton Plumbing.",
  },
  'customer-stories': {
    title: 'Customer Stories',
    description:
      'Read real reviews and customer stories from Chicagoland homeowners who trust J. Blanton Plumbing for 5-star plumbing service.',
  },
  locations: {
    title: 'Locations',
    description:
      'J. Blanton Plumbing serves Chicago and the surrounding suburbs. Find your nearest service center or browse all Chicagoland areas we cover.',
  },
  'knowledge-hub': {
    title: 'Knowledge Hub',
    description:
      "Plumbing tips, FAQs, and helpful articles from J. Blanton Plumbing's team of Chicagoland experts.",
  },
  'help-and-support': {
    title: 'Help & Support',
    description:
      'Find answers, support, and solutions for all your plumbing needs – right when you need them. Contact J. Blanton Plumbing today.',
  },
  'privacy-policy': {
    title: PRIVACY_POLICY.meta.title,
    description: PRIVACY_POLICY.meta.description,
  },
  'j-blanton-is-hiring': {
    title: IS_HIRING.meta.title,
    description: IS_HIRING.meta.description,
  },
};

const blank = (v: unknown): boolean => v == null || (typeof v === 'string' && v.trim() === '');

interface Fill {
  table: 'city_pages' | 'main_pages';
  key: string;
  field: 'meta_title' | 'meta_description';
  before: string | null;
  after: string;
}
const fills: Fill[] = [];

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief149_meta_backup (
        id            SERIAL PRIMARY KEY,
        source_table  TEXT NOT NULL,
        source_key    TEXT NOT NULL,
        field         TEXT NOT NULL,
        old_value     TEXT,
        new_value     TEXT NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    // ── Cities ──────────────────────────────────────────────────────────────
    const cities = (
      await client.query<{ city_slug: string; meta_title: string | null; meta_description: string | null }>(
        `SELECT city_slug, meta_title, meta_description FROM city_pages ORDER BY city_slug`
      )
    ).rows;

    let unregistered = 0;
    for (const c of cities) {
      const s = staticCityMeta(c.city_slug);
      if (!s) {
        // A city_pages row whose slug is not in CITY_REGISTRY has no route and
        // no rendered title to copy. Counted, not filled — inventing one would
        // put a value in the admin that no page shows.
        unregistered++;
        continue;
      }
      if (blank(c.meta_title)) {
        fills.push({
          table: 'city_pages',
          key: c.city_slug,
          field: 'meta_title',
          before: c.meta_title,
          after: pageTitle(s.title),
        });
      }
      if (blank(c.meta_description)) {
        fills.push({
          table: 'city_pages',
          key: c.city_slug,
          field: 'meta_description',
          before: c.meta_description,
          after: s.description,
        });
      }
    }
    console.log(
      `city_pages: ${cities.length} row(s); ${unregistered} not in CITY_REGISTRY (skipped — no rendered title to copy).`
    );

    // ── Main pages ──────────────────────────────────────────────────────────
    const mains = (
      await client.query<{ slug: string; meta_title: string | null; meta_description: string | null }>(
        `SELECT slug, meta_title, meta_description FROM main_pages ORDER BY slug`
      )
    ).rows;

    for (const m of mains) {
      const s = MAIN_PAGE_META[m.slug];
      if (!s) {
        console.log(`  note: main_pages "${m.slug}" has no entry in MAIN_PAGE_META — skipped.`);
        continue;
      }
      if (blank(m.meta_title)) {
        fills.push({ table: 'main_pages', key: m.slug, field: 'meta_title', before: m.meta_title, after: pageTitle(s.title) });
      }
      if (blank(m.meta_description)) {
        fills.push({ table: 'main_pages', key: m.slug, field: 'meta_description', before: m.meta_description, after: s.description });
      }
    }
    console.log(`main_pages: ${mains.length} row(s).`);

    if (fills.length === 0) {
      console.log('\nEvery city and main page already carries its own meta title + description.');
      verdict(SCRIPT, 'ALREADY-APPLIED', 'no blank meta fields');
      return;
    }

    console.log(`\n════════ ${fills.length} BLANK FIELD(S) TO FILL ════════`);
    for (const f of fills) {
      console.log(`  ${f.table}.${f.key} · ${f.field}`);
      console.log(`     before: ∅`);
      console.log(`     after:  ${f.after.length > 130 ? f.after.slice(0, 130) + '…' : f.after}`);
    }

    if (mode !== 'commit') {
      console.log('\nNo changes were written. Re-run with `commit` to apply.');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    await client.query('BEGIN');
    try {
      for (const f of fills) {
        await client.query(
          `INSERT INTO brief149_meta_backup (source_table, source_key, field, old_value, new_value)
           VALUES ($1,$2,$3,$4,$5)`,
          [f.table, f.key, f.field, f.before, f.after]
        );
        const keyCol = f.table === 'city_pages' ? 'city_slug' : 'slug';
        // Guarded on still-blank so a concurrent editor save between the read
        // above and this write is never clobbered. No version/updated_at bump —
        // see the header.
        const res = await client.query(
          `UPDATE ${f.table} SET ${f.field} = $2
            WHERE ${keyCol} = $1 AND (${f.field} IS NULL OR TRIM(${f.field}) = '')`,
          [f.key, f.after]
        );
        if (res.rowCount === 0) {
          console.log(`  note: ${f.table}.${f.key}.${f.field} was filled by someone else — left alone.`);
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    // ── Verify ──────────────────────────────────────────────────────────────
    const stillBlank = (
      await client.query<{ n: number }>(
        `SELECT (
           (SELECT count(*) FROM main_pages WHERE meta_title IS NULL OR TRIM(meta_title) = '')
         + (SELECT count(*) FROM main_pages WHERE meta_description IS NULL OR TRIM(meta_description) = '')
         )::int AS n`
      )
    ).rows[0].n;
    console.log(`\nverify: ${stillBlank} main_pages meta field(s) still blank (expected 0).`);

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-149-page-meta-${mode}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ mode, generated: stamp, fills }, null, 2));
    console.log(`log: ${file}`);
    verdict(SCRIPT, 'APPLIED', `${fills.length} meta field(s) filled`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exitCode = 1;
});
