import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import ClientPayment from '@/models/ClientPayment';
import { createPayment, BillingError } from '@/lib/billingService';
import { toMinorUnits } from '@/lib/billing';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'WORKER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { searchParams } = request.nextUrl;

  const query: Record<string, unknown> = {};

  // A CLIENT user can only ever list their own payments — the clientId query
  // param is ignored/overridden for that role so it can never be used to
  // pull another client's payment history.
  if (session.role === 'CLIENT') {
    if (!session.clientId) return NextResponse.json({ payments: [] });
    query.clientId = session.clientId;
  } else {
    const clientId = searchParams.get('clientId');
    if (clientId) query.clientId = clientId;
  }

  const status = searchParams.get('status');
  if (status) query.verificationStatus = status;

  const month = searchParams.get('month');
  const year = searchParams.get('year');
  if (month && year) {
    const y = Number(year);
    const m = Number(month);
    query.paymentDate = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
  }

  const payments = await ClientPayment.find(query)
    .populate('clientId', 'name')
    .populate('createdBy', 'name')
    .populate('verifiedBy', 'name')
    .sort({ paymentDate: -1, createdAt: -1 });

  return NextResponse.json({ payments });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { clientId, amount, currency, paymentDate, paymentMethod, reference, notes, allocations, destinationWalletId } = body;

  if (!clientId || !amount || Number(amount) <= 0 || !paymentDate || !paymentMethod) {
    return NextResponse.json({ error: 'clientId, amount, paymentDate, and paymentMethod are required' }, { status: 400 });
  }
  if (!['CASH', 'BANK', 'CARD', 'OTHER'].includes(paymentMethod)) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
  }

  try {
    const payment = await createPayment({
      clientId,
      amountMinor: toMinorUnits(Number(amount)),
      currency: currency || 'EUR',
      paymentDate,
      paymentMethod,
      reference,
      notes,
      allocations: Array.isArray(allocations)
        ? allocations.map((a: { billingPeriodId: string; amount: number }) => ({
            billingPeriodId: a.billingPeriodId,
            amountMinor: toMinorUnits(Number(a.amount)),
          }))
        : undefined,
      destinationWalletId: destinationWalletId || undefined,
      createdBy: session.userId,
    });
    const populated = await payment.populate('clientId', 'name');
    return NextResponse.json({ payment: populated }, { status: 201 });
  } catch (err) {
    const status = err instanceof BillingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to record payment';
    return NextResponse.json({ error: message }, { status });
  }
}
