/**
 * Brief 219 (Track C2) — seed the `main_pages` row `home` with every homepage field, at TODAY'S LIVE
 * values, BEFORE the code that reads them is swapped in.
 *
 * ── WHY ──────────────────────────────────────────────────────────────────────
 * Brief 219 makes the whole homepage editable in /admin/home and removes the HERO_V5 code override.
 * The row still holds the PRE-v5 hero copy that override has hidden since 2026-09-02 (hero_tagline
 * "30+ years in Chicagoland…", hero_intro "Home is where life happens…", hero_cta "Make a Good
 * Call!"). Swapping the code without this seed would put that old copy back live. Seed first.
 *
 * ── WHAT IT WRITES ───────────────────────────────────────────────────────────
 *   • First run only (the row has no `hero_line_lead` yet): the hero fields are SET to the live hero —
 *     hero_tagline / hero_cta / hero_intro (overwriting the hidden pre-v5 values, which are backed up),
 *     hero_line_lead, hero_rotator_words. Those old values never rendered, so this changes nothing.
 *   • Every other field (`HOME_SCALAR_FIELDS`, `knowledge_hub_featured`): FILL GAPS ONLY. A blank or
 *     missing field gets the value the page renders for it today; a non-blank value is never touched.
 *   • Keys the model doesn't own (e.g. the retired `hero_heading`) are kept as they are.
 *
 * ── HOW ──────────────────────────────────────────────────────────────────────
 * Like every content write since Brief 216: the prior row goes into `brief219_row_backup`, then a NEW
 * VERSION is created and PUBLISHED through the normal writer (`createDraft` + `publishDraft` → the
 * main-page writer → `sanitizeHomeContent`). That bumps `version`, so an /admin/home editor that is
 * open on the old content gets a conflict instead of saving it back, and the version history shows
 * exactly what changed. The live title / description are carried through unchanged.
 *
 * ── SAFE BEFORE THE SWAP ─────────────────────────────────────────────────────
 * The build still serving traffic ignores every new key and overrides the three hero keys in code, so
 * the page is unchanged while this runs. Verified after writing: the content renders (through the new
 * resolver) exactly what the old code rendered.
 *
 * Idempotent: once every field is present it reports ALREADY-APPLIED. Content state is never a
 * failure (Brief 186); exit 1 only for a code/schema fault.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-219-home-content.ts          # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-219-home-content.ts commit   # apply
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// src/lib/db reads DATABASE_URL at import; fill it from .env.local for a local run (deploy.sh exports it).
if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  const m = readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.*)$/m);
  if (m) process.env.DATABASE_URL = m[1].trim();
}

/* eslint-disable import/first */
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { HOME } from '../src/lib/content/home';
import { HOME_LIST_DEFAULTS, HOME_SCALAR_FIELDS, resolveHomeContent } from '../src/lib/cms/home-content';
import { authorId } from './lib/city-pages-seed';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-brief-219-home-content';
const mode = resolveRunMode(SCRIPT);
const LABEL = 'All homepage fields editable (Brief 219, 2026-10)';

const blank = (v: unknown) => typeof v !== 'string' || v.trim() === '';
const emptyList = (v: unknown) => !Array.isArray(v) || v.length === 0;
/** JSON with object keys sorted — a JSONB read comes back key-sorted, so compare in that form. */
const canon = (v: unknown) =>
  JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x));

/** The live hero (Brief 218, copy locked 2026-10-26) — what the HERO_V5 override rendered. */
const LIVE_HERO = {
  hero_tagline: HOME.hero.eyebrow,
  hero_line_lead: HOME.hero.lineLead,
  hero_intro: HOME.hero.intro,
  hero_cta: HOME.hero.ctaLabel,
};

async function main() {
  announceMode(SCRIPT, mode);
  const row = (
    await pool.query<{ id: number; version: number; content: Record<string, unknown> | null; meta_title: string | null; meta_description: string | null }>(
      `SELECT id, version, content, meta_title, meta_description FROM main_pages WHERE slug = 'home'`
    )
  ).rows[0];
  if (!row) {
    verdict(SCRIPT, 'ALREADY-APPLIED', 'no main_pages home row — the page renders the code fallback, which is the live copy');
    return;
  }
  const before = row.content ?? {};
  const next: Record<string, unknown> = { ...before };
  const changes: string[] = [];

  const firstRun = !('hero_line_lead' in before);
  if (firstRun) {
    for (const [k, val] of Object.entries(LIVE_HERO)) {
      if (next[k] !== val) changes.push(`${k}: ${JSON.stringify(next[k] ?? null)} → ${JSON.stringify(val)}`);
      next[k] = val;
    }
    if (canon(next.hero_rotator_words) !== canon(HOME_LIST_DEFAULTS.hero_rotator_words)) changes.push('hero_rotator_words: set to the live words');
    next.hero_rotator_words = HOME_LIST_DEFAULTS.hero_rotator_words.map((x) => ({ ...x }));
  }
  for (const [k, f] of Object.entries(HOME_SCALAR_FIELDS)) {
    if (blank(next[k])) {
      changes.push(`${k}: blank → default`);
      next[k] = f.def;
    }
  }
  if (emptyList(next.hero_rotator_words)) {
    changes.push('hero_rotator_words: empty → the live words');
    next.hero_rotator_words = HOME_LIST_DEFAULTS.hero_rotator_words.map((x) => ({ ...x }));
  }
  if (emptyList(next.knowledge_hub_featured)) {
    changes.push('knowledge_hub_featured: empty → the live 3 articles');
    next.knowledge_hub_featured = HOME_LIST_DEFAULTS.knowledge_hub_featured.map((x) => ({ ...x }));
  }

  console.log(`main_pages/home (id ${row.id}, version ${row.version}) — ${firstRun ? 'first run' : 'hero already seeded'}; ${changes.length} change(s):`);
  for (const c of changes) console.log(`  - ${c}`);

  // The gate: with the new resolver, the seeded content renders exactly what today's page renders
  // (the old code: the stored values, with the hero overridden by the live hero copy).
  const today = resolveHomeContent(firstRun ? { ...before, ...LIVE_HERO, hero_rotator_words: HOME_LIST_DEFAULTS.hero_rotator_words } : before);
  const seeded = resolveHomeContent(next);
  if (canon(today) !== canon(seeded)) throw new Error(`the seeded content would render differently from today:\n  today  ${canon(today)}\n  seeded ${canon(seeded)}`);

  if (changes.length === 0) {
    verdict(SCRIPT, 'ALREADY-APPLIED', 'every homepage field is present');
    return;
  }
  if (mode !== 'commit') {
    console.log('\nNo changes were written. Re-run with `commit` to apply.');
    verdict(SCRIPT, 'NOT-APPLIED (dry run)');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS brief219_row_backup (
      id            SERIAL PRIMARY KEY,
      source_table  TEXT NOT NULL,
      source_key    TEXT NOT NULL,
      reason        TEXT NOT NULL,
      row_json      JSONB NOT NULL,
      backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await pool.query(
    `INSERT INTO brief219_row_backup (source_table, source_key, reason, row_json) VALUES ('main_pages', 'home', $1, $2)`,
    ['home content before the Brief 219 seed (Track C2)', JSON.stringify({ version: row.version, content: before, meta_title: row.meta_title, meta_description: row.meta_description })]
  );

  const by = await authorId();
  const n = Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM page_drafts WHERE page_type = 'main' AND page_slug = 'home'`)).rows[0].n) + 1;
  const draft = await createDraft({
    pageType: 'main',
    pageSlug: 'home',
    label: `Version ${n} — ${LABEL}`,
    content: { ...next, meta_title: row.meta_title, meta_description: row.meta_description },
    createdBy: by,
  });
  await publishDraft(draft.id, by);

  const after = (await pool.query<{ content: Record<string, unknown>; meta_title: string | null; meta_description: string | null; version: number }>(
    `SELECT content, meta_title, meta_description, version FROM main_pages WHERE id = $1`,
    [row.id]
  )).rows[0];
  if (canon(resolveHomeContent(after.content)) !== canon(today)) throw new Error('verify failed: the published content does not render what today’s page renders.');
  if (after.meta_title !== row.meta_title || after.meta_description !== row.meta_description) throw new Error('verify failed: the title / description changed.');
  for (const k of Object.keys(HOME_SCALAR_FIELDS)) if (blank(after.content[k])) throw new Error(`verify failed: ${k} is still blank.`);
  console.log(`verify: published version #${draft.id} (row version ${row.version} → ${after.version}); renders exactly today's page.`);

  const dir = join(process.cwd(), 'scripts', 'backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(join(dir, `brief-219-home-content-${mode}-${stamp}.json`), JSON.stringify({ before, after: after.content, changes }, null, 2));
  verdict(SCRIPT, 'APPLIED', `${changes.length} field(s) written; published version #${draft.id}`);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
