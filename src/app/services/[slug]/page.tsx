import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { SERVICES, getService } from '@/lib/services';
import { Phone, ArrowRight } from 'lucide-react';
import { SITE } from '@/lib/site';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  // Skip slugs that have their own static route file
  return SERVICES.filter((s) => s.slug !== 'plumbing').map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const service = getService(params.slug);
  if (!service) return {};
  return { title: service.name };
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const service = getService(params.slug);
  if (!service) notFound();

  const others = SERVICES.filter((s) => s.slug !== service.slug);

  return (
    <>
      <section className="bg-navy-800 text-white pt-[90px] pb-16 md:pb-20">
        <div className="w-[90%] lg:w-[81%] mx-auto flex items-center gap-5">
          <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-lg bg-brand-600 flex-shrink-0">
            <Image src={service.iconUrl} alt="" width={48} height={48} className="h-10 w-10 brightness-0 invert" />
          </div>
          <div>
            <p className="font-display font-bold text-brand-400 text-sm tracking-widest mb-1">SERVICE</p>
            <h1 className="font-display font-bold uppercase text-3xl md:text-5xl tracking-tight">{service.name}</h1>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              <p className="text-navy-500 italic">
                {/* TODO: replace with service description / body copy from your CMS */}
              </p>
            </div>

            <aside>
              <div className="bg-cream-100 rounded-lg border border-cream-200 p-6 sticky top-[90px]">
                <h3 className="font-display font-bold uppercase text-navy-800 mb-4">Get Started</h3>
                <div className="space-y-3">
                  <Link href={SITE.phoneHref} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold text-sm tracking-wide px-4 py-3 rounded transition-colors">
                    <Phone className="h-4 w-4" /> {SITE.phone}
                  </Link>
                  <Link href="/booking" className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-display font-semibold text-sm tracking-wide px-4 py-3 rounded transition-colors">
                    SCHEDULE A SERVICE
                  </Link>
                </div>

                <div className="mt-6 pt-6 border-t border-cream-200">
                  <p className="text-xs font-display font-bold uppercase tracking-wide text-navy-500 mb-3">Other Services</p>
                  <ul className="space-y-2">
                    {others.map((s) => (
                      <li key={s.slug}>
                        <Link href={`/services/${s.slug}`} className="flex items-center justify-between text-sm font-semibold text-navy-800 hover:text-brand-600 group">
                          {s.name}
                          <ArrowRight className="h-3.5 w-3.5 text-navy-500/50 group-hover:text-brand-600" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
