'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { CalendarDays, CheckCircle } from 'lucide-react';
import { addDays, format, startOfTomorrow } from 'date-fns';
import { SITE } from '@/lib/site';

const minDate = format(startOfTomorrow(), 'yyyy-MM-dd');
const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Phone number required'),
  address: z.string().min(5, 'Service address is required'),
  service: z.string().min(1, 'Please select a service'),
  date: z.string().min(1, 'Please select a date'),
  timeSlot: z.string().min(1, 'Please select a time slot'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const SERVICES = [
  'Residential Plumbing',
  'Commercial Plumbing',
  'Drain Cleaning / Sewer',
  'Other',
];

const TIME_SLOTS = [
  '7:00 AM – 9:00 AM',
  '9:00 AM – 11:00 AM',
  '11:00 AM – 1:00 PM',
  '1:00 PM – 3:00 PM',
  '3:00 PM – 5:00 PM',
  '5:00 PM – 7:00 PM',
];

export default function BookingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [confirmationRef, setConfirmationRef] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Server error');
      const json = await res.json();
      setConfirmationRef(json.ref ?? 'JBP-' + Date.now().toString(36).toUpperCase());
      setSubmitted(true);
      reset();
    } catch {
      setServerError(`Booking failed. Please call ${SITE.phone} to schedule.`);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h3 className="text-xl font-bold text-gray-900">Appointment requested!</h3>
        <p className="text-gray-600">
          Confirmation #{confirmationRef}. We'll send a text/email to confirm your slot within 30 minutes.
        </p>
        <button onClick={() => setSubmitted(false)} className="btn-secondary mt-2 text-sm py-2 px-4">
          Book another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="b-name" className="form-label">Full name *</label>
          <input id="b-name" type="text" className="form-input" placeholder="Jane Smith" {...register('name')} />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="b-phone" className="form-label">Phone *</label>
          <input id="b-phone" type="tel" className="form-input" placeholder="(773) 000-0000" {...register('phone')} />
          {errors.phone && <p className="form-error">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="b-email" className="form-label">Email *</label>
        <input id="b-email" type="email" className="form-input" placeholder="you@example.com" {...register('email')} />
        {errors.email && <p className="form-error">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="b-address" className="form-label">Service address *</label>
        <input id="b-address" type="text" className="form-input" placeholder="123 Main St, Chicago, IL 60601" {...register('address')} />
        {errors.address && <p className="form-error">{errors.address.message}</p>}
      </div>

      <div>
        <label htmlFor="b-service" className="form-label">Service needed *</label>
        <select id="b-service" className="form-input bg-white" {...register('service')}>
          <option value="">Select a service…</option>
          {SERVICES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors.service && <p className="form-error">{errors.service.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="b-date" className="form-label">Preferred date *</label>
          <input
            id="b-date"
            type="date"
            className="form-input"
            min={minDate}
            max={maxDate}
            {...register('date')}
          />
          {errors.date && <p className="form-error">{errors.date.message}</p>}
        </div>
        <div>
          <label htmlFor="b-time" className="form-label">Time slot *</label>
          <select id="b-time" className="form-input bg-white" {...register('timeSlot')}>
            <option value="">Choose a window…</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.timeSlot && <p className="form-error">{errors.timeSlot.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="b-notes" className="form-label">Additional notes</label>
        <textarea
          id="b-notes"
          rows={3}
          className="form-input resize-none"
          placeholder="Describe the issue, access instructions, etc."
          {...register('notes')}
        />
      </div>

      {serverError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{serverError}</p>}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Booking…
          </span>
        ) : (
          <>
            <CalendarDays className="h-4 w-4" />
            Request Appointment
          </>
        )}
      </button>
      <p className="text-xs text-gray-500 text-center">
        This submits a request — we'll confirm availability via phone or email within 30 minutes.
      </p>
    </form>
  );
}
