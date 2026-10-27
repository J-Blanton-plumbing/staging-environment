import { cache } from 'react';
import pool from '@/lib/db';
import { writeChangelog } from '@/lib/cms/changelog';
import { ConflictError, ValidationError } from '@/lib/cms/errors';
import { getHome2026Preview, getMainPagePreview } from '@/lib/cms/preview';
import { HOME_2026_PAGE_TYPE, HOME_2026_SLUG } from '@/lib/cms/home-2026-content';

/**
 * Brief 220 — the Live homepage switch: which `main_pages` record renders at `/`.
 *
 *   'classic'   → the row `home` (Brief 219's homepage, untouched) — the default, and the answer to
 *                 every doubt: a missing / unreadable setting, a DB error, or a Homepage 2026 record
 *                 that isn't published all render Classic. Never a 500.
 *   'home-2026' → the row `home-2026` (Homepage 2026).
 *
 * Stored in `global_settings.homepage_active` (the site-level settings row), read through to_jsonb so
 * a database without the column answers NULL = Classic. Deliberately NOT on the `GlobalSettings`
 * object: the root layout serializes that onto every page, and a new key would change every page's
 * bytes (the Brief 192 reason).
 *
 * WRITTEN ONLY BY `switchHomepage` (the /admin/home Live homepage panel). Seeds create it as
 * 'classic' when it is NULL and never write it otherwise — a seed that reset it would roll the
 * homepage back on every deploy. Each flip is logged in `page_changelog` (page_type
 * 'homepage-switch'): who, when, from → to.
 */

export type HomepageRecord = 'classic' | 'home-2026';
export const HOMEPAGE_RECORDS: readonly HomepageRecord[] = ['classic', 'home-2026'];
export const HOMEPAGE_RECORD_LABELS: Record<HomepageRecord, string> = {
  classic: 'Classic homepage',
  'home-2026': 'Homepage 2026',
};
const CHANGELOG_TYPE = 'homepage-switch';
const CHANGELOG_SLUG = 'homepage_active';

const isRecord = (v: unknown): v is HomepageRecord => v === 'classic' || v === 'home-2026';

/**
 * What the switch says AND whether Homepage 2026 can honour it (its row is published). One query.
 * Never throws: any failure → Classic.
 */
async function readSwitch(): Promise<{ stored: HomepageRecord | null; renders: HomepageRecord }> {
  try {
    const r = (
      await pool.query<{ active: string | null; h26_status: string | null }>(
        `SELECT (SELECT to_jsonb(g) ->> 'homepage_active' FROM global_settings g WHERE id = 1) AS active,
                (SELECT status FROM main_pages WHERE slug = $1) AS h26_status`,
        [HOME_2026_SLUG]
      )
    ).rows[0];
    const stored = isRecord(r?.active) ? r.active : null;
    return { stored, renders: stored === 'home-2026' && r?.h26_status === 'published' ? 'home-2026' : 'classic' };
  } catch {
    return { stored: null, renders: 'classic' };
  }
}

/**
 * The record `/` renders for THIS request (React `cache`: one read shared by the root layout and the
 * page). An editor's preview cookie wins over the switch, both ways, so either record can be
 * previewed whatever is live; otherwise the switch decides.
 */
export const homeRecordForRequest = cache(async (): Promise<{
  record: HomepageRecord;
  preview: 'classic' | 'home-2026' | null;
}> => {
  const [p2026, pClassic] = await Promise.all([
    getHome2026Preview().catch(() => null),
    getMainPagePreview('home').catch(() => null),
  ]);
  if (p2026) return { record: 'home-2026', preview: 'home-2026' };
  if (pClassic) return { record: 'classic', preview: 'classic' };
  return { record: (await readSwitch()).renders, preview: null };
});

export interface HomepageSwitchState {
  /** The stored value (NULL → 'classic'). */
  active: HomepageRecord;
  /** What `/` renders right now for a visitor (differs from `active` only if 2026 is unpublished). */
  renders: HomepageRecord;
  /** The last flip, if any has been logged. */
  since: { at: string; by: string | null; from: HomepageRecord | null } | null;
  /** Whether each record has a published version (a switch to one without is refused). */
  published: Record<HomepageRecord, { ok: boolean; label: string | null }>;
}

/** Whether a record has a published version (and its label). Classic with no row renders its code fallback. */
async function publishedVersion(record: HomepageRecord): Promise<{ ok: boolean; label: string | null }> {
  if (record === 'classic') {
    const r = (
      await pool.query<{ status: string | null; label: string | null }>(
        `SELECT (SELECT status FROM main_pages WHERE slug = 'home') AS status,
                (SELECT label FROM page_drafts WHERE page_type = 'main' AND page_slug = 'home' AND is_published LIMIT 1) AS label`
      )
    ).rows[0];
    return { ok: r?.status !== 'draft', label: r?.label ?? null };
  }
  const r = (
    await pool.query<{ status: string | null; label: string | null }>(
      `SELECT (SELECT status FROM main_pages WHERE slug = $1) AS status,
              (SELECT label FROM page_drafts WHERE page_type = $2 AND page_slug = $1 AND is_published LIMIT 1) AS label`,
      [HOME_2026_SLUG, HOME_2026_PAGE_TYPE]
    )
  ).rows[0];
  return { ok: r?.status === 'published' && !!r?.label, label: r?.label ?? null };
}

export async function getHomepageSwitchState(): Promise<HomepageSwitchState> {
  const sw = await readSwitch();
  const [classic, h2026, last] = await Promise.all([
    publishedVersion('classic'),
    publishedVersion('home-2026'),
    pool
      .query<{ changed_at: Date; name: string | null; snapshot: { from?: string | null } | null }>(
        `SELECT c.changed_at, u.name, c.snapshot
           FROM page_changelog c LEFT JOIN cms_users u ON u.id = c.changed_by
          WHERE c.page_type = $1 AND c.page_slug = $2
          ORDER BY c.changed_at DESC, c.id DESC LIMIT 1`,
        [CHANGELOG_TYPE, CHANGELOG_SLUG]
      )
      .then((r) => r.rows[0] ?? null),
  ]);
  return {
    active: sw.stored ?? 'classic',
    renders: sw.renders,
    since: last
      ? { at: new Date(last.changed_at).toISOString(), by: last.name, from: isRecord(last.snapshot?.from) ? last.snapshot!.from as HomepageRecord : null }
      : null,
    published: { classic, 'home-2026': h2026 },
  };
}

/**
 * Flip the switch (the ONLY writer). Refuses a target without a published version (409). A flip to
 * the record already live is a no-op. Row-locked so two editors can't interleave; logged in the same
 * transaction. The caller revalidates `/` and drops the sitemap memo.
 */
export async function switchHomepage(to: unknown, userId: number): Promise<{ changed: boolean; from: HomepageRecord; to: HomepageRecord }> {
  if (!isRecord(to)) throw new ValidationError('Unknown homepage record.');
  const target = await publishedVersion(to);
  if (!target.ok) {
    throw new ConflictError(`${HOMEPAGE_RECORD_LABELS[to]} has no published version yet. Publish a version of it first, then make it live.`);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = (
      await client.query<{ active: string | null }>(`SELECT to_jsonb(g) ->> 'homepage_active' AS active FROM global_settings g WHERE id = 1 FOR UPDATE`)
    ).rows[0];
    if (!cur) throw new ConflictError('Global Settings has no row yet, so the homepage switch can’t be stored.');
    const from: HomepageRecord = isRecord(cur.active) ? cur.active : 'classic';
    if (from === to && cur.active !== null) {
      await client.query('ROLLBACK');
      return { changed: false, from, to };
    }
    await client.query(`UPDATE global_settings SET homepage_active = $1 WHERE id = 1`, [to]);
    await writeChangelog(client, CHANGELOG_TYPE, CHANGELOG_SLUG, userId, { source: 'homepage-switch', from, to });
    await client.query('COMMIT');
    return { changed: true, from, to };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
