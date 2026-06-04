import BookingForm from '@/components/BookingForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Schedule a Service',
};

export default function BookingPage() {
  return (
    <>
      <section className="bg-navy-800 text-white pt-[90px] pb-16 md:pb-20">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <p className="font-display font-bold text-brand-400 text-sm tracking-widest mb-2">BOOK ONLINE</p>
          <h1 className="font-display font-bold uppercase text-4xl md:text-6xl tracking-tight">Schedule a Service</h1>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="w-[90%] lg:w-[81%] mx-auto max-w-3xl">
          <BookingForm />
        </div>
      </section>
    </>
  );
}
