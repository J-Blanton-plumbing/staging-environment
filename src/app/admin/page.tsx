import pool from '@/lib/db';
import AdminPageList from '@/components/admin/AdminPageList';

const PAGES = [
  { label: 'Plumbing',      slug: 'plumbing',      path: '/services/plumbing' },
  { label: 'Sewer',         slug: 'sewer',         path: '/services/sewer' },
  { label: 'Drain',         slug: 'drain',         path: '/services/drain' },
  { label: 'Water Heater',  slug: 'water-heater',  path: '/services/water-heater' },
  { label: 'Water Quality', slug: 'water-quality', path: '/services/water-quality' },
  { label: 'Commercial',    slug: 'commercial',    path: '/services/commercial' },
];

interface LastEdit {
  slug: string;
  updatedByName: string | null;
  updatedAt: string | null;
}

async function getLastEdits(): Promise<LastEdit[]> {
  try {
    const client = await pool.connect();
    try {
      const slugs = PAGES.map(p => p.slug);
      const result = await client.query(
        `SELECT s.slug, u.name AS updated_by_name, s.updated_at
         FROM service_category_pages s
         LEFT JOIN cms_users u ON u.id = s.updated_by
         WHERE s.slug = ANY($1)`,
        [slugs]
      );
      return result.rows.map(r => ({
        slug: r.slug,
        updatedByName: r.updated_by_name ?? null,
        updatedAt: r.updated_at ?? null,
      }));
    } finally {
      client.release();
    }
  } catch {
    return [];
  }
}

export default async function AdminIndex() {
  const edits = await getLastEdits();
  const editMap = Object.fromEntries(edits.map(e => [e.slug, e]));

  return (
    <AdminPageList pages={PAGES} editMap={editMap} />
  );
}
