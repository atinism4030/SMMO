import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrCreateMonthlyReport, MonthlyReportError } from '@/lib/monthlyReportService';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'CEO' && session.role !== 'WORKER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get('clientId');
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));
  if (!clientId || !month || !year) {
    return NextResponse.json({ error: 'clientId, month, and year are required' }, { status: 400 });
  }

  try {
    const report = await getOrCreateMonthlyReport(clientId, month, year, session.userId);
    return NextResponse.json({ report });
  } catch (err) {
    const status = err instanceof MonthlyReportError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to load report';
    return NextResponse.json({ error: message }, { status });
  }
}
