import Link from 'next/link';
import { coverageServiceCategories } from '@/lib/content/cities/shared';
import { getCity } from '@/lib/content/cities';

/**
 * Coverage Area "OUR SERVICES" — the STATIC 5-category menu from
 * `template-parts/city-services-menu.php` (page-city.php 518–522). Unlike the
 * Local Office page's child-page-derived accordion, this list is hardcoded and
 * identical across coverage-area cities; only the per-city slug in each href
 * differs (`/{city}/{service-slug}`). No "Other Services" category, and
 * gas-line-leak-detection lives under Gas Lines (brief §7).
 *
 * Renders the same `.city-services-row` markup the Local Office accordion uses,
 * so it picks up the verified LIVE styling (red gradient `#e63946→#9b0d0d`,
 * white text/icons/caret) from globals.css — confirmed to also apply here
 * (brief §7 colour trap).
 *
 * ── Brief 138: city mode vs global mode ────────────────────────────────────
 * `citySlug` is OPTIONAL. Omit it on non-city pages (utility/static pages that
 * reuse this menu — /j-blanton-is-hiring, /privacy-policy, and any future
 * clone) and every item resolves to the GLOBAL service page instead:
 * `/sewer-rodding`, `/emergency-plumbing`, `/services/{category}`, … See
 * `globalServiceHref` in lib/content/service-taxonomy.ts for the rules.
 *
 * Passing a slug that isn't a registered city used to emit ~40 hrefs of the
 * form `/{page}/{service}` with no route behind them (all 404). That is no
 * longer possible: an unregistered slug is IGNORED and the menu falls back to
 * global links, so a careless clone can't reintroduce the bug. Markup, classes
 * and ordering are identical in both modes — only `href` values change.
 */
export default function CityServicesMenu({ citySlug }: { citySlug?: string }) {
  const isRegisteredCity = citySlug !== undefined && getCity(citySlug) !== undefined;

  if (citySlug !== undefined && !isRegisteredCity) {
    console.warn(
      `[CityServicesMenu] "${citySlug}" is not a registered city — falling back to ` +
        'global service links. Omit the citySlug prop on non-city pages (Brief 138).'
    );
  }

  const categories = coverageServiceCategories(isRegisteredCity ? citySlug : undefined);

  return (
    <section className="services-menu mb-[130px]">
      <p className="red-text2 my-8 block w-full text-center font-display text-[2.5rem] font-bold leading-[1.2] text-brand-600">
        OUR SERVICES
      </p>
      <div className="city-sub-categories relative bg-cream-100 py-[18px]">
        <div className="city-services-row">
          {categories.map((cat) => (
            <details key={cat.name} className="service-category">
              <summary>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="icon-text" src={cat.icon} alt={cat.name} />
                {cat.name}
              </summary>
              <ul>
                {/* Keyed by label, not href: in global mode several items share
                    one destination (e.g. every un-hubbed plumbing service →
                    /services/plumbing), so hrefs are no longer unique. */}
                {cat.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link href={link.href}>{link.label}</Link>
                    ) : (
                      // No verified destination — show the label, never guess a
                      // URL (Brief 138, Track B item 5). Unreachable today.
                      <span>{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
