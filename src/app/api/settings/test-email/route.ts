import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

// A safe way to verify email delivery without exposing any credentials in
// the response — only whether SMTP is configured and whether the send
// succeeded. CEO-only: this is an operational/config check, not a feature
// any other role needs.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { to } = await request.json();
  if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'A valid recipient email address is required' }, { status: 400 });
  }

  const result = await sendEmail(
    to,
    'SMMO test email',
    `This is a test email from SMMO, sent by ${session.name} to verify booking notifications are working.\n\nIf you received this, email delivery is configured correctly.`
  );

  return NextResponse.json(result);
}
