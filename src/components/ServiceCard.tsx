import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Service } from '@/lib/services';
import { cn } from '@/lib/utils';

/**
 * Inline building/commercial line-SVG, copied verbatim from the live theme
 * (`front-page.php`, the `$s[2] === 'commercial'` branch). Rendered inline so it
 * can be tinted Carmine via `currentColor` (the local icon set has no building icon).
 */
function CommercialIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="512"
      height="512"
      viewBox="0 0 512 512"
      className="h-[100px] w-[100px] text-brand-600"
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        d="M176 416v64M80 32h192a32 32 0 0 1 32 32v412a4 4 0 0 1-4 4H48h0V64a32 32 0 0 1 32-32m240 160h112a32 32 0 0 1 32 32v256h0h-160h0V208a16 16 0 0 1 16-16"
      />
      <path
        fill="currentColor"
        d="M98.08 431.87a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m80 240a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m80 320a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79"
      />
      <ellipse
        cx="256"
        cy="176"
        fill="currentColor"
        rx="15.95"
        ry="16.03"
        transform="rotate(-45 255.99 175.996)"
      />
      <path
        fill="currentColor"
        d="M258.08 111.87a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79M400 400a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m-64 160a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16"
      />
    </svg>
  );
}

export default function ServiceCard({
  service,
  className,
}: {
  service: Service;
  className?: string;
}) {
  const href = service.slug === 'emergency-plumbing' ? '/emergency-plumbing' : `/services/${service.slug}`;

  return (
    <Link
      href={href}
      className={cn(
        'image-card group flex flex-col bg-white rounded-lg overflow-hidden shadow-soft hover:shadow-card hover:-translate-y-1 transition-[box-shadow,transform] duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
        className
      )}
    >
      {/* Icon — centered at top, 100×100, Carmine (theme `.img`) */}
      <div className="img w-full flex justify-center pt-5">
        {service.slug === 'commercial' ? (
          <CommercialIcon />
        ) : (
          <Image
            src={service.iconUrl}
            alt=""
            width={100}
            height={100}
            className="h-[100px] w-[100px] object-contain"
          />
        )}
      </div>

      {/* Content */}
      <div className="image-card-content w-[90%] mx-auto py-[15px] flex flex-col flex-1 text-navy-800">
        <p className="service-label font-display font-bold text-[20px] mb-2 leading-tight tracking-[0.5px]">
          {service.name}
        </p>
        <p className="desc text-navy-800 text-sm leading-relaxed mb-4 flex-1 tracking-[0.5px]">
          {service.shortDesc}
        </p>
        <div className="inline-flex items-center gap-2 text-navy-800 font-display font-bold text-sm group-hover:text-brand-600 transition-colors duration-150">
          Read more <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-150" strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  );
}
