# Brief 01 — Fix Service Page Preview Redirect

**Priority:** High — preview is broken for all service pages edited via `/admin/sub-service/[slug]`
**Scope:** Align the service admin editor's draft/preview system with how the existing service page routes actually work. No new pages, no new CMS tables — this is a wiring fix only.
**Source of truth:** Existing working pages: `/sewer-rodding`, `/gas-lines`, `/hydro-jetting`
**Target files:**
- `src/app/admin/sub-service/[slug]/page.tsx`
- `src/app/api/preview/route.ts` (verify no leftover `sub-service` handling needed)
- `src/components/admin/AdminPageHeader.tsx` (if `pageType` is passed as a prop there)

---

## Background / Diagnosis

There are two CMS systems in the codebase that were never connected:

1. **`/admin/sub-service/[slug]`** — the admin editor — creates drafts with `pageType="sub-service"` and stores records in the `sub_service_pages` table.
2. **`/sewer-rodding`, `/gas-lines`, `/hydro-jetting`** — the public pages — call `getServicePreview('sewer-rodding')`, which looks for a draft with `page_type = 'service'`. They never look at `sub_service_pages` or `page_type = 'sub-service'` at all.

When the editor saves a draft and the user clicks Preview, `route.ts` reads `page_type = 'sub-service'` from the draft, finds no matching case in `pageUrl()`, and falls through to `return '/'` — redirecting to the homepage.

**The fix is Option A:** make the admin editor speak the same language as the public pages. Service pages (whether top-level category or individual service) all use `pageType="service"`. The admin editor for individual services should do the same.

---

## Hard Rules

- No redesign, no new DB tables, no schema changes.
- `npm run build` must pass after all changes.
- Do not touch `/sewer-rodding`, `/gas-lines`, `/hydro-jetting`, or any other public page — they are already correct.
- Do not remove or rename the `sub_service_pages` table or its API routes — other parts of the admin may depend on them.
- Verify at desktop (1440px), medium (~900px), and mobile (375px) after any template changes.
- **Brand colors only:** Carmine `#BC0E0E`, Cerulean `#1560E6`, Cream `#F9F3EC`, Midnight `#0A1B2E`. No pure black.

---

## Fix — Align admin editor `pageType` with public pages

### Problem

`src/app/admin/sub-service/[slug]/page.tsx` passes `pageType="sub-service"` to `AdminPageHeader`. This causes drafts to be saved with `page_type = 'sub-service'`, which the public page routes never read.

### What to do

1. In `src/app/admin/sub-service/[slug]/page.tsx`, find where `pageType="sub-service"` is passed (currently line ~338) and change it to `pageType="service"`.

2. Confirm that `AdminPageHeader` (or wherever the preview API call is constructed) uses `pageType` and `pageSlug` to hit `/api/preview?draftId=...` — trace the full flow to make sure the draft is saved with `page_type = 'service'` in the DB.

3. In `src/app/api/preview/route.ts`, confirm the existing `if (pageType === 'service') return \`/services/\${pageSlug}\`` line correctly handles individual service slugs like `sewer-rodding`, `gas-lines`, `hydro-jetting`. These live at `/{slug}`, not `/services/{slug}`. If the routing is wrong for individual services vs. category services, fix `pageUrl()` so:
   - Category service pages (plumbing, sewer, drain, etc.) → `/services/{slug}`
   - Individual service pages (sewer-rodding, gas-lines, hydro-jetting, etc.) → `/{slug}`
   
   The cleanest way to distinguish them is to check whether the slug exists as a route under `/services/` (category) or at the root (individual service). Claude Code should inspect `src/app/services/` vs root-level routes to determine the right logic — a lookup against a known list of category slugs is fine.

4. Verify end-to-end: open `/admin/sub-service/sewer-rodding` (or whichever service is in the DB), save a draft, click Preview, confirm it lands on `/sewer-rodding` with the preview banner showing.

---

## Verification

- Save a draft for an individual service page in the admin, click Preview — should land on `/{slug}` with the preview banner visible, not the homepage or a 404.
- Category service page previews (e.g. `/admin/[slug]` for plumbing) should still work and land on `/services/{slug}`.
- `npm run build` exits 0.
