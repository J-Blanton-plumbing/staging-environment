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
export default function CityLocationsGrid({
  cities,
}: {
  cities: { slug: string; name: string }[];
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
          Proudly Serving the Greater Chicagoland Area for 30+ Years
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
