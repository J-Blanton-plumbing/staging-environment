import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { clientIp } from '@/lib/auth/rate-limit';
import {
  CONTACT_US_FORM_SLUG,
  MAX_LEN,
  formatUsPhone,
  phoneDigits,
  toContactUsInput,
  validateContactUs,
} from '@/lib/contact-us/form';

/**
 * Brief 228 (Track B2) — POST /api/contact-us: the /contact-us page's form,
 * proxied server-to-server to Mainline's lead endpoint
 * (`POST {MAINLINE_ORIGIN}/api/leads`, the same pipe Mainline's own Contact Us
 * page uses), so Mainline needs no CORS change and the visitor's browser never
 * talks to Mainline directly.
 *
 * PUBLIC ON PURPOSE. Brief 148's default-deny covers `/api/cms` only; this route
 * must answer anonymous visitors. It is noindex like every `/api` path
 * (next.config.mjs headers()).
 *
 * Responses (the client only ever shows its own fixed copy, never these bodies):
 *   200 { ok: true }                 — Mainline accepted it (or the honeypot fired)
 *   400 { ok: false, errors }        — failed the shared validation (src/lib/contact-us/form.ts)
 *   413 / 415                        — body over ~10 KB / not JSON
 *   429 { ok: false }                — more than RATE_LIMIT submissions from one IP in the window
 *   502 { ok: false }                — Mainline answered non-2xx, timed out or was unreachable
 *
 * LOGGING: status codes, Mainline's error summary and the lead id only. Never a
 * name, email, phone, message or IP (Brief 228 hard rule).
 */

export const dynamic = 'force-dynamic';

/**
 * Mainline's origin. Server-only (no NEXT_PUBLIC_), read at REQUEST time, so a
 * box can be repointed with a restart. Blank → production. QA points it at a
 * dead URL to exercise the failure state (Brief 228 Track E1).
 */
function mainlineOrigin(): string {
  return (process.env.MAINLINE_ORIGIN || 'https://mainline.jblantonplumbing.com').replace(/\/+$/, '');
}

const MAX_BODY_BYTES = 10 * 1024;
const MAINLINE_TIMEOUT_MS = 10_000;

/** Simple in-memory per-IP limit: RATE_LIMIT submissions per RATE_WINDOW_MS. One process, so this is enough. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string, now: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Opportunistic GC so spray traffic can't grow the map without bound.
  if (hits.size > 5000) {
    hits.forEach((ts, key) => {
      if (!ts.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key);
    });
  }
  return false;
}

/**
 * Attribution keys Mainline's /api/leads reads (Track 0: its UTM_KEYS plus
 * fbp / fbc / event_id / landing_url). Anything else the client sends is dropped.
 * `utm_id` (which the schedule popup forwards) is NOT read by /api/leads, so it
 * is not sent.
 */
const TRACKING_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'fbp',
  'fbc',
  'landing_url',
  'event_id',
] as const;

function cleanTracking(raw: unknown): Record<string, string> {
  const src = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of TRACKING_KEYS) {
    const v = src[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim().slice(0, 2000);
  }
  if (out.landing_url && !/^https?:\/\//i.test(out.landing_url)) delete out.landing_url;
  if (!out.event_id || !/^[A-Za-z0-9-]{8,64}$/.test(out.event_id)) out.event_id = randomUUID();
  return out;
}

/** Mainline's error body, reduced to something safe to log (no submitted values). */
async function mainlineErrorSummary(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const j = JSON.parse(text) as { error?: unknown; issues?: Array<{ path?: unknown; message?: unknown; code?: unknown }> };
    const issues = Array.isArray(j.issues)
      ? j.issues.map((i) => `${Array.isArray(i.path) ? i.path.join('.') : ''}:${String(i.code ?? '')}:${String(i.message ?? '')}`).join(' | ')
      : '';
    return `${String(j.error ?? '')}${issues ? ` [${issues}]` : ''}`.slice(0, 500);
  } catch {
    return text.replace(/\s+/g, ' ').slice(0, 200);
  }
}

const fail = (status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, ...extra }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (rateLimited(ip, Date.now())) {
    console.warn('[contact-us] 429 rate limited');
    return fail(429);
  }

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return fail(413);
  const text = await req.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return fail(413);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail(415);
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(415);
  }

  // Honeypot: a real visitor never sees or fills this field. Pretend success,
  // send nothing to Mainline.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    console.info('[contact-us] honeypot filled — dropped, nothing sent to Mainline');
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const input = toContactUsInput(body.values);
  const errors = validateContactUs(input);
  if (Object.keys(errors).length > 0) {
    console.info(`[contact-us] 400 validation: ${Object.keys(errors).join(',')}`);
    return fail(400, { errors });
  }

  // `phoneDigits` cannot be null here — validateContactUs just passed it.
  const digits = phoneDigits(input.phone) as string;
  const values = {
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: input.email.trim(),
    phone: formatUsPhone(digits),
    service_category: input.service_category,
    message: input.message.trim().slice(0, MAX_LEN.message),
    // Mainline's checkbox format (migration 1057): ["yes"] when ticked, [] when
    // not — sent every time, so an unticked box is an explicit "no".
    sms_service_consent: input.sms_service_consent ? ['yes'] : [],
    sms_marketing_consent: input.sms_marketing_consent ? ['yes'] : [],
  };
  const tracking = cleanTracking(body.tracking);

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    // Mainline records the submitter's user agent and IP on the lead
    // (utm.user_agent / utm.client_ip); without these it would record ours.
    'user-agent': (req.headers.get('user-agent') || 'jblantonplumbing.com /api/contact-us').slice(0, 512),
  };
  if (ip && ip !== 'unknown') headers['x-forwarded-for'] = ip;
  if (tracking.landing_url) headers.referer = tracking.landing_url;

  let res: Response;
  try {
    res = await fetch(`${mainlineOrigin()}/api/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ formSlug: CONTACT_US_FORM_SLUG, values, tracking }),
      cache: 'no-store',
      signal: AbortSignal.timeout(MAINLINE_TIMEOUT_MS),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : 'Error';
    console.error(`[contact-us] 502 Mainline unreachable (${name === 'TimeoutError' ? 'timeout' : name})`);
    return fail(502);
  }

  if (!res.ok) {
    console.error(`[contact-us] 502 Mainline answered ${res.status}: ${await mainlineErrorSummary(res)}`);
    return fail(502);
  }

  const data = (await res.json().catch(() => null)) as { ok?: unknown; id?: unknown; blocked?: unknown; reason?: unknown } | null;
  if (!data || data.ok !== true) {
    console.error(`[contact-us] 502 Mainline answered ${res.status} without ok:true`);
    return fail(502);
  }
  if (data.blocked === true) {
    // Mainline's duplicate-phone guard. Off for this form (block_duplicate_phone
    // false, migration 1057), so this should never happen; if it ever does, the
    // visitor's earlier request is already in Mainline — not a failure for them.
    console.warn(`[contact-us] Mainline accepted but blocked (${String(data.reason ?? 'unknown')})`);
  } else {
    console.info(`[contact-us] lead created in Mainline: ${String(data.id ?? '(no id)')}`);
  }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
