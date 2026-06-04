import Link from 'next/link';
import { MapPin, Phone } from 'lucide-react';
import { LOCATIONS } from '@/lib/locations';
import { SITE } from '@/lib/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Locations',
};

export default function LocationsPage() {
  return (
    <>
      <section className="bg-navy-800 text-white pt-[90px] pb-16 md:pb-20">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <p className="font-display font-bold text-brand-400 text-sm tracking-widest mb-2">COVERAGE</p>
          <h1 className="font-display font-bold uppercase text-4xl md:text-6xl tracking-tight">Locations</h1>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LOCATIONS.map((loc) => (
              <div
                key={loc.slug}
                className="office bg-cream-100 rounded-lg p-5 border border-cream-200 hover:border-brand-600 transition-colors"
              >
                {loc.isCorporate && (
                  <p className="text-xs font-display font-bold uppercase tracking-wide text-brand-600 mb-1.5">Corporate</p>
                )}
                <h3 className="font-display font-bold uppercase text-navy-800 mb-2">{loc.name}</h3>
                <div className="flex items-start gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-brand-600 mt-1 flex-shrink-0" />
                  <p className="text-sm text-navy-500">
                    {loc.address}<br />
                    {loc.city}, {loc.state} {loc.zip}
                  </p>
                </div>
                <Link href={SITE.phoneHref} className="inline-flex items-center gap-1.5 text-sm font-display font-bold text-brand-600 hover:text-brand-700">
                  <Phone className="h-4 w-4" /> {SITE.phone}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
