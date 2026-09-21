import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import MonthlyReport from '@/models/MonthlyReport';
import { updateMonthlyReport, deleteMonthlyReport, MonthlyReportError } from '@/lib/monthlyReportService';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== 'CEO' && session.role !== 'WORKER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const { id } = await params;
  const report = await MonthlyReport.findById(id).populate('clientId', 'name');
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  return NextResponse.json({ report });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== 'CEO' && session.role !== 'WORKER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();

  try {
    const report = await updateMonthlyReport(id, session.userId, session.role, {
      language: body.language,
      metrics: body.metrics,
      summary: body.summary,
      highlights: body.highlights,
      bestPerformingContent: body.bestPerformingContent,
      observations: body.observations,
      recommendations: body.recommendations,
      nextMonthPlan: body.nextMonthPlan,
    });
    return NextResponse.json({ report });
  } catch (err) {
    const status = err instanceof MonthlyReportError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to update report';
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    await deleteMonthlyReport(id, session.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const status = err instanceof MonthlyReportError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to delete report';
    return NextResponse.json({ error: message }, { status });
  }
}
