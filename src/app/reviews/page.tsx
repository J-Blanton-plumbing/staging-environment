import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Stories',
};

export default function ReviewsPage() {
  return (
    <>
      <section className="bg-navy-800 text-white pt-[90px] pb-16 md:pb-20">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <p className="font-display font-bold text-brand-400 text-sm tracking-widest mb-2">REVIEWS</p>
          <h1 className="font-display font-bold uppercase text-4xl md:text-6xl tracking-tight">Customer Stories</h1>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-cream-100 rounded-lg p-8 border border-cream-200 min-h-[400px] flex items-center justify-center">
              <p className="text-navy-500 text-sm text-center">
                {/* TODO: embed Google Reviews widget */}
                Google Reviews widget
              </p>
            </div>
            <div className="bg-cream-100 rounded-lg p-8 border border-cream-200 min-h-[400px] flex items-center justify-center">
              <p className="text-navy-500 text-sm text-center">
                {/* TODO: embed Yelp Reviews widget */}
                Yelp Reviews widget
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
