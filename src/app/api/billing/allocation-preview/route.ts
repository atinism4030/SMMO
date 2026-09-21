import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { previewAllocation, BillingError } from '@/lib/billingService';
import { toMinorUnits } from '@/lib/billing';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { clientId, amount } = body;
  if (!clientId || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'clientId and a positive amount are required' }, { status: 400 });
  }

  try {
    const amountMinor = toMinorUnits(Number(amount));
    const result = await previewAllocation(clientId, amountMinor);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof BillingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to compute allocation preview';
    return NextResponse.json({ error: message }, { status });
  }
}
