import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { respondToSuggestion, BookingError } from '@/lib/bookingService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CLIENT' || !session.clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await request.json();
  if (action !== 'ACCEPT' && action !== 'DECLINE') {
    return NextResponse.json({ error: 'action must be ACCEPT or DECLINE' }, { status: 400 });
  }

  try {
    const booking = await respondToSuggestion(id, session.userId, session.clientId, action);
    return NextResponse.json({ booking });
  } catch (err) {
    const status = err instanceof BookingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to respond to the suggestion';
    return NextResponse.json({ error: message }, { status });
  }
}
