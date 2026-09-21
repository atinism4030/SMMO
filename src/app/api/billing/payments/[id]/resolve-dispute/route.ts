import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { resolveDispute, BillingError } from '@/lib/billingService';
import { toMinorUnits } from '@/lib/billing';

const VALID_ACTIONS = ['EDITED', 'CANCELLED', 'RESENT', 'DISMISSED'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { action, note, edits } = body;
  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'A valid resolution action is required' }, { status: 400 });
  }
  if (action === 'EDITED' && !edits) {
    return NextResponse.json({ error: 'edits are required when resolving with action EDITED' }, { status: 400 });
  }

  try {
    const payment = await resolveDispute(
      id,
      session.userId,
      action,
      note,
      edits
        ? {
            amountMinor: edits.amount !== undefined ? toMinorUnits(Number(edits.amount)) : undefined,
            currency: edits.currency,
            paymentDate: edits.paymentDate,
            paymentMethod: edits.paymentMethod,
            reference: edits.reference,
            notes: edits.notes,
            allocations: Array.isArray(edits.allocations)
              ? edits.allocations.map((a: { billingPeriodId: string; amount: number }) => ({
                  billingPeriodId: a.billingPeriodId,
                  amountMinor: toMinorUnits(Number(a.amount)),
                }))
              : undefined,
          }
        : undefined
    );
    return NextResponse.json({ payment });
  } catch (err) {
    const status = err instanceof BillingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to resolve dispute';
    return NextResponse.json({ error: message }, { status });
  }
}
