/**
 * Brief 43 — CMS API Stress Test
 * Safe to re-run. Cleans up stress-test-temp on every run.
 */

import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Env ──────────────────────────────────────────────────────────────────────
// Load .env.local manually (ts-node doesn't load it automatically)
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const PASSWORD = process.env.CMS_ADMIN_PASSWORD ?? '';
const AUTH_HEADER = `Bearer ${PASSWORD}`;
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:jbp@localhost:5432/jbp_cms';

const pool = new Pool({ connectionString: DATABASE_URL });

// ── Result tracking ───────────────────────────────────────────────────────────
interface Result { name: string; passed: boolean; detail: string }
const results: Result[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true, detail: 'OK' });
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, detail: msg });
    process.stdout.write(`  ✗ ${name}\n    ${msg}\n`);
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function get(slug: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE_URL}/api/cms/${slug}`);
  let body: unknown;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

async function put(
  slug: string,
  payload: unknown,
  auth: string | null = AUTH_HEADER
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth !== null) headers['Authorization'] = auth;
  const res = await fetch(`${BASE_URL}/api/cms/${slug}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  let body: unknown;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function dbQuery(sql: string, params: unknown[] = []): Promise<{ rows: Record<string, unknown>[] }> {
  const client = await pool.connect();
  try {
    return await client.query(sql, params) as { rows: Record<string, unknown>[] };
  } finally {
    client.release();
  }
}

async function seedTempRow(): Promise<void> {
  // Get sewer's page row as template
  const res = await dbQuery('SELECT * FROM service_category_pages WHERE slug = $1', ['sewer']);
  if (!res.rows[0]) throw new Error('Cannot seed: sewer row not found');
  const row = res.rows[0];

  // Delete any leftover temp row from a previous run
  await cleanupTempRow();

  await dbQuery(
    `INSERT INTO service_category_pages (
      slug, hero_heading, hero_intro, intro_heading, intro_body,
      problems_heading, problems_items, subcategories_heading,
      preventative_heading, preventative_body, final_pitch_tagline,
      final_pitch_body, articles_featured_slugs, hero_image, f_image, f3_image
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11,
      $12, $13, $14, $15, $16
    )`,
    [
      'stress-test-temp',
      row.hero_heading, row.hero_intro, row.intro_heading, row.intro_body,
      row.problems_heading,
      // jsonb columns must be passed as JSON strings to pg
      typeof row.problems_items === 'string' ? row.problems_items : JSON.stringify(row.problems_items),
      row.subcategories_heading,
      row.preventative_heading, row.preventative_body, row.final_pitch_tagline,
      row.final_pitch_body,
      typeof row.articles_featured_slugs === 'string' ? row.articles_featured_slugs : JSON.stringify(row.articles_featured_slugs),
      row.hero_image, row.f_image, row.f3_image,
    ]
  );

  // Copy sewer subcategories for the temp row
  const subRes = await dbQuery(
    'SELECT label, href, description, sort_order FROM service_subcategories WHERE page_slug = $1',
    ['sewer']
  );
  for (const sub of subRes.rows) {
    await dbQuery(
      `INSERT INTO service_subcategories (page_slug, label, href, description, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      ['stress-test-temp', sub.label, sub.href, sub.description, sub.sort_order]
    );
  }
}

async function cleanupTempRow(): Promise<void> {
  await dbQuery('DELETE FROM service_subcategories WHERE page_slug = $1', ['stress-test-temp']);
  await dbQuery('DELETE FROM service_category_pages WHERE slug = $1', ['stress-test-temp']);
}

// Build a valid payload from a GET response for use in PUT tests
function buildPayload(body: Record<string, unknown>, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const page = (body.page ?? {}) as Record<string, unknown>;
  const global = (body.global ?? {}) as Record<string, unknown>;
  const subcategories = (body.subcategories ?? []) as unknown[];
  return {
    hero_heading: page.hero_heading,
    hero_intro: page.hero_intro,
    intro_heading: page.intro_heading,
    intro_body: page.intro_body,
    problems_heading: page.problems_heading,
    problems_items: page.problems_items,
    subcategories_heading: page.subcategories_heading,
    preventative_heading: page.preventative_heading,
    preventative_body: page.preventative_body,
    final_pitch_tagline: page.final_pitch_tagline,
    final_pitch_body: page.final_pitch_body,
    articles_featured_slugs: page.articles_featured_slugs,
    hero_image: page.hero_image,
    f_image: page.f_image,
    f3_image: page.f3_image,
    meta_title: page.meta_title,
    meta_description: page.meta_description,
    service_area_heading: global.service_area_heading,
    service_area_body: global.service_area_body,
    tiktok_headline: global.tiktok_headline,
    subcategories,
    ...overrides,
  };
}

// ── Summary ───────────────────────────────────────────────────────────────────
function printSummary(): string {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const lines: string[] = [];
  lines.push('');
  lines.push('══════════════════════════════════════════════');
  lines.push(`  RESULTS: ${passed} passed, ${failed} failed`);
  lines.push('══════════════════════════════════════════════');
  if (failed > 0) {
    lines.push('');
    lines.push('FAILURES:');
    for (const r of results.filter(r => !r.passed)) {
      lines.push(`  ✗ ${r.name}`);
      lines.push(`    ${r.detail}`);
    }
  }
  const summary = lines.join('\n');
  console.log(summary);
  return summary;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const KNOWN_SLUGS = ['sewer', 'plumbing', 'drain', 'water-heater', 'water-quality', 'commercial'];

async function main(): Promise<void> {
  console.log('=== Brief 43 — CMS API Stress Test ===');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('');

  // ── Track B — GET tests ──────────────────────────────────────────────────
  console.log('── Track B: GET endpoint ──');

  for (const slug of KNOWN_SLUGS) {
    await test(`B-1: GET /api/cms/${slug} → 200 with valid shape`, async () => {
      const { status, body } = await get(slug);
      assert(status === 200, `Expected 200, got ${status}`);
      const b = body as Record<string, unknown>;
      assert('page' in b, 'Missing "page" key in response');
      assert('subcategories' in b, 'Missing "subcategories" key in response');
      assert('global' in b, 'Missing "global" key in response');
      const page = b.page as Record<string, unknown>;
      assert('hero_heading' in page, 'page.hero_heading missing');
      assert('hero_intro' in page, 'page.hero_intro missing');
      assert(Array.isArray(b.subcategories), '"subcategories" is not an array');
      assert((b.subcategories as unknown[]).length > 0, '"subcategories" is empty');
      const nullKeys = Object.entries(page)
        .filter(([, v]) => v === null || v === undefined)
        .map(([k]) => k);
      // hero_image, f_image, f3_image, meta_* can legitimately be null
      const nonNullable = ['hero_heading', 'hero_intro', 'intro_heading', 'intro_body'];
      const badKeys = nullKeys.filter(k => nonNullable.includes(k));
      assert(badKeys.length === 0, `Nullable non-nullable fields: ${badKeys.join(', ')}`);
    });
  }

  await test('B-2: GET /api/cms/nonexistent-slug-xyz → 404', async () => {
    const { status } = await get('nonexistent-slug-xyz');
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('B-3: All known slugs have consistent top-level shape', async () => {
    const shapes: Record<string, string[]> = {};
    for (const slug of KNOWN_SLUGS) {
      const { body } = await get(slug);
      shapes[slug] = Object.keys(body as object).sort();
    }
    const baseline = shapes[KNOWN_SLUGS[0]].join(',');
    for (const slug of KNOWN_SLUGS) {
      const shape = shapes[slug].join(',');
      assert(shape === baseline, `Shape mismatch for "${slug}": expected [${baseline}], got [${shape}]`);
    }
  });

  await test('B-4a: GET /api/cms/sewer%20rodding (space) → 404, not 500', async () => {
    const res = await fetch(`${BASE_URL}/api/cms/sewer%20rodding`);
    assert(res.status !== 500, `Got 500 — server crashed`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await test('B-4b: GET /api/cms/../../etc/passwd → 404 or 400, not 500', async () => {
    // Fetch with encoded path — Next.js will handle routing
    const res = await fetch(`${BASE_URL}/api/cms/..%2F..%2Fetc%2Fpasswd`);
    assert(res.status !== 500, `Got 500 — server crashed`);
    assert(res.status === 404 || res.status === 400, `Expected 404 or 400, got ${res.status}`);
  });

  await test('B-4c: GET /api/cms/<script>alert(1)</script> → 404, not 500', async () => {
    const encoded = encodeURIComponent('<script>alert(1)</script>');
    const res = await fetch(`${BASE_URL}/api/cms/${encoded}`);
    assert(res.status !== 500, `Got 500 — server crashed`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // ── Track C — Auth tests ─────────────────────────────────────────────────
  console.log('\n── Track C: PUT auth ──');

  await test('C-1: PUT /api/cms/sewer with no auth → 401', async () => {
    const { status } = await put('sewer', { _ping: true }, null);
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('C-2: PUT /api/cms/sewer with wrong password → 401', async () => {
    const { status } = await put('sewer', { _ping: true }, 'Bearer wrongpassword');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('C-3: PUT /api/cms/sewer with correct auth → not 401', async () => {
    const { status } = await put('sewer', { _ping: true });
    assert(status !== 401, `Got 401 — auth failed with correct password`);
    assert(status === 200, `Expected 200 for _ping, got ${status}`);
  });

  // ── Track D — PUT data validation ────────────────────────────────────────
  console.log('\n── Track D: PUT data validation (slug: stress-test-temp) ──');

  // Seed the temp row
  try {
    await seedTempRow();
    console.log('  [setup] stress-test-temp seeded');
  } catch (err) {
    console.error('  [setup] FAILED to seed temp row — Track D will fail:', err);
  }

  // Fetch temp's current content for building payloads
  const { body: tempBody } = await get('stress-test-temp');
  const basePayload = buildPayload(tempBody as Record<string, unknown>);

  await test('D-1: Valid full payload saves and round-trips correctly', async () => {
    const payload = { ...basePayload, hero_heading: 'D1-stress-test-heading' };
    const { status: putStatus } = await put('stress-test-temp', payload);
    assert(putStatus === 200, `PUT returned ${putStatus}`);
    const { status: getStatus, body: getBody } = await get('stress-test-temp');
    assert(getStatus === 200, `GET after PUT returned ${getStatus}`);
    const page = (getBody as Record<string, unknown>).page as Record<string, unknown>;
    assert(page.hero_heading === 'D1-stress-test-heading', `hero_heading not saved. Got: ${page.hero_heading}`);
  });

  await test('D-2: 10,000-char hero_heading → no 500', async () => {
    const longString = 'x'.repeat(10_000);
    const payload = buildPayload(tempBody as Record<string, unknown>, { hero_heading: longString });
    const { status } = await put('stress-test-temp', payload);
    assert(status !== 500, `Got 500 — server crashed on long string`);
    // Accept 200 (saved) or 400 (rejected), document which
    const outcome = status === 200 ? 'saved (200)' : `rejected (${status})`;
    if (status !== 200 && status !== 400) throw new Error(`Unexpected status ${status}`);
    // Restore heading to avoid leaving a 10k blob
    await put('stress-test-temp', { ...basePayload, hero_heading: 'stress-test-restored' });
    results[results.length - 1].detail = `${outcome} — server did not crash`;
  });

  const specialChars = `"'<script>alert(1)</script>\n\t—""&amp;NULL`;
  await test('D-3: Special characters round-trip without corruption or 500', async () => {
    const payload = buildPayload(tempBody as Record<string, unknown>, {
      hero_heading: specialChars,
      hero_intro: specialChars,
    });
    const { status: putStatus } = await put('stress-test-temp', payload);
    assert(putStatus !== 500, `PUT returned 500 on special characters`);
    if (putStatus === 200) {
      const { body: getBody } = await get('stress-test-temp');
      const page = (getBody as Record<string, unknown>).page as Record<string, unknown>;
      assert(page.hero_heading === specialChars, `hero_heading corrupted. Got: ${JSON.stringify(page.hero_heading)}`);
    }
    // Restore
    await put('stress-test-temp', { ...basePayload, hero_heading: 'stress-test-restored' });
  });

  await test('D-4: Empty hero_heading and hero_intro → no crash', async () => {
    const payload = buildPayload(tempBody as Record<string, unknown>, { hero_heading: '', hero_intro: '' });
    const { status } = await put('stress-test-temp', payload);
    assert(status !== 500, `Got 500 — server crashed on empty strings`);
    assert(status === 200 || status === 400, `Unexpected status ${status}`);
    const outcome = status === 200 ? 'accepted (200)' : `rejected (${status})`;
    results[results.length - 1].detail = `${outcome} — no crash`;
    // Restore
    await put('stress-test-temp', { ...basePayload });
  });

  await test('D-5: Missing hero_heading field → no 500', async () => {
    const payload = { ...basePayload };
    delete (payload as Record<string, unknown>).hero_heading;
    const { status } = await put('stress-test-temp', payload);
    assert(status !== 500, `Got 500 — server crashed on missing hero_heading`);
    const outcome = status === 200 ? 'accepted (200)' : `rejected (${status})`;
    results[results.length - 1].detail = `${outcome} — no crash`;
    await put('stress-test-temp', { ...basePayload });
  });

  await test('D-6: Wrong types (subcategories as string, hero_heading as number) → no 500', async () => {
    const payload = buildPayload(tempBody as Record<string, unknown>, {
      subcategories: 'not-an-array',
      hero_heading: 12345,
    });
    const { status } = await put('stress-test-temp', payload);
    assert(status !== 500, `Got 500 — server crashed on wrong types`);
    results[results.length - 1].detail = `status ${status} — no crash`;
    await put('stress-test-temp', { ...basePayload });
  });

  await test('D-7: Null hero_heading → no 500', async () => {
    const payload = buildPayload(tempBody as Record<string, unknown>, { hero_heading: null });
    const { status } = await put('stress-test-temp', payload);
    assert(status !== 500, `Got 500 — server crashed on null hero_heading`);
    results[results.length - 1].detail = `status ${status} — no crash`;
    await put('stress-test-temp', { ...basePayload });
  });

  await test('D-8a: Empty subcategories array → no crash', async () => {
    const payload = buildPayload(tempBody as Record<string, unknown>, { subcategories: [] });
    const { status } = await put('stress-test-temp', payload);
    assert(status !== 500, `Got 500 — server crashed on empty subcategories`);
    await put('stress-test-temp', { ...basePayload });
  });

  await test('D-8b: Subcategory with all fields blank → no crash', async () => {
    const blankSub = [{ label: '', href: '', description: '', sort_order: 0 }];
    const payload = buildPayload(tempBody as Record<string, unknown>, { subcategories: blankSub });
    const { status } = await put('stress-test-temp', payload);
    assert(status !== 500, `Got 500 — server crashed on blank subcategory fields`);
    await put('stress-test-temp', { ...basePayload });
  });

  await test('D-8c: Subcategory missing label field → no crash', async () => {
    const noLabelSub = [{ href: '/sewer', description: 'test', sort_order: 0 }];
    const payload = buildPayload(tempBody as Record<string, unknown>, { subcategories: noLabelSub });
    const { status } = await put('stress-test-temp', payload);
    assert(status !== 500, `Got 500 — server crashed on subcategory missing label`);
    results[results.length - 1].detail = `status ${status} — no crash`;
  });

  await test('D-9: PUT to existing slug "sewer" updates, does not duplicate', async () => {
    // Get sewer's current data
    const { body: sewerBody } = await get('sewer');
    const originalHeading = ((sewerBody as Record<string, unknown>).page as Record<string, unknown>).hero_heading as string;
    const payload = buildPayload(sewerBody as Record<string, unknown>, {
      hero_heading: originalHeading, // keep same value — safe, non-destructive
    });
    const { status: putStatus } = await put('sewer', payload);
    assert(putStatus === 200, `PUT to sewer returned ${putStatus}`);
    // Verify only one row
    const dbRes = await dbQuery('SELECT COUNT(*) as cnt FROM service_category_pages WHERE slug = $1', ['sewer']);
    const count = Number(dbRes.rows[0].cnt);
    assert(count === 1, `Expected 1 row for sewer, found ${count}`);
  });

  // D-10: Cleanup
  await test('D-10: stress-test-temp row deleted and GET returns 404', async () => {
    await cleanupTempRow();
    const { status } = await get('stress-test-temp');
    assert(status === 404, `Expected 404 after cleanup, got ${status}`);
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  const summaryText = printSummary();

  // ── Write results file ───────────────────────────────────────────────────
  const timestamp = new Date().toISOString();
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  const allLines: string[] = [
    `CMS API Stress Test Results`,
    `Generated: ${timestamp}`,
    `Target: ${BASE_URL}`,
    ``,
    `SUMMARY: ${passed} passed, ${failed} failed`,
    ``,
    `ALL RESULTS:`,
  ];
  for (const r of results) {
    allLines.push(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
    if (!r.passed || r.detail !== 'OK') {
      allLines.push(`         ${r.detail}`);
    }
  }
  if (failed > 0) {
    allLines.push('');
    allLines.push('FAILURES DETAIL:');
    for (const r of results.filter(r => !r.passed)) {
      allLines.push(`  ✗ ${r.name}`);
      allLines.push(`    ${r.detail}`);
    }
  }
  allLines.push('');
  allLines.push(summaryText);

  const resultsPath = path.resolve(__dirname, 'stress-test-cms-results.txt');
  fs.writeFileSync(resultsPath, allLines.join('\n'), 'utf-8');
  console.log(`\nResults written to: ${resultsPath}`);

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  pool.end();
  process.exit(2);
});
