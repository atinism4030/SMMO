import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Payment from '@/models/Payment';
import ActivityLog from '@/models/ActivityLog';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const body = await request.json();

  const payment = await Payment.findByIdAndUpdate(id, body, { new: true }).populate('clientId', 'name');
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  await ActivityLog.create({
    userId: session.userId,
    action: 'UPDATE',
    entityType: 'Payment',
    entityId: payment._id,
    message: `Updated payment status to ${payment.status}`,
  });

  return NextResponse.json({ payment });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const payment = await Payment.findByIdAndDelete(id);
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
