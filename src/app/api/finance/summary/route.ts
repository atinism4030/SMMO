import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getFinanceDashboardSummary } from '@/lib/financeService';
import { getAgencyBillingSummary } from '@/lib/billingService';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const [finance, billing] = await Promise.all([
    getFinanceDashboardSummary({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    }),
    getAgencyBillingSummary(),
  ]);

  return NextResponse.json({
    ...finance,
    outstandingClientReceivablesMinor: billing.outstandingBalanceMinor,
    pendingPaymentConfirmationsMinor: billing.pendingConfirmationMinor,
    pendingPaymentConfirmationsCount: billing.pendingConfirmationCount,
  });
}
