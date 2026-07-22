/**
 * migrate-wp-sub-services.ts
 *
 * Extracts standalone sub-service pages from the WordPress XML export and
 * inserts them into sub_service_pages.
 *
 * Filter: wp:post_type=page, status=publish, no jb_geo meta, has h1_tag meta
 * (these are the canonical service landing pages, not city-specific variants)
 *
 * Run: npx ts-node --project tsconfig.scripts.json scripts/migrate-wp-sub-services.ts
 */

import * as fs from 'fs';
import { Pool } from 'pg';

const XML_PATH =
  'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration/jblantonplumbing.WordPress.2026-06-26.xml';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

function extractTag(xml: string, tag: string): string {
  const esc = tag.replace(/:/g, '\\:');
  let m = xml.match(new RegExp('<' + esc + '><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + esc + '>'));
  if (m) return m[1];
  m = xml.match(new RegExp('<' + esc + '>([^<]*)<\\/' + esc + '>'));
  return m ? m[1] : '';
}

function getPostMeta(xml: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const blocks = xml.split('</wp:postmeta>');
  for (const b of blocks) {
    const k = extractTag(b, 'wp:meta_key');
    const v = extractTag(b, 'wp:meta_value');
    // Skip ACF internal refs (underscore-prefixed) but keep non-prefixed keys
    if (k && !k.startsWith('_')) meta[k] = v;
  }
  return meta;
}

/** Parse ACF serialized array  e.g. a:2:{i:0;s:3:"Foo";i:1;s:3:"Bar";} → ["Foo","Bar"] */
function parseSerializedArray(val: string): string[] {
  const results: string[] = [];
  const re = /s:\d+:"(.*?)";/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(val)) !== null) {
    results.push(m[1]);
  }
  return results;
}

async function main() {
  // 1. Get target slugs from service_subcategories
  const client = await pool.connect();
  let targetSlugs: Set<string>;
  try {
    const res = await client.query(
      `SELECT DISTINCT TRIM(BOTH '/' FROM href) AS slug FROM service_subcategories WHERE href IS NOT NULL AND href != ''`
    );
    targetSlugs = new Set(res.rows.map((r: { slug: string }) => r.slug));
    console.log(`Target slugs from service_subcategories: ${targetSlugs.size}`);
    console.log([...targetSlugs].join(', '));
  } finally {
    client.release();
  }

  // 2. Stream XML and collect matching pages
  // Use 16MB chunks to avoid splitting large item XML (Chicago location pages can be >4MB)
  const CHUNK = 16 * 1024 * 1024;
  const fd = fs.openSync(XML_PATH, 'r');
  const buf = Buffer.alloc(CHUNK);
  let pos = 0, leftover = '', bytesRead: number;

  // slug → best page data (prefer the one with h1_tag)
  const found = new Map<string, {
    slug: string;
    title: string;
    heroHeading: string;
    heroIntro: string;
    introHeading: string;
    introBody: string;
    problemsHeading: string;
    problemsItems: string[];
    ctaHeading: string;
    ctaBody: string;
    metaTitle: string;
    metaDescription: string;
    heroImage: string;
  }>();

  while ((bytesRead = fs.readSync(fd, buf, 0, CHUNK, pos)) > 0) {
    pos += bytesRead;
    const text = leftover + buf.slice(0, bytesRead).toString('utf8');
    const parts = text.split('<item>');
    leftover = parts.pop() || '';

    for (let i = 1; i < parts.length; i++) {
      const end = parts[i].indexOf('</item>');
      if (end === -1) continue;
      const xml = parts[i].slice(0, end);

      const postType = extractTag(xml, 'wp:post_type');
      if (postType !== 'page') continue;

      const status = extractTag(xml, 'wp:status');
      if (status !== 'publish') continue;

      const slug = extractTag(xml, 'wp:post_name');
      if (!targetSlugs.has(slug)) continue;

      const meta = getPostMeta(xml);

      // Skip city-specific pages (they have jb_geo)
      if (meta['jb_geo']) continue;

      // Skip completely empty pages (no content at all)
      if (!meta['h1_tag'] && !meta['headline'] && !meta['city_content'] && !meta['service_header']) continue;

      // Parse benefits (ACF serialized or plain string)
      let problemsItems: string[] = [];
      if (meta['benefits']) {
        if (meta['benefits'].startsWith('a:')) {
          problemsItems = parseSerializedArray(meta['benefits']);
        } else {
          problemsItems = [meta['benefits']];
        }
      }

      const title = extractTag(xml, 'title') || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      // Extract hero image — prefer category_image, fall back to hero_image
      const heroImage = meta['category_image'] || meta['hero_image'] || '';

      const data = {
        slug,
        title,
        heroHeading: meta['h1_tag'] || '',
        heroIntro: meta['city_callout'] || '',
        introHeading: meta['headline'] || '',
        introBody: meta['city_content'] || '',
        problemsHeading: meta['h2_tag'] || '',
        problemsItems,
        ctaHeading: meta['final_pitch_tagline'] || '',
        ctaBody: meta['final_pitch_text'] || '',
        metaTitle: meta['page_title_seo'] || '',
        metaDescription: meta['meta_description'] || '',
        heroImage,
      };

      // Prefer the richer entry (more fields populated)
      const existing = found.get(slug);
      const score = (d: typeof data) =>
        [d.heroHeading, d.introBody, d.ctaHeading].filter(Boolean).length;
      if (!existing || score(data) > score(existing)) {
        found.set(slug, data);
      }
    }
  }
  fs.closeSync(fd);

  console.log(`\nFound ${found.size} canonical sub-service pages in XML`);
  const missing = [...targetSlugs].filter(s => !found.has(s));
  if (missing.length) {
    console.log(`Missing from XML (${missing.length}): ${missing.join(', ')}`);
  }

  // 3. Insert into sub_service_pages
  let inserted = 0, updated = 0;
  for (const data of found.values()) {
    const client2 = await pool.connect();
    try {
      const res = await client2.query(
        `INSERT INTO sub_service_pages
           (slug, title, hero_heading, hero_intro, intro_heading, intro_body,
            problems_heading, problems_items, cta_heading, cta_body,
            meta_title, meta_description, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published')
         ON CONFLICT (slug) DO UPDATE SET
           title            = EXCLUDED.title,
           hero_heading     = EXCLUDED.hero_heading,
           hero_intro       = EXCLUDED.hero_intro,
           intro_heading    = EXCLUDED.intro_heading,
           intro_body       = EXCLUDED.intro_body,
           problems_heading = EXCLUDED.problems_heading,
           problems_items   = EXCLUDED.problems_items,
           cta_heading      = EXCLUDED.cta_heading,
           cta_body         = EXCLUDED.cta_body,
           meta_title       = EXCLUDED.meta_title,
           meta_description = EXCLUDED.meta_description,
           status           = EXCLUDED.status
         RETURNING (xmax = 0) AS is_insert`,
        [
          data.slug,
          data.title,
          data.heroHeading,
          data.heroIntro,
          data.introHeading,
          data.introBody,
          data.problemsHeading,
          JSON.stringify(data.problemsItems),
          data.ctaHeading,
          data.ctaBody,
          data.metaTitle,
          data.metaDescription,
        ]
      );
      if (res.rows[0]?.is_insert) inserted++; else updated++;
    } finally {
      client2.release();
    }
  }

  // 4. Scrape live site for any slugs still missing after XML pass
  const stillMissing = [...targetSlugs].filter(s => !found.has(s));
  if (stillMissing.length) {
    console.log(`\nScraping live site for ${stillMissing.length} missing slugs...`);
    for (const slug of stillMissing) {
      const url = `https://jblantonplumbing.com/${slug}`;
      console.log(`  Fetching ${url}`);
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JBP-migration-bot/1.0)' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) { console.log(`    → HTTP ${res.status}, skipping`); continue; }
        const html = await res.text();

        // Extract title
        const titleM = html.match(/<title>([^<]+)<\/title>/);
        const title = titleM ? titleM[1].replace(/\s*[-|].*$/, '').trim() : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        // Extract meta description
        const metaDescM = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
        const metaDescription = metaDescM ? metaDescM[1] : '';

        // Extract h1
        const h1M = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const heroHeading = h1M ? h1M[1].replace(/<[^>]+>/g, '').trim() : '';

        // Extract first substantial paragraph after h1 as intro
        const paraMatches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
        const paragraphs = paraMatches
          .map(m => m[1].replace(/<[^>]+>/g, '').trim())
          .filter(p => p.length > 80);
        const introBody = paragraphs.slice(0, 3).join('\n\n');

        const liveData = {
          slug,
          title,
          heroHeading,
          heroIntro: '',
          introHeading: '',
          introBody,
          problemsHeading: '',
          problemsItems: [] as string[],
          ctaHeading: '',
          ctaBody: '',
          metaTitle: title,
          metaDescription,
          heroImage: '',
        };

        const c = await pool.connect();
        try {
          const r = await c.query(
            `INSERT INTO sub_service_pages
               (slug, title, hero_heading, hero_intro, intro_heading, intro_body,
                problems_heading, problems_items, cta_heading, cta_body,
                meta_title, meta_description, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published')
             ON CONFLICT (slug) DO UPDATE SET
               title            = EXCLUDED.title,
               hero_heading     = EXCLUDED.hero_heading,
               intro_body       = EXCLUDED.intro_body,
               meta_title       = EXCLUDED.meta_title,
               meta_description = EXCLUDED.meta_description,
               status           = EXCLUDED.status
             RETURNING (xmax = 0) AS is_insert`,
            [slug, liveData.title, liveData.heroHeading, '', '', liveData.introBody,
             '', '[]', '', '', liveData.metaTitle, liveData.metaDescription]
          );
          if (r.rows[0]?.is_insert) { inserted++; console.log(`    → inserted from live site`); }
          else { updated++; console.log(`    → updated from live site`); }
        } finally {
          c.release();
        }
      } catch (err) {
        console.log(`    → fetch failed: ${(err as Error).message}`);
      }
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${updated} updated`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
