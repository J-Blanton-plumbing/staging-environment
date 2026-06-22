import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const CDN = 'https://d1rplazj5a80fb.cloudfront.net/images';

const heroHeading = "SEWER PROBLEMS? J. BLANTON'S ON THE WAY!";
const heroIntro = "24/7 Emergency Sewer Service: When disaster strikes, we're here. From backed-up lines to overflowing drains, our expert team will respond immediately to protect your home and restore your peace of mind. Don't wait—call us now!";
const introHeading = 'SEWER EXPERTS ON CALL';
const introBody = "When sewer problems strike, every second counts. J. Blanton isn't just one plumber—we're a full team of sewer repair specialists ready to act fast. Whatever the issue, we'll have the right expert at your door, ready to tackle your sewer emergency — as soon as humanly possible.";
const problemsHeading = 'SEWER EMERGENCIES SOLVED';
const problemsItems = [
  'Emergency sewer line repair and replacement',
  '24/7 sewer backup and clog removal',
  'Main line cleaning and repair',
  'Trenchless sewer repair services',
  'Camera inspection and diagnostics',
];
const subcategoriesHeading = 'Explore More Sewer Solutions';
const preventativeHeading = 'WE HATE SEWER PROBLEMS TOO';
const preventativeBody = "That's why we created our expert sewer repair service, a complete peace of mind solution that helps you avoid costly emergency repairs and property damage.";
const finalPitchTagline = 'TURN A SEWER CRISIS INTO A CLEAN SOLUTION';
const finalPitchBody = "Don't wait until your sewer problems get worse. Call us now for immediate sewer repair service.";
const featuredSlugs = [
  'sewer-replacement-old-homes-chicagoland',
  'pvc-vs-abs-pipes',
  'prepare-your-home-plumbing-for-the-chicago-cold-snap',
];
const serviceAreaHeading = "We're Almost Everywhere";
const serviceAreaBody = 'With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly.';
const tiktokHeadline = 'J Blanton Plumbing — Turning Bad Calls to Good Calls';

const subcategories = [
  { label: 'Sewer Rodding', href: '/sewer-rodding', image: `${CDN}/img_sewer-rodding.webp`, desc: 'We provide emergency sewer rodding to quickly clear blocked drains and sewage backups.' },
  { label: 'Sewer Repair', href: '/sewer-repair', image: `${CDN}/img_sewer-repair.webp`, desc: 'Professional sewer repair services transform emergencies into permanent solutions.' },
  { label: 'Sewer Maintenance', href: '/sewer-maintenance', image: `${CDN}/img_sewer-maintenance.webp`, desc: 'We provide expert sewer line maintenance to address slow drains, odors, and clogs.' },
  { label: 'Home Repipe', href: '/home-repipe', image: `${CDN}/img_home-repipe.webp`, desc: 'Professional plumbers provide comprehensive home repiping services and system upgrades.' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO global_content (id, service_area_heading, service_area_body, tiktok_headline)
       VALUES (1, $1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [serviceAreaHeading, serviceAreaBody, tiktokHeadline]
    );

    await client.query(
      `INSERT INTO service_category_pages (
         slug, hero_heading, hero_intro, intro_heading, intro_body,
         problems_heading, problems_items, subcategories_heading,
         preventative_heading, preventative_body,
         final_pitch_tagline, final_pitch_body, articles_featured_slugs
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (slug) DO NOTHING`,
      [
        'sewer', heroHeading, heroIntro, introHeading, introBody,
        problemsHeading, JSON.stringify(problemsItems), subcategoriesHeading,
        preventativeHeading, preventativeBody,
        finalPitchTagline, finalPitchBody, JSON.stringify(featuredSlugs),
      ]
    );

    for (let i = 0; i < subcategories.length; i++) {
      const sub = subcategories[i];
      await client.query(
        `INSERT INTO service_subcategories (page_slug, label, href, description, sort_order)
         VALUES ('sewer', $1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [sub.label, sub.href, sub.desc, i]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
