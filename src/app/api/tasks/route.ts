import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = request.nextUrl;
  const boardId = searchParams.get('boardId');
  const clientId = searchParams.get('clientId');
  const status = searchParams.get('status');
  const assignedTo = searchParams.get('assignedTo');
  const openForClaim = searchParams.get('openForClaim');
  const myTasks = searchParams.get('myTasks');

  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const reportStatus = searchParams.get('reportStatus');

  const query: Record<string, unknown> = {};
  if (boardId) query.boardId = boardId;
  if (clientId) query.clientId = clientId;
  if (status) query.status = status;
  if (assignedTo) query.assignedTo = assignedTo;
  if (openForClaim === 'true') {
    query.isOpenForClaim = true;
    query.claimedBy = { $exists: false };
    query.status = { $nin: ['POSTED'] };
  }
  if (myTasks === 'true' && session.role === 'WORKER') {
    query.$or = [{ assignedTo: session.userId }, { claimedBy: session.userId }];
  }
  if (month && year) {
    const m = parseInt(month);
    const y = parseInt(year);
    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
    query.postedDate = { $gte: startOfMonth, $lte: endOfMonth };
  }
  if (reportStatus === 'needs_data') {
    query.status = 'POSTED';
    query['reporting.reportStatus'] = { $ne: 'COMPLETED' };
    query['reporting.reportDueAt'] = { $lte: new Date() };
  } else if (reportStatus === 'completed') {
    query['reporting.reportStatus'] = 'COMPLETED';
  }

  const tasks = await Task.find(query)
    .populate('clientId', 'name')
    .populate('boardId', 'title month year')
    .populate('assignedTo', 'name email')
    .populate('claimedBy', 'name email')
    .populate('createdBy', 'name')
    .sort({ deadline: 1, createdAt: -1 });

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = await request.json();

  if (!body.boardId || !body.clientId || !body.title) {
    return NextResponse.json({ error: 'boardId, clientId, title are required' }, { status: 400 });
  }

  const task = await Task.create({ ...body, createdBy: session.userId });

  await ActivityLog.create({
    userId: session.userId,
    action: 'CREATE',
    entityType: 'Task',
    entityId: task._id,
    message: `Created task "${task.title}"`,
  });

  return NextResponse.json({ task }, { status: 201 });
}
