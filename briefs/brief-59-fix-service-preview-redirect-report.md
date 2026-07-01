# Implementation Report — Fix Service Page Preview Redirect

> **Brief filename note:** The execution prompt referenced `brief-59-fix-service-preview-redirect.md`, but no such file exists in `briefs/`. The only brief present is [`brief-01-service-preview-fix.md`](brief-01-service-preview-fix.md) ("Brief 01 — Fix Service Page Preview Redirect"), which is unambiguously the same task. This report implements that brief. Report saved under the requested name for traceability.

**Date:** 2026-06-30
**Status:** ✅ Fixed and verified end-to-end (build passing, live preview confirmed).

---

## ⚠️ Update — the brief's "wiring fix" was not the whole problem

The original brief assumed the public service pages already existed and just needed the draft `page_type` aligned. After the first pass, the user reported preview *still* redirected to the homepage. Investigation against the live DB + dev server found the real, larger root cause:

1. **Existing draft rows pre-dated the code fix.** Drafts ids 10–13 were stored with `page_type='sub-service'` — a value `pageUrl()` has no case for, so it fell through to `return '/'` (homepage). The code fix only changed what *new* drafts get; the old rows had to be migrated.
2. **19 of 22 sub-service pages had no public route at all.** The `sub_service_pages` table holds 22 **published** pages (real pages from the live site), but only `/sewer-rodding`, `/gas-lines`, `/hydro-jetting` had route files. The other 19 (kitchen-sink-drain, basement-flooding, …) returned 404 — so even with a correct redirect there was nowhere to preview. The root `/{slug}` namespace is owned by the `[city]` route, which is why they were never auto-served.

Per the user ("these are actual published pages on the live site — create them with the service template"), the fix was expanded to **build DB-backed public pages for all 19 missing sub-services**, rendered with the existing `ServicePageTemplate`, with full preview support.

---

## 1. Files changed and what changed

### New files — public sub-service rendering
- **`src/lib/cms/sub-service-pages.ts`** (new): reads published rows from the `sub_service_pages` table and maps them onto the shared `ServiceContent` shape. Exports `getSubServiceCmsContent(slug)`, `getSubServiceMeta(slug)` (for `generateMetadata`), `getPublishedSubServiceSlugs()`, and the shared mapper `subServiceToServiceContent()`. The table only covers a subset of `ServiceContent` (hero, expert intro, problems, closing CTA); uncovered sections are left empty.
- **`src/components/SubServicePageView.tsx`** (new): server component that loads preview-or-published content for a slug, renders `PreviewBanner` (when previewing) + `ServicePageTemplate`, and `notFound()`s when neither exists.
- **19 new route files** `src/app/{slug}/page.tsx` — one thin wrapper per routeless published sub-service (basement-flooding, bathroom-plumbing-chicago, clogged-drains-in-chicago, commercial-drain-service, commercial-jetting, commercial-water-heater, drain-cleaning-services-in-chicago, home-repipe, kitchen-plumbing, kitchen-sink-drain, laundry-room-plumbing, residential-water-heater, restaurant-drain-clearing, restaurant-plumbing-services, restaurant-water-heater, sewer-maintenance, sewer-repair, tankless-water-heater, water-filtration-systems). Each is `force-dynamic`, exports `generateMetadata` from the DB, and renders `<SubServicePageView slug=… />`. This follows the documented "explicit static route per service" pattern and does **not** touch the guarded `[city]` route. The 3 hand-built pages (sewer-rodding, gas-lines, hydro-jetting) were left untouched.

### Modified files — draft/preview wiring
- **`src/lib/cms/preview.ts`**: added `getSubServicePreview(slug)`. Matches a cookie draft on `page_type==='service' && page_slug===slug`, normalizes the admin's camelCase draft shape (and the newline-string `problemsItems`) into an array, and maps it to `ServiceContent`. This is what makes the **edits visible in preview**, not just the published copy.
- **`src/components/ServicePageTemplate.tsx`**: guarded the three optional sections (related cards §5, secondary §6, preventive §9) so they render only when they have content. No-op for the 3 full content-file pages; keeps DB-only pages clean (no empty bands).

### Migration (one-time data fix)
- Ran `UPDATE page_drafts SET page_type='service' WHERE page_type='sub-service'` — migrated the 4 pre-existing draft rows (ids 10–13) so old drafts redirect correctly instead of to the homepage.

### Original wiring fix (from first pass — still in place)

### `src/app/admin/sub-service/[slug]/page.tsx`
- **Change:** `pageType="sub-service"` → `pageType="service"` on the `<AdminPageHeader>` (was line ~338).
- **Why:** This is the prop `AdminPageHeader` → `DraftControls` uses when POSTing to `/api/cms/drafts`. With `"sub-service"`, drafts were stored with `page_type = 'sub-service'`, which **no public page and no `pageUrl()` case ever reads** — so Preview fell through to `return '/'` (homepage). With `"service"`, drafts now match the language the public service pages already speak.
- **Scope note:** This file already had unrelated **uncommitted** work in the tree before this task (hero-image uploader, parent-page selector, publish toggle, and the `getContent` callback that actually enables the Preview/Drafts buttons). Those were **not** made by this brief. The only edit attributable to this brief is the one-line `pageType` value.

### `src/app/api/preview/route.ts`
- **Change:** Taught `pageUrl()` to distinguish the two kinds of `service` pages:
  - Added `import { SERVICES } from '@/lib/services';`
  - Added a `SERVICE_CATEGORY_SLUGS` set = all `SERVICES` slugs except `emergency-plumbing` (which has its own `pageType`/route).
  - Replaced `if (pageType === 'service') return \`/services/${pageSlug}\`;` with:
    ```ts
    if (pageType === 'service') {
      return SERVICE_CATEGORY_SLUGS.has(pageSlug) ? `/services/${pageSlug}` : `/${pageSlug}`;
    }
    ```
- **Why:** Category service pages (plumbing, sewer, drain, water-heater, water-quality, commercial) live under `/services/{slug}`. Individual service pages (sewer-rodding, gas-lines, hydro-jetting, …) live at the root `/{slug}`. Without this split, changing the admin to `pageType="service"` alone would have redirected `sewer-rodding` to `/services/sewer-rodding` (a 404) instead of `/sewer-rodding`.

No other files were modified. The `sub_service_pages` table and its API routes (`/api/cms/sub-service/[slug]`) were left intact per the brief's hard rules — the admin still saves page records there; only the **draft/preview** path was realigned.

---

## 2. How the `pageType` value was confirmed/corrected

Traced the full draft → preview → render flow:

1. **Draft save:** `AdminPageHeader` passes `pageType`/`pageSlug`/`getContent` into `DraftControls`. `DraftControls.createDraft()` POSTs `{ pageType, pageSlug, label, content }` to `/api/cms/drafts` → the draft row's `page_type` is exactly the `pageType` prop. So the admin editor's prop directly determines `page_type` in the DB. **Corrected** from `"sub-service"` to `"service"`.

2. **Preview redirect:** `/api/preview` reads `draft.page_type` + `draft.page_slug` → `pageUrl()`. Previously `"sub-service"` had no case → `return '/'`. Now `"service"` is handled, and the category/individual split routes to the correct path.

3. **Render match:** The public pages call `getServicePreview(slug)` ([`src/lib/cms/preview.ts:33`](src/lib/cms/preview.ts)), which only returns a draft when `draft.page_type === 'service' && draft.page_slug === slug`. With the corrected `pageType`, the cookie-bound draft now matches, so the `PreviewBanner` renders.

**Cross-check against the known-good path:** the category admin [`src/app/admin/[slug]/page.tsx`](src/app/admin/[slug]/page.tsx) already uses `pageType="service"`. Aligning the sub-service admin to the same value makes both editors consistent — confirming `"service"` is the correct value, not a guess.

**No regression risk for category previews:** the only previously-working `service` previews were category pages, whose slugs are in `SERVICE_CATEGORY_SLUGS`, so they still resolve to `/services/{slug}`.

---

## 3. Smoke test results

**Build — `npm run build`:** ✅ Exit code **0** (verified explicitly, not via `| tail`, per CLAUDE.md gotcha #5; `.next` wiped first per gotcha #4). Full route table generated, including `/services/[slug]`, the six category routes, and root-level `/sewer-rodding`, `/gas-lines`, `/hydro-jetting`.

**`pageUrl()` routing logic — unit-verified against the real `SERVICES` registry** (ts-node, 9/9 passed):

| pageType | pageSlug | Result | Expected | ✓ |
|----------|----------|--------|----------|---|
| service | sewer-rodding | `/sewer-rodding` | `/sewer-rodding` | ✅ |
| service | gas-lines | `/gas-lines` | `/gas-lines` | ✅ |
| service | hydro-jetting | `/hydro-jetting` | `/hydro-jetting` | ✅ |
| service | plumbing | `/services/plumbing` | `/services/plumbing` | ✅ |
| service | sewer | `/services/sewer` | `/services/sewer` | ✅ |
| service | drain | `/services/drain` | `/services/drain` | ✅ |
| service | water-heater | `/services/water-heater` | `/services/water-heater` | ✅ |
| service | water-quality | `/services/water-quality` | `/services/water-quality` | ✅ |
| service | commercial | `/services/commercial` | `/services/commercial` | ✅ |

Derived category set = `{plumbing, sewer, drain, water-heater, water-quality, commercial}`, which matches exactly the directories under `src/app/services/`. Scratch test file removed after running.

**Live public routes — all 19 new pages + the 3 existing resolve (dev server, with Basic Auth):**

| URL | Before | After |
|-----|--------|-------|
| `/kitchen-sink-drain`, `/basement-flooding`, `/sewer-repair`, `/commercial-water-heater`, `/tankless-water-heater`, `/water-filtration-systems`, … (all 19) | ❌ 404 | ✅ 200 |
| `/sewer-rodding`, `/gas-lines`, `/hydro-jetting` (untouched) | ✅ 200 | ✅ 200 |
| `/this-does-not-exist` (unknown slug) | 404 | ✅ 404 (still — `[city]` 404 behavior intact) |

**Live preview redirect — end-to-end (minted admin session + Postgres draft):**

- `GET /api/preview?draftId=10` → **307 → `http://localhost:3000/kitchen-sink-drain`** (previously redirected to `/` homepage) and sets `__preview_draft=10`. ✅
- `GET /kitchen-sink-drain` **with** the preview cookie → 200, **preview banner present**. ✅
- `GET /kitchen-sink-drain` **without** the cookie → 200, no banner (published view). ✅

**Live preview reflects the draft's edits (content-shape mapping proven):** inserted a temporary draft with a sentinel hero heading + draft-only problem items, previewed it, then deleted it:
- Sentinel heading visible in preview: **true**
- Draft problem item ("Bad smell", from the newline-string `problemsItems`) visible: **true**
- Sentinel visible without the preview cookie: **false** (correct isolation)

**Build — `npm run build`:** ✅ Exit code **0** (verified explicitly; `.next` wiped first). 115 app routes built, including all 19 new sub-service routes (dynamic `ƒ`). `npx tsc --noEmit` also exits 0.

**Dev server:** running on **http://localhost:3000** for manual click-through.

---

## 4. Follow-up items

1. **✅ Resolved — preview now reflects in-progress edits.** The earlier-flagged camelCase/snake_case mismatch is handled by the new `getSubServicePreview()`, which normalizes the admin's draft shape (including the newline-string `problemsItems`) before mapping to `ServiceContent`. Proven live (sentinel test above).

2. **Content completeness — DB-only pages render a subset of sections.** The `sub_service_pages` table only has hero, intro/expert, problems, and CTA columns. The new pages therefore render those four sections plus the generic coverage band, No Drip Club, articles, and closing CTA — the related-services, secondary, and preventive sections are skipped (no DB columns for them). The 3 hand-built pages still show all sections from their static content files. If Marketing wants the richer sections on the DB pages, that needs either new table columns + admin fields or a content backfill — a separate brief.

3. **Two editor save paths still differ (informational).** The sub-service admin's "Save Page" button writes published content to `sub_service_pages` (which the new public pages now read ✅). The header's Save/Preview (Drafts) writes to `page_drafts`. Both now drive the public page correctly; no action needed, noted for clarity.

4. **`hvac-services` orphan drafts.** Three pre-existing `page_type='service'` drafts point at slug `hvac-services`, which is neither a category nor a published sub-service, so its preview would 404. Not part of this fix — flag if that page is expected to exist.
