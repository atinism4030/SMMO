import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import BillingPeriod from '@/models/BillingPeriod';
import { ensureBillingPeriods, BillingError } from '@/lib/billingService';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (session.role === 'CLIENT' && session.clientId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (session.role === 'WORKER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    await ensureBillingPeriods(id);
    const periods = await BillingPeriod.find({ clientId: id }).sort({ year: 1, month: 1 });
    return NextResponse.json({ periods });
  } catch (err) {
    const status = err instanceof BillingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to load billing periods';
    return NextResponse.json({ error: message }, { status });
  }
}
