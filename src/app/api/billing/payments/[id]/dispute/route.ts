import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { disputePayment, BillingError } from '@/lib/billingService';

const VALID_REASONS = ['WRONG_AMOUNT', 'WRONG_DATE', 'NOT_MADE', 'DUPLICATE', 'OTHER'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CLIENT' || !session.clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { reason, message } = await request.json();
  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'A valid dispute reason is required' }, { status: 400 });
  }

  try {
    const payment = await disputePayment(id, session.userId, reason, message, session.clientId);
    return NextResponse.json({ payment });
  } catch (err) {
    const status = err instanceof BillingError ? err.status : 500;
    const errMessage = err instanceof Error ? err.message : 'Failed to submit dispute';
    return NextResponse.json({ error: errMessage }, { status });
  }
}
