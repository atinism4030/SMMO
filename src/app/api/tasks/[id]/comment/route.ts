import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Task from '@/models/Task';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const { text } = await request.json();

  if (!text?.trim()) return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });

  const task = await Task.findById(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  if (!task.comments) task.comments = [];
  task.comments.push({
    userId: session.userId as unknown as typeof task.comments[0]['userId'],
    text: text.trim(),
    createdAt: new Date(),
  });

  await task.save();

  const updated = await Task.findById(id).populate('comments.userId', 'name role');
  return NextResponse.json({ task: updated });
}
