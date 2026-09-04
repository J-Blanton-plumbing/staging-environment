import Link from 'next/link';
import { MapPin } from 'lucide-react';

import type { Office } from '@/lib/content/cities/types';
import type { NearbyArea } from '@/lib/content/cities/ohio-nearby';

/**
 * Per-area facts + "WE ALSO SERVE" — Columbus Integration Brief 02, Track B.
 *
 * ─── What this is for ──────────────────────────────────────────────────────
 * The Ohio area pages ship with name-swapped template copy (real copy is Brief
 * 03+). Without this block, all 137 of them are byte-identical below the H1,
 * which is the doorway shape whatever the copy schedule says. Everything here
 * differs per area at zero copywriting cost: the county, the dispatching office
 * and drive time, and a sibling link list that is genuinely different on every
 * page and builds a real internal link graph.
 *
 * It is the FLOOR, not the rewrite. It does not make a page unique in the sense
 * the content checklist means.
 *
 * ─── Why it renders nothing for Illinois ───────────────────────────────────
 * It returns `null` unless the page has AREA-SPECIFIC data: a county, or sibling
 * links. Both are unset/empty on all ~249 Illinois cities, so no Illinois page
 * gains a section — a hard rule of the brief.
 *
 * The gate is deliberately NOT "does it have any fact at all". `office.address`
 * resolves for every city in the registry (that is the point of the office
 * maps), so an any-fact gate rendered a "Serving {City} → Nearest office" block
 * on all ~249 Illinois city pages and all 11,160 Illinois city-service pages —
 * caught by the before/after HTML diff in Track E, at ~175 changed tags per
 * page. The office address is also already displayed in the hero NAP block on
 * those pages, so it was duplicate content as well as an unrequested change.
 *
 * The condition is data, not a state string: an Illinois city that one day gets
 * a county and siblings would render this correctly with no code change.
 *
 * ─── population / zips / driveTimeMinutes ──────────────────────────────────
 * Rendered ONLY when present, and as of Brief 02 all three are unset on every
 * area. They need sourced public data (Census ACS / USPS / a routing lookup) and
 * the brief forbids unsourced statistics; the Columbus board carries a P1 card
 * for that pass. Filling them later needs no change here.
 */
export interface CityAreaDetailsProps {
  /** Area display name, e.g. "Dublin" or "Columbus Short North". */
  name: string;
  /** State name, e.g. "Ohio". */
  state: string;
  /** County the area sits in. Undefined for every Illinois city. */
  county?: string;
  /** The dispatching office's NAP, already resolved from the CMS office list. */
  office: Office;
  /** Display name of that office, e.g. "Columbus". */
  officeName?: string;
  /** Drive time in whole minutes from that office. Unset until sourced. */
  driveTimeMinutes?: number;
  /** Census population. Unset until sourced. */
  population?: number;
  /** ZIP codes served. Unset until sourced. */
  zips?: readonly string[];
  /** The 3–5 sibling areas to link. Empty for every Illinois city. */
  nearby: readonly NearbyArea[];
}

interface Fact {
  label: string;
  value: React.ReactNode;
}

export default function CityAreaDetails({
  name,
  state,
  county,
  office,
  officeName,
  driveTimeMinutes,
  population,
  zips,
  nearby,
}: CityAreaDetailsProps) {
  /*
   * The gate. See the docblock: `office.address` alone is NOT area-specific data
   * — it resolves for every registry city — so it must not be able to bring this
   * section into existence on a page that has nothing else to say.
   */
  const hasAreaData = Boolean(county) || nearby.length > 0;
  if (!hasAreaData) return null;

  const facts: Fact[] = [];

  if (county) facts.push({ label: 'County', value: `${county} County, ${state}` });

  if (office.address) {
    facts.push({
      label: officeName ? `Nearest office — ${officeName}` : 'Nearest office',
      value: office.url ? (
        <a href={office.url} className="hover:text-brand-600 hover:underline" target="_blank" rel="noreferrer">
          {office.address}
        </a>
      ) : (
        office.address
      ),
    });
  }

  if (driveTimeMinutes != null) {
    facts.push({ label: 'Drive time', value: `About ${driveTimeMinutes} minutes` });
  }
  if (population != null) {
    facts.push({ label: 'Population', value: population.toLocaleString('en-US') });
  }
  if (zips && zips.length > 0) {
    facts.push({ label: zips.length === 1 ? 'ZIP code' : 'ZIP codes', value: zips.join(', ') });
  }

  return (
    <section className="city-area-details mb-[100px]">
      {facts.length > 0 && (
        <>
          <h2 className="red-text mb-6 font-display text-[28px] font-bold uppercase leading-tight tracking-tight text-brand-600 md:text-[32px]">
            Serving <span>{name}</span>
          </h2>
          <dl className="mb-10 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="font-display text-[14px] font-bold uppercase tracking-wide text-brand-600">
                  {f.label}
                </dt>
                <dd className="text-[16px] leading-relaxed text-navy-800">{f.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {nearby.length > 0 && (
        <>
          <h3 className="mb-4 font-display text-[20px] font-bold uppercase tracking-tight text-navy-800 md:text-[24px]">
            We also serve
          </h3>
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {nearby.map((n) => (
              <li key={n.slug} className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 text-brand-600" strokeWidth={2} aria-hidden="true" />
                <Link
                  href={`/${n.slug}`}
                  className="text-[16px] text-navy-800 hover:text-brand-600 hover:underline"
                >
                  {n.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
