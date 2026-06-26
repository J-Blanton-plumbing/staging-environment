/**
 * Brief 50 — Track B: WordPress City Page Content Migration
 *
 * Populates city_pages table with per-city content from 227 city_overview pages
 * in the WordPress XML export.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-wp-cities.ts
 */

import * as fs from 'fs';
import { Pool } from 'pg';

const XML_PATH =
  'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration/jblantonplumbing.WordPress.2026-06-26.xml';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

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
      // Include _jb_* keys (they contain content, not ACF field references)
      // Skip other _ keys (ACF field references like field_city_name)
      const isAcfRef = key.startsWith('_') && !key.startsWith('_jb_');
      if (!isAcfRef) {
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  console.log('Track B — City page content migration starting…');
  console.log(`Source: ${XML_PATH}`);

  try {
    await parseItems(XML_PATH, async (itemXml) => {
      const postType = extractTag(itemXml, 'wp:post_type');
      if (postType !== 'page') return;

      const status = extractTag(itemXml, 'wp:status');
      if (status !== 'publish') { skipped++; return; }

      const meta = getPostMeta(itemXml);

      // City overview pages have jb_type = 'city_overview'
      if (meta['jb_type'] !== 'city_overview') return;

      const slug = extractTag(itemXml, 'wp:post_name');
      if (!slug) { skipped++; return; }

      const cityName = meta['city_name'] || '';
      const gbp = meta['gbp'] || '';
      const cityCallout = meta['city_callout'] || '';
      const cityContent = meta['city_content'] || '';
      const heroImageRaw = meta['hero_image'] || '';
      const categoryImageRaw = meta['category_image'] || '';
      const metaTitle = meta['page_title_seo'] || meta['city_page_title'] || '';
      const metaDescription = meta['meta_description'] || '';
      // _jb_h1_tag → hero_heading_line1 (required NOT NULL column)
      const h1Tag = meta['_jb_h1_tag'] || extractTag(itemXml, 'title') || cityName;
      // _jb_header2 → hero_heading_line2
      const header2 = meta['_jb_header2'] || '';
      const postDate = extractTag(itemXml, 'wp:post_date');
      const createdAt = postDate ? new Date(postDate) : new Date();

      const heroImage = heroImageRaw ? extractImageUrl(heroImageRaw) : null;
      const categoryImage = categoryImageRaw ? extractImageUrl(categoryImageRaw) : null;

      try {
        const result = await client.query(
          `INSERT INTO city_pages
             (city_slug, city_type, hero_heading_line1, hero_heading_line2,
              hero_callout, content_body, hero_image,
              meta_title, meta_description, created_at)
           VALUES ($1, 'coverage-area', $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (city_slug) DO UPDATE SET
             hero_heading_line1 = EXCLUDED.hero_heading_line1,
             hero_heading_line2 = EXCLUDED.hero_heading_line2,
             hero_callout       = EXCLUDED.hero_callout,
             content_body       = EXCLUDED.content_body,
             hero_image         = COALESCE(EXCLUDED.hero_image, city_pages.hero_image),
             meta_title         = EXCLUDED.meta_title,
             meta_description   = EXCLUDED.meta_description,
             updated_at         = NOW()
           RETURNING (xmax = 0) AS inserted`,
          [slug, h1Tag, header2, cityCallout, cityContent, heroImage, metaTitle, metaDescription, createdAt]
        );

        // Store category_image in a separate update if column exists (skip gracefully if not)
        if (categoryImage) {
          try {
            await client.query(
              `UPDATE city_pages SET hero_image = COALESCE(hero_image, $1) WHERE city_slug = $2`,
              [categoryImage, slug]
            );
          } catch { /* column may not exist — skip */ }
        }

        if (result.rows[0]?.inserted) inserted++;
        else updated++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${slug}: ${msg}`);
      }
    });
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n── Summary ─────────────────────────────────────────────────');
  console.log(`  Inserted : ${inserted}`);
  console.log(`  Updated  : ${updated}`);
  console.log(`  Skipped  : ${skipped}`);
  console.log(`  Errors   : ${errors.length}`);
  if (errors.length) {
    console.log('\nErrors:');
    errors.forEach((e) => console.log('  ', e));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
