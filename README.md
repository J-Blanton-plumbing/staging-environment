# J. Blanton Plumbing — Website

Custom Next.js 14 (App Router) + Tailwind CSS site replacing the WordPress installation.
Cloned brand: real logo, real colors (brand red `#bc0e0e`, navy `#0a1b2e`, cream `#f9f3ec`),
matching font stack (Barlow display + Nunito body), and matching site architecture.

## Prerequisites

- Node.js 18+ ([nodejs.org](https://nodejs.org/))
- npm 9+

## Quick Start

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000

## Environment variables

`.env.local.example` documents every variable. Two of them are load-bearing enough
to repeat here.

### ⚠️ Any future staging/dev environment MUST set BOTH of these

Since the 2026-08-11 incident recovery (commits `05cf029`→`e060706`), tracking and
robots.txt **fail open**: the five tracking tags (GA4, Google Ads, Meta Pixel,
Bing UET, WhatConverts) load with their live production IDs even when their env
vars are blank, and robots.txt serves `Allow` to any host on the brand domain.
That is correct for the one live box. A new staging or dev environment that
doesn't opt out will report into the production analytics accounts, burn numbers
out of the live WhatConverts dynamic-number pool, and be indexable by Google:

```bash
NEXT_PUBLIC_TRACKING_DISABLED=1   # switches off GA4 / Google Ads / Meta / Bing / WhatConverts
ROBOTS_DISALLOW=1                 # robots.txt serves "Disallow: /" regardless of host
```

Both are build-time-sensitive: `NEXT_PUBLIC_TRACKING_DISABLED` is inlined into the
client bundle at `npm run build`, so set it **before** building; `ROBOTS_DISALLOW`
is read per request but needs a process restart to be picked up.

## Pages

| Route | Description |
|---|---|
| `/` | Home — hero with JB character, services grid, stats, No Drip Club promo, reviews, CTA |
| `/services` | All 7 services |
| `/services/[slug]` | Service detail (emergency-plumbing, plumbing, sewer, drain, water-heater, water-quality, commercial) |
| `/emergency` | 24/7 emergency landing page |
| `/no-drip-club` | Membership program page ($29.97/mo) |
| `/locations` | All 13 Chicagoland office locations |
| `/reviews` | Customer Stories page |
| `/why-us` | About / Why J. Blanton |
| `/booking` | Online appointment booking |
| `/contact` | Contact form |

## Project Structure

```
src/
  app/                   # Next.js App Router pages & API routes
    api/contact/         # POST handler — contact form
    api/booking/         # POST handler — booking form
    services/[slug]/     # Dynamic service detail pages
  components/            # Shared React components
  lib/
    services.ts          # 7 services with slugs, copy, icons, features
    locations.ts         # 13 Chicagoland office locations
    reviews.ts           # Placeholder reviews (replace with Google Places API)
    utils.ts             # Tailwind utility
public/images/           # Logo, JB character, icons (sourced from jblantonplumbing.com CDN)
```

## Brand System

Tailwind extension in `tailwind.config.ts`:
- `brand-600` (#bc0e0e) — primary red
- `brand-700` (#9b0d0d) — dark red hover
- `brand-400` (#e63946) — light red accent
- `navy-800` (#0a1b2e) — heading/section dark
- `cream-100` (#f9f3ec) — section backgrounds
- Font: `font-display` (Barlow) for headings/buttons, `font-sans` (Nunito) for body

## Before Launch Checklist

- [ ] Confirm phone number 773-724-9272 displays correctly across all pages
- [ ] Wire up email delivery in `src/app/api/contact/route.ts` and `src/app/api/booking/route.ts` (Resend or AWS SES)
- [ ] Add real Google review feed (replace placeholder data in `src/lib/reviews.ts`)
- [ ] Replace placeholder social links in `Footer.tsx`
- [ ] Add real photos for service pages and hero
- [ ] Set up Google Analytics / Tag Manager
- [ ] Add favicon.png and apple-touch-icon (current favicon.ico is in public/images/)
- [ ] Test all forms end-to-end
- [ ] SEO review: meta descriptions, Open Graph images, structured data
- [ ] Add per-location pages if desired (`/locations/[slug]`)

## Email Delivery

The two API routes log to console by default. To send real emails:

**Option A — Resend:**
```bash
npm install resend
```
Uncomment the Resend block in `src/app/api/contact/route.ts` and `src/app/api/booking/route.ts`. Set `RESEND_API_KEY`.

**Option B — AWS SES (recommended since hosting is AWS):**
```bash
npm install @aws-sdk/client-ses
```
Use `SESClient` with `SendEmailCommand`. Set `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

## Deploy to AWS

### Option 1 — AWS Amplify (easiest)
1. Push repo to GitHub
2. AWS Amplify Console → "Host a web app" → connect repo
3. Set env vars in Amplify console
4. Auto-deploys on every push to main

### Option 2 — EC2 + Nginx + PM2
```bash
npm run build
npm install -g pm2
pm2 start "npm start" --name jblanton-plumbing
# Nginx reverse proxy → localhost:3000
```

### Option 3 — ECS / Fargate (Docker)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```
Push to ECR, deploy via ECS service.

## Adding / Editing Content

- **Services**: `src/lib/services.ts`
- **Locations**: `src/lib/locations.ts`
- **Reviews**: `src/lib/reviews.ts`
- **Phone / business info**: `src/lib/site.ts` (single source — edit once, used everywhere via `SITE`)
- **Logo**: `public/images/logo-text.webp` (dark header) and `logo-white.webp` (footer)
