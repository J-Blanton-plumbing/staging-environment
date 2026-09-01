import Link from 'next/link';
import { MapPin } from 'lucide-react';

/**
 * Coverage Area city-locations grid — theme `.city-locations` (page-city.php
 * 603–644; city.css 401–402). A "we serve everywhere" block: two labels above a
 * 4-column list of every city page (map-pin icon + link), sorted A→Z.
 *
 * NOT present on the Local Office (Evanston) page (brief §10). The list comes
 * from the shared registry — the same data that drives `generateStaticParams`.
 * Columns are chunked `ceil(n/4)` to mirror the theme's `array_chunk`.
 */
/**
 * Which region's trust line sits above the grid.
 *
 * Columbus Integration Brief 02 hard rule: "Do not carry the Chicago trust
 * statement onto Columbus pages … That is wrong on an Ohio page and must not be
 * replicated 172 times." `/columbus` shipped it because this component hardcoded
 * one literal for every city page on the site.
 *
 * `'chicagoland'` is the default so all ~11,400 existing Illinois pages render
 * the identical line they render today.
 */
export type CityGridRegion = 'chicagoland' | 'ohio';

/**
 * The Ohio line is deliberately minimal and factual. "30+ years" is a
 * Chicagoland claim and does not transfer to a market J. Blanton has just
 * entered; nothing here asserts a tenure, a project count or a local credential.
 * Flagged in the Brief 02 report for Marketing to replace with approved copy.
 */
const REGION_TRUST_LINE: Record<CityGridRegion, string> = {
  chicagoland: 'Proudly Serving the Greater Chicagoland Area for 30+ Years',
  ohio: 'Now Serving Central Ohio',
};

export default function CityLocationsGrid({
  cities,
  region = 'chicagoland',
}: {
  cities: { slug: string; name: string }[];
  region?: CityGridRegion;
}) {
  const perColumn = Math.ceil(cities.length / 4);
  const columns: { slug: string; name: string }[][] = [];
  for (let i = 0; i < cities.length; i += perColumn) {
    columns.push(cities.slice(i, i + perColumn));
  }

  return (
    <div className="city-locations mt-[100px]">
      <div className="city-labels mb-8 text-center">
        <p className="font-display text-[22px] font-bold text-navy-800 md:text-[28px]">
          {REGION_TRUST_LINE[region]}
        </p>
        <p className="mt-2 text-navy-800">
          Some areas we serve, but are not limited to, include:
        </p>
      </div>
      <div className="l-cities grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-4">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-2">
            {col.map((c) => (
              <div key={c.slug} className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 text-brand-600" strokeWidth={2} aria-hidden="true" />
                <Link
                  href={`/${c.slug}`}
                  className="text-[15px] text-navy-800 hover:text-brand-600 hover:underline"
                >
                  {c.name}
                </Link>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
