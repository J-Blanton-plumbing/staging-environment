import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface SubcategoryItem {
  label: string;
  href: string;
  desc: string;
  image: string;
}

/**
 * Brief 98 — extracted from the near-identical inline JSX duplicated across
 * the 6 static service-category pages (`src/app/services/<slug>/page.tsx`).
 * The description paragraph is conditionally rendered (only the `commercial`
 * page's original inline copy did this) — adopted here for every category
 * since it is a strict superset: pages whose items always have a non-empty
 * `desc` render identically, and `commercial`'s 2 blank-`desc` items keep
 * their existing no-empty-`<p>` output instead of gaining one.
 */
export default function SubcategoriesGrid({
  heading,
  items,
}: {
  heading: string;
  items: SubcategoryItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="ep-subcategories mb-[100px] lg:mb-[140px]">
      <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-10 text-center">
        {heading}
      </p>
      <div className="services grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((sub) => (
          <Link
            key={sub.label}
            href={sub.href}
            className="card group flex flex-col bg-white rounded-lg overflow-hidden hover:shadow-card hover:-translate-y-1 transition-[box-shadow,transform] duration-200 cursor-pointer"
          >
            <div className="aspect-[4/3] bg-cream-200 overflow-hidden">
              <Image
                src={sub.image}
                alt={sub.label}
                width={400}
                height={300}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-5 flex flex-col flex-1">
              <p className="label font-display font-bold italic uppercase text-navy-800 text-[18px] mb-2 leading-tight">
                {sub.label}
              </p>
              {sub.desc && (
                <p className="desc text-sm text-navy-800 leading-relaxed mb-4 flex-1">
                  {sub.desc}
                </p>
              )}
              <span className="inline-flex items-center gap-2 text-navy-800 font-display font-bold text-sm group-hover:text-brand-600 transition-colors">
                Read more <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
