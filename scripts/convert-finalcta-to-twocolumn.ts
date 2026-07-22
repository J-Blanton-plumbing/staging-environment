/**
 * Brief 93 (Track E) — one-time, idempotent conversion: rewrite every stored
 * `finalCta` block instance into a "2 Column Section" (the `intro` type) with the
 * button enabled, content preserved.
 *
 * Mapping (per finalCta instance):
 *   type          finalCta → intro
 *   introHeading  ← ctaHeading
 *   introBody     ← ctaBody
 *   fImage        ← f3Image
 *   button        = { enabled: true, label: <CTA label>, href: <phone href> }
 *   label         = "Final CTA"   (admin-only, so the editor still shows what it was)
 *   (no style)    → default alignment (image right = the intro default)
 *
 * The Final CTA links to the phone today (ServiceClosingCTA renders a pill with
 * `ctaPrimaryLabel` → `phoneHref` from Global Settings). We preserve that EXACTLY:
 * the button label + href are read from the `global_settings` row (id = 1), with a
 * site.ts fallback if the row/columns are missing.
 *
 * IDEMPOTENT: only a block whose `type === 'finalCta'` is converted. Once converted
 * it is an `intro` instance, so a second run finds nothing to convert and is a
 * no-op. Array order is preserved (the converted block stays in the Final CTA's
 * original position). Existing `intro` instances are never touched.
 *
 * SAFE BY DEFAULT: runs as a DRY RUN (reports what it would change) unless invoked
 * with `commit`. Run only after a database backup (Brief 74).
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json scripts/convert-finalcta-to-twocolumn.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json scripts/convert-finalcta-to-twocolumn.ts commit
 *
 * NEVER run this against production without a current backup — it writes directly
 * to the DB, bypassing auth and the draft/publish flow.
 */
import { readFileSync } from 'fs';
import { Pool } from 'pg';

const env = readFileSync('.env.local', 'utf8');
const get = (k: string) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

// site.ts fallbacks (kept in sync with src/lib/site.ts + global-settings FALLBACK).
const FALLBACK_CTA_LABEL = 'MAKE A GOOD CALL';
const FALLBACK_PHONE_HREF = 'tel:773-724-9272';
// The Final CTA renders this photo when its own image is empty (FALLBACK_CTA_IMAGE
// in sub-service-blocks.ts). We bake the DISPLAYED image into the converted block
// so a finalCta with a null f3Image keeps its photo instead of dropping to an empty
// placeholder — the converted output then matches the alias render exactly.
const FALLBACK_CTA_IMAGE = 'https://d1rplazj5a80fb.cloudfront.net/images/manplumber.webp';

const mode = process.argv[2] === 'commit' ? 'commit' : 'dry';

type Block = { id: string; type: string; data: Record<string, unknown> };

const nn = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null);

async function main() {
  const client = await pool.connect();
  try {
    // Preserve the Final CTA's current link exactly (from Global Settings).
    let ctaLabel = FALLBACK_CTA_LABEL;
    let phoneHref = FALLBACK_PHONE_HREF;
    try {
      const gs = await client.query(
        `SELECT cta_primary_label, phone_href FROM global_settings WHERE id = 1`
      );
      if (gs.rows[0]) {
        ctaLabel = gs.rows[0].cta_primary_label || FALLBACK_CTA_LABEL;
        phoneHref = gs.rows[0].phone_href || FALLBACK_PHONE_HREF;
      }
    } catch {
      console.log('  (global_settings unavailable — using site.ts fallbacks)');
    }
    console.log(`Button preserved as: label="${ctaLabel}"  href="${phoneHref}"`);
    console.log(mode === 'commit' ? '\nMODE: COMMIT (writing changes)\n' : '\nMODE: DRY RUN (no writes — pass "commit" to apply)\n');

    const { rows } = await client.query<{ slug: string; blocks: unknown }>(
      `SELECT slug, blocks FROM sub_service_pages ORDER BY slug`
    );

    let rowsChanged = 0;
    let instancesConverted = 0;
    let alreadyConverted = 0;

    for (const r of rows) {
      const blocks = Array.isArray(r.blocks) ? (r.blocks as Block[]) : [];
      let changed = false;

      const next = blocks.map((b) => {
        if (b.type !== 'finalCta') return b;
        instancesConverted++;
        changed = true;
        const d = b.data ?? {};
        // Keep the same stable instance id; only reshape type + data.
        return {
          id: b.id,
          type: 'intro',
          data: {
            introHeading: nn(d.ctaHeading),
            introBody: nn(d.ctaBody),
            // Preserve the photo the Final CTA actually shows today (its own image,
            // else the manplumber fallback) so nothing visually drops out.
            fImage: nn(d.f3Image) ?? FALLBACK_CTA_IMAGE,
            button: { enabled: true, label: ctaLabel, href: phoneHref },
            label: 'Final CTA',
          },
        } as Block;
      });

      // Idempotency signal: an intro instance already labelled "Final CTA" with a
      // button is a previously-converted block — count it so re-runs are visible.
      alreadyConverted += blocks.filter(
        (b) => b.type === 'intro' && (b.data as { label?: string })?.label === 'Final CTA'
      ).length;

      if (!changed) continue;
      rowsChanged++;
      const order = next.map((b) => `${b.type}${b.data?.label ? `(${b.data.label})` : ''}`).join(' → ');
      console.log(`✎ ${r.slug}`);
      console.log(`    ${order}`);
      if (mode === 'commit') {
        await client.query(
          `UPDATE sub_service_pages SET blocks = $1::jsonb, updated_at = NOW() WHERE slug = $2`,
          [JSON.stringify(next), r.slug]
        );
      }
    }

    console.log('\n──────────────────────────────────────────');
    console.log(`rows scanned:              ${rows.length}`);
    console.log(`finalCta → intro converts: ${instancesConverted} (across ${rowsChanged} row(s))`);
    console.log(`already-converted found:   ${alreadyConverted} (intro labelled "Final CTA")`);
    if (mode === 'dry') {
      console.log('\nDRY RUN complete — no changes written. Re-run with "commit" to apply.');
    } else if (instancesConverted === 0) {
      console.log('\nNothing to convert — DB already fully converted (idempotent no-op).');
    } else {
      console.log('\n✓ Conversion committed.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
