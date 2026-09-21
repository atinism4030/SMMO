import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rejectBooking, BookingError } from '@/lib/bookingService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { reason } = await request.json().catch(() => ({ reason: undefined }));
  try {
    const booking = await rejectBooking(id, session.userId, reason);
    return NextResponse.json({ booking });
  } catch (err) {
    const status = err instanceof BookingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to reject booking';
    return NextResponse.json({ error: message }, { status });
  }
}
