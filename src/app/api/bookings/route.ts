import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listBookings, createBookingRequest, createDirectBooking, BookingError, type Viewer } from '@/lib/bookingService';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'WORKER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const viewer: Viewer = { role: session.role, clientId: session.clientId };
  const status = searchParams.get('status') || undefined;
  const clientId = searchParams.get('clientId') || undefined;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const bookings = await listBookings(viewer, {
    status,
    clientId,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });

  return NextResponse.json({ bookings });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'WORKER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { date, startTime, endTime, shootType, notes } = body;
  if (!date || !startTime || !endTime) {
    return NextResponse.json({ error: 'date, startTime, and endTime are required' }, { status: 400 });
  }

  try {
    if (session.role === 'CLIENT') {
      // A CLIENT can only ever request a booking for their own connected
      // client — the clientId in the body (if any) is ignored.
      if (!session.clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const booking = await createBookingRequest({
        clientId: session.clientId, date, startTime, endTime, shootType: shootType || 'PHOTO_SHOOT', notes, requestedBy: session.userId,
      });
      return NextResponse.json({ booking }, { status: 201 });
    }

    // CEO booking a slot directly on a client's behalf.
    if (!body.clientId) return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    const booking = await createDirectBooking({
      clientId: body.clientId, date, startTime, endTime, shootType: shootType || 'PHOTO_SHOOT', notes, requestedBy: session.userId,
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    const status = err instanceof BookingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to create booking';
    return NextResponse.json({ error: message }, { status });
  }
}
