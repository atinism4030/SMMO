import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { recordManualPayment, BillingError } from '@/lib/billingService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ periodId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { periodId } = await params;
  const body = await request.json();
  const { clientId, amountMinor } = body;
  if (!clientId || !Number.isFinite(amountMinor)) {
    return NextResponse.json({ error: 'clientId and amountMinor are required' }, { status: 400 });
  }

  try {
    const payment = await recordManualPayment({
      clientId,
      billingPeriodId: periodId,
      amountMinor: Number(amountMinor),
      createdBy: session.userId,
    });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    const status = err instanceof BillingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to mark period as paid';
    return NextResponse.json({ error: message }, { status });
  }
}
