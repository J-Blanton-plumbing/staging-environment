# JBP Web Rebuild — Claude Code Context

> **This file lives at the repo root (`jblanton-plumbing/CLAUDE.md`).** It is read by Claude Code on every session. Keep it current.

---

## What this project is

Migrating jblantonplumbing.com off WordPress onto a **Next.js 14 (App Router) + TypeScript + Tailwind + AWS** stack. Three phases:
1. **Phase 1 (current): Faithful visual clone** of the live site.
2. Phase 2: Improvements — speed, UX, SEO.
3. Phase 3: Headless CMS to replace the broken ACF/WordPress setup.

**We are in Phase 1.**

---

## Stack

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript (strict)
- **Styling:** Tailwind + per-page scoped CSS files (ported from the WordPress theme)
- **Hosting:** AWS (deployment TBD — Amplify / ECS / EC2)
- **Preview:** Local dev server + Cloudflare tunnel (URL changes on restart)

---

## Key directories

```
src/
  app/                  # Pages (App Router)
    [city]/             # Dynamic city page builder — reads city type, renders LocalOfficeCity or CoverageAreaCity
    knowledge-hub/      # Hub page + [slug] (individual articles — not yet built)
    no-drip-club/
    why-j-blanton/
    customer-stories/
    locations/
    sewer-rodding/      # Sub-service example (explicit static route)
    api/articles/       # Paginated articles endpoint
  components/           # Shared reusable components
    HeroNav.tsx         # Shared hero nav (used on almost every page)
    NoDripClubSection.tsx  # NDC block (homepage + all service pages)
    ArticleCard.tsx
    ServicePageTemplate.tsx  # Template for sub-service pages
    ...
  lib/
    site.ts             # Single source of truth: phone, headerPhone, address, business info
    content/            # Page copy as typed data (home.ts, plumbing.ts, ndc.ts, etc.)
    articles.ts         # Article seed data
    cities/             # City registry — one entry per city with type, slug, office info
public/
  fonts/Industry/       # Self-hosted Industry font (OTF files)
  fonts/Nunito/         # Self-hosted Nunito (variable TTF)
  images/               # Brand assets — logos, icons, pattern, character, hero video
```

---

## Brand constants — always use these, never hardcode

| Token | Value |
|-------|-------|
| Carmine | `#BC0E0E` |
| Midnight | `#0A1B2E` |
| Cream | `#F9F3EC` |
| Cerulean | `#1560E6` |

**Never use `#000000` or `#ffffff` directly** — use Midnight and Cream instead (only exception: pure white text on dark overlays where Cream is too warm).

**Phone numbers:**
- `site.ts → phone` = `773-724-9272` (canonical — forms, footer, body copy)
- `site.ts → headerPhone` = `773-900-8690` (call-tracking — header display only)

**Fonts:**
- Headings: Industry Bold / Industry Medium (self-hosted, `public/fonts/Industry/`)
- Body: Nunito (variable, self-hosted)
- Accent: Scribo Pro — **NOT YET LICENSED, do not use**

---

## WordPress theme reference

The original WordPress theme lives at:
```
[project-folder]/jb-blanton/
  css/          # Per-page CSS files — port these when building each page
  *.php         # Template files — layout reference (ACF calls = content model only, NOT ported)
  fonts/        # Same fonts as the build
```

> **The ACF/CMS wiring in the PHP files is broken and is NOT inherited.** Use PHP templates for layout structure only. Content is re-typed into `src/lib/content/*.ts` files.

When building or auditing a page, open the matching `jb-blanton/css/[page].css` AND `jb-blanton/css/globals.css` — `globals.css` has overrides that take precedence (e.g., the OUR SERVICES panel uses a red gradient from `globals.css`, not the cream/Midnight version in `city.css`).

---

## Architecture decisions (do not re-litigate)

- **City pages:** one shared dynamic builder `src/app/[city]/page.tsx` reads `type: "local-office" | "coverage-area"` from the registry and renders the matching template. `dynamicParams = false` — only registered slugs render.
- **Service pages (sub-service):** explicit static routes per service (e.g., `src/app/sewer-rodding/page.tsx`) — a top-level `[service]` dynamic route would collide with `[city]`. If both dynamic routes are ever needed, `[city]` moves to a segment group — deferred to Phase 2.
- **Content in data files:** all page copy lives in `src/lib/content/*.ts` with typed interfaces. No hardcoded strings in JSX.
- **Business info in `site.ts`:** never hardcode the phone number or address anywhere else.
- **NDC section:** `NoDripClubSection.tsx` is the single source of truth for the No Drip Club block (homepage + all service pages).

---

## Known gotchas — read before touching these areas

1. **`.contents` Tailwind collision.** The semantic class `contents` (used in hero markup) collides with Tailwind's built-in `.contents` utility (`display:contents`), which collapses the hero's dark column to 0×0. Fixed by renaming to `hero-contents`. **Will recur** on any page cloned from the category template.

2. **`globals.css` overrides `city.css` and other page CSS.** The OUR SERVICES panel on city pages uses a red gradient (`#e63946 → #9b0d0d`) + white text/icons/caret from `globals.css` — not the cream/Midnight version you see in `city.css`. Always check both files.

3. **Two `<h1>` elements on city v2 pages** — the badge `<img>` is `:nth-child(1)`, so the H1 CSS selectors using `nth-child` are reversed from what you'd expect. Line 1 = 50px, line 2 = 40px.

4. **Never run `next dev` on a stale production `.next` build.** It deadlocks the dev compiler with false "build failure" errors. Always wipe `.next` when switching between `next build` and `next dev`.

5. **Don't pipe `npm run build` through `| tail`.** It masks the real exit code.

6. **Elfsight widgets show "something went wrong" on localhost.** Expected — they're origin-restricted. They work on the production domain.

7. **Social icon assets 404** — `/images/social/*.webp` (LinkedIn/IG/FB/X) are not yet in `public/`. Do not substitute lucide icons.

8. **City registry is ~147 cities, full list is ~230.** The missing ~80 (Oak Park, Tinley Park, Joliet, Chicago neighborhood pages, etc.) need to be imported from the Sitemap Google Sheet. Until added, their `/{slug}` routes 404.

9. **Large unoptimized webp assets** — `plumbing-f3.webp` (21 MB), `sub-gas-lines.webp` (8.4 MB) etc. Load correctly but slowly. Image optimization pass is Phase 2 / pre-launch.

10. **Northbrook + Elmhurst** are Local Office city type but are held in `PENDING_LOCAL_OFFICE` — no `.ts` data file, not in the registry. Build them when content is available.

11. **`next start` won't serve a file written to `public/` after the process booted — until the process restarts.** In production mode (`next start`, not `next dev`), Next.js only recognizes `public/` files that existed at boot; a file written afterward 404s (as a real rendered App Router 404 page, not a static-file 404) until the app restarts. This bit CMS media uploads (Brief 112): every uploaded image/video 404's in its preview and on the live page until someone restarts the app. **The real fix is an nginx `location /uploads/cms/ { root ...; try_files $uri =404; }` block that serves uploads directly from disk, bypassing Next's boot-time snapshot** — see the Brief 112 follow-up. Also discovered while diagnosing this: staging had no pm2-registered process at all (`pm2 list` was empty, the app was a bare `next start` with nothing supervising or restarting it), so `deploy.yml`'s `pm2 restart jblanton` had likely been silently no-op'ing on every deploy. Fixed via `ecosystem.config.js` + `pm2 startOrReload` in the deploy step.

---

## Verification checklist (run after every brief)

Claude Code should always self-verify before reporting done:

```bash
npm run build              # Must exit 0; check route count
# Then in a separate session:
next dev &
# Computed-style checks at 1440px / ~900px / 375px for:
# - No #000000 anywhere on the page
# - No horizontal overflow
# - Phone numbers sourced from site.ts
# - Correct brand colors (Carmine/Midnight/Cream/Cerulean)
# - No Tailwind .contents collision
```

Breakpoints to verify: **1440px** (desktop), **~900px** (tablet/mid), **375px** (mobile).

---

## Page build status (as of 2026-06-05)

| Page | Route | Status |
|------|-------|--------|
| Homepage | `/` | ✅ Done |
| Plumbing | `/services/plumbing` | ✅ Done (template for other 6 categories) |
| Navbar | shared | ✅ Done |
| Footer | shared | ✅ Done |
| Evanston (Local Office) | `/evanston` | ✅ Done (via `[city]` builder) |
| Coverage Area cities (~149) | `/[city]` | ✅ Done (dynamic builder) |
| No Drip Club | `/no-drip-club` | ✅ Done |
| Sewer Rodding (sub-service) | `/sewer-rodding` | ✅ Done (template for ~50 services) |
| Knowledge Hub | `/knowledge-hub` | ✅ Done (hub page) |
| Why J. Blanton | `/why-j-blanton` | ✅ Done |
| Customer Stories | `/customer-stories` | ✅ Done |
| Locations | `/locations` | ✅ Done |
| Article pages | `/knowledge-hub/[slug]` | ❌ Not started |
| 6 category pages | `/services/sewer`, etc. | ❌ Not started |
| Northbrook / Elmhurst | `/northbrook`, `/elmhurst` | ❌ Pending content |
| Help & Support | `/help-and-support` | ❌ Not started |
| Financing | `/financing` | ❌ Not started |
| Emergency Plumbing | `/emergency-plumbing` | ❌ Not started |
| Privacy / Terms | `/privacy`, `/terms` | ❌ Not started |
| `/knowledge-hub/[slug]` | article detail | ❌ Not started |

---

## Priority queue (what to work on next)

1. **Individual article pages** (`/knowledge-hub/[slug]`) — hub is live, article links 404.
2. **Sitemap Google Sheet import** — register ~80 missing cities (one-line registry adds).
3. **6 remaining category pages** (Sewer, Drain, Emergency, Water Heater, Water Quality, Commercial) — Plumbing (`/services/plumbing`) is the template; carry the `hero-contents` Tailwind fix.
4. **Routing brief** — reconcile live slugs; fix `/{city}/{service}` 404s.
5. **Social icons** — pull the 4 CDN icons into `public/images/social/`.

---

## Brief files

All briefs are in `[project-folder]/briefs/` (outside this repo — in the Cowork project folder). When Marketing sends a brief, implement it exactly as specified. Ask for clarification before deviating.

---

## Open decisions (do not decide without Marketing)

- **Scribo Pro font licensing** — blocks accent typography (F-03)
- **AWS deployment target** — Amplify / ECS / EC2
- **Headless CMS** (Phase 3) — Sanity / Payload / Strapi / custom
- **Form email delivery** — Resend vs. AWS SES
- **URL structure / SEO** — live slugs vs. build slugs (partial: `/why-us → /why-j-blanton` 308 redirect added)
