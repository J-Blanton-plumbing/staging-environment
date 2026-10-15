/**
 * Brief 212 (Track D1/D3) — the pre-template ARCHIVE and the RESTORE action, for both City Hub rows
 * (`city_pages`) and City Service V2 rows (`city_service_pages`).
 *
 * ARCHIVE (`createPreTemplateArchive`): before a row gets new-template content, its current state is
 * saved as an UNPUBLISHED version — "Pre-hub archive (2026-10)" / "Pre-V2 archive (2026-10)" — whose
 * content is the version that was live (the old editor's shape, so the old editor can still read it)
 * plus `_archive.columns`: EVERY column of the row verbatim (the Brief 204 recipe), stamped with the
 * row's current template. Created once per row (a re-run finds it and does not repeat). Nothing is
 * deleted or overwritten, ever.
 *
 * RESTORE (`restorePreTemplateArchive`) — "recall it if something goes wrong", in ONE transaction:
 *   1. refuses unless the page's current City Hub / V2 content is saved in a version (so restoring
 *      can never lose it — re-applying the design is publishing that version again);
 *   2. writes back every column from `_archive.columns` (meta_*, blocks, legacy copy …) except the
 *      row's identity and bookkeeping (`id`, `status`, `version`, `updated_at`) and the new-template
 *      columns; for a hub, `template_type` goes back to `pre_hub_template`;
 *   3. sets `hub_content` / `v2_content` to NULL and bumps `version`;
 *   4. adds the version "Restored pre-template archive (YYYY-MM-DD)" (a copy of the archive) and makes
 *      it the Published pointer — `status` itself is never written (Brief 159), the page stays live;
 *   5. re-baselines the page's City Hub / V2 versions onto the new row version, so publishing one of
 *      them again (the re-apply) is not refused as stale (DP-2);
 *   6. logs the change.
 * The archive version itself is NEVER published — publishDraft keeps refusing it (409) on a V2 row.
 */
import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/cms/errors';
import { writeChangelog } from '@/lib/cms/changelog';
import { pageTypeAliasesFor } from '@/lib/cms/page-status';
import { clearSitemapCache } from '@/lib/sitemap/render';
import { CITY_HUB_TEMPLATE, CITY_PAGE_TYPES, PRE_HUB_ARCHIVE_LABEL } from '@/lib/city-hub-cms/model';
import { CITY_SERVICE_V2_TEMPLATE, PRE_V2_ARCHIVE_LABEL } from '@/lib/city-service-v2-cms/model';

export type ArchiveKind = 'hub' | 'service';

const KIND = {
  hub: { table: 'city_pages', pageType: 'city', label: PRE_HUB_ARCHIVE_LABEL, newCol: 'hub_content', template: CITY_HUB_TEMPLATE },
  service: { table: 'city_service_pages', pageType: 'city-service', label: PRE_V2_ARCHIVE_LABEL, newCol: 'v2_content', template: CITY_SERVICE_V2_TEMPLATE },
} as const;

/** Columns a restore never writes back from the archive. */
const NEVER_RESTORED = new Set(['id', 'status', 'version', 'updated_at', 'hub_content', 'pre_hub_template', 'v2_content']);

function where(kind: ArchiveKind, slug: string): { sql: string; params: string[] } {
  if (kind === 'hub') return { sql: 'city_slug = $1', params: [slug] };
  const [city, service] = slug.split('/');
  return { sql: 'city_slug = $1 AND service_slug = $2', params: [city, service] };
}

const aliases = (kind: ArchiveKind) => (kind === 'hub' ? [...CITY_PAGE_TYPES] : ['city-service']);

export interface ArchiveResult {
  created: boolean;
  draftId: number;
}

/**
 * Save the row's current state as the unpublished pre-template archive (once). `client` may be inside
 * a transaction. Throws NotFoundError when the row does not exist (a missing row is reported, never
 * created here).
 */
/**
 * `createdThisRun`: the row did not exist before Brief 212 (Marketing 2026-10-15). Its archive holds the
 * just-created, blank row, so a restore clears `v2_content` and the page returns to today's render
 * (the code module, or the legacy template's built-in copy); the pre-brief production HTML of those
 * URLs is the baseline for that claim.
 */
export async function createPreTemplateArchive(client: PoolClient, kind: ArchiveKind, slug: string, by: number, brief = 212, createdThisRun = false): Promise<ArchiveResult> {
  const k = KIND[kind];
  const w = where(kind, slug);
  const existing = await client.query<{ id: number }>(
    `SELECT id FROM page_drafts WHERE page_type = ANY($1) AND page_slug = $2 AND label = $3 ORDER BY id LIMIT 1`,
    [aliases(kind), slug, k.label]
  );
  if (existing.rows[0]) return { created: false, draftId: existing.rows[0].id };
  const row = (await client.query(`SELECT * FROM ${k.table} WHERE ${w.sql}`, w.params)).rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new NotFoundError(`No ${k.table} row for "${slug}".`);
  const live = (
    await client.query<{ content: unknown }>(
      `SELECT content FROM page_drafts WHERE page_type = ANY($1) AND page_slug = $2 AND is_published LIMIT 1`,
      [aliases(kind), slug]
    )
  ).rows[0]?.content;
  const base = live && typeof live === 'object' && !Array.isArray(live) ? (live as Record<string, unknown>) : {};
  const templateType = kind === 'hub' ? ((row.template_type as string | null) ?? 'coverage-area') : null;
  const content = {
    ...base,
    _archive: { table: k.table, rowId: row.id, rowVersion: row.version, capturedAt: new Date().toISOString(), brief, templateType, ...(createdThisRun ? { createdThisRun: true } : {}), columns: row },
  };
  const ins = await client.query<{ id: number }>(
    `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, template_type, base_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [k.pageType, slug, k.label, JSON.stringify(content), by, kind === 'hub' && templateType !== CITY_HUB_TEMPLATE ? templateType : null, row.version ?? null]
  );
  return { created: true, draftId: ins.rows[0].id };
}

export interface RestorePlan {
  kind: ArchiveKind;
  slug: string;
  archiveId: number;
  archiveLabel: string;
  /** The template the row goes back to (hubs). */
  toTemplate: string | null;
  columns: string[];
  newContentSavedIn: number | null;
}

/** Find the archive version of a page (by its slug), or of a given version id. */
async function loadArchive(client: PoolClient, ref: { draftId: number } | { kind: ArchiveKind; slug: string }) {
  const res =
    'draftId' in ref
      ? await client.query(`SELECT id, page_type, page_slug, label, content FROM page_drafts WHERE id = $1`, [ref.draftId])
      : await client.query(
          `SELECT id, page_type, page_slug, label, content FROM page_drafts WHERE page_type = ANY($1) AND page_slug = $2 AND label = $3 ORDER BY id LIMIT 1`,
          [aliases(ref.kind), ref.slug, KIND[ref.kind].label]
        );
  const d = res.rows[0];
  if (!d) throw new NotFoundError('No pre-template archive version for this page.');
  const kind: ArchiveKind | null = (CITY_PAGE_TYPES as readonly string[]).includes(d.page_type) ? 'hub' : d.page_type === 'city-service' ? 'service' : null;
  const cols = d.content?._archive?.columns;
  if (!kind || d.label !== KIND[kind].label || !cols || typeof cols !== 'object') {
    throw new ValidationError('Only a "Pre-hub archive (2026-10)" or "Pre-V2 archive (2026-10)" version can be restored.');
  }
  return { id: d.id as number, slug: d.page_slug as string, label: d.label as string, kind, content: d.content as Record<string, unknown>, columns: cols as Record<string, unknown> };
}

/**
 * Restore a page to its pre-template archive. `apply: false` = plan only (nothing written). Returns
 * what was (or would be) done.
 */
export async function restorePreTemplateArchive(
  ref: { draftId: number } | { kind: ArchiveKind; slug: string },
  by: number,
  apply: boolean
): Promise<RestorePlan> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const a = await loadArchive(client, ref);
    const k = KIND[a.kind];
    const w = where(a.kind, a.slug);
    const row = (await client.query(`SELECT * FROM ${k.table} WHERE ${w.sql} FOR UPDATE`, w.params)).rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new NotFoundError(`No ${k.table} row for "${a.slug}".`);

    // 1. The current new-template content must be kept in a version.
    let savedIn: number | null = null;
    const current = row[k.newCol];
    if (current !== null && current !== undefined) {
      const key = a.kind === 'hub' ? 'hub' : 'page';
      const s = await client.query<{ id: number }>(
        `SELECT id FROM page_drafts WHERE page_type = ANY($1) AND page_slug = $2 AND template_type = $3 AND content->$4 = $5::jsonb ORDER BY id DESC LIMIT 1`,
        [aliases(a.kind), a.slug, k.template, key, JSON.stringify(current)]
      );
      if (!s.rows[0]) {
        throw new ConflictError('The page’s current content is not saved in any version, so restoring would lose it. Save it as a version first, then restore.');
      }
      savedIn = s.rows[0].id;
    }

    // 2. The columns to write back.
    const liveCols = new Set(Object.keys(row));
    const cols = Object.keys(a.columns).filter((c) => liveCols.has(c) && !NEVER_RESTORED.has(c));
    const toTemplate =
      a.kind === 'hub'
        ? ((row.template_type === CITY_HUB_TEMPLATE ? (row.pre_hub_template as string | null) : null) ??
          ((a.columns.template_type as string | null) || 'coverage-area'))
        : null;
    const plan: RestorePlan = { kind: a.kind, slug: a.slug, archiveId: a.id, archiveLabel: a.label, toTemplate, columns: cols, newContentSavedIn: savedIn };
    if (!apply) {
      await client.query('ROLLBACK');
      return plan;
    }

    const vals = cols.map((c) => {
      const v = c === 'template_type' && toTemplate ? toTemplate : a.columns[c];
      return v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v;
    });
    const sets = cols.map((c, i) => `"${c}" = $${i + 1}`);
    const extra = a.kind === 'hub' ? ', pre_hub_template = NULL' : '';
    const n = cols.length;
    const upd = await client.query<{ version: number }>(
      `UPDATE ${k.table} SET ${sets.join(', ')}${sets.length ? ',' : ''} ${k.newCol} = NULL${extra}, version = version + 1, updated_at = NOW()
        WHERE ${w.sql.replace(/\$(\d)/g, (_, d: string) => `$${n + Number(d)}`)} RETURNING version`,
      [...vals, ...w.params]
    );
    const newVersion = upd.rows[0].version;

    // 4. The new Published version: a copy of the archive (the archive itself is never published).
    const today = new Date().toISOString().slice(0, 10);
    const content = { ...a.content, _restoredFrom: { draftId: a.id, at: new Date().toISOString(), by } };
    const ins = await client.query<{ id: number }>(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, template_type, base_version, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
      [k.pageType, a.slug, `Restored pre-template archive (${today})`, JSON.stringify(content), by, a.kind === 'hub' ? toTemplate : null, newVersion]
    );
    const restoredId = ins.rows[0].id;
    await client.query(`UPDATE page_drafts SET is_published = FALSE WHERE page_type = ANY($1) AND page_slug = $2 AND id <> $3 AND is_published`, [
      pageTypeAliasesFor(k.pageType),
      a.slug,
      restoredId,
    ]);
    await client.query(`UPDATE page_drafts SET is_published = TRUE WHERE id = $1`, [restoredId]);

    // 5. The new-template versions stay publishable (the re-apply).
    await client.query(`UPDATE page_drafts SET base_version = $1 WHERE page_type = ANY($2) AND page_slug = $3 AND template_type = $4`, [
      newVersion,
      aliases(a.kind),
      a.slug,
      k.template,
    ]);

    await writeChangelog(client, k.pageType, a.slug, by, {
      source: 'draft-publish',
      action: 'restore-pre-template-archive',
      draft_id: restoredId,
      draft_label: `Restored pre-template archive (${today})`,
      archive_id: a.id,
      columns: cols,
    });
    await client.query('COMMIT');
    clearSitemapCache();
    return plan;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
