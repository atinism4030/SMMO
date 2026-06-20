import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const task = await Task.findById(id)
    .populate('clientId', 'name')
    .populate('boardId', 'title month year')
    .populate('assignedTo', 'name email avatarUrl')
    .populate('claimedBy', 'name email avatarUrl')
    .populate('createdBy', 'name')
    .populate('comments.userId', 'name role');

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  return NextResponse.json({ task });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await request.json();

  const task = await Task.findById(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  if (session.role === 'WORKER') {
    const assignedId = task.assignedTo?.toString();
    const claimedId = task.claimedBy?.toString();
    if (assignedId !== session.userId && claimedId !== session.userId) {
      return NextResponse.json({ error: 'You can only update tasks assigned to you' }, { status: 403 });
    }
    const allowedFields = ['status', 'checklist', 'attachments'];
    for (const key of Object.keys(body)) {
      if (!allowedFields.includes(key)) delete body[key];
    }
  }

  if (body.status === 'DONE' && !task.completedAt) {
    body.completedAt = new Date();
  }

  const updated = await Task.findByIdAndUpdate(id, body, { new: true })
    .populate('assignedTo', 'name email')
    .populate('claimedBy', 'name email')
    .populate('createdBy', 'name');

  await ActivityLog.create({
    userId: session.userId,
    action: 'UPDATE',
    entityType: 'Task',
    entityId: updated!._id,
    message: `Updated task "${updated!.title}"${body.status ? ` to ${body.status}` : ''}`,
  });

  return NextResponse.json({ task: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const task = await Task.findByIdAndDelete(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
