import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Report from '@/models/Report';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get('clientId');

  const query: Record<string, unknown> = {};
  if (clientId) query.clientId = clientId;

  const reports = await Report.find(query)
    .populate('clientId', 'name')
    .populate('contentItemId', 'title contentType')
    .sort({ reportDate: -1 });

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = await request.json();

  if (!body.clientId || !body.reportDate) {
    return NextResponse.json({ error: 'clientId and reportDate are required' }, { status: 400 });
  }

  const report = await Report.create({ ...body, createdBy: session.userId });

  await ActivityLog.create({
    userId: session.userId,
    action: 'CREATE',
    entityType: 'Report',
    entityId: report._id,
    message: `Added post performance report`,
  });

  return NextResponse.json({ report }, { status: 201 });
}
