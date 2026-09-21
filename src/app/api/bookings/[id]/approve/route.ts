import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { approveBooking, BookingError } from '@/lib/bookingService';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const booking = await approveBooking(id, session.userId);
    return NextResponse.json({ booking });
  } catch (err) {
    const status = err instanceof BookingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to approve booking';
    return NextResponse.json({ error: message }, { status });
  }
}
