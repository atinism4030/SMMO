import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { unfinalizeMonthlyReport, MonthlyReportError } from '@/lib/monthlyReportService';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    const report = await unfinalizeMonthlyReport(id, session.userId);
    return NextResponse.json({ report });
  } catch (err) {
    const status = err instanceof MonthlyReportError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to reopen report';
    return NextResponse.json({ error: message }, { status });
  }
}
