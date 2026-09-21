import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import ClientPayment from '@/models/ClientPayment';
import { editPayment, BillingError } from '@/lib/billingService';
import { toMinorUnits } from '@/lib/billing';

// GET is the endpoint behind the payment verification link
// (/client/payments/[id] and the admin detail view). Ownership is enforced
// here — not just in the page/middleware — so a guessed or shared payment id
// can never leak another client's financial data.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'WORKER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const payment = await ClientPayment.findById(id)
    .populate('clientId', 'name')
    .populate('createdBy', 'name')
    .populate('verifiedBy', 'name')
    .populate('allocations.billingPeriodId');
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  if (session.role === 'CLIENT') {
    const clientId = typeof payment.clientId === 'object' ? (payment.clientId as { _id: { toString(): string } })._id.toString() : String(payment.clientId);
    if (clientId !== session.clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ payment });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  try {
    const payment = await editPayment(id, session.userId, {
      amountMinor: body.amount !== undefined ? toMinorUnits(Number(body.amount)) : undefined,
      currency: body.currency,
      paymentDate: body.paymentDate,
      paymentMethod: body.paymentMethod,
      reference: body.reference,
      notes: body.notes,
      allocations: Array.isArray(body.allocations)
        ? body.allocations.map((a: { billingPeriodId: string; amount: number }) => ({
            billingPeriodId: a.billingPeriodId,
            amountMinor: toMinorUnits(Number(a.amount)),
          }))
        : undefined,
    });
    const populated = await payment.populate('clientId', 'name');
    return NextResponse.json({ payment: populated });
  } catch (err) {
    const status = err instanceof BillingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to update payment';
    return NextResponse.json({ error: message }, { status });
  }
}
