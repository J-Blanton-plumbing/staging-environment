import Link from 'next/link';
import { Phone, ArrowRight } from 'lucide-react';
import { SITE } from '@/lib/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why J. Blanton',
};

export default function WhyUsPage() {
  return (
    <>
      <section className="bg-navy-800 text-white pt-[90px] pb-16 md:pb-20">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <p className="font-display font-bold text-brand-400 text-sm tracking-widest mb-2">ABOUT</p>
          <h1 className="font-display font-bold uppercase text-4xl md:text-6xl tracking-tight">Why J. Blanton</h1>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <p className="text-navy-500 italic mb-8">
            {/* TODO: replace with Why J. Blanton body copy from CMS */}
          </p>
          <div className="flex gap-3">
            <Link href={SITE.phoneHref} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold text-sm tracking-wide px-5 py-3 rounded">
              <Phone className="h-4 w-4" /> {SITE.phone}
            </Link>
            <Link href="/booking" className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-display font-semibold text-sm tracking-wide px-5 py-3 rounded">
              SCHEDULE A SERVICE <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
