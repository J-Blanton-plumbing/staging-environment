import Link from 'next/link';
import type { CityServiceCategory } from '@/lib/content/cities/evanston';

/**
 * v2 "OUR SERVICES" accordion menu — theme `.city-sub-categories > .services-row`
 * (page-city-v2.php 214–249). One native `<details>` per service category; the
 * `<summary>` shows the category icon + name with a CSS `▾` caret that rotates
 * when `[open]`. Driven entirely by data so the three v2 cities reuse it.
 *
 * Visual styling lives in globals.css under `.city-services-row`, reproducing the
 * LIVE render: the theme's globals.css overrides city.css so the panel is a
 * red gradient (#e63946 → #9b0d0d) with WHITE text, white (filter-inverted)
 * icons, and a white caret — NOT the cream/Midnight scheme described in brief
 * §5 (which read only city.css). Matching live per the fidelity hard rule.
 */
export default function CityServicesAccordion({
  heading,
  categories,
}: {
  heading: string;
  categories: CityServiceCategory[];
}) {
  return (
    <section className="services-menu mb-[130px]">
      <p className="red-text2 block w-full text-center font-display text-[2.5rem] font-bold leading-[1.2] text-brand-600 my-8">
        {heading}
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
