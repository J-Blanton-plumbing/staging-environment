/**
 * backfill-article-hero-images.ts — Brief 123: fill the empty `image` column
 * for the 812 articles imported in Brief 50.
 *
 * WHY THE BRIEF 50 IMPORT LEFT THEM BLANK: that migration read a `hero_image`
 * postmeta that does not exist anywhere in the WP export. The real field is
 * the ACF `article_image` postmeta (a full CloudFront URL), present on 507 of
 * the 812 published jb_article posts. The export contains NO attachment items
 * and NO `_thumbnail_id` metas (it was exported without media), so the
 * classic featured-image resolution path yields nothing — but it is still
 * attempted below for completeness/future exports.
 *
 * TWO MODES:
 * 1. Generate (dev machine, needs the 146 MB XML export):
 *      - streams the XML (same chunked pattern as migrate-wp-articles.ts),
 *        collecting attachment id → URL and article slug → article_image /
 *        _thumbnail_id
 *      - for slugs still unresolved, falls back to fetching the LIVE article
 *        page (https://jblantonplumbing.com/<slug> — live serves articles at
 *        the root, NOT under /knowledge-hub/) and extracting the hero
 *        <img src="…/images/articles/…"> or og:image, rate-limited, each use
 *        logged for spot-checking
 *      - writes the result to scripts/data/article-hero-images.json (checked
 *        in, so environments without the XML can apply it)
 *    Run with --regenerate to force this even when the JSON already exists.
 * 2. Apply (any environment, incl. staging via deploy.yml): loads the JSON
 *    and updates cms_articles — ONLY rows whose image is NULL/'' are touched,
 *    so an editor-set image is never overwritten and re-runs are no-ops.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/backfill-article-hero-images.ts [--regenerate]
 */

import * as fs from 'fs';
import * as path from 'path';
import pool from '../src/lib/db';

const XML_PATH =
  process.env.ARTICLE_XML_PATH ||
  'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration/jblantonplumbing.WordPress.2026-06-26.xml';
const MAPPING_PATH = path.join(__dirname, 'data', 'article-hero-images.json');
const LIVE_BASE = 'https://jblantonplumbing.com';
const LIVE_FETCH_DELAY_MS = 500;

// Node 18+ provides global fetch; typed loosely so the scripts tsconfig
// doesn't need DOM libs.
const fetchFn: (url: string, init?: unknown) => Promise<{ ok: boolean; status: number; text(): Promise<string> }> =
  (globalThis as never as { fetch: never })['fetch'];

// ── XML helpers (same shapes as migrate-wp-articles.ts) ─────────────────────

function extractTag(xml: string, tag: string): string {
  const escaped = tag.replace(':', '\\:').replace('/', '\\/');
  const cdataRe = new RegExp(`<${escaped}><!\\[CDATA\\[[\\s\\S]*?\\]\\]></${escaped}>`);
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch) {
    return cdataMatch[0].replace(/^.*?<!\[CDATA\[/, '').replace(/\]\]>.*$/, '');
  }
  const m = new RegExp(`<${escaped}>([\\s\\S]*?)</${escaped}>`).exec(xml);
  return m ? m[1] : '';
}

/** Read one postmeta value by exact key (including underscore-prefixed keys —
 * migrate-wp-articles.ts's getPostMeta skipped those, which is why it could
 * never have seen _thumbnail_id). */
function getMeta(itemXml: string, key: string): string {
  const blocks = itemXml.split('</wp:postmeta>');
  for (const block of blocks) {
    const k = block.match(/<wp:meta_key>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_key>/);
    const v = block.match(/<wp:meta_value>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_value>/);
    if (k && v && k[1].trim() === key) return v[1].trim();
  }
  return '';
}

/** Unwrap ShortPixel proxy URLs to the underlying CloudFront/origin URL. */
function extractImageUrl(url: string): string {
  if (!url) return '';
  const cfMatch = url.match(/https:\/\/d1rplazj5a80fb\.cloudfront\.net\/[^\s"'<>]*/);
  if (cfMatch) return cfMatch[0];
  const embeddedMatch = url.match(/sp-ao\.shortpixel\.ai\/client\/[^/]+\/(https?:\/\/[^\s"'<>]+)/);
  if (embeddedMatch) return embeddedMatch[1];
  return url;
}

async function parseItems(xmlPath: string, onItem: (xml: string) => void): Promise<void> {
  const stream = fs.createReadStream(xmlPath, { encoding: 'utf8', highWaterMark: 1024 * 1024 });
  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk;
    while (true) {
      const start = buffer.indexOf('<item>');
      if (start === -1) { buffer = buffer.length > 200 ? buffer.slice(-200) : buffer; break; }
      const end = buffer.indexOf('</item>', start);
      if (end === -1) break;
      onItem(buffer.substring(start, end + 7));
      buffer = buffer.slice(end + 7);
    }
  }
}

// ── Track A: build slug → URL from the XML export ───────────────────────────

interface GenerateResult {
  mapping: Record<string, string>;
  viaArticleImage: number;
  viaThumbnail: number;
  deadXmlUrls: string[];
  viaLive: string[];
  unresolved: string[];
}

/** HEAD-check a URL; CloudFront/S3 answers 403 for missing objects. */
async function urlIsAlive(url: string): Promise<boolean> {
  try {
    const res = await fetchFn(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Validate mapped URLs in small batches; returns the slugs whose URL is dead.
 * Needed because the ACF meta in the June export can be stale — e.g. the
 * "2025 Best Restaurants of Evanston" meta points at a …png that no longer
 * exists on CloudFront, while the live page now serves a …webp. */
async function findDeadUrls(mapping: Record<string, string>): Promise<string[]> {
  const entries = Object.entries(mapping);
  const dead: string[] = [];
  const BATCH = 10;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(([, url]) => urlIsAlive(url)));
    results.forEach((alive, j) => { if (!alive) dead.push(batch[j][0]); });
    if (i + BATCH < entries.length) await new Promise((r) => setTimeout(r, 150));
  }
  return dead;
}

async function generateFromXml(): Promise<GenerateResult> {
  const attachmentUrls = new Map<string, string>(); // wp post id → attachment_url
  const articles: Array<{ slug: string; articleImage: string; thumbId: string }> = [];

  console.log(`Track A — streaming ${XML_PATH}`);
  await parseItems(XML_PATH, (itemXml) => {
    const type = extractTag(itemXml, 'wp:post_type');
    if (type === 'attachment') {
      const id = extractTag(itemXml, 'wp:post_id');
      const url = extractTag(itemXml, 'wp:attachment_url');
      if (id && url) attachmentUrls.set(id, url);
      return;
    }
    if (type !== 'jb_article') return;
    if (extractTag(itemXml, 'wp:status') !== 'publish') return;
    const slug = extractTag(itemXml, 'wp:post_name');
    if (!slug) return;
    articles.push({
      slug,
      articleImage: getMeta(itemXml, 'article_image'),
      thumbId: getMeta(itemXml, '_thumbnail_id'),
    });
  });
  console.log(`  parsed: ${articles.length} published articles, ${attachmentUrls.size} attachments`);

  const mapping: Record<string, string> = {};
  let viaArticleImage = 0;
  let viaThumbnail = 0;
  const missing: string[] = [];

  for (const a of articles) {
    const direct = a.articleImage ? extractImageUrl(a.articleImage) : '';
    if (direct && /^https?:\/\//.test(direct)) {
      mapping[a.slug] = direct;
      viaArticleImage++;
      continue;
    }
    const viaAttachment = a.thumbId ? attachmentUrls.get(a.thumbId) : undefined;
    if (viaAttachment) {
      mapping[a.slug] = extractImageUrl(viaAttachment);
      viaThumbnail++;
      continue;
    }
    missing.push(a.slug);
  }
  console.log(
    `  resolved from XML: ${viaArticleImage} via article_image meta, ` +
      `${viaThumbnail} via _thumbnail_id → attachment; ${missing.length} unresolved`
  );

  // Validate the XML-derived URLs — stale metas point at objects that no
  // longer exist on CloudFront. Dead entries drop back into the live-fallback
  // pool, where scraping the current live page recovers the working URL.
  console.log('  validating XML-derived URLs against CloudFront…');
  const deadXmlUrls = await findDeadUrls(mapping);
  for (const slug of deadXmlUrls) {
    console.log(`  dead XML url for ${slug}: ${mapping[slug]}`);
    delete mapping[slug];
    missing.push(slug);
  }
  console.log(`  dead XML urls: ${deadXmlUrls.length} (re-queued for live fallback)`);

  // ── Track B: live-site fallback for the remainder ──────────────────────────
  const viaLive: string[] = [];
  const unresolved: string[] = [];
  if (missing.length) {
    console.log(`Track B — live-site fallback for ${missing.length} slugs (${LIVE_FETCH_DELAY_MS}ms between requests)`);
    for (let i = 0; i < missing.length; i++) {
      const slug = missing[i];
      try {
        // Live serves articles at the site root (confirmed via the WP REST
        // API `link` field) — /knowledge-hub/<slug> 404s on the live site.
        const res = await fetchFn(`${LIVE_BASE}/${slug}`);
        if (!res.ok) {
          console.warn(`  [live ${i + 1}/${missing.length}] ${slug}: HTTP ${res.status}`);
          unresolved.push(slug);
        } else {
          const html = await res.text();
          // The article hero is the only image under /images/articles/ on the
          // page; og:image is a secondary signal (currently absent on live).
          const hero =
            html.match(/<img[^>]+src="([^"]*\/images\/articles\/[^"]+)"/)?.[1] ||
            html.match(/property="og:image"[^>]*content="([^"]+)"/)?.[1] ||
            '';
          const candidate = hero ? extractImageUrl(hero) : '';
          if (candidate && (await urlIsAlive(candidate))) {
            mapping[slug] = candidate;
            viaLive.push(slug);
            console.log(`  [live ${i + 1}/${missing.length}] ${slug}: ${candidate}`);
          } else {
            if (candidate) console.warn(`  [live ${i + 1}/${missing.length}] ${slug}: scraped url is dead: ${candidate}`);
            unresolved.push(slug);
          }
        }
      } catch (e) {
        console.warn(`  [live ${i + 1}/${missing.length}] ${slug}: ${e instanceof Error ? e.message : e}`);
        unresolved.push(slug);
      }
      if (i < missing.length - 1) await new Promise((r) => setTimeout(r, LIVE_FETCH_DELAY_MS));
    }
  }

  return { mapping, viaArticleImage, viaThumbnail, deadXmlUrls, viaLive, unresolved };
}

// ── Apply: fill blank image fields only ──────────────────────────────────────

async function applyMapping(mapping: Record<string, string>): Promise<void> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE cms_articles a
       SET image = m.url
       FROM jsonb_each_text($1::jsonb) AS m(slug, url)
       WHERE a.slug = m.slug
         AND (a.image IS NULL OR a.image = '')`,
      [JSON.stringify(mapping)]
    );
    console.log(`Apply — filled ${result.rowCount} blank image fields (rows with an existing image were left untouched)`);

    const remaining = await client.query(
      `SELECT COUNT(*)::int AS n FROM cms_articles WHERE image IS NULL OR image = ''`
    );
    console.log(`  rows still without an image: ${remaining.rows[0].n}`);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const regenerate = process.argv.includes('--regenerate');
  let mapping: Record<string, string>;

  if (!regenerate && fs.existsSync(MAPPING_PATH)) {
    mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
    console.log(`Loaded ${Object.keys(mapping).length} slug → image entries from ${MAPPING_PATH}`);
  } else {
    if (!fs.existsSync(XML_PATH)) {
      console.error(
        `No mapping JSON at ${MAPPING_PATH} and no XML export at ${XML_PATH} — ` +
          `run this on the machine that has the WordPress export (or set ARTICLE_XML_PATH).`
      );
      process.exit(1);
    }
    const gen = await generateFromXml();
    mapping = gen.mapping;
    fs.mkdirSync(path.dirname(MAPPING_PATH), { recursive: true });
    const sorted = Object.fromEntries(Object.entries(mapping).sort((a, b) => a[0].localeCompare(b[0])));
    fs.writeFileSync(MAPPING_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${Object.keys(sorted).length} entries to ${MAPPING_PATH}`);
    console.log('── Generation summary ──────────────────────────────────────');
    console.log(`  via article_image meta : ${gen.viaArticleImage} (${gen.deadXmlUrls.length} of these were dead and re-queued to live fallback)`);
    console.log(`  via _thumbnail_id      : ${gen.viaThumbnail}`);
    console.log(`  via live-site fallback : ${gen.viaLive.length}`);
    if (gen.viaLive.length) gen.viaLive.forEach((s) => console.log(`    live: ${s}`));
    console.log(`  unresolved             : ${gen.unresolved.length}`);
    if (gen.unresolved.length) gen.unresolved.forEach((s) => console.log(`    unresolved: ${s}`));
  }

  await applyMapping(mapping);
}

main().catch((e) => {
  console.error('backfill-article-hero-images failed:', e);
  process.exit(1);
});
