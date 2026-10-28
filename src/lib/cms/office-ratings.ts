/**
 * Brief 221 (Track B) — each office's Google rating + review count, as synced from Mainline's GBP page
 * into `office_ratings` by scripts/sync-gbp-ratings.ts (the ONLY writer), plus the office slug →
 * Mainline location map in `global_settings.office_mainline_locations`.
 *
 * Read path: one small query for every row, memoised for 60s across requests. Every page that shows a
 * rating (City Hubs, City Service V2, the homepage) is `force-dynamic`, so a sync shows on the live
 * site within a minute with no redeploy and no revalidatePath (Brief 221 B4). Never throws: an
 * unreachable DB serves the last rows read, else none — a page then renders its pre-token copy and no
 * `aggregateRating` (never "0 stars", never a blank).
 */
import pool from '@/lib/db';
import { NO_RATINGS, type RatingFigures, type RatingTokenContext } from '@/lib/cms/tokens';

/** `office_ratings.office_slug` of the company total (Mainline's "Total" row). */
export const COMPANY_RATING_SLUG = 'company';

const TTL_MS = 60_000;
let memo: { at: number; rows: Map<string, RatingFigures> } | null = null;

export const normOfficeSlug = (s: string) => s.trim().replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();

async function readRatings(): Promise<Map<string, RatingFigures>> {
  const res = await pool.query<{ office_slug: string; rating_value: string | null; review_count: number | null }>(
    `SELECT office_slug, rating_value, review_count FROM office_ratings`
  );
  const out = new Map<string, RatingFigures>();
  for (const r of res.rows) {
    const ratingValue = r.rating_value == null ? NaN : Number(r.rating_value);
    const reviewCount = r.review_count == null ? NaN : Number(r.review_count);
    // The sync never stores anything else; checked again so a hand edit can't print "0 stars".
    if (ratingValue >= 1 && ratingValue <= 5 && Number.isInteger(reviewCount) && reviewCount > 0) {
      out.set(normOfficeSlug(r.office_slug), { ratingValue, reviewCount });
    }
  }
  return out;
}

/** Every office's numbers (+ `company`), keyed by office slug. */
export async function getOfficeRatings(): Promise<Map<string, RatingFigures>> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.rows;
  try {
    const rows = await readRatings();
    memo = { at: Date.now(), rows };
    return rows;
  } catch (err) {
    // 42P01 = the table isn't there yet (a DB ensure-schema hasn't reached): no ratings, quietly.
    if ((err as { code?: string })?.code !== '42P01') console.error('[office-ratings] read failed — keeping the last rows read', err instanceof Error ? err.message : err);
    return memo?.rows ?? new Map();
  }
}

/** The token context for a page: its hub office's numbers (null slug = no office) + the company's. */
export async function getRatingContext(officeSlug: string | null): Promise<RatingTokenContext> {
  const rows = await getOfficeRatings();
  if (rows.size === 0) return NO_RATINGS;
  return { office: officeSlug ? rows.get(normOfficeSlug(officeSlug)) ?? null : null, company: rows.get(COMPANY_RATING_SLUG) ?? null };
}

// ── The office → Mainline location map (Brief 221 B2) ─────────────────────────────────────────────

/** `{ officeSlug: mainlineLocation }`, slugs normalised. Empty when the column is NULL or missing. */
export async function getOfficeMainlineLocations(): Promise<Record<string, string>> {
  // to_jsonb: a database the Brief 221 migration has not reached yet reads as empty.
  const res = await pool.query<{ m: Record<string, unknown> | null }>(
    `SELECT to_jsonb(g) -> 'office_mainline_locations' AS m FROM global_settings g WHERE id = 1`
  );
  return cleanMainlineLocations(res.rows[0]?.m);
}

/** Keeps string → non-empty string pairs only (slug normalised, location trimmed). */
export function cleanMainlineLocations(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const slug = normOfficeSlug(k);
    const loc = typeof v === 'string' ? v.trim() : '';
    if (slug && loc) out[slug] = loc;
  }
  return out;
}

export async function setOfficeMainlineLocations(map: Record<string, string>): Promise<void> {
  await pool.query(`UPDATE global_settings SET office_mainline_locations = $1::jsonb WHERE id = 1`, [JSON.stringify(cleanMainlineLocations(map))]);
}
