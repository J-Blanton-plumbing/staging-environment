import { readFileSync } from 'fs';
import { Pool } from 'pg';

/**
 * One-off (brief-62): snapshot every DB-backed sub-service page's CURRENT
 * published content as a "Version 1" draft in `page_drafts`, giving each page a
 * baseline version to work from in the (now fixed) versioning system.
 *
 * - Content is stored in the sub-service camelCase shape that
 *   `/admin/sub-service/[slug]` authors and `getSubServicePreview` reads.
 * - Pages that already have a "Version 1" draft are skipped (no duplicates).
 * - The 3 hand-built pages (sewer-rodding, gas-lines, hydro-jetting) render from
 *   static content files, not `sub_service_pages`, so they are excluded.
 * Idempotent: re-running only fills gaps.
 */
const env = readFileSync('.env.local', 'utf8');
const get = (k: string) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const STATIC_PAGES = new Set(['sewer-rodding', 'gas-lines', 'hydro-jetting']);
const AUTHOR_ID = 1; // Admin

async function main() {
  const rows = (await pool.query(
    `SELECT slug, title, hero_heading, hero_intro, hero_image,
            intro_heading, intro_body, f_image, problems_heading, problems_items,
            cta_heading, cta_body, f3_image, ndc_title, ndc_body,
            status, meta_title, meta_description
       FROM sub_service_pages ORDER BY slug`
  )).rows;

  const existingV1 = new Set(
    (await pool.query(
      `SELECT page_slug FROM page_drafts WHERE page_type = 'service' AND label = 'Version 1'`
    )).rows.map(r => r.page_slug)
  );

  const created: string[] = [];
  const skippedHasV1: string[] = [];
  const skippedStatic: string[] = [];

  for (const r of rows) {
    if (STATIC_PAGES.has(r.slug)) { skippedStatic.push(r.slug); continue; }
    if (existingV1.has(r.slug)) { skippedHasV1.push(r.slug); continue; }

    const problems = Array.isArray(r.problems_items)
      ? r.problems_items
      : (typeof r.problems_items === 'string' && r.problems_items.trim()
          ? JSON.parse(r.problems_items)
          : []);

    const content = {
      title: r.title ?? '',
      heroHeading: r.hero_heading ?? '',
      heroIntro: r.hero_intro ?? '',
      heroImage: r.hero_image ?? '',
      introHeading: r.intro_heading ?? '',
      introBody: r.intro_body ?? '',
      fImage: r.f_image ?? '',
      problemsHeading: r.problems_heading ?? '',
      problemsItems: problems,
      ctaHeading: r.cta_heading ?? '',
      ctaBody: r.cta_body ?? '',
      f3Image: r.f3_image ?? '',
      ndcTitle: r.ndc_title ?? '',
      ndcBody: r.ndc_body ?? '',
      status: r.status ?? 'published',
      metaTitle: r.meta_title ?? '',
      metaDescription: r.meta_description ?? '',
    };

    await pool.query(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by)
       VALUES ('service', $1, 'Version 1', $2, $3)`,
      [r.slug, JSON.stringify(content), AUTHOR_ID]
    );
    created.push(r.slug);
  }

  console.log(`\nCREATED Version 1 for ${created.length} pages:`);
  created.forEach(s => console.log('   + ' + s));
  console.log(`\nSKIPPED (already had Version 1) — ${skippedHasV1.length}:`);
  skippedHasV1.forEach(s => console.log('   = ' + s));
  console.log(`\nSKIPPED (static-content pages, not DB-backed) — ${skippedStatic.length}:`);
  skippedStatic.forEach(s => console.log('   ~ ' + s));

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
