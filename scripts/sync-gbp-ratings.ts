/**
 * Brief 221 (Track B3) — copy each office's Google rating + review count from Mainline's GBP page into
 * `office_ratings`, the ONLY writer of that table. The City Hubs, their City Service V2 pages and the
 * homepage read it at request time (all force-dynamic, 60s memo), so a sync shows on the live site
 * within a minute with no redeploy (B4).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/sync-gbp-ratings.ts             # sync (default)
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/sync-gbp-ratings.ts --dry-run   # old → new, no writes
 *   … --from-file=<payload.json>   test only: read a saved endpoint response instead of calling Mainline
 *
 * DEFAULT IS COMMIT, on purpose: this is a data refresh, not a content port — the Brief 146 trap was a
 * deploy step that SILENTLY did nothing, and a refresh that defaults to doing nothing is that trap.
 *
 * ── SOURCE ──────────────────────────────────────────────────────────────────
 * `GET $MAINLINE_GBP_RATINGS_URL` with `Authorization: Bearer $MAINLINE_GBP_RATINGS_TOKEN` (Track A):
 *   { "syncedAt": "ISO", "total": { "rating": 4.72, "reviewCount": 10916 },
 *     "locations": [ { "slug": "evanston", "name": "Evanston", "rating": 4.8, "reviewCount": 865, "updatedAt": "ISO" } ] }
 * Which office reads which `slug`: `global_settings.office_mainline_locations` (Brief 221 B2, edited in
 * /admin/global-settings). The company total goes to the row `company`.
 *
 * ── GUARDS (per office; the old row is KEPT and `last_error` recorded) ──────
 *   - the rating is missing or outside 1–5;
 *   - the count is missing, not a whole number, or 0;
 *   - the count dropped more than 10% since the last good value (almost always a sync bug, not real);
 *   - the office's location is not in the response.
 * The whole run keeps every row (and records `last_error` on each) when the endpoint is unreachable,
 * answers non-200 (a wrong token is a 401), or returns something that isn't the shape above.
 * Never blank, never 0: a page only ever shows the last good numbers.
 *
 * ── EXIT CODE (Brief 186) ───────────────────────────────────────────────────
 * Mainline being down, a bad token or a rejected number is a DATA state, reported and exit 0 — the
 * pages keep their last good numbers. Exit 1 only for a code / schema fault (e.g. the table is missing).
 * Not configured (no URL / token in the env) → reported, nothing written, exit 0.
 */
import { existsSync, readFileSync } from 'fs';

const envFile = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const env = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = envFile.match(new RegExp(`^${k}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
};
if (!process.env.DATABASE_URL && env('DATABASE_URL')) process.env.DATABASE_URL = env('DATABASE_URL');

/* eslint-disable import/first */
import pool from '../src/lib/db';
import { cleanMainlineLocations, COMPANY_RATING_SLUG, normOfficeSlug } from '../src/lib/cms/office-ratings';
import { formatRatingValue, formatReviewCount } from '../src/lib/cms/tokens';
import { verdict } from './lib/run-mode';

const SCRIPT = 'sync-gbp-ratings';
const argv = process.argv.slice(2);
const dry = argv.some((a) => ['--dry-run', 'dry-run', '--dry', 'dry'].includes(a));
const fromFile = argv.find((a) => a.startsWith('--from-file='))?.slice('--from-file='.length) ?? '';
const urlArg = argv.find((a) => a.startsWith('--url='))?.slice('--url='.length) ?? '';

/** A >10% drop in the count since the last good value is rejected. */
const MAX_DROP = 0.1;
const TIMEOUT_MS = 20_000;

interface Figures {
  rating: number;
  reviewCount: number;
  updatedAt: string | null;
}
interface Payload {
  syncedAt: string | null;
  total: Figures | null;
  locations: Map<string, Figures>;
}
interface Row {
  office_slug: string;
  mainline_location: string | null;
  rating_value: string | null;
  review_count: number | null;
  last_error: string | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const iso = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

/** The Track A response → figures by location slug. Throws when it isn't that shape at all. */
function parsePayload(raw: unknown): Payload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('the response is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.locations)) throw new Error('the response has no "locations" list');
  const fig = (x: unknown): Figures | null => {
    if (!x || typeof x !== 'object') return null;
    const r = x as Record<string, unknown>;
    return { rating: num(r.rating) ?? NaN, reviewCount: num(r.reviewCount) ?? NaN, updatedAt: iso(r.updatedAt) };
  };
  const locations = new Map<string, Figures>();
  for (const l of o.locations) {
    const slug = l && typeof l === 'object' && typeof (l as Record<string, unknown>).slug === 'string' ? ((l as Record<string, unknown>).slug as string).trim().toLowerCase() : '';
    const f = fig(l);
    if (slug && f) locations.set(slug, f);
  }
  return { syncedAt: iso(o.syncedAt), total: fig(o.total), locations };
}

async function fetchPayload(): Promise<Payload> {
  if (fromFile) return parsePayload(JSON.parse(readFileSync(fromFile, 'utf8')));
  const url = urlArg || env('MAINLINE_GBP_RATINGS_URL');
  const token = env('MAINLINE_GBP_RATINGS_TOKEN');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`Mainline answered HTTP ${res.status}${res.status === 401 ? ' (token rejected)' : ''}`);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new Error('Mainline answered with something that is not JSON');
    }
    return parsePayload(body);
  } catch (e) {
    const msg = e instanceof Error ? (e.name === 'AbortError' ? `no answer from Mainline within ${TIMEOUT_MS / 1000}s` : e.message) : String(e);
    throw new Error(msg);
  } finally {
    clearTimeout(timer);
  }
}

/** Why these figures can't be stored over `prev`, or null when they can. */
function problem(f: Figures | undefined | null, prev: Row | undefined): string | null {
  if (!f) return 'location not in the Mainline response';
  if (!Number.isFinite(f.rating) || f.rating < 1 || f.rating > 5) return `rating ${Number.isFinite(f.rating) ? f.rating : 'missing'} is outside 1–5`;
  if (!Number.isFinite(f.reviewCount)) return 'review count missing';
  if (!Number.isInteger(f.reviewCount) || f.reviewCount <= 0) return `review count ${f.reviewCount} is not a whole number above 0`;
  const before = prev?.review_count ?? null;
  if (before && f.reviewCount < before * (1 - MAX_DROP)) {
    return `review count fell ${before} → ${f.reviewCount} (−${(((before - f.reviewCount) / before) * 100).toFixed(1)}%, more than ${MAX_DROP * 100}%) — kept ${before}`;
  }
  return null;
}

const shown = (r: { rating_value: string | number | null; review_count: number | null } | undefined) =>
  r && r.rating_value != null && r.review_count != null ? `${formatRatingValue(Number(r.rating_value))} · ${formatReviewCount(r.review_count)}` : '(none)';

async function main() {
  console.log(dry ? 'MODE: DRY RUN (no writes)\n' : 'MODE: SYNC (writing office_ratings)\n');
  const configured = !!fromFile || ((urlArg || env('MAINLINE_GBP_RATINGS_URL')) && env('MAINLINE_GBP_RATINGS_TOKEN'));
  if (!configured) {
    console.log('NOT CONFIGURED: MAINLINE_GBP_RATINGS_URL and MAINLINE_GBP_RATINGS_TOKEN must both be set (.env.local on the box).');
    console.log('Nothing read, nothing written — every page keeps its current numbers (or its pre-token copy).');
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', 'not configured');
    return;
  }

  // Which office reads which Mainline location, in Global Settings office order (+ the company total).
  const gs = (await pool.query<{ offices: Array<{ slug?: string }> | null; m: unknown }>(`SELECT offices, to_jsonb(g) -> 'office_mainline_locations' AS m FROM global_settings g WHERE id = 1`)).rows[0];
  const mapping = cleanMainlineLocations(gs?.m);
  const officeSlugs = Array.from(new Set((gs?.offices ?? []).map((o) => normOfficeSlug(String(o.slug ?? ''))).filter(Boolean)));
  const unmapped = officeSlugs.filter((s) => !mapping[s]);
  const targets: Array<{ slug: string; location: string }> = [
    ...Object.entries(mapping).map(([slug, location]) => ({ slug, location })),
    { slug: COMPANY_RATING_SLUG, location: 'total' },
  ];

  const prevRows = new Map((await pool.query<Row>(`SELECT office_slug, mainline_location, rating_value, review_count, last_error FROM office_ratings`)).rows.map((r) => [r.office_slug, r]));

  let payload: Payload | null = null;
  let runError = '';
  try {
    payload = await fetchPayload();
  } catch (e) {
    runError = e instanceof Error ? e.message : String(e);
  }

  const now = new Date().toISOString();
  let updated = 0;
  let unchanged = 0;
  const rejected: string[] = [];
  for (const t of targets) {
    const prev = prevRows.get(t.slug);
    const f = payload ? (t.slug === COMPANY_RATING_SLUG ? payload.total : payload.locations.get(t.location.toLowerCase())) : null;
    const why = runError || problem(f, prev);
    if (why || !f) {
      rejected.push(`${t.slug}: ${why}`);
      console.log(`  KEPT     ${t.slug.padEnd(22)} ${shown(prev).padEnd(14)} — ${why}`);
      if (!dry) {
        // Numbers untouched (NULL only for an office that never had a good sync); the reason recorded.
        await pool.query(
          `INSERT INTO office_ratings (office_slug, mainline_location, fetched_at, last_error) VALUES ($1, $2, $3, $4)
           ON CONFLICT (office_slug) DO UPDATE SET mainline_location = EXCLUDED.mainline_location, fetched_at = EXCLUDED.fetched_at, last_error = EXCLUDED.last_error`,
          [t.slug, t.location, now, why]
        );
      }
      continue;
    }
    const rating = Math.round(f.rating * 10) / 10;
    const next = { rating_value: rating, review_count: f.reviewCount };
    const same = prev && Number(prev.rating_value) === rating && prev.review_count === f.reviewCount;
    console.log(`  ${same ? 'SAME   ' : 'UPDATED'}  ${t.slug.padEnd(22)} ${shown(prev).padEnd(14)} → ${shown(next)}${t.slug === COMPANY_RATING_SLUG ? `  (Mainline: ${f.rating})` : ''}`);
    if (same) unchanged++;
    else updated++;
    if (!dry) {
      await pool.query(
        `INSERT INTO office_ratings (office_slug, mainline_location, rating_value, review_count, source_synced_at, fetched_at, last_error)
         VALUES ($1, $2, $3, $4, $5, $6, NULL)
         ON CONFLICT (office_slug) DO UPDATE SET mainline_location = EXCLUDED.mainline_location, rating_value = EXCLUDED.rating_value,
           review_count = EXCLUDED.review_count, source_synced_at = EXCLUDED.source_synced_at, fetched_at = EXCLUDED.fetched_at, last_error = NULL`,
        [t.slug, t.location, rating, f.reviewCount, f.updatedAt ?? payload?.syncedAt ?? null, now]
      );
    }
  }

  if (unmapped.length) console.log(`\n  report-only: ${unmapped.length} office(s) with no Mainline location (no rating synced): ${unmapped.join(', ')}`);
  if (payload) {
    const used = new Set(Object.values(mapping).map((l) => l.toLowerCase()));
    const extra = [...payload.locations.keys()].filter((l) => !used.has(l));
    if (extra.length) console.log(`  report-only: Mainline locations no office reads: ${extra.join(', ')}`);
  }

  const summary = `${updated} updated, ${unchanged} unchanged, ${rejected.length} kept (old numbers)`;
  console.log(`\n${summary}${dry ? ' — dry run, nothing written' : ''}`);
  if (dry) verdict(SCRIPT, 'NOT-APPLIED (dry run)', summary);
  else if (runError) verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', runError);
  else if (rejected.length) verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', summary);
  else verdict(SCRIPT, updated ? 'APPLIED' : 'ALREADY-APPLIED', summary);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
