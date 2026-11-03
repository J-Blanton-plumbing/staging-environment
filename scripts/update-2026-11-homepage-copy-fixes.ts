/**
 * Homepage copy fixes (Marketing, JBP_Homepage_Copy_Fixes.md, 2026-11-03) — items 1–11 on the LIVE
 * homepage (Homepage 2026) and the office addresses it shares with the footer. Item 12 (one address
 * style for all 19 offices) is optional and NOT part of this script.
 *
 * Part A — the Homepage 2026 record (`main_pages` row `home-2026`), one new published version:
 *   2  Water Heater card    "…J. Blanton Plumbing’s."            → "…J. Blanton Plumbing’s water heater services."
 *   3  Services intro       "plumbers are always"                → "plumbers is always"
 *   4  No Drip Club         "home checkups, emergency repairs,"  → "home checkups and emergency repairs,"
 *   5  Central Ohio card    "Now serving, 138 communities"       → "Now serving 138 communities"
 *                           (its own line, `areas_stat_template_columbus`; Chicagoland keeps "30+ years, …")
 *   6  Why video title      "Turning Bad Calls to Good Calls"    → "Turning Bad Calls into Good Calls"
 *   7  Why, paragraph 2     "to restore order and peace back into the homes" → "to bring order and peace back to the homes"
 *   8  Why, paragraph 1     "we understand the importance of an owner’s home." → "we understand how much your home means to you."
 *   9  Areas heading        "Areas We Service"                   → "Areas We Serve"
 * Part B — `global_settings.offices` (homepage Local Offices list + the footer on every page):
 *   1  McHenry   city "Mchenry"                  → "McHenry"
 *  10  Algonquin "2390 Esplanade Dr #200f"       → "2390 Esplanade Dr #200F"
 *  11  Hinsdale  "15 Spinning Wheel Rd #216a"    → "15 Spinning Wheel Rd #216A"
 *
 * Each fix replaces its exact old text only. Already new → nothing to do; neither old nor new (edited
 * in /admin since) → that ONE fix is skipped and listed, the others still apply (Brief 186: editor
 * state is reported, exit 0). Offices are matched by slug, never by index; the prior `offices` value is
 * backed up before the write. Everything is read back. Idempotent: ALREADY-APPLIED from then on.
 *
 * Pre-swap is fine: the build being replaced renders every changed string as-is and ignores the new
 * `areas_stat_template_columbus` key (its Ohio line keeps the comma until the swap).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-2026-11-homepage-copy-fixes.ts          # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-2026-11-homepage-copy-fixes.ts commit   # apply
 */
import { existsSync, readFileSync } from 'fs';

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  const m = readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.*)$/m);
  if (m) process.env.DATABASE_URL = m[1].trim();
}

/* eslint-disable import/first */
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { HOME_2026_PAGE_TYPE, HOME_2026_SLUG, HOME_2026_TEMPLATE } from '../src/lib/cms/home-2026-content';
import { authorId } from './lib/city-pages-seed';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'update-2026-11-homepage-copy-fixes';
const mode = resolveRunMode(SCRIPT, process.argv.slice(2));
const LABEL = 'Copy fixes (Marketing 2026-11-03)';

type Content = Record<string, unknown>;
type Fix = { item: number; where: string; get: (c: Content) => string | undefined; set: (c: Content, v: string) => void; old: string; next: string; exact?: boolean };

const field = (key: string) => ({ get: (c: Content) => (typeof c[key] === 'string' ? (c[key] as string) : undefined), set: (c: Content, v: string) => (c[key] = v) });
const card = (id: string) => {
  const find = (c: Content) => (Array.isArray(c.services_cards) ? (c.services_cards as Array<Record<string, unknown>>) : []).find((x) => x?.id === id);
  return { get: (c: Content) => (typeof find(c)?.description === 'string' ? (find(c)!.description as string) : undefined), set: (c: Content, v: string) => (find(c)!.description = v) };
};

const HOME_FIXES: Fix[] = [
  { item: 2, where: 'Water Heater card', ...card('water-heater'), old: 'Ensure consistent hot water with J. Blanton Plumbing’s.', next: 'Ensure consistent hot water with J. Blanton Plumbing’s water heater services.', exact: true },
  { item: 3, where: 'Services intro', ...field('services_intro'), old: 'plumbers are always', next: 'plumbers is always' },
  { item: 4, where: 'No Drip Club body', ...field('ndc_body'), old: 'home checkups, emergency repairs, and unlock', next: 'home checkups and emergency repairs, and unlock' },
  { item: 6, where: 'Why J. Blanton video title', ...field('why_video_title'), old: 'Turning Bad Calls to Good Calls', next: 'Turning Bad Calls into Good Calls', exact: true },
  { item: 7, where: 'Why J. Blanton paragraph 2', ...field('why_body'), old: 'to restore order and peace back into the homes', next: 'to bring order and peace back to the homes' },
  { item: 8, where: 'Why J. Blanton paragraph 1', ...field('why_body'), old: 'we understand the importance of an owner’s home.', next: 'we understand how much your home means to you.' },
  { item: 9, where: 'Areas heading', ...field('areas_heading'), old: 'Areas We Service', next: 'Areas We Serve', exact: true },
];
const COLUMBUS_STAT = 'areas_stat_template_columbus';
const COLUMBUS_STAT_VALUE = '{tenure} {count} communities';

type Office = Record<string, unknown>;
const OFFICE_FIXES = [
  { item: 1, slug: 'mchenry', key: 'city', old: 'Mchenry', next: 'McHenry' },
  { item: 10, slug: 'algonquin', key: 'streetAddress', old: '2390 Esplanade Dr #200f', next: '2390 Esplanade Dr #200F' },
  { item: 11, slug: 'hinsdale', key: 'streetAddress', old: '15 Spinning Wheel Rd #216a', next: '15 Spinning Wheel Rd #216A' },
];
const normSlug = (s: unknown) => (typeof s === 'string' ? s.trim().replace(/^\//, '').toLowerCase() : '');

type Line = { item: number; where: string; state: 'change' | 'already' | 'skipped'; detail: string };
/** One text fix: 'change' (patched into `c`), 'already', or 'skipped' (neither old nor new text found). */
function applyText(c: Content, f: Fix): Line {
  const cur = f.get(c);
  const base = { item: f.item, where: f.where };
  if (cur === undefined) return { ...base, state: 'skipped', detail: 'field missing — left alone' };
  const isNew = f.exact ? cur === f.next : cur.includes(f.next);
  if (isNew) return { ...base, state: 'already', detail: 'already fixed' };
  const isOld = f.exact ? cur === f.old : cur.split(f.old).length === 2;
  if (!isOld) return { ...base, state: 'skipped', detail: `edited in /admin since ("${cur.slice(0, 90)}") — left alone` };
  f.set(c, f.exact ? f.next : cur.replace(f.old, f.next));
  return { ...base, state: 'change', detail: `"${f.old}" → "${f.next}"` };
}

async function nextLabel(): Promise<string> {
  const n = Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM page_drafts WHERE page_type = $1 AND page_slug = $2`, [HOME_2026_PAGE_TYPE, HOME_2026_SLUG])).rows[0].n) + 1;
  return `Version ${n} — ${LABEL}`;
}

async function partA(apply: boolean): Promise<{ lines: Line[]; failed: string | null; published: number | null }> {
  const row = (await pool.query<{ status: string; content: Content | null }>(`SELECT status, content FROM main_pages WHERE slug = $1`, [HOME_2026_SLUG])).rows[0];
  if (!row || !row.content || row.status !== 'published') {
    return { lines: [{ item: 0, where: 'Homepage 2026', state: 'skipped', detail: `no published Homepage 2026 record (${row ? row.status : 'no row'}) — left alone` }], failed: null, published: null };
  }
  const content: Content = JSON.parse(JSON.stringify(row.content));
  const lines = HOME_FIXES.map((f) => applyText(content, f));
  const stat = typeof content[COLUMBUS_STAT] === 'string' ? (content[COLUMBUS_STAT] as string) : '';
  if (!stat.trim()) {
    content[COLUMBUS_STAT] = COLUMBUS_STAT_VALUE;
    lines.push({ item: 5, where: 'Central Ohio card line', state: 'change', detail: `new field ${COLUMBUS_STAT} = "${COLUMBUS_STAT_VALUE}" ("Now serving 138 communities")` });
  } else lines.push({ item: 5, where: 'Central Ohio card line', state: stat === COLUMBUS_STAT_VALUE ? 'already' : 'skipped', detail: stat === COLUMBUS_STAT_VALUE ? 'already fixed' : `edited in /admin since ("${stat}") — left alone` });

  if (!lines.some((l) => l.state === 'change') || !apply) return { lines, failed: null, published: null };
  const id = (await createDraft({ pageType: HOME_2026_PAGE_TYPE, pageSlug: HOME_2026_SLUG, label: await nextLabel(), content: { ...content, template: HOME_2026_TEMPLATE }, createdBy: await authorId() })).id;
  await publishDraft(id, await authorId());
  const after = (await pool.query<{ content: Content }>(`SELECT content FROM main_pages WHERE slug = $1`, [HOME_2026_SLUG])).rows[0]?.content ?? {};
  const bad = HOME_FIXES.filter((f, i) => lines[i].state === 'change' && !(f.exact ? f.get(after) === f.next : f.get(after)?.includes(f.next)));
  if (after[COLUMBUS_STAT] !== (stat.trim() ? stat : COLUMBUS_STAT_VALUE)) bad.push({ item: 5 } as Fix);
  return { lines, failed: bad.length ? `published version #${id} but item(s) ${bad.map((b) => b.item).join(', ')} did not read back` : null, published: id };
}

async function partB(apply: boolean): Promise<{ lines: Line[]; failed: string | null }> {
  const row = (await pool.query<{ id: number; offices: unknown }>(`SELECT id, offices FROM global_settings WHERE id = 1`)).rows[0];
  if (!row || !Array.isArray(row.offices)) return { lines: [{ item: 0, where: 'Global Settings offices', state: 'skipped', detail: 'no offices array — left alone' }], failed: null };
  const before = row.offices as Office[];
  const offices: Office[] = JSON.parse(JSON.stringify(before));
  const lines: Line[] = OFFICE_FIXES.map((f) => {
    const where = `${f.slug} office ${f.key}`;
    const o = offices.find((x) => normSlug(x.slug) === f.slug);
    if (!o) return { item: f.item, where, state: 'skipped', detail: 'no office with that slug — left alone' };
    if (o[f.key] === f.next) return { item: f.item, where, state: 'already', detail: 'already fixed' };
    if (o[f.key] !== f.old) return { item: f.item, where, state: 'skipped', detail: `edited in /admin since ("${String(o[f.key])}") — left alone` };
    o[f.key] = f.next;
    return { item: f.item, where, state: 'change', detail: `"${f.old}" → "${f.next}"` };
  });
  if (!lines.some((l) => l.state === 'change') || !apply) return { lines, failed: null };

  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS copyfix_2026_11_row_backup (
      id SERIAL PRIMARY KEY, source_table TEXT NOT NULL, source_id INTEGER NOT NULL, reason TEXT NOT NULL,
      row_json JSONB NOT NULL, backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await client.query('BEGIN');
    await client.query(`INSERT INTO copyfix_2026_11_row_backup (source_table, source_id, reason, row_json) VALUES ('global_settings', $1, $2, $3)`, [
      row.id,
      'offices before the homepage copy fixes (McHenry, #200F, #216A)',
      JSON.stringify(before),
    ]);
    const upd = await client.query(`UPDATE global_settings SET offices = $1::jsonb WHERE id = $2`, [JSON.stringify(offices), row.id]);
    if (upd.rowCount !== 1) throw new Error(`expected to update 1 row, updated ${upd.rowCount}`);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  const after = ((await pool.query<{ offices: Office[] }>(`SELECT offices FROM global_settings WHERE id = $1`, [row.id])).rows[0]?.offices ?? []) as Office[];
  const bad = OFFICE_FIXES.filter((f, i) => lines[i].state === 'change' && after.find((x) => normSlug(x.slug) === f.slug)?.[f.key] !== f.next);
  if (after.length !== before.length || after.map((o) => o.slug).join() !== before.map((o) => o.slug).join()) return { lines, failed: 'offices were reordered or lost' };
  return { lines, failed: bad.length ? `item(s) ${bad.map((b) => b.item).join(', ')} did not read back` : null };
}

async function main() {
  announceMode(SCRIPT, mode);
  const apply = mode === 'commit';
  const a = await partA(apply);
  const b = await partB(apply);
  const lines = [...a.lines, ...b.lines].sort((x, y) => x.item - y.item);
  for (const l of lines) console.log(`  ${l.state.padEnd(8)} #${String(l.item).padEnd(2)} ${l.where} — ${l.detail}`);
  if (a.published) console.log(`  Homepage 2026: published version #${a.published} "${LABEL}"`);

  const failed = [a.failed && `Homepage 2026: ${a.failed}`, b.failed && `offices: ${b.failed}`].filter(Boolean);
  const changes = lines.filter((l) => l.state === 'change').length;
  const skipped = lines.filter((l) => l.state === 'skipped');
  const tail = skipped.length ? `; skipped (edited in /admin): #${skipped.map((s) => s.item).join(', #')}` : '';
  if (failed.length) {
    console.error(`FAILED: ${failed.join('; ')}`);
    process.exitCode = 1;
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', failed.join('; '));
    return;
  }
  if (!apply) {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${changes} fix(es) would apply${tail}`);
    return;
  }
  if (!changes && skipped.length) {
    verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', `nothing to apply${tail}`);
    return;
  }
  verdict(SCRIPT, changes ? 'APPLIED' : 'ALREADY-APPLIED', `${changes} fix(es) applied${tail}`);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
