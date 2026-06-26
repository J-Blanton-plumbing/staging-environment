/**
 * Brief 50 — Track A: WordPress Article Migration
 *
 * Imports all published jb_article posts from the WordPress XML export
 * into the cms_articles table.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-wp-articles.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const XML_PATH =
  'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration/jblantonplumbing.WordPress.2026-06-26.xml';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

// ── XML helpers ──────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  // Handle namespace-prefixed tags with colon
  const escaped = tag.replace(':', '\\:').replace('/', '\\/');
  const cdataRe = new RegExp(`<${escaped}><!\\[CDATA\\[[\\s\\S]*?\\]\\]></${escaped}>`);
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch) {
    const inner = cdataMatch[0];
    const val = inner.replace(/^.*?<!\[CDATA\[/, '').replace(/\]\]>.*$/, '');
    return val;
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
  // Extract CloudFront URL embedded in ShortPixel URL
  const cfMatch = url.match(/https:\/\/d1rplazj5a80fb\.cloudfront\.net\/[^\s"'<>]*/);
  if (cfMatch) return cfMatch[0];
  // Extract embedded original URL after ShortPixel path segment
  const embeddedMatch = url.match(/sp-ao\.shortpixel\.ai\/client\/[^/]+\/(https?:\/\/[^\s"'<>]+)/);
  if (embeddedMatch) return embeddedMatch[1];
  return url;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Streaming item parser ────────────────────────────────────────────────────

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
      if (start === -1) {
        buffer = buffer.length > 200 ? buffer.slice(-200) : buffer;
        break;
      }
      const end = buffer.indexOf('</item>', start);
      if (end === -1) break;
      const itemXml = buffer.substring(start, end + 7);
      await onItem(itemXml);
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

  console.log('Track A — Articles migration starting…');
  console.log(`Source: ${XML_PATH}`);

  try {
    await parseItems(XML_PATH, async (itemXml) => {
      const postType = extractTag(itemXml, 'wp:post_type');
      if (postType !== 'jb_article') return;

      const status = extractTag(itemXml, 'wp:status');
      if (status !== 'publish') { skipped++; return; }

      const slug = extractTag(itemXml, 'wp:post_name');
      if (!slug) { skipped++; return; }

      const title = extractTag(itemXml, 'title');
      const bodyHtml = extractTag(itemXml, 'content:encoded');
      const excerptRaw = extractTag(itemXml, 'excerpt:encoded');
      const postDate = extractTag(itemXml, 'wp:post_date');

      const meta = getPostMeta(itemXml);
      const heroImageRaw = meta['hero_image'] || '';
      const heroImage = heroImageRaw ? extractImageUrl(heroImageRaw) : null;

      const excerpt = excerptRaw.trim()
        ? excerptRaw.trim()
        : stripHtml(bodyHtml).slice(0, 200);

      const body = { html: bodyHtml };
      const createdAt = postDate ? new Date(postDate) : new Date();

      try {
        const result = await client.query(
          `INSERT INTO cms_articles (slug, title, excerpt, body, image, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'published', $6)
           ON CONFLICT (slug) DO UPDATE SET
             title    = CASE WHEN EXCLUDED.body->>'html' != '' THEN EXCLUDED.title ELSE cms_articles.title END,
             excerpt  = CASE WHEN EXCLUDED.body->>'html' != '' THEN EXCLUDED.excerpt ELSE cms_articles.excerpt END,
             image    = CASE WHEN EXCLUDED.body->>'html' != '' THEN EXCLUDED.image ELSE cms_articles.image END,
             body     = CASE WHEN EXCLUDED.body->>'html' != '' AND (cms_articles.body->>'html' IS NULL OR cms_articles.body->>'html' = '') THEN EXCLUDED.body ELSE cms_articles.body END
           RETURNING (xmax = 0) AS inserted`,
          [slug, title, excerpt, JSON.stringify(body), heroImage, createdAt]
        );
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
