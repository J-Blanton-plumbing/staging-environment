import Link from 'next/link';
import { coverageServiceCategories } from '@/lib/content/cities/shared';

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
 */
export default function CityServicesMenu({ citySlug }: { citySlug: string }) {
  const categories = coverageServiceCategories(citySlug);

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
                {cat.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
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
