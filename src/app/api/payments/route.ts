import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Payment from '@/models/Payment';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get('clientId');
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const status = searchParams.get('status');

  const query: Record<string, unknown> = {};
  if (clientId) query.clientId = clientId;
  if (month) query.month = parseInt(month);
  if (year) query.year = parseInt(year);
  if (status) query.status = status;

  const payments = await Payment.find(query)
    .populate('clientId', 'name')
    .sort({ year: -1, month: -1 });

  return NextResponse.json({ payments });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = await request.json();

  if (!body.clientId || !body.amount || !body.month || !body.year) {
    return NextResponse.json({ error: 'clientId, amount, month, year are required' }, { status: 400 });
  }

  const payment = await Payment.create(body);

  await ActivityLog.create({
    userId: session.userId,
    action: 'CREATE',
    entityType: 'Payment',
    entityId: payment._id,
    message: `Added payment of ${payment.amount} ${payment.currency}`,
  });

  return NextResponse.json({ payment }, { status: 201 });
}
