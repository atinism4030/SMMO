import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Booking from '@/models/Booking';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'WORKER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const booking = await Booking.findById(id).populate('clientId', 'name').populate('reviewedBy', 'name');
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  if (session.role === 'CLIENT') {
    const clientId = typeof booking.clientId === 'object' ? (booking.clientId as { _id: { toString(): string } })._id.toString() : String(booking.clientId);
    if (clientId !== session.clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ booking });
}
