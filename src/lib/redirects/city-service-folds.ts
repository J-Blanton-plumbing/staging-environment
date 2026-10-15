/**
 * City Service Pages V2 (Brief 209 go-live, Marketing 2026-10-14; Batch 2 added by Brief 212) — the 110
 * folded city-service URLs (11 per city × 10 cities).
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
  // ── Batch 2 (Brief 212 D4, Marketing 2026-10-15): the same 11 folds per city, from
  //    New Pages/City Pages Batch 2/_source/services/{City}/{City}_CityService_FoldMap.md.
  // arlington-heights
  '/arlington-heights/clogged-drains': '/arlington-heights/drain-cleaning',
  '/arlington-heights/sewer-drain-clearing': '/arlington-heights/drain-cleaning',
  '/arlington-heights/kitchen-sink-drain': '/arlington-heights/drain-cleaning',
  '/arlington-heights/kitchen-faucet-repair-and-installation': '/arlington-heights/faucet-installation-repair',
  '/arlington-heights/kitchen-plumbing': '/arlington-heights/faucet-installation-repair',
  '/arlington-heights/plumbing-fixture-installations': '/arlington-heights/faucet-installation-repair',
  '/arlington-heights/residential-water-heater': '/arlington-heights/water-heater-repair',
  '/arlington-heights/basement-waterproofing': '/arlington-heights/basement-flooding',
  '/arlington-heights/gas-line-leak-detection': '/arlington-heights/gas-line-repair',
  '/arlington-heights/water-heater-maintenance': '/arlington-heights/water-heater-repair',
  '/arlington-heights/water-testing': '/arlington-heights/water-filtration-systems',
  // elgin
  '/elgin/clogged-drains': '/elgin/drain-cleaning',
  '/elgin/sewer-drain-clearing': '/elgin/drain-cleaning',
  '/elgin/kitchen-sink-drain': '/elgin/drain-cleaning',
  '/elgin/kitchen-faucet-repair-and-installation': '/elgin/faucet-installation-repair',
  '/elgin/kitchen-plumbing': '/elgin/faucet-installation-repair',
  '/elgin/plumbing-fixture-installations': '/elgin/faucet-installation-repair',
  '/elgin/residential-water-heater': '/elgin/water-heater-repair',
  '/elgin/basement-waterproofing': '/elgin/basement-flooding',
  '/elgin/gas-line-leak-detection': '/elgin/gas-line-repair',
  '/elgin/water-heater-maintenance': '/elgin/water-heater-repair',
  '/elgin/water-testing': '/elgin/water-filtration-systems',
  // mchenry
  '/mchenry/clogged-drains': '/mchenry/drain-cleaning',
  '/mchenry/sewer-drain-clearing': '/mchenry/drain-cleaning',
  '/mchenry/kitchen-sink-drain': '/mchenry/drain-cleaning',
  '/mchenry/kitchen-faucet-repair-and-installation': '/mchenry/faucet-installation-repair',
  '/mchenry/kitchen-plumbing': '/mchenry/faucet-installation-repair',
  '/mchenry/plumbing-fixture-installations': '/mchenry/faucet-installation-repair',
  '/mchenry/residential-water-heater': '/mchenry/water-heater-repair',
  '/mchenry/basement-waterproofing': '/mchenry/basement-flooding',
  '/mchenry/gas-line-leak-detection': '/mchenry/gas-line-repair',
  '/mchenry/water-heater-maintenance': '/mchenry/water-heater-repair',
  '/mchenry/water-testing': '/mchenry/water-filtration-systems',
  // algonquin
  '/algonquin/clogged-drains': '/algonquin/drain-cleaning',
  '/algonquin/sewer-drain-clearing': '/algonquin/drain-cleaning',
  '/algonquin/kitchen-sink-drain': '/algonquin/drain-cleaning',
  '/algonquin/kitchen-faucet-repair-and-installation': '/algonquin/faucet-installation-repair',
  '/algonquin/kitchen-plumbing': '/algonquin/faucet-installation-repair',
  '/algonquin/plumbing-fixture-installations': '/algonquin/faucet-installation-repair',
  '/algonquin/residential-water-heater': '/algonquin/water-heater-repair',
  '/algonquin/basement-waterproofing': '/algonquin/basement-flooding',
  '/algonquin/gas-line-leak-detection': '/algonquin/gas-line-repair',
  '/algonquin/water-heater-maintenance': '/algonquin/water-heater-repair',
  '/algonquin/water-testing': '/algonquin/water-filtration-systems',
  // geneva
  '/geneva/clogged-drains': '/geneva/drain-cleaning',
  '/geneva/sewer-drain-clearing': '/geneva/drain-cleaning',
  '/geneva/kitchen-sink-drain': '/geneva/drain-cleaning',
  '/geneva/kitchen-faucet-repair-and-installation': '/geneva/faucet-installation-repair',
  '/geneva/kitchen-plumbing': '/geneva/faucet-installation-repair',
  '/geneva/plumbing-fixture-installations': '/geneva/faucet-installation-repair',
  '/geneva/residential-water-heater': '/geneva/water-heater-repair',
  '/geneva/basement-waterproofing': '/geneva/basement-flooding',
  '/geneva/gas-line-leak-detection': '/geneva/gas-line-repair',
  '/geneva/water-heater-maintenance': '/geneva/water-heater-repair',
  '/geneva/water-testing': '/geneva/water-filtration-systems',
};
