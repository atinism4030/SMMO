import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { suggestAlternative, BookingError } from '@/lib/bookingService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { date, startTime, endTime } = await request.json();
  if (!date || !startTime || !endTime) {
    return NextResponse.json({ error: 'date, startTime, and endTime are required' }, { status: 400 });
  }

  try {
    const booking = await suggestAlternative(id, session.userId, { date, startTime, endTime });
    return NextResponse.json({ booking });
  } catch (err) {
    const status = err instanceof BookingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to suggest an alternative time';
    return NextResponse.json({ error: message }, { status });
  }
}
