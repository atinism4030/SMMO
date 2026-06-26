import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Board from '@/models/Board';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;

    const board = await Board.findById(id).populate('clientId', 'name status');
    if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

    const tasks = await Task.find({ boardId: id })
      .populate('assignedTo', 'name email')
      .populate('claimedBy', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ board, tasks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch board';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const board = await Board.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

    await ActivityLog.create({
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'Board',
      entityId: id,
      message: `Updated board: ${board.title}`,
    });

    return NextResponse.json({ board });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update board';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectDB();
    const { id } = await params;
    const board = await Board.findByIdAndDelete(id);
    if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

    await ActivityLog.create({
      userId: session.userId,
      action: 'DELETE',
      entityType: 'Board',
      entityId: id,
      message: `Deleted board: ${board.title}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete board';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
