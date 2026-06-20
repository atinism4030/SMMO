import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import '@/models/index';
import PhotoshootSession from '@/models/PhotoshootSession';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = request.nextUrl;

  const query: Record<string, unknown> = {};

  if (session.role === 'WORKER') {
    query.assignedWorkers = session.userId;
  }

  const status = searchParams.get('status');
  if (status && status !== 'ALL') query.status = status;

  const clientId = searchParams.get('clientId');
  if (clientId) query.clientId = clientId;

  const priority = searchParams.get('priority');
  if (priority && priority !== 'ALL') query.priority = priority;

  const sessions = await PhotoshootSession.find(query)
    .populate('clientId', 'name businessType')
    .populate('assignedWorkers', 'name email avatarUrl')
    .populate('createdBy', 'name')
    .sort({ shootDate: 1, createdAt: -1 });

  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = await request.json();

  if (!body.clientId || !body.title || !body.shootDate || !body.startTime || !body.location) {
    return NextResponse.json(
      { error: 'clientId, title, shootDate, startTime, location are required' },
      { status: 400 }
    );
  }

  const ps = await PhotoshootSession.create({ ...body, createdBy: session.userId });
  const populated = await PhotoshootSession.findById(ps._id)
    .populate('clientId', 'name businessType')
    .populate('assignedWorkers', 'name email avatarUrl')
    .populate('createdBy', 'name');

  return NextResponse.json({ session: populated }, { status: 201 });
}
