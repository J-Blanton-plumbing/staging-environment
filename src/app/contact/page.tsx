import ContactForm from '@/components/ContactForm';
import { Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-navy-800 text-white pt-[90px] pb-16 md:pb-20">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <p className="font-display font-bold text-brand-400 text-sm tracking-widest mb-2">GET IN TOUCH</p>
          <h1 className="font-display font-bold uppercase text-4xl md:text-6xl tracking-tight">Contact Us</h1>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-cream-100 rounded-lg border border-cream-200 p-8">
              <ContactForm />
            </div>
            <aside className="space-y-4">
              <Link href={SITE.phoneHref} className="flex items-center gap-3 p-5 bg-cream-100 border border-cream-200 rounded-lg hover:border-brand-600 transition-colors">
                <Phone className="h-5 w-5 text-brand-600" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-navy-500 font-bold">Phone</p>
                  <p className="font-display font-bold text-brand-600">{SITE.phone}</p>
                </div>
              </Link>
              <Link href="mailto:info@jblantonplumbing.com" className="flex items-center gap-3 p-5 bg-cream-100 border border-cream-200 rounded-lg hover:border-brand-600 transition-colors">
                <Mail className="h-5 w-5 text-brand-600" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-navy-500 font-bold">Email</p>
                  <p className="font-display font-semibold text-sm text-navy-800">info@jblantonplumbing.com</p>
                </div>
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
