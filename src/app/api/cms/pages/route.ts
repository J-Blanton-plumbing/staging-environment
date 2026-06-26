import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';

const SLUG_RE = /^[a-z0-9-]+$/;

async function slugExists(slug: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const [cities, services, subServices, articles] = await Promise.all([
      client.query('SELECT 1 FROM city_pages WHERE city_slug = $1 LIMIT 1', [slug]),
      client.query('SELECT 1 FROM service_category_pages WHERE slug = $1 LIMIT 1', [slug]),
      client.query('SELECT 1 FROM sub_service_pages WHERE slug = $1 LIMIT 1', [slug]),
      client.query('SELECT 1 FROM cms_articles WHERE slug = $1 LIMIT 1', [slug]),
    ]);
    return (
      (cities.rowCount ?? 0) > 0 ||
      (services.rowCount ?? 0) > 0 ||
      (subServices.rowCount ?? 0) > 0 ||
      (articles.rowCount ?? 0) > 0
    );
  } finally {
    client.release();
  }
}

async function cityServiceExists(citySlug: string, serviceSlug: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT 1 FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2 LIMIT 1',
      [citySlug, serviceSlug]
    );
    return (res.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { template } = body;
  const createdBy = session.name;
  const client = await pool.connect();

  try {
    // ── City Coverage Area ───────────────────────────────────────────────────
    if (template === 'city-coverage') {
      const { slug, title } = body;
      if (!slug || !SLUG_RE.test(slug)) {
        return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
      }
      if (!title?.trim()) {
        return NextResponse.json({ error: 'City name is required.' }, { status: 400 });
      }
      if (await slugExists(slug)) {
        return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
      }
      await client.query(
        `INSERT INTO city_pages
          (city_slug, city_type, hero_heading_line1, hero_description, faqs,
           template_type, created_by)
         VALUES ($1, 'coverage-area', $2, '', '[]', 'coverage-area', $3)
         ON CONFLICT (city_slug) DO NOTHING`,
        [slug, title.trim(), createdBy]
      );
      return NextResponse.json({ success: true, redirectUrl: `/admin/city/${slug}` });
    }

    // ── City Local Office ────────────────────────────────────────────────────
    if (template === 'city-local') {
      const { slug, title } = body;
      if (!slug || !SLUG_RE.test(slug)) {
        return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
      }
      if (!title?.trim()) {
        return NextResponse.json({ error: 'City name is required.' }, { status: 400 });
      }
      if (await slugExists(slug)) {
        return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
      }
      await client.query(
        `INSERT INTO city_pages
          (city_slug, city_type, hero_heading_line1, hero_description, faqs,
           template_type, created_by)
         VALUES ($1, 'local-office', $2, '', '[]', 'local-office', $3)
         ON CONFLICT (city_slug) DO NOTHING`,
        [slug, title.trim(), createdBy]
      );
      return NextResponse.json({ success: true, redirectUrl: `/admin/city/${slug}` });
    }

    // ── Service Category ─────────────────────────────────────────────────────
    if (template === 'service-category') {
      const { slug, title } = body;
      if (!slug || !SLUG_RE.test(slug)) {
        return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
      }
      if (!title?.trim()) {
        return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
      }
      if (await slugExists(slug)) {
        return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
      }
      const heading = title.trim();
      await client.query(
        `INSERT INTO service_category_pages
          (slug, hero_heading, hero_intro, intro_heading, intro_body,
           problems_heading, problems_items, subcategories_heading,
           preventative_heading, preventative_body,
           final_pitch_tagline, final_pitch_body, articles_featured_slugs, created_by)
         VALUES ($1, $2, '', '', '', '', '[]', '', '', '', '', '', '[]', $3)
         ON CONFLICT (slug) DO NOTHING`,
        [slug, heading, createdBy]
      );
      return NextResponse.json({ success: true, redirectUrl: `/admin/${slug}` });
    }

    // ── Sub-Service ──────────────────────────────────────────────────────────
    if (template === 'sub-service') {
      const { slug, title } = body;
      if (!slug || !SLUG_RE.test(slug)) {
        return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
      }
      if (!title?.trim()) {
        return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
      }
      if (await slugExists(slug)) {
        return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
      }
      await client.query(
        `INSERT INTO sub_service_pages (slug, title, hero_heading, created_by)
         VALUES ($1, $2, $2, $3)
         ON CONFLICT (slug) DO NOTHING`,
        [slug, title.trim(), createdBy]
      );
      return NextResponse.json({ success: true, redirectUrl: `/admin/sub-service/${slug}` });
    }

    // ── Article ──────────────────────────────────────────────────────────────
    if (template === 'article') {
      const { slug, title } = body;
      if (!slug || !SLUG_RE.test(slug)) {
        return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
      }
      if (!title?.trim()) {
        return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
      }
      if (await slugExists(slug)) {
        return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
      }
      await client.query(
        `INSERT INTO cms_articles (slug, title, created_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO NOTHING`,
        [slug, title.trim(), session.userId]
      );
      return NextResponse.json({ success: true, redirectUrl: `/admin/articles/${slug}` });
    }

    // ── City-Service (Standard) — Smart Fill from parent service ────────────
    if (template === 'city-service-standard') {
      const { citySlug, serviceSlug } = body;
      if (!citySlug || !SLUG_RE.test(citySlug)) {
        return NextResponse.json({ error: 'Invalid city slug.' }, { status: 400 });
      }
      if (!serviceSlug || !SLUG_RE.test(serviceSlug)) {
        return NextResponse.json({ error: 'Invalid service slug.' }, { status: 400 });
      }
      if (await cityServiceExists(citySlug, serviceSlug)) {
        return NextResponse.json(
          { error: `A page for ${citySlug}/${serviceSlug} already exists.` },
          { status: 409 }
        );
      }

      // Smart Fill: pull parent service page content to seed defaults
      const serviceRes = await client.query(
        `SELECT hero_heading, intro_heading, intro_body FROM service_category_pages WHERE slug = $1`,
        [serviceSlug]
      );
      const cityLabel = citySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const serviceLabel = serviceSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      let introHeading = `${serviceLabel} in ${cityLabel}`;
      let introBody = '';
      if (serviceRes.rows[0]) {
        const svc = serviceRes.rows[0];
        introHeading = svc.hero_heading
          ? `${svc.hero_heading} — ${cityLabel}`
          : introHeading;
        introBody = svc.intro_body ?? '';
      }

      await client.query(
        `INSERT INTO city_service_pages
          (city_slug, service_slug,
           service_intro_heading, service_intro_paragraphs, service_intro_image,
           secondary_heading, secondary_paragraphs, secondary_image,
           faqs, meta_title, created_by)
         VALUES ($1, $2, $3, $4, '', $5, $4, '', '[]', $6, $7)
         ON CONFLICT (city_slug, service_slug) DO NOTHING`,
        [
          citySlug,
          serviceSlug,
          introHeading,
          JSON.stringify(introBody ? [introBody] : ['']),
          `More About ${serviceLabel} in ${cityLabel}`,
          `${serviceLabel} in ${cityLabel} | J. Blanton Plumbing`,
          createdBy,
        ]
      );
      return NextResponse.json({
        success: true,
        redirectUrl: `/admin/city-service/${citySlug}/${serviceSlug}`,
      });
    }

    // ── City-Service (Emergency) ─────────────────────────────────────────────
    if (template === 'city-service-emergency') {
      const { citySlug } = body;
      if (!citySlug || !SLUG_RE.test(citySlug)) {
        return NextResponse.json({ error: 'Invalid city slug.' }, { status: 400 });
      }
      const serviceSlug = 'emergency-plumbing';
      if (await cityServiceExists(citySlug, serviceSlug)) {
        return NextResponse.json(
          { error: `An emergency page for ${citySlug} already exists.` },
          { status: 409 }
        );
      }

      const cityLabel = citySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      await client.query(
        `INSERT INTO city_service_pages
          (city_slug, service_slug,
           service_intro_heading, service_intro_paragraphs, service_intro_image,
           secondary_heading, secondary_paragraphs, secondary_image,
           faqs, meta_title, created_by)
         VALUES ($1, $2, $3, $4, '', $5, $4, '', '[]', $6, $7)
         ON CONFLICT (city_slug, service_slug) DO NOTHING`,
        [
          citySlug,
          serviceSlug,
          `Emergency Plumbing in ${cityLabel}`,
          JSON.stringify(['']),
          `24/7 Emergency Plumbing — ${cityLabel}`,
          `Emergency Plumbing in ${cityLabel} | J. Blanton Plumbing`,
          createdBy,
        ]
      );
      return NextResponse.json({
        success: true,
        redirectUrl: `/admin/city-service/${citySlug}/${serviceSlug}`,
      });
    }

    return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
  } catch (err) {
    console.error('[cms/pages POST]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
