import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(5),
  service: z.string().min(1),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const ref = 'JBP-' + Date.now().toString(36).toUpperCase();

    // TODO: wire up email delivery and calendar/CRM integration
    // Example with Resend:
    // await resend.emails.send({
    //   from: process.env.EMAIL_FROM!,
    //   to: [process.env.EMAIL_TO!, data.email],
    //   subject: `Booking Request ${ref} — ${data.date} ${data.timeSlot}`,
    //   text: `Ref: ${ref}\nName: ${data.name}\nPhone: ${data.phone}\nAddress: ${data.address}\nService: ${data.service}\nDate: ${data.date}\nTime: ${data.timeSlot}\nNotes: ${data.notes ?? 'N/A'}`,
    // });

    console.log('[booking]', { ref, ...data });
    return NextResponse.json({ ok: true, ref });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
