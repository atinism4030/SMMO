import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { cancelPayment, BillingError } from '@/lib/billingService';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const payment = await cancelPayment(id, session.userId);
    return NextResponse.json({ payment });
  } catch (err) {
    const status = err instanceof BillingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to cancel payment';
    return NextResponse.json({ error: message }, { status });
  }
}
