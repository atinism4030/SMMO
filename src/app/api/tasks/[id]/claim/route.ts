import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const task = await Task.findById(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  if (!task.isOpenForClaim) {
    return NextResponse.json({ error: 'Task is not open for claim' }, { status: 400 });
  }

  if (task.claimedBy) {
    return NextResponse.json({ error: 'Task is already claimed' }, { status: 400 });
  }

  task.claimedBy = session.userId as unknown as typeof task.claimedBy;
  task.assignedTo = session.userId as unknown as typeof task.assignedTo;
  task.status = 'IN_PROGRESS';
  await task.save();

  await ActivityLog.create({
    userId: session.userId,
    action: 'CLAIM',
    entityType: 'Task',
    entityId: task._id,
    message: `Claimed task "${task.title}"`,
  });

  return NextResponse.json({ task });
}
