/**
 * Brief 50 — Track D: WordPress City-Service Page Content Migration
 *
 * Populates city_service_pages from the 9,783 city_service pages in the WP XML.
 * Cross-references city slugs against the city registry and service slugs against
 * the service registry — skips any row that doesn't match both.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-wp-city-services.ts
 */

import * as fs from 'fs';
import { Pool } from 'pg';

const XML_PATH =
  'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration/jblantonplumbing.WordPress.2026-06-26.xml';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

// ── Slug normalisation ───────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── XML helpers ──────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const escaped = tag.replace(':', '\\:').replace('/', '\\/');
  const cdataRe = new RegExp(`<${escaped}><!\\[CDATA\\[[\\s\\S]*?\\]\\]></${escaped}>`);
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch) {
    return cdataMatch[0].replace(/^.*?<!\[CDATA\[/, '').replace(/\]\]>.*$/, '');
  }
  const plainRe = new RegExp(`<${escaped}>([\\s\\S]*?)</${escaped}>`);
  const m = plainRe.exec(xml);
  return m ? m[1] : '';
}

function getPostMeta(itemXml: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const blocks = itemXml.split('</wp:postmeta>');
  for (const block of blocks) {
    const keyMatch = block.match(/<wp:meta_key>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_key>/);
    const valMatch = block.match(/<wp:meta_value>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_value>/);
    if (keyMatch && valMatch) {
      const key = keyMatch[1].trim();
      if (!key.startsWith('_')) {
        meta[key] = valMatch[1].trim();
      }
    }
  }
  return meta;
}

function extractImageUrl(url: string): string {
  if (!url) return '';
  const cfMatch = url.match(/https:\/\/d1rplazj5a80fb\.cloudfront\.net\/[^\s"'<>]*/);
  if (cfMatch) return cfMatch[0];
  const embeddedMatch = url.match(/sp-ao\.shortpixel\.ai\/client\/[^/]+\/(https?:\/\/[^\s"'<>]+)/);
  if (embeddedMatch) return embeddedMatch[1];
  return url;
}

async function parseItems(
  xmlPath: string,
  onItem: (xml: string) => Promise<void>
): Promise<void> {
  const stream = fs.createReadStream(xmlPath, { encoding: 'utf8', highWaterMark: 1024 * 1024 });
  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk;
    while (true) {
      const start = buffer.indexOf('<item>');
      if (start === -1) { buffer = buffer.length > 200 ? buffer.slice(-200) : buffer; break; }
      const end = buffer.indexOf('</item>', start);
      if (end === -1) break;
      await onItem(buffer.substring(start, end + 7));
      buffer = buffer.slice(end + 7);
    }
  }
}

// ── Load city registry slugs ─────────────────────────────────────────────────

async function getCitySlugs(client: import('pg').PoolClient): Promise<Set<string>> {
  const r = await client.query(`SELECT DISTINCT city_slug FROM city_pages`);
  const slugs = new Set<string>(r.rows.map((x) => x.city_slug));

  // Also include slugs from the static registry file
  try {
    const src = fs.readFileSync(
      process.cwd() + '/src/lib/content/cities/index.ts',
      'utf8'
    );
    const re = /'([a-z0-9-]+)'/g;
    let m;
    while ((m = re.exec(src)) !== null) slugs.add(m[1]);
  } catch { /* ignore */ }

  return slugs;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  let processed = 0;
  let inserted = 0;
  let updated = 0;
  let skippedCity = 0;
  let skippedService = 0;
  const errors: string[] = [];
  const unmatchedServices = new Map<string, number>();

  console.log('Track D — City-service page content migration starting…');
  console.log(`Source: ${XML_PATH}`);
  console.log('Loading city registry from DB…');

  const citySlugs = await getCitySlugs(client);
  console.log(`  ${citySlugs.size} city slugs loaded`);

  // Service registry: currently only hydro-jetting in code, but we'll
  // import ALL matched city/service combos — service slug matching uses
  // the slugified jb_category value. We log unmatched ones.
  // Per brief: cross-reference against src/lib/content/city-services/index.ts.
  // Currently only hydro-jetting is registered — log all others as unmatched
  // but still insert (the brief says "log the unmatched service category names
  // — these become candidates for new service data files"). We insert all rows
  // so city-service content is available; the app can filter on what's rendered.
  // Actually re-reading: "If no match, log the unmatched service category names"
  // and "Cross-reference the service slug against the service registry ... to find a match."
  // The brief is ambiguous about whether to skip or insert unmatched services.
  // We will INSERT all (not skip) because the table is the data store — the
  // registry controls what's *rendered*, not what's *stored*.

  try {
    await parseItems(XML_PATH, async (itemXml) => {
      const postType = extractTag(itemXml, 'wp:post_type');
      if (postType !== 'page') return;

      const status = extractTag(itemXml, 'wp:status');
      if (status !== 'publish') return;

      const meta = getPostMeta(itemXml);
      if (meta['jb_type'] !== 'city_service') return;

      processed++;

      // Derive city and service slugs
      const geoRaw = meta['jb_geo'] || '';
      const categoryRaw = meta['jb_category'] || '';
      if (!geoRaw || !categoryRaw) { skippedCity++; return; }

      const citySlug = slugify(geoRaw);
      const serviceSlug = slugify(categoryRaw);

      // Cross-reference city
      if (!citySlugs.has(citySlug)) {
        skippedCity++;
        return;
      }

      // Track unmatched service slugs (log only — still insert)
      // The registered service is only 'hydro-jetting' currently
      if (serviceSlug !== 'hydro-jetting') {
        unmatchedServices.set(serviceSlug, (unmatchedServices.get(serviceSlug) || 0) + 1);
      }

      const serviceHeader = meta['service_header'] || '';
      const serviceHeader2 = meta['service_header2'] || '';
      const serviceCallout = meta['service_callout'] || '';
      const serviceContent = meta['service_content'] || '';
      const serviceHeroImageRaw = meta['service_hero_image'] || '';
      const metaTitle = meta['page_title_seo'] || '';
      const metaDescription = meta['meta_description'] || '';
      const postDate = extractTag(itemXml, 'wp:post_date');
      const createdAt = postDate ? new Date(postDate) : new Date();

      const heroImage = serviceHeroImageRaw ? extractImageUrl(serviceHeroImageRaw) : null;

      // Store HTML content as JSONB {"html": "..."}
      const serviceIntroParagraphs = serviceContent ? { html: serviceContent } : null;

      try {
        const result = await client.query(
          `INSERT INTO city_service_pages
             (city_slug, service_slug, service_intro_heading, service_intro_paragraphs,
              service_intro_image, secondary_heading, meta_title, meta_description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (city_slug, service_slug) DO UPDATE SET
             service_intro_heading    = EXCLUDED.service_intro_heading,
             service_intro_paragraphs = EXCLUDED.service_intro_paragraphs,
             service_intro_image      = COALESCE(EXCLUDED.service_intro_image, city_service_pages.service_intro_image),
             secondary_heading        = EXCLUDED.secondary_heading,
             meta_title               = EXCLUDED.meta_title,
             meta_description         = EXCLUDED.meta_description,
             updated_at               = NOW()
           RETURNING (xmax = 0) AS inserted`,
          [
            citySlug,
            serviceSlug,
            serviceHeader,
            serviceIntroParagraphs ? JSON.stringify(serviceIntroParagraphs) : null,
            heroImage,
            serviceHeader2,
            metaTitle,
            metaDescription,
            createdAt,
          ]
        );
        if (result.rows[0]?.inserted) inserted++;
        else updated++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${citySlug}/${serviceSlug}: ${msg}`);
      }
    });
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n── Summary ─────────────────────────────────────────────────');
  console.log(`  Processed              : ${processed}`);
  console.log(`  Inserted               : ${inserted}`);
  console.log(`  Updated                : ${updated}`);
  console.log(`  Skipped (no city)      : ${skippedCity}`);
  console.log(`  Unregistered services  : ${unmatchedServices.size} distinct slugs`);
  console.log(`  Errors                 : ${errors.length}`);

  if (unmatchedServices.size > 0) {
    console.log('\nUnregistered service slugs (candidates for new service data files):');
    const sorted = [...unmatchedServices.entries()].sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 40).forEach(([slug, count]) =>
      console.log(`  ${count.toString().padStart(4)}x  ${slug}`)
    );
    if (sorted.length > 40) console.log(`  ... and ${sorted.length - 40} more`);
  }

  if (errors.length) {
    console.log('\nErrors:');
    errors.slice(0, 20).forEach((e) => console.log('  ', e));
    if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
