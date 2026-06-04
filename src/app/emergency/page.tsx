import Link from 'next/link';
import { Phone } from 'lucide-react';
import { SITE } from '@/lib/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '24/7 Emergency Plumbing',
};

export default function EmergencyPage() {
  return (
    <>
      <section className="bg-brand-700 text-white pt-[90px] pb-16 md:pb-20">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <p className="font-display font-bold text-cream-100 text-sm tracking-widest mb-2">EMERGENCY</p>
          <h1 className="font-display font-bold uppercase text-4xl md:text-6xl tracking-tight mb-6">24/7 Emergency Plumbing</h1>
          <Link href={SITE.phoneHref} className="inline-flex items-center gap-3 bg-white text-brand-700 font-display font-bold px-6 py-4 rounded text-lg">
            <Phone className="h-5 w-5" /> {SITE.phone}
          </Link>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <p className="text-navy-500 italic">
            {/* TODO: replace with Emergency page body copy from CMS */}
          </p>
        </div>
      </section>
    </>
  );
}
