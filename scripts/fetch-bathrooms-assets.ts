/**
 * Brief 156 — one-shot fetcher for the /bathrooms landing page's media.
 *
 * The page is a clone of the Bathrooms division's Webflow site
 * (jblantonbathrooms.com), whose 46 images/SVGs live on Webflow's CDN. They are
 * downloaded ONCE into `public/bathrooms/**` and committed; the page then
 * references only local absolute paths, so nothing on our side depends on
 * Webflow staying up (or on the Webflow site continuing to exist after the PPC
 * cutover).
 *
 * This script is kept in the repo so the fetch is reproducible, not because it
 * runs on deploy. It is NOT wired into `npm run build` — run it by hand:
 *
 *   npx ts-node --project tsconfig.scripts.json scripts/fetch-bathrooms-assets.ts
 *
 * Behaviour required by the brief: fail loudly (non-zero exit) on any non-200
 * response or any file smaller than 200 bytes — Webflow's CDN answers a missing
 * object with a small HTML error document, which would otherwise be committed
 * as a "successful" download.
 *
 * Source filenames are URL-encoded on the CDN (spaces and parentheses). The
 * MANIFEST keeps the encoded name exactly as the CDN serves it and maps it to a
 * clean, lowercase, hyphenated target path.
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';

const CDN_BASE = 'https://cdn.prod.website-files.com/6988084e7cab858de636b445/';
const OUT_ROOT = resolve(__dirname, '..', 'public', 'bathrooms');

/** Any file below this is assumed to be a CDN error page, not an asset. */
const MIN_BYTES = 200;

/** [target path under public/bathrooms/, CDN filename (URL-encoded as served)] */
const MANIFEST: ReadonlyArray<readonly [string, string]> = [
  // ── Hero ──────────────────────────────────────────────────────────────────
  // The live page has TWO hero backgrounds, not one. `.home-hero-section.second`
  // carries `bath (2).png` as its BASE (desktop) background and is overridden to
  // the COLOURBOX jpg inside `@media screen and (max-width: 991px)`. Brief 156's
  // manifest lists only the COLOURBOX file, so the desktop image was missing —
  // added here as asset #47 (same CDN, same public bucket) rather than showing
  // the tablet photo at 1440px, which would differ materially from the live page.
  ['hero/hero-bathroom-bg-desktop.png', '69894ef4c0b4d32bbfe63fc1_bath%20(2).png'],
  ['hero/hero-bathroom-bg.jpg', '6988aa9ee1f7bd30a971a54a_1600px_COLOURBOX59205495.jpg'],

  // ── Logo ──────────────────────────────────────────────────────────────────
  ['logo/bathrooms-by-jblanton-logo.png', '698910ff471507cc30782630_BATHROOMS%20by-6%20(4).png'],
  // Visually identical duplicate upload; fetched for completeness, unreferenced
  // now that the Webflow footer is dropped in favour of the shared <Footer>.
  [
    'logo/bathrooms-by-jblanton-logo-footer.png',
    '6989418feafb5b398261df6a_698910ff471507cc30782630_BATHROOMS%20by-6%20(4).png',
  ],

  // ── Icons ─────────────────────────────────────────────────────────────────
  ['icons/phone-white.svg', '6988084f7cab858de636b4ab_phone.svg'],
  ['icons/phone-blue.svg', '6988084f7cab858de636b4ad_phone.svg'],
  ['icons/star.svg', '6988084f7cab858de636b4be_Path.svg'],
  // Used by the dropped Webflow footer; fetched for completeness, unreferenced.
  ['icons/location.svg', '69893f9871bd8132d7c0beb0_location.svg'],
  ['icons/close-cross.svg', '698a3ab588a9f9ba033c7594_close-cross-svgrepo-com.svg'],
  ['icons/trust-30-years.svg', '6989194aa69f773872225c2a_Group%201%20(3).svg'],
  ['icons/trust-30k-customers.svg', '6989194a1b44141b23d87a56_Group%202%20(3).svg'],
  ['icons/trust-licensed-bonded-insured.svg', '69891948d281fecdcf0d004c_Group%203%20(1).svg'],
  ['icons/trust-lifetime-warranty.svg', '69891946c47d27b6c2fce7cd_Vector%20(3).svg'],
  ['icons/why-customer-education.svg', '69890eabb005bd2027ef0a71_Book%201.svg'],
  ['icons/why-transparent-quoting.svg', '69890eabe692aa2319ea5253_Clip%20path%20group.svg'],
  ['icons/why-licensed-plumbers.svg', '69890eabee5826541e820be4_Hammer%201.svg'],
  ['icons/why-customer-satisfaction.svg', '69890eabc0b4d32bbfe13a2f_Thumbs-Up%201.svg'],
  ['icons/why-affordable-monthly.svg', '6988084f7cab858de636b4ff_Vector%20(5).svg'],

  // ── Testimonials ──────────────────────────────────────────────────────────
  ['testimonials/google-review-logo.png', '6989442b7bf4b3d82fedc11e_Google-Review-Logo.png'],
  ['testimonials/avatar-alma-tate.png', '6989431b6e1b102d02156f6f_unnamed.png'],
  ['testimonials/avatar-john-moreno.png', '69894372f23bff1d3306618f_unnamed%20(1).png'],
  ['testimonials/review-screenshot-1.webp', '698944ecafbb1d9cf49c8aae_unnamed%20(2).webp'],
  ['testimonials/review-screenshot-2.webp', '698944eec4276680eb971cea_unnamed%20(3).webp'],

  // ── Before / after gallery (9 pairs) ──────────────────────────────────────
  ['gallery/pair-1-before.jpg', '69891fabe692aa2319eb9057_C1%20(1).jpg'],
  ['gallery/pair-1-after.png', '6989200d9cfd66da674d996c_image%20(1)%20(1)%20(1).png'],
  ['gallery/pair-2-before.jpg', '698921ee08dd6bcf067eda36_Before_3.jpg'],
  ['gallery/pair-2-after.jpg', '698921ed580fbb674212c72b_After_CrackedCement_Remodel_4.jpg'],
  ['gallery/pair-3-before.png', '698922b9e9230ece00722e3a_image%20(3).png'],
  ['gallery/pair-3-after.png', '698922b90c0e9fd1888b27b9_image%20(2).png'],
  [
    'gallery/pair-4-before.jpg',
    '698923ba5f8f2537585c83be_Before%20tub%20to%20shower%20conversion%20tile%20(1).jpg',
  ],
  [
    'gallery/pair-4-after.jpg',
    '69892711fdd80dc40d8be2e5_698923bb034c719e5153d577_Bianco%20marble%20black%20trim%20new%20vanity%20(1)%20(1)%20(1).jpg',
  ],
  [
    'gallery/pair-5-before.jpg',
    '698926e1969c509c699ae32a_BEFORE%20fiberglass%20surround%20built%20in%20corner%20seat.jpg',
  ],
  [
    'gallery/pair-5-after.jpg',
    '698926e17217b5a3f36f2592_Bianco%20marble%20fold%20down%20seat%20corner%20matte%20black%20shel%20(1).jpg',
  ],
  ['gallery/pair-6-before.jpg', '6989273a1a70dceb73460513_KevinDavisConstruction_Before.jpg'],
  ['gallery/pair-6-after.jpg', '6989274159017ff67e64fe67_KevinDavisConstruction_After4.jpg'],
  [
    'gallery/pair-7-before.jpg',
    '698927a5ffb005991c1eac22_Before_Smokey%20Blue%20Stacked%20Subway%20Tile_%202.jpg',
  ],
  [
    'gallery/pair-7-after.jpg',
    '698927b922f2f82b48f78e7b_AFTER_Smokey%20Blue_White%20Marble%20InnovaStone%20Base_%2010.jpg',
  ],
  ['gallery/pair-8-before.jpg', '6989282a73519bcca0d7f6c2_Before_.jpg'],
  [
    'gallery/pair-8-after.jpg',
    '69892820977c0a7972ebcfbe_After_BiancoMarble_InnovaStoneWhiteSlate_1%20(1)%20(1).jpg',
  ],
  ['gallery/pair-9-before.jpg', '698928d30c0e9fd1888b833d_Old%20pink%20tiles%20and%20blue%20tub.jpg'],
  [
    'gallery/pair-9-after.jpg',
    '698928db9cfd66da674e47e6_Tub%20to%20tub%20conversion%20bianco%20marble%20without%20a%20dogleg%20black%20trim%20(1)%20(1).jpg',
  ],

  // ── Materials section photos ──────────────────────────────────────────────
  ['materials/work-1-dusty-blue.jpg', '69893a7b266678e939ae97a3_6274%20EM%20Dusty%20Blue%20M00%20SHM_6468-1600px.jpg'],
  ['materials/work-2-silver-grey-marble.jpg', '69893a9026e6711877441987_2279_SilverGreyMarble_M6060_Bathroom_1_1.jpg'],
  ['materials/work-3-black-marble.jpg', '69893be80c16856351cfade2_2272_BlackMarble_M6060_Bathroom_9_4-1600px.jpg'],

  // ── Team ──────────────────────────────────────────────────────────────────
  ['team/paul-louden.jpg', '698a11b3a7c716c3327e1bc7_Paul.jpg'],
  ['team/brian-sloan.jpg', '698a11b26af9013d6b6d21a8_Brian.jpg'],
  ['team/bathrooms-team.jpg', '698a12c071035d18b4e74e1a_Bathrooms%20Team%20(1).jpg'],
];

async function fetchOne(target: string, cdnName: string): Promise<string | null> {
  const url = CDN_BASE + cdnName;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    return `${target}: network error — ${(err as Error).message}`;
  }
  if (!res.ok) return `${target}: HTTP ${res.status} for ${url}`;

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < MIN_BYTES) {
    return `${target}: only ${buf.byteLength} bytes (< ${MIN_BYTES}) — probably a CDN error page, not an asset`;
  }

  const outPath = join(OUT_ROOT, target);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  console.log(`  ok  ${target}  (${buf.byteLength.toLocaleString()} bytes)`);
  return null;
}

async function main() {
  console.log(`Fetching ${MANIFEST.length} Bathrooms assets → ${OUT_ROOT}\n`);

  const failures: string[] = [];
  for (const [target, cdnName] of MANIFEST) {
    const failure = await fetchOne(target, cdnName);
    if (failure) {
      failures.push(failure);
      console.error(`  FAIL ${failure}`);
    }
  }

  console.log(`\n${MANIFEST.length - failures.length} downloaded, ${failures.length} failed`);
  if (failures.length > 0) {
    console.error('\nFailures:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
