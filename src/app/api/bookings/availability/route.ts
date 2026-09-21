import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAvailability, type Viewer } from '@/lib/bookingService';

// The shared calendar feed behind privacy masking — see getAvailability in
// '@/lib/bookingService' for exactly what a CLIENT can and can't see about
// other clients' bookings. Never add a raw Booking.find() elsewhere for the
// calendar view; this is the one place that enforces that masking.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'WORKER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return NextResponse.json({ error: 'from and to are required' }, { status: 400 });

  const viewer: Viewer = { role: session.role, clientId: session.clientId };
  const entries = await getAvailability(viewer, { from: new Date(from), to: new Date(to) });
  return NextResponse.json({ entries });
}
