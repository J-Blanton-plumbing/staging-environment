import { readFileSync } from 'fs';
import { Pool } from 'pg';

const env = readFileSync('.env.local', 'utf8');
const get = (k: string) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

function len(v: unknown): number {
  if (v == null) return 0;
  if (Array.isArray(v)) return v.filter(x => String(x).trim()).length;
  return String(v).trim().length;
}

async function main() {
  const rows = (await pool.query(
    `SELECT slug, title, status, parent_slug,
            hero_heading, hero_intro, hero_image,
            intro_heading, intro_body,
            problems_heading, problems_items,
            cta_heading, cta_body,
            meta_title, meta_description
       FROM sub_service_pages
      ORDER BY slug`
  )).rows;

  const drafts = (await pool.query(
    `SELECT page_slug, label FROM page_drafts WHERE page_type = 'service' ORDER BY page_slug, id`
  )).rows;
  const draftsBySlug: Record<string, string[]> = {};
  for (const d of drafts) (draftsBySlug[d.page_slug] ??= []).push(d.label);

  console.log(`\n=== sub_service_pages: ${rows.length} rows ===\n`);
  const report = rows.map(r => {
    // Body content that makes a page "real" (hero alone = empty shell)
    const introBody = len(r.intro_body);
    const problems = len(r.problems_items);
    const ctaBody = len(r.cta_body);
    const introHeading = len(r.intro_heading);
    const bodyScore = introBody + problems + ctaBody + introHeading;
    let classify: string;
    if (bodyScore === 0) classify = 'EMPTY';
    else if (introBody === 0 || problems === 0) classify = 'PARTIAL';
    else classify = 'COMPLETE';
    return {
      slug: r.slug,
      status: r.status,
      parent: r.parent_slug,
      classify,
      heroHeading: len(r.hero_heading),
      heroIntro: len(r.hero_intro),
      heroImage: len(r.hero_image),
      introHeading,
      introBody,
      problems,
      ctaHeading: len(r.cta_heading),
      ctaBody,
      metaTitle: len(r.meta_title),
      metaDesc: len(r.meta_description),
      drafts: (draftsBySlug[r.slug] ?? []).join(', ') || '—',
    };
  });

  for (const r of report) {
    console.log(
      `${r.classify.padEnd(9)} ${r.slug.padEnd(34)} [${r.status}] parent=${r.parent ?? 'none'}\n` +
      `           heroH:${r.heroHeading} heroIntro:${r.heroIntro} heroImg:${r.heroImage>0?'Y':'-'} | ` +
      `introH:${r.introHeading} introBody:${r.introBody} | problems:${r.problems} | ctaH:${r.ctaHeading} ctaBody:${r.ctaBody} | ` +
      `meta:${r.metaTitle>0?'Y':'-'}/${r.metaDesc>0?'Y':'-'} | drafts:[${r.drafts}]`
    );
  }

  const byClass: Record<string, string[]> = {};
  for (const r of report) (byClass[r.classify] ??= []).push(r.slug);
  console.log('\n=== SUMMARY ===');
  for (const c of ['EMPTY', 'PARTIAL', 'COMPLETE']) {
    console.log(`${c}: ${(byClass[c] ?? []).length}`);
    for (const s of byClass[c] ?? []) console.log(`   - ${s}`);
  }

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
