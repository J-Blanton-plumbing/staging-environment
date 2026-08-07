/**
 * Brief 147 (Track B) QA — proves the save/publish optimistic-lock tokens stay in
 * sync for the EDITOR'S OWN writes while still catching a genuinely concurrent
 * edit from another session.
 *
 * ── THE BUG THIS LOCKS DOWN ──────────────────────────────────────────────────
 * `page_drafts.base_version` was snapshotted when a draft was created and never
 * moved again, and `publishDraft` returned nothing. So:
 *
 *   • the author's own "Save Page" bumped `sub_service_pages.version`, which made
 *     their own draft look stale forever — Publish answered "The live page has
 *     changed since this draft was created" about an edit made seconds earlier in
 *     the same browser tab, and a reload did not clear it (the baseline lives on
 *     the draft row, not in the page);
 *   • a successful publish bumped the live version behind the editor's back, so
 *     every later direct save 409'd with "changed by someone else" until a full
 *     browser reload.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────
 * Case A (self-save → NO warning)
 *   1. direct save with the loaded version succeeds and returns the new version
 *   2. a second direct save with THAT returned version succeeds (no false 409)
 *   3. after `rebaselineDraft`, publishing the author's own draft succeeds
 *   4. the publish returns the live row's new version, and a direct save using it
 *      succeeds — the token an editor gets back from a publish is usable
 *   5. re-publishing the same draft still succeeds (publish re-baselines itself)
 *
 * Case B (foreign save → warning KEPT)
 *   6. a direct save that echoes a stale version is rejected (ConflictError)
 *   7. a draft whose live row moved on by someone else refuses to publish
 *   8. `rebaselineDraft` refuses to touch a draft the caller did not create (403)
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * Touches NO real content. It creates a throwaway `sub_service_pages` row
 * (slug `brief147-version-sync-probe`) plus its drafts, and deletes both at the
 * end — including on failure. The slug is not in SUB_SERVICE_ROUTES, so it has no
 * public route and cannot reach the sitemap while it exists. Re-runnable: any
 * leftover probe rows are cleaned up before it starts.
 *
 * Exits non-zero on any failed assertion.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/verify-brief-147-version-sync.ts
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const DB = get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms';
process.env.DATABASE_URL = DB; // the `@/lib/db` pool the writers use reads this
const pool = new Pool({ connectionString: DB });

const SLUG = 'brief147-version-sync-probe';
let failures = 0;

function check(ok: boolean, msg: string) {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures++;
}

/** Run `fn` and report which error (if any) came back. */
async function expectConflict(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(false, `${label} — expected a conflict, but the write was ACCEPTED`);
  } catch (err) {
    const code = (err as { code?: string }).code;
    const msg = err instanceof Error ? err.message : String(err);
    check(code === '409', `${label} — rejected: ${msg.slice(0, 78)}`);
  }
}

async function cleanup() {
  await pool.query(`DELETE FROM page_drafts WHERE page_slug = $1`, [SLUG]);
  await pool.query(`DELETE FROM page_changelog WHERE page_slug = $1`, [SLUG]).catch(() => {});
  await pool.query(`DELETE FROM sub_service_pages WHERE slug = $1`, [SLUG]);
}

/** Editor content payload — one hero block, as the sub-service editor sends it. */
function content(marker: string) {
  return {
    title: 'Brief 147 probe',
    status: 'published',
    blocks: [
      { id: 'hero-probe', type: 'hero', data: { heroHeading: `probe ${marker}`, heroIntro: marker } },
    ],
  };
}

async function liveVersion(): Promise<number> {
  const r = await pool.query<{ version: number }>('SELECT version FROM sub_service_pages WHERE slug = $1', [SLUG]);
  return r.rows[0].version;
}

async function baseVersion(id: number): Promise<number | null> {
  const r = await pool.query<{ base_version: number | null }>('SELECT base_version FROM page_drafts WHERE id = $1', [id]);
  return r.rows[0].base_version;
}

async function main() {
  const { createDraft, publishDraft, rebaselineDraft } = await import('@/lib/cms/drafts');
  const { updateSubServiceCmsContent } = await import('@/lib/cms/sub-service-pages');

  // Two distinct CMS users so "the other session" is genuinely someone else.
  const users = await pool.query<{ id: number }>('SELECT id FROM cms_users ORDER BY id LIMIT 2');
  if (users.rowCount !== 2) throw new Error('need at least 2 cms_users rows to test the foreign-editor case');
  const [ME, OTHER] = users.rows.map((r) => r.id);

  await cleanup();
  await pool.query(
    `INSERT INTO sub_service_pages (slug, title, status, created_by, updated_by)
     VALUES ($1, 'Brief 147 probe', 'draft', $2, $2)`,
    [SLUG, ME]
  );
  console.log(`probe row created: sub_service_pages "${SLUG}" (users ${ME} / ${OTHER})\n`);

  // ── Case A — the editor's own writes must never warn ───────────────────────
  console.log('Case A — self-save → NO conflict warning');
  const v0 = await liveVersion();
  const draftA = await createDraft({
    pageType: 'sub-service', pageSlug: SLUG, label: 'Probe A',
    content: content('a1'), createdBy: ME,
  });
  check(draftA.base_version === v0, `draft created with base_version ${draftA.base_version} = live version ${v0}`);

  const v1 = await updateSubServiceCmsContent(SLUG, content('a2'), ME, v0);
  check(v1 === v0 + 1, `direct save with the loaded version succeeded → version ${v1}`);

  const v2 = await updateSubServiceCmsContent(SLUG, content('a3'), ME, v1);
  check(v2 === v1 + 1, `second direct save using the RETURNED version succeeded → version ${v2}`);

  const reb = await rebaselineDraft(draftA.id, ME);
  check(reb.baseVersion === v2, `rebaselineDraft moved the draft baseline ${draftA.base_version} → ${reb.baseVersion}`);

  const pub = await publishDraft(draftA.id, ME);
  check(pub.liveVersion === v2 + 1, `publishing the author's own draft succeeded → live version ${pub.liveVersion}`);

  const v4 = await updateSubServiceCmsContent(SLUG, content('a4'), ME, pub.liveVersion);
  check(v4 === (pub.liveVersion ?? 0) + 1, `direct save using the version the PUBLISH returned succeeded → ${v4}`);

  await rebaselineDraft(draftA.id, ME);
  const pub2 = await publishDraft(draftA.id, ME);
  check(pub2.liveVersion === v4 + 1, `re-publishing the same draft succeeded → live version ${pub2.liveVersion}`);

  // ── Case B — a genuinely concurrent edit must still warn ───────────────────
  console.log('\nCase B — foreign save → conflict warning KEPT');
  const vb = await liveVersion();
  await expectConflict('direct save echoing a stale version', () =>
    updateSubServiceCmsContent(SLUG, content('b1'), ME, vb - 1)
  );

  const draftB = await createDraft({
    pageType: 'sub-service', pageSlug: SLUG, label: 'Probe B',
    content: content('b2'), createdBy: ME,
  });
  // Another session publishes its own work onto the live row (no expectedVersion —
  // exactly what the draft-publish path does), so draftB's baseline is now behind.
  const vForeign = await updateSubServiceCmsContent(SLUG, content('foreign'), OTHER);
  check(vForeign > (draftB.base_version ?? 0), `another session moved the live row to ${vForeign}`);
  await expectConflict('publishing a draft whose live row someone else moved', () =>
    publishDraft(draftB.id, ME)
  );

  const before = await baseVersion(draftB.id);
  try {
    await rebaselineDraft(draftB.id, OTHER);
    check(false, "rebaselineDraft accepted another user's draft — it must not");
  } catch (err) {
    const code = (err as { code?: string }).code;
    check(code === '403', `rebaselineDraft refused a draft created by someone else (${code})`);
  }
  check(
    (await baseVersion(draftB.id)) === before,
    'the refused re-baseline left the draft baseline untouched'
  );
}

main()
  .then(async () => {
    await cleanup();
    console.log(`\nprobe row + drafts deleted.`);
    console.log(failures === 0 ? 'PASS — all assertions held.' : `FAIL — ${failures} assertion(s) failed.`);
    if (failures > 0) process.exitCode = 1;
  })
  .catch(async (e) => {
    console.error('FAILED:', e);
    await cleanup().catch(() => {});
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
