/**
 * City Service Pages V2 (Brief 209 go-live, Marketing 2026-10-14) — the 55 folded city-service URLs.
 *
 * Each of the 5 cities' V2 pages absorbs 11 thinner service pages as an on-page section with a
 * stable #anchor (e.g. /northbrook/drain-cleaning#clogged-drains). The old URLs 301 to the page
 * that now holds their content, exactly as each city's fold map specifies. The targets carry no
 * fragment: a 301 lands on the page, and the in-page menu/anchor links are a later brief.
 *
 * Plain data, no imports: this module is pulled into the Edge middleware bundle through
 * alias-redirects.ts, and into the sitemap manifest, which drops every source from the
 * city-service shards (a sitemap URL must never be a redirect source — scripts/validate-sitemap.ts).
 *
 * Source: New Pages/City Service Pages V2/_source/{City}/{City}_CityService_FoldMap.md.
 */
export const CITY_SERVICE_FOLD_REDIRECTS: Readonly<Record<string, string>> = {
  // northbrook
  '/northbrook/clogged-drains': '/northbrook/drain-cleaning',
  '/northbrook/sewer-drain-clearing': '/northbrook/drain-cleaning',
  '/northbrook/kitchen-sink-drain': '/northbrook/drain-cleaning',
  '/northbrook/kitchen-faucet-repair-and-installation': '/northbrook/faucet-installation-repair',
  '/northbrook/kitchen-plumbing': '/northbrook/faucet-installation-repair',
  '/northbrook/plumbing-fixture-installations': '/northbrook/faucet-installation-repair',
  '/northbrook/residential-water-heater': '/northbrook/water-heater-repair',
  '/northbrook/basement-waterproofing': '/northbrook/basement-flooding',
  '/northbrook/gas-line-leak-detection': '/northbrook/gas-line-repair',
  '/northbrook/water-heater-maintenance': '/northbrook/water-heater-repair',
  '/northbrook/water-testing': '/northbrook/water-filtration-systems',
  // columbus
  '/columbus/clogged-drains': '/columbus/drain-cleaning',
  '/columbus/sewer-drain-clearing': '/columbus/drain-cleaning',
  '/columbus/kitchen-sink-drain': '/columbus/drain-cleaning',
  '/columbus/kitchen-faucet-repair-and-installation': '/columbus/faucet-installation-repair',
  '/columbus/kitchen-plumbing': '/columbus/faucet-installation-repair',
  '/columbus/plumbing-fixture-installations': '/columbus/faucet-installation-repair',
  '/columbus/residential-water-heater': '/columbus/water-heater-repair',
  '/columbus/basement-waterproofing': '/columbus/basement-flooding',
  '/columbus/gas-line-leak-detection': '/columbus/gas-line-repair',
  '/columbus/water-heater-maintenance': '/columbus/water-heater-repair',
  '/columbus/water-testing': '/columbus/water-filtration-systems',
  // tinley-park
  '/tinley-park/clogged-drains': '/tinley-park/drain-cleaning',
  '/tinley-park/sewer-drain-clearing': '/tinley-park/drain-cleaning',
  '/tinley-park/kitchen-sink-drain': '/tinley-park/drain-cleaning',
  '/tinley-park/kitchen-faucet-repair-and-installation': '/tinley-park/faucet-installation-repair',
  '/tinley-park/kitchen-plumbing': '/tinley-park/faucet-installation-repair',
  '/tinley-park/plumbing-fixture-installations': '/tinley-park/faucet-installation-repair',
  '/tinley-park/residential-water-heater': '/tinley-park/water-heater-repair',
  '/tinley-park/basement-waterproofing': '/tinley-park/basement-flooding',
  '/tinley-park/gas-line-leak-detection': '/tinley-park/gas-line-repair',
  '/tinley-park/water-heater-maintenance': '/tinley-park/water-heater-repair',
  '/tinley-park/water-testing': '/tinley-park/water-filtration-systems',
  // joliet
  '/joliet/clogged-drains': '/joliet/drain-cleaning',
  '/joliet/sewer-drain-clearing': '/joliet/drain-cleaning',
  '/joliet/kitchen-sink-drain': '/joliet/drain-cleaning',
  '/joliet/kitchen-faucet-repair-and-installation': '/joliet/faucet-installation-repair',
  '/joliet/kitchen-plumbing': '/joliet/faucet-installation-repair',
  '/joliet/plumbing-fixture-installations': '/joliet/faucet-installation-repair',
  '/joliet/residential-water-heater': '/joliet/water-heater-repair',
  '/joliet/basement-waterproofing': '/joliet/basement-flooding',
  '/joliet/gas-line-leak-detection': '/joliet/gas-line-repair',
  '/joliet/water-heater-maintenance': '/joliet/water-heater-repair',
  '/joliet/water-testing': '/joliet/water-filtration-systems',
  // naperville
  '/naperville/clogged-drains': '/naperville/drain-cleaning',
  '/naperville/sewer-drain-clearing': '/naperville/drain-cleaning',
  '/naperville/kitchen-sink-drain': '/naperville/drain-cleaning',
  '/naperville/kitchen-faucet-repair-and-installation': '/naperville/faucet-installation-repair',
  '/naperville/kitchen-plumbing': '/naperville/faucet-installation-repair',
  '/naperville/plumbing-fixture-installations': '/naperville/faucet-installation-repair',
  '/naperville/residential-water-heater': '/naperville/water-heater-repair',
  '/naperville/basement-waterproofing': '/naperville/basement-flooding',
  '/naperville/gas-line-leak-detection': '/naperville/gas-line-repair',
  '/naperville/water-heater-maintenance': '/naperville/water-heater-repair',
  '/naperville/water-testing': '/naperville/water-filtration-systems',
};
