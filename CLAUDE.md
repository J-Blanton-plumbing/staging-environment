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

3. **Hero headline sizing on city video-hero pages is "reversed".** The badge `<img>` is `:nth-child(1)`, so the original theme's `nth-child` H1 selectors target one element later than you'd expect: the FIRST headline line renders at 50px and the LAST at 40px. `CityVideoHero.tsx` reproduces those sizes with explicit Tailwind classes, so nothing depends on `nth-child` any more — but keep the 50/40 order if you touch it.
   **These pages render exactly ONE `<h1>` (the city heading).** They used to render two, mirroring a multiple-H1 defect on the live WordPress page; that was fixed — do not "restore fidelity" by adding H1s back. Same rule as the homepage hero: one H1 per page, and a linked phone number is never a heading.

4. **Never run `next dev` on a stale production `.next` build.** It deadlocks the dev compiler with false "build failure" errors. Always wipe `.next` when switching between `next build` and `next dev`.

5. **Don't pipe `npm run build` through `| tail`.** It masks the real exit code.

6. **Elfsight widgets show "something went wrong" on localhost.** Expected — they're origin-restricted. They work on the production domain.

7. **Social icon assets 404** — `/images/social/*.webp` (LinkedIn/IG/FB/X) are not yet in `public/`. Do not substitute lucide icons.

8. **City registry is ~147 cities, full list is ~230.** The missing ~80 (Oak Park, Tinley Park, Joliet, Chicago neighborhood pages, etc.) need to be imported from the Sitemap Google Sheet. Until added, their `/{slug}` routes 404.

9. **Large unoptimized webp assets** — `plumbing-f3.webp` (21 MB), `sub-gas-lines.webp` (8.4 MB) etc. Load correctly but slowly. Image optimization pass is Phase 2 / pre-launch.

10. **Northbrook + Elmhurst** are Local Office city type but are held in `PENDING_LOCAL_OFFICE` — no `.ts` data file, not in the registry. Build them when content is available.

11. **`next start` won't serve a file written to `public/` after the process booted — until the process restarts.** In production mode (`next start`, not `next dev`), Next.js only recognizes `public/` files that existed at boot; a file written afterward 404s (as a real rendered App Router 404 page, not a static-file 404) until the app restarts. This bit CMS media uploads (Brief 112): every uploaded image/video 404's in its preview and on the live page until someone restarts the app. **The real fix is an nginx `location /uploads/cms/ { root ...; try_files $uri =404; }` block that serves uploads directly from disk, bypassing Next's boot-time snapshot** — see the Brief 112 follow-up. Also discovered while diagnosing this: staging had no pm2-registered process at all (`pm2 list` was empty, the app was a bare `next start` with nothing supervising or restarting it), so `deploy.yml`'s `pm2 restart jblanton` had likely been silently no-op'ing on every deploy. Fixed via `ecosystem.config.js` + `pm2 startOrReload` in the deploy step.

12. **Tracking and robots.txt FAIL OPEN since 2026-08-11 — a new staging/dev environment MUST set `NEXT_PUBLIC_TRACKING_DISABLED=1` and `ROBOTS_DISALLOW=1`.** After the emergency promotion of the staging box to serve jblantonplumbing.com, the recovery (commits `05cf029`→`e060706`) inverted the old fail-closed defaults: the five tracking tags (GA4, Google Ads, Meta Pixel, Bing UET, WhatConverts) now load with their baked-in live IDs even when their env vars are blank, and robots.txt serves `Allow` to any host on the brand domain. A future staging environment that doesn't set BOTH disable vars reports into production analytics, burns numbers out of the live WhatConverts pool, and gets indexed as duplicate content. `NEXT_PUBLIC_TRACKING_DISABLED` is inlined at BUILD time — set it before `npm run build`. See `.env.local.example` and the README's Environment section.

13. **Trailing-slash normalization lives in `src/middleware.ts`, not in Next — and `skipTrailingSlashRedirect: true` in `next.config.mjs` is what makes that true (Brief 152).** Next's built-in rule is unshifted onto the front of `redirects()`, so it runs before middleware and always wins; with it enabled, every slashed alias was a two-hop chain (`/bathroom-plumbing/` → 308 `/bathroom-plumbing` → 301 `/bathroom-plumbing-chicago`). Because every legacy WordPress URL ended in a slash, that shape is what Google holds for effectively the whole site. `normalizeTrailingSlash()` now strips the slash AND resolves the redirect map in one pass, so a crawler gets a single 301 to the final 200. **Removing the flag silently restores the 308 and re-creates every chain, with the middleware branch as dead code** — `scripts/validate-sitemap.ts` fails the build if the flag goes missing. Residual, accepted: a doubled trailing slash (`/evanston//`) still takes two hops, because Next's repeated-slash collapse also runs pre-middleware and lands on `/evanston/`.

14. **The sitemap and the redirect map are validated, and a violation FAILS THE BUILD (Brief 152).** `npm run build` runs `scripts/validate-sitemap.ts` as `prebuild` — no DB, no network — asserting that every sitemap path is served by a real route, is not a redirect source, is not `noindex`, and that no redirect target is itself a redirect source. Its live counterpart `scripts/validate-seo-routing.mjs` runs in deploy.yml's health-check step and asserts each sitemap `<loc>` returns 200 with a **self-referencing canonical**, plus the robots/noindex/one-hop rules. Add sitemap pages in `src/lib/sitemap-pages.ts` and slug aliases in `src/lib/redirects/alias-redirects.ts` (both files carry the rules in their headers) — never by editing the generated `legacy-redirect-map.json`. `SKIP_SITEMAP_VALIDATION=1` is an emergency-only bypass. Note a **dynamic route match is not proof a URL serves**: `src/app/[city]` sets `dynamicParams = false`, so `/anything` matches it and 404s — the validator checks slugs against `CITY_REGISTRY` for exactly that reason.

15. **`robots.txt` deliberately has NO `Disallow` lines (Brief 152).** `Disallow: /admin` + `Disallow: /api` blocked the *crawl* but not *indexing*: Google had indexed 25 of those URLs from links and then could not fetch them to read a `noindex`, so they were stuck in the index permanently. Those prefixes now answer `X-Robots-Tag: noindex, nofollow` via `next.config.mjs` `headers()` instead. Do not "tidy up" by re-adding a Disallow — it re-blocks the crawl and makes the header unreadable. Access control on `/admin` and `/api` is separate and unaffected. (Brief 153 added one deliberate exception: `dev.` and `prod.` get `Disallow: /` — see #18.)

16. **`/sitemap.xml` is a `<sitemapindex>`, and `src/app/sitemap.ts` no longer exists (Brief 153).** Next's `MetadataRoute.Sitemap` export can only emit a flat `<urlset>`, and that flat file was listing 1,104 URLs while the site served ~12,264 — the entire `/{city}/{service}` layer (11,160 live, self-canonical pages) was invisible to Google's discovery. It is now Route Handlers: `src/app/sitemap.xml/route.ts` (the index) plus `sitemap-pages.xml`, `sitemap-cities.xml`, `sitemap-articles.xml` and `sitemap-city-services-1..5.xml`. **The URL set lives in `src/lib/sitemap/manifest.ts` (database-free, so the build validator can import it) and the XML/lastmod/caching in `src/lib/sitemap/render.ts`** — add pages via `src/lib/sitemap-pages.ts` as before. City-service shards are keyed by a half-open **city-slug range**, not an index, so adding a city never moves an existing one between children; a new shard needs both a `CITY_SERVICE_SHARDS` entry and a matching `src/app/sitemap-city-services-N.xml/route.ts`, and the validator fails the build if either is missing. Routes stay `force-dynamic` (no DB read during `next build`); freshness is bounded by an in-process TTL memo — **15 min** for pages/cities/articles, **6 h** for the city-service shards. `SITEMAP_LASTMOD_SOURCES` moved to `render.ts`; `scripts/verify-sitemap-queries.ts` still runs the exact same SQL on deploy.

17. **`/{city}/{anything-that-is-not-a-city-service}` is a REDIRECT RULE, not map entries (Brief 153).** `src/lib/redirects/city-scoped.ts` derives ~4,216 301s — `/{city}/{category}` → `/services/{category}` (and `/{city}/emergency` → `/emergency-plumbing`), `/{city}/{hub-only service}` → `/{hub}`, and the WordPress `-2`/`-3` duplicate-slug artifacts → the page they duplicate. It is consulted **last**, after both exact-path maps, and returns null the moment `getCityService()` resolves — which is what makes it unable to redirect a working page away or shadow any of the 11,160 sitemap URLs. Category targets come from `LEGACY_CATEGORY_TARGETS` in `service-taxonomy.ts`, and the validator asserts they still match `next.config.mjs`'s bare `/{category}` redirects. **Cost: the middleware bundle grew 111 kB → 162 kB** because the rule pulls `CITY_REGISTRY` and the city-service registry into the Edge bundle. Note also that this rule is why the ~71 `/{city}/{category}` 404s stopped being 404s — **nothing in the build ever emitted those links** (verified across 26 live pages, the WordPress theme and the full WP export); they are a historical crawl backlog.

18. **`dev.` and `prod.jblantonplumbing.com` are non-public clone hosts, denied in CODE (Brief 153).** They sit on the brand domain, so the host gate in `robots.txt/route.ts` was handing them `Allow: /`. `NON_PUBLIC_SUBDOMAINS` in `src/lib/non-public-hosts.ts` now forces `Disallow: /` for them ahead of every other rule, and `next.config.mjs` adds `X-Robots-Tag: noindex, nofollow` to **every** path on those hosts via `has: [{ type: 'host' }]` — both deliberately, per #15's logic. A repo list is used *in addition to* `ROBOTS_DISALLOW=1` on the boxes because an env var on a machine nobody remembers is exactly the control that has already failed here twice. Keep the two lists in sync — the validator fails the build if they drift. `staging.` is deliberately NOT in the list (the apex is proxied to the same instance; which hostnames stay public is Marketing's open clone-box decision).

19. **A command added to `deploy.yml`'s `Post-deploy health check` step does NOT inherit the deploy step's working directory.** The two are separate `appleboy/ssh-action` invocations, so the health check opens a new SSH session starting in `$HOME`; the `cd /var/www/jblanton` in `Deploy via SSH` does not carry over. Every check in that step was historically a `curl` against an absolute `http://localhost:3000/...` URL, so nobody noticed until Brief 152 put `node scripts/validate-seo-routing.mjs` there — which resolved to `$HOME/scripts/…`, died on `Cannot find module`, and turned **two consecutive deploys red for a reason unrelated to the code they shipped** (runs 78/79; fixed in `99adfeb`). The step now `cd`s at the top and guards the script's existence with a message naming the cause. Also worth keeping: the repo is PUBLIC, so `https://api.github.com/repos/J-Blanton-plumbing/staging-environment/actions/runs` and `.../jobs` give per-step conclusions and durations with no auth (log *download* still needs admin) — that is what identified this. A 26s health check is `sleep 12` plus the curls and nothing else; a real validator run is ~50s.

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
