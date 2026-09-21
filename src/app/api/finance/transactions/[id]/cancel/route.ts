import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { voidTransaction, FinanceError } from '@/lib/financeService';
import FinanceTransaction from '@/models/FinanceTransaction';
import { connectDB } from '@/lib/mongodb';

// Financial records are voided, never deleted or silently rewritten — this
// preserves the audit trail. A transaction that was auto-synced from a
// client payment (sourcePaymentId set) must be voided from the billing side
// (cancel/edit the payment) so the two systems can't drift out of sync.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const existing = await FinanceTransaction.findById(id);
  if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  if (existing.sourcePaymentId) {
    return NextResponse.json(
      { error: 'This transaction was generated automatically from a client payment — cancel or correct that payment instead.' },
      { status: 409 }
    );
  }

  const { reason } = await request.json().catch(() => ({ reason: undefined }));

  try {
    const transaction = await voidTransaction(id, session.userId, reason);
    return NextResponse.json({ transaction });
  } catch (err) {
    const status = err instanceof FinanceError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to void transaction';
    return NextResponse.json({ error: message }, { status });
  }
}
