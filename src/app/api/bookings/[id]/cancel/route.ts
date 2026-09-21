import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { cancelBooking, BookingError } from '@/lib/bookingService';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'WORKER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const requiredClientId = session.role === 'CLIENT' ? session.clientId : undefined;
  if (session.role === 'CLIENT' && !requiredClientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const booking = await cancelBooking(id, session.userId, requiredClientId);
    return NextResponse.json({ booking });
  } catch (err) {
    const status = err instanceof BookingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to cancel booking';
    return NextResponse.json({ error: message }, { status });
  }
}
