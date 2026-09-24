/**
 * Brief 187 (Track E) — backfill STOP 2: apply Marketing's APPROVED tags.
 *
 * ⚠ WRITTEN IN BRIEF 187, NOT RUN AND NOT WIRED INTO scripts/deploy.sh. It runs
 * only after Marketing returns the reviewed proposal spreadsheet, in a separate
 * session that commits that file as:
 *
 *     scripts/data/brief-187-article-tags-approved.csv
 *
 * (the brief named `data/…` at the repo root; `scripts/data/` is where every
 * other checked-in script input lives — e.g. wp-article-ids.json — so the file
 * goes there. `--csv=path` overrides.)
 *
 * ── WHAT IT DOES ────────────────────────────────────────────────────────────
 *   • Reads the CSV (UTF-8, BOM tolerated, the Stop 1 column set).
 *   • ONLY rows with decision = "approve" (case-insensitive). "skip", blank or
 *     anything else → untouched.
 *   • Articles are matched by SLUG. `article_id` is informational only: ids are
 *     not portable between databases (the proposals were built on the dev DB).
 *   • Names match `kh_terms` case-insensitively; a slug or "Name (Region)" also
 *     works (Woodstock exists in both regions). An unknown name REJECTS THAT ROW
 *     (listed in the summary); every other row still applies.
 *   • IDEMPOTENT: an approved article's tags are REPLACED with exactly the CSV's
 *     tags, so a re-run is a no-op (reported ALREADY-APPLIED).
 *   • BACKUP FIRST (the Brief 143 pattern): the affected articles' current
 *     `cms_article_terms` rows go to `brief187_article_terms_backup` (one run id
 *     per run) and to scripts/backups/ as JSON, before anything is written.
 *
 * ── WHY IT WRITES THE PUBLISHED STATE DIRECTLY ──────────────────────────────
 * This is a bulk data import, not an editorial change, so it writes
 * `cms_article_terms` (what the site shows) rather than creating 812 draft
 * versions for someone to publish. That is safe with the Track B1 mechanism:
 *   • a version saved before tags existed has NO `terms` key, and publishing it
 *     leaves live tags alone (normalizeTermSelection → null), so no old version
 *     can wipe the import;
 *   • the article's PUBLISHED version row (`page_drafts.is_published`) gets the
 *     same `content.terms` in the same transaction — the "content lives in two
 *     places" rule — so "publish Version 1" later re-publishes these tags, not
 *     an empty set. Draft (unpublished) versions are left alone: they are an
 *     editor's work in progress.
 *
 * ── CONTENT STATE NEVER FAILS A DEPLOY (Brief 186) ──────────────────────────
 * Unknown names, missing articles, a missing CSV, drafts — all reported, exit 0.
 * Non-zero ONLY for a code/schema fault (missing table, SQL error).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/apply-brief-187-article-tags.ts --dry-run     # preview (default at a terminal)
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/apply-brief-187-article-tags.ts commit        # apply
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';
import { writeArticleTerms } from '../src/lib/cms/kh-taxonomy';
import { sameTermSelection, type ArticleTermSelection } from '../src/lib/cms/kh-taxonomy-types';

const SCRIPT = 'apply-brief-187-article-tags';
const argv = process.argv.slice(2);
const csvArg = argv.find((a) => a.startsWith('--csv='))?.slice('--csv='.length);
const mode = resolveRunMode(SCRIPT, argv.filter((a) => !a.startsWith('--csv=')));
announceMode(SCRIPT, mode);
const CSV_PATH = csvArg ?? join(process.cwd(), 'scripts', 'data', 'brief-187-article-tags-approved.csv');

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

/** RFC 4180-ish: quoted fields, doubled quotes, CRLF or LF. */
function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') { f += '"'; i++; } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\r') { /* CRLF */ }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

const list = (v: string) => v.split(';').map((x) => x.trim()).filter(Boolean);
const key = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');

async function main() {
  if (!existsSync(CSV_PATH)) {
    console.log(`\n  No approved file at ${CSV_PATH} — nothing to apply.`);
    console.log('  (Expected until Marketing returns the reviewed proposals. Not a failure.)');
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', 'approved CSV not present');
    return;
  }
  const rows = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  const col = (name: string) => header.indexOf(name);
  for (const need of ['slug', 'primary_topic', 'secondary_topics', 'locations', 'decision']) {
    if (col(need) < 0) {
      console.log(`\n  !!!! The CSV has no "${need}" column — is this the Stop 1 file? Nothing applied.`);
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `missing column ${need}`);
      return;
    }
  }

  // ── Term lookup: name, slug, or "Name (Region)", all case-insensitive ──────
  const terms = await pool.query<{ id: number; type: string; slug: string; name: string; parent_name: string | null }>(
    `SELECT t.id, t.type, t.slug, t.name, p.name AS parent_name FROM kh_terms t LEFT JOIN kh_terms p ON p.id = t.parent_id`
  );
  const topicBy = new Map<string, string>();
  const locationBy = new Map<string, string[]>();
  for (const t of terms.rows) {
    if (t.type === 'topic') {
      topicBy.set(key(t.name), t.slug);
      topicBy.set(key(t.slug), t.slug);
    } else {
      for (const k of [key(t.name), key(t.slug), t.parent_name ? key(`${t.name} (${t.parent_name})`) : '']) {
        if (!k) continue;
        locationBy.set(k, [...(locationBy.get(k) ?? []), t.slug]);
      }
    }
  }
  const resolveLocation = (v: string): string | null => {
    const hits = Array.from(new Set(locationBy.get(key(v)) ?? []));
    return hits.length === 1 ? hits[0] : null; // 0 = unknown, >1 = ambiguous (write "Name (Region)")
  };

  // ── Validate every approved row BEFORE writing anything ─────────────────────
  const skipped: string[] = [];
  const rejected: Array<{ slug: string; why: string }> = [];
  const plan: Array<{ slug: string; articleId: number; selection: ArticleTermSelection }> = [];
  const articles = await pool.query<{ id: number; slug: string }>(`SELECT id, slug FROM cms_articles`);
  const articleId = new Map(articles.rows.map((a) => [a.slug, a.id]));

  for (const r of rows) {
    const slug = (r[col('slug')] ?? '').trim();
    const decision = key(r[col('decision')] ?? '');
    if (decision !== 'approve') { skipped.push(slug || '(no slug)'); continue; }
    const problems: string[] = [];
    const id = articleId.get(slug);
    if (!id) problems.push('no article with this slug in this database');

    const primaryRaw = (r[col('primary_topic')] ?? '').trim();
    const primary = primaryRaw ? topicBy.get(key(primaryRaw)) ?? null : null;
    if (primaryRaw && !primary) problems.push(`unknown topic "${primaryRaw}"`);
    const secondary: string[] = [];
    for (const s of list(r[col('secondary_topics')] ?? '')) {
      const t = topicBy.get(key(s));
      if (!t) problems.push(`unknown topic "${s}"`);
      else if (t !== primary && !secondary.includes(t)) secondary.push(t);
    }
    if (secondary.length > 2) problems.push(`${secondary.length} secondary topics (max 2)`);
    const locations: string[] = [];
    for (const l of list(r[col('locations')] ?? '')) {
      const t = resolveLocation(l);
      if (!t) problems.push(`unknown or ambiguous location "${l}"${(locationBy.get(key(l)) ?? []).length > 1 ? ' — write it as "Name (Region)"' : ''}`);
      else if (!locations.includes(t)) locations.push(t);
    }

    if (problems.length) { rejected.push({ slug: slug || '(no slug)', why: problems.join('; ') }); continue; }
    plan.push({ slug, articleId: id!, selection: { primary, secondary, locations } });
  }

  // ── Current state, for idempotency + backup ────────────────────────────────
  const ids = plan.map((p) => p.articleId);
  const current = await pool.query<{ article_id: number; term_id: number; is_primary: boolean; type: string; slug: string }>(
    `SELECT at.article_id, at.term_id, at.is_primary, t.type, t.slug
       FROM cms_article_terms at JOIN kh_terms t ON t.id = at.term_id
      WHERE at.article_id = ANY($1::int[])`,
    [ids]
  );
  const currentSel = new Map<number, ArticleTermSelection>();
  for (const id of ids) currentSel.set(id, { primary: null, secondary: [], locations: [] });
  for (const r of current.rows) {
    const s = currentSel.get(r.article_id)!;
    if (r.type === 'topic' && r.is_primary) s.primary = r.slug;
    else if (r.type === 'topic') s.secondary.push(r.slug);
    else s.locations.push(r.slug);
  }
  const changes = plan.filter((p) => !sameTermSelection(p.selection, currentSel.get(p.articleId)!));
  const unchanged = plan.length - changes.length;

  console.log(`\n── Brief 187 Stop 2 — ${CSV_PATH}`);
  console.log(`  approved rows valid ........ ${plan.length} (${changes.length} change, ${unchanged} already as approved)`);
  console.log(`  skipped (not "approve") .... ${skipped.length}`);
  console.log(`  rejected ................... ${rejected.length}`);
  for (const r of rejected) console.log(`    ✗ ${r.slug}: ${r.why}`);

  if (mode === 'dry') {
    for (const p of changes.slice(0, 25)) console.log(`    would set ${p.slug}: ${JSON.stringify(p.selection)}`);
    if (changes.length > 25) console.log(`    … and ${changes.length - 25} more`);
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${changes.length} article(s) would change, ${rejected.length} rejected`);
    return;
  }
  if (changes.length === 0) {
    verdict(SCRIPT, 'ALREADY-APPLIED', `${plan.length} approved, all already as approved; ${rejected.length} rejected`);
    return;
  }

  // ── Backup, then write — one transaction ───────────────────────────────────
  const runId = new Date().toISOString();
  const affected = new Set(changes.map((p) => p.articleId));
  const backupRows = current.rows.filter((r) => affected.has(r.article_id));
  const dir = join(process.cwd(), 'scripts', 'backups');
  mkdirSync(dir, { recursive: true });
  const backupFile = join(dir, `brief-187-article-terms-${runId.replace(/[:.]/g, '-')}.json`);
  writeFileSync(backupFile, JSON.stringify({ runId, csv: CSV_PATH, rows: backupRows }, null, 2));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS brief187_article_terms_backup (
      run_id TEXT NOT NULL, article_id INTEGER NOT NULL, term_id INTEGER NOT NULL,
      is_primary BOOLEAN NOT NULL, backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    for (const r of backupRows) {
      await client.query(
        `INSERT INTO brief187_article_terms_backup (run_id, article_id, term_id, is_primary) VALUES ($1, $2, $3, $4)`,
        [runId, r.article_id, r.term_id, r.is_primary]
      );
    }
    let versionsSynced = 0;
    for (const p of changes) {
      const { unknown } = await writeArticleTerms(client, p.articleId, p.selection);
      if (unknown.length) throw new Error(`term vanished mid-run for ${p.slug}: ${unknown.join(', ')}`);
      // The paired published version row (content lives in two places).
      const v = await client.query(
        `UPDATE page_drafts SET content = jsonb_set(COALESCE(content, '{}'::jsonb), '{terms}', $1::jsonb, true)
          WHERE page_type = 'article' AND page_slug = $2 AND is_published`,
        [JSON.stringify(p.selection), p.slug]
      );
      versionsSynced += v.rowCount ?? 0;
    }
    await client.query('COMMIT');
    console.log(`\n  ✓ applied ${changes.length} article(s); ${versionsSynced} published version row(s) synced`);
    console.log(`  ✓ backup: brief187_article_terms_backup run_id=${runId} (${backupRows.length} rows) + ${backupFile}`);
    for (const p of changes) console.log(`    ${p.slug}`);
    verdict(SCRIPT, 'APPLIED', `${changes.length} applied, ${unchanged} unchanged, ${skipped.length} skipped, ${rejected.length} rejected`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error(err);
    verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
