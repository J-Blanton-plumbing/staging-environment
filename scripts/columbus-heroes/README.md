# Columbus area hero images

Generates one map hero per Ohio coverage area into
`public/images/columbus-heroes/hero_columbus_<area>.webp` — an OpenStreetMap
base map with the area's real boundary traced in JBP red, 1000x1000 webp at
quality 72 (Brief 173 — sized against the 250 KB LCP budget).

## Run

```
node scripts/columbus-heroes/build-heroes.mjs --force
```

`--force` is needed the first time: placeholder heroes with the same filenames
are already in `public/images/columbus-heroes/`, and the script skips files that
already exist so a stopped run can be resumed.

Takes roughly 15 minutes for all 138 on a cold cache. It follows Brief 171 Track B's tile policy
(sequential requests, `TILE_DELAY_MS`, a `MAX_TILES` hard stop) and caches every tile under
`.scripts-out/tile-cache`, so a second run costs almost nothing. Safe to stop
with Ctrl-C and restart — it picks up where it left off.

Other flags: `--only=dublin,hilliard` to rebuild specific areas, `--dry` to
exercise the pipeline with grey placeholder tiles and no network.

## What the images contain

- **114 areas** — exact municipal boundary from US Census TIGER 2019, shipped in
  `geo.json`. No network lookup needed.
- **24 areas** — Columbus neighborhoods and unincorporated hamlets that have no
  Census place record. The script looks each one up once via Nominatim; if OSM
  has a boundary it is drawn, otherwise the map is simply centred on the place
  with no outline drawn. Nothing is invented.

Every image carries "Map data © OpenStreetMap contributors", which is what ODbL
requires and what makes these safe to self-host. The output is a static file —
no tile traffic at page-view time.

## Wiring them to the pages

Already wired, for all 138 (Brief 173). `getOhioTemplateContent()` derives

```ts
heroImage: `${COLUMBUS_HERO_PREFIX}hero_columbus_${core}.webp`
```

for every Ohio area, where `core` is the slug with the `columbus-` prefix
stripped for neighborhoods; `columbus` carries the same value in `columbus.ts`,
because `getOhioTemplateContent()` returns `undefined` for that slug so its
hand-written copy file is never shadowed. `columbus-hero-manifest.csv` lists the
exact value per slug and is rewritten by every full run.

The leading slash matters — `resolveCityImage()` returns a `/`-prefixed value
as-is but turns a bare filename into a CloudFront URL, where these files do not
exist. That is why the prefix is the shared `COLUMBUS_HERO_PREFIX` constant in
`src/lib/content/cities/shared.ts`: `CoverageAreaCity` tests the resolved hero
URL against it to decide whether to describe the image as a map in `alt` text,
and the two must not drift.

**Adding an area** is therefore just a registry entry plus a run — but the image
has to exist, because there is no per-area fallback: a missing file 404s the
hero. A `nodata` line in the run output is the signal that one is missing.

**The CMS still wins.** `[city]/page.tsx` merges `db.heroImage || base.heroImage`,
so a non-empty `city_pages.hero_image` overrides the map. As of Brief 173 exactly
one Ohio row has one (`columbus`).

## What the run prints

Per area: the boundary source (`census` / `osm` / `centred`), the chosen zoom,
the tile count, and the output size in KB. Anything over 250 KB is listed again
at the end — that is the LCP budget for these images, since `CityPageImage`
renders a plain `<img>` with no next/image resizing behind it.

A full run (no `--only`) rewrites `columbus-hero-manifest.csv` from what it
actually did, so the manifest can never drift from the images beside it. An
`--only` run deliberately leaves the manifest alone.

## Credit placement

The ODbL credit is inset 6% from the bottom-right corner rather than sitting
flush against it. The hero is `object-fit: cover` in a column that is narrower
than it is tall between roughly 1051px and 1127px viewport width; a corner-flush
credit loses its tail there (Brief 172 finding). The inset clears it at every
breakpoint.
