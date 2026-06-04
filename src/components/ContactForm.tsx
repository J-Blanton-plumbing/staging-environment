'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { SITE } from '@/lib/site';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Phone number required'),
  service: z.string().min(1, 'Please select a service'),
  message: z.string().min(10, 'Please describe the issue (10+ chars)'),
});

type FormData = z.infer<typeof schema>;

const SERVICES = [
  'Residential Plumbing',
  'Commercial Plumbing',
  '24/7 Emergency',
  'Drain Cleaning / Sewer',
  'Other',
];

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
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
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Server error');
      setSubmitted(true);
      reset();
    } catch {
      setServerError(`Something went wrong. Please call us directly at ${SITE.phone}.`);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h3 className="text-xl font-bold text-gray-900">Message received!</h3>
        <p className="text-gray-600">We'll be in touch within 1–2 hours during business hours.</p>
        <button onClick={() => setSubmitted(false)} className="btn-secondary mt-2 text-sm py-2 px-4">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="form-label">Full name *</label>
          <input id="name" type="text" className="form-input" placeholder="Jane Smith" {...register('name')} />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="phone" className="form-label">Phone *</label>
          <input id="phone" type="tel" className="form-input" placeholder="(773) 000-0000" {...register('phone')} />
          {errors.phone && <p className="form-error">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="form-label">Email *</label>
        <input id="email" type="email" className="form-input" placeholder="you@example.com" {...register('email')} />
        {errors.email && <p className="form-error">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="service" className="form-label">Service needed *</label>
        <select id="service" className="form-input bg-white" {...register('service')}>
          <option value="">Select a service…</option>
          {SERVICES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors.service && <p className="form-error">{errors.service.message}</p>}
      </div>

      <div>
        <label htmlFor="message" className="form-label">Describe the issue *</label>
        <textarea
          id="message"
          rows={4}
          className="form-input resize-none"
          placeholder="Tell us what's going on…"
          {...register('message')}
        />
        {errors.message && <p className="form-error">{errors.message.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{serverError}</p>}

      <button type="submit" disabled={isSubmitting} className="btn-cta w-full justify-center">
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Sending…
          </span>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send Message
          </>
        )}
      </button>
    </form>
  );
}
