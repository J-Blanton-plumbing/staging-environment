/**
 * Brief 65 — Track B: Normalise city-service intro paragraphs.
 *
 * The WordPress migration (scripts/migrate-wp-city-services.ts) stored
 * `service_intro_paragraphs` as a JSONB object `{"html": "<p>…</p>…"}`, but the
 * app expects a plain `string[]`. Because `{html:…}.length` is undefined, the
 * merge in `src/app/[city]/[service]/page.tsx` always fell back to static copy,
 * so DB content never rendered.
 *
 * This one-time migration converts every `{"html": "…"}` row into a proper
 * `string[]` and writes it back as JSONB.
 *
 * Paragraph extraction:
 *   - If the HTML contains <p> tags, each <p>…</p> becomes one paragraph.
 *   - Otherwise (the real-world case for ~9.7k rows), the content uses
 *     <br /><br /> to separate paragraphs, so we split on runs of 2+ <br>.
 *   - Single <br> inside a chunk is treated as a soft line break (→ space),
 *     keeping WP-authored sub-headings attached to their paragraph.
 *   - All remaining tags are stripped; whitespace is collapsed and trimmed.
 *   - If nothing is left after stripping, the whole (tag-stripped) string is
 *     tried as a single paragraph; if that is empty too, the row is skipped
 *     (logged) rather than written as empty data.
 *
 * Idempotent: only rows where `jsonb_typeof(service_intro_paragraphs) = 'object'`
 * are touched. Already-normalised arrays are left alone, so re-running is safe.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/normalize-city-service-paragraphs.ts
 */

import { readFileSync } from 'fs';
import { Pool } from 'pg';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k: string) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};

const pool = new Pool({
  connectionString: getEnv('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

/** Convert a legacy WP HTML blob into an array of plain-text paragraphs. */
export function htmlToParagraphs(rawHtml: string): string[] {
  if (!rawHtml) return [];
  const html = String(rawHtml);

  // 1. Prefer explicit <p> blocks when present.
  const pMatches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  let chunks: string[];
  if (pMatches.length > 0) {
    chunks = pMatches.map((m) => m[1]);
  } else {
    // 2. Otherwise split on runs of 2+ <br> (paragraph boundaries).
    chunks = html.split(/(?:<br\s*\/?>\s*){2,}/i);
  }

  const paragraphs = chunks
    .map(stripToText)
    .filter(Boolean);

  if (paragraphs.length > 0) return paragraphs;

  // 3. Last resort: whole string as one paragraph.
  const whole = stripToText(html);
  return whole ? [whole] : [];
}

/** Strip all tags (single <br> → space), decode a few entities, collapse ws. */
function stripToText(fragment: string): string {
  return fragment
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const client = await pool.connect();
  let processed = 0;
  let updated = 0;
  let skippedEmpty = 0;
  let errors = 0;
  const skippedRows: string[] = [];
  const errorRows: string[] = [];

  console.log('Brief 65 / Track B — normalising service_intro_paragraphs…');

  try {
    const res = await client.query(
      `SELECT id, city_slug, service_slug, service_intro_paragraphs
         FROM city_service_pages
        WHERE jsonb_typeof(service_intro_paragraphs) = 'object'`
    );
    console.log(`  ${res.rows.length} rows in {html:…} format to process`);

    for (const row of res.rows) {
      processed++;
      const label = `${row.city_slug}/${row.service_slug}`;
      try {
        const obj = row.service_intro_paragraphs as { html?: unknown } | null;
        const html = obj && typeof obj === 'object' ? String(obj.html ?? '') : '';
        const paragraphs = htmlToParagraphs(html);

        if (paragraphs.length === 0) {
          skippedEmpty++;
          skippedRows.push(label);
          console.warn(`  ! skip (empty after strip): ${label}`);
          continue;
        }

        await client.query(
          `UPDATE city_service_pages
              SET service_intro_paragraphs = $1
            WHERE id = $2`,
          [JSON.stringify(paragraphs), row.id]
        );
        updated++;
      } catch (e: unknown) {
        errors++;
        const msg = e instanceof Error ? e.message : String(e);
        errorRows.push(`${label}: ${msg}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n── Summary ─────────────────────────────────────────────────');
  console.log(`  Processed        : ${processed}`);
  console.log(`  Updated          : ${updated}`);
  console.log(`  Skipped (empty)  : ${skippedEmpty}`);
  console.log(`  Errors           : ${errors}`);

  if (skippedRows.length) {
    console.log('\nSkipped rows (empty paragraph result — manual review):');
    skippedRows.slice(0, 40).forEach((s) => console.log('   ', s));
    if (skippedRows.length > 40) console.log(`   … and ${skippedRows.length - 40} more`);
  }
  if (errorRows.length) {
    console.log('\nErrors:');
    errorRows.slice(0, 20).forEach((s) => console.log('   ', s));
  }
}

// Only run when invoked directly (not when imported, e.g. for the extractor).
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
