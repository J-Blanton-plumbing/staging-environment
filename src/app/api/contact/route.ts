import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  service: z.string().min(1),
  message: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // TODO: wire up email delivery (Resend / AWS SES)
    // Example with Resend:
    // await resend.emails.send({
    //   from: process.env.EMAIL_FROM!,
    //   to: process.env.EMAIL_TO!,
    //   subject: `New quote request from ${data.name}`,
    //   text: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nService: ${data.service}\nMessage: ${data.message}`,
    // });

    console.log('[contact]', data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
