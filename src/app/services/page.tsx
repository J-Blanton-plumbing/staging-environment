import ServiceCard from '@/components/ServiceCard';
import { SERVICES } from '@/lib/services';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { SITE } from '@/lib/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plumbing Services',
  description:
    'J. Blanton Plumbing offers emergency, residential, commercial, sewer, drain, water heater, and water quality services throughout the Chicago metro.',
};

export default function ServicesPage() {
  return (
    <>
      <section className="bg-navy-800 text-white py-16">
        <div className="container mx-auto px-4">
          <p className="eyebrow text-brand-400 mb-2">What We Do</p>
          <h1 className="font-display font-bold uppercase text-4xl md:text-5xl mb-3">Our Services</h1>
          <p className="text-cream-100/80 text-lg max-w-2xl">
            Whatever the issue, our licensed Illinois plumbers have the experience and equipment to solve it — usually on the same visit.
          </p>
        </div>
      </section>

      <section className="py-16 bg-cream-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {SERVICES.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display font-bold uppercase text-2xl md:text-3xl mb-3">Not Sure What You Need?</h2>
          <p className="text-cream-100/90 mb-6">Call us — our plumbers can usually diagnose the issue over the phone.</p>
          <Link href={SITE.phoneHref} className="btn-secondary bg-white inline-flex">
            <Phone className="h-4 w-4" /> {SITE.phone}
          </Link>
        </div>
      </section>
    </>
  );
}
