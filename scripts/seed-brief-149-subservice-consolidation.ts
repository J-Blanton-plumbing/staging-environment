/**
 * Brief 149 (Tracks A + B) — make `sub_service_pages` fit to render for
 * `/sewer-rodding` (id 2) and `/hydro-jetting` (id 23), so their routes can be
 * repointed at `SubServicePageView` like the other 20 sub-service pages.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * Brief 145 (D-1/D-2): both pages render from `service_category_pages` (4 fields)
 * plus a static content file, while their `sub_service_pages` row is editable in
 * the admin and never read. Marketing's edits go into the void. Brief 146 proved
 * the consolidation pattern on `/gas-lines`; this finishes the catalogue.
 *
 * Brief 146's lesson is the sequencing rule: content lands and is VERIFIED in the
 * DB before the route flips. Shipping the flip onto an unfit row is how /gas-lines
 * went live with no copy on it.
 *
 * ── THE POLICY, AND WHY IT IS NOT "COPY THE STATIC FILE OVER THE ROW" ───────
 * FILL THE GAPS. A field that already holds real content is KEPT; only a field
 * that is empty — or that holds one of the specifically identified junk values
 * below — is written, from the copy the page renders today
 * (`scripts/data/brief149-consolidation.json`, generated from the static file
 * merged with the category row by `gen-brief-149-consolidation-data.ts`).
 *
 * This matters more than it looks. On DEV these rows are mostly empty, so the
 * distinction is academic. On STAGING they are not: the rows carry real,
 * human-written copy that has never been rendered by anything —
 *
 *     hero:        "A rotating cable clears what's blocking your line — fast,
 *                   without digging up your yard."
 *     list:        "PROBLEMS WE SOLVE" + four real problem lines
 *     final CTA:   "READY TO GET YOUR LINE MOVING AGAIN?" + a MAKE A GOOD CALL button
 *
 * — which is exactly the "edits go into the void" symptom Brief 145 D-1 reported.
 * Overwriting it with the static copy would destroy marketing's writing to satisfy
 * a pixel-parity goal, and the brief's own hard rule says not to
 * ("Never overwrite a CMS field that already holds real content; fill-the-gaps
 * only"). So on staging these two pages WILL change copy when the route flips.
 * That is the point of the brief, but it is a visible change and the report calls
 * out every string. Everything is backed up and one CMS edit from reversal.
 *
 * ── JUNK (Brief 145 D-4) — the only values this script overwrites ───────────
 *   • problems_heading exactly "aaaaaa"                        (id 2)
 *   • problems_items holding one 400-word paragraph rather     (id 2)
 *     than list items — detected structurally: any item over
 *     JUNK_ITEM_CHARS, or containing a blank-line break
 *   • intro_body holding scraped WordPress nav-menu text       (id 23)
 *     — detected by the nav labels it always contains
 *   • meta_description carrying raw `&#039;` HTML entities     (id 23)
 * Nothing else is ever overwritten. Every replacement is printed before→after.
 *
 * ── BLOCKS ──────────────────────────────────────────────────────────────────
 * `blocks` is the source of truth for the render (Brief 90). Dev has none; staging
 * has a 9-instance array. Both are handled:
 *   • no blocks  → synthesise the canonical set from the named columns
 *   • blocks     → patch the FIRST instance of each type, gaps only, same policy
 * and in both cases the three sections that had no block type until this brief
 * are INSERTED at their historical positions (Brief 149 added `relatedServices`
 * and `textSection` for exactly this):
 *
 *     hero · intro · listSection · relatedServices · textSection(secondary) ·
 *     map · googleReviews · tiktokFeed · noDripClub · textSection(preventive) ·
 *     relatedArticles · finalCta
 *
 * matching `DEFAULT_ORDER` in ServicePageTemplate — the order these pages render
 * in today. Without them the flip would silently drop three sections of live copy.
 * An instance that already exists is never duplicated, so re-running is a no-op.
 *
 * IMAGES: filled ONLY when the column/instance is empty, never overwritten. The
 * Brief 146/147 rule ("never touch image fields") exists to protect marketing's
 * uploads on `gas-lines`; here the columns are NULL and the page renders CDN
 * images from the static file, so leaving them empty would visibly change the
 * page — filling a blank is the same fill-the-gaps rule, not an overwrite.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * SAFE BY DEFAULT: dry run unless invoked with `commit` (and, in a pipeline, no
 *   silent dry run — see scripts/lib/run-mode.ts).
 * BACKUP-FIRST: full `row_to_json` into `brief149_row_backup` + a JSON file.
 * NO APPLIED-MARKER: this is a fill-the-gaps pass, not a one-time port, so it
 *   stays correct on every deploy and reports ALREADY-APPLIED once nothing is
 *   empty and no junk remains. An editor's later change is never re-clobbered.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-149-subservice-consolidation.ts
 *   # apply:
 *   ... scripts/seed-brief-149-subservice-consolidation.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import {
  SUB_SERVICE_BLOCK_ORDER,
  assembleBlocks,
  normalizeBlocks,
  newBlockId,
  type SubServiceBlockInstance,
} from '@/lib/cms/sub-service-blocks';
import type { SubServiceFields } from '@/lib/cms/sub-service-fields';
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

const SCRIPT = 'seed-brief-149-subservice-consolidation';
const mode = resolveRunMode(SCRIPT);

const SLUGS = ['sewer-rodding', 'hydro-jetting'] as const;

interface RenderedContent {
  heroHeading: string;
  heroIntro: string;
  heroImage: string;
  introHeading: string;
  introParagraphs: string[];
  fImage: string;
  problemsHeading: string;
  problemsItems: string[];
  relatedHeading: string;
  relatedCards: Array<{ title: string; teaser: string; image: string; href: string }>;
  secondaryHeading: string;
  secondaryParagraphs: string[];
  ndcTitle: string | null;
  ndcBody: string;
  preventiveHeading: string;
  preventiveParagraphs: string[];
  ctaHeading: string;
  ctaBody: string;
  f3Image: string;
  metaTitle: string;
  metaDescription: string;
}

const DATA: Record<string, RenderedContent> = JSON.parse(
  readFileSync(join(process.cwd(), 'scripts', 'data', 'brief149-consolidation.json'), 'utf8')
);

// ── Junk detection (Brief 145 D-4) ───────────────────────────────────────────

/** An item this long is a paragraph someone pasted into a list field, not a list item. */
const JUNK_ITEM_CHARS = 200;

/** Scraped WordPress nav text always carries these labels together. */
const NAV_MARKERS = ['WHY J. BLANTON', 'NO DRIP CLUB', 'SCHEDULE A SERVICE'];

function isBlank(v: unknown): boolean {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

function isJunkHeading(v: unknown): boolean {
  return typeof v === 'string' && /^a{4,}$/i.test(v.trim());
}

function isJunkItems(v: unknown): boolean {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.some(
    (item) => typeof item === 'string' && (item.length > JUNK_ITEM_CHARS || /\r?\n\s*\r?\n/.test(item))
  );
}

function isScrapedNav(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  return NAV_MARKERS.every((m) => v.includes(m));
}

/** Raw HTML entities left by the WordPress import — `isn&#039;t` etc. */
function hasRawEntities(v: unknown): boolean {
  return typeof v === 'string' && /&#0?39;|&amp;|&quot;/.test(v);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

// ── Change log ───────────────────────────────────────────────────────────────

type Action = 'FILL' | 'REPLACE-JUNK' | 'KEEP' | 'INSERT';
interface Change {
  slug: string;
  where: string;
  field: string;
  action: Action;
  before: string;
  after: string;
}
const changes: Change[] = [];

const show = (v: unknown, n = 120): string => {
  if (v == null) return '∅';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (s.trim() === '') return '∅ (empty)';
  const flat = s.replace(/\s+/g, ' ');
  return flat.length > n ? flat.slice(0, n) + `…[${s.length}]` : flat;
};

function log(slug: string, where: string, field: string, action: Action, before: unknown, after: unknown) {
  changes.push({ slug, where, field, action, before: show(before), after: show(after) });
}

/**
 * The one decision this script makes, in one place.
 *
 * Returns the value to write, or `undefined` to leave the field alone. `junk`
 * lets a caller declare "this specific existing value is not real content".
 */
function resolve(
  slug: string,
  where: string,
  field: string,
  current: unknown,
  rendered: unknown,
  junk: (v: unknown) => boolean = () => false
): unknown | undefined {
  if (isBlank(current) || (Array.isArray(current) && current.length === 0)) {
    if (isBlank(rendered) || (Array.isArray(rendered) && rendered.length === 0)) return undefined;
    log(slug, where, field, 'FILL', current, rendered);
    return rendered;
  }
  if (junk(current)) {
    log(slug, where, field, 'REPLACE-JUNK', current, rendered);
    return rendered;
  }
  log(slug, where, field, 'KEEP', current, current);
  return undefined;
}

// ── Row shape ────────────────────────────────────────────────────────────────

interface Row {
  id: number;
  slug: string;
  title: string | null;
  hero_heading: string | null;
  hero_intro: string | null;
  hero_image: string | null;
  intro_heading: string | null;
  intro_body: string | null;
  f_image: string | null;
  problems_heading: string | null;
  problems_items: string[] | null;
  cta_heading: string | null;
  cta_body: string | null;
  f3_image: string | null;
  ndc_title: string | null;
  ndc_body: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: string;
  blocks: SubServiceBlockInstance[] | null;
}

function rowToFields(r: Row): SubServiceFields {
  return {
    slug: r.slug,
    title: r.title,
    heroHeading: r.hero_heading,
    heroIntro: r.hero_intro,
    heroImage: r.hero_image,
    introHeading: r.intro_heading,
    introBody: r.intro_body,
    fImage: r.f_image,
    problemsHeading: r.problems_heading,
    problemsItems: Array.isArray(r.problems_items) ? r.problems_items : [],
    ctaHeading: r.cta_heading,
    ctaBody: r.cta_body,
    f3Image: r.f3_image,
    ndcTitle: r.ndc_title,
    ndcBody: r.ndc_body,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
  };
}

/** First instance of `type`, or undefined. */
function firstOf(blocks: SubServiceBlockInstance[], type: string): SubServiceBlockInstance | undefined {
  return blocks.find((b) => b.type === type);
}

/**
 * Insert `block` immediately after the first instance of `afterType`, or append
 * when that type is absent. Position mirrors `DEFAULT_ORDER` in
 * ServicePageTemplate — the order these pages render in today.
 */
function insertAfter(
  blocks: SubServiceBlockInstance[],
  afterType: string,
  block: SubServiceBlockInstance
): void {
  const at = blocks.findIndex((b) => b.type === afterType);
  if (at === -1) blocks.push(block);
  else blocks.splice(at + 1, 0, block);
}

class StopAndReport extends Error {}
function stop(msg: string): never {
  throw new StopAndReport(msg);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief149_row_backup (
        id            SERIAL PRIMARY KEY,
        track         TEXT NOT NULL,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        slug          TEXT NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const writes: Array<{ row: Row; fields: Partial<Row>; blocks: SubServiceBlockInstance[] }> = [];

    for (const slug of SLUGS) {
      const want = DATA[slug];
      if (!want) stop(`scripts/data/brief149-consolidation.json has no entry for "${slug}".`);

      const row = (
        await client.query<Row>(
          `SELECT id, slug, title, hero_heading, hero_intro, hero_image, intro_heading, intro_body,
                  f_image, problems_heading, problems_items, cta_heading, cta_body, f3_image,
                  ndc_title, ndc_body, meta_title, meta_description, status, blocks
             FROM sub_service_pages WHERE slug = $1`,
          [slug]
        )
      ).rows[0];

      if (!row) {
        stop(
          `no sub_service_pages row for "${slug}". The route flip in this release renders from ` +
            'that row — without it the page 404s. Investigate before deploying.'
        );
      }
      if (row.status !== 'published') {
        stop(
          `sub_service_pages "${slug}" has status "${row.status}". SubServicePageView only reads ` +
            'published rows, so the flip would 404 this page.'
        );
      }

      console.log(`\n──────── ${slug} (id ${row.id}, ${row.blocks?.length ?? 0} block instance(s))`);

      // ── Named columns ──────────────────────────────────────────────────────
      const f: Partial<Row> = {};
      const set = <K extends keyof Row>(k: K, v: unknown) => {
        if (v !== undefined) f[k] = v as Row[K];
      };

      set('hero_heading', resolve(slug, 'column', 'hero_heading', row.hero_heading, want.heroHeading));
      set('hero_intro', resolve(slug, 'column', 'hero_intro', row.hero_intro, want.heroIntro));
      set('hero_image', resolve(slug, 'column', 'hero_image', row.hero_image, want.heroImage));
      set('intro_heading', resolve(slug, 'column', 'intro_heading', row.intro_heading, want.introHeading));
      set(
        'intro_body',
        resolve(
          slug,
          'column',
          'intro_body',
          row.intro_body,
          sanitizeCmsHtml(want.introParagraphs.join('\n\n')),
          isScrapedNav
        )
      );
      set('f_image', resolve(slug, 'column', 'f_image', row.f_image, want.fImage));
      set(
        'problems_heading',
        resolve(slug, 'column', 'problems_heading', row.problems_heading, want.problemsHeading, isJunkHeading)
      );
      set(
        'problems_items',
        resolve(slug, 'column', 'problems_items', row.problems_items, want.problemsItems, isJunkItems)
      );
      set('cta_heading', resolve(slug, 'column', 'cta_heading', row.cta_heading, want.ctaHeading));
      set('cta_body', resolve(slug, 'column', 'cta_body', row.cta_body, sanitizeCmsHtml(want.ctaBody)));
      set('f3_image', resolve(slug, 'column', 'f3_image', row.f3_image, want.f3Image));
      set('ndc_title', resolve(slug, 'column', 'ndc_title', row.ndc_title, want.ndcTitle));
      set('ndc_body', resolve(slug, 'column', 'ndc_body', row.ndc_body, sanitizeCmsHtml(want.ndcBody)));

      // Meta: fill when blank. Never re-suffix — Track C's `pageTitle()` handles
      // the brand suffix at the render boundary, and Brief 147 already swept the
      // stored values, so the value written here is deliberately suffix-free.
      set(
        'meta_title',
        resolve(slug, 'column', 'meta_title', row.meta_title, want.metaTitle.replace(/\s*\|\s*J\. Blanton Plumbing\s*$/i, ''))
      );
      if (isBlank(row.meta_description)) {
        set('meta_description', resolve(slug, 'column', 'meta_description', row.meta_description, want.metaDescription));
      } else if (hasRawEntities(row.meta_description)) {
        const decoded = decodeEntities(row.meta_description as string);
        log(slug, 'column', 'meta_description', 'REPLACE-JUNK', row.meta_description, decoded);
        set('meta_description', decoded);
      } else {
        log(slug, 'column', 'meta_description', 'KEEP', row.meta_description, row.meta_description);
      }

      // ── Blocks ─────────────────────────────────────────────────────────────
      // Start from what is stored; synthesise the canonical set when there is
      // nothing (dev). The merged column values above feed the synthesis so a
      // block-less row comes out already filled.
      const stored = normalizeBlocks(row.blocks);
      const blocks: SubServiceBlockInstance[] =
        stored.length > 0
          ? stored.map((b) => ({ ...b, data: { ...b.data } }))
          : assembleBlocks({ ...rowToFields(row), ...rowToFieldsPatch(f) }, SUB_SERVICE_BLOCK_ORDER);

      if (stored.length === 0) {
        log(slug, 'blocks', '(whole array)', 'INSERT', '∅', `${blocks.length} instances synthesised from columns`);
      }

      // Patch the FIRST instance per type — gaps and junk only, same policy.
      const patch = (
        type: string,
        key: string,
        rendered: unknown,
        junk: (v: unknown) => boolean = () => false
      ) => {
        const b = firstOf(blocks, type);
        if (!b) return;
        const v = resolve(slug, `block:${type}`, key, b.data[key], rendered, junk);
        if (v !== undefined) b.data[key] = v;
      };

      patch('hero', 'heroHeading', want.heroHeading);
      patch('hero', 'heroIntro', want.heroIntro);
      patch('hero', 'heroImage', want.heroImage);
      patch('intro', 'introHeading', want.introHeading);
      patch('intro', 'introBody', sanitizeCmsHtml(want.introParagraphs.join('\n\n')), isScrapedNav);
      patch('intro', 'fImage', want.fImage);
      patch('listSection', 'problemsHeading', want.problemsHeading, isJunkHeading);
      patch('listSection', 'problemsItems', want.problemsItems, isJunkItems);
      patch('noDripClub', 'ndcTitle', want.ndcTitle);
      patch('noDripClub', 'ndcBody', sanitizeCmsHtml(want.ndcBody));
      patch('finalCta', 'ctaHeading', want.ctaHeading);
      patch('finalCta', 'ctaBody', sanitizeCmsHtml(want.ctaBody));
      patch('finalCta', 'f3Image', want.f3Image);

      // ── The three sections that had no block type before this brief ────────
      // Insert only when absent, at their DEFAULT_ORDER positions.
      if (!firstOf(blocks, 'relatedServices') && want.relatedCards.length > 0) {
        insertAfter(blocks, 'listSection', {
          id: newBlockId('relatedServices'),
          type: 'relatedServices',
          data: {
            label: 'Related Services',
            relatedHeading: want.relatedHeading,
            relatedCards: want.relatedCards,
          },
        });
        log(slug, 'blocks', 'relatedServices', 'INSERT', '∅ (no block type existed)', want.relatedHeading);
      }

      const hasSecondary = blocks.some(
        (b) => b.type === 'textSection' && b.data.sectionHeading === want.secondaryHeading
      );
      if (!hasSecondary && want.secondaryParagraphs.length > 0) {
        insertAfter(blocks, firstOf(blocks, 'relatedServices') ? 'relatedServices' : 'listSection', {
          id: newBlockId('textSection'),
          type: 'textSection',
          data: {
            label: 'Body Copy',
            sectionHeading: want.secondaryHeading,
            sectionParagraphs: want.secondaryParagraphs,
          },
        });
        log(slug, 'blocks', 'textSection (secondary)', 'INSERT', '∅ (no block type existed)', want.secondaryHeading);
      }

      const hasPreventive = blocks.some(
        (b) => b.type === 'textSection' && b.data.sectionHeading === want.preventiveHeading
      );
      if (!hasPreventive && want.preventiveParagraphs.length > 0) {
        insertAfter(blocks, 'noDripClub', {
          id: newBlockId('textSection'),
          type: 'textSection',
          data: {
            label: 'Preventive Maintenance',
            sectionHeading: want.preventiveHeading,
            sectionParagraphs: want.preventiveParagraphs,
          },
        });
        log(slug, 'blocks', 'textSection (preventive)', 'INSERT', '∅ (no block type existed)', want.preventiveHeading);
      }

      console.log(`  final block order: ${blocks.map((b) => b.type).join(' · ')}`);
      writes.push({ row, fields: f, blocks });
    }

    // ── Report ─────────────────────────────────────────────────────────────
    console.log('\n════════ FIELD-BY-FIELD ════════');
    for (const slug of SLUGS) {
      const mine = changes.filter((c) => c.slug === slug);
      console.log(`\n── ${slug}`);
      for (const c of mine) {
        if (c.action === 'KEEP') {
          console.log(`  KEEP         ${c.where}.${c.field}\n                 = ${c.before}`);
        } else {
          console.log(`  ${c.action.padEnd(12)} ${c.where}.${c.field}`);
          console.log(`                 before: ${c.before}`);
          console.log(`                 after:  ${c.after}`);
        }
      }
    }

    const writeCount = changes.filter((c) => c.action !== 'KEEP').length;
    if (writeCount === 0) {
      console.log('\nNothing empty, no junk left, all three sections present.');
      verdict(SCRIPT, 'ALREADY-APPLIED', 'both rows are fit to render');
      return;
    }

    if (mode !== 'commit') {
      console.log(`\nwould apply ${writeCount} change(s) across ${writes.length} row(s).`);
      console.log('No changes were written. Re-run with `commit` to apply.');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    await client.query('BEGIN');
    try {
      for (const w of writes) {
        const full = (
          await client.query<{ row_json: Record<string, unknown> }>(
            `SELECT row_to_json(t)::jsonb AS row_json FROM sub_service_pages t WHERE id = $1`,
            [w.row.id]
          )
        ).rows[0];
        await client.query(
          `INSERT INTO brief149_row_backup (track, source_table, source_id, slug, reason, row_json)
           VALUES ('A/B','sub_service_pages',$1,$2,$3,$4)`,
          [w.row.id, w.row.slug, 'pre-consolidation snapshot (Brief 149)', full.row_json]
        );

        const cols = Object.keys(w.fields);
        // `problems_items` is JSONB, not text[] — the pg driver would otherwise
        // send a Postgres array literal (`{"a","b"}`) that JSONB rejects.
        const sets = cols.map((c, i) => `${c} = $${i + 2}${c === 'problems_items' ? '::jsonb' : ''}`);
        const vals = cols.map((c) => {
          const v = (w.fields as Record<string, unknown>)[c];
          return c === 'problems_items' ? JSON.stringify(v) : v;
        });
        sets.push(`blocks = $${cols.length + 2}::jsonb`);
        vals.push(JSON.stringify(w.blocks));
        // Deliberately does NOT bump `version`: an editor with the page open must
        // not be handed a spurious "changed by someone else" (Brief 147, Track B).
        // `updated_at` DOES move — the content genuinely changed, and the sitemap
        // lastmod should say so.
        sets.push('updated_at = now()');
        await client.query(
          `UPDATE sub_service_pages SET ${sets.join(', ')} WHERE id = $1`,
          [w.row.id, ...vals]
        );
        console.log(`\nwrote ${w.row.slug}: ${cols.length} column(s) + ${w.blocks.length} block instance(s).`);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    // ── Verify ─────────────────────────────────────────────────────────────
    for (const slug of SLUGS) {
      const check = (
        await client.query<{ hero_heading: string | null; blocks: SubServiceBlockInstance[] | null }>(
          `SELECT hero_heading, blocks FROM sub_service_pages WHERE slug = $1 AND status = 'published'`,
          [slug]
        )
      ).rows[0];
      if (!check) throw new Error(`${slug}: no published row after the write.`);
      if (isBlank(check.hero_heading)) throw new Error(`${slug}: hero_heading is still empty after the write.`);
      const types = (check.blocks ?? []).map((b) => b.type);
      for (const need of ['hero', 'intro', 'listSection', 'relatedServices', 'textSection']) {
        if (!types.includes(need as SubServiceBlockInstance['type'])) {
          throw new Error(`${slug}: block "${need}" is missing after the write (order: ${types.join(', ')}).`);
        }
      }
      console.log(`verify ${slug}: ok — ${types.length} blocks (${types.join(' · ')})`);
    }

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-149-consolidation-${mode}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ mode, generated: stamp, changes }, null, 2));
    console.log(`log: ${file}`);
    verdict(SCRIPT, 'APPLIED', `${writeCount} field change(s) across ${writes.length} row(s)`);
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Column patch → the SubServiceFields keys `assembleBlocks` reads.
 *
 * Only keys the patch actually SET are returned. A `{ heroHeading: undefined }`
 * still overwrites when spread, which would have handed the synthesised hero
 * block the static heading while the column kept the CMS one — the two must
 * agree, and the column (KEEP) is the one that wins.
 */
function rowToFieldsPatch(f: Partial<Row>): Partial<SubServiceFields> {
  const map: Array<[keyof Row, keyof SubServiceFields]> = [
    ['hero_heading', 'heroHeading'],
    ['hero_intro', 'heroIntro'],
    ['hero_image', 'heroImage'],
    ['intro_heading', 'introHeading'],
    ['intro_body', 'introBody'],
    ['f_image', 'fImage'],
    ['problems_heading', 'problemsHeading'],
    ['problems_items', 'problemsItems'],
    ['cta_heading', 'ctaHeading'],
    ['cta_body', 'ctaBody'],
    ['f3_image', 'f3Image'],
    ['ndc_title', 'ndcTitle'],
    ['ndc_body', 'ndcBody'],
  ];
  const out: Record<string, unknown> = {};
  for (const [col, field] of map) {
    if (col in f) out[field] = f[col];
  }
  return out as Partial<SubServiceFields>;
}

main().catch((e) => {
  if (e instanceof StopAndReport) {
    console.log('\n' + '!'.repeat(72));
    console.log('BRIEF 149 CONSOLIDATION — STOPPED, NOTHING WRITTEN');
    console.log(e.message);
    console.log('This is a data condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    // Exit 0 on purpose: deploy.yml runs with `script_stop: true`, so a non-zero
    // exit here aborts the build swap and pm2 reload — a content question must
    // never take the site down. The PIPELINE VERDICT line is the signal.
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', e.message.split('.')[0]);
    return;
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
